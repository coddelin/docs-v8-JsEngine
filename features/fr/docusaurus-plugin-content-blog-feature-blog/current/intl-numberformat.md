---
title: &apos;`Intl.NumberFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias)) et Shane F. Carr&apos;
avatars:
  - &apos;mathias-bynens&apos;
  - &apos;shane-carr&apos;
date: 2019-08-08
tags:
  - Intl
  - io19
description: &apos;Intl.NumberFormat permet le formatage des nombres adapté à la langue locale.&apos;
tweet: &apos;1159476407329873920&apos;
---
Vous connaissez peut-être déjà l’API `Intl.NumberFormat`, car elle est prise en charge dans les environnements modernes depuis un certain temps.

<feature-support chrome="24"
                 firefox="29"
                 safari="10"
                 nodejs="0.12"
                 babel="yes"></feature-support>

Dans sa forme la plus basique, `Intl.NumberFormat` vous permet de créer une instance de formateur réutilisable qui prend en charge le formatage des nombres adapté à la langue locale. Tout comme les autres API `Intl.*Format`, une instance de formateur prend en charge les méthodes `format` et `formatToParts` :

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

**Note :** Bien que la plupart des fonctionnalités de `Intl.NumberFormat` puissent être obtenues en utilisant `Number.prototype.toLocaleString`, `Intl.NumberFormat` est souvent un meilleur choix, car il permet de créer une instance de formateur réutilisable qui tend à être [plus efficace](/blog/v8-release-76#localized-bigint).

Récemment, l’API `Intl.NumberFormat` a gagné de nouvelles capacités.

## Support de `BigInt`

En plus des `Number`, `Intl.NumberFormat` peut désormais également formater les [`BigInt`](/features/bigint) :

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

## Unités de mesure

`Intl.NumberFormat` prend actuellement en charge les _unités simples_ suivantes :

- angle : `degree`
- superficie : `acre`, `hectare`
- concentration : `percent`
- numérique : `bit`, `byte`, `kilobit`, `kilobyte`, `megabit`, `megabyte`, `gigabit`, `gigabyte`, `terabit`, `terabyte`, `petabyte`
- durée : `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`, `year`
- longueur : `millimeter`, `centimeter`, `meter`, `kilometer`, `inch`, `foot`, `yard`, `mile`, `mile-scandinavian`
- masse : `gram`, `kilogram`, `ounce`, `pound`, `stone`
- température : `celsius`, `fahrenheit`
- volume : `liter`, `milliliter`, `gallon`, `fluid-ounce`

Pour formater des nombres avec des unités localisées, utilisez les options `style` et `unit` :

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

Notez qu’au fil du temps, la prise en charge de davantage d’unités peut être ajoutée. Veuillez consulter la spécification pour [la liste la plus à jour](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers).

Les unités simples ci-dessus peuvent être combinées en paires arbitraires de numérateur et dénominateur pour exprimer des unités composées telles que “litres par acre” ou “mètres par seconde” :

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

## Notation compacte, scientifique et ingénierie

La _notation compacte_ utilise des symboles spécifiques à la langue pour représenter de grands nombres. C’est une alternative plus conviviale à la notation scientifique :

```js
{
  // Test de la notation standard.
  const formatter = new Intl.NumberFormat(&apos;en&apos;, {
    notation: &apos;standard&apos;, // C’est le paramètre par défaut implicite.
  });
  formatter.format(1234.56);
  // → &apos;1,234.56&apos;
  formatter.format(123456);
  // → &apos;123,456&apos;
  formatter.format(123456789);
  // → &apos;123,456,789&apos;
}

{
  // Test de la notation compacte.
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
**Note :** Par défaut, la notation compacte arrondit à l’entier le plus proche, mais conserve toujours 2 chiffres significatifs. Vous pouvez définir l’un des `{minimum,maximum}FractionDigits` ou `{minimum,maximum}SignificantDigits` pour modifier ce comportement.
:::

`Intl.NumberFormat` peut également formater des nombres en [notation scientifique](https://en.wikipedia.org/wiki/Scientific_notation) :

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
  notation: &apos;scientific&apos;,
});
formatter.format(299792458);
// → &apos;2.998E8 m/s&apos;
```

[La notation ingénierique](https://en.wikipedia.org/wiki/Engineering_notation) est également prise en charge :

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

## Affichage du signe

Dans certaines situations (comme la présentation de différences), il est utile d'afficher explicitement le signe, même lorsque le nombre est positif. La nouvelle option `signDisplay` permet cela :

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

Pour éviter d'afficher le signe lorsque la valeur est `0`, utilisez `signDisplay: &apos;exceptZero&apos;` :

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
// Remarque : -0 est toujours affiché avec un signe, comme on peut s'y attendre :
formatter.format(-0);
// → &apos;-0%&apos;
```

Pour la monnaie, l'option `currencySign` permet le _format comptable_, qui permet un format spécifique à la locale pour les montants monétaires négatifs ; par exemple, en mettant le montant entre parenthèses :

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

## Plus d'informations

[La proposition de spécification pertinente](https://github.com/tc39/proposal-unified-intl-numberformat) contient plus d'informations et d'exemples, notamment des conseils sur la détection des fonctionnalités individuelles de `Intl.NumberFormat`.
