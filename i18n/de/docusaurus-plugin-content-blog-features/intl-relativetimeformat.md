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
description: "Intl.RelativeTimeFormat ermöglicht die lokalisierte Formatierung relativer Zeitangaben, ohne die Leistung zu beeinträchtigen."
tweet: "1054387117571354624"
---
Moderne Webanwendungen verwenden häufig Phrasen wie „gestern“, „vor 42 Sekunden“ oder „in 3 Monaten“ anstelle vollständiger Datumsangaben und Zeitstempel. Solche _relativen Zeitformatierungswerte_ sind so gebräuchlich geworden, dass mehrere beliebte Bibliotheken Utility-Funktionen bereitstellen, die sie auf lokalisierte Weise formatieren. (Beispiele sind [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize) und [date-fns](https://date-fns.org/docs/).)

<!--truncate-->
Ein Problem bei der Implementierung eines lokalisierten Formatierers für relative Zeitangaben besteht darin, dass Sie für jede unterstützte Sprache eine Liste von üblichen Wörtern oder Phrasen (wie „gestern“ oder „letztes Quartal“) benötigen. [Der Unicode CLDR](http://cldr.unicode.org/) stellt diese Daten bereit, aber um sie in JavaScript verwenden zu können, müssen sie eingebettet und zusammen mit dem anderen Bibliothekscode ausgeliefert werden. Dies erhöht leider die Bundle-Größe solcher Bibliotheken, was sich negativ auf Ladezeiten, Parse-/Kompilierungskosten und Speicherverbrauch auswirkt.

Die brandneue `Intl.RelativeTimeFormat` API verlagert diese Belastung auf die JavaScript-Engine, die die Lokalisierungsdaten bereitstellen und direkt für JavaScript-Entwickler verfügbar machen kann. `Intl.RelativeTimeFormat` ermöglicht die lokalisierte Formatierung relativer Zeitangaben, ohne die Leistung zu beeinträchtigen.

## Anwendungsbeispiele

Das folgende Beispiel zeigt, wie ein Formatierer für relative Zeitangaben in der englischen Sprache erstellt wird.

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

Beachten Sie, dass das Argument, das an den `Intl.RelativeTimeFormat` Konstruktor übergeben wird, entweder eine Zeichenkette mit [einem BCP 47-Sprachcode](https://tools.ietf.org/html/rfc5646) oder [ein Array solcher Sprachcodes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation) sein kann.

Hier ein Beispiel für die Verwendung einer anderen Sprache (Spanisch):

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

Darüber hinaus akzeptiert der `Intl.RelativeTimeFormat` Konstruktor ein optionales `options` Argument, das eine Feinsteuerung der Ausgabe ermöglicht. Um die Flexibilität zu veranschaulichen, hier einige weitere englische Ausgabe basierend auf den Standardeinstellungen:

```js
// Erstellen Sie einen Formatierer für relative Zeitangaben in englischer Sprache
// mit den Standardeinstellungen (wie zuvor). In diesem Beispiel
// werden die Standardwerte ausdrücklich übergeben.
const rtf = new Intl.RelativeTimeFormat('en', {
  localeMatcher: 'best fit', // andere Werte: 'lookup'
  style: 'long', // andere Werte: 'short' oder 'narrow'
  numeric: 'always', // andere Werte: 'auto'
});

// Jetzt probieren wir einige Sonderfälle aus!

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

Sie haben vielleicht bemerkt, dass der obige Formatierer die Zeichenkette `'1 day ago'` anstelle von `'yesterday'` und das etwas umständliche `'in 0 weeks'` anstelle von `'this week'` erzeugt hat. Dies geschieht, weil der Formatierer standardmäßig den numerischen Wert in der Ausgabe verwendet.

Um dieses Verhalten zu ändern, setzen Sie die `numeric` Option auf `'auto'` (anstatt des impliziten Standards `'always'`):

```js
// Erstellen Sie einen Formatierer für relative Zeitangaben in englischer Sprache,
// der nicht immer den numerischen Wert in der Ausgabe verwenden muss.
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

Analog zu anderen `Intl` Klassen verfügt `Intl.RelativeTimeFormat` über eine `formatToParts` Methode zusätzlich zur `format` Methode. Obwohl `format` den häufigsten Anwendungsfall abdeckt, kann `formatToParts` hilfreich sein, wenn Sie Zugriff auf die einzelnen Teile der generierten Ausgabe benötigen:

```js
// Erstellen Sie einen Formatierer für relative Zeit für die englische Sprache, der
// nicht immer numerische Werte in der Ausgabe verwenden muss.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'yesterday'

rtf.formatToParts(-1, 'day');
// → [{ type: 'literal', value: 'yesterday' }]

rtf.format(3, 'week');
// → 'in 3 weeks'

rtf.formatToParts(3, 'week');
// → [{ type: 'literal', value: 'in ' },
//    { type: 'integer', value: '3', unit: 'week' },
//    { type: 'literal', value: ' weeks' }]
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
