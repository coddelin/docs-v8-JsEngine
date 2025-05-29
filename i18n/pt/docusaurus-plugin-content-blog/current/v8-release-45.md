---
title: 'Lançamento do V8 v4.5'
author: 'a equipe V8'
date: 2015-07-17 13:33:37
tags:
  - lançamento
description: 'O V8 v4.5 vem com melhorias de desempenho e adiciona suporte a vários recursos do ES2015.'
---
Aproximadamente a cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é criada a partir do repositório principal do V8 no Git logo antes de o Chrome criar um branch para um marco de Beta do Chrome. Hoje estamos felizes em anunciar o nosso mais novo branch, [V8 versão 4.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.5), que estará em beta até ser lançado juntamente com o Chrome 45 Stable. O V8 v4.5 está cheio de novidades voltadas para os desenvolvedores, então gostaríamos de dar uma prévia de alguns dos destaques em antecipação ao lançamento nas próximas semanas.

<!--truncate-->
## Suporte aprimorado ao ECMAScript 2015 (ES6)

O V8 v4.5 adiciona suporte a vários recursos do [ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/).

### Funções arrow

Com a ajuda de [Funções Arrow](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions), é possível escrever código mais conciso.

```js
const data = [0, 1, 3];
// Código sem Funções Arrow
const convertedData = data.map(function(value) { return value * 2; });
console.log(convertedData);
// Código com Funções Arrow
const convertedData = data.map(value => value * 2);
console.log(convertedData);
```

A vinculação léxica de 'this' é outro grande benefício das funções arrow. Como resultado, usar callbacks em métodos torna-se muito mais fácil.

```js
class MyClass {
  constructor() { this.a = 'Olá, '; }
  hello() { setInterval(() => console.log(this.a + 'Mundo!'), 1000); }
}
const myInstance = new MyClass();
myInstance.hello();
```

### Funções de Array/TypedArray

Todos os novos métodos em [Arrays e TypedArrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array#Methods) especificados no ES2015 agora são suportados no V8 v4.5. Eles tornam o trabalho com Arrays e TypedArrays mais conveniente. Entre os métodos adicionados estão `Array.from` e `Array.of`. Métodos que espelham a maioria dos métodos de `Array` em cada tipo de TypedArray também foram adicionados.

### `Object.assign`

[`Object.assign`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) permite que os desenvolvedores mesclem e clonem objetos rapidamente.

```js
const target = { a: 'Olá, ' };
const source = { b: 'mundo!' };
// Mesclar os objetos.
Object.assign(target, source);
console.log(target.a + target.b);
```

Este recurso também pode ser usado para adicionar funcionalidades.

## Mais recursos da linguagem JavaScript são “otimizáveis”

Por muitos anos, o compilador otimizador tradicional do V8, [Crankshaft](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html), fez um ótimo trabalho ao otimizar muitos padrões comuns de JavaScript. No entanto, ele nunca teve a capacidade de suportar toda a linguagem JavaScript, e usar certos recursos da linguagem em uma função — como `try`/`catch` e `with` — impediria que ela fosse otimizada. O V8 teria que recorrer ao seu compilador mais lento, de base, para essa função.

Um dos objetivos de design do novo compilador otimizador do V8, [TurboFan](/blog/turbofan-jit), é eventualmente otimizar todo o JavaScript, incluindo recursos do ECMAScript 2015. No V8 v4.5, começamos a usar o TurboFan para otimizar alguns dos recursos da linguagem que não são suportados pelo Crankshaft: `for`-`of`, `class`, `with` e nomes de propriedades computados.

Aqui está um exemplo de código que usa 'for-of', que agora pode ser compilado pelo TurboFan:

```js
const sequence = ['Primeiro', 'Segundo', 'Terceiro'];
for (const value of sequence) {
  // Este escopo agora é otimizado.
  const object = {a: 'Olá, ', b: 'mundo!', c: value};
  console.log(object.a + object.b + object.c);
}
```

Embora inicialmente as funções que usam esses recursos da linguagem não alcancem o mesmo desempenho máximo de outro código compilado pelo Crankshaft, o TurboFan agora pode acelerá-las muito além do nosso compilador de base atual. Ainda melhor, o desempenho continuará melhorando rapidamente à medida que desenvolvemos mais otimizações para o TurboFan.

## API do V8

Consulte nosso [resumo de alterações da API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é regularmente atualizado algumas semanas após cada grande lançamento.

Os desenvolvedores com um [checkout ativo do V8](https://v8.dev/docs/source-code#using-git) podem usar `git checkout -b 4.5 -t branch-heads/4.5` para experimentar os novos recursos no V8 v4.5. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos em breve.
