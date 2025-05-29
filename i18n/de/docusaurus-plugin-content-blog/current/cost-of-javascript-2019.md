---
title: 'Die Kosten von JavaScript im Jahr 2019'
author: 'Addy Osmani ([@addyosmani](https://twitter.com/addyosmani)), JavaScript-Hausmeister, und Mathias Bynens ([@mathias](https://twitter.com/mathias)), Hauptthread-Befreier'
avatars:
  - 'addy-osmani'
  - 'mathias-bynens'
date: 2019-06-25
tags:
  - internals
  - parsing
description: 'Die dominierenden Kosten bei der Verarbeitung von JavaScript sind der Download und die CPU-Ausführungszeit.'
tweet: '1143531042361487360'
---
:::note
**Hinweis:** Wenn Sie es bevorzugen, eine Präsentation anzusehen statt Artikel zu lesen, dann genießen Sie das unten stehende Video! Andernfalls überspringen Sie das Video und lesen Sie weiter.
:::

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/X9eRLElSW1c" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=X9eRLElSW1c">„Die Kosten von JavaScript“</a>, präsentiert von Addy Osmani auf der #PerfMatters-Konferenz 2019.</figcaption>
</figure>

<!--truncate-->
Eine große Veränderung bei [den Kosten von JavaScript](https://medium.com/@addyosmani/the-cost-of-javascript-in-2018-7d8950fbb5d4) in den letzten Jahren ist eine Verbesserung der Geschwindigkeit, mit der Browser Skripte analysieren und kompilieren können. **Im Jahr 2019 sind die dominierenden Kosten bei der Verarbeitung von Skripten nun der Download und die CPU-Ausführungszeit.**

Die Benutzerinteraktion kann verzögert werden, wenn der Hauptthread des Browsers mit der Ausführung von JavaScript beschäftigt ist. Daher kann die Optimierung der Engpässe bei der Skriptausführungszeit und im Netzwerk sehr wirkungsvoll sein.

## Umsetzbare Empfehlungen auf hoher Ebene

Was bedeutet das für Webentwickler? Die Kosten für das Parsen und Kompilieren sind **nicht mehr so langsam**, wie wir einst dachten. Die drei Schwerpunkte für JavaScript-Bundles sind:

- **Verbessern Sie die Downloadzeit**
    - Halten Sie Ihre JavaScript-Bundles klein, insbesondere für mobile Geräte. Kleine Bundles verbessern die Downloadgeschwindigkeit, verringern den Speicherverbrauch und reduzieren die CPU-Kosten.
    - Vermeiden Sie es, nur ein einzelnes großes Bundle zu haben; wenn ein Bundle etwa 50–100 kB überschreitet, teilen Sie es in mehrere kleinere Bundles auf. (Mit HTTP/2-Multiplexing können mehrere Anfrage- und Antwortnachrichten gleichzeitig verarbeitet werden, wodurch der Overhead zusätzlicher Anfragen reduziert wird.)
    - Auf mobilen Geräten sollten Sie deutlich weniger ausliefern, nicht nur wegen der Netzwerkgeschwindigkeit, sondern auch um den reinen Speicherverbrauch gering zu halten.
- **Verbessern Sie die Ausführungszeit**
    - Vermeiden Sie [Long Tasks](https://w3c.github.io/longtasks/), die den Hauptthread beschäftigt halten und die Zeit verzögern können, bis Seiten interaktiv sind. Nach dem Download ist die Skriptausführungszeit nun ein dominanter Kostenfaktor.
- **Vermeiden Sie große Inline-Skripte** (da sie immer noch im Hauptthread analysiert und kompiliert werden). Eine gute Faustregel ist: Wenn das Skript mehr als 1 kB groß ist, vermeiden Sie das Inlining (auch weil ab 1 kB [Code-Caching](/blog/code-caching-for-devs) für externe Skripte greift).

## Warum sind Download- und Ausführungszeit wichtig?

Warum ist es wichtig, Download- und Ausführungszeiten zu optimieren? Downloadzeiten sind entscheidend für Netzwerke mit niedriger Bandbreite. Trotz des Wachstums von 4G (und sogar 5G) weltweit, bleiben unsere [effektiven Verbindungstypen](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType) uneinheitlich, wobei viele von uns Geschwindigkeiten erleben, die wie 3G (oder schlechter) wirken, wenn wir unterwegs sind.

Die JavaScript-Ausführungszeit ist wichtig für Telefone mit langsamen CPUs. Aufgrund von Unterschieden in CPU, GPU und thermischem Drosseln gibt es große Unterschiede in der Leistung zwischen High-End- und Low-End-Telefonen. Dies ist wichtig für die Leistung von JavaScript, da die Ausführung CPU-gebunden ist.

Tatsächlich kann von der gesamten Zeit, die eine Seite in einem Browser wie Chrome zum Laden benötigt, bis zu 30 % dieser Zeit für die JavaScript-Ausführung aufgewendet werden. Unten sehen Sie einen Seitenladevorgang von einer Website mit einem ziemlich typischen Arbeitsaufwand (Reddit.com) auf einem High-End-Desktop:

![Die Verarbeitung von JavaScript macht 10–30 % der Zeit aus, die in V8 während des Seitenladens verbraucht wird.](/_img/cost-of-javascript-2019/reddit-js-processing.svg)

Auf mobilen Geräten dauert es 3–4× länger, bis ein durchschnittliches Telefon (Moto G4) das JavaScript von Reddit ausführt, verglichen mit einem High-End-Gerät (Pixel 3), und mehr als 6× so lange auf einem Low-End-Gerät (das &lt;$100 Alcatel 1X):

![Die Kosten des JavaScripts von Reddit in verschiedenen Gerätekategorien (Low-End, Durchschnitt und High-End)](/_img/cost-of-javascript-2019/reddit-js-processing-devices.svg)

:::note
**Hinweis:** Reddit bietet unterschiedliche Erlebnisse für Desktop- und mobile Web an, daher können die MacBook-Pro-Ergebnisse nicht mit den anderen Ergebnissen verglichen werden.
:::

Wenn Sie versuchen, die JavaScript-Ausführungszeit zu optimieren, achten Sie auf [Langsame Aufgaben](https://web.dev/long-tasks-devtools/), die den UI-Thread möglicherweise über lange Zeiträume monopolisieren. Diese können kritische Aufgaben daran hindern, ausgeführt zu werden, selbst wenn die Seite optisch bereit aussieht. Teilen Sie diese Aufgaben in kleinere Aufgaben auf. Durch das Aufteilen Ihres Codes und die Priorisierung der Reihenfolge, in der er geladen wird, können Sie Seiten schneller interaktiv machen und hoffentlich die Eingabelatenz verringern.

![Langsame Aufgaben monopolisieren den Haupt-Thread. Sie sollten sie aufteilen.](/_img/cost-of-javascript-2019/long-tasks.png)

## Was hat V8 getan, um das Parsen/Kompilieren zu verbessern?

Die Geschwindigkeit des Roh-JavaScript-Parsings in V8 hat sich seit Chrome 60 verdoppelt. Gleichzeitig sind die Kosten für das reine Parsen (und Kompilieren) durch andere Optimierungsarbeiten in Chrome, die dies parallelisieren, weniger sichtbar/wichtig geworden.

V8 hat die Menge der Parse- und Kompilierungsarbeiten auf dem Haupt-Thread durchschnittlich um 40 % reduziert (z. B. 46 % bei Facebook, 62 % bei Pinterest), mit der höchsten Verbesserung von 81 % (YouTube), indem das Parsen und Kompilieren auf einem Worker-Thread durchgeführt wird. Dies erfolgt zusätzlich zum vorhandenen Off-Main-Thread-Streaming-Parse/Kompilieren.

![V8-Parsetzeiten in verschiedenen Versionen](/_img/cost-of-javascript-2019/chrome-js-parse-times.svg)

Wir können auch die Auswirkungen der Änderungen auf die CPU-Zeit in verschiedenen Versionen von V8 in Chrome-Versionen visualisieren. In der gleichen Zeit, die Chrome 61 für das Parsen der JS von Facebook benötigte, kann Chrome 75 jetzt sowohl die JS von Facebook als auch die JS von Twitter sechsmal parsen.

![In der Zeit, die Chrome 61 benötigte, um Facebooks JS zu parsen, kann Chrome 75 jetzt sowohl Facebooks JS als auch sechsmal Twitters JS parsen.](/_img/cost-of-javascript-2019/js-parse-times-websites.svg)

Lassen Sie uns genauer betrachten, wie diese Änderungen ermöglicht wurden. Kurz gesagt, Skript-Ressourcen können streaming-geparst und -kompiliert auf einem Worker-Thread werden, was bedeutet:

- V8 kann JavaScript parsen+kompilieren, ohne den Haupt-Thread zu blockieren.
- Das Streaming beginnt, sobald der vollständige HTML-Parser ein `<script>`-Tag entdeckt. Für Parser-blockierende Skripte pausiert der HTML-Parser, während er bei asynchronen Skripten weiterläuft.
- Für die meisten realen Verbindungsgeschwindigkeiten parst V8 schneller als der Download, sodass V8 ein paar Millisekunden nach dem Herunterladen der letzten Skript-Bytes mit dem Parsing+Kompilieren fertig ist.

Die nicht so kurze Erklärung ist ... Ältere Versionen von Chrome würden ein Skript vollständig herunterladen, bevor mit dem Parsen begonnen wird. Dies ist ein einfacher Ansatz, nutzt die CPU jedoch nicht vollständig aus. Zwischen den Versionen 41 und 68 begann Chrome damit, asynchrone und verzögerte Skripte auf einem separaten Thread zu parsen, sobald der Download beginnt.

![Skripte kommen in mehreren Teilen an. V8 beginnt mit dem Streaming, sobald es mindestens 30 kB gesehen hat.](/_img/cost-of-javascript-2019/script-streaming-1.svg)

In Chrome 71 wechselten wir zu einer task-basierten Einrichtung, bei der der Scheduler mehrere asynchrone/verzögerte Skripte gleichzeitig parsen konnte. Die Auswirkungen dieser Änderung waren eine ~20%ige Reduzierung der Parse-Zeit auf dem Haupt-Thread, was zu einer Gesamtheit von ~2% Verbesserung in TTI/FID führte, gemessen auf realen Websites.

![Chrome 71 wechselte zu einer task-basierten Einrichtung, bei der der Scheduler mehrere asynchrone/verzögerte Skripte gleichzeitig parsen konnte.](/_img/cost-of-javascript-2019/script-streaming-2.svg)

In Chrome 72 wechselten wir dazu, Streaming als Hauptweg für das Parsen zu nutzen: Auch reguläre synchronisierte Skripte werden nun auf diese Weise geparst (keine Inline-Skripte jedoch). Außerdem haben wir aufgehört, das task-basierte Parse abzubrechen, falls der Haupt-Thread es benötigt, da dies nur unnötig bereits erledigte Arbeiten dupliziert.

[Frühere Versionen von Chrome](/blog/v8-release-75#script-streaming-directly-from-network) unterstützten Streaming-Parsen und -Kompilieren, bei denen die Skript-Quelldaten, die aus dem Netzwerk kamen, zuerst auf dem Haupt-Thread von Chrome verarbeitet werden mussten, bevor sie an den Streamer weitergeleitet wurden.

Dies führte oft dazu, dass der Streaming-Parser auf Daten wartete, die bereits aus dem Netzwerk ankamen, die jedoch aufgrund anderer Arbeiten auf dem Haupt-Thread (wie HTML-Parsing, Layout oder JavaScript-Ausführung) noch nicht an den Streaming-Task weitergeleitet wurden.

Wir experimentieren nun damit, das Parsing beim Preload zu starten, wobei das Bounce-Verhalten des Haupt-Threads zuvor ein Blocker dafür war.

Leszek Swirskis BlinkOn-Präsentation geht auf weitere Details ein:

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/D1UJgiG4_NI" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=D1UJgiG4_NI">„JavaScript in Null* Zeit parsen“</a>, präsentiert von Leszek Swirski auf BlinkOn 10.</figcaption>
</figure>

## Wie spiegeln sich diese Änderungen in DevTools wider?

Zusätzlich zu den oben genannten gab es [ein Problem in DevTools](https://bugs.chromium.org/p/chromium/issues/detail?id=939275), das die gesamte Parser-Aufgabe so darstellte, dass es darauf hindeutet, dass sie die CPU nutzt (vollständiger Block). Der Parser blockiert jedoch immer, wenn er keine Daten erhält (die über den Haupt-Thread weitergeleitet werden müssen). Seit wir von einem einzigen Streamer-Thread zu Streaming-Tasks gewechselt sind, wurde dies wirklich offensichtlich. Hier ist, was Sie in Chrome 69 sehen würden:

![Das DevTools-Problem, das die gesamte Parser-Aufgabe so darstellte, dass es darauf hindeutet, dass sie die CPU nutzt (vollständiger Block)](/_img/cost-of-javascript-2019/devtools-69.png)

Die Aufgabe „Skript analysieren“ wird als 1,08 Sekunden angezeigt. Aber das Parsen von JavaScript ist eigentlich nicht so langsam! Die meiste Zeit wird damit verbracht, nichts zu tun, außer darauf zu warten, dass Daten über den Hauptthread übertragen werden.

Chrome 76 zeigt ein anderes Bild:

![In Chrome 76 wird das Parsen in mehrere kleinere Streaming-Aufgaben unterteilt.](/_img/cost-of-javascript-2019/devtools-76.png)

Generell ist die Leistungsübersicht in den DevTools großartig, um einen Überblick darüber zu bekommen, was auf Ihrer Seite passiert. Für detaillierte V8-spezifische Metriken wie JavaScript-Parse- und Kompilierungszeiten empfehlen wir [die Verwendung von Chrome Tracing mit Runtime Call Stats (RCS)](/docs/rcs). In den RCS-Ergebnissen zeigen `Parse-Background` und `Compile-Background`, wie viel Zeit für das Parsen und Kompilieren von JavaScript außerhalb des Hauptthreads aufgewendet wird, während `Parse` und `Compile` die Hauptthread-Metriken erfassen.

![](/_img/cost-of-javascript-2019/rcs.png)

## Was ist die Auswirkung dieser Änderungen in der Realität?

Sehen wir uns einige Beispiele von realen Webseiten an und wie Skript-Streaming angewendet wird.

![Zeitaufwand auf Haupt- vs. Worker-Thread beim Parsen und Kompilieren von Reddits JS auf einem MacBook Pro](/_img/cost-of-javascript-2019/reddit-main-thread.svg)

Reddit.com hat mehrere 100 kB+ Bundles, die in äußeren Funktionen gewickelt sind und eine Menge [lazy compilation](/blog/preparser) im Hauptthread verursachen. In der obigen Grafik zählt die Zeit des Hauptthreads wirklich, da das Beschäftigen des Hauptthreads die Interaktivität verzögern kann. Reddit verbringt die meiste Zeit im Hauptthread mit minimaler Nutzung des Worker-/Hintergrundthreads.

Sie würden davon profitieren, einige ihrer größeren Bundles in kleinere (z. B. 50 kB) ohne Umhüllung aufzuteilen, um die Parallelisierung zu maximieren — so dass jedes Bundle separat gestreamt-geparst und kompiliert werden könnte und das Parsen/Kompilieren des Hauptthreads während des Startens reduziert wird.

![Zeitaufwand auf Haupt- vs. Worker-Thread beim Parsen und Kompilieren von Facebooks JS auf einem MacBook Pro](/_img/cost-of-javascript-2019/facebook-main-thread.svg)

Wir können uns auch eine Seite wie Facebook.com ansehen. Facebook lädt ~6 MB komprimiertes JS über ~292 Anfragen, teils asynchron, teils vorab geladen und teils mit niedriger Priorität abgerufen. Viele ihrer Skripte sind sehr klein und granular — dies kann bei der Gesamtparallelisierung im Hintergrund-/Worker-Thread helfen, da diese kleineren Skripte gleichzeitig gestreamt-geparst/kompiliert werden können.

Beachten Sie, dass Sie wahrscheinlich nicht Facebook sind und wahrscheinlich keine langlebige App wie Facebook oder Gmail haben, bei der so viele Skripte auf dem Desktop gerechtfertigt sein könnten. Im Allgemeinen sollten Sie jedoch Ihre Bundles grob halten und nur das laden, was Sie benötigen.

Obwohl die meisten Arbeiten zum Parsen und Kompilieren von JavaScript auf einem Hintergrundthread im Streaming-Modus stattfinden können, muss noch ein Teil der Arbeit im Hauptthread erfolgen. Wenn der Hauptthread beschäftigt ist, kann die Seite nicht auf Benutzereingaben reagieren. Behalten Sie die Auswirkungen sowohl des Herunterladens als auch des Ausführens von Code auf Ihre Benutzererfahrung im Auge.

:::hinweis
**Hinweis:** Derzeit implementieren nicht alle JavaScript-Engines und Browser Skript-Streaming als Ladeoptimierung. Wir glauben dennoch, dass die hier aufgeführte Anleitung zu guten Benutzererfahrungen übergreifend führt.
:::

## Die Kosten für das Parsen von JSON

Da die JSON-Grammatik viel einfacher als die JavaScript-Grammatik ist, kann JSON effizienter geparst werden als JavaScript. Dieses Wissen kann genutzt werden, um die Startleistung von Web-Apps zu verbessern, die große JSON-ähnliche Konfigurationsobjektliterale (wie Inline-Redux-Stores) versenden. Anstatt die Daten wie folgt als JavaScript-Objektliteral in den Code einzubetten:

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…kann es im JSON-stringifizierten Format dargestellt und dann zur Laufzeit geparst werden:

```js
const data = JSON.parse('{"foo":42,"bar":1337}'); // 🚀
```

Solange der JSON-String nur einmal ausgewertet wird, ist die `JSON.parse`-Methode [viel schneller](https://github.com/GoogleChromeLabs/json-parse-benchmark) im Vergleich zum JavaScript-Objektliteral, insbesondere bei kalten Ladevorgängen. Eine gute Faustregel ist, diese Technik für Objekte von 10 kB oder größer anzuwenden — aber wie immer bei Leistungsratschlägen: Messen Sie die tatsächlichen Auswirkungen, bevor Sie Änderungen vornehmen.

![`JSON.parse('…')` ist [viel schneller](https://github.com/GoogleChromeLabs/json-parse-benchmark) zu parsen, zu kompilieren und auszuführen im Vergleich zu einem entsprechenden JavaScript-Literal — nicht nur in V8 (1,7× so schnell), sondern in allen wichtigen JavaScript-Engines.](/_img/cost-of-javascript-2019/json.svg)

Das folgende Video erklärt detaillierter, woher der Leistungsunterschied kommt, ab der Marke von 02:10.

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/ff4fgQxPaO0?start=130" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=ff4fgQxPaO0">„Schnellere Apps mit <code>JSON.parse</code>“</a>, präsentiert von Mathias Bynens auf der #ChromeDevSummit 2019.</figcaption>
</figure>

Sehen Sie sich [unseren _JSON ⊂ ECMAScript_ Feature-Erklärer](/features/subsume-json#embedding-json-parse) für eine Beispielimplementierung an, die aus einem beliebigen Objekt ein gültiges JavaScript-Programm erzeugt, das dieses mit `JSON.parse` analysiert.

Es gibt ein zusätzliches Risiko beim Verwenden von einfachen Objektliteralen für große Datenmengen: Sie könnten _zweimal_ analysiert werden!

1. Der erste Durchgang erfolgt, wenn das Literal vorgeparst wird.
2. Der zweite Durchgang erfolgt, wenn das Literal lazy-geparst wird.

Der erste Durchgang kann nicht vermieden werden. Glücklicherweise kann der zweite Durchgang vermieden werden, indem das Objektliteral auf Top-Level platziert wird oder innerhalb eines [PIFE](/blog/preparser#pife).

## Wie sieht es mit der Analyse/Compilierung bei wiederholten Besuchen aus?

Die (Byte-)Code-Caching-Optimierung von V8 kann helfen. Wenn ein Skript zum ersten Mal angefordert wird, lädt Chrome es herunter und gibt es an V8 zur Compilierung weiter. Es speichert die Datei auch im On-Disk-Cache des Browsers. Wenn die JS-Datei ein zweites Mal angefordert wird, nimmt Chrome die Datei aus dem Browser-Cache und gibt sie erneut an V8 zur Compilierung. Dieses Mal wird der kompilierte Code jedoch serialisiert und als Metadata an die zwischengespeicherte Skriptdatei angehängt.

![Visualisierung, wie Code-Caching in V8 funktioniert](/_img/cost-of-javascript-2019/code-caching.png)

Beim dritten Mal nimmt Chrome sowohl die Datei als auch die Metadata der Datei aus dem Cache und gibt beides an V8 weiter. V8 deserialisiert die Metadata und kann die Compilierung überspringen. Code-Caching setzt ein, wenn die ersten beiden Besuche innerhalb von 72 Stunden stattfinden. Chrome hat auch ein aggressives Code-Caching, wenn ein Service-Arbeiter verwendet wird, um Skripts zu cachen. Sie können mehr über Code-Caching in [Code-Caching für Webentwickler](/blog/code-caching-for-devs) lesen.

## Schlussfolgerungen

Download- und Ausführungszeit sind die Hauptengpässe beim Laden von Skripten im Jahr 2019. Streben Sie ein kleines Paket an synchronen (eingebetteten) Skripten für Ihre Above-the-Fold-Inhalte an, mit einem oder mehreren verzögerten Skripten für den Rest der Seite. Zerteilen Sie Ihre großen Pakete, sodass Sie sich nur auf das Versenden von Code konzentrieren, den der Nutzer benötigt, wenn er ihn benötigt. Dies maximiert die Parallelisierung in V8.

Auf Mobilgeräten sollten Sie weit weniger Skript versenden, aufgrund von Netzwerk, Speicherverbrauch und Ausführungszeit bei langsameren CPUs. Balance zwischen Latenz und Cache-Fähigkeit hilft, die Menge an Parser- und Compilierungsarbeit zu maximieren, die außerhalb des Hauptthreads stattfinden kann.

## Weiterführende Literatur

- [Blitzschnelles Parsen, Teil 1: Optimierung des Scanners](/blog/scanner)
- [Blitzschnelles Parsen, Teil 2: Lazy Parsing](/blog/preparser)
