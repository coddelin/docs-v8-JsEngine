---
title: 'Parsing ultra-rapide, partie 2 : analyse syntaxique paresseuse'
author: 'Toon Verwaest ([@tverwaes](https://twitter.com/tverwaes)) et Marja Hölttä ([@marjakh](https://twitter.com/marjakh)), parsers plus légers'
avatars:
  - 'toon-verwaest'
  - 'marja-holtta'
date: 2019-04-15 17:03:37
tags:
  - internals
  - parsing
tweet: '1117807107972243456'
description: 'Voici la deuxième partie de notre série d’articles expliquant comment V8 analyse JavaScript aussi rapidement que possible.'
---
Voici la deuxième partie de notre série expliquant comment V8 analyse JavaScript aussi rapidement que possible. La première partie expliquait comment nous avons rendu le [scanner](/blog/scanner) de V8 rapide.

L’analyse syntaxique est l’étape où le code source est converti en une représentation intermédiaire qui sera consommée par un compilateur (dans V8, le compilateur de bytecode [Ignition](/blog/ignition-interpreter)). L’analyse et la compilation se déroulent sur le chemin critique du démarrage de la page web, et toutes les fonctions envoyées au navigateur ne sont pas immédiatement nécessaires lors du démarrage. Même si les développeurs peuvent différer ce code avec des scripts asynchrones et différés, cela n’est pas toujours possible. De plus, de nombreuses pages web incluent du code utilisé uniquement par certaines fonctionnalités qui peuvent ne pas être accessibles du tout par un utilisateur au cours de l’exécution individuelle de la page.

<!--truncate-->
Compiler du code de manière anticipée de façon inutile a des coûts réels en ressources :

- Les cycles CPU sont utilisés pour créer le code, retardant la disponibilité du code réellement nécessaire pour le démarrage.
- Les objets de code occupent de la mémoire, au moins jusqu’à ce que [le nettoyage du bytecode](/blog/v8-release-74#bytecode-flushing) décide que le code n’est pas actuellement nécessaire et permette son garbage collect.
- Le code compilé à l’instant où le script de niveau supérieur termine son exécution finit par être mis en cache sur le disque, occupant de l’espace disque.

Pour ces raisons, tous les navigateurs majeurs implémentent une _analyse syntaxique paresseuse_. Au lieu de générer un arbre syntaxique abstrait (AST) pour chaque fonction et de le compiler ensuite en bytecode, le parser peut décider de “pré-analyser” les fonctions qu’il rencontre plutôt que de les analyser complètement. Pour ce faire, il bascule vers [le pré-analyseur](https://cs.chromium.org/chromium/src/v8/src/parsing/preparser.h?l=921&rcl=e3b2feb3aade83c02e4bd2fa46965a69215cd821), une copie du parser qui fait le strict minimum nécessaire pour pouvoir, autrement, ignorer la fonction. Le pré-analyseur vérifie que les fonctions qu’il ignore sont syntaxiquement valides et produit toutes les informations nécessaires pour que les fonctions externes soient correctement compilées. Lorsqu’une fonction pré-analysée est appelée plus tard, elle est entièrement analysée et compilée à la demande.

## Allocation de variables

La principale complication de la pré-analyse est l’allocation de variables.

Pour des raisons de performance, les activations des fonctions sont gérées sur la pile de la machine. Par exemple, si une fonction `g` appelle une fonction `f` avec les arguments `1` et `2` :

```js
function f(a, b) {
  const c = a + b;
  return c;
}

function g() {
  return f(1, 2);
  // Le pointeur d’instruction de retour de `f` pointe maintenant ici
  // (car lorsque `f` retourne, il retourne ici).
}
```

D’abord le récepteur (c’est-à-dire la valeur de `this` pour `f`, qui est `globalThis` puisqu’il s’agit d’un appel de fonction en mode non strict) est empilé, suivi de la fonction appelée `f`. Ensuite, les arguments `1` et `2` sont empilés. À ce moment-là, la fonction `f` est appelée. Pour exécuter l’appel, nous sauvegardons d’abord l’état de `g` sur la pile : le “pointeur d’instruction de retour” (`rip`; le code auquel nous devons revenir) de `f` ainsi que le “pointeur de cadre” (`fp`; l’apparence de la pile au retour). Ensuite, nous entrons dans `f`, qui alloue de l’espace pour la variable locale `c`, ainsi que pour tout espace temporaire dont elle pourrait avoir besoin. Cela garantit que toute donnée utilisée par la fonction disparaît lorsque l’activation de la fonction sort de son scope : elle est simplement retirée de la pile.

![Disposition de la pile pour un appel à la fonction `f` avec les arguments `a`, `b` et la variable locale `c` allouée sur la pile.](/_img/preparser/stack-1.svg)

Le problème avec cette configuration est que les fonctions peuvent référencer des variables déclarées dans les fonctions externes. Les fonctions internes peuvent survivre à l’activation dans laquelle elles ont été créées :

```js
function make_f(d) { // ← déclaration de `d`
  return function inner(a, b) {
    const c = a + b + d; // ← référence à `d`
    return c;
  };
}

const f = make_f(10);

function g() {
  return f(1, 2);
}
```

Dans l’exemple ci-dessus, la référence de `inner` à la variable locale `d` déclarée dans `make_f` est évaluée après que `make_f` a retourné. Pour implémenter cela, les VM des langages avec des fermetures lexicales allouent les variables référencées par des fonctions internes dans le tas, dans une structure appelée “contexte”.

![Disposition de la pile pour un appel à `make_f` avec l’argument copié dans un contexte alloué sur le tas pour une utilisation ultérieure par `inner` qui capture `d`.](/_img/preparser/stack-2.svg)

Cela signifie que pour chaque variable déclarée dans une fonction, nous devons savoir si une fonction interne référence cette variable, afin de décider si elle doit être allouée sur la pile ou dans un contexte alloué sur le tas. Lorsque nous évaluons un littéral de fonction, nous allouons une fermeture qui pointe à la fois vers le code de la fonction et vers le contexte actuel : l'objet contenant les valeurs des variables auxquelles elle peut avoir besoin d'accéder.

En résumé, nous devons au moins suivre les références des variables dans le préparseur.

Cependant, si nous ne suivions que les références, nous surévaluerions quelles variables sont référencées. Une variable déclarée dans une fonction externe pourrait être masquée par une redéclaration dans une fonction interne, rendant une référence de cette fonction interne ciblant la déclaration interne et non la déclaration externe. Si nous allouions inconditionnellement la variable externe dans le contexte, les performances en souffriraient. Par conséquent, pour que l'allocation des variables fonctionne correctement avec le préparsing, nous devons nous assurer que les fonctions préparsées suivent correctement les références des variables ainsi que les déclarations.

Le code de niveau supérieur est une exception à cette règle. Le niveau supérieur d'un script est toujours alloué sur le tas, car les variables sont visibles entre les scripts. Une manière simple d'approcher une architecture bien fonctionnelle est de simplement exécuter le préparseur sans suivi des variables pour une analyse rapide des fonctions de niveau supérieur ; et d'utiliser le parseur complet pour les fonctions internes, mais en évitant de les compiler. Cela coûte plus cher que le préparsing puisque nous construisons inutilement un AST complet, mais cela fonctionne rapidement. C'est exactement ce que V8 faisait jusqu'à V8 v6.3 / Chrome 63.

## Enseigner au préparseur à gérer les variables

Suivre les déclarations et références de variables dans le préparseur est compliqué car en JavaScript, il n'est pas toujours clair dès le départ quel est le sens d'une expression partielle. Par exemple, supposons que nous avons une fonction `f` avec un paramètre `d`, qui possède une fonction interne `g` avec une expression qui semble référencer `d`.

```js
function f(d) {
  function g() {
    const a = ({ d }
```

Elle pourrait effectivement finir par référencer `d`, car les jetons que nous avons vus font partie d'une expression d'affectation par destructuration.

```js
function f(d) {
  function g() {
    const a = ({ d } = { d: 42 });
    return a;
  }
  return g;
}
```

Elle pourrait aussi finir par être une fonction fléchée avec un paramètre de destructuration `d`, auquel cas le `d` dans `f` ne serait pas référencé par `g`.

```js
function f(d) {
  function g() {
    const a = ({ d }) => d;
    return a;
  }
  return [d, g];
}
```

Initialement, notre préparseur était implémenté comme une copie autonome du parseur sans trop de partage, ce qui a fait diverger les deux parseurs avec le temps. En réécrivant le parseur et le préparseur pour qu'ils reposent sur un `ParserBase` implémentant le [modèle curieusement récurrent](https://en.wikipedia.org/wiki/Curiously_recurring_template_pattern), nous avons maximisé le partage tout en conservant les avantages de performances des copies séparées. Cela a grandement simplifié l'ajout du suivi complet des variables au préparseur, puisqu'une grande partie de l'implémentation peut être partagée entre le parseur et le préparseur.

En fait, il était incorrect d'ignorer les déclarations et références de variables même pour les fonctions de niveau supérieur. La spécification ECMAScript exige que divers types de conflits de variables soient détectés lors du premier parse du script. Par exemple, si une variable est déclarée deux fois comme une variable lexicale dans le même scope, cela est considéré comme une [erreur de syntaxe précoce](https://tc39.es/ecma262/#early-error). Puisque notre préparseur ignorait simplement les déclarations de variables, il permettait incorrectement au code de passer durant le préparsing. À l'époque, nous jugions que le gain de performances valait la violation de la spécification. Maintenant que le préparseur suit correctement les variables, cependant, nous avons éradiqué toute cette classe de violations de la spécification liées à la résolution des variables sans coût significatif pour les performances.

## Ignorer les fonctions internes

Comme mentionné précédemment, lorsqu'une fonction préparsée est appelée pour la première fois, nous la parsons complètement et compilons l'AST résultant en bytecode.

```js
// Ceci est l'étendue du niveau supérieur.
function outer() {
  // préparsé
  function inner() {
    // préparsé
  }
}

outer(); // Parse complètement et compile `outer`, mais pas `inner`.
```

La fonction pointe directement vers le contexte externe qui contient les valeurs des déclarations de variables devant être disponibles pour les fonctions internes. Pour permettre la compilation paresseuse des fonctions (et prendre en charge le débogueur), le contexte pointe vers un objet de métadonnées appelé [`ScopeInfo`](https://cs.chromium.org/chromium/src/v8/src/objects/scope-info.h?rcl=ce2242080787636827dd629ed5ee4e11a4368b9e&l=36). Les objets `ScopeInfo` décrivent quelles variables sont listées dans un contexte. Cela signifie que lors de la compilation des fonctions internes, nous pouvons calculer où résident les variables dans la chaîne de contexte.

Pour calculer si la fonction compilée paresseusement elle-même a besoin d'un contexte, nous devons cependant effectuer à nouveau la résolution des portées : nous devons savoir si les fonctions imbriquées dans la fonction compilée paresseusement font référence aux variables déclarées par la fonction paresseuse. Nous pouvons le déterminer en ré-analysant ces fonctions. C'est exactement ce que V8 faisait jusqu'à la version V8 v6.3 / Chrome 63. Cependant, ce n'est pas idéal en termes de performances, car cela rend la relation entre la taille du code source et le coût d'analyse non linéaire : nous ré-analysions les fonctions aussi souvent qu'elles étaient imbriquées. En plus de l'imbrication naturelle des programmes dynamiques, les packers JavaScript enveloppent souvent le code dans des "[Expressions de fonctions immédiatement invoquées](https://fr.wikipedia.org/wiki/Expression_de_fonction_imm%C3%A9diatement_invoqu%C3%A9e)" (IIFEs), rendant la plupart des programmes JavaScript avec plusieurs niveaux d'imbrication.

![Chaque nouvelle analyse ajoute au moins le coût d'analyse de la fonction.](/_img/preparser/parse-complexity-before.svg)

Pour éviter la surcharge de performance non linéaire, nous effectuons une résolution complète des portées même pendant la préparation. Nous stockons suffisamment de métadonnées pour pouvoir simplement _sauter_ les fonctions internes par la suite, au lieu d'avoir à les ré-analyser. Une approche consisterait à stocker les noms de variables référencés par les fonctions internes. Cela est coûteux à stocker et nécessite encore de dupliquer le travail : nous avons déjà effectué la résolution des variables pendant la préparation.

Au lieu de cela, nous sérialisons les emplacements des variables comme un tableau dense de drapeaux par variable. Lorsque nous analysons paresseusement une fonction, les variables sont recréées dans le même ordre que celui vu par le pré-analyseur, et nous pouvons simplement appliquer les métadonnées aux variables. Une fois la fonction compilée, les métadonnées d'allocation des variables ne sont plus nécessaires et peuvent être collectées par le ramasse-miettes. Étant donné que nous avons uniquement besoin de ces métadonnées pour les fonctions contenant effectivement des fonctions internes, une grande partie des fonctions n'a même pas besoin de ces métadonnées, ce qui réduit considérablement la surcharge mémoire.

![En suivant les métadonnées pour les fonctions préparées, nous pouvons complètement ignorer les fonctions internes.](/_img/preparser/parse-complexity-after.svg)

L'impact sur les performances du saut des fonctions internes est, tout comme la surcharge de leur ré-analyse, non linéaire. Certains sites hissent toutes leurs fonctions au niveau de portée supérieur. Comme leur niveau d'imbrication est toujours de 0, la surcharge est toujours de 0. Cependant, de nombreux sites modernes imbriquent réellement les fonctions en profondeur. Sur ces sites, nous avons observé des améliorations significatives lors du lancement de cette fonctionnalité dans V8 v6.3 / Chrome 63. L'avantage principal est que maintenant, peu importe la profondeur d'imbrication du code : toute fonction est au maximum préparée une fois, et entièrement analysée une fois[^1].

![Temps d'analyse sur le thread principal et hors du thread principal, avant et après le lancement de l'optimisation "saut des fonctions internes".](/_img/preparser/skipping-inner-functions.svg)

[^1]: Pour des raisons de mémoire, V8 [expurge le bytecode](/blog/v8-release-74#bytecode-flushing) lorsqu'il n'est pas utilisé pendant un certain temps. Si le code finit par être nécessaire à nouveau plus tard, nous le ré-analysons et le re-compilons. Puisque nous permettons aux métadonnées des variables de disparaître pendant la compilation, cela entraîne une ré-analyse des fonctions internes lors de la recompilation paresseuse. À ce moment-là, nous recréons les métadonnées pour ses fonctions internes, donc nous n'avons pas besoin de ré-analyser les fonctions internes de ses fonctions internes à nouveau.

## Expressions de Fonctions Possiblement Invoquées

Comme mentionné précédemment, les packers combinent souvent plusieurs modules dans un seul fichier en enveloppant le code des modules dans une fermeture qu'ils appellent immédiatement. Cela fournit une isolation aux modules, leur permettant de s'exécuter comme s'ils étaient le seul code dans le script. Ces fonctions sont essentiellement des scripts imbriqués ; les fonctions sont immédiatement appelées lors de l'exécution du script. Les packers livrent couramment des _expressions de fonctions immédiatement invoquées_ (IIFEs ; prononcé "iffies") comme des fonctions entre parenthèses : `(function(){…})()`.

Étant donné que ces fonctions sont immédiatement nécessaires pendant l'exécution du script, il n'est pas idéal de pré-analyser de telles fonctions. Lors de l'exécution au niveau supérieur du script, nous avons immédiatement besoin que la fonction soit compilée, et nous la faisons analyser et compiler entièrement. Cela signifie que l'analyse rapide que nous avons effectuée auparavant pour tenter d'accélérer le démarrage est garantie être un coût supplémentaire inutile pour le démarrage.

Pourquoi ne compilez-vous pas simplement les fonctions appelées, pourriez-vous demander ? Bien qu'il soit généralement facile pour un développeur de remarquer lorsqu'une fonction est appelée, ce n'est pas le cas pour l'analyseur. L'analyseur doit décider — avant même de commencer à analyser une fonction ! — s'il veut compiler la fonction immédiatement ou différer la compilation. Les ambiguïtés dans la syntaxe rendent difficile une simple analyse rapide jusqu'à la fin de la fonction, et le coût ressemble rapidement au coût de la pré-analyse régulière.

Pour cette raison, V8 reconnaît deux modèles simples comme _expressions de fonctions possiblement invoquées_ (PIFEs ; prononcé "piffies"), sur lesquels il analyse et compile immédiatement une fonction :

- Si une fonction est une expression de fonction entre parenthèses, c.-à-d. `(function(){…})`, nous supposons qu'elle sera appelée. Nous faisons cette supposition dès que nous voyons le début de ce modèle, c.-à-d. `(function`.
- Depuis V8 v5.7 / Chrome 57, nous détectons également le modèle `!function(){…}(),function(){…}(),function(){…}()` généré par [UglifyJS](https://github.com/mishoo/UglifyJS2). Cette détection s'enclenche dès que nous voyons `!function`, ou `,function` s'il suit immédiatement une PIFE.

Étant donné que V8 compile immédiatement les PIFEs, elles peuvent être utilisées comme des [retours d'information dirigés par le profil](https://fr.wikipedia.org/wiki/Optimisation_guid%C3%A9e_par_le_profil)[^2], informant le navigateur des fonctions nécessaires pour le démarrage.

À une époque où V8 réanalysait encore les fonctions internes, certains développeurs avaient remarqué que l’impact de l’analyse JS sur le démarrage était assez important. Le package [`optimize-js`](https://github.com/nolanlawson/optimize-js) transforme les fonctions en PIFEs sur la base d'heuristiques statiques. À l’époque de la création du package, cela avait un impact énorme sur les performances au chargement sur V8. Nous avons reproduit ces résultats en exécutant les benchmarks fournis par `optimize-js` sur V8 v6.1, en nous concentrant uniquement sur les scripts minimisés.

![L'analyse et la compilation anticipées des PIFEs entraînent un démarrage à froid et à chaud légèrement plus rapide (premier et deuxième chargement de la page, en mesurant le temps total d’analyse + compilation + exécution). Le bénéfice est beaucoup plus faible sur V8 v7.5 qu'il ne l'était sur V8 v6.1, en raison d'améliorations significatives apportées à l'analyseur.](/_img/preparser/eager-parse-compile-pife.svg)

Néanmoins, maintenant que nous ne réanalysons plus les fonctions internes et que l’analyseur est devenu beaucoup plus rapide, l’amélioration des performances obtenue grâce à `optimize-js` est fortement réduite. La configuration par défaut pour v7.5 est en fait déjà beaucoup plus rapide que la version optimisée fonctionnant sur v6.1. Même sur v7.5, il peut encore être judicieux d’utiliser les PIFEs avec parcimonie pour le code nécessaire au démarrage : nous évitons la préanalyse puisque nous apprenons rapidement que la fonction sera nécessaire.

Les résultats du benchmark `optimize-js` ne reflètent pas exactement le monde réel. Les scripts sont chargés de manière synchrone et l’ensemble du temps d’analyse + compilation est compté pour le temps de chargement. Dans un cadre réel, vous chargeriez probablement des scripts en utilisant des balises `<script>`. Cela permet au préchargeur de Chrome de découvrir le script _avant_ qu'il ne soit évalué, et de télécharger, analyser et compiler le script sans bloquer le thread principal. Tout ce que nous décidons de compiler de manière anticipée est automatiquement compilé hors du thread principal et devrait être à peine pris en compte dans le démarrage. L’exécution avec une compilation de script hors du thread principal amplifie l’impact de l’utilisation des PIFEs.

Cela a néanmoins un coût, notamment un coût en mémoire, il n’est donc pas judicieux de tout compiler de manière anticipée :

![La compilation anticipée de *tout* le JavaScript entraîne un coût mémoire important.](/_img/preparser/eager-compilation-overhead.svg)

Bien qu’ajouter des parenthèses autour des fonctions nécessaires au démarrage soit une bonne idée (par exemple, en se basant sur un profilage du démarrage), utiliser un package tel que `optimize-js` qui applique des heuristiques statiques simples n'est pas une excellente idée. Par exemple, il suppose qu'une fonction sera appelée pendant le démarrage si elle est un argument d'un appel de fonction. Cependant, si une telle fonction implémente un module entier qui n'est nécessaire que beaucoup plus tard, vous finissez par compiler trop. Une compilation trop anticipée est néfaste pour les performances : V8 sans compilation paresseuse peut considérablement aggraver le temps de chargement. De plus, certains des avantages de `optimize-js` proviennent des problèmes avec UglifyJS et d’autres outils de minimisation qui suppriment les parenthèses des PIFEs qui ne sont pas des IIFEs, supprimant ainsi des indices utiles qui pourraient avoir été appliqués par exemple aux modules de style [Universal Module Definition](https://github.com/umdjs/umd). C’est probablement un problème que les minimiseurs devraient résoudre pour obtenir les meilleures performances sur les navigateurs qui compilent les PIFEs de manière anticipée.

[^2]: Les PIFEs peuvent également être considérées comme des expressions de fonction informées par des profils.

## Conclusions

L'analyse paresseuse accélère le démarrage et réduit la surcharge mémoire des applications qui embarquent plus de code que nécessaire. Être capable de suivre correctement les déclarations et les références de variables dans le préanalyseur est nécessaire pour préanalyser à la fois correctement (selon la spécification) et rapidement. Allouer des variables dans le préanalyseur nous permet également de sérialiser les informations d'allocation de variables pour une utilisation ultérieure dans l’analyseur, de sorte que nous puissions éviter de devoir réanalyser complètement les fonctions internes, évitant ainsi un comportement d’analyse non linéaire des fonctions profondément imbriquées.

Les PIFEs que l’analyseur peut reconnaître évitent la surcharge initiale de préanalyse pour le code immédiatement nécessaire au démarrage. Une utilisation prudente basée sur des profils de PIFEs, ou une utilisation via des emballeurs, peut offrir un léger coup de pouce au démarrage à froid. Néanmoins, il faut éviter d’entourer inutilement les fonctions de parenthèses pour déclencher cette heuristique, car cela entraîne une compilation plus anticipée du code, ce qui nuit aux performances de démarrage et augmente l’utilisation de la mémoire.
