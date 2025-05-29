---
title: 'Sortie de V8 v9.9'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), à ses 99%'
avatars:
 - 'ingvar-stepanyan'
date: 2022-01-31
tags:
 - release
description: 'La version V8 v9.9 apporte de nouvelles APIs d'internationalisation.'
tweet: '1488190967727411210'
---
Toutes les quatre semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est dérivée du Git principal de V8 juste avant une étape bêta de Chrome. Aujourd'hui, nous sommes heureux d'annoncer notre nouvelle branche, [V8 version 9.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.9), qui est en phase bêta jusqu'à sa sortie coordonnée avec Chrome 99 Stable dans quelques semaines. V8 v9.9 est rempli de toutes sortes de nouveautés pour les développeurs. Cet article fournit un aperçu de certains des points forts en prévision de la sortie.

<!--truncate-->
## JavaScript

### Extensions Intl.Locale

Dans v7.4, nous avons lancé l'API [`Intl.Locale`](https://v8.dev/blog/v8-release-74#intl.locale). Avec v9.9, nous avons ajouté sept nouvelles propriétés à l'objet `Intl.Locale` : `calendars`, `collations`, `hourCycles`, `numberingSystems`, `timeZones`, `textInfo` et `weekInfo`.

Les propriétés `calendars`, `collations`, `hourCycles`, `numberingSystems` et `timeZones` de `Intl.Locale` renvoient un tableau d'identifiants préférés de ceux couramment utilisés, conçus pour être utilisés avec les autres API `Intl` :

```js
const arabicEgyptLocale = new Intl.Locale('ar-EG')
// ar-EG
arabicEgyptLocale.calendars
// ['gregorian', 'coptic', 'islamic', 'islamic-civil', 'islamic-tbla']
arabicEgyptLocale.collations
// ['compat', 'emoji', 'eor']
arabicEgyptLocale.hourCycles
// ['h12']
arabicEgyptLocale.numberingSystems
// ['arab']
arabicEgyptLocale.timeZones
// ['Africa/Le_Caire']
```

La propriété `textInfo` de `Intl.Locale` retourne un objet pour spécifier les informations relatives au texte. Actuellement, elle a une seule propriété, `direction`, pour indiquer la directionnalité par défaut du texte dans la locale. Elle est conçue pour être utilisée avec l'[attribut HTML `dir`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir) et la [propriété CSS `direction`](https://developer.mozilla.org/en-US/docs/Web/CSS/direction). Elle indique l'ordre des caractères - `ltr` (de gauche à droite) ou `rtl` (de droite à gauche) :

```js
arabicEgyptLocale.textInfo
// { direction: 'rtl' }
japaneseLocale.textInfo
// { direction: 'ltr' }
chineseTaiwanLocale.textInfo
// { direction: 'ltr' }
```

La propriété `weekInfo` de `Intl.Locale` retourne un objet pour spécifier les informations relatives à la semaine. La propriété `firstDay` dans l'objet retourné est un chiffre, allant de 1 à 7, indiquant quel jour de la semaine est considéré comme le premier jour, à des fins calendaires. 1 spécifie le lundi, 2 - mardi, 3 - mercredi, 4 - jeudi, 5 - vendredi, 6 - samedi et 7 - dimanche. La propriété `minimalDays` dans l'objet retourné est le nombre minimal de jours requis dans la première semaine d'un mois ou d'une année, à des fins calendaires. La propriété `weekend` dans l'objet retourné est un tableau d'entiers, généralement avec deux éléments, encodés de la même manière que `firstDay`. Elle indique quels jours de la semaine sont considérés comme faisant partie du 'weekend', à des fins calendaires. Notez que le nombre de jours dans le weekend est différent dans chaque locale et peut ne pas être contigu.

```js
arabicEgyptLocale.weekInfo
// {firstDay: 6, weekend: [5, 6], minimalDays: 1}
// Le premier jour de la semaine est le samedi. Le weekend est le vendredi et le samedi.
// La première semaine d'un mois ou d'une année est une semaine qui a au moins 1
// jour dans ce mois ou cette année.
```

### Énumération Intl

Dans v9.9, nous avons ajouté une nouvelle fonction [`Intl.supportedValuesOf(code)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf) qui retourne le tableau des identifiants pris en charge dans v8 pour les APIs Intl. Les valeurs prises en charge par `code` sont `calendar`, `collation`, `currency`, `numberingSystem`, `timeZone` et `unit`. Les informations dans cette nouvelle méthode sont conçues pour permettre aux développeurs web de découvrir facilement quelles valeurs sont prises en charge par l'implémentation.

```js
Intl.supportedValuesOf('calendar')
// ['buddhist', 'chinese', 'coptic', 'dangi', ...]

Intl.supportedValuesOf('collation')
// ['big5han', 'compat', 'dict', 'emoji', ...]

Intl.supportedValuesOf('currency')
// ['ADP', 'AED', 'AFA', 'AFN', 'ALK', 'ALL', 'AMD', ...]

Intl.supportedValuesOf('numberingSystem')
// ['adlm', 'ahom', 'arab', 'arabext', 'bali', ...]

Intl.supportedValuesOf('timeZone')
// ['Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers', ...]

Intl.supportedValuesOf('unit')
// ['acre', 'bit', 'byte', 'celsius', 'centimeter', ...]
```

## API V8

Veuillez utiliser `git log branch-heads/9.8..branch-heads/9.9 include/v8\*.h` pour obtenir une liste des changements d'API.
