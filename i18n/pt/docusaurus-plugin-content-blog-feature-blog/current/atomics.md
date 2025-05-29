---
title: 'Atomics.wait, Atomics.notify, Atomics.waitAsync'
author: '[Marja Hölttä](https://twitter.com/marjakh), uma blogueira não bloqueadora'
avatars:
  - marja-holtta
date: 2020-09-24
tags:
  - ECMAScript
  - ES2020
  - Node.js 16
description: 'Atomics.wait e Atomics.notify são primitivas de sincronização de baixo nível úteis para implementar, por exemplo, mutexes. Atomics.wait é utilizável apenas em threads de trabalhador. A versão 8.7 do V8 agora suporta uma versão não bloqueadora, Atomics.waitAsync, que também pode ser usada na thread principal.'
tweet: '1309118447377358848'
---
['Atomics.wait'](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) e ['Atomics.notify'](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) são primitivas de sincronização de baixo nível úteis para implementar mutexes e outros meios de sincronização. No entanto, como 'Atomics.wait' é bloqueador, não é possível chamá-lo na thread principal (tentar fazer isso dispara um 'TypeError').

<!--truncate-->
A partir da versão 8.7, o V8 suporta uma versão não bloqueadora, ['Atomics.waitAsync'](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md), que também pode ser usada na thread principal.

Neste post, explicamos como usar essas APIs de baixo nível para implementar um mutex que funciona de forma síncrona (para threads de trabalhador) e de forma assíncrona (para threads de trabalhador ou a thread principal).

'Atomics.wait' e 'Atomics.waitAsync' aceitam os seguintes parâmetros:

- 'buffer': uma 'Int32Array' ou 'BigInt64Array' respaldada por um 'SharedArrayBuffer'
- 'index': um índice válido dentro do array
- 'expectedValue': um valor que esperamos estar presente na localização de memória descrita por '(buffer, index)'
- 'timeout': um tempo limite em milissegundos (opcional, padrão é 'Infinity')

O valor retornado de 'Atomics.wait' é uma string. Se a localização de memória não contiver o valor esperado, 'Atomics.wait' retorna imediatamente com o valor 'não-igual'. Caso contrário, a thread fica bloqueada até que outra thread chame 'Atomics.notify' com a mesma localização de memória ou até que o tempo limite seja alcançado. No primeiro caso, 'Atomics.wait' retorna o valor 'ok', no último caso, retorna o valor 'tempo-esgotado'.

'Atomics.notify' aceita os seguintes parâmetros:

- uma 'Int32Array' ou 'BigInt64Array' respaldada por um 'SharedArrayBuffer'
- um índice (válido dentro do array)
- quantos esperadores notificar (opcional, padrão é 'Infinity')

Ele notifica a quantidade dada de esperadores, em ordem FIFO, esperando na localização de memória descrita por '(buffer, index)'. Se houver várias chamadas pendentes de 'Atomics.wait' ou 'Atomics.waitAsync' relacionadas à mesma localização, todas estão na mesma fila FIFO.

Ao contrário de 'Atomics.wait', 'Atomics.waitAsync' sempre retorna imediatamente. O valor retornado é um dos seguintes:

- '{ async: false, value: 'não-igual' }' (se a localização de memória não contiver o valor esperado)
- '{ async: false, value: 'tempo-esgotado' }' (apenas para tempo limite imediato 0)
- '{ async: true, value: promise }'

A promessa pode mais tarde ser resolvida com um valor string 'ok' (se 'Atomics.notify' foi chamado com a mesma localização de memória) ou 'tempo-esgotado' (se o tempo limite foi alcançado). A promessa nunca é rejeitada.

O exemplo a seguir demonstra o uso básico de 'Atomics.waitAsync':

```js
const sab = new SharedArrayBuffer(16);
const i32a = new Int32Array(sab);
const result = Atomics.waitAsync(i32a, 0, 0, 1000);
//                                     |  |  ^ tempo limite (opt)
//                                     |  ^ valor esperado
//                                     ^ índice

if (result.value === 'não-igual') {
  // O valor no SharedArrayBuffer não era o esperado.
} else {
  result.value instanceof Promise; // verdadeiro
  result.value.then(
    (value) => {
      if (value == 'ok') { /* notificado */ }
      else { /* valor é 'tempo-esgotado' */ }
    });
}

// Neste thread, ou em outro thread:
Atomics.notify(i32a, 0);
```

Em seguida, mostraremos como implementar um mutex que pode ser usado tanto de forma síncrona quanto de forma assíncrona. A implementação da versão síncrona do mutex foi discutida anteriormente, por exemplo [neste post do blog](https://blogtitle.github.io/using-javascript-sharedarraybuffers-and-atomics/).

No exemplo, não usamos o parâmetro timeout em 'Atomics.wait' e 'Atomics.waitAsync'. O parâmetro pode ser usado para implementar variáveis de condição com um tempo limite.

Nossa classe de mutex, 'AsyncLock', opera em um 'SharedArrayBuffer' e implementa os seguintes métodos:

- 'lock' — bloqueia a thread até que consigamos bloquear o mutex (usável apenas em threads de trabalhador)
- 'unlock' — desbloqueia o mutex (contraparte de 'lock')
- 'executeLocked(callback)' — bloqueio não bloqueador, pode ser usado pela thread principal; agenda 'callback' para ser executado assim que conseguirmos obter o bloqueio

Vamos ver como cada um desses pode ser implementado. A definição de classe inclui constantes e um construtor que recebe o `SharedArrayBuffer` como parâmetro.

```js
class AsyncLock {
  static INDEX = 0;
  static UNLOCKED = 0;
  static LOCKED = 1;

  constructor(sab) {
    this.sab = sab;
    this.i32a = new Int32Array(sab);
  }

  lock() {
    /* … */
  }

  unlock() {
    /* … */
  }

  executeLocked(f) {
    /* … */
  }
}
```

Aqui `i32a[0]` contém o valor `LOCKED` ou `UNLOCKED`. Também é a localização de espera para `Atomics.wait` e `Atomics.waitAsync`. A classe `AsyncLock` garante os seguintes invariantes:

1. Se `i32a[0] == LOCKED`, e uma thread começa a esperar (via `Atomics.wait` ou `Atomics.waitAsync`) em `i32a[0]`, ela eventualmente será notificada.
1. Após ser notificada, a thread tenta obter o lock. Se ela obtiver o lock, notificará novamente ao liberá-lo.

## Bloqueio e desbloqueio síncrono

A seguir mostramos o método de bloqueio `lock` que pode ser chamado apenas a partir de uma thread de trabalhador:

```js
lock() {
  while (true) {
    const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                        /* valor antigo >>> */  AsyncLock.UNLOCKED,
                        /* novo valor >>> */  AsyncLock.LOCKED);
    if (oldValue == AsyncLock.UNLOCKED) {
      return;
    }
    Atomics.wait(this.i32a, AsyncLock.INDEX,
                 AsyncLock.LOCKED); // <<< valor esperado no início
  }
}
```

Quando uma thread chama `lock()`, primeiro ela tenta obter o bloqueio usando `Atomics.compareExchange` para alterar o estado de bloqueio de `UNLOCKED` para `LOCKED`. `Atomics.compareExchange` tenta fazer a alteração de estado de maneira atômica e retorna o valor original do local de memória. Se o valor original era `UNLOCKED`, sabemos que a mudança de estado foi bem-sucedida, e a thread adquiriu o bloqueio. Nada mais é necessário.

Se `Atomics.compareExchange` não conseguir alterar o estado do bloqueio, outra thread deve estar segurando o bloqueio. Portanto, esta thread tenta `Atomics.wait` para aguardar que a outra thread libere o bloqueio. Se o local de memória ainda mantiver o valor esperado (neste caso, `AsyncLock.LOCKED`), chamar `Atomics.wait` bloqueará a thread e a chamada `Atomics.wait` retornará apenas quando outra thread chamar `Atomics.notify`.

O método `unlock` define o bloqueio para o estado `UNLOCKED` e chama `Atomics.notify` para acordar uma thread que estava esperando pelo bloqueio. Espera-se que a mudança de estado seja sempre bem-sucedida, já que esta thread está segurando o bloqueio e ninguém mais deve chamar `unlock()` nesse meio tempo.

```js
unlock() {
  const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                      /* valor antigo >>> */  AsyncLock.LOCKED,
                      /* novo valor >>> */  AsyncLock.UNLOCKED);
  if (oldValue != AsyncLock.LOCKED) {
    throw new Error('Tentativa de desbloquear sem estar segurando o mutex');
  }
  Atomics.notify(this.i32a, AsyncLock.INDEX, 1);
}
```

O caso direto funciona assim: o bloqueio está livre e a thread T1 o adquire alterando o estado de bloqueio com `Atomics.compareExchange`. A thread T2 tenta adquirir o bloqueio chamando `Atomics.compareExchange`, mas não consegue alterar o estado do bloqueio. T2 então chama `Atomics.wait`, que bloqueia a thread. Em algum momento T1 libera o bloqueio e chama `Atomics.notify`. Isso faz com que a chamada `Atomics.wait` em T2 retorne `'ok'`, acordando T2. T2 então tenta adquirir o bloqueio novamente e, desta vez, tem sucesso.

Também há dois possíveis casos de exceção — eles demonstram o motivo pelo qual `Atomics.wait` e `Atomics.waitAsync` verificam um valor específico no índice:

- T1 está segurando o bloqueio e T2 tenta obtê-lo. Primeiro, T2 tenta alterar o estado do bloqueio com `Atomics.compareExchange`, mas não tem sucesso. Mas então T1 libera o bloqueio antes que T2 consiga chamar `Atomics.wait`. Quando T2 chama `Atomics.wait`, ele retorna imediatamente com o valor `'not-equal'. Neste caso, T2 continua com a próxima iteração do loop, tentando adquirir o bloqueio novamente.
- T1 está segurando o bloqueio e T2 está aguardando por ele com `Atomics.wait`. T1 libera o bloqueio — T2 acorda (a chamada `Atomics.wait` retorna) e tenta fazer `Atomics.compareExchange` para adquirir o bloqueio, mas outra thread T3 foi mais rápida e já obteve o bloqueio. Assim, a chamada para `Atomics.compareExchange` falha em obter o bloqueio, e T2 chama `Atomics.wait` novamente, bloqueando até que T3 libere o bloqueio.

Por causa do último caso de exceção, o mutex não é “justo”. É possível que T2 esteja esperando que o bloqueio seja liberado, mas T3 o obtenha imediatamente. Uma implementação de bloqueio mais realista pode usar vários estados para diferenciar entre “bloqueado” e “bloqueado com contenção”.

## Bloqueio assíncrono

O método não bloqueante `executeLocked` pode ser chamado a partir da thread principal, diferentemente do método de bloqueio `lock`. Ele recebe uma função de callback como seu único parâmetro e agenda a execução do callback assim que ele tiver adquirido com sucesso o bloqueio.

```js
executeLocked(f) {
  const self = this;

  async function tryGetLock() {
    enquanto (true) {
      const oldValue = Atomics.compareExchange(self.i32a, AsyncLock.INDEX,
                          /* valor antigo >>> */  AsyncLock.UNLOCKED,
                          /* novo valor >>> */  AsyncLock.LOCKED);
      se (oldValue == AsyncLock.UNLOCKED) {
        f();
        self.unlock();
        retornar;
      }
      const result = Atomics.waitAsync(self.i32a, AsyncLock.INDEX,
                                       AsyncLock.LOCKED);
                                   //  ^ valor esperado no início
      await result.value;
    }
  }

  tryGetLock();
}
```

A função interna `tryGetLock` tenta primeiro obter o bloqueio com `Atomics.compareExchange`, como antes. Se isso mudar com sucesso o estado do bloqueio, ele pode executar o callback, desbloquear o bloqueio e retornar.

Se `Atomics.compareExchange` não conseguir obter o bloqueio, precisamos tentar novamente quando o bloqueio provavelmente estiver livre. Não podemos bloquear e esperar que o bloqueio fique livre — em vez disso, agendamos a nova tentativa usando `Atomics.waitAsync` e a Promessa que ele retorna.

Se conseguimos iniciar com sucesso `Atomics.waitAsync`, a Promessa retornada é resolvida quando o thread que mantém o bloqueio faz `Atomics.notify`. Em seguida, o thread que estava aguardando o bloqueio tenta obtê-lo novamente, como antes.

Os mesmos casos extremos (o bloqueio sendo liberado entre a chamada de `Atomics.compareExchange` e a chamada de `Atomics.waitAsync`, assim como o bloqueio sendo adquirido novamente entre a resolução da Promessa e a chamada de `Atomics.compareExchange`) também são possíveis na versão assíncrona, então o código precisa lidar com eles de forma robusta.

## Conclusão

Neste post, mostramos como usar as primitivas de sincronização `Atomics.wait`, `Atomics.waitAsync` e `Atomics.notify`, para implementar um mutex que pode ser usado tanto na thread principal quanto nas threads de trabalhador.

## Suporte a recursos

### `Atomics.wait` e `Atomics.notify`

<feature-support chrome="68"
                 firefox="78"
                 safari="não"
                 nodejs="8.10.0"
                 babel="não"></feature-support>

### `Atomics.waitAsync`

<feature-support chrome="87"
                 firefox="não"
                 safari="não"
                 nodejs="16"
                 babel="não"></feature-support>
