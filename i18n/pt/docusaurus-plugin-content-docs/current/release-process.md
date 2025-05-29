---
title: 'Processo de liberação'
description: 'Este documento explica o processo de lançamento do V8.'
---
O processo de lançamento do V8 está estreitamente conectado aos [canais do Chrome](https://www.chromium.org/getting-involved/dev-channel). A equipe do V8 utiliza todos os quatro canais de lançamento do Chrome para enviar novas versões aos usuários.

Se você quiser verificar qual versão do V8 está em uma liberação do Chrome, pode consultar o [Chromiumdash](https://chromiumdash.appspot.com/releases). Para cada liberação do Chrome, um ramo separado é criado no repositório do V8 para facilitar o rastreamento, como por exemplo [Chrome M121](https://chromium.googlesource.com/v8/v8/+log/refs/branch-heads/12.1).

## Lançamentos Canary

Todos os dias, uma nova versão Canary é enviada aos usuários através do [canal Canary do Chrome](https://www.google.com/chrome/browser/canary.html?platform=win64). Normalmente, o entregável é a versão mais recente e estável o suficiente de [main](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main).

Os ramos para uma versão Canary normalmente se parecem com isso:

## Lançamentos Dev

Toda semana, uma nova versão Dev é enviada aos usuários através do [canal Dev do Chrome](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel&platform=win64). Normalmente, o entregável inclui a versão mais recente e estável o suficiente do V8 no canal Canary.


## Lançamentos Beta

Aproximadamente a cada 2 semanas, um novo ramo principal é criado, como por exemplo [para o Chrome 94](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4). Isso acontece de forma sincronizada com a criação do [canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html?platform=win64). O Chrome Beta está vinculado ao início do ramo do V8. Após aproximadamente 2 semanas, o ramo é promovido para Estável.

As alterações são apenas selecionadas no ramo com o objetivo de estabilizar a versão.

Os ramos para uma versão Beta normalmente se parecem com isso:

```
refs/branch-heads/12.1
```

Eles são baseados em um ramo Canary.

## Lançamentos Estáveis

Aproximadamente a cada 4 semanas, uma nova versão Estável principal é realizada. Nenhum ramo especial é criado, pois o último ramo Beta é simplesmente promovido para Estável. Esta versão é enviada aos usuários através do [canal Estável do Chrome](https://www.google.com/chrome/browser/desktop/index.html?platform=win64).

Os ramos para uma versão Estável normalmente se parecem com isso:

```
refs/branch-heads/12.1
```

Eles são ramos Beta promovidos (reutilizados).

## API

Chromiumdash também fornece uma API para coletar as mesmas informações:

```
https://chromiumdash.appspot.com/fetch_milestones (para obter o nome do ramo do V8, por exemplo, refs/branch-heads/12.1)
https://chromiumdash.appspot.com/fetch_releases (para obter o hash git do ramo do V8)
```

Os seguintes parâmetros são úteis:
mstone=121
channel=Stable,Canary,Beta,Dev
platform=Mac,Windows,Lacros,Linux,Android,Webview,etc.

## Qual versão eu devo incorporar em minha aplicação?

A ponta do mesmo ramo que o canal Estável do Chrome usa.

Nós frequentemente integramos correções de bugs importantes em um ramo estável, então, se você se preocupa com estabilidade, segurança e correção, você deve incluir essas atualizações também — é por isso que recomendamos "a ponta do ramo", em vez de uma versão exata.

Assim que um novo ramo é promovido para Estável, paramos de manter o ramo estável anterior. Isso acontece a cada quatro semanas, então você deve estar preparado para atualizar pelo menos com essa frequência.

**Relacionado:** [Qual versão do V8 eu devo usar?](/docs/version-numbers#which-v8-version-should-i-use%3F)
