---
title: "Code-Caching für JavaScript-Entwickler"
author: "[Leszek Swirski](https://twitter.com/leszekswirski), Cache-Zerkleinerer"
avatars: 
  - leszek-swirski
date: "2019-04-08 13:33:37"
updated: 2020-06-16
tags: 
  - internals
description: "(Byte)code-Caching reduziert die Startzeit häufig besuchter Websites, indem es das Ergebnis des JavaScript-Parsings + der Kompilierung zwischenspeichert."
tweet: "1115264282675953664"
---
Code-Caching (auch bekannt als _Bytecode-Caching_) ist eine wichtige Optimierung in Browsern. Es reduziert die Startzeit häufig besuchter Websites, indem es das Ergebnis von Parsing + Kompilierung zwischenspeichert. Die meisten [beliebten](https://blog.mozilla.org/javascript/2017/12/12/javascript-startup-bytecode-cache/) [Browser](https://bugs.webkit.org/show_bug.cgi?id=192782) implementieren eine Form des Code-Cachings, und Chrome bildet da keine Ausnahme. Tatsächlich haben wir bereits [darüber geschrieben](/blog/code-caching), [und](/blog/improved-code-caching) [gesprochen](https://www.youtube.com/watch?v=YqHOUy2rYZ8), wie Chrome und V8 kompilierten Code in der Vergangenheit zwischenspeichern.

<!--truncate-->
In diesem Blogbeitrag geben wir einige Ratschläge für JS-Entwickler, die Code-Caching optimal nutzen möchten, um den Start ihrer Websites zu verbessern. Diese Tipps konzentrieren sich auf die Implementierung des Cachings in Chrome/V8, aber die meisten von ihnen lassen sich wahrscheinlich auch auf die Code-Caching-Implementierungen anderer Browser übertragen.

## Wiederholung des Code-Cachings

Während andere Blogbeiträge und Präsentationen mehr Details zu unserer Code-Caching-Implementierung bieten, lohnt es sich, kurz zusammenzufassen, wie die Dinge funktionieren. Chrome hat zwei Ebenen des Cachings für V8-kompilierten Code (sowohl für klassische Skripte als auch für Modulscripts): ein kostengünstiges „Best-Effort“-In-Memory-Cache, das von V8 verwaltet wird (der `Isolate`-Cache), und ein vollständig serialisiertes On-Disk-Cache.

Der `Isolate`-Cache arbeitet mit Skripten, die im selben V8-Isolate (d. h. im selben Prozess, grob gesagt „den Seiten derselben Website beim Navigieren im selben Tab“) kompiliert werden. Es ist ein „Best-Effort“-Cache in dem Sinne, dass er versucht, so schnell und minimal wie möglich zu sein, indem er bereits verfügbare Daten verwendet, auf Kosten einer möglicherweise geringeren Trefferquote und des Fehlens einer Prozessübergreifenden Zwischenspeicherung.

1. Wenn V8 ein Skript kompiliert, wird der kompilierte Bytecode in einer Hashtable (auf dem V8-Heap) gespeichert, die durch den Quellcode des Skripts indiziert wird.
1. Wenn Chrome V8 anweist, ein anderes Skript zu kompilieren, überprüft V8 zuerst, ob der Quellcode dieses Skripts mit einem Eintrag in dieser Hashtable übereinstimmt. Falls ja, geben wir einfach den vorhandenen Bytecode zurück.

Dieser Cache ist schnell und im Wesentlichen kostenlos, dennoch beobachten wir, dass er in der realen Welt eine Trefferrate von 80 % erreicht.

Das On-Disk-Code-Cache wird von Chrome (genauer gesagt von Blink) verwaltet und schließt die Lücke, die der `Isolate`-Cache nicht schließen kann: das Teilen von Code-Caches zwischen Prozessen und zwischen mehreren Chrome-Sitzungen. Es nutzt den bestehenden HTTP-Ressourcen-Cache, der das Zwischenspeichern und Ablaufen von aus dem Web empfangenen Daten verwaltet.

1. Wenn eine JS-Datei zum ersten Mal angefordert wird (d. h. ein _Cold Run_), lädt Chrome sie herunter und gibt sie an V8 zur Kompilierung weiter. Es speichert die Datei auch im On-Disk-Cache des Browsers.
1. Wenn die JS-Datei ein zweites Mal angefordert wird (d. h. ein _Warm Run_), ruft Chrome die Datei aus dem Browser-Cache ab und gibt sie erneut an V8 zur Kompilierung weiter. Dieses Mal wird jedoch der kompilierte Code serialisiert und als Metadaten an die zwischengespeicherte Skriptdatei angehängt.
1. Beim dritten Mal (d. h. ein _Hot Run_) ruft Chrome sowohl die Datei als auch deren Metadaten aus dem Cache ab und übergibt beides an V8. V8 deserialisiert die Metadaten und kann die Kompilierung überspringen.

Zusammenfassend:

![Code-Caching ist in Cold, Warm und Hot Runs unterteilt, wobei auf Warm Runs der In-Memory-Cache und auf Hot Runs der Disk-Cache verwendet wird.](/_img/code-caching-for-devs/overview.svg)

Basierend auf dieser Beschreibung können wir unsere besten Tipps geben, um die Nutzung der Code-Caches auf Ihrer Website zu optimieren.

## Tipp 1: nichts tun

Idealerweise ist das Beste, was Sie als JS-Entwickler tun können, um das Code-Caching zu verbessern, „nichts“. Das bedeutet eigentlich zwei Dinge: passives Nichtstun und aktives Nichtstun.

Code-Caching ist letztlich ein Implementierungsdetail des Browsers; eine auf Heuristik basierende Optimierung des Daten-/Speicherplatz-Prioritätsausgleichs, deren Implementierung und Heuristiken sich regelmäßig ändern können (und tun!). Wir als V8-Ingenieure geben unser Bestes, um diese Heuristiken für jeden im sich entwickelnden Web funktionsfähig zu machen, und ein Überoptimieren für die aktuellen Implementierungsdetails des Code-Cachings kann zu Enttäuschungen nach einigen Releases führen, wenn sich diese Details ändern. Außerdem haben andere JavaScript-Engines wahrscheinlich unterschiedliche Heuristiken für ihre Code-Caching-Implementierung. Daher lautet unser bester Rat, damit Code zwischengespeichert wird, wie auch unser Ratschlag für das Schreiben von JS: Schreiben Sie sauberen, idiomatischen Code, und wir werden unser Bestes tun, um zu optimieren, wie wir ihn zwischenspeichern.

Zusätzlich dazu, passiv nichts zu tun, sollten Sie auch aktiv versuchen, nichts zu tun. Jegliche Form von Caching hängt inhärent davon ab, dass sich Dinge nicht ändern. Daher ist es am besten, nichts zu tun, um gecachte Daten gecacht zu halten. Es gibt einige Möglichkeiten, wie Sie aktiv nichts tun können.

### Ändern Sie keinen Code

Das mag offensichtlich sein, aber es lohnt sich, dies explizit zu erwähnen — immer wenn Sie neuen Code bereitstellen, ist dieser Code noch nicht gecacht. Immer wenn der Browser eine HTTP-Anfrage für eine Skript-URL ausführt, kann er das Datum des letzten Abrufs dieser URL angeben, und wenn der Server weiß, dass die Datei sich nicht geändert hat, kann er eine 304 Not Modified-Antwort senden, die unseren Code-Cache heiß hält. Andernfalls aktualisiert eine 200 OK-Antwort unsere gecachte Ressource und leert den Code-Cache, wodurch er auf einen kalten Lauf zurückgesetzt wird.

![](/_img/code-caching-for-devs/http-200-vs-304.jpg "Drake bevorzugt HTTP 304-Antworten gegenüber HTTP 200-Antworten.")

Es ist verlockend, Ihre neuesten Codeänderungen sofort zu veröffentlichen, besonders wenn Sie die Auswirkungen einer bestimmten Änderung messen möchten, aber für Caches ist es viel besser, den Code so zu belassen, wie er ist, oder ihn zumindest so selten wie möglich zu aktualisieren. Erwägen Sie, eine Begrenzung von `≤ x` Deployments pro Woche aufzulegen, wobei `x` der Regler ist, den Sie einstellen können, um das Gleichgewicht zwischen Caching und Veraltbarkeit zu finden.

### Ändern Sie keine URLs

Code-Caches werden (derzeit) mit der URL eines Skripts verknüpft, da dies eine einfache Suche ermöglicht, ohne den eigentlichen Skript-Inhalt lesen zu müssen. Das bedeutet, dass das Ändern der URL eines Skripts (einschließlich beliebiger Abfrageparameter!) einen neuen Ressourceneintrag in unserem Ressourcen-Cache erstellt und damit einen neuen kalten Cache-Eintrag.

Natürlich kann dies auch verwendet werden, um das Löschen des Caches zu erzwingen, obwohl dies ebenfalls ein Implementierungsdetail ist; wir könnten eines Tages entscheiden, Caches mit dem Quelltext statt der Quell-URL zu verknüpfen, und dieser Rat wäre dann nicht mehr gültig.

### Ändern Sie kein Ausführungsverhalten

Eine der neueren Optimierungen in unserer Code-Caching-Implementierung besteht darin, den [kompilierten Code erst zu serialisieren, nachdem er ausgeführt wurde](/blog/improved-code-caching#increasing-the-amount-of-code-that-is-cached). Dies dient dazu, verzögert kompilierte Funktionen zu erfassen, die nur während der Ausführung kompiliert werden und nicht während der ursprünglichen Kompilierung.

Diese Optimierung funktioniert am besten, wenn jede Ausführung des Skripts denselben Code oder zumindest dieselben Funktionen ausführt. Dies könnte problematisch sein, wenn Sie z. B. A/B-Tests haben, die von einer Laufzeitentscheidung abhängen:

```js
if (Math.random() > 0.5) {
  A();
} else {
  B();
}
```

In diesem Fall wird entweder `A()` oder `B()` kompiliert und im warmen Lauf ausgeführt und in den Code-Cache aufgenommen, dennoch könnte jedes im Folgenden ausgeführt werden. Versuchen Sie stattdessen, Ihre Ausführung deterministisch zu halten, um sie auf dem gecachten Pfad zu lassen.

## Tipp 2: Tun Sie etwas

Zweifellos ist der Rat, „nichts“ zu tun, sei es passiv oder aktiv, nicht sehr befriedigend. Daher gibt es zusätzlich zum „Nichts“-Tun angesichts unserer aktuellen Heuristiken und Implementierung einige Dinge, die Sie tun können. Bitte denken Sie jedoch daran, dass sich Heuristiken ändern können, dieser Rat könnte sich ändern, und es gibt keinen Ersatz für Profiling.

![](/_img/code-caching-for-devs/with-great-power.jpg "Onkel Ben schlägt vor, dass Peter Parker vorsichtig sein sollte, wenn er das Cache-Verhalten seiner Webanwendung optimiert.")

### Bibliotheken vom Code, der sie verwendet, trennen

Code-Caching erfolgt grob auf Skript-Basis, was bedeutet, dass Änderungen an einem beliebigen Teil des Skripts den Cache für das gesamte Skript ungültig machen. Wenn Ihr bereitgestellter Code sowohl stabile als auch sich ändernde Teile in einem einzigen Skript enthält, z. B. Bibliotheken und Geschäftslogik, machen Änderungen am Geschäftslogik-Code den Cache des Bibliothekencodes ungültig.

Stattdessen können Sie den stabilen Bibliothekencode in ein separates Skript auslagern und separat einbinden. Dann kann der Bibliothekencode einmal gecacht werden und bleibt gecacht, wenn sich die Geschäftslogik ändert.

Das hat zusätzliche Vorteile, wenn die Bibliotheken zwischen verschiedenen Seiten Ihrer Webseite geteilt werden: Da der Code-Cache an das Skript gebunden ist, wird der Code-Cache für die Bibliotheken auch zwischen Seiten geteilt.

### Bibliotheken in den Code integrieren, der sie verwendet

Code-Caching erfolgt, nachdem jedes Skript ausgeführt wurde, was bedeutet, dass der Code-Cache eines Skripts genau diejenigen Funktionen in diesem Skript umfasst, die kompiliert wurden, als die Skriptausführung beendet wurde. Dies hat mehrere wichtige Konsequenzen für Bibliothekencode:

1. Der Code-Cache wird keine Funktionen aus früheren Skripten enthalten.
1. Der Code-Cache wird keine verzögert kompilierten Funktionen enthalten, die von späteren Skripten aufgerufen werden.

Insbesondere wenn eine Bibliothek vollständig aus verzögert kompilierten Funktionen besteht, werden diese Funktionen nicht gecacht, selbst wenn sie später verwendet werden.

Eine Lösung hierfür besteht darin, Bibliotheken und deren Nutzung in ein einzelnes Skript zu integrieren, sodass das Code-Caching erkennt, welche Teile der Bibliothek verwendet werden. Dies ist leider das genaue Gegenteil des obigen Ratschlags, da es keine universellen Lösungen gibt. Im Allgemeinen empfehlen wir nicht, alle Ihre JS-Skripte zu einem einzigen großen Bündel zusammenzuführen; die Aufteilung in mehrere kleinere Skripte ist aus anderen Gründen als dem Code-Caching (z.B. mehrere Netzwerkaufrufe, Streaming-Kompilierung, Seiteninteraktivität usw.) insgesamt vorteilhafter.

### Nutzen Sie IIFE-Heuristiken

Nur die Funktionen, die kompiliert werden, während das Skript ausgeführt wird, zählen zum Code-Cache. Es gibt viele Arten von Funktionen, die trotz späterer Ausführung nicht zwischengespeichert werden. Event-Handler (sogar `onload`), Promise-Ketten, ungenutzte Bibliotheksfunktionen und alles andere, das faul kompiliert wird, ohne bis `</script>` aufgerufen zu werden, bleibt faul und wird nicht zwischengespeichert.

Eine Möglichkeit, diese Funktionen zwischenspeichern zu lassen, besteht darin, sie zur Kompilierung zu zwingen. Ein üblicher Weg, die Kompilierung zu erzwingen, ist die Verwendung von IIFE-Heuristiken. IIFEs (sofort ausgeführte Funktionsausdrücke) sind ein Muster, bei dem eine Funktion direkt nach deren Erstellung aufgerufen wird:

```js
(function foo() {
  // …
})();
```

Da IIFEs sofort aufgerufen werden, versuchen die meisten JavaScript-Engines, sie zu erkennen und sofort zu kompilieren, um die Kosten für eine faule Kompilierung gefolgt von einer vollständigen Kompilierung zu vermeiden. Es gibt verschiedene Heuristiken, um IIFEs frühzeitig zu erkennen (bevor die Funktion analysiert werden muss), die gebräuchlichste ist ein `(` vor dem `function`-Schlüsselwort.

Da diese Heuristik frühzeitig angewendet wird, wird eine Kompilierung ausgelöst, selbst wenn die Funktion nicht tatsächlich sofort aufgerufen wird:

```js
const foo = function() {
  // Faul übersprungen
};
const bar = (function() {
  // Eifrig kompiliert
})();
```

Das bedeutet, dass Funktionen, die sich im Code-Cache befinden sollten, in diesen gezwungen werden können, indem sie in Klammern eingeschlossen werden. Dies kann jedoch die Startzeit verschlechtern, wenn der Hinweis falsch angewendet wird. Insgesamt handelt es sich um einen Missbrauch der Heuristik. Unser Rat lautet daher, dies nur dann zu tun, wenn es wirklich notwendig ist.

### Gruppieren Sie kleine Dateien

Chrome hat eine Mindestgröße für Code-Caches, die derzeit auf [1 KiB Quellcode](https://cs.chromium.org/chromium/src/third_party/blink/renderer/bindings/core/v8/v8_code_cache.cc?l=91&rcl=2f81d000fdb5331121cba7ff81dfaaec25b520a5) festgelegt ist. Das bedeutet, dass kleinere Skripte überhaupt nicht zwischengespeichert werden, da wir die Overheadkosten für größer als die Vorteile halten.

Wenn Ihre Website viele solcher kleiner Skripte hat, gilt möglicherweise nicht mehr dieselbe Overhead-Berechnung. Sie könnten in Betracht ziehen, diese zusammenzuführen, damit sie die Mindestcodesize überschreiten, und gleichzeitig von einer allgemeinen Reduzierung der Skriptoverheads profitieren.

### Vermeiden Sie Inline-Skripte

Skript-Tags, deren Quelle inline im HTML steht, haben keine externe Quelldatei, mit der sie verknüpft sind, und können daher mit dem oben genannten Mechanismus nicht zwischengespeichert werden. Chrome versucht zwar, Inline-Skripte zu zwischenspeichern, indem der Cache der HTML-Ressource zugeordnet wird, aber diese Zwischenspeicher werden dann vom *gesamten* HTML-Dokument abhängig und nicht zwischen Seiten geteilt.

Für nicht-triviale Skripte, die vom Code-Caching profitieren könnten, sollte daher vermieden werden, sie in das HTML einzubetten. Bevorzugen Sie stattdessen, sie als externe Dateien einzubinden.

### Verwenden Sie Service-Worker-Caches

Service Worker sind ein Mechanismus, mit dem Ihr Code Netzwerk-Anfragen für Ressourcen auf Ihrer Seite abfangen kann. Insbesondere ermöglichen sie es Ihnen, einen lokalen Cache einiger Ihrer Ressourcen zu erstellen und die Ressource aus dem Cache zu liefern, wenn sie angefordert wird. Dies ist besonders nützlich für Seiten, die offline weiterarbeiten sollen, wie z.B. PWAs.

Ein typisches Beispiel einer Website, die einen Service Worker verwendet, registriert den Service Worker in einer Hauptskriptdatei:

```js
// main.mjs
navigator.serviceWorker.register('/sw.js');
```

Und der Service Worker fügt Ereignishandler für die Installation (Erstellen eines Caches) und das Abrufen (Liefern von Ressourcen, möglicherweise aus dem Cache) hinzu.

```js
// sw.js
self.addEventListener('install', (event) => {
  async function buildCache() {
    const cache = await caches.open(cacheName);
    return cache.addAll([
      '/main.css',
      '/main.mjs',
      '/offline.html',
    ]);
  }
  event.waitUntil(buildCache());
});

self.addEventListener('fetch', (event) => {
  async function cachedFetch(event) {
    const cache = await caches.open(cacheName);
    let response = await cache.match(event.request);
    if (response) return response;
    response = await fetch(event.request);
    cache.put(event.request, response.clone());
    return response;
  }
  event.respondWith(cachedFetch(event));
});
```

Diese Caches können zwischengespeicherte JS-Ressourcen enthalten. Wir verwenden jedoch leicht andere Heuristiken, da wir unterschiedliche Annahmen treffen können. Da der Cache des Service Workers den speicherplatzverwalteten Speicherregeln folgt, wird er wahrscheinlich länger bestehen bleiben, und der Nutzen des Zwischenspeicherns ist größer. Außerdem können wir die Wichtigkeit von Ressourcen besser einschätzen, wenn diese vorab zwischengespeichert werden, bevor sie geladen werden.

Die größten heuristischen Unterschiede treten auf, wenn die Ressource während des Installationsereignisses des Service Workers zum Cache des Service Workers hinzugefügt wird. Das obige Beispiel zeigt eine solche Verwendung. In diesem Fall wird der Code-Cache sofort erstellt, wenn die Ressource in den Cache des Service Workers eingefügt wird. Darüber hinaus erzeugen wir einen "vollständigen" Code-Cache für diese Skripte – Funktionen werden nicht mehr verzögert kompiliert, sondern _alles_ wird kompiliert und in den Cache eingefügt. Dies hat den Vorteil einer schnellen und vorhersehbaren Leistung ohne Abhängigkeiten von der Ausführungsreihenfolge, allerdings auf Kosten eines erhöhten Speicherverbrauchs.

Wenn eine JS-Ressource über die Cache-API außerhalb des Installationsereignisses des Service Workers gespeichert wird, wird der Code-Cache *nicht* sofort generiert. Stattdessen wird der "normale" Code-Cache beim ersten Laden generiert, wenn ein Service Worker mit dieser Antwort aus dem Cache antwortet. Dieser Code-Cache steht dann beim zweiten Laden zur Verfügung, ein Ladevorgang schneller als beim typischen Szenario der Code-Caching. Ressourcen können außerhalb des Installationsereignisses in der Cache-API gespeichert werden, wenn Ressourcen während des Abrufereignisses "progressiv" zwischengespeichert werden oder wenn die Cache-API vom Hauptfenster statt vom Service Worker aktualisiert wird.

Beachten Sie, dass der vorkompilierte "vollständige" Code-Cache davon ausgeht, dass die Seite, auf der das Skript ausgeführt wird, UTF-8-Kodierung verwendet. Wenn die Seite am Ende eine andere Kodierung verwendet, wird der Code-Cache verworfen und durch einen "normalen" Code-Cache ersetzt.

Darüber hinaus nimmt der vorkompilierte "vollständige" Code-Cache an, dass die Seite das Skript als ein klassisches JS-Skript laden wird. Wenn die Seite es stattdessen als ES-Modul lädt, wird der Code-Cache verworfen und durch einen "normalen" Code-Cache ersetzt.

## Tracing

Keine der obigen Vorschläge garantiert, dass Ihre Web-App schneller wird. Leider werden Code-Caching-Informationen derzeit nicht in den DevTools angezeigt, sodass der robusteste Weg, herauszufinden, welche Skripte Ihrer Web-App Code-Caching nutzen, die niedrigstufigere `chrome://tracing` ist.

`chrome://tracing` zeichnet instrumentierte Spuren von Chrome über einen bestimmten Zeitraum auf, wobei die resultierende Trace-Visualisierung in etwa so aussieht:

![Die `chrome://tracing`-Benutzeroberfläche mit einer Aufnahme eines Warmcache-Laufs](/_img/code-caching-for-devs/chrome-tracing-visualization.png)

Tracing zeichnet das Verhalten des gesamten Browsers auf, einschließlich anderer Tabs, Fenster und Erweiterungen. Es funktioniert am besten, wenn es in einem sauberen Benutzerprofil durchgeführt wird, mit deaktivierten Erweiterungen und ohne geöffnete andere Browser-Tabs:

```bash
# Starten Sie eine neue Chrome-Browsersitzung mit einem sauberen Benutzerprofil und deaktivierten Erweiterungen
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

Wenn Sie eine Spur aufzeichnen, müssen Sie auswählen, welche Kategorien aufgezeichnet werden sollen. In den meisten Fällen können Sie einfach die Kategorie "Webentwickler" auswählen, aber Sie können auch Kategorien manuell auswählen. Die wichtige Kategorie für Code-Caching ist `v8`.

![](/_img/code-caching-for-devs/chrome-tracing-categories-1.png)

![](/_img/code-caching-for-devs/chrome-tracing-categories-2.png)

Nach der Aufzeichnung einer Spur mit der Kategorie `v8` suchen Sie in der Spur nach `v8.compile`-Segmenten. (Alternativ können Sie `v8.compile` in das Suchfeld der Tracing-Benutzeroberfläche eingeben.) Diese listen die Datei, die kompiliert wird, und einige Metadaten zur Kompilierung auf.

Bei einem Kaltdurchlauf eines Skripts gibt es keine Informationen zum Code-Caching — dies bedeutet, dass das Skript nicht an der Erstellung oder Nutzung von Cache-Daten beteiligt war.

![](/_img/code-caching-for-devs/chrome-tracing-cold-run.png)

Bei einem Warmdurchlauf gibt es zwei `v8.compile`-Einträge pro Skript: einen für die eigentliche Kompilierung (wie oben) und einen (nach der Ausführung) für die Cache-Produktion. Letzteren können Sie daran erkennen, dass er die Metadatenfelder `cacheProduceOptions` und `producedCacheSize` hat.

![](/_img/code-caching-for-devs/chrome-tracing-warm-run.png)

Bei einem Heißdurchlauf sehen Sie einen `v8.compile`-Eintrag für die Cache-Nutzung mit den Metadatenfeldern `cacheConsumeOptions` und `consumedCacheSize`. Alle Größenangaben werden in Bytes ausgedrückt.

![](/_img/code-caching-for-devs/chrome-tracing-hot-run.png)

## Fazit

Für die meisten Entwickler sollte das Code-Caching "einfach funktionieren". Es funktioniert am besten, wie jeder Cache, wenn sich nichts ändert, und basiert auf Heuristiken, die sich zwischen Versionen ändern können. Dennoch hat das Code-Caching Eigenschaften, die genutzt werden können, und Einschränkungen, die vermieden werden können. Eine sorgfältige Analyse mit `chrome://tracing` kann Ihnen helfen, das Caching für Ihre Web-App anzupassen und zu optimieren.
