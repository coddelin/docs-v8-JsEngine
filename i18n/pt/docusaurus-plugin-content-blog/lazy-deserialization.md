---
title: "Desserialização preguiçosa"
author: "Jakob Gruber ([@schuay](https://twitter.com/schuay))"
avatars: 
  - "jakob-gruber"
date: "2018-02-12 13:33:37"
tags: 
  - internals
description: "Desserialização preguiçosa, disponível no V8 v6.4, reduz o consumo de memória do V8 em mais de 500 KB por aba do navegador em média."
tweet: "962989179914383360"
---
TL;DR: A desserialização preguiçosa foi recentemente ativada como padrão no [V8 v6.4](/blog/v8-release-64), reduzindo o consumo de memória do V8 em mais de 500 KB por aba do navegador em média. Leia para saber mais!

## Introdução aos snapshots do V8

Mas primeiro, vamos dar um passo atrás e ver como o V8 usa snapshots de heap para acelerar a criação de novos Isolates (que correspondem aproximadamente a uma aba do navegador no Chrome). Meu colega Yang Guo deu uma boa introdução sobre isso em seu artigo sobre [snapshots de inicialização personalizada](/blog/custom-startup-snapshots):

<!--truncate-->
> A especificação JavaScript inclui muitas funcionalidades incorporadas, desde funções matemáticas até um mecanismo completo de expressões regulares. Cada contexto recém-criado do V8 tem essas funções disponíveis desde o início. Para que isso funcione, o objeto global (por exemplo, o objeto `window` em um navegador) e toda a funcionalidade incorporada devem ser configurados e inicializados no heap do V8 no momento da criação do contexto. Leva bastante tempo para fazer isso do zero.
>
> Felizmente, o V8 usa um atalho para acelerar as coisas: assim como descongelar uma pizza congelada para um jantar rápido, desserializamos um snapshot previamente preparado diretamente no heap para obter um contexto inicializado. Em um computador desktop comum, isso pode reduzir o tempo de criação de um contexto de 40 ms para menos de 2 ms. Em um telefone celular médio, isso pode significar uma diferença entre 270 ms e 10 ms.

Resumindo: os snapshots são críticos para o desempenho de inicialização, e eles são desserializados para criar o estado inicial do heap do V8 para cada Isolate. O tamanho do snapshot, portanto, determina o tamanho mínimo do heap do V8, e snapshots maiores se traduzem diretamente em maior consumo de memória para cada Isolate.

Um snapshot contém tudo o que é necessário para inicializar completamente um novo Isolate, incluindo constantes de linguagem (por exemplo, o valor `undefined`), manipuladores internos de bytecode usados pelo interpretador, objetos incorporados (por exemplo, `String`), e as funções instaladas em objetos incorporados (por exemplo, `String.prototype.replace`) juntamente com seus objetos `Code` executáveis.

![Tamanho do snapshot de inicialização em bytes de 2016-01 a 2017-09. O eixo x mostra os números de revisão do V8.](/_img/lazy-deserialization/startup-snapshot-size.png)

Nos últimos dois anos, o snapshot quase triplicou de tamanho, passando de aproximadamente 600 KB no início de 2016 para mais de 1500 KB hoje. A grande maioria desse aumento vem de objetos `Code` serializados, que aumentaram tanto em número (por exemplo, devido a adições recentes à linguagem JavaScript à medida que a especificação da linguagem evolui e cresce); quanto em tamanho (objetos incorporados gerados pelo novo pipeline [CodeStubAssembler](/blog/csa) são enviados como código nativo em vez dos formatos mais compactos de bytecode ou JS minimizado).

Isso é uma má notícia, já que queremos manter o consumo de memória o mais baixo possível.

## Desserialização preguiçosa

Um dos maiores pontos problemáticos era que costumávamos copiar todo o conteúdo do snapshot para cada Isolate. Fazer isso era especialmente desperdício para funções incorporadas, que eram todas carregadas incondicionalmente, mas podem nunca ter sido usadas.

É aí que entra a desserialização preguiçosa. O conceito é bastante simples: e se só desserializássemos funções incorporadas pouco antes de serem chamadas?

Uma rápida investigação em alguns dos sites mais populares mostrou que essa abordagem era bastante atraente: em média, apenas 30% de todas as funções incorporadas eram usadas, com alguns sites usando apenas 16%. Isso parecia notavelmente promissor, dado que a maioria desses sites são usuários pesados de JavaScript e esses números podem, portanto, ser vistos como um limite inferior (fuzzy) de possíveis economias de memória para a web em geral.

Quando começamos a trabalhar nessa direção, descobrimos que a desserialização preguiçosa se integrou muito bem à arquitetura do V8 e apenas algumas alterações de design, em sua maioria não invasivas, foram necessárias para começar a funcionar:

1. **Posições bem conhecidas dentro do snapshot.** Antes da desserialização preguiçosa, a ordem dos objetos dentro do snapshot serializado era irrelevante, já que sempre desserializávamos todo o heap de uma vez. A desserialização preguiçosa precisa ser capaz de desserializar qualquer função incorporada específica por conta própria e, portanto, precisa saber onde ela está localizada dentro do snapshot.
2. **Desserialização de objetos individuais.** Os snapshots do V8 foram inicialmente projetados para a desserialização completa do heap, e adicionar suporte para a desserialização de objetos individuais exigiu lidar com algumas peculiaridades, como o layout de snapshot não contíguo (dados serializados para um objeto poderiam estar entrelaçados com dados de outros objetos) e as chamadas referências anteriores (que podem referenciar diretamente objetos previamente desserializados durante a execução atual).
3. **O próprio mecanismo de desserialização preguiçosa.** Em tempo de execução, o manipulador de desserialização preguiçosa deve ser capaz de: a) determinar qual objeto de código desserializar, b) realizar a desserialização propriamente dita e c) anexar o objeto de código desserializado a todas as funções relevantes.

Nossa solução para os dois primeiros pontos foi adicionar uma nova [área dedicada de built-ins](https://cs.chromium.org/chromium/src/v8/src/snapshot/snapshot.h?l=55&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d) ao snapshot, que pode conter apenas objetos de código serializados. A serialização ocorre em uma ordem bem definida e o deslocamento inicial de cada objeto `Code` é mantido em uma seção dedicada dentro da área de snapshot de built-ins. Tanto referências anteriores quanto dados de objetos intercalados são proibidos.

[A desserialização preguiçosa de built-ins](https://goo.gl/dxkYDZ) é tratada pelo apropriadamente nomeado [`DeserializeLazy`](https://cs.chromium.org/chromium/src/v8/src/builtins/x64/builtins-x64.cc?l=1355&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d), que é instalado em todas as funções built-in preguiçosas no momento da desserialização. Quando chamado em tempo de execução, ele desserializa o objeto de `Code` relevante e, finalmente, instala-o tanto no `JSFunction` (que representa o objeto função) quanto no `SharedFunctionInfo` (compartilhado entre as funções criadas a partir do mesmo literal de função). Cada função built-in é desserializada no máximo uma vez.

Além das funções built-in, nós também implementamos [desserialização preguiçosa para manipuladores de bytecode](https://goo.gl/QxZBL2). Manipuladores de bytecode são objetos de código que contêm a lógica para executar cada bytecode dentro do interpretador [Ignition](/blog/ignition-interpreter) do V8. Diferentemente dos built-ins, eles não têm um `JSFunction` anexado nem um `SharedFunctionInfo`. Em vez disso, seus objetos de código são armazenados diretamente na [tabela de despacho](https://cs.chromium.org/chromium/src/v8/src/interpreter/interpreter.h?l=94&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d) na qual o interpretador indexa ao despachar para o próximo manipulador de bytecode. A desserialização preguiçosa é semelhante à dos built-ins: o manipulador [`DeserializeLazy`](https://cs.chromium.org/chromium/src/v8/src/interpreter/interpreter-generator.cc?l=3247&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d) determina qual manipulador desserializar inspecionando o array de bytecode, desserializa o objeto de código e, finalmente, armazena o manipulador desserializado na tabela de despacho. Novamente, cada manipulador é desserializado no máximo uma vez.

## Resultados

Avaliamos a economia de memória carregando os 1000 sites mais populares usando o Chrome 65 em um dispositivo Android, com e sem desserialização preguiçosa.

![](/_img/lazy-deserialization/memory-savings.png)

Em média, o tamanho do heap do V8 diminuiu em 540 KB, com 25% dos sites testados economizando mais de 620 KB, 50% economizando mais de 540 KB e 75% economizando mais de 420 KB.

O desempenho em tempo de execução (medido em benchmarks padrão de JS como o Speedometer, bem como em uma ampla seleção de sites populares) permaneceu inalterado pela desserialização preguiçosa.

## Próximos passos

A desserialização preguiçosa garante que cada Isolate carregue apenas os objetos de código built-in que realmente são usados. Isso já é um grande avanço, mas acreditamos que é possível ir um passo além e reduzir o custo (relacionado a built-ins) de cada Isolate para efetivamente zero.

Esperamos trazer atualizações sobre esse assunto ainda este ano. Fique ligado!
