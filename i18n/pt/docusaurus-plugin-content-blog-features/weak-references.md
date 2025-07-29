---
title: "Referências fracas e finalizadores"
author: "Sathya Gunasekaran ([@_gsathya](https://twitter.com/_gsathya)), Mathias Bynens ([@mathias](https://twitter.com/mathias)), Shu-yu Guo ([@_shu](https://twitter.com/_shu)), e Leszek Swirski ([@leszekswirski](https://twitter.com/leszekswirski))"
avatars: 
- "sathya-gunasekaran"
- "mathias-bynens"
- "shu-yu-guo"
- "leszek-swirski"
date: 2019-07-09
updated: 2020-06-19
tags: 
  - ECMAScript
  - ES2021
  - io19
  - Node.js 14
description: "Referências fracas e finalizadores estão chegando ao JavaScript! Este artigo explica as novas funcionalidades."
tweet: "1148603966848151553"
---
Geralmente, referências a objetos são _fortemente mantidas_ no JavaScript, o que significa que enquanto você tiver uma referência ao objeto, ele não será coletado pelo garbage collector.

```js
const ref = { x: 42, y: 51 };
// Enquanto você tiver acesso a `ref` (ou qualquer outra referência ao
// mesmo objeto), o objeto não será coletado pelo garbage collector.
```

Atualmente, `WeakMap`s e `WeakSet`s são a única maneira de referenciar um objeto de forma quase fraca no JavaScript: adicionar um objeto como chave a um `WeakMap` ou `WeakSet` não impede que ele seja coletado pelo garbage collector.

```js
const wm = new WeakMap();
{
  const ref = {};
  const metaData = 'foo';
  wm.set(ref, metaData);
  wm.get(ref);
  // → metaData
}
// Não temos mais uma referência a `ref` neste escopo de bloco, então ele
// pode ser coletado pelo garbage collector agora, mesmo que seja uma chave no `wm`
// ao qual ainda temos acesso.

<!--truncate-->
const ws = new WeakSet();
{
  const ref = {};
  ws.add(ref);
  ws.has(ref);
  // → true
}
// Não temos mais uma referência a `ref` neste escopo de bloco, então ele
// pode ser coletado pelo garbage collector agora, mesmo que seja uma chave no `ws`
// ao qual ainda temos acesso.
```

:::note
**Nota:** Você pode pensar em `WeakMap.prototype.set(ref, metaData)` como adicionar uma propriedade com o valor `metaData` ao objeto `ref`: enquanto você tiver uma referência ao objeto, consegue acessar os metadados. Quando você não tiver mais uma referência ao objeto, ele pode ser coletado pelo garbage collector, mesmo que você ainda tenha uma referência ao `WeakMap` ao qual foi adicionado. Da mesma forma, você pode pensar em um `WeakSet` como um caso especial de `WeakMap` onde todos os valores são booleanos.

Um `WeakMap` do JavaScript não é realmente _fraco_: ele realmente se refere _fortemente_ ao seu conteúdo enquanto a chave estiver viva. O `WeakMap` só se refere fracamente ao seu conteúdo depois que a chave é coletada pelo garbage collector. Um nome mais preciso para esse tipo de relação é [_ephemeron_](https://en.wikipedia.org/wiki/Ephemeron).
:::

`WeakRef` é uma API mais avançada que fornece referências _realmente_ fracas, permitindo uma janela para o tempo de vida de um objeto. Vamos analisar um exemplo juntos.

Para o exemplo, suponha que estamos trabalhando em um aplicativo web de chat que usa web sockets para se comunicar com um servidor. Imagine uma classe `MovingAvg` que, para fins de diagnóstico de desempenho, mantém um conjunto de eventos de um web socket para calcular uma média móvel simples da latência.

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener('message', this.listener);
  }

  compute(n) {
    // Calcula a média móvel simples para os últimos n eventos.
    // …
  }
}
```

Ela é usada por uma classe `MovingAvgComponent` que permite controlar quando começar e parar de monitorar a média móvel simples da latência.

```js
class MovingAvgComponent {
  constructor(socket) {
    this.socket = socket;
  }

  start() {
    this.movingAvg = new MovingAvg(this.socket);
  }

  stop() {
    // Permitir que o garbage collector recupere memória.
    this.movingAvg = null;
  }

  render() {
    // Faz a renderização.
    // …
  }
}
```

Sabemos que manter todas as mensagens do servidor dentro de uma instância `MovingAvg` consome muita memória, então nos preocupamos em definir `this.movingAvg` como null ao parar o monitoramento para permitir que o garbage collector recupere memória.

No entanto, após verificar o painel de memória no DevTools, descobrimos que a memória não estava sendo recuperada de forma alguma! O desenvolvedor web experiente pode já ter identificado o erro: listeners de eventos são referências fortes e devem ser explicitamente removidos.

Vamos tornar isso explícito com diagramas de alcance. Após chamar `start()`, nosso grafo de objetos tem a seguinte aparência, onde uma seta sólida significa uma referência forte. Tudo acessível por meio de setas sólidas a partir da instância `MovingAvgComponent` não é coletável pelo garbage collector.

![](/_img/weakrefs/after-start.svg)

Depois de chamar `stop()`, removemos a referência forte da instância `MovingAvgComponent` para a instância `MovingAvg`, mas não via o listener do socket.

![](/_img/weakrefs/after-stop.svg)

Assim, o listener nas instâncias `MovingAvg`, ao referenciar `this`, mantém toda a instância viva enquanto o listener de eventos não for removido.

Até agora, a solução é desregistrar manualmente o ouvinte de eventos usando um método `dispose`.

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener('message', this.listener);
  }

  dispose() {
    this.socket.removeEventListener('message', this.listener);
  }

  // …
}
```

A desvantagem dessa abordagem é que é uma gestão manual de memória. `MovingAvgComponent`, e todos os outros usuários da classe `MovingAvg`, devem lembrar-se de chamar `dispose` ou sofrer vazamentos de memória. O que é pior, a gestão manual de memória é em cascata: os usuários de `MovingAvgComponent` devem lembrar-se de chamar `stop` ou sofrer vazamentos de memória, e assim por diante. O comportamento da aplicação não depende do ouvinte de eventos dessa classe de diagnóstico, e o ouvinte é caro em termos de uso de memória, mas não de computação. O que realmente queremos é que o tempo de vida do ouvinte esteja logicamente vinculado à instância de `MovingAvg`, para que `MovingAvg` possa ser usado como qualquer outro objeto JavaScript cuja memória é automaticamente recuperada pelo coletor de lixo.

`WeakRef`s tornam possível resolver o dilema criando uma _referência fraca_ ao ouvinte de eventos atual, e então encapsulando esse `WeakRef` em um ouvinte de eventos externo. Dessa forma, o coletor de lixo pode limpar o ouvinte de eventos atual e a memória que ele mantém viva, como a instância `MovingAvg` e seu array `events`.

```js
function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener);
  const wrapper = (ev) => { weakRef.deref()?.(ev); };
  socket.addEventListener('message', wrapper);
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); };
    addWeakListener(socket, this.listener);
  }
}
```

:::note
**Nota:** `WeakRef`s para funções devem ser tratados com cautela. Funções em JavaScript são [closures](https://en.wikipedia.org/wiki/Closure_(computer_programming)) e fazem referência forte aos ambientes externos que contêm os valores das variáveis livres referenciadas dentro dessas funções. Esses ambientes externos podem conter variáveis que _outros_ closures também referenciam. Ou seja, ao lidar com closures, a memória delas frequentemente é referenciada fortemente por outros closures de maneiras sutis. Por isso, `addWeakListener` é uma função separada e `wrapper` não é local para o construtor de `MovingAvg`. No V8, se `wrapper` fosse local ao construtor de `MovingAvg` e compartilhasse o escopo léxico com o ouvinte encapsulado em `WeakRef`, a instância de `MovingAvg` e todas suas propriedades se tornariam acessíveis via o ambiente compartilhado do ouvinte wrapper, fazendo com que a instância não fosse recolhida. Tenha isso em mente ao escrever código.
:::

Primeiro, criamos o ouvinte de eventos e o atribuimos a `this.listener`, de forma que seja referenciado fortemente pela instância de `MovingAvg`. Em outras palavras, enquanto a instância de `MovingAvg` está viva, o ouvinte de eventos também estará.

Em seguida, em `addWeakListener`, criamos um `WeakRef` cujo _alvo_ é o ouvinte de eventos atual. Dentro de `wrapper`, fazemos `deref`. Como `WeakRef`s não impedem a coleta de lixo de seus alvos caso os alvos não tenham outras referências fortes, devemos desreferenciá-los manualmente para obter o alvo. Se o alvo foi coletado pelo coletor de lixo nesse meio tempo, `deref` retorna `undefined`. Caso contrário, o alvo original é retornado, que é a função `listener` que chamamos utilizando [encadeamento opcional](/features/optional-chaining).

Já que o ouvinte de eventos está encapsulado em um `WeakRef`, a _única_ referência forte a ele é a propriedade `listener` na instância de `MovingAvg`. Ou seja, conseguimos vincular com sucesso o tempo de vida do ouvinte de eventos ao tempo de vida da instância de `MovingAvg`.

Voltando aos diagramas de alcance, nosso grafo de objetos parece o seguinte após chamar `start()` com a implementação de `WeakRef`, onde uma seta pontilhada significa uma referência fraca.

![](/_img/weakrefs/weak-after-start.svg)

Após chamar `stop()`, removemos a única referência forte ao ouvinte:

![](/_img/weakrefs/weak-after-stop.svg)

Eventualmente, após ocorrer uma coleta de lixo, a instância de `MovingAvg` e o ouvinte serão recolhidos:

![](/_img/weakrefs/weak-after-gc.svg)

Mas ainda há um problema aqui: adicionamos um nível de indireção a `listener` encapsulando-o em um `WeakRef`, mas o wrapper em `addWeakListener` ainda está vazando pelo mesmo motivo de que `listener` estava vazando originalmente. Certamente, isso é um vazamento menor, já que apenas o wrapper está vazando ao invés de toda a instância de `MovingAvg`, mas ainda assim é um vazamento. A solução para isso é o recurso complementar ao `WeakRef`, `FinalizationRegistry`. Com a nova API `FinalizationRegistry`, podemos registrar um callback para ser executado quando o coletor de lixo limpar um objeto registrado. Esses callbacks são conhecidos como _finalizadores_.

:::note
**Nota:** O callback de finalização não é executado imediatamente após a coleta de lixo do listener de eventos, por isso, não o use para lógica ou métricas importantes. O momento da coleta de lixo e dos callbacks de finalização é indefinido. Na verdade, um motor que nunca realiza coleta de lixo estaria totalmente em conformidade. No entanto, é seguro presumir que os motores _vão_ realizar coleta de lixo, e os callbacks de finalização serão chamados em algum momento posterior, a menos que o ambiente seja descartado (como o fechamento da aba ou a finalização de um worker). Tenha essa incerteza em mente ao escrever código.
:::

Podemos registrar um callback com um `FinalizationRegistry` para remover o `wrapper` do socket quando o listener de eventos interno tiver sido coletado pelo lixo. Nossa implementação final parece assim:

```js
const gListenersRegistry = new FinalizationRegistry(({ socket, wrapper }) => {
  socket.removeEventListener('message', wrapper); // 6
});

function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener); // 2
  const wrapper = (ev) => { weakRef.deref()?.(ev); }; // 3
  gListenersRegistry.register(listener, { socket, wrapper }); // 4
  socket.addEventListener('message', wrapper); // 5
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); }; // 1
    addWeakListener(socket, this.listener);
  }
}
```

:::note
**Nota:** `gListenersRegistry` é uma variável global para garantir que os finalizadores sejam executados. Um `FinalizationRegistry` não é mantido ativo por objetos registrados nele. Se o registro em si for coletado pelo lixo, o finalizador pode não ser executado.
:::

Criamos um listener de eventos e o atribuímos a `this.listener` para que ele seja fortemente referenciado pela instância de `MovingAvg` (1). Depois, encapsulamos o listener de eventos que realiza o trabalho em um `WeakRef` para torná-lo coletável pelo lixo, e para não vazar sua referência para a instância de `MovingAvg` via `this` (2). Criamos um wrapper que usa `deref` no `WeakRef` para verificar se ainda está vivo e, se estiver, chamá-lo (3). Registramos o listener interno no `FinalizationRegistry`, passando um _valor de suporte_ `{ socket, wrapper }` para o registro (4). Em seguida, adicionamos o wrapper retornado como um listener de evento no `socket` (5). Algum tempo depois que a instância de `MovingAvg` e o listener interno forem coletados pelo lixo, o finalizador pode ser executado, com o valor de suporte passado para ele. Dentro do finalizador, também removemos o wrapper, tornando toda a memória associada ao uso de uma instância de `MovingAvg` coletável pelo lixo (6).

Com tudo isso, nossa implementação original de `MovingAvgComponent` não vaza memória nem exige qualquer tipo de descarte manual.

## Não exagere

Após ouvir sobre essas novas capacidades, pode ser tentador usar `WeakRef` Em Tudo™. No entanto, isso provavelmente não é uma boa ideia. Algumas coisas são explicitamente _não_ bons casos de uso para `WeakRef`s e finalizadores.

Em geral, evite escrever código que dependa do coletor de lixo limpar um `WeakRef` ou chamar um finalizador em um momento previsível — [isso não é possível](https://github.com/tc39/proposal-weakrefs#a-note-of-caution)! Além disso, se um objeto é coletável pelo lixo ou não pode depender de detalhes de implementação, como a representação de closures, que são tanto sutis quanto podem variar entre mecanismos de JavaScript e até mesmo entre diferentes versões do mesmo mecanismo. Especificamente, os callbacks de finalização:

- Podem não acontecer imediatamente após a coleta de lixo.
- Podem não ocorrer na mesma ordem da coleta de lixo real.
- Podem não acontecer de forma alguma, por exemplo, se a janela do navegador for fechada.

Portanto, não coloque lógica importante no caminho de código de um finalizador. Eles são úteis para realizar a limpeza em resposta à coleta de lixo, mas você não pode usá-los de forma confiável para, por exemplo, registrar métricas significativas sobre o uso de memória. Para esse caso de uso, veja [`performance.measureUserAgentSpecificMemory`](https://web.dev/monitor-total-page-memory-usage/).

`WeakRef`s e finalizadores podem ajudar você a economizar memória, e funcionam melhor quando usados com moderação como um meio de aprimoramento progressivo. Como são recursos avançados, esperamos que a maior parte do uso aconteça dentro de frameworks ou bibliotecas.

## Suporte a `WeakRef`

<feature-support chrome="74 https://v8.dev/blog/v8-release-84#weak-references-and-finalizers"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1561074"
                 safari="no"
                 nodejs="14.6.0"
                 babel="no"></feature-support>
