---
title: 'Jusqu'à 4 Go de mémoire dans WebAssembly'
author: 'Andreas Haas, Jakob Kummerow, et Alon Zakai'
avatars:
  - 'andreas-haas'
  - 'jakob-kummerow'
  - 'alon-zakai'
date: 2020-05-14
tags:
  - WebAssembly
  - JavaScript
  - tooling
tweet: '1260944314441633793'
---

## Introduction

Grâce à des travaux récents sur Chrome et Emscripten, vous pouvez désormais utiliser jusqu'à 4 Go de mémoire dans les applications WebAssembly. C'est une augmentation par rapport à la limite précédente de 2 Go. Cela peut sembler étrange qu'il y ait eu une limite - après tout, aucun travail n'était nécessaire pour permettre aux gens d'utiliser 512 Mo ou 1 Go de mémoire ! - mais il s'avère qu'il y a des aspects spéciaux concernant le passage de 2 Go à 4 Go, à la fois dans le navigateur et dans la chaîne d'outils, que nous décrirons dans cet article.

<!--truncate-->
## 32 bits

Quelques bases avant de plonger dans les détails : la nouvelle limite de 4 Go est la quantité maximale de mémoire possible avec des pointeurs 32 bits, ce que WebAssembly prend actuellement en charge, connu sous le nom de "wasm32" dans LLVM et ailleurs. Des travaux sont en cours sur un "wasm64" (["memory64"](https://github.com/WebAssembly/memory64/blob/master/proposals/memory64/Overview.md) dans la spécification wasm) où les pointeurs peuvent être en 64 bits et nous serions capables d'utiliser plus de 16 millions de téraoctets de mémoire (!), mais en attendant, 4 Go est le maximum que nous pouvons espérer pouvoir accéder.

Il semble que nous aurions toujours dû pouvoir accéder à 4 Go, puisque c'est ce que permettent les pointeurs 32 bits. Pourquoi alors avons-nous été limités à la moitié de cela, seulement 2 Go ? Il y a plusieurs raisons, à la fois du côté du navigateur et du côté de la chaîne d'outils. Commençons par le navigateur.

## Le travail sur Chrome/V8

En principe, les changements dans V8 semblent simples : il suffit de s'assurer que tout le code généré pour les fonctions WebAssembly, ainsi que tout le code de gestion de la mémoire, utilise des entiers non signés 32 bits pour les indices et les longueurs de mémoire, et le tour est joué. Cependant, en pratique, il y a plus que cela ! Comme la mémoire WebAssembly peut être exportée vers JavaScript en tant qu'ArrayBuffer, nous avons également dû changer l'implémentation des ArrayBuffers JavaScript, des TypedArrays, et de toutes les APIs Web qui utilisent ArrayBuffers et TypedArrays, comme Web Audio, WebGPU et WebUSB.

Le premier problème que nous devions résoudre était que V8 utilisait [Smis](https://v8.dev/blog/pointer-compression#value-tagging-in-v8) (c'est-à-dire des entiers signés de 31 bits) pour les indices et les longueurs de TypedArray, donc la taille maximale était en réalité 2<sup>30</sup>-1, soit environ 1 Go. De plus, il s'avère que passer tout à des entiers 32 bits ne suffirait pas, car la longueur d'une mémoire de 4 Go ne rentre pas dans un entier 32 bits. Pour illustrer : en décimal, il y a 100 chiffres de deux caractères (de 0 à 99), mais "100" lui-même est un chiffre de trois caractères. De manière analogue, 4 Go peuvent être adressés avec des adresses 32 bits, mais 4 Go eux-mêmes représentent un nombre de 33 bits. Nous aurions pu nous limiter à une limite légèrement inférieure, mais comme nous devions modifier tout le code TypedArray de toute façon, nous avons voulu le préparer pour des limites encore plus grandes à l'avenir. Donc, nous avons changé tout le code qui traite des indices ou des longueurs des TypedArray afin qu'il utilise des types d'entiers de 64 bits, ou des JavaScript Numbers lorsque l'interface avec JavaScript est nécessaire. En tant qu'avantage supplémentaire, cela signifie que le support de mémoires encore plus grandes pour wasm64 devrait être relativement facile maintenant !

Un deuxième défi était de gérer les cas spécifiques de JavaScript pour les éléments d'Array par rapport aux propriétés nommées normales, qui se reflètent dans notre implémentation des objets. (C'est un sujet assez technique lié à la spécification JavaScript, donc ne vous inquiétez pas si vous ne comprenez pas tous les détails.) Considérez cet exemple :

```js
console.log(array[5_000_000_000]);
```

Si `array` est un objet JavaScript ou un Array ordinaire, alors `array[5_000_000_000]` serait traité comme une recherche de propriété basée sur des chaînes. Le runtime rechercherait une propriété nommée par une chaîne "5000000000". Si une telle propriété est introuvable, il remonterait dans la chaîne prototype et chercherait cette propriété, ou retournerait finalement `undefined` à la fin de la chaîne. Cependant, si `array` lui-même, ou un objet dans sa chaîne prototype, est un TypedArray, alors le runtime doit rechercher un élément indexé à l'indice 5 000 000 000, ou retourner immédiatement `undefined` si cet indice est hors limites.

En d'autres termes, les règles pour les TypedArrays sont assez différentes des Arrays habituels, et la différence se manifeste principalement pour des indices énormes. Donc, tant que nous avons uniquement autorisé des TypedArrays plus petits, notre implémentation pouvait être relativement simple ; en particulier, regarder une seule fois la clé de la propriété suffisait pour décider si le chemin "indexé" ou "nommé" devait être pris. Pour autoriser de plus grands TypedArrays, nous devons maintenant faire cette distinction de manière répétée à mesure que nous montons dans la chaîne prototype, ce qui nécessite une mise en cache minutieuse pour éviter de ralentir le code JavaScript existant par un travail et des frais généraux répétés.

## Travail sur la chaîne d'outils

Du côté de la chaîne d'outils, nous avons dû également travailler, principalement sur le code de support JavaScript, pas sur le code compilé en WebAssembly. Le problème principal était que Emscripten écrivait toujours les accès mémoire sous cette forme :

```js
HEAP32[(ptr + offset) >> 2]
```

Cela lit 32 bits (4 octets) en tant qu’entier signé depuis l’adresse `ptr + offset`. Comment cela fonctionne, c’est que `HEAP32` est un Int32Array, ce qui signifie que chaque index dans le tableau représente 4 octets. Nous devons donc diviser l’adresse en octets (`ptr + offset`) par 4 pour obtenir l’index, ce que fait le `>> 2`.

Le problème est que `>>` est une opération *signée* ! Si l’adresse est située à la marque des 2 Go ou plus, cela entraînera un dépassement dans une valeur négative :

```js
// Juste en dessous de 2 Go, c'est correct, cela imprime 536870911
console.log((2 * 1024 * 1024 * 1024 - 4) >> 2);
// 2 Go déborde et nous obtenons -536870912 :(
console.log((2 * 1024 * 1024 * 1024) >> 2);
```

La solution est de faire un décalage *non signé*, `>>>` :

```js
// Cela nous donne 536870912, comme nous le souhaitons !
console.log((2 * 1024 * 1024 * 1024) >>> 2);
```

Emscripten sait, au moment de la compilation, si vous pouvez utiliser 2 Go ou plus de mémoire (selon les indicateurs que vous utilisez ; voir les détails plus tard). Si vos indicateurs rendent possibles des adresses de 2 Go ou plus, le compilateur réécrira automatiquement tous les accès mémoire pour utiliser `>>>` au lieu de `>>`, ce qui comprend non seulement les accès comme `HEAP32` etc. dans les exemples ci-dessus, mais aussi des opérations comme `.subarray()` et `.copyWithin()`. En d'autres termes, le compilateur passera à l’utilisation de pointeurs non signés au lieu de pointeurs signés.

Cette transformation augmente légèrement la taille du code - un caractère supplémentaire à chaque décalage - c’est pourquoi nous ne le faisons pas si vous n’utilisez pas d’adresses de 2 Go ou plus. Bien que la différence soit souvent inférieure à 1 %, c'est simplement inutile et facile à éviter - et beaucoup de petites optimisations se cumulent !

D’autres problèmes rares peuvent survenir dans le code de support JavaScript. Bien que les accès mémoire normaux soient traités automatiquement comme décrit précédemment, faire quelque chose comme comparer manuellement un pointeur signé à un pointeur non signé retournera (aux adresses de 2 Go et plus) `false`. Pour détecter ces problèmes, nous avons audité le code JavaScript d’Emscripten et exécuté également la suite de tests dans un mode spécial où tout est placé à une adresse de 2 Go ou plus. (Notez que si vous écrivez votre propre code de support JavaScript, vous pouvez également avoir des choses à corriger là-bas si vous effectuez manuellement des opérations avec des pointeurs en dehors des accès mémoire normaux.)

## Essai

Pour tester cela, [téléchargez la dernière version d'Emscripten](https://emscripten.org/docs/getting_started/downloads.html), ou au moins la version 1.39.15. Ensuite, compilez avec des indicateurs tels que

```
emcc -s ALLOW_MEMORY_GROWTH -s MAXIMUM_MEMORY=4GB
```

Ces indicateurs activent la croissance de la mémoire et permettent au programme d'allouer jusqu'à 4 Go de mémoire. Notez qu’en mode par défaut, vous ne pourrez allouer que jusqu’à 2 Go - vous devez explicitement opter pour l’utilisation de 2-4 Go (cela nous permet de générer un code plus compact, en émettant `>>` au lieu de `>>>`, comme mentionné ci-dessus).

Assurez-vous de tester sur Chrome M83 (actuellement en version bêta) ou plus tard. Veuillez signaler les problèmes si vous trouvez quelque chose qui ne va pas !

## Conclusion

Le support pour jusqu'à 4 Go de mémoire est une autre étape pour rendre le web aussi performant que les plateformes natives, permettant aux programmes 32 bits d'utiliser autant de mémoire qu'ils le feraient normalement. En soi, cela ne permet pas une nouvelle classe d'application complètement, mais cela permet des expériences haut de gamme, comme un très grand niveau dans un jeu ou la manipulation de grands contenus dans un éditeur graphique.

Comme mentionné précédemment, le support pour la mémoire 64 bits est également prévu, ce qui permettra d'accéder à plus de 4 Go. Cependant, le wasm64 aura le même inconvénient que le 64 bits sur les plateformes natives : les pointeurs prennent deux fois plus de mémoire. C’est pourquoi le support de 4 Go dans wasm32 est si important : nous pouvons accéder à deux fois plus de mémoire qu’auparavant, tout en conservant une taille de code aussi compacte que le wasm l’a toujours été !

Comme toujours, testez votre code sur plusieurs navigateurs, et souvenez-vous également que 2-4 Go est beaucoup de mémoire ! Si vous en avez besoin, utilisez-la, mais ne le faites pas inutilement, car il n’y aura tout simplement pas suffisamment de mémoire libre sur de nombreuses machines des utilisateurs. Nous recommandons que vous commenciez avec une mémoire initiale aussi petite que possible, et que vous augmentiez si nécessaire ; et si vous permettez une croissance, gérez avec élégance le cas d’un échec de `malloc()`.
