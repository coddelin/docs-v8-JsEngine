---
title: "Die neue Superkraft von JavaScript: Explizites Ressourcenmanagement"
author: 'Rezvan Mahdavi Hezaveh'
avatars:
  - 'rezvan-mahdavi-hezaveh'
date: 2025-05-09
tags:
  - ECMAScript
description: 'Der Vorschlag zum expliziten Ressourcenmanagement ermöglicht es Entwicklern, den Lebenszyklus von Ressourcen ausdrücklich zu verwalten.'
tweet: ''
---

Der Vorschlag *Explizites Ressourcenmanagement* führt einen deterministischen Ansatz ein, um den Lebenszyklus von Ressourcen wie Datei-Handles, Netzwerkverbindungen und mehr ausdrücklich zu verwalten. Dieser Vorschlag bringt folgende Erweiterungen in die Sprache ein: die `using`- und `await using`-Deklarationen, die automatisch die Dispose-Methode aufrufen, wenn eine Ressource aus dem Gültigkeitsbereich fällt; `[Symbol.dispose]()`- und `[Symbol.asyncDispose]()`-Symbole für Bereinigungsoperationen; zwei neue globale Objekte `DisposableStack` und `AsyncDisposableStack` als Container zur Aggregation von disposablen Ressourcen; und `SuppressedError` als neuen Fehler-Typ (enthält sowohl den zuletzt geworfenen Fehler als auch den unterdrückten Fehler), um das Szenario zu adressieren, in dem während der Bereinigung einer Ressource ein Fehler auftritt und möglicherweise ein bereits vorhandener Fehler verdeckt wird, der aus dem Body oder der Bereinigung einer anderen Ressource geworfen wurde. Diese Erweiterungen ermöglichen es Entwicklern, robusteren, leistungsfähigeren und leichter wartbaren Code zu schreiben, indem sie eine feingliedrige Kontrolle über die Ressourcenbereinigung bieten.

<!--truncate-->
## `using`- und `await using`-Deklarationen

Das Herzstück des Vorschlags zum expliziten Ressourcenmanagement liegt in den `using`- und `await using`-Deklarationen. Die `using`-Deklaration ist für synchrone Ressourcen konzipiert und stellt sicher, dass die `[Symbol.dispose]()`-Methode einer disposable Resource aufgerufen wird, wenn der Gültigkeitsbereich, in dem sie definiert ist, verlassen wird. Für asynchrone Ressourcen funktioniert die `await using`-Deklaration ähnlich, stellt jedoch sicher, dass die `[Symbol.asyncDispose]()`-Methode aufgerufen wird und das Ergebnis dieses Aufrufs abgewartet wird, sodass asynchrone Bereinigungsoperationen ermöglicht werden. Diese Unterscheidung ermöglicht es Entwicklern, sowohl synchrone als auch asynchrone Ressourcen zuverlässig zu verwalten, Lecks zu verhindern und die allgemeine Codequalität zu verbessern. Die `using`- und `await using`-Keywords können innerhalb von geschweiften Klammern `{}` (wie Blöcken, Schleifen und Funktion-Bodies) verwendet werden und dürfen nicht auf oberster Ebene eingesetzt werden. 

Wenn man beispielsweise mit [`ReadableStreamDefaultReader`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader) arbeitet, ist es entscheidend, `reader.releaseLock()` aufzurufen, um den Stream zu entsperren und die weitere Nutzung zu ermöglichen. Fehlerbehandlung bringt jedoch ein häufiges Problem mit sich: Wenn während des Lesevorgangs ein Fehler auftritt und man vergisst, `releaseLock()` aufzurufen bevor der Fehler weitergegeben wird, bleibt der Stream gesperrt. Beginnen wir mit einem naiven Beispiel:

```javascript
let responsePromise = null;

async function readFile(url) {  
    if (!responsePromise) {
        // Nur abrufen, wenn wir noch kein Versprechen haben
        responsePromise = fetch(url);
    }
    const response = await responsePromise;
    if (!response.ok) {
      throw new Error(`HTTP-Fehler! Status: ${response.status}`);
    }
    const processedData = await processData(response);

    // Mach etwas mit processedData
    ...
 }

async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // Daten verarbeiten und das Ergebnis in processedData speichern
            ...
            // Hier wird ein Fehler geworfen!
        }
    }
    
    // Da der Fehler vor dieser Zeile geworfen wird, bleibt der Stream gesperrt.
    reader.releaseLock(); 

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

Es ist daher entscheidend für Entwickler, einen `try...finally`-Block zu verwenden, während sie Streams nutzen, und `reader.releaseLock()` in das `finally`-Statement zu setzen. Dieses Muster stellt sicher, dass `reader.releaseLock()` immer aufgerufen wird.

```javascript
async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    try {
        while (!done) {
            ({ done, value } = await reader.read());
            if (value) {
                // Daten verarbeiten und das Ergebnis in processedData speichern
                ...
                // Hier wird ein Fehler geworfen!
            }
        }
    } finally {
        // Die Sperre des Lesers auf dem Stream wird immer aufgehoben.
        reader.releaseLock();
    }

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

Eine Alternative, um diesen Code zu schreiben, besteht darin, ein Disposable-Objekt `readerResource` zu erstellen, das den Reader (`response.body.getReader()`) und die Methode `[Symbol.dispose]()` besitzt, die `this.reader.releaseLock()` aufruft. Die `using`-Deklaration stellt sicher, dass `readerResource[Symbol.dispose]()` aufgerufen wird, wenn der Codeblock beendet wird, und es ist nicht mehr erforderlich, sich daran zu erinnern, `releaseLock` manuell aufzurufen, da die `using`-Deklaration dies übernimmt. Eine Integration von `[Symbol.dispose]` und `[Symbol.asyncDispose]` in Web-APIs wie Streams könnte in Zukunft erfolgen, sodass Entwickler nicht mehr das manuelle Wrapper-Objekt schreiben müssen.

```javascript
 async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;

    // Den Reader in eine Disposable-Ressource einpacken
    using readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
        },
    };
    const { reader } = readerResource;

    let done = false;
    let value;
    let processedData;
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // Daten verarbeiten und das Ergebnis in processedData speichern
            ...
            // Hier wird ein Fehler ausgelöst!
        }
    }
    return processedData;
  }
 // readerResource[Symbol.dispose]() wird automatisch aufgerufen.

 readFile('https://example.com/largefile.dat');
```

## `DisposableStack` und `AsyncDisposableStack`

Um die Verwaltung mehrerer Disposable-Ressourcen weiter zu erleichtern, führt der Vorschlag `DisposableStack` und `AsyncDisposableStack` ein. Diese stackbasierten Strukturen ermöglichen es Entwicklern, mehrere Ressourcen zu gruppieren und koordiniert zu entsorgen. Ressourcen werden dem Stack hinzugefügt, und wenn der Stack synchron oder asynchron entsorgt wird, werden die Ressourcen in umgekehrter Reihenfolge entsorgt, in der sie hinzugefügt wurden, sodass Abhängigkeiten zwischen ihnen korrekt gehandhabt werden. Dies vereinfacht den Aufräumprozess bei komplexen Szenarien mit mehreren abhängigen Ressourcen. Beide Strukturen bieten Methoden wie `use()`, `adopt()` und `defer()` zum Hinzufügen von Ressourcen oder Entsorgungsaktionen sowie eine `dispose()`- oder `asyncDispose()`-Methode, um die Reinigung auszulösen. `DisposableStack` und `AsyncDisposableStack` haben `[Symbol.dispose]()` bzw. `[Symbol.asyncDispose]()`, sodass sie mit den Schlüsselwörtern `using` und `await using` verwendet werden können. Diese bieten eine robuste Möglichkeit, die Entsorgung mehrerer Ressourcen innerhalb eines definierten Bereichs zu verwalten.

Schauen wir uns die einzelnen Methoden an und sehen ein Beispiel dazu:

`use(value)` fügt eine Ressource an die Spitze des Stacks hinzu.

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('Reader lock released.');
        },
    };
    using stack = new DisposableStack();
    stack.use(readerResource);
}
// Reader lock released.
```

`adopt(value, onDispose)` fügt eine nicht-disposable Ressource und einen Entsorgungs-Callback an die Spitze des Stacks hinzu.

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader => {
        reader.releaseLock();
        console.log('Reader lock released.');
      });
}
// Reader lock released.
```

`defer(onDispose)` fügt einen Entsorgungs-Callback an die Spitze des Stacks hinzu. Es ist nützlich, um Aufräumaktionen hinzuzufügen, die keine zugehörige Ressource haben.

```javascript
{
    using stack = new DisposableStack();
    stack.defer(() => console.log("done."));
}
// done.
```

`move()` verschiebt alle derzeit in diesem Stack enthaltenen Ressourcen in einen neuen `DisposableStack`. Dies kann nützlich sein, wenn Sie den Besitz von Ressourcen an einen anderen Teil Ihres Codes übertragen müssen.

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader => {
        reader.releaseLock();
        console.log('Reader lock released.');
      });
    using newStack = stack.move();
}
// Hier existiert nur noch newStack und die darin enthaltene Ressource wird entsorgt.
// Reader lock released.
```

`dispose()` in DisposableStack und `disposeAsync()` in AsyncDisposableStack entsorgen die Ressourcen innerhalb dieses Objekts.

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('Reader lock released.');
        },
    };
    let stack = new DisposableStack();
    stack.use(readerResource);
    stack.dispose();
}
// Reader lock released.
```

## Verfügbarkeit

Explizites Ressourcenmanagement wird in Chromium 134 und V8 v13.8 bereitgestellt.

## Unterstützung für explizites Ressourcenmanagement

<feature-support chrome="134 https://chromestatus.com/feature/5071680358842368"
                 firefox="134 (nightly) https://bugzilla.mozilla.org/show_bug.cgi?id=1927195"
                 safari="nein https://bugs.webkit.org/show_bug.cgi?id=248707" 
                 nodejs="nein"
                 babel="ja https://github.com/zloirock/core-js#explicit-resource-management"></feature-support>
