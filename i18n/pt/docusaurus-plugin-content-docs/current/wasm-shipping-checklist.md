---
title: 'Lista de verificação para preparação e envio de funcionalidades do WebAssembly'
description: 'Este documento fornece listas de verificação dos requisitos de engenharia para determinar quando preparar e enviar uma funcionalidade do WebAssembly no V8.'
---
Este documento fornece listas de verificação dos requisitos de engenharia para preparação e envio de funcionalidades do WebAssembly no V8. Essas listas de verificação são destinadas como um guia e podem não ser aplicáveis a todas as funcionalidades. O processo real de lançamento está descrito em [Processo de lançamento do V8](https://v8.dev/docs/feature-launch-process).

# Preparação

## Quando preparar uma funcionalidade do WebAssembly

A [preparação](https://docs.google.com/document/d/1ZgyNx7iLtRByBtbYi1GssWGefXXciLeADZBR_FxG-hE) de uma funcionalidade do WebAssembly define o fim da sua fase de implementação. A fase de implementação está concluída quando a seguinte lista de verificação estiver concluída:

- A implementação no V8 está completa. Isso inclui:
    - Implementação no TurboFan (se aplicável)
    - Implementação no Liftoff (se aplicável)
    - Implementação no interpretador (se aplicável)
- Testes no V8 estão disponíveis
- Testes da especificação são incorporados ao V8 executando [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh)
- Todos os testes existentes da especificação da proposta são aprovados. Testes de especificação ausentes são indesejáveis, mas não devem bloquear a preparação.

Observe que o estágio da proposta da funcionalidade no processo de padronização não importa para a preparação da funcionalidade no V8. No entanto, a proposta deve estar, majoritariamente, estável.

## Como preparar uma funcionalidade do WebAssembly

- Em [`src/wasm/wasm-feature-flags.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-feature-flags.h), mova a flag da funcionalidade da lista de macros `FOREACH_WASM_EXPERIMENTAL_FEATURE_FLAG` para a lista de macros `FOREACH_WASM_STAGING_FEATURE_FLAG`.
- Em [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh), adicione o nome do repositório da proposta à lista `repos` de repositórios.
- Execute [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh) para criar e fazer o upload dos testes da especificação da nova proposta.
- Em [`test/wasm-spec-tests/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-spec-tests/testcfg.py), adicione o nome do repositório da proposta e a flag da funcionalidade à lista `proposal_flags`.
- Em [`test/wasm-js/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-js/testcfg.py), adicione o nome do repositório da proposta e a flag da funcionalidade à lista `proposal_flags`.

Veja a [preparação da reflexão de tipos](https://crrev.com/c/1771791) como referência.

# Envio

## Quando uma funcionalidade do WebAssembly está pronta para ser enviada

- O [Processo de lançamento do V8](https://v8.dev/docs/feature-launch-process) está satisfeito.
- A implementação está coberta por um fuzzer (se aplicável).
- A funcionalidade foi preparada por várias semanas para obter cobertura do fuzzer.
- A proposta da funcionalidade está no [estágio 4](https://github.com/WebAssembly/proposals).
- Todos os [testes da especificação](https://github.com/WebAssembly/spec/tree/master/test) são aprovados.
- A [lista de verificação do Chromium DevTools para novas funcionalidades do WebAssembly](https://docs.google.com/document/d/1WbL-fGuLbbNr5-n_nRGo_ILqZFnh5ZjRSUcDTT3yI8s/preview) está satisfeita.

## Como enviar uma funcionalidade do WebAssembly

- Em [`src/wasm/wasm-feature-flags.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/wasm/wasm-feature-flags.h), mova a flag da funcionalidade da lista de macros `FOREACH_WASM_STAGING_FEATURE_FLAG` para a lista de macros `FOREACH_WASM_SHIPPED_FEATURE_FLAG`.
    - Certifique-se de adicionar um bot do blink CQ no CL para verificar falhas nos [testes da web do blink](https://v8.dev/docs/blink-layout-tests) causadas pela habilitação da funcionalidade (adicione esta linha no rodapé da descrição do CL: `Cq-Include-Trybots: luci.v8.try:v8_linux_blink_rel`).
- Adicionalmente, habilite a funcionalidade por padrão ao alterar o terceiro parâmetro em `FOREACH_WASM_SHIPPED_FEATURE_FLAG` para `true`.
- Defina um lembrete para remover a flag da funcionalidade após dois marcos.
