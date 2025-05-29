---
title: "`Intl.RelativeTimeFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-10-22
tags:
  - Intl
  - Node.js 12
  - io19
description: "Intl.RelativeTimeFormat permite a formatação localizada de tempos relativos sem sacrificar o desempenho."
tweet: "1054387117571354624"
---
Aplicações web modernas frequentemente utilizam frases como “ontem”, “há 42 segundos” ou “em 3 meses” em vez de datas completas e carimbos temporais. Valores _formatados como tempo relativo_ tornaram-se tão comuns que várias bibliotecas populares implementam funções utilitárias que os formatam de maneira localizada. (Exemplos incluem [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize), e [date-fns](https://date-fns.org/docs/).)

<!--truncate-->
Um problema ao implementar um formatador de tempo relativo localizado é que você precisa de uma lista de palavras ou frases usuais (como “ontem” ou “último trimestre”) para cada idioma que deseja suportar. [O Unicode CLDR](http://cldr.unicode.org/) fornece esses dados, mas para usá-los em JavaScript, eles precisam ser incorporados e enviados junto com o código da biblioteca. Isso, infelizmente, aumenta o tamanho do pacote dessas bibliotecas, o que impacta negativamente os tempos de carregamento, o custo de análise/compilação e o consumo de memória.

A nova API `Intl.RelativeTimeFormat` transfere esse ônus para o mecanismo de JavaScript, que pode enviar os dados de localização e torná-los diretamente disponíveis para os desenvolvedores JavaScript. `Intl.RelativeTimeFormat` permite a formatação localizada de tempos relativos sem sacrificar o desempenho.

## Exemplos de uso

O exemplo a seguir mostra como criar um formatador de tempo relativo usando o idioma inglês.

```js
const rtf = new Intl.RelativeTimeFormat('en');

rtf.format(3.14, 'second');
// → 'in 3.14 seconds'

rtf.format(-15, 'minute');
// → '15 minutes ago'

rtf.format(8, 'hour');
// → 'in 8 hours'

rtf.format(-2, 'day');
// → '2 days ago'

rtf.format(3, 'week');
// → 'in 3 weeks'

rtf.format(-5, 'month');
// → '5 months ago'

rtf.format(2, 'quarter');
// → 'in 2 quarters'

rtf.format(-42, 'year');
// → '42 years ago'
```

Observe que o argumento passado para o construtor `Intl.RelativeTimeFormat` pode ser uma cadeia de caracteres contendo [uma tag de idioma BCP 47](https://tools.ietf.org/html/rfc5646) ou [um array dessas tags de idioma](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation).

Aqui está um exemplo de uso de um idioma diferente (espanhol):

```js
const rtf = new Intl.RelativeTimeFormat('es');

rtf.format(3.14, 'second');
// → 'dentro de 3,14 segundos'

rtf.format(-15, 'minute');
// → 'hace 15 minutos'

rtf.format(8, 'hour');
// → 'dentro de 8 horas'

rtf.format(-2, 'day');
// → 'hace 2 días'

rtf.format(3, 'week');
// → 'dentro de 3 semanas'

rtf.format(-5, 'month');
// → 'hace 5 meses'

rtf.format(2, 'quarter');
// → 'dentro de 2 trimestres'

rtf.format(-42, 'year');
// → 'hace 42 años'
```

Além disso, o construtor `Intl.RelativeTimeFormat` aceita um argumento opcional chamado `options`, que fornece controle refinado sobre a saída. Para ilustrar a flexibilidade, vejamos mais saídas em inglês baseadas nas configurações padrão:

```js
// Crie um formatador de tempo relativo para o idioma inglês, usando os
// padrões de configuração (como antes). Neste exemplo, os valores padrão
// são passados explicitamente.
const rtf = new Intl.RelativeTimeFormat('en', {
  localeMatcher: 'best fit', // outros valores: 'lookup'
  style: 'long', // outros valores: 'short' ou 'narrow'
  numeric: 'always', // outros valores: 'auto'
});

// Agora, vejamos alguns casos especiais!

rtf.format(-1, 'day');
// → '1 day ago'

rtf.format(0, 'day');
// → 'in 0 days'

rtf.format(1, 'day');
// → 'in 1 day'

rtf.format(-1, 'week');
// → '1 week ago'

rtf.format(0, 'week');
// → 'in 0 weeks'

rtf.format(1, 'week');
// → 'in 1 week'
```

Você pode ter notado que o formatador acima produziu a string `'1 day ago'` em vez de `'yesterday'`, e o ligeiramente estranho `'in 0 weeks'` em vez de `'this week'`. Isso ocorre porque, por padrão, o formatador utiliza o valor numérico na saída.

Para alterar esse comportamento, configure a opção `numeric` para `'auto'` (em vez do padrão implícito de `'always'`):

```js
// Crie um formatador de tempo relativo para o idioma inglês que não
// precisa usar o valor numérico sempre na saída.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'yesterday'

rtf.format(0, 'day');
// → 'today'

rtf.format(1, 'day');
// → 'tomorrow'

rtf.format(-1, 'week');
// → 'last week'

rtf.format(0, 'week');
// → 'this week'

rtf.format(1, 'week');
// → 'next week'
```

Semelhante a outras classes `Intl`, `Intl.RelativeTimeFormat` tem um método `formatToParts` além do método `format`. Embora o `format` cubra o caso mais comum de uso, `formatToParts` pode ser útil se você precisar acessar as partes individuais da saída gerada:

```js
// Crie um formatador de tempo relativo para o idioma inglês que não
// precisa sempre usar um valor numérico na saída.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'ontem'

rtf.formatToParts(-1, 'day');
// → [{ type: 'literal', value: 'ontem' }]

rtf.format(3, 'week');
// → 'em 3 semanas'

rtf.formatToParts(3, 'week');
// → [{ type: 'literal', value: 'em ' },
//    { type: 'integer', value: '3', unit: 'week' },
//    { type: 'literal', value: ' semanas' }]
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
