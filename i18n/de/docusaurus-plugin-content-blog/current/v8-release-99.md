---
title: 'V8-Veröffentlichung v9.9'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), zu seinen 99%'
avatars:
 - 'ingvar-stepanyan'
date: 2022-01-31
tags:
 - veröffentlichung
description: 'V8-Veröffentlichung v9.9 bringt neue Internationalisierungs-APIs.'
tweet: '1488190967727411210'
---
Alle vier Wochen erstellen wir einen neuen Zweig von V8 als Teil unseres [Veröffentlichungsprozesses](https://v8.dev/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein aus dem Hauptzweig von V8 Git abgezweigt. Heute freuen wir uns, unseren neuesten Zweig [V8 Version 9.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.9) anzukündigen, der bis zu seiner Veröffentlichung in Abstimmung mit Chrome 99 Stable in einigen Wochen in der Beta ist. V8 v9.9 ist vollgepackt mit allerlei Entwickler-Neuerungen. Dieser Beitrag bietet eine Vorschau auf einige der Highlights in Erwartung der Veröffentlichung.

<!--truncate-->
## JavaScript

### Intl.Locale-Erweiterungen

In v7.4 haben wir die [`Intl.Locale`-API](https://v8.dev/blog/v8-release-74#intl.locale) eingeführt. Mit v9.9 haben wir sieben neue Eigenschaften zum `Intl.Locale`-Objekt hinzugefügt: `calendars`, `collations`, `hourCycles`, `numberingSystems`, `timeZones`, `textInfo` und `weekInfo`.

Die Eigenschaften `calendars`, `collations`, `hourCycles`, `numberingSystems` und `timeZones` von `Intl.Locale` geben ein Array von bevorzugten Identifikatoren zurück, die häufig verwendet werden und so gestaltet sind, dass sie mit anderen `Intl`-APIs verwendet werden können:

```js
const arabicEgyptLocale = new Intl.Locale('ar-EG')
// ar-EG
arabicEgyptLocale.calendars
// ['gregory', 'coptic', 'islamic', 'islamic-civil', 'islamic-tbla']
arabicEgyptLocale.collations
// ['compat', 'emoji', 'eor']
arabicEgyptLocale.hourCycles
// ['h12']
arabicEgyptLocale.numberingSystems
// ['arab']
arabicEgyptLocale.timeZones
// ['Africa/Cairo']
```

Die Eigenschaft `textInfo` von `Intl.Locale` gibt ein Objekt zurück, das Informationen in Bezug auf Text angibt. Derzeit hat es nur eine Eigenschaft, `direction`, um die Standardtextausrichtung in der Lokalisierung anzuzeigen. Es ist so gestaltet, dass es mit dem [HTML-Attribut `dir`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir) und der [CSS-Eigenschaft `direction`](https://developer.mozilla.org/en-US/docs/Web/CSS/direction) verwendet werden kann. Es zeigt die Anordnung der Zeichen an - `ltr` (von links nach rechts) oder `rtl` (von rechts nach links):

```js
arabicEgyptLocale.textInfo
// { direction: 'rtl' }
japaneseLocale.textInfo
// { direction: 'ltr' }
chineseTaiwanLocale.textInfo
// { direction: 'ltr' }
```

Die Eigenschaft `weekInfo` von `Intl.Locale` gibt ein Objekt zurück, das Informationen in Bezug auf die Woche angibt. Die Eigenschaft `firstDay` im zurückgegebenen Objekt ist eine Zahl von 1 bis 7 und gibt an, welcher Wochentag als erster Tag der Woche angesehen wird, für Kalenderzwecke. 1 steht für Montag, 2 - Dienstag, 3 - Mittwoch, 4 - Donnerstag, 5 - Freitag, 6 - Samstag und 7 - Sonntag. Die Eigenschaft `minimalDays` im zurückgegebenen Objekt ist die Mindestanzahl von Tagen, die in der ersten Woche eines Monats oder Jahres erforderlich sind, für Kalenderzwecke. Die Eigenschaft `weekend` im zurückgegebenen Objekt ist ein Array von Ganzzahlen, normalerweise mit zwei Elementen, die genauso codiert sind wie `firstDay`. Sie gibt an, welche Wochentage als Teil des 'Wochenendes' betrachtet werden, für Kalenderzwecke. Beachten Sie, dass sich die Anzahl der Tage im Wochenende je nach Lokalisierung unterscheidet und sie möglicherweise nicht zusammenhängend sind.

```js
arabicEgyptLocale.weekInfo
// {firstDay: 6, weekend: [5, 6], minimalDays: 1}
// Erster Wochentag ist Samstag. Wochenende ist Freitag und Samstag.
// Die erste Woche eines Monats oder Jahres ist eine Woche, die mindestens 1
// Tag in diesem Monat oder Jahr hat.
```

### Intl-Aufzählung

In v9.9 haben wir eine neue Funktion [`Intl.supportedValuesOf(code)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf) hinzugefügt, die das Array der unterstützten Identifikatoren in V8 für die Intl APIs zurückgibt. Die unterstützten `code`-Werte sind `calendar`, `collation`, `currency`, `numberingSystem`, `timeZone` und `unit`. Die Informationen in dieser neuen Methode sollen es Webentwicklern ermöglichen, leicht zu entdecken, welche Werte von der Implementierung unterstützt werden.

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

## V8-API

Bitte verwenden Sie `git log branch-heads/9.8..branch-heads/9.9 include/v8\*.h`, um eine Liste der API-Änderungen zu erhalten.
