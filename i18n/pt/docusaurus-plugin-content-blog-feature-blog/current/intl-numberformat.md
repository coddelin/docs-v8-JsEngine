---
title: '`Intl.NumberFormat`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias)) e Shane F. Carr'
avatars:
  - 'mathias-bynens'
  - 'shane-carr'
date: 2019-08-08
tags:
  - Intl
  - io19
description: 'Intl.NumberFormat permite a formatação de números sensível ao local.'
tweet: '1159476407329873920'
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

**Nota:** Embora muito da funcionalidade do `Intl.NumberFormat` possa ser alcançada utilizando `Number.prototype.toLocaleString`, `Intl.NumberFormat` geralmente é a melhor escolha, pois permite criar uma instância de formatador reutilizável que tende a ser [mais eficiente](/blog/v8-release-76#localized-bigint).

Recentemente, a API `Intl.NumberFormat` ganhou algumas novas funcionalidades.

## Suporte a `BigInt`

Além de `Number`s, `Intl.NumberFormat` agora também pode formatar [`BigInt`s](/features/bigint):

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
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'kilobyte',
});
formatter.format(1.234);
// → '1.234 kB'
formatter.format(123.4);
// → '123.4 kB'
```

Observe que, ao longo do tempo, mais unidades podem ser adicionadas. Consulte a especificação para [a lista mais atualizada](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers).

As unidades simples acima podem ser combinadas em pares arbitrários de numerador e denominador para expressar unidades compostas, como “litros por acre” ou “metros por segundo”:

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

## Notação compacta, científica e de engenharia

_Notação compacta_ utiliza símbolos específicos do local para representar números grandes. É uma alternativa mais amigável para humanos em relação à notação científica:

```js
{
  // Teste de notação padrão.
  const formatter = new Intl.NumberFormat('en', {
    notation: 'standard', // Este é o padrão implícito.
  });
  formatter.format(1234.56);
  // → '1,234.56'
  formatter.format(123456);
  // → '123,456'
  formatter.format(123456789);
  // → '123,456,789'
}

{
  // Teste de notação compacta.
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
**Nota:** Por padrão, a notação compacta arredonda para o número inteiro mais próximo, mas sempre mantém 2 dígitos significativos. Você pode definir qualquer um de `{minimum,maximum}FractionDigits` ou `{minimum,maximum}SignificantDigits` para substituir esse comportamento.
:::

`Intl.NumberFormat` também pode formatar números em [notação científica](https://pt.wikipedia.org/wiki/Notação_científica):

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
  notation: 'scientific',
});
formatter.format(299792458);
// → '2.998E8 m/s'
```

[Notação de engenharia](https://pt.wikipedia.org/wiki/Notação_de_engenharia) também é suportada:

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

## Exibição de sinal

Em certas situações (como apresentar deltas), é útil exibir explicitamente o sinal, mesmo quando o número é positivo. A nova opção `signDisplay` permite isso:

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

Para evitar mostrar o sinal quando o valor for `0`, use `signDisplay: 'exceptZero'`:

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
// Nota: -0 ainda exibe um sinal, como esperado:
formatter.format(-0);
// → '-0%'
```

Para moeda, a opção `currencySign` permite o _formato de contabilidade_, que habilita um formato específico de localidade para valores de moeda negativos; por exemplo, envolvendo o valor entre parênteses:

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

## Mais informações

A [proposta da especificação](https://github.com/tc39/proposal-unified-intl-numberformat) relevante tem mais informações e exemplos, incluindo orientações sobre como detectar funcionalidade de cada recurso individual de `Intl.NumberFormat`.
