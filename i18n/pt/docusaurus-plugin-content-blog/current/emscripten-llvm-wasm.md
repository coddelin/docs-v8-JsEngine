---
title: "Emscripten e o backend WebAssembly do LLVM"
author: "Alon Zakai"
avatars:
  - "alon-zakai"
date: 2019-07-01 16:45:00
tags:
  - WebAssembly
  - ferramentas
description: "Emscripten está mudando para o backend WebAssembly do LLVM, resultando em tempos de linkagem muito mais rápidos e muitos outros benefícios."
tweet: "1145704863377981445"
---
WebAssembly é normalmente compilado a partir de uma linguagem fonte, o que significa que os desenvolvedores precisam de *ferramentas* para utilizá-lo. Por isso, a equipe V8 trabalha em projetos de código aberto relevantes como [LLVM](http://llvm.org/), [Emscripten](https://emscripten.org/), [Binaryen](https://github.com/WebAssembly/binaryen/) e [WABT](https://github.com/WebAssembly/wabt). Este post descreve parte do trabalho que realizamos no Emscripten e no LLVM, o que em breve permitirá que o Emscripten mude para o [backend WebAssembly do LLVM](https://github.com/llvm/llvm-project/tree/main/llvm/lib/Target/WebAssembly) por padrão — por favor, teste e relate quaisquer problemas!

<!--truncate-->
O backend WebAssembly do LLVM tem sido uma opção no Emscripten há algum tempo, enquanto trabalhamos no backend em paralelo à sua integração no Emscripten, e em colaboração com outros membros da comunidade de ferramentas WebAssembly de código aberto. Agora ele alcançou o ponto onde o backend WebAssembly supera o antigo backend “[fastcomp](https://github.com/emscripten-core/emscripten-fastcomp/)” na maioria das métricas, e portanto gostaríamos de torná-lo padrão. Este anúncio acontece antes disso, para obter o máximo de testes possível primeiro.

Esta é uma atualização importante por várias razões empolgantes:

- **Linkagem muito mais rápida**: o backend WebAssembly do LLVM junto com [`wasm-ld`](https://lld.llvm.org/WebAssembly.html) tem suporte completo para compilação incremental usando arquivos objeto WebAssembly. O Fastcomp utilizava IR do LLVM em arquivos bitcode, o que significava que no tempo de linkagem o IR seria todo compilado pelo LLVM. Esse era o principal motivo para tempos de linkagem lentos. Com os arquivos objeto WebAssembly, por outro lado, os arquivos `.o` contêm WebAssembly já compilado (em uma forma relocável que pode ser vinculada, semelhante à vinculação nativa). Como resultado, a etapa de linkagem pode ser muito, muito mais rápida que no Fastcomp — veremos uma medição do mundo real abaixo com um aumento de velocidade de 7×!
- **Código mais rápido e menor**: Trabalhamos arduamente no backend WebAssembly do LLVM, bem como no otimizador Binaryen que o Emscripten executa após ele. O resultado é que o caminho do backend WebAssembly do LLVM agora supera o Fastcomp em velocidade e tamanho na maioria dos benchmarks que monitoramos.
- **Suporte a todo o IR do LLVM**: O Fastcomp podia lidar com o IR do LLVM emitido por `clang`, mas devido à sua arquitetura frequentemente falhava em outras fontes, especificamente ao “legalizar” o IR em tipos que o Fastcomp podia lidar. O backend WebAssembly do LLVM, por outro lado, usa a infraestrutura de backend comum do LLVM, então pode lidar com tudo.
- **Novos recursos do WebAssembly**: O Fastcomp compila para asm.js antes de executar `asm2wasm`, o que significa que é difícil lidar com novos recursos do WebAssembly, como chamadas de retorno, exceções, SIMD, e assim por diante. O backend WebAssembly é o local natural para trabalhar nesses recursos, e de fato estamos trabalhando em todos os recursos mencionados!
- **Atualizações gerais mais rápidas a partir do upstream**: Relacionado ao ponto anterior, usar o backend WebAssembly upstream significa que podemos utilizar sempre a versão mais recente do LLVM upstream, o que significa que podemos obter novos recursos de linguagem C++ no `clang`, novas otimizações de IR no LLVM, etc. assim que forem incorporados.

## Testando

Para testar o backend WebAssembly, basta usar o [último `emsdk`](https://github.com/emscripten-core/emsdk) e executar

```
emsdk install latest-upstream
emsdk activate latest-upstream
```

“Upstream” aqui refere-se ao fato de que o backend WebAssembly do LLVM está no upstream do LLVM, diferente do Fastcomp. Na verdade, já que está no upstream, você não precisa usar o `emsdk` se construir o LLVM+`clang` diretamente! (Para usar essa build com o Emscripten, basta adicionar o caminho dela no seu arquivo `.emscripten`.)

Atualmente, usar `emsdk [install|activate] latest` ainda utiliza o Fastcomp. Há também “latest-fastcomp” que faz o mesmo. Quando mudarmos o backend padrão, faremos com que “latest” faça o mesmo que “latest-upstream”, e nesse momento “latest-fastcomp” será a única maneira de obter o Fastcomp. O Fastcomp continua sendo uma opção enquanto ainda for útil; veja mais notas sobre isso no final.

## História

Este será o **terceiro** backend no Emscripten, e a **segunda** migração. O primeiro backend foi escrito em JavaScript e analisava o LLVM IR em formato de texto. Isso foi útil para experimentos em 2010, mas tinha desvantagens óbvias, incluindo o fato de que o formato de texto do LLVM mudava e a velocidade de compilação não era tão rápida quanto desejávamos. Em 2013, um novo backend foi escrito em um fork do LLVM, apelidado de "fastcomp". Ele foi projetado para emitir [asm.js](https://en.wikipedia.org/wiki/Asm.js), algo que o backend JS anterior foi adaptado para fazer (mas não fazia muito bem). Como resultado, houve uma grande melhoria na qualidade do código e no tempo de compilação.

Também foi uma mudança relativamente menor no Emscripten. Embora o Emscripten seja um compilador, os backends originais e fastcomp sempre foram uma parte relativamente pequena do projeto — muito mais código é usado para bibliotecas de sistema, integração de ferramentas, ligações de linguagem, e assim por diante. Portanto, embora a mudança no backend do compilador seja uma mudança dramática, ela afeta apenas uma parte do projeto como um todo.

## Benchmarks

### Tamanho do código

![Medições do tamanho do código (menor é melhor)](/_img/emscripten-llvm-wasm/size.svg)

(Todos os tamanhos aqui estão normalizados para fastcomp.) Como você pode ver, os tamanhos do backend WebAssembly são quase sempre menores! A diferença é mais perceptível nos microbenchmarks menores à esquerda (nomes em minúsculas), onde as novas melhorias nas bibliotecas de sistema têm mais impacto. Mas há uma redução no tamanho do código mesmo na maioria dos macrobenchmarks à direita (nomes em MAIÚSCULAS), que são bases de código do mundo real. A única regressão nos macrobenchmarks é o LZMA, onde o LLVM mais recente faz uma decisão de inline diferente que acaba sendo desfavorável.

No geral, os macrobenchmarks encolheram em uma média de **3,7%**. Nada mal para uma atualização de compilador! Observamos coisas semelhantes em bases de código do mundo real que não estão no conjunto de testes, por exemplo, [BananaBread](https://github.com/kripken/BananaBread/), uma portabilidade do [motor de jogo Cube 2](http://cubeengine.com/) para a Web, encolheu mais de **6%**, e [Doom 3 encolheu](http://www.continuation-labs.com/projects/d3wasm/) **15%**!

Essas melhorias no tamanho (e as melhorias de velocidade que discutiremos a seguir) devem-se a vários fatores:

- A geração de código do backend do LLVM é inteligente e pode fazer coisas que backends simples como o fastcomp não conseguem, como [GVN](https://en.wikipedia.org/wiki/Value_numbering).
- O LLVM mais recente possui melhores otimizações de IR.
- Trabalhamos bastante na otimização do Binaryen no output do backend WebAssembly, como mencionado anteriormente.

### Velocidade

![Medições de velocidade (menor é melhor)](/_img/emscripten-llvm-wasm/speed.svg)

(Medições feitas no V8.) Entre os microbenchmarks, a velocidade apresenta um quadro misto — o que não é tão surpreendente, já que a maioria deles é dominada por uma única função ou até mesmo um loop, então qualquer mudança no código emitido pelo Emscripten pode levar a uma escolha de otimização favorável ou desfavorável pelo VM. No geral, cerca do mesmo número de microbenchmarks permanece igual àqueles que melhoram ou que regridem. Olhando para os macrobenchmarks mais realistas, mais uma vez o LZMA é um ponto fora da curva, novamente devido a uma decisão desfavorável de inline mencionada anteriormente, mas, fora isso, todos os macrobenchmarks melhoram!

A mudança média nos macrobenchmarks é um aumento de velocidade de **3,2%**.

### Tempo de construção

![Medições de tempo de compilação e linkagem no BananaBread (menor é melhor)](/_img/emscripten-llvm-wasm/build.svg)

As mudanças no tempo de construção irão variar de projeto para projeto, mas aqui estão alguns números de exemplo do BananaBread, que é um motor de jogo completo, mas compacto, consistindo de 112 arquivos e 95.287 linhas de código. À esquerda, temos os tempos de construção para a etapa de compilação, ou seja, a compilação dos arquivos de origem em arquivos-objeto, usando o `-O3` padrão do projeto (todos os tempos estão normalizados para fastcomp). Como você pode ver, a etapa de compilação leva um pouco mais de tempo com o backend WebAssembly, o que faz sentido porque estamos fazendo mais trabalho nesta etapa — em vez de apenas compilar o código-fonte para um bitcode como o fastcomp faz, também compilamos o bitcode para WebAssembly.

Olhando à direita, temos os números para a etapa de linkagem (também normalizados para fastcomp), ou seja, produzindo o executável final, aqui com `-O0`, que é adequado para uma construção incremental (para uma construção totalmente otimizada, você provavelmente usaria também `-O3`, veja abaixo). Acontece que o pequeno aumento durante a etapa de compilação vale a pena, porque a linkagem é **mais de 7× mais rápida**! Essa é a verdadeira vantagem da compilação incremental: a maior parte da etapa de linkagem é apenas uma concatenação rápida de arquivos-objeto. E se você alterar apenas um arquivo-fonte e recompilar, quase tudo o que você precisa é dessa etapa de linkagem rápida, então você pode ver essa melhoria de velocidade o tempo todo durante o desenvolvimento no mundo real.

Conforme mencionado acima, as mudanças no tempo de build variarão por projeto. Em um projeto menor que BananaBread, a aceleração do tempo de link pode ser menor, enquanto em um projeto maior pode ser maior. Outro fator são as otimizações: conforme mencionado acima, o teste foi linkado com `-O0`, mas para uma build de release provavelmente você desejará usar `-O3`, e, nesse caso, o Emscripten invocará o otimizador Binaryen no WebAssembly final, rodará [meta-dce](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/) e outras tarefas úteis para reduzir o tamanho do código e aumentar a velocidade. Isso leva tempo extra, é claro, mas vale a pena para uma build de release — em BananaBread isso reduz o WebAssembly de 2,65 para 1,84 MB, uma melhoria de mais de **30%** —, mas para uma build incremental rápida você pode pular isso com `-O0`.

## Problemas conhecidos

Embora o backend de LLVM WebAssembly geralmente seja superior tanto no tamanho quanto na velocidade do código, observamos algumas exceções:

- [Fasta](https://github.com/emscripten-core/emscripten/blob/incoming/tests/fasta.cpp) apresenta regressões sem [conversões não-trap de float para int](https://github.com/WebAssembly/nontrapping-float-to-int-conversions), um novo recurso do WebAssembly que não estava no MVP do WebAssembly. O problema subjacente é que, no MVP, uma conversão de float para int será interrompida se estiver fora do intervalo de inteiros válidos. O raciocínio era que isso é comportamento indefinido em C de qualquer forma e fácil para as VMs implementarem. No entanto, isso acabou não sendo uma boa correspondência para como o LLVM compila conversões float para int, com o resultado de que guardas extras são necessárias, aumentando o tamanho do código e o overhead. As operações mais recentes não bloqueantes evitam isso, mas podem não estar presentes em todos os navegadores ainda. Você pode usá-las compilando arquivos de origem com `-mnontrapping-fptoint`.
- O backend de LLVM WebAssembly não é apenas um backend diferente de fastcomp, mas também usa um LLVM muito mais recente. Um LLVM mais recente pode tomar decisões diferentes de inline, que (como todas as decisões de inline na ausência de otimização com guia de perfil) são dirigidas por heurísticas e podem acabar ajudando ou prejudicando. Um exemplo específico mencionado anteriormente é no benchmark LZMA, onde o LLVM mais recente acaba fazendo inline de uma função 5 vezes de uma maneira que só causa prejuízo. Se você encontrar isso em seus próprios projetos, pode compilar seletivamente certos arquivos de origem com `-Os` para focar no tamanho do código, usar `__attribute__((noinline))`, etc.

Podem haver mais problemas de que não estamos cientes e que devem ser otimizados — por favor, avise-nos se encontrar algo!

## Outras mudanças

Há um pequeno número de recursos do Emscripten vinculados ao fastcomp e/ou ao asm.js, o que significa que eles não podem funcionar imediatamente com o backend WebAssembly, e, portanto, temos trabalhado em alternativas.

### Saída em JavaScript

Uma opção para saída que não seja WebAssembly ainda é importante em alguns casos — embora todos os navegadores principais tenham suporte ao WebAssembly há algum tempo, ainda há uma grande quantidade de máquinas antigas, celulares antigos, etc., que não têm suporte ao WebAssembly. Além disso, à medida que o WebAssembly adiciona novos recursos, algum tipo dessa questão continuará relevante. Compilar para JS é uma maneira de garantir que você possa alcançar todos, mesmo que a build não seja tão pequena ou rápida quanto o WebAssembly seria. Com fastcomp, simplesmente usávamos a saída asm.js diretamente para isso, mas com o backend WebAssembly obviamente algo diferente é necessário. Estamos usando o [`wasm2js`](https://github.com/WebAssembly/binaryen#wasm2js) do Binaryen para esse propósito, que, como o nome sugere, compila WebAssembly para JS.

Isso provavelmente merece um post de blog completo, mas, de forma breve, uma decisão de design chave aqui é que não há mais sentido em oferecer suporte ao asm.js. O asm.js pode ser executado muito mais rapidamente do que o JS geral, mas acontece que praticamente todos os navegadores que suportam otimizações AOT de asm.js também suportam WebAssembly de qualquer forma (na verdade, o Chrome otimiza asm.js convertendo-o para WebAssembly internamente!). Portanto, quando falamos sobre uma opção de fallback em JS, ela pode muito bem não usar asm.js; na verdade, é mais simples, nos permite suportar mais recursos no WebAssembly e também resulta em JS significativamente menor! Portanto, `wasm2js` não tem como alvo o asm.js.

No entanto, um efeito colateral desse design é que, se você testar uma build asm.js do fastcomp comparada a uma build JS com o backend WebAssembly, o asm.js pode ser muito mais rápido — se você estiver testando em um navegador moderno com otimizações AOT de asm.js. Provavelmente este é o caso para o seu próprio navegador, mas não para os navegadores que realmente precisariam da opção sem WebAssembly! Para uma comparação adequada, você deve usar um navegador sem otimizações de asm.js ou com elas desativadas. Se a saída de `wasm2js` ainda for mais lenta, avise-nos!

`wasm2js` está faltando alguns recursos menos utilizados, como link dinâmico e pthreads, mas a maior parte do código já deve funcionar, e ele foi cuidadosamente testado com fuzzing. Para testar a saída em JS, basta construir com `-s WASM=0` para desativar o WebAssembly. O `emcc` executa então o `wasm2js` para você, e, se for uma build otimizada, executará também várias otimizações úteis.

### Outras coisas que você pode notar

- As opções [Asyncify](https://github.com/emscripten-core/emscripten/wiki/Asyncify) e [Emterpreter](https://github.com/emscripten-core/emscripten/wiki/Emterpreter) só funcionam no fastcomp. Uma substituição [está](https://github.com/WebAssembly/binaryen/pull/2172) [sendo](https://github.com/WebAssembly/binaryen/pull/2173) [trabalhada](https://github.com/emscripten-core/emscripten/pull/8808) [nela](https://github.com/emscripten-core/emscripten/issues/8561). Esperamos que isso eventualmente seja uma melhoria em relação às opções anteriores.
- Bibliotecas pré-compiladas devem ser reconstruídas: se você possuir alguma `library.bc` que foi construída com fastcomp, será necessário reconstruí-la a partir do código-fonte utilizando uma versão mais recente do Emscripten. Isso sempre foi necessário quando o fastcomp atualizava o LLVM para uma nova versão que mudava o formato do bitcode, e a mudança agora (para arquivos de objeto WebAssembly em vez de bitcode) tem o mesmo efeito.

## Conclusão

Nosso principal objetivo agora é corrigir quaisquer bugs relacionados a essa mudança. Por favor, teste e registre problemas!

Depois que as coisas estiverem estabilizadas, mudaremos o backend padrão do compilador para o backend WebAssembly upstream. Fastcomp permanecerá como uma opção, conforme mencionado anteriormente.

Gostaríamos de eventualmente remover o fastcomp completamente. Fazer isso eliminaria um peso significativo de manutenção, permitiria que nos concentrássemos mais em novos recursos no backend WebAssembly, aceleraria melhorias gerais no Emscripten e outras vantagens. Por favor, informe-nos sobre como os testes estão indo em seus projetos para que possamos começar a planejar um cronograma para a remoção do fastcomp.

### Obrigado

Obrigado a todos envolvidos no desenvolvimento do backend LLVM WebAssembly, `wasm-ld`, Binaryen, Emscripten e outras coisas mencionadas neste post! Uma lista parcial dessas pessoas incríveis é: aardappel, aheejin, alexcrichton, dschuff, jfbastien, jgravelle, nwilson, sbc100, sunfish, tlively, yurydelendik.
