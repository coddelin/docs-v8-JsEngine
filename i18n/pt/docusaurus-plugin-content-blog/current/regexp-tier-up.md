---
title: "Melhorando expressões regulares no V8"
author: "Patrick Thier e Ana Peško, expressadores regulares de opiniões sobre expressões regulares"
avatars:
  - "patrick-thier"
  - "ana-pesko"
date: 2019-10-04 15:24:16
tags:
  - internals
  - RegExp
description: "Neste post de blog, descrevemos como aproveitamos as vantagens de interpretar expressões regulares e mitigamos as desvantagens."
tweet: "1180131710568030208"
---
Na configuração padrão, o V8 compila expressões regulares para código nativo na primeira execução. Como parte do nosso trabalho no [V8 sem JIT](/blog/jitless), introduzimos um interpretador para expressões regulares. Interpretar expressões regulares tem a vantagem de usar menos memória, mas vem com uma penalidade de desempenho. Neste post de blog, descrevemos como aproveitamos as vantagens de interpretar expressões regulares enquanto mitigamos as desvantagens.

<!--truncate-->
## Estratégia de escalonamento para RegExp

Queremos usar o ‘melhor de dois mundos’ para expressões regulares. Para isso, primeiro compilamos todas as expressões regulares para bytecode e as interpretamos. Assim, economizamos muita memória e, no geral (e com o novo interpretador mais rápido), a penalidade de desempenho é aceitável. Se uma expressão regular com o mesmo padrão for usada novamente, consideramos que ela está ‘aquecida’, então recompilamos para código nativo. A partir desse ponto, continuamos a execução o mais rápido possível.

Existem muitos caminhos diferentes através do código de expressão regular no V8, dependendo do método invocado, se é uma expressão global ou não-global, e se estamos seguindo o caminho rápido ou lento. Isso dito, queremos que a decisão de escalonamento seja o mais centralizada possível. Adicionamos um campo de contagem ao objeto RegExp do V8 que é inicializado com um certo valor em tempo de execução. Este valor representa o número de vezes que a expressão regular será interpretada antes de escalonarmos para o compilador. Cada vez que a expressão regular é interpretada, decrementamos o campo de contagem em 1. Em um método incorporado escrito em [CodeStubAssembler](/blog/csa), que é invocado para todas as expressões regulares, verificamos o sinalizador de contagem em cada execução. Uma vez que a contagem atinge 0, sabemos que precisamos recompilar a expressão regular para código nativo e pulamos para o tempo de execução para fazer isso.

Mencionamos que as expressões regulares podem ter diferentes caminhos de execução. No caso de substituições globais com funções como parâmetros, as implementações para código nativo e bytecode diferem. O código nativo espera uma matriz para armazenar todos os resultados antecipadamente, e o bytecode corresponde um de cada vez. Por causa disso, decidimos sempre escalonar ansiosamente para código nativo para esse caso de uso.

## Acelerando o interpretador de RegExp

### Remover sobrecarga em tempo de execução

Quando uma expressão regular é executada, um método incorporado escrito em [CodeStubAssembler](/blog/csa) é invocado. Este método anteriormente verificava se o campo de código do objeto JSRegExp continha código nativo JIT compilado que poderia ser executado diretamente, e caso contrário, chamava um método de tempo de execução para compilar (ou interpretar no modo sem JIT) a RegExp. No modo sem JIT, todas as execuções de uma expressão regular passavam pelo tempo de execução do V8, o que é bastante caro porque precisamos fazer a transição entre código JavaScript e C++ na pilha de execução.

A partir do V8 v7.8, sempre que o compilador de RegExp gera bytecode para interpretar uma expressão regular, um trampolim para o interpretador de RegExp agora é armazenado no campo de código do objeto JSRegExp além do bytecode gerado. Desta forma, o interpretador agora é chamado diretamente pelo método incorporado sem um desvio pelo tempo de execução.

### Novo método de despacho

O interpretador de RegExp anteriormente usava um método de despacho simples baseado em `switch`. A principal desvantagem deste método é que a CPU tem muita dificuldade em prever o próximo bytecode a ser executado, resultando em muitos erros de previsão de ramificação, o que desacelera a execução.

Alteramos o método de despacho para código encadeado no V8 v7.8. Este método permite que o preditor de ramificação da CPU preveja o próximo bytecode com base no bytecode atualmente executado, resultando em menos erros de previsão. Em mais detalhes, usamos uma tabela de despacho, armazenando um mapeamento entre cada ID de bytecode e o endereço do manipulador que implementa o bytecode. O interpretador [Ignition](/docs/ignition) do V8 também usa essa abordagem. No entanto, uma grande diferença entre Ignition e o interpretador de RegExp é que os manipuladores de bytecode de Ignition são escritos em [CodeStubAssembler](/blog/csa), enquanto o interpretador de RegExp é escrito inteiramente em C++ usando [`goto` computado](https://gcc.gnu.org/onlinedocs/gcc/Labels-as-Values.html) (uma extensão GNU também suportada pelo clang), que é mais fácil de ler e manter do que CSA. Para compiladores que não suportam `goto` computado, voltamos ao antigo método baseado em `switch`.

### Otimização de bytecode usando peephole

Antes de falarmos sobre a otimização de peephole de bytecode, vamos observar um exemplo motivador.

```js
const re = /[^_]*/;
const str = 'a0b*c_ef';
re.exec(str);
// → corresponde a 'a0b*c'
```

Para este padrão simples, o compilador RegExp cria 3 bytecodes que são executados para cada caractere. Em um nível alto, eles são:

1. Carregar o caractere atual.
1. Verifique se o caractere é igual a `'_'`.
1. Caso contrário, avance a posição atual na string de assunto e `vá para 1`.

Para nossa string de assunto, interpretamos 17 bytecodes até encontrar um caractere que não corresponda. A ideia da otimização de peephole é substituir sequências de bytecodes por um novo bytecode otimizado que combina a funcionalidade de múltiplos bytecodes. No nosso exemplo, podemos até lidar explicitamente com o loop implícito criado pelo `goto` no novo bytecode, assim um único bytecode lida com todos os caracteres correspondentes, economizando 16 dispatches.

Embora o exemplo seja inventado, a sequência de bytecodes descrita aqui ocorre frequentemente em sites reais. Analisamos [sites reais](/blog/real-world-performance) e criamos novos bytecodes otimizados para as sequências de bytecodes mais frequentes que encontramos.

## Resultados

![Figura 1: Economia de memória para diferentes valores de tier-up](/_img/regexp-tier-up/results-memory.svg)

A Figura 1 mostra o impacto na memória de diferentes estratégias de tier-up para histórias de navegação do Facebook, Reddit, Twitter e Tumblr. O padrão é o tamanho do código JITted e, em seguida, o tamanho do código regexp que acabamos usando (tamanho do bytecode se não houver tier-up, tamanho do código nativo se houver) para ticks inicializados em 1, 10 e 100. Por fim, temos o tamanho do código regexp se interpretarmos todas as expressões regulares. Usamos esses resultados e outros benchmarks para decidir ativar o tier-up com ticks inicializados em 1, ou seja, interpretamos a expressão regular uma vez e depois fazemos o tier-up.

Com essa estratégia de tier-up em vigor, reduzimos o tamanho do heap de código do V8 entre 4 e 7% em sites reais e o tamanho eficaz do V8 entre 1 e 2%.

![Figura 2: Comparação de desempenho do RegExp](/_img/regexp-tier-up/results-speed.svg)

A Figura 2 mostra o impacto no desempenho do interpretador RegExp para todas as melhorias descritas neste post[^strict-bounds] no conjunto de benchmarks RexBench. Para referência, também é mostrado o desempenho do RegExp compilado pelo JIT (Nativo).

[^strict-bounds]: Os resultados mostrados aqui também incluem uma melhoria nas expressões regulares já descrita nas [notas de lançamento do V8 v7.8](/blog/v8-release-78#faster-regexp-match-failures).

O novo interpretador é até 2× mais rápido que o antigo, com uma média de cerca de 1,45× mais rápido. Chegamos bem perto do desempenho do RegExp JITted na maioria dos benchmarks, sendo Regex DNA a única exceção. A razão pela qual os RegExp interpretados são muito mais lentos do que os RegExp JITted neste benchmark é devido às longas strings de assunto (~300.000 caracteres) usadas. Embora tenhamos reduzido a sobrecarga de dispatch ao mínimo, a sobrecarga aumenta em strings com mais de 1.000 caracteres, resultando em execução mais lenta. Como o interpretador é muito mais lento em strings longas, adicionamos uma heurística que faz tier-up antecipadamente para essas strings.

## Conclusão

A partir do V8 v7.9 (Chrome 79), fazemos tier-up nas expressões regulares em vez de compilá-las imediatamente. Portanto, o interpretador, anteriormente usado apenas no V8 sem JIT, agora é usado em todo lugar. Como resultado, economizamos memória. Aceleramos o interpretador para tornar isso viável. Mas esta não é a última palavra — mais melhorias podem ser esperadas no futuro.

Gostaríamos de aproveitar esta oportunidade para agradecer a todos da equipe do V8 pelo apoio durante nosso estágio. Foi uma experiência incrível!
