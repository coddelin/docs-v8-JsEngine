---
title: &apos;`Intl.RelativeTimeFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-10-22
tags:
  - Intl
  - Node.js 12
  - io19
description: &apos;Intl.RelativeTimeFormat permet la mise en forme localisée des temps relatifs sans sacrifier les performances.&apos;
tweet: &apos;1054387117571354624&apos;
---
Les applications web modernes utilisent souvent des phrases comme « hier », « il y a 42 secondes », ou « dans 3 mois » au lieu de dates complètes et de marques temporelles. Ces _valeurs formatées en temps relatif_ sont devenues si courantes que plusieurs bibliothèques populaires implémentent des fonctions utilitaires pour les formater de manière localisée. (Des exemples incluent [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize), et [date-fns](https://date-fns.org/docs/).)

<!--truncate-->
Un problème avec l&apos;implémentation d&apos;un formateur de temps relatif localisé est que vous avez besoin d&apos;une liste de mots ou phrases usuels (comme « hier » ou « trimestre précédent ») pour chaque langue que vous souhaitez prendre en charge. [Le Unicode CLDR](http://cldr.unicode.org/) fournit ces données, mais pour les utiliser en JavaScript, elles doivent être intégrées et incluses avec le code des autres bibliothèques. Cela augmente malheureusement la taille des bundles pour ces bibliothèques, ce qui a un impact négatif sur les temps de chargement, les coûts de parsing/compilation et la consommation de mémoire.

La toute nouvelle API `Intl.RelativeTimeFormat` transfert cette charge au moteur JavaScript, qui peut fournir les données de langue et les rendre directement accessibles aux développeurs JavaScript. `Intl.RelativeTimeFormat` permet la mise en forme localisée des temps relatifs sans sacrifier les performances.

## Exemples d&apos;utilisation

L&apos;exemple suivant montre comment créer un formateur de temps relatif en utilisant la langue anglaise.

```js
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;);

rtf.format(3.14, &apos;second&apos;);
// → &apos;in 3.14 seconds&apos;

rtf.format(-15, &apos;minute&apos;);
// → &apos;15 minutes ago&apos;

rtf.format(8, &apos;hour&apos;);
// → &apos;in 8 hours&apos;

rtf.format(-2, &apos;day&apos;);
// → &apos;2 days ago&apos;

rtf.format(3, &apos;week&apos;);
// → &apos;in 3 weeks&apos;

rtf.format(-5, &apos;month&apos;);
// → &apos;5 months ago&apos;

rtf.format(2, &apos;quarter&apos;);
// → &apos;in 2 quarters&apos;

rtf.format(-42, &apos;year&apos;);
// → &apos;42 years ago&apos;
```

Notez que l&apos;argument passé au constructeur `Intl.RelativeTimeFormat` peut être soit une chaîne contenant [un tag de langue BCP 47](https://tools.ietf.org/html/rfc5646) soit [un tableau de tels tags de langue](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation).

Voici un exemple d&apos;utilisation d&apos;une autre langue (l&apos;espagnol) :

```js
const rtf = new Intl.RelativeTimeFormat(&apos;es&apos;);

rtf.format(3.14, &apos;second&apos;);
// → &apos;dentro de 3,14 segundos&apos;

rtf.format(-15, &apos;minute&apos;);
// → &apos;hace 15 minutos&apos;

rtf.format(8, &apos;hour&apos;);
// → &apos;dentro de 8 horas&apos;

rtf.format(-2, &apos;day&apos;);
// → &apos;hace 2 días&apos;

rtf.format(3, &apos;week&apos;);
// → &apos;dentro de 3 semanas&apos;

rtf.format(-5, &apos;month&apos;);
// → &apos;hace 5 meses&apos;

rtf.format(2, &apos;quarter&apos;);
// → &apos;dentro de 2 trimestres&apos;

rtf.format(-42, &apos;year&apos;);
// → &apos;hace 42 años&apos;
```

De plus, le constructeur `Intl.RelativeTimeFormat` accepte un argument optionnel `options`, qui permet un contrôle précis du rendu. Pour illustrer la flexibilité, examinons un rendu en anglais basé sur les paramètres par défaut :

```js
// Créer un formateur de temps relatif pour la langue anglaise, en utilisant les
// paramètres par défaut (comme avant). Dans cet exemple, les valeurs par défaut
// sont passées explicitement.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, {
  localeMatcher: &apos;best fit&apos;, // autres valeurs : &apos;lookup&apos;
  style: &apos;long&apos;, // autres valeurs : &apos;short&apos; ou &apos;narrow&apos;
  numeric: &apos;always&apos;, // autres valeurs : &apos;auto&apos;
});

// Maintenant, essayons des cas spéciaux !

rtf.format(-1, &apos;day&apos;);
// → &apos;1 day ago&apos;

rtf.format(0, &apos;day&apos;);
// → &apos;in 0 days&apos;

rtf.format(1, &apos;day&apos;);
// → &apos;in 1 day&apos;

rtf.format(-1, &apos;week&apos;);
// → &apos;1 week ago&apos;

rtf.format(0, &apos;week&apos;);
// → &apos;in 0 weeks&apos;

rtf.format(1, &apos;week&apos;);
// → &apos;in 1 week&apos;
```

Vous avez peut-être remarqué que le formateur ci-dessus produit la chaîne `&apos;1 day ago&apos;` au lieu de `&apos;yesterday&apos;`, et l&apos;expression légèrement maladroite `&apos;in 0 weeks&apos;` au lieu de `&apos;this week&apos;`. Cela se produit parce que, par défaut, le formateur utilise la valeur numérique dans le rendu.

Pour modifier ce comportement, définissez l&apos;option `numeric` sur `&apos;auto&apos;` (au lieu de la valeur implicite par défaut `&apos;always&apos;`) :

```js
// Créer un formateur de temps relatif pour la langue anglaise qui ne
// doit pas toujours utiliser une valeur numérique dans le rendu.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;yesterday&apos;

rtf.format(0, &apos;day&apos;);
// → &apos;today&apos;

rtf.format(1, &apos;day&apos;);
// → &apos;tomorrow&apos;

rtf.format(-1, &apos;week&apos;);
// → &apos;last week&apos;

rtf.format(0, &apos;week&apos;);
// → &apos;this week&apos;

rtf.format(1, &apos;week&apos;);
// → &apos;next week&apos;
```

Analogues à d'autres classes `Intl`, `Intl.RelativeTimeFormat` possède une méthode `formatToParts` en plus de la méthode `format`. Bien que `format` couvre le cas d'utilisation le plus courant, `formatToParts` peut être utile si vous avez besoin d'accéder aux parties individuelles de la sortie générée :

```js
// Créez un formateur de temps relatif pour la langue anglaise qui
// n'a pas toujours besoin d'utiliser une valeur numérique dans la sortie.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;hier&apos;

rtf.formatToParts(-1, &apos;day&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;hier&apos; }]

rtf.format(3, &apos;week&apos;);
// → &apos;dans 3 semaines&apos;

rtf.formatToParts(3, &apos;week&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;dans &apos; },
//    { type: &apos;integer&apos;, value: &apos;3&apos;, unit: &apos;week&apos; },
//    { type: &apos;literal&apos;, value: &apos; semaines&apos; }]
```

Pour plus d'informations sur les options restantes et leur comportement, consultez [la documentation API dans le dépôt de la proposition](https://github.com/tc39/proposal-intl-relative-time#api).

## Conclusion

`Intl.RelativeTimeFormat` est disponible par défaut dans V8 v7.1 et Chrome 71. À mesure que cette API devient plus largement disponible, vous trouverez des bibliothèques telles que [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize) et [date-fns](https://date-fns.org/docs/) qui abandonnent leur dépendance aux bases de données CLDR codées en dur au profit de la fonctionnalité de formatage de temps relatif native, améliorant ainsi les performances de chargement, d'analyse et de compilation, d'exécution et d'utilisation de la mémoire.

## Support de `Intl.RelativeTimeFormat`

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="non"></feature-support>
