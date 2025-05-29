---
title: 'Types d'éléments dans V8'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2017-09-12 13:33:37
tags:
  - internals
  - presentations
description: 'Cette plongée technique explique comment V8 optimise les opérations sur les tableaux en coulisses, et ce que cela signifie pour les développeurs JavaScript.'
tweet: '907608362191376384'
---
:::note
**Note :** Si vous préférez regarder une présentation plutôt que lire des articles, profitez de la vidéo ci-dessous !
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/m9cTaYI95Zc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

Les objets JavaScript peuvent avoir des propriétés arbitraires associées à eux. Les noms des propriétés d'objet peuvent contenir n'importe quel caractère. L'un des cas intéressants que le moteur JavaScript peut choisir d'optimiser concerne les propriétés dont les noms sont purement numériques, plus précisément les [indices de tableau](https://tc39.es/ecma262/#array-index).

<!--truncate-->
Dans V8, les propriétés avec des noms entiers — la forme la plus courante étant les objets générés par le constructeur `Array` — sont traitées de manière spéciale. Bien que ces propriétés indexées numériquement se comportent souvent comme d'autres propriétés, V8 choisit de les stocker séparément pour des raisons d'optimisation. En interne, V8 donne même un nom spécial à ces propriétés : _éléments_. Les objets possèdent des [propriétés](/blog/fast-properties) qui mappent aux valeurs, tandis que les tableaux ont des indices qui mappent aux éléments.

Bien que ces détails internes ne soient jamais exposés directement aux développeurs JavaScript, ils expliquent pourquoi certains modèles de code sont plus rapides que d'autres.

## Types d'éléments courants

Lors de l'exécution de code JavaScript, V8 garde une trace du type d'éléments contenus dans chaque tableau. Ces informations permettent à V8 d'optimiser les opérations sur le tableau spécifiquement pour ce type d'élément. Par exemple, lorsque vous appelez `reduce`, `map` ou `forEach` sur un tableau, V8 peut optimiser ces opérations en fonction du type d'éléments que contient le tableau.

Prenons cet exemple de tableau :

```js
const array = [1, 2, 3];
```

Quel type d'éléments contient-il ? Si vous posiez la question à l'opérateur `typeof`, il vous dirait que le tableau contient des `number`s. Au niveau du langage, c'est tout ce que vous obtenez : JavaScript ne distingue pas entre entiers, flottants et doubles — ce sont tous juste des nombres. Cependant, au niveau du moteur, nous pouvons faire des distinctions plus précises. Le type d'éléments pour ce tableau est `PACKED_SMI_ELEMENTS`. Dans V8, le terme Smi fait référence au format particulier utilisé pour stocker les petits entiers. (Nous parlerons de la partie `PACKED` dans une minute.)

L'ajout ultérieur d'un nombre en virgule flottante au même tableau le fait passer à un type d'éléments plus générique :

```js
const array = [1, 2, 3];
// type d'éléments : PACKED_SMI_ELEMENTS
array.push(4.56);
// type d'éléments : PACKED_DOUBLE_ELEMENTS
```

L'ajout d'une chaine de caractères au tableau modifie son type d'éléments une fois de plus.

```js
const array = [1, 2, 3];
// type d'éléments : PACKED_SMI_ELEMENTS
array.push(4.56);
// type d'éléments : PACKED_DOUBLE_ELEMENTS
array.push('x');
// type d'éléments : PACKED_ELEMENTS
```

Nous avons vu trois types d'éléments distincts jusqu'ici, avec les types de base suivants :

- <b>Pet</b>its <b>i</b>ntégers, également connus sous le nom de Smi.
- Doubles, pour les nombres en virgule flottante et les entiers qui ne peuvent pas être représentés comme un Smi.
- Éléments réguliers, pour les valeurs qui ne peuvent pas être représentées comme Smi ou doubles.

Notez que les doubles forment une variante plus générique des Smi, et les éléments réguliers sont une autre généralisation au-dessus des doubles. Les nombres pouvant être représentés en tant que Smi sont un sous-ensemble des nombres pouvant être représentés en tant que double.

Ce qui est important ici, c'est que les transitions de type d'éléments ne vont que dans une direction : du spécifique (par exemple `PACKED_SMI_ELEMENTS`) au plus général (par exemple `PACKED_ELEMENTS`). Une fois qu'un tableau est marqué comme `PACKED_ELEMENTS`, il ne peut pas revenir à `PACKED_DOUBLE_ELEMENTS`, par exemple.

Jusqu'ici, nous avons appris ce qui suit :

- V8 attribue un type d'éléments à chaque tableau.
- Le type d'éléments d'un tableau n'est pas figé — il peut changer à l'exécution. Dans l'exemple précédent, nous sommes passés de `PACKED_SMI_ELEMENTS` à `PACKED_ELEMENTS`.
- Les transitions de type d'éléments ne peuvent aller que de types spécifiques vers des types plus généraux.

## Types `PACKED` vs. `HOLEY`

Jusqu'ici, nous n'avons traité que des tableaux denses ou compacts. Créer des trous dans le tableau (c'est-à-dire rendre le tableau clairsemé) dégrade le type d'éléments vers sa variante “holey” :

```js
const array = [1, 2, 3, 4.56, 'x'];
// type d'éléments : PACKED_ELEMENTS
array.length; // 5
array[9] = 1; // array[5] à array[8] sont maintenant des trous
// type d'éléments : HOLEY_ELEMENTS
```

V8 fait cette distinction car les opérations sur des tableaux uniformes (packed) peuvent être optimisées de manière plus agressive que celles sur des tableaux clairsemés (holey). Pour les tableaux uniformes, la plupart des opérations peuvent être effectuées efficacement. En revanche, les opérations sur des tableaux clairsemés nécessitent des vérifications supplémentaires et des recherches coûteuses dans la chaîne de prototypes.

Chacun des types d'éléments de base que nous avons vus jusqu'à présent (c'est-à-dire Smis, doubles et éléments normaux) existe en deux versions : la version uniformes et la version clairsemés. Non seulement nous pouvons passer, par exemple, de `PACKED_SMI_ELEMENTS` à `PACKED_DOUBLE_ELEMENTS`, mais nous pouvons également passer d'une catégorie de type `PACKED` à son homologue `HOLEY`.

Pour récapituler :

- Les types d'éléments les plus courants existent en versions `PACKED` et `HOLEY`.
- Les opérations sur des tableaux uniformes sont plus efficaces que celles sur des tableaux clairsemés.
- Les types d'éléments peuvent passer des versions `PACKED` aux versions `HOLEY`.

## Le treillis des types d'éléments

V8 implémente ce système de transition de type sous forme de [treillis](https://fr.wikipedia.org/wiki/Treillis_%28ordre%29). Voici une visualisation simplifiée ne mettant en avant que les types d'éléments les plus courants :

![](/_img/elements-kinds/lattice.svg)

Il n'est possible de descendre qu'à travers le treillis. Une fois qu'un seul nombre flottant est ajouté à un tableau de Smis, il est marqué comme DOUBLE, même si vous écrasez ensuite le flottant avec un Smi. De même, une fois qu'un trou est créé dans un tableau, il est marqué comme troué pour toujours, même si vous le remplissez ultérieurement.

:::note
**Mise à jour @ 2025-02-28 :** Il existe désormais une exception [spécifiquement pour `Array.prototype.fill`](https://chromium-review.googlesource.com/c/v8/v8/+/6285929).
:::

V8 distingue actuellement [21 types d'éléments différents](https://cs.chromium.org/chromium/src/v8/src/elements-kind.h?l=14&rcl=ec37390b2ba2b4051f46f153a8cc179ed4656f5d), chacun accompagné de son propre ensemble d'optimisations possibles.

En général, les types d'éléments plus spécifiques permettent des optimisations plus précises. Plus un type d'élément est bas dans le treillis, plus les manipulations de cet objet peuvent être lentes. Pour des performances optimales, évitez de passer inutilement à des types moins spécifiques — restez sur le type le plus spécifique applicable à votre situation.

## Conseils de performance

Dans la plupart des cas, le suivi des types d'éléments fonctionne de manière invisible en arrière-plan, et vous n'avez pas besoin de vous en inquiéter. Mais voici quelques choses que vous pouvez faire pour tirer le meilleur parti possible du système.

### Évitez de lire au-delà de la longueur du tableau

De manière quelque peu inattendue (compte tenu du titre de cet article), notre conseil de performance n°1 n'est pas directement lié au suivi des types d'éléments (bien que ce qui se passe en arrière-plan soit un peu similaire). Lire au-delà de la longueur d'un tableau peut avoir un impact de performance surprenant, par exemple lire `array[42]` lorsque `array.length === 5`. Dans ce cas, l'indice `42` est hors limites, la propriété n'est pas présente dans le tableau lui-même, et donc le moteur JavaScript doit effectuer des recherches coûteuses dans la chaîne de prototypes. Une fois qu'un chargement est confronté à cette situation, V8 se souvient que « ce chargement doit gérer des cas particuliers », et il ne sera jamais aussi rapide qu'avant d'avoir lu hors limites.

Ne rédigez pas vos boucles de cette manière :

```js
// Ne faites pas cela !
for (let i = 0, item; (item = items[i]) != null; i++) {
  doSomething(item);
}
```

Ce code lit tous les éléments du tableau, puis un de plus. Il ne se termine que lorsqu'il trouve un élément `undefined` ou `null`. (jQuery utilise ce modèle à quelques endroits.)

Au lieu de cela, rédigez vos boucles de manière classique, et continuez simplement à itérer jusqu'à atteindre le dernier élément.

```js
for (let index = 0; index < items.length; index++) {
  const item = items[index];
  doSomething(item);
}
```

Lorsque la collection sur laquelle vous bouclez est itérable (comme c'est le cas pour les tableaux et les `NodeList`s), c'est encore mieux : utilisez simplement `for-of`.

```js
for (const item of items) {
  doSomething(item);
}
```

Pour les tableaux spécifiquement, vous pourriez utiliser la méthode intégrée `forEach` :

```js
items.forEach((item) => {
  doSomething(item);
});
```

De nos jours, les performances de `for-of` et de `forEach` sont comparables à celles de la boucle classique `for`.

Évitez de lire au-delà de la longueur du tableau ! Dans ce cas, la vérification des limites effectuée par V8 échoue, la vérification de la présence de la propriété échoue, et ensuite V8 doit consulter la chaîne de prototypes. L'impact est encore pire lorsque vous utilisez ensuite accidentellement la valeur dans des calculs, par exemple :

```js
function Maximum(array) {
  let max = 0;
  for (let i = 0; i <= array.length; i++) { // MAUVAISE COMPARAISON !
    if (array[i] > max) max = array[i];
  }
  return max;
}
```

Ici, la dernière itération lit au-delà de la longueur du tableau, ce qui retourne `undefined`, ce qui affecte non seulement le chargement mais aussi la comparaison : au lieu de comparer uniquement des nombres, elle doit maintenant gérer des cas particuliers. Corriger la condition de terminaison en utilisant correctement `i < array.length` permet une amélioration des performances de **6×** pour cet exemple (mesuré sur des tableaux de 10 000 éléments, donc le nombre d'itérations ne baisse que de 0,01 %).

### Évitez les transitions entre types d'éléments

En général, si vous devez effectuer de nombreuses opérations sur un tableau, essayez de conserver un type d'éléments aussi spécifique que possible, afin que V8 puisse optimiser ces opérations au maximum.

C'est plus difficile qu'il n'y paraît. Par exemple, ajouter simplement `-0` à un tableau de petits entiers suffit à le faire passer à `PACKED_DOUBLE_ELEMENTS`.

```js
const array = [3, 2, 1, +0];
// PACKED_SMI_ELEMENTS
array.push(-0);
// PACKED_DOUBLE_ELEMENTS
```

En conséquence, toute entreprise future sur ce tableau est optimisée de manière complètement différente de celle utilisée pour les Smis.

Évitez `-0`, sauf si vous avez explicitement besoin de différencier `-0` et `+0` dans votre code. (Ce n'est probablement pas le cas.)

La même chose s'applique à `NaN` et `Infinity`. Ils sont représentés comme des nombres doubles, donc ajouter un seul `NaN` ou `Infinity` à un tableau de `SMI_ELEMENTS` le fait passer à `DOUBLE_ELEMENTS`.

```js
const array = [3, 2, 1];
// PACKED_SMI_ELEMENTS
array.push(NaN, Infinity);
// PACKED_DOUBLE_ELEMENTS
```

Si vous prévoyez d'effectuer de nombreuses opérations sur un tableau d'entiers, envisagez de normaliser `-0` et bloquer `NaN` et `Infinity` lors de l'initialisation des valeurs. Cela permet au tableau de rester de type `PACKED_SMI_ELEMENTS`. Ce coût de normalisation unique peut valoir les optimisations ultérieures.

En fait, si vous effectuez des opérations mathématiques sur un tableau de nombres, envisagez d'utiliser un TypedArray. Nous avons également des types spécialisés pour ces derniers.

### Préférez les tableaux aux objets ressemblant à des tableaux

Certains objets en JavaScript — en particulier dans le DOM — ressemblent à des tableaux bien qu'ils ne soient pas des tableaux propres. Il est possible de créer vous-même des objets ressemblant à des tableaux :

```js
const arrayLike = {};
arrayLike[0] = 'a';
arrayLike[1] = 'b';
arrayLike[2] = 'c';
arrayLike.length = 3;
```

Cet objet a une propriété `length` et prend en charge l'accès aux éléments indexés (comme un tableau !) mais il lui manque les méthodes de tableau telles que `forEach` dans son prototype. Il est toujours possible d'appeler les génériques de tableau dessus :

```js
Array.prototype.forEach.call(arrayLike, (value, index) => {
  console.log(`${ index }: ${ value }`);
});
// Cela affiche '0: a', puis '1: b', et enfin '2: c'.
```

Ce code appelle la méthode intégrée `Array.prototype.forEach` sur l'objet ressemblant à un tableau, et cela fonctionne comme prévu. Cependant, cela est plus lent que d'appeler `forEach` sur un tableau propre, qui est très optimisé dans V8. Si vous prévoyez d'utiliser plusieurs fois les méthodes de tableau sur cet objet, envisagez de le transformer en véritable tableau au préalable :

```js
const actualArray = Array.prototype.slice.call(arrayLike, 0);
actualArray.forEach((value, index) => {
  console.log(`${ index }: ${ value }`);
});
// Cela affiche '0: a', puis '1: b', et enfin '2: c'.
```

Le coût de conversion unique peut valoir les optimisations ultérieures, surtout si vous prévoyez de nombreuses opérations sur le tableau.

L'objet `arguments`, par exemple, est un objet ressemblant à un tableau. Il est possible d'appeler des méthodes de tableau dessus, mais de telles opérations ne seront pas complètement optimisées comme elles pourraient l'être pour un tableau propre.

```js
const logArgs = function() {
  Array.prototype.forEach.call(arguments, (value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs('a', 'b', 'c');
// Cela affiche '0: a', puis '1: b', et enfin '2: c'.
```

Les paramètres de repos ES2015 peuvent vous aider ici. Ils produisent de vrais tableaux qui peuvent être utilisés à la place des objets `arguments` ressemblant à des tableaux de manière élégante.

```js
const logArgs = (...args) => {
  args.forEach((value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs('a', 'b', 'c');
// Cela affiche '0: a', puis '1: b', et enfin '2: c'.
```

De nos jours, il n'y a aucune bonne raison d'utiliser directement l'objet `arguments`.

En général, évitez autant que possible les objets ressemblant à des tableaux et utilisez plutôt des tableaux propres.

### Évitez le polymorphisme

Si vous avez du code qui gère des tableaux avec plusieurs types d'éléments différents, cela peut entraîner des opérations polymorphes qui sont plus lentes que la version du code qui n'opère que sur un seul type d'éléments.

Considérez l'exemple suivant, où une fonction de bibliothèque est appelée avec divers types d'éléments. (Notez que ce n'est pas la méthode native `Array.prototype.forEach`, qui a son propre ensemble d'optimisations en plus des optimisations spécifiques aux types d'éléments discutées dans cet article.)

```js
const each = (array, callback) => {
  for (let index = 0; index < array.length; ++index) {
    const item = array[index];
    callback(item);
  }
};
const doSomething = (item) => console.log(item);

each([], () => {});

each(['a', 'b', 'c'], doSomething);
// `each` est appelé avec `PACKED_ELEMENTS`. V8 utilise un cache en ligne
// (ou « IC ») pour se souvenir que `each` a été appelé avec ce type d'éléments
// particulier. V8 est optimiste et suppose que les accès
// à `array.length` et `array[index]` dans la fonction `each` sont
// monomorphiques (c'est-à-dire qu'ils reçoivent uniquement un type unique
// d'éléments) jusqu'à preuve du contraire. Pour chaque appel futur à
// `each`, V8 vérifie si le type d'éléments est `PACKED_ELEMENTS`. Si
// c'est le cas, V8 peut réutiliser le code précédemment généré. Sinon,
// un travail supplémentaire est nécessaire.

each([1.1, 2.2, 3.3], doSomething);
// `each` est appelé avec `PACKED_DOUBLE_ELEMENTS`. Comme V8 a
// maintenant vu différents types d'éléments passés à `each` dans son IC, les
// accès à `array.length` et `array[index]` à l'intérieur de la fonction `each`
// sont marqués comme polymorphes. V8 a maintenant besoin d'une vérification
// supplémentaire chaque fois que `each` est appelé : une pour `PACKED_ELEMENTS`
// (comme avant), une nouvelle pour `PACKED_DOUBLE_ELEMENTS`, et une pour
// tout autre type d'éléments (comme avant). Cela entraîne une
// perte de performance.

each([1, 2, 3], doSomething);
// `each` est appelé avec `PACKED_SMI_ELEMENTS`. Cela déclenche un autre
// degré de polymorphisme. Il y a maintenant trois types d'éléments différents
// dans l'IC pour `each`. Pour chaque appel à `each` à partir de maintenant, une
// vérification supplémentaire du type d'éléments est nécessaire pour réutiliser
// le code généré pour `PACKED_SMI_ELEMENTS`. Cela entraîne un coût
// en termes de performances.
```

Les méthodes intégrées (telles que `Array.prototype.forEach`) peuvent gérer ce type de polymorphisme de manière beaucoup plus efficace, donc envisagez de les utiliser à la place des fonctions des bibliothèques utilisateur dans des situations sensibles à la performance.

Un autre exemple de monomorphisme vs. polymorphisme dans V8 concerne les formes d'objets, également connues sous le nom de la classe cachée d'un objet. Pour en savoir plus sur ce cas, consultez [l'article de Vyacheslav](https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html).

### Éviter de créer des trous

Pour des schémas de codage réels, la différence de performances entre l'accès à des tableaux partiels ou compacts est généralement trop faible pour être significative ou même mesurable. Si (et c'est un grand « si » !) vos mesures de performances indiquent que chaque dernière instruction machine dans le code optimisé en vaut la peine, alors vous pouvez essayer de garder vos tableaux en mode d'éléments compacts. Supposons que nous essayions de créer un tableau, par exemple :

```js
const array = new Array(3);
// Le tableau est éparse à ce moment, donc il est marqué comme
// `HOLEY_SMI_ELEMENTS`, c'est-à-dire la possibilité la plus spécifique donnée
// les informations actuelles.
array[0] = 'a';
// Attendez, c'est une chaîne de caractères au lieu d'un petit entier… Donc le type
// passe à `HOLEY_ELEMENTS`.
array[1] = 'b';
array[2] = 'c';
// À ce stade, les trois positions dans le tableau sont remplies, donc
// le tableau est compact (c'est-à-dire non plus éparse). Cependant, nous ne pouvons pas
// passer à un type plus spécifique tel que `PACKED_ELEMENTS`. Le
// type d'éléments reste `HOLEY_ELEMENTS`.
```

Une fois que le tableau est marqué comme éparse, il reste éparse pour toujours — même si tous ses éléments sont présents par la suite !

Une meilleure façon de créer un tableau est d'utiliser un littéral à la place :

```js
const array = ['a', 'b', 'c'];
// type d'éléments : PACKED_ELEMENTS
```

Si vous ne connaissez pas toutes les valeurs à l'avance, créez un tableau vide, et plus tard, utilisez `push` pour ajouter les valeurs.

```js
const array = [];
// …
array.push(someValue);
// …
array.push(someOtherValue);
```

Cette approche garantit que le tableau ne passe jamais à un type d'éléments éparse. En conséquence, V8 peut éventuellement générer un code optimisé légèrement plus rapide pour certaines opérations sur ce tableau.

## Débogage des types d'éléments

Pour déterminer le « type d'éléments » d'un objet donné, obtenez une version de débogage de `d8` (soit en [le construisant à partir des sources](/docs/build) en mode débogage, soit en téléchargeant un binaire précompilé à l'aide de [`jsvu`](https://github.com/GoogleChromeLabs/jsvu)), et exécutez :

```bash
out/x64.debug/d8 --allow-natives-syntax
```

Cela ouvre un REPL `d8` dans lequel des [fonctions spéciales](https://cs.chromium.org/chromium/src/v8/src/runtime/runtime.h?l=20&rcl=05720af2b09a18be5c41bbf224a58f3f0618f6be) telles que `%DebugPrint(object)` sont disponibles. Le champ « elements » dans sa sortie révèle le « type d'éléments » de tout objet que vous lui passez.

```js
d8> const array = [1, 2, 3]; %DebugPrint(array);
DebugPrint: 0x1fbbad30fd71: [JSArray]
 - map = 0x10a6f8a038b1 [FastProperties]
 - prototype = 0x1212bb687ec1
 - elements = 0x1fbbad30fd19 <FixedArray[3]> [PACKED_SMI_ELEMENTS (COW)]
 - length = 3
 - properties = 0x219eb0702241 <FixedArray[0]> {
    #length: 0x219eb0764ac9 <AccessorInfo> (const accessor descriptor)
 }
 - elements= 0x1fbbad30fd19 <FixedArray[3]> {
           0: 1
           1: 2
           2: 3
 }
[…]
```

Notez que « COW » signifie [copy-on-write](https://fr.wikipedia.org/wiki/Copy-on-write), ce qui est encore une optimisation interne. Ne vous inquiétez pas pour ça pour le moment — c'est un sujet pour un autre article de blog !

Un autre drapeau utile disponible dans les versions de débogage est `--trace-elements-transitions`. Activez-le pour que V8 vous informe chaque fois qu'une transition de type d'éléments a lieu.

```bash
$ cat my-script.js
const array = [1, 2, 3];
array[3] = 4.56;

$ out/x64.debug/d8 --trace-elements-transitions my-script.js
elements transition [PACKED_SMI_ELEMENTS -> PACKED_DOUBLE_ELEMENTS] in ~+34 at x.js:2 for 0x1df87228c911 <JSArray[3]> from 0x1df87228c889 <FixedArray[3]> to 0x1df87228c941 <FixedDoubleArray[22]>
```
