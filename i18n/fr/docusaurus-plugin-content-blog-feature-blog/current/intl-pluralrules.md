---
title: "`Intl.PluralRules`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2017-10-04
tags:
  - Intl
description: 'La gestion des pluriels est l'un des nombreux problèmes qui peuvent sembler simples, jusqu'à ce que vous réalisiez que chaque langue a ses propres règles de pluralisation. L'API Intl.PluralRules peut vous aider !'
tweet: "915542989493202944"
---
Iñtërnâtiônàlizætiøn est difficile. La gestion des pluriels est l'un des nombreux problèmes qui peuvent sembler simples, jusqu'à ce que vous réalisiez que chaque langue a ses propres règles de pluralisation.

Pour la pluralisation en anglais, il n'y a que deux résultats possibles. Prenons le mot « chat » comme exemple :

- 1 chat, c'est-à-dire la forme `'one'`, connue comme le singulier en anglais
- 2 chats, mais aussi 42 chats, 0,5 chats, etc., c'est-à-dire la forme `'other'` (la seule autre), connue comme le pluriel en anglais.

La toute nouvelle [`API Intl.PluralRules`](https://github.com/tc39/proposal-intl-plural-rules) vous indique quelle forme s'applique dans une langue de votre choix en fonction d'un nombre donné.

```js
const pr = new Intl.PluralRules('en-US');
pr.select(0);   // 'other' (par ex. '0 chats')
pr.select(0.5); // 'other' (par ex. '0,5 chats')
pr.select(1);   // 'one'   (par ex. '1 chat')
pr.select(1.5); // 'other' (par ex. '0,5 chats')
pr.select(2);   // 'other' (par ex. '0,5 chats')
```

<!--truncate-->
Contrairement à d'autres API de localisation, `Intl.PluralRules` est une API de bas niveau qui ne réalise aucun formatage en soi. À la place, vous pouvez créer votre propre formateur par-dessus :

```js
const suffixes = new Map([
  // Remarque : dans des scénarios réels, vous ne coderiez pas en dur les
  // pluriels comme cela ; ils feraient partie de vos fichiers de traduction.
  ['one',   'chat'],
  ['other', 'chats'],
]);
const pr = new Intl.PluralRules('en-US');
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // '1 chat'
formatCats(0);   // '0 chats'
formatCats(0.5); // '0,5 chats'
formatCats(1.5); // '1,5 chats'
formatCats(2);   // '2 chats'
```

Pour les règles de pluralisation relativement simples de l'anglais, cela peut sembler excessif ; cependant, toutes les langues ne suivent pas les mêmes règles. Certaines langues n'ont qu'une seule forme de pluralisation, et certaines langues ont plusieurs formes. Le [gallois](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules), par exemple, a six formes de pluralisation différentes !

```js
const suffixes = new Map([
  ['zero',  'cathod'],
  ['one',   'gath'],
  // Remarque : la forme `two` est la même que la forme `'one'`
  // pour ce mot en particulier, mais ce n'est pas vrai pour
  // tous les mots en gallois.
  ['two',   'gath'],
  ['few',   'cath'],
  ['many',  'chath'],
  ['other', 'cath'],
]);
const pr = new Intl.PluralRules('cy');
const formatWelshCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatWelshCats(0);   // '0 cathod'
formatWelshCats(1);   // '1 gath'
formatWelshCats(1.5); // '1,5 cath'
formatWelshCats(2);   // '2 gath'
formatWelshCats(3);   // '3 cath'
formatWelshCats(6);   // '6 chath'
formatWelshCats(42);  // '42 cath'
```

Pour implémenter une pluralisation correcte tout en prenant en charge plusieurs langues, une base de données des langues et de leurs règles de pluralisation est nécessaire. [Le Unicode CLDR](http://cldr.unicode.org/) inclut ces données, mais pour les utiliser en JavaScript, elles doivent être intégrées et expédiées avec votre autre code JavaScript, augmentant les temps de chargement, les temps d'analyse et l'utilisation de la mémoire. L'API `Intl.PluralRules` déplace cette responsabilité vers le moteur JavaScript, rendant les pluralisations internationalisées plus performantes.

:::note
**Remarque :** Bien que les données CLDR incluent les correspondances de formes par langue, elles ne sont pas accompagnées d'une liste de formes singulières/plurielles pour les mots individuels. Vous devez toujours traduire et fournir ces formes vous-même, comme auparavant.
:::

## Nombres ordinaux

L'API `Intl.PluralRules` prend en charge diverses règles de sélection via la propriété `type` dans l'argument optionnel `options`. Sa valeur implicite par défaut (comme utilisé dans les exemples ci-dessus) est `'cardinal'`. Pour déterminer l'indicateur ordinal pour un nombre donné à la place (par ex. `1` → `1er`, `2` → `2ème`, etc.), utilisez `{ type: 'ordinal' }` :

```js
const pr = new Intl.PluralRules('en-US', {
  type: 'ordinal'
});
const suffixes = new Map([
  ['one',   'er'],
  ['two',   'ème'],
  ['few',   'ème'],
  ['other', 'ème'],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // '0ème'
formatOrdinals(1);   // '1er'
formatOrdinals(2);   // '2ème'
formatOrdinals(3);   // '3ème'
formatOrdinals(4);   // '4ème'
formatOrdinals(11);  // '11ème'
formatOrdinals(21);  // '21er'
formatOrdinals(42);  // '42ème'
formatOrdinals(103); // '103ème'
```

`Intl.PluralRules` est une API de bas niveau, particulièrement en comparaison avec d'autres fonctionnalités d'internationalisation. Ainsi, même si vous ne l'utilisez pas directement, vous pourriez utiliser une bibliothèque ou un framework qui en dépend.

À mesure que cette API devient plus largement disponible, vous trouverez des bibliothèques comme [Globalize](https://github.com/globalizejs/globalize#plural-module) abandonnant leur dépendance aux bases de données CLDR codées en dur au profit de fonctionnalités natives, améliorant ainsi les performances de temps de chargement, de temps de parsing, de temps d'exécution et d'utilisation de la mémoire.

## Support de `Intl.PluralRules`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="non"></feature-support>
