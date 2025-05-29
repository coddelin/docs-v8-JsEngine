---
title: "En dehors du web : binaires WebAssembly autonomes avec Emscripten"
author: "Alon Zakai"
avatars:
  - "alon-zakai"
date: 2019-11-21
tags:
  - WebAssembly
  - outils
description: 'Emscripten supporte désormais les fichiers Wasm autonomes, qui n'ont pas besoin de JavaScript.'
tweet: "1197547645729988608"
---
Emscripten s'est toujours concentré en priorité sur la compilation pour le web et autres environnements JavaScript comme Node.js. Mais à mesure que WebAssembly commence à être utilisé *sans* JavaScript, de nouveaux cas d'utilisation apparaissent, et nous avons travaillé sur la prise en charge de l'émission de fichiers [**Wasm autonomes**](https://github.com/emscripten-core/emscripten/wiki/WebAssembly-Standalone) à partir d'Emscripten, qui ne dépendent pas de l'environnement d'exécution JavaScript d'Emscripten ! Ce post explique pourquoi cela est intéressant.

<!--truncate-->
## Utiliser le mode autonome dans Emscripten

Tout d'abord, voyons ce que vous pouvez faire avec cette nouvelle fonctionnalité ! Similaire à [ce post](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/), commençons par un programme type "hello world" qui exporte une fonction unique pour ajouter deux nombres :

```c
// add.c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int add(int x, int y) {
  return x + y;
}
```

Nous compilerions normalement cela avec une commande comme `emcc -O3 add.c -o add.js` qui émettrait `add.js` et `add.wasm`. Cette fois, demandons à `emcc` d'émettre uniquement du Wasm :

```
emcc -O3 add.c -o add.wasm
```

Lorsque `emcc` constate que nous ne voulons que du Wasm, il le rend "autonome" — un fichier Wasm qui peut s'exécuter par lui-même autant que possible, sans aucun code d'environnement d'exécution JavaScript d'Emscripten.

En le désassemblant, il est très minimal — juste 87 octets ! Il contient la fonction évidente `add`

```lisp
(func $add (param $0 i32) (param $1 i32) (result i32)
 (i32.add
  (local.get $0)
  (local.get $1)
 )
)
```

et une fonction supplémentaire, `_start`,

```lisp
(func $_start
 (nop)
)
```

`_start` fait partie des spécifications [WASI](https://github.com/WebAssembly/WASI), et le mode autonome d'Emscripten l'émet afin que nous puissions exécuter dans des environnements WASI. (Normalement, `_start` ferait une initialisation globale, mais ici nous n'en avons tout simplement pas besoin donc elle est vide.)

### Écrire votre propre chargeur JavaScript

Un aspect pratique d'un fichier Wasm autonome comme celui-ci est que vous pouvez écrire un code JavaScript personnalisé pour le charger et l'exécuter, qui peut être très minimal selon votre cas d'utilisation. Par exemple, nous pouvons faire cela dans Node.js :

```js
// load-add.js
const binary = require('fs').readFileSync('add.wasm');

WebAssembly.instantiate(binary).then(({ instance }) => {
  console.log(instance.exports.add(40, 2));
});
```

Seulement 4 lignes ! Cela affiche `42` comme attendu. Notez que bien que cet exemple soit très simple, il existe des cas où vous n'avez simplement pas besoin de beaucoup de JavaScript et vous pourriez faire mieux que l'environnement d'exécution JavaScript par défaut d'Emscripten (qui prend en charge un ensemble d'environnements et de paramètres). Un exemple réel est dans [meshoptimizer de zeux](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js) — seulement 57 lignes, incluant la gestion de la mémoire, la croissance, etc. !

### Exécution dans des environnements Wasm

Un autre aspect intéressant des fichiers Wasm autonomes est que vous pouvez les exécuter dans des environnements Wasm comme [wasmer](https://wasmer.io), [wasmtime](https://github.com/bytecodealliance/wasmtime), ou [WAVM](https://github.com/WAVM/WAVM). Par exemple, considérons ce hello world :

```cpp
// hello.cpp
#include <stdio.h>

int main() {
  printf("Bonjour, monde!\n");
  return 0;
}
```

Nous pouvons le compiler et l'exécuter dans l'un de ces environnements :

```bash
$ emcc hello.cpp -O3 -o hello.wasm
$ wasmer run hello.wasm
Bonjour, monde!
$ wasmtime hello.wasm
Bonjour, monde!
$ wavm run hello.wasm
Bonjour, monde!
```

Emscripten utilise autant que possible les API WASI, ainsi ces programmes finissent par utiliser 100% WASI et peuvent s'exécuter dans des environnements prenant en charge WASI (voir les remarques plus tard sur les programmes nécessitant plus que WASI).

### Créer des plugins Wasm

Au-delà du web et du serveur, un domaine passionnant pour Wasm est **les plugins**. Par exemple, un éditeur d'images pourrait avoir des plugins Wasm capables d'appliquer des filtres et d'autres opérations à l'image. Pour ce type de cas d'utilisation, vous voulez un binaire Wasm autonome, comme dans les exemples ci-dessus, mais où il dispose également d'une API appropriée pour l'application embarquée.

Les plugins sont parfois liés aux bibliothèques dynamiques, car ces dernières sont une manière de les implémenter. Emscripten prend en charge les bibliothèques dynamiques avec l'option [SIDE_MODULE](https://github.com/emscripten-core/emscripten/wiki/Linking#general-dynamic-linking), et cela a été une méthode pour créer des plugins Wasm. La nouvelle option Wasm autonome décrite ici représente une amélioration à plusieurs égards : Premièrement, une bibliothèque dynamique a une mémoire relocalisable, ce qui ajoute une surcharge si vous n'en avez pas besoin (et vous n'en avez pas besoin si vous ne liez pas le Wasm avec un autre Wasm après l'avoir chargé). Deuxièmement, la sortie autonome est conçue pour fonctionner également dans les runtimes Wasm, comme mentionné précédemment.

D'accord, jusqu'ici tout va bien : Emscripten peut soit émettre du JavaScript + WebAssembly comme il l'a toujours fait, soit désormais simplement émettre uniquement du WebAssembly, ce qui vous permet de l'exécuter dans des environnements qui n'ont pas de JavaScript comme les runtimes Wasm, ou vous pouvez écrire votre propre code de chargeur JavaScript personnalisé, etc. Maintenant, parlons du contexte et des détails techniques !

## Les deux API standard de WebAssembly

WebAssembly ne peut accéder qu'aux API qu'il reçoit en tant qu'importations - la spécification principale de Wasm n'a pas de détails concrets sur les API. Au vu de la trajectoire actuelle de Wasm, il semble qu'il y aura trois catégories principales d'API que les gens importent et utilisent :

- **API Web** : C'est ce que les programmes Wasm utilisent sur le Web, ce sont les API standardisées existantes que JavaScript peut aussi utiliser. Actuellement, ces API sont appelées indirectement, via du code adaptateur JavaScript, mais à l'avenir, avec les [types d'interface](https://github.com/WebAssembly/interface-types/blob/master/proposals/interface-types/Explainer.md), elles seront appelées directement.
- **API WASI** : WASI se concentre sur la standardisation des API pour Wasm sur les serveurs.
- **Autres API** : Divers environnements personnalisés définiront leurs propres API spécifiques à l'application. Par exemple, nous avons donné l'exemple précédent d'un éditeur d'images avec des plugins Wasm qui implémentent une API pour effectuer des effets visuels. Notez qu'un plugin pourrait également accéder à des API “système”, comme une bibliothèque dynamique native, ou il pourrait être très isolé et ne pas avoir d'importations du tout (si l'environnement l'appelle directement).

WebAssembly se trouve dans la position intéressante d'avoir [deux ensembles d'API standardisées](https://www.goodreads.com/quotes/589703-the-good-thing-about-standards-is-that-there-are-so). Cela a du sens dans la mesure où l'un est destiné au Web et l'autre au serveur, et ces environnements ont des exigences différentes ; pour des raisons similaires, Node.js n'a pas d'API identiques à JavaScript sur le Web.

Cependant, il existe plus que le Web et le serveur, en particulier avec les plugins Wasm. D'une part, les plugins peuvent s'exécuter à l'intérieur d'une application qui peut être sur le Web (comme les [plugins JS](https://www.figma.com/blog/an-update-on-plugin-security/#a-technology-change)) ou hors du Web ; d'autre part, indépendamment de l'endroit où se trouve l'application hôte, un environnement de plugin n'est pas un environnement Web ni un environnement de serveur. Il n'est donc pas immédiatement évident quels ensembles d'API seront utilisés - cela peut dépendre du code porté, du runtime Wasm intégré, etc.

## Unifions autant que possible

Une manière concrète par laquelle Emscripten espère aider ici est qu'en utilisant les API WASI autant que possible, nous pouvons éviter les différences d'API **inutiles**. Comme mentionné précédemment, sur le Web, le code Emscripten accède aux API Web indirectement, via JavaScript, donc lorsque cette API JavaScript pourrait ressembler à WASI, nous supprimerions une différence d'API inutile, et le même binaire pourrait également fonctionner sur les serveurs. En d'autres termes, si Wasm veut enregistrer quelques informations, il doit faire appel à JS, comme ceci :

```js
wasm   =>   function musl_writev(..) { .. console.log(..) .. }
```

`musl_writev` est une implémentation de l'interface d'appels système Linux que [musl libc](https://www.musl-libc.org) utilise pour écrire des données dans un descripteur de fichier, et cela finit par appeler `console.log` avec les données appropriées. Le module Wasm importe et appelle `musl_writev`, ce qui définit une ABI entre le JS et le Wasm. Cette ABI est arbitraire (et en fait, Emscripten a modifié son ABI au fil du temps pour l'optimiser). Si nous remplaçons cela par une ABI qui correspond à WASI, nous obtenons ceci :

```js
wasm   =>   function __wasi_fd_write(..) { .. console.log(..) .. }
```

Ce n'est pas un grand changement, cela nécessite juste un peu de refactoring de l'ABI, et lorsqu'il s'exécute dans un environnement JS, cela importe peu. Mais maintenant le Wasm peut fonctionner sans JS puisque cette API WASI est reconnue par les runtimes WASI ! C'est ainsi que les exemples de Wasm autonome fonctionnent, juste en refactorisant Emscripten pour utiliser les API WASI.

Un autre avantage d'utiliser les API WASI avec Emscripten est que nous pouvons aider la spécification WASI en identifiant des problèmes du monde réel. Par exemple, nous avons découvert que [modifier les constantes "whence" de WASI](https://github.com/WebAssembly/WASI/pull/106) serait utile, et nous avons lancé des discussions autour de [la taille du code](https://github.com/WebAssembly/WASI/issues/109) et de [la compatibilité POSIX](https://github.com/WebAssembly/WASI/issues/122).

Le fait qu'Emscripten utilise autant que possible les API WASI est également utile, car cela permet aux utilisateurs d'utiliser un seul SDK pour cibler les environnements Web, serveur, et plugin. Emscripten n'est pas le seul SDK permettant cela, puisque la sortie du SDK WASI peut être exécutée sur le Web en utilisant la [WASI Web Polyfill](https://wasi.dev/polyfill/) ou le [wasmer-js](https://github.com/wasmerio/wasmer-js) de Wasmer, mais la sortie Web d'Emscripten est plus compacte, permettant ainsi l'utilisation d'un SDK unique sans compromettre les performances Web.

À propos, vous pouvez générer un fichier Wasm autonome depuis Emscripten avec un fichier JS optionnel en une seule commande :

```
emcc -O3 add.c -o add.js -s STANDALONE_WASM
```

Cela génère `add.js` et `add.wasm`. Le fichier Wasm est autonome, tout comme précédemment lorsque nous avons uniquement généré un fichier Wasm seul (`STANDALONE_WASM` était activé automatiquement lorsque nous avons indiqué `-o add.wasm`), mais cette fois il y a également un fichier JS qui peut le charger et l'exécuter. Le fichier JS est utile pour l'exécuter sur le web si vous ne souhaitez pas écrire votre propre JS.

## Avons-nous besoin de Wasm non autonome ?

Pourquoi le drapeau `STANDALONE_WASM` existe-t-il ? En théorie, Emscripten pourrait toujours définir `STANDALONE_WASM`, ce qui serait plus simple. Mais les fichiers Wasm autonomes ne peuvent pas dépendre du JS, ce qui présente quelques inconvénients :

- Nous ne pouvons pas réduire les noms d'importation et d'exportation Wasm, car la minification ne fonctionne que si les deux parties sont d'accord, le Wasm et ce qui le charge.
- Normalement, nous créons la mémoire Wasm en JS pour que JS puisse commencer à l'utiliser pendant le démarrage, ce qui nous permet de travailler en parallèle. Mais dans Wasm autonome, nous devons créer la mémoire dans le Wasm.
- Certaines API sont simplement plus faciles à implémenter en JS. Par exemple [`__assert_fail`](https://github.com/emscripten-core/emscripten/pull/9558), appelée lorsqu'une assertion C échoue, est normalement [implémentée en JS](https://github.com/emscripten-core/emscripten/blob/2b42a35f61f9a16600c78023391d8033740a019f/src/library.js#L1235). Cela ne prend qu'une seule ligne, et même si vous incluez les fonctions JS qu'elle appelle, la taille totale du code reste assez petite. En revanche, dans une version autonome, nous ne pouvons pas dépendre du JS, donc nous utilisons [`assert.c` de musl](https://github.com/emscripten-core/emscripten/blob/b8896d18f2163dbf2fa173694eeac71f6c90b68c/system/lib/libc/musl/src/exit/assert.c#L4). Cela utilise `fprintf`, ce qui signifie qu'il inclut un certain nombre de prises en charge `stdio` en C, y compris des éléments avec des appels indirects qui rendent difficile la suppression des fonctions inutilisées. Dans l'ensemble, beaucoup de ces détails finissent par faire une différence dans la taille totale du code.

Si vous souhaitez exécuter à la fois sur le Web et ailleurs, et que vous voulez une taille de code et des temps de démarrage 100% optimaux, vous devez faire deux versions distinctes, une avec `-s STANDALONE` et une sans. C'est très facile car il suffit de changer un drapeau !

## Différences nécessaires dans les API

Nous avons vu qu'Emscripten utilise les API WASI autant que possible pour éviter les différences **inutiles** entre les API. Y a-t-il des différences **nécessaires** ? Malheureusement, oui - certaines API WASI nécessitent des compromis. Par exemple :

- WASI ne prend pas en charge certaines fonctionnalités POSIX, comme [les autorisations de fichiers utilisateur/groupe/monde](https://github.com/WebAssembly/WASI/issues/122), ce qui fait que vous ne pouvez pas implémenter complètement un `ls` système (Linux) par exemple (voir les détails dans ce lien). La couche de système de fichiers existante d'Emscripten prend en charge certaines de ces fonctionnalités, donc si nous passons à des API WASI pour toutes les opérations sur le système de fichiers, nous perdrions [certains éléments de support POSIX](https://github.com/emscripten-core/emscripten/issues/9479#issuecomment-542815711).
- `path_open` de WASI [a un coût en taille de code](https://github.com/WebAssembly/WASI/issues/109) car il force une gestion supplémentaire des autorisations dans le Wasm lui-même. Ce code est inutile sur le web.
- WASI ne fournit pas d'[API de notification pour la croissance de la mémoire](https://github.com/WebAssembly/WASI/issues/82), et par conséquent, les runtimes JS doivent constamment vérifier si la mémoire a augmenté, et le cas échéant, mettre à jour leurs vues, à chaque importation et exportation. Pour éviter cette surcharge, Emscripten fournit une API de notification, `emscripten_notify_memory_growth`, que [vous pouvez voir implémentée en une seule ligne](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js#L10) dans le meshoptimizer de zeux que nous avons mentionné précédemment.

Avec le temps, WASI pourrait ajouter plus de support POSIX, une notification de croissance de mémoire, etc. - WASI est encore très expérimental et devrait évoluer de manière significative. Pour l'instant, pour éviter les régressions dans Emscripten, nous n'émettons pas de binaires 100% WASI si vous utilisez certaines fonctionnalités. En particulier, l'ouverture de fichiers utilise une méthode POSIX au lieu de WASI, ce qui signifie que si vous appelez `fopen`, alors le fichier Wasm résultant ne sera pas 100% WASI - cependant, si tout ce que vous faites est d'utiliser `printf`, qui fonctionne sur le `stdout` déjà ouvert, alors il sera 100% WASI, comme dans l'exemple "hello world" que nous avons vu au début, où la sortie d'Emscripten s'exécute dans les runtimes WASI.

Si cela est utile pour les utilisateurs, nous pouvons ajouter une option `PURE_WASI` qui sacrifierait la taille du code en échange d'une conformité stricte aux normes WASI, mais si ce n'est pas urgent (et la plupart des cas d'utilisation de plugins que nous avons vus jusqu'à présent n'ont pas besoin de gestion complète de fichiers) alors nous pouvons peut-être attendre que WASI s'améliore suffisamment pour qu'Emscripten puisse supprimer ces API non WASI. Ce serait le meilleur résultat, et nous travaillons vers cet objectif comme vous pouvez le voir dans les liens ci-dessus.

Cependant, même si WASI s'améliore, il est impossible d'éviter le fait que Wasm dispose de deux API standardisées comme mentionné précédemment. À l'avenir, je m'attends à ce qu'Emscripten appelle directement les API Web en utilisant les types d'interface, car cela sera plus compact que d'appeler une API JS ressemblant à WASI qui appelle ensuite une API Web (comme dans l'exemple `musl_writev` mentionné précédemment). Nous pourrions avoir un polyfill ou une couche de traduction de quelque sorte pour aider, mais nous ne voudrions pas l'utiliser inutilement, donc nous aurons besoin de compilations séparées pour les environnements Web et WASI. (C'est quelque peu regrettable; en théorie, cela aurait pu être évité si WASI était un superensemble des API Web, mais évidemment cela aurait impliqué des compromis côté serveur.)

## État actuel

Beaucoup de choses fonctionnent déjà ! Les principales limitations sont :

- **Limitations de WebAssembly** : Diverses fonctionnalités, comme les exceptions C++, setjmp et pthreads, dépendent de JavaScript en raison des limitations de Wasm, et il n'existe pas encore de bonne alternative non JS. (Emscripten pourrait commencer à en supporter certaines [en utilisant Asyncify](https://www.youtube.com/watch?v=qQOP6jqZqf8&list=PLqh1Mztq_-N2OnEXkdtF5yymcihwqG57y&index=2&t=0s), ou peut-être que nous allons simplement attendre que les [fonctionnalités natives de Wasm](https://github.com/WebAssembly/exception-handling/blob/master/proposals/Exceptions.md) arrivent dans les machines virtuelles.)
- **Limitations de WASI** : Des bibliothèques et API comme OpenGL et SDL n'ont pas encore de correspondantes dans les API WASI.

Vous pouvez **encore** utiliser tout cela en mode autonome d'Emscripten, mais la sortie contiendra des appels au code de support du runtime JS. En conséquence, ce ne sera pas du 100 % WASI (pour des raisons similaires, ces fonctionnalités ne fonctionnent pas non plus dans le SDK WASI). Ces fichiers Wasm ne fonctionneront pas dans les environnements d'exécution WASI, mais vous pouvez les utiliser sur le Web et écrire votre propre runtime JS pour eux. Vous pouvez également les utiliser comme plugins ; par exemple, un moteur de jeu pourrait avoir des plugins qui rendent en utilisant OpenGL, et le développeur les compilerait en mode autonome, puis implémenterait les importations OpenGL dans le runtime Wasm du moteur. Le mode autonome de Wasm reste utile ici car il rend la sortie aussi autonome que possible par Emscripten.

Vous pouvez également trouver des API qui **ont** un remplacement non JS que nous n'avons pas encore converti, car le travail est toujours en cours. Veuillez [soumettre des bogues](https://github.com/emscripten-core/emscripten/issues), et comme toujours, toute aide est la bienvenue !
