---
title: &apos;JavaScript-Module&apos;
author: &apos;Addy Osmani ([@addyosmani](https://twitter.com/addyosmani)) und Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
- &apos;addy-osmani&apos;
- &apos;mathias-bynens&apos;
date: 2018-06-18
tags:
  - ECMAScript
  - ES2015
description: &apos;Dieser Artikel erklärt, wie man JavaScript-Module verwendet, wie man sie verantwortungsbewusst einsetzt und wie das Chrome-Team daran arbeitet, Module in Zukunft noch besser zu machen.&apos;
tweet: &apos;1008725884575109120&apos;
---
JavaScript-Module werden jetzt [in allen großen Browsern unterstützt](https://caniuse.com/#feat=es6-module)!

<feature-support chrome="61"
                 firefox="60"
                 safari="11"
                 nodejs="13.2.0 https://nodejs.org/en/blog/release/v13.2.0/#notable-changes"
                 babel="yes"></feature-support>

Dieser Artikel erklärt, wie man JS-Module verwendet, wie man sie verantwortungsbewusst einsetzt und wie das Chrome-Team daran arbeitet, Module in Zukunft noch besser zu machen.

## Was sind JS-Module?

JS-Module (auch bekannt als „ES-Module“ oder „ECMAScript-Module“) sind eine wichtige neue Funktion oder vielmehr eine Sammlung neuer Funktionen. Vielleicht haben Sie in der Vergangenheit ein benutzerdefiniertes JavaScript-Modulsystem verwendet. Vielleicht haben Sie [CommonJS wie in Node.js](https://nodejs.org/docs/latest-v10.x/api/modules.html) verwendet, oder vielleicht [AMD](https://github.com/amdjs/amdjs-api/blob/master/AMD.md) oder etwas anderes. All diese Modulsysteme haben eines gemeinsam: Sie ermöglichen es Ihnen, Dinge zu importieren und zu exportieren.

<!--truncate-->
JavaScript hat jetzt eine standardisierte Syntax genau dafür. Innerhalb eines Moduls können Sie das Keyword `export` verwenden, um so ziemlich alles zu exportieren. Sie können eine `const`, eine `function` oder eine andere Variablenbindung oder -deklaration exportieren. Fügen Sie einfach der Variablenanweisung oder -deklaration das Präfix `export` hinzu, und schon sind Sie fertig:

```js
// 📁 lib.mjs
export const repeat = (string) => `${string} ${string}`;
export function shout(string) {
  return `${string.toUpperCase()}!`;
}
```

Sie können dann das Keyword `import` verwenden, um das Modul aus einem anderen Modul zu importieren. Hier importieren wir die Funktionen `repeat` und `shout` aus dem Modul `lib` und verwenden sie in unserem Modul `main`:

```js
// 📁 main.mjs
import {repeat, shout} from &apos;./lib.mjs&apos;;
repeat(&apos;hello&apos;);
// → &apos;hello hello&apos;
shout(&apos;Module im Einsatz&apos;);
// → &apos;MODULE IM EINSATZ!&apos;
```

Sie können auch einen _Standardwert_ aus einem Modul exportieren:

```js
// 📁 lib.mjs
export default function(string) {
  return `${string.toUpperCase()}!`;
}
```

Solche `default`-Exporte können mit beliebigem Namen importiert werden:

```js
// 📁 main.mjs
import shout from &apos;./lib.mjs&apos;;
//     ^^^^^
```

Module unterscheiden sich ein wenig von klassischen Skripten:

- Module haben den [Strict Mode](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Strict_mode) standardmäßig aktiviert.

- HTML-Kommentar-Syntax wird in Modulen nicht unterstützt, obwohl sie in klassischen Skripten funktioniert.

    ```js
    // Verwenden Sie keine HTML-Kommentar-Syntax in JavaScript!
    const x = 42; <!-- TODO: Benennen Sie x in y um.
    // Verwenden Sie stattdessen einen normalen einzeiligen Kommentar:
    const x = 42; // TODO: Benennen Sie x in y um.
    ```

- Module haben einen lexikalischen Top-Level-Scope. Das bedeutet, dass z. B. das Ausführen von `var foo = 42;` innerhalb eines Moduls *keine* globale Variable namens `foo` erstellt, die über `window.foo` in einem Browser zugänglich ist, obwohl dies bei einem klassischen Skript der Fall wäre.

- Ebenso bezieht sich `this` innerhalb von Modulen nicht auf das globale `this`, sondern ist `undefined`. (Verwenden Sie [`globalThis`](/features/globalthis), wenn Sie Zugriff auf das globale `this` benötigen.)

- Die neue statische `import`- und `export`-Syntax ist nur innerhalb von Modulen verfügbar — sie funktioniert nicht in klassischen Skripten.

- [`await` auf oberster Ebene](/features/top-level-await) ist in Modulen verfügbar, aber nicht in klassischen Skripten. In ähnlicher Weise kann `await` nicht als Variablenname irgendwo in einem Modul verwendet werden, obwohl Variablen in klassischen Skripten _außerhalb von Async-Funktionen_ `await` genannt werden können.

Wegen dieser Unterschiede kann *derselbe JavaScript-Code unterschiedlich funktionieren, je nachdem, ob er als Modul oder als klassisches Skript behandelt wird*. Aus diesem Grund muss die JavaScript-Laufzeit wissen, welche Skripte Module sind.

## Verwendung von JS-Modulen im Browser

Im Web können Sie Browsern mitteilen, ein `<script>`-Element als Modul zu behandeln, indem Sie das Attribut `type` auf `module` setzen.

```html
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

Browser, die `type="module"` verstehen, ignorieren Skripte mit einem `nomodule`-Attribut. Das bedeutet, dass Sie ein modulgesteuertes Skript an Browser mit Modulunterstützung ausliefern können, während Sie gleichzeitig eine Rückfallebene für andere Browser bereitstellen. Die Möglichkeit, diese Unterscheidung zu treffen, ist beeindruckend, und das allein schon aus Performancegründen! Denken Sie daran: Nur moderne Browser unterstützen Module. Wenn ein Browser Ihren Modulcode versteht, unterstützt er auch [Funktionen, die vor Modulen existierten](https://codepen.io/samthor/pen/MmvdOM), wie z. B. Pfeilfunktionen oder `async`-`await`. Diese Funktionen müssen Sie in Ihrem Modul-Bundle nicht mehr transpilen! Sie können [kleinere und weitgehend untranspilierte modulgesteuerte Skripte an moderne Browser ausliefern](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/). Nur ältere Browser erhalten das `nomodule`-Skript.

Da [Module standardmäßig verzögert sind](#defer), möchten Sie möglicherweise auch das `nomodule`-Skript verzögert laden:

```html
<script type="module" src="main.mjs"></script>
<script nomodule defer src="fallback.js"></script>
```

### Browser-spezifische Unterschiede zwischen Modulen und klassischen Skripten

Wie Sie jetzt wissen, unterscheiden sich Module von klassischen Skripten. Neben den plattformneutralen Unterschieden, die wir oben beschrieben haben, gibt es auch browser-spezifische Unterschiede.

Zum Beispiel werden Module nur einmal ausgeführt, während klassische Skripte so oft ausgeführt werden, wie sie dem DOM hinzugefügt werden.

```html
<script src="classic.js"></script>
<script src="classic.js"></script>
<!-- classic.js wird mehrfach ausgeführt. -->

<script type="module" src="module.mjs"></script>
<script type="module" src="module.mjs"></script>
<script type="module">import &apos;./module.mjs&apos;;</script>
<!-- module.mjs wird nur einmal ausgeführt. -->
```

Außerdem werden Modulscripte und ihre Abhängigkeiten mit CORS abgerufen. Das bedeutet, dass modulübergreifende Modulscripte mit den richtigen Headern bereitgestellt werden müssen, wie z. B. `Access-Control-Allow-Origin: *`. Dies gilt nicht für klassische Skripte.

Ein weiterer Unterschied betrifft das `async`-Attribut. Dieses bewirkt, dass das Skript heruntergeladen wird, ohne den HTML-Parser zu blockieren (ähnlich wie `defer`), es wird jedoch so früh wie möglich ausgeführt, ohne garantierte Reihenfolge und ohne darauf zu warten, dass das HTML-Parsing abgeschlossen ist. Das `async`-Attribut funktioniert nicht für Inline-Klassik-Skripte, aber es funktioniert für Inline-`<script type="module">`.

### Ein Hinweis zu Dateiendungen

Sie haben wahrscheinlich bemerkt, dass wir die Dateiendung `.mjs` für Module verwenden. Im Web spielt die Dateiendung eigentlich keine Rolle, solange die Datei mit [dem JavaScript-MIME-Typ `text/javascript`](https://html.spec.whatwg.org/multipage/scripting.html#scriptingLanguages:javascript-mime-type) bereitgestellt wird. Der Browser weiß, dass es sich um ein Modul handelt, aufgrund des `type`-Attributs des Skriptelements.

Trotzdem empfehlen wir die Verwendung der `.mjs`-Endung für Module aus zwei Gründen:

1. Während der Entwicklung macht die Dateiendung `.mjs` klar erkennbar – sowohl für Sie als auch für jeden anderen, der sich Ihr Projekt ansieht –, dass es sich bei der Datei um ein Modul handelt und nicht um ein klassisches Skript. (Ein Blick auf den Code reicht nicht immer aus, um das zu erkennen.) Wie bereits erwähnt, werden Module anders behandelt als klassische Skripte, sodass der Unterschied enorm wichtig ist!
1. Sie stellt sicher, dass Ihre Datei in Laufzeitumgebungen wie [Node.js](https://nodejs.org/api/esm.html#enabling) und [`d8`](/docs/d8) sowie in Build-Tools wie [Babel](https://babeljs.io/docs/en/options#sourcetype) als Modul analysiert wird. Während diese Umgebungen und Tools jeweils proprietäre Möglichkeiten haben, über Konfiguration Dateien mit anderen Endungen als Module zu interpretieren, ist `.mjs` die plattformübergreifende Möglichkeit, sicherzustellen, dass Dateien als Module behandelt werden.

:::note
**Hinweis:** Um `.mjs` im Web bereitzustellen, muss Ihr Webserver so konfiguriert sein, dass Dateien mit dieser Endung mit dem entsprechenden `Content-Type: text/javascript`-Header bereitgestellt werden, wie oben erwähnt. Darüber hinaus möchten Sie möglicherweise Ihren Editor so konfigurieren, dass `.mjs`-Dateien als `.js`-Dateien behandelt werden, um Syntaxhervorhebung zu erhalten. Die meisten modernen Editoren tun dies bereits standardmäßig.
:::

### Modulspezifikatoren

Beim `import`ieren von Modulen wird die Zeichenfolge, die den Ort des Moduls angibt, als „Modulspezifikator“ oder „Import-Spezifikator“ bezeichnet. In unserem vorherigen Beispiel ist der Modulspezifikator `&apos;./lib.mjs&apos;`:

```js
import {shout} from &apos;./lib.mjs&apos;;
//                  ^^^^^^^^^^^
```

Einige Einschränkungen gelten für Modulspezifikatoren in Browsern. So genannte „bare“ Modulspezifikatoren werden derzeit nicht unterstützt. Diese Einschränkung ist [spezifiziert](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier), damit Browser in Zukunft benutzerdefinierte Modul-Loader erlauben können, die bare Modulspezifikatoren wie die folgenden unterschiedlich behandeln:

```js
// Noch nicht unterstützt:
import {shout} from &apos;jquery&apos;;
import {shout} from &apos;lib.mjs&apos;;
import {shout} from &apos;modules/lib.mjs&apos;;
```

Andererseits werden die folgenden Beispiele alle unterstützt:

```js
// Unterstützt:
import {shout} from &apos;./lib.mjs&apos;;
import {shout} from &apos;../lib.mjs&apos;;
import {shout} from &apos;/modules/lib.mjs&apos;;
import {shout} from &apos;https://simple.example/modules/lib.mjs&apos;;
```

Bis auf Weiteres müssen Modulspezifikatoren vollständige URLs oder relative URLs sein, die mit `/`, `./` oder `../` beginnen.

### Module sind standardmäßig verzögert

Klassische `<script>`s blockieren standardmäßig den HTML-Parser. Sie können das umgehen, indem Sie [das `defer`-Attribut hinzufügen](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer), das sicherstellt, dass der Skript-Download parallel zum HTML-Parsing erfolgt.

![](/_img/modules/async-defer.svg)

Modulscripte werden standardmäßig verzögert ausgeführt. Daher ist es nicht notwendig, `defer` zu Ihren `<script type="module">`-Tags hinzuzufügen! Nicht nur der Download des Hauptmoduls erfolgt parallel zur HTML-Analyse, sondern auch für alle Abhängigkeitsmodule gilt dasselbe!

## Weitere Modulfunktionen

### Dynamisches `import()`

Bisher haben wir nur statisches `import` verwendet. Mit statischem `import` muss Ihr gesamter Modulgraph heruntergeladen und ausgeführt werden, bevor Ihr Hauptcode ausgeführt werden kann. Manchmal möchten Sie ein Modul nicht sofort laden, sondern nach Bedarf, nur wenn Sie es benötigen – beispielsweise wenn der Benutzer auf einen Link oder eine Schaltfläche klickt. Dies verbessert die Leistung der Startzeit. [Dynamisches `import()`](/features/dynamic-import) macht dies möglich!

```html
<script type="module">
  (async () => {
    const moduleSpecifier = &apos;./lib.mjs&apos;;
    const {repeat, shout} = await import(moduleSpecifier);
    repeat(&apos;hello&apos;);
    // → &apos;hello hello&apos;
    shout(&apos;Dynamic import in action&apos;);
    // → &apos;DYNAMIC IMPORT IN ACTION!&apos;
  })();
</script>
```

Im Gegensatz zu statischem `import` kann dynamisches `import()` auch in regulären Skripten verwendet werden. Es ist ein einfacher Weg, schrittweise Module in Ihre bestehende Codebasis zu integrieren. Weitere Details finden Sie in [unserem Artikel über dynamisches `import()`](/features/dynamic-import).

:::note
**Hinweis:** [Webpack hat seine eigene Version von `import()`](https://web.dev/use-long-term-caching/), die das importierte Modul geschickt in einen eigenen Chunk aufteilt, getrennt vom Hauptbundle.
:::

### `import.meta`

Eine weitere neue, modulbezogene Funktion ist `import.meta`, die Ihnen Metadaten über das aktuelle Modul liefert. Die genauen Metadaten, die Sie erhalten, sind nicht als Teil von ECMAScript definiert; sie hängen von der Host-Umgebung ab. In einem Browser könnten Sie beispielsweise andere Metadaten erhalten als in Node.js.

Hier ist ein Beispiel für `import.meta` im Web. Standardmäßig werden Bilder relativ zur aktuellen URL in HTML-Dokumenten geladen. `import.meta.url` ermöglicht es, ein Bild relativ zum aktuellen Modul zu laden.

```js
function loadThumbnail(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  const image = new Image();
  image.src = url;
  return image;
}

const thumbnail = loadThumbnail(&apos;../img/thumbnail.png&apos;);
container.append(thumbnail);
```

## Leistungsempfehlungen

### Behalten Sie das Bundling bei

Mit Modulen wird es möglich, Webseiten zu entwickeln, ohne Bundler wie Webpack, Rollup oder Parcel zu verwenden. Es ist in den folgenden Szenarien in Ordnung, native JS-Module direkt zu verwenden:

- während der lokalen Entwicklung
- in der Produktion für kleine Web-Apps mit insgesamt weniger als 100 Modulen und einer relativ flachen Abhängigkeitsstruktur (d.h. einer maximalen Tiefe von weniger als 5)

Wie wir jedoch bei [unserer Engpassanalyse der Chrome-Ladepipeline beim Laden einer modularisierten Bibliothek mit etwa 300 Modulen](https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub) gelernt haben, ist die Ladeleistung von gebündelten Anwendungen besser als die von ungebündelten.

<figure>
  <a href="https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub">
    <img src="/_img/modules/renderer-main-thread-time-breakdown.svg" width="830" height="311" alt="" loading="lazy"/>
  </a>
</figure>

Ein Grund dafür ist, dass die statische Syntax `import`/`export` statisch analysierbar ist und somit Bundler-Tools dabei helfen kann, Ihren Code zu optimieren, indem nicht genutzte Exports eliminiert werden. Statisches `import` und `export` sind mehr als nur Syntax; sie sind eine wichtige Funktion für Werkzeuge!

*Unsere generelle Empfehlung lautet, weiterhin Bundler zu verwenden, bevor Module in der Produktion bereitgestellt werden.* In gewisser Weise ist das Bundling eine ähnliche Optimierung wie das Minimieren Ihres Codes: Es führt zu einem Leistungsgewinn, da letztendlich weniger Code ausgeliefert wird. Bundling hat die gleiche Wirkung! Behalten Sie das Bundling bei.

Wie immer kann [die Code-Abdeckungsfunktion in den DevTools](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage) Ihnen dabei helfen, festzustellen, ob Sie unnötigen Code an Benutzer weitergeben. Wir empfehlen auch die Verwendung von [Code-Splitting](https://developers.google.com/web/fundamentals/performance/webpack/use-long-term-caching#lazy-loading), um Bundles aufzuteilen und das Laden von nicht kritischen First-Meaningful-Paint-Skripten zu verzögern.

#### Abwägungen zwischen Bundling und dem Bereitstellen ungebündelter Module

Wie üblich in der Webentwicklung ist alles eine Abwägung. Das Bereitstellen ungebündelter Module kann die anfängliche Ladeleistung (kalte Cache) verringern, könnte jedoch tatsächlich die Ladeleistung für erneute Besuche (warmer Cache) verbessern, verglichen mit der Bereitstellung eines einzigen Bundles ohne Code-Splitting. Für eine Codebasis von 200 KB ist es wesentlich besser, ein einzelnes feinkörniges Modul zu ändern und nur dieses vom Server für erneute Besuche abrufen zu müssen, als das gesamte Bundle erneut abrufen zu müssen.

Wenn Sie sich mehr um die Erfahrung von Besuchern mit einem warmen Cache als um die Leistung des ersten Besuchs sorgen und eine Website mit weniger als einigen hundert feinkörnigen Modulen haben, könnten Sie experimentieren, ungebündelte Module bereitzustellen, die Leistungsauswirkungen sowohl für kalte als auch warme Ladezyklen messen und dann eine datenbasierte Entscheidung treffen!

Browser-Entwickler arbeiten intensiv daran, die Leistung von Modulen ohne zusätzliche Anpassungen zu verbessern. Im Laufe der Zeit erwarten wir, dass das Ausliefern von ungebündelten Modulen in mehr Situationen praktikabel wird.

### Feingranulare Module verwenden

Gewöhnen Sie sich an, Ihren Code mit kleinen, feingranularen Modulen zu schreiben. Während der Entwicklung ist es im Allgemeinen besser, nur wenige Exporte pro Modul zu haben, statt viele Exporte manuell in eine einzige Datei zu kombinieren.

Betrachten wir ein Modul namens `./util.mjs`, das drei Funktionen namens `drop`, `pluck` und `zip` exportiert:

```js
export function drop() { /* … */ }
export function pluck() { /* … */ }
export function zip() { /* … */ }
```

Wenn Ihr Code nur wirklich die `pluck`-Funktionalität benötigt, würden Sie sie wahrscheinlich wie folgt importieren:

```js
import {pluck} from &apos;./util.mjs&apos;;
```

In diesem Fall muss der Browser (ohne einen Bundling-Schritt zur Build-Zeit) dennoch das gesamte Modul `./util.mjs` herunterladen, analysieren und kompilieren, obwohl tatsächlich nur dieser eine Export benötigt wird. Das ist verschwenderisch!

Wenn `pluck` keinen Code mit `drop` und `zip` teilt, wäre es besser, es in ein feingranulares eigenes Modul zu verschieben, z. B. `./pluck.mjs`.

```js
export function pluck() { /* … */ }
```

Wir können dann `pluck` ohne den Overhead der Bearbeitung von `drop` und `zip` importieren:

```js
import {pluck} from &apos;./pluck.mjs&apos;;
```

:::note
**Hinweis:** Sie könnten hier einen `default`-Export statt eines benannten Exports verwenden, je nach persönlicher Präferenz.
:::

Dies hält nicht nur Ihren Quellcode sauber und übersichtlich, sondern verringert auch die Notwendigkeit der Eliminierung von nicht verwendetem Code durch Bundler. Wenn eines der Module in Ihrem Quellbaum ungenutzt ist, wird es nie importiert, und der Browser lädt es daher nicht herunter. Die Module, die _verwendet_ werden, können vom Browser individuell [code-cached](/blog/code-caching-for-devs) werden. (Die Infrastruktur, um dies zu ermöglichen, ist bereits in V8 integriert, und [es wird daran gearbeitet](https://bugs.chromium.org/p/chromium/issues/detail?id=841466), dies auch in Chrome zu aktivieren.)

Die Verwendung kleiner, feingranularer Module bereitet Ihren Quellcode auf eine Zukunft vor, in der möglicherweise [eine native Bundling-Lösung](#web-packaging) verfügbar ist.

### Module vorladen

Sie können die Bereitstellung Ihrer Module weiter optimieren, indem Sie [`<link rel="modulepreload">`](https://developers.google.com/web/updates/2017/12/modulepreload) verwenden. Auf diese Weise können Browser Module und deren Abhängigkeiten vorladen, vorab analysieren und vorab kompilieren.

```html
<link rel="modulepreload" href="lib.mjs">
<link rel="modulepreload" href="main.mjs">
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

Dies ist besonders wichtig für größere Abhängigkeitsbäume. Ohne `rel="modulepreload"` muss der Browser mehrere HTTP-Anfragen ausführen, um den vollständigen Abhängigkeitsbaum zu ermitteln. Wenn Sie jedoch die vollständige Liste der abhängigen Modulskripte mit `rel="modulepreload"` deklarieren, muss der Browser diese Abhängigkeiten nicht schrittweise entdecken.

### HTTP/2 verwenden

Die Verwendung von HTTP/2, wo möglich, ist immer ein guter Leistungstipp, schon allein wegen [seiner Multiplexing-Unterstützung](https://web.dev/performance-http2/#request-and-response-multiplexing). Mit HTTP/2-Multiplexing können mehrere Anfragen und Antwortnachrichten gleichzeitig in Bearbeitung sein, was für das Laden von Modulbäumen vorteilhaft ist.

Das Chrome-Team hat untersucht, ob eine andere HTTP/2-Funktion, speziell [HTTP/2-Server-Push](https://web.dev/performance-http2/#server-push), eine praktische Lösung für die Bereitstellung hochgradig modularisierter Apps sein könnte. Leider ist [HTTP/2-Server-Push schwer richtig umzusetzen](https://jakearchibald.com/2017/h2-push-tougher-than-i-thought/), und die Implementierungen von Webservern und Browsern sind derzeit nicht auf hochgradig modularisierte Web-App-Anwendungsfälle optimiert. Es ist beispielsweise schwierig, nur die Ressourcen zu pushen, die der Benutzer nicht bereits im Cache hat, und das Lösen dieser Herausforderung, indem der vollständige Cache-Zustand einer Herkunft an den Server kommuniziert wird, birgt ein Datenschutzrisiko.

Also: Nutzen Sie ruhig HTTP/2! Beachten Sie nur, dass HTTP/2-Server-Push (leider) keine Wunderwaffe ist.

## Web-Adoption von JS-Modulen

JS-Module werden allmählich im Web übernommen. [Unsere Nutzungskennzahlen](https://www.chromestatus.com/metrics/feature/timeline/popularity/2062) zeigen, dass derzeit 0,08 % aller Seitenaufrufe `<script type="module">` verwenden. Beachten Sie, dass diese Zahl andere Einstiegspunkte wie dynamisches `import()` oder [Worklets](https://drafts.css-houdini.org/worklets/) nicht einschließt.

## Was kommt als Nächstes für JS-Module?

Das Chrome-Team arbeitet daran, die Entwicklungszeit-Erfahrung mit JS-Modulen auf verschiedene Weise zu verbessern. Lassen Sie uns einige davon diskutieren.

### Schnelleres und deterministisches Modul-Resolving-Algorithmus

Wir haben eine Änderung am Modulauflösungsalgorithmus vorgeschlagen, die ein Mangel an Geschwindigkeit und Determinismus behebt. Der neue Algorithmus ist jetzt in der [HTML-Spezifikation](https://github.com/whatwg/html/pull/2991) und der [ECMAScript-Spezifikation](https://github.com/tc39/ecma262/pull/1006) live und wurde in [Chrome 63](http://crbug.com/763597) implementiert. Diese Verbesserung wird bald in weiteren Browsern verfügbar sein!

Der neue Algorithmus ist deutlich effizienter und schneller. Die rechnerische Komplexität des alten Algorithmus war quadratisch, d.h. 𝒪(n²), in Bezug auf die Größe des Abhängigkeitsdiagramms, ebenso wie die damalige Implementierung in Chrome. Der neue Algorithmus ist linear, d.h. 𝒪(n).

Darüber hinaus meldet der neue Algorithmus Auflösungsfehler auf deterministische Weise. Bei einem Diagramm mit mehreren Fehlern konnte der alte Algorithmus verschiedene Fehler als Ursache des Auflösungsfehlers melden. Das erschwerte das Debugging unnötig. Der neue Algorithmus garantiert, jedes Mal denselben Fehler zu melden.

### Worklets und Web-Arbeiter

Chrome implementiert jetzt [Worklets](https://drafts.css-houdini.org/worklets/), die es Webentwicklern ermöglichen, fest kodierte Logik in den „Low-Level-Teilen“ von Webbrowsern anzupassen. Mit Worklets können Webentwickler ein JS-Modul in die Rendering-Pipeline oder die Audiobearbeitungspipeline (und möglicherweise in Zukunft weitere Pipelines) einspeisen.

Chrome 65 unterstützt [`PaintWorklet`](https://developers.google.com/web/updates/2018/01/paintapi) (auch bekannt als CSS Paint API), um zu steuern, wie ein DOM-Element gemalt wird.

```js
const result = await css.paintWorklet.addModule(&apos;paint-worklet.mjs&apos;);
```

Chrome 66 unterstützt [`AudioWorklet`](https://developers.google.com/web/updates/2017/12/audio-worklet), mit der Sie die Audiobearbeitung mit eigenem Code steuern können. Dieselbe Chrome-Version hat ein [OriginTrial für `AnimationWorklet`](https://groups.google.com/a/chromium.org/d/msg/blink-dev/AZ-PYPMS7EA/DEqbe2u5BQAJ) gestartet, das die Erstellung von scrollgebundenen und anderen hochleistungsfähigen prozeduralen Animationen ermöglicht.

Schließlich wird [`LayoutWorklet`](https://drafts.css-houdini.org/css-layout-api/) (auch bekannt als CSS Layout API) jetzt in Chrome 67 implementiert.

Wir arbeiten daran ([siehe](https://bugs.chromium.org/p/chromium/issues/detail?id=680046)), die Unterstützung für die Verwendung von JS-Modulen mit dedizierten Web-Arbeitern in Chrome hinzuzufügen. Sie können diese Funktion bereits ausprobieren, wenn Sie `chrome://flags/#enable-experimental-web-platform-features` aktiviert haben.

```js
const worker = new Worker(&apos;worker.mjs&apos;, { type: &apos;module&apos; });
```

Die Unterstützung von JS-Modulen für gemeinsame Arbeiter und Service-Arbeiter kommt bald:

```js
const worker = new SharedWorker(&apos;worker.mjs&apos;, { type: &apos;module&apos; });
const registration = await navigator.serviceWorker.register(&apos;worker.mjs&apos;, { type: &apos;module&apos; });
```

### Import-Maps

In Node.js/npm ist es üblich, JS-Module anhand ihres „Paketnamens“ zu importieren. Zum Beispiel:

```js
import moment from &apos;moment&apos;;
import {pluck} from &apos;lodash-es&apos;;
```

Derzeit werfen [laut HTML-Spezifikation](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier) solche „bare import specifiers“ eine Ausnahme. [Unser Import-Maps-Vorschlag](https://github.com/domenic/import-maps) ermöglicht es, solchen Code auf dem Web und auch in Produktionsanwendungen zu verwenden. Eine Import-Karte ist eine JSON-Ressource, die dem Browser hilft, bare Import-Spezifizierer in vollständige URLs umzuwandeln.

Import-Maps befinden sich noch im Vorschlagsstadium. Obwohl wir intensiv darüber nachgedacht haben, wie sie verschiedene Anwendungsfälle adressieren, sind wir weiterhin im Dialog mit der Community und haben noch keine vollständige Spezifikation erstellt. Feedback ist willkommen!

### Web-Packing: Native-Bundles

Das Chrome-Ladeteam untersucht derzeit [ein natives Web-Packing-Format](https://github.com/WICG/webpackage) als eine neue Möglichkeit, Web-Apps zu verteilen. Die Kernfunktionen des Web-Packaging sind:

[Signierte HTTP-Austausche](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html), die es einem Browser ermöglichen zu vertrauen, dass ein einzelner HTTP-Anfrage-/Antwort-Paar von dem Ursprung generiert wurde, den er behauptet; [Gebündelte HTTP-Austausche](https://tools.ietf.org/html/draft-yasskin-wpack-bundled-exchanges-00), also eine Sammlung von Austauschen, die jeweils signiert oder nicht signiert sein können, mit einigen Metadaten, die beschreiben, wie das Bundle insgesamt interpretiert werden soll.

In Kombination könnte ein solches Web-Packing-Format ermöglichen, *mehrere gleich-originierende Ressourcen* sicher in *einer einzigen* HTTP-`GET`-Antwort einzubetten.

Bestehende Bundling-Tools wie webpack, Rollup oder Parcel erzeugen derzeit ein einzelnes JavaScript-Bundle, in dem die Semantik der ursprünglichen separaten Module und Assets verloren geht. Mit nativen Bundles könnten Browser die Ressourcen wieder in ihre ursprüngliche Form entpacken. Vereinfacht ausgedrückt können Sie sich einen gebündelten HTTP-Austausch als eine Sammlung von Ressourcen vorstellen, die in beliebiger Reihenfolge über einen Inhaltsverzeichnis (Manifest) abgerufen werden können, wobei die enthaltenen Ressourcen effizient gespeichert und entsprechend ihrer relativen Wichtigkeit beschriftet werden können, während die Idee einzelner Dateiressourcen erhalten bleibt. Aufgrund dessen könnten native Bundles die Debugging-Erfahrung verbessern. Beim Anzeigen von Ressourcen in DevTools könnten Browser das ursprüngliche Modul ohne die Notwendigkeit komplexer Source-Maps identifizieren.

Die Transparenz des nativen Bundle-Formats eröffnet verschiedene Optimierungsmöglichkeiten. Zum Beispiel könnte ein Browser, der bereits einen Teil eines nativen Bundles lokal zwischengespeichert hat, dies dem Webserver kommunizieren und nur die fehlenden Teile herunterladen.

Chrome unterstützt bereits einen Teil des Vorschlags ([`SignedExchanges`](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html)), aber das Bundle-Format selbst sowie seine Anwendung auf hoch modularisierte Apps befinden sich noch in der Explorationsphase. Ihr Feedback ist auf dem Repository oder per E-Mail an &lt;loading-dev@chromium.org> sehr willkommen!

### Geschichtete APIs

Das Bereitstellen neuer Funktionen und Web-APIs verursacht fortlaufende Wartungs- und Laufzeitkosten — jede neue Funktion verschmutzt den Browser-Namespace, erhöht die Startkosten und stellt eine neue Fläche dar, die Fehler im gesamten Code einführen kann. [Geschichtete APIs](https://github.com/drufball/layered-apis) sind ein Versuch, höherwertige APIs mit Webbrowsern auf eine skalierbarere Weise zu implementieren und bereitzustellen. JS Module sind eine Schlüsseltechnologie für geschichtete APIs:

- Da Module explizit importiert werden, stellt die Anforderung, geschichtete APIs über Module bereitzustellen, sicher, dass Entwickler nur für die geschichteten APIs bezahlen, die sie nutzen.
- Da das Laden von Modulen konfigurierbar ist, können geschichtete APIs einen eingebauten Mechanismus haben, um Polyfills in Browsern automatisch zu laden, die geschichtete APIs nicht unterstützen.

Die Details, wie Module und geschichtete APIs zusammenarbeiten, [werden noch ausgearbeitet](https://github.com/drufball/layered-apis/issues), aber der aktuelle Vorschlag sieht ungefähr so aus:

```html
<script
  type="module"
  src="std:virtual-scroller|https://example.com/virtual-scroller.mjs"
></script>
```

Das `<script>`-Element lädt die `virtual-scroller`-API entweder aus der eingebauten Sammlung geschichteter Browser-APIs (`std:virtual-scroller`) oder aus einer Fallback-URL, die auf ein Polyfill verweist. Diese API kann alles tun, was JS Module in Webbrowsern tun können. Ein Beispiel wäre die Definition eines [benutzerdefinierten `<virtual-scroller>`-Elements](https://www.chromestatus.com/feature/5673195159945216), sodass das folgende HTML wie gewünscht progressiv verbessert wird:

```html
<virtual-scroller>
  <!-- Inhalte kommen hierhin. -->
</virtual-scroller>
```

## Credits

Danke an Domenic Denicola, Georg Neis, Hiroki Nakagawa, Hiroshige Hayashizaki, Jakob Gruber, Kouhei Ueno, Kunihiko Sakamoto und Yang Guo, die JavaScript-Module schnell gemacht haben!

Außerdem vielen Dank an Eric Bidelman, Jake Archibald, Jason Miller, Jeffrey Posnick, Philip Walton, Rob Dodson, Sam Dutton, Sam Thorogood und Thomas Steiner für das Lesen einer Entwurfsversion dieses Leitfadens und ihr Feedback.
