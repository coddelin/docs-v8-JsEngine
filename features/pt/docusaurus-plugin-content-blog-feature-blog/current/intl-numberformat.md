---
title: &apos;`Intl.NumberFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias)) e Shane F. Carr&apos;
avatars:
  - &apos;mathias-bynens&apos;
  - &apos;shane-carr&apos;
date: 2019-08-08
tags:
  - Intl
  - io19
description: &apos;Intl.NumberFormat permite a formatação de números sensível ao local.&apos;
tweet: &apos;1159476407329873920&apos;
---
Você pode já estar familiarizado com a API `Intl.NumberFormat`, já que tem sido suportada em ambientes modernos há algum tempo.

<feature-support chrome="24"
                 firefox="29"
                 safari="10"
                 nodejs="0.12"
                 babel="yes"></feature-support>

Na sua forma mais básica, `Intl.NumberFormat` permite criar uma instância de formatador reutilizável que suporta formatação de números sensível ao local. Assim como outras APIs `Intl.*Format`, uma instância de formatador suporta tanto o método `format` quanto o método `formatToParts`:

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

**Nota:** Embora muito da funcionalidade do `Intl.NumberFormat` possa ser alcançada utilizando `Number.prototype.toLocaleString`, `Intl.NumberFormat` geralmente é a melhor escolha, pois permite criar uma instância de formatador reutilizável que tende a ser [mais eficiente](/blog/v8-release-76#localized-bigint).

Recentemente, a API `Intl.NumberFormat` ganhou algumas novas funcionalidades.

## Suporte a `BigInt`

Além de `Number`s, `Intl.NumberFormat` agora também pode formatar [`BigInt`s](/features/bigint):

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

`Intl.NumberFormat` atualmente suporta as seguintes chamadas _unidades simples_:

- ângulo: `degree`
- área: `acre`, `hectare`
- concentração: `percent`
- digital: `bit`, `byte`, `kilobit`, `kilobyte`, `megabit`, `megabyte`, `gigabit`, `gigabyte`, `terabit`, `terabyte`, `petabyte`
- duração: `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`, `year`
- comprimento: `millimeter`, `centimeter`, `meter`, `kilometer`, `inch`, `foot`, `yard`, `mile`, `mile-scandinavian`
- massa: `gram`,  `kilogram`, `ounce`, `pound`, `stone`
- temperatura: `celsius`, `fahrenheit`
- volume: `liter`, `milliliter`, `gallon`, `fluid-ounce`

Para formatar números com unidades localizadas, use as opções `style` e `unit`:

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

Observe que, ao longo do tempo, mais unidades podem ser adicionadas. Consulte a especificação para [a lista mais atualizada](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers).

As unidades simples acima podem ser combinadas em pares arbitrários de numerador e denominador para expressar unidades compostas, como “litros por acre” ou “metros por segundo”:

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

## Notação compacta, científica e de engenharia

_Notação compacta_ utiliza símbolos específicos do local para representar números grandes. É uma alternativa mais amigável para humanos em relação à notação científica:

```js
{
  // Teste de notação padrão.
  const formatter = new Intl.NumberFormat(&apos;en&apos;, {
    notation: &apos;standard&apos;, // Este é o padrão implícito.
  });
  formatter.format(1234.56);
  // → &apos;1,234.56&apos;
  formatter.format(123456);
  // → &apos;123,456&apos;
  formatter.format(123456789);
  // → &apos;123,456,789&apos;
}

{
  // Teste de notação compacta.
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
**Nota:** Por padrão, a notação compacta arredonda para o número inteiro mais próximo, mas sempre mantém 2 dígitos significativos. Você pode definir qualquer um de `{minimum,maximum}FractionDigits` ou `{minimum,maximum}SignificantDigits` para substituir esse comportamento.
:::

`Intl.NumberFormat` também pode formatar números em [notação científica](https://pt.wikipedia.org/wiki/Notação_científica):

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
  notation: &apos;scientific&apos;,
});
formatter.format(299792458);
// → &apos;2.998E8 m/s&apos;
```

[Notação de engenharia](https://pt.wikipedia.org/wiki/Notação_de_engenharia) também é suportada:

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

## Exibição de sinal

Em certas situações (como apresentar deltas), é útil exibir explicitamente o sinal, mesmo quando o número é positivo. A nova opção `signDisplay` permite isso:

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

Para evitar mostrar o sinal quando o valor for `0`, use `signDisplay: &apos;exceptZero&apos;`:

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
// Nota: -0 ainda exibe um sinal, como esperado:
formatter.format(-0);
// → &apos;-0%&apos;
```

Para moeda, a opção `currencySign` permite o _formato de contabilidade_, que habilita um formato específico de localidade para valores de moeda negativos; por exemplo, envolvendo o valor entre parênteses:

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

## Mais informações

A [proposta da especificação](https://github.com/tc39/proposal-unified-intl-numberformat) relevante tem mais informações e exemplos, incluindo orientações sobre como detectar funcionalidade de cada recurso individual de `Intl.NumberFormat`.
