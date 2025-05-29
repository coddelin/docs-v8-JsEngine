---
title: 'Iniciando o interpretador Ignition'
author: 'Ross McIlroy, Iniciador do Ignition no V8'
avatars:
  - 'ross-mcilroy'
date: 2016-08-23 13:33:37
tags:
  - internals
description: 'Com o interpretador Ignition, o V8 compila funções JavaScript para um bytecode conciso, que tem entre 50% a 25% do tamanho do código de máquina equivalente de baixo nível.'
---
O V8 e outros motores modernos de JavaScript alcançam sua velocidade através da [compilação just-in-time (JIT)](https://en.wikipedia.org/wiki/Just-in-time_compilation) de script para código de máquina nativo imediatamente antes da execução. O código é inicialmente compilado por um compilador básico, que pode gerar código de máquina não otimizado rapidamente. O código compilado é analisado durante a execução e, opcionalmente, recompilado dinamicamente com um compilador otimizador mais avançado para obter desempenho máximo. No V8, esse pipeline de execução de script possui uma variedade de casos especiais e condições que exigem uma complexa maquinaria para alternar entre o compilador básico e dois compiladores otimizadores, Crankshaft e TurboFan.

<!--truncate-->
Um dos problemas com essa abordagem (além da complexidade arquitetônica) é que o código de máquina JIT pode consumir uma quantidade significativa de memória, mesmo que o código seja executado apenas uma vez. Para mitigar esse overhead, a equipe do V8 desenvolveu um novo interpretador JavaScript, chamado Ignition, que pode substituir o compilador básico do V8, executando código com menor overhead de memória e abrindo caminho para um pipeline de execução de script mais simples.

Com o Ignition, o V8 compila funções JavaScript para um bytecode conciso, que possui entre 50% a 25% do tamanho do código de máquina equivalente do compilador básico. Esse bytecode é então executado por um interpretador de alto desempenho que proporciona velocidades de execução em sites do mundo real próximas às do código gerado pelo compilador básico atual do V8.

No Chrome 53, o Ignition será ativado para dispositivos Android com RAM limitada (512 MB ou menos), onde as economias de memória são mais necessárias. Resultados de experimentos iniciais no campo mostram que o Ignition reduz a memória de cada aba do Chrome em cerca de 5%.

![Pipeline de compilação do V8 com Ignition ativado](/_img/ignition-interpreter/ignition-pipeline.png)

## Detalhes

Ao construir o interpretador de bytecode do Ignition, a equipe considerou várias abordagens de implementação potenciais. Um interpretador tradicional, escrito em C++, não seria capaz de interagir eficientemente com o restante do código gerado do V8. Uma alternativa seria ter codificado manualmente o interpretador em assembly, no entanto, dado que o V8 suporta nove arquiteturas, isso exigiria um enorme esforço de engenharia.

Em vez disso, optamos por uma abordagem que aproveitasse a força do TurboFan, nosso novo compilador otimizador, já ajustado para interação ideal com o runtime do V8 e outros códigos gerados. O interpretador Ignition usa as instruções de macro-montagem independente de arquitetura de baixo nível do TurboFan para gerar manipuladores de bytecode para cada opcode. O TurboFan compila essas instruções para a arquitetura alvo, realizando seleção de instrução de baixo nível e alocação de registradores no processo. Isso resulta em código de interpretador altamente otimizado, capaz de executar as instruções de bytecode e interagir com o restante da máquina virtual V8 de forma eficiente, com uma quantidade mínima de nova maquinaria adicionada ao código base.

O Ignition é uma máquina de registradores, em que cada bytecode especifica suas entradas e saídas como operandos de registrador explícitos, ao contrário de uma máquina de pilha onde cada bytecode consumiria entradas e empilharia saídas em uma pilha implícita. Um registrador acumulador especial é uma entrada e saída implícita para muitos bytecodes. Isso reduz o tamanho dos bytecodes, evitando a necessidade de especificar operandos de registrador específicos. Como muitas expressões JavaScript envolvem cadeias de operações que são avaliadas da esquerda para a direita, os resultados temporários dessas operações frequentemente podem permanecer no acumulador durante a avaliação da expressão, minimizando a necessidade de operações que carreguem e armazenem valores em registradores explícitos.

À medida que o bytecode é gerado, ele passa por uma série de estágios de otimização inline. Esses estágios realizam análises simples no fluxo de bytecode, substituindo padrões comuns por sequências mais rápidas, removendo algumas operações redundantes e minimizando o número de carregamentos e transferências de registradores desnecessários. Juntas, as otimizações reduzem ainda mais o tamanho do bytecode e melhoram o desempenho.

Para mais detalhes sobre a implementação do Ignition, veja nossa palestra no BlinkOn:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/r5OWCtuKiAk" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

## Futuro

Nosso foco no Ignition até agora tem sido reduzir a sobrecarga de memória do V8. No entanto, adicionar o Ignition ao nosso pipeline de execução de scripts abre uma série de possibilidades futuras. O pipeline do Ignition foi projetado para nos permitir tomar decisões mais inteligentes sobre quando executar e otimizar o código para acelerar o carregamento de páginas da web e reduzir interrupções, além de tornar a interação entre os diversos componentes do V8 mais eficiente.

Fique atento aos desenvolvimentos futuros no Ignition e V8.
