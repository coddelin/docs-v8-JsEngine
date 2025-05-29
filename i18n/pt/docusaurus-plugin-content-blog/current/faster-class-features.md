---
title: "Inicialização mais rápida de instâncias com novos recursos de classe"
author: "[Joyee Cheung](https://twitter.com/JoyeeCheung), inicializador de instâncias"
avatars: 
  - "joyee-cheung"
date: 2022-04-20
tags: 
  - internals
description: "As inicializações de instâncias com novos recursos de classe se tornaram mais rápidas desde o V8 v9.7."
tweet: "1517041137378373632"
---

Os campos de classe foram introduzidos no V8 desde a versão v7.2 e os métodos privados de classe foram incluídos desde a versão v8.4. Após as propostas alcançarem o estágio 4 em 2021, começou o trabalho de aprimorar o suporte aos novos recursos de classe no V8 - até então, havia dois principais problemas que impactavam sua adoção:

<!--truncate-->
1. A inicialização de campos de classe e métodos privados era muito mais lenta em comparação com a atribuição de propriedades comuns.
2. Os inicializadores de campos de classe estavam quebrados em [snapshots de inicialização](https://v8.dev/blog/custom-startup-snapshots) usados por sistemas como Node.js e Deno para agilizar sua própria inicialização ou a de aplicativos dos usuários.

O primeiro problema foi resolvido no V8 v9.7 e a solução do segundo problema foi liberada no V8 v10.0. Este post aborda como o primeiro problema foi resolvido. Para saber mais sobre a correção do problema de snapshot, confira [este post](https://joyeecheung.github.io/blog/2022/04/14/fixing-snapshot-support-of-class-fields-in-v8/).

## Otimizando campos de classe

Para eliminar a lacuna de desempenho entre a atribuição de propriedades comuns e a inicialização de campos de classe, atualizamos o sistema existente [cache em linha (IC)](https://mathiasbynens.be/notes/shapes-ics) para funcionar com os campos de classe. Antes da versão v9.7, o V8 sempre utilizava uma chamada de runtime onerosa para inicializações de campos de classe. Com a v9.7, quando o V8 considera o padrão da inicialização suficientemente previsível, ele utiliza um novo IC para agilizar a operação, semelhante ao que faz para atribuições de propriedades comuns.

![Desempenho das inicializações, otimizado](/_img/faster-class-features/class-fields-performance-optimized.svg)

![Desempenho das inicializações, interpretado](/_img/faster-class-features/class-fields-performance-interpreted.svg)

### A implementação original dos campos de classe

Para implementar campos privados, o V8 utiliza símbolos privados internos &mdash; eles são uma estrutura de dados interna do V8 semelhante aos `Symbol`s padrão, mas não são enumeráveis quando usados como chave de propriedade. Considere esta classe como exemplo:


```js
class A {
  #a = 0;
  b = this.#a;
}
```

O V8 coletaria os inicializadores de campos de classe (`#a = 0` e `b = this.#a`) e geraria uma função sintética de membro de instância com os inicializadores como o corpo da função. O bytecode gerado para esta função sintética costumava ser algo como:

```cpp
// Carregar o símbolo de nome privado para `#a` em r1
LdaImmutableCurrentContextSlot [2]
Star r1

// Carregar 0 em r2
LdaZero
Star r2

// Mover o alvo para r0
Mov <this>, r0

// Usar a função de runtime %AddPrivateField() para armazenar 0 como o valor da
// propriedade com chave pelo símbolo de nome privado `#a` na instância,
// ou seja, `#a = 0`.
CallRuntime [AddPrivateField], r0-r2

// Carregar o nome da propriedade `b` em r1
LdaConstant [0]
Star r1

// Carregar o símbolo de nome privado para `#a`
LdaImmutableCurrentContextSlot [2]

// Carregar o valor da propriedade com chave por `#a` da instância em r2
LdaKeyedProperty <this>, [0]
Star r2

// Mover o alvo para r0
Mov <this>, r0

// Usar a função de runtime %CreateDataProperty() para armazenar a propriedade com chave
// por `#a` como valor da propriedade com chave por `b`, ou seja, `b = this.#a`
CallRuntime [CreateDataProperty], r0-r2
```

Compare a classe no trecho anterior com uma classe como esta:

```js
class A {
  constructor() {
    this._a = 0;
    this.b = this._a;
  }
}
```

Tecnicamente, essas duas classes não são equivalentes, mesmo ignorando a diferença de visibilidade entre `this.#a` e `this._a`. A especificação exige semântica de "definição" em vez de semântica de "atribuição". Ou seja, a inicialização de campos de classe não aciona setters ou armadilhas de `set` do Proxy. Portanto, uma aproximação da primeira classe deveria usar `Object.defineProperty()` em vez de simples atribuições para inicializar as propriedades. Além disso, deveria lançar um erro se o campo privado já existisse na instância (caso o alvo sendo inicializado seja substituído no construtor base por outra instância):

```js
class A {
  constructor() {
    // O que a chamada %AddPrivateField() traduz aproximadamente:
    const _a = %PrivateSymbol('#a')
    if (_a in this) {
      throw TypeError('Não é possível inicializar #a duas vezes no mesmo objeto');
    }
    Object.defineProperty(this, _a, {
      writable: true,
      configurable: false,
      enumerable: false,
      value: 0
    });
    // O que a chamada %CreateDataProperty() traduz aproximadamente:
    Object.defineProperty(this, 'b', {
      writable: true,
      configurable: true,
      enumerable: true,
      value: this[_a]
    });
  }
}
```

Para implementar a semântica especificada antes da proposta ser finalizada, o V8 usava chamadas para funções de runtime, já que elas são mais flexíveis. Conforme mostrado no bytecode acima, a inicialização de campos públicos foi implementada com chamadas de runtime `%CreateDataProperty()`, enquanto a inicialização de campos privados foi implementada com `%AddPrivateField()`. Como chamar funções de runtime gera um overhead significativo, a inicialização de campos de classe era muito mais lenta em comparação à atribuição de propriedades normais de objetos.

Na maioria dos casos de uso, entretanto, as diferenças semânticas são insignificantes. Seria bom ter o desempenho das atribuições otimizadas de propriedades nesses casos &mdash; então uma implementação mais otimizada foi criada após a proposta ser finalizada.

### Otimizando campos privados de classe e campos públicos computados de classe

Para acelerar a inicialização de campos privados de classe e campos públicos computados de classe, a implementação introduziu uma nova estrutura para se integrar ao [sistema de cache inline (IC)](https://mathiasbynens.be/notes/shapes-ics) ao lidar com essas operações. Essa nova estrutura é composta por três partes colaborativas:

- No gerador de bytecode, um novo bytecode `DefineKeyedOwnProperty`. Ele é emitido ao gerar código para os nós AST `ClassLiteral::Property` que representam inicializadores de campos de classe.
- No TurboFan JIT, um opcode IR correspondente `JSDefineKeyedOwnProperty`, que pode ser compilado a partir do novo bytecode.
- No sistema IC, um novo `DefineKeyedOwnIC`, que é usado no interpretador para lidar com o novo bytecode, bem como no código compilado a partir do novo opcode IR. Para simplificar a implementação, o novo IC reutiliza parte do código de `KeyedStoreIC`, que foi projetado para armazenamentos de propriedades normais.

Agora, quando o V8 encontra esta classe:

```js
class A {
  #a = 0;
}
```

Ele gera o seguinte bytecode para o inicializador `#a = 0`:

```cpp
// Carregar o símbolo de nome privado para `#a` em r1
LdaImmutableCurrentContextSlot [2]
Star0

// Usar o bytecode DefineKeyedOwnProperty para armazenar 0 como o valor da
// propriedade identificada pelo símbolo de nome privado `#a` na instância,
// ou seja, `#a = 0`.
LdaZero
DefineKeyedOwnProperty <this>, r0, [0]
```

Quando o inicializador é executado vezes suficientes, o V8 aloca um [slot de vetor de feedback](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8) para cada campo sendo inicializado. O slot contém a chave do campo sendo adicionado (no caso do campo privado, o símbolo de nome privado) e um par de [classes ocultas](https://v8.dev/docs/hidden-classes) entre as quais a instância foi transitando como resultado da inicialização do campo. Em inicializações subsequentes, o IC usa o feedback para verificar se os campos são inicializados na mesma ordem em instâncias com as mesmas classes ocultas. Se a inicialização corresponde ao padrão que o V8 já viu antes (o que geralmente acontece), o V8 escolhe o caminho rápido e realiza a inicialização com código pré-gerado em vez de chamar o runtime, acelerando a operação. Se a inicialização não corresponde a um padrão que o V8 já viu antes, ele recorre a uma chamada de runtime para lidar com os casos menos eficientes.

### Otimizando campos públicos de classe nomeados

Para acelerar a inicialização de campos públicos de classe nomeados, reutilizamos o bytecode `DefineNamedOwnProperty` existente, que chama `DefineNamedOwnIC`, seja no interpretador ou através do código compilado do opcode IR `JSDefineNamedOwnProperty`.

Agora, quando o V8 encontra esta classe:

```js
class A {
  #a = 0;
  b = this.#a;
}
```

Ele gera o seguinte bytecode para o inicializador `b = this.#a`:

```cpp
// Carregar o símbolo de nome privado para `#a`
LdaImmutableCurrentContextSlot [2]

// Carregar o valor da propriedade identificada por `#a` da instância em r2
// Nota: LdaKeyedProperty foi renomeado para GetKeyedProperty na refatoração
GetKeyedProperty <this>, [2]

// Usar o bytecode DefineNamedOwnProperty para armazenar o valor da propriedade identificada
// por `#a` como o valor da propriedade identificada por `b`, ou seja, `b = this.#a;`
DefineNamedOwnProperty <this>, [0], [4]
```

A estrutura original `DefineNamedOwnIC` não podia ser simplesmente inserida no tratamento de campos públicos nomeados de classe, já que originalmente foi projetada apenas para inicialização de literais de objetos. Anteriormente, ela esperava que o alvo sendo inicializado fosse um objeto que ainda não havia sido modificado pelo usuário desde sua criação, o que era sempre verdade para literais de objetos, mas os campos das classes podem ser inicializados em objetos definidos pelo usuário quando a classe estende uma classe base cujo construtor substitui o alvo:

```js
class A {
  constructor() {
    return new Proxy(
      { a: 1 },
      {
        defineProperty(object, key, desc) {
          console.log('object:', object);
          console.log('key:', key);
          console.log('desc:', desc);
          return true;
        }
      });
  }
}

class B extends A {
  a = 2;
  #b = 3;  // Não observável.
}

// objeto: { a: 1 },
// chave: 'a',
// desc: {value: 2, writable: true, enumerable: true, configurable: true}
new B();
```

Para lidar com esses alvos, ajustamos o IC para recorrer ao tempo de execução quando percebe que o objeto sendo inicializado é um proxy, se o campo sendo definido já existe no objeto, ou se o objeto tem apenas uma classe oculta que o IC ainda não viu antes. Ainda é possível otimizar os casos extremos se eles se tornarem comuns o suficiente, mas até agora parece melhor trocar o desempenho deles pela simplicidade da implementação.

## Otimizando métodos privados

### A implementação de métodos privados

Na [especificação](https://tc39.es/ecma262/#sec-privatemethodoraccessoradd), os métodos privados são descritos como se estivessem instalados nas instâncias, mas não na classe. No entanto, para economizar memória, a implementação do V8 armazena os métodos privados juntamente com um símbolo de marca privada em um contexto associado à classe. Quando o construtor é invocado, o V8 armazena apenas uma referência a esse contexto na instância, com o símbolo de marca privada como chave.

![Avaliação e instanciação de classes com métodos privados](/_img/faster-class-features/class-evaluation-and-instantiation.svg)

Quando os métodos privados são acessados, o V8 percorre a cadeia de contexto começando pelo contexto de execução para encontrar o contexto da classe, lê um slot conhecido estaticamente desse contexto para obter o símbolo de marca privada da classe, e então verifica se a instância tem uma propriedade chaveada por esse símbolo de marca para ver se a instância foi criada a partir dessa classe. Se a verificação da marca passar, o V8 carrega o método privado de outro slot conhecido no mesmo contexto e finaliza o acesso.

![Acesso a métodos privados](/_img/faster-class-features/access-private-methods.svg)

Veja este trecho de código como exemplo:

```js
class A {
  #a() {}
}
```

O V8 costumava gerar o seguinte bytecode para o construtor de `A`:

```cpp
// Carrega o símbolo de marca privada para a classe A do contexto
// e o armazena em r1.
LdaImmutableCurrentContextSlot [3]
Star r1

// Carrega o alvo em r0.
Mov <this>, r0
// Carrega o contexto atual em r2.
Mov <context>, r2
// Chama a função de runtime %AddPrivateBrand() para armazenar o contexto na
// instância com a marca privada como chave.
CallRuntime [AddPrivateBrand], r0-r2
```

Como também havia uma chamada para a função de runtime `%AddPrivateBrand()`, a sobrecarga tornava o construtor muito mais lento do que os construtores de classes com apenas métodos públicos.

### Otimizando a inicialização de marcas privadas

Para acelerar a instalação das marcas privadas, na maioria dos casos apenas reutilizamos a maquinaria `DefineKeyedOwnProperty` adicionada para a otimização de campos privados:

```cpp
// Carrega o símbolo de marca privada para a classe A do contexto
// e o armazena em r1
LdaImmutableCurrentContextSlot [3]
Star0

// Usa o bytecode DefineKeyedOwnProperty para armazenar o
// contexto na instância com a marca privada como chave
Ldar <context>
DefineKeyedOwnProperty <this>, r0, [0]
```

![Desempenho das inicializações de instância de classes com diferentes métodos](/_img/faster-class-features/private-methods-performance.svg)

Há, no entanto, uma ressalva: se a classe for uma classe derivada cujo construtor chama `super()`, a inicialização dos métodos privados - e, no nosso caso, a instalação do símbolo de marca privada - deve acontecer após o `super()` retornar:

```js
class A {
  constructor() {
    // Isso lança um erro numa chamada de new B() porque super() ainda não retornou.
    this.callMethod();
  }
}

class B extends A {
  #method() {}
  callMethod() { return this.#method(); }
  constructor(o) {
    super();
  }
};
```

Como descrito anteriormente, ao inicializar a marca, o V8 também armazena uma referência ao contexto da classe na instância. Essa referência não é usada em verificações de marca, mas é destinada ao debugger para recuperar uma lista de métodos privados da instância sem saber de qual classe ela foi construída. Quando `super()` é invocado diretamente no construtor, o V8 pode simplesmente carregar o contexto do registrador de contexto (o que `Mov <context>, r2` ou `Ldar <context>` nos bytecodes acima faz) para realizar a inicialização, mas `super()` também pode ser invocado de uma função arrow aninhada, que, por sua vez, pode ser invocada de um contexto diferente. Nesse caso, o V8 recorre a uma função de runtime (ainda chamada `%AddPrivateBrand()`) para procurar o contexto da classe na cadeia de contexto em vez de depender do registrador de contexto. Por exemplo, para a função `callSuper` abaixo:

```js
class A extends class {} {
  #method() {}
  constructor(run) {
    const callSuper = () => super();
    // ...realiza algo
    run(callSuper)
  }
};

new A((fn) => fn());
```

Agora o V8 gera o seguinte bytecode:

```cpp
// Invoca o construtor super para construir a instância
// e a armazena em r3.
...

// Carrega o símbolo de marca privada do contexto da classe
// na profundidade 1 do contexto atual e o armazena em r4
LdaImmutableContextSlot <context>, [3], [1]
Star4

// Carrega a profundidade 1 como um Smi em r6
LdaSmi [1]
Star6

// Carrega o contexto atual em r5
Mov <context>, r5

// Usa o %AddPrivateBrand() para localizar o contexto da classe
// na profundidade 1 a partir do contexto atual e armazena-o na instância
// com o símbolo de marca privada como chave
CallRuntime [AddPrivateBrand], r3-r6
```

Neste caso, o custo da chamada em tempo de execução retorna, então inicializar instâncias desta classe ainda será mais lento em comparação com a inicialização de instâncias de classes com apenas métodos públicos. É possível usar um bytecode dedicado para implementar o que `%AddPrivateBrand()` faz, mas como invocar `super()` em uma função flecha aninhada é bastante raro, novamente trocamos o desempenho pela simplicidade da implementação.

## Notas finais

O trabalho mencionado neste post de blog também está incluído no [lançamento do Node.js 18.0.0](https://nodejs.org/en/blog/announcements/v18-release-announce/). Anteriormente, o Node.js mudou para propriedades de símbolo em algumas classes internas que estavam usando campos privados para incluí-las no snapshot de bootstrap embutido, bem como para melhorar o desempenho dos construtores (veja [este post de blog](https://www.nearform.com/blog/node-js-and-the-struggles-of-being-an-eventtarget/) para mais contexto). Com o suporte aprimorado de recursos de classe no V8, o Node.js [retornou aos campos privados de classe](https://github.com/nodejs/node/pull/42361) nessas classes, e os benchmarks do Node.js mostraram que [essas mudanças não introduziram nenhuma regressão de desempenho](https://github.com/nodejs/node/pull/42361#issuecomment-1068961385).

Obrigado à Igalia e Bloomberg por contribuírem com essa implementação!
