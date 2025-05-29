---
title: &apos;Indicateur `v` de RegExp avec la notation des ensembles et les propriétés des chaînes&apos;
author: &apos;Mark Davis ([@mark_e_davis](https://twitter.com/mark_e_davis)), Markus Scherer, et Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mark-davis&apos;
  - &apos;markus-scherer&apos;
  - &apos;mathias-bynens&apos;
date: 2022-06-27
tags:
  - ECMAScript
description: &apos;Le nouvel indicateur `v` de RegExp active le mode `unicodeSets`, offrant un support pour les classes de caractères étendues, y compris les propriétés Unicode des chaînes, la notation des ensembles et une correspondance insensible à la casse améliorée.&apos;
tweet: &apos;1541419838513594368&apos;
---
JavaScript prend en charge les expressions régulières depuis ECMAScript 3 (1999). Seize ans plus tard, ES2015 a introduit le [mode Unicode (l&apos;indicateur `u`)](https://mathiasbynens.be/notes/es6-unicode-regex), [le mode sticky (l&apos;indicateur `y`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky#description), et [l&apos;accessoire `flags` de `RegExp.prototype`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/flags). Trois ans plus tard, ES2018 a introduit le [mode `dotAll` (l&apos;indicateur `s`)](https://mathiasbynens.be/notes/es-regexp-proposals#dotAll), [les assertions en arrière-plan](https://mathiasbynens.be/notes/es-regexp-proposals#lookbehinds), [les groupes capturants nommés](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups), et [les échappements des propriétés des caractères Unicode](https://mathiasbynens.be/notes/es-unicode-property-escapes). Et dans ES2020, [`String.prototype.matchAll`](https://v8.dev/features/string-matchall) a facilité l&apos;utilisation des expressions régulières. Les expressions régulières JavaScript ont parcouru un long chemin et continuent de s&apos;améliorer.

<!--truncate-->
Le dernier exemple de progrès est [le nouveau mode `unicodeSets`, activé avec l&apos;indicateur `v`](https://github.com/tc39/proposal-regexp-v-flag). Ce nouveau mode offre un support pour les _classes de caractères étendues_, y compris les fonctionnalités suivantes :

- [Propriétés Unicode des chaînes](/features/regexp-v-flag#unicode-properties-of-strings)
- [Notation des ensembles + syntaxe littérale de chaîne](/features/regexp-v-flag#set-notation)
- [Amélioration de la correspondance insensible à la casse](/features/regexp-v-flag#ignoreCase)

Cet article approfondit chacun de ces points. Mais commençons par le commencement — voici comment utiliser le nouvel indicateur :

```js
const re = /…/v;
```

L&apos;indicateur `v` peut être combiné avec les indicateurs existants des expressions régulières, à une exception notable près. L&apos;indicateur `v` active toutes les bonnes parties de l&apos;indicateur `u`, mais avec des fonctionnalités et des améliorations supplémentaires — certaines d&apos;entre elles étant incompatibles avec l&apos;indicateur `u`. Il est essentiel de noter que `v` est un mode complètement distinct de `u` plutôt qu&apos;un mode complémentaire. Pour cette raison, les indicateurs `v` et `u` ne peuvent pas être combinés — tenter d&apos;utiliser les deux indicateurs dans une même expression régulière entraîne une erreur. Les seules options valables sont : soit utiliser `u`, soit utiliser `v`, soit n&apos;utiliser ni `u` ni `v`. Mais puisque `v` est l&apos;option la plus complète en termes de fonctionnalités, le choix est vite fait…

Plongeons dans les nouvelles fonctionnalités !

## Propriétés Unicode des chaînes

Le standard Unicode attribue diverses propriétés et valeurs de propriétés à chaque symbole. Par exemple, pour obtenir l&apos;ensemble des symboles utilisés dans l&apos;alphabet grec, recherchez dans la base de données Unicode les symboles dont la propriété `Script_Extensions` inclut `Greek`.

Les échappements des propriétés des caractères Unicode de ES2018 permettent d&apos;accéder à ces propriétés Unicode de manière native dans les expressions régulières ECMAScript. Par exemple, le modèle `\p{Script_Extensions=Greek}` correspond à chaque symbole utilisé dans l&apos;alphabet grec :

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test(&apos;π&apos;);
// → true
```

Par définition, les propriétés des caractères Unicode s&apos;étendent à un ensemble de points de code, et peuvent donc être transpilées sous la forme d&apos;une classe de caractères contenant les points de code correspondant individuellement. Par exemple, `\p{ASCII_Hex_Digit}` est équivalent à `[0-9A-Fa-f]`: il ne correspond jamais qu&apos;à un seul caractère/pont de code Unicode à la fois. Dans certaines situations, cela est insuffisant :

```js
// Unicode définit une propriété de caractère nommée “Emoji”.
const re = /^\p{Emoji}$/u;

// Correspondre à un emoji composé uniquement d&apos;un point de code :
re.test(&apos;⚽&apos;); // &apos;\u26BD&apos;
// → true ✅

// Correspondre à un emoji composé de plusieurs points de code :
re.test(&apos;👨🏾‍⚕️&apos;); // &apos;\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F&apos;
// → false ❌
```

Dans l&apos;exemple ci-dessus, l&apos;expression régulière ne correspond pas à l&apos;emoji 👨🏾‍⚕️ car il se compose de plusieurs points de code, et `Emoji` est une propriété _de caractère_ Unicode.

Heureusement, la norme Unicode définit également plusieurs [propriétés des chaînes](https://www.unicode.org/reports/tr18/#domain_of_properties). Ces propriétés s'étendent à un ensemble de chaînes, chacune contenant un ou plusieurs points de code. Dans les expressions régulières, les propriétés des chaînes se traduisent par un ensemble d'alternatives. Pour illustrer cela, imaginez une propriété Unicode qui s'applique aux chaînes `&apos;a&apos;`, `&apos;b&apos;`, `&apos;c&apos;`, `&apos;W&apos;`, `&apos;xy&apos;` et `&apos;xyz&apos;`. Cette propriété se traduit par l'un des motifs d'expressions régulières suivants (en utilisant l'alternance) : `xyz|xy|a|b|c|W` ou `xyz|xy|[a-cW]`. (Les chaînes les plus longues en premier, afin qu'un préfixe comme `&apos;xy&apos;` ne masque pas une chaîne plus longue comme `&apos;xyz&apos;`.) Contrairement aux séquences d'échappement de propriété Unicode existantes, ce modèle peut correspondre à des chaînes multicaractères. Voici un exemple d'utilisation d'une propriété de chaînes :

```js
const re = /^\p{RGI_Emoji}$/v;

// Correspondre à un emoji composé d'un seul point de code :
re.test(&apos;⚽&apos;); // &apos;\u26BD&apos;
// → true ✅

// Correspondre à un emoji composé de plusieurs points de code :
re.test(&apos;👨🏾‍⚕️&apos;); // &apos;\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F&apos;
// → true ✅
```

Cet extrait de code fait référence à la propriété des chaînes `RGI_Emoji`, que Unicode définit comme « le sous-ensemble de tous les emoji valides (caractères et séquences) recommandés pour l'échange général ». Grâce à cela, nous pouvons désormais correspondre aux emoji quelle que soit la quantité de points de code qui les composent !

Le drapeau `v` active le support pour les propriétés Unicode suivantes des chaînes, dès le départ :

- `Basic_Emoji`
- `Emoji_Keycap_Sequence`
- `RGI_Emoji_Modifier_Sequence`
- `RGI_Emoji_Flag_Sequence`
- `RGI_Emoji_Tag_Sequence`
- `RGI_Emoji_ZWJ_Sequence`
- `RGI_Emoji`

Cette liste des propriétés prises en charge pourrait s'étendre à l'avenir à mesure que la norme Unicode définit des propriétés supplémentaires des chaînes. Bien que toutes les propriétés actuelles des chaînes soient liées aux emoji, de futures propriétés pourraient correspondre à des cas d'utilisation totalement différents.

:::note
**Remarque :** Bien que les propriétés des chaînes soient actuellement liées au nouveau drapeau `v`, [nous prévoyons de les rendre disponibles également en mode `u` à terme](https://github.com/tc39/proposal-regexp-v-flag/issues/49).
:::

## Notation d'ensemble + syntaxe des littéraux de chaîne

Lors de l'utilisation des séquences d'échappement `\p{…}` (propriétés des caractères ou nouvelles propriétés des chaînes), il peut être utile d'effectuer des différences/soustractions ou des intersections. Avec le drapeau `v`, les classes de caractères peuvent désormais être imbriquées, et ces opérations d'ensemble peuvent désormais être effectuées directement au sein d'elles au lieu d'utiliser des assertions d'anticipation ou de retour arrière adjacentes, ou des classes de caractères longues exprimant les plages calculées.

### Différence/soustraction avec `--`

La syntaxe `A--B` peut être utilisée pour correspondre aux chaînes _dans `A` mais pas dans `B`_, c'est-à-dire différence/soustraction.

Par exemple, que faire si vous voulez correspondre à tous les symboles grecs sauf la lettre `π` ? Avec la notation d'ensemble, résoudre cela est trivial :

```js
/[\p{Script_Extensions=Greek}--π]/v.test(&apos;π&apos;); // → false
```

En utilisant `--` pour la différence/soustraction, le moteur d'expression régulière fait le travail difficile pour vous tout en gardant votre code lisible et maintenable.

Et si, au lieu d'un seul caractère, nous voulions soustraire l'ensemble des caractères `α`, `β` et `γ` ? Pas de problème : nous pouvons utiliser une classe de caractères imbriquée et en soustraire le contenu :

```js
/[\p{Script_Extensions=Greek}--[αβγ]]/v.test(&apos;α&apos;); // → false
/[\p{Script_Extensions=Greek}--[α-γ]]/v.test(&apos;β&apos;); // → false
```

Un autre exemple est de correspondre aux chiffres non ASCII, par exemple pour les convertir en chiffres ASCII par la suite :

```js
/[\p{Decimal_Number}--[0-9]]/v.test(&apos;𑜹&apos;); // → true
/[\p{Decimal_Number}--[0-9]]/v.test(&apos;4&apos;); // → false
```

La notation d'ensemble peut également être utilisée avec les nouvelles propriétés des chaînes :

```js
// Remarque : 🏴 comporte 7 points de code.

/^\p{RGI_Emoji_Tag_Sequence}$/v.test(&apos;🏴&apos;); // → true
/^[\p{RGI_Emoji_Tag_Sequence}--\q{🏴}]$/v.test(&apos;🏴&apos;); // → false
```

Cet exemple correspond à toute séquence d'étiquette emoji RGI _sauf_ pour le drapeau de l'Écosse. Notez l'utilisation de `\q{…}` qui est une autre nouveauté syntaxique pour les littéraux de chaîne au sein des classes de caractères. Par exemple, `\q{a|bc|def}` correspond aux chaînes `a`, `bc` et `def`. Sans `\q{…}`, il ne serait pas possible de soustraire des chaînes codées en dur multicaractères.

### Intersection avec `&&`

La syntaxe `A&&B` correspond aux chaînes _présentes à la fois dans `A` et `B`_, c'est-à-dire intersection. Cela vous permet de faire des choses comme correspondre aux lettres grecques :

```js
const re = /[\p{Script_Extensions=Greek}&&\p{Letter}]/v;
// U+03C0 PETITE LETTRE GRECQUE PI
re.test(&apos;π&apos;); // → true
// U+1018A SIGNE ZÉRO GREC
re.test(&apos;𐆊&apos;); // → false
```

Correspondre à tous les espaces blancs ASCII :

```js
const re = /[\p{White_Space}&&\p{ASCII}]/v;
re.test(&apos;\n&apos;); // → true
re.test(&apos;\u2028&apos;); // → false
```

Ou correspondre à tous les chiffres mongols :

```js
const re = /[\p{Script_Extensions=Mongolian}&&\p{Number}]/v;
// U+1817 CHIFFRE MONGOL SEPT
re.test(&apos;᠗&apos;); // → true
// U+1834 LETTRE MONGOL CHA
re.test(&apos;ᠴ&apos;); // → false
```

### Union

Correspondre à des chaînes _dans A ou dans B_ était déjà possible auparavant pour les chaînes à caractère unique en utilisant une classe de caractères comme `[\p{Letter}\p{Number}]`. Avec le drapeau `v`, cette fonctionnalité devient plus puissante, car elle peut désormais être combinée avec les propriétés des chaînes ou des littéraux de chaîne :

```js
const re = /^[\p{Emoji_Keycap_Sequence}\p{ASCII}\q{🇧🇪|abc}xyz0-9]$/v;

re.test(&apos;4️⃣&apos;); // → true
re.test(&apos;_&apos;); // → true
re.test(&apos;🇧🇪&apos;); // → true
re.test(&apos;abc&apos;); // → true
re.test(&apos;x&apos;); // → true
re.test(&apos;4&apos;); // → true
```

La classe de caractères dans ce modèle combine :

- une propriété des chaînes (`\p{Emoji_Keycap_Sequence}`)
- une propriété de caractère (`\p{ASCII}`)
- la syntaxe des littéraux de chaîne pour les chaînes multicodes `🇧🇪` et `abc`
- la syntaxe classique des classes de caractères pour les caractères seuls `x`, `y`, et `z`
- syntaxe classique de classe de caractères pour la plage de caractères de `0` à `9`

Un autre exemple consiste à faire correspondre tous les emojis de drapeau couramment utilisés, qu’ils soient encodés sous forme de code ISO à deux lettres (`RGI_Emoji_Flag_Sequence`) ou sous forme de séquence d’étiquettes spécifiques (`RGI_Emoji_Tag_Sequence`):

```js
const reFlag = /[\p{RGI_Emoji_Flag_Sequence}\p{RGI_Emoji_Tag_Sequence}]/v;
// Une séquence de drapeau, composée de 2 points de code (drapeau de la Belgique):
reFlag.test(&apos;🇧🇪&apos;); // → vrai
// Une séquence d’étiquettes, composée de 7 points de code (drapeau de l'Angleterre):
reFlag.test(&apos;🏴&apos;); // → vrai
// Une séquence de drapeau, composée de 2 points de code (drapeau de la Suisse):
reFlag.test(&apos;🇨🇭&apos;); // → vrai
// Une séquence d’étiquettes, composée de 7 points de code (drapeau du Pays de Galles):
reFlag.test(&apos;🏴&apos;); // → vrai
```

## Amélioration de la correspondance insensible à la casse

Le drapeau `u` de l’ES2015 souffre d’un [comportement déroutant en matière de correspondance insensible à la casse](https://github.com/tc39/proposal-regexp-v-flag/issues/30). Considérez les deux expressions régulières suivantes :

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;
```

Le premier motif correspond à toutes les lettres minuscules. Le deuxième motif utilise `\P` au lieu de `\p` pour correspondre à tous les caractères sauf les lettres minuscules, mais est ensuite encapsulé dans une classe de caractères négative (`[^…]`). Les deux expressions régulières sont rendues insensibles à la casse en définissant le drapeau `i` (`ignoreCase`).

Intuitivement, vous pourriez vous attendre à ce que les deux expressions régulières se comportent de la même manière. En pratique, elles se comportent très différemment :

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;

const string = &apos;aAbBcC4#&apos;;

string.replaceAll(re1, &apos;X&apos;);
// → &apos;XXXXXX4#&apos;

string.replaceAll(re2, &apos;X&apos;);
// → &apos;aAbBcC4#&apos;&apos;
```

Le nouveau drapeau `v` a un comportement moins surprenant. Avec le drapeau `v` au lieu du drapeau `u`, les deux motifs se comportent de la même manière :

```js
const re1 = /\p{Lowercase_Letter}/giv;
const re2 = /[^\P{Lowercase_Letter}]/giv;

const string = &apos;aAbBcC4#&apos;;

string.replaceAll(re1, &apos;X&apos;);
// → &apos;XXXXXX4#&apos;

string.replaceAll(re2, &apos;X&apos;);
// → &apos;XXXXXX4#&apos;
```

Plus généralement, le drapeau `v` fait que `[^\p{X}]` ≍ `[\P{X}]` ≍ `\P{X}` et `[^\P{X}]` ≍ `[\p{X}]` ≍ `\p{X}`, que le drapeau `i` soit défini ou non.

## Lectures supplémentaires

[Le dépôt de la proposition](https://github.com/tc39/proposal-regexp-v-flag) contient plus de détails et de contexte autour de ces fonctionnalités et de leurs décisions de conception.

Dans le cadre de notre travail sur ces fonctionnalités JavaScript, nous sommes allés au-delà de la simple proposition de modifications de spécification pour ECMAScript. Nous avons intégré en amont la définition des « propriétés des chaînes » dans [Unicode UTS#18](https://unicode.org/reports/tr18/#Notation_for_Properties_of_Strings) afin que d'autres langages de programmation puissent implémenter des fonctionnalités similaires de manière unifiée. Nous proposons également un [changement dans la norme HTML](https://github.com/whatwg/html/pull/7908) dans le but de permettre ces nouvelles fonctionnalités dans l'attribut `pattern` également.

## Prise en charge du drapeau `v` dans RegExp

V8 v11.0 (Chrome 110) propose une prise en charge expérimentale de cette nouvelle fonctionnalité via le drapeau `--harmony-regexp-unicode-sets`. V8 v12.0 (Chrome 112) a activé les nouvelles fonctionnalités par défaut. Babel prend également en charge la transpilation du drapeau `v` — [essayez les exemples de cet article dans le REPL Babel](https://babeljs.io/repl#?code_lz=MYewdgzgLgBATgUxgXhgegNoYIYFoBmAugGTEbC4AWhhaAbgNwBQTaaMAKpQJYQy8xKAVwDmSQCgEMKHACeMIWFABbJQjBRuYEfygBCVmlCRYCJSABW3FOgA6ABwDeAJQDiASQD6AUTOWAvvTMQA&presets=stage-3)! Le tableau de support ci-dessous contient des liens vers les problèmes de suivi auxquels vous pouvez vous abonner pour les mises à jour.

<feature-support chrome="112 https://bugs.chromium.org/p/v8/issues/detail?id=11935"
                 firefox="116 https://bugzilla.mozilla.org/show_bug.cgi?id=regexp-v-flag"
                 safari="17 https://bugs.webkit.org/show_bug.cgi?id=regexp-v-flag"
                 nodejs="20"
                 babel="7.17.0 https://babeljs.io/blog/2022/02/02/7.17.0"></feature-support>
