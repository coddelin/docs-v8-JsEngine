---
title: 'Construindo o V8 com GN'
description: 'Este documento explica como usar o GN para compilar o V8.'
---
O V8 é construído com a ajuda do [GN](https://gn.googlesource.com/gn/+/master/docs/). GN é um tipo de sistema de construção meta, pois gera arquivos de construção para vários outros sistemas de construção. Portanto, como você constrói depende do sistema de construção e do compilador que está usando.
As instruções abaixo assumem que você já tem um [checkout do V8](/docs/source-code) e que você [instalou as dependências de construção](/docs/build).

Mais informações sobre o GN podem ser encontradas na [documentação do Chromium](https://www.chromium.org/developers/gn-build-configuration) ou na [documentação própria do GN](https://gn.googlesource.com/gn/+/master/docs/).

Construir o V8 a partir do código-fonte envolve três etapas:

1. gerar arquivos de construção
2. compilar
3. executar testes

Existem dois fluxos de trabalho para construir o V8:

- o fluxo de trabalho conveniente usando um script auxiliar chamado `gm` que combina as três etapas de forma elegante
- o fluxo de trabalho bruto, onde você executa comandos separados manualmente para cada etapa

## Construindo o V8 usando `gm` (o fluxo de trabalho conveniente)

`gm` é um script conveniente tudo-em-um que gera arquivos de construção, inicia a construção e, opcionalmente, também executa os testes. Ele pode ser encontrado em `tools/dev/gm.py` no seu checkout do V8. Recomendamos adicionar um alias à sua configuração de shell:

```bash
alias gm=/path/to/v8/tools/dev/gm.py
```

Você pode então usar `gm` para construir o V8 para configurações conhecidas, como `x64.release`:

```bash
gm x64.release
```

Para executar os testes logo após a construção, execute:

```bash
gm x64.release.check
```

`gm` exibe todos os comandos que está executando, facilitando o rastreamento e a reexecução deles, se necessário.

`gm` permite construir os binários necessários e executar testes específicos com um único comando:

```bash
gm x64.debug mjsunit/foo cctest/test-bar/*
```

## Construindo o V8: o fluxo de trabalho bruto e manual

### Etapa 1: gerar arquivos de construção

Existem várias maneiras de gerar os arquivos de construção:

1. O fluxo de trabalho bruto e manual envolve o uso direto do `gn`.
2. Um script auxiliar chamado `v8gen` simplifica o processo para configurações comuns.

#### Gerando arquivos de construção usando `gn`

Gere arquivos de construção para o diretório `out/foo` usando `gn`:

```bash
gn args out/foo
```

Isso abre uma janela de editor para especificar os [argumentos do `gn`](https://gn.googlesource.com/gn/+/master/docs/reference.md). Alternativamente, você pode passar os argumentos na linha de comando:

```bash
gn gen out/foo --args='is_debug=false target_cpu="x64" v8_target_cpu="arm64" use_goma=true'
```

Isso gera arquivos de construção para compilar o V8 com o simulador arm64 em modo release usando o `goma` para compilação.

Para uma visão geral de todos os argumentos disponíveis no `gn`, execute:

```bash
gn args out/foo --list
```

#### Gerando arquivos de construção usando o `v8gen`

O repositório do V8 inclui um script conveniente chamado `v8gen` para facilitar a geração de arquivos de construção para configurações comuns. Recomendamos adicionar um alias à sua configuração de shell:

```bash
alias v8gen=/path/to/v8/tools/dev/v8gen.py
```

Execute `v8gen --help` para mais informações.

Liste as configurações disponíveis (ou bots de um master):

```bash
v8gen list
```

```bash
v8gen list -m client.v8
```

Construa como um bot específico do fluxo de trabalho `client.v8` na pasta `foo`:

```bash
v8gen -b 'V8 Linux64 - debug builder' -m client.v8 foo
```

### Etapa 2: compilar o V8

Para construir todo o V8 (assumindo que o `gn` foi gerado na pasta `x64.release`), execute:

```bash
ninja -C out/x64.release
```

Para construir alvos específicos como `d8`, adicione-os ao comando:

```bash
ninja -C out/x64.release d8
```

### Etapa 3: executar testes

Você pode passar o diretório de saída para o driver de teste. Outros flags relevantes são inferidos da compilação:

```bash
tools/run-tests.py --outdir out/foo
```

Você também pode testar sua compilação mais recente (em `out.gn`):

```bash
tools/run-tests.py --gn
```

**Problemas de construção? Abra um bug em [v8.dev/bug](/bug) ou peça ajuda em <v8-users@googlegroups.com>.**
