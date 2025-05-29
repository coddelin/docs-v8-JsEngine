---
title: 'Emscripten et le backend LLVM WebAssembly'
author: 'Alon Zakai'
avatars:
  - 'alon-zakai'
date: 2019-07-01 16:45:00
tags:
  - WebAssembly
  - outils
description: 'Emscripten passe au backend LLVM WebAssembly, ce qui permet des temps de liaison beaucoup plus rapides et de nombreux autres avantages.'
tweet: '1145704863377981445'
---
WebAssembly est normalement compilé à partir d’un langage source, ce qui signifie que les développeurs ont besoin d’*outils* pour l’utiliser. C’est pourquoi l’équipe de V8 travaille sur des projets open-source pertinents comme [LLVM](http://llvm.org/), [Emscripten](https://emscripten.org/), [Binaryen](https://github.com/WebAssembly/binaryen/) et [WABT](https://github.com/WebAssembly/wabt). Ce post décrit certains des travaux que nous avons effectués sur Emscripten et LLVM, ce qui permettra bientôt à Emscripten de passer par défaut au [backend LLVM WebAssembly](https://github.com/llvm/llvm-project/tree/main/llvm/lib/Target/WebAssembly) — veuillez le tester et signaler tout problème !

<!--truncate-->
Le backend LLVM WebAssembly est une option dans Emscripten depuis un certain temps, car nous avons travaillé sur ce backend parallèlement à son intégration dans Emscripten, et en collaboration avec d’autres membres de la communauté open-source des outils WebAssembly. Il a maintenant atteint un point où le backend WebAssembly dépasse l’ancien backend “[fastcomp](https://github.com/emscripten-core/emscripten-fastcomp/)” sur la plupart des métriques, et nous aimerions donc le rendre par défaut. Cette annonce est publiée avant cela, pour obtenir autant de tests que possible en premier.

C’est une mise à jour importante pour plusieurs raisons passionnantes :

- **Liens beaucoup plus rapides** : le backend LLVM WebAssembly, associé à [`wasm-ld`](https://lld.llvm.org/WebAssembly.html), prend en charge la compilation incrémentielle à l’aide de fichiers objets WebAssembly. Fastcomp utilisait des fichiers en bitcode LLVM IR, ce qui signifiait qu’au moment de la liaison tout l’IR devait être compilé par LLVM. C’était la principale raison des temps de liaison lents. Avec les fichiers objets WebAssembly, les fichiers `.o` contiennent déjà le WebAssembly compilé (sous une forme relogeable qui peut être liée, un peu comme la liaison native). En conséquence, l’étape de liaison peut être beaucoup, beaucoup plus rapide qu’avec fastcomp — nous verrons une mesure réelle ci-dessous avec une accélération de 7× !
- **Code plus rapide et plus petit** : nous avons beaucoup travaillé sur le backend LLVM WebAssembly ainsi que sur l’optimiseur Binaryen qu’Emscripten exécute ensuite. Le résultat est que le chemin du backend LLVM WebAssembly dépasse maintenant fastcomp à la fois en vitesse et en taille sur la plupart des benchmarks que nous suivons.
- **Prise en charge de tout LLVM IR** : Fastcomp pouvait gérer le LLVM IR émis par `clang`, mais en raison de son architecture, il échouait souvent sur d’autres sources, en particulier sur la “légalisation” de l’IR en types que fastcomp pouvait traiter. Le backend LLVM WebAssembly, quant à lui, utilise l’infrastructure commune des backends LLVM, ce qui lui permet de tout gérer.
- **Nouvelles fonctionnalités WebAssembly** : Fastcomp compile en asm.js avant d’exécuter `asm2wasm`, ce qui signifie qu’il est difficile de gérer les nouvelles fonctionnalités WebAssembly comme les appels de queue, les exceptions, SIMD, etc. Le backend WebAssembly est l’endroit naturel pour travailler sur ces fonctionnalités et nous travaillons en fait sur toutes celles mentionnées !
- **Mises à jour générales plus rapides depuis upstream** : en relation avec le point précédent, utiliser le backend WebAssembly upstream signifie que nous pouvons utiliser le dernier upstream LLVM à tout moment, ce qui signifie que nous pouvons obtenir de nouvelles fonctionnalités du langage C++ dans `clang`, de nouvelles optimisations LLVM IR, etc., dès leur mise en ligne.

## Tests

Pour tester le backend WebAssembly, utilisez simplement la [dernière version `emsdk`](https://github.com/emscripten-core/emsdk) et exécutez

```
emsdk install latest-upstream
emsdk activate latest-upstream
```

“Upstream” ici fait référence au fait que le backend LLVM WebAssembly est dans le upstream LLVM, contrairement à fastcomp. En fait, puisqu’il est en upstream, vous n’avez pas besoin d’utiliser le `emsdk` si vous construisez directement LLVM+`clang` vous-même ! (Pour utiliser une telle construction avec Emscripten, ajoutez simplement le chemin dans votre fichier `.emscripten`.)

Actuellement, utiliser `emsdk [install|activate] latest` utilise encore fastcomp. Il y a aussi “latest-fastcomp” qui fait la même chose. Lorsque nous changerons le backend par défaut, nous ferons en sorte que “latest” fasse la même chose que “latest-upstream”, et à ce moment-là “latest-fastcomp” sera le seul moyen d’obtenir fastcomp. Fastcomp reste une option tant qu’il est encore utile ; voir plus de notes à ce sujet à la fin.

## Historique

Ce sera le **troisième** backend dans Emscripten, et la **deuxième** migration. Le premier backend a été écrit en JavaScript et analysait le IR de LLVM en format texte. Cela était utile pour des expérimentations en 2010, mais présentait des inconvénients évidents, notamment le changement du format texte de LLVM et une vitesse de compilation qui n’était pas aussi rapide que souhaitée. En 2013, un nouveau backend a été écrit dans un fork de LLVM, surnommé "fastcomp". Il était conçu pour émettre du [asm.js](https://en.wikipedia.org/wiki/Asm.js), ce que l’ancien backend JS avait été modifié pour faire (mais pas très bien). Cela a résulté en une grande amélioration de la qualité du code et des temps de compilation.

C’était également un changement relativement mineur dans Emscripten. Bien qu’Emscripten soit un compilateur, le backend original et fastcomp ont toujours été une partie relativement petite du projet — bien plus de code est utilisé pour les bibliothèques système, l’intégration de la chaîne d’outils, les liaisons linguistiques, et ainsi de suite. Donc, bien que le changement de backend du compilateur soit un changement spectaculaire, il n’affecte qu’une partie du projet dans son ensemble.

## Benchmarks

### Taille du code

![Mesures de taille du code (plus bas est mieux)](/_img/emscripten-llvm-wasm/size.svg)

(Toutes les tailles ici sont normalisées sur fastcomp.) Comme vous pouvez le voir, les tailles du backend WebAssembly sont presque toujours plus petites ! La différence est plus perceptible sur les petits microbenchmarks à gauche (noms en minuscules), où les nouvelles améliorations des bibliothèques système comptent davantage. Mais il y a une réduction de taille de code même pour la plupart des macrobenchmarks à droite (noms en MAJUSCULES), qui sont des bases de code du monde réel. La seule régression dans les macrobenchmarks est LZMA, où les décisions d’intégration de LLVM plus récent diffèrent et se révèlent malheureuses.

Dans l’ensemble, les macrobenchmarks se réduisent en moyenne de **3,7 %**. Pas mal pour une mise à niveau du compilateur ! Nous observons des résultats similaires sur des bases de code du monde réel qui ne figurent pas dans la suite de tests ; par exemple, [BananaBread](https://github.com/kripken/BananaBread/), un portage du [moteur de jeu Cube 2](http://cubeengine.com/) vers le Web, se réduit de plus de **6 %**, et [Doom 3 se réduit de](http://www.continuation-labs.com/projects/d3wasm/) **15 %** !

Ces améliorations de taille (et les améliorations de vitesse que nous discuterons ensuite) sont dues à plusieurs facteurs :

- Le backend codegen de LLVM est intelligent et peut faire des choses que des backends simples comme fastcomp ne peuvent pas faire, comme [GVN](https://en.wikipedia.org/wiki/Value_numbering).
- LLVM plus récent a de meilleures optimisations IR.
- Nous avons beaucoup travaillé sur le réglage de l’optimiseur Binaryen sur la sortie du backend WebAssembly, comme mentionné précédemment.

### Vitesse

![Mesures de vitesse (plus bas est mieux)](/_img/emscripten-llvm-wasm/speed.svg)

(Les mesures sont sur V8.) Parmi les microbenchmarks, la vitesse présente un tableau mitigé — ce qui n’est pas si surprenant, puisque la plupart d’entre eux sont dominés par une seule fonction, voire une boucle, donc tout changement du code émis par Emscripten peut entraîner une optimisation chanceuse ou malheureuse par la VM. Dans l’ensemble, un nombre égal de microbenchmarks reste le même par rapport à ceux qui s’améliorent ou régressent. En examinant les macrobenchmarks plus réalistes, une fois de plus, LZMA est un cas particulier, encore une fois à cause d’une décision d’intégration malheureuse comme mentionné précédemment, mais sinon, chaque macrobenchmark s’améliore !

Le changement moyen sur les macrobenchmarks est une accélération de **3,2 %**.

### Temps de compilation

![Mesures de temps de compilation et de liaison sur BananaBread (plus bas est mieux)](/_img/emscripten-llvm-wasm/build.svg)

Les changements de temps de compilation varieront selon le projet, mais voici quelques chiffres exemples concernant BananaBread, qui est un moteur de jeu complet mais compact constitué de 112 fichiers et 95 287 lignes de code. À gauche, nous avons les temps de compilation pour l’étape de compilation, c’est-à-dire la compilation des fichiers source en fichiers objet, en utilisant l’option `-O3` par défaut du projet (tous les temps sont normalisés sur fastcomp). Comme vous pouvez le voir, l’étape de compilation prend légèrement plus de temps avec le backend WebAssembly, ce qui est logique puisque nous effectuons plus de travail à cette étape — au lieu de simplement compiler le source en bitcode comme le fait fastcomp, nous compilons également le bitcode en WebAssembly.

À droite, nous avons les chiffres pour l’étape de liaison (également normalisés sur fastcomp), c’est-à-dire la production de l’exécutable final, ici avec `-O0`, qui est adapté à une compilation incrémentale (pour une optimisation complète, vous utiliseriez probablement aussi `-O3`, voir ci-dessous). Il s’avère que la légère augmentation de l’étape de compilation en vaut la peine, car la liaison est **plus de 7 fois plus rapide** ! C’est le véritable avantage de la compilation incrémentale : la majeure partie de l’étape de liaison est juste une concaténation rapide des fichiers objet. Et si vous modifiez seulement un fichier source et recompilez, alors tout ce dont vous avez besoin est cette étape rapide de liaison, donc vous pouvez voir cette amélioration de vitesse tout le temps pendant le développement réel.

Comme mentionné ci-dessus, les changements de temps de construction varieront en fonction du projet. Dans un projet plus petit que BananaBread, l'accélération du temps de liaison peut être plus faible, tandis que dans un projet plus grand, elle peut être plus importante. Un autre facteur est les optimisations : comme mentionné ci-dessus, le test a été lié avec `-O0`, mais pour une construction de version, vous voudrez probablement `-O3`, et dans ce cas, Emscripten invoquera l'optimiseur Binaryen sur le WebAssembly final, exécutera [meta-dce](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/), et d'autres choses utiles pour la taille et la rapidité du code. Cela prend évidemment du temps supplémentaire, et cela en vaut la peine pour une construction de version — sur BananaBread, cela réduit le WebAssembly de 2,65 à 1,84 Mo, une amélioration de plus de **30%** — mais pour une construction incrémentale rapide, vous pouvez ignorer cela avec `-O0`.

## Problèmes connus

Bien que le backend LLVM WebAssembly soit généralement meilleur en termes de taille et de rapidité du code, nous avons rencontré quelques exceptions :

- [Fasta](https://github.com/emscripten-core/emscripten/blob/incoming/tests/fasta.cpp) régresse sans les [conversions flottant-vers-entier sans piège](https://github.com/WebAssembly/nontrapping-float-to-int-conversions), une nouvelle fonctionnalité de WebAssembly qui n'était pas incluse dans le MVP de WebAssembly. Le problème sous-jacent est que dans le MVP, une conversion flottant-vers-entier plantera si elle dépasse la plage des entiers valides. L'explication était que cela constitue de toute façon un comportement indéfini en C et est facile à implémenter pour les VM. Cependant, cela s'est avéré être une mauvaise correspondance avec la manière dont LLVM compile les conversions flottant-vers-entier, ce qui entraîne la nécessité de protections supplémentaires, ajoutant taille et surcharge au code. Les nouvelles opérations non piégeantes évitent cela, mais pourraient ne pas être présentes dans tous les navigateurs. Vous pouvez les utiliser en compilant les fichiers source avec `-mnontrapping-fptoint`.
- Le backend LLVM WebAssembly n'est pas seulement un backend différent de fastcomp, mais utilise également un LLVM beaucoup plus récent. Un LLVM plus récent peut prendre des décisions d'intégration différentes, qui (comme toutes les décisions d'intégration en l'absence d'optimisation guidée par profil) sont basées sur des heuristiques et peuvent finir par aider ou nuire. Un exemple spécifique que nous avons mentionné plus tôt est dans le benchmark LZMA où le LLVM plus récent finit par intégrer une fonction 5 fois d'une manière qui cause seulement des problèmes. Si vous rencontrez cela dans vos propres projets, vous pouvez construire sélectivement certains fichiers source avec `-Os` pour vous concentrer sur la taille du code, utiliser `__attribute__((noinline))`, etc.

Il peut y avoir d'autres problèmes dont nous ne sommes pas conscients et qui devraient être optimisés — merci de nous le signaler si vous en trouvez un !

## Autres changements

Il existe un petit nombre de fonctionnalités de Emscripten qui sont liées à fastcomp et/ou à asm.js, ce qui signifie qu'elles ne peuvent pas fonctionner avec le backend WebAssembly par défaut, et nous avons donc travaillé sur des alternatives.

### Sortie JavaScript

Une option de sortie non-WebAssembly reste importante dans certains cas — bien que tous les navigateurs majeurs supportent WebAssembly depuis un certain temps, il reste une longue traîne d'anciens ordinateurs, anciens téléphones, etc., qui ne supportent pas WebAssembly. De plus, à mesure que WebAssembly ajoute de nouvelles fonctionnalités, une forme de ce problème restera pertinente. Compiler en JS est une manière de garantir que vous pouvez atteindre tout le monde, même si la construction n'est pas aussi petite ou rapide que WebAssembly le serait. Avec fastcomp, nous utilisions directement la sortie asm.js à cet effet, mais avec le backend WebAssembly, quelque chose d'autre est évidemment nécessaire. Nous utilisons [`wasm2js`](https://github.com/WebAssembly/binaryen#wasm2js) de Binaryen à cet effet, qui, comme son nom l'indique, compile WebAssembly en JS.

Cela mérite probablement un article de blog complet, mais en bref, une décision clé de conception ici est qu'il n'y a pas d'intérêt à supporter asm.js désormais. asm.js peut être beaucoup plus rapide que le JS général, mais il s'avère que pratiquement tous les navigateurs qui supportent les optimisations AOT asm.js supportent WebAssembly de toute façon (en fait, Chrome optimise asm.js en le convertissant en WebAssembly en interne !). Donc, lorsque nous parlons d'une option de repli JS, autant ne pas utiliser asm.js ; en fait, c'est plus simple, nous permet de supporter plus de fonctionnalités dans WebAssembly, et cela produit également un JS beaucoup plus petit ! Ainsi, `wasm2js` ne cible pas asm.js.

Cependant, un effet secondaire de cette conception est que si vous testez une construction asm.js de fastcomp comparée à une construction JS avec le backend WebAssembly, alors l'asm.js peut être beaucoup plus rapide — si vous testez dans un navigateur moderne avec des optimisations AOT asm.js. C'est probablement le cas pour votre propre navigateur, mais pas pour les navigateurs qui auraient réellement besoin de l'option non-WebAssembly ! Pour une comparaison correcte, vous devez utiliser un navigateur sans optimisations asm.js ou avec elles désactivées. Si la sortie `wasm2js` est toujours plus lente, merci de nous le signaler !

`wasm2js` manque de certaines fonctionnalités moins utilisées comme le chargement dynamique et les threads, mais la plupart du code devrait fonctionner déjà, et il a été soigneusement testé par mutation. Pour tester la sortie JS, construisez simplement avec `-s WASM=0` pour désactiver WebAssembly. `emcc` exécute alors `wasm2js` pour vous, et si c'est une construction optimisée, il exécute également diverses optimisations utiles.

### Autres choses que vous pourriez remarquer

- Les options [Asyncify](https://github.com/emscripten-core/emscripten/wiki/Asyncify) et [Emterpreter](https://github.com/emscripten-core/emscripten/wiki/Emterpreter) fonctionnent uniquement avec fastcomp. Un remplacement [est](https://github.com/WebAssembly/binaryen/pull/2172) [en cours](https://github.com/WebAssembly/binaryen/pull/2173) [de développement](https://github.com/emscripten-core/emscripten/pull/8808) [actuellement](https://github.com/emscripten-core/emscripten/issues/8561). Nous nous attendons à ce que cela améliore éventuellement les options précédentes.
- Les bibliothèques précompilées doivent être reconstruites : si vous avez une `library.bc` qui a été construite avec fastcomp, vous devrez la reconstruire à partir du code source en utilisant une version plus récente d'Emscripten. Cela a toujours été le cas lorsque fastcomp mettait à jour LLVM vers une nouvelle version qui modifiait le format de bitcode, et le changement actuel (vers des fichiers objets WebAssembly au lieu de bitcode) a le même effet.

## Conclusion

Notre principal objectif pour le moment est de corriger les bugs liés à ce changement. Merci de tester et de signaler les problèmes !

Une fois les choses stabilisées, nous passerons le backend du compilateur par défaut au backend WebAssembly en amont. Fastcomp restera une option, comme mentionné plus tôt.

Nous aimerions éventuellement supprimer complètement fastcomp. Cela réduirait considérablement le fardeau de maintenance, nous permettrait de nous concentrer davantage sur les nouvelles fonctionnalités dans le backend WebAssembly, accélérerait les améliorations générales dans Emscripten, et apporterait d'autres avantages. Merci de nous faire part de vos tests sur vos bases de code afin que nous puissions commencer à planifier un calendrier pour la suppression de fastcomp.

### Merci

Merci à tous ceux impliqués dans le développement du backend WebAssembly de LLVM, `wasm-ld`, Binaryen, Emscripten, et les autres projets mentionnés dans cet article ! Une liste partielle de ces personnes formidables comprend : aardappel, aheejin, alexcrichton, dschuff, jfbastien, jgravelle, nwilson, sbc100, sunfish, tlively, yurydelendik.
