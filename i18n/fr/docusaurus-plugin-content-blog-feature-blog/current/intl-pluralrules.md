---
title: &apos;`Intl.PluralRules`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-10-04
tags:
  - Intl
description: &apos;La gestion des pluriels est l&apos;un des nombreux problèmes qui peuvent sembler simples, jusqu&apos;à ce que vous réalisiez que chaque langue a ses propres règles de pluralisation. L&apos;API Intl.PluralRules peut vous aider !&apos;
tweet: &apos;915542989493202944&apos;
---
Iñtërnâtiônàlizætiøn est difficile. La gestion des pluriels est l&apos;un des nombreux problèmes qui peuvent sembler simples, jusqu&apos;à ce que vous réalisiez que chaque langue a ses propres règles de pluralisation.

Pour la pluralisation en anglais, il n&apos;y a que deux résultats possibles. Prenons le mot « chat » comme exemple :

- 1 chat, c&apos;est-à-dire la forme `&apos;one&apos;`, connue comme le singulier en anglais
- 2 chats, mais aussi 42 chats, 0,5 chats, etc., c&apos;est-à-dire la forme `&apos;other&apos;` (la seule autre), connue comme le pluriel en anglais.

La toute nouvelle [`API Intl.PluralRules`](https://github.com/tc39/proposal-intl-plural-rules) vous indique quelle forme s&apos;applique dans une langue de votre choix en fonction d&apos;un nombre donné.

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;);
pr.select(0);   // &apos;other&apos; (par ex. &apos;0 chats&apos;)
pr.select(0.5); // &apos;other&apos; (par ex. &apos;0,5 chats&apos;)
pr.select(1);   // &apos;one&apos;   (par ex. &apos;1 chat&apos;)
pr.select(1.5); // &apos;other&apos; (par ex. &apos;0,5 chats&apos;)
pr.select(2);   // &apos;other&apos; (par ex. &apos;0,5 chats&apos;)
```

<!--truncate-->
Contrairement à d&apos;autres API de localisation, `Intl.PluralRules` est une API de bas niveau qui ne réalise aucun formatage en soi. À la place, vous pouvez créer votre propre formateur par-dessus :

```js
const suffixes = new Map([
  // Remarque : dans des scénarios réels, vous ne coderiez pas en dur les
  // pluriels comme cela ; ils feraient partie de vos fichiers de traduction.
  [&apos;one&apos;,   &apos;chat&apos;],
  [&apos;other&apos;, &apos;chats&apos;],
]);
const pr = new Intl.PluralRules(&apos;en-US&apos;);
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // &apos;1 chat&apos;
formatCats(0);   // &apos;0 chats&apos;
formatCats(0.5); // &apos;0,5 chats&apos;
formatCats(1.5); // &apos;1,5 chats&apos;
formatCats(2);   // &apos;2 chats&apos;
```

Pour les règles de pluralisation relativement simples de l&apos;anglais, cela peut sembler excessif ; cependant, toutes les langues ne suivent pas les mêmes règles. Certaines langues n&apos;ont qu&apos;une seule forme de pluralisation, et certaines langues ont plusieurs formes. Le [gallois](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules), par exemple, a six formes de pluralisation différentes !

```js
const suffixes = new Map([
  [&apos;zero&apos;,  &apos;cathod&apos;],
  [&apos;one&apos;,   &apos;gath&apos;],
  // Remarque : la forme `two` est la même que la forme `&apos;one&apos;`
  // pour ce mot en particulier, mais ce n&apos;est pas vrai pour
  // tous les mots en gallois.
  [&apos;two&apos;,   &apos;gath&apos;],
  [&apos;few&apos;,   &apos;cath&apos;],
  [&apos;many&apos;,  &apos;chath&apos;],
  [&apos;other&apos;, &apos;cath&apos;],
]);
const pr = new Intl.PluralRules(&apos;cy&apos;);
const formatWelshCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatWelshCats(0);   // &apos;0 cathod&apos;
formatWelshCats(1);   // &apos;1 gath&apos;
formatWelshCats(1.5); // &apos;1,5 cath&apos;
formatWelshCats(2);   // &apos;2 gath&apos;
formatWelshCats(3);   // &apos;3 cath&apos;
formatWelshCats(6);   // &apos;6 chath&apos;
formatWelshCats(42);  // &apos;42 cath&apos;
```

Pour implémenter une pluralisation correcte tout en prenant en charge plusieurs langues, une base de données des langues et de leurs règles de pluralisation est nécessaire. [Le Unicode CLDR](http://cldr.unicode.org/) inclut ces données, mais pour les utiliser en JavaScript, elles doivent être intégrées et expédiées avec votre autre code JavaScript, augmentant les temps de chargement, les temps d&apos;analyse et l&apos;utilisation de la mémoire. L&apos;API `Intl.PluralRules` déplace cette responsabilité vers le moteur JavaScript, rendant les pluralisations internationalisées plus performantes.

:::note
**Remarque :** Bien que les données CLDR incluent les correspondances de formes par langue, elles ne sont pas accompagnées d&apos;une liste de formes singulières/plurielles pour les mots individuels. Vous devez toujours traduire et fournir ces formes vous-même, comme auparavant.
:::

## Nombres ordinaux

L&apos;API `Intl.PluralRules` prend en charge diverses règles de sélection via la propriété `type` dans l&apos;argument optionnel `options`. Sa valeur implicite par défaut (comme utilisé dans les exemples ci-dessus) est `&apos;cardinal&apos;`. Pour déterminer l&apos;indicateur ordinal pour un nombre donné à la place (par ex. `1` → `1er`, `2` → `2ème`, etc.), utilisez `{ type: &apos;ordinal&apos; }` :

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;, {
  type: &apos;ordinal&apos;
});
const suffixes = new Map([
  [&apos;one&apos;,   &apos;er&apos;],
  [&apos;two&apos;,   &apos;ème&apos;],
  [&apos;few&apos;,   &apos;ème&apos;],
  [&apos;other&apos;, &apos;ème&apos;],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // &apos;0ème&apos;
formatOrdinals(1);   // &apos;1er&apos;
formatOrdinals(2);   // &apos;2ème&apos;
formatOrdinals(3);   // &apos;3ème&apos;
formatOrdinals(4);   // &apos;4ème&apos;
formatOrdinals(11);  // &apos;11ème&apos;
formatOrdinals(21);  // &apos;21er&apos;
formatOrdinals(42);  // &apos;42ème&apos;
formatOrdinals(103); // &apos;103ème&apos;
```

`Intl.PluralRules` est une API de bas niveau, particulièrement en comparaison avec d'autres fonctionnalités d'internationalisation. Ainsi, même si vous ne l'utilisez pas directement, vous pourriez utiliser une bibliothèque ou un framework qui en dépend.

À mesure que cette API devient plus largement disponible, vous trouverez des bibliothèques comme [Globalize](https://github.com/globalizejs/globalize#plural-module) abandonnant leur dépendance aux bases de données CLDR codées en dur au profit de fonctionnalités natives, améliorant ainsi les performances de temps de chargement, de temps de parsing, de temps d'exécution et d'utilisation de la mémoire.

## Support de `Intl.PluralRules`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="non"></feature-support>
