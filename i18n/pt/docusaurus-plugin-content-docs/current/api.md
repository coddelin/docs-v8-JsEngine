---
title: "API pública do V8"
description: "Este documento discute a estabilidade da API pública do V8 e como os desenvolvedores podem fazer alterações nela."
---
Este documento discute a estabilidade da API pública do V8 e como os desenvolvedores podem fazer alterações nela.

## Estabilidade da API

Se o V8 em uma versão canário do Chromium acabar sendo problemático e gerar falhas, ele é revertido para a versão anterior do V8. Portanto, é importante manter a compatibilidade da API do V8 de uma versão canário para a próxima.

Executamos continuamente um [bot](https://ci.chromium.org/p/v8/builders/luci.v8.ci/Linux%20V8%20API%20Stability) que sinaliza violações de estabilidade da API. Ele compila o HEAD do Chromium com a [versão canário atual](https://chromium.googlesource.com/v8/v8/+/refs/heads/canary) do V8.

Falhas neste bot atualmente são apenas informativas (FYI) e nenhuma ação é necessária. A lista de culpados pode ser usada para identificar CLs dependentes facilmente em caso de um rollback.

Se você causar uma falha neste bot, lembre-se de aumentar o intervalo entre uma alteração no V8 e uma alteração dependente no Chromium da próxima vez.

## Como alterar a API pública do V8

O V8 é usado por vários incorporadores diferentes: Chrome, Node.js, gjstest, etc. Ao alterar a API pública do V8 (basicamente os arquivos no diretório `include/`), precisamos garantir que os incorporadores possam atualizar suavemente para a nova versão do V8. Em particular, não podemos supor que um incorporador atualize para a nova versão do V8 e ajuste seu código para a nova API em uma única alteração atômica.

O incorporador deve ser capaz de ajustar seu código à nova API enquanto ainda utiliza a versão anterior do V8. Todas as instruções abaixo seguem esta regra.

- Adicionar novos tipos, constantes e funções é seguro com uma ressalva: não adicione uma nova função puramente virtual a uma classe existente. Novas funções virtuais devem ter implementação padrão.
- Adicionar um novo parâmetro a uma função é seguro se o parâmetro tiver um valor padrão.
- Remover ou renomear tipos, constantes e funções é inseguro. Use as macros [`V8_DEPRECATED`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=395&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde) e [`V8_DEPRECATE_SOON`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=403&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde), que causam avisos de tempo de compilação quando os métodos obsoletos são chamados pelo incorporador. Por exemplo, suponha que queremos renomear a função `foo` para a função `bar`. Então precisamos fazer o seguinte:
    - Adicionar a nova função `bar` próxima à função existente `foo`.
    - Esperar até que o CL seja incorporado no Chrome. Ajustar o Chrome para usar `bar`.
    - Anotar `foo` com `V8_DEPRECATED("Use bar em vez disso") void foo();`
    - No mesmo CL, ajustar os testes que utilizam `foo` para usar `bar`.
    - Escrever no CL a motivação para a alteração e instruções gerais para atualização.
    - Esperar até o próximo branch do V8.
    - Remover a função `foo`.

    `V8_DEPRECATE_SOON` é uma versão mais leve de `V8_DEPRECATED`. O Chrome não falhará com ele, então o passo b não é necessário. `V8_DEPRECATE_SOON` não é suficiente para remover a função.

    Ainda é necessário anotar com `V8_DEPRECATED` e esperar pelo próximo branch antes de remover a função.

    `V8_DEPRECATED` pode ser testado usando o flag GN `v8_deprecation_warnings`.
    `V8_DEPRECATE_SOON` pode ser testado usando `v8_imminent_deprecation_warnings`.

- Alterar assinaturas de funções é inseguro. Use as macros `V8_DEPRECATED` e `V8_DEPRECATE_SOON` como descrito acima.

Mantemos um [documento mencionando alterações importantes na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) para cada versão do V8.

Também há uma [documentação da API do doxygen](https://v8.dev/api) atualizada regularmente.
