---
title: 'Ajude-nos a testar o futuro do V8!'
author: 'Daniel Clifford ([@expatdanno](https://twitter.com/expatdanno)), Cervejeiro Original de V8 em Munique'
date: 2017-02-14 13:33:37
tags:
  - internos
description: 'Pré-visualize o novo pipeline de compiladores do V8 com Ignition e TurboFan no Chrome Canary hoje!'
---
A equipe do V8 está atualmente trabalhando em um novo pipeline de compiladores padrão que nos ajudará a trazer melhorias de velocidade para o [JavaScript do mundo real](/blog/real-world-performance). Você pode pré-visualizar o novo pipeline no Chrome Canary hoje para nos ajudar a verificar que não haverá surpresas quando implantarmos a nova configuração para todos os canais do Chrome.

<!--truncate-->
O novo pipeline de compiladores utiliza o [interpretador Ignition](/blog/ignition-interpreter) e o [compilador TurboFan](/docs/turbofan) para executar todo o JavaScript (em lugar do pipeline clássico que consistia nos compiladores Full-codegen e Crankshaft). Um subconjunto aleatório de usuários dos canais Chrome Canary e Chrome Developer já está testando a nova configuração. No entanto, qualquer pessoa pode optar por ativar o novo pipeline (ou voltar ao antigo) alterando uma bandeira em about:flags.

Você pode ajudar a testar o novo pipeline ativando-o e usando-o com o Chrome em seus sites favoritos. Se você é desenvolvedor web, por favor, teste suas aplicações web com o novo pipeline de compiladores. Se você notar uma regressão na estabilidade, precisão ou desempenho, por favor, [relate o problema ao rastreador de bugs do V8](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline).

## Como habilitar o novo pipeline

### No Chrome 58

1. Instale o último [Beta](https://www.google.com/chrome/browser/beta.html)
2. Abra a URL `about:flags` no Chrome
3. Procure por "**Pipeline Experimental de Compilação de JavaScript**" e configure como "**Habilitado**"

![](/_img/test-the-future/58.png)

### No Chrome 59.0.3056 e superior

1. Instale o mais recente [Canary](https://www.google.com/chrome/browser/canary.html) ou [Dev](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel)
2. Abra a URL `about:flags` no Chrome
3. Procure por "**Pipeline Clássico de Compilação de JavaScript**" e configure como "**Desativado**"

![](/_img/test-the-future/59.png)

O valor padrão é "**Default**", o que significa que o pipeline novo **ou** o clássico está ativo, dependendo da configuração do teste A/B.

## Como relatar problemas

Por favor, informe-nos se sua experiência de navegação mudar significativamente ao usar o novo pipeline em vez do pipeline padrão. Se você é um desenvolvedor web, teste o desempenho do novo pipeline em sua aplicação web (inclusive móvel) para verificar como ela é afetada. Se você descobrir que sua aplicação web está se comportando de forma estranha (ou testes estão falhando), informe-nos:

1. Certifique-se de ter habilitado corretamente o novo pipeline conforme descrito na seção anterior.
2. [Crie um bug no rastreador de bugs do V8](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline).
3. Anexe um código de exemplo que possamos usar para reproduzir o problema.
