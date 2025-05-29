---
title: &apos;Lançamento do V8 v6.4&apos;
author: &apos;a equipe do V8&apos;
date: 2017-12-19 13:33:37
tags:
  - lançamento
description: &apos;O V8 v6.4 inclui melhorias de desempenho, novos recursos da linguagem JavaScript e muito mais.&apos;
tweet: &apos;943057597481082880&apos;
---
A cada seis semanas, criamos uma nova ramificação do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é ramificada a partir do Git master do V8 imediatamente antes de uma milestone Beta do Chrome. Hoje temos o prazer de anunciar nossa mais nova ramificação, [V8 versão 6.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.4), que está na fase beta até seu lançamento em coordenação com o Chrome 64 Stable nas próximas semanas. O V8 v6.4 está repleto de novidades voltadas para desenvolvedores. Este post fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Desempenho

O V8 v6.4 [melhora](https://bugs.chromium.org/p/v8/issues/detail?id=6971) o desempenho do operador `instanceof` em 3,6×. Como resultado direto, o [uglify-js](http://lisperator.net/uglifyjs/) agora é 15–20% mais rápido de acordo com o [Web Tooling Benchmark do V8](https://github.com/v8/web-tooling-benchmark).

Esta versão também aborda alguns gargalos de desempenho em `Function.prototype.bind`. Por exemplo, o TurboFan agora [inlinha consistentemente](https://bugs.chromium.org/p/v8/issues/detail?id=6946) todas as chamadas monomórficas para `bind`. Além disso, o TurboFan também suporta o _padrão de callback vinculado_, o que significa que, em vez do seguinte:

```js
doSomething(callback, someObj);
```

Agora você pode usar:

```js
doSomething(callback.bind(someObj));
```

Dessa forma, o código é mais legível e você ainda obtém o mesmo desempenho.

Graças às últimas contribuições de [Peter Wong](https://twitter.com/peterwmwong), [`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) e [`WeakSet`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet) agora são implementados usando o [CodeStubAssembler](/blog/csa), resultando em melhorias de desempenho de até 5× em geral.

![](/_img/v8-release-64/weak-collection.svg)

Como parte do [esforço contínuo](https://bugs.chromium.org/p/v8/issues/detail?id=1956) do V8 para melhorar o desempenho de métodos embutidos em arrays, aprimoramos o desempenho de `Array.prototype.slice` ~4× ao reimplementá-lo usando o CodeStubAssembler. Além disso, as chamadas para `Array.prototype.map` e `Array.prototype.filter` agora são inlinhadas em muitos casos, conferindo-lhes um perfil de desempenho competitivo com versões escritas manualmente.

Trabalhamos para que as leituras fora dos limites em arrays, typed arrays e strings [não incorram mais em uma penalidade de desempenho de ~10×](https://bugs.chromium.org/p/v8/issues/detail?id=7027) após notar [esse padrão de codificação](/blog/elements-kinds#avoid-reading-beyond-length) sendo utilizado na prática.

## Memória

Os objetos de código embutidos e manipuladores de bytecode do V8 agora são desserializados de forma preguiçosa a partir do snapshot, o que pode reduzir significativamente a memória consumida por cada Isolated. Testes no Chrome mostram economias de várias centenas de KB por guia ao navegar em sites comuns.

![](/_img/v8-release-64/codespace-consumption.svg)

Fique atento a um post dedicado a este assunto no início do próximo ano.

## Recursos da linguagem ECMAScript

Esta versão do V8 inclui suporte para dois novos recursos interessantes de expressões regulares.

Em expressões regulares com a flag `/u`, [escapes de propriedades Unicode](https://mathiasbynens.be/notes/es-unicode-property-escapes) agora estão ativados por padrão.

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test(&apos;π&apos;);
// → true
```

O suporte para [grupos de captura nomeados](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features#named_captures) em expressões regulares agora está ativado por padrão.

```js
const pattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u;
const result = pattern.exec(&apos;2017-12-15&apos;);
// result.groups.year === &apos;2017&apos;
// result.groups.month === &apos;12&apos;
// result.groups.day === &apos;15&apos;
```

Mais detalhes sobre esses recursos estão disponíveis em nosso post intitulado [Próximos recursos de expressões regulares](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features).

Graças ao [Groupon](https://twitter.com/GrouponEng), o V8 agora implementa [`import.meta`](https://github.com/tc39/proposal-import-meta), o que permite que os incorporadores exponham metadados específicos do host sobre o módulo atual. Por exemplo, o Chrome 64 expõe o URL do módulo via `import.meta.url`, e o Chrome planeja adicionar mais propriedades a `import.meta` no futuro.

Para auxiliar na formatação localmente ciente de strings produzidas por formatadores de internacionalização, os desenvolvedores agora podem usar [`Intl.NumberFormat.prototype.formatToParts()`](https://github.com/tc39/proposal-intl-formatToParts) para formatar um número em uma lista de tokens e seus tipos. Obrigado à [Igalia](https://twitter.com/igalia) por implementar isso no V8!

## API do V8

Por favor, use `git log branch-heads/6.3..branch-heads/6.4 include/v8.h` para obter uma lista das mudanças na API.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 6.4 -t branch-heads/6.4` para experimentar os novos recursos no V8 v6.4. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos você mesmo em breve.
