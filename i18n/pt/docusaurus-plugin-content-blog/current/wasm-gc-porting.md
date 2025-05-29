---
title: &apos;Uma nova maneira de trazer linguagens de programação com coleta de lixo de forma eficiente para WebAssembly&apos;
author: &apos;Alon Zakai&apos;
avatars:
  - &apos;alon-zakai&apos;
date: 2023-11-01
tags:
  - WebAssembly
tweet: &apos;1720161507324076395&apos;
---

Um artigo recente sobre [Coleta de Lixo em WebAssembly (WasmGC)](https://developer.chrome.com/blog/wasmgc) explica, em alto nível, como a [proposta de Coleta de Lixo (GC)](https://github.com/WebAssembly/gc) visa oferecer melhor suporte às linguagens GC no Wasm, o que é muito importante dada sua popularidade. Neste artigo, discutiremos os detalhes técnicos de como linguagens GC como Java, Kotlin, Dart, Python e C# podem ser portadas para Wasm. De fato, existem duas abordagens principais:

<!--truncate-->
- A abordagem de portabilidade “**tradicional**”, onde uma implementação existente da linguagem é compilada para WasmMVP, ou seja, o Produto Mínimo Viável do WebAssembly lançado em 2017.
- A abordagem de portabilidade **WasmGC**, onde a linguagem é compilada para os construtos de GC no próprio Wasm, definidos na proposta recente de GC.

Explicaremos o que são essas duas abordagens e os compromissos técnicos entre elas, especialmente no que diz respeito ao tamanho e à velocidade. Durante a explicação, veremos que o WasmGC tem várias vantagens importantes, mas também exige novos trabalhos tanto nas ferramentas de desenvolvimento quanto nas Máquinas Virtuais (VMs). As seções posteriores deste artigo explicarão o que a equipe do V8 tem feito nessas áreas, incluindo números de benchmarks. Se você está interessado em Wasm, GC ou ambos, esperamos que ache isso interessante e não deixe de conferir os links de demonstração e de introdução ao final!

## A Abordagem de Portabilidade “Tradicional”

Como as linguagens geralmente são portadas para novas arquiteturas? Digamos que Python queira rodar na [arquitetura ARM](https://en.wikipedia.org/wiki/ARM_architecture_family) ou Dart queira rodar na [arquitetura MIPS](https://en.wikipedia.org/wiki/MIPS_architecture). A ideia geral é então recompilar a VM para essa arquitetura. Além disso, se a VM tem código específico para arquitetura, como compilação just-in-time (JIT) ou ahead-of-time (AOT), então você também implementa um backend para JIT/AOT para a nova arquitetura. Essa abordagem faz bastante sentido porque geralmente a parte principal da base de código pode ser apenas recompilada para cada nova arquitetura para a qual você faz o port:


![Estrutura de uma VM portada](/_img/wasm-gc-porting/ported-vm.svg "À esquerda, código principal do runtime incluindo um parser, coletor de lixo, otimizador, suporte a bibliotecas e mais; à direita, código backend separado para x64, ARM, etc.")

Neste diagrama, o parser, suporte a bibliotecas, coletor de lixo, otimizador, etc., são todos compartilhados entre todas as arquiteturas no runtime principal. Portar para uma nova arquitetura só requer um novo backend para ela, que é uma quantidade de código comparativamente pequena.

Wasm é um alvo de compilação de baixo nível e, portanto, não é surpreendente que a abordagem de portabilidade tradicional possa ser usada. Desde que Wasm começou, vimos que isso funciona bem na prática em muitos casos, como [Pyodide para Python](https://pyodide.org/en/stable/) e [Blazor para C#](https://dotnet.microsoft.com/en-us/apps/aspnet/web-apps/blazor) (observe que Blazor suporta tanto [AOT](https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly?view=aspnetcore-7.0#ahead-of-time-aot-compilation) quanto [JIT](https://github.com/dotnet/runtime/blob/main/docs/design/mono/jiterpreter.md) compilação, então é um bom exemplo de tudo mencionado acima). Em todos esses casos, um runtime para a linguagem é compilado em WasmMVP como qualquer outro programa que é compilado para Wasm, e o resultado usa a memória linear, tabela, funções e assim por diante do WasmMVP.

Como mencionado anteriormente, é assim que as linguagens geralmente são portadas para novas arquiteturas, então faz muito sentido pela razão usual de que você pode reutilizar quase todo o código existente da VM, incluindo a implementação e as otimizações da linguagem. No entanto, verifica-se que existem várias desvantagens específicas do Wasm nessa abordagem, e é aí que o WasmGC pode ajudar.

## A Abordagem de Portabilidade WasmGC

Resumidamente, a proposta de GC para WebAssembly (“WasmGC”) permite que você defina tipos de structs e arrays e realize operações como criar instâncias deles, ler e escrever em campos, fazer conversões entre tipos, etc. (para mais detalhes, veja a [visão geral da proposta](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Overview.md)). Esses objetos são gerenciados pela própria implementação de GC da VM Wasm, o que é a principal diferença entre esta abordagem e a abordagem de portabilidade tradicional.

Pode ajudar pensar assim: _Se a abordagem tradicional de portabilidade é como portar uma linguagem para uma **arquitetura**, então a abordagem WasmGC é muito semelhante a como se porta uma linguagem para uma **VM**_. Por exemplo, se você quiser portar Java para JavaScript, pode usar um compilador como [J2CL](https://j2cl.io), que representa objetos Java como objetos JavaScript, e esses objetos JavaScript são então gerenciados pela VM do JavaScript como todos os outros. Portar linguagens para VMs existentes é uma técnica muito útil, como pode ser visto por todas as linguagens que compilam para [JavaScript](https://gist.github.com/matthiasak/c3c9c40d0f98ca91def1), [a JVM](https://en.wikipedia.org/wiki/List_of_JVM_languages), e [o CLR](https://en.wikipedia.org/wiki/List_of_CLI_languages).

Essa metáfora de arquitetura/VM não é exata, em particular porque o WasmGC pretende ser de um nível mais baixo do que as outras VMs que mencionamos no último parágrafo. Ainda assim, o WasmGC define structs e arrays gerenciados pela VM e um sistema de tipos para descrever suas formas e relacionamentos, e portar para o WasmGC é o processo de representar os constructos da sua linguagem com esses primitivos; isso é certamente de um nível mais alto do que um port tradicional para WasmMVP (que rebaixa tudo para bytes não tipados na memória linear). Assim, o WasmGC é bastante semelhante a ports de linguagens para VMs, e compartilha as vantagens de tais ports, em particular uma boa integração com a VM de destino e reutilização de suas otimizações.

## Comparando as Duas Abordagens

Agora que temos uma ideia de quais são as duas abordagens de portabilidade para linguagens com GC, vamos ver como elas se comparam.

### Envio de código de gerenciamento de memória

Na prática, muito código Wasm é executado dentro de uma VM que já tem um coletor de lixo, que é o caso da Web e também em runtime como [Node.js](https://nodejs.org/), [workerd](https://github.com/cloudflare/workerd), [Deno](https://deno.com/), e [Bun](https://bun.sh/). Nesses lugares, enviar uma implementação de GC adiciona tamanho desnecessário ao binário Wasm. De fato, isso não é apenas um problema com linguagens com GC no WasmMVP, mas também com linguagens que usam memória linear como C, C++ e Rust, já que código nessas linguagens que faz qualquer tipo de alocação interessante acabará por incorporar `malloc/free` para gerenciar a memória linear, o que requer vários kilobytes de código. Por exemplo, `dlmalloc` requer 6K, e até mesmo um malloc que troque velocidade por tamanho, como [`emmalloc`](https://groups.google.com/g/emscripten-discuss/c/SCZMkfk8hyk/m/yDdZ8Db3AwAJ), ocupa mais de 1K. O WasmGC, por outro lado, tem a VM gerenciando automaticamente a memória para nós, então não precisamos de código de gerenciamento de memória algum—nem GC nem `malloc/free`—no Wasm. No [artigo previamente mencionado sobre WasmGC](https://developer.chrome.com/blog/wasmgc), o tamanho do benchmark `fannkuch` foi medido e o WasmGC era muito menor do que C ou Rust—**2,3** K contra **6,1-9,6** K—por esse exato motivo.

### Coleta de ciclos

Nos navegadores, o Wasm frequentemente interage com JavaScript (e, através do JavaScript, com APIs Web), mas no WasmMVP (e até mesmo com a proposta de [tipos de referência](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md)) não há como ter links bidirecionais entre Wasm e JS que permitam que ciclos sejam coletados de maneira eficiente e detalhada. Links para objetos JS só podem ser colocados na tabela Wasm, e links de volta para o Wasm só podem se referir a toda a instância Wasm como um único grande objeto, assim:


![Ciclos entre JS e um módulo Wasm inteiro](/_img/wasm-gc-porting/cycle2.svg "Objetos JS individuais referem-se a uma única grande instância Wasm, e não a objetos individuais dentro dela.")

Isso não é suficiente para coletar eficientemente ciclos específicos de objetos onde alguns estão no VM compilada e outros no JavaScript. Com o WasmGC, por outro lado, definimos objetos Wasm que a VM conhece, e assim podemos ter referências adequadas do Wasm para o JavaScript e de volta:

![Ciclos entre JS e objetos WasmGC](/_img/wasm-gc-porting/cycle3.svg "JS e objetos Wasm com links entre eles.")

### Referências de GC na pilha

Linguagens com GC devem estar cientes de referências na pilha, ou seja, de variáveis locais em um escopo de chamada, já que tais referências podem ser a única coisa mantendo um objeto vivo. Em um port tradicional de uma linguagem com GC isso é um problema porque a sandbox do Wasm impede que programas inspecionem a própria pilha. Existem soluções para ports tradicionais, como uma pilha sombra ([que pode ser feita automaticamente](https://github.com/WebAssembly/binaryen/blob/main/src/passes/SpillPointers.cpp)), ou coletar lixo apenas quando nada está na pilha (o que é o caso entre turnos do loop de eventos do JavaScript). Uma possível adição futura que ajudaria ports tradicionais pode ser o [suporte a varredura de pilha](https://github.com/WebAssembly/design/issues/1459) no Wasm. Por enquanto, só o WasmGC pode lidar com referências na pilha sem sobrecarga, e faz isso de forma completamente automática, já que a VM Wasm é responsável pelo GC.

### Eficiência do GC

Um problema relacionado é a eficiência de executar um GC. Ambas as abordagens de portabilidade têm vantagens potenciais aqui. Um port tradicional pode reutilizar otimizações em uma VM existente que podem estar adaptadas a uma linguagem específica, como um foco intenso na otimização de ponteiros internos ou objetos de curta duração. Um port WasmGC que roda na Web, por outro lado, tem a vantagem de reutilizar todo o trabalho que foi feito para tornar o GC do JavaScript rápido, incluindo técnicas como [GC geracional](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Generational_GC_(ephemeral_GC)), [coleta incremental](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Stop-the-world_vs._incremental_vs._concurrent), etc. O WasmGC também delega o GC à VM, o que simplifica coisas como barreiras eficientes de gravação.

Outra vantagem do WasmGC é que o GC pode estar ciente de coisas como pressão de memória e pode ajustar seu tamanho de heap e frequência de coleta de acordo, novamente, como as VMs de JavaScript já fazem na Web.

### Fragmentação de memória

Com o tempo, e especialmente em programas de longa execução, operações de `malloc/free` na memória linear do WasmMVP podem causar *fragmentação*. Imagine que temos um total de 2 MB de memória, e bem no meio dela temos uma pequena alocação existente de apenas alguns bytes. Em linguagens como C, C++ e Rust é impossível mover uma alocação arbitrária em tempo de execução, e assim temos quase 1MB à esquerda dessa alocação e quase 1MB à direita. Mas esses são dois fragmentos separados, então se tentarmos alocar 1,5 MB, falharemos, mesmo que tenhamos essa quantidade de memória não alocada total:


![](/_img/wasm-gc-porting/fragment1.svg "Uma memória linear com uma alocação pequena e rude bem no meio, dividindo o espaço livre em 2 metades.")

Essa fragmentação pode forçar um módulo Wasm a aumentar sua memória com mais frequência, o que [adiciona sobrecarga e pode causar erros de falta de memória](https://github.com/WebAssembly/design/issues/1397); [melhorias](https://github.com/WebAssembly/design/issues/1439) estão sendo projetadas, mas é um problema desafiador. Esse é um problema em todos os programas WasmMVP, incluindo ports tradicionais de linguagens com GC (observe que os próprios objetos de GC podem ser móveis, mas não partes do próprio runtime). O WasmGC, por outro lado, evita esse problema porque a memória é completamente gerenciada pela VM, que pode movê-los para compactar o heap de GC e evitar fragmentação.

### Integração com ferramentas de desenvolvimento

Em um port tradicional para WasmMVP, objetos são colocados na memória linear, o que dificulta para as ferramentas de desenvolvedor fornecer informações úteis, porque essas ferramentas veem apenas bytes sem informação de tipo de alto nível. No WasmGC, por outro lado, a VM gerencia objetos de GC, então uma integração melhor é possível. Por exemplo, no Chrome você pode usar o heap profiler para medir o uso de memória de um programa WasmGC:


![Código WasmGC executando no heap profiler do Chrome](/_img/wasm-gc-porting/devtools.png)

A figura acima mostra a aba de memória no Chrome DevTools, onde temos um snapshot de um heap de uma página que executou código WasmGC que criou 1.001 pequenos objetos em uma [lista vinculada](https://gist.github.com/kripken/5cd3e18b6de41c559d590e44252eafff). Você pode ver o nome do tipo do objeto, `$Node`, e o campo `$next`, que refere-se ao próximo objeto na lista. Todas as informações usuais do snapshot do heap estão presentes, como o número de objetos, o tamanho superficial, o tamanho retido, etc., permitindo que vejamos facilmente quanta memória está realmente sendo usada pelos objetos WasmGC. Outros recursos do Chrome DevTools, como o depurador, também funcionam em objetos WasmGC.

### Semântica da linguagem

Quando você recompila uma VM em um port tradicional, obtém a linguagem exata que espera, já que está executando um código familiar que implementa essa linguagem. Isso é uma grande vantagem! Em comparação, com um port WasmGC, pode-se acabar considerando compromissos na semântica em troca de eficiência. Isso acontece porque, com WasmGC, definimos novos tipos de GC—estruturas e matrizes—e compilamos para eles. Como resultado, não podemos simplesmente compilar uma VM escrita em C, C++, Rust ou linguagens similares para essa forma, pois esses compilam apenas para memória linear, e assim o WasmGC não pode ajudar na grande maioria das bases de código de VM existentes. Em vez disso, em um port WasmGC, você normalmente escreve um novo código que transforma os construtos da sua linguagem em primitivos WasmGC. E existem várias maneiras de realizar essa transformação, com diferentes compromissos.

Se os compromissos são necessários ou não depende de como os construtos de uma linguagem específica podem ser implementados no WasmGC. Por exemplo, os campos da estrutura WasmGC têm índices e tipos fixos, então uma linguagem que deseja acessar campos de maneira mais dinâmica [pode enfrentar desafios](https://github.com/WebAssembly/gc/issues/397); existem várias maneiras de contornar isso, e nesse espaço de soluções algumas opções podem ser mais simples ou rápidas, mas não suportam toda a semântica original da linguagem. (O WasmGC também tem outras limitações atuais, por exemplo, ele não possui [ponteiros internos](https://go.dev/blog/ismmkeynote); ao longo do tempo, espera-se que tais coisas [melhorem](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md).)

Como mencionamos, compilar para WasmGC é como compilar para uma VM existente, e há muitos exemplos de compromissos que fazem sentido em tais portes. Por exemplo, [os números do dart2js (Dart compilado para JavaScript) se comportam de maneira diferente no VM do Dart](https://dart.dev/guides/language/numbers), e [as strings do IronPython (Python compilado para .NET) se comportam como strings do C#](https://nedbatchelder.com/blog/201703/ironpython_is_weird.html). Como resultado, nem todos os programas de uma linguagem podem ser executados nesses portes, mas há boas razões para essas escolhas: implementar números do dart2js como números do JavaScript permite que as VMs os otimizem bem, e usar strings do .NET no IronPython significa que você pode passar essas strings para outro código .NET sem sobrecarga.

Embora compromissos possam ser necessários em portes para WasmGC, o WasmGC também tem algumas vantagens como alvo de compilação em comparação ao JavaScript em particular. Por exemplo, enquanto o dart2js tem as limitações numéricas que acabamos de mencionar, o [dart2wasm](https://flutter.dev/wasm) (Dart compilado para WasmGC) se comporta exatamente como deveria, sem compromissos (isso é possível porque o Wasm possui representações eficientes para os tipos numéricos que o Dart exige).

Por que isso não é um problema para portes tradicionais? Simplesmente porque eles recompilam uma VM existente na memória linear, onde os objetos são armazenados em bytes sem tipagem, que é um nível mais baixo do que o WasmGC. Quando tudo o que você tem são bytes sem tipagem, então você tem muito mais flexibilidade para fazer todo tipo de truques de baixo nível (e potencialmente inseguros), e ao recompilar uma VM existente, você obtém todos os truques que a VM tem em sua manga.

### Esforço com Ferramentas

Como mencionamos na subseção anterior, um porte para WasmGC não pode simplesmente recompilar uma VM existente. Você pode reutilizar certo código (como a lógica do analisador e as otimizações AOT, porque essas não se integram com o GC em tempo de execução), mas, em geral, portes para WasmGC exigem uma quantidade substancial de novo código.

Em comparação, portes tradicionais para WasmMVP podem ser mais simples e rápidos: por exemplo, você pode compilar a VM do Lua (escrita em C) para Wasm em apenas alguns minutos. Um porte para WasmGC do Lua, por outro lado, exigiria mais esforço, pois você precisaria escrever código para transformar as construções do Lua em structs e arrays do WasmGC, e precisaria decidir como realmente fazer isso dentro das restrições específicas do sistema de tipos do WasmGC.

Portanto, um maior esforço nas ferramentas é uma desvantagem significativa dos portes para WasmGC. No entanto, dadas todas as vantagens que mencionamos anteriormente, achamos que o WasmGC ainda é muito atraente! A situação ideal seria aquela em que o sistema de tipos do WasmGC pudesse suportar todas as linguagens de maneira eficiente, e todas as linguagens contribuíssem para implementar um porte para WasmGC. A primeira parte disso será ajudada por [adições futuras ao sistema de tipos do WasmGC](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md), e para a segunda, podemos reduzir o trabalho envolvido em portes para WasmGC compartilhando o esforço com ferramentas o máximo possível. Felizmente, verifica-se que o WasmGC torna muito prático compartilhar o trabalho com ferramentas, como veremos na próxima seção.

## Otimizando o WasmGC

Já mencionamos que portes para WasmGC têm vantagens potenciais de velocidade, como usar menos memória e reutilizar otimizações no GC do host. Nesta seção, mostraremos outras vantagens interessantes de otimização do WasmGC em relação ao WasmMVP, que podem ter um grande impacto sobre como portes para WasmGC são projetados e quão rápidos são os resultados finais.

A questão chave aqui é que *o WasmGC é de nível mais alto do que o WasmMVP*. Para obter uma intuição sobre isso, lembre-se de que já dissemos que um porte tradicional para WasmMVP é como portar para uma nova arquitetura, enquanto um porte para WasmGC é como portar para uma nova VM, e as VMs, é claro, são abstrações de nível mais alto sobre arquiteturas – e representações de nível mais alto geralmente são mais otimizáveis. Podemos talvez ver isso mais claramente com um exemplo concreto em pseudocódigo:

```csharp
func foo() {
  let x = allocate<T>(); // Alocar um objeto GC.
  x.val = 10;            // Definir um campo para 10.
  let y = allocate<T>(); // Alocar outro objeto.
  y.val = x.val;         // Isso deve ser 10.
  return y.val;          // Isso também deve ser 10.
}
```

Como os comentários indicam, `x.val` conterá `10`, assim como `y.val`, então o retorno final também será `10`, e o otimizador pode até remover as alocações, levando a isso:

```csharp
func foo() {
  return 10;
}
```

Ótimo! Infelizmente, no entanto, isso não é possível no WasmMVP, porque cada alocação se transforma em uma chamada para `malloc`, uma função grande e complexa no Wasm que tem efeitos colaterais sobre a memória linear. Como resultado desses efeitos colaterais, o otimizador deve assumir que a segunda alocação (para `y`) pode alterar `x.val`, que também reside na memória linear. A gestão de memória é complexa, e quando a implementamos dentro do Wasm em um nível baixo, nossas opções de otimização são limitadas.

Em contrapartida, no WasmGC operamos em um nível mais alto: cada alocação executa a instrução `struct.new`, uma operação de VM que podemos realmente analisar, e um otimizador pode rastrear referências também para concluir que `x.val` é escrito exatamente uma vez com o valor `10`. Como resultado, podemos otimizar essa função para um simples retorno de `10`, como esperado!

Além das alocações, outras coisas que o WasmGC adiciona são ponteiros de função explícitos (`ref.func`) e chamadas usando eles (`call_ref`), tipos em campos de structs e arrays (diferente de memória linear sem tipagem), e mais. Como resultado, o WasmGC é uma Representação Intermediária (IR) de nível mais alto do que o WasmMVP e muito mais otimizável.

Se o WasmMVP tem capacidade de otimização limitada, como ele é tão rápido? Afinal, o Wasm pode rodar muito próximo da velocidade nativa. Isso ocorre porque o WasmMVP geralmente é o resultado de um compilador de otimização poderoso como o LLVM. O LLVM IR, como o WasmGC e ao contrário do WasmMVP, tem uma representação especial para alocações e assim por diante, permitindo que o LLVM otimize as coisas que temos discutido. O conceito do WasmMVP é que a maioria das otimizações ocorre no nível da ferramenta *antes* do Wasm, enquanto as VMs Wasm fazem apenas os ajustes finais de otimização (como alocação de registradores).

O WasmGC pode adotar um modelo de ferramenta semelhante ao WasmMVP, e em particular usar o LLVM? Infelizmente, não, pois o LLVM não suporta o WasmGC (algum nível de suporte [foi explorado](https://github.com/Igalia/ref-cpp), mas é difícil imaginar como o suporte completo poderia funcionar). Além disso, muitas linguagens que utilizam coleta de lixo (GC) não usam o LLVM—existe uma grande variedade de ferramentas de compilação nesse espaço. Por isso, precisamos de algo diferente para o WasmGC.

Felizmente, como mencionamos, o WasmGC é muito otimizado, o que abre novas possibilidades. Aqui está uma maneira de analisar isso:

![Fluxos de trabalho das ferramentas WasmMVP e WasmGC](/_img/wasm-gc-porting/workflows1.svg)

Tanto os fluxos de trabalho do WasmMVP quanto do WasmGC começam com os mesmos dois blocos à esquerda: iniciamos com código-fonte que é processado e otimizado de maneira específica à linguagem (cada linguagem conhece melhor suas próprias características). Então, surge uma diferença: para o WasmMVP, devemos realizar otimizações de uso geral primeiro e depois convertê-lo para Wasm, enquanto para o WasmGC temos a opção de primeiro convertê-lo para Wasm e otimizar depois. Isso é importante porque há uma grande vantagem em otimizar após a conversão: podemos compartilhar códigos de ferramentas para otimizações gerais entre todas as linguagens que compilam para WasmGC. A figura seguinte mostra como isso funciona:


![Várias ferramentas WasmGC são otimizadas pelo otimizador Binaryen](/_img/wasm-gc-porting/workflows2.svg "Várias linguagens à esquerda compilam para WasmGC no meio, e tudo flui para o otimizador Binaryen (wasm-opt).")

Já que podemos fazer otimizações gerais *após* compilar para WasmGC, um otimizador Wasm-para-Wasm pode ajudar todas as ferramentas de compilação WasmGC. Por essa razão, a equipe V8 investiu no WasmGC no [Binaryen](https://github.com/WebAssembly/binaryen/), que todas as ferramentas podem usar como o comando de linha `wasm-opt`. Vamos focar nisso na próxima subseção.

### Otimizações de ferramentas

[Binaryen](https://github.com/WebAssembly/binaryen/), o projeto de otimização de ferramentas para WebAssembly, já tinha uma [ampla gama de otimizações](https://www.youtube.com/watch?v=_lLqZR4ufSI) para conteúdo do WasmMVP, como inlining, propagação de constantes, eliminação de código morto, etc., quase todos os quais também se aplicam ao WasmGC. No entanto, como mencionamos antes, o WasmGC nos permite fazer muito mais otimizações do que o WasmMVP, e escrevemos muitas novas otimizações de acordo:

- [Análise de escape](https://github.com/WebAssembly/binaryen/blob/main/src/passes/Heap2Local.cpp) para mover alocações de heap para variáveis locais.
- [Desvirtualização](https://github.com/WebAssembly/binaryen/blob/main/src/passes/ConstantFieldPropagation.cpp) para transformar chamadas indiretas em diretas (que podem, potencialmente, ser inline).
- [Eliminação de código morto global mais poderosa](https://github.com/WebAssembly/binaryen/pull/4621).
- [Análise de fluxo de conteúdo consciente do tipo em todo o programa (GUFA)](https://github.com/WebAssembly/binaryen/pull/4598).
- [Otimizações de conversão](https://github.com/WebAssembly/binaryen/blob/main/src/passes/OptimizeCasts.cpp), como remoção de conversões redundantes e movê-las para locais anteriores.
- [Poda de tipos](https://github.com/WebAssembly/binaryen/blob/main/src/passes/GlobalTypeOptimization.cpp).
- [Fusão de tipos](https://github.com/WebAssembly/binaryen/blob/main/src/passes/TypeMerging.cpp).
- Refinamento de tipo (para [variáveis locais](https://github.com/WebAssembly/binaryen/blob/main/src/passes/LocalSubtyping.cpp), [globais](https://github.com/WebAssembly/binaryen/blob/main/src/passes/GlobalRefining.cpp), [campos](https://github.com/WebAssembly/binaryen/blob/main/src/passes/TypeRefining.cpp) e [assinaturas](https://github.com/WebAssembly/binaryen/blob/main/src/passes/SignatureRefining.cpp)).

Essa é apenas uma lista rápida de alguns dos trabalhos que temos realizado. Para saber mais sobre as novas otimizações de GC do Binaryen e como usá-las, veja os [documentos do Binaryen](https://github.com/WebAssembly/binaryen/wiki/GC-Optimization-Guidebook).

Para medir a eficácia de todas essas otimizações no Binaryen, vamos analisar o desempenho do Java com e sem `wasm-opt`, no resultado do compilador [J2Wasm](https://github.com/google/j2cl/tree/master/samples/wasm), que compila Java para WasmGC:

![Desempenho do Java com e sem wasm-opt](/_img/wasm-gc-porting/benchmark1.svg "Benchmarks Box2D, DeltaBlue, RayTrace e Richards, todos mostrando uma melhoria com wasm-opt.")

Aqui, “sem wasm-opt” significa que não executamos as otimizações do Binaryen, mas ainda otimizamos na VM e no compilador J2Wasm. Como mostrado na figura, `wasm-opt` oferece um aumento significativo de velocidade em cada um desses benchmarks, tornando-os em média **1,9×** mais rápidos.

Em resumo, `wasm-opt` pode ser usado por qualquer cadeia de ferramentas que compile para WasmGC, evitando a necessidade de reimplementar otimizações gerais em cada uma delas. E, à medida que continuamos a melhorar as otimizações do Binaryen, isso beneficiará todas as cadeias de ferramentas que utilizam `wasm-opt`, assim como as melhorias no LLVM ajudam todas as linguagens que compilam para WasmMVP usando o LLVM.

As otimizações da cadeia de ferramentas são apenas uma parte do cenário. Como veremos a seguir, as otimizações em máquinas virtuais Wasm também são absolutamente críticas.

### Otimizações do V8

Como mencionamos, o WasmGC é mais otimizado do que o WasmMVP, e não apenas cadeias de ferramentas podem se beneficiar disso, mas também as máquinas virtuais. E isso se revela importante porque as linguagens GC são diferentes das linguagens que compilam para WasmMVP. Considere, por exemplo, a **inlining**, uma das otimizações mais importantes: linguagens como C, C++ e Rust fazem inlining na compilação, enquanto linguagens GC como Java e Dart normalmente são executadas em uma máquina virtual que faz inlining e otimizações durante o tempo de execução. Esse modelo de desempenho influenciou tanto o design das linguagens quanto a forma como as pessoas escrevem código em linguagens GC.

Por exemplo, em uma linguagem como Java, todas as chamadas começam como indiretas (uma classe filha pode substituir uma função pai, mesmo ao chamar uma filha usando uma referência do tipo pai). Beneficiamos sempre que a cadeia de ferramentas consegue transformar uma chamada indireta em direta, mas, na prática, padrões de código em programas Java do mundo real frequentemente têm caminhos com muitas chamadas indiretas, ou pelo menos aquelas que não podem ser inferidas estaticamente como diretas. Para lidar bem com esses casos, implementamos **inlining especulativo** no V8, ou seja, chamadas indiretas são registradas à medida que ocorrem durante o tempo de execução, e, se vemos que um local de chamada tem um comportamento relativamente simples (poucos alvos de chamada), então realizamos inlining ali com verificações de guarda apropriadas, o que está mais alinhado com a forma como o Java normalmente é otimizado do que se deixássemos essas coisas inteiramente para a cadeia de ferramentas.

Dados do mundo real validam essa abordagem. Medimos o desempenho no Google Sheets Calc Engine, que é uma base de código Java usada para calcular fórmulas de planilhas, que até agora foi compilada para JavaScript usando [J2CL](https://j2cl.io). A equipe do V8 tem colaborado com o Sheets e o J2CL para portar esse código para WasmGC, tanto pelos benefícios esperados de desempenho para o Sheets quanto para fornecer feedback útil do mundo real ao processo de especificação do WasmGC. Observando o desempenho, descobrimos que o inlining especulativo é a otimização individual mais significativa que implementamos para WasmGC no V8, como mostra o gráfico a seguir:


![Desempenho do Java com diferentes otimizações do V8](/_img/wasm-gc-porting/benchmark2.svg "Latência do WasmGC sem otimizações, com outras otimizações, com inlining especulativo e com inlining especulativo + outras otimizações. A maior melhoria de longe é adicionar inlining especulativo.")

“Outras otimizações” aqui significa otimizações além do inlining especulativo que pudemos desativar para fins de medição, incluindo: eliminação de carregamento, otimizações baseadas em tipo, eliminação de branches, agrupamento constante, análise de escape e eliminação de subexpressões comuns. “Sem otimizações” significa que desativamos todas essas, bem como inlining especulativo (mas existem outras otimizações no V8 que não podemos desativar facilmente; por essa razão, os números aqui são apenas uma aproximação). A melhoria muito grande devido ao inlining especulativo — cerca de **30%** de aceleração (!) — em comparação com todas as outras otimizações juntas mostra como o inlining é importante, pelo menos no Java compilado.

Além do inlining especulativo, o WasmGC se baseia no suporte Wasm existente no V8, o que significa que se beneficia do mesmo pipeline de otimização, alocação de registradores, tiering e assim por diante. Além de tudo isso, aspectos específicos do WasmGC podem se beneficiar de otimizações adicionais, sendo o mais óbvio otimizar as novas instruções que o WasmGC fornece, como ter uma implementação eficiente de casts de tipo. Outro trabalho importante que realizamos foi usar as informações de tipo do WasmGC no otimizador. Por exemplo, `ref.test` verifica se uma referência é de um tipo específico durante o tempo de execução, e após o sucesso desse teste sabemos que `ref.cast`, um cast para o mesmo tipo, também terá sucesso. Isso ajuda a otimizar padrões como este em Java:

```java
if (ref instanceof Type) {
  foo((Type) ref); // Essa conversão descendente pode ser eliminada.
}
```

Essas otimizações são especialmente úteis após o inlining especulativo, porque então vemos mais do que a cadeia de ferramentas viu ao produzir o Wasm.

No geral, no WasmMVP havia uma separação bastante clara entre otimizações de cadeia de ferramentas e máquina virtual: fizemos o máximo possível na cadeia de ferramentas e deixamos apenas as necessárias para a máquina virtual, o que fazia sentido, pois mantinha as máquinas virtuais mais simples. Com o WasmGC, esse equilíbrio pode mudar um pouco, porque, como vimos, há uma necessidade de realizar mais otimizações em tempo de execução para linguagens GC, e também o próprio WasmGC é mais otimizável, permitindo maior sobreposição entre as otimizações de cadeia de ferramentas e de máquina virtual. Será interessante ver como o ecossistema se desenvolve nesse aspecto.

## Demonstração e status

Você pode usar WasmGC hoje! Após alcançar [fase 4](https://github.com/WebAssembly/meetings/blob/main/process/phases.md#4-standardize-the-feature-working-group) no W3C, WasmGC agora é um padrão completo e finalizado, e o Chrome 119 foi lançado com suporte para ele. Com esse navegador (ou qualquer outro navegador que tenha suporte ao WasmGC; por exemplo, o Firefox 120 espera ser lançado com suporte ao WasmGC ainda este mês), você pode executar este [demo do Flutter](https://flutterweb-wasm.web.app/) no qual o Dart compilado para WasmGC alimenta a lógica da aplicação, incluindo seus widgets, layout e animação.

![O demo do Flutter rodando no Chrome 119.](/_img/wasm-gc-porting/flutter-wasm-demo.png "Material 3 renderizado pelo Flutter WasmGC.")

## Começando

Se você está interessado em usar WasmGC, os links a seguir podem ser úteis:

- Diversas toolchains possuem suporte ao WasmGC hoje, incluindo [Dart](https://flutter.dev/wasm), [Java (J2Wasm)](https://github.com/google/j2cl/blob/master/docs/getting-started-j2wasm.md), [Kotlin](https://kotl.in/wasmgc), [OCaml (wasm_of_ocaml)](https://github.com/ocaml-wasm/wasm_of_ocaml) e [Scheme (Hoot)](https://gitlab.com/spritely/guile-hoot).
- O [código-fonte](https://gist.github.com/kripken/5cd3e18b6de41c559d590e44252eafff) do pequeno programa cujo output mostramos na seção de ferramentas de desenvolvedor é um exemplo de como escrever um programa “hello world” em WasmGC à mão. (Em particular, você pode ver o tipo `$Node` definido e então criado usando `struct.new`.)
- A wiki do Binaryen possui [documentação](https://github.com/WebAssembly/binaryen/wiki/GC-Implementation---Lowering-Tips) sobre como compiladores podem emitir código WasmGC que seja otimizado. Os links anteriores para as várias toolchains que visam WasmGC também podem ser úteis para aprendizado; por exemplo, você pode olhar os passes e flags do Binaryen que [Java](https://github.com/google/j2cl/blob/8609e47907cfabb7c038101685153d3ebf31b05b/build_defs/internal_do_not_use/j2wasm_application.bzl#L382-L415), [Dart](https://github.com/dart-lang/sdk/blob/f36c1094710bd51f643fb4bc84d5de4bfc5d11f3/sdk/bin/dart2wasm#L135) e [Kotlin](https://github.com/JetBrains/kotlin/blob/f6b2c642c2fff2db7f9e13cd754835b4c23e90cf/libraries/tools/kotlin-gradle-plugin/src/common/kotlin/org/jetbrains/kotlin/gradle/targets/js/binaryen/BinaryenExec.kt#L36-L67) utilizam.

## Resumo

WasmGC é uma maneira nova e promissora de implementar linguagens com GC no WebAssembly. Portas tradicionais, nas quais uma VM é recompilada para Wasm, ainda farão mais sentido em alguns casos, mas esperamos que portes WasmGC se tornem uma técnica popular devido aos seus benefícios: Portes WasmGC têm a capacidade de serem menores do que portas tradicionais—até menores do que programas WasmMVP escritos em C, C++ ou Rust—e se integram melhor com a web em questões como coleta de ciclos, uso de memória, ferramentas de desenvolvimento e mais. WasmGC também é uma representação mais otimizada, o que pode fornecer benefícios significativos de velocidade, bem como oportunidades de compartilhar mais esforços em toolchains entre linguagens.

