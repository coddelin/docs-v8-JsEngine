---
title: 'Lançamento V8 v9.9'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), em seus 99%'
avatars:
 - 'ingvar-stepanyan'
date: 2022-01-31
tags:
 - lançamento
description: 'O lançamento do V8 v9.9 traz novas APIs de internacionalização.'
tweet: '1488190967727411210'
---
A cada quatro semanas, criamos um novo branch do V8 como parte de nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é derivada do Git principal do V8 imediatamente antes de um marco Beta do Chrome. Hoje, estamos felizes em anunciar nosso mais novo branch, [V8 versão 9.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.9), que estará em fase beta até seu lançamento em coordenação com o Chrome 99 Stable em algumas semanas. O V8 v9.9 está cheio de novidades voltadas para os desenvolvedores. Este post fornece uma prévia de alguns destaques em antecipação ao lançamento.

<!--truncate-->
## JavaScript

### Extensões Intl.Locale

Na versão 7.4, lançamos a API [`Intl.Locale`](https://v8.dev/blog/v8-release-74#intl.locale). Com a versão 9.9, adicionamos sete novas propriedades ao objeto `Intl.Locale`: `calendars`, `collations`, `hourCycles`, `numberingSystems`, `timeZones`, `textInfo` e `weekInfo`.

As propriedades `calendars`, `collations`, `hourCycles`, `numberingSystems` e `timeZones` de `Intl.Locale` retornam um array de identificadores preferidos comumente usados, projetados para serem usados com outras APIs do `Intl`:

```js
const arabicEgyptLocale = new Intl.Locale('ar-EG')
// ar-EG
arabicEgyptLocale.calendars
// ['gregory', 'coptic', 'islamic', 'islamic-civil', 'islamic-tbla']
arabicEgyptLocale.collations
// ['compat', 'emoji', 'eor']
arabicEgyptLocale.hourCycles
// ['h12']
arabicEgyptLocale.numberingSystems
// ['arab']
arabicEgyptLocale.timeZones
// ['Africa/Cairo']
```

A propriedade `textInfo` de `Intl.Locale` retorna um objeto para especificar informações relacionadas ao texto. Atualmente, ele possui apenas uma propriedade, `direction`, para indicar a direcionalidade padrão do texto no local. Foi projetada para ser usada com o [atributo `dir` do HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir) e [a propriedade `direction` do CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/direction). Ela indica a ordem dos caracteres - `ltr` (esquerda para direita) ou `rtl` (direita para esquerda):

```js
arabicEgyptLocale.textInfo
// { direction: 'rtl' }
japaneseLocale.textInfo
// { direction: 'ltr' }
chineseTaiwanLocale.textInfo
// { direction: 'ltr' }
```

A propriedade `weekInfo` de `Intl.Locale` retorna um objeto para especificar informações relacionadas à semana. A propriedade `firstDay` no objeto retornado é um número, variando de 1 a 7, indicando qual dia da semana é considerado o primeiro dia para fins de calendário. 1 especifica segunda-feira, 2 - terça-feira, 3 - quarta-feira, 4 - quinta-feira, 5 - sexta-feira, 6 - sábado e 7 - domingo. A propriedade `minimalDays` no objeto retornado é o número mínimo de dias necessários na primeira semana de um mês ou ano, para fins de calendário. A propriedade `weekend` no objeto retornado é um array de inteiros, geralmente com dois elementos, codificados da mesma forma que `firstDay`. Ela indica quais dias da semana são considerados como parte do 'fim de semana', para fins de calendário. Note que o número de dias no fim de semana é diferente em cada local e pode não ser contíguo.

```js
arabicEgyptLocale.weekInfo
// {firstDay: 6, weekend: [5, 6], minimalDays: 1}
// Primeiro dia da semana é sábado. O fim de semana é sexta-feira e sábado.
// A primeira semana de um mês ou de um ano é uma semana que tem pelo menos 1
// dia nesse mês ou ano.
```

### Enumeração Intl

Na versão 9.9, adicionamos uma nova função [`Intl.supportedValuesOf(code)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf) que retorna o array de identificadores suportados no V8 para as APIs Intl. Os valores `code` suportados são `calendar`, `collation`, `currency`, `numberingSystem`, `timeZone` e `unit`. As informações neste novo método foram projetadas para permitir que os desenvolvedores web descubram facilmente quais valores são suportados pela implementação.

```js
Intl.supportedValuesOf('calendar')
// ['buddhist', 'chinese', 'coptic', 'dangi', ...]

Intl.supportedValuesOf('collation')
// ['big5han', 'compat', 'dict', 'emoji', ...]

Intl.supportedValuesOf('currency')
// ['ADP', 'AED', 'AFA', 'AFN', 'ALK', 'ALL', 'AMD', ...]

Intl.supportedValuesOf('numberingSystem')
// ['adlm', 'ahom', 'arab', 'arabext', 'bali', ...]

Intl.supportedValuesOf('timeZone')
// ['Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers', ...]

Intl.supportedValuesOf('unit')
// ['acre', 'bit', 'byte', 'celsius', 'centimeter', ...]
```

## API V8

Por favor, use `git log branch-heads/9.8..branch-heads/9.9 include/v8\*.h` para obter uma lista das mudanças na API.
