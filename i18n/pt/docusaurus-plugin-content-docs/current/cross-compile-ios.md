---
title: 'Cross-compilação para iOS'
description: 'Este documento explica como cross-compilar o V8 para iOS.'
---
Esta página serve como uma breve introdução à construção do V8 para alvos iOS.

## Requisitos

- Um computador host macOS (OS X) com Xcode instalado.
- Um dispositivo iOS alvo de 64 bits (dispositivos iOS legados de 32 bits não são suportados).
- V8 v7.5 ou mais recente.
- jitless é um requisito rígido para iOS (a partir de Dez. 2020). Portanto, use as flags '--expose_gc --jitless'

## Configuração inicial

Siga [as instruções para compilar o V8](/docs/build).

Busque ferramentas adicionais necessárias para cross-compilação para iOS adicionando `target_os` no seu arquivo de configuração `.gclient`, localizado no diretório pai do diretório de origem do `v8`:

```python
# [... outros conteúdos de .gclient como a variável 'solutions' ...]
target_os = ['ios']
```

Após atualizar o `.gclient`, execute `gclient sync` para baixar as ferramentas adicionais.

## Compilação manual

Esta seção mostra como compilar uma versão monolítica do V8 para uso em um dispositivo físico iOS ou no simulador iOS do Xcode. O resultado dessa compilação é um arquivo `libv8_monolith.a` que contém todas as bibliotecas do V8, bem como o snapshot do V8.

Configure os arquivos de compilação GN executando `gn args out/release-ios` e inserindo as seguintes chaves:

```python
ios_deployment_target = 10
is_component_build = false
is_debug = false
target_cpu = "arm64"                  # "x64" para uma compilação de simulador.
target_os = "ios"
use_custom_libcxx = false             # Use a libcxx do Xcode.
v8_enable_i18n_support = false        # Produz um binário menor.
v8_monolithic = true                  # Ativa o alvo v8_monolith.
v8_use_external_startup_data = false  # O snapshot está incluído no binário.
v8_enable_pointer_compression = false # Não é suportado no iOS.
```

Agora compile:

```bash
ninja -C out/release-ios v8_monolith
```

Por fim, adicione o arquivo `libv8_monolith.a` gerado ao seu projeto Xcode como uma biblioteca estática. Para mais documentação sobre como integrar o V8 em sua aplicação, veja [Introdução à integração do V8](/docs/embed).
