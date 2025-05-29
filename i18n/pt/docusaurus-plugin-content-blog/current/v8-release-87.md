---
title: "Lançamento do V8 v8.7"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), um porta-voz do V8"
avatars:
 - "ingvar-stepanyan"
date: 2020-10-23
tags:
 - lançamento
description: "O lançamento do V8 v8.7 traz uma nova API para chamadas nativas, Atomics.waitAsync, correções de bugs e melhorias de desempenho."
tweet: "1319654229863182338"
---
A cada seis semanas, criamos uma nova ramificação do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é derivada do Git master do V8 imediatamente antes de um marco do Chrome Beta. Hoje, estamos satisfeitos em anunciar nossa mais nova ramificação, [V8 versão 8.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.7), que está em versão beta até seu lançamento em coordenação com o Chrome 87 Stable em algumas semanas. O V8 v8.7 está repleto de novidades úteis para desenvolvedores. Este post oferece um preview de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## JavaScript

### Chamadas JS rápidas e não seguras

O V8 v8.7 vem com uma API aprimorada para fazer chamadas nativas de JavaScript.

O recurso ainda é experimental e pode ser ativado através da flag `--turbo-fast-api-calls` no V8 ou a flag correspondente `--enable-unsafe-fast-js-calls` no Chrome. Ele foi projetado para melhorar o desempenho de algumas APIs gráficas nativas no Chrome, mas também pode ser usado por outros embutidores. Ele fornece novos meios para os desenvolvedores criarem instâncias de `v8::FunctionTemplate`, conforme documentado neste [arquivo de cabeçalho](https://source.chromium.org/chromium/chromium/src/+/master:v8/include/v8-fast-api-calls.h). As funções criadas usando a API original permanecerão inalteradas.

Para mais informações e uma lista de recursos disponíveis, consulte [esta explicação](https://docs.google.com/document/d/1nK6oW11arlRb7AA76lJqrBIygqjgdc92aXUPYecc9dU/edit?usp=sharing).

### `Atomics.waitAsync`

[`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md) está agora disponível no V8 v8.7.

[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) e [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) são primitivos de sincronização de baixo nível úteis para implementar mutexes e outros meios de sincronização. No entanto, como `Atomics.wait` é bloqueante, não é possível chamá-lo na thread principal (tentar fazer isso lançará um TypeError). A versão não bloqueante, [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md), também pode ser usada na thread principal.

Consulte [nossa explicação sobre as APIs de `Atomics`](https://v8.dev/features/atomics) para mais detalhes.

## API V8

Use `git log branch-heads/8.6..branch-heads/8.7 include/v8.h` para obter uma lista das alterações da API.

Os desenvolvedores com um checkout ativo do V8 podem usar `git checkout -b 8.7 -t branch-heads/8.7` para experimentar os novos recursos no V8 v8.7. Alternativamente, você pode [se inscrever no canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
