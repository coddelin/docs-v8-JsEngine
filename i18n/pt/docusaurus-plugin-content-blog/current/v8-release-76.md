---
title: 'Lançamento V8 v7.6'
author: 'Adam Klein'
avatars:
  - 'adam-klein'
date: 2019-06-19 16:45:00
tags:
  - release
description: 'V8 v7.6 apresenta Promise.allSettled, JSON.parse mais rápido, BigInts localizados, arrays congelados/selados mais rápidos e muito mais!'
tweet: '1141356209179516930'
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é criada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos felizes por anunciar nosso mais novo branch, [V8 versão 7.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.6), que está em beta até seu lançamento em coordenação com o Chrome 76 Stable em algumas semanas. O V8 v7.6 está recheado de todos os tipos de recursos voltados para desenvolvedores. Este post fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Desempenho (tamanho e velocidade)

### Melhorias no `JSON.parse`

Em aplicações JavaScript modernas, JSON é comumente usado como formato para comunicar dados estruturados. Ao acelerar a análise de JSON, podemos reduzir a latência dessa comunicação. No V8 v7.6, reformulamos nosso analisador JSON para ser muito mais rápido na leitura e análise de JSON. Isso resulta em uma análise até 2,7× mais rápida dos dados servidos por páginas da web populares.

![Gráfico mostrando melhorias no desempenho de `JSON.parse` em uma variedade de sites](/_img/v8-release-76/json-parsing.svg)

Até o V8 v7.5, o analisador JSON era recursivo e usava espaço de pilha nativo relativo à profundidade de aninhamento dos dados JSON recebidos. Isso significava que poderíamos ficar sem pilha para dados JSON muito profundamente aninhados. O V8 v7.6 muda para um analisador iterativo que administra sua própria pilha, limitada apenas pela memória disponível.

O novo analisador JSON também é mais eficiente em termos de memória. Ao armazenar as propriedades em buffer antes de criar o objeto final, agora podemos decidir como alocar o resultado de maneira otimizada. Para objetos com propriedades nomeadas, alocamos os objetos com a quantidade exata de espaço necessário para as propriedades nomeadas nos dados JSON recebidos (até 128 propriedades nomeadas). No caso de objetos JSON que contêm nomes de propriedades indexadas, alocamos um armazenamento de suporte de elementos que usa a menor quantidade de espaço; ou uma matriz plana ou um dicionário. Arrays de JSON agora são analisados para uma matriz que se ajusta exatamente ao número de elementos nos dados de entrada.

### Melhorias em arrays congelados/selados

O desempenho de chamadas em arrays congelados ou selados (e objetos semelhantes a array) recebeu várias melhorias. O V8 v7.6 melhora os seguintes padrões de codificação JavaScript, onde `frozen` é um array congelado ou selado ou um objeto semelhante a array:

- `frozen.indexOf(v)`
- `frozen.includes(v)`
- chamadas com espalhamento, como `fn(...frozen)`
- chamadas com espalhamento de matriz aninhada, como `fn(...[...frozen])`
- chamadas apply com espalhamento de matriz, como `fn.apply(this, [...frozen])`

O gráfico abaixo mostra as melhorias.

![Gráfico mostrando melhorias de desempenho em uma variedade de operações de array](/_img/v8-release-76/frozen-sealed-elements.svg)

[Veja o documento de design “elementos congelados e selados rápidos no V8”](https://bit.ly/fast-frozen-sealed-elements-in-v8) para mais detalhes.

### Manipulação de strings Unicode

Uma otimização ao [converter strings para Unicode](https://chromium.googlesource.com/v8/v8/+/734c1456d942a03d79aab4b3b0e57afbc803ceea) resultou em uma aceleração significativa para chamadas como `String#localeCompare`, `String#normalize`, e algumas APIs do `Intl`. Por exemplo, essa mudança resultou em cerca de 2× a taxa de transferência bruta de `String#localeCompare` para strings de um byte.

## Recursos da linguagem JavaScript

### `Promise.allSettled`

[`Promise.allSettled(promises)`](/features/promise-combinators#promise.allsettled) fornece um sinal quando todas as promessas de entrada estão _resolvidas_, o que significa que elas estão _cumpridas_ ou _rejeitadas_. Isso é útil em casos onde você não se importa com o estado da promessa, apenas quer saber quando o trabalho foi concluído, independentemente de ter sido bem-sucedido ou não. [Nosso explicador sobre combinadores de promessas](/features/promise-combinators) tem mais detalhes e inclui um exemplo.

### Suporte aprimorado a `BigInt`

[`BigInt`](/features/bigint) agora tem melhor suporte de API na linguagem. Você pode agora formatar um `BigInt` de maneira consciente de local ao usar o método `toLocaleString`. Isso funciona da mesma forma que para números normais:

```js
12345678901234567890n.toLocaleString('pt'); // 🐌
// → '12.345.678.901.234.567.890'
12345678901234567890n.toLocaleString('de'); // 🐌
// → '12.345.678.901.234.567.890'
```

Se você planeja formatar vários números ou `BigInts` usando o mesmo local, é mais eficiente usar a API `Intl.NumberFormat`, que agora oferece suporte a `BigInts` em seus métodos `format` e `formatToParts`. Desta forma, você pode criar uma instância de formatador reutilizável única.

```js
const nf = new Intl.NumberFormat('fr');
nf.format(12345678901234567890n); // 🚀
// → &apos;12 345 678 901 234 567 890&apos;
nf.formatToParts(123456n); // 🚀
// → [
// →   { type: &apos;integer&apos;, value: &apos;123&apos; },
// →   { type: &apos;group&apos;, value: &apos; &apos; },
// →   { type: &apos;integer&apos;, value: &apos;456&apos; }
// → ]
```

### Aprimoramentos de `Intl.DateTimeFormat`

Aplicativos geralmente exibem intervalos ou períodos de datas para mostrar o espaço de tempo de um evento, como uma reserva de hotel, o período de cobrança de um serviço ou um festival de música. A API `Intl.DateTimeFormat` agora suporta os métodos `formatRange` e `formatRangeToParts` para formatar intervalos de datas de forma conveniente e específica para cada localidade.

```js
const start = new Date(&apos;2019-05-07T09:20:00&apos;);
// → &apos;7 de maio de 2019&apos;
const end = new Date(&apos;2019-05-09T16:00:00&apos;);
// → &apos;9 de maio de 2019&apos;
const fmt = new Intl.DateTimeFormat(&apos;en&apos;, {
  year: &apos;numeric&apos;,
  month: &apos;long&apos;,
  day: &apos;numeric&apos;,
});
const output = fmt.formatRange(start, end);
// → &apos;7–9 de maio de 2019&apos;
const parts = fmt.formatRangeToParts(start, end);
// → [
// →   { &apos;type&apos;: &apos;month&apos;,   &apos;value&apos;: &apos;maio&apos;,  &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;literal&apos;, &apos;value&apos;: &apos; &apos;,    &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;day&apos;,     &apos;value&apos;: &apos;7&apos;,    &apos;source&apos;: &apos;startRange&apos; },
// →   { &apos;type&apos;: &apos;literal&apos;, &apos;value&apos;: &apos; – &apos;,  &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;day&apos;,     &apos;value&apos;: &apos;9&apos;,    &apos;source&apos;: &apos;endRange&apos; },
// →   { &apos;type&apos;: &apos;literal&apos;, &apos;value&apos;: &apos;, &apos;,   &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;year&apos;,    &apos;value&apos;: &apos;2019&apos;, &apos;source&apos;: &apos;shared&apos; },
// → ]
```

Além disso, os métodos `format`, `formatToParts` e `formatRangeToParts` agora suportam as novas opções `timeStyle` e `dateStyle`:

```js
const dtf = new Intl.DateTimeFormat(&apos;de&apos;, {
  timeStyle: &apos;medium&apos;,
  dateStyle: &apos;short&apos;
});
dtf.format(Date.now());
// → &apos;19.06.19, 13:33:37&apos;
```

## Passagem nativa pela pilha de chamadas

Embora o V8 possa percorrer sua própria pilha de chamadas (por exemplo, durante depuração ou profilagem no DevTools), o sistema operacional Windows não podia percorrer uma pilha de chamadas que contém código gerado por TurboFan ao executar na arquitetura x64. Isso poderia causar _pilhas quebradas_ ao usar depuradores nativos ou amostragem ETW para analisar processos que usam V8. Uma alteração recente permite que o V8 [registre os metadados necessários](https://chromium.googlesource.com/v8/v8/+/3cda21de77d098a612eadf44d504b188a599c5f0) para que o Windows possa percorrer essas pilhas no x64, e na versão 7.6 isso está ativado por padrão.

## API do V8

Use `git log branch-heads/7.5..branch-heads/7.6 include/v8.h` para obter uma lista das alterações na API.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 7.6 -t branch-heads/7.6` para experimentar os novos recursos no V8 v7.6. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos em breve.
