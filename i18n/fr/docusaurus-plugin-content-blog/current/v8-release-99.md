---
title: &apos;Sortie de V8 v9.9&apos;
author: &apos;Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), à ses 99%&apos;
avatars:
 - &apos;ingvar-stepanyan&apos;
date: 2022-01-31
tags:
 - release
description: &apos;La version V8 v9.9 apporte de nouvelles APIs d&apos;internationalisation.&apos;
tweet: &apos;1488190967727411210&apos;
---
Toutes les quatre semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est dérivée du Git principal de V8 juste avant une étape bêta de Chrome. Aujourd&apos;hui, nous sommes heureux d&apos;annoncer notre nouvelle branche, [V8 version 9.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.9), qui est en phase bêta jusqu&apos;à sa sortie coordonnée avec Chrome 99 Stable dans quelques semaines. V8 v9.9 est rempli de toutes sortes de nouveautés pour les développeurs. Cet article fournit un aperçu de certains des points forts en prévision de la sortie.

<!--truncate-->
## JavaScript

### Extensions Intl.Locale

Dans v7.4, nous avons lancé l&apos;API [`Intl.Locale`](https://v8.dev/blog/v8-release-74#intl.locale). Avec v9.9, nous avons ajouté sept nouvelles propriétés à l&apos;objet `Intl.Locale` : `calendars`, `collations`, `hourCycles`, `numberingSystems`, `timeZones`, `textInfo` et `weekInfo`.

Les propriétés `calendars`, `collations`, `hourCycles`, `numberingSystems` et `timeZones` de `Intl.Locale` renvoient un tableau d&apos;identifiants préférés de ceux couramment utilisés, conçus pour être utilisés avec les autres API `Intl` :

```js
const arabicEgyptLocale = new Intl.Locale(&apos;ar-EG&apos;)
// ar-EG
arabicEgyptLocale.calendars
// [&apos;gregorian&apos;, &apos;coptic&apos;, &apos;islamic&apos;, &apos;islamic-civil&apos;, &apos;islamic-tbla&apos;]
arabicEgyptLocale.collations
// [&apos;compat&apos;, &apos;emoji&apos;, &apos;eor&apos;]
arabicEgyptLocale.hourCycles
// [&apos;h12&apos;]
arabicEgyptLocale.numberingSystems
// [&apos;arab&apos;]
arabicEgyptLocale.timeZones
// [&apos;Africa/Le_Caire&apos;]
```

La propriété `textInfo` de `Intl.Locale` retourne un objet pour spécifier les informations relatives au texte. Actuellement, elle a une seule propriété, `direction`, pour indiquer la directionnalité par défaut du texte dans la locale. Elle est conçue pour être utilisée avec l&apos;[attribut HTML `dir`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir) et la [propriété CSS `direction`](https://developer.mozilla.org/en-US/docs/Web/CSS/direction). Elle indique l&apos;ordre des caractères - `ltr` (de gauche à droite) ou `rtl` (de droite à gauche) :

```js
arabicEgyptLocale.textInfo
// { direction: &apos;rtl&apos; }
japaneseLocale.textInfo
// { direction: &apos;ltr&apos; }
chineseTaiwanLocale.textInfo
// { direction: &apos;ltr&apos; }
```

La propriété `weekInfo` de `Intl.Locale` retourne un objet pour spécifier les informations relatives à la semaine. La propriété `firstDay` dans l&apos;objet retourné est un chiffre, allant de 1 à 7, indiquant quel jour de la semaine est considéré comme le premier jour, à des fins calendaires. 1 spécifie le lundi, 2 - mardi, 3 - mercredi, 4 - jeudi, 5 - vendredi, 6 - samedi et 7 - dimanche. La propriété `minimalDays` dans l&apos;objet retourné est le nombre minimal de jours requis dans la première semaine d&apos;un mois ou d&apos;une année, à des fins calendaires. La propriété `weekend` dans l&apos;objet retourné est un tableau d&apos;entiers, généralement avec deux éléments, encodés de la même manière que `firstDay`. Elle indique quels jours de la semaine sont considérés comme faisant partie du &apos;weekend&apos;, à des fins calendaires. Notez que le nombre de jours dans le weekend est différent dans chaque locale et peut ne pas être contigu.

```js
arabicEgyptLocale.weekInfo
// {firstDay: 6, weekend: [5, 6], minimalDays: 1}
// Le premier jour de la semaine est le samedi. Le weekend est le vendredi et le samedi.
// La première semaine d&apos;un mois ou d&apos;une année est une semaine qui a au moins 1
// jour dans ce mois ou cette année.
```

### Énumération Intl

Dans v9.9, nous avons ajouté une nouvelle fonction [`Intl.supportedValuesOf(code)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf) qui retourne le tableau des identifiants pris en charge dans v8 pour les APIs Intl. Les valeurs prises en charge par `code` sont `calendar`, `collation`, `currency`, `numberingSystem`, `timeZone` et `unit`. Les informations dans cette nouvelle méthode sont conçues pour permettre aux développeurs web de découvrir facilement quelles valeurs sont prises en charge par l&apos;implémentation.

```js
Intl.supportedValuesOf(&apos;calendar&apos;)
// [&apos;buddhist&apos;, &apos;chinese&apos;, &apos;coptic&apos;, &apos;dangi&apos;, ...]

Intl.supportedValuesOf(&apos;collation&apos;)
// [&apos;big5han&apos;, &apos;compat&apos;, &apos;dict&apos;, &apos;emoji&apos;, ...]

Intl.supportedValuesOf(&apos;currency&apos;)
// [&apos;ADP&apos;, &apos;AED&apos;, &apos;AFA&apos;, &apos;AFN&apos;, &apos;ALK&apos;, &apos;ALL&apos;, &apos;AMD&apos;, ...]

Intl.supportedValuesOf(&apos;numberingSystem&apos;)
// [&apos;adlm&apos;, &apos;ahom&apos;, &apos;arab&apos;, &apos;arabext&apos;, &apos;bali&apos;, ...]

Intl.supportedValuesOf(&apos;timeZone&apos;)
// [&apos;Africa/Abidjan&apos;, &apos;Africa/Accra&apos;, &apos;Africa/Addis_Ababa&apos;, &apos;Africa/Algiers&apos;, ...]

Intl.supportedValuesOf(&apos;unit&apos;)
// [&apos;acre&apos;, &apos;bit&apos;, &apos;byte&apos;, &apos;celsius&apos;, &apos;centimeter&apos;, ...]
```

## API V8

Veuillez utiliser `git log branch-heads/9.8..branch-heads/9.9 include/v8\*.h` pour obtenir une liste des changements d&apos;API.
