---
title: &apos;Version V8 v7.6&apos;
author: &apos;Adam Klein&apos;
avatars:
  - &apos;adam-klein&apos;
date: 2019-06-19 16:45:00
tags:
  - sortie
description: &apos;V8 v7.6 inclut Promise.allSettled, un JSON.parse plus rapide, des BigInts localisés, des tableaux congelés/sellés plus rapides, et bien plus encore !&apos;
tweet: &apos;1141356209179516930&apos;
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de sortie](/docs/release-process). Chaque version est dérivée du master Git de V8 juste avant une étape Beta de Chrome. Aujourd’hui, nous sommes heureux d’annoncer notre nouvelle branche, [V8 version 7.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.6), actuellement en version beta jusqu’à sa sortie en coordination avec Chrome 76 Stable dans plusieurs semaines. V8 v7.6 est rempli de nombreuses nouveautés pour les développeurs. Cet article donne un aperçu de certains points forts en prévision de la sortie.

<!--truncate-->
## Performances (taille & vitesse)

### Améliorations de `JSON.parse`

Dans les applications JavaScript modernes, le JSON est couramment utilisé comme format pour communiquer des données structurées. En accélérant l'analyse JSON, nous pouvons réduire la latence de cette communication. Dans V8 v7.6, nous avons révisé notre analyseur JSON pour qu’il soit beaucoup plus rapide dans le balayage et l’analyse du JSON. Cela se traduit par une analyse jusqu’à 2,7× plus rapide des données servies par des pages Web populaires.

![Graphique montrant une meilleure performance de `JSON.parse` sur divers sites web](/_img/v8-release-76/json-parsing.svg)

Jusqu’à V8 v7.5, l’analyseur JSON était un analyseur récursif qui utilisait la pile native en fonction de la profondeur d’imbrication des données JSON entrantes. Cela signifiait que nous pouvions manquer de pile pour des données JSON très profondément imbriquées. V8 v7.6 passe à un analyseur itératif qui gère sa propre pile, limitée uniquement par la mémoire disponible.

Le nouveau parseur JSON est également plus efficace en termes de mémoire. En mettant en mémoire tampon les propriétés avant de créer l’objet final, nous pouvons désormais décider comment allouer le résultat de manière optimale. Pour les objets avec des propriétés nommées, nous allouons des objets avec la quantité exacte d’espace nécessaire pour les propriétés nommées dans les données JSON entrantes (jusqu’à 128 propriétés nommées). Si les objets JSON contiennent des noms de propriété indexés, nous allouons un espace de stockage d’éléments qui utilise un minimum d’espace, soit un tableau plat, soit un dictionnaire. Les tableaux JSON sont maintenant analysés dans un tableau dont la taille correspond exactement au nombre d’éléments des données d’entrée.

### Améliorations des tableaux congelés/sellés

Les performances des appels sur des tableaux congelés ou scellés (et des objets similaires aux tableaux) ont reçu de nombreuses améliorations. V8 v7.6 améliore les modèles de codage JavaScript suivants, où `frozen` est un tableau ou un objet similaire à un tableau congelé ou scellé :

- `frozen.indexOf(v)`
- `frozen.includes(v)`
- appels avec propagation comme `fn(...frozen)`
- appels avec une propagation imbriquée comme `fn(...[...frozen])`
- appels avec apply et propagation comme `fn.apply(this, [...frozen])`

Le graphique ci-dessous montre les améliorations.

![Graphique montrant un gain de performance sur diverses opérations sur les tableaux](/_img/v8-release-76/frozen-sealed-elements.svg)

[Voir le document de conception “fast frozen & sealed elements in V8”](https://bit.ly/fast-frozen-sealed-elements-in-v8) pour plus de détails.

### Gestion des chaînes Unicode

Une optimisation lors de [la conversion de chaînes en Unicode](https://chromium.googlesource.com/v8/v8/+/734c1456d942a03d79aab4b3b0e57afbc803ceea) a permis une accélération significative des appels tels que `String#localeCompare`, `String#normalize`, et certaines des API `Intl`. Par exemple, ce changement a permis de doubler environ le débit brut de `String#localeCompare` pour des chaînes d’un byte.

## Fonctionnalités du langage JavaScript

### `Promise.allSettled`

[`Promise.allSettled(promises)`](/features/promise-combinators#promise.allsettled) fournit un signal lorsque toutes les promesses en entrée sont _résolues_, ce qui signifie qu’elles sont soit _tenues_, soit _rejetées_. Cela est utile dans les cas où l’état de la promesse ne vous importe pas, vous voulez seulement savoir quand le travail est terminé, qu’il ait réussi ou échoué. [Notre explication sur les combinateurs de promesses](/features/promise-combinators) contient plus de détails et inclut un exemple.

### Meilleur support pour `BigInt`

[`BigInt`](/features/bigint) dispose maintenant d’un meilleur support API dans le langage. Vous pouvez maintenant formater un `BigInt` d’une manière adaptée à la locale en utilisant la méthode `toLocaleString`. Cela fonctionne de la même manière que pour les nombres ordinaires :

```js
12345678901234567890n.toLocaleString(&apos;en&apos;); // 🐌
// → &apos;12,345,678,901,234,567,890&apos;
12345678901234567890n.toLocaleString(&apos;de&apos;); // 🐌
// → &apos;12.345.678.901.234.567.890&apos;
```

Si vous prévoyez de formater plusieurs nombres ou `BigInt` en utilisant la même locale, il est plus efficace d’utiliser l’API `Intl.NumberFormat`, qui prend désormais en charge les `BigInt` dans ses méthodes `format` et `formatToParts`. De cette manière, vous pouvez créer une instance de formateur réutilisable.

```js
const nf = new Intl.NumberFormat(&apos;fr&apos;);
nf.format(12345678901234567890n); // 🚀
// → &apos;12 345 678 901 234 567 890&apos;
nf.formatToParts(123456n); // 🚀
// → [
// →   { type: &apos;integer&apos;, value: &apos;123&apos; },
// →   { type: &apos;group&apos;, value: &apos; &apos; },
// →   { type: &apos;integer&apos;, value: &apos;456&apos; }
// → ]
```

### Améliorations d'`Intl.DateTimeFormat`

Les applications affichent souvent des intervalles ou des plages de dates pour montrer la durée d'un événement, comme une réservation d'hôtel, une période de facturation ou un festival de musique. L'API `Intl.DateTimeFormat` prend désormais en charge les méthodes `formatRange` et `formatRangeToParts` permettant de formater facilement les plages de dates de manière spécifique à la langue et à la région.

```js
const start = new Date(&apos;2019-05-07T09:20:00&apos;);
// → &apos;7 mai 2019&apos;
const end = new Date(&apos;2019-05-09T16:00:00&apos;);
// → &apos;9 mai 2019&apos;
const fmt = new Intl.DateTimeFormat(&apos;fr&apos;, {
  year: &apos;numeric&apos;,
  month: &apos;long&apos;,
  day: &apos;numeric&apos;,
});
const output = fmt.formatRange(start, end);
// → &apos;7 – 9 mai 2019&apos;
const parts = fmt.formatRangeToParts(start, end);
// → [
// →   { &apos;type&apos;: &apos;month&apos;,   &apos;value&apos;: &apos;mai&apos;,  &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;literal&apos;, &apos;value&apos;: &apos; &apos;,    &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;day&apos;,     &apos;value&apos;: &apos;7&apos;,    &apos;source&apos;: &apos;startRange&apos; },
// →   { &apos;type&apos;: &apos;literal&apos;, &apos;value&apos;: &apos; – &apos;,  &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;day&apos;,     &apos;value&apos;: &apos;9&apos;,    &apos;source&apos;: &apos;endRange&apos; },
// →   { &apos;type&apos;: &apos;literal&apos;, &apos;value&apos;: &apos;, &apos;,   &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;year&apos;,    &apos;value&apos;: &apos;2019&apos;, &apos;source&apos;: &apos;shared&apos; },
// → ]
```

De plus, les méthodes `format`, `formatToParts` et `formatRangeToParts` prennent désormais en charge les nouvelles options `timeStyle` et `dateStyle` :

```js
const dtf = new Intl.DateTimeFormat(&apos;de&apos;, {
  timeStyle: &apos;medium&apos;,
  dateStyle: &apos;short&apos;
});
dtf.format(Date.now());
// → &apos;19.06.19, 13:33:37&apos;
```

## Parcours natif de la pile

Alors que V8 peut parcourir sa propre pile d'appels (par exemple, lors du débogage ou du profilage dans DevTools), le système d'exploitation Windows était incapable de parcourir une pile d'appels contenant du code généré par TurboFan lorsqu'il fonctionne sur l'architecture x64. Cela pouvait provoquer des _piles cassées_ lors de l'utilisation de débogueurs natifs ou de l'échantillonnage ETW pour analyser des processus utilisant V8. Une modification récente permet à V8 de [enregistrer les métadonnées nécessaires](https://chromium.googlesource.com/v8/v8/+/3cda21de77d098a612eadf44d504b188a599c5f0) pour que Windows puisse parcourir ces piles sur x64, et dans v7.6 cela est activé par défaut.

## API V8

Veuillez utiliser `git log branch-heads/7.5..branch-heads/7.6 include/v8.h` pour obtenir une liste des modifications de l'API.

Les développeurs avec un [dépôt V8 actif](/docs/source-code#using-git) peuvent utiliser `git checkout -b 7.6 -t branch-heads/7.6` pour expérimenter les nouvelles fonctionnalités de V8 v7.6. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités vous-même.
