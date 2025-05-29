---
title: "`Intl.NumberFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)) y Shane F. Carr"
avatars: 
  - "mathias-bynens"
  - "shane-carr"
date: 2019-08-08
tags: 
  - Intl
  - io19
description: "Intl.NumberFormat permite el formato de números adaptado al idioma."
tweet: "1159476407329873920"
---
Es posible que ya estés familiarizado con la API `Intl.NumberFormat`, ya que ha sido compatible con varios entornos modernos durante algún tiempo.

<feature-support chrome="24"
                 firefox="29"
                 safari="10"
                 nodejs="0.12"
                 babel="yes"></feature-support>

En su forma más básica, `Intl.NumberFormat` te permite crear una instancia de formato reutilizable que admite el formato de números adaptado al idioma. Al igual que otras APIs de `Intl.*Format`, una instancia de formateador admite ambos métodos: `format` y `formatToParts`:

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

**Nota:** Aunque gran parte de la funcionalidad de `Intl.NumberFormat` se puede lograr utilizando `Number.prototype.toLocaleString`, `Intl.NumberFormat` suele ser la mejor opción, ya que permite crear una instancia de formato reutilizable que tiende a ser [más eficiente](/blog/v8-release-76#localized-bigint).

Recientemente, la API `Intl.NumberFormat` ha adquirido nuevas capacidades.

## Compatibilidad con `BigInt`

Además de los `Number`s, `Intl.NumberFormat` ahora también puede formatear [`BigInt`s](/features/bigint):

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

## Unidades de medida

`Intl.NumberFormat` actualmente admite las siguientes _unidades simples_:

- ángulo: `degree`
- área: `acre`, `hectare`
- concentración: `percent`
- digital: `bit`, `byte`, `kilobit`, `kilobyte`, `megabit`, `megabyte`, `gigabit`, `gigabyte`, `terabit`, `terabyte`, `petabyte`
- duración: `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`, `year`
- longitud: `millimeter`, `centimeter`, `meter`, `kilometer`, `inch`, `foot`, `yard`, `mile`, `mile-scandinavian`
- masa: `gram`,  `kilogram`, `ounce`, `pound`, `stone`
- temperatura: `celsius`, `fahrenheit`
- volumen: `liter`, `milliliter`, `gallon`, `fluid-ounce`

Para formatear números con unidades localizadas, utiliza las opciones `style` y `unit`:

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

Ten en cuenta que con el tiempo se pueden agregar más unidades. Por favor, consulta la especificación para [la lista más actualizada](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers).

Las unidades simples mencionadas anteriormente se pueden combinar en pares arbitrarios de numerador y denominador para expresar unidades compuestas como “litros por acre” o “metros por segundo”:

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

## Notación compacta, científica e ingenieril

La _notación compacta_ utiliza símbolos específicos del idioma para representar números grandes. Es una alternativa más amigable para humanos a la notación científica:

```js
{
  // Prueba la notación estándar.
  const formatter = new Intl.NumberFormat('en', {
    notation: 'standard', // Este es el valor predeterminado implícito.
  });
  formatter.format(1234.56);
  // → '1,234.56'
  formatter.format(123456);
  // → '123,456'
  formatter.format(123456789);
  // → '123,456,789'
}

{
  // Prueba la notación compacta.
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

:::nota
**Nota:** De forma predeterminada, la notación compacta redondea al número entero más cercano, pero siempre conserva 2 dígitos significativos. Puedes configurar cualquiera de `{minimum,maximum}FractionDigits` o `{minimum,maximum}SignificantDigits` para anular ese comportamiento.
:::

`Intl.NumberFormat` también puede formatear números en [notación científica](https://en.wikipedia.org/wiki/Scientific_notation):

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
  notation: 'scientific',
});
formatter.format(299792458);
// → '2.998E8 m/s'
```

[La notación de ingeniería](https://en.wikipedia.org/wiki/Engineering_notation) también es compatible:

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

## Mostrar signo

En ciertas situaciones (como presentar diferencias) ayuda mostrar explícitamente el signo, incluso cuando el número es positivo. La nueva opción `signDisplay` lo permite:

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

Para evitar mostrar el signo cuando el valor es `0`, usa `signDisplay: 'exceptZero'`:

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
// Nota: -0 aún se muestra con signo, como se espera:
formatter.format(-0);
// → '-0%'
```

Para monedas, la opción `currencySign` permite el _formato contable_, que habilita un formato específico por ubicación para cantidades negativas de moneda; por ejemplo, envolver la cantidad en paréntesis:

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

## Más información

La [propuesta de especificación](https://github.com/tc39/proposal-unified-intl-numberformat) correspondiente tiene más información y ejemplos, incluida orientación sobre cómo detectar características individuales de `Intl.NumberFormat`.
