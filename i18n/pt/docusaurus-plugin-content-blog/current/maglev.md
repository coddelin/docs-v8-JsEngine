---
title: "Maglev - O JIT Otimizador Mais Rápido do V8"
author: "[Toon Verwaest](https://twitter.com/tverwaes), [Leszek Swirski](https://twitter.com/leszekswirski), [Victor Gomes](https://twitter.com/VictorBFG), Olivier Flückiger, Darius Mercadier e Camillo Bruni — cozinheiros suficientes para não estragar o caldo"
avatars: 
  - toon-verwaest
  - leszek-swirski
  - victor-gomes
  - olivier-flueckiger
  - darius-mercadier
  - camillo-bruni
date: 2023-12-05
tags: 
  - JavaScript
description: "O mais novo compilador do V8, Maglev, melhora o desempenho enquanto reduz o consumo de energia"
tweet: ""
---

No Chrome M117 introduzimos um novo compilador otimizador: Maglev. Maglev está entre nossos compiladores existentes Sparkplug e TurboFan, e desempenha o papel de um compilador otimizador rápido que gera código suficientemente bom de forma rápida.


# Contexto

Até 2021, o V8 tinha dois principais níveis de execução: Ignition, o interpretador; e [TurboFan](/docs/turbofan), o compilador otimizador do V8 focado no desempenho máximo. Todo código JavaScript é primeiro compilado para bytecode do Ignition e executado interpretando-o. Durante a execução, o V8 rastreia como o programa se comporta, incluindo o monitoramento dos formatos e tipos de objetos. Tanto os metadados de execução em tempo de execução quanto o bytecode são usados pelo compilador otimizador para gerar código de máquina de alto desempenho, frequentemente especulativo, que é executado significativamente mais rápido do que o interpretador.

<!--truncate-->
Essas melhorias são claramente visíveis em benchmarks como o [JetStream](https://browserbench.org/JetStream2.1/), uma coleção de benchmarks tradicionais de JavaScript puro que medem inicialização, latência e desempenho máximo. O TurboFan ajuda o V8 a executar a suíte 4,35 vezes mais rápido! O JetStream tem uma ênfase reduzida na performance de estado estacionário em comparação com benchmarks anteriores (como o [benchmark Octane aposentado](/blog/retiring-octane)), mas devido à simplicidade de muitos itens, o código otimizado ainda é onde mais tempo é gasto.

[Speedometer](https://browserbench.org/Speedometer2.1/) é um tipo diferente de suíte de benchmarks do que o JetStream. Ele foi projetado para medir a responsividade de um aplicativo web cronometrando interações simuladas de usuários. Em vez de pequenos aplicativos JavaScript independentes e estáticos, a suíte consiste em páginas completas, a maioria construída usando frameworks populares. Como durante a maioria dos carregamentos de páginas da web, os itens do Speedometer gastam muito menos tempo executando loops fechados de JavaScript e muito mais tempo executando códigos que interagem com o resto do navegador.

O TurboFan ainda tem um grande impacto no Speedometer: ele executa mais de 1,5 vezes mais rápido! Mas o impacto é claramente muito mais moderado do que no JetStream. Parte dessa diferença resulta do fato de que páginas completas [simplesmente gastam menos tempo em JavaScript puro](/blog/real-world-performance#making-a-real-difference). Mas, em parte, é devido ao benchmark gastar muito tempo em funções que não ficam quentes o suficiente para serem otimizadas pelo TurboFan.

![Benchmarks de desempenho web comparando execução não otimizada e otimizada](/_img/maglev/I-IT.svg)

::: nota
Todos os resultados dos benchmarks neste post foram medidos com o Chrome 117.0.5897.3 em um Macbook Air de 13” M2.
:::

Como a diferença na velocidade de execução e no tempo de compilação entre Ignition e TurboFan é tão grande, em 2021 introduzimos um novo JIT básico chamado [Sparkplug](/blog/sparkplug). Ele foi projetado para compilar bytecode para código de máquina equivalente quase instantaneamente.

No JetStream, o Sparkplug melhora bastante o desempenho comparado ao Ignition (+45%). Mesmo quando o TurboFan também está em cena, ainda vemos uma melhoria sólida no desempenho (+8%). No Speedometer, vemos uma melhoria de 41% em relação ao Ignition, aproximando-se do desempenho do TurboFan, e uma melhoria de 22% em relação ao Ignition + TurboFan! Como o Sparkplug é tão rápido, podemos implantá-lo amplamente e obter uma melhoria consistente. Se o código não depende exclusivamente de loops fechados de JavaScript facilmente otimizados e de longa duração, ele é uma ótima adição.

![Benchmarks de desempenho web com Sparkplug adicionado](/_img/maglev/I-IS-IT-IST.svg)

A simplicidade do Sparkplug impõe um limite relativamente baixo na aceleração que ele pode oferecer. Isso é demonstrado claramente pelo grande intervalo entre Ignition + Sparkplug e Ignition + TurboFan.

É aqui que o Maglev entra em cena, nosso novo JIT otimizador que gera um código muito mais rápido do que o código do Sparkplug, mas é gerado muito mais rápido do que o TurboFan consegue.


# Maglev: Um compilador JIT baseado em SSA simples

Quando iniciamos este projeto, vimos dois caminhos para preencher a lacuna entre Sparkplug e TurboFan: ou tentar gerar um código melhor utilizando a abordagem de passagem única adotada pelo Sparkplug, ou construir um JIT com uma representação intermediária (IR). Como considerávamos que não ter uma IR durante a compilação provavelmente restringiria severamente o compilador, decidimos adotar uma abordagem um tanto tradicional baseada em atribuição estática única (SSA), utilizando um CFG (grafo de fluxo de controle) em vez da representação mais flexível, mas pouco amigável para cache, de TurboFan, conhecida como mar de nós.

O próprio compilador foi projetado para ser rápido e fácil de trabalhar. Ele tem um conjunto mínimo de passagens e uma IR simples que codifica semânticas especializadas do JavaScript.


## Pré-Passagem

Primeiramente, Maglev faz uma pré-passagem sobre o bytecode para encontrar os alvos de ramificação, incluindo loops, e atribuições a variáveis dentro de loops. Essa passagem também coleta informações de vivacidade, codificando quais valores em quais variáveis ainda são necessários em quais expressões. Essas informações podem reduzir a quantidade de estado que precisa ser rastreada pelo compilador posteriormente.


## SSA

![Uma impressão do grafo SSA do Maglev no terminal](/_img/maglev/graph.svg)

Maglev faz uma interpretação abstrata do estado do frame, criando nós SSA que representam os resultados da avaliação de expressões. As atribuições de variáveis são simuladas armazenando esses nós SSA no respectivo registrador do interpretador abstrato. No caso de ramificações e switches, todos os caminhos são avaliados.

Quando vários caminhos se fundem, os valores nos registradores do interpretador abstrato são mesclados inserindo os chamados nós Phi: nós de valor que sabem qual valor escolher dependendo de qual caminho foi tomado em tempo de execução.

Loops podem mesclar valores de variáveis "no tempo", com os dados fluindo de forma reversa do fim do loop para o cabeçalho do loop, nos casos em que variáveis são atribuídas no corpo do loop. É aí que os dados da pré-passagem são úteis: como já sabemos quais variáveis são atribuídas dentro dos loops, podemos pré-criar os nós Phi do loop antes mesmo de começar a processar o corpo do loop. No final do loop, podemos preencher a entrada Phi com o nó SSA correto. Isso permite que a geração do grafo SSA seja uma única passagem para frente, sem precisar "corrigir" variáveis de loop, enquanto também minimiza a quantidade de nós Phi que precisam ser alocados.


## Informações Conhecidas dos Nós

Para ser o mais rápido possível, Maglev faz o máximo possível de uma vez. Em vez de construir um grafo genérico de JavaScript e depois reduzi-lo durante fases posteriores de otimização, o que é uma abordagem teoricamente limpa, mas computacionalmente cara, Maglev faz o máximo possível imediatamente durante a construção do grafo.

Durante a construção do grafo, Maglev analisará os metadados de feedback de tempo de execução coletados durante a execução não otimizada e gerará nós SSA especializados para os tipos observados. Se Maglev vê `o.x` e sabe, a partir do feedback de tempo de execução, que `o` sempre tem uma forma específica, ele gerará um nó SSA para verificar em tempo de execução se `o` ainda tem a forma esperada, seguido por um nó `LoadField` barato que faz um acesso simples por deslocamento.

Além disso, Maglev criará um nó auxiliar indicando que agora sabe a forma de `o`, tornando desnecessário verificar novamente a forma mais tarde. Se Maglev encontrar posteriormente uma operação em `o` que não tenha feedback por algum motivo, esse tipo de informação aprendido durante a compilação pode ser usado como uma segunda fonte de feedback.

As informações de tempo de execução podem vir em várias formas. Algumas informações precisam ser verificadas em tempo de execução, como a verificação de forma descrita anteriormente. Outras informações podem ser usadas sem verificações de tempo de execução registrando dependências ao tempo de execução. Globais que são de fato constantes (não alteradas entre a inicialização e quando seu valor é visto por Maglev) caem nessa categoria: Maglev não precisa gerar código para carregar dinamicamente e verificar sua identidade. Maglev pode carregar o valor no tempo de compilação e incorporá-lo diretamente no código máquina; se o tempo de execução alterar esse global, também cuidará de invalidar e desotimizar esse código máquina.

Algumas formas de informação são "instáveis". Essas informações só podem ser usadas na medida em que o compilador tem certeza de que não podem mudar. Por exemplo, se acabamos de alocar um objeto, sabemos que é um novo objeto e podemos ignorar completamente as barreiras de escrita caras. Uma vez que houve outra potencial alocação, o coletor de lixo pode ter movido o objeto, e agora precisamos emitir tais verificações. Outras são "estáveis": se nunca vimos nenhum objeto transitar para longe de uma determinada forma, então podemos registrar uma dependência nesse evento (qualquer objeto transitando para longe daquela forma específica) e não precisamos verificar novamente a forma do objeto, mesmo após uma chamada a uma função desconhecida com efeitos colaterais desconhecidos.


## Desotimização

Dado que o Maglev pode usar informações especulativas que verifica em tempo de execução, o código do Maglev precisa ser capaz de se desotimizar. Para que isso funcione, o Maglev anexa o estado de quadro do interpretador abstrato aos nós que podem se desotimizar. Este estado mapeia os registradores do interpretador para valores SSA. Este estado se transforma em metadados durante a geração de código, fornecendo um mapeamento do estado otimizado para o estado não otimizado. O desotimizador interpreta esses dados, lendo valores do quadro do interpretador e dos registradores da máquina, e os coloca nos lugares necessários para interpretação. Isso é baseado no mesmo mecanismo de desotimização usado pelo TurboFan, permitindo que compartilhemos a maior parte da lógica e aproveitemos os testes do sistema existente.


## Seleção de Representação

Os números em JavaScript representam, de acordo com [a especificação](https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type), um valor de ponto flutuante de 64 bits. Isso não significa que o motor precise sempre armazená-los como pontos flutuantes de 64 bits, especialmente porque, na prática, muitos números são pequenos inteiros (por exemplo, índices de arrays). O V8 tenta codificar números como inteiros marcados de 31 bits (chamados internamente de "Small Integers" ou "Smi"), tanto para economizar memória (32 bits devido à [compressão de ponteiro](/blog/pointer-compression)), quanto para desempenho (operações inteiras são mais rápidas do que operações de ponto flutuante).

Para que o código JavaScript intensivo em números seja rápido, é importante que representações ideais sejam escolhidas para os nós de valores. Ao contrário do interpretador e do Sparkplug, o compilador otimizador pode descompactar valores assim que conhece seu tipo, operando em números brutos em vez de valores JavaScript que representam números, e recompacta valores apenas se for estritamente necessário. Pontos flutuantes podem ser passados diretamente em registradores de ponto flutuante, em vez de alocar um objeto no heap que contém o ponto flutuante.

O Maglev aprende sobre a representação dos nós SSA principalmente observando o feedback de tempo de execução de, por exemplo, operações binárias, e propagando essa informação adiante pelo mecanismo Conhecido de Informações de Nós. Quando valores SSA com representações específicas fluem para Phis, uma representação correta que suporte todas as entradas precisa ser escolhida. Phis de loop são novamente complicados, pois as entradas de dentro do loop são vistas após uma representação ser escolhida para o phi — o mesmo problema de "voltar no tempo" presente na construção do grafo. É por isso que o Maglev tem uma fase separada após a construção do grafo para fazer a seleção de representações nos Phis de loop.


## Alocação de Registradores

Após a construção do grafo e a seleção de representações, o Maglev sabe, em grande parte, que tipo de código deseja gerar e está "pronto" do ponto de vista de otimização clássica. No entanto, para gerar o código, precisamos escolher onde os valores SSA realmente residirão durante a execução do código de máquina; quando estarão em registradores da máquina e quando serão guardados na pilha. Isso é feito por meio da alocação de registradores.

Cada nó do Maglev possui requisitos de entrada e saída, incluindo requisitos temporários necessários. O alocador de registradores faz uma única passagem para frente sobre o grafo, mantendo um estado de registrador de máquina abstrato não muito diferente do estado de interpretação abstrata mantido durante a construção do grafo, e irá satisfazer esses requisitos, substituindo os requisitos do nó por locais reais. Esses locais podem então ser usados para a geração de código.

Primeiro, um pré-passe é executado sobre o grafo para encontrar intervalos lineares vivos dos nós, permitindo liberar registradores quando um nó SSA não é mais necessário. Este pré-passe também rastreia a cadeia de usos. Saber quão longe no futuro um valor será necessário pode ser útil para decidir quais valores priorizar e quais descartar quando ficamos sem registradores.

Após o pré-passe, a alocação de registradores é executada. A atribuição de registradores segue algumas regras simples e locais: Se um valor já está em um registrador, aquele registrador será usado, se possível. Os nós rastreiam em quais registradores estão armazenados durante a passagem pelo grafo. Se o nó ainda não tem um registrador, mas um registrador está disponível, ele será escolhido. O nó é atualizado para indicar que está no registrador, e o estado do registrador abstrato é atualizado para saber que contém o nó. Se não houver registradores disponíveis, mas um registrador for necessário, outro valor é retirado do registrador. Idealmente, temos um nó que já está em outro registrador e podemos descartá-lo "de graça"; caso contrário, escolhemos um valor que não será necessário por um longo tempo e o transferimos para a pilha.

Nas junções de ramificações, os estados de registradores abstratos das ramificações de entrada são mesclados. Tentamos manter o maior número possível de valores em registradores. Isso pode significar que precisamos introduzir movimentos de registrador para registrador ou talvez desempilhar valores da pilha, usando movimentos chamados "movimentos de lacuna". Se uma junção de ramificação tiver um nó phi, a alocação de registradores atribuirá registradores de saída para os phis. O Maglev prefere emitir phis para os mesmos registradores que suas entradas, para minimizar movimentos.

Se mais valores SSA estão ativos do que temos registradores, será necessário salvar alguns valores na pilha e recarregá-los posteriormente. No espírito do Maglev, mantemos a simplicidade: se um valor precisa ser salvo, ele é retroativamente instruído a ser imediatamente salvo na definição (logo após a criação do valor), e a geração de código cuidará de emitir o código de salvamento. A definição é garantida para 'dominar' todos os usos do valor (para alcançar o uso, devemos ter passado pela definição e, portanto, pelo código de salvamento). Isso também significa que um valor salvo terá exatamente um slot de salvamento para toda a duração do código; valores com tempos de vida sobrepostos terão, assim, slots de salvamento atribuídos que não se sobrepõem.

Devido à seleção de representação, alguns valores no quadro de Maglev serão ponteiros marcados, ponteiros que o GC do V8 entende e precisa considerar; e alguns serão não marcados, valores que o GC não deve analisar. O TurboFan lida com isso rastreando precisamente quais slots da pilha contêm valores marcados e quais contêm valores não marcados, o que muda durante a execução, à medida que os slots são reutilizados para valores diferentes. Para o Maglev, decidimos simplificar as coisas, para reduzir a memória necessária para rastrear isso: dividimos o quadro da pilha em uma região marcada e uma não marcada, e armazenamos apenas este ponto de divisão.


## Geração de Código

Assim que sabemos quais expressões queremos gerar código e onde queremos colocar suas saídas e entradas, o Maglev está pronto para gerar código.

Os nós do Maglev sabem diretamente como gerar código assembly usando um 'assembler macro'. Por exemplo, um nó `CheckMap` sabe como emitir instruções de assembler que comparam a forma (internamente chamada de 'mapa') de um objeto de entrada com um valor conhecido, e de otimizar o código se o objeto tiver uma forma errada.

Um trecho ligeiramente complicado de código lida com Movimentos de Lacuna: os movimentos solicitados criados pelo alocador de registradores sabem que um valor vive em algum lugar e precisa ir para outro lugar. Se houver uma sequência de tais movimentos, contudo, um movimento precedente pode sobrescrever a entrada necessária por um movimento subsequente. O Resolutor de Movimento Paralelo calcula como realizar os movimentos de forma segura para que todos os valores acabem no lugar correto.


# Resultados

Portanto, o compilador que acabamos de apresentar é claramente muito mais complexo do que o Sparkplug, e muito mais simples do que o TurboFan. Como ele se sai?

Em termos de velocidade de compilação, conseguimos construir um JIT que é aproximadamente 10 vezes mais lento que o Sparkplug e 10 vezes mais rápido que o TurboFan.

![Comparação do tempo de compilação dos níveis de compilação, para todas as funções compiladas no JetStream](/_img/maglev/compile-time.svg)

Isso nos permite implantar o Maglev muito mais cedo do que gostaríamos de implantar o TurboFan. Se o feedback em que ele se baseava acabou não sendo muito estável ainda, não há um grande custo para desotimizar e recompilar mais tarde. Isso também nos permite usar o TurboFan um pouco mais tarde: estamos funcionando muito mais rápido do que funcionaríamos com o Sparkplug.

Inserir o Maglev entre o Sparkplug e o TurboFan resulta em melhorias notáveis nos benchmarks:

![Benchmarks de desempenho da web com Maglev](/_img/maglev/I-IS-IT-IST-ISTM.svg)

Também validamos o Maglev com dados do mundo real e vemos boas melhorias nos [Core Web Vitals](https://web.dev/vitals/).

Como o Maglev compila muito mais rápido, e como agora podemos esperar mais para compilar funções com o TurboFan, isso resulta em um benefício secundário que não é tão visível na superfície. Os benchmarks se concentram na latência do thread principal, mas o Maglev também reduz significativamente o consumo geral de recursos do V8 ao usar menos tempo de CPU fora do thread principal. O consumo de energia de um processo pode ser medido facilmente em um Macbook baseado em M1 ou M2, utilizando `taskinfo`.

:::table-wrapper
| Benchmark   | Consumo de Energia |
| :---------: | :----------------: |
| JetStream   | -3.5%              |
| Speedometer | -10%               |
:::

O Maglev não está completo de forma alguma. Ainda temos muito trabalho a fazer, mais ideias para experimentar e mais frutos fáceis para colher — à medida que o Maglev se tornar mais completo, esperamos ver pontuações mais altas e mais redução no consumo de energia.

O Maglev está agora disponível para o Chrome em desktops, e será lançado em dispositivos móveis em breve.
