---
title: &apos;`Intl.NumberFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias)) und Shane F. Carr&apos;
avatars:
  - &apos;mathias-bynens&apos;
  - &apos;shane-carr&apos;
date: 2019-08-08
tags:
  - Intl
  - io19
description: &apos;Intl.NumberFormat ermöglicht eine lokalisationsspezifische Zahlenformatierung.&apos;
tweet: &apos;1159476407329873920&apos;
---
Sie kennen möglicherweise bereits die `Intl.NumberFormat`-API, da sie seit einiger Zeit in modernen Umgebungen unterstützt wird.

<feature-support chrome="24"
                 firefox="29"
                 safari="10"
                 nodejs="0.12"
                 babel="yes"></feature-support>

In ihrer grundlegendsten Form ermöglicht `Intl.NumberFormat` das Erstellen einer wiederverwendbaren Formatierer-Instanz, die lokalisationsspezifische Zahlenformatierung unterstützt. Genau wie andere `Intl.*Format`-APIs unterstützt eine Formatierer-Instanz sowohl eine `format`- als auch eine `formatToParts`-Methode:

<!--truncate-->
```js
const formatter = new Intl.NumberFormat(&apos;en&apos;);
formatter.format(987654.321);
// → &apos;987,654.321&apos;
formatter.formatToParts(987654.321);
// → [
// →   { type: &apos;integer&apos;, value: &apos;987&apos; },
// →   { type: &apos;group&apos;, value: &apos;,&apos; },
// →   { type: &apos;integer&apos;, value: &apos;654&apos; },
// →   { type: &apos;decimal&apos;, value: &apos;.&apos; },
// →   { type: &apos;fraction&apos;, value: &apos;321&apos; }
// → ]
```

**Hinweis:** Obwohl ein Großteil der `Intl.NumberFormat`-Funktionalität mit `Number.prototype.toLocaleString` erreicht werden kann, ist `Intl.NumberFormat` oft die bessere Wahl, da es die Erstellung einer wiederverwendbaren Formatierer-Instanz ermöglicht, die in der Regel [effizienter ist](/blog/v8-release-76#localized-bigint).

Kürzlich hat die `Intl.NumberFormat`-API einige neue Funktionen hinzugewonnen.

## Unterstützung für `BigInt`

Neben `Number`s kann `Intl.NumberFormat` jetzt auch [`BigInt`s](/features/bigint) formatieren:

```js
const formatter = new Intl.NumberFormat(&apos;fr&apos;);
formatter.format(12345678901234567890n);
// → &apos;12 345 678 901 234 567 890&apos;
formatter.formatToParts(123456n);
// → [
// →   { type: &apos;integer&apos;, value: &apos;123&apos; },
// →   { type: &apos;group&apos;, value: &apos; &apos; },
// →   { type: &apos;integer&apos;, value: &apos;456&apos; }
// → ]
```

<feature-support chrome="76 /blog/v8-release-76#localized-bigint"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## Maßeinheiten

`Intl.NumberFormat` unterstützt derzeit die folgenden sogenannten _einfachen Einheiten_:

- Winkel: `degree`
- Fläche: `acre`, `hectare`
- Konzentration: `percent`
- Digital: `bit`, `byte`, `kilobit`, `kilobyte`, `megabit`, `megabyte`, `gigabit`, `gigabyte`, `terabit`, `terabyte`, `petabyte`
- Dauer: `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`, `year`
- Länge: `millimeter`, `centimeter`, `meter`, `kilometer`, `inch`, `foot`, `yard`, `mile`, `mile-scandinavian`
- Masse: `gram`,  `kilogram`, `ounce`, `pound`, `stone`
- Temperatur: `celsius`, `fahrenheit`
- Volumen: `liter`, `milliliter`, `gallon`, `fluid-ounce`

Um Zahlen mit lokalisierten Einheiten zu formatieren, verwenden Sie die Optionen `style` und `unit`:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;kilobyte&apos;,
});
formatter.format(1.234);
// → &apos;1.234 kB&apos;
formatter.format(123.4);
// → &apos;123.4 kB&apos;
```

Beachten Sie, dass im Laufe der Zeit die Unterstützung für weitere Einheiten hinzugefügt werden kann. Bitte beziehen Sie sich auf die Spezifikation für [die neueste aktualisierte Liste](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers).

Die oben genannten einfachen Einheiten können in beliebigen Zähler- und Nennerpaaren kombiniert werden, um zusammengesetzte Einheiten wie „Liter pro Acre“ oder „Meter pro Sekunde“ auszudrücken:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
});
formatter.format(299792458);
// → &apos;299,792,458 m/s&apos;
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## Kompakte, wissenschaftliche und technische Notation

_Kompakte Notation_ verwendet lokalisationsspezifische Symbole, um große Zahlen darzustellen. Es ist eine benutzerfreundlichere Alternative zur wissenschaftlichen Notation:

```js
{
  // Test der Standardnotation.
  const formatter = new Intl.NumberFormat(&apos;en&apos;, {
    notation: &apos;standard&apos;, // Dies ist die implizite Standardeinstellung.
  });
  formatter.format(1234.56);
  // → &apos;1,234.56&apos;
  formatter.format(123456);
  // → &apos;123,456&apos;
  formatter.format(123456789);
  // → &apos;123,456,789&apos;
}

{
  // Test der kompakten Notation.
  const formatter = new Intl.NumberFormat(&apos;en&apos;, {
    notation: &apos;compact&apos;,
  });
  formatter.format(1234.56);
  // → &apos;1.2K&apos;
  formatter.format(123456);
  // → &apos;123K&apos;
  formatter.format(123456789);
  // → &apos;123M&apos;
}
```

:::note
**Hinweis:** Standardmäßig wird durch die kompakte Notation auf die nächste ganze Zahl gerundet, jedoch werden immer 2 signifikante Stellen beibehalten. Sie können `{minimum,maximum}FractionDigits` oder `{minimum,maximum}SignificantDigits` festlegen, um dieses Verhalten zu überschreiben.
:::

`Intl.NumberFormat` kann auch Zahlen im [wissenschaftlichen Format](https://de.wikipedia.org/wiki/Wissenschaftliche_Notation) formatieren:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
  notation: &apos;scientific&apos;,
});
formatter.format(299792458);
// → &apos;2.998E8 m/s&apos;
```

[Ingenieursnotation](https://de.wikipedia.org/wiki/Ingenieursnotation) wird ebenfalls unterstützt:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
  notation: &apos;engineering&apos;,
});
formatter.format(299792458);
// → &apos;299.792E6 m/s&apos;
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## Vorzeichenanzeige

In bestimmten Situationen (wie z. B. der Darstellung von Differenzen) ist es hilfreich, das Vorzeichen ausdrücklich anzuzeigen, auch wenn die Zahl positiv ist. Die neue Option `signDisplay` ermöglicht dies:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;percent&apos;,
  signDisplay: &apos;always&apos;,
});
formatter.format(-12.34);
// → &apos;-12.34%&apos;
formatter.format(12.34);
// → &apos;+12.34%&apos;
formatter.format(0);
// → &apos;+0%&apos;
formatter.format(-0);
// → &apos;-0%&apos;
```

Um das Anzeigen des Vorzeichens bei einem Wert von `0` zu verhindern, verwenden Sie `signDisplay: &apos;exceptZero&apos;`:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;percent&apos;,
  signDisplay: &apos;exceptZero&apos;,
});
formatter.format(-12.34);
// → &apos;-12.34%&apos;
formatter.format(12.34);
// → &apos;+12.34%&apos;
formatter.format(0);
// → &apos;0%&apos;
// Hinweis: -0 wird weiterhin mit Vorzeichen angezeigt, wie zu erwarten:
formatter.format(-0);
// → &apos;-0%&apos;
```

Für Währungen ermöglicht die Option `currencySign` das _Buchhaltungsformat_, das ein lokales spezifisches Format für negative Währungsbeträge ermöglicht; beispielsweise wird der Betrag in Klammern gesetzt:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;currency&apos;,
  currency: &apos;USD&apos;,
  signDisplay: &apos;exceptZero&apos;,
  currencySign: &apos;accounting&apos;,
});
formatter.format(-12.34);
// → &apos;($12.34)&apos;
formatter.format(12.34);
// → &apos;+$12.34&apos;
formatter.format(0);
// → &apos;$0.00&apos;
formatter.format(-0);
// → &apos;($0.00)&apos;
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## Mehr Informationen

Der relevante [Spezifikationsvorschlag](https://github.com/tc39/proposal-unified-intl-numberformat) enthält weitere Informationen und Beispiele, einschließlich einer Anleitung zur Erkennung jedes einzelnen `Intl.NumberFormat`-Features.
