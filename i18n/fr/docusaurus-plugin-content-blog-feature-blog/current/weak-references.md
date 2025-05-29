---
title: &apos;Références faibles et finalisateurs&apos;
author: &apos;Sathya Gunasekaran ([@_gsathya](https://twitter.com/_gsathya)), Mathias Bynens ([@mathias](https://twitter.com/mathias)), Shu-yu Guo ([@_shu](https://twitter.com/_shu)), et Leszek Swirski ([@leszekswirski](https://twitter.com/leszekswirski))&apos;
avatars:
- &apos;sathya-gunasekaran&apos;
- &apos;mathias-bynens&apos;
- &apos;shu-yu-guo&apos;
- &apos;leszek-swirski&apos;
date: 2019-07-09
updated: 2020-06-19
tags:
  - ECMAScript
  - ES2021
  - io19
  - Node.js 14
description: &apos;Les références faibles et les finalisateurs arrivent en JavaScript ! Cet article explique cette nouvelle fonctionnalité.&apos;
tweet: &apos;1148603966848151553&apos;
---
Généralement, les références aux objets sont _fortement conservées_ en JavaScript, ce qui signifie que tant que vous avez une référence à l'objet, il ne sera pas collecté par le garbage collector.

```js
const ref = { x: 42, y: 51 };
// Tant que vous avez accès à `ref` (ou toute autre référence
// au même objet), l'objet ne sera pas collecté par le garbage collector.
```

Actuellement, les `WeakMap` et `WeakSet` sont les seuls moyens de référencer un objet de manière quasi-faible en JavaScript : ajouter un objet en tant que clé à un `WeakMap` ou `WeakSet` ne l'empêche pas d'être collecté par le garbage collector.

```js
const wm = new WeakMap();
{
  const ref = {};
  const metaData = &apos;foo&apos;;
  wm.set(ref, metaData);
  wm.get(ref);
  // → metaData
}
// Nous n'avons plus de référence à `ref` dans ce bloc de portée, donc
// il peut être collecté par le garbage collector, même s'il est une clé
// dans `wm` auquel nous avons encore accès.

<!--truncate-->
const ws = new WeakSet();
{
  const ref = {};
  ws.add(ref);
  ws.has(ref);
  // → true
}
// Nous n'avons plus de référence à `ref` dans ce bloc de portée, donc
// il peut être collecté par le garbage collector, même s'il est une clé
// dans `ws` auquel nous avons encore accès.
```

:::note
**Note :** Vous pouvez considérer `WeakMap.prototype.set(ref, metaData)` comme l'ajout d'une propriété avec la valeur `metaData` à l'objet `ref` : tant que vous avez une référence à l'objet, vous pouvez obtenir les métadonnées. Une fois que vous n'avez plus de référence à l'objet, il peut être collecté par le garbage collector, même si vous avez toujours une référence au `WeakMap` auquel il a été ajouté. De même, vous pouvez considérer un `WeakSet` comme un cas particulier de `WeakMap` où toutes les valeurs sont des booléens.

Un `WeakMap` en JavaScript n'est pas vraiment _faible_ : il réfère _fortement_ à ses contenus tant que la clé est active. Le `WeakMap` ne réfère faiblement à ses contenus que lorsque la clé est collectée par le garbage collector. Un terme plus précis pour ce type de relation est [_éphémère_](https://fr.wikipedia.org/wiki/%C3%89ph%C3%A9m%C3%A8re_(informatique)).
:::

`WeakRef` est une API plus avancée qui fournit de véritables références faibles, offrant une fenêtre sur la durée de vie d'un objet. Parcourons un exemple ensemble.

Dans cet exemple, supposons que nous travaillons sur une application Web de chat qui utilise des sockets Web pour communiquer avec un serveur. Imaginez une classe `MovingAvg` qui, à des fins de diagnostic de performance, conserve un ensemble d'événements provenant d'un socket Web pour calculer une moyenne mobile simple de la latence.

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener(&apos;message&apos;, this.listener);
  }

  compute(n) {
    // Calculer la moyenne mobile simple pour les n derniers événements.
    // …
  }
}
```

Elle est utilisée par une classe `MovingAvgComponent` qui vous permet de contrôler quand commencer et arrêter de surveiller la moyenne mobile simple de la latence.

```js
class MovingAvgComponent {
  constructor(socket) {
    this.socket = socket;
  }

  start() {
    this.movingAvg = new MovingAvg(this.socket);
  }

  stop() {
    // Permet au garbage collector de récupérer la mémoire.
    this.movingAvg = null;
  }

  render() {
    // Effectuer le rendu.
    // …
  }
}
```

Nous savons que conserver tous les messages du serveur dans une instance de `MovingAvg` utilise beaucoup de mémoire, donc nous veillons à annuler `this.movingAvg` lorsque la surveillance est arrêtée afin de permettre au garbage collector de récupérer la mémoire.

Cependant, après avoir vérifié dans le panneau mémoire de DevTools, nous avons constaté que la mémoire n'était pas du tout récupérée ! Le développeur web expérimenté a peut-être déjà repéré le bug : les écouteurs d'événements sont des références fortes et doivent être explicitement supprimés.

Rendons cela explicite avec des diagrammes de portée. Après avoir appelé `start()`, notre graphique d'objets ressemble à ce qui suit, où une flèche solide signifie une référence forte. Tout ce qui est atteignable via des flèches solides depuis l'instance `MovingAvgComponent` ne peut pas être collecté.

![](/_img/weakrefs/after-start.svg)

Après avoir appelé `stop()`, nous avons supprimé la référence forte de l'instance `MovingAvgComponent` à l'instance `MovingAvg`, mais pas via l'écouteur du socket.

![](/_img/weakrefs/after-stop.svg)

Ainsi, l'écouteur dans les instances de `MovingAvg`, en référant à `this`, maintient l'intégralité de l'instance en vie tant que l'écouteur d'événements n'est pas supprimé.

Jusqu'à présent, la solution consiste à désenregistrer manuellement l'écouteur d'événements via une méthode `dispose`.

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener(&apos;message&apos;, this.listener);
  }

  dispose() {
    this.socket.removeEventListener(&apos;message&apos;, this.listener);
  }

  // …
}
```

L'inconvénient de cette approche est qu'il s'agit d'une gestion manuelle de la mémoire. `MovingAvgComponent`, et tous les autres utilisateurs de la classe `MovingAvg`, doivent se souvenir d'appeler `dispose` pour éviter des fuites de mémoire. Ce qui est pire, c'est que la gestion manuelle de la mémoire est en cascade : les utilisateurs de `MovingAvgComponent` doivent se souvenir d'appeler `stop` pour éviter des fuites de mémoire, et ainsi de suite. Le comportement de l'application ne dépend pas de l'écouteur d'événements de cette classe de diagnostic, et l'écouteur est coûteux en termes d'utilisation de mémoire mais pas en termes de calcul. Ce que nous voulons vraiment, c'est que la durée de vie de l'écouteur soit logiquement liée à l'instance de `MovingAvg`, afin que `MovingAvg` puisse être utilisé comme tout autre objet JavaScript dont la mémoire est automatiquement récupérée par le ramasse-miettes.

`WeakRef` permet de résoudre le dilemme en créant une _référence faible_ à l'écouteur d'événements réel, puis en enveloppant ce `WeakRef` dans un autre écouteur d'événements. De cette manière, le ramasse-miettes peut nettoyer l'écouteur d'événements réel et la mémoire qu'il maintient active, comme l'instance de `MovingAvg` et son tableau `events`.

```js
function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener);
  const wrapper = (ev) => { weakRef.deref()?.(ev); };
  socket.addEventListener(&apos;message&apos;, wrapper);
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); };
    addWeakListener(socket, this.listener);
  }
}
```

:::note
**Remarque :** Les `WeakRef` pour les fonctions doivent être manipulés avec prudence. Les fonctions JavaScript sont des [closures](https://en.wikipedia.org/wiki/Closure_(computer_programming)) et référencent fortement les environnements externes qui contiennent les valeurs des variables libres référencées à l'intérieur des fonctions. Ces environnements externes peuvent contenir des variables que _d'autres_ closures référencent également. Autrement dit, lorsqu'on travaille avec des closures, leur mémoire est souvent fortement référencée par d'autres closures de manière subtile. C'est pourquoi `addWeakListener` est une fonction distincte et `wrapper` n'est pas local au constructeur de `MovingAvg`. Dans V8, si `wrapper` était local au constructeur de `MovingAvg` et partageait le même champ lexical que l'écouteur enveloppé dans le `WeakRef`, l'instance `MovingAvg` et toutes ses propriétés deviendraient accessibles via l'environnement partagé de l'écouteur enveloppé, ce qui rendrait l'instance impossible à collecter. Gardez cela à l'esprit lors de l'écriture du code.
:::

Nous créons d'abord l'écouteur d'événements et l'assignons à `this.listener`, de sorte qu'il soit fortement référencé par l'instance `MovingAvg`. En d'autres termes, tant que l'instance `MovingAvg` est vivante, l'écouteur d'événements l'est aussi.

Ensuite, dans `addWeakListener`, nous créons un `WeakRef` dont la _cible_ est l'écouteur d'événements réel. À l'intérieur de `wrapper`, nous utilisons `deref` pour l'obtenir. Étant donné que les `WeakRef` ne préviennent pas la collecte des cibles si ces dernières n'ont pas d'autres références fortes, nous devons les déréférencer manuellement pour obtenir la cible. Si la cible a été récupérée par le ramasse-miettes entre-temps, `deref` retourne `undefined`. Sinon, la cible originale est retournée, qui est la fonction `listener` que nous appelons ensuite via le [chaînage optionnel](/features/optional-chaining).

Étant donné que l'écouteur d'événements est enveloppé dans un `WeakRef`, la _seule_ référence forte qui lui est associée est la propriété `listener` sur l'instance `MovingAvg`. Autrement dit, nous avons réussi à lier la durée de vie de l'écouteur d'événements à celle de l'instance `MovingAvg`.

Revenons aux diagrammes de portée : notre graphe d'objets ressemble à ce qui suit après avoir appelé `start()` avec l'implémentation `WeakRef`, où une flèche en pointillés représente une référence faible.

![](/_img/weakrefs/weak-after-start.svg)

Après avoir appelé `stop()`, nous avons supprimé la seule référence forte à l'écouteur :

![](/_img/weakrefs/weak-after-stop.svg)

Finalement, après une collecte de la mémoire par le ramasse-miettes, l'instance `MovingAvg` et l'écouteur seront également collectés :

![](/_img/weakrefs/weak-after-gc.svg)

Mais il reste encore un problème ici : nous avons ajouté un niveau d'indirection à `listener` en l'enveloppant dans un `WeakRef`, mais le wrapper dans `addWeakListener` fuit toujours pour la même raison que `listener` fuyait à l'origine. Certes, cela représente une fuite plus petite puisque seul le wrapper fuit au lieu de l'ensemble de l'instance `MovingAvg`, mais cela reste une fuite. La solution à cela est la fonctionnalité associée à `WeakRef`, `FinalizationRegistry`. Avec la nouvelle API `FinalizationRegistry`, nous pouvons enregistrer un rappel à exécuter lorsque le ramasse-miettes efface un objet enregistré. Ces rappels sont appelés _finaliseurs_.

:::note
**Remarque :** Le rappel de finalisation ne s'exécute pas immédiatement après la collecte des déchets de l'écouteur d'événements. Par conséquent, ne l'utilisez pas pour des logiques ou des métriques importantes. Le moment de la collecte des déchets et des rappels de finalisation n'est pas précisé. En fait, un moteur qui ne collecte jamais les déchets serait entièrement conforme. Cependant, il est sûr de supposer que les moteurs _feront_ la collecte des déchets et que les rappels de finalisation seront appelés ultérieurement, sauf si l'environnement est abandonné (comme la fermeture de l'onglet ou la terminaison du travailleur). Gardez cette incertitude à l'esprit lorsque vous écrivez du code.
:::

Nous pouvons enregistrer un rappel avec un `FinalizationRegistry` pour supprimer `wrapper` du socket lorsque l'écouteur d'événements interne est collecté comme déchet. Notre implémentation finale ressemble à ceci :

```js
const gListenersRegistry = new FinalizationRegistry(({ socket, wrapper }) => {
  socket.removeEventListener(&apos;message&apos;, wrapper); // 6
});

function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener); // 2
  const wrapper = (ev) => { weakRef.deref()?.(ev); }; // 3
  gListenersRegistry.register(listener, { socket, wrapper }); // 4
  socket.addEventListener(&apos;message&apos;, wrapper); // 5
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); }; // 1
    addWeakListener(socket, this.listener);
  }
}
```

:::note
**Remarque :** `gListenersRegistry` est une variable globale pour assurer l'exécution des finalisateurs. Un `FinalizationRegistry` n'est pas maintenu en vie par les objets qui sont enregistrés dessus. Si un registre est lui-même collecté comme déchet, son finalisateur peut ne pas s'exécuter.
:::

Nous créons un écouteur d'événements et le mettons dans `this.listener` afin qu'il soit fortement référencé par l'instance de `MovingAvg` (1). Nous enveloppons ensuite l'écouteur d'événements qui effectue le travail dans un `WeakRef` pour le rendre collectable comme déchet, et pour ne pas faire fuiter sa référence à l'instance de `MovingAvg` via `this` (2). Nous faisons un wrapper qui fait un `deref` du `WeakRef` pour vérifier s'il est toujours vivant, puis l'appelle si c'est le cas (3). Nous enregistrons l'écouteur interne dans le `FinalizationRegistry`, en passant une _valeur de maintien_ `{ socket, wrapper }` à l'enregistrement (4). Nous ajoutons ensuite le wrapper retourné comme écouteur d'événements sur `socket` (5). Un certain temps après que l'instance de `MovingAvg` et l'écouteur interne sont collectés comme déchets, le finalisateur peut s'exécuter, avec la valeur de maintien qui lui est transmise. À l'intérieur du finalisateur, nous supprimons également le wrapper, rendant toute la mémoire associée à l'utilisation d'une instance de `MovingAvg` collectable comme déchet (6).

Avec tout cela, notre implémentation originale de `MovingAvgComponent` ne fuit ni mémoire ni n'exige de disposition manuelle.

## Ne pas en abuser

Après avoir entendu parler de ces nouvelles capacités, il peut être tentant de `WeakRef` Tout™. Cependant, ce n'est probablement pas une bonne idée. Certaines choses _ne sont pas_ de bons cas d'utilisation pour les `WeakRefs` et les finalisateurs.

En général, évitez d'écrire du code qui dépend du fait que le ramasse-miettes nettoie un `WeakRef` ou appelle un finalisateur à un moment prévisible — [ce n'est pas possible](https://github.com/tc39/proposal-weakrefs#a-note-of-caution) ! De plus, savoir si un objet est collectable comme déchet peut dépendre des détails d'implémentation, tels que la représentation des fermetures, qui sont à la fois subtiles et peuvent différer selon les moteurs JavaScript et même entre différentes versions du même moteur. En particulier, les rappels de finalisateurs :

- Pourraient ne pas se produire immédiatement après la collecte des déchets.
- Pourraient ne pas se produire dans le même ordre que la collecte des déchets réelle.
- Pourraient ne pas se produire du tout, par exemple, si la fenêtre du navigateur est fermée.

Ainsi, ne placez pas de logique importante dans le chemin de code d'un finalisateur. Ils sont utiles pour effectuer un nettoyage en réponse à la collecte des déchets, mais vous ne pouvez pas les utiliser de manière fiable pour, par exemple, enregistrer des métriques significatives sur l'utilisation de la mémoire. Pour ce cas d'utilisation, consultez [`performance.measureUserAgentSpecificMemory`](https://web.dev/monitor-total-page-memory-usage/).

Les `WeakRefs` et les finalisateurs peuvent vous aider à économiser de la mémoire et fonctionnent mieux lorsqu'ils sont utilisés avec parcimonie comme moyen d'amélioration progressive. Étant donné que ce sont des fonctionnalités destinées aux utilisateurs expérimentés, nous prévoyons que la plupart des utilisations se feront dans des frameworks ou bibliothèques.

## Support des `WeakRefs`

<feature-support chrome="74 https://v8.dev/blog/v8-release-84#weak-references-and-finalizers"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1561074"
                 safari="non"
                 nodejs="14.6.0"
                 babel="non"></feature-support>
