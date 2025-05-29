---
title: "Lançamento do V8 v5.2"
author: "a equipe V8"
date: 2016-06-04 13:33:37
tags:
  - lançamento
description: "O V8 v5.2 inclui suporte para recursos de linguagem ES2016."
---
Aproximadamente a cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é criada a partir do mestre do Git do V8 imediatamente antes de o Chrome se ramificar para um marco Beta do Chrome. Hoje temos o prazer de anunciar nosso mais novo branch, [versão V8 5.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.2), que estará em beta até ser lançado em coordenação com o Chrome 52 Stable. O V8 5.2 está repleto de todo tipo de recursos voltados para desenvolvedores, então gostaríamos de dar uma prévia de alguns destaques, antecipando o lançamento em algumas semanas.

<!--truncate-->
## Suporte a ES2015 e ES2016

O V8 v5.2 contém suporte para ES2015 (também conhecido como ES6) e ES2016 (também conhecido como ES7).

### Operador de exponenciação

Esta versão contém suporte para o operador de exponenciação ES2016, uma notação infixa para substituir `Math.pow`.

```js
let n = 3**3; // n == 27
n **= 2; // n == 729
```

### Especificação em evolução

Para mais informações sobre as complexidades por trás do suporte a especificações em evolução e discussões contínuas sobre padrões relacionados a bugs de compatibilidade com a web e chamadas de cauda, consulte o post do blog do V8 [ES2015, ES2016 e além](/blog/modern-javascript).

## Desempenho

O V8 v5.2 contém otimizações adicionais para melhorar o desempenho de recursos embutidos do JavaScript, incluindo melhorias para operações de Array como o método isArray, o operador in e Function.prototype.bind. Isso faz parte do trabalho contínuo para acelerar recursos embutidos com base em uma nova análise das estatísticas de chamadas em tempo de execução em páginas da web populares. Para mais informações, confira a [apresentação V8 no Google I/O 2016](https://www.youtube.com/watch?v=N1swY14jiKc) e fique de olho em um post de blog futuro sobre otimizações de desempenho obtidas de websites reais.

## API do V8

Consulte nosso [resumo de mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é atualizado regularmente algumas semanas após cada grande lançamento.

Desenvolvedores com um [checkout ativo do V8](https://v8.dev/docs/source-code#using-git) podem usar `git checkout -b 5.2 -t branch-heads/5.2` para experimentar os novos recursos do V8 v5.2. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
