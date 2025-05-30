---
title: "Von JS zum DOM und zurück verfolgen"
author: "Ulan Degenbaev, Alexei Filippov, Michael Lippautz und Hannes Payer — die Gemeinschaft des DOM"
avatars: 
  - "ulan-degenbaev"
  - "michael-lippautz"
  - "hannes-payer"
date: "2018-03-01 13:33:37"
tags: 
  - internals
  - speicher
description: "Chrome DevTools können jetzt C++ DOM-Objekte verfolgen und schnappschussartig erfassen sowie alle erreichbaren DOM-Objekte von JavaScript mit ihren Referenzen anzeigen."
tweet: "969184997545562112"
---
Das Debuggen von Speicherlecks in Chrome 66 ist jetzt deutlich einfacher geworden. Die Chrome DevTools können jetzt C++ DOM-Objekte verfolgen und schnappschussartig erfassen sowie alle erreichbaren DOM-Objekte von JavaScript mit ihren Referenzen anzeigen. Diese Funktion ist einer der Vorteile des neuen C++-Tracing-Mechanismus des V8-Garbage-Collectors.

<!--truncate-->
## Hintergrund

Ein Speicherleck in einem Garbage-Collection-System tritt auf, wenn ein ungenutztes Objekt aufgrund unbeabsichtigter Referenzen von anderen Objekten nicht freigegeben wird. Speicherlecks auf Webseiten betreffen oft die Interaktion zwischen JavaScript-Objekten und DOM-Elementen.

Das folgende [Spielzeugbeispiel](https://ulan.github.io/misc/leak.html) zeigt ein Speicherleck, das auftritt, wenn ein Programmierer vergisst, einen Event-Listener abzumelden. Keines der vom Event-Listener referenzierten Objekte kann vom Garbage Collector freigegeben werden. Insbesondere das iframe-Fenster leckt zusammen mit dem Event-Listener.

```js
// Hauptfenster:
const iframe = document.createElement('iframe');
iframe.src = 'iframe.html';
document.body.appendChild(iframe);
iframe.addEventListener('load', function() {
  const localVariable = iframe.contentWindow;
  function leakingListener() {
    // Mach etwas mit `localVariable`.
    if (localVariable) {}
  }
  document.body.addEventListener('my-debug-event', leakingListener);
  document.body.removeChild(iframe);
  // BUG: vergessen, `leakingListener` abzumelden.
});
```

Das lecke iframe-Fenster hält auch alle seine JavaScript-Objekte lebendig.

```js
// iframe.html:
class Leak {};
window.globalVariable = new Leak();
```

Es ist wichtig, den Begriff der Speicherpfade zu verstehen, um die Ursache eines Speicherlecks zu finden. Ein Speicherpfad ist eine Kette von Objekten, die die Garbage Collection des leckenden Objekts verhindert. Die Kette beginnt bei einem Stammobjekt wie dem globalen Objekt des Hauptfensters und endet beim leckenden Objekt. Jedes Zwischenobjekt in der Kette hat eine direkte Referenz zum nächsten Objekt in der Kette. Beispielsweise sieht der Speicherpfad des `Leak`-Objekts im iframe wie folgt aus:

![Abbildung 1: Speicherpfad eines Objekts, das über `iframe` und Event-Listener leckt](/_img/tracing-js-dom/retaining-path.svg)

Beachten Sie, dass der Speicherpfad die JavaScript- / DOM-Grenze (grün/rot hervorgehoben) zweimal überschreitet. Die JavaScript-Objekte leben im V8-Heap, während DOM-Objekte C++-Objekte in Chrome sind.

## DevTools Heap-Snapshot

Wir können den Speicherpfad eines beliebigen Objekts untersuchen, indem wir einen Heap-Snapshot in DevTools aufnehmen. Der Heap-Snapshot erfasst präzise alle Objekte im V8-Heap. Bis vor kurzem hatte er jedoch nur ungefähre Informationen über die C++ DOM-Objekte. Zum Beispiel zeigt Chrome 65 einen unvollständigen Speicherpfad für das `Leak`-Objekt aus dem Spielzeugbeispiel:

![Abbildung 2: Speicherpfad in Chrome 65](/_img/tracing-js-dom/chrome-65.png)

Nur die erste Zeile ist präzise: Das `Leak`-Objekt wird tatsächlich in der `global_variable` des iframe-Fensterobjekts gespeichert. Die nachfolgenden Zeilen approximieren den tatsächlichen Speicherpfad und erschweren das Debuggen des Speicherlecks.

Ab Chrome 66 verfolgen DevTools durch C++ DOM-Objekte und erfassen die Objekte und Referenzen zwischen ihnen präzise. Dies basiert auf dem leistungsstarken C++-Objekt-Verfolgungsmechanismus, der zuvor für die komponentenübergreifende Garbage Collection eingeführt wurde. Dadurch ist [der Speicherpfad in DevTools](https://www.youtube.com/watch?v=ixadA7DFCx8) jetzt tatsächlich korrekt:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/ixadA7DFCx8" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>Abbildung 3: Speicherpfad in Chrome 66</figcaption>
</figure>

## Hinter den Kulissen: komponentenübergreifendes Tracing

DOM-Objekte werden von Blink verwaltet — der Rendering-Engine von Chrome, die dafür verantwortlich ist, das DOM in tatsächlichen Text und Bilder auf dem Bildschirm zu übersetzen. Blink und seine Darstellung des DOM sind in C++ geschrieben, was bedeutet, dass das DOM nicht direkt für JavaScript zugänglich gemacht werden kann. Stattdessen existieren Objekte im DOM in zwei Hälften: ein V8-Wrapper-Objekt, das für JavaScript verfügbar ist, und ein C++-Objekt, das den Knoten im DOM darstellt. Diese Objekte haben direkte Referenzen zueinander. Die Bestimmung der Lebenszeit und des Besitzes von Objekten über mehrere Komponenten hinweg, wie Blink und V8, ist schwierig, da alle Beteiligten sich einig sein müssen, welche Objekte noch leben und welche zurückgewonnen werden können.

In Chrome 56 und älteren Versionen (d.h. bis März 2017) verwendete Chrome einen Mechanismus namens _Objektgruppierung_, um die Gültigkeit zu bestimmen. Objekte wurden basierend auf ihrer Einbettung in Dokumente Gruppen zugeordnet. Eine Gruppe mit all ihren enthaltenen Objekten wurde am Leben erhalten, solange ein einziges Objekt durch einen anderen Verweis am Leben blieb. Dies ergab im Kontext von DOM-Knoten, die immer auf ihr enthaltenes Dokument verweisen und sogenannte DOM-Bäume bilden, Sinn. Allerdings entfernte diese Abstraktion alle tatsächlichen Verweiswege, was es schwierig machte, sie zum Debuggen zu verwenden, wie in Abbildung 2 gezeigt. Im Fall von Objekten, die nicht zu diesem Szenario passten, z. B. JavaScript-Schließungen, die als Ereignislistener verwendet wurden, wurde dieser Ansatz ebenfalls umständlich und führte zu verschiedenen Fehlern, bei denen JavaScript-Wrapper-Objekte vorzeitig gesammelt wurden. Dies führte dazu, dass sie durch leere JS-Wrapper ersetzt wurden, die alle ihre Eigenschaften verloren.

Ab Chrome 57 wurde dieser Ansatz durch komponentenübergreifendes Tracing ersetzt, ein Mechanismus, der die Gültigkeit bestimmt, indem er von JavaScript zur C++-Implementierung des DOMs und zurück verfolgt. Wir haben inkrementelles Tracing auf der C++-Seite mit Schreibbarrieren implementiert, um die Stop-the-World-Tracing-Verzögerungen zu vermeiden, über die wir in [früheren Blogbeiträgen](/blog/orinoco-parallel-scavenger) gesprochen haben. Das komponentenübergreifende Tracing bietet nicht nur bessere Latenzzeiten, sondern nähert auch besser die Gültigkeit von Objekten über Komponenten-Grenzen hinweg an und behebt mehrere [Szenarien](https://bugs.chromium.org/p/chromium/issues/detail?id=501866), die früher zu Speicherlecks führten. Darüber hinaus erlaubt es DevTools, einen Snapshot bereitzustellen, der tatsächlich das DOM darstellt, wie in Abbildung 3 gezeigt.

Probieren Sie es aus! Wir sind gespannt auf Ihr Feedback.
