---
title: 'Stacktrace-API'
description: 'Dieses Dokument beschreibt die JavaScript-Stacktrace-API von V8.'
---
Alle internen Fehler, die in V8 auftreten, erfassen beim Erstellen einen Stacktrace. Dieser Stacktrace kann in JavaScript über die nicht standardisierte Eigenschaft `error.stack` abgerufen werden. V8 verfügt außerdem über verschiedene Hooks, um zu steuern, wie Stacktraces erfasst und formatiert werden, und um benutzerdefinierten Fehlern ebenfalls das Erfassen von Stacktraces zu ermöglichen. Dieses Dokument beschreibt die JavaScript-Stacktrace-API von V8.

## Basis-Stacktraces

Standardmäßig haben fast alle von V8 ausgelösten Fehler eine `stack`-Eigenschaft, die die obersten 10 Stackframes enthält, formatiert als Zeichenkette. Hier ist ein Beispiel für einen vollständig formatierten Stacktrace:

```
ReferenceError: FAIL ist nicht definiert
   at Constraint.execute (deltablue.js:525:2)
   at Constraint.recalculate (deltablue.js:424:21)
   at Planner.addPropagate (deltablue.js:701:6)
   at Constraint.satisfy (deltablue.js:184:15)
   at Planner.incrementalAdd (deltablue.js:591:21)
   at Constraint.addConstraint (deltablue.js:162:10)
   at Constraint.BinaryConstraint (deltablue.js:346:7)
   at Constraint.EqualityConstraint (deltablue.js:515:38)
   at chainTest (deltablue.js:807:6)
   at deltaBlue (deltablue.js:879:2)
```

Der Stacktrace wird beim Erstellen des Fehlers erfasst und bleibt unabhängig davon, wo oder wie oft der Fehler ausgelöst wird, gleich. Wir erfassen 10 Frames, da dies normalerweise ausreicht, um nützlich zu sein, ohne dass es merklich negative Auswirkungen auf die Leistung hat. Sie können steuern, wie viele Stackframes erfasst werden, indem Sie die Variable

```js
Error.stackTraceLimit
```

festlegen. Wenn Sie sie auf `0` setzen, deaktivieren Sie die Sammlung von Stacktraces. Jede endliche Ganzzahl kann als maximale Anzahl der zu erfassenden Frames verwendet werden. Wenn Sie sie auf `Infinity` setzen, werden alle Frames erfasst. Diese Variable betrifft nur den aktuellen Kontext; sie muss ausdrücklich für jeden Kontext festgelegt werden, der einen anderen Wert benötigt. (Beachten Sie, dass das, was in der Terminologie von V8 als „Kontext“ bezeichnet wird, einer Seite oder einem `<iframe>` in Google Chrome entspricht). Um einen anderen Standardwert festzulegen, der alle Kontexte betrifft, verwenden Sie die folgende V8-Befehlszeilenoption:

```bash
--stack-trace-limit <Wert>
```

Um diese Option an V8 weiterzugeben, wenn Sie Google Chrome ausführen, verwenden Sie:

```bash
--js-flags='--stack-trace-limit <Wert>'
```

## Asynchrone Stacktraces

Die `--async-stack-traces`-Option (seit [V8 v7.3](https://v8.dev/blog/v8-release-73#async-stack-traces) standardmäßig aktiviert) ermöglicht die neuen [kostenlosen asynchronen Stacktraces](https://bit.ly/v8-zero-cost-async-stack-traces), die die `stack`-Eigenschaft von `Error`-Instanzen um asynchrone Stackframes, d.h. `await`-Positionen im Code, erweitern. Diese asynchronen Frames werden im `stack`-String mit `async` markiert:

```
ReferenceError: FAIL ist nicht definiert
    at bar (<anonymous>)
    at async foo (<anonymous>)
```

Zum Zeitpunkt des Verfassens dieses Textes ist diese Funktionalität auf `await`-Positionen, `Promise.all()` und `Promise.any()` beschränkt, da für diese Fälle die Engine die notwendigen Informationen ohne zusätzlichen Aufwand rekonstruieren kann (daher ist sie kostenlos).

## Sammlung von Stacktraces für benutzerdefinierte Ausnahmen

Der für integrierte Fehler verwendete Stacktrace-Mechanismus wird mithilfe einer allgemeinen Stacktrace-Sammel-API implementiert, die auch für Benutzerskripte verfügbar ist. Die Funktion

```js
Error.captureStackTrace(error, constructorOpt)
```

fügt dem angegebenen `error`-Objekt eine `stack`-Eigenschaft hinzu, die den Stacktrace zum Zeitpunkt des Aufrufs von `captureStackTrace` ergibt. Stacktraces, die über `Error.captureStackTrace` erfasst werden, werden sofort gesammelt, formatiert und an das angegebene `error`-Objekt angehängt.

Der optionale Parameter `constructorOpt` ermöglicht es Ihnen, einen Funktionswert zu übergeben. Beim Sammeln des Stacktraces werden alle Frames oberhalb des obersten Aufrufs dieser Funktion, einschließlich dieses Aufrufs, aus dem Stacktrace ausgeschlossen. Dies kann nützlich sein, um Implementierungsdetails zu verbergen, die für den Benutzer nicht nützlich sind. Der übliche Weg, einen benutzerdefinierten Fehler zu definieren, der einen Stacktrace erfasst, wäre:

```js
function MyError() {
  Error.captureStackTrace(this, MyError);
  // Andere Initialisierungen erfolgen hier.
}
```

Die Übergabe von MyError als zweites Argument bedeutet, dass der Konstruktoraufruf von MyError im Stacktrace nicht angezeigt wird.

## Anpassung von Stacktraces

Im Gegensatz zu Java, wo der Stacktrace einer Ausnahme ein strukturiertes Objekt ist, das eine Inspektion des Stackzustands ermöglicht, enthält die `stack`-Eigenschaft in V8 lediglich eine flache Zeichenkette mit dem formatierten Stacktrace. Dies geschieht ausschließlich aus Gründen der Kompatibilität mit anderen Browsern. Dies ist jedoch nicht fest codiert, sondern nur das Standardverhalten und kann von Benutzerskripten überschrieben werden.

Aus Effizienzgründen werden Stacktraces nicht formatiert, wenn sie erfasst werden, sondern nur auf Anforderung, d. h. das erste Mal, wenn auf die `stack`-Eigenschaft zugegriffen wird. Ein Stacktrace wird formatiert durch das Aufrufen von

```js
Error.prepareStackTrace(error, structuredStackTrace)
```

und verwendet, was auch immer dieser Aufruf als Wert der `stack`-Eigenschaft zurückgibt. Wenn Sie der `Error.prepareStackTrace`-Eigenschaft einen anderen Funktionswert zuweisen, wird diese Funktion verwendet, um Stack-Traces zu formatieren. Sie erhält das Fehlerobjekt, für das sie einen Stack-Trace erstellt, sowie eine strukturierte Darstellung des Stacks. Benutzerdefinierte Stack-Trace-Formatter können den Stack-Trace nach Belieben formatieren und sogar Nicht-String-Werte zurückgeben. Es ist sicher, Verweise auf das strukturierte Stack-Trace-Objekt nach Abschluss eines Aufrufs an `prepareStackTrace` beizubehalten, sodass dies ebenfalls ein gültiger Rückgabewert ist. Beachten Sie, dass die benutzerdefinierte `prepareStackTrace`-Funktion nur aufgerufen wird, wenn auf die `stack`-Eigenschaft des `Error`-Objekts zugegriffen wird.

Der strukturierte Stack-Trace ist ein Array von `CallSite`-Objekten, von denen jedes einen Stack-Frame darstellt. Ein `CallSite`-Objekt definiert die folgenden Methoden:

- `getThis`: Gibt den Wert von `this` zurück
- `getTypeName`: Gibt den Typ von `this` als String zurück. Dies ist der Name der Funktion, die im Konstruktorfeld von `this` gespeichert ist, falls verfügbar, andernfalls die interne Eigenschaft `[[Class]]` des Objekts.
- `getFunction`: Gibt die aktuelle Funktion zurück
- `getFunctionName`: Gibt den Namen der aktuellen Funktion zurück, üblicherweise deren `name`-Eigenschaft. Wenn eine `name`-Eigenschaft nicht verfügbar ist, wird versucht, einen Namen aus dem Kontext der Funktion abzuleiten.
- `getMethodName`: Gibt den Namen der Eigenschaft von `this` oder eines seiner Prototypen zurück, die die aktuelle Funktion enthält
- `getFileName`: Gibt, wenn diese Funktion in einem Skript definiert wurde, den Namen des Skripts zurück
- `getLineNumber`: Gibt, wenn diese Funktion in einem Skript definiert wurde, die aktuelle Zeilennummer zurück
- `getColumnNumber`: Gibt, wenn diese Funktion in einem Skript definiert wurde, die aktuelle Spaltennummer zurück
- `getEvalOrigin`: Gibt, wenn diese Funktion mit einem Aufruf von `eval` erstellt wurde, einen String zurück, der den Ort darstellt, an dem `eval` aufgerufen wurde
- `isToplevel`: Handelt es sich hierbei um einen oberen Aufruf, das heißt, ist dies das globale Objekt?
- `isEval`: Findet dieser Aufruf im Code statt, der durch einen Aufruf von `eval` definiert wurde?
- `isNative`: Befindet sich dieser Aufruf im nativen V8-Code?
- `isConstructor`: Handelt es sich um einen Konstruktoraufruf?
- `isAsync`: Handelt es sich um einen asynchronen Aufruf (z. B. `await`, `Promise.all()` oder `Promise.any()`)?
- `isPromiseAll`: Handelt es sich um einen asynchronen Aufruf von `Promise.all()`?
- `getPromiseIndex`: Gibt den Index des Promise-Elements zurück, das in `Promise.all()` oder `Promise.any()` für asynchrone Stack-Traces verfolgt wurde, oder `null`, wenn der `CallSite` kein asynchroner `Promise.all()`- oder `Promise.any()`-Aufruf ist.

Der Standard-Stack-Trace wird mithilfe der CallSite-API erstellt, sodass alle dort verfügbaren Informationen auch über diese API verfügbar sind.

Um Einschränkungen, die für Funktionen im strikten Modus auferlegt sind, einzuhalten, dürfen Frames, die eine Funktion im strikten Modus enthalten und alle darunter liegenden Frames (z. B. deren Aufrufer), nicht auf ihre Receiver- und Funktionsobjekte zugreifen. Für diese Frames geben `getFunction()` und `getThis()` `undefined` zurück.

## Kompatibilität

Die hier beschriebene API ist spezifisch für V8 und wird von keiner anderen JavaScript-Implementierung unterstützt. Die meisten Implementierungen stellen zwar eine `error.stack`-Eigenschaft bereit, jedoch ist das Format des Stack-Traces wahrscheinlich unterschiedlich zu dem hier beschriebenen Format. Die empfohlene Verwendung dieser API ist:

- Verlassen Sie sich nur auf das Layout des formatierten Stack-Traces, wenn Sie wissen, dass Ihr Code in V8 ausgeführt wird.
- Es ist sicher, `Error.stackTraceLimit` und `Error.prepareStackTrace` zu setzen, unabhängig davon, welche Implementierung Ihren Code ausführt. Beachten Sie jedoch, dass dies nur dann eine Auswirkung hat, wenn Ihr Code in V8 ausgeführt wird.

## Anhang: Stack-Trace-Format

Das Standard-Stack-Trace-Format, das von V8 verwendet wird, kann für jeden Stack-Frame die folgenden Informationen liefern:

- Ob der Aufruf ein Konstruktoraufruf ist.
- Der Typ des `this`-Werts (`Type`).
- Der Name der aufgerufenen Funktion (`functionName`).
- Der Name der Eigenschaft von `this` oder eines seiner Prototypen, die die Funktion enthält (`methodName`).
- Der aktuelle Ort im Quellcode (`location`).

Jede dieser Informationen kann nicht verfügbar sein, und je nachdem, wie viele dieser Informationen verfügbar sind, werden unterschiedliche Formate für Stack-Frames verwendet. Wenn alle oben genannten Informationen verfügbar sind, sieht ein formatierter Stack-Frame wie folgt aus:

```
at Type.functionName [as methodName] (location)
```

Oder im Falle eines Konstruktoraufrufs:

```
at new functionName (location)
```

Oder im Fall eines asynchronen Aufrufs:

```
at async functionName (location)
```

Wenn nur eines von `functionName` und `methodName` verfügbar ist oder wenn beide verfügbar, aber identisch sind, lautet das Format:

```
at Type.name (location)
```

Wenn keines verfügbar ist, wird `<anonymous>` als Name verwendet.

Der Wert `Type` ist der Name der Funktion, die im Konstruktorfeld von `this` gespeichert ist. In V8 setzen alle Konstruktoraufrufe diese Eigenschaft auf die Konstruktorfunktion, sodass, falls dieses Feld nicht aktiv geändert wurde, nachdem das Objekt erstellt wurde, es den Namen der Funktion enthält, durch die es erstellt wurde. Wenn es nicht verfügbar ist, wird die `[[Class]]`-Eigenschaft des Objekts verwendet.

Ein Sonderfall ist das globale Objekt, bei dem der `Type` nicht angezeigt wird. In diesem Fall wird der Stack-Frame wie folgt formatiert:

```
at functionName [as methodName] (location)
```

Der Standort selbst hat mehrere mögliche Formate. Am häufigsten ist der Dateiname, die Zeilen- und Spaltennummer innerhalb des Skripts, das die aktuelle Funktion definiert hat:

```
fileName:lineNumber:columnNumber
```

Wenn die aktuelle Funktion mit `eval` erstellt wurde, lautet das Format:

```
eval at position
```

…wobei `position` die vollständige Position ist, an der der Aufruf von `eval` erfolgte. Beachten Sie, dass dies bedeutet, dass Positionen verschachtelt sein können, wenn es verschachtelte Aufrufe von `eval` gibt, zum Beispiel:

```
eval bei Foo.a (eval bei Bar.z (myscript.js:10:3))
```

Wenn ein Stapelrahmen innerhalb von V8-Bibliotheken liegt, ist der Ort:

```
native
```

...und wenn es nicht verfügbar ist, lautet er:

```
unbekannter Ort
```
