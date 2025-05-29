---
title: &apos;`Intl.RelativeTimeFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-10-22
tags:
  - Intl
  - Node.js 12
  - io19
description: &apos;Intl.RelativeTimeFormat permite a formatação localizada de tempos relativos sem sacrificar o desempenho.&apos;
tweet: &apos;1054387117571354624&apos;
---
Aplicações web modernas frequentemente utilizam frases como “ontem”, “há 42 segundos” ou “em 3 meses” em vez de datas completas e carimbos temporais. Valores _formatados como tempo relativo_ tornaram-se tão comuns que várias bibliotecas populares implementam funções utilitárias que os formatam de maneira localizada. (Exemplos incluem [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize), e [date-fns](https://date-fns.org/docs/).)

<!--truncate-->
Um problema ao implementar um formatador de tempo relativo localizado é que você precisa de uma lista de palavras ou frases usuais (como “ontem” ou “último trimestre”) para cada idioma que deseja suportar. [O Unicode CLDR](http://cldr.unicode.org/) fornece esses dados, mas para usá-los em JavaScript, eles precisam ser incorporados e enviados junto com o código da biblioteca. Isso, infelizmente, aumenta o tamanho do pacote dessas bibliotecas, o que impacta negativamente os tempos de carregamento, o custo de análise/compilação e o consumo de memória.

A nova API `Intl.RelativeTimeFormat` transfere esse ônus para o mecanismo de JavaScript, que pode enviar os dados de localização e torná-los diretamente disponíveis para os desenvolvedores JavaScript. `Intl.RelativeTimeFormat` permite a formatação localizada de tempos relativos sem sacrificar o desempenho.

## Exemplos de uso

O exemplo a seguir mostra como criar um formatador de tempo relativo usando o idioma inglês.

```js
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;);

rtf.format(3.14, &apos;second&apos;);
// → &apos;in 3.14 seconds&apos;

rtf.format(-15, &apos;minute&apos;);
// → &apos;15 minutes ago&apos;

rtf.format(8, &apos;hour&apos;);
// → &apos;in 8 hours&apos;

rtf.format(-2, &apos;day&apos;);
// → &apos;2 days ago&apos;

rtf.format(3, &apos;week&apos;);
// → &apos;in 3 weeks&apos;

rtf.format(-5, &apos;month&apos;);
// → &apos;5 months ago&apos;

rtf.format(2, &apos;quarter&apos;);
// → &apos;in 2 quarters&apos;

rtf.format(-42, &apos;year&apos;);
// → &apos;42 years ago&apos;
```

Observe que o argumento passado para o construtor `Intl.RelativeTimeFormat` pode ser uma cadeia de caracteres contendo [uma tag de idioma BCP 47](https://tools.ietf.org/html/rfc5646) ou [um array dessas tags de idioma](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation).

Aqui está um exemplo de uso de um idioma diferente (espanhol):

```js
const rtf = new Intl.RelativeTimeFormat(&apos;es&apos;);

rtf.format(3.14, &apos;second&apos;);
// → &apos;dentro de 3,14 segundos&apos;

rtf.format(-15, &apos;minute&apos;);
// → &apos;hace 15 minutos&apos;

rtf.format(8, &apos;hour&apos;);
// → &apos;dentro de 8 horas&apos;

rtf.format(-2, &apos;day&apos;);
// → &apos;hace 2 días&apos;

rtf.format(3, &apos;week&apos;);
// → &apos;dentro de 3 semanas&apos;

rtf.format(-5, &apos;month&apos;);
// → &apos;hace 5 meses&apos;

rtf.format(2, &apos;quarter&apos;);
// → &apos;dentro de 2 trimestres&apos;

rtf.format(-42, &apos;year&apos;);
// → &apos;hace 42 años&apos;
```

Além disso, o construtor `Intl.RelativeTimeFormat` aceita um argumento opcional chamado `options`, que fornece controle refinado sobre a saída. Para ilustrar a flexibilidade, vejamos mais saídas em inglês baseadas nas configurações padrão:

```js
// Crie um formatador de tempo relativo para o idioma inglês, usando os
// padrões de configuração (como antes). Neste exemplo, os valores padrão
// são passados explicitamente.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, {
  localeMatcher: &apos;best fit&apos;, // outros valores: &apos;lookup&apos;
  style: &apos;long&apos;, // outros valores: &apos;short&apos; ou &apos;narrow&apos;
  numeric: &apos;always&apos;, // outros valores: &apos;auto&apos;
});

// Agora, vejamos alguns casos especiais!

rtf.format(-1, &apos;day&apos;);
// → &apos;1 day ago&apos;

rtf.format(0, &apos;day&apos;);
// → &apos;in 0 days&apos;

rtf.format(1, &apos;day&apos;);
// → &apos;in 1 day&apos;

rtf.format(-1, &apos;week&apos;);
// → &apos;1 week ago&apos;

rtf.format(0, &apos;week&apos;);
// → &apos;in 0 weeks&apos;

rtf.format(1, &apos;week&apos;);
// → &apos;in 1 week&apos;
```

Você pode ter notado que o formatador acima produziu a string `&apos;1 day ago&apos;` em vez de `&apos;yesterday&apos;`, e o ligeiramente estranho `&apos;in 0 weeks&apos;` em vez de `&apos;this week&apos;`. Isso ocorre porque, por padrão, o formatador utiliza o valor numérico na saída.

Para alterar esse comportamento, configure a opção `numeric` para `&apos;auto&apos;` (em vez do padrão implícito de `&apos;always&apos;`):

```js
// Crie um formatador de tempo relativo para o idioma inglês que não
// precisa usar o valor numérico sempre na saída.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;yesterday&apos;

rtf.format(0, &apos;day&apos;);
// → &apos;today&apos;

rtf.format(1, &apos;day&apos;);
// → &apos;tomorrow&apos;

rtf.format(-1, &apos;week&apos;);
// → &apos;last week&apos;

rtf.format(0, &apos;week&apos;);
// → &apos;this week&apos;

rtf.format(1, &apos;week&apos;);
// → &apos;next week&apos;
```

Semelhante a outras classes `Intl`, `Intl.RelativeTimeFormat` tem um método `formatToParts` além do método `format`. Embora o `format` cubra o caso mais comum de uso, `formatToParts` pode ser útil se você precisar acessar as partes individuais da saída gerada:

```js
// Crie um formatador de tempo relativo para o idioma inglês que não
// precisa sempre usar um valor numérico na saída.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;ontem&apos;

rtf.formatToParts(-1, &apos;day&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;ontem&apos; }]

rtf.format(3, &apos;week&apos;);
// → &apos;em 3 semanas&apos;

rtf.formatToParts(3, &apos;week&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;em &apos; },
//    { type: &apos;integer&apos;, value: &apos;3&apos;, unit: &apos;week&apos; },
//    { type: &apos;literal&apos;, value: &apos; semanas&apos; }]
```

Para mais informações sobre as opções restantes e seus comportamentos, veja [a documentação da API no repositório da proposta](https://github.com/tc39/proposal-intl-relative-time#api).

## Conclusão

`Intl.RelativeTimeFormat` está disponível por padrão no V8 v7.1 e Chrome 71. À medida que essa API se torna mais amplamente disponível, você encontrará bibliotecas como [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize), e [date-fns](https://date-fns.org/docs/) abandonando sua dependência em bancos de dados CLDR codificados, em favor da funcionalidade nativa de formatação de tempo relativo, melhorando assim o desempenho no tempo de carregamento, no tempo de análise e compilação, no tempo de execução e no uso de memória.

## Suporte a `Intl.RelativeTimeFormat`

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="não"></feature-support>
