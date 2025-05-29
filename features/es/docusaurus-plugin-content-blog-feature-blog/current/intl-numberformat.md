---
title: &apos;`Intl.NumberFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias)) y Shane F. Carr&apos;
avatars:
  - &apos;mathias-bynens&apos;
  - &apos;shane-carr&apos;
date: 2019-08-08
tags:
  - Intl
  - io19
description: &apos;Intl.NumberFormat permite el formato de números adaptado al idioma.&apos;
tweet: &apos;1159476407329873920&apos;
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

**Nota:** Aunque gran parte de la funcionalidad de `Intl.NumberFormat` se puede lograr utilizando `Number.prototype.toLocaleString`, `Intl.NumberFormat` suele ser la mejor opción, ya que permite crear una instancia de formato reutilizable que tiende a ser [más eficiente](/blog/v8-release-76#localized-bigint).

Recientemente, la API `Intl.NumberFormat` ha adquirido nuevas capacidades.

## Compatibilidad con `BigInt`

Además de los `Number`s, `Intl.NumberFormat` ahora también puede formatear [`BigInt`s](/features/bigint):

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
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;kilobyte&apos;,
});
formatter.format(1.234);
// → &apos;1.234 kB&apos;
formatter.format(123.4);
// → &apos;123.4 kB&apos;
```

Ten en cuenta que con el tiempo se pueden agregar más unidades. Por favor, consulta la especificación para [la lista más actualizada](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers).

Las unidades simples mencionadas anteriormente se pueden combinar en pares arbitrarios de numerador y denominador para expresar unidades compuestas como “litros por acre” o “metros por segundo”:

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

## Notación compacta, científica e ingenieril

La _notación compacta_ utiliza símbolos específicos del idioma para representar números grandes. Es una alternativa más amigable para humanos a la notación científica:

```js
{
  // Prueba la notación estándar.
  const formatter = new Intl.NumberFormat(&apos;en&apos;, {
    notation: &apos;standard&apos;, // Este es el valor predeterminado implícito.
  });
  formatter.format(1234.56);
  // → &apos;1,234.56&apos;
  formatter.format(123456);
  // → &apos;123,456&apos;
  formatter.format(123456789);
  // → &apos;123,456,789&apos;
}

{
  // Prueba la notación compacta.
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

:::nota
**Nota:** De forma predeterminada, la notación compacta redondea al número entero más cercano, pero siempre conserva 2 dígitos significativos. Puedes configurar cualquiera de `{minimum,maximum}FractionDigits` o `{minimum,maximum}SignificantDigits` para anular ese comportamiento.
:::

`Intl.NumberFormat` también puede formatear números en [notación científica](https://en.wikipedia.org/wiki/Scientific_notation):

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
  notation: &apos;scientific&apos;,
});
formatter.format(299792458);
// → &apos;2.998E8 m/s&apos;
```

[La notación de ingeniería](https://en.wikipedia.org/wiki/Engineering_notation) también es compatible:

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

## Mostrar signo

En ciertas situaciones (como presentar diferencias) ayuda mostrar explícitamente el signo, incluso cuando el número es positivo. La nueva opción `signDisplay` lo permite:

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

Para evitar mostrar el signo cuando el valor es `0`, usa `signDisplay: &apos;exceptZero&apos;`:

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
// Nota: -0 aún se muestra con signo, como se espera:
formatter.format(-0);
// → &apos;-0%&apos;
```

Para monedas, la opción `currencySign` permite el _formato contable_, que habilita un formato específico por ubicación para cantidades negativas de moneda; por ejemplo, envolver la cantidad en paréntesis:

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

## Más información

La [propuesta de especificación](https://github.com/tc39/proposal-unified-intl-numberformat) correspondiente tiene más información y ejemplos, incluida orientación sobre cómo detectar características individuales de `Intl.NumberFormat`.
