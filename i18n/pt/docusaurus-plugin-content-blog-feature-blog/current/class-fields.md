---
title: &apos;Campos de classe públicos e privados&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-12-13
tags:
  - ECMAScript
  - ES2022
  - io19
  - Node.js 14
description: &apos;Várias propostas expandem a sintaxe de classes JavaScript existente com novas funcionalidades. Este artigo explica a nova sintaxe de campos de classe públicos no V8 v7.2 e Chrome 72, assim como a futura sintaxe de campos de classe privados.&apos;
tweet: &apos;1121395767170740225&apos;
---
Várias propostas expandem a sintaxe de classes JavaScript existente com novas funcionalidades. Este artigo explica a nova sintaxe de campos de classe públicos no V8 v7.2 e Chrome 72, assim como a futura sintaxe de campos de classe privados.

Aqui está um exemplo de código que cria uma instância de uma classe chamada `IncreasingCounter`:

```js
const counter = new IncreasingCounter();
counter.value;
// registra &apos;Obtendo o valor atual!&apos;
// → 0
counter.increment();
counter.value;
// registra &apos;Obtendo o valor atual!&apos;
// → 1
```

Note que acessar o `value` executa algum código (isto é, registra uma mensagem) antes de retornar o resultado. Agora pergunte-se, como você implementaria esta classe em JavaScript? 🤔

## Sintaxe de classe ES2015

Veja como `IncreasingCounter` poderia ser implementado usando a sintaxe de classe ES2015:

```js
class IncreasingCounter {
  constructor() {
    this._count = 0;
  }
  get value() {
    console.log(&apos;Obtendo o valor atual!&apos;);
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

A classe instala o getter `value` e um método `increment` no protótipo. Mais interessantemente, a classe tem um construtor que cria uma propriedade de instância `_count` e define seu valor padrão como `0`. Atualmente, costumamos usar o prefixo de sublinhado para indicar que `_count` não deve ser usado diretamente pelos consumidores da classe, mas isso é apenas uma convenção; não é _realmente_ uma propriedade “privada” com semântica especial aplicada pela linguagem.

<!--truncate-->
```js
const counter = new IncreasingCounter();
counter.value;
// registra &apos;Obtendo o valor atual!&apos;
// → 0

// Nada impede que as pessoas leiam ou alterem a
// propriedade de instância `_count`. 😢
counter._count;
// → 0
counter._count = 42;
counter.value;
// registra &apos;Obtendo o valor atual!&apos;
// → 42
```

## Campos de classe públicos

A nova sintaxe de campos de classe públicos nos permite simplificar a definição da classe:

```js
class IncreasingCounter {
  _count = 0;
  get value() {
    console.log(&apos;Obtendo o valor atual!&apos;);
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

A propriedade `_count` agora está declarada de maneira organizada no início da classe. Não precisamos mais de um construtor apenas para definir alguns campos. Legal!

No entanto, o campo `_count` ainda é uma propriedade pública. Neste exemplo específico, queremos impedir que as pessoas acessem diretamente a propriedade.

## Campos de classe privados

É aqui que os campos de classe privados entram. A nova sintaxe de campos privados é semelhante aos campos públicos, exceto [que você marca o campo como privado usando `#`](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md). Você pode pensar no `#` como parte do nome do campo:

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log(&apos;Obtendo o valor atual!&apos;);
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

Campos privados não são acessíveis fora do corpo da classe:

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

## Propriedades estáticas públicas e privadas

A sintaxe de campos de classe pode ser usada para criar propriedades e métodos estáticos públicos e privados também:

```js
class FakeMath {
  // `PI` é uma propriedade estática pública.
  static PI = 22 / 7; // Bem próximo.

  // `#totallyRandomNumber` é uma propriedade estática privada.
  static #totallyRandomNumber = 4;

  // `#computeRandomNumber` é um método estático privado.
  static #computeRandomNumber() {
    return FakeMath.#totallyRandomNumber;
  }

  // `random` é um método estático público (sintaxe ES2015)
  // que consome `#computeRandomNumber`.
  static random() {
    console.log(&apos;Ouvi dizer que você gosta de números aleatórios…&apos;);
    return FakeMath.#computeRandomNumber();
  }
}

FakeMath.PI;
// → 3.142857142857143
FakeMath.random();
// registra &apos;Ouvi dizer que você gosta de números aleatórios…&apos;
// → 4
FakeMath.#totallyRandomNumber;
// → SyntaxError
FakeMath.#computeRandomNumber();
// → SyntaxError
```

## Subclassificação mais simples

Os benefícios da sintaxe de campos de classe tornam-se ainda mais claros ao lidar com subclasses que introduzem campos adicionais. Imagine a seguinte classe base `Animal`:

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}
```

Para criar uma subclasse `Cat` que introduz uma propriedade de instância adicional, anteriormente você teria que chamar `super()` para executar o construtor da classe base `Animal` antes de criar a propriedade:

```js
class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log(&apos;Miau!&apos;);
  }
}
```

Isso é muito código boilerplate apenas para indicar que gatos não gostam de tomar banho. Felizmente, a sintaxe de campos de classe elimina a necessidade de todo o construtor, incluindo a chamada estranha de `super()`:

```js
class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log(&apos;Miau!&apos;);
  }
}
```

## Suporte ao recurso

### Suporte para campos de classe públicos

<feature-support chrome="72 /blog/v8-release-72#public-class-fields"
                 firefox="sim https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/69#JavaScript"
                 safari="sim https://bugs.webkit.org/show_bug.cgi?id=174212"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="sim https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### Suporte para campos de classe privados

<feature-support chrome="74 /blog/v8-release-74#private-class-fields"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="sim"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="sim https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### Suporte para métodos privados e acessores

<feature-support chrome="84 /blog/v8-release-84#private-methods-and-accessors"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="sim https://webkit.org/blog/11989/new-webkit-features-in-safari-15/"
                 nodejs="14.6.0"
                 babel="sim https://babeljs.io/docs/en/babel-plugin-proposal-private-methods"></feature-support>
