---
title: &apos;Schnellere asynchrone Funktionen und Versprechen&apos;
author: &apos;Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), immer-wartende Antizipatorin, und Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), professioneller Leistungsversprecher&apos;
avatars:
  - &apos;maya-armyanova&apos;
  - &apos;benedikt-meurer&apos;
date: 2018-11-12 16:45:07
tags:
  - ECMAScript
  - Benchmarks
  - Präsentationen
description: &apos;Schnellere und leichter zu debuggende asynchrone Funktionen und Versprechen kommen mit V8 v7.2 / Chrome 72.&apos;
tweet: &apos;1062000102909169670&apos;
---
Asynchrone Verarbeitung in JavaScript hatte traditionell den Ruf, nicht besonders schnell zu sein. Noch schlimmer war es, Live-JavaScript-Anwendungen – insbesondere Node.js-Server – zu debuggen, _besonders_ wenn es um asynchrone Programmierung geht. Glücklicherweise ändern sich die Zeiten. Dieser Artikel untersucht, wie wir asynchrone Funktionen und Versprechen in V8 (und teilweise auch in anderen JavaScript-Engines) optimiert haben und beschreibt, wie wir die Debugging-Erfahrung für asynchronen Code verbessert haben.

<!--truncate-->
:::note
**Hinweis:** Wenn Sie eine Präsentation lieber ansehen als Artikel zu lesen, genießen Sie das folgende Video! Wenn nicht, überspringen Sie das Video und lesen Sie weiter.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/DFP5DKDQfOc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

## Ein neuer Ansatz zur asynchronen Programmierung

### Von Callbacks zu Versprechen zu asynchronen Funktionen

Bevor Versprechen Teil der JavaScript-Sprache waren, wurden Callback-basierte APIs häufig für asynchronen Code verwendet, insbesondere in Node.js. Hier ein Beispiel:

```js
function handler(done) {
  validateParams((error) => {
    if (error) return done(error);
    dbQuery((error, dbResults) => {
      if (error) return done(error);
      serviceCall(dbResults, (error, serviceResults) => {
        console.log(result);
        done(error, serviceResults);
      });
    });
  });
}
```

Das spezifische Muster der Verwendung von tief verschachtelten Callbacks auf diese Weise wird häufig als _„Callback-Hölle“_ bezeichnet, weil es den Code weniger lesbar und schwer wartbar macht.

Glücklicherweise kann derselbe Code, jetzt da Versprechen Teil der JavaScript-Sprache sind, auf elegantere und wartbarere Weise geschrieben werden:

```js
function handler() {
  return validateParams()
    .then(dbQuery)
    .then(serviceCall)
    .then(result => {
      console.log(result);
      return result;
    });
}
```

Noch vor kurzem hat JavaScript Unterstützung für [asynchrone Funktionen](https://web.dev/articles/async-functions) erhalten. Der obige asynchrone Code kann jetzt auf eine Art geschrieben werden, die sehr ähnlich wie synchroner Code aussieht:

```js
async function handler() {
  await validateParams();
  const dbResults = await dbQuery();
  const results = await serviceCall(dbResults);
  console.log(results);
  return results;
}
```

Mit asynchronen Funktionen wird der Code kürzer und der Kontroll- und Datenfluss ist viel leichter zu verfolgen, obwohl die Ausführung immer noch asynchron ist. (Beachten Sie, dass die JavaScript-Ausführung weiterhin in einem einzelnen Thread erfolgt, was bedeutet, dass asynchrone Funktionen selbst keine physischen Threads erstellen.)

### Von Ereignis-Listener-Callbacks zu asynchroner Iteration

Ein weiteres asynchrones Paradigma, das besonders häufig in Node.js vorkommt, ist das der [`ReadableStreams`](https://nodejs.org/api/stream.html#stream_readable_streams). Hier ein Beispiel:

```js
const http = require(&apos;http&apos;);

http.createServer((req, res) => {
  let body = &apos;&apos;;
  req.setEncoding(&apos;utf8&apos;);
  req.on(&apos;data&apos;, (chunk) => {
    body += chunk;
  });
  req.on(&apos;end&apos;, () => {
    res.write(body);
    res.end();
  });
}).listen(1337);
```

Dieser Code kann etwas schwer zu folgen sein: Die eingehenden Daten werden in Chunks verarbeitet, die nur innerhalb von Callbacks zugänglich sind, und das Ende des Streams wird ebenfalls innerhalb eines Callbacks signalisiert. Es ist leicht, hier Fehler einzuführen, wenn man nicht erkennt, dass die Funktion sofort beendet wird und die eigentliche Verarbeitung in den Callbacks stattfinden muss.

Glücklicherweise kann ein cooles neues ES2018-Feature namens [asynchrone Iteration](http://2ality.com/2016/10/asynchronous-iteration.html) diesen Code vereinfachen:

```js
const http = require(&apos;http&apos;);

http.createServer(async (req, res) => {
  try {
    let body = &apos;&apos;;
    req.setEncoding(&apos;utf8&apos;);
    for await (const chunk of req) {
      body += chunk;
    }
    res.write(body);
    res.end();
  } catch {
    res.statusCode = 500;
    res.end();
  }
}).listen(1337);
```

Anstatt die Logik, die sich mit der eigentlichen Anfrageverarbeitung befasst, in zwei verschiedene Callbacks – das `&apos;data&apos;` und das `&apos;end&apos;` Callback – zu setzen, können wir jetzt alles in eine einzelne asynchrone Funktion setzen und die neue `for await…of` Schleife verwenden, um über die Chunks asynchron zu iterieren. Wir haben auch einen `try-catch` Block hinzugefügt, um das Problem mit `unhandledRejection` zu vermeiden[^1].

[^1]: Danke an [Matteo Collina](https://twitter.com/matteocollina) dafür, dass er uns auf [dieses Problem](https://github.com/mcollina/make-promises-safe/blob/master/README.md#the-unhandledrejection-problem) hingewiesen hat.

Sie können diese neuen Funktionen bereits heute in der Produktion verwenden! Async-Funktionen werden **vollständig unterstützt ab Node.js 8 (V8 v6.2 / Chrome 62)**, und async-Iteratoren und Generatoren werden **vollständig unterstützt ab Node.js 10 (V8 v6.8 / Chrome 68)**!

## Verbesserungen der asynchronen Leistung

Wir konnten die Leistung von asynchronem Code zwischen V8 v5.5 (Chrome 55 & Node.js 7) und V8 v6.8 (Chrome 68 & Node.js 10) erheblich verbessern. Wir haben ein Leistungsniveau erreicht, bei dem Entwickler diese neuen Programmierparadigmen sicher verwenden können, ohne sich um die Geschwindigkeit sorgen zu müssen.

![](/_img/fast-async/doxbee-benchmark.svg)

Das obige Diagramm zeigt den [Doxbee-Benchmark](https://github.com/v8/promise-performance-tests/blob/master/lib/doxbee-async.js), der die Leistung von promise-lastigem Code misst. Beachten Sie, dass die Diagramme die Ausführungszeit visualisieren, was bedeutet, dass niedriger besser ist.

Die Ergebnisse des [Parallel-Benchmarks](https://github.com/v8/promise-performance-tests/blob/master/lib/parallel-async.js), der speziell die Leistung von [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) testet, sind sogar noch spannender:

![](/_img/fast-async/parallel-benchmark.svg)

Wir konnten die Leistung von `Promise.all` um den Faktor **8×** verbessern.

Die obigen Benchmarks sind jedoch synthetische Mikro-Benchmarks. Das V8-Team interessiert sich stärker dafür, wie sich unsere Optimierungen auf die [Real-World-Leistung von echtem Benutzer-Code](/blog/real-world-performance) auswirken.

![](/_img/fast-async/http-benchmarks.svg)

Das obige Diagramm zeigt die Leistung einiger populärer HTTP-Middleware-Frameworks, die intensiv Promises und `async`-Funktionen verwenden. Beachten Sie, dass dieses Diagramm die Anzahl der Anfragen/Sekunde zeigt, sodass im Gegensatz zu den vorherigen Diagrammen höher besser ist. Die Leistung dieser Frameworks hat sich zwischen Node.js 7 (V8 v5.5) und Node.js 10 (V8 v6.8) erheblich verbessert.

Diese Leistungsverbesserungen sind das Ergebnis von drei wichtigen Errungenschaften:

- [TurboFan](/docs/turbofan), der neue optimierende Compiler 🎉
- [Orinoco](/blog/orinoco), der neue Garbage Collector 🚛
- ein Node.js 8-Fehler, der dazu führte, dass `await` Mikroticks übersprang 🐛

Als wir [TurboFan eingeführt haben](/blog/launching-ignition-and-turbofan) in [Node.js 8](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367), führte dies zu einem erheblichen Leistungsanstieg auf ganzer Linie.

Wir haben auch an einem neuen Garbage Collector namens Orinoco gearbeitet, der die Arbeit der Garbage Collection vom Haupt-Thread verlagert und somit die Anfragenbearbeitung erheblich verbessert.

Und last but not least gab es einen praktischen Fehler in Node.js 8, der dazu führte, dass `await` in einigen Fällen Mikroticks übersprang, was zu einer besseren Leistung führte. Der Fehler begann als unbeabsichtigter Spezifikationsverstoß, gab uns jedoch später die Idee für eine Optimierung. Beginnen wir mit der Erklärung des fehlerhaften Verhaltens:

:::note
**Hinweis:** Das folgende Verhalten war zum Zeitpunkt des Schreibens gemäß der JavaScript-Spezifikation korrekt. Seitdem wurde unser Spezifikationsvorschlag akzeptiert, und das folgende "fehlerhafte" Verhalten ist nun korrekt.
:::

```js
const p = Promise.resolve();

(async () => {
  await p; console.log(&apos;after:await&apos;);
})();

p.then(() => console.log(&apos;tick:a&apos;))
 .then(() => console.log(&apos;tick:b&apos;));
```

Das obige Programm erstellt ein erfülltes Promise `p` und `await` dessen Ergebnis, hängt aber auch zwei Handler daran an. In welcher Reihenfolge würden Sie erwarten, dass die `console.log`-Aufrufe ausgeführt werden?

Da `p` erfüllt ist, könnten Sie erwarten, dass zuerst `&apos;after:await&apos;` und dann die `&apos;tick&apos;`s ausgegeben werden. Tatsächlich ist das das Verhalten, das Sie in Node.js 8 erhalten würden:

![Der `await`-Fehler in Node.js 8](/_img/fast-async/await-bug-node-8.svg)

Obwohl dieses Verhalten intuitiv erscheint, ist es gemäß der Spezifikation nicht korrekt. Node.js 10 implementiert das korrekte Verhalten, bei dem zuerst die angehängten Handler ausgeführt werden und erst danach mit der asynchronen Funktion fortgefahren wird.

![Node.js 10 hat den `await`-Fehler nicht mehr](/_img/fast-async/await-bug-node-10.svg)

Dieses _„korrekte Verhalten“_ ist möglicherweise nicht sofort offensichtlich und war tatsächlich überraschend für JavaScript-Entwickler, es verdient daher eine Erklärung. Bevor wir in die magische Welt der Promises und Async-Funktionen eintauchen, beginnen wir mit einigen Grundlagen.

### Aufgaben vs. Mikrotasks

Auf hoher Ebene gibt es _Aufgaben_ und _Mikrotasks_ in JavaScript. Aufgaben bearbeiten Ereignisse wie I/O und Timer und werden nacheinander ausgeführt. Mikrotasks implementieren verzögerte Ausführung für `async`/`await` und Promises und werden am Ende jeder Aufgabe ausgeführt. Die Mikrotask-Warteschlange wird immer geleert, bevor die Ausführung an die Ereignisschleife zurückkehrt.

![Der Unterschied zwischen Mikrotasks und Aufgaben](/_img/fast-async/microtasks-vs-tasks.svg)

Weitere Details finden Sie in Jake Archibalds Erklärung zu [Tasks, Microtasks, Queues und Schedules im Browser](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/). Das Aufgabenmodell in Node.js ist sehr ähnlich.

### Async-Funktionen

Laut MDN ist eine Async-Funktion eine Funktion, die asynchron arbeitet und ein implizites Versprechen verwendet, um ihr Ergebnis zurückzugeben. Async-Funktionen sollen asynchronen Code wie synchronen Code aussehen lassen und dabei einen Teil der Komplexität der asynchronen Verarbeitung vor dem Entwickler verbergen.

Die einfachste mögliche Async-Funktion sieht so aus:

```js
async function computeAnswer() {
  return 42;
}
```

Beim Aufruf gibt diese ein Versprechen zurück, und Sie können dessen Wert wie bei jedem anderen Versprechen abrufen.

```js
const p = computeAnswer();
// → Versprechen

p.then(console.log);
// druckt 42 im nächsten Durchgang
```

Sie gelangen erst beim nächsten Laufen von Microtasks an den Wert dieses Versprechens `p`. Mit anderen Worten: Das obige Programm ist semantisch äquivalent zu der Verwendung von `Promise.resolve` mit dem Wert:

```js
function computeAnswer() {
  return Promise.resolve(42);
}
```

Die wahre Stärke von Async-Funktionen kommt durch `await`-Ausdrücke, die die Ausführung der Funktion so lange pausieren, bis ein Versprechen aufgelöst ist, und danach fortgesetzt wird. Der Wert von `await` ist der des erfüllten Versprechens. Hier ein Beispiel, das zeigt, was das bedeutet:

```js
async function fetchStatus(url) {
  const response = await fetch(url);
  return response.status;
}
```

Die Ausführung von `fetchStatus` wird an der `await`-Stelle ausgesetzt und später fortgesetzt, wenn das `fetch`-Versprechen erfüllt wird. Dies ist mehr oder weniger gleichbedeutend mit dem Verketten eines Handlers an das von `fetch` zurückgegebene Versprechen.

```js
function fetchStatus(url) {
  return fetch(url).then(response => response.status);
}
```

Dieser Handler enthält den Code, der dem `await` in der Async-Funktion folgt.

Normalerweise würden Sie ein `Promise` an `await` übergeben, aber Sie können tatsächlich auf jeden beliebigen JavaScript-Wert warten. Wenn der Wert des Ausdrucks nach dem `await` kein Versprechen ist, wird er in ein Versprechen umgewandelt. Das bedeutet, Sie können `await 42` machen, wenn Sie das möchten:

```js
async function foo() {
  const v = await 42;
  return v;
}

const p = foo();
// → Versprechen

p.then(console.log);
// druckt letztendlich `42`
```

Interessanterweise funktioniert `await` mit jedem [„thenable“](https://promisesaplus.com/), also jedem Objekt mit einer `then`-Methode, auch wenn es kein echtes Versprechen ist. So können Sie lustige Dinge wie einen asynchronen Sleep implementieren, der die tatsächlich verbrachte Schlafzeit misst:

```js
class Sleep {
  constructor(timeout) {
    this.timeout = timeout;
  }
  then(resolve, reject) {
    const startTime = Date.now();
    setTimeout(() => resolve(Date.now() - startTime),
               this.timeout);
  }
}

(async () => {
  const actualTime = await new Sleep(1000);
  console.log(actualTime);
})();
```

Sehen wir uns an, was V8 für `await` hinter den Kulissen tut, entsprechend der [Spezifikation](https://tc39.es/ecma262/#await). Hier ist eine einfache Async-Funktion `foo`:

```js
async function foo(v) {
  const w = await v;
  return w;
}
```

Beim Aufruf wird der Parameter `v` in ein Versprechen eingepackt und die Ausführung der Async-Funktion ausgesetzt, bis dieses Versprechen aufgelöst ist. Sobald das passiert, wird die Ausführung der Funktion wieder aufgenommen und `w` erhält den Wert des erfüllten Versprechens. Dieser Wert wird dann von der Async-Funktion zurückgegeben.

### `await` hinter den Kulissen

V8 markiert diese Funktion zunächst als _resumable_, was bedeutet, dass die Ausführung unterbrochen und später (an `await`-Punkten) fortgesetzt werden kann. Anschließend erstellt es das sogenannte `implicit_promise`, das das Versprechen ist, das bei Aufruf der Async-Funktion zurückgegeben wird und schließlich den von der Async-Funktion erzeugten Wert erhält.

![Vergleich zwischen einer einfachen Async-Funktion und dem, was die Engine daraus macht](/_img/fast-async/await-under-the-hood.svg)

Dann kommt der interessante Teil: das eigentliche `await`. Zuerst wird der Wert, der an `await` übergeben wurde, in ein Versprechen eingepackt. Anschließend werden Handler an dieses eingepackte Versprechen angehängt, um die Funktion fortzusetzen, sobald das Versprechen erfüllt ist, und die Ausführung der Async-Funktion wird ausgesetzt und das `implicit_promise` wird dem Aufrufer zurückgegeben. Sobald das `promise` erfüllt ist, wird die Ausführung der Async-Funktion mit dem Wert `w` aus dem `promise` fortgesetzt und das `implicit_promise` mit `w` aufgelöst.

Zusammenfassend bestehen die ersten Schritte für `await v` aus:

1. Verpacken von `v` - dem Wert, der an `await` übergeben wird - in ein Versprechen.
1. Anhängen von Handlern, um die Async-Funktion später fortzusetzen.
1. Aussetzen der Async-Funktion und Zurückgeben des `implicit_promise` an den Aufrufer.

Gehen wir die einzelnen Vorgänge Schritt für Schritt durch. Nehmen wir an, dass das, worauf gewartet wird, bereits ein Versprechen ist, das mit dem Wert `42` erfüllt wurde. Dann erstellt die Engine ein neues `promise` und löst es mit dem auf, worauf gewartet wird. Dies macht eine von der Spezifikation als [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob) bezeichnete verzögerte Verkettung dieser Versprechen im nächsten Durchgang.

![](/_img/fast-async/await-step-1.svg)

Dann erzeugt die Engine ein weiteres sogenanntes `wegwerf`-Versprechen. Es wird *wegwerf* genannt, weil nichts daran angehängt wird — es ist vollständig intern für die Engine. Dieses `wegwerf`-Versprechen wird dann an das `promise` gekoppelt, mit den entsprechenden Handlern, um die asynchrone Funktion fortzusetzen. Diese `performPromiseThen`-Operation ist im Wesentlichen das, was [`Promise.prototype.then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) hinter den Kulissen tut. Schließlich wird die Ausführung der asynchronen Funktion angehalten, und die Kontrolle kehrt zum Aufrufer zurück.

![](/_img/fast-async/await-step-2.svg)

Die Ausführung wird beim Aufrufer fortgesetzt, und schließlich wird der Callstack leer. Dann beginnt die JavaScript-Engine mit der Ausführung der Mikrotasks: Sie führt den zuvor geplanten [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob) aus, der einen neuen [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) plant, um das `promise` an den Wert weiterzugeben, der an `await` übergeben wurde. Danach kehrt die Engine zur Verarbeitung der Mikrotask-Warteschlange zurück, da diese geleert werden muss, bevor die Haupt-Event-Schleife fortgesetzt wird.

![](/_img/fast-async/await-step-3.svg)

Als nächstes folgt der [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob), der das `promise` mit dem Wert aus dem Promise erfüllt, den wir `await`en — in diesem Fall `42` — und die Reaktion auf das `wegwerf`-Versprechen plant. Die Engine kehrt dann erneut zur Mikrotask-Schleife zurück, die eine letzte zu verarbeitende Mikrotask enthält.

![](/_img/fast-async/await-step-4-final.svg)

Nun propagiert dieser zweite [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) die Auflösung an das `wegwerf`-Versprechen und setzt die angehaltene Ausführung der asynchronen Funktion fort, wobei der Wert `42` vom `await` zurückgegeben wird.

![Zusammenfassung des Overheads von `await`](/_img/fast-async/await-overhead.svg)

Zusammenfassend: Für jedes `await` muss die Engine **zwei zusätzliche** Versprechen erstellen (selbst wenn die rechte Seite bereits ein Versprechen ist), und es werden **mindestens drei** Ticks in der Mikrotask-Warteschlange benötigt. Wer hätte gedacht, dass ein einzelner `await`-Ausdruck _so viel Overhead_ verursacht?!

![](/_img/fast-async/await-code-before.svg)

Schauen wir uns an, woher dieser Overhead kommt. Die erste Zeile ist dafür verantwortlich, das Wrapper-Versprechen zu erstellen. Die zweite Zeile löst dieses Wrapper-Versprechen sofort mit dem `await`-Wert `v`. Diese beiden Zeilen sind verantwortlich für ein zusätzliches Versprechen und zwei der drei Mikroticks. Das ist ziemlich teuer, wenn `v` bereits ein Versprechen ist (was der Normalfall ist, da Anwendungen normalerweise auf Versprechen `await`en). Im unwahrscheinlichen Fall, dass ein Entwickler z. B. `42` `await`et, muss die Engine es dennoch in ein Versprechen einpacken.

Es stellt sich heraus, dass in der Spezifikation bereits eine [`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve)-Operation vorhanden ist, die nur dann eine Verpackung vornimmt, wenn dies erforderlich ist:

![](/_img/fast-async/await-code-comparison.svg)

Diese Operation gibt Versprechen unverändert zurück und verpackt andere Werte nur nach Bedarf. Auf diese Weise sparen Sie eines der zusätzlichen Versprechen sowie zwei Ticks in der Mikrotask-Warteschlange, falls der an `await` übergebene Wert bereits ein Versprechen ist. Dieses neue Verhalten ist bereits [in V8 v7.2 standardmäßig aktiviert](/blog/v8-release-72#async%2Fawait). Für V8 v7.1 kann das neue Verhalten mit dem Flag `--harmony-await-optimization` aktiviert werden. Wir haben diese Änderung auch [für die ECMAScript-Spezifikation vorgeschlagen](https://github.com/tc39/ecma262/pull/1250).

So funktioniert das neue und verbesserte `await` im Hintergrund Schritt für Schritt:

![](/_img/fast-async/await-new-step-1.svg)

Angenommen, wir `await`en erneut ein Versprechen, das mit `42` erfüllt wurde. Dank der Magie von [`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve) verweist das `promise` jetzt einfach auf dasselbe Versprechen `v`, sodass in diesem Schritt nichts zu tun ist. Danach fährt die Engine genau wie zuvor fort, erstellt das `wegwerf`-Versprechen, plant einen [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob), um die asynchrone Funktion im nächsten Tick der Mikrotask-Warteschlange fortzusetzen, setzt die Ausführung der Funktion aus und kehrt zum Aufrufer zurück.

![](/_img/fast-async/await-new-step-2.svg)

Dann, wenn schließlich alle JavaScript-Ausführungen abgeschlossen sind, beginnt die Engine mit der Ausführung der Mikrotasks, indem der [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) ausgeführt wird. Dieser Job propagiert die Auflösung von `promise` zu `wegwerf` und setzt die Ausführung der asynchronen Funktion fort, wobei `42` vom `await` geholt wird.

![Zusammenfassung der Reduzierung des Overheads von `await`](/_img/fast-async/await-overhead-removed.svg)

Diese Optimierung vermeidet die Notwendigkeit, ein Wrapper-Versprechen zu erstellen, wenn der an `await` übergebene Wert bereits ein Versprechen ist, und in diesem Fall reduzieren wir uns von **drei** Mikroticks auf nur **einen** Mikrotick. Dieses Verhalten ist ähnlich dem, was Node.js 8 tut, mit dem Unterschied, dass es jetzt kein Bug mehr ist — es ist jetzt eine Optimierung, die standardisiert wird!

Es fühlt sich immer noch falsch an, dass die Engine dieses `wegwerf`-Versprechen erstellen muss, obwohl es vollständig intern für die Engine ist. Es stellte sich heraus, dass das `wegwerf`-Versprechen nur dort war, um die API-Beschränkungen der internen `performPromiseThen`-Operation in der Spezifikation zu erfüllen.

![](/_img/fast-async/await-optimized.svg)

Dies wurde kürzlich in einer [redaktionellen Änderung](https://github.com/tc39/ecma262/issues/694) der ECMAScript-Spezifikation behandelt. Engines müssen das `throwaway`-Promise für `await` nicht mehr erstellen — meistens[^2].

[^2]: V8 muss das `throwaway`-Promise noch erstellen, wenn [`async_hooks`](https://nodejs.org/api/async_hooks.html) in Node.js verwendet werden, da die `before`- und `after`-Hooks im _Kontext_ des `throwaway`-Promises ausgeführt werden.

![Vergleich von `await`-Code vor und nach den Optimierungen](/_img/fast-async/node-10-vs-node-12.svg)

Ein Vergleich von `await` in Node.js 10 mit dem optimierten `await`, das wahrscheinlich in Node.js 12 enthalten sein wird, zeigt die Auswirkungen dieser Änderung auf die Leistung:

![](/_img/fast-async/benchmark-optimization.svg)

**`async`/`await` übertrifft nun handgeschriebenen Promise-Code**. Das Hauptanliegen hier ist, dass wir den Overhead von asynchronen Funktionen erheblich reduziert haben — nicht nur in V8, sondern auch in allen JavaScript-Engines, indem wir die Spezifikation angepasst haben.

**Update:** Ab V8 v7.2 und Chrome 72 ist `--harmony-await-optimization` standardmäßig aktiviert. [Der Patch](https://github.com/tc39/ecma262/pull/1250) zur ECMAScript-Spezifikation wurde integriert.

## Verbesserte Entwicklererfahrung

Neben der Leistung interessieren sich JavaScript-Entwickler auch dafür, Probleme diagnostizieren und beheben zu können, was nicht immer einfach ist, wenn man mit asynchronem Code arbeitet. [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools) unterstützt *asynchrone Stack-Traces*, also Stack-Traces, die nicht nur den aktuellen synchronen Teil des Stacks umfassen, sondern auch den asynchronen Teil:

![](/_img/fast-async/devtools.png)

Das ist eine äußerst nützliche Funktion während der lokalen Entwicklung. Diese Methode hilft Ihnen jedoch nicht wirklich, wenn die Anwendung bereitgestellt ist. Während des Debuggens nach einem Absturz sehen Sie in Ihren Protokolldateien nur die Ausgabe von `Error#stack`, die Ihnen nichts über die asynchronen Teile mitteilt.

Wir haben kürzlich an [*kostenlosen asynchronen Stack-Traces*](https://bit.ly/v8-zero-cost-async-stack-traces) gearbeitet, die die Eigenschaft `Error#stack` mit Aufrufen asynchroner Funktionen anreichern. „Kostenlos“ klingt spannend, nicht wahr? Wie kann es kostenlos sein, wenn die Chrome-DevTools-Funktion mit erheblichem Overhead verbunden ist? Betrachten Sie dieses Beispiel, in dem `foo` `bar` asynchron aufruft und `bar` nach dem `await` eines Promises eine Ausnahme auslöst:

```js
async function foo() {
  await bar();
  return 42;
}

async function bar() {
  await Promise.resolve();
  throw new Error(&apos;BEEP BEEP&apos;);
}

foo().catch(error => console.log(error.stack));
```

Die Ausführung dieses Codes in Node.js 8 oder Node.js 10 führt zu folgendem Output:

```text/2
$ node index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
```

Beachten Sie, dass obwohl der Aufruf von `foo()` den Fehler verursacht, `foo` überhaupt nicht Teil des Stack-Traces ist. Dies macht es JavaScript-Entwicklern schwer, eine Fehleranalyse nach einem Absturz durchzuführen, unabhängig davon, ob Ihr Code in einer Webanwendung oder in einem Cloud-Container eingesetzt wird.

Das Interessante hier ist, dass die Engine weiß, wo sie fortfahren muss, wenn `bar` fertig ist: direkt nach dem `await` in der Funktion `foo`. Zufällig ist das auch der Punkt, an dem die Funktion `foo` pausiert wurde. Die Engine kann diese Informationen nutzen, um Teile des asynchronen Stack-Traces, nämlich die `await`-Stellen, zu rekonstruieren. Mit dieser Änderung wird der Output wie folgt:

```text/2,7
$ node --async-stack-traces index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
    at async foo (index.js:2:3)
```

Im Stack-Trace kommt die oberste Funktion zuerst, gefolgt vom Rest des synchronen Stack-Traces und schließlich vom asynchronen Aufruf von `bar` in der Funktion `foo`. Diese Änderung wird in V8 hinter dem neuen `--async-stack-traces`-Flag implementiert. **Update**: Ab V8 v7.3 ist `--async-stack-traces` standardmäßig aktiviert.

Wenn Sie dies jedoch mit dem asynchronen Stacktrace in den Chrome DevTools oben vergleichen, werden Sie feststellen, dass die tatsächliche Aufrufstelle von `foo` im asynchronen Teil des Stacktraces fehlt. Wie bereits erwähnt, nutzt dieser Ansatz die Tatsache, dass bei `await` die Fortsetzungs- und Unterbrechungsorte identisch sind – bei regulären [`Promise#then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then)- oder [`Promise#catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch)-Aufrufen ist dies jedoch nicht der Fall. Weitere Informationen finden Sie in der Erklärung von Mathias Bynens darüber, [warum `await` `Promise#then()` überlegen ist](https://mathiasbynens.be/notes/async-stack-traces).

## Fazit

Wir haben asynchrone Funktionen dank zwei wesentlicher Optimierungen schneller gemacht:

- die Entfernung von zwei zusätzlichen Microticks, und
- die Entfernung des `throwaway`-Promises.

Darüber hinaus haben wir die Entwicklererfahrung mittels [*kostenloser asynchroner Stacktraces*](https://bit.ly/v8-zero-cost-async-stack-traces) verbessert, die mit `await` in asynchronen Funktionen und `Promise.all()` funktionieren.

Außerdem haben wir einige nützliche Leistungstipps für JavaScript-Entwickler:

- bevorzugen Sie `async`-Funktionen und `await` gegenüber handgeschriebenem Promise-Code, und
- verwenden Sie die native Promise-Implementierung der JavaScript-Engine, um von den Optimierungen zu profitieren, d.h. das Vermeiden von zwei Microticks für `await`.
