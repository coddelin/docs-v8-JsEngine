---
title: &apos;`Intl.DisplayNames`&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu)) und Frank Yung-Fong Tang&apos;
avatars:
  - &apos;shu-yu-guo&apos;
  - &apos;frank-tang&apos;
date: 2020-02-13
tags:
  - Intl
  - Node.js 14
description: &apos;Die Intl.DisplayNames API ermöglicht lokalisierte Namen von Sprachen, Regionen, Schriften und Währungen.&apos;
tweet: &apos;1232333889005334529&apos;
---
Webanwendungen, die ein globales Publikum erreichen, müssen die Anzeigennamen von Sprachen, Regionen, Schriften und Währungen in vielen verschiedenen Sprachen anzeigen. Die Übersetzungen dieser Namen erfordern Daten, die im [Unicode CLDR](http://cldr.unicode.org/translation/) verfügbar sind. Die Aufnahme dieser Daten in die Anwendung verursacht Kosten für die Entwickler. Nutzer bevorzugen wahrscheinlich konsistente Übersetzungen von Sprach- und Regionsnamen, und um diese Daten mit den geopolitischen Entwicklungen der Welt aktuell zu halten, ist eine kontinuierliche Wartung erforderlich.

<!--truncate-->
Glücklicherweise liefern die meisten JavaScript-Laufzeiten bereits die entsprechenden Übersetzungsdaten und halten diese aktuell. Die neue `Intl.DisplayNames` API gibt JavaScript-Entwicklern direkten Zugriff auf diese Übersetzungen, sodass Anwendungen lokalisierte Namen einfacher anzeigen können.

## Anwendungsbeispiele

Das folgende Beispiel zeigt, wie man ein `Intl.DisplayNames`-Objekt erstellt, um Regionsnamen auf Englisch unter Verwendung von [ISO-3166 2-Buchstaben-Ländercodes](https://www.iso.org/iso-3166-country-codes.html) zu erhalten.

```js
const regionNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;region&apos; });
regionNames.of(&apos;US&apos;);
// → &apos;United States&apos;
regionNames.of(&apos;BA&apos;);
// → &apos;Bosnia & Herzegovina&apos;
regionNames.of(&apos;MM&apos;);
// → &apos;Myanmar (Burma)&apos;
```

Das folgende Beispiel gibt Sprachennamen auf traditionellem Chinesisch unter Verwendung von [Unicodes Sprachbezeichner-Grammatik](http://unicode.org/reports/tr35/#Unicode_language_identifier) aus.

```js
const languageNames = new Intl.DisplayNames([&apos;zh-Hant&apos;], { type: &apos;language&apos; });
languageNames.of(&apos;fr&apos;);
// → &apos;法文&apos;
languageNames.of(&apos;zh&apos;);
// → &apos;中文&apos;
languageNames.of(&apos;de&apos;);
// → &apos;德文&apos;
```

Das folgende Beispiel gibt Währungsnamen auf vereinfachtem Chinesisch unter Verwendung von [ISO-4217 3-Buchstaben-Währungscodes](https://www.iso.org/iso-4217-currency-codes.html) aus. In Sprachen mit unterschiedlichen Singular- und Pluralformen sind die Währungsnamen im Singular. Für Pluralformen kann [`Intl.NumberFormat`](https://v8.dev/features/intl-numberformat) verwendet werden.

```js
const currencyNames = new Intl.DisplayNames([&apos;zh-Hans&apos;], {type: &apos;currency&apos;});
currencyNames.of(&apos;USD&apos;);
// → &apos;美元&apos;
currencyNames.of(&apos;EUR&apos;);
// → &apos;欧元&apos;
currencyNames.of(&apos;JPY&apos;);
// → &apos;日元&apos;
currencyNames.of(&apos;CNY&apos;);
// → &apos;人民币&apos;
```

Das folgende Beispiel zeigt den endgültig unterstützten Typ, Skripte, auf Englisch unter Verwendung von [ISO-15924 4-Buchstaben-Schriftcodes](http://unicode.org/iso15924/iso15924-codes.html).

```js
const scriptNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;script&apos; });
scriptNames.of(&apos;Latn&apos;);
// → &apos;Latin&apos;
scriptNames.of(&apos;Arab&apos;);
// → &apos;Arabic&apos;
scriptNames.of(&apos;Kana&apos;);
// → &apos;Katakana&apos;
```

Für eine fortgeschrittenere Nutzung unterstützt der zweite Parameter `options` auch die Eigenschaft `style`. Die Eigenschaft `style` entspricht der Breite des Anzeigenamens und kann entweder `"long"`, `"short"` oder `"narrow"` sein. Die Werte für verschiedene Stile unterscheiden sich nicht immer. Der Standardwert ist `"long"`.

```js
const longLanguageNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;language&apos; });
longLanguageNames.of(&apos;en-US&apos;);
// → &apos;American English&apos;
const shortLanguageNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;language&apos;, style: &apos;short&apos; });
shortLanguageNames.of(&apos;en-US&apos;);
// → &apos;US English&apos;
const narrowLanguageNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;language&apos;, style: &apos;narrow&apos; });
narrowLanguageNames.of(&apos;en-US&apos;);
// → &apos;US English&apos;
```

## Vollständige API

Die vollständige API für `Intl.DisplayNames` ist wie folgt.

```js
Intl.DisplayNames(locales, options)
Intl.DisplayNames.prototype.of( code )
```

Der Konstruktor ist konsistent mit anderen `Intl`-APIs. Das erste Argument ist eine [Liste von Sprachen](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation), und der zweite Parameter ist ein `options`-Parameter, der die Eigenschaften `localeMatcher`, `type` und `style` enthält.

Die Eigenschaft `"localeMatcher"` wird wie bei [anderen `Intl`-APIs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation) behandelt. Die Eigenschaft `type` kann `"region"`, `"language"`, `"currency"` oder `"script"` sein. Die Eigenschaft `style` kann `"long"`, `"short"` oder `"narrow"` sein, wobei `"long"` der Standardwert ist.

`Intl.DisplayNames.prototype.of( code )` erwartet die folgenden Formate, je nachdem, wie die Instanz mit `type` konstruiert wurde.

- Wenn `type` `"region"` ist, muss `code` entweder ein [ISO-3166 2-Buchstaben-Ländercode](https://www.iso.org/iso-3166-country-codes.html) oder ein [UN-M49 3-stelliger Regionscode](https://unstats.un.org/unsd/methodology/m49/) sein.
- Wenn `type` `"language"` ist, muss `code` der [Sprachidentifikator-Grammatik von Unicode](https://unicode.org/reports/tr35/#Unicode_language_identifier) entsprechen.
- Wenn `type` `"currency"` ist, muss `code` ein [ISO-4217 3-Buchstaben-Währungscode](https://www.iso.org/iso-4217-currency-codes.html) sein.
- Wenn `type` `"script"` ist, muss `code` ein [ISO-15924 4-Buchstaben-Schriftcode](https://unicode.org/iso15924/iso15924-codes.html) sein.

## Fazit

Wie andere `Intl`-APIs wird `Intl.DisplayNames` von Bibliotheken und Anwendungen bevorzugt, sobald es breiter verfügbar ist, und diese werden auf das Verpacken und Liefern eigener Übersetzungsdaten zugunsten der nativen Funktionalität verzichten.

## Unterstützung für `Intl.DisplayNames`

<feature-support chrome="81 /blog/v8-release-81#intl.displaynames"
                 firefox="86 https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/86#javascript"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=209779"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="no"></feature-support>
