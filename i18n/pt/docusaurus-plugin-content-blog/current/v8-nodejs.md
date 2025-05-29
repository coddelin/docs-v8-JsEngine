---
title: &apos;V8 ❤️ Node.js&apos;
author: &apos;Franziska Hinkelmann, Node Monkey Patcher&apos;
date: 2016-12-15 13:33:37
tags:
  - Node.js
description: &apos;Este post do blog destaca alguns dos esforços recentes para melhorar o suporte do Node.js no V8 e Chrome DevTools.&apos;
---
A popularidade do Node.js tem crescido constantemente nos últimos anos, e estamos trabalhando para tornar o Node.js melhor. Este post do blog destaca alguns dos esforços recentes no V8 e DevTools.

## Depure Node.js no DevTools

Agora você pode [depurar aplicativos Node usando as ferramentas de desenvolvedor do Chrome](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.knjnbsp6t). A equipe do Chrome DevTools transferiu o código-fonte que implementa o protocolo de depuração do Chromium para o V8, tornando mais fácil para o Node Core manter-se atualizado com as fontes e dependências do depurador. Outros fornecedores de navegadores e IDEs também usam o protocolo de depuração do Chrome, melhorando coletivamente a experiência do desenvolvedor ao trabalhar com Node.

<!--truncate-->
## Melhorias de desempenho do ES2015

Estamos trabalhando arduamente para tornar o V8 mais rápido do que nunca. [Grande parte de nosso trabalho recente em desempenho concentra-se em recursos do ES6](/blog/v8-release-56), incluindo promessas, geradores, destruidores e operadores rest/spread. Como as versões do V8 no Node 6.2 e posteriores possuem suporte total ao ES6, os desenvolvedores Node podem usar novos recursos de linguagem "nativamente", sem polyfills. Isso significa que os desenvolvedores Node são frequentemente os primeiros a se beneficiar das melhorias de desempenho do ES6. Da mesma forma, eles são frequentemente os primeiros a reconhecer regressões de desempenho. Graças à comunidade atenta do Node, descobrimos e corrigimos várias regressões, incluindo problemas de desempenho com [`instanceof`](https://github.com/nodejs/node/issues/9634), [`buffer.length`](https://github.com/nodejs/node/issues/9006), [listas de argumentos longas](https://github.com/nodejs/node/pull/9643) e [`let`/`const`](https://github.com/nodejs/node/issues/9729).

## Correções para o módulo `vm` do Node.js e REPL chegando

O [`módulo vm`](https://nodejs.org/dist/latest-v7.x/docs/api/vm.html) tem [algumas limitações de longa data](https://github.com/nodejs/node/issues/6283). Para resolver essas questões adequadamente, ampliamos a API do V8 para implementar um comportamento mais intuitivo. Estamos felizes em anunciar que as melhorias no módulo vm são um dos projetos que estamos apoiando como mentores no [Outreachy para a Fundação Node](https://nodejs.org/en/foundation/outreachy/). Esperamos ver progresso adicional neste projeto e em outros em breve.

## `async`/`await`

Com funções assíncronas, você pode simplificar drasticamente o código assíncrono reescrevendo o fluxo do programa ao aguardar promessas sequencialmente. `async`/`await` será introduzido no Node [com a próxima atualização do V8](https://github.com/nodejs/node/pull/9618). Nosso trabalho recente em melhorar o desempenho de promessas e geradores ajudou a tornar as funções assíncronas rápidas. Em nota relacionada, também estamos trabalhando para fornecer [hooks de promessa](https://bugs.chromium.org/p/v8/issues/detail?id=4643), um conjunto de APIs de introspecção necessárias para a [API de Async Hook do Node](https://github.com/nodejs/node-eps/pull/18).

## Quer experimentar o Node.js de ponta?

Se você está animado para testar os recursos mais novos do V8 no Node e não se importa em usar software de ponta e instável, pode experimentar nosso branch de integração [aqui](https://github.com/v8/node/tree/vee-eight-lkgr). [O V8 é continuamente integrado ao Node](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Linux64%20-%20node.js%20integration) antes que o V8 chegue ao Node.js, para que possamos identificar problemas cedo. No entanto, aviso: isso é mais experimental do que o Node.js de última geração.
