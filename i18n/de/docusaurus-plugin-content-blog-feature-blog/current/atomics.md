---
title: '`Atomics.wait`, `Atomics.notify`, `Atomics.waitAsync`'
author: '[Marja Hölttä](https://twitter.com/marjakh), eine nicht blockierende Bloggerin'
avatars:
  - marja-holtta
date: 2020-09-24
tags:
  - ECMAScript
  - ES2020
  - Node.js 16
description: 'Atomics.wait und Atomics.notify sind Low-Level-Synchronisationsprimitiven, die nützlich für die Implementierung von beispielsweise Mutexen sind. Atomics.wait kann nur in Worker-Threads benutzt werden. V8 Version 8.7 unterstützt jetzt eine nicht-blockierende Version, Atomics.waitAsync, die auch im Haupt-Thread verwendet werden kann.'
tweet: '1309118447377358848'
---
[`Atomics.wait`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) und [`Atomics.notify`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) sind Low-Level-Synchronisationsprimitiven, die nützlich für die Implementierung von Mutexen und anderen Synchronisationsmethoden sind. Da `Atomics.wait` blockierend ist, ist es jedoch nicht möglich, es im Haupt-Thread aufzurufen (ein solcher Versuch löst einen `TypeError` aus).

<!--truncate-->
Ab Version 8.7 unterstützt V8 eine nicht-blockierende Version, [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md), die auch im Haupt-Thread verwendet werden kann.

In diesem Beitrag erklären wir, wie man diese Low-Level-APIs verwendet, um einen Mutex zu implementieren, der sowohl synchron (für Worker-Threads) als auch asynchron (für Worker-Threads oder den Haupt-Thread) funktioniert.

`Atomics.wait` und `Atomics.waitAsync` nehmen die folgenden Parameter:

- `buffer`: eine `Int32Array` oder `BigInt64Array`, die von einem `SharedArrayBuffer` unterstützt wird
- `index`: ein gültiger Index innerhalb des Arrays
- `expectedValue`: ein Wert, den wir in der Speicheradresse `(buffer, index)` erwarten
- `timeout`: ein Timeout in Millisekunden (optional, Standardwert ist `Infinity`)

Der Rückgabewert von `Atomics.wait` ist ein String. Wenn die Speicheradresse nicht den erwarteten Wert enthält, gibt `Atomics.wait` sofort den Wert `'not-equal'` zurück. Andernfalls wird der Thread blockiert, bis ein anderer Thread `Atomics.notify` mit derselben Speicheradresse aufruft oder das Timeout erreicht wird. Im ersten Fall gibt `Atomics.wait` den Wert `'ok'` zurück, im zweiten Fall den Wert `'timed-out'`.

`Atomics.notify` nimmt die folgenden Parameter:

- eine `Int32Array` oder `BigInt64Array`, die von einem `SharedArrayBuffer` unterstützt wird
- einen Index (gültig innerhalb des Arrays)
- wie viele wartende Threads benachrichtigt werden sollen (optional, Standardwert ist `Infinity`)

Es benachrichtigt die angegebene Anzahl wartender Threads in FIFO-Reihenfolge, die an der Speicheradresse `(buffer, index)` warten. Wenn es mehrere anstehende `Atomics.wait`- oder `Atomics.waitAsync`-Aufrufe für dieselbe Speicheradresse gibt, befinden sich alle in derselben FIFO-Warteschlange.

Im Gegensatz zu `Atomics.wait` gibt `Atomics.waitAsync` immer sofort zurück. Der Rückgabewert ist einer der folgenden:

- `{ async: false, value: 'not-equal' }` (wenn die Speicheradresse nicht den erwarteten Wert enthielt)
- `{ async: false, value: 'timed-out' }` (nur bei sofortigem Timeout `0`)
- `{ async: true, value: promise }`

Das Versprechen kann später mit dem String-Wert `'ok'` (wenn `Atomics.notify` mit derselben Speicheradresse aufgerufen wurde) oder `'timed-out'` (wenn das Timeout erreicht wurde) aufgelöst werden. Das Versprechen wird niemals abgelehnt.

Das folgende Beispiel zeigt die Grundnutzung von `Atomics.waitAsync`:

```js
const sab = new SharedArrayBuffer(16);
const i32a = new Int32Array(sab);
const result = Atomics.waitAsync(i32a, 0, 0, 1000);
//                                     |  |  ^ Timeout (optional)
//                                     |  ^ erwarteter Wert
//                                     ^ Index

if (result.value === 'not-equal') {
  // Der Wert im SharedArrayBuffer war nicht der erwartete.
} else {
  result.value instanceof Promise; // true
  result.value.then(
    (value) => {
      if (value == 'ok') { /* benachrichtigt */ }
      else { /* Wert ist 'timed-out' */ }
    });
}

// In diesem Thread oder in einem anderen Thread:
Atomics.notify(i32a, 0);
```

Als Nächstes zeigen wir, wie man einen Mutex implementiert, der sowohl synchron als auch asynchron verwendet werden kann. Die Implementierung der synchronen Version des Mutexes wurde zuvor diskutiert, z. B. [in diesem Blogbeitrag](https://blogtitle.github.io/using-javascript-sharedarraybuffers-and-atomics/).

Im Beispiel verwenden wir den Timeout-Parameter in `Atomics.wait` und `Atomics.waitAsync` nicht. Der Parameter kann verwendet werden, um Bedingungsvariablen mit einem Timeout zu implementieren.

Unsere Mutex-Klasse, `AsyncLock`, arbeitet auf einem `SharedArrayBuffer` und implementiert die folgenden Methoden:

- `lock` — blockiert den Thread, bis wir den Mutex sperren können (nur auf einem Worker-Thread verwendbar)
- `unlock` — entsperrt den Mutex (Gegenstück zu `lock`)
- `executeLocked(callback)` — nicht-blockierende Sperre, kann von der Hauptthread verwendet werden; plant den `callback`, sobald wir es schaffen, die Sperre zu erhalten

Schauen wir uns an, wie jeder dieser Schritte implementiert werden kann. Die Klassendefinition enthält Konstanten und einen Konstruktor, der den `SharedArrayBuffer` als Parameter übernimmt.

```js
class AsyncLock {
  static INDEX = 0;
  static UNLOCKED = 0;
  static LOCKED = 1;

  constructor(sab) {
    this.sab = sab;
    this.i32a = new Int32Array(sab);
  }

  lock() {
    /* … */
  }

  unlock() {
    /* … */
  }

  executeLocked(f) {
    /* … */
  }
}
```

`i32a[0]` enthält entweder den Wert `LOCKED` oder `UNLOCKED`. Es dient auch als Wartebereich für `Atomics.wait` und `Atomics.waitAsync`. Die Klasse `AsyncLock` gewährleistet die folgenden Invarianten:

1. Wenn `i32a[0] == LOCKED` ist und ein Thread beginnt zu warten (entweder mit `Atomics.wait` oder `Atomics.waitAsync`) auf `i32a[0]`, wird er schließlich benachrichtigt.
1. Nach der Benachrichtigung versucht der Thread, die Sperre zu greifen. Wenn er die Sperre erhält, benachrichtigt er beim Freigeben der Sperre erneut.

## Synchrones Sperren und Freigeben

Im Folgenden zeigen wir die blockierende `lock`-Methode, die nur vom Worker-Thread aufgerufen werden kann:

```js
lock() {
  while (true) {
    const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                        /* alter Wert >>> */  AsyncLock.UNLOCKED,
                        /* neuer Wert >>> */  AsyncLock.LOCKED);
    if (oldValue == AsyncLock.UNLOCKED) {
      return;
    }
    Atomics.wait(this.i32a, AsyncLock.INDEX,
                 AsyncLock.LOCKED); // <<< erwarteter Wert zu Beginn
  }
}
```

Wenn ein Thread `lock()` aufruft, versucht er zuerst, die Sperre durch `Atomics.compareExchange` zu erhalten, wodurch der Sperrzustand von `UNLOCKED` auf `LOCKED` geändert wird. `Atomics.compareExchange` versucht, den Zustand atomar zu ändern, und gibt den Originalwert des Speicherorts zurück. Wenn der Originalwert `UNLOCKED` war, wissen wir, dass die Zustandsänderung erfolgreich war und der Thread die Sperre erhalten hat. Es ist keine weitere Aktion erforderlich.

Wenn `Atomics.compareExchange` es nicht schafft, den Sperrzustand zu ändern, hält ein anderer Thread die Sperre. Daher versucht dieser Thread `Atomics.wait`, um auf die Freigabe der Sperre durch den anderen Thread zu warten. Wenn der Speicherort weiterhin den erwarteten Wert enthält (in diesem Fall `AsyncLock.LOCKED`), blockiert der Aufruf von `Atomics.wait` den Thread, und der Aufruf von `Atomics.wait` gibt nur zurück, wenn ein anderer Thread `Atomics.notify` aufruft.

`unlock` ist eine Methode, die die Sperre in den `UNLOCKED` Zustand setzt und `Atomics.notify` aufruft, um einen wartenden Thread zu wecken, der auf die Sperre wartet. Die Zustandsänderung soll immer erfolgreich sein, da dieser Thread die Sperre hält und niemand anderes inzwischen `unlock()` aufrufen sollte.

```js
unlock() {
  const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                      /* alter Wert >>> */  AsyncLock.LOCKED,
                      /* neuer Wert >>> */  AsyncLock.UNLOCKED);
  if (oldValue != AsyncLock.LOCKED) {
    throw new Error('Versucht, die Sperre freizugeben, während das Mutex nicht gehalten wird');
  }
  Atomics.notify(this.i32a, AsyncLock.INDEX, 1);
}
```

Der einfache Fall ist wie folgt: Die Sperre ist frei, und Thread T1 erhält sie, indem er den Sperrzustand mit `Atomics.compareExchange` ändert. Thread T2 versucht, die Sperre durch `Atomics.compareExchange` zu erhalten, schafft es jedoch nicht, den Sperrzustand zu ändern. T2 ruft dann `Atomics.wait` auf, wodurch der Thread blockiert wird. Zu einem bestimmten Zeitpunkt gibt T1 die Sperre frei und ruft `Atomics.notify` auf. Dadurch gibt der `Atomics.wait`-Aufruf in T2 `'ok'` zurück und weckt T2 auf. T2 versucht dann erneut, die Sperre zu erhalten, und schafft es diesmal.

Es gibt auch zwei mögliche Eckfälle – sie demonstrieren den Grund, warum `Atomics.wait` und `Atomics.waitAsync` einen bestimmten Wert am Index überprüfen:

- T1 hält die Sperre, und T2 versucht, sie zu erhalten. Zunächst versucht T2, den Sperrzustand mit `Atomics.compareExchange` zu ändern, schafft es jedoch nicht. Aber dann gibt T1 die Sperre frei, bevor T2 `Atomics.wait` aufrufen kann. Wenn T2 `Atomics.wait` aufruft, gibt es sofort mit dem Wert `'nicht-gleich'` zurück. In diesem Fall macht T2 mit der nächsten Schleifeniteration weiter und versucht erneut, die Sperre zu erhalten.
- T1 hält die Sperre, und T2 wartet darauf mit `Atomics.wait`. T1 gibt die Sperre frei – T2 wird aufgeweckt (der `Atomics.wait`-Aufruf gibt zurück) und versucht, `Atomics.compareExchange` auszuführen, um die Sperre zu erhalten. Aber ein anderer Thread T3 war schneller und hat die Sperre bereits erhalten. Der Aufruf von `Atomics.compareExchange` schlägt fehl, die Sperre zu erhalten, und T2 ruft erneut `Atomics.wait` auf, wodurch der Thread blockiert wird, bis T3 die Sperre freigibt.

Aufgrund des letzteren Eckfalls ist das Mutex nicht „fair“. Es ist möglich, dass T2 darauf gewartet hat, dass die Sperre freigegeben wird, aber T3 kommt und erhält sie sofort. Eine realistischere Sperrimplementierung könnte mehrere Zustände verwenden, um zwischen „gesperrt“ und „gesperrt mit Konflikt“ zu unterscheiden.

## Asynchrones Sperren

Die nicht blockierende Methode `executeLocked` kann vom Hauptthread aufgerufen werden, im Gegensatz zur blockierenden `lock`-Methode. Sie erhält eine Callback-Funktion als einzigen Parameter und plant die Ausführung des Callbacks, sobald sie die Sperre erfolgreich erhalten hat.

```js
executeLocked(f) {
  const self = this;

  async function tryGetLock() {
    while (true) {
      const oldValue = Atomics.compareExchange(self.i32a, AsyncLock.INDEX,
                          /* alter Wert >>> */  AsyncLock.UNLOCKED,
                          /* neuer Wert >>> */  AsyncLock.LOCKED);
      if (oldValue == AsyncLock.UNLOCKED) {
        f();
        self.unlock();
        return;
      }
      const result = Atomics.waitAsync(self.i32a, AsyncLock.INDEX,
                                       AsyncLock.LOCKED);
                                   //  ^ erwarteter Wert zu Beginn
      await result.value;
    }
  }

  tryGetLock();
}
```

Die innere Funktion `tryGetLock` versucht zunächst, das Lock mit `Atomics.compareExchange` zu erhalten, wie zuvor. Wenn dies erfolgreich den Zustand des Locks ändert, kann sie den Callback ausführen, das Lock entriegeln und zurückkehren.

Falls `Atomics.compareExchange` das Lock nicht bekommt, müssen wir es erneut versuchen, wenn das Lock wahrscheinlich frei ist. Wir können nicht blockieren und warten, bis das Lock frei wird – stattdessen planen wir den neuen Versuch mit `Atomics.waitAsync` und dem zurückgegebenen Promise.

Falls es uns gelingt, `Atomics.waitAsync` zu starten, wird das zurückgegebene Promise aufgelöst, wenn der Thread, der das Lock hält, `Atomics.notify` ausführt. Dann versucht der Thread, der auf das Lock gewartet hat, erneut das Lock zu erhalten, wie zuvor.

Die gleichen Randfälle (das Lock wird zwischen dem `Atomics.compareExchange`-Aufruf und dem `Atomics.waitAsync`-Aufruf freigegeben sowie das Lock wird erneut zwischen dem Auflösen des Promise und dem `Atomics.compareExchange`-Aufruf erworben) sind auch in der asynchronen Version möglich, daher muss der Code sie robust behandeln.

## Fazit

In diesem Beitrag haben wir gezeigt, wie man die Synchronisationsprimitive `Atomics.wait`, `Atomics.waitAsync` und `Atomics.notify` nutzen kann, um einen Mutex zu implementieren, der sowohl im Hauptthread als auch in Worker-Threads verwendet werden kann.

## Funktionsunterstützung

### `Atomics.wait` und `Atomics.notify`

<feature-support chrome="68"
                 firefox="78"
                 safari="nein"
                 nodejs="8.10.0"
                 babel="nein"></feature-support>

### `Atomics.waitAsync`

<feature-support chrome="87"
                 firefox="nein"
                 safari="nein"
                 nodejs="16"
                 babel="nein"></feature-support>
