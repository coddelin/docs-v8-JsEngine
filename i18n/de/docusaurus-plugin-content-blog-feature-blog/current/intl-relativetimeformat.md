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
description: &apos;Intl.RelativeTimeFormat ermöglicht die lokalisierte Formatierung relativer Zeitangaben, ohne die Leistung zu beeinträchtigen.&apos;
tweet: &apos;1054387117571354624&apos;
---
Moderne Webanwendungen verwenden häufig Phrasen wie „gestern“, „vor 42 Sekunden“ oder „in 3 Monaten“ anstelle vollständiger Datumsangaben und Zeitstempel. Solche _relativen Zeitformatierungswerte_ sind so gebräuchlich geworden, dass mehrere beliebte Bibliotheken Utility-Funktionen bereitstellen, die sie auf lokalisierte Weise formatieren. (Beispiele sind [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize) und [date-fns](https://date-fns.org/docs/).)

<!--truncate-->
Ein Problem bei der Implementierung eines lokalisierten Formatierers für relative Zeitangaben besteht darin, dass Sie für jede unterstützte Sprache eine Liste von üblichen Wörtern oder Phrasen (wie „gestern“ oder „letztes Quartal“) benötigen. [Der Unicode CLDR](http://cldr.unicode.org/) stellt diese Daten bereit, aber um sie in JavaScript verwenden zu können, müssen sie eingebettet und zusammen mit dem anderen Bibliothekscode ausgeliefert werden. Dies erhöht leider die Bundle-Größe solcher Bibliotheken, was sich negativ auf Ladezeiten, Parse-/Kompilierungskosten und Speicherverbrauch auswirkt.

Die brandneue `Intl.RelativeTimeFormat` API verlagert diese Belastung auf die JavaScript-Engine, die die Lokalisierungsdaten bereitstellen und direkt für JavaScript-Entwickler verfügbar machen kann. `Intl.RelativeTimeFormat` ermöglicht die lokalisierte Formatierung relativer Zeitangaben, ohne die Leistung zu beeinträchtigen.

## Anwendungsbeispiele

Das folgende Beispiel zeigt, wie ein Formatierer für relative Zeitangaben in der englischen Sprache erstellt wird.

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

Beachten Sie, dass das Argument, das an den `Intl.RelativeTimeFormat` Konstruktor übergeben wird, entweder eine Zeichenkette mit [einem BCP 47-Sprachcode](https://tools.ietf.org/html/rfc5646) oder [ein Array solcher Sprachcodes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation) sein kann.

Hier ein Beispiel für die Verwendung einer anderen Sprache (Spanisch):

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

Darüber hinaus akzeptiert der `Intl.RelativeTimeFormat` Konstruktor ein optionales `options` Argument, das eine Feinsteuerung der Ausgabe ermöglicht. Um die Flexibilität zu veranschaulichen, hier einige weitere englische Ausgabe basierend auf den Standardeinstellungen:

```js
// Erstellen Sie einen Formatierer für relative Zeitangaben in englischer Sprache
// mit den Standardeinstellungen (wie zuvor). In diesem Beispiel
// werden die Standardwerte ausdrücklich übergeben.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, {
  localeMatcher: &apos;best fit&apos;, // andere Werte: &apos;lookup&apos;
  style: &apos;long&apos;, // andere Werte: &apos;short&apos; oder &apos;narrow&apos;
  numeric: &apos;always&apos;, // andere Werte: &apos;auto&apos;
});

// Jetzt probieren wir einige Sonderfälle aus!

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

Sie haben vielleicht bemerkt, dass der obige Formatierer die Zeichenkette `&apos;1 day ago&apos;` anstelle von `&apos;yesterday&apos;` und das etwas umständliche `&apos;in 0 weeks&apos;` anstelle von `&apos;this week&apos;` erzeugt hat. Dies geschieht, weil der Formatierer standardmäßig den numerischen Wert in der Ausgabe verwendet.

Um dieses Verhalten zu ändern, setzen Sie die `numeric` Option auf `&apos;auto&apos;` (anstatt des impliziten Standards `&apos;always&apos;`):

```js
// Erstellen Sie einen Formatierer für relative Zeitangaben in englischer Sprache,
// der nicht immer den numerischen Wert in der Ausgabe verwenden muss.
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

Analog zu anderen `Intl` Klassen verfügt `Intl.RelativeTimeFormat` über eine `formatToParts` Methode zusätzlich zur `format` Methode. Obwohl `format` den häufigsten Anwendungsfall abdeckt, kann `formatToParts` hilfreich sein, wenn Sie Zugriff auf die einzelnen Teile der generierten Ausgabe benötigen:

```js
// Erstellen Sie einen Formatierer für relative Zeit für die englische Sprache, der
// nicht immer numerische Werte in der Ausgabe verwenden muss.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;yesterday&apos;

rtf.formatToParts(-1, &apos;day&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;yesterday&apos; }]

rtf.format(3, &apos;week&apos;);
// → &apos;in 3 weeks&apos;

rtf.formatToParts(3, &apos;week&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;in &apos; },
//    { type: &apos;integer&apos;, value: &apos;3&apos;, unit: &apos;week&apos; },
//    { type: &apos;literal&apos;, value: &apos; weeks&apos; }]
```

Weitere Informationen zu den verbleibenden Optionen und ihrem Verhalten finden Sie in [den API-Dokumenten im Vorschlagsrepository](https://github.com/tc39/proposal-intl-relative-time#api).

## Fazit

`Intl.RelativeTimeFormat` ist standardmäßig verfügbar in V8 v7.1 und Chrome 71. Da diese API zunehmend verfügbar wird, werden Bibliotheken wie [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize) und [date-fns](https://date-fns.org/docs/) ihre Abhängigkeit von fest codierten CLDR-Datenbanken zugunsten der nativen Funktionalität zur Formatierung der relativen Zeit aufgeben, wodurch die Leistung beim Laden, Analysieren und Kompilieren, die Laufzeitleistung und die Speicherausnutzung verbessert wird.

## `Intl.RelativeTimeFormat` Unterstützung

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
