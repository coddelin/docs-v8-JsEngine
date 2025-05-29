---
title: "Une nouvelle façon d'apporter des langages de programmation avec ramasse-miettes efficacement à WebAssembly"
author: "Alon Zakai"
avatars: 
  - "alon-zakai"
date: 2023-11-01
tags: 
  - WebAssembly
tweet: "1720161507324076395"
---

Un article récent sur [WebAssembly Garbage Collection (WasmGC)](https://developer.chrome.com/blog/wasmgc) explique à un niveau général comment la [proposition de Garbage Collection (GC)](https://github.com/WebAssembly/gc) vise à mieux prendre en charge les langages à GC dans Wasm, ce qui est très important compte tenu de leur popularité. Dans cet article, nous entrerons dans les détails techniques sur la manière dont les langages à GC tels que Java, Kotlin, Dart, Python et C# peuvent être portés sur Wasm. Il existe en fait deux approches principales :

<!--truncate-->
- L'approche de portage **traditionnelle**, dans laquelle une implémentation existante du langage est compilée vers WasmMVP, à savoir le produit minimum viable pour WebAssembly lancé en 2017.
- L'approche de portage **WasmGC**, dans laquelle le langage est compilé en constructions GC directement dans Wasm, définies dans la récente proposition de GC.

Nous expliquerons quelles sont ces deux approches et les compromis techniques entre elles, en particulier en ce qui concerne la taille et la vitesse. Ce faisant, nous verrons que WasmGC offre plusieurs avantages majeurs mais qu'il nécessite aussi du travail nouveau tant sur les chaînes d'outils que sur les machines virtuelles (MV). Les dernières sections de cet article expliqueront ce que l'équipe V8 a fait dans ces domaines, y compris les chiffres des benchmarks. Si vous êtes intéressé par Wasm, GC, ou les deux, nous espérons que vous trouverez cela intéressant et ne manquez pas de consulter les liens vers la démonstration et les étapes de démarrage près de la fin !

## L'approche de portage “traditionnelle”

Comment les langages sont-ils généralement portés sur de nouvelles architectures ? Disons que Python souhaite fonctionner sur l'[architecture ARM](https://en.wikipedia.org/wiki/ARM_architecture_family), ou que Dart souhaite fonctionner sur l'[architecture MIPS](https://en.wikipedia.org/wiki/MIPS_architecture). L'idée générale est alors de recompiler la MV pour cette architecture. En outre, si la MV contient du code spécifique à l'architecture, comme la compilation juste-à-temps (JIT) ou en avance (AOT), vous implémentez également un backend pour JIT/AOT pour cette nouvelle architecture. Cette approche a du sens car souvent la majeure partie de la base de code peut simplement être recompilée pour chaque nouvelle architecture vers laquelle vous portez :


![Structure d'une MV portée](/_img/wasm-gc-porting/ported-vm.svg "À gauche, code principal d'exécution incluant un parser, ramasse-miettes, optimiseur, support bibliothécaire, et plus encore ; à droite, code backend distinct pour x64, ARM, etc.")

Dans cette figure, le parser, le support bibliothécaire, le ramasse-miettes, l'optimiseur, etc., sont tous partagés entre toutes les architectures dans l'exécution principale. Porter vers une nouvelle architecture ne nécessite qu'un nouveau backend pour celle-ci, ce qui constitue une quantité de code relativement faible.

Wasm est une cible de compilation de bas niveau et il n'est donc pas surprenant que l'approche de portage traditionnelle puisse être utilisée. Depuis les débuts de Wasm, nous avons vu que cela fonctionne bien dans de nombreux cas concrets, comme [Pyodide pour Python](https://pyodide.org/en/stable/) et [Blazor pour C#](https://dotnet.microsoft.com/en-us/apps/aspnet/web-apps/blazor) (notez que Blazor prend en charge à la fois la compilation [AOT](https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly?view=aspnetcore-7.0#ahead-of-time-aot-compilation) et [JIT](https://github.com/dotnet/runtime/blob/main/docs/design/mono/jiterpreter.md), ce qui en fait un bon exemple de tout ce qui précède). Dans tous ces cas, une exécution pour le langage est compilée en WasmMVP comme n'importe quel autre programme compilé en Wasm, et le résultat utilise donc la mémoire linéaire, les tables, les fonctions, etc., de WasmMVP.

Comme mentionné précédemment, c'est ainsi que les langages sont généralement portés sur de nouvelles architectures, donc cela a beaucoup de sens pour la raison habituelle que vous pouvez réutiliser presque tout le code existant de la MV, y compris les implémentations de langage et les optimisations. Il s'avère, cependant, qu'il existe plusieurs inconvénients spécifiques à Wasm pour cette approche, et c'est là que WasmGC peut être utile.

## L'approche de portage WasmGC

En bref, la proposition de GC pour WebAssembly (“WasmGC”) vous permet de définir des types struct et array et d'effectuer des opérations telles que créer des instances de ceux-ci, lire et écrire dans des champs, effectuer des cast entre types, etc. (pour plus de détails, voir l'[aperçu de la proposition](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Overview.md)). Ces objets sont gérés par l'implémentation propre de GC de la MV de Wasm, ce qui constitue la principale différence entre cette approche et l'approche de portage traditionnelle.

Il peut être utile de le penser ainsi : _Si l'approche traditionnelle de portage est la manière de porter un langage vers une **architecture**, alors l'approche WasmGC est très similaire à la manière de porter un langage vers une **VM**_. Par exemple, si vous voulez porter Java vers JavaScript, vous pouvez utiliser un compilateur comme [J2CL](https://j2cl.io) qui représente les objets Java sous forme d’objets JavaScript, lesquels sont ensuite gérés par la VM JavaScript comme tous les autres. Porter des langages vers des VM existantes est une technique très utile, comme le montre la multitude de langages qui se compilent en [JavaScript](https://gist.github.com/matthiasak/c3c9c40d0f98ca91def1), [la JVM](https://fr.wikipedia.org/wiki/Liste_de_langages_compilant_pour_la_JVM) et [le CLR](https://fr.wikipedia.org/wiki/Common_Language_Runtime#Langages_pour_le_CLI).

Cette métaphore architecture/VM n'est pas exacte, en particulier parce que WasmGC vise à être plus bas niveau que les autres VM mentionnées au dernier paragraphe. Cependant, WasmGC définit des structures et des tableaux gérés par la VM ainsi qu’un système de typage pour décrire leurs formes et relations, et le portage vers WasmGC consiste à représenter les constructions de votre langage avec ces primitives ; cela est certainement plus haut niveau qu’un portage traditionnel vers WasmMVP (qui abaisse tout en octets non typés en mémoire linéaire). Ainsi, WasmGC est assez similaire aux portages de langages vers des VM, et il partage les avantages de tels portages, en particulier une bonne intégration avec la VM cible et la réutilisation de ses optimisations.

## Comparaison des deux approches

Maintenant que nous avons une idée des deux approches de portage pour les langages à GC, voyons comment elles se comparent.

### Expédier du code de gestion mémoire

En pratique, une grande partie du code Wasm s'exécute dans une VM qui dispose déjà d'un ramasse-miettes, ce qui est le cas sur le Web, ainsi que dans des environnements d’exécution comme [Node.js](https://nodejs.org/), [workerd](https://github.com/cloudflare/workerd), [Deno](https://deno.com/) et [Bun](https://bun.sh/). Dans de tels environnements, incorporer une implémentation GC ajoute une taille inutile au binaire Wasm. En fait, il ne s’agit pas seulement d’un problème avec les langages à GC dans WasmMVP, mais aussi avec les langages utilisant une mémoire linéaire comme C, C++ et Rust, puisque le code dans ces langages effectuant une allocation non triviale finit par inclure `malloc/free` pour gérer la mémoire linéaire, ce qui nécessite plusieurs kilo-octets de code. Par exemple, `dlmalloc` nécessite 6 Ko, et même un malloc qui privilégie la taille à la vitesse comme [`emmalloc`](https://groups.google.com/g/emscripten-discuss/c/SCZMkfk8hyk/m/yDdZ8Db3AwAJ) prend plus de 1 Ko. WasmGC, en revanche, gère automatiquement la mémoire pour nous via la VM, nous n'avons donc besoin d'aucun code de gestion mémoire dans le Wasm—ni GC ni `malloc/free`. Dans [l'article mentionné précédemment sur WasmGC](https://developer.chrome.com/blog/wasmgc), la taille du benchmark `fannkuch` a été mesurée et WasmGC était beaucoup plus petit que C ou Rust—**2,3** Ko contre **6,1-9,6** Ko—pour précisément cette raison.

### Collection des cycles

Dans les navigateurs, Wasm interagit souvent avec JavaScript (et à travers JavaScript, les API Web), mais dans WasmMVP (et même avec la proposition [types de référence](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md)), il n’y a pas moyen d'avoir des liens bidirectionnels entre Wasm et JS qui permettent de collecter les cycles de manière fine. Les liens vers les objets JS ne peuvent être placés que dans la table Wasm, et les liens vers Wasm ne peuvent faire référence qu’à l’ensemble de l’instance Wasm sous forme d'un seul gros objet, comme suit :


![Cycles entre JS et un module Wasm complet](/_img/wasm-gc-porting/cycle2.svg "Les objets JS individuels font référence à une instance Wasm globale unique, et non pas à des objets individuels à l'intérieur de celle-ci.")

Cela n’est pas suffisant pour collecter efficacement des cycles spécifiques d’objets lorsque certains se trouvent dans la VM compilée et d’autres dans JavaScript. Avec WasmGC, en revanche, nous définissons des objets Wasm que la VM connaît, et ainsi nous pouvons avoir des références correctes entre Wasm et JavaScript et vice versa :

![Cycles entre JS et les objets WasmGC](/_img/wasm-gc-porting/cycle3.svg "JS et Wasm avec des liens entre eux.")

### Références GC sur la pile

Les langages à GC doivent connaître les références sur la pile, c’est-à-dire celles provenant de variables locales dans une portée d'appel, car de telles références peuvent être les seules à maintenir un objet en vie. Dans un portage traditionnel d'un langage à GC, cela pose problème parce que le sandboxing de Wasm empêche les programmes d’inspecter leur propre pile. Il existe des solutions pour les portages traditionnels, comme une pile parallèle ([qui peut être implémentée automatiquement](https://github.com/WebAssembly/binaryen/blob/main/src/passes/SpillPointers.cpp)) ou collecter les déchets uniquement lorsque rien ne se trouve sur la pile (ce qui est le cas entre les tours de la boucle des événements JavaScript). Une addition potentielle future qui pourrait soutenir les portages traditionnels serait [le support de la numérisation de la pile](https://github.com/WebAssembly/design/issues/1459) dans Wasm. À l’heure actuelle, seul WasmGC peut gérer les références de pile sans surcharge, et il le fait de manière entièrement automatique puisque la VM Wasm est responsable du GC.

### Efficacité du GC

Un problème connexe est l'efficacité d'exécution d'un GC. Les deux approches de portage présentent des avantages potentiels ici. Un portage traditionnel peut réutiliser des optimisations dans une VM existante qui peuvent être adaptées à un langage particulier, comme un accent important sur l'optimisation des pointeurs internes ou des objets de courte durée. Un portage WasmGC qui s'exécute sur le Web, en revanche, a l'avantage de réutiliser tout le travail qui a été réalisé pour rendre le GC de JavaScript rapide, y compris des techniques comme [GC générationnel](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Generational_GC_(ephemeral_GC)), [collection incrémentale](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Stop-the-world_vs._incremental_vs._concurrent), etc. WasmGC laisse également le GC à la VM, ce qui simplifie des choses comme les barrières d'écriture efficaces.

Un autre avantage de WasmGC est que le GC peut être conscient de choses comme la pression de mémoire et peut ajuster la taille de son tas et la fréquence de collection en conséquence, comme les VM JavaScript le font déjà sur le Web.

### Fragmentation mémoire

Au fil du temps, et en particulier dans les programmes de longue durée, les opérations `malloc/free` sur la mémoire linéaire WasmMVP peuvent causer *fragmentation*. Imaginez que nous avons un total de 2 Mo de mémoire et que nous avons, juste au milieu, une petite allocation existante de seulement quelques octets. Dans des langages comme C, C++ et Rust, il est impossible de déplacer une allocation arbitraire en temps réel, et nous avons donc presque 1 Mo à gauche de cette allocation et presque 1 Mo à droite. Mais ce sont deux fragments distincts, et ainsi, si nous essayons d'allouer 1,5 Mo, nous échouerons, même si nous disposons de cette quantité de mémoire non allouée au total:


![](/_img/wasm-gc-porting/fragment1.svg "Une mémoire linéaire avec une petite allocation gênante juste au milieu, divisant l'espace libre en deux moitiés.")

Une telle fragmentation peut forcer un module Wasm à augmenter sa mémoire plus souvent, ce qui [ajoute des surcharges et peut entraîner des erreurs de mémoire insuffisante](https://github.com/WebAssembly/design/issues/1397); [des améliorations](https://github.com/WebAssembly/design/issues/1439) sont en cours de conception, mais c'est un problème complexe. C'est un problème dans tous les programmes WasmMVP, y compris les portages traditionnels des langages de GC (notez que les objets de GC eux-mêmes peuvent être mobiles, mais pas les parties de l'exécution elle-même). WasmGC, en revanche, évite ce problème car la mémoire est entièrement gérée par la VM, qui peut les déplacer pour compacter le tas de GC et éviter la fragmentation.

### Intégration des outils de développement

Dans un portage traditionnel vers WasmMVP, les objets sont placés en mémoire linéaire, ce qui rend difficile pour les outils de développement de fournir des informations utiles, car ces outils ne voient que des octets sans informations de type de haut niveau. Dans WasmGC, en revanche, la VM gère les objets GC, permettant une meilleure intégration. Par exemple, dans Chrome, vous pouvez utiliser le profiler de tas pour mesurer l'utilisation de la mémoire d'un programme WasmGC:


![Code WasmGC exécuté dans le profiler de tas de Chrome](/_img/wasm-gc-porting/devtools.png)

La figure ci-dessus montre l'onglet Mémoire dans Chrome DevTools, où nous avons un instantané de tas d'une page qui a exécuté du code WasmGC qui a créé 1 001 petits objets dans une [liste chaînée](https://gist.github.com/kripken/5cd3e18b6de41c559d590e44252eafff). Vous pouvez voir le nom du type de l'objet, `$Node`, et le champ `$next` qui se réfère à l'objet suivant dans la liste. Toutes les informations habituelles sur l'instantané de tas sont présentes, comme le nombre d'objets, la taille superficielle, la taille retenue, etc., nous permettant de voir facilement combien de mémoire est réellement utilisée par les objets WasmGC. D'autres fonctionnalités de Chrome DevTools comme le débogueur fonctionnent également sur les objets WasmGC.

### Sémantique du langage

Lorsque vous recompilez une VM dans un portage traditionnel, vous obtenez exactement le langage que vous attendez, puisque vous exécutez du code familier qui implémente ce langage. C'est un avantage majeur! En comparaison, avec un portage WasmGC, vous pouvez envisager des compromis en matière de sémantique en échange d'efficacité. Cela s'explique par le fait qu'avec WasmGC, nous définissons de nouveaux types de GC — structures et tableaux — et les compilons. En conséquence, nous ne pouvons pas simplement compiler une VM écrite en C, C++, Rust ou des langages similaires sous cette forme, puisque ceux-ci ne se compilent qu'en mémoire linéaire, et donc WasmGC ne peut pas aider avec la grande majorité des bases de code VM existantes. Au lieu de cela, dans un portage WasmGC, vous écrivez généralement un nouveau code qui transforme les constructions de votre langage en primitives WasmGC. Et il existe plusieurs façons de réaliser cette transformation, avec des compromis différents.

Que des compromis soient nécessaires ou non dépend de la manière dont les constructions d'un langage particulier peuvent être implémentées dans WasmGC. Par exemple, les champs des structures WasmGC ont des indices et types fixes, donc un langage qui souhaite accéder aux champs de manière plus dynamique [peut rencontrer des défis](https://github.com/WebAssembly/gc/issues/397); il existe plusieurs façons de contourner cela, et dans cet espace de solutions, certaines options peuvent être plus simples ou rapides mais ne pas soutenir la sémantique complète d'origine du langage. (WasmGC a également d'autres limitations actuelles, par exemple, il lui manque des [pointeurs internes](https://go.dev/blog/ismmkeynote); au fil du temps, ces aspects devraient [s'améliorer](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md).)

Comme nous l'avons mentionné, compiler en WasmGC revient à compiler pour une machine virtuelle existante, et il existe de nombreux exemples de compromis qui ont du sens dans de tels ports. Par exemple, [les nombres de dart2js (Dart compilé en JavaScript) se comportent différemment que dans la machine virtuelle Dart](https://dart.dev/guides/language/numbers), et [les chaînes de caractères d'IronPython (Python compilé pour .NET) se comportent comme des chaînes C#](https://nedbatchelder.com/blog/201703/ironpython_is_weird.html). En conséquence, tous les programmes d'un langage ne peuvent pas fonctionner dans de tels ports, mais il existe de bonnes raisons pour ces choix : implémenter les nombres dart2js comme des nombres JavaScript permet aux machines virtuelles de les optimiser efficacement, et utiliser des chaînes .NET dans IronPython signifie que vous pouvez passer ces chaînes à d'autres codes .NET sans surcharge.

Bien que des compromis puissent être nécessaires dans les ports WasmGC, WasmGC présente également certains avantages en tant que cible de compilation par rapport à JavaScript en particulier. Par exemple, bien que dart2js ait les limitations numériques que nous venons de mentionner, [dart2wasm](https://flutter.dev/wasm) (Dart compilé en WasmGC) se comporte exactement comme il le devrait, sans compromis (ce qui est possible car Wasm a des représentations efficaces pour les types numériques requis par Dart).

Pourquoi cela ne pose-t-il pas problème pour les ports traditionnels ? Tout simplement parce qu'ils recompile une machine virtuelle existante en mémoire linéaire, où les objets sont stockés en octets non typés, ce qui est à un niveau inférieur à WasmGC. Lorsque vous n'avez que des octets non typés, vous avez beaucoup plus de flexibilité pour effectuer toutes sortes d'astuces de bas niveau (et potentiellement dangereuses), et en recompilant une machine virtuelle existante, vous obtenez toutes les astuces que cette machine virtuelle a dans sa manche.

### Efforts pour la chaîne d'outils

Comme nous l'avons mentionné dans la sous-section précédente, un port WasmGC ne peut pas simplement recompiler une machine virtuelle existante. Vous pouvez peut-être réutiliser certains codes (tels que la logique de l'analyseur et les optimisations AOT, car ils ne s'intègrent pas avec le GC au moment de l'exécution), mais en général, les ports WasmGC nécessitent une quantité substantielle de nouveau code.

En comparaison, les ports traditionnels vers WasmMVP peuvent être plus simples et plus rapides : par exemple, vous pouvez compiler la machine virtuelle Lua (écrite en C) vers Wasm en quelques minutes seulement. Un port WasmGC de Lua, en revanche, nécessiterait plus d'efforts car vous devriez écrire du code pour abaisser les constructions de Lua en structures et tableaux WasmGC, et vous devriez décider de la manière de le faire concrètement dans les contraintes spécifiques du système de types WasmGC.

Un effort accru pour la chaîne d'outils est donc un inconvénient important du portage vers WasmGC. Cependant, compte tenu de tous les avantages que nous avons mentionnés précédemment, nous pensons que WasmGC reste très attrayant ! La situation idéale serait celle dans laquelle le système de types WasmGC pourrait prendre en charge efficacement tous les langages, et où tous les langages se donnent la peine d'implémenter un port WasmGC. La première partie de cela sera facilitée par [les ajouts futurs au système de types WasmGC](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md), et pour la seconde, nous pouvons réduire le travail impliqué dans les ports WasmGC en partageant l'effort du côté de la chaîne d'outils autant que possible. Heureusement, il s'avère que WasmGC rend très pratique le partage du travail sur la chaîne d'outils, ce que nous verrons dans la prochaine section.

## Optimiser WasmGC

Nous avons déjà mentionné que les ports WasmGC présentent des avantages potentiels en termes de vitesse, tels que l'utilisation de moins de mémoire et la réutilisation des optimisations dans le GC hôte. Dans cette section, nous allons montrer d'autres avantages intéressants d'optimisation de WasmGC par rapport à WasmMVP, qui peuvent avoir un impact important sur la manière dont les ports WasmGC sont conçus et sur la rapidité des résultats finaux.

La question clé ici est que *WasmGC est plus haut niveau que WasmMVP*. Pour comprendre cela, rappelez-vous que nous avons déjà dit qu'un port traditionnel vers WasmMVP ressemble à un portage vers une nouvelle architecture, tandis qu'un port WasmGC ressemble à un portage vers une nouvelle machine virtuelle, et les machines virtuelles sont bien sûr des abstractions de plus haut niveau par rapport aux architectures — et les représentations de plus haut niveau sont souvent plus optimisables. Nous pouvons peut-être voir cela plus clairement avec un exemple concret en pseudocode :

```csharp
func foo() {
  let x = allocate<T>(); // Allouer un objet GC.
  x.val = 10;            // Attribuer une valeur de 10 à un champ.
  let y = allocate<T>(); // Allouer un autre objet.
  y.val = x.val;         // Ceci doit être 10.
  return y.val;          // Ceci doit également être 10.
}
```

Comme les commentaires l'indiquent, `x.val` contiendra `10`, tout comme `y.val`, donc le retour final est également `10`, et l'optimiseur peut même éliminer les allocations, ce qui donne ceci :

```csharp
func foo() {
  return 10;
}
```

Super ! Malheureusement, cependant, cela n'est pas possible dans WasmMVP, car chaque allocation se transforme en un appel à `malloc`, une fonction large et complexe dans Wasm qui a des effets secondaires sur la mémoire linéaire. En raison de ces effets secondaires, l'optimiseur doit supposer que la deuxième allocation (pour `y`) pourrait modifier `x.val`, qui réside également dans la mémoire linéaire. La gestion de la mémoire est complexe, et lorsqu'on la met en œuvre à l'intérieur de Wasm à un bas niveau, nos options d'optimisation sont limitées.

En revanche, dans WasmGC, nous opérons à un niveau supérieur : chaque allocation exécute l'instruction `struct.new`, une opération de machine virtuelle que nous pouvons réellement analyser, et un optimiseur peut également suivre les références pour conclure que `x.val` est écrit exactement une fois avec la valeur `10`. En conséquence, nous pouvons optimiser cette fonction pour un simple retour de `10`, comme prévu !

Au-delà des allocations, d'autres éléments ajoutés par WasmGC incluent des pointeurs de fonction explicites (`ref.func`) et des appels qui les utilisent (`call_ref`), des types sur les champs de structures et de tableaux (contrairement à la mémoire linéaire non typée), et plus encore. En conséquence, WasmGC est une représentation intermédiaire (IR) de plus haut niveau que WasmMVP, et bien plus optimisable.

Si WasmMVP a une optimisabilité limitée, pourquoi est-il aussi rapide qu'il l'est ? Wasm, après tout, peut fonctionner presque à pleine vitesse native. Cela s'explique par le fait que WasmMVP est généralement le résultat d'un compilateur optimisant puissant comme LLVM. LLVM IR, comme WasmGC et contrairement à WasmMVP, possède une représentation spéciale pour les allocations, etc., donc LLVM peut optimiser les éléments que nous avons discutés. La conception de WasmMVP repose sur le fait que la plupart des optimisations se produisent au niveau de la chaîne d'outils *avant* Wasm, et les machines virtuelles Wasm ne réalisent que le « dernier kilomètre » d'optimisation (des choses comme l'allocation de registres).

WasmGC peut-il adopter un modèle de chaîne d'outils similaire à WasmMVP, et en particulier utiliser LLVM ? Malheureusement, non, car LLVM ne prend pas en charge WasmGC (un certain degré de prise en charge [a été exploré](https://github.com/Igalia/ref-cpp), mais il est difficile d'imaginer comment un support complet pourrait fonctionner). De plus, de nombreux langages supportant le GC n'utilisent pas LLVM – il existe une grande variété de chaînes d'outils de compilation dans cet espace. Nous avons donc besoin de quelque chose d'autre pour WasmGC.

Heureusement, comme nous l'avons mentionné, WasmGC est très optimisable, et cela ouvre des nouvelles options. Voici une façon de le considérer :

![Workflows des chaînes d'outils WasmMVP et WasmGC](/_img/wasm-gc-porting/workflows1.svg)

Les workflows WasmMVP et WasmGC commencent tous deux par les deux mêmes boîtes à gauche : nous débutons avec le code source qui est traité et optimisé de manière spécifique au langage (chaque langage connaît le mieux ses propres caractéristiques). Une différence apparaît alors : pour WasmMVP, nous devons effectuer des optimisations à usage général avant de passer à Wasm, tandis que pour WasmGC, nous avons la possibilité de passer d'abord à Wasm puis d'optimiser par la suite. Cela est important car il y a un grand avantage à optimiser après le passage à un niveau inférieur : ainsi, nous pouvons partager le code de la chaîne d'outils pour les optimisations à usage général entre tous les langages qui se compilent en WasmGC. La figure suivante montre à quoi cela ressemble :


![Plusieurs chaînes d'outils WasmGC sont optimisées par l'optimiseur Binaryen](/_img/wasm-gc-porting/workflows2.svg "Plusieurs langages à gauche se compilent en WasmGC au centre, et tout cela aboutit à l'optimiseur Binaryen (wasm-opt).")

Puisque nous pouvons effectuer des optimisations générales *après* la compilation en WasmGC, un optimiseur Wasm-à-Wasm peut aider toutes les chaînes d'outils de compilation WasmGC. Pour cette raison, l'équipe V8 a investi dans WasmGC dans [Binaryen](https://github.com/WebAssembly/binaryen/), que toutes les chaînes d'outils peuvent utiliser comme outil en ligne de commande `wasm-opt`. Nous nous concentrerons là-dessus dans la sous-section suivante.

### Optimisations de la chaîne d'outils

[Binaryen](https://github.com/WebAssembly/binaryen/), le projet d'optimisation pour la chaîne d'outils WebAssembly, disposait déjà d'une [large gamme d'optimisations](https://www.youtube.com/watch?v=_lLqZR4ufSI) pour le contenu WasmMVP, comme l'inlining, la propagation constante, l'élimination du code mort, etc., dont presque toutes s'appliquent également à WasmGC. Cependant, comme nous l'avons mentionné précédemment, WasmGC nous permet de réaliser beaucoup plus d'optimisations que WasmMVP, et nous avons en conséquence écrit de nombreuses nouvelles optimisations :

- [Analyse des évasions](https://github.com/WebAssembly/binaryen/blob/main/src/passes/Heap2Local.cpp) pour déplacer des allocations du tas vers des variables locales.
- [Dévirtualisation](https://github.com/WebAssembly/binaryen/blob/main/src/passes/ConstantFieldPropagation.cpp) pour convertir les appels indirects en appels directs (qui peuvent ensuite être intégrés, potentiellement).
- [Élimination plus puissante du code mort global](https://github.com/WebAssembly/binaryen/pull/4621).
- [Analyse complète des flux en fonction du type au niveau du programme (GUFA)](https://github.com/WebAssembly/binaryen/pull/4598).
- [Optimisations de type `cast`](https://github.com/WebAssembly/binaryen/blob/main/src/passes/OptimizeCasts.cpp), telles que la suppression des casts redondants et leur déplacement à des emplacements antérieurs.
- [Élagage des types](https://github.com/WebAssembly/binaryen/blob/main/src/passes/GlobalTypeOptimization.cpp).
- [Fusion des types](https://github.com/WebAssembly/binaryen/blob/main/src/passes/TypeMerging.cpp).
- Raffinement des types (pour [les variables locales](https://github.com/WebAssembly/binaryen/blob/main/src/passes/LocalSubtyping.cpp), [les variables globales](https://github.com/WebAssembly/binaryen/blob/main/src/passes/GlobalRefining.cpp), [les champs](https://github.com/WebAssembly/binaryen/blob/main/src/passes/TypeRefining.cpp) et [les signatures](https://github.com/WebAssembly/binaryen/blob/main/src/passes/SignatureRefining.cpp)).

C'est juste une liste rapide de certains des travaux que nous avons réalisés. Pour en savoir plus sur les nouvelles optimisations GC de Binaryen et comment les utiliser, consultez les [documents Binaryen](https://github.com/WebAssembly/binaryen/wiki/GC-Optimization-Guidebook).

Pour mesurer l'efficacité de toutes ces optimisations dans Binaryen, regardons les performances de Java avec et sans `wasm-opt`, à partir des résultats du compilateur [J2Wasm](https://github.com/google/j2cl/tree/master/samples/wasm) qui compile Java en WasmGC :

![Performances Java avec et sans wasm-opt](/_img/wasm-gc-porting/benchmark1.svg "Benchmarks Box2D, DeltaBlue, RayTrace et Richards, tous montrant une amélioration avec wasm-opt.")

Ici, « sans wasm-opt » signifie que nous ne réalisons pas les optimisations de Binaryen, mais nous optimisons tout de même dans la machine virtuelle et dans le compilateur J2Wasm. Comme le montre la figure, `wasm-opt` fournit une accélération significative pour chacun de ces benchmarks, les rendant en moyenne **1.9×** plus rapides.

En résumé, `wasm-opt` peut être utilisé par n'importe quelle chaîne d'outils qui compile en WasmGC et évite la nécessité de réimplémenter des optimisations générales dans chacune. Et, à mesure que nous continuons à améliorer les optimisations de Binaryen, cela bénéficiera à toutes les chaînes d'outils qui utilisent `wasm-opt`, tout comme les améliorations de LLVM profitent à toutes les langues qui compilent en WasmMVP en utilisant LLVM.

Les optimisations de chaînes d'outils ne sont qu'une partie de l'équation. Comme nous le verrons ensuite, les optimisations dans les machines virtuelles Wasm sont également absolument cruciales.

### Optimisations dans V8

Comme nous l'avons mentionné, WasmGC est plus optimisable que WasmMVP, et non seulement les chaînes d'outils peuvent en bénéficier mais aussi les machines virtuelles. Et cela s'avère important car les langages avec GC sont différents des langages qui compilent en WasmMVP. Prenons l'exemple de l'inlining, qui est l'une des optimisations les plus importantes : les langages tels que C, C++ et Rust effectuent l'inlining au moment de la compilation, tandis que les langages avec GC tels que Java et Dart exécutent généralement dans une machine virtuelle qui effectue l'inlining et optimise au moment de l'exécution. Ce modèle de performance a influencé à la fois la conception des langages et la manière dont les développeurs écrivent du code dans les langages avec GC.

Par exemple, dans un langage comme Java, tous les appels commencent comme indirects (une classe enfant peut surcharger une fonction parent, même lorsqu'on appelle un enfant en utilisant une référence de type parent). Nous en tirons profit chaque fois que la chaîne d'outils peut transformer un appel indirect en appel direct, mais dans la pratique, les modèles de code dans des programmes Java réels ont souvent des chemins qui comportent réellement de nombreux appels indirects, ou du moins des appels qui ne peuvent pas être statiquement déduits comme directs. Pour bien gérer ces cas, nous avons implémenté l'**inlining spéculatif** dans V8, c'est-à-dire que les appels indirects sont notés lorsqu'ils se produisent au moment de l'exécution, et si nous constatons qu'un site d'appel a un comportement assez simple (peu de cibles d'appel), alors nous effectuons un inlining avec des vérifications de garde appropriées, ce qui se rapproche de la manière dont Java est normalement optimisé, plutôt que de laisser ces aspects entièrement à la chaîne d'outils.

Les données du monde réel valident cette approche. Nous avons mesuré la performance sur le moteur de calcul de Google Sheets, qui est une base de code Java utilisée pour calculer des formules de tableur, et qui jusqu'à présent a été compilée en JavaScript en utilisant [J2CL](https://j2cl.io). L'équipe V8 a collaboré avec Sheets et J2CL pour porter ce code vers WasmGC, à la fois pour les bénéfices de performance attendus pour Sheets, et pour fournir des retours concrets dans le cadre du processus de spécification de WasmGC. En examinant les performances, il s'avère que l'inlining spéculatif est l'optimisation individuelle la plus significative que nous ayons implémentée pour WasmGC dans V8, comme le montre le graphique suivant :


![Performance de Java avec différentes optimisations de V8](/_img/wasm-gc-porting/benchmark2.svg "Latence de WasmGC sans opt, avec d'autres opts, avec inlining spéculatif, et avec inlining spéculatif + autres opts. La plus grande amélioration de loin est d'ajouter l'inlining spéculatif.")

Ici, les “autres opts” signifient des optimisations en dehors de l'inlining spéculatif que nous pouvions désactiver à des fins de mesure, ce qui inclut : l'élimination des charges, les optimisations basées sur les types, l'élimination des branches, le pliage de constantes, l'analyse d'échappement et l'élimination des sous-expressions communes. "Sans opt" signifie que nous avons désactivé toutes celles-ci ainsi que l'inlining spéculatif (mais il existe d'autres optimisations dans V8 que nous ne pouvons pas facilement désactiver ; pour cette raison, les chiffres ici ne sont qu'une approximation). L'amélioration très importante due à l'inlining spéculatif—environ une accélération de **30%** (!)—comparée à toutes les autres optimisations ensemble montre à quel point l'inlining est important, du moins dans le cas du Java compilé.

En dehors de l'inlining spéculatif, WasmGC s'appuie sur le support existant de Wasm dans V8, ce qui signifie qu'il profite de la même chaîne d'optimisation, allocation de registres, gestion des tiers, etc. En plus de tout cela, des aspects spécifiques de WasmGC peuvent tirer parti d'optimisations supplémentaires, la plus évidente étant d'optimiser les nouvelles instructions que WasmGC fournit, comme avoir une implémentation efficace des conversions de types. Un autre travail important que nous avons réalisé est d'utiliser les informations de type de WasmGC dans l'optimiseur. Par exemple, `ref.test` vérifie si une référence est d'un type particulier au moment de l'exécution, et après qu'un tel test réussisse, nous savons que `ref.cast`, une conversion au même type, doit également réussir. Cela aide à optimiser des modèles de ce type en Java :

```java
if (ref instanceof Type) {
  foo((Type) ref); // Ce casting descendant peut être éliminé.
}
```

Ces optimisations sont particulièrement utiles après l'inlining spéculatif, car nous voyons alors plus que ce que la chaîne d'outils a vu lorsqu'elle a produit le Wasm.

Dans l'ensemble, dans WasmMVP, il y avait une séparation assez claire entre les optimisations de la chaîne d'outils et de la machine virtuelle : Nous faisions autant que possible dans la chaîne d'outils et laissions uniquement les optimisations nécessaires à la machine virtuelle, ce qui avait du sens car cela maintenait les machines virtuelles plus simples. Avec WasmGC, cet équilibre pourrait quelque peu changer, car comme nous l'avons vu, il est nécessaire de faire plus d'optimisations au moment de l'exécution pour les langages avec gestion automatique de mémoire, et aussi WasmGC lui-même est plus optimisable, nous permettant d'avoir un plus grand chevauchement entre les optimisations de la chaîne d'outils et de la machine virtuelle. Il sera intéressant de voir comment l'écosystème se développe ici.

## Démonstration et statut

Vous pouvez utiliser WasmGC dès aujourd'hui ! Après avoir atteint [la phase 4](https://github.com/WebAssembly/meetings/blob/main/process/phases.md#4-standardize-the-feature-working-group) au W3C, WasmGC est désormais une norme complète et finalisée, et Chrome 119 a été publié avec son support. Avec ce navigateur (ou tout autre navigateur prenant en charge WasmGC ; par exemple, Firefox 120 devrait être lancé avec le support de WasmGC plus tard ce mois-ci), vous pouvez exécuter cette [démonstration Flutter](https://flutterweb-wasm.web.app/) où Dart compilé en WasmGC pilote la logique de l'application, y compris ses widgets, mise en page et animation.

![La démonstration Flutter s'exécutant dans Chrome 119.](/_img/wasm-gc-porting/flutter-wasm-demo.png "Material 3 rendu par Flutter WasmGC.")

## Pour commencer

Si vous êtes intéressé(e) par l'utilisation de WasmGC, les liens suivants pourraient vous être utiles :

- Divers chaînes d'outils prennent en charge WasmGC aujourd'hui, y compris [Dart](https://flutter.dev/wasm), [Java (J2Wasm)](https://github.com/google/j2cl/blob/master/docs/getting-started-j2wasm.md), [Kotlin](https://kotl.in/wasmgc), [OCaml (wasm_of_ocaml)](https://github.com/ocaml-wasm/wasm_of_ocaml), et [Scheme (Hoot)](https://gitlab.com/spritely/guile-hoot).
- Le [code source](https://gist.github.com/kripken/5cd3e18b6de41c559d590e44252eafff) du petit programme dont nous avons montré la sortie dans la section outils de développement est un exemple de la manière d'écrire un programme “hello world” WasmGC à la main. (En particulier, vous pouvez voir le type `$Node` défini puis créé à l'aide de `struct.new`.)
- Le wiki de Binaryen contient [une documentation](https://github.com/WebAssembly/binaryen/wiki/GC-Implementation---Lowering-Tips) sur la façon dont les compilateurs peuvent émettre du code WasmGC optimisé. Les liens précédents vers les différentes chaînes d'outils ciblant WasmGC peuvent également être utiles à apprendre, par exemple, vous pouvez consulter les passes et les options de Binaryen utilisées par [Java](https://github.com/google/j2cl/blob/8609e47907cfabb7c038101685153d3ebf31b05b/build_defs/internal_do_not_use/j2wasm_application.bzl#L382-L415), [Dart](https://github.com/dart-lang/sdk/blob/f36c1094710bd51f643fb4bc84d5de4bfc5d11f3/sdk/bin/dart2wasm#L135), et [Kotlin](https://github.com/JetBrains/kotlin/blob/f6b2c642c2fff2db7f9e13cd754835b4c23e90cf/libraries/tools/kotlin-gradle-plugin/src/common/kotlin/org/jetbrains/kotlin/gradle/targets/js/binaryen/BinaryenExec.kt#L36-L67).

## Résumé

WasmGC est une nouvelle approche prometteuse pour implémenter des langages à ramasse-miettes dans WebAssembly. Les portages traditionnels où une machine virtuelle est recompilée vers Wasm continueront à être pertinents dans certains cas, mais nous espérons que les portages WasmGC deviendront une technique populaire en raison de leurs avantages : les portages WasmGC ont la capacité d'être plus petits que les portages traditionnels — encore plus petits que les programmes WasmMVP écrits en C, C++ ou Rust — et ils s'intègrent mieux au Web sur des sujets tels que la collecte cyclique, l'utilisation de la mémoire, les outils de développement, et plus encore. WasmGC est également une représentation plus optimisable, ce qui peut offrir des avantages significatifs de vitesse ainsi que des opportunités de partager davantage d'efforts entre les chaînes d'outils des langages.

