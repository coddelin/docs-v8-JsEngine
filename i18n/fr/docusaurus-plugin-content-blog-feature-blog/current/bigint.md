---
title: "BigInt : entiers à précision arbitraire en JavaScript"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-05-01
tags:
  - ECMAScript
  - ES2020
  - io19
description: 'Les BigInts sont un nouveau type primitif numérique en JavaScript qui peut représenter des entiers avec une précision arbitraire. Cet article examine quelques cas d'utilisation et explique les nouvelles fonctionnalités de Chrome 67 en comparant les BigInts aux Numbers en JavaScript.'
tweet: "990991035630206977"
---
Les `BigInt` sont un nouveau type primitif numérique en JavaScript qui peuvent représenter des entiers avec une précision arbitraire. Avec les `BigInt`, vous pouvez stocker et manipuler en toute sécurité de grands entiers même au-delà de la limite des entiers sûrs pour les `Number`. Cet article examine quelques cas d'utilisation et explique les nouvelles fonctionnalités de Chrome 67 en comparant les `BigInt` aux `Number` en JavaScript.

<!--truncate-->
## Cas d'utilisation

Les entiers à précision arbitraire débloquent de nombreux nouveaux cas d'utilisation pour JavaScript.

Les `BigInt` permettent d'effectuer correctement des opérations arithmétiques entières sans débordement. Cela ouvre à lui seul d'innombrables nouvelles possibilités. Les opérations mathématiques sur de grands nombres sont couramment utilisées dans la technologie financière, par exemple.

Les [identifiants entiers de grande taille](https://developer.twitter.com/en/docs/basics/twitter-ids) et les [horodatages à haute précision](https://github.com/nodejs/node/pull/20220) ne peuvent pas être représentés de manière sûre en tant que `Number` en JavaScript. Cela conduit [souvent](https://github.com/stedolan/jq/issues/1399) à des [bugs réels](https://github.com/nodejs/node/issues/12115), et pousse les développeurs JavaScript à les représenter sous forme de chaînes. Grâce au `BigInt`, ces données peuvent désormais être représentées comme des valeurs numériques.

Le `BigInt` pourrait constituer la base d'une future implémentation `BigDecimal`. Cela serait utile pour représenter des sommes d'argent avec une précision décimale, et pour effectuer des calculs précis (c'est-à-dire le problème `0.10 + 0.20 !== 0.30`).

Auparavant, les applications JavaScript avec l'un de ces cas d'utilisation devaient recourir à des bibliothèques externes qui émulent des fonctionnalités similaires à `BigInt`. Lorsque `BigInt` devient largement disponible, ces applications peuvent abandonner ces dépendances en faveur des `BigInt` natifs. Cela permet de réduire le temps de chargement, de parsing et de compilation, et apporte par-dessus tout des améliorations significatives des performances d'exécution.

![L'implémentation native `BigInt` dans Chrome est plus performante que les bibliothèques externes populaires.](/_img/bigint/performance.svg)

## L'état actuel : `Number`

Les `Number` en JavaScript sont représentés comme des [flottants en double précision](https://en.wikipedia.org/wiki/Floating-point_arithmetic). Cela signifie qu'ils ont une précision limitée. La constante `Number.MAX_SAFE_INTEGER` donne le plus grand entier possible qui peut être incrémenté en toute sécurité. Sa valeur est `2**53-1`.

```js
const max = Number.MAX_SAFE_INTEGER;
// → 9_007_199_254_740_991
```

:::note
**Remarque :** Pour plus de lisibilité, je regroupe les chiffres de ce grand nombre par millier, en utilisant des soulignés comme séparateurs. [La proposition sur les séparateurs de littéraux numériques](/features/numeric-separators) permet exactement cela pour les littéraux numériques en JavaScript.
:::

L'incrémentation donne le résultat attendu :

```js
max + 1;
// → 9_007_199_254_740_992 ✅
```

Mais si nous incrémentons une deuxième fois, le résultat ne peut plus être représenté exactement en tant que `Number` en JavaScript :

```js
max + 2;
// → 9_007_199_254_740_992 ❌
```

Notez comment `max + 1` donne le même résultat que `max + 2`. Chaque fois que nous obtenons cette valeur particulière en JavaScript, il est impossible de savoir si elle est précise ou non. Tout calcul sur des entiers en dehors de la plage des entiers sûrs (c'est-à-dire de `Number.MIN_SAFE_INTEGER` à `Number.MAX_SAFE_INTEGER`) perd potentiellement en précision. Pour cette raison, nous ne pouvons nous fier qu'aux valeurs numériques entières dans la plage sûre.

## La nouveauté : `BigInt`

Les `BigInt` sont un nouveau type primitif numérique en JavaScript qui peuvent représenter des entiers avec une [précision arbitraire](https://en.wikipedia.org/wiki/Arbitrary-precision_arithmetic). Avec les `BigInt`, vous pouvez stocker et manipuler en toute sécurité de grands entiers même au-delà de la limite des entiers sûrs pour les `Number`.

Pour créer un `BigInt`, ajoutez le suffixe `n` à tout littéral entier. Par exemple, `123` devient `123n`. La fonction globale `BigInt(number)` peut être utilisée pour convertir un `Number` en `BigInt`. En d'autres termes, `BigInt(123) === 123n`. Utilisons ces deux techniques pour résoudre le problème que nous avons rencontré plus tôt :

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2n;
// → 9_007_199_254_740_993n ✅
```

Voici un autre exemple, où nous multiplions deux `Number` :

```js
1234567890123456789 * 123;
// → 151851850485185200000 ❌
```

En regardant les chiffres significatifs les moins importants, `9` et `3`, nous savons que le résultat de la multiplication devrait se terminer par `7` (car `9 * 3 === 27`). Cependant, le résultat se termine par une série de zéros. Cela ne peut pas être correct ! Réessayons avec des `BigInt` à la place :

```js
1234567890123456789n * 123n;
// → 151851850485185185047n ✅
```

Cette fois, nous obtenons le résultat correct.

Les limites des entiers sûrs pour les `Number` ne s'appliquent pas aux `BigInt`. Par conséquent, avec `BigInt`, nous pouvons effectuer des calculs d'entiers corrects sans nous soucier de perdre en précision.

### Un nouveau type primitif

Les `BigInt` sont un nouveau type primitif dans le langage JavaScript. En tant que tel, ils ont leur propre type qui peut être détecté à l'aide de l'opérateur `typeof` :

```js
typeof 123;
// → 'number'
typeof 123n;
// → 'bigint'
```

Étant donné que les `BigInt` sont un type distinct, un `BigInt` n'est jamais strictement égal à un `Number`, par exemple `42n !== 42`. Pour comparer un `BigInt` à un `Number`, convertissez l'un d'eux dans le type de l'autre avant de faire la comparaison ou utilisez l'égalité abstraite (`==`) :

```js
42n === BigInt(42);
// → true
42n == 42;
// → true
```

Lorsqu'ils sont convertis en booléens (ce qui se produit lors de l'utilisation de `if`, `&&`, `||` ou `Boolean(int)`, par exemple), les `BigInt` suivent la même logique que les `Number`.

```js
if (0n) {
  console.log('if');
} else {
  console.log('else');
}
// → logs 'else', parce que `0n` est falsy.
```

### Opérateurs

Les `BigInt` prennent en charge les opérateurs les plus courants. Les opérateurs binaires `+`, `-`, `*`, et `**` fonctionnent comme prévu. `/` et `%` fonctionnent et s'arrondissent vers zéro si nécessaire. Les opérations binaires `|`, `&`, `<<`, `>>`, et `^` effectuent des calculs binaires en supposant une [représentation en complément à deux](https://en.wikipedia.org/wiki/Two%27s_complement) pour les valeurs négatives, tout comme elles le font pour les `Number`.

```js
(7 + 6 - 5) * 4 ** 3 / 2 % 3;
// → 1
(7n + 6n - 5n) * 4n ** 3n / 2n % 3n;
// → 1n
```

L'opérateur uniaire `-` peut être utilisé pour indiquer une valeur `BigInt` négative, par exemple `-42n`. L'opérateur uniaire `+` _n'est pas_ pris en charge car il pourrait casser le code asm.js qui s'attend à ce que `+x` produise toujours un `Number` ou une exception.

Un piège est qu'il n'est pas permis de mélanger des opérations entre les `BigInt` et les `Number`. Cela est bénéfique, car toute coercition implicite pourrait entraîner une perte d'informations. Prenons cet exemple :

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2.5;
// → ?? 🤔
```

Quel devrait être le résultat ? Il n'y a pas de bonne réponse ici. Les `BigInt` ne peuvent pas représenter les fractions, et les `Number` ne peuvent pas représenter les `BigInt` au-delà de la limite des entiers sûrs. Pour cette raison, mélanger des opérations entre les `BigInt` et les `Number` entraîne une exception `TypeError`.

La seule exception à cette règle concerne les opérateurs de comparaison tels que `===` (comme abordé précédemment), `<` et `>=` - car ils renvoient des booléens, il n'y a aucun risque de perte de précision.

```js
1 + 1n;
// → TypeError
123 < 124n;
// → true
```

Étant donné que les `BigInt` et les `Number` se mélangent généralement mal, évitez de surcharger ou de « mettre à niveau » magiquement votre code existant pour utiliser les `BigInt` au lieu des `Number`. Décidez dans quel domaine opérer et respectez cette décision. Pour les _nouvelles_ API qui fonctionnent sur des entiers potentiellement grands, `BigInt` est le meilleur choix. Les `Number` restent pertinents pour les valeurs entières dont on sait qu'elles se trouvent dans la plage des entiers sûrs.

Une autre chose à noter est que [l'opérateur `>>>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Unsigned_right_shift), qui effectue un décalage à droite non signé, n'a pas de sens pour les `BigInt` puisqu'ils sont toujours signés. Pour cette raison, `>>>` ne fonctionne pas avec les `BigInt`.

### API

Plusieurs nouvelles API spécifiques aux `BigInt` sont disponibles.

Le constructeur global `BigInt` est similaire au constructeur `Number` : il convertit son argument en `BigInt` (comme mentionné précédemment). Si la conversion échoue, il lève une exception `SyntaxError` ou `RangeError`.

```js
BigInt(123);
// → 123n
BigInt(1.5);
// → RangeError
BigInt('1.5');
// → SyntaxError
```

Le premier de ces exemples transmet un littéral numérique à `BigInt()`. C'est une mauvaise pratique, car les `Number` souffrent de perte de précision, et nous pourrions déjà perdre de la précision avant que la conversion en `BigInt` ne se produise :

```js
BigInt(123456789123456789);
// → 123456789123456784n ❌
```

Pour cette raison, nous recommandons soit d'utiliser la notation littérale `BigInt` (avec le suffixe `n`), soit de transmettre une chaîne (pas un `Number` !) à `BigInt()` à la place :

```js
123456789123456789n;
// → 123456789123456789n ✅
BigInt('123456789123456789');
// → 123456789123456789n ✅
```

Deux fonctions de bibliothèque permettent d'encapsuler des valeurs `BigInt` en tant qu'entiers signés ou non signés, limités à un nombre spécifique de bits. `BigInt.asIntN(width, value)` encapsule une valeur `BigInt` en un entier binaire signé à `width` chiffres, et `BigInt.asUintN(width, value)` encapsule une valeur `BigInt` en un entier binaire non signé à `width` chiffres. Si vous effectuez des calculs 64 bits par exemple, vous pouvez utiliser ces API pour rester dans la plage appropriée :

```js
// Valeur maximale possible pour `BigInt` qui peut être représentée comme un
// entier signé 64 bits.
const max = 2n ** (64n - 1n) - 1n;
BigInt.asIntN(64, max);
→ 9223372036854775807n
BigInt.asIntN(64, max + 1n);
// → -9223372036854775808n
//   ^ négatif à cause du dépassement
```

Notez comment un débordement se produit dès que nous dépassons une valeur `BigInt` excédant la plage des entiers 64 bits (c'est-à-dire 63 bits pour la valeur absolue + 1 bit pour le signe).

Les `BigInt` permettent de représenter avec précision des entiers signés et non signés sur 64 bits, couramment utilisés dans d'autres langages de programmation. Deux nouvelles versions de tableaux typés, `BigInt64Array` et `BigUint64Array`, facilitent la représentation efficace et les opérations sur des listes de telles valeurs :

```js
const view = new BigInt64Array(4);
// → [0n, 0n, 0n, 0n]
view.length;
// → 4
view[0];
// → 0n
view[0] = 42n;
view[0];
// → 42n
```

La version `BigInt64Array` garantit que ses valeurs restent dans la limite signée des 64 bits.

```js
// La valeur maximale possible de BigInt qui peut être
// représentée comme un entier signé sur 64 bits.
const max = 2n ** (64n - 1n) - 1n;
view[0] = max;
view[0];
// → 9_223_372_036_854_775_807n
view[0] = max + 1n;
view[0];
// → -9_223_372_036_854_775_808n
//   ^ négatif en raison du débordement
```

La version `BigUint64Array` fait de même en utilisant la limite non signée des 64 bits.

## Polyfill et transpilation des BigInt

Au moment de l'écriture, les `BigInt` sont uniquement supportés dans Chrome. D'autres navigateurs travaillent activement à leur implémentation. Mais que faire si vous voulez utiliser la fonctionnalité `BigInt` *aujourd'hui* sans sacrifier la compatibilité avec les navigateurs ? Je suis ravi que vous posiez la question ! La réponse est… intéressante, pour le moins.

Contrairement à la plupart des autres fonctionnalités modernes de JavaScript, les `BigInt` ne peuvent pas raisonnablement être transpilées vers ES5.

La proposition `BigInt` [modifie le comportement des opérateurs](#operators) (comme `+`, `>=`, etc.) pour fonctionner avec les `BigInt`. Ces modifications sont impossibles à polyfiller directement, et elles rendent également irréalisable (dans la plupart des cas) la transpilation du code `BigInt` en code de substitution à l'aide de Babel ou d'outils similaires. La raison en est qu'une telle transpilation devrait remplacer *chaque opérateur* dans le programme par un appel à une fonction qui effectue des contrôles de type sur ses entrées, ce qui entraînerait une pénalité de performance inacceptable à l'exécution. De plus, cela augmenterait considérablement la taille du fichier de tout bundle transpilé, impactant négativement les temps de téléchargement, d'analyse et de compilation.

Une solution plus réalisable et durable est d'écrire votre code en utilisant [la bibliothèque JSBI](https://github.com/GoogleChromeLabs/jsbi#why) pour l'instant. JSBI est un port JavaScript de l'implémentation de `BigInt` dans V8 et Chrome — par conception, il se comporte exactement comme la fonctionnalité native de `BigInt`. La différence est qu'au lieu de s'appuyer sur la syntaxe, il expose [une API](https://github.com/GoogleChromeLabs/jsbi#how) :

```js
import JSBI from './jsbi.mjs';

const max = JSBI.BigInt(Number.MAX_SAFE_INTEGER);
const two = JSBI.BigInt('2');
const result = JSBI.add(max, two);
console.log(result.toString());
// → '9007199254740993'
```

Une fois que les `BigInt` sont nativement supportés dans tous les navigateurs qui vous intéressent, vous pouvez [utiliser `babel-plugin-transform-jsbi-to-bigint` pour transpiler votre code en code natif `BigInt`](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint) et supprimer la dépendance JSBI. Par exemple, l'exemple ci-dessus se transpile en :

```js
const max = BigInt(Number.MAX_SAFE_INTEGER);
const two = 2n;
const result = max + two;
console.log(result);
// → '9007199254740993'
```

## Lectures complémentaires

Si vous êtes intéressé par le fonctionnement des `BigInt` en coulisses (par exemple, comment ils sont représentés en mémoire, et comment les opérations sur eux sont effectuées), [lisez notre article de blog V8 avec des détails d'implémentation](/blog/bigint).

## Support des `BigInt`

<feature-support chrome="67 /blog/bigint"
                 firefox="68 https://wingolog.org/archives/2019/05/23/bigint-shipping-in-firefox"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes #polyfilling-transpiling"></feature-support>
