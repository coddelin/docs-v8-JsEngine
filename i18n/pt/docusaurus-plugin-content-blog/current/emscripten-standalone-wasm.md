---
title: "Fora da web: binários autônomos WebAssembly usando Emscripten"
author: "Alon Zakai"
avatars: 
  - "alon-zakai"
date: 2019-11-21
tags: 
  - WebAssembly
  - ferramentas
description: "O Emscripten agora suporta arquivos Wasm autônomos, que não precisam de JavaScript."
tweet: "1197547645729988608"
---
O Emscripten sempre se concentrou em compilar primeiro para a Web e para outros ambientes JavaScript, como o Node.js. Mas à medida que o WebAssembly começa a ser usado *sem* JavaScript, novos casos de uso estão surgindo, e por isso estamos trabalhando no suporte para a emissão de arquivos [**Wasm autônomos**](https://github.com/emscripten-core/emscripten/wiki/WebAssembly-Standalone) no Emscripten, que não dependem do runtime JS do Emscripten! Este post explica por que isso é interessante.

<!--truncate-->
## Usando o modo autônomo no Emscripten

Primeiro, vamos ver o que você pode fazer com esse novo recurso! Semelhante a [este post](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/), vamos começar com um programa do tipo "hello world" que exporta uma única função que soma dois números:

```c
// add.c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int add(int x, int y) {
  return x + y;
}
```

Normalmente, construiríamos isso com algo como `emcc -O3 add.c -o add.js`, o que geraria `add.js` e `add.wasm`. Em vez disso, vamos pedir ao `emcc` que emita apenas o Wasm:

```
emcc -O3 add.c -o add.wasm
```

Quando o `emcc` percebe que só queremos o Wasm, ele o torna "autônomo" - um arquivo Wasm que pode ser executado sozinho, tanto quanto possível, sem nenhum código de runtime JavaScript do Emscripten.

Ao descompilar, ele é muito minimalista - apenas 87 bytes! Ele contém a óbvia função `add`

```lisp
(func $add (param $0 i32) (param $1 i32) (result i32)
 (i32.add
  (local.get $0)
  (local.get $1)
 )
)
```

e uma outra função, `_start`,

```lisp
(func $_start
 (nop)
)
```

`_start` faz parte da especificação [WASI](https://github.com/WebAssembly/WASI), e o modo autônomo do Emscripten a emite para que possamos rodar em runtimes WASI. (Normalmente, `_start` faria inicializações globais, mas aqui simplesmente não precisamos de nenhuma, então está vazia.)

### Escreva seu próprio carregador JavaScript

Uma coisa interessante sobre um arquivo Wasm autônomo como este é que você pode escrever um JavaScript personalizado para carregá-lo e executá-lo, que pode ser muito minimalista dependendo do seu caso de uso. Por exemplo, podemos fazer isso no Node.js:

```js
// load-add.js
const binary = require('fs').readFileSync('add.wasm');

WebAssembly.instantiate(binary).then(({ instance }) => {
  console.log(instance.exports.add(40, 2));
});
```

Apenas 4 linhas! Executar isso imprime `42`, como esperado. Observe que, embora este exemplo seja muito simplista, há casos em que você simplesmente não precisa de muito JavaScript e pode fazer melhor do que o runtime JavaScript padrão do Emscripten (que suporta vários ambientes e opções). Um exemplo do mundo real disso está no [meshoptimizer do zeux](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js) - apenas 57 linhas, incluindo gerenciamento e crescimento de memória, etc.!

### Executando em runtimes Wasm

Outra coisa interessante sobre arquivos Wasm autônomos é que você pode executá-los em runtimes Wasm como [wasmer](https://wasmer.io), [wasmtime](https://github.com/bytecodealliance/wasmtime) ou [WAVM](https://github.com/WAVM/WAVM). Por exemplo, considere este hello world:

```cpp
// hello.cpp
#include <stdio.h>

int main() {
  printf("hello, world!\n");
  return 0;
}
```

Podemos compilar e executar isso em qualquer um desses runtimes:

```bash
$ emcc hello.cpp -O3 -o hello.wasm
$ wasmer run hello.wasm
hello, world!
$ wasmtime hello.wasm
hello, world!
$ wavm run hello.wasm
hello, world!
```

O Emscripten usa as APIs WASI tanto quanto possível, então programas como este acabam usando 100% WASI e podem ser executados em runtimes com suporte a WASI (veja as notas mais adiante sobre quais programas requerem mais do que WASI).

### Construção de plugins Wasm

Além da Web e do servidor, uma área empolgante para o Wasm são os **plugins**. Por exemplo, um editor de imagens pode ter plugins Wasm que executam filtros e outras operações na imagem. Para esse tipo de caso de uso, você deseja um binário Wasm autônomo, como nos exemplos até agora, mas que também tenha uma API adequada para o aplicativo incorporado.

Os plugins às vezes estão relacionados às bibliotecas dinâmicas, pois essas são uma forma de implementá-los. O Emscripten tem suporte para bibliotecas dinâmicas com a opção [SIDE_MODULE](https://github.com/emscripten-core/emscripten/wiki/Linking#general-dynamic-linking), e isso tem sido uma maneira de construir plugins Wasm. A nova opção Wasm standalone descrita aqui é uma melhoria em vários aspectos: Primeiro, uma biblioteca dinâmica tem memória realocável, o que adiciona overhead se você não precisar dela (e você não precisa se não estiver vinculando o Wasm com outro Wasm após carregá-lo). Segundo, a saída standalone foi projetada para ser executada tanto em tempos de execução de Wasm quanto em outras situações, conforme mencionado anteriormente.

Certo, até agora tudo bem: o Emscripten pode emitir JavaScript + WebAssembly como sempre fez, e agora também pode emitir apenas WebAssembly por si só, o que permite executá-lo em lugares que não têm JavaScript, como runtimes de Wasm, ou você pode escrever seu próprio código de carregador JavaScript personalizado, etc. Agora vamos falar sobre o contexto e os detalhes técnicos!

## As duas APIs padrão do WebAssembly

O WebAssembly pode acessar apenas as APIs que recebe como importações - a especificação central do Wasm não tem detalhes concretos de API. Dada a trajetória atual do Wasm, parece que haverá 3 categorias principais de APIs que as pessoas irão importar e usar:

- **APIs da Web**: Isso é o que os programas Wasm usam na Web, que são as APIs padronizadas existentes que o JavaScript também pode usar. Atualmente, essas são chamadas indiretamente, através do código de suporte JS, mas no futuro, com [tipos de interface](https://github.com/WebAssembly/interface-types/blob/master/proposals/interface-types/Explainer.md), elas serão chamadas diretamente.
- **APIs WASI**: O WASI foca na padronização de APIs para Wasm no servidor.
- **Outras APIs**: Vários embeddings personalizados definirão suas próprias APIs específicas de aplicação. Por exemplo, demos anteriormente o exemplo de um editor de imagens com plugins Wasm que implementam uma API para realizar efeitos visuais. Note que um plugin pode também ter acesso a APIs “sistema”, como uma biblioteca dinâmica nativa teria, ou pode ser muito isolado e não ter nenhuma importação (se o embedding apenas chamar seus métodos).

O WebAssembly está na posição interessante de ter [dois conjuntos padronizados de APIs](https://www.goodreads.com/quotes/589703-the-good-thing-about-standards-is-that-there-are-so). Isso faz sentido no fato de que um é para a Web e outro para o servidor, e esses ambientes têm requisitos diferentes; por razões semelhantes, o Node.js não possui APIs idênticas ao JavaScript na Web.

No entanto, há mais do que apenas a Web e o servidor, em particular também existem os plugins Wasm. Por um lado, os plugins podem funcionar dentro de uma aplicação que pode estar na Web (assim como [plugins JS](https://www.figma.com/blog/an-update-on-plugin-security/#a-technology-change)) ou fora dela; por outro, independente de onde a aplicação de embedding esteja, o ambiente de um plugin não é um ambiente de Web nem de servidor. Portanto, não está imediatamente claro quais conjuntos de APIs serão usados - isso pode depender do código sendo portado, do runtime Wasm sendo embedado, etc.

## Vamos unificar o máximo possível

Uma maneira concreta que o Emscripten espera ajudar aqui é que, ao usar APIs WASI o máximo possível, podemos evitar diferenças de API **desnecessárias**. Conforme mencionado anteriormente, o código Emscripten na Web acessa APIs da Web indiretamente, através do JavaScript, então onde essa API JavaScript poderia parecer um WASI, estaríamos removendo uma diferença de API desnecessária, e o mesmo binário também pode ser executado no servidor. Em outras palavras, se o Wasm quiser registrar algumas informações, ele precisa chamar o JS, algo como isso:

```js
wasm   =>   function musl_writev(..) { .. console.log(..) .. }
```

`musl_writev` é uma implementação da interface syscall do Linux que [musl libc](https://www.musl-libc.org) usa para gravar dados em um descritor de arquivo, e que acaba chamando `console.log` com os dados apropriados. O módulo Wasm importa e chama esse `musl_writev`, que define uma ABI entre o JS e o Wasm. Essa ABI é arbitrária (e, de fato, o Emscripten mudou sua ABI ao longo do tempo para otimizá-la). Se substituirmos isso por uma ABI que corresponda ao WASI, podemos obter isto:

```js
wasm   =>   function __wasi_fd_write(..) { .. console.log(..) .. }
```

Isso não é uma grande mudança, apenas requer alguma reestruturação da ABI, e ao executar em um ambiente JS não importa muito. Mas agora o Wasm pode ser executado sem o JS, já que essa API WASI é reconhecida pelos runtimes WASI! É assim que os exemplos standalone Wasm de antes funcionam, apenas reestruturando o Emscripten para usar APIs WASI.

Outra vantagem do Emscripten ao usar APIs WASI é que podemos ajudar na especificação WASI ao encontrar problemas do mundo real. Por exemplo, descobrimos que [alterar as constantes "whence" do WASI](https://github.com/WebAssembly/WASI/pull/106) seria útil, e iniciamos algumas discussões sobre [tamanho do código](https://github.com/WebAssembly/WASI/issues/109) e [compatibilidade POSIX](https://github.com/WebAssembly/WASI/issues/122).

O Emscripten usar o WASI tanto quanto possível também é útil porque permite que os usuários usem um único SDK para direcionar os ambientes Web, servidor e plugin. O Emscripten não é o único SDK que permite isso, já que a saída do SDK WASI pode ser executada na Web usando o [WASI Web Polyfill](https://wasi.dev/polyfill/) ou o [wasmer-js](https://github.com/wasmerio/wasmer-js) do Wasmer, mas a saída Web do Emscripten é mais compacta, então permite que um único SDK seja usado sem comprometer o desempenho da Web.

Falando nisso, você pode gerar um arquivo Wasm autônomo a partir do Emscripten com JS opcional em um único comando:

```
emcc -O3 add.c -o add.js -s STANDALONE_WASM
```

Isso gera `add.js` e `add.wasm`. O arquivo Wasm é autônomo, assim como antes, quando apenas geramos um arquivo Wasm por si só (`STANDALONE_WASM` foi definido automaticamente quando usamos `-o add.wasm`), mas agora, além disso, há um arquivo JS que pode carregá-lo e executá-lo. O JS é útil para executá-lo na Web se você não quiser escrever seu próprio JS para isso.

## Precisamos de Wasm *não* autônomo?

Por que existe a flag `STANDALONE_WASM`? Em teoria, o Emscripten poderia sempre definir `STANDALONE_WASM`, o que seria mais simples. Mas arquivos Wasm autônomos não podem depender de JS, e isso tem algumas desvantagens:

- Não podemos minimizar os nomes de importação e exportação do Wasm, pois a minimização só funciona se ambas as partes concordarem, o Wasm e o que o carrega.
- Normalmente, criamos a memória Wasm no JS para que o JS possa usá-la durante a inicialização, o que nos permite realizar trabalhos em paralelo. Mas, no Wasm autônomo, temos que criar a memória no Wasm.
- Algumas APIs são simplesmente mais fáceis de implementar em JS. Por exemplo, [`__assert_fail`](https://github.com/emscripten-core/emscripten/pull/9558), que é chamada quando uma asserção em C falha, normalmente é [implementada em JS](https://github.com/emscripten-core/emscripten/blob/2b42a35f61f9a16600c78023391d8033740a019f/src/library.js#L1235). São apenas algumas linhas, e mesmo se você incluir as funções JS que elas chamam, o tamanho total do código é bastante pequeno. Por outro lado, em uma compilação autônoma, não podemos depender de JS, então usamos [`assert.c` do musl](https://github.com/emscripten-core/emscripten/blob/b8896d18f2163dbf2fa173694eeac71f6c90b68c/system/lib/libc/musl/src/exit/assert.c#L4). Isso usa `fprintf`, o que significa que acaba trazendo um monte de suporte de `stdio` em C, incluindo coisas com chamadas indiretas que dificultam a remoção de funções não utilizadas. No geral, existem muitos detalhes que acabam fazendo diferença no tamanho total do código.

Se você quiser executar tanto na Web quanto em outros lugares, e quiser 100% do tamanho de código ideal e tempos de inicialização, você deve fazer duas compilações separadas, uma com `-s STANDALONE` e outra sem. É muito simples, pois basta trocar uma flag!

## Diferenças de API necessárias

Vimos que o Emscripten utiliza APIs WASI tanto quanto possível para evitar **diferenças de API desnecessárias**. Existem algumas **diferenças necessárias**? Infelizmente, sim - algumas APIs WASI requerem trade-offs. Por exemplo:

- WASI não suporta várias funcionalidades do POSIX, como [permissões de arquivos para usuário/grupo/mundo](https://github.com/WebAssembly/WASI/issues/122), devido às quais você não pode implementar totalmente um `ls` de sistema (Linux), por exemplo (veja os detalhes nesse link). A camada de sistema de arquivos existente do Emscripten suporta algumas dessas coisas, então, se mudarmos para APIs WASI para todas as operações de sistema de arquivos, estaríamos [perdendo algum suporte ao POSIX](https://github.com/emscripten-core/emscripten/issues/9479#issuecomment-542815711).
- `path_open` do WASI [tem um custo em tamanho de código](https://github.com/WebAssembly/WASI/issues/109) porque força um tratamento extra de permissões no próprio Wasm. Esse código é desnecessário na Web.
- WASI não fornece uma [API de notificação para crescimento de memória](https://github.com/WebAssembly/WASI/issues/82), e como resultado, os runtimes JS devem constantemente verificar se a memória cresceu e, caso positivo, atualizar suas visualizações em cada importação e exportação. Para evitar essa sobrecarga, o Emscripten fornece uma API de notificação, `emscripten_notify_memory_growth`, que [você pode ver implementada em uma única linha](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js#L10) no meshoptimizer do zeux que mencionamos anteriormente.

Com o tempo, o WASI pode adicionar mais suporte ao POSIX, uma notificação de crescimento de memória, etc. - o WASI ainda é altamente experimental e deve mudar significativamente. Por enquanto, para evitar regressões no Emscripten, não emitimos binários 100% WASI se você usar determinados recursos. Em particular, a abertura de arquivos usa um método POSIX em vez de WASI, o que significa que, se você chamar `fopen`, o arquivo Wasm resultante não será 100% WASI - no entanto, se tudo o que você fizer for usar `printf`, que opera no já aberto `stdout`, então será 100% WASI, como no exemplo "hello world" que vimos no início, onde a saída do Emscripten funciona em runtimes WASI.

Se for útil para os usuários, podemos adicionar uma opção `PURE_WASI`, que sacrificaria o tamanho do código em troca de conformidade estrita ao WASI, mas se isso não for urgente (e a maioria dos casos de uso de plugins que vimos até agora não precisam de I/O completo de arquivos), talvez possamos esperar que o WASI melhore a ponto de o Emscripten poder remover essas APIs não-WASI. Isso seria o melhor resultado, e estamos trabalhando nessa direção, como você pode ver nos links acima.

No entanto, mesmo que o WASI melhore, não há como evitar o fato de que o Wasm possui duas APIs padronizadas mencionadas anteriormente. No futuro, espero que o Emscripten chame diretamente as APIs da Web usando tipos de interface, porque isso será mais compacto do que chamar uma API JS que parece WASI e que então chama uma API da Web (como no exemplo `musl_writev` mencionado antes). Poderíamos ter um polyfill ou uma camada de tradução para ajudar nisso, mas não gostaríamos de usá-lo desnecessariamente, então precisaremos de compilações separadas para os ambientes Web e WASI. (Isso é um pouco lamentável; em teoria isso poderia ter sido evitado se o WASI fosse um superconjunto das APIs da Web, mas obviamente isso teria significado compromissos no lado do servidor.)

## Status atual

Muita coisa já funciona! As principais limitações são:

- **Limitações do WebAssembly**: Vários recursos, como exceções em C++, setjmp e pthreads, dependem do JavaScript devido a limitações do Wasm, e ainda não existem substitutos adequados sem JS. (O Emscripten pode começar a suportar alguns deles [usando Asyncify](https://www.youtube.com/watch?v=qQOP6jqZqf8&list=PLqh1Mztq_-N2OnEXkdtF5yymcihwqG57y&index=2&t=0s), ou talvez esperemos apenas [os recursos nativos do Wasm](https://github.com/WebAssembly/exception-handling/blob/master/proposals/Exceptions.md) chegarem aos VMs.)
- **Limitações do WASI**: Bibliotecas e APIs como OpenGL e SDL ainda não possuem APIs correspondentes do WASI.

Você **pode** ainda usar tudo isso no modo autônomo do Emscripten, mas a saída conterá chamadas para código de suporte de runtime em JS. Como resultado, isso não será 100% WASI (por razões semelhantes, esses recursos também não funcionam no WASI SDK). Esses arquivos Wasm não funcionarão em runtimes WASI, mas você pode usá-los na Web e escrever seu próprio runtime JS para eles. Você também pode usá-los como plugins; por exemplo, um motor de jogos poderia ter plugins que renderizam usando OpenGL, e o desenvolvedor os compilaria no modo autônomo e implementaria as importações do OpenGL no runtime Wasm do motor. O modo Wasm autônomo ainda ajuda aqui porque torna a saída tão autônoma quanto o Emscripten pode fazê-la.

Você também pode encontrar APIs que **realmente** têm um substituto sem JS que ainda não convertemos, já que o trabalho ainda está em andamento. Por favor, [registre bugs](https://github.com/emscripten-core/emscripten/issues), e como sempre, toda ajuda é bem-vinda!
