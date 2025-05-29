---
title: &apos;Initialisation plus rapide des instances avec les nouvelles fonctionnalités des classes&apos;
author: &apos;[Joyee Cheung](https://twitter.com/JoyeeCheung), initialisateur d&apos;instances&apos;
avatars:
  - &apos;joyee-cheung&apos;
date: 2022-04-20
tags:
  - internes
description: &apos;L&apos;initialisation des instances avec les nouvelles fonctionnalités des classes est devenue plus rapide depuis V8 v9.7.&apos;
tweet: &apos;1517041137378373632&apos;
---

Les champs de classe ont été introduits dans V8 à partir de la version v7.2 et les méthodes privées de classe depuis la version v8.4. Après que les propositions ont atteint le stade 4 en 2021, des travaux ont commencé pour améliorer le support des nouvelles fonctionnalités des classes dans V8 - jusque-là, deux problèmes principaux affectaient leur adoption :

<!--truncate-->
1. L&apos;initialisation des champs de classe et des méthodes privées était beaucoup plus lente que l&apos;attribution des propriétés ordinaires.
2. Les initialisateurs de champs de classe étaient défaillants dans les [snapshots de démarrage](https://v8.dev/blog/custom-startup-snapshots) utilisés par des intégrateurs comme Node.js et Deno pour accélérer leur démarrage ou celui des applications utilisateur.

Le premier problème a été résolu dans V8 v9.7 et la solution au deuxième problème a été publiée dans V8 v10.0. Cet article traite de la manière dont le premier problème a été résolu. Pour en savoir plus sur la résolution du problème de snapshot, consultez [cet article](https://joyeecheung.github.io/blog/2022/04/14/fixing-snapshot-support-of-class-fields-in-v8/).

## Optimisation des champs de classe

Pour éliminer l&apos;écart de performance entre l&apos;attribution des propriétés ordinaires et l&apos;initialisation des champs de classe, nous avons mis à jour le système existant de [mise en cache en ligne (IC)](https://mathiasbynens.be/notes/shapes-ics) pour fonctionner également avec les champs de classe. Avant v9.7, V8 utilisait toujours un appel coûteux au runtime pour initialiser les champs de classe. Avec v9.7, lorsque V8 considère que le modèle d&apos;initialisation est suffisamment prévisible, il utilise un nouvel IC pour accélérer l&apos;opération, comme il le fait pour l&apos;attribution des propriétés ordinaires.

![Performance des initialisations, optimisée](/_img/faster-class-features/class-fields-performance-optimized.svg)

![Performance des initialisations, interprétée](/_img/faster-class-features/class-fields-performance-interpreted.svg)

### L&apos;implémentation originale des champs de classe

Pour implémenter les champs privés, V8 utilise des symboles privés internes - il s&apos;agit d&apos;une structure de données interne à V8 similaire aux `Symbol` standards, sauf qu&apos;ils ne sont pas énumérables lorsqu&apos;ils sont utilisés comme clé de propriété. Prenons cet exemple de classe :


```js
class A {
  #a = 0;
  b = this.#a;
}
```

V8 collecterait les initialisateurs des champs de classe (`#a = 0` et `b = this.#a`) et générerait une fonction membre d&apos;instance synthétique avec les initialisateurs comme corps de la fonction. Le bytecode généré pour cette fonction synthétique ressemblait à ceci :

```cpp
// Charger le symbole de nom privé pour `#a` dans r1
LdaImmutableCurrentContextSlot [2]
Star r1

// Charger 0 dans r2
LdaZero
Star r2

// Déplacer la cible dans r0
Mov <this>, r0

// Utiliser la fonction runtime %AddPrivateField() pour stocker 0 comme valeur de
// la propriété indexée par le symbole de nom privé `#a` dans l&apos;instance,
// c&apos;est-à-dire, `#a = 0`.
CallRuntime [AddPrivateField], r0-r2

// Charger le nom de la propriété `b` dans r1
LdaConstant [0]
Star r1

// Charger le symbole de nom privé pour `#a`
LdaImmutableCurrentContextSlot [2]

// Charger la valeur de la propriété indexée par `#a` depuis l&apos;instance dans r2
LdaKeyedProperty <this>, [0]
Star r2

// Déplacer la cible dans r0
Mov <this>, r0

// Utiliser la fonction runtime %CreateDataProperty() pour stocker la propriété indexée
// par `#a` comme valeur de la propriété indexée par `b`, c&apos;est-à-dire, `b = this.#a`
CallRuntime [CreateDataProperty], r0-r2
```

Comparez la classe dans l&apos;extrait précédent à une classe comme celle-ci :

```js
class A {
  constructor() {
    this._a = 0;
    this.b = this._a;
  }
}
```

Techniquement, ces deux classes ne sont pas équivalentes, même en ignorant la différence de visibilité entre `this.#a` et `this._a`. La spécification impose des sémantiques de "définition" au lieu des sémantiques de "mise en place". C&apos;est-à-dire que l&apos;initialisation des champs de classe ne déclenche pas les accesseurs setters ou les pièges `set` des Proxy. Par conséquent, une approximation de la première classe devrait utiliser `Object.defineProperty()` au lieu d&apos;assignations simples pour initialiser les propriétés. De plus, elle devrait lever une erreur si le champ privé existe déjà dans l&apos;instance (au cas où la cible en cours d&apos;initialisation est remplacée dans le constructeur de base par une autre instance) :

```js
class A {
  constructor() {
    // Ce que l&apos;appel %AddPrivateField() traduit approximativement :
    const _a = %PrivateSymbol(&apos;#a&apos;)
    if (_a in this) {
      throw TypeError(&apos;Impossible d&apos;initialiser #a deux fois sur le même objet&apos;);
    }
    Object.defineProperty(this, _a, {
      writable: true,
      configurable: false,
      enumerable: false,
      value: 0
    });
    // Ce que l&apos;appel %CreateDataProperty() traduit approximativement :
    Object.defineProperty(this, &apos;b&apos;, {
      writable: true,
      configurable: true,
      enumerable: true,
      value: this[_a]
    });
  }
}
```

Pour mettre en œuvre les sémantiques spécifiées avant la finalisation de la proposition, V8 utilisait des appels aux fonctions du runtime car elles sont plus flexibles. Comme indiqué dans le bytecode ci-dessus, l'initialisation des champs publics était mise en œuvre avec des appels au runtime `%CreateDataProperty()`, tandis que l'initialisation des champs privés était mise en œuvre avec `%AddPrivateField()`. Comme les appels au runtime entraînent des coûts significatifs, l'initialisation des champs de classe était beaucoup plus lente par rapport à l'assignation des propriétés d'objet ordinaires.

Dans la plupart des cas d'utilisation, cependant, les différences de sémantiques sont insignifiantes. Il serait donc souhaitable de bénéficier des performances d'assignations optimisées pour les propriétés dans ces cas &mdash; une implémentation plus optimale a donc été créée après la finalisation de la proposition.

### Optimisation des champs privés de classe et des champs publics calculés

Pour accélérer l'initialisation des champs privés de classe et des champs publics calculés, l'implémentation a introduit une nouvelle mécanique pour s'intégrer dans le [système de cache en ligne (IC)](https://mathiasbynens.be/notes/shapes-ics) lors du traitement de ces opérations. Cette nouvelle mécanique repose sur trois composants coopérants :

- Dans le générateur de bytecode, nouveau bytecode `DefineKeyedOwnProperty`. Cela est émis lors de la génération du code pour les nœuds AST `ClassLiteral::Property` représentant les initialisateurs de champs de classe.
- Dans le compilateur JIT TurboFan, un opcode IR correspondant `JSDefineKeyedOwnProperty`, qui peut être compilé à partir du nouveau bytecode.
- Dans le système IC, un nouvel `DefineKeyedOwnIC` est utilisé dans le gestionnaire interpréteur du nouveau bytecode ainsi que dans le code compilé à partir du nouvel opcode IR. Pour simplifier l'implémentation, le nouvel IC réutilise une partie du code dans `KeyedStoreIC`, qui était destiné aux magasins de propriétés ordinaires.

Maintenant, lorsque V8 rencontre cette classe :

```js
class A {
  #a = 0;
}
```

Il génère le bytecode suivant pour l'initialisateur `#a = 0` :

```cpp
// Charger le symbole de nom privé pour `#a` dans r1
LdaImmutableCurrentContextSlot [2]
Star0

// Utiliser le bytecode DefineKeyedOwnProperty pour stocker 0 comme valeur de
// la propriété indexée par le symbole de nom privé `#a` dans l'instance,
// c'est-à-dire `#a = 0`.
LdaZero
DefineKeyedOwnProperty <this>, r0, [0]
```

Lorsque l'initialisateur est exécuté suffisamment de fois, V8 alloue un [emplacement de vecteur de retour](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8) pour chaque champ en cours d'initialisation. L'emplacement contient la clé du champ ajouté (dans le cas du champ privé, le symbole de nom privé) et une paire de [classes cachées](https://v8.dev/docs/hidden-classes) entre lesquelles l'instance a été en transition à la suite de l'initialisation du champ. Lors des initialisations ultérieures, l'IC utilise le retour pour vérifier si les champs sont initialisés dans le même ordre sur des instances avec les mêmes classes cachées. Si l'initialisation correspond au modèle que V8 a déjà observé (ce qui est généralement le cas), V8 emprunte le chemin rapide et effectue l'initialisation avec le code pré-généré au lieu d'appeler le runtime, accélérant ainsi l'opération. Si l'initialisation ne correspond pas à un modèle que V8 a déjà observé, il revient à un appel au runtime pour gérer les cas lents.

### Optimisation des champs publics nommés de classe

Pour accélérer l'initialisation des champs publics nommés de classe, nous avons réutilisé le bytecode existant `DefineNamedOwnProperty` qui appelle `DefineNamedOwnIC` soit dans l'interpréteur, soit via le code compilé à partir de l'opcode IR `JSDefineNamedOwnProperty`.

Maintenant, lorsque V8 rencontre cette classe :

```js
class A {
  #a = 0;
  b = this.#a;
}
```

Il génère le bytecode suivant pour l'initialisateur `b = this.#a` :

```cpp
// Charger le symbole de nom privé pour `#a`
LdaImmutableCurrentContextSlot [2]

// Charger la valeur de la propriété indexée par `#a` depuis l'instance dans r2
// Remarque : LdaKeyedProperty est renommé en GetKeyedProperty dans le refactoring
GetKeyedProperty <this>, [2]

// Utiliser le bytecode DefineKeyedOwnProperty pour stocker la propriété indexée
// par `#a` comme valeur de la propriété indexée par `b`, c'est-à-dire `b = this.#a;`
DefineNamedOwnProperty <this>, [0], [4]
```

La mécanique originale `DefineNamedOwnIC` ne pouvait pas être simplement intégrée au traitement des champs publics nommés de classe, car elle était initialement conçue uniquement pour l'initialisation des littéraux d'objet. Elle s'attendait auparavant à ce que la cible en cours d'initialisation soit un objet qui n'a pas encore été modifié par l'utilisateur depuis sa création, ce qui était toujours vrai pour les littéraux d'objet, mais les champs de classe peuvent être initialisés sur des objets définis par l'utilisateur lorsque la classe hérite d'une classe de base dont le constructeur remplace la cible :

```js
class A {
  constructor() {
    return new Proxy(
      { a: 1 },
      {
        defineProperty(object, key, desc) {
          console.log(&apos;object:&apos;, object);
          console.log(&apos;key:&apos;, key);
          console.log(&apos;desc:&apos;, desc);
          return true;
        }
      });
  }
}

class B extends A {
  a = 2;
  #b = 3;  // Non observable.
}

// object: { a: 1 },
// key: &apos;a&apos;,
// desc: {value: 2, writable: true, enumerable: true, configurable: true}
new B();
```

Pour traiter ces cas, nous avons modifié le IC pour revenir à l'exécution lors de la détection que l'objet en cours d'initialisation est un proxy, si le champ défini existe déjà sur l'objet ou si l'objet a simplement une classe cachée que le IC n'a jamais rencontrée auparavant. Il est toujours possible d'optimiser les cas limites s'ils deviennent suffisamment courants, mais jusqu'à présent, il semble préférable de sacrifier leur performance pour favoriser la simplicité de l'implémentation.

## Optimisation des méthodes privées

### L'implémentation des méthodes privées

Dans [la spécification](https://tc39.es/ecma262/#sec-privatemethodoraccessoradd), les méthodes privées sont décrites comme étant installées sur les instances mais non sur la classe. Cependant, afin d'économiser de la mémoire, l'implémentation de V8 stocke les méthodes privées avec un symbole de marque privée dans un contexte associé à la classe. Lorsque le constructeur est invoqué, V8 ne stocke qu'une référence à ce contexte dans l'instance, avec le symbole de marque privée comme clé.

![Évaluation et instanciation des classes avec des méthodes privées](/_img/faster-class-features/class-evaluation-and-instantiation.svg)

Lorsqu'on accède aux méthodes privées, V8 parcourt la chaîne de contexte à partir du contexte d'exécution pour trouver le contexte de classe, lit un emplacement connu de manière statique dans le contexte trouvé pour obtenir le symbole de marque privé de la classe, puis vérifie si l'instance possède une propriété identifiée par ce symbole de marque pour voir si l'instance est créée à partir de cette classe. Si la vérification de la marque réussit, V8 charge la méthode privée d'un autre emplacement connu dans le même contexte et complète l'accès.

![Accès des méthodes privées](/_img/faster-class-features/access-private-methods.svg)

Prenons cet extrait de code comme exemple :

```js
class A {
  #a() {}
}
```

V8 générerait auparavant le bytecode suivant pour le constructeur de `A` :

```cpp
// Charger le symbole de marque privée pour la classe A à partir du contexte
// et le stocker dans r1.
LdaImmutableCurrentContextSlot [3]
Star r1

// Charger l'objet cible dans r0.
Mov <this>, r0
// Charger le contexte actuel dans r2.
Mov <context>, r2
// Appeler la fonction runtime %AddPrivateBrand() pour stocker le contexte dans
// l'instance avec la marque privée comme clé.
CallRuntime [AddPrivateBrand], r0-r2
```

Comme il y avait également un appel à la fonction runtime `%AddPrivateBrand()`, cette surcharge rendait le constructeur beaucoup plus lent que ceux des classes contenant uniquement des méthodes publiques.

### Optimisation de l'initialisation des marques privées

Pour accélérer l'installation des marques privées, nous réutilisons dans la plupart des cas la mécanique `DefineKeyedOwnProperty` ajoutée pour l'optimisation des champs privés :

```cpp
// Charger le symbole de marque privée pour la classe A à partir du contexte
// et le stocker dans r1
LdaImmutableCurrentContextSlot [3]
Star0

// Utiliser le bytecode DefineKeyedOwnProperty pour stocker le
// contexte dans l'instance avec la marque privée comme clé
Ldar <context>
DefineKeyedOwnProperty <this>, r0, [0]
```

![Performance des initialisations des instances de classes avec différentes méthodes](/_img/faster-class-features/private-methods-performance.svg)

Il y a cependant une mise en garde : si la classe est une classe dérivée dont le constructeur appelle `super()`, l'initialisation des méthodes privées - et dans notre cas, l'installation du symbole de marque privée - doit se produire après que `super()` ait retourné :

```js
class A {
  constructor() {
    // Cela génère une exception lors de l’appel de new B() car super() n’a pas encore retourné.
    this.callMethod();
  }
}

class B extends A {
  #method() {}
  callMethod() { return this.#method(); }
  constructor(o) {
    super();
  }
};
```

Comme décrit auparavant, lors de l'initialisation de la marque, V8 stocke également une référence au contexte de classe dans l'instance. Cette référence n'est pas utilisée pour les vérifications de la marque, mais est destinée au débogueur pour récupérer une liste des méthodes privées de l'instance sans savoir de quelle classe elle est issue. Lorsque `super()` est directement invoqué dans le constructeur, V8 peut simplement charger le contexte depuis le registre de contexte (ce que font `Mov <context>, r2` ou `Ldar <context>` dans les bytecodes ci-dessus) pour effectuer l'initialisation, mais `super()` peut également être invoqué depuis une fonction fléchée imbriquée, laquelle à son tour peut être invoquée depuis un contexte différent. Dans ce cas, V8 revient à une fonction runtime (toujours nommée `%AddPrivateBrand()`) pour rechercher le contexte de classe dans la chaîne de contexte au lieu de s'appuyer sur le registre de contexte. Par exemple, pour la fonction `callSuper` ci-dessous :

```js
class A extends class {} {
  #method() {}
  constructor(run) {
    const callSuper = () => super();
    // ...faire quelque chose
    run(callSuper)
  }
};

new A((fn) => fn());
```

V8 génère maintenant le bytecode suivant :

```cpp
// Appeler le super constructeur pour construire l’instance
// et la stocker dans r3.
...

// Charger le symbole de marque privée à partir du contexte de classe à
// la profondeur 1 depuis le contexte actuel et le stocker dans r4
LdaImmutableContextSlot <context>, [3], [1]
Star4

// Charger la profondeur 1 comme un Smi dans r6
LdaSmi [1]
Star6

// Charger le contexte actuel dans r5
Mov <context>, r5

// Utiliser %AddPrivateBrand() pour localiser le contexte de classe à
// la profondeur 1 depuis le contexte actuel et le stocker dans l’instance
// avec le symbole de marque privée comme clé
CallRuntime [AddPrivateBrand], r3-r6
```

Dans ce cas, le coût de l'appel au runtime est de retour, donc l'initialisation des instances de cette classe sera toujours plus lente par rapport à l'initialisation des instances de classes avec uniquement des méthodes publiques. Il est possible d'utiliser un bytecode dédié pour implémenter ce que `%AddPrivateBrand()` fait, mais comme l'invocation de `super()` dans une fonction flèche imbriquée est assez rare, nous avons une fois de plus privilégié la simplicité de l'implémentation au détriment de la performance.

## Notes finales

Le travail mentionné dans ce billet de blog est également inclus dans la version [Node.js 18.0.0](https://nodejs.org/en/blog/announcements/v18-release-announce/). Précédemment, Node.js a opté pour les propriétés symboliques dans certaines classes intégrées qui utilisaient des champs privés, afin de les inclure dans le snapshot de bootstrap embarqué et d'améliorer les performances des constructeurs (voir [cet article de blog](https://www.nearform.com/blog/node-js-and-the-struggles-of-being-an-eventtarget/) pour plus de contexte). Avec le support amélioré des fonctionnalités de classe dans V8, Node.js [est revenu aux champs de classe privés](https://github.com/nodejs/node/pull/42361) dans ces classes, et les benchmarks de Node.js ont montré que [ces changements n'ont introduit aucune régression de performance](https://github.com/nodejs/node/pull/42361#issuecomment-1068961385).

Merci à Igalia et Bloomberg pour avoir contribué à cette implémentation !
