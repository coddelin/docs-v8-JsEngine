---
title: "Construindo o V8 a partir do código-fonte"
description: "Este documento explica como compilar o V8 a partir do código-fonte."
---
Para conseguir compilar o V8 do zero em Windows/Linux/macOS para x64, siga os passos abaixo.

## Obtendo o código-fonte do V8

Siga as instruções em nosso guia sobre [como obter o código-fonte do V8](/docs/source-code).

## Instalando dependências de compilação

1. Para macOS: instale o Xcode e aceite o contrato de licenciamento. (Se você instalou as ferramentas de linha de comando separadamente, [remova-as primeiro](https://bugs.chromium.org/p/chromium/issues/detail?id=729990#c1).)

1. Certifique-se de que está no diretório do código-fonte do V8. Se você seguiu todos os passos da seção anterior, já está no local correto.

1. Baixe todas as dependências de compilação:

   ```bash
   gclient sync
   ```

   Para Googlers - Se você vir erros como Failed to fetch file ou Login required ao executar os hooks, tente autenticar-se no Google Storage primeiro executando:

   ```bash
   gsutil.py config
   ```

   Faça login com sua conta @google.com e digite `0` quando solicitado por um ID de projeto.

1. Este passo é necessário apenas no Linux. Instale dependências adicionais de compilação:

    ```bash
    ./build/install-build-deps.sh
    ```

## Compilando o V8

1. Certifique-se de que está no diretório do código-fonte do V8 no branch `main`.

    ```bash
    cd /path/to/v8
    ```

1. Integre as mudanças mais recentes e instale quaisquer novas dependências de compilação:

    ```bash
    git pull && gclient sync
    ```

1. Compile o código-fonte:

    ```bash
    tools/dev/gm.py x64.release
    ```

    Ou, para compilar o código-fonte e imediatamente executar os testes:

    ```bash
    tools/dev/gm.py x64.release.check
    ```

    Para mais informações sobre o script auxiliar `gm.py` e os comandos que ele dispara, veja [Compilando com GN](/docs/build-gn).
