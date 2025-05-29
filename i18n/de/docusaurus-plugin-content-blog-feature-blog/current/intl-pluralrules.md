---
title: '`Intl.PluralRules`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2017-10-04
tags:
  - Intl
description: 'Das korrekte Behandeln von Pluralen ist eines von vielen Problemen, die einfach erscheinen, bis man erkennt, dass jede Sprache ihre eigenen Pluralisierungsregeln hat. Die Intl.PluralRules API kann helfen!'
tweet: '915542989493202944'
---
Iñtërnâtiônàlizætiøn ist schwierig. Das korrekte Behandeln von Pluralen ist eines von vielen Problemen, die einfach erscheinen, bis man erkennt, dass jede Sprache ihre eigenen Pluralisierungsregeln hat.

Für die englische Pluralisierung gibt es nur zwei mögliche Ergebnisse. Nehmen wir das Wort „cat“ als Beispiel:

- 1 cat, d.h. die `'one'`-Form, bekannt als Singular im Englischen
- 2 cats, aber auch 42 cats, 0.5 cats, usw., d.h. die `'other'`-Form (die einzige weitere), bekannt als Plural im Englischen.

Die brandneue [`Intl.PluralRules` API](https://github.com/tc39/proposal-intl-plural-rules) sagt Ihnen, welche Form in einer Sprache Ihrer Wahl basierend auf einer gegebenen Zahl zutrifft.

```js
const pr = new Intl.PluralRules('en-US');
pr.select(0);   // 'other' (z. B. '0 cats')
pr.select(0.5); // 'other' (z. B. '0.5 cats')
pr.select(1);   // 'one'   (z. B. '1 cat')
pr.select(1.5); // 'other' (z. B. '0.5 cats')
pr.select(2);   // 'other' (z. B. '0.5 cats')
```

<!--truncate-->
Im Gegensatz zu anderen Internationalisierungs-APIs ist `Intl.PluralRules` eine Low-Level-API, die keine eigene Formatierung durchführt. Stattdessen können Sie darauf aufbauend Ihren eigenen Formatter erstellen:

```js
const suffixes = new Map([
  // Hinweis: In realen Szenarien würden Sie die Plurale nicht
  // so hartcodieren; sie wären Teil Ihrer Übersetzungsdateien.
  ['one',   'cat'],
  ['other', 'cats'],
]);
const pr = new Intl.PluralRules('en-US');
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // '1 cat'
formatCats(0);   // '0 cats'
formatCats(0.5); // '0.5 cats'
formatCats(1.5); // '1.5 cats'
formatCats(2);   // '2 cats'
```

Für die relativ einfachen englischen Pluralisierungsregeln mag dies übertrieben erscheinen; allerdings folgen nicht alle Sprachen denselben Regeln. Einige Sprachen haben nur eine einzige Pluralisierungsform, und andere Sprachen haben mehrere Formen. [Walisisch](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules) hat zum Beispiel sechs verschiedene Pluralisierungsformen!

```js
const suffixes = new Map([
  ['zero',  'cathod'],
  ['one',   'gath'],
  // Hinweis: Die `two`-Form ist zufällig dieselbe wie die `'one'`
  // Form für dieses spezielle Wort, aber dies gilt nicht für alle
  // Wörter im Walisischen.
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
formatWelshCats(1.5); // '1.5 cath'
formatWelshCats(2);   // '2 gath'
formatWelshCats(3);   // '3 cath'
formatWelshCats(6);   // '6 chath'
formatWelshCats(42);  // '42 cath'
```

Um eine korrekte Pluralisierung mit Unterstützung mehrerer Sprachen zu implementieren, wird eine Datenbank mit Sprachen und ihren Pluralisierungsregeln benötigt. [Das Unicode CLDR](http://cldr.unicode.org/) enthält diese Daten, aber um sie in JavaScript zu verwenden, müssen sie eingebettet und zusammen mit Ihrem anderen JavaScript-Code bereitgestellt werden, was Ladezeiten, Parse-Zeiten und Speicherverbrauch erhöht. Die `Intl.PluralRules` API verlagert diese Last auf die JavaScript-Engine und ermöglicht so effizientere internationalisierte Pluralisierungen.

:::note
**Hinweis:** Während CLDR-Daten die Formzuordnungen pro Sprache enthalten, beinhalten sie keine Listen von Singular-/Pluralformen für einzelne Wörter. Diese müssen Sie weiterhin selbst übersetzen und bereitstellen, wie zuvor.
:::

## Ordinalzahlen

Die `Intl.PluralRules` API unterstützt verschiedene Auswahlregeln über die `type`-Eigenschaft im optionalen `options`-Argument. Der implizite Standardwert (wie in den obigen Beispielen verwendet) ist `'cardinal'`. Um stattdessen das Ordinale für eine gegebene Zahl zu ermitteln (z. B. `1` → `1st`, `2` → `2nd`, usw.), verwenden Sie `{ type: 'ordinal' }`:

```js
const pr = new Intl.PluralRules('en-US', {
  type: 'ordinal'
});
const suffixes = new Map([
  ['one',   'st'],
  ['two',   'nd'],
  ['few',   'rd'],
  ['other', 'th'],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // '0th'
formatOrdinals(1);   // '1st'
formatOrdinals(2);   // '2nd'
formatOrdinals(3);   // '3rd'
formatOrdinals(4);   // '4th'
formatOrdinals(11);  // '11th'
formatOrdinals(21);  // '21st'
formatOrdinals(42);  // '42nd'
formatOrdinals(103); // '103rd'
```

`Intl.PluralRules` ist eine Low-Level-API, besonders im Vergleich zu anderen Internationalisierungsfunktionen. Auch wenn Sie sie nicht direkt verwenden, könnten Sie eine Bibliothek oder ein Framework nutzen, das davon abhängt.

Da diese API immer besser verfügbar wird, werden Sie Bibliotheken wie [Globalize](https://github.com/globalizejs/globalize#plural-module) finden, die ihre Abhängigkeit von fest codierten CLDR-Datenbanken zugunsten der nativen Funktionalität fallen lassen, wodurch die Leistung beim Laden, Parsen, Ausführen und bei der Speichernutzung verbessert wird.

## Unterstützung für `Intl.PluralRules`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
