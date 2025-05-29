---
title: &apos;Verificação de marca privada, também conhecido como `#foo in obj`&apos;
author: &apos;Marja Hölttä ([@marjakh](https://twitter.com/marjakh))&apos;
avatars:
  - &apos;marja-holtta&apos;
date: 2021-04-14
tags:
  - ECMAScript
description: &apos;As verificações de marca privada permitem testar a existência de um campo privado em um objeto.&apos;
tweet: &apos;1382327454975590401&apos;
---

O [`operador in`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in) pode ser usado para testar se o objeto dado (ou qualquer objeto em sua cadeia de protótipos) possui a propriedade dada:

```javascript
const o1 = {&apos;foo&apos;: 0};
console.log(&apos;foo&apos; in o1); // true
const o2 = {};
console.log(&apos;foo&apos; in o2); // false
const o3 = Object.create(o1);
console.log(&apos;foo&apos; in o3); // true
```

O recurso de verificações de marca privada estende o operador `in` para suportar [campos de classe privados](https://v8.dev/features/class-fields#private-class-fields):

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }
  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false

class B {
  #foo = 0;
}

A.test(new B()); // false; não é o mesmo #foo
```

Como os nomes privados estão disponíveis apenas dentro da classe que os define, o teste também deve ocorrer dentro da classe, por exemplo, em um método como `static test` acima.

As instâncias de subclasses recebem campos privados da classe pai como propriedades próprias:

```javascript
class SubA extends A {};
A.test(new SubA()); // true
```

Mas objetos criados com `Object.create` (ou que têm o protótipo definido posteriormente via o setter `__proto__` ou `Object.setPrototypeOf`) não recebem os campos privados como propriedades próprias. Como a busca de campos privados funciona apenas em propriedades próprias, o operador `in` não encontra esses campos herdados:

<!--truncate-->
```javascript
const a = new A();
const o = Object.create(a);
A.test(o); // false, campo privado é herdado e não próprio
A.test(o.__proto__); // true

const o2 = {};
Object.setPrototypeOf(o2, a);
A.test(o2); // false, campo privado é herdado e não próprio
A.test(o2.__proto__); // true
```

Acessar um campo privado inexistente gera um erro - ao contrário das propriedades normais, onde acessar uma propriedade inexistente retorna `undefined`, mas não gera erro. Antes das verificações de marca privada, os desenvolvedores eram forçados a usar um `try`-`catch` para implementar comportamento de fallback para casos em que um objeto não possuía o campo privado necessário:

```javascript
class D {
  use(obj) {
    try {
      obj.#foo;
    } catch {
      // Fallback para o caso de obj não possuir #foo
    }
  }
  #foo = 0;
}
```

Agora a existência do campo privado pode ser testada usando uma verificação de marca privada:

```javascript
class E {
  use(obj) {
    if (#foo in obj) {
      obj.#foo;
    } else {
      // Fallback para o caso de obj não possuir #foo
    }
  }
  #foo = 0;
}
```

Mas tenha cuidado - a existência de um campo privado não garante que o objeto tenha todos os campos privados declarados em uma classe! O exemplo a seguir mostra um objeto meio construído que possui apenas um dos dois campos privados declarados em sua classe:

```javascript
let halfConstructed;
class F {
  m() {
    console.log(#x in this); // true
    console.log(#y in this); // false
  }
  #x = 0;
  #y = (() => {
    halfConstructed = this;
    throw &apos;error&apos;;
  })();
}

try {
  new F();
} catch {}

halfConstructed.m();
```

## Suporte para verificação de marca privada

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11374"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>
