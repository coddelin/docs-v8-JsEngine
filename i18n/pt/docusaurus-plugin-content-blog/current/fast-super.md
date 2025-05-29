---
title: 'Acesso super rápido à propriedade `super`'
author: '[Marja Hölttä](https://twitter.com/marjakh), super otimizadora'
avatars:
  - marja-holtta
date: 2021-02-18
tags:
  - JavaScript
description: 'Acesso mais rápido à propriedade super no V8 v9.0'
tweet: '1362465295848333316'
---

A [`palavra-chave super`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super) pode ser usada para acessar propriedades e funções no pai de um objeto.

Anteriormente, acessar uma propriedade super (como `super.x`) era implementado através de uma chamada em tempo de execução. A partir do V8 v9.0, reutilizamos o [sistema de cache inline (IC)](https://mathiasbynens.be/notes/shapes-ics) em códigos não otimizados e geramos o código otimizado adequado para acesso à propriedade super, sem precisar recorrer à execução em tempo de execução.

<!--truncate-->
Como você pode ver nos gráficos abaixo, o acesso à propriedade super costumava ser uma ordem de magnitude mais lento do que o acesso às propriedades normais devido à chamada em tempo de execução. Agora estamos bem mais próximos de alcançar a paridade.

![Comparação de acesso à propriedade super com o acesso à propriedade normal, otimizado](/_img/fast-super/super-opt.svg)

![Comparação de acesso à propriedade super com o acesso à propriedade normal, não otimizado](/_img/fast-super/super-no-opt.svg)

O acesso à propriedade super é difícil de ser medido, pois ele deve ocorrer dentro de uma função. Não podemos medir acessos individuais à propriedade, mas apenas blocos maiores de trabalho. Portanto, a sobrecarga da chamada da função está inclusa na medição. Os gráficos acima subestimam um pouco a diferença entre o acesso à propriedade super e o acesso à propriedade normal, mas são suficientemente precisos para demonstrar a diferença entre o antigo e o novo acesso à propriedade super.

No modo não otimizado (interpretado), o acesso à propriedade super será sempre mais lento do que o acesso à propriedade normal, pois precisamos realizar mais carregamentos (ler o objeto home do contexto e ler o `__proto__` do objeto home). No código otimizado, já incorporamos o objeto home como uma constante sempre que possível. Isso poderia ser ainda mais aprimorado incorporando também seu `__proto__` como uma constante.

### Herança prototípica e `super`

Vamos começar do básico - o que significa acesso à propriedade super?

```javascript
class A { }
A.prototype.x = 100;

class B extends A {
  m() {
    return super.x;
  }
}
const b = new B();
b.m();
```

Agora `A` é a superclasse de `B` e `b.m()` retorna `100`, como esperado.

![Diagrama de herança de classes](/_img/fast-super/inheritance-1.svg)

A realidade da [herança prototípica do JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) é mais complicada:

![Diagrama de herança prototípica](/_img/fast-super/inheritance-2.svg)

Precisamos distinguir cuidadosamente entre as propriedades `__proto__` e `prototype` - elas não significam a mesma coisa! Para tornar as coisas mais confusas, o objeto `b.__proto__` é frequentemente denominado como "prototipo de `b`".

`b.__proto__` é o objeto do qual `b` herda propriedades. `B.prototype` é o objeto que será o `__proto__` dos objetos criados com `new B()`, ou seja, `b.__proto__ === B.prototype`.

Por sua vez, `B.prototype` tem sua própria propriedade `__proto__` que é igual a `A.prototype`. Juntos, isso forma o que chamamos de cadeia de protótipos:

```
b ->
 b.__proto__ === B.prototype ->
  B.prototype.__proto__ === A.prototype ->
   A.prototype.__proto__ === Object.prototype ->
    Object.prototype.__proto__ === null
```

Por meio dessa cadeia, `b` pode acessar todas as propriedades definidas em qualquer um desses objetos. O método `m` é uma propriedade de `B.prototype` — `B.prototype.m` — e é por isso que `b.m()` funciona.

Agora podemos definir `super.x` dentro de `m` como uma busca de propriedade onde começamos a procurar pela propriedade `x` no `__proto__` do *objeto home* e percorremos a cadeia de protótipos até encontrá-la.

O objeto home é o objeto onde o método é definido - neste caso, o objeto home para `m` é `B.prototype`. Seu `__proto__` é `A.prototype`, então é aí que começamos a procurar a propriedade `x`. Vamos chamar `A.prototype` de *objeto inicial de busca*. Neste caso, encontramos a propriedade `x` imediatamente no objeto inicial de busca, mas em geral ela pode estar em algum lugar mais acima na cadeia de protótipos.

Se `B.prototype` tivesse uma propriedade chamada `x`, nós a ignoraríamos, já que começamos a procurar por ela acima na cadeia de protótipos. Além disso, nesse caso, a busca pela propriedade super não depende do *receptor* - o objeto que é o valor de `this` ao chamar o método.

```javascript
B.prototype.m.call(some_other_object); // ainda retorna 100
```

Se a propriedade tiver um getter, no entanto, o receptor será passado para o getter como o valor de `this`.

Resumindo: em um acesso à propriedade super, `super.x`, o objeto inicial de busca é o `__proto__` do objeto home e o receptor é o receptor do método onde ocorre o acesso à propriedade super.

Em um acesso normal a propriedade, `o.x`, começamos procurando pela propriedade `x` em `o` e subimos a cadeia de protótipos. Também usamos `o` como receptor se `x` tiver um getter - o objeto inicial da busca e o receptor são o mesmo objeto (`o`).

*O acesso a propriedades com `super` funciona como um acesso regular, onde o objeto inicial da busca e o receptor são diferentes.*

### Implementando `super` mais rápido

A percepção acima também é a chave para implementar um acesso rápido a propriedades com `super`. O V8 já é projetado para tornar o acesso a propriedades rápido - agora o generalizamos para o caso em que o receptor e o objeto inicial da busca são diferentes.

O sistema de cache inline orientado a dados do V8 é a parte central para implementar acesso rápido a propriedades. Você pode ler sobre isso na [introdução de alto nível](https://mathiasbynens.be/notes/shapes-ics) vinculada acima, ou nas descrições mais detalhadas sobre [a representação de objetos do V8](https://v8.dev/blog/fast-properties) e [como o sistema de cache inline orientado a dados do V8 é implementado](https://docs.google.com/document/d/1mEhMn7dbaJv68lTAvzJRCQpImQoO6NZa61qRimVeA-k/edit?usp=sharing).

Para acelerar `super`, adicionamos um novo bytecode do [Ignition](https://v8.dev/docs/ignition), `LdaNamedPropertyFromSuper`, que nos permite conectar ao sistema IC no modo interpretado e também gerar código otimizado para acesso a propriedades com `super`.

Com o novo bytecode, podemos adicionar um novo IC, `LoadSuperIC`, para acelerar o carregamento de propriedades com `super`. Semelhante ao `LoadIC`, que lida com carregamentos normais de propriedades, o `LoadSuperIC` acompanha os formatos dos objetos iniciais de busca que viu e lembra como carregar propriedades de objetos que possuem um desses formatos.

O `LoadSuperIC` reutiliza a maquinaria existente do IC para carregamento de propriedades, apenas com um objeto inicial de busca diferente. Como a camada IC já distinguia entre o objeto inicial de busca e o receptor, a implementação deveria ter sido fácil. Mas como o objeto inicial de busca e o receptor eram sempre iguais, houve bugs onde usávamos o objeto inicial de busca mesmo quando queríamos dizer o receptor, e vice-versa. Esses bugs foram corrigidos e agora suportamos corretamente os casos onde o objeto inicial de busca e o receptor diferem.

O código otimizado para acesso a propriedades com `super` é gerado pela fase `JSNativeContextSpecialization` do compilador [TurboFan](https://v8.dev/docs/turbofan). A implementação generaliza a maquinaria existente de busca de propriedades ([`JSNativeContextSpecialization::ReduceNamedAccess`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-native-context-specialization.cc;l=1130)) para lidar com o caso em que o receptor e o objeto inicial de busca são diferentes.

O código otimizado ficou ainda mais eficiente quando movemos o objeto de origem (`home object`) do `JSFunction`, onde estava armazenado. Agora ele é armazenado no contexto da classe, o que faz com que o TurboFan o insira no código otimizado como uma constante sempre que possível.

## Outros usos de `super`

`super` dentro de métodos de literais de objetos funciona exatamente como dentro de métodos de classe, e é otimizado de forma semelhante.

```javascript
const myproto = {
  __proto__: { 'x': 100 },
  m() { return super.x; }
};
const o = { __proto__: myproto };
o.m(); // retorna 100
```

Obviamente, há casos extremos que não foram otimizados. Por exemplo, escrever propriedades com `super` (`super.x = ...`) não é otimizado. Além disso, usar mixins torna o ponto de acesso megamórfico, levando a um acesso mais lento a propriedades com `super`:

```javascript
function createMixin(base) {
  class Mixin extends base {
    m() { return super.m() + 1; }
    //                ^ este ponto de acesso é megamórfico
  }
  return Mixin;
}

class Base {
  m() { return 0; }
}

const myClass = createMixin(
  createMixin(
    createMixin(
      createMixin(
        createMixin(Base)
      )
    )
  )
);
(new myClass()).m();
```

Ainda há trabalho a ser feito para garantir que todos os padrões orientados a objetos sejam os mais rápidos possíveis - fique atento a futuras otimizações!
