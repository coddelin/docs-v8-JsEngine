---
title: "Des fonctions asynchrones et des promesses plus rapides"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), anticipatrice toujours en attente, et Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), garant professionnel de performance"
avatars:
  - "maya-armyanova"
  - "benedikt-meurer"
date: 2018-11-12 16:45:07
tags:
  - ECMAScript
  - benchmarks
  - présentations
description: "Des fonctions asynchrones plus rapides et plus faciles à déboguer, ainsi que des promesses, arrivent avec V8 v7.2 / Chrome 72."
tweet: "1062000102909169670"
---
Le traitement asynchrone en JavaScript avait traditionnellement la réputation de ne pas être particulièrement rapide. Pour aggraver les choses, le débogage d'applications JavaScript en direct — en particulier des serveurs Node.js — n'est pas chose aisée, _surtout_ lorsqu'il s'agit de programmation asynchrone. Heureusement, les temps changent. Cet article explore comment nous avons optimisé les fonctions asynchrones et les promesses dans V8 (et dans une certaine mesure dans d'autres moteurs JavaScript également), et décrit comment nous avons amélioré l'expérience de débogage de code asynchrone.

<!--truncate-->
:::note
**Note :** Si vous préférez regarder une présentation plutôt que lire des articles, profitez de la vidéo ci-dessous ! Sinon, ignorez la vidéo et continuez à lire.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/DFP5DKDQfOc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

## Une nouvelle approche de la programmation asynchrone

### Des callbacks aux promesses, puis aux fonctions asynchrones

Avant que les promesses ne fassent partie du langage JavaScript, les API basées sur des callbacks étaient couramment utilisées pour le code asynchrone, en particulier dans Node.js. Voici un exemple :

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

Le modèle spécifique qui consiste à utiliser des callbacks profondément imbriqués de cette manière est communément appelé _« l'enfer des callbacks »_, car il rend le code moins lisible et difficile à maintenir.

Heureusement, maintenant que les promesses font partie du langage JavaScript, le même code peut être écrit de manière plus élégante et facile à maintenir :

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

Plus récemment encore, JavaScript a introduit la prise en charge des [fonctions asynchrones](https://web.dev/articles/async-functions). Le code asynchrone ci-dessus peut désormais être écrit d'une manière qui ressemble beaucoup au code synchrone :

```js
async function handler() {
  await validateParams();
  const dbResults = await dbQuery();
  const results = await serviceCall(dbResults);
  console.log(results);
  return results;
}
```

Avec les fonctions asynchrones, le code devient plus succinct, et le flux de contrôle et de données est beaucoup plus facile à suivre, malgré le fait que l'exécution reste asynchrone. (Notez que l'exécution de JavaScript se fait toujours dans un seul thread, ce qui signifie que les fonctions asynchrones n'entraînent pas la création de threads physiques.)

### Des callbacks d’écouteurs d’événements à l’itération asynchrone

Un autre paradigme asynchrone, particulièrement fréquent dans Node.js, est celui des [`ReadableStream`s](https://nodejs.org/api/stream.html#stream_readable_streams). Voici un exemple :

```js
const http = require('http');

http.createServer((req, res) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    res.write(body);
    res.end();
  });
}).listen(1337);
```

Ce code peut être un peu difficile à suivre : les données entrantes sont traitées par morceaux accessibles uniquement au sein des callbacks, et le signal de fin de flux se produit également dans un callback. Il est facile d’introduire des bugs ici quand on ne réalise pas que la fonction se termine immédiatement et que le traitement réel doit se dérouler dans les callbacks.

Heureusement, une fonctionnalité ES2018 innovante appelée [itération asynchrone](http://2ality.com/2016/10/asynchronous-iteration.html) peut simplifier ce code :

```js
const http = require('http');

http.createServer(async (req, res) => {
  try {
    let body = '';
    req.setEncoding('utf8');
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

Au lieu de placer la logique de traitement des requêtes dans deux callbacks différents — celui de `'data'` et celui de `'end'` — nous pouvons désormais tout insérer dans une seule fonction asynchrone, et utiliser la nouvelle boucle `for await…of` pour itérer à travers les morceaux de manière asynchrone. Nous avons également ajouté un bloc `try-catch` pour éviter le problème de `unhandledRejection`[^1].

[^1]: Merci à [Matteo Collina](https://twitter.com/matteocollina) de nous avoir signalé [ce problème](https://github.com/mcollina/make-promises-safe/blob/master/README.md#the-unhandledrejection-problem).

Vous pouvez déjà utiliser ces nouvelles fonctionnalités en production dès aujourd'hui ! Les fonctions asynchrones sont **entièrement prises en charge à partir de Node.js 8 (V8 v6.2 / Chrome 62)**, et les itérateurs et générateurs asynchrones sont **entièrement pris en charge à partir de Node.js 10 (V8 v6.8 / Chrome 68)** !

## Améliorations de performances asynchrones

Nous avons réussi à améliorer significativement les performances du code asynchrone entre V8 v5.5 (Chrome 55 & Node.js 7) et V8 v6.8 (Chrome 68 & Node.js 10). Nous avons atteint un niveau de performance où les développeurs peuvent utiliser ces nouveaux paradigmes de programmation en toute confiance sans se soucier de la vitesse.

![](/_img/fast-async/doxbee-benchmark.svg)

Le graphique ci-dessus montre le [benchmark doxbee](https://github.com/v8/promise-performance-tests/blob/master/lib/doxbee-async.js), qui mesure les performances du code fortement dépendant des promesses. Notez que les graphiques visualisent le temps d'exécution, c'est-à-dire que plus c'est bas, mieux c'est.

Les résultats sur le [benchmark parallèle](https://github.com/v8/promise-performance-tests/blob/master/lib/parallel-async.js), qui évalue spécifiquement les performances de [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all), sont encore plus impressionnants :

![](/_img/fast-async/parallel-benchmark.svg)

Nous avons réussi à améliorer les performances de `Promise.all` par un facteur de **8×**.

Cependant, les benchmarks ci-dessus sont des micro-benchmarks synthétiques. L'équipe V8 est plus intéressée par l'impact de nos optimisations sur les [performances réelles du code utilisateur](/blog/real-world-performance).

![](/_img/fast-async/http-benchmarks.svg)

Le graphique ci-dessus visualise les performances de certains frameworks middleware HTTP populaires qui utilisent abondamment les promesses et les fonctions `async`. Notez que ce graphique montre le nombre de requêtes/seconde, donc contrairement aux graphiques précédents, plus c'est haut, mieux c'est. Les performances de ces frameworks ont considérablement augmenté entre Node.js 7 (V8 v5.5) et Node.js 10 (V8 v6.8).

Ces améliorations de performances sont le résultat de trois réalisations clés :

- [TurboFan](/docs/turbofan), le nouveau compilateur d'optimisation 🎉
- [Orinoco](/blog/orinoco), le nouveau ramasse-miettes 🚛
- un bug dans Node.js 8 provoquant le saut des microticks par `await` 🐛

Lorsque nous avons [lancé TurboFan](/blog/launching-ignition-and-turbofan) dans [Node.js 8](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367), cela a donné un énorme coup de boost aux performances.

Nous avons également travaillé sur un nouveau ramasse-miettes, appelé Orinoco, qui déplace le travail de collecte des déchets hors du thread principal, améliorant ainsi considérablement le traitement des requêtes.

Et enfin, il y avait un bug pratique dans Node.js 8 qui faisait que `await` sautait les microticks dans certains cas, entraînant de meilleures performances. Ce bug a commencé comme une violation involontaire de la spécification, mais il nous a ensuite donné l'idée d'une optimisation. Commençons par expliquer le comportement buggué :

:::note
**Note :** Le comportement suivant était correct selon la spécification JavaScript au moment de l'écriture. Depuis, notre proposition de spécification a été acceptée, et le comportement "buggué" suivant est maintenant correct.
:::

```js
const p = Promise.resolve();

(async () => {
  await p; console.log('après:await');
})();

p.then(() => console.log('tick:a'))
 .then(() => console.log('tick:b'));
```

Le programme ci-dessus crée une promesse `p` remplie, et `await` son résultat, mais aussi enchaîne deux gestionnaires dessus. Dans quel ordre vous attendriez-vous à ce que les appels `console.log` s'exécutent ?

Étant donné que `p` est remplie, vous pourriez vous attendre à ce qu'il imprime `'après:await'` en premier, puis les `'tick'`. En fait, c'est le comportement que vous obtiendriez dans Node.js 8 :

![Le bug `await` dans Node.js 8](/_img/fast-async/await-bug-node-8.svg)

Bien que ce comportement semble intuitif, il n'est pas correct selon la spécification. Node.js 10 implémente le comportement correct, qui consiste à exécuter d'abord les gestionnaires enchaînés, puis seulement ensuite à continuer avec la fonction asynchrone.

![Node.js 10 n'a plus le bug `await`](/_img/fast-async/await-bug-node-10.svg)

Ce _« comportement correct »_ n'est pas toujours immédiatement évident, et était en fait surprenant pour les développeurs JavaScript, donc cela mérite quelques explications. Avant de plonger dans le monde magique des promesses et fonctions asynchrones, commençons par quelques fondations.

### Tâches vs micro-tâches

À un niveau élevé, il y a _tâches_ et _micro-tâches_ en JavaScript. Les tâches gèrent des événements comme les E/S et les temporisateurs, et s'exécutent une par une. Les micro-tâches implémentent une exécution différée pour `async`/`await` et les promesses, et s'exécutent à la fin de chaque tâche. La file de micro-tâches est toujours vidée avant que l'exécution ne retourne au boucle d'événements.

![La différence entre micro-tâches et tâches](/_img/fast-async/microtasks-vs-tasks.svg)

Pour plus de détails, consultez l'explication de Jake Archibald sur [les tâches, micro-tâches, files d'attente et plannings dans le navigateur](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/). Le modèle des tâches dans Node.js est très similaire.

### Fonctions asynchrones

Selon MDN, une fonction asynchrone est une fonction qui s'exécute de manière asynchrone en utilisant une promesse implicite pour retourner son résultat. Les fonctions asynchrones sont destinées à rendre le code asynchrone semblable à du code synchrone, en cachant une partie de la complexité du traitement asynchrone au développeur.

La fonction asynchrone la plus simple possible ressemble à ceci :

```js
async function computeAnswer() {
  return 42;
}
```

Lorsqu'elle est appelée, elle retourne une promesse, et vous pouvez accéder à sa valeur comme avec toute autre promesse.

```js
const p = computeAnswer();
// → Promesse

p.then(console.log);
// imprime 42 au tour suivant
```

Vous accédez à la valeur de cette promesse `p` uniquement lors du prochain passage de micro-tâches. En d'autres termes, le programme ci-dessus est sémantiquement équivalent à l'utilisation de `Promise.resolve` avec la valeur :

```js
function computeAnswer() {
  return Promise.resolve(42);
}
```

La véritable puissance des fonctions asynchrones provient des expressions `await`, qui provoquent la suspension de l'exécution de la fonction jusqu'à ce qu'une promesse soit résolue, et la reprise après son accomplissement. La valeur d'`await` est celle de la promesse accomplie. Voici un exemple montrant ce que cela signifie :

```js
async function fetchStatus(url) {
  const response = await fetch(url);
  return response.status;
}
```

L'exécution de `fetchStatus` est suspendue sur l'`await`, et reprend plus tard lorsque la promesse `fetch` est accomplie. Cela est à peu près équivalent à enchaîner un gestionnaire sur la promesse retournée par `fetch`.

```js
function fetchStatus(url) {
  return fetch(url).then(response => response.status);
}
```

Ce gestionnaire contient le code suivant l'`await` dans la fonction asynchrone.

Normalement, vous passeriez une `Promesse` à `await`, mais vous pouvez en fait attendre n'importe quelle valeur JavaScript arbitraire. Si la valeur de l'expression suivant l'`await` n'est pas une promesse, elle est convertie en promesse. Cela signifie que vous pouvez `await 42` si cela vous tente :

```js
async function foo() {
  const v = await 42;
  return v;
}

const p = foo();
// → Promesse

p.then(console.log);
// imprime `42` finalement
```

Plus intéressant encore, `await` fonctionne avec tout élément [« thenable »](https://promisesaplus.com/), c'est-à-dire tout objet possédant une méthode `then`, même s'il ne s'agit pas d'une vraie promesse. Vous pouvez donc implémenter des choses amusantes comme un sommeil asynchrone qui mesure le temps réel passé à dormir :

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

Voyons ce que V8 fait pour `await` sous le capot, en suivant la [spécification](https://tc39.es/ecma262/#await). Voici une fonction asynchrone simple `foo` :

```js
async function foo(v) {
  const w = await v;
  return w;
}
```

Lorsqu'elle est appelée, elle enveloppe le paramètre `v` dans une promesse et suspend l'exécution de la fonction asynchrone jusqu'à ce que cette promesse soit résolue. Une fois cela accompli, l'exécution de la fonction reprend et `w` reçoit la valeur de la promesse accomplie. Cette valeur est ensuite renvoyée par la fonction asynchrone.

### `await` sous le capot

Tout d'abord, V8 marque cette fonction comme _résumable_, ce qui signifie que l'exécution peut être suspendue et reprise plus tard (aux points `await`). Ensuite, elle crée la soi-disant `implicit_promise`, qui est la promesse retournée lorsque vous invoquez la fonction asynchrone, et qui finit par se résoudre à la valeur produite par la fonction asynchrone.

![Comparaison entre une fonction asynchrone simple et ce que le moteur en fait](/_img/fast-async/await-under-the-hood.svg)

Ensuite vient la partie intéressante : le `await` proprement dit. Tout d'abord, la valeur passée à `await` est enveloppée dans une promesse. Ensuite, des gestionnaires sont attachés à cette promesse enveloppée pour reprendre la fonction une fois la promesse accomplie, et l'exécution de la fonction asynchrone est suspendue, retournant la `implicit_promise` à l'appelant. Une fois que la `promesse` est accomplie, l'exécution de la fonction asynchrone reprend avec la valeur `w` obtenue à partir de cette `promesse`, et la `implicit_promise` est résolue avec `w`.

En résumé, les étapes initiales pour `await v` sont :

1. Envelopper `v` — la valeur passée à `await` — dans une promesse.
2. Attacher des gestionnaires pour reprendre la fonction asynchrone plus tard.
3. Suspendre la fonction asynchrone et retourner la `implicit_promise` à l'appelant.

Parcourons les opérations individuelles étape par étape. Supposons que l'élément sur lequel on `await` est déjà une promesse, qui a été accomplie avec la valeur `42`. Ensuite, le moteur crée une nouvelle `promesse` et la résout avec ce qui est `await`. Cela fait un chaînage différé de ces promesses au tour suivant, exprimé via ce que la spécification appelle un [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob).

![](/_img/fast-async/await-step-1.svg)

Ensuite, le moteur crée une autre promesse dite `jetable`. Elle est appelée *jetable* car rien ne lui est jamais enchaîné — elle est entièrement interne au moteur. Cette promesse `jetable` est ensuite enchaînée à la `promesse`, avec les gestionnaires appropriés pour reprendre l'exécution de la fonction asynchrone. Cette opération `performPromiseThen` est essentiellement ce que fait [`Promise.prototype.then()`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globales/Promise/then) en coulisses. Enfin, l'exécution de la fonction asynchrone est suspendue et le contrôle retourne à l'appelant.

![](/_img/fast-async/await-step-2.svg)

L'exécution continue chez l'appelant, et finalement la pile d'appels devient vide. Ensuite, le moteur JavaScript commence à exécuter les micro-tâches : il exécute le [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob) précédemment planifié, qui planifie un nouveau [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) pour enchaîner la `promesse` à la valeur passée à `await`. Le moteur retourne ensuite au traitement de la file de micro-tâches, car celle-ci doit être vidée avant de continuer avec la boucle d'événements principale.

![](/_img/fast-async/await-step-3.svg)

Ensuite, voici le [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob), qui remplit la `promesse` avec la valeur de la promesse que nous `attendons` — `42` dans ce cas — et planifie la réaction sur la promesse `jetable`. Le moteur revient alors à la boucle des micro-tâches, qui contient une dernière micro-tâche à traiter.

![](/_img/fast-async/await-step-4-final.svg)

Maintenant, ce second [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) propage la résolution à la promesse `jetable` et reprend l'exécution suspendue de la fonction asynchrone, en renvoyant la valeur `42` à partir du `await`.

![Résumé de la surcharge de `await`](/_img/fast-async/await-overhead.svg)

Pour résumer ce que nous avons appris, pour chaque `await`, le moteur doit créer **deux promesses supplémentaires** (même si le côté droit est déjà une promesse) et il nécessite **au moins trois** ticks de la file des micro-tâches. Qui aurait pensé qu'une seule expression `await` entraînerait _autant de surcharge_ ?!

![](/_img/fast-async/await-code-before.svg)

Regardons d'où vient cette surcharge. La première ligne est responsable de la création de la promesse enveloppée. La seconde ligne résout immédiatement cette promesse enveloppée avec la valeur `v` attendue. Ces deux lignes sont responsables d'une promesse supplémentaire et de deux des trois ticks des micro-tâches. Cela devient assez coûteux si `v` est déjà une promesse (ce qui est le cas le plus courant car les applications attendent normalement des promesses). Dans le cas improbable où un développeur attend par exemple `42`, le moteur doit néanmoins l'envelopper dans une promesse.

Il s'avère qu'il existe déjà une opération [`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve) dans la spécification qui effectue uniquement le processus d'enveloppement si nécessaire :

![](/_img/fast-async/await-code-comparison.svg)

Cette opération retourne les promesses inchangées et ne fait l'enveloppement des autres valeurs en promesses que si nécessaire. De cette manière, vous économisez une des promesses supplémentaires ainsi que deux ticks dans la file des micro-tâches, dans le cas courant où la valeur passée à `await` est déjà une promesse. Ce nouveau comportement est déjà [activé par défaut dans V8 v7.2](/blog/v8-release-72#async%2Fawait). Pour V8 v7.1, le nouveau comportement peut être activé à l'aide du flag `--harmony-await-optimization`. Nous avons [proposé ce changement à la spécification ECMAScript](https://github.com/tc39/ecma262/pull/1250) également.

Voici comment le `await` amélioré fonctionne en coulisses, étape par étape :

![](/_img/fast-async/await-new-step-1.svg)

Supposons à nouveau que nous attendons une promesse qui a été remplie avec `42`. Grâce à la magie de [`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve), la `promesse` fait maintenant simplement référence à la même promesse `v`, donc rien n'est à faire dans cette étape. Ensuite, le moteur continue exactement comme avant, en créant la promesse `jetable`, en planifiant un [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) pour reprendre la fonction asynchrone au tick suivant de la file des micro-tâches, en suspendant l'exécution de la fonction et en retournant à l'appelant.

![](/_img/fast-async/await-new-step-2.svg)

Ensuite, lorsque toutes les exécutions JavaScript sont terminées, le moteur commence à exécuter les micro-tâches et donc exécute le [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob). Ce travail propage la résolution de la `promesse` à la `jetable` et reprend l'exécution de la fonction asynchrone, renvoyant `42` depuis le `await`.

![Résumé de la réduction de la surcharge de `await`](/_img/fast-async/await-overhead-removed.svg)

Cette optimisation évite d'avoir à créer une promesse enveloppée si la valeur passée à `await` est déjà une promesse, et dans ce cas, nous passons d'un minimum de **trois** ticks de micro-tâches à seulement **un** tick. Ce comportement est similaire à ce que fait Node.js 8, sauf que ce n'est plus un bug — c'est maintenant une optimisation qui est en cours de standardisation !

Il semble néanmoins toujours désagréable que le moteur doive créer cette promesse `jetable`, bien qu'elle soit totalement interne au moteur. Il s'avère que la promesse `jetable` n'était là que pour satisfaire les contraintes API de l'opération interne `performPromiseThen` dans la spécification.

![](/_img/fast-async/await-optimized.svg)

Cela a été récemment abordé dans un [changement éditorial](https://github.com/tc39/ecma262/issues/694) de la spécification ECMAScript. Les moteurs n'ont plus besoin de créer la promesse `jetable` pour `await` — la plupart du temps[^2].

[^2]: V8 doit toujours créer la promesse `jetable` si [`async_hooks`](https://nodejs.org/api/async_hooks.html) sont utilisés dans Node.js, car les hooks `before` et `after` sont exécutés dans le _contexte_ de la promesse `jetable`.

![Comparaison du code `await` avant et après les optimisations](/_img/fast-async/node-10-vs-node-12.svg)

La comparaison de `await` dans Node.js 10 avec le `await` optimisé qui sera probablement intégré dans Node.js 12 montre l'impact de cette modification sur les performances :

![](/_img/fast-async/benchmark-optimization.svg)

**`async`/`await` surpasse désormais le code de promesse écrit à la main**. L'élément clé ici est que nous avons considérablement réduit les frais généraux des fonctions asynchrones — non seulement dans V8, mais également dans tous les moteurs JavaScript, en corrigeant la spécification.

**Mise à jour :** À partir de V8 v7.2 et Chrome 72, `--harmony-await-optimization` est activé par défaut. [Le correctif](https://github.com/tc39/ecma262/pull/1250) de la spécification ECMAScript a été intégré.

## Expérience développeur améliorée

Outre les performances, les développeurs JavaScript se soucient également de la capacité à diagnostiquer et à résoudre les problèmes, ce qui n'est pas toujours facile lorsqu'il s'agit de code asynchrone. [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools) prend en charge les *traces de pile asynchrones*, c'est-à-dire des traces de pile qui incluent non seulement la partie synchronisée actuelle de la pile, mais également la partie asynchrone :

![](/_img/fast-async/devtools.png)

Il s'agit d'une fonctionnalité extrêmement utile lors du développement local. Cependant, cette approche ne vous aide pas vraiment une fois que l'application est déployée. Lors du débogage post-mortem, vous ne verrez que la sortie `Error#stack` dans vos fichiers journaux, et cela ne vous dit rien sur les parties asynchrones.

Nous avons récemment travaillé sur [*les traces de pile asynchrones sans frais*](https://bit.ly/v8-zero-cost-async-stack-traces) qui enrichissent la propriété `Error#stack` avec des appels de fonction asynchrone. « Sans frais » semble excitant, non ? Comment cela peut-il être sans frais, alors que la fonctionnalité de Chrome DevTools entraîne des frais généraux importants ? Prenez cet exemple où `foo` appelle `bar` de manière asynchrone, et `bar` lève une exception après avoir `await` une promesse :

```js
async function foo() {
  await bar();
  return 42;
}

async function bar() {
  await Promise.resolve();
  throw new Error('BEEP BEEP');
}

foo().catch(error => console.log(error.stack));
```

L'exécution de ce code dans Node.js 8 ou Node.js 10 donne le résultat suivant :

```text/2
$ node index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
```

Notez que bien que l'appel à `foo()` cause l'erreur, `foo` ne fait pas du tout partie de la trace de pile. Cela rend difficile pour les développeurs JavaScript de réaliser un débogage post-mortem, que votre code soit déployé dans une application web ou dans un conteneur cloud.

Le point intéressant ici est que le moteur sait où il doit continuer lorsque `bar` est terminé : juste après le `await` dans la fonction `foo`. Par coïncidence, c'est également l'endroit où la fonction `foo` a été suspendue. Le moteur peut utiliser cette information pour reconstruire des parties de la trace de pile asynchrone, à savoir les emplacements de `await`. Avec cette modification, la sortie devient :

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

Dans la trace de pile, la fonction la plus haute dans la hiérarchie apparaît en premier, suivie du reste de la trace de pile synchronisée, suivie de l'appel asynchrone à `bar` dans la fonction `foo`. Ce changement est implémenté dans V8 derrière le nouveau drapeau `--async-stack-traces`. **Mise à jour** : À partir de V8 v7.3, `--async-stack-traces` est activé par défaut.

Cependant, si vous comparez cela à la trace de pile asynchrone dans Chrome DevTools ci-dessus, vous remarquerez que le point d'appel réel vers `foo` est absent de la partie asynchrone de la trace de pile. Comme mentionné précédemment, cette approche utilise le fait que pour `await`, les emplacements de reprise et de suspension sont les mêmes — mais pour les appels réguliers [`Promise#then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) ou [`Promise#catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch), ce n'est pas le cas. Pour plus de contexte, voir l'explication de Mathias Bynens sur [pourquoi `await` dépasse `Promise#then()`](https://mathiasbynens.be/notes/async-stack-traces).

## Conclusion

Nous avons rendu les fonctions asynchrones plus rapides grâce à deux optimisations significatives :

- la suppression de deux microticks supplémentaires, et
- la suppression de la promesse `throwaway`.

En plus de cela, nous avons amélioré l'expérience des développeurs grâce à [*des traces de pile asynchrones à coût nul*](https://bit.ly/v8-zero-cost-async-stack-traces), qui fonctionnent avec `await` dans les fonctions asynchrones et `Promise.all()`.

Et nous avons aussi quelques conseils intéressants sur les performances pour les développeurs JavaScript :

- privilégiez les fonctions `async` et `await` par rapport au code de promesse écrit manuellement, et
- restez fidèle à l'implémentation native des promesses offerte par le moteur JavaScript pour profiter des raccourcis, c'est-à-dire éviter deux microticks pour `await`.
