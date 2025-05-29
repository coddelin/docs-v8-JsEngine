---
title: 'Qu'y a-t-il dans ce `.wasm`? Présentation : `wasm-decompile`'
author: "Wouter van Oortmerssen ([@wvo](https://twitter.com/wvo))"
avatars:
  - "wouter-van-oortmerssen"
date: 2020-04-27
tags:
  - WebAssembly
  - outils
description: "WABT propose un nouvel outil de décompilation qui peut faciliter la lecture du contenu des modules Wasm."
tweet: "1254829913561014272"
---
Nous avons un nombre croissant de compilateurs et d'autres outils qui génèrent ou manipulent des fichiers `.wasm`, et parfois, vous pourriez vouloir jeter un œil à l'intérieur. Peut-être êtes-vous un développeur de cet outil ou, plus directement, vous êtes un programmeur ciblant Wasm et vous vous demandez à quoi ressemble le code généré, pour des raisons de performance ou autres.

<!--truncate-->
Le problème est que Wasm est plutôt de bas niveau, un peu comme le code assembleur réel. En particulier, contrairement, par exemple, à la JVM, toutes les structures de données ont été compilées en opérations de chargement/stocks, plutôt qu'en classes et champs nommés de manière conviviale. Les compilateurs comme LLVM peuvent effectuer une quantité impressionnante de transformations qui font que le code généré ne ressemble en rien au code original.

## Désassembler ou... décompiler ?

Vous pourriez utiliser des outils comme `wasm2wat` (qui fait partie de la boîte à outils [WABT](https://github.com/WebAssembly/wabt)), pour transformer un `.wasm` en format texte standard de Wasm, `.wat`, qui est une représentation très fidèle mais pas particulièrement lisible.

Par exemple, une fonction C simple comme un produit scalaire :

```c
typedef struct { float x, y, z; } vec3;

float dot(const vec3 *a, const vec3 *b) {
    return a->x * b->x +
           a->y * b->y +
           a->z * b->z;
}
```

Nous utilisons `clang dot.c -c -target wasm32 -O2` suivi de `wasm2wat -f dot.o` pour le convertir en ce `.wat` :

```wasm
(func $dot (type 0) (param i32 i32) (result f32)
  (f32.add
    (f32.add
      (f32.mul
        (f32.load
          (local.get 0))
        (f32.load
          (local.get 1)))
      (f32.mul
        (f32.load offset=4
          (local.get 0))
        (f32.load offset=4
          (local.get 1))))
    (f32.mul
      (f32.load offset=8
        (local.get 0))
      (f32.load offset=8
        (local.get 1))))))
```

Ceci est un petit bout de code, mais déjà difficile à lire pour de nombreuses raisons. Outre l'absence de syntaxe basée sur les expressions et la verbosité générale, devoir comprendre les structures de données comme des chargements de mémoire n'est pas aisé. Maintenant, imaginez regarder la sortie d'un grand programme, et les choses deviendront rapidement incompréhensibles.

Au lieu d'utiliser `wasm2wat`, lancez `wasm-decompile dot.o`, et vous obtenez :

```c
function dot(a:{ a:float, b:float, c:float },
             b:{ a:float, b:float, c:float }):float {
  return a.a * b.a + a.b * b.b + a.c * b.c
}
```

Cela semble beaucoup plus familier. En plus d'une syntaxe basée sur les expressions qui imite les langages de programmation que vous pourriez connaître, le décompilateur examine tous les chargements et sauvegardes dans une fonction, et essaie de déduire leur structure. Il annote ensuite chaque variable utilisée comme pointeur avec une déclaration de struct "inline". Il ne crée pas de déclarations de struct nommées car il ne sait pas nécessairement quelles utilisations de 3 flottants représentent le même concept.

## Décompiler vers quoi ?

`wasm-decompile` produit une sortie qui tente de ressembler à un "langage de programmation très moyen" tout en restant fidèle au Wasm qu'il représente.

Son objectif n°1 est la lisibilité : aider les lecteurs à comprendre ce qu'il y a dans un `.wasm` avec un code aussi facile à suivre que possible. Son objectif n°2 est de représenter le Wasm aussi fidèlement que possible, afin de ne pas perdre son utilité en tant que désassembleur. Évidemment, ces deux objectifs ne sont pas toujours conciliables.

Cette sortie n'est pas destinée à être un langage de programmation réel et il n'y a actuellement aucun moyen de la recompiler en Wasm.

### Chargements et sauvegardes

Comme démontré ci-dessus, `wasm-decompile` examine tous les chargements et sauvegardes sur un pointeur particulier. S'ils forment un ensemble continu d'accès, il produira une de ces déclarations de struct "inline".

Si tous les "champs" ne sont pas accessibles, il ne peut pas dire avec certitude si cela est censé être une struct, ou une autre forme d'accès mémoire indépendant. Dans ce cas, il revient à des types plus simples comme `float_ptr` (si les types sont les mêmes), ou, dans le pire des cas, sortira un accès de tableau comme `o[2]:int`, ce qui signifie : `o` pointe vers des valeurs `int`, et nous accédons à la troisième.

Ce dernier cas se produit plus souvent qu'on ne le pense, car les variables locales Wasm fonctionnent davantage comme des registres que comme des variables, donc un code optimisé peut partager le même pointeur pour des objets indépendants.

Le décompilateur essaie d'être intelligent à propos des indexations et détecte des motifs tels que `(base + (index << 2))[0]:int` qui résultent d'opérations d'indexation de tableau C régulières comme `base[index]` où `base` pointe vers un type de 4 octets. Ceux-ci sont très courants dans le code puisque Wasm n'a que des offsets constants sur les chargements et sauvegardes. La sortie de `wasm-decompile` les transforme en retour en `base[index]:int`.

De plus, il sait quand les adresses absolues se réfèrent à la section des données.

### Flux de contrôle

Le plus familier est la construction if-then de Wasm, qui se traduit par une syntaxe familière `if (cond) { A } else { B }`, avec l'ajout qu'en Wasm, cela peut réellement retourner une valeur, donc cela peut également représenter la syntaxe ternaire `cond ? A : B` disponible dans certains langages.

Le reste du flux de contrôle de Wasm est basé sur les blocs `block` et `loop`, ainsi que les sauts `br`, `br_if` et `br_table`. Le désassembleur reste assez proche de ces constructions plutôt que d'essayer de déduire les structures while/for/switch dont elles pourraient provenir, car cela tend à mieux fonctionner avec un code optimisé. Par exemple, une boucle typique dans la sortie de `wasm-decompile` pourrait ressembler à :

```c
loop A {
  // corps de la boucle ici.
  if (cond) continue A;
}
```

Ici, `A` est une étiquette qui permet à plusieurs de ces boucles d'être imbriquées. Avoir un `if` et `continue` pour contrôler la boucle peut sembler légèrement étranger par rapport à une boucle while, mais cela correspond directement au `br_if` de Wasm.

Les blocs sont similaires, mais au lieu de ramifier vers l'arrière, ils ramifient vers l'avant :

```c
block {
  if (cond) break;
  // le corps se trouve ici.
}
```

Cela implémente en fait un if-then. Les versions futures du désassembleur pourraient les traduire en véritables if-then lorsque cela est possible.

La construction de contrôle la plus surprenante de Wasm est `br_table`, qui implémente quelque chose comme un `switch`, sauf qu'il utilise des blocs imbriqués, ce qui tend à être difficile à lire. Le désassembleur les aplatit pour les rendre légèrement
plus faciles à suivre, par exemple :

```c
br_table[A, B, C, ..D](a);
label A:
return 0;
label B:
return 1;
label C:
return 2;
label D:
```

Cela est similaire à un `switch` sur `a`, avec `D` étant le cas par défaut.

### Autres fonctionnalités amusantes

Le désassembleur :

- Peut extraire des noms à partir des informations de débogage ou de liaison, ou générer des noms lui-même. Lorsqu'il utilise des noms existants, il dispose d'un code spécial pour simplifier les symboles avec noms obfusqués de type C++.
- Prend déjà en charge la proposition de valeurs multiples, ce qui rend la transformation des éléments en expressions ou en instructions un peu plus difficile. Des variables supplémentaires sont utilisées lorsque plusieurs valeurs sont retournées.
- Il peut même générer des noms à partir des _contenus_ des sections de données.
- Produit de belles déclarations pour tous les types de sections Wasm, pas seulement le code. Par exemple, il essaie de rendre les sections de données lisibles en les affichant sous forme de texte lorsque cela est possible.
- Prend en charge la priorité des opérateurs (courante dans la plupart des langages de style C) pour réduire les `()` sur les expressions courantes.

### Limitations

Désassembler Wasm est fondamentalement plus difficile que, par exemple, le bytecode JVM.

Ce dernier n'est pas optimisé, il est donc relativement fidèle à la structure du code original, et même si les noms peuvent manquer, il fait référence à des classes uniques plutôt que simplement à des emplacements mémoire.

En revanche, la plupart des sorties `.wasm` ont été fortement optimisées par LLVM et ont donc souvent perdu la plupart de leur structure originale. Le code de sortie est très différent de ce qu'un programmeur écrirait. Cela rend la création d'un désassembleur pour Wasm un plus grand défi pour le rendre utile, mais cela ne signifie pas que nous ne devrions pas essayer !

## En savoir plus

La meilleure façon d'en savoir plus est bien sûr de désassembler votre propre projet Wasm !

De plus, un guide plus approfondi sur `wasm-decompile` est [ici](https://github.com/WebAssembly/wabt/blob/master/docs/decompiler.md). Son implémentation se trouve dans les fichiers sources commençant par `decompiler` [ici](https://github.com/WebAssembly/wabt/tree/master/src) (n'hésitez pas à contribuer une PR pour l'améliorer !). Quelques cas de test montrant d'autres exemples de différences entre `.wat` et le désassembleur se trouvent [ici](https://github.com/WebAssembly/wabt/tree/master/test/decompile).
