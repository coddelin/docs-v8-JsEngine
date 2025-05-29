---
title: "Esquema de numeração de versões do V8"
description: "Este documento explica o esquema de numeração de versões do V8."
---
Os números de versão do V8 são no formato `x.y.z.w`, onde:

- `x.y` é o marco do Chromium dividido por 10 (por exemplo, M60 → `6.0`)
- `z` é automaticamente incrementado sempre que há um novo [LKGR](https://www.chromium.org/chromium-os/developer-library/glossary/#acronyms) (geralmente algumas vezes por dia)
- `w` é incrementado para patches manualmente mesclados após um ponto de ramificação

Se `w` for `0`, ele é omitido do número da versão. Por exemplo, v5.9.211 (em vez de “v5.9.211.0”) é atualizado para v5.9.211.1 após a mesclagem de um patch.

## Qual versão do V8 devo usar?

Incorporadores do V8 devem geralmente usar *o cabeçalho da ramificação correspondente à versão menor do V8 que é enviada no Chrome*.

### Encontrando a versão menor do V8 correspondente ao Chrome estável mais recente

Para descobrir qual é a versão:

1. Acesse https://chromiumdash.appspot.com/releases
2. Encontre a versão estável mais recente do Chrome na tabela
3. Clique no (i) e verifique a coluna `V8`


### Encontrando o cabeçalho da ramificação correspondente

As ramificações relacionadas à versão do V8 não aparecem no repositório online em https://chromium.googlesource.com/v8/v8.git; em vez disso, apenas marcas aparecem. Para encontrar o cabeçalho dessa ramificação, vá para a URL neste formato:

```
https://chromium.googlesource.com/v8/v8.git/+/branch-heads/<minor-version>
```

Exemplo: para a versão menor 12.1 do V8 encontrada acima, acesse https://chromium.googlesource.com/v8/v8.git/+/branch-heads/12.1, encontrando um commit intitulado “Version 12.1.285.2.

**Atenção:** Você *não* deve simplesmente encontrar a marca numericamente maior correspondente à versão menor do V8 mencionada acima, pois às vezes essas versões não são suportadas, por exemplo, sendo marcadas antes de decidir onde cortar lançamentos menores. Tais versões não recebem backports ou similares.

Exemplo: as marcas do V8 `5.9.212`, `5.9.213`, `5.9.214`, `5.9.214.1`, …, e `5.9.223` estão abandonadas, apesar de serem numericamente maiores que o **cabeçalho da ramificação** do 5.9.211.33.

### Fazendo checkout do cabeçalho da ramificação correspondente

Se você já tiver o código-fonte, pode fazer o checkout do cabeçalho de forma um pouco direta. Se você tiver recuperado o código-fonte usando `depot_tools`, deverá conseguir fazer

```bash
git branch --remotes | grep branch-heads/
```

para listar as ramificações relevantes. Você deverá fazer o checkout daquela correspondente à versão menor do V8 encontrada acima e usá-la. A marca em que você acabar estará na versão apropriada do V8 para você como incorporador.

Se você não usou `depot_tools`, edite `.git/config` e adicione a linha abaixo à seção `[remote "origin"]`:

```
fetch = +refs/branch-heads/*:refs/remotes/branch-heads/*
```
