---
title: 'Blocos de inicialização estática da classe'
author: 'Shu-yu Guo ([@_shu](https://twitter.com/_shu))'
avatars:
  - 'shu-yu-guo'
date: 2021-03-30
tags:
  - ECMAScript
description: 'Classes JavaScript recebem uma sintaxe dedicada para inicialização estática.'
tweet: '1376925666780798989'
---
A nova sintaxe de blocos de inicialização estática da classe permite que os desenvolvedores agrupem o código que deve ser executado uma vez para uma definição de classe específica e o coloquem em um único lugar. Considere o seguinte exemplo, onde um gerador de números pseudoaleatórios usa um bloco estático para inicializar um conjunto de entropia uma vez, quando a definição `class MyPRNG` é avaliada.

<!--truncate-->
```js
class MyPRNG {
  constructor(seed) {
    if (seed === undefined) {
      if (MyPRNG.entropyPool.length === 0) {
        throw new Error('Conjunto de entropia esgotado');
      }
      seed = MyPRNG.entropyPool.pop();
    }
    this.seed = seed;
  }

  getRandom() { … }

  static entropyPool = [];
  static {
    for (let i = 0; i < 512; i++) {
      this.entropyPool.push(probeEntropySource());
    }
  }
}
```

## Escopo

Cada bloco de inicialização estática é seu próprio escopo de `var` e `let`/`const`. Assim como nos inicializadores de campos estáticos, o valor `this` em blocos estáticos é o próprio construtor da classe. Da mesma forma, `super.property` dentro de um bloco estático se refere à propriedade estática da superclasse.

```js
var y = 'y exterior';
class A {
  static fieldA = 'A.fieldA';
}
class B extends A {
  static fieldB = 'B.fieldB';
  static {
    let x = super.fieldA;
    // → 'A.fieldA'
    var y = this.fieldB;
    // → 'B.fieldB'
  }
}
// Como os blocos estáticos são seus próprios escopos `var`, `var`s não são elevados!
y;
// → 'y exterior'
```

## Múltiplos blocos

Uma classe pode ter mais de um bloco de inicialização estática. Esses blocos são avaliados em ordem textual. Além disso, se houver campos estáticos, todos os elementos estáticos são avaliados em ordem textual.

```js
class C {
  static field1 = console.log('campo 1');
  static {
    console.log('bloco estático 1');
  }
  static field2 = console.log('campo 2');
  static {
    console.log('bloco estático 2');
  }
}
// → campo 1
//   bloco estático 1
//   campo 2
//   bloco estático 2
```

## Acesso a campos privados

Como um bloco de inicialização estática de classe está sempre aninhado dentro de uma classe, ele tem acesso aos campos privados dessa classe.

```js
let getDPrivateField;
class D {
  #privateField;
  constructor(v) {
    this.#privateField = v;
  }
  static {
    getDPrivateField = (d) => d.#privateField;
  }
}
getDPrivateField(new D('privado'));
// → privado
```

E é isso. Bom uso da orientação a objetos!

## Suporte aos blocos de inicialização estática de classe

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11375"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-static-block"></feature-support>
