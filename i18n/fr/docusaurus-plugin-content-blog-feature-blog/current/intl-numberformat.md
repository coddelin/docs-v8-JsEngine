---
title: "`Intl.NumberFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)) et Shane F. Carr"
avatars:
  - "mathias-bynens"
  - "shane-carr"
date: 2019-08-08
tags:
  - Intl
  - io19
description: "Intl.NumberFormat permet le formatage des nombres adapté à la langue locale."
tweet: "1159476407329873920"
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
const formatter = new Intl.NumberFormat('en');
formatter.format(987654.321);
// → '987,654.321'
formatter.formatToParts(987654.321);
// → [
// →   { type: 'integer', value: '987' },
// →   { type: 'group', value: ',' },
// →   { type: 'integer', value: '654' },
// →   { type: 'decimal', value: '.' },
// →   { type: 'fraction', value: '321' }
// → ]
```

**Note :** Bien que la plupart des fonctionnalités de `Intl.NumberFormat` puissent être obtenues en utilisant `Number.prototype.toLocaleString`, `Intl.NumberFormat` est souvent un meilleur choix, car il permet de créer une instance de formateur réutilisable qui tend à être [plus efficace](/blog/v8-release-76#localized-bigint).

Récemment, l’API `Intl.NumberFormat` a gagné de nouvelles capacités.

## Support de `BigInt`

En plus des `Number`, `Intl.NumberFormat` peut désormais également formater les [`BigInt`](/features/bigint) :

```js
const formatter = new Intl.NumberFormat('fr');
formatter.format(12345678901234567890n);
// → '12 345 678 901 234 567 890'
formatter.formatToParts(123456n);
// → [
// →   { type: 'integer', value: '123' },
// →   { type: 'group', value: ' ' },
// →   { type: 'integer', value: '456' }
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
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'kilobyte',
});
formatter.format(1.234);
// → '1.234 kB'
formatter.format(123.4);
// → '123.4 kB'
```

Notez qu’au fil du temps, la prise en charge de davantage d’unités peut être ajoutée. Veuillez consulter la spécification pour [la liste la plus à jour](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers).

Les unités simples ci-dessus peuvent être combinées en paires arbitraires de numérateur et dénominateur pour exprimer des unités composées telles que “litres par acre” ou “mètres par seconde” :

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
});
formatter.format(299792458);
// → '299,792,458 m/s'
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
  const formatter = new Intl.NumberFormat('en', {
    notation: 'standard', // C’est le paramètre par défaut implicite.
  });
  formatter.format(1234.56);
  // → '1,234.56'
  formatter.format(123456);
  // → '123,456'
  formatter.format(123456789);
  // → '123,456,789'
}

{
  // Test de la notation compacte.
  const formatter = new Intl.NumberFormat('en', {
    notation: 'compact',
  });
  formatter.format(1234.56);
  // → '1.2K'
  formatter.format(123456);
  // → '123K'
  formatter.format(123456789);
  // → '123M'
}
```

:::note
**Note :** Par défaut, la notation compacte arrondit à l’entier le plus proche, mais conserve toujours 2 chiffres significatifs. Vous pouvez définir l’un des `{minimum,maximum}FractionDigits` ou `{minimum,maximum}SignificantDigits` pour modifier ce comportement.
:::

`Intl.NumberFormat` peut également formater des nombres en [notation scientifique](https://en.wikipedia.org/wiki/Scientific_notation) :

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
  notation: 'scientific',
});
formatter.format(299792458);
// → '2.998E8 m/s'
```

[La notation ingénierique](https://en.wikipedia.org/wiki/Engineering_notation) est également prise en charge :

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
  notation: 'engineering',
});
formatter.format(299792458);
// → '299.792E6 m/s'
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## Affichage du signe

Dans certaines situations (comme la présentation de différences), il est utile d'afficher explicitement le signe, même lorsque le nombre est positif. La nouvelle option `signDisplay` permet cela :

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'percent',
  signDisplay: 'always',
});
formatter.format(-12.34);
// → '-12.34%'
formatter.format(12.34);
// → '+12.34%'
formatter.format(0);
// → '+0%'
formatter.format(-0);
// → '-0%'
```

Pour éviter d'afficher le signe lorsque la valeur est `0`, utilisez `signDisplay: 'exceptZero'` :

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'percent',
  signDisplay: 'exceptZero',
});
formatter.format(-12.34);
// → '-12.34%'
formatter.format(12.34);
// → '+12.34%'
formatter.format(0);
// → '0%'
// Remarque : -0 est toujours affiché avec un signe, comme on peut s'y attendre :
formatter.format(-0);
// → '-0%'
```

Pour la monnaie, l'option `currencySign` permet le _format comptable_, qui permet un format spécifique à la locale pour les montants monétaires négatifs ; par exemple, en mettant le montant entre parenthèses :

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'USD',
  signDisplay: 'exceptZero',
  currencySign: 'accounting',
});
formatter.format(-12.34);
// → '($12.34)'
formatter.format(12.34);
// → '+$12.34'
formatter.format(0);
// → '$0.00'
formatter.format(-0);
// → '($0.00)'
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## Plus d'informations

[La proposition de spécification pertinente](https://github.com/tc39/proposal-unified-intl-numberformat) contient plus d'informations et d'exemples, notamment des conseils sur la détection des fonctionnalités individuelles de `Intl.NumberFormat`.
