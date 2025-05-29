---
title: &apos;Séparateurs numériques&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-05-28
tags:
  - ECMAScript
  - ES2021
  - io19
description: &apos;JavaScript prend désormais en charge les underscores comme séparateurs dans les littéraux numériques, augmentant ainsi la lisibilité et la maintenabilité du code source.&apos;
tweet: &apos;1129073383931559936&apos;
---
Les grands littéraux numériques sont difficiles à analyser rapidement pour l'œil humain, surtout lorsqu'il y a beaucoup de chiffres répétitifs :

```js
1000000000000
   1019436871.42
```

Pour améliorer la lisibilité, [une nouvelle fonctionnalité de langage JavaScript](https://github.com/tc39/proposal-numeric-separator) permet d'utiliser des underscores comme séparateurs dans les littéraux numériques. Ainsi, cela peut désormais être réécrit en regroupant les chiffres par mille, par exemple :

<!--truncate-->
```js
1_000_000_000_000
    1_019_436_871.42
```

Il est désormais plus facile de voir que le premier nombre est un trillion, et que le second est de l'ordre de 1 milliard.

Les séparateurs numériques aident à améliorer la lisibilité pour tous types de littéraux numériques :

```js
// Un littéral entier décimal avec ses chiffres regroupés par mille :
1_000_000_000_000
// Un littéral décimal avec ses chiffres regroupés par mille :
1_000_000.220_720
// Un littéral entier binaire avec ses bits regroupés par octet :
0b01010110_00111000
// Un littéral entier binaire avec ses bits regroupés par nibble :
0b0101_0110_0011_1000
// Un littéral entier hexadécimal avec ses chiffres regroupés par byte :
0x40_76_38_6A_73
// Un littéral BigInt avec ses chiffres regroupés par mille :
4_642_473_943_484_686_707n
```

Ils fonctionnent même pour les littéraux entiers octaux (même si [je n'ai pas d'exemple](https://github.com/tc39/proposal-numeric-separator/issues/44) où les séparateurs apportent une valeur pour de tels littéraux) :

```js
// Un séparateur numérique dans un littéral entier octal : 🤷‍♀️
0o123_456
```

Notez que JavaScript a également une syntaxe héritée pour les littéraux octaux sans le préfixe explicite `0o`. Par exemple, `017 === 0o17`. Cette syntaxe n'est pas prise en charge en mode strict ou dans les modules, et elle ne devrait pas être utilisée dans du code moderne. En conséquence, les séparateurs numériques ne sont pas pris en charge pour ces littéraux. Utilisez plutôt la syntaxe `0o17`.

## Prise en charge des séparateurs numériques

<feature-support chrome="75 /blog/v8-release-75#numeric-separators"
                 firefox="70 https://hacks.mozilla.org/2019/10/firefox-70-a-bountiful-release-for-all/"
                 safari="13"
                 nodejs="12.5.0 https://nodejs.org/en/blog/release/v12.5.0/"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-numeric-separator"></feature-support>
