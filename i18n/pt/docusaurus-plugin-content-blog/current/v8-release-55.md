---
title: 'Lançamento do V8 v5.5'
author: 'a equipe do V8'
date: 2016-10-24 13:33:37
tags:
  - lançamento
description: 'O V8 v5.5 vem com menor consumo de memória e maior suporte a recursos da linguagem ECMAScript.'
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é derivada do mestre do Git do V8 imediatamente antes de um marco Beta do Chrome. Hoje, temos o prazer de anunciar nosso mais novo branch, [V8 versão 5.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.5), que estará em beta até ser lançado em coordenação com a versão estável do Chrome 55 em algumas semanas. O V8 v5.5 está cheio de novidades voltadas para desenvolvedores, então gostaríamos de dar um prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Recursos da linguagem

### Funções assíncronas

No v5.5, o V8 apresenta as [funções assíncronas](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions) do JavaScript ES2017, que facilitam a escrita de código que usa e cria Promises. Usando funções assíncronas, esperar uma Promise ser resolvida é tão simples quanto digitar `await` antes dela e prosseguir como se o valor estivesse disponível de forma síncrona - sem necessidade de callbacks. Veja [este artigo](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions) para uma introdução.

Aqui está uma função de exemplo que obtém uma URL e retorna o texto da resposta, escrita em um estilo típico baseado em Promises assíncronas.

```js
function logFetch(url) {
  return fetch(url)
    .then(response => response.text())
    .then(text => {
      console.log(text);
    }).catch(err => {
      console.error('falha no fetch', err);
    });
}
```

Aqui está o mesmo código reescrito para remover callbacks, usando funções assíncronas.

```js
async function logFetch(url) {
  try {
    const response = await fetch(url);
    console.log(await response.text());
  } catch (err) {
    console.log('falha no fetch', err);
  }
}
```

## Melhorias de desempenho

O V8 v5.5 apresenta uma série de melhorias importantes no uso de memória.

### Memória

O consumo de memória é uma dimensão importante no espaço de trade-off de desempenho da máquina virtual JavaScript. Nos últimos lançamentos, a equipe do V8 analisou e reduziu significativamente o uso de memória de vários sites identificados como representativos de padrões modernos de desenvolvimento web. O V8 5.5 reduz o consumo geral de memória do Chrome em até 35% em **dispositivos com pouca memória** (em comparação ao V8 5.3 no Chrome 53), devido às reduções no tamanho do heap do V8 e no uso de memória da zona. Outros segmentos de dispositivos também se beneficiam das reduções de memória da zona. Por favor, veja a [postagem dedicada do blog](/blog/optimizing-v8-memory) para uma visão detalhada.

## API do V8

Por favor, confira nosso [resumo das mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é atualizado regularmente algumas semanas após cada lançamento principal.

### Inspetor do V8 migrado

O inspetor do V8 foi migrado do Chromium para o V8. O código do inspetor agora reside integralmente no [repositório do V8](https://chromium.googlesource.com/v8/v8/+/master/src/inspector/).

Desenvolvedores com uma [cópia ativa do V8](/docs/source-code#using-git) podem usar `git checkout -b 5.5 -t branch-heads/5.5` para experimentar os novos recursos no V8 5.5. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
