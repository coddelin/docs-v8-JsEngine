---
title: &apos;`Intl.PluralRules`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-10-04
tags:
  - Intl
description: &apos;Das korrekte Behandeln von Pluralen ist eines von vielen Problemen, die einfach erscheinen, bis man erkennt, dass jede Sprache ihre eigenen Pluralisierungsregeln hat. Die Intl.PluralRules API kann helfen!&apos;
tweet: &apos;915542989493202944&apos;
---
Iñtërnâtiônàlizætiøn ist schwierig. Das korrekte Behandeln von Pluralen ist eines von vielen Problemen, die einfach erscheinen, bis man erkennt, dass jede Sprache ihre eigenen Pluralisierungsregeln hat.

Für die englische Pluralisierung gibt es nur zwei mögliche Ergebnisse. Nehmen wir das Wort „cat“ als Beispiel:

- 1 cat, d.h. die `&apos;one&apos;`-Form, bekannt als Singular im Englischen
- 2 cats, aber auch 42 cats, 0.5 cats, usw., d.h. die `&apos;other&apos;`-Form (die einzige weitere), bekannt als Plural im Englischen.

Die brandneue [`Intl.PluralRules` API](https://github.com/tc39/proposal-intl-plural-rules) sagt Ihnen, welche Form in einer Sprache Ihrer Wahl basierend auf einer gegebenen Zahl zutrifft.

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;);
pr.select(0);   // &apos;other&apos; (z. B. &apos;0 cats&apos;)
pr.select(0.5); // &apos;other&apos; (z. B. &apos;0.5 cats&apos;)
pr.select(1);   // &apos;one&apos;   (z. B. &apos;1 cat&apos;)
pr.select(1.5); // &apos;other&apos; (z. B. &apos;0.5 cats&apos;)
pr.select(2);   // &apos;other&apos; (z. B. &apos;0.5 cats&apos;)
```

<!--truncate-->
Im Gegensatz zu anderen Internationalisierungs-APIs ist `Intl.PluralRules` eine Low-Level-API, die keine eigene Formatierung durchführt. Stattdessen können Sie darauf aufbauend Ihren eigenen Formatter erstellen:

```js
const suffixes = new Map([
  // Hinweis: In realen Szenarien würden Sie die Plurale nicht
  // so hartcodieren; sie wären Teil Ihrer Übersetzungsdateien.
  [&apos;one&apos;,   &apos;cat&apos;],
  [&apos;other&apos;, &apos;cats&apos;],
]);
const pr = new Intl.PluralRules(&apos;en-US&apos;);
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // &apos;1 cat&apos;
formatCats(0);   // &apos;0 cats&apos;
formatCats(0.5); // &apos;0.5 cats&apos;
formatCats(1.5); // &apos;1.5 cats&apos;
formatCats(2);   // &apos;2 cats&apos;
```

Für die relativ einfachen englischen Pluralisierungsregeln mag dies übertrieben erscheinen; allerdings folgen nicht alle Sprachen denselben Regeln. Einige Sprachen haben nur eine einzige Pluralisierungsform, und andere Sprachen haben mehrere Formen. [Walisisch](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules) hat zum Beispiel sechs verschiedene Pluralisierungsformen!

```js
const suffixes = new Map([
  [&apos;zero&apos;,  &apos;cathod&apos;],
  [&apos;one&apos;,   &apos;gath&apos;],
  // Hinweis: Die `two`-Form ist zufällig dieselbe wie die `&apos;one&apos;`
  // Form für dieses spezielle Wort, aber dies gilt nicht für alle
  // Wörter im Walisischen.
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
formatWelshCats(1.5); // &apos;1.5 cath&apos;
formatWelshCats(2);   // &apos;2 gath&apos;
formatWelshCats(3);   // &apos;3 cath&apos;
formatWelshCats(6);   // &apos;6 chath&apos;
formatWelshCats(42);  // &apos;42 cath&apos;
```

Um eine korrekte Pluralisierung mit Unterstützung mehrerer Sprachen zu implementieren, wird eine Datenbank mit Sprachen und ihren Pluralisierungsregeln benötigt. [Das Unicode CLDR](http://cldr.unicode.org/) enthält diese Daten, aber um sie in JavaScript zu verwenden, müssen sie eingebettet und zusammen mit Ihrem anderen JavaScript-Code bereitgestellt werden, was Ladezeiten, Parse-Zeiten und Speicherverbrauch erhöht. Die `Intl.PluralRules` API verlagert diese Last auf die JavaScript-Engine und ermöglicht so effizientere internationalisierte Pluralisierungen.

:::note
**Hinweis:** Während CLDR-Daten die Formzuordnungen pro Sprache enthalten, beinhalten sie keine Listen von Singular-/Pluralformen für einzelne Wörter. Diese müssen Sie weiterhin selbst übersetzen und bereitstellen, wie zuvor.
:::

## Ordinalzahlen

Die `Intl.PluralRules` API unterstützt verschiedene Auswahlregeln über die `type`-Eigenschaft im optionalen `options`-Argument. Der implizite Standardwert (wie in den obigen Beispielen verwendet) ist `&apos;cardinal&apos;`. Um stattdessen das Ordinale für eine gegebene Zahl zu ermitteln (z. B. `1` → `1st`, `2` → `2nd`, usw.), verwenden Sie `{ type: &apos;ordinal&apos; }`:

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;, {
  type: &apos;ordinal&apos;
});
const suffixes = new Map([
  [&apos;one&apos;,   &apos;st&apos;],
  [&apos;two&apos;,   &apos;nd&apos;],
  [&apos;few&apos;,   &apos;rd&apos;],
  [&apos;other&apos;, &apos;th&apos;],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // &apos;0th&apos;
formatOrdinals(1);   // &apos;1st&apos;
formatOrdinals(2);   // &apos;2nd&apos;
formatOrdinals(3);   // &apos;3rd&apos;
formatOrdinals(4);   // &apos;4th&apos;
formatOrdinals(11);  // &apos;11th&apos;
formatOrdinals(21);  // &apos;21st&apos;
formatOrdinals(42);  // &apos;42nd&apos;
formatOrdinals(103); // &apos;103rd&apos;
```

`Intl.PluralRules` ist eine Low-Level-API, besonders im Vergleich zu anderen Internationalisierungsfunktionen. Auch wenn Sie sie nicht direkt verwenden, könnten Sie eine Bibliothek oder ein Framework nutzen, das davon abhängt.

Da diese API immer besser verfügbar wird, werden Sie Bibliotheken wie [Globalize](https://github.com/globalizejs/globalize#plural-module) finden, die ihre Abhängigkeit von fest codierten CLDR-Datenbanken zugunsten der nativen Funktionalität fallen lassen, wodurch die Leistung beim Laden, Parsen, Ausführen und bei der Speichernutzung verbessert wird.

## Unterstützung für `Intl.PluralRules`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
