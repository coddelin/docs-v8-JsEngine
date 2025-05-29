---
title: "Apresentando a API de Integração de Promises do JavaScript para WebAssembly"
description: "Este documento introduz o JSPI e fornece alguns exemplos simples para que você comece a usá-lo"
author: "Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl"
date: 2024-07-01
tags: 
  - WebAssembly
---
A API de Integração de Promises do JavaScript (JSPI) permite que aplicativos WebAssembly escritos presumindo acesso _síncrono_ a funcionalidades externas operem sem problemas em um ambiente onde a funcionalidade é, na verdade, _assíncrona_.

<!--truncate-->
Esta nota descreve quais são as principais capacidades da API JSPI, como acessá-la, como desenvolver software para ela e oferece alguns exemplos para testar.

## Para que serve o ‘JSPI’?

APIs assíncronas operam separando a _iniciação_ da operação de sua _resolução_; com esta última ocorrendo algum tempo após a primeira. Mais importante, o aplicativo continua sua execução após iniciar a operação e é notificado quando a operação é concluída.

Por exemplo, usando a API `fetch`, aplicativos Web podem acessar o conteúdo associado a uma URL; no entanto, a função `fetch` não retorna diretamente os resultados da busca; em vez disso, retorna um objeto `Promise`. A conexão entre a resposta do fetch e a solicitação original é restabelecida ao anexar um _callback_ a esse objeto `Promise`. A função de callback pode inspecionar a resposta e coletar os dados (se estiverem disponíveis, é claro).

Em muitos casos, aplicativos em C/C++ (e em muitas outras linguagens) foram originalmente escritos para uma API _síncrona_. Por exemplo, a função Posix `read` não termina até que a operação de I/O seja concluída: a função `read` *bloqueia* até que a leitura seja finalizada.

No entanto, não é permitido bloquear a thread principal do navegador; e muitos ambientes não suportam programação síncrona. O resultado é uma incompatibilidade entre o desejo do programador de aplicativos por uma API simples de usar e o ecossistema mais amplo que exige que operações de I/O sejam projetadas com código assíncrono. Isso é especialmente problemático para aplicativos legados existentes, cuja adaptação seria cara.

O JSPI é uma API que faz a ponte entre aplicativos síncronos e APIs Web assíncronas. Ele funciona interceptando objetos `Promise` retornados por funções de APIs Web assíncronas e _suspendendo_ o aplicativo WebAssembly. Quando a operação de I/O assíncrona é concluída, o aplicativo WebAssembly é _retomado_. Isso permite que o aplicativo WebAssembly use um código de linha reta para executar operações assíncronas e processar seus resultados.

Crucialmente, usar o JSPI exige muito poucas mudanças no próprio aplicativo WebAssembly.

### Como o JSPI funciona?

O JSPI funciona interceptando o objeto `Promise` retornado de chamadas para o JavaScript e suspendendo a lógica principal do aplicativo WebAssembly. Um callback é anexado a esse objeto `Promise`, que retomará o código WebAssembly suspenso quando for invocado pelo gerenciador de tarefas do loop de eventos do navegador.

Além disso, a exportação do WebAssembly é refatorada para retornar um objeto `Promise` &mdash; em vez do valor originalmente retornado pela exportação. Esse objeto `Promise` torna-se o valor retornado pelo aplicativo WebAssembly: quando o código WebAssembly é suspenso,[^first] o objeto `Promise` de exportação é retornado como o valor da chamada para o WebAssembly.

[^first]: Se um aplicativo WebAssembly for suspenso mais de uma vez, suspensões subsequentes retornarão ao loop de eventos do navegador e não serão diretamente visíveis para o aplicativo Web.

O `Promise` de exportação é resolvido quando a chamada original é concluída: se a função WebAssembly original retornar um valor normal, o objeto `Promise` de exportação é resolvido com esse valor (convertido em um objeto JavaScript); se uma exceção for lançada, o objeto `Promise` de exportação será rejeitado.

#### Envolvendo importações e exportações

Isso é habilitado ao _envolver_ importações e exportações durante a fase de instanciação do módulo WebAssembly. Os wrappers de função adicionam o comportamento de suspensão às importações assíncronas normais e direcionam suspensões para callbacks de objetos `Promise`.

Não é necessário envolver todas as exportações e importações de um módulo WebAssembly. Algumas exportações cujos caminhos de execução não envolvem chamadas a APIs assíncronas são melhores não sendo envolvidas. Da mesma forma, nem todas as importações de um módulo WebAssembly são de funções de API assíncronas; essas importações também não devem ser envolvidas.

Claro, há uma quantidade significativa de mecanismos internos que permitem que isso aconteça;[^1] mas nem a linguagem JavaScript nem o próprio WebAssembly são alterados pelo JSPI. Suas operações estão confinadas à fronteira entre o JavaScript e o WebAssembly.

Do ponto de vista de um desenvolvedor de aplicativos Web, o resultado é um corpo de código que participa do mundo do JavaScript de funções assíncronas e Promises de maneira análoga a outras funções assíncronas escritas em JavaScript. Do ponto de vista do desenvolvedor WebAssembly, isso permite a criação de aplicativos usando APIs síncronas e, ao mesmo tempo, participar do ecossistema assíncrono da Web.

### Desempenho esperado

Como os mecanismos usados ao suspender e retomar módulos WebAssembly são essencialmente de tempo constante, não prevemos altos custos ao usar JSPI &mdash; especialmente em comparação com outras abordagens baseadas em transformações.

Há uma quantidade constante de trabalho necessária para propagar o objeto `Promise` retornado pela chamada de API assíncrona para o WebAssembly. Da mesma forma, quando uma Promise é resolvida, o aplicativo WebAssembly pode ser retomado com um overhead de tempo constante.

No entanto, como em outras APIs no estilo Promise no navegador, sempre que o aplicativo WebAssembly é suspenso, ele não será 'acordado' novamente, exceto pelo executor de tarefas do navegador. Isso exige que a execução do código JavaScript que iniciou a computação do WebAssembly em si retorne ao navegador.

### Posso usar o JSPI para suspender programas JavaScript?

O JavaScript já possui um mecanismo bem desenvolvido para representar computações assíncronas: o objeto `Promise` e a notação de função `async`. O JSPI foi projetado para integrar-se bem com isso, mas não para substituí-lo.

### Como posso usar o JSPI hoje?

O JSPI está atualmente sendo padronizado pelo W3C WebAssembly WG. No momento dessa redação, ele está na fase 3 do processo de padronização e prevemos a completa padronização até o final de 2024.

O JSPI está disponível para Chrome em Linux, MacOS, Windows e ChromeOS, nas plataformas Intel e Arm, tanto em 64 bits quanto 32 bits.[^firefox]

[^firefox]: O JSPI também está disponível no Firefox Nightly: ative "`javascript.options.wasm_js_promise_integration`" no painel about:config &mdash; e reinicie.

O JSPI pode ser usado de duas maneiras hoje: por meio de um [origin trial](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889) e localmente por meio de uma flag no Chrome. Para testá-lo localmente, vá para `chrome://flags` no Chrome, procure por "Experimental WebAssembly JavaScript Promise Integration (JSPI)" e marque a caixa. Reinicie conforme sugerido para que tenha efeito.

Você deve usar pelo menos a versão `126.0.6478.26` para obter a versão mais recente da API. Recomendamos usar o canal Dev para garantir que quaisquer atualizações de estabilidade sejam aplicadas. Além disso, se desejar usar Emscripten para gerar WebAssembly (o que recomendamos), você deve usar uma versão que seja pelo menos `3.1.61`.

Uma vez habilitado, você deve conseguir executar scripts que usam JSPI. Abaixo mostramos como você pode usar o Emscripten para gerar um módulo WebAssembly em C/C++ que utiliza JSPI. Se o aplicativo envolver uma linguagem diferente, sem usar o Emscripten, por exemplo, sugerimos que você veja como a API funciona consultando a [proposta](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md).

#### Limitações

A implementação do JSPI no Chrome já suporta casos de uso típicos. No entanto, ainda é considerado experimental, então há algumas limitações a serem observadas:

- Requer o uso de uma flag na linha de comando ou a participação no origin trial.
- Cada chamada para uma exportação do JSPI é executada em uma pilha de tamanho fixo.
- O suporte a depuração é um pouco limitado. Em particular, pode ser difícil ver os diferentes eventos acontecendo no painel de ferramentas Dev. Fornecer um suporte mais robusto para a depuração de aplicativos JSPI está no roteiro.

## Uma pequena demonstração

Para ver tudo isso funcionando, vamos tentar um exemplo simples. Este programa em C calcula Fibonacci de uma maneira espetacularmente ruim: pedindo ao JavaScript para fazer a soma, e ainda pior, usando objetos `Promise` do JavaScript para isso:[^2]

```c
long promiseFib(long x) {
 if (x == 0)
   return 0;
 if (x == 1)
   return 1;
 return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}
// prometer uma soma
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});
```

A função `promiseFib` em si é uma versão recursiva simples da função de Fibonacci. A parte intrigante (do nosso ponto de vista) é a definição de `promiseAdd`, que faz a soma das duas metades do Fibonacci — usando o JSPI!.

Usamos a macro `EM_ASYNC_JS` do Emscripten para escrever a função `promiseFib` como uma função JavaScript dentro do corpo do nosso programa em C. Como a adição geralmente não envolve Promises no JavaScript, temos que forçar isso construindo um `Promise`.

A macro `EM_ASYNC_JS` gera todo o código de integração necessário para que possamos usar o JSPI para acessar o resultado do Promise como se fosse uma função normal.

Para compilar nossa pequena demonstração, usamos o compilador `emcc` do Emscripten:[^4]

```sh
emcc -O3 badfib.c -o b.html -s JSPI
```

Isso compila nosso programa, criando um arquivo HTML carregável (`b.html`). A opção de linha de comando mais especial aqui é `-s JSPI`. Isso ativa a opção de gerar código que usa o JSPI para interagir com as importações JavaScript que retornam Promises.

Se você carregar o arquivo `b.html` gerado no Chrome, deverá ver um resultado que se aproxima de:

```
fib(0) 0μs 0μs 0μs
fib(1) 0μs 0μs 0μs
fib(2) 0μs 0μs 3μs
fib(3) 0μs 0μs 4μs
…
fib(15) 0μs 13μs 1225μs
```

Esta é simplesmente uma lista dos primeiros 15 números de Fibonacci seguida pelo tempo médio em microssegundos que levou para calcular um único número de Fibonacci. Os três valores de tempo em cada linha referem-se ao tempo gasto para um cálculo puramente em WebAssembly, para um cálculo misto JavaScript/WebAssembly e o terceiro número fornece o tempo para uma versão suspensa do cálculo.

Observe que `fib(2)` é o menor cálculo que envolve o acesso a uma Promessa, e, no momento em que `fib(15)` é calculado, aproximadamente 1000 chamadas para `promiseAdd` foram feitas. Isso sugere que o custo real de uma função em JSPI é aproximadamente 1μs — significativamente maior do que simplesmente somar dois inteiros, mas muito menor do que os milissegundos normalmente necessários para acessar uma função de E/S externa.

## Usando JSPI para carregar código sob demanda

Neste próximo exemplo, vamos explorar o que pode ser um uso um tanto surpreendente do JSPI: carregar código dinamicamente. A ideia é usar `fetch` para obter um módulo que contém o código necessário, mas atrasar isso até que a função necessária seja chamada pela primeira vez.

Precisamos usar JSPI porque APIs como `fetch` são inerentemente assíncronas, mas queremos ser capazes de invocá-las de lugares arbitrários em nossa aplicação — em particular, no meio de uma chamada para uma função que ainda não existe.

A ideia central é substituir uma função carregada dinamicamente por um stub; este stub, primeiro de tudo, carrega o código da função ausente, substitui-se pelo código carregado e, em seguida, chama o código recém-carregado com os argumentos originais. Qualquer chamada subsequente para a função vai diretamente para a função carregada. Esta estratégia permite uma abordagem essencialmente transparente para carregar código dinamicamente.

O módulo que vamos carregar é bastante simples, contém uma função que retorna `42`:

```c
// Este é um simples fornecedor de quarenta e dois
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42(){
  return 42l;
}
```

que está em um arquivo chamado `p42.c`, e é compilado usando o Emscripten sem construir nenhum 'extra':

```sh
emcc p42.c -o p42.wasm --no-entry -Wl,--import-memory
```

O prefixo `EMSCRIPTEN_KEEPALIVE` é um macro do Emscripten que garante que a função `provide42` não será eliminada mesmo que não seja usada dentro do código. Isso resulta em um módulo WebAssembly que contém a função que queremos carregar dinamicamente.

A flag `-Wl,--import-memory` que adicionamos à compilação de `p42.c` garante que ele tenha acesso à mesma memória que o módulo principal tem.[^3]

Para carregar código dinamicamente, usamos a API padrão `WebAssembly.instantiateStreaming`:

```js
WebAssembly.instantiateStreaming(fetch('p42.wasm'));
```

Essa expressão usa `fetch` para localizar o módulo Wasm compilado, `WebAssembly.instantiateStreaming` para compilar o resultado do fetch e criar um módulo instanciado a partir dele. Tanto `fetch` quanto `WebAssembly.instantiateStreaming` retornam Promessas; então não podemos simplesmente acessar o resultado e extrair nossa função necessária. Em vez disso, encapsulamos isso em um estilo JSPI de importação usando o macro `EM_ASYNC_JS`:

```c
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('carregando promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});
```

Observe a chamada `console.log`, vamos usá-la para garantir que nossa lógica esteja correta.

O `addFunction` faz parte da API do Emscripten, mas, para garantir que ele esteja disponível para nós em tempo de execução, temos que informar ao `emcc` que é uma dependência necessária. Fazemos isso na seguinte linha:

```c
EM_JS_DEPS(funDeps, "$addFunction")
```

Quando queremos carregar código dinamicamente, gostaríamos de garantir que não carregamos código desnecessariamente; neste caso, gostaríamos de garantir que chamadas subsequentes para `provide42` não acionem recarregamentos. C tem um recurso simples que podemos usar para isso: não chamamos `provide42` diretamente, mas o fazemos por meio de um trampolim que causará a carga da função e, em seguida, pouco antes de realmente invocá-la, alteramos o trampolim para que ignore a si mesmo. Podemos fazer isso usando um ponteiro de função apropriado:

```c
extern fooFun get42;

long stub(){
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;
```

Do ponto de vista do restante do programa, a função que queremos chamar é chamada `get42`. Sua implementação inicial é por meio de `stub`, que chama `resolveFun` para realmente carregar a função. Após o carregamento bem-sucedido, alteramos get42 para apontar para a nova função carregada – e a chamamos.

Nossa função principal chama `get42` duas vezes:[^6]

```c
int main() {
  printf("primeira chamada p42() = %ld\n", get42());
  printf("segunda chamada = %ld\n", get42());
}
```

O resultado de executar isso no navegador é um log que se parece com:

```
carregando promessa42
primeira chamada p42() = 42
segunda chamada = 42
```

Observe que a linha `carregando promessa42` aparece apenas uma vez, enquanto `get42` é realmente chamado duas vezes.

Este exemplo demonstra que JSPI pode ser usado de maneiras inesperadas: carregar código dinamicamente parece estar longe de criar promessas. Além disso, existem outras maneiras de vincular módulos WebAssembly dinamicamente; isso não pretende representar a solução definitiva para esse problema.

Definitivamente, estamos ansiosos para ver o que você pode fazer com essa nova capacidade! Participe da discussão no grupo comunitário W3C WebAssembly [repositório](https://github.com/WebAssembly/js-promise-integration).

## Apêndice A: Listagem Completa de `badfib`


```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <emscripten.h>

typedef long (testFun)(long, int);

#define microSeconds (1000000)

long add(long x, long y) {
  return x + y;
}

// Pedir ao JS para fazer a soma
EM_JS(long, jsAdd, (long x, long y), {
  return x + y;
});

// Prometa uma soma
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});

__attribute__((noinline))
long localFib(long x) {
 if (x==0)
   return 0;
 if (x==1)
   return 1;
 return add(localFib(x - 1), localFib(x - 2));
}

__attribute__((noinline))
long jsFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return jsAdd(jsFib(x - 1), jsFib(x - 2));
}

__attribute__((noinline))
long promiseFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}

long runLocal(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += localFib(x);
  return temp / count;
}

long runJs(long x,int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += jsFib(x);
  return temp / count;
}

long runPromise(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += promiseFib(x);
  return temp / count;
}

double runTest(testFun test, int limit, int count){
  clock_t start = clock();
  test(limit, count);
  clock_t stop = clock();
  return ((double)(stop - start)) / CLOCKS_PER_SEC;
}

void runTestSequence(int step, int limit, int count) {
  for (int ix = 0; ix <= limit; ix += step){
    double light = (runTest(runLocal, ix, count) / count) * microSeconds;
    double jsTime = (runTest(runJs, ix, count) / count) * microSeconds;
    double promiseTime = (runTest(runPromise, ix, count) / count) * microSeconds;
    printf("fib(%d) %gμs %gμs %gμs %gμs\n",ix, light, jsTime, promiseTime, (promiseTime - jsTime));
  }
}

EMSCRIPTEN_KEEPALIVE int main() {
  int step =  1;
  int limit = 15;
  int count = 1000;
  runTestSequence(step, limit, count);
  return 0;
}
```

## Apêndice B: Listagem de `u42.c` e `p42.c`

O código `u42.c` em C representa a parte principal do exemplo de carregamento dinâmico:

```c
#include <stdio.h>
#include <emscripten.h>

typedef long (*fooFun)();

// Prometer uma função
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('carregando promessa42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});

EM_JS_DEPS(funDeps, "$addFunction")

extern fooFun get42;

long stub() {
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;

int main() {
  printf("primeira chamada p42() = %ld\n", get42());
  printf("segunda chamada = %ld\n", get42());
}
```

O código `p42.c` é o módulo carregado dinamicamente.

```c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42() {
  return 42l;
}
```

<!-- As notas de rodapé ficam no final. -->
## Notas

[^1]: Para os curiosos tecnicamente, veja [a proposta de WebAssembly para JSPI](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md) e [o portfólio de design de troca de pilha do V8](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y).

[^2]: Nota: incluímos o programa completo abaixo, no Apêndice A.

[^3]: Não precisamos desse parâmetro para nosso exemplo específico, mas provavelmente você precisará dele para algo maior.

[^4]: Nota: você precisará de uma versão do Emscripten que seja ≥ 3.1.61.

[^6]: O programa completo é mostrado no Apêndice B.
