---
title: "APIs de internacionalização mais rápidas e com mais recursos"
author: "[சத்யா குணசேகரன் (Sathya Gunasekaran)](https://twitter.com/_gsathya)"
date: 2019-04-25 16:45:37
avatars:
  - "sathya-gunasekaran"
tags:
  - ECMAScript
  - Intl
description: "A API de Internacionalização de JavaScript está crescendo, e sua implementação no V8 está ficando mais rápida!"
tweet: "1121424877142122500"
---
[A Especificação da API de Internacionalização ECMAScript](https://tc39.es/ecma402/) (ECMA-402, ou `Intl`) fornece funcionalidades essenciais específicas de localidade, como formatação de datas, formatação de números, seleção de formas plural e colação. As equipes do Chrome V8 e de Internacionalização do Google têm colaborado na adição de recursos à implementação da ECMA-402 no V8, enquanto lidam com dívidas técnicas e melhoram o desempenho e a interoperabilidade com outros navegadores.

<!--truncate-->
## Melhorias arquiteturais subjacentes

Inicialmente, a especificação ECMA-402 foi implementada principalmente em JavaScript usando extensões do V8 e vivia fora do código-base do V8. Usar a API de Extensão externa significava que várias APIs internamente utilizadas pelo V8 para verificação de tipos, gerenciamento do ciclo de vida de objetos C++ externos e armazenamento interno de dados privados não podiam ser usadas. Como parte da melhoria no desempenho de inicialização, essa implementação foi posteriormente movida para o código-base do V8 para permitir a [criação de snapshots](/blog/custom-startup-snapshots) desses builtins.

O V8 utiliza `JSObject`s especializados com [formas personalizadas (classes ocultas)](https://mathiasbynens.be/notes/shapes-ics) para descrever objetos JavaScript embutidos especificados pelo ECMAScript (como `Promise`, `Map`, `Set`, etc). Com essa abordagem, o V8 pode pré-alocar o número necessário de slots internos e gerar acessos rápidos a eles, em vez de aumentar o objeto propriedade por propriedade, o que leva a um desempenho mais lento e pior uso da memória.

A implementação de `Intl` não foi modelada após tal arquitetura, como consequência da divisão histórica. Em vez disso, todos os objetos JavaScript embutidos especificados pela especificação de Internacionalização (como `NumberFormat`, `DateTimeFormat`) eram `JSObject`s genéricos que precisavam passar por várias adições de propriedades para seus slots internos.

Outro artefato de não ter `JSObject`s especializados era que a verificação de tipo agora era mais complexa. As informações do tipo eram armazenadas sob um símbolo privado e verificadas tanto do lado do JS quanto do C++ usando acessos a propriedades caros, em vez de simplesmente procurar pela sua forma.

### Modernização do código-base

Com o movimento atual de afastamento da escrita de builtins auto-hospedados no V8, fez sentido aproveitar essa oportunidade para modernizar a implementação do ECMA402.

### Afastando-se do JS auto-hospedado

Embora o auto-hospedagem leve a um código conciso e legível, o uso frequente de chamadas de runtime lentas para acessar APIs do ICU gerou problemas de desempenho. Como resultado, muitas funcionalidades do ICU foram duplicadas em JavaScript para reduzir o número de chamadas de runtime desse tipo.

Ao reescrever os builtins em C++, tornou-se muito mais rápido acessar as APIs do ICU, pois agora não há sobrecarga de chamadas de runtime.

### Melhorando o ICU

O ICU é um conjunto de bibliotecas C/C++ usadas por um grande número de aplicações, incluindo todos os principais engines de JavaScript, para oferecer suporte a Unicode e globalização. Como parte da mudança do `Intl` para o ICU na implementação do V8, [descobrimos](https://unicode-org.atlassian.net/browse/ICU-20140), [e](https://unicode-org.atlassian.net/browse/ICU-9562) [corrigimos](https://unicode-org.atlassian.net/browse/ICU-20098) vários bugs do ICU.

Como parte da implementação de novas propostas, como [`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat), [`Intl.ListFormat`](/features/intl-listformat) e `Intl.Locale`, ampliamos o ICU adicionando [várias](https://unicode-org.atlassian.net/browse/ICU-13256) [novas](https://unicode-org.atlassian.net/browse/ICU-20121) [APIs](https://unicode-org.atlassian.net/browse/ICU-20342) para suportar essas novas propostas do ECMAScript.

Todas essas adições ajudam outros engines de JavaScript a implementar essas propostas mais rapidamente agora, impulsionando a web adiante! Por exemplo, o desenvolvimento está em progresso no Firefox para implementar várias novas APIs do `Intl` com base no nosso trabalho no ICU.

## Desempenho

Como resultado deste trabalho, melhoramos o desempenho da API de Internacionalização otimizando vários caminhos rápidos e armazenando em cache a inicialização dos diversos objetos `Intl` e os métodos `toLocaleString` em `Number.prototype`, `Date.prototype` e `String.prototype`.

Por exemplo, criar um novo objeto `Intl.NumberFormat` ficou cerca de 24× mais rápido.

![[Microbenchmarks](https://cs.chromium.org/chromium/src/v8/test/js-perf-test/Intl/constructor.js) testando o desempenho da criação de vários objetos `Intl`](/_img/intl/performance.svg)

Observe que, para melhor desempenho, é recomendado criar *e reutilizar* explicitamente um objeto `Intl.NumberFormat` ou `Intl.DateTimeFormat` ou `Intl.Collator`, em vez de chamar métodos como `toLocaleString` ou `localeCompare`.

## Novos recursos do `Intl`

Todo este trabalho proporcionou uma excelente base para construir novos recursos e continuamos a lançar todas as novas propostas de internacionalização que estão no Estágio 3.

[`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) foi lançado no Chrome 71, [`Intl.ListFormat`](/features/intl-listformat) foi lançado no Chrome 72, [`Intl.Locale`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Locale) foi lançado no Chrome 74, e as opções [`dateStyle` e `timeStyle` para `Intl.DateTimeFormat`](https://github.com/tc39/proposal-intl-datetime-style) e [suporte a BigInt para `Intl.DateTimeFormat`](https://github.com/tc39/ecma402/pull/236) estão sendo lançados no Chrome 76. [`Intl.DateTimeFormat#formatRange`](https://github.com/tc39/proposal-intl-DateTimeFormat-formatRange), [`Intl.Segmenter`](https://github.com/tc39/proposal-intl-segmenter/), e [opções adicionais para `Intl.NumberFormat`](https://github.com/tc39/proposal-unified-intl-numberformat/) estão atualmente em desenvolvimento no V8, e esperamos lançá-los em breve!

Muitos desses novos APIs, e outros ainda mais avançados, são resultado do nosso trabalho na padronização de novos recursos para ajudar desenvolvedores com internacionalização. [`Intl.DisplayNames`](https://github.com/tc39/proposal-intl-displaynames) é uma proposta do Estágio 1 que permite aos usuários localizar os nomes de exibição de idiomas, regiões ou scripts. [`Intl.DateTimeFormat#formatRange`](https://github.com/fabalbon/proposal-intl-DateTimeFormat-formatRange) é uma proposta de Estágio 3 que especifica uma maneira de formatar intervalos de datas de forma concisa e sensível ao idioma. [A proposta unificada do API `Intl.NumberFormat`](https://github.com/tc39/proposal-unified-intl-numberformat) é uma proposta de Estágio 3 que aprimora o `Intl.NumberFormat` adicionando suporte para unidades de medida, moeda e políticas de exibição de sinais, além de notação científica e compacta. Você também pode se envolver no futuro do ECMA-402, contribuindo em [seu repositório no GitHub](https://github.com/tc39/ecma402).

## Conclusão

`Intl` fornece uma API rica em recursos para várias operações necessárias na internacionalização de seu aplicativo web, deixando o trabalho pesado para o navegador, sem precisar enviar tantos dados ou código via rede. Pensar no uso adequado dessas APIs pode fazer com que sua interface funcione melhor em diferentes locais. Graças ao trabalho das equipes do Google V8 e i18n em colaboração com a TC39 e seu subgrupo ECMA-402, agora você pode acessar mais funcionalidades com melhor desempenho e esperar mais melhorias ao longo do tempo.
