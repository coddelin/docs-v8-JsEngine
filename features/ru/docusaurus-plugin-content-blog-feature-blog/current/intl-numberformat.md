---
title: &apos;`Intl.NumberFormat`&apos;
author: &apos;Маттиас Байненс ([@mathias](https://twitter.com/mathias)) и Шейн Ф. Карр&apos;
avatars:
  - &apos;mathias-bynens&apos;
  - &apos;shane-carr&apos;
date: 2019-08-08
tags:
  - Intl
  - io19
description: &apos;Intl.NumberFormat позволяет форматировать числа в соответствии с локалью.&apos;
tweet: &apos;1159476407329873920&apos;
---
Вы, возможно, уже знакомы с API `Intl.NumberFormat`, так как его поддержка существует в современных средах уже некоторое время.

<feature-support chrome="24"
                 firefox="29"
                 safari="10"
                 nodejs="0.12"
                 babel="yes"></feature-support>

В своей самой базовой форме `Intl.NumberFormat` позволяет создавать экземпляр форматтера, поддерживающий форматирование чисел с учетом локали. Так же, как и другие API `Intl.*Format`, экземпляр форматтера поддерживает методы `format` и `formatToParts`:

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

**Замечание:** Хотя многие функции `Intl.NumberFormat` можно реализовать с помощью `Number.prototype.toLocaleString`, `Intl.NumberFormat` часто предпочтительнее, так как позволяет создавать многоразовый экземпляр форматтера, что, как правило, [более эффективно](/blog/v8-release-76#localized-bigint).

Совсем недавно API `Intl.NumberFormat` получил новые возможности.

## Поддержка `BigInt`

Помимо `Number`, `Intl.NumberFormat` теперь может форматировать и [`BigInt`](/features/bigint):

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

## Единицы измерения

`Intl.NumberFormat` в настоящее время поддерживает следующие так называемые _простые единицы_:

- угол: `degree`
- площадь: `acre`, `hectare`
- концентрация: `percent`
- цифровые: `bit`, `byte`, `kilobit`, `kilobyte`, `megabit`, `megabyte`, `gigabit`, `gigabyte`, `terabit`, `terabyte`, `petabyte`
- длительность: `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`, `year`
- длина: `millimeter`, `centimeter`, `meter`, `kilometer`, `inch`, `foot`, `yard`, `mile`, `mile-scandinavian`
- масса: `gram`,  `kilogram`, `ounce`, `pound`, `stone`
- температура: `celsius`, `fahrenheit`
- объем: `liter`, `milliliter`, `gallon`, `fluid-ounce`

Чтобы форматировать числа с локализованными единицами, используйте параметры `style` и `unit`:

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

Обратите внимание, что со временем может быть добавлена поддержка большего количества единиц. Пожалуйста, обратитесь к спецификации за [последним актуальным списком](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers).

Простые единицы можно сочетать в произвольные сочетания числителя и знаменателя для выражения составных единиц, таких как "литры на акр" или "метры в секунду":

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

## Компактное, научное и инженерное представление

_Компактное представление_ использует символы, специфичные для локали, чтобы обозначить большие числа. Это более дружественная для восприятия альтернатива научной нотации:

```js
{
  // Тест стандартного представления.
  const formatter = new Intl.NumberFormat(&apos;en&apos;, {
    notation: &apos;standard&apos;, // Это подразумеваемое значение по умолчанию.
  });
  formatter.format(1234.56);
  // → &apos;1,234.56&apos;
  formatter.format(123456);
  // → &apos;123,456&apos;
  formatter.format(123456789);
  // → &apos;123,456,789&apos;
}

{
  // Тест компактного представления.
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
**Замечание:** По умолчанию компактное представление округляет до ближайшего целого числа, но всегда сохраняет 2 значащие цифры. Вы можете задать любые комбинации `{minimum,maximum}FractionDigits` или `{minimum,maximum}SignificantDigits`, чтобы переопределить это поведение.
:::

`Intl.NumberFormat` также может форматировать числа в [научной нотации](https://en.wikipedia.org/wiki/Scientific_notation):

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
  notation: &apos;scientific&apos;,
});
formatter.format(299792458);
// → &apos;2.998E8 m/s&apos;
```

[Инженерная нотация](https://en.wikipedia.org/wiki/Engineering_notation) также поддерживается:

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

## Отображение знака

В некоторых ситуациях (например, при представлении дельт) полезно явно отображать знак, даже когда число положительное. Новый параметр `signDisplay` позволяет это сделать:

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

Чтобы избежать отображения знака, если значение равно `0`, используйте `signDisplay: &apos;exceptZero&apos;`:

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
// Примечание: -0 все еще отображается со знаком, как и ожидалось:
formatter.format(-0);
// → &apos;-0%&apos;
```

Для валют параметр `currencySign` позволяет использовать _учетный формат_, который активирует формат, зависящий от локали, для отрицательных сумм; например, оборачивание суммы в скобки:

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

## Дополнительная информация

Соответствующее [предложение спецификации](https://github.com/tc39/proposal-unified-intl-numberformat) содержит больше информации и примеров, включая руководство по обнаружению наличия каждой функции в `Intl.NumberFormat`.
