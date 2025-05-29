---
title: "Ajout de BigInts à V8"
author: "Jakob Kummerow, arbitre de précision"
date: "2018-05-02 13:33:37"
tags: 
  - ECMAScript
description: "V8 prend désormais en charge BigInts, une fonctionnalité du langage JavaScript permettant des entiers à précision arbitraire."
tweet: "991705626391732224"
---
Au cours des derniers mois, nous avons implémenté la prise en charge des [BigInts](/features/bigint) dans V8, comme spécifié actuellement par [cette proposition](https://github.com/tc39/proposal-bigint), pour être inclus dans une future version d'ECMAScript. Le post suivant raconte l'histoire de nos aventures.

<!--truncate-->
## Résumé rapide

En tant que programmeur JavaScript, vous avez maintenant[^1] des entiers avec une précision[^2] arbitraire dans votre boîte à outils :

```js
const a = 2172141653n;
const b = 15346349309n;
a * b;
// → 33334444555566667777n     // Yay!
Number(a) * Number(b);
// → 33334444555566670000      // Boo!
const such_many = 2n ** 222n;
// → 6739986666787659948666753771754907668409286105635143120275902562304n
```

Pour des détails sur la nouvelle fonctionnalité et comment elle pourrait être utilisée, consultez [notre article approfondi sur BigInt](/features/bigint). Nous attendons avec impatience de voir les choses géniales que vous construirez avec !

[^1]: _Maintenant_ si vous exécutez Chrome Beta, Dev ou Canary, ou une [version preview de Node.js](https://github.com/v8/node/tree/vee-eight-lkgr), autrement _bientôt_ (Chrome 67, Node.js tip-of-tree probablement à peu près au même moment).

[^2]: Arbitraire jusqu'à une limite définie par l'implémentation. Désolé, nous n'avons pas encore compris comment insérer une quantité infinie de données dans la mémoire finie de votre ordinateur.

## Répresentation des BigInts en mémoire

En général, les ordinateurs stockent les entiers dans les registres du CPU (qui sont de nos jours généralement larges de 32 ou 64 bits), ou dans des blocs de mémoire de taille équivalente aux registres. Cela mène aux valeurs minimales et maximales que vous pourriez connaître. Par exemple, un entier signé de 32 bits peut contenir des valeurs allant de -2 147 483 648 à 2 147 483 647. L'idée des BigInts, cependant, est de ne pas être restreint par de telles limites.

Alors, comment peut-on stocker un BigInt avec cent, ou mille, ou un million de bits ? Il ne peut pas tenir dans un registre, donc nous allouons un objet dans la mémoire. Nous le rendons assez grand pour contenir tous les bits du BigInt, dans une série de blocs, que nous appelons “chiffres” — parce que c'est conceptuellement très similaire à la manière dont un peut écrire des nombres plus grands que “9” en utilisant plusieurs chiffres, comme dans “10”; sauf que le système décimal utilise des chiffres de 0 à 9, nos BigInts utilisent des chiffres de 0 à 4 294 967 295 (c'est-à-dire `2**32-1`). C'est la plage de valeurs d'un registre CPU de 32 bits[^3], sans bit de signe; nous stockons le bit de signe séparément. En pseudo-code, un objet `BigInt` avec `3*32 = 96` bits ressemble à ceci :

```js
{
  type: 'BigInt',
  sign: 0,
  num_digits: 3,
  digits: [0x12…, 0x34…, 0x56…],
}
```

[^3]: Sur les machines 64 bits, nous utilisons des chiffres de 64 bits, c'est-à-dire de 0 à 18 446 744 073 709 551 615 (c'est-à-dire `2n**64n-1n`).

## Retour à l'école et retour à Knuth

Travailler avec des entiers conservés dans les registres du CPU est vraiment facile : par exemple, pour multiplier deux d'entre eux, il y a une instruction machine qu'un logiciel peut utiliser pour dire au CPU “multiplie le contenu de ces deux registres !”, et le CPU le fera. Pour l'arithmétique BigInt, nous devons trouver notre propre solution. Heureusement, cette tâche particulière est quelque chose que littéralement chaque enfant apprend à résoudre à un moment donné : vous souvenez-vous de ce que vous faisiez à l'école quand vous deviez multiplier 345 \* 678 et que vous n'étiez pas autorisé à utiliser une calculatrice ?

```
345 * 678
---------
     30    //   5 * 6
+   24     //  4  * 6
+  18      // 3   * 6
+     35   //   5 *  7
+    28    //  4  *  7
+   21     // 3   *  7
+      40  //   5 *   8
+     32   //  4  *   8
+    24    // 3   *   8
=========
   233910
```

C'est exactement comme V8 multiplie les BigInts : un chiffre à la fois, en additionnant les résultats intermédiaires. L'algorithme fonctionne aussi bien pour `0` à `9` que pour les chiffres beaucoup plus grands d'un BigInt.

Donald Knuth a publié une implémentation spécifique de la multiplication et de la division de grands nombres constitués de petits blocs dans le Volume 2 de son classique _The Art of Computer Programming_, tout le chemin en 1969. L'implémentation de V8 suit ce livre, ce qui montre que c'est une pièce intemporelle de science informatique.

## “Moins de désucrage” == plus de bonbons ?

Peut-être de manière surprenante, nous avons dû consacrer pas mal d'efforts à faire fonctionner des opérations unaires apparemment simples, comme `-x`. Jusqu'à présent, `-x` faisait exactement la même chose que `x * (-1)`, donc pour simplifier les choses, V8 appliquait précisément ce remplacement dès que possible lors du traitement du JavaScript, notamment dans l'analyseur. Cette approche est appelée “désucrage”, car elle traite une expression comme `-x` comme du “sucre syntaxique” pour `x * (-1)`. D'autres composants (l'interpréteur, le compilateur, tout le système d'exécution) n'avaient même pas besoin de savoir ce qu'est une opération unaire, car ils ne voyaient que la multiplication, qu'ils doivent bien sûr prendre en charge de toute façon.

Avec les BigInts, cependant, cette implémentation devient soudainement invalide, car multiplier un BigInt par un Number (comme `-1`) doit lever un `TypeError`[^4]. Le parseur devrait désucrer `-x` en `x * (-1n)` si `x` est un BigInt — mais le parseur n'a aucun moyen de savoir ce que `x` va évaluer. Nous avons donc dû arrêter de compter sur ce désucrage précoce et plutôt ajouter un support approprié pour les opérations unaires sur les Numbers et les BigInts partout.

[^4]: Mélanger les types d'opérandes `BigInt` et `Number` n'est généralement pas autorisé. C'est quelque peu inhabituel pour JavaScript, mais il existe [une explication](/features/bigint#operators) pour cette décision.

## Un peu de plaisir avec les opérations bitwise

La plupart des systèmes informatiques en usage aujourd'hui stockent des entiers signés en utilisant une astuce intelligente appelée « complément à deux », qui a les propriétés agréables que le premier bit indique le signe, et qu'ajouter 1 au motif de bits incrémente toujours le nombre de 1, prenant automatiquement en charge le bit de signe. Par exemple, pour les entiers de 8 bits :

- `10000000` est -128, le nombre représentable le plus bas,
- `10000001` est -127,
- `11111111` est -1,
- `00000000` est 0,
- `00000001` est 1,
- `01111111` est 127, le nombre représentable le plus élevé.

Cet encodage est si courant que de nombreux programmeurs s'y attendent et s'y fient, et la spécification BigInt reflète ce fait en prescrivant que les BigInts doivent agir comme s'ils utilisaient la représentation en complément à deux. Comme décrit ci-dessus, les BigInts de V8 ne le font pas !

Pour effectuer des opérations bitwise conformément à la spécification, nos BigInts doivent donc prétendre utiliser le complément à deux en coulisses. Pour les valeurs positives, cela ne fait aucune différence, mais les nombres négatifs doivent effectuer un travail supplémentaire pour y parvenir. Cela a l'effet quelque peu surprenant que `a & b`, si `a` et `b` sont tous deux des BigInts négatifs, effectue en réalité _quatre_ étapes (par opposition à une seule s'ils étaient tous les deux positifs) : les deux entrées sont converties au format faux-complement-à-deux, ensuite l'opération réelle est réalisée, puis le résultat est converti à notre représentation réelle. Vous vous demandez peut-être pourquoi ces va-et-vient ? Parce que toutes les opérations non-bitwise sont beaucoup plus simples de cette façon.

## Deux nouveaux types de TypedArrays

La proposition BigInt inclut deux nouvelles variantes de TypedArray : `BigInt64Array` et `BigUint64Array`. Nous pouvons avoir des TypedArrays avec des éléments entiers de 64 bits de large maintenant que les BigInts offrent un moyen naturel de lire et écrire tous les bits de ces éléments, alors que si l'on essayait d'utiliser des Numbers pour cela, certains bits pourraient être perdus. C'est pourquoi les nouveaux tableaux ne sont pas tout à fait comme les TypedArrays entiers de 8/16/32 bits existants : l'accès à leurs éléments se fait toujours avec des BigInts ; essayer d'utiliser des Numbers lève une exception.

```js
> const big_array = new BigInt64Array(1);
> big_array[0] = 123n;  // OK
> big_array[0]
123n
> big_array[0] = 456;
TypeError: Impossible de convertir 456 en BigInt
> big_array[0] = BigInt(456);  // OK
```

Tout comme le code JavaScript fonctionnant avec ces types de tableaux semble et fonctionne un peu différemment du code TypedArray traditionnel, nous avons dû généraliser notre implémentation TypedArray pour se comporter différemment pour ces deux nouveaux types.

## Considérations d'optimisation

Pour l'instant, nous livrons une implémentation de base des BigInts. Elle est fonctionnellement complète et devrait offrir des performances solides (un peu plus rapides que les bibliothèques existantes en espace utilisateur), mais elle n'est pas particulièrement optimisée. La raison est que, conformément à notre objectif de prioriser les applications réelles par rapport aux benchmarks artificiels, nous voulons d'abord voir comment vous utiliserez les BigInts, afin de pouvoir ensuite optimiser précisément les cas qui vous importent !

Par exemple, si nous voyons que les BigInts relativement petits (jusqu'à 64 bits) sont un cas d'utilisation important, nous pourrions les rendre plus efficaces en mémoire en utilisant une représentation spéciale pour eux :

```js
{
  type: 'BigInt-Int64',
  value: 0x12…,
}
```

Un des détails restant à voir est si nous devrions faire cela pour les plages de valeurs “int64”, les plages “uint64”, ou les deux — gardant à l'esprit que le fait de devoir supporter moins de chemins rapides signifie que nous pouvons les livrer plus tôt, et aussi que chaque chemin rapide supplémentaire rend ironiquement tout le reste un peu plus lent, car les opérations concernées doivent toujours vérifier si cela est applicable.

Une autre histoire est le support des BigInts dans le compilateur optimisant. Pour des applications computationnelles lourdes fonctionnant sur des valeurs de 64 bits et tournant sur du matériel 64 bits, garder ces valeurs dans les registres serait beaucoup plus efficace que de les allouer comme objets sur le tas, comme nous le faisons actuellement. Nous avons des plans pour la manière dont nous implémenterions un tel support, mais c'est un autre cas où nous aimerions d'abord savoir si cela correspond réellement à ce qui vous intéresse le plus, vous, nos utilisateurs ; ou si nous devrions consacrer notre temps à autre chose.

Veuillez nous envoyer des retours sur ce que vous utilisez les BigInts pour, et tous les problèmes que vous rencontrez ! Vous pouvez nous contacter via notre système de suivi des bugs [crbug.com/v8/new](https://crbug.com/v8/new), par mail à [v8-users@googlegroups.com](mailto:v8-users@googlegroups.com), ou [@v8js](https://twitter.com/v8js) sur Twitter.
