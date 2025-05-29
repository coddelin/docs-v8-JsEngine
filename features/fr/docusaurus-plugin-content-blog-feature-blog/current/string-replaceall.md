---
title: &apos;`String.prototype.replaceAll`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-11-11
tags:
  - ECMAScript
  - ES2021
  - Node.js 16
description: &apos;Le JavaScript prend désormais en charge le remplacement global de sous-chaînes grâce à la nouvelle API `String.prototype.replaceAll`.&apos;
tweet: &apos;1193917549060280320&apos;
---
Si vous avez déjà travaillé avec des chaînes de caractères en JavaScript, il y a de fortes chances que vous ayez rencontré la méthode `String#replace`. `String.prototype.replace(searchValue, replacement)` renvoie une chaîne avec certains correspondances remplacées, en fonction des paramètres que vous spécifiez :

<!--truncate-->
```js
&apos;abc&apos;.replace(&apos;b&apos;, &apos;_&apos;);
// → &apos;a_c&apos;

&apos;🍏🍋🍊🍓&apos;.replace(&apos;🍏&apos;, &apos;🥭&apos;);
// → &apos;🥭🍋🍊🍓&apos;
```

Un cas d'utilisation courant est de remplacer _toutes_ les instances d'une sous-chaîne donnée. Cependant, `String#replace` ne traite pas directement ce cas. Lorsque `searchValue` est une chaîne de caractères, seule la première occurrence de la sous-chaîne est remplacée :

```js
&apos;aabbcc&apos;.replace(&apos;b&apos;, &apos;_&apos;);
// → &apos;aa_bcc&apos;

&apos;🍏🍏🍋🍋🍊🍊🍓🍓&apos;.replace(&apos;🍏&apos;, &apos;🥭&apos;);
// → &apos;🥭🍏🍋🍋🍊🍊🍓🍓&apos;
```

Pour contourner cela, les développeurs transforment souvent la chaîne de recherche en une expression régulière avec le drapeau global (`g`). De cette façon, `String#replace` remplace _toutes_ les correspondances :

```js
&apos;aabbcc&apos;.replace(/b/g, &apos;_&apos;);
// → &apos;aa__cc&apos;

&apos;🍏🍏🍋🍋🍊🍊🍓🍓&apos;.replace(/🍏/g, &apos;🥭&apos;);
// → &apos;🥭🥭🍋🍋🍊🍊🍓🍓&apos;
```

En tant que développeur, il est embêtant de devoir effectuer cette conversion chaîne-à-regexp si tout ce que vous voulez vraiment est un remplacement global de sous-chaîne. Plus important encore, cette conversion est sujette à erreur et constitue une source fréquente de bugs ! Considérez l'exemple suivant :

```js
const queryString = &apos;q=query+string+parameters&apos;;

queryString.replace(&apos;+&apos;, &apos; &apos;);
// → &apos;q=query string+parameters&apos; ❌
// Seule la première occurrence est remplacée.

queryString.replace(/+/, &apos; &apos;);
// → SyntaxError: invalid regular expression ❌
// En fait, `+` est un caractère spécial dans les motifs regexp.

queryString.replace(/\+/, &apos; &apos;);
// → &apos;q=query string+parameters&apos; ❌
// L'échappement des caractères spéciaux de regexp rend le regexp valide, mais
// cela remplace toujours seulement la première occurrence de `+` dans la chaîne.

queryString.replace(/\+/g, &apos; &apos;);
// → &apos;q=query string parameters&apos; ✅
// L'échappement des caractères spéciaux de regexp ET l'utilisation du drapeau `g` font que ça marche.
```

Transformer une chaîne littérale comme `&apos;+&apos;` en une expression régulière globale ne consiste pas seulement à supprimer les guillemets `&apos;`, à l'envelopper dans des barres obliques `/` et à ajouter le drapeau `g` — nous devons échapper tous les caractères ayant une signification spéciale dans les expressions régulières. Cela est facile à oublier et difficile à faire correctement, puisque JavaScript n'offre pas de mécanisme intégré pour échapper les motifs d'expressions régulières.

Une autre solution de contournement consiste à combiner `String#split` avec `Array#join` :

```js
const queryString = &apos;q=query+string+parameters&apos;;
queryString.split(&apos;+&apos;).join(&apos; &apos;);
// → &apos;q=query string parameters&apos;
```

Cette approche évite tout échappement mais implique la surcharge de diviser la chaîne en un tableau de parties uniquement pour la réassembler.

Il est clair qu'aucune de ces solutions de contournement n'est idéale. Ne serait-il pas agréable qu'une opération de base telle que le remplacement global de sous-chaîne soit simple en JavaScript ?

## `String.prototype.replaceAll`

La nouvelle méthode `String#replaceAll` résout ces problèmes et offre un mécanisme simple pour effectuer un remplacement global de sous-chaîne :

```js
&apos;aabbcc&apos;.replaceAll(&apos;b&apos;, &apos;_&apos;);
// → &apos;aa__cc&apos;

&apos;🍏🍏🍋🍋🍊🍊🍓🍓&apos;.replaceAll(&apos;🍏&apos;, &apos;🥭&apos;);
// → &apos;🥭🥭🍋🍋🍊🍊🍓🍓&apos;

const queryString = &apos;q=query+string+parameters&apos;;
queryString.replaceAll(&apos;+&apos;, &apos; &apos;);
// → &apos;q=query string parameters&apos;
```

Pour une cohérence avec les API existantes du langage, `String.prototype.replaceAll(searchValue, replacement)` se comporte exactement comme `String.prototype.replace(searchValue, replacement)`, avec les deux exceptions suivantes :

1. Si `searchValue` est une chaîne de caractères, alors `String#replace` ne remplace que la première occurrence de la sous-chaîne, tandis que `String#replaceAll` remplace _toutes_ les occurrences.
1. Si `searchValue` est une RegExp non globale, alors `String#replace` ne remplace qu'une seule correspondance, de manière similaire à son comportement avec les chaînes. `String#replaceAll` en revanche lève une exception dans ce cas, puisque c'est probablement une erreur : si vous voulez vraiment « remplacer toutes » les correspondances, vous utiliseriez une expression régulière globale ; si vous souhaitez remplacer une seule correspondance, vous pouvez utiliser `String#replace`.

L'élément neuf important réside dans ce premier point. `String.prototype.replaceAll` enrichit le JavaScript avec une prise en charge de premier ordre pour le remplacement global de sous-chaîne, sans nécessiter d'expressions régulières ou d'autres solutions de contournement.

## Une note sur les motifs de remplacement spéciaux

Cela vaut la peine de mentionner : `replace` et `replaceAll` prennent en charge [les modèles de remplacement spéciaux](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement). Bien que ceux-ci soient principalement utiles en combinaison avec des expressions régulières, certains d'entre eux (`$$`, `$&`, ``$` ``, et `$&apos;`) prennent également effet lors d’un simple remplacement de chaîne, ce qui peut être surprenant :

```js
&apos;xyz&apos;.replaceAll(&apos;y&apos;, &apos;$$&apos;);
// → &apos;x$z&apos; (et non &apos;x$$z&apos;)
```

Si votre chaîne de remplacement contient l'un de ces modèles et que vous souhaitez les utiliser tels quels, vous pouvez désactiver le comportement de substitution magique en utilisant une fonction de remplacement qui renvoie la chaîne à la place :

```js
&apos;xyz&apos;.replaceAll(&apos;y&apos;, () => &apos;$$&apos;);
// → &apos;x$$z&apos;
```

## Support de `String.prototype.replaceAll`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9801"
                 firefox="77 https://bugzilla.mozilla.org/show_bug.cgi?id=1608168#c8"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
