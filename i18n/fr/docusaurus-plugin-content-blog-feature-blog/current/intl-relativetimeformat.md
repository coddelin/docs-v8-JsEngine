---
title: "`Intl.RelativeTimeFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-10-22
tags: 
  - Intl
  - Node.js 12
  - io19
description: "Intl.RelativeTimeFormat permet la mise en forme localisée des temps relatifs sans sacrifier les performances."
tweet: "1054387117571354624"
---
Les applications web modernes utilisent souvent des phrases comme « hier », « il y a 42 secondes », ou « dans 3 mois » au lieu de dates complètes et de marques temporelles. Ces _valeurs formatées en temps relatif_ sont devenues si courantes que plusieurs bibliothèques populaires implémentent des fonctions utilitaires pour les formater de manière localisée. (Des exemples incluent [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize), et [date-fns](https://date-fns.org/docs/).)

<!--truncate-->
Un problème avec l'implémentation d'un formateur de temps relatif localisé est que vous avez besoin d'une liste de mots ou phrases usuels (comme « hier » ou « trimestre précédent ») pour chaque langue que vous souhaitez prendre en charge. [Le Unicode CLDR](http://cldr.unicode.org/) fournit ces données, mais pour les utiliser en JavaScript, elles doivent être intégrées et incluses avec le code des autres bibliothèques. Cela augmente malheureusement la taille des bundles pour ces bibliothèques, ce qui a un impact négatif sur les temps de chargement, les coûts de parsing/compilation et la consommation de mémoire.

La toute nouvelle API `Intl.RelativeTimeFormat` transfert cette charge au moteur JavaScript, qui peut fournir les données de langue et les rendre directement accessibles aux développeurs JavaScript. `Intl.RelativeTimeFormat` permet la mise en forme localisée des temps relatifs sans sacrifier les performances.

## Exemples d'utilisation

L'exemple suivant montre comment créer un formateur de temps relatif en utilisant la langue anglaise.

```js
const rtf = new Intl.RelativeTimeFormat('en');

rtf.format(3.14, 'second');
// → 'in 3.14 seconds'

rtf.format(-15, 'minute');
// → '15 minutes ago'

rtf.format(8, 'hour');
// → 'in 8 hours'

rtf.format(-2, 'day');
// → '2 days ago'

rtf.format(3, 'week');
// → 'in 3 weeks'

rtf.format(-5, 'month');
// → '5 months ago'

rtf.format(2, 'quarter');
// → 'in 2 quarters'

rtf.format(-42, 'year');
// → '42 years ago'
```

Notez que l'argument passé au constructeur `Intl.RelativeTimeFormat` peut être soit une chaîne contenant [un tag de langue BCP 47](https://tools.ietf.org/html/rfc5646) soit [un tableau de tels tags de langue](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation).

Voici un exemple d'utilisation d'une autre langue (l'espagnol) :

```js
const rtf = new Intl.RelativeTimeFormat('es');

rtf.format(3.14, 'second');
// → 'dentro de 3,14 segundos'

rtf.format(-15, 'minute');
// → 'hace 15 minutos'

rtf.format(8, 'hour');
// → 'dentro de 8 horas'

rtf.format(-2, 'day');
// → 'hace 2 días'

rtf.format(3, 'week');
// → 'dentro de 3 semanas'

rtf.format(-5, 'month');
// → 'hace 5 meses'

rtf.format(2, 'quarter');
// → 'dentro de 2 trimestres'

rtf.format(-42, 'year');
// → 'hace 42 años'
```

De plus, le constructeur `Intl.RelativeTimeFormat` accepte un argument optionnel `options`, qui permet un contrôle précis du rendu. Pour illustrer la flexibilité, examinons un rendu en anglais basé sur les paramètres par défaut :

```js
// Créer un formateur de temps relatif pour la langue anglaise, en utilisant les
// paramètres par défaut (comme avant). Dans cet exemple, les valeurs par défaut
// sont passées explicitement.
const rtf = new Intl.RelativeTimeFormat('en', {
  localeMatcher: 'best fit', // autres valeurs : 'lookup'
  style: 'long', // autres valeurs : 'short' ou 'narrow'
  numeric: 'always', // autres valeurs : 'auto'
});

// Maintenant, essayons des cas spéciaux !

rtf.format(-1, 'day');
// → '1 day ago'

rtf.format(0, 'day');
// → 'in 0 days'

rtf.format(1, 'day');
// → 'in 1 day'

rtf.format(-1, 'week');
// → '1 week ago'

rtf.format(0, 'week');
// → 'in 0 weeks'

rtf.format(1, 'week');
// → 'in 1 week'
```

Vous avez peut-être remarqué que le formateur ci-dessus produit la chaîne `'1 day ago'` au lieu de `'yesterday'`, et l'expression légèrement maladroite `'in 0 weeks'` au lieu de `'this week'`. Cela se produit parce que, par défaut, le formateur utilise la valeur numérique dans le rendu.

Pour modifier ce comportement, définissez l'option `numeric` sur `'auto'` (au lieu de la valeur implicite par défaut `'always'`) :

```js
// Créer un formateur de temps relatif pour la langue anglaise qui ne
// doit pas toujours utiliser une valeur numérique dans le rendu.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'yesterday'

rtf.format(0, 'day');
// → 'today'

rtf.format(1, 'day');
// → 'tomorrow'

rtf.format(-1, 'week');
// → 'last week'

rtf.format(0, 'week');
// → 'this week'

rtf.format(1, 'week');
// → 'next week'
```

Analogues à d'autres classes `Intl`, `Intl.RelativeTimeFormat` possède une méthode `formatToParts` en plus de la méthode `format`. Bien que `format` couvre le cas d'utilisation le plus courant, `formatToParts` peut être utile si vous avez besoin d'accéder aux parties individuelles de la sortie générée :

```js
// Créez un formateur de temps relatif pour la langue anglaise qui
// n'a pas toujours besoin d'utiliser une valeur numérique dans la sortie.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'hier'

rtf.formatToParts(-1, 'day');
// → [{ type: 'literal', value: 'hier' }]

rtf.format(3, 'week');
// → 'dans 3 semaines'

rtf.formatToParts(3, 'week');
// → [{ type: 'literal', value: 'dans ' },
//    { type: 'integer', value: '3', unit: 'week' },
//    { type: 'literal', value: ' semaines' }]
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
