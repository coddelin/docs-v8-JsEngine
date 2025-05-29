---
title: 'Lançamento do V8 v4.7'
author: 'a equipe V8'
date: 2015-10-14 13:33:37
tags:
  - lançamento
description: 'O V8 v4.7 vem com consumo reduzido de memória e suporte para novos recursos de linguagem ES2015.'
---
Aproximadamente a cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é ramificada do Git master do V8 imediatamente antes de o Chrome ser ramificado para um marco de Beta do Chrome. Hoje estamos felizes em anunciar nosso mais novo branch, [V8 versão 4.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.7), que estará em beta até ser lançado em coordenação com o Chrome 47 Stable. O V8 v4.7 está carregado de várias melhorias voltadas para os desenvolvedores, então gostaríamos de dar uma prévia de alguns dos destaques em antecipação ao lançamento em algumas semanas.

<!--truncate-->
## Suporte aprimorado ao ECMAScript 2015 (ES6)

### Operador Rest

O [operador rest](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/rest_parameters) permite que o desenvolvedor passe um número indefinido de argumentos para uma função. É semelhante ao objeto `arguments`.

```js
// Sem o operador rest
function concat() {
  var args = Array.prototype.slice.call(arguments, 1);
  return args.join('');
}

// Com o operador rest
function concatWithRest(...strings) {
  return strings.join('');
}
```

## Suporte para futuros recursos do ES

### `Array.prototype.includes`

[`Array.prototype.includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes) é um novo recurso que atualmente é uma proposta estágio 3 para inclusão no ES2016. Ele fornece uma sintaxe breve para determinar se um elemento está ou não em um array dado, retornando um valor booleano.

```js
[1, 2, 3].includes(3); // true
['apple', 'banana', 'cherry'].includes('apple'); // true
['apple', 'banana', 'cherry'].includes('peach'); // false
```

## Alívio da pressão de memória durante a análise

[Mudanças recentes no analisador do V8](https://code.google.com/p/v8/issues/detail?id=4392) reduzem significativamente a memória consumida ao analisar arquivos com funções aninhadas grandes. Em particular, isso permite que o V8 execute módulos asm.js maiores do que era possível anteriormente.

## API do V8

Confira nosso [resumo de mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é atualizado regularmente algumas semanas após cada lançamento principal. Desenvolvedores com um [checkout ativo do V8](https://v8.dev/docs/source-code#using-git) podem usar `git checkout -b 4.7 -t branch-heads/4.7` para experimentar os novos recursos no V8 v4.7. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
