---
 title: &apos;V8 Vorab informieren: Schnellere JavaScript-Startup durch explizite Kompilierungs-Hinweise&apos;
 author: &apos;Marja Hölttä&apos;
 avatars:
   - marja-holtta
 date: 2025-04-29
 tags:
   - JavaScript
 description: "Explizite Kompilierungs-Hinweise steuern, welche JavaScript-Dateien und Funktionen frühzeitig analysiert und kompiliert werden"
 tweet: &apos;&apos;
---

Ein schnelles Starten von JavaScript ist entscheidend für eine reaktionsschnelle Web-App. Selbst mit den fortgeschrittenen Optimierungen von V8 können Parsing und Kompilierung von kritischem JavaScript während des Startvorgangs weiterhin Leistungseinbußen verursachen. Wenn bekannt ist, welche JavaScript-Funktionen während der initialen Skriptkompilierung kompiliert werden sollen, kann dies das Laden von Webseiten beschleunigen.

<!--truncate-->
Beim Verarbeiten eines aus dem Netzwerk geladenen Skripts muss V8 für jede Funktion entscheiden: Sofort ("early") oder später kompilieren. Wenn eine Funktion, die noch nicht kompiliert wurde, später aufgerufen wird, muss V8 sie dann auf Abruf kompilieren.

Wenn eine JavaScript-Funktion während des Seitenladens aufgerufen wird, ist es vorteilhaft, sie frühzeitig zu kompilieren, da:

- Während der initialen Verarbeitung des Skripts müssen wir zumindest eine leichte Analyse durchführen, um das Funktionsende zu finden. Im JavaScript erfordert das Finden des Funktionsendes das vollständige Syntax-Parsing (es gibt keine Abkürzungen wie das Zählen von geschweiften Klammern - die Grammatik ist zu komplex). Das leichte Parsing und anschließend das eigentliche Parsing durchführen bedeutet doppelte Arbeit.
- Wenn wir uns entschließen, eine Funktion frühzeitig zu kompilieren, erfolgt die Arbeit in einem Hintergrund-Thread, und Teile davon sind mit dem Laden des Skripts aus dem Netzwerk verzahnt. Wenn wir die Funktion stattdessen erst kompilieren, wenn sie aufgerufen wird, ist es zu spät für Parallelisierung, da der Haupt-Thread erst weitermachen kann, wenn die Funktion kompiliert ist.

Mehr Informationen darüber, wie V8 JavaScript analysiert und kompiliert, finden Sie [hier](https://v8.dev/blog/preparser).

Viele Webseiten könnten davon profitieren, die richtigen Funktionen für eine frühzeitige Kompilierung auszuwählen. Beispielsweise zeigten in unserem Experiment mit beliebten Webseiten 17 von 20 Verbesserungen, und die durchschnittliche Reduktion der Vordergrund-Parsing- und Kompilierungszeiten betrug 630 ms.

Wir entwickeln eine Funktion, [Explizite Kompilierungs-Hinweise](https://github.com/WICG/explicit-javascript-compile-hints-file-based), die es Webentwicklern ermöglicht zu steuern, welche JavaScript-Dateien und Funktionen frühzeitig kompiliert werden. Chrome 136 liefert nun eine Version, in der Sie einzelne Dateien für eine frühzeitige Kompilierung auswählen können.

Diese Version ist besonders nützlich, wenn Sie eine "Kerndatei" haben, die Sie für die frühzeitige Kompilierung auswählen können, oder wenn Sie in der Lage sind, Code zwischen Quelldateien zu verschieben, um eine solche Kerndatei zu erstellen.

Sie können eine frühzeitige Kompilierung für die gesamte Datei auslösen, indem Sie den magischen Kommentar einfügen

```js
//# allFunctionsCalledOnLoad
```

an den Anfang der Datei.

Diese Funktion sollte jedoch sparsam verwendet werden - zu viel Kompilierung verbraucht Zeit und Speicher!

## Probieren Sie es selbst aus - Kompilierungs-Hinweise in Aktion

Sie können die Funktion der Kompilierungs-Hinweise beobachten, indem Sie V8 anweisen, die Funktionsereignisse zu protokollieren. Beispielsweise können Sie die folgenden Dateien verwenden, um einen Minimaltest einzurichten.

index.html:

```html
<script src="script1.js"></script>
<script src="script2.js"></script>
```

script1.js:

```js
function testfunc1() {
  console.log(&apos;testfunc1 aufgerufen!&apos;);
}

testfunc1();
```

script2.js:

```js
//# allFunctionsCalledOnLoad

function testfunc2() {
  console.log(&apos;testfunc2 aufgerufen!&apos;);
}

testfunc2();
```

Vergessen Sie nicht, Chrome mit einem sauberen Benutzerdatenverzeichnis auszuführen, damit das Code-Caching Ihr Experiment nicht beeinträchtigt. Ein Beispiel-Befehlszeilenaufruf wäre:

```sh
rm -rf /tmp/chromedata && google-chrome --no-first-run --user-data-dir=/tmp/chromedata --js-flags=--log-function_events > log.txt
```

Nachdem Sie zu Ihrer Testseite navigiert haben, können Sie die folgenden Funktionsereignisse im Protokoll sehen:

```sh
$ grep testfunc log.txt
function,preparse-no-resolution,5,18,60,0.036,179993,testfunc1
function,full-parse,5,18,60,0.003,181178,testfunc1
function,parse-function,5,18,60,0.014,181186,testfunc1
function,interpreter,5,18,60,0.005,181205,testfunc1
function,full-parse,6,48,90,0.005,184024,testfunc2
function,interpreter,6,48,90,0.005,184822,testfunc2
```

Da `testfunc1` faul kompiliert wurde, sehen wir das `parse-function` Ereignis, wenn es schließlich aufgerufen wird:

```sh
function,parse-function,5,18,60,0.014,181186,testfunc1
```

Für `testfunc2` sehen wir kein entsprechendes Ereignis, da der Kompilierungshinweis erzwungen hat, dass es vorzeitig analysiert und kompiliert wird.

## Zukunft der expliziten Kompilierungs-Hinweise

Langfristig möchten wir dazu übergehen, einzelne Funktionen für die frühzeitige Kompilierung auszuwählen. Dadurch können Webentwickler genau steuern, welche Funktionen sie kompilieren möchten, und die letzten Bits der Kompilierungsleistung auspressen, um ihre Webseiten zu optimieren. Bleiben Sie dran!
