---
title: "Classer les choses dans V8"
author: "Simon Zünd ([@nimODota](https://twitter.com/nimODota)), comparateur cohérent"
avatars: 
  - simon-zuend
date: "2018-09-28 11:20:37"
tags: 
  - ECMAScript
  - internals
description: "À partir de V8 v7.0 / Chrome 70, Array.prototype.sort est stable."
tweet: "1045656758700650502"
---
`Array.prototype.sort` était parmi les derniers modules intégrés mis en œuvre en JavaScript auto-hébergé dans V8. Le porter nous a offert l'opportunité d'expérimenter avec différents algorithmes et stratégies d'implémentation et finalement [le rendre stable](https://mathiasbynens.be/demo/sort-stability) dans V8 v7.0 / Chrome 70.

<!--truncate-->
## Contexte

Le tri en JavaScript est difficile. Cet article examine certaines bizarreries dans l'interaction entre un algorithme de tri et le langage JavaScript, et décrit notre parcours pour passer à un algorithme stable dans V8 et rendre les performances plus prévisibles.

Lors de la comparaison de différents algorithmes de tri, nous examinons leurs performances moyennes et dans le pire cas en fonction de leur croissance asymptotique (c'est-à-dire la notation « Big O ») des opérations mémoire ou du nombre de comparaisons. Notez que dans les langages dynamiques, tels que JavaScript, une opération de comparaison est généralement beaucoup plus coûteuse qu'un accès mémoire. Cela est dû au fait que comparer deux valeurs lors du tri implique habituellement des appels au code utilisateur.

Examinons un exemple simple de tri de quelques nombres dans un ordre croissant à l'aide d'une fonction de comparaison fournie par l'utilisateur. Une fonction de comparaison _cohérente_ renvoie `-1` (ou toute autre valeur négative), `0`, ou `1` (ou toute autre valeur positive) lorsque les deux valeurs fournies sont respectivement plus petites, égales ou plus grandes. Une fonction de comparaison qui ne suit pas ce modèle est _incohérente_ et peut avoir des effets secondaires arbitraires, tels que modifier le tableau qu'elle est censée trier.

```js
const array = [4, 2, 5, 3, 1];

function compare(a, b) {
  // Du code arbitraire peut être inséré ici, par exemple `array.push(1);`.
  return a - b;
}

// Un appel de tri “typique”.
array.sort(compare);
```

Même dans l'exemple suivant, des appels au code utilisateur peuvent se produire. La fonction de comparaison “par défaut” appelle `toString` sur les deux valeurs et effectue une comparaison lexicographique sur les représentations sous forme de chaînes.

```js
const array = [4, 2, 5, 3, 1];

array.push({
  toString() {
    // Du code arbitraire peut être inséré ici, par exemple `array.push(1);`.
    return '42';
  }
});

// Tri sans une fonction de comparaison.
array.sort();
```

### Plus d'amusement avec les accesseurs et les interactions de chaînes de prototypes

C'est ici que nous quittons les spécifications et nous aventurons dans le territoire du comportement « défini par l'implémentation ». Les spécifications contiennent une liste de conditions qui, sous certaines circonstances, permettent au moteur de trier l'objet/tableau comme il le souhaite — ou pas du tout. Les moteurs doivent suivre certaines règles, mais tout le reste est laissé libre à l'interprétation. D'une part, cela donne aux développeurs de moteur la liberté d'expérimenter avec différentes implémentations. D'autre part, les utilisateurs s'attendent à un comportement raisonnable même si les spécifications ne l'exigent pas. Cet état de fait est également compliqué par le fait que ce qui est « raisonnable » n'est pas toujours évident.

Cette section montre qu'il existe encore certains aspects de `Array#sort` où le comportement des moteurs varie grandement. Ce sont des cas limites difficiles, et comme mentionné précédemment, il n'est pas toujours clair quelle est « la bonne chose à faire ». Nous _recommandons fortement_ de ne pas écrire de code comme ce qui suit ; les moteurs ne l'optimiseront pas.

Le premier exemple montre un tableau avec certains accesseurs (c'est-à-dire getters et setters) et un « journal des appels » dans différents moteurs JavaScript. Les accesseurs sont le premier cas où l'ordre de tri résultant est défini par l'implémentation:

```js
const array = [0, 1, 2];

Object.defineProperty(array, '0', {
  get() { console.log('get 0'); return 0; },
  set(v) { console.log('set 0'); }
});

Object.defineProperty(array, '1', {
  get() { console.log('get 1'); return 1; },
  set(v) { console.log('set 1'); }
});

array.sort();
```

Voici la sortie de cet extrait dans divers moteurs. Notez qu'il n'y a pas de réponses « correctes » ou « incorrectes » ici — les spécifications laissent cela libre à l'implémentation !

```
// Chakra
get 0
get 1
set 0
set 1

// JavaScriptCore
get 0
get 1
get 0
get 0
get 1
get 1
set 0
set 1

// V8
get 0
get 0
get 1
get 1
get 1
get 0

#### SpiderMonkey
get 0
get 1
set 0
set 1
```

Le prochain exemple montre des interactions avec la chaîne de prototypes. Pour la concision, nous ne montrons pas le journal des appels.

```js
const object = {
 1: 'd1',
 2: 'c1',
 3: 'b1',
 4: undefined,
 __proto__: {
   length: 10000,
   1: 'e2',
   10: 'a2',
   100: 'b2',
   1000: 'c2',
   2000: undefined,
   8000: 'd2',
   12000: 'XX',
   __proto__: {
     0: 'e3',
     1: 'd3',
     2: 'c3',
     3: 'b3',
     4: 'f3',
     5: 'a3',
     6: undefined,
   },
 },
};
Array.prototype.sort.call(object);
```

La sortie montre l'`objet` après qu'il soit trié. Encore une fois, il n'y a pas de réponse juste ici. Cet exemple illustre simplement comment l'interaction entre les propriétés indexées et la chaîne de prototypes peut devenir étrange :

```js
// Chakra
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]

// JavaScriptCore
['a2', 'a2', 'a3', 'b1', 'b2', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined]

// V8
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]

// SpiderMonkey
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]
```

### Ce que fait V8 avant et après le tri

:::note
**Remarque :** Cette section a été mise à jour en juin 2019 pour refléter les modifications du pré- et post-traitement de `Array#sort` dans V8 v7.7.
:::

V8 applique une étape de pré-traitement avant de trier quoi que ce soit, ainsi qu'une étape de post-traitement. L'idée de base est de collecter toutes les valeurs non `undefined` dans une liste temporaire, de trier cette liste temporaire, puis d'écrire les valeurs triées dans le tableau ou l'objet d'origine. Cela permet à V8 de ne pas s'occuper des accesseurs ou de la chaîne de prototypes pendant le tri proprement dit.

La spécification attend de `Array#sort` qu'il produise un ordre de tri pouvant être conceptuellement partitionné en trois segments :

  1. Toutes les valeurs non `undefined` triées en fonction de la fonction de comparaison.
  1. Tous les `undefined`.
  1. Tous les trous, c'est-à-dire les propriétés inexistantes.

L'algorithme de tri proprement dit n'a besoin d'être appliqué qu'au premier segment. Pour y parvenir, V8 applique une étape de pré-traitement qui fonctionne approximativement comme suit :

  1. Définir `length` comme la valeur de la propriété `”length”` du tableau ou de l'objet à trier.
  1. Définir `numberOfUndefineds` à 0.
  1. Pour chaque `value` dans l'intervalle `[0, length)` :
    a. Si `value` est un trou : ne rien faire.
    b. Si `value` est `undefined` : incrémenter `numberOfUndefineds` de 1.
    c. Sinon, ajouter `value` à une liste temporaire `elements`.

Après l'exécution de ces étapes, toutes les valeurs non `undefined` se trouvent dans la liste temporaire `elements`. Les valeurs `undefined` sont simplement comptées, au lieu d'être ajoutées à `elements`. Comme mentionné ci-dessus, la spécification exige que les valeurs `undefined` soient triées à la fin. Cependant, les valeurs `undefined` ne sont pas réellement passées à la fonction de comparaison fournie par l'utilisateur, ce qui permet de se contenter de compter le nombre de valeurs `undefined` apparues.

L'étape suivante consiste à trier effectivement `elements`. Voir [la section sur TimSort](/blog/array-sort#timsort) pour une description détaillée.

Une fois le tri terminé, les valeurs triées doivent être écrites dans le tableau ou l'objet d'origine. L'étape de post-traitement comporte trois phases qui gèrent les segments conceptuels :

  1. Rétablir toutes les valeurs de `elements` dans l'objet d'origine dans l'intervalle `[0, elements.length)`.
  1. Définir toutes les valeurs de `[elements.length, elements.length + numberOfUndefineds)` à `undefined`.
  1. Supprimer toutes les valeurs dans l'intervalle `[elements.length + numberOfUndefineds, length)`.

L'étape 3 est nécessaire si l'objet d'origine contenait des trous dans l'intervalle de tri. Les valeurs de l'intervalle `[elements.length + numberOfUndefineds, length)` ont déjà été déplacées vers l'avant et ne pas effectuer l'étape 3 entraînerait la duplication des valeurs.

## Historique

`Array.prototype.sort` et `TypedArray.prototype.sort` s'appuyaient sur la même implémentation de tri rapide (Quicksort) écrite en JavaScript. L'algorithme de tri lui-même est assez direct : La base est un tri rapide avec un retour à un tri par insertion pour des tableaux plus courts (longueur < 10). Le retour au tri par insertion était également utilisé lorsque la récursion du tri rapide atteignait une sous-tableau de longueur 10. Le tri par insertion est plus efficace pour les petits tableaux, car le tri rapide est appelé récursivement deux fois après le partitionnement. Chaque appel récursif impliquait un coût supplémentaire lié à la création (et au rejet) d'une pile.

Le choix d'un élément pivot approprié a un impact significatif sur le tri rapide. V8 utilisait deux stratégies :

- Le pivot était choisi comme la médiane du premier, dernier et un troisième élément du sous-tableau à trier. Pour les petits tableaux, ce troisième élément est simplement l'élément du milieu.
- Pour les grands tableaux, un échantillon était pris, puis trié, et la médiane de l'échantillon trié servait de troisième élément dans le calcul ci-dessus.

Un des avantages du tri rapide est qu'il trie sur place. Le coût en mémoire provient de l'allocation d'un petit tableau pour l'échantillon lors du tri des grands tableaux, et de l'espace de pile log(n). L'inconvénient est que ce n'est pas un algorithme stable et qu'il y a une chance que l'algorithme atteigne le scénario de pire cas où le tri rapide se dégrade en 𝒪(n²).

### Introduction à V8 Torque

En tant que lecteur assidu du blog V8, vous avez peut-être entendu parler de [`CodeStubAssembler`](/blog/csa), ou CSA en abrégé. CSA est un composant de V8 qui nous permet d'écrire directement des IR TurboFan de bas niveau en C++, qui sont ensuite traduites en code machine pour l'architecture appropriée en utilisant le backend de TurboFan.

CSA est largement utilisé pour écrire les soi-disant « chemins rapides » (fast-paths) pour les fonctions intégrées JavaScript. Une version rapide d'une fonction intégrée vérifie généralement si certaines invariants sont respectées (par exemple, pas d'éléments dans la chaîne de prototypes, pas d'accesseurs, etc.) puis utilise des opérations plus rapides et spécifiques pour implémenter la fonctionnalité intégrée. Cela peut entraîner des temps d'exécution bien plus rapides qu'une version plus générique.

L'inconvénient du CSA est qu'il peut vraiment être considéré comme un langage d'assemblage. Le flux de contrôle est modélisé à l'aide explicite de `labels` et de `gotos`, ce qui rend la mise en œuvre d'algorithmes plus complexes difficile à lire et sujette aux erreurs.

Voici [V8 Torque](/docs/torque). Torque est un langage spécifique au domaine avec une syntaxe semblable à TypeScript qui utilise actuellement CSA comme sa seule cible de compilation. Torque offre presque le même niveau de contrôle que CSA tout en proposant des constructions de haut-niveau telles que les boucles `while` et `for`. De plus, il est fortement typé et inclura à l'avenir des vérifications de sécurité comme des contrôles automatiques en dehors des limites, fournissant des garanties plus solides aux ingénieurs de V8.

Les premières fonctions intégrées majeures réécrites en V8 Torque ont été [`TypedArray#sort`](/blog/v8-release-68) et les [opérations `Dataview`](/blog/dataview). Ces deux réécritures ont également fourni des retours aux développeurs Torque sur les fonctionnalités linguistiques nécessaires et les idiomes à utiliser pour écrire efficacement des fonctions intégrées. Au moment de la rédaction, plusieurs fonctions intégrées de `JSArray` avaient leurs implémentations alternatives JavaScript auto-hébergées déplacées vers Torque (par exemple, `Array#unshift`), tandis que d'autres ont été complètement réécrites (par exemple, `Array#splice` et `Array#reverse`).

### Déplacer `Array#sort` vers Torque

La version initiale Torque de `Array#sort` était plus ou moins une transposition directe de l'implémentation JavaScript. La seule différence était que, au lieu d'utiliser une approche d'échantillonnage pour des tableaux plus grands, le troisième élément pour le calcul du pivot était choisi au hasard.

Cela fonctionnait raisonnablement bien, mais comme cela utilisait encore QuickSort, `Array#sort` restait instable. [La demande pour un `Array#sort` stable](https://bugs.chromium.org/p/v8/issues/detail?id=90) fait partie des plus anciens tickets dans le gestionnaire de bugs de V8. Expérimenter avec Timsort comme prochaine étape nous a offert plusieurs avantages. Tout d'abord, nous apprécions sa stabilité et ses garanties algorithmiques (voir la section suivante). Ensuite, Torque était encore en cours de développement et implémenter une fonction intégrée plus complexe comme `Array#sort` avec Timsort a fourni beaucoup de retours exploitables influençant Torque en tant que langage.

## Timsort

Timsort, initialement développé par Tim Peters pour Python en 2002, peut être décrit au mieux comme une variante adaptative et stable de Mergesort. Bien que les détails soient assez complexes et mieux décrits par [lui-même](https://github.com/python/cpython/blob/master/Objects/listsort.txt) ou par la [page Wikipédia](https://en.wikipedia.org/wiki/Timsort), les bases sont faciles à comprendre. Alors que Mergesort travaille généralement de manière récursive, Timsort fonctionne de manière itérative. Il traite un tableau de gauche à droite et recherche ce qu'on appelle des _runs_. Un run est simplement une séquence déjà triée. Cela inclut des séquences triées « dans le mauvais sens » car ces séquences peuvent simplement être inversées pour former un run. Au début du processus de tri, une longueur minimale de run est déterminée en fonction de la longueur de l'entrée. Si Timsort ne trouve pas de runs naturels de cette longueur minimale, un run est "boosté artificiellement" à l'aide du tri par insertion.

Les runs trouvés de cette manière sont suivis à l'aide d'une pile qui se souvient d'un index de début et d'une longueur pour chaque run. De temps en temps, les runs sur la pile sont regroupés jusqu'à ce qu'il ne reste qu'un seul run trié. Timsort essaie de maintenir un équilibre lorsqu'il s'agit de décider quels runs regrouper. D'une part, vous voulez essayer de regrouper tôt puisque les données de ces runs ont de fortes chances d'être déjà en cache. D'autre part, vous voulez regrouper aussi tard que possible pour tirer parti des motifs dans les données qui peuvent apparaître. Pour ce faire, Timsort maintient deux invariants. En supposant que `A`, `B` et `C` soient les trois runs au sommet de la pile:

- `|C| > |B| + |A|`
- `|B| > |A|`

![Pile de runs avant et après le regroupement de `A` avec `B`](/_img/array-sort/runs-stack.svg)

L'image montre le cas où `|A| > |B|` donc `B` est regroupé avec le plus petit des deux runs.

Notez que Timsort ne regroupe que les runs consécutifs, ce qui est nécessaire pour maintenir la stabilité. Sinon, des éléments égaux pourraient être transférés entre les runs. Aussi, le premier invariant s'assure que les longueurs des runs augmentent au moins aussi rapidement que les nombres Fibonacci, offrant une limite supérieure à la taille de la pile de runs lorsque nous connaissons la longueur maximale du tableau.

On peut maintenant voir que les séquences déjà triées sont triées en 𝒪(n) car un tel tableau entraînerait un seul run qui n'a pas besoin d'être regroupé. Le pire des cas est 𝒪(n log n). Ces propriétés algorithmiques ainsi que la nature stable de Timsort ont fait partie des raisons pour lesquelles nous avons choisi Timsort plutôt que QuickSort au final.

### Implémenter Timsort en Torque

Les fonctions natives utilisent généralement des chemins de code différents qui sont choisis pendant l'exécution en fonction de diverses variables. La version la plus générique peut gérer tout type d'objet, qu'il s'agisse d'un `JSProxy`, des interceptors ou des recherches dans la chaîne de prototypes lors de la récupération ou de la définition de propriétés.
Le chemin générique est plutôt lent dans la plupart des cas, car il doit prendre en compte toutes les éventualités. Mais si nous savons à l'avance que l'objet à trier est un simple `JSArray` contenant uniquement des Smis, toutes ces coûteuses opérations `[[Get]]` et `[[Set]]` peuvent être remplacées par de simples Chargements et Stockages dans un `FixedArray`. Le principal différenciateur est le [`ElementsKind`](/blog/elements-kinds).

Le problème devient alors comment implémenter un chemin rapide. L'algorithme de base reste le même, mais la manière dont nous accédons aux éléments change en fonction de `ElementsKind`. Une manière d'y parvenir serait d'appeler l'accès approprié à chaque site d'appel. Imaginez un commutateur pour chaque opération de « chargement »/« stockage » où nous choisissons une branche différente en fonction du chemin rapide choisi.

Une autre solution (et c'était la première approche essayée) est de simplement copier toute la fonction native une fois pour chaque chemin rapide et d'insérer directement la méthode d'accès appropriée pour le chargement/stockage. Cette approche s'est avérée impossible pour Timsort car c'est une grande fonction native et faire une copie pour chaque chemin rapide nécessitait au total 106 Ko, ce qui est beaucoup trop pour une seule fonction native.

La solution finale est légèrement différente. Chaque opération de chargement/stockage pour chaque chemin rapide est placée dans sa propre « mini fonction native ». Voir l'exemple de code qui montre l'opération de « chargement » pour les `FixedDoubleArray`.

```torque
Load<FastDoubleElements>(
    context: Context, sortState: FixedArray, elements: HeapObject,
    index: Smi): Object {
  try {
    const elems: FixedDoubleArray = UnsafeCast<FixedDoubleArray>(elements);
    const value: float64 =
        LoadDoubleWithHoleCheck(elems, index) otherwise Bailout;
    return AllocateHeapNumberWithValue(value);
  }
  label Bailout {
    // L'étape de prétraitement a supprimé tous les trous en compactant tous les éléments
    // au début du tableau. Trouver un trou signifie que la fonction de comparaison ou
    // ToString modifie le tableau.
    return Failure(sortState);
  }
}
```

Pour comparer, l'opération de « chargement » la plus générique est simplement un appel à `GetProperty`. Mais tandis que la version ci-dessus génère un code machine efficace et rapide pour charger et convertir un `Number`, `GetProperty` est un appel à une autre fonction native qui pourrait éventuellement impliquer une recherche dans la chaîne de prototypes ou invoquer une fonction d'accès.

```js
builtin Load<ElementsAccessor : type>(
    context: Context, sortState: FixedArray, elements: HeapObject,
    index: Smi): Object {
  return GetProperty(context, elements, index);
}
```

Un chemin rapide devient alors simplement un ensemble de pointeurs de fonction. Cela signifie que nous avons besoin d'une seule copie de l'algorithme de base tout en configurant tous les pointeurs de fonction pertinents une fois à l'avance. Bien que cela réduise considérablement l'espace de code nécessaire (jusqu'à 20 Ko), cela se fait au détriment d'une branche indirecte à chaque site d'accès. Cela est encore aggravé par le récent changement visant à utiliser [les fonctions natives intégrées](/blog/embedded-builtins).

### État de tri

![](/_img/array-sort/sort-state.svg)

L'image ci-dessus montre l'« état de tri ». C'est un `FixedArray` qui suit tout ce qui est nécessaire pendant le tri. Chaque fois que `Array#sort` est appelé, un tel état de tri est alloué. Les entrées 4 à 7 représentent l'ensemble de pointeurs de fonction mentionné ci-dessus qui constitue un chemin rapide.

La fonction native « check » est utilisée chaque fois que nous revenons du code JavaScript utilisateur, pour vérifier si nous pouvons continuer avec le chemin rapide actuel. Elle utilise la « carte de récepteur initiale » et la « longueur de récepteur initiale » pour cela. Si le code utilisateur a modifié l'objet actuel, nous abandonnons simplement le tri, réinitialisons tous les pointeurs à leur version la plus générique et recommençons le processus de tri. Le « statut d'abandon » dans l'emplacement 8 est utilisé pour signaler cette réinitialisation.

L'entrée « compare » peut pointer vers deux fonctions natives différentes. L'une appelle une fonction de comparaison fournie par l'utilisateur, tandis que l'autre implémente la comparaison par défaut qui appelle `toString` sur les deux arguments puis effectue une comparaison lexicographique.

Le reste des champs (à l'exception de l'ID de chemin rapide) sont spécifiques à Timsort. La pile des « runs » (décrite ci-dessus) est initialisée avec une taille de 85 qui est suffisante pour trier des tableaux de longueur 2<sup>64</sup>. Le tableau temporaire est utilisé pour fusionner les « runs ». Il grandit en taille selon les besoins mais ne dépasse jamais `n/2` où `n` est la longueur de l'entrée.

### Compromis de performance

Le passage du tri du JavaScript hébergé localement à Torque implique des compromis de performance. Étant donné que `Array#sort` est écrit en Torque, c'est désormais un morceau de code compilé statiquement, ce qui signifie que nous pouvons toujours construire des chemins rapides pour certains [`ElementsKind`s](/blog/elements-kinds), mais cela ne sera jamais aussi rapide qu'une version TurboFan hautement optimisée qui peut utiliser le rétrofeedback de type. D'un autre côté, dans les cas où le code n'est pas suffisamment chaud pour justifier la compilation JIT ou où le site d'appel est mégamorphique, nous sommes bloqués avec l'interpréteur ou une version lente/générique. L'analyse, la compilation et l'optimisation éventuelle de la version JavaScript hébergée localement sont également une surcharge inutile avec l'implémentation Torque.

Bien que l'approche Torque n'entraîne pas les mêmes performances de pointe pour le tri, elle évite les chutes de performances. Le résultat est des performances de tri beaucoup plus prévisibles qu'elles ne l'étaient auparavant. N'oubliez pas que Torque est encore en évolution et qu'en plus de cibler CSA, il pourrait cibler TurboFan à l'avenir, permettant la compilation JIT de code écrit en Torque.

### Microbenchmarks

Avant de commencer avec `Array#sort`, nous avons ajouté de nombreux microbenchmarks différents pour mieux comprendre l'impact que la ré-implémentation aurait. Le premier graphique montre l'utilisation "normale" du tri de divers ElementsKind avec une fonction de comparaison fournie par l'utilisateur.

N'oubliez pas que dans ces cas, le compilateur JIT peut faire beaucoup de travail, puisque le tri est presque tout ce que nous faisons. Cela permet également au compilateur d'optimisation d'inliner la fonction de comparaison dans la version JavaScript, tandis que nous avons le surcoût de l'appel du builtin au JavaScript dans le cas Torque. Cependant, nous obtenons de meilleures performances dans presque tous les cas.

![](/_img/array-sort/micro-bench-basic.svg)

Le graphique suivant montre l'impact de Timsort lors du traitement de tableaux déjà complètement triés, ou ayant des sous-séquences déjà triées dans un sens ou dans l'autre. Le graphique utilise Quicksort comme base de référence et montre l'accélération de Timsort (jusqu'à 17× dans le cas de "DownDown" où le tableau se compose de deux séquences triées inversement). Comme on peut le voir, sauf dans le cas de données aléatoires, Timsort fonctionne mieux dans tous les autres cas, bien que nous triions des `PACKED_SMI_ELEMENTS`, où Quicksort surpassait Timsort dans le microbenchmark ci-dessus.

![](/_img/array-sort/micro-bench-presorted.svg)

### Benchmark des outils web

Le [Web Tooling Benchmark](https://github.com/v8/web-tooling-benchmark) est un ensemble de charges de travail d'outils généralement utilisés par les développeurs web tels que Babel et TypeScript. Le graphique utilise Quicksort JavaScript comme base de référence et compare l'accélération de Timsort par rapport à celle-ci. Dans presque tous les benchmarks, nous conservons les mêmes performances à l'exception de chai.

![](/_img/array-sort/web-tooling-benchmark.svg)

Le benchmark chai passe *un tiers* de son temps à l'intérieur d'une seule fonction de comparaison (un calcul de distance de chaîne). Le benchmark est le jeu de tests de chai lui-même. En raison des données, Timsort nécessite quelques comparaisons supplémentaires dans ce cas, ce qui a un impact plus important sur le temps d'exécution global, car une si grande portion de temps est passée dans cette fonction de comparaison particulière.

### Impact sur la mémoire

L'analyse des snapshots du tas V8 lors de la navigation sur une cinquantaine de sites (à la fois sur mobile et sur ordinateur de bureau) n'a montré aucune régression ou amélioration de la mémoire. D'un côté, c'est surprenant : le passage de Quicksort à Timsort a introduit le besoin d'un tableau temporaire pour la fusion des séquences, qui peut devenir beaucoup plus grand que les tableaux temporaires utilisés pour l'échantillonnage. De l'autre côté, ces tableaux temporaires sont très éphémères (uniquement pendant la durée de l'appel `sort`) et peuvent être alloués et supprimés très rapidement dans l'espace nouveau de V8.

## Conclusion

En résumé, nous nous sentons beaucoup mieux quant aux propriétés algorithmiques et au comportement de performance prévisible d'un Timsort implémenté en Torque. Timsort est disponible à partir de V8 v7.0 et Chrome 70. Bon tri !
