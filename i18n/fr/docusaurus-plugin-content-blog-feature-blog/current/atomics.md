---
title: '`Atomics.wait`, `Atomics.notify`, `Atomics.waitAsync`'
author: '[Marja Hölttä](https://twitter.com/marjakh), une blogueuse non bloquante'
avatars:
  - marja-holtta
date: 2020-09-24
tags:
  - ECMAScript
  - ES2020
  - Node.js 16
description: 'Atomics.wait et Atomics.notify sont des primitives de synchronisation bas-niveau utiles pour implémenter par exemple des mutex. Atomics.wait est uniquement utilisable sur des threads de travail. À partir de la version 8.7, V8 prend en charge une version non bloquante, Atomics.waitAsync, qui est également utilisable sur le thread principal.'
tweet: '1309118447377358848'
---
[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) et [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) sont des primitives de synchronisation bas-niveau utiles pour implémenter des mutex et d’autres moyens de synchronisation. Cependant, étant donné que `Atomics.wait` est bloquant, il est impossible de l’appeler sur le thread principal (une tentative entraîne une `TypeError`).

<!--truncate-->
À partir de la version 8.7, V8 prend en charge une version non bloquante, [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md), qui est également utilisable sur le thread principal.

Dans cet article, nous expliquons comment utiliser ces API bas-niveau pour implémenter un mutex qui fonctionne à la fois de manière synchrone (pour les threads de travail) et asynchrone (pour les threads de travail ou le thread principal).

`Atomics.wait` et `Atomics.waitAsync` prennent les paramètres suivants :

- `buffer`: un `Int32Array` ou `BigInt64Array` basé sur un `SharedArrayBuffer`
- `index`: un index valide dans le tableau
- `expectedValue`: une valeur que nous attendons de trouver à l'emplacement mémoire décrit par `(buffer, index)`
- `timeout`: un délai en millisecondes (optionnel, par défaut à `Infinity`)

La valeur de retour de `Atomics.wait` est une chaîne de caractères. Si l'emplacement mémoire ne contient pas la valeur attendue, `Atomics.wait` retourne immédiatement avec la valeur `'not-equal'`. Sinon, le thread est bloqué jusqu'à ce qu'un autre thread appelle `Atomics.notify` avec le même emplacement mémoire ou que le délai soit expiré. Dans le premier cas, `Atomics.wait` retourne la valeur `'ok'`, dans le dernier cas, `Atomics.wait` retourne la valeur `'timed-out'`.

`Atomics.notify` prend les paramètres suivants :

- un `Int32Array` ou `BigInt64Array` basé sur un `SharedArrayBuffer`
- un index (valide dans le tableau)
- combien d'attente doivent être notifiés (optionnel, par défaut à `Infinity`)

Il notifie le nombre spécifié d'attenteurs, dans l'ordre FIFO, qui attendent à l'emplacement mémoire décrit par `(buffer, index)`. S'il existe plusieurs appels en attente à `Atomics.wait` ou `Atomics.waitAsync` liés au même emplacement, ils sont tous dans la même file FIFO.

Contrairement à `Atomics.wait`, `Atomics.waitAsync` retourne toujours immédiatement. La valeur de retour est l'une des suivantes :

- `{ async: false, value: 'not-equal' }` (si l'emplacement mémoire ne contenait pas la valeur attendue)
- `{ async: false, value: 'timed-out' }` (uniquement pour un délai immédiat de 0)
- `{ async: true, value: promise }`

La promesse peut être résolue ultérieurement avec une chaîne de caractères `'ok'` (si `Atomics.notify` a été appelé avec le même emplacement mémoire) ou `'timed-out'` (si le délai a été atteint). La promesse n'est jamais rejetée.

L'exemple suivant démontre l'utilisation basique de `Atomics.waitAsync` :

```js
const sab = new SharedArrayBuffer(16);
const i32a = new Int32Array(sab);
const result = Atomics.waitAsync(i32a, 0, 0, 1000);
//                                     |  |  ^ délai (opt)
//                                     |  ^ valeur attendue
//                                     ^ index

if (result.value === 'not-equal') {
  // La valeur dans le SharedArrayBuffer n'était pas celle attendue.
} else {
  result.value instanceof Promise; // true
  result.value.then(
    (value) => {
      if (value == 'ok') { /* notifié */ }
      else { /* la valeur est 'timed-out' */ }
    });
}

// Dans ce thread, ou dans un autre thread :
Atomics.notify(i32a, 0);
```

Ensuite, nous montrerons comment implémenter un mutex qui peut être utilisé à la fois de manière synchrone et asynchrone. L'implémentation de la version synchrone du mutex a été discutée précédemment, par exemple [dans cet article de blog](https://blogtitle.github.io/using-javascript-sharedarraybuffers-and-atomics/).

Dans l'exemple, nous n'utilisons pas le paramètre de délai dans `Atomics.wait` et `Atomics.waitAsync`. Le paramètre peut être utilisé pour implémenter des variables conditionnelles avec un délai.

Notre classe de mutex, `AsyncLock`, fonctionne sur un `SharedArrayBuffer` et implémente les méthodes suivantes :

- `lock` — bloque le thread jusqu'à ce que nous puissions verrouiller le mutex (utilisable uniquement sur un thread de travail)
- `unlock` — déverrouille le mutex (contrepartie de `lock`)
- `executeLocked(callback)` — verrou non bloquant, peut être utilisé par le thread principal ; programme `callback` pour qu'il soit exécuté une fois que nous parvenons à obtenir le verrou

Voyons comment chacun d'eux peut être mis en œuvre. La définition de la classe inclut des constantes et un constructeur qui prend le `SharedArrayBuffer` comme paramètre.

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

Ici, `i32a[0]` contient soit la valeur `LOCKED` soit `UNLOCKED`. C'est également l'emplacement d'attente pour `Atomics.wait` et `Atomics.waitAsync`. La classe `AsyncLock` garantit les invariants suivants :

1. Si `i32a[0] == LOCKED`, et qu'un thread commence à attendre (soit via `Atomics.wait` ou `Atomics.waitAsync`) sur `i32a[0]`, il sera finalement notifié.
1. Après avoir été notifié, le thread essaie de prendre le verrou. S'il réussit, il notifie à nouveau lors de sa libération.

## Verrouillage et déverrouillage synchrones

Ensuite, nous montrons la méthode de verrouillage bloquante `lock` qui ne peut être appelée que depuis un thread travailleur :

```js
lock() {
  while (true) {
    const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                        /* ancienne valeur >>> */  AsyncLock.UNLOCKED,
                        /* nouvelle valeur >>> */  AsyncLock.LOCKED);
    if (oldValue == AsyncLock.UNLOCKED) {
      return;
    }
    Atomics.wait(this.i32a, AsyncLock.INDEX,
                 AsyncLock.LOCKED); // <<< valeur attendue au départ
  }
}
```

Lorsqu'un thread appelle `lock()`, il tente d'abord d'obtenir le verrou en utilisant `Atomics.compareExchange` pour changer l'état du verrou de `UNLOCKED` à `LOCKED`. `Atomics.compareExchange` essaie de réaliser ce changement d'état de manière atomique et retourne la valeur originale de l'emplacement mémoire. Si la valeur originale était `UNLOCKED`, on sait que le changement d'état a réussi et le thread a acquis le verrou. Rien de plus n'est nécessaire.

Si `Atomics.compareExchange` n'arrive pas à changer l'état du verrou, un autre thread doit détenir le verrou. Ainsi, ce thread essaie `Atomics.wait` afin d'attendre que l'autre thread libère le verrou. Si l'emplacement mémoire contient encore la valeur attendue (dans ce cas, `AsyncLock.LOCKED`), l'appel à `Atomics.wait` bloquera le thread et l'appel `Atomics.wait` ne retournera que lorsqu'un autre thread appelle `Atomics.notify`.

La méthode `unlock` met le verrou dans l'état `UNLOCKED` et appelle `Atomics.notify` pour réveiller un autre thread en attente du verrou. Le changement d'état est toujours censé réussir, puisque ce thread détient le verrou, et personne d'autre ne devrait appeler `unlock()` entre-temps.

```js
unlock() {
  const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                      /* ancienne valeur >>> */  AsyncLock.LOCKED,
                      /* nouvelle valeur >>> */  AsyncLock.UNLOCKED);
  if (oldValue != AsyncLock.LOCKED) {
    throw new Error('Tentative de déverrouillage sans posséder le mutex');
  }
  Atomics.notify(this.i32a, AsyncLock.INDEX, 1);
}
```

Le cas simple se déroule comme suit : le verrou est libre et le thread T1 l'acquiert en changeant l'état du verrou avec `Atomics.compareExchange`. Le thread T2 essaie d'acquérir le verrou en appelant `Atomics.compareExchange`, mais il n'arrive pas à changer l'état du verrou. T2 appelle alors `Atomics.wait`, ce qui bloque le thread. À un moment donné, T1 libère le verrou et appelle `Atomics.notify`. Cela fait que l'appel `Atomics.wait` dans T2 retourne `'ok'`, réveillant T2. T2 essaie à nouveau d'acquérir le verrou, et cette fois-ci réussit.

Il existe également 2 cas particuliers possibles — qui démontrent la raison pour laquelle `Atomics.wait` et `Atomics.waitAsync` vérifient une valeur spécifique à l'index :

- T1 détient le verrou et T2 essaie de l'obtenir. Tout d'abord, T2 essaie de changer l'état du verrou avec `Atomics.compareExchange`, mais échoue. Mais ensuite, T1 libère le verrou avant que T2 ne parvienne à appeler `Atomics.wait`. Lorsque T2 appelle `Atomics.wait`, il retourne immédiatement avec la valeur `'not-equal'`. Dans ce cas, T2 continue avec l'itération suivante de la boucle, essayant à nouveau d'acquérir le verrou.
- T1 détient le verrou et T2 attend avec `Atomics.wait`. T1 libère le verrou — T2 se réveille (l'appel `Atomics.wait` retourne) et essaie d'appeler `Atomics.compareExchange` pour acquérir le verrou, mais un autre thread T3 a été plus rapide et l'a déjà obtenu. Donc, l'appel à `Atomics.compareExchange` échoue, et T2 appelle à nouveau `Atomics.wait`, attendant que T3 libère le verrou.

En raison de ce dernier cas particulier, le mutex n'est pas « équitable ». Il est possible que T2 ait attendu que le verrou soit libéré, mais que T3 arrive et l'obtienne immédiatement. Une implémentation plus réaliste de verrou pourrait utiliser plusieurs états pour différencier entre « verrouillé » et « verrouillé avec contention ».

## Verrouillage asynchrone

La méthode non bloquante `executeLocked` est appelable depuis le thread principal, contrairement à la méthode bloquante `lock`. Elle reçoit une fonction de rappel comme son seul paramètre et planifie l'exécution de cette fonction une fois qu'elle a acquis le verrou avec succès.

```js
executeLocked(f) {
  const self = this;

  async function tryGetLock() {
    while (true) {
      const oldValue = Atomics.compareExchange(self.i32a, AsyncLock.INDEX,
                          /* ancienne valeur >>> */  AsyncLock.UNLOCKED,
                          /* nouvelle valeur >>> */  AsyncLock.LOCKED);
      if (oldValue == AsyncLock.UNLOCKED) {
        f();
        self.unlock();
        return;
      }
      const result = Atomics.waitAsync(self.i32a, AsyncLock.INDEX,
                                       AsyncLock.LOCKED);
                                   //  ^ valeur attendue au départ
      await result.value;
    }
  }

  tryGetLock();
}
```

La fonction interne `tryGetLock` essaie d'abord d'obtenir le verrou avec `Atomics.compareExchange`, comme auparavant. Si cela change avec succès l'état du verrou, il peut exécuter le callback, déverrouiller le verrou et retourner.

Si `Atomics.compareExchange` ne parvient pas à obtenir le verrou, nous devons réessayer lorsque le verrou est probablement libre. Nous ne pouvons pas bloquer et attendre que le verrou devienne libre - à la place, nous programmons un nouvel essai en utilisant `Atomics.waitAsync` et la Promesse qu'il renvoie.

Si nous avons réussi à démarrer `Atomics.waitAsync`, la Promesse renvoyée se résout lorsque le thread détenant le verrou fait `Atomics.notify`. Ensuite, le thread qui attendait le verrou essaie d'obtenir à nouveau le verrou, comme auparavant.

Les mêmes cas particuliers (le verrou se libérant entre l'appel de `Atomics.compareExchange` et l'appel de `Atomics.waitAsync`, ainsi que le verrou se réacquérant entre la résolution de la Promesse et l'appel de `Atomics.compareExchange`) sont également possibles dans la version asynchrone, donc le code doit les gérer de manière robuste.

## Conclusion

Dans cet article, nous avons montré comment utiliser les primitives de synchronisation `Atomics.wait`, `Atomics.waitAsync`, et `Atomics.notify`, pour implémenter un mutex utilisable à la fois dans le thread principal et dans les threads de travail.

## Support des fonctionnalités

### `Atomics.wait` et `Atomics.notify`

<feature-support chrome="68"
                 firefox="78"
                 safari="non"
                 nodejs="8.10.0"
                 babel="non"></feature-support>

### `Atomics.waitAsync`

<feature-support chrome="87"
                 firefox="non"
                 safari="non"
                 nodejs="16"
                 babel="non"></feature-support>
