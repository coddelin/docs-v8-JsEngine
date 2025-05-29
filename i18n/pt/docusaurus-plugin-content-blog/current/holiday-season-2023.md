---
title: 'V8 está mais rápido e seguro do que nunca!'
author: '[Victor Gomes](https://twitter.com/VictorBFG), o especialista em Glühwein'
avatars:
  - victor-gomes
date: 2023-12-14
tags:
  - JavaScript
  - WebAssembly
  - segurança
  - benchmarks
description: "As impressionantes realizações do V8 em 2023"
tweet: ''
---

Bem-vindo ao emocionante mundo do V8, onde velocidade não é apenas uma característica, mas um estilo de vida. Enquanto nos despedimos de 2023, é hora de celebrar as impressionantes realizações que o V8 alcançou este ano.

Através de otimizações inovadoras de desempenho, o V8 continua a expandir os limites do que é possível no cenário em constante evolução da Web. Introduzimos um novo compilador de nível intermediário e implementamos várias melhorias na infraestrutura do compilador de alto nível, no runtime e no coletor de lixo, o que resultou em ganhos significativos de velocidade em todos os aspectos.

<!--truncate-->
Além das melhorias de desempenho, lançamos novos recursos empolgantes tanto para JavaScript quanto para WebAssembly. Também enviamos uma abordagem nova para trazer linguagens de programação com coleta de lixo de maneira eficiente para a Web com [WebAssembly Garbage Collection (WasmGC)](https://v8.dev/blog/wasm-gc-porting).

Mas nosso compromisso com a excelência não para por aí – também priorizamos a segurança. Melhoramos nossa infraestrutura de proteção e introduzimos [Integridade de Fluxo de Controle (CFI)](https://en.wikipedia.org/wiki/Control-flow_integrity) no V8, proporcionando um ambiente mais seguro para os usuários.

Abaixo, destacamos alguns dos principais destaques do ano.

# Maglev: novo compilador otimizador de nível intermediário

Introduzimos um novo compilador otimizador chamado [Maglev](https://v8.dev/blog/maglev), estrategicamente posicionado entre nossos compiladores existentes [Sparkplug](https://v8.dev/blog/sparkplug) e [TurboFan](https://v8.dev/docs/turbofan). Ele funciona como um compilador otimizador de alta velocidade, gerando código otimizado de forma eficiente e rápida. Gera código aproximadamente 20 vezes mais devagar que nosso compilador básico não otimizador Sparkplug, mas 10 a 100 vezes mais rápido que o TurboFan de alto nível. Observamos melhorias significativas de desempenho com Maglev, com [JetStream](https://browserbench.org/JetStream2.1/) melhorando em 8,2% e [Speedometer](https://browserbench.org/Speedometer2.1/) em 6%. A velocidade de compilação mais rápida do Maglev e a menor dependência do TurboFan resultaram em uma economia de energia de 10% no consumo geral do V8 durante os testes no Speedometer. [Embora ainda não completamente desenvolvido](https://en.m.wikipedia.org/wiki/Full-employment_theorem), o estado atual do Maglev justifica seu lançamento no Chrome 117. Mais detalhes em nosso [post no blog](https://v8.dev/blog/maglev).

# Turboshaft: nova arquitetura para o compilador otimizador de alto nível

Maglev não foi nosso único investimento em tecnologia de compiladores melhorada. Também introduzimos Turboshaft, uma nova arquitetura interna para nosso compilador otimizador de alto nível Turbofan, tornando-o mais fácil de estender com novas otimizações e mais rápido na compilação. Desde o Chrome 120, as fases de backend independentes de CPU utilizam Turboshaft em vez de Turbofan e compilam cerca de duas vezes mais rápido que antes. Isso está economizando energia e abrindo caminho para mais melhorias emocionantes de desempenho no próximo ano e além. Fique atento às atualizações!

# Parser de HTML mais rápido

Observamos uma porção significativa do tempo de benchmark sendo consumida pela análise de HTML. Embora não seja um aprimoramento direto no V8, tomamos a iniciativa e aplicamos nossa expertise em otimização de desempenho para adicionar um parser de HTML mais rápido ao Blink. Essas mudanças resultaram em um aumento notável de 3,4% nos índices do Speedometer. O impacto no Chrome foi tão positivo que o projeto WebKit prontamente integrou essas mudanças em [seu repositório](https://github.com/WebKit/WebKit/pull/9926). Temos orgulho em contribuir para o objetivo coletivo de alcançar uma Web mais rápida!

# Alocações DOM mais rápidas

Também temos investido ativamente no lado do DOM. Otimizações significativas foram aplicadas às estratégias de alocação de memória no [Oilpan](https://chromium.googlesource.com/v8/v8/+/main/include/cppgc/README.md) - o alocador para os objetos DOM. Ele ganhou um pool de páginas, o que reduziu notavelmente o custo das idas e vindas ao kernel. O Oilpan agora suporta ponteiros comprimidos e não comprimidos, e evitamos comprimir campos de alta movimentação no Blink. Dada a frequência com que a descompressão é realizada, isso teve um impacto amplo na performance. Além disso, sabendo quão rápido o alocador é, aplicamos o Oilpan em classes frequentemente alocadas, o que tornou as cargas de trabalho de alocação 3 vezes mais rápidas e mostrou melhorias significativas em benchmarks com uso intensivo de DOM, como o Speedometer.

# Novos recursos do JavaScript

O JavaScript continua evoluindo com novos recursos padronizados, e este ano não foi exceção. Implementamos [ArrayBuffers redimensionáveis](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer#resizing_arraybuffers) e [transferência de ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer), String [`isWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/isWellFormed) e [`toWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toWellFormed), [flag `v` para RegExp](https://v8.dev/features/regexp-v-flag) (também conhecida como notação de conjunto Unicode), [`JSON.parse` com origem](https://github.com/tc39/proposal-json-parse-with-source), [agrupamento de Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy), [`Promise.withResolvers`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers), e [`Array.fromAsync`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fromAsync). Infelizmente, tivemos que retirar [helpers de iteradores](https://github.com/tc39/proposal-iterator-helpers) após descobrir uma incompatibilidade com a web, mas trabalhamos com o TC39 para corrigir o problema e reimplementaremos em breve. Por fim, também tornamos o código JS ES6+ mais rápido, [eliminando algumas verificações redundantes da zona morta temporal](https://docs.google.com/document/d/1klT7-tQpxtYbwhssRDKfUMEgm-NS3iUeMuApuRgZnAw/edit?usp=sharing) para as ligações `let` e `const`.

# Atualizações do WebAssembly

Muitos novos recursos e melhorias de desempenho chegaram ao Wasm este ano. Habilitamos suporte para [multi-memory](https://github.com/WebAssembly/multi-memory), [tail-calls](https://github.com/WebAssembly/tail-call) (veja nosso [post de blog](https://v8.dev/blog/wasm-tail-call) para mais detalhes), e [SIMD relaxado](https://github.com/WebAssembly/relaxed-simd) para liberar desempenho de próximo nível. Finalizamos a implementação de [memory64](https://github.com/WebAssembly/memory64) para suas aplicações que demandam muita memória e estamos apenas esperando a proposta [atingir a fase 4](https://github.com/WebAssembly/memory64/issues/43) para podermos entregá-la! Garantimos incorporar as atualizações mais recentes da [proposta de tratamento de exceções](https://github.com/WebAssembly/exception-handling) enquanto ainda suportamos o formato anterior. E continuamos investindo em [JSPI](https://v8.dev/blog/jspi) para [habilitar outro grande conjunto de aplicações na web](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y/edit#bookmark=id.razn6wo5j2m). Fique ligado para o próximo ano!

# Coleta de Lixo do WebAssembly

Falando em trazer novas classes de aplicativos para a web, finalmente implementamos a Coleta de Lixo do WebAssembly (WasmGC) após vários anos de trabalho na [proposta](https://github.com/WebAssembly/gc/blob/main/proposals/gc/MVP.md) de padronização e [implementação](https://bugs.chromium.org/p/v8/issues/detail?id=7748). O Wasm agora tem uma forma integrada de alocar objetos e arrays que são gerenciados pelo coletor de lixo já existente do V8. Isso permite compilar aplicativos escritos em Java, Kotlin, Dart e linguagens semelhantes para Wasm – onde eles normalmente executam cerca de duas vezes mais rápido do que quando são compilados para JavaScript. Veja [nosso post de blog](https://v8.dev/blog/wasm-gc-porting) para muito mais detalhes.

# Segurança

No lado da segurança, nossos três principais tópicos do ano foram sandboxing, fuzzing e CFI. No aspecto de [sandboxing](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing), focamos em construir a infraestrutura faltante, como a tabela de ponteiros confiáveis e código. No lado do fuzzing, investimos em tudo, desde infraestrutura de fuzzing até fuzzers de propósito especial e melhor cobertura de linguagem. Parte de nosso trabalho foi destacado nesta [apresentação](https://www.youtube.com/watch?v=Yd9m7e9-pG0). Por fim, no aspecto CFI, lançamos a base para nossa [arquitetura de CFI](https://v8.dev/blog/control-flow-integrity) para que ela possa ser realizada em tantos plataformas quanto possível. Além desses, alguns esforços menores, porém notáveis, incluem trabalhos em [mitigar uma técnica de exploração popular](https://crbug.com/1445008) em torno do `the_hole` e o lançamento de um novo programa de recompensas por exploração na forma do [V8CTF](https://github.com/google/security-research/blob/master/v8ctf/rules.md).

# Conclusão

Ao longo do ano, dedicamos esforços a inúmeras melhorias incrementais de desempenho. O impacto combinado desses pequenos projetos, junto com os detalhados no post do blog, é substancial! Abaixo estão pontuações de benchmark ilustrando as melhorias de desempenho alcançadas pelo V8 em 2023, com um crescimento geral de `14%` no JetStream e impressionantes `34%` no Speedometer.

![Benchmarks de desempenho web medidos em um MacBook Pro M1 de 13”.](/_img/holiday-season-2023/scores.svg)

Esses resultados mostram que o V8 está mais rápido e seguro do que nunca. Prepare-se, colega desenvolvedor, porque com o V8, a jornada na Web rápida e furiosa está apenas começando! Estamos comprometidos em manter o V8 como o melhor motor de JavaScript e WebAssembly do planeta!

De todos nós no V8, desejamos uma temporada de férias alegre e cheia de experiências rápidas, seguras e fabulosas enquanto você navega pela Web!
