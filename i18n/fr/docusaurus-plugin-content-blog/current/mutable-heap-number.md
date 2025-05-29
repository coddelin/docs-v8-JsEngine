---
title: 'Suralimenter V8 avec des nombres sur le tas mutables'
author: '[Victor Gomes](https://twitter.com/VictorBFG), le manipulateur de bits'
avatars:
  - victor-gomes
date: 2025-02-25
tags:
  - JavaScript
  - benchmarks
  - internals
description: "Ajout de nombres sur le tas mutables au contexte du script"
tweet: ''
---

Chez V8, nous nous efforçons constamment d'améliorer les performances de JavaScript. Dans le cadre de cet effort, nous avons récemment revisité la suite de tests [JetStream2](https://browserbench.org/JetStream2.1/) pour éliminer les goulets d'étranglement de performance. Cet article détaille une optimisation spécifique que nous avons réalisée et qui a permis une amélioration significative de `2.5x` dans le test `async-fs`, contribuant ainsi à une augmentation notable du score global. L'optimisation a été inspirée par le test, mais de tels motifs apparaissent également dans le [code du monde réel](https://github.com/WebAssembly/binaryen/blob/3339c1f38da5b68ce8bf410773fe4b5eee451ab8/scripts/fuzz_shell.js#L248).

<!--truncate-->
# La cible `async-fs` et un étrange `Math.random`

Le test `async-fs`, comme son nom l'indique, est une implémentation de système de fichiers en JavaScript, axée sur les opérations asynchrones. Cependant, un goulot d'étranglement de performance surprenant existe : l'implémentation de `Math.random`. Elle utilise une implémentation personnalisée et déterministe de `Math.random` pour des résultats cohérents entre les exécutions. L'implémentation est la suivante :

```js
let seed;
Math.random = (function() {
  return function () {
    seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
    seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
    seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
    seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
    seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
    seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
    return (seed & 0xfffffff) / 0x10000000;
  };
})();
```

La variable clé ici est `seed`. Elle est mise à jour à chaque appel de `Math.random`, générant ainsi la séquence pseudo-aléatoire. De manière cruciale, ici, `seed` est stockée dans un `ScriptContext`.

Un `ScriptContext` sert de lieu de stockage pour les valeurs accessibles dans un script particulier. En interne, ce contexte est représenté comme un tableau de valeurs marquées de V8. Dans la configuration par défaut de V8 pour les systèmes 64 bits, chacune de ces valeurs marquées occupe 32 bits. Le bit le moins significatif de chaque valeur agit comme un tag. Un `0` indique un _petit entier_ sur 31 bits (`SMI`). La valeur entière réelle est stockée directement, décalée d'un bit vers la gauche. Un `1` indique un [pointeur compressé](https://v8.dev/blog/pointer-compression) vers un objet sur le tas, où la valeur du pointeur compressé est incrémentée de un.

![Disposition de `ScriptContext`: les emplacements bleus sont des pointeurs vers les métadonnées du contexte et l'objet global (`NativeContext`). L'emplacement jaune indique une valeur non étiquetée en virgule flottante double précision.](/_img/mutable-heap-number/script-context.svg)

Cette étiquetage différencie la façon dont les nombres sont stockés. Les `SMI` résident directement dans le `ScriptContext`. Les nombres plus grands ou ceux avec des parties décimales sont stockés indirectement sous forme d'objets immuables `HeapNumber` sur le tas (un double 64-bits), avec le `ScriptContext` contenant un pointeur compressé vers eux. Cette approche gère efficacement divers types numériques tout en optimisant pour le cas courant des `SMI`.

# Le goulot d'étranglement

La tentative d'analyse avec `Math.random` a révélé deux principaux problèmes de performance :

- **Allocation de `HeapNumber` :** L'emplacement dédié à la variable `seed` dans le script context pointe vers un `HeapNumber` standard immuable. Chaque fois que la fonction `Math.random` met à jour `seed`, un nouvel objet `HeapNumber` doit être alloué sur le tas, ce qui entraîne une pression importante sur l'allocation et la collecte des déchets.

- **Arithmétique en virgule flottante :** Bien que les calculs dans `Math.random` soient fondamentalement des opérations sur les entiers (utilisant des décalages bit à bit et des additions), le compilateur ne peut pas tirer pleinement parti de cela. Comme `seed` est stockée sous forme de `HeapNumber` générique, le code généré utilise des instructions en virgule flottante plus lentes. Le compilateur ne peut pas prouver que `seed` contiendra toujours une valeur représentable sous forme d'entier. Bien que le compilateur puisse potentiellement spéculer sur des intervalles d'entiers 32 bits, V8 se concentre principalement sur les `SMI`. Même avec une spéculation d'entiers 32 bits, une conversion coûteuse potentielle de flottant 64 bits vers entier 32 bits, ainsi qu'une vérification sans perte, seraient toujours nécessaires.

# La solution

Pour résoudre ces problèmes, nous avons mis en œuvre une optimisation en deux parties :

- **Suivi des types d'emplacements / emplacements mutables pour `HeapNumber` :** Nous avons étendu le [suivi des valeurs constantes du contexte de script](https://issues.chromium.org/u/2/issues/42203515) (variables `let` initialisées mais jamais modifiées) pour inclure des informations sur le type. Nous suivons si la valeur de cet emplacement est constante, un `SMI`, un `HeapNumber` ou une valeur étiquetée générique. Nous avons également introduit le concept d'emplacements mutables pour `HeapNumber` dans les contextes de script, similaire aux [champs mutables pour `HeapNumber`](https://v8.dev/blog/react-cliff#smi-heapnumber-mutableheapnumber) pour les `JSObjects`. Au lieu de pointer vers un `HeapNumber` immuable, l'emplacement de contexte de script possède le `HeapNumber`, et son adresse ne doit pas fuiter. Cela élimine la nécessité d'allouer un nouveau `HeapNumber` à chaque mise à jour pour le code optimisé. Le `HeapNumber` possédé est lui-même modifié directement.

- **`Int32` mutable dans le tas (`Heap`):** Nous améliorons les types d'emplacements de contexte de script pour suivre si une valeur numérique se situe dans la plage `Int32`. Si c'est le cas, le `HeapNumber` mutable stocke la valeur en tant que `Int32` brut. Si nécessaire, la transition vers un `double` offre l'avantage de ne pas nécessiter une réallocation de `HeapNumber`. Dans le cas de `Math.random`, le compilateur peut désormais observer que `seed` est constamment mis à jour avec des opérations sur des entiers et marquer l'emplacement comme contenant un `Int32` mutable.

![Machine d'états du type d'emplacement. Une flèche verte indique une transition déclenchée par le stockage d'une valeur `SMI`. Les flèches bleues représentent des transitions par le stockage d'une valeur `Int32`, et les flèches rouges une valeur en virgule flottante double précision. L'état `Other` agit comme un état de terminaison, empêchant d'autres transitions.](/_img/mutable-heap-number/transitions.svg)

Il est important de noter que ces optimisations introduisent une dépendance du code au type de la valeur stockée dans l'emplacement de contexte. Le code optimisé généré par le compilateur JIT repose sur le fait que l'emplacement contient un type spécifique (ici, un `Int32`). Si un code écrit une valeur dans l'emplacement `seed` qui change son type (par exemple, écrire un nombre à virgule flottante ou une chaîne), le code optimisé devra être désoptimisé. Cette désoptimisation est nécessaire pour garantir la correction. Par conséquent, la stabilité du type stocké dans l'emplacement est cruciale pour maintenir des performances optimales. Dans le cas de `Math.random`, le masquage de bits dans l'algorithme garantit que la variable `seed` contient toujours une valeur `Int32`.

# Les résultats

Ces changements accélèrent considérablement la fonction particulière `Math.random` :

- **Pas d'allocation / mises à jour rapides sur place :** La valeur de `seed` est mise à jour directement dans son emplacement mutable du contexte de script. Aucun nouvel objet n'est alloué pendant l'exécution de `Math.random`.

- **Opérations sur des entiers :** Le compilateur, sachant que l'emplacement contient un `Int32`, peut générer des instructions sur les entiers hautement optimisées (décalages, additions, etc.). Cela évite les surcoûts des calculs en virgule flottante.

![Résultats du benchmark `async-fs` sur un Mac M1. Des scores plus élevés sont meilleurs.](/_img/mutable-heap-number/result.png)

L'effet combiné de ces optimisations offre une amélioration remarquable d'environ `~2,5x` sur le benchmark `async-fs`. Cela contribue à une amélioration d'environ `~1,6 %` du score global de JetStream2. Cela démontre que du code apparemment simple peut créer des goulots d'étranglement inattendus en termes de performances, et que des optimisations petites et ciblées peuvent avoir un impact important, pas seulement pour le benchmark.

