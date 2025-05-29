---
title: 'Lançamento do V8 v4.9'
author: 'a equipe do V8'
date: 2016-01-26 13:33:37
tags:
  - lançamento
description: 'V8 v4.9 vem com uma implementação aprimorada de `Math.random` e adiciona suporte a diversos novos recursos da linguagem ES2015.'
---
Aproximadamente a cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é criada a partir do master do Git do V8 imediatamente antes do Chrome ramificar para um marco Beta do Chrome. Hoje estamos felizes em anunciar nossa mais nova ramificação, [V8 versão 4.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.9), que ficará em beta até ser lançada em coordenação com a versão Estável do Chrome 49. V8 4.9 está repleto de novidades voltadas para os desenvolvedores, então gostaríamos de dar uma prévia de alguns destaques em antecipação ao lançamento nas próximas semanas.

<!--truncate-->
## 91% de suporte ao ECMAScript 2015 (ES6)

No lançamento do V8 4.9, entregamos mais recursos de JavaScript ES2015 do que em qualquer outro lançamento anterior, atingindo 91% de conclusão, conforme medido pela [tabela de compatibilidade Kangax](https://kangax.github.io/compat-table/es6/) (em 26 de janeiro). O V8 agora suporta desestruturação, parâmetros padrão, objetos Proxy e a API Reflect. A versão 4.9 também torna disponíveis construtos de nível de bloco como `class` e `let` fora do modo estrito e adiciona suporte à flag sticky em expressões regulares e saída personalizável de `Object.prototype.toString`.

### Desestruturação

Declarações de variáveis, parâmetros e atribuições agora suportam [desestruturação](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) de objetos e arrays por meio de padrões. Por exemplo:

```js
const o = {a: [1, 2, 3], b: {p: 4}, c: {q: 5}};
let {a: [x, y], b: {p}, c, d} = o;              // x=1, y=2, p=4, c={q: 5}
[x, y] = [y, x];                                // x=2, y=1
function f({a, b}) { return [a, b]; }
f({a: 4});                                      // [4, undefined]
```

Padrões de array podem conter padrões de resto que recebem o restante do array:

```js
const [x, y, ...r] = [1, 2, 3, 4];              // x=1, y=2, r=[3,4]
```

Além disso, elementos do padrão podem receber valores padrão, que são usados caso a respectiva propriedade não tenha correspondência:

```js
const {a: x, b: y = x} = {a: 4};                // x=4, y=4
// ou…
const [x, y = 0, z = 0] = [1, 2];               // x=1, y=2, z=0
```

A desestruturação pode ser usada para tornar o acesso a dados de objetos e arrays mais compacto.

### Proxies & Reflect

Após anos de desenvolvimento, o V8 agora é lançado com uma implementação completa de [proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), atualizada com a especificação ES2015. Proxies são um mecanismo poderoso para virtualizar objetos e funções por meio de um conjunto de ganchos definidos pelo desenvolvedor para personalizar acessos a propriedades. Além da virtualização de objetos, proxies podem ser usados para implementar interceptação, adicionar validação ao definir propriedades, simplificar a depuração e o perfil e desbloquear abstrações avançadas como [membranas](http://tvcutsem.github.io/js-membranes/).

Para proxy um objeto, você deve criar um objeto de manipulador que define várias armadilhas e aplicá-lo ao objeto alvo que o proxy virtualiza:

```js
const target = {};
const handler = {
  get(target, name='mundo') {
    return `Olá, ${name}!`;
  }
};

const foo = new Proxy(target, handler);
foo.bar;
// → 'Olá, bar!'
```

O objeto Proxy é acompanhado pelo módulo Reflect, que define padrões adequados para todas as armadilhas de proxy:

```js
const debugMe = new Proxy({}, {
  get(target, name, receiver) {
    console.log(`Depuração: get chamado para o campo: ${name}`);
    return Reflect.get(target, name, receiver);
  },
  set(target, name, value, receiver) {
    console.log(`Depuração: set chamado para o campo: ${name}, com valor: ${value}`);
    return Reflect.set(target, name, value, receiver);
  }
});

debugMe.name = 'John Doe';
// Depuração: set chamado para o campo: name, com valor: John Doe
const title = `Sr. ${debugMe.name}`; // → 'Sr. John Doe'
// Depuração: get chamado para o campo: name
```

Para obter mais informações sobre o uso de Proxies e a API Reflect, consulte a seção de exemplos da [página Proxy do MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#Examples).

### Parâmetros padrão

No ES5 e anteriores, parâmetros opcionais em definições de funções exigiam código padrão para verificar se os parâmetros eram indefinidos:

```js
function sublist(list, start, end) {
  if (typeof start === 'undefined') start = 0;
  if (typeof end === 'undefined') end = list.length;
  ...
}
```

Agora, o ES2015 permite que os parâmetros da função tenham [valores padrão](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters), proporcionando definições de funções mais claras e concisas:

```js
function sublist(list, start = 0, end = list.length) { … }
sublist([1, 2, 3], 1);
// sublist([1, 2, 3], 1, 3)
```

Parâmetros padrão e desestruturação podem ser combinados, é claro:

```js
function vector([x, y, z] = []) { … }
```

### Classes e declarações lexicais no modo desleixado

O V8 tem suporte para declarações lexicais (`let`, `const`, `function` local de bloco) e classes desde as versões 4.1 e 4.2, respectivamente, mas até agora o modo estrito era necessário para usá-las. A partir da versão 4.9 do V8, todos esses recursos agora estão habilitados fora do modo estrito também, conforme a especificação do ES2015. Isso torna muito mais fácil a prototipagem no Console das DevTools, embora incentivemos os desenvolvedores a, em geral, atualizarem para o modo estrito em novos códigos.

### Expressões regulares

O V8 agora suporta a nova [flag sticky](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky) em expressões regulares. A flag sticky alterna se as buscas em cadeias de caracteres começam do início da string (normal) ou da propriedade `lastIndex` (sticky). Esse comportamento é útil para analisar de forma eficiente strings de entrada arbitrariamente longas com muitas expressões regulares diferentes. Para ativar a busca sticky, adicione a flag `y` a uma regex: (por exemplo, `const regex = /foo/y;`).

### Saída personalizável de `Object.prototype.toString`

Usando `Symbol.toStringTag`, tipos definidos pelo usuário agora podem retornar saídas personalizadas ao serem passados para `Object.prototype.toString` (diretamente ou como resultado de coerção de string):

```js
class Custom {
  get [Symbol.toStringTag]() {
    return 'Custom';
  }
}
Object.prototype.toString.call(new Custom);
// → '[object Custom]'
String(new Custom);
// → '[object Custom]'
```

## `Math.random()` Melhorado

O V8 v4.9 inclui uma melhoria na implementação de `Math.random()`. [Conforme anunciado no mês passado](/blog/math-random), alteramos o algoritmo PRNG do V8 para [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf) a fim de proporcionar pseudoaleatoriedade de maior qualidade.

## API do V8

Confira nosso [resumo das mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é regularmente atualizado algumas semanas após cada lançamento principal.

Os desenvolvedores com um [checkout ativo do V8](https://v8.dev/docs/source-code#using-git) podem usar `git checkout -b 4.9 -t branch-heads/4.9` para experimentar os novos recursos no V8 v4.9. Alternativamente, você pode se inscrever no [canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
