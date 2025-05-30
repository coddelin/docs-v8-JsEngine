---
title: "Funções assíncronas mais rápidas e promessas"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), sempre antecipando, e Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), profissional em desempenho de promessas"
avatars: 
  - "maya-armyanova"
  - "benedikt-meurer"
date: "2018-11-12 16:45:07"
tags: 
  - ECMAScript
  - benchmarks
  - apresentações
description: "Funções assíncronas mais rápidas e mais fáceis de depurar e promessas estão chegando ao V8 v7.2 / Chrome 72."
tweet: "1062000102909169670"
---
O processamento assíncrono em JavaScript tradicionalmente tinha a reputação de não ser particularmente rápido. Para piorar, depurar aplicativos JavaScript ao vivo — especialmente servidores Node.js — não é uma tarefa fácil, _especialmente_ quando se trata de programação assíncrona. Felizmente os tempos estão mudando. Este artigo explora como otimizamos funções assíncronas e promessas no V8 (e até certo ponto em outros motores JavaScript também), e descreve como melhoramos a experiência de depuração para código assíncrono.

<!--truncate-->
:::note
**Nota:** Se você prefere assistir a uma apresentação ao invés de ler artigos, aproveite o vídeo abaixo! Caso contrário, ignore o vídeo e continue lendo.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/DFP5DKDQfOc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

## Uma nova abordagem para programação assíncrona

### De callbacks a promessas às funções assíncronas

Antes das promessas fazerem parte da linguagem JavaScript, APIs baseadas em callbacks eram comumente usadas para código assíncrono, especialmente no Node.js. Aqui está um exemplo:

```js
function handler(done) {
  validateParams((error) => {
    if (error) return done(error);
    dbQuery((error, dbResults) => {
      if (error) return done(error);
      serviceCall(dbResults, (error, serviceResults) => {
        console.log(result);
        done(error, serviceResults);
      });
    });
  });
}
```

O padrão específico de usar callbacks profundamente aninhados dessa maneira é comumente chamado de _“inferno de callbacks”_, porque torna o código menos legível e difícil de manter.

Felizmente, agora que as promessas fazem parte da linguagem JavaScript, o mesmo código pode ser escrito de uma maneira mais elegante e fácil de manter:

```js
function handler() {
  return validateParams()
    .then(dbQuery)
    .then(serviceCall)
    .then(result => {
      console.log(result);
      return result;
    });
}
```

Mais recentemente, o JavaScript ganhou suporte para [funções assíncronas](https://web.dev/articles/async-functions). O código assíncrono acima agora pode ser escrito de uma maneira que se assemelha muito ao código síncrono:

```js
async function handler() {
  await validateParams();
  const dbResults = await dbQuery();
  const results = await serviceCall(dbResults);
  console.log(results);
  return results;
}
```

Com funções assíncronas, o código se torna mais conciso, e o fluxo de controle e dados é muito mais fácil de seguir, apesar do fato de que a execução ainda é assíncrona. (Note que a execução do JavaScript ainda ocorre em um único thread, ou seja, funções assíncronas não acabam criando threads físicos por si mesmas.)

### De callbacks de listeners de eventos para iteração assíncrona

Outro paradigma assíncrono que é especialmente comum no Node.js é o de [`ReadableStream`s](https://nodejs.org/api/stream.html#stream_readable_streams). Aqui está um exemplo:

```js
const http = require('http');

http.createServer((req, res) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    res.write(body);
    res.end();
  });
}).listen(1337);
```

Este código pode ser um pouco difícil de seguir: os dados recebidos são processados em partes que só estão acessíveis dentro dos callbacks, e o sinal de fim de fluxo também ocorre dentro de um callback. É fácil introduzir bugs aqui quando você não percebe que a função termina imediatamente e que o processamento real tem que acontecer nos callbacks.

Felizmente, um novo recurso interessante do ES2018 chamado [iteração assíncrona](http://2ality.com/2016/10/asynchronous-iteration.html) pode simplificar este código:

```js
const http = require('http');

http.createServer(async (req, res) => {
  try {
    let body = '';
    req.setEncoding('utf8');
    for await (const chunk of req) {
      body += chunk;
    }
    res.write(body);
    res.end();
  } catch {
    res.statusCode = 500;
    res.end();
  }
}).listen(1337);
```

Em vez de colocar a lógica que lida com o processamento real da solicitação em dois callbacks diferentes — o `'data'` e o callback `'end'` — podemos agora colocar tudo em um único função assíncrona e usar o novo loop `for await…of` para iterar sobre as partes de forma assíncrona. Também adicionamos um bloco `try-catch` para evitar o problema de `unhandledRejection`[^1].

[^1]: Obrigado a [Matteo Collina](https://twitter.com/matteocollina) por nos direcionar a [este problema](https://github.com/mcollina/make-promises-safe/blob/master/README.md#the-unhandledrejection-problem).

Você já pode usar esses novos recursos em produção hoje! Funções assíncronas são **totalmente suportadas a partir do Node.js 8 (V8 v6.2 / Chrome 62)**, e iteradores e geradores assíncronos são **totalmente suportados a partir do Node.js 10 (V8 v6.8 / Chrome 68)**!

## Melhorias de desempenho assíncrono

Conseguimos melhorar significativamente o desempenho do código assíncrono entre o V8 v5.5 (Chrome 55 & Node.js 7) e o V8 v6.8 (Chrome 68 & Node.js 10). Alcançamos um nível de desempenho onde os desenvolvedores podem usar esses novos paradigmas de programação com segurança, sem se preocupar com a velocidade.

![](/_img/fast-async/doxbee-benchmark.svg)

O gráfico acima mostra o [benchmark doxbee](https://github.com/v8/promise-performance-tests/blob/master/lib/doxbee-async.js), que mede o desempenho de código intensivo em Promises. Observe que os gráficos visualizam o tempo de execução, o que significa que quanto menor, melhor.

Os resultados no [benchmark paralelo](https://github.com/v8/promise-performance-tests/blob/master/lib/parallel-async.js), que testa especificamente o desempenho de [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all), são ainda mais empolgantes:

![](/_img/fast-async/parallel-benchmark.svg)

Conseguimos melhorar o desempenho de `Promise.all` por um fator de **8×**.

No entanto, os benchmarks acima são micro-benchmarks sintéticos. A equipe do V8 está mais interessada em como nossas otimizações afetam o [desempenho do código real dos usuários](/blog/real-world-performance).

![](/_img/fast-async/http-benchmarks.svg)

O gráfico acima visualiza o desempenho de alguns frameworks populares de middleware HTTP que fazem uso intenso de Promises e funções `async`. Observe que este gráfico mostra o número de requisições/segundo, então, ao contrário dos gráficos anteriores, quanto maior, melhor. O desempenho desses frameworks melhorou significativamente entre o Node.js 7 (V8 v5.5) e o Node.js 10 (V8 v6.8).

Essas melhorias de desempenho são resultado de três conquistas principais:

- [TurboFan](/docs/turbofan), o novo compilador otimizador 🎉
- [Orinoco](/blog/orinoco), o novo coletor de lixo 🚛
- um bug no Node.js 8 que fazia o `await` pular microtics 🐛

Quando [lançamos o TurboFan](/blog/launching-ignition-and-turbofan) no [Node.js 8](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367), isso deu um grande aumento de desempenho em geral.

Também temos trabalhado em um novo coletor de lixo, chamado Orinoco, que move o trabalho de coleta de lixo para fora do thread principal, melhorando significativamente o processamento de requisições.

E por último, mas não menos importante, havia um bug útil no Node.js 8 que fazia `await` pular microtics em alguns casos, resultando em melhor desempenho. O bug começou como uma violação não intencional da especificação, mas depois nos deu a ideia para uma otimização. Vamos começar explicando o comportamento do bug:

:::note
**Nota:** O comportamento a seguir estava correto de acordo com a especificação JavaScript na época da escrita. Desde então, nossa proposta de especificação foi aceita, e o seguinte comportamento "bugado" agora está correto.
:::

```js
const p = Promise.resolve();

(async () => {
  await p; console.log('after:await');
})();

p.then(() => console.log('tick:a'))
 .then(() => console.log('tick:b'));
```

O programa acima cria uma Promise resolvida `p`, e faz `await` do seu resultado, mas também encadeia dois manipuladores nele. Em qual ordem você esperaria que as chamadas `console.log` fossem executadas?

Como `p` está resolvida, você pode esperar que imprima `'after:await'` primeiro e depois os `'tick's. Na verdade, esse é o comportamento que você teria no Node.js 8:

![O bug do `await` no Node.js 8](/_img/fast-async/await-bug-node-8.svg)

Embora esse comportamento pareça intuitivo, ele não está correto de acordo com a especificação. O Node.js 10 implementa o comportamento correto, que é executar primeiro os manipuladores encadeados, e somente depois continuar com a função assíncrona.

![O Node.js 10 não possui mais o bug do `await`](/_img/fast-async/await-bug-node-10.svg)

Esse _“comportamento correto”_ provavelmente não é imediatamente óbvio, e foi na verdade surpreendente para os desenvolvedores JavaScript, então merece uma explicação. Antes de mergulharmos no mundo mágico das Promises e funções assíncronas, vamos começar com alguns fundamentos.

### Tarefas vs. microtarefas

Em um nível mais alto, há _tarefas_ e _microtarefas_ em JavaScript. Tarefas lidam com eventos como I/O e timers, e executam uma de cada vez. Microtarefas implementam execução adiada para `async`/`await` e Promises, e são executadas no final de cada tarefa. A fila de microtarefas é sempre esvaziada antes da execução retornar ao loop de eventos.

![A diferença entre microtarefas e tarefas](/_img/fast-async/microtasks-vs-tasks.svg)

Para mais detalhes, confira a explicação de Jake Archibald sobre [tarefas, microtarefas, filas e cronogramas no navegador](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/). O modelo de tarefas no Node.js é muito semelhante.

### Funções assíncronas

De acordo com o MDN, uma função assíncrona é uma função que opera de forma assíncrona usando uma promessa implícita para retornar seu resultado. As funções assíncronas são projetadas para fazer o código assíncrono parecer código síncrono, escondendo parte da complexidade do processamento assíncrono do desenvolvedor.

A função assíncrona mais simples possível se parece com isto:

```js
async function computeAnswer() {
  return 42;
}
```

Quando chamada, ela retorna uma promessa, e você pode obter seu valor como faria com qualquer outra promessa.

```js
const p = computeAnswer();
// → Promessa

p.then(console.log);
// imprime 42 no próximo turno
```

Você só obtém o valor dessa promessa `p` na próxima vez que as microtarefas são executadas. Em outras palavras, o programa acima é semanticamente equivalente ao uso de `Promise.resolve` com o valor:

```js
function computeAnswer() {
  return Promise.resolve(42);
}
```

O verdadeiro poder das funções assíncronas vem das expressões `await`, que fazem a execução da função ser pausada até que uma promessa seja resolvida, e retomada após o cumprimento. O valor de `await` é o da promessa cumprida. Aqui está um exemplo mostrando o que isso significa:

```js
async function fetchStatus(url) {
  const response = await fetch(url);
  return response.status;
}
```

A execução de `fetchStatus` é suspensa no `await` e é retomada posteriormente quando a promessa `fetch` é cumprida. Isto é mais ou menos equivalente a encadear um manipulador na promessa retornada de `fetch`.

```js
function fetchStatus(url) {
  return fetch(url).then(response => response.status);
}
```

Esse manipulador contém o código que segue o `await` na função assíncrona.

Normalmente, você passaria uma `Promise` para `await`, mas na verdade você pode aguardar qualquer valor Javascript arbitrário. Se o valor da expressão após o `await` não for uma promessa, ele será convertido em uma promessa. Isso significa que você pode usar `await 42` se desejar fazer isso:

```js
async function foo() {
  const v = await 42;
  return v;
}

const p = foo();
// → Promessa

p.then(console.log);
// imprime `42` eventualmente
```

Mais interessantemente, `await` funciona com qualquer [“thenable”](https://promisesaplus.com/), ou seja, qualquer objeto com um método `then`, mesmo que não seja uma promessa real. Assim, você pode implementar coisas engraçadas como uma espera assíncrona que mede o tempo real gasto na espera:

```js
class Sleep {
  constructor(timeout) {
    this.timeout = timeout;
  }
  then(resolve, reject) {
    const startTime = Date.now();
    setTimeout(() => resolve(Date.now() - startTime),
               this.timeout);
  }
}

(async () => {
  const actualTime = await new Sleep(1000);
  console.log(actualTime);
})();
```

Vamos ver o que o V8 faz para `await` nos bastidores, seguindo a [especificação](https://tc39.es/ecma262/#await). Aqui está uma função assíncrona simples `foo`:

```js
async function foo(v) {
  const w = await v;
  return w;
}
```

Quando chamada, ela envolve o parâmetro `v` em uma promessa e suspende a execução da função assíncrona até que essa promessa seja resolvida. Uma vez que isso acontece, a execução da função é retomada e `w` é atribuído ao valor da promessa cumprida. Esse valor é então retornado da função assíncrona.

### `await` nos bastidores

Primeiramente, o V8 marca esta função como _recomeçável_, o que significa que a execução pode ser suspensa e retomada posteriormente (nos pontos de `await`). Em seguida, cria-se a chamada `implicit_promise`, que é a promessa que é retornada ao invocar a função assíncrona e que eventualmente se resolve com o valor produzido pela função assíncrona.

![Comparação entre uma função assíncrona simples e o que o motor transforma ela](/_img/fast-async/await-under-the-hood.svg)

Então vem a parte interessante: o `await` propriamente dito. Primeiro, o valor passado para `await` é envolvido em uma promessa. Em seguida, manipuladores são anexados a essa promessa envolvida para retomar a função assim que a promessa for cumprida, e a execução da função assíncrona é suspensa, retornando a `implicit_promise` ao chamador. Uma vez que a `promise` é cumprida, a execução da função assíncrona é retomada com o valor `w` da `promise`, e a `implicit_promise` é resolvida com `w`.

Em resumo, as etapas iniciais para `await v` são:

1. Envolver `v` — o valor passado para `await` — em uma promessa.
1. Anexar manipuladores para retomar a função assíncrona posteriormente.
1. Suspender a função assíncrona e retornar a `implicit_promise` ao chamador.

Vamos examinar as operações individuais passo a passo. Suponha que a coisa que está sendo `await`ada já seja uma promessa, que foi cumprida com o valor `42`. Então o motor cria uma nova `promise` e a resolve com o que está sendo `await`ado. Isso faz uma cadeia diferida dessas promessas no próximo turno, expressa através do que a especificação chama de [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob).

![](/_img/fast-async/await-step-1.svg)

Então o motor cria outra promessa chamada `descartável`. É chamada de *descartável* porque nada é encadeado a ela — ela é completamente interna ao motor. Esta promessa `descartável` é então encadeada à `promise`, com os manipuladores apropriados para retomar a função assíncrona. Esta operação `performPromiseThen` é essencialmente o que [`Promise.prototype.then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) faz nos bastidores. Finalmente, a execução da função assíncrona é suspensa e o controle retorna ao chamador.

![](/_img/fast-async/await-step-2.svg)

A execução continua no chamador, e eventualmente a pilha de chamadas se torna vazia. Então, o motor JavaScript começa a executar as microtarefas: ele executa o [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob) previamente agendado, que agenda um novo [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) para encadear o `promise` ao valor passado para `await`. Em seguida, o motor retorna para processar a fila de microtarefas, já que a fila de microtarefas deve ser esvaziada antes de continuar com o loop principal de eventos.

![](/_img/fast-async/await-step-3.svg)

O próximo é o [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob), que cumpre a `promise` com o valor da promessa que estamos aguardando — `42` neste caso — e agenda a reação na promessa `descartável`. Então, o motor retorna novamente ao loop de microtarefas, que contém uma última microtarefa a ser processada.

![](/_img/fast-async/await-step-4-final.svg)

Agora, esta segunda [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) propaga a resolução para a promessa `descartável` e retoma a execução suspensa da função assíncrona, retornando o valor `42` do `await`.

![Resumo da sobrecarga de `await`](/_img/fast-async/await-overhead.svg)

Resumindo o que aprendemos, para cada `await`, o motor precisa criar **duas promessas adicionais** (mesmo que o lado direito já seja uma promessa) e precisa de **pelo menos três** ticks na fila de microtarefas. Quem diria que uma única expressão `await` resultaria em _tanta sobrecarga_?!

![](/_img/fast-async/await-code-before.svg)

Vamos dar uma olhada de onde vem essa sobrecarga. A primeira linha é responsável por criar a promessa encapsulada. A segunda linha resolve imediatamente essa promessa encapsulada com o valor `v` aguardado. Estas duas linhas são responsáveis por uma promessa adicional, além de dois dos três ticks de microtarefas. Isso é bastante caro se `v` já for uma promessa (que é o caso comum, já que aplicativos normalmente aguardam em promessas). No caso improvável de um desenvolvedor aguardar algo como `42`, o motor ainda precisa encapsulá-lo em uma promessa.

Acontece que já existe uma operação [`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve) na especificação que apenas realiza o encapsulamento quando necessário:

![](/_img/fast-async/await-code-comparison.svg)

Essa operação retorna promessas inalteradas e só encapsula outros valores em promessas conforme necessário. Dessa forma, você economiza uma das promessas adicionais, além de dois ticks na fila de microtarefas, para o caso comum em que o valor passado para `await` já é uma promessa. Este novo comportamento já está [habilitado por padrão no V8 v7.2](/blog/v8-release-72#async%2Fawait). Para o V8 v7.1, o novo comportamento pode ser habilitado usando a flag `--harmony-await-optimization`. Nós já [propusemos esta mudança para a especificação ECMAScript](https://github.com/tc39/ecma262/pull/1250) também.

Veja como o novo e melhorado `await` funciona nos bastidores, etapa por etapa:

![](/_img/fast-async/await-new-step-1.svg)

Vamos assumir novamente que aguardamos uma promessa que foi cumprida com `42`. Graças à magia de [`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve), a `promise` agora apenas se refere à mesma promessa `v`, então não há nada a fazer nesta etapa. Depois disso, o motor continua exatamente como antes, criando a promessa `descartável`, agendando um [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) para retomar a função assíncrona no próximo tick na fila de microtarefas, suspendendo a execução da função e retornando ao chamador.

![](/_img/fast-async/await-new-step-2.svg)

Então, eventualmente, quando toda execução JavaScript termina, o motor começa a executar as microtarefas, e executa o [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob). Este trabalho propaga a resolução da `promise` para `descartável` e retoma a execução da função assíncrona, fornecendo `42` do `await`.

![Resumo da redução na sobrecarga de `await`](/_img/fast-async/await-overhead-removed.svg)

Esta otimização evita a necessidade de criar uma promessa encapsulada se o valor passado para `await` já for uma promessa, e nesse caso passamos de um mínimo de **três** ticks de microtarefas para apenas **um** tick. Este comportamento é semelhante ao que o Node.js 8 faz, exceto que agora não é mais um bug — é uma otimização que está sendo padronizada!

Ainda parece errado que o motor precise criar esta promessa `descartável`, apesar de ser completamente interna ao motor. Acontece que a promessa `descartável` estava lá apenas para satisfazer os requisitos da API da operação interna `performPromiseThen` na especificação.

![](/_img/fast-async/await-optimized.svg)

Isso foi recentemente abordado em uma [mudança editorial](https://github.com/tc39/ecma262/issues/694) na especificação ECMAScript. Os motores não precisam mais criar a promessa `descartável` para `await` — na maioria das vezes[^2].

[^2]: O V8 ainda precisa criar a promessa `descartável` caso [`async_hooks`](https://nodejs.org/api/async_hooks.html) estejam sendo usados no Node.js, já que os ganchos `before` e `after` são executados no _contexto_ da promessa `descartável`.

![Comparação do código `await` antes e depois das otimizações](/_img/fast-async/node-10-vs-node-12.svg)

Comparar `await` no Node.js 10 com o `await` otimizado que provavelmente estará no Node.js 12 mostra o impacto de desempenho dessa mudança:

![](/_img/fast-async/benchmark-optimization.svg)

**`async`/`await` agora superam o código manual de promessa**. O principal ponto aqui é que reduzimos significativamente a sobrecarga das funções assíncronas — não apenas no V8, mas em todos os motores JavaScript, ao corrigir a especificação.

**Atualização:** Desde V8 v7.2 e Chrome 72, `--harmony-await-optimization` está ativado por padrão. [O patch](https://github.com/tc39/ecma262/pull/1250) para a especificação ECMAScript foi mesclado.

## Experiência aprimorada para desenvolvedores

Além do desempenho, os desenvolvedores JavaScript também se preocupam com a possibilidade de diagnosticar e corrigir problemas, o que nem sempre é fácil ao lidar com código assíncrono. [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools) suporta *traces de pilha assíncrona*, ou seja, traces de pilha que incluem não apenas a parte síncrona atual da pilha, mas também a parte assíncrona:

![](/_img/fast-async/devtools.png)

Esta é uma funcionalidade incrivelmente útil durante o desenvolvimento local. No entanto, essa abordagem realmente não ajuda uma vez que a aplicação esteja implantada. Durante a depuração post-mortem, você verá apenas a saída de `Error#stack` nos seus arquivos de log, e isso não informa nada sobre as partes assíncronas.

Recentemente, temos trabalhado em [*traces de pilha assíncrona com custo zero*](https://bit.ly/v8-zero-cost-async-stack-traces) que enriquecem a propriedade `Error#stack` com chamadas de função assíncronas. “Custo zero” soa empolgante, não é? Como pode ser custo zero, quando o recurso do Chrome DevTools tem uma grande sobrecarga? Considere este exemplo onde `foo` chama `bar` de forma assíncrona, e `bar` lança uma exceção após aguardar uma promessa:

```js
async function foo() {
  await bar();
  return 42;
}

async function bar() {
  await Promise.resolve();
  throw new Error('BEEP BEEP');
}

foo().catch(error => console.log(error.stack));
```

Executar este código no Node.js 8 ou Node.js 10 resulta na seguinte saída:

```text/2
$ node index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
```

Observe que embora a chamada a `foo()` cause o erro, `foo` não faz parte do trace de pilha de forma alguma. Isso torna complicado para os desenvolvedores JavaScript realizar a depuração post-mortem, independentemente de seu código estar implantado em uma aplicação web ou dentro de algum contêiner na nuvem.

O ponto interessante aqui é que o motor sabe onde ele deve continuar quando `bar` terminar: logo após o `await` na função `foo`. Coincidentemente, esse também é o local onde a função `foo` foi suspensa. O motor pode usar essas informações para reconstruir partes do trace de pilha assíncrono, nomeadamente os locais de `await`. Com essa mudança, a saída torna-se:

```text/2,7
$ node --async-stack-traces index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
    at async foo (index.js:2:3)
```

No trace de pilha, a função no topo aparece primeiro, seguida pelo restante do trace de pilha síncrono, seguida pela chamada assíncrona a `bar` na função `foo`. Essa mudança foi implementada no V8 por trás da nova flag `--async-stack-traces`. **Atualização**: Desde V8 v7.3, `--async-stack-traces` está ativado por padrão.

No entanto, se você comparar isso ao rastreamento de pilha assíncrono no Chrome DevTools acima, notará que o local de chamada real para `foo` está ausente na parte assíncrona do rastreamento de pilha. Como mencionado anteriormente, essa abordagem utiliza o fato de que para `await`, os locais de retomar e suspender são os mesmos — mas para chamadas regulares de [`Promise#then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) ou [`Promise#catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch), isso não é o caso. Para mais antecedentes, veja a explicação de Mathias Bynens sobre [por que `await` supera `Promise#then()`](https://mathiasbynens.be/notes/async-stack-traces).

## Conclusão

Tornamos as funções assíncronas mais rápidas graças a duas otimizações significativas:

- a remoção de dois microtiks extras, e
- a remoção da promessa `descartável`.

Além disso, melhoramos a experiência do desenvolvedor por meio de [*rastreamentos de pilha assíncronos sem custo*](https://bit.ly/v8-zero-cost-async-stack-traces), que funcionam com `await` em funções assíncronas e `Promise.all()`.

E também temos alguns bons conselhos de desempenho para desenvolvedores JavaScript:

- prefira funções `async` e `await` ao invés de código de promessa escrito manualmente, e
- use a implementação nativa de promessa oferecida pelo mecanismo JavaScript para se beneficiar dos atalhos, ou seja, evitar dois microtiks para `await`.
