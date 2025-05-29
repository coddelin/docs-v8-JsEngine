---
title: &apos;Sparkplug — um compilador JavaScript não otimizador&apos;
author: &apos;[Leszek Swirski](https://twitter.com/leszekswirski) — talvez não a faísca mais brilhante, mas pelo menos a mais rápida&apos;
avatars:
  - leszek-swirski
date: 2021-05-27
tags:
  - JavaScript
extra_links:
  - href: https://fonts.googleapis.com/css?family=Gloria+Hallelujah&display=swap
    rel: stylesheet
description: &apos;No V8 v9.1 estamos melhorando o desempenho do V8 em 5–15% com Sparkplug: um novo compilador JavaScript não otimizador.&apos;
tweet: &apos;1397945205198835719&apos;
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html -->
<style>
  svg \{
    --other-frame-bg: rgb(200 200 200 / 20%);
    --machine-frame-bg: rgb(200 200 200 / 50%);
    --js-frame-bg: rgb(212 205 100 / 60%);
    --interpreter-frame-bg: rgb(215 137 218 / 50%);
    --sparkplug-frame-bg: rgb(235 163 104 / 50%);
  \}
  svg text \{
    font-family: Gloria Hallelujah, cursive;
  \}
  .flipped .frame \{
    transform: scale(1, -1);
  \}
  .flipped .frame text \{
    transform: scale(1, -1);
  \}
</style>
<!-- markdownlint-restore -->

<!--truncate-->
Escrever um motor JavaScript de alto desempenho requer mais do que apenas ter um compilador altamente otimizado como TurboFan. Particularmente para sessões de curta duração, como carregamento de sites ou ferramentas de linha de comando, há muito trabalho que acontece antes mesmo que o compilador otimizador tenha a chance de começar a otimizar, quanto mais ter tempo para gerar o código otimizado.

É por isso que, desde 2016, nos afastamos de acompanhar benchmarks sintéticos (como Octane) para medir [desempenho no mundo real](/blog/real-world-performance), e por que, desde então, trabalhamos arduamente no desempenho do JavaScript fora do compilador otimizador. Isso significou trabalho no analisador sintático, no streaming, no nosso modelo de objeto, na concorrência do coletor de lixo, no cache de código compilado… digamos apenas que nunca estávamos entediados.

À medida que nos voltamos para melhorar o desempenho da execução inicial real do JavaScript, porém, começamos a encontrar limitações ao otimizar nosso interpretador. O interpretador do V8 é altamente otimizado e muito rápido, mas os interpretadores têm sobrecargas inerentes que não podemos eliminar; coisas como sobrecargas de decodificação de bytecode ou sobrecargas de despacho que são parte intrínseca da funcionalidade de um interpretador.

Com nosso modelo atual de dois compiladores, não podemos passar para código otimizado muito mais rápido; podemos (e estamos) trabalhando para tornar a otimização mais rápida, mas em algum ponto só é possível acelerar reduzindo as etapas de otimização, o que diminui o desempenho máximo. Ainda pior, não podemos realmente começar a otimizar mais cedo, porque ainda não teremos um feedback estável de formato de objeto.

Apresentamos o Sparkplug: nosso novo compilador JavaScript não otimizador que estamos lançando com o V8 v9.1, que se insere entre o interpretador Ignition e o compilador otimizador TurboFan.

![O novo pipeline de compiladores](/_svg/sparkplug/pipeline.svg)

## Um compilador rápido

Sparkplug foi projetado para compilar rápido. Muito rápido. Tão rápido que podemos praticamente compilar sempre que quisermos, permitindo-nos passar para o código Sparkplug muito mais agressivamente do que podemos para o código TurboFan.

Há alguns truques que tornam o compilador Sparkplug rápido. Primeiro de tudo, ele rouba; as funções que ele compila já foram compiladas em bytecode, e o compilador de bytecode já fez grande parte do trabalho árduo, como resolução de variáveis, descobrir se parênteses são realmente funções de seta, dessintetizar declarações de desestruturação, e assim por diante. Sparkplug compila a partir de bytecode em vez de código-fonte JavaScript, e portanto, não precisa se preocupar com nada disso.

O segundo truque é que o Sparkplug não gera nenhuma representação intermediária (IR) como a maioria dos compiladores faz. Em vez disso, Sparkplug compila diretamente em código de máquina em uma única passagem linear sobre o bytecode, emitindo código que corresponde à execução desse bytecode. Na verdade, todo o compilador é uma instrução [`switch`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=465;drc=55cbb2ce3be503d9096688b72d5af0e40a9e598b) dentro de um [`for` loop](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=290;drc=9013bf7765d7febaa58224542782307fa952ac14), despachando para funções fixas de geração de código de máquina por bytecode.

```cpp
// O compilador Sparkplug (resumido).
for (; !iterator.done(); iterator.Advance()) {
  VisitSingleBytecode();
}
```

A falta de IR significa que o compilador tem oportunidades limitadas de otimização, além de otimizações locais muito simples. Também significa que temos que portar toda a implementação separadamente para cada arquitetura que suportamos, já que não há uma etapa intermediária independente de arquitetura. No entanto, verifica-se que nenhuma dessas limitações é um problema: um compilador rápido é um compilador simples, então o código é bastante fácil de portar; e o Sparkplug não precisa fazer otimizações pesadas, já que temos um ótimo compilador otimizador mais adiante no pipeline de execução.

::: nota
Tecnicamente, atualmente realizamos duas passagens sobre o bytecode — uma para identificar loops, e a segunda para gerar o código real. Porém, estamos planejando eliminar a primeira etapa eventualmente.
:::

## Frames compatíveis com o interpretador

Adicionar um novo compilador a uma máquina virtual JavaScript madura é uma tarefa desafiadora. Há todo tipo de funcionalidade que você precisa suportar além da execução padrão; o V8 possui um depurador, um profiler de CPU baseado em análise de pilha, há rastreamento de pilha para exceções, integração na promoção de níveis, substituição na pilha para código otimizado de loops intensos… é muita coisa.

Sparkplug realiza um truque inteligente que simplifica a maioria desses problemas, ao manter “frames de pilha compatíveis com o interpretador”.

Voltemos um pouco. Frames de pilha são como a execução de código armazena o estado de funções; sempre que uma nova função é chamada, cria-se um novo frame de pilha para as variáveis locais daquela função. Um frame de pilha é definido por um ponteiro de frame (marcando seu início) e um ponteiro de pilha (marcando seu fim):

![Um frame de pilha, com ponteiros de pilha e frame](/_svg/sparkplug/basic-frame.svg)

::: nota
<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html -->
Neste ponto, aproximadamente metade de vocês estará gritando, dizendo "esse diagrama não faz sentido, as pilhas obviamente crescem na direção oposta!" Não se preocupem, eu fiz um botão para vocês: <button id="flipStacksButton">Eu acho que as pilhas crescem para cima</button>
<script src="/js/sparkplug.js">
</script>
<!-- markdownlint-restore -->
:::

Quando uma função é chamada, o endereço de retorno é empilhado; isto é removido pela função ao retornar, para saber para onde voltar. Então, quando essa função cria um novo frame, ela salva o antigo ponteiro do frame na pilha e define o novo ponteiro do frame no início de seu próprio frame de pilha. Assim, a pilha tem uma cadeia de ponteiros de frame, cada um marcando o início de um frame que aponta para o anterior:

![Frames de pilha para múltiplas chamadas](/_svg/sparkplug/machine-frame.svg)

::: nota
Estritamente falando, isso é apenas uma convenção seguida pelo código gerado, não um requisito. Contudo, esta convenção é quase universal; a única vez em que é realmente quebrada é quando os frames de pilha são eliminados completamente, ou quando tabelas de depuração podem ser usadas para analisar os frames de pilha.
:::

Este é o layout geral de pilha para todos os tipos de função; há, então, convenções sobre como os argumentos são passados e como a função armazena valores em seu frame. No V8, temos a convenção para frames JavaScript de que os argumentos (incluindo o receptor) são empilhados [em ordem inversa](/blog/adaptor-frame) na pilha antes da função ser chamada, e que os primeiros slots na pilha contêm: a função atual sendo chamada; o contexto no qual ela está sendo chamada; e o número de argumentos que foram passados. Este é o nosso layout “padrão” de frame JS:

![Um frame de pilha JavaScript no V8](/_svg/sparkplug/js-frame.svg)

Essa convenção de chamada JS é compartilhada entre frames otimizados e interpretados, e é o que nos permite, por exemplo, analisar a pilha com sobrecarga mínima ao criar perfis de código no painel de desempenho do depurador.

No caso do interpretador Ignition, a convenção torna-se mais explícita. Ignition é um interpretador baseado em registradores, o que significa que há registradores virtuais (não confundir com registradores de máquina!) que armazenam o estado atual do interpretador — isso inclui variáveis locais de função JavaScript (declarações var/let/const) e valores temporários. Esses registradores são armazenados no frame de pilha do interpretador, junto com um ponteiro para o array de bytecode que está sendo executado e o deslocamento do bytecode atual nesse array:

![Um frame de pilha do interpretador V8](/_svg/sparkplug/interpreter-frame.svg)

Sparkplug intencionalmente cria e mantém um layout de frame que corresponde ao frame do interpretador; sempre que o interpretador armazenaria um valor de registrador, Sparkplug também armazena. Ele faz isso por vários motivos:

1. Isso simplifica a compilação do Sparkplug; ele pode simplesmente espelhar o comportamento do interpretador sem precisar manter algum tipo de mapeamento de registradores do interpretador para o estado do Sparkplug.
1. Também acelera a compilação, já que o compilador de bytecode realizou o trabalho árduo de alocação de registradores.
1. Facilita quase que totalmente a integração com o restante do sistema; o depurador, o profiler, a desmontagem da pilha de exceções, a impressão de rastros de pilha — todas essas operações realizam análises da pilha para descobrir qual é a pilha atual de funções em execução, e todas essas operações continuam funcionando com o Sparkplug praticamente sem mudanças, porque, para elas, tudo o que possuem é um frame de interpretador.
1. Ele torna a substituição no stack (OSR) trivial. OSR é quando a função atualmente em execução é substituída durante sua execução; atualmente isso acontece quando uma função interpretada está dentro de um loop quente (onde ela passa para o código otimizado para aquele loop), e quando o código otimizado sofre desotimização (onde ele retrocede e continua a execução da função no interpretador). Com os quadros de pilha do Sparkplug espelhando os quadros do interpretador, qualquer lógica de OSR que funcione para o interpretador funcionará para o Sparkplug; ainda melhor, podemos alternar entre o código do interpretador e do Sparkplug com quase zero de sobrecarga de tradução de quadros.

Há uma pequena alteração no quadro de pilha do interpretador, que é que não mantemos o deslocamento do bytecode atualizado durante a execução do código Sparkplug. Em vez disso, armazenamos um mapeamento bidirecional do intervalo de endereços do código Sparkplug para o deslocamento correspondente do bytecode; um mapeamento relativamente simples de codificar, já que o código Sparkplug é emitido diretamente de uma caminhada linear sobre o bytecode. Sempre que um acesso ao quadro de pilha deseja saber o “deslocamento do bytecode” para um quadro Sparkplug, consultamos a instrução atualmente sendo executada neste mapeamento e retornamos o deslocamento de bytecode correspondente. Da mesma forma, sempre que queremos realizar um OSR do interpretador para o Sparkplug, podemos consultar o deslocamento atual do bytecode no mapeamento e saltar para a instrução Sparkplug correspondente.

Você pode notar que agora temos um slot não utilizado no quadro de pilha, onde estaria o deslocamento do bytecode; um que não podemos eliminar, já que queremos manter o restante da pilha inalterado. Reutilizamos este slot da pilha para armazenar em cache o “vetor de feedback” para a função atualmente em execução; isso é o vetor que armazena os dados de forma dos objetos e precisa ser carregado para a maioria das operações. Tudo o que precisamos fazer é ter um pouco de cuidado em torno do OSR para garantir que alternamos entre o deslocamento correto do bytecode ou o vetor de feedback correto para este slot.

Assim, o quadro de pilha do Sparkplug é:

![Um quadro de pilha do V8 Sparkplug](/_svg/sparkplug/sparkplug-frame.svg)

## Delegar para builtins

O Sparkplug na verdade gera muito pouco de seu próprio código. A semântica do JavaScript é complexa, e levaria muito código para realizar mesmo as operações mais simples. Forçar o Sparkplug a regenerar este código em linha em cada compilação seria ruim por vários motivos:

  1. Isso aumentaria visivelmente os tempos de compilação devido à enorme quantidade de código que precisaria ser gerada,
  2. Isso aumentaria o consumo de memória do código Sparkplug, e
  3. Teríamos que reimplementar a geração de código para um monte de funcionalidades do JavaScript para o Sparkplug, o que provavelmente significaria mais bugs e uma maior superfície de segurança.

Então, em vez de tudo isso, a maior parte do código do Sparkplug apenas faz chamadas para “builtins”, pequenos trechos de código de máquina embutidos no binário, para fazer o trabalho sujo real. Esses builtins são ou os mesmos que o interpretador usa, ou pelo menos compartilham a maioria de seu código com os manipuladores de bytecode do interpretador.

Na verdade, o código Sparkplug é basicamente apenas chamadas para builtins e controle de fluxo:

Você pode estar pensando agora, “Bem, qual é o ponto de tudo isso, então? O Sparkplug não está apenas fazendo o mesmo trabalho do interpretador?” — e você não estaria completamente errado. Em muitos aspectos, o Sparkplug é “apenas” uma serialização da execução do interpretador, chamando os mesmos builtins e mantendo o mesmo quadro de pilha. No entanto, mesmo isso já vale a pena, porque elimina (ou mais precisamente, pré-compila) aquelas sobrecargas inamovíveis do interpretador, como decodificação de operandos e despacho do próximo bytecode.

Descobrimos que os interpretadores derrotam muitas otimizações de CPU: operandos estáticos são lidos dinamicamente da memória pelo interpretador, forçando a CPU a fazer uma pausa ou especular sobre quais valores poderiam ser; despachar para o próximo bytecode exige uma previsão de bifurcação bem-sucedida para manter o desempenho, e mesmo que as especulações e previsões estejam corretas, você ainda teve que executar todo aquele código de decodificação e despacho, e ainda usou espaço valioso nos seus buffers e caches diversos. Uma CPU é efetivamente um interpretador em si, embora para código de máquina; visto assim, o Sparkplug é um “transpilador” do bytecode Ignition para o bytecode da CPU, movendo suas funções de rodar em um “emulador” para rodar “nativamente”.

## Desempenho

Então, quão bem o Sparkplug funciona na vida real? Rodamos o Chrome 91 com alguns benchmarks, em alguns de nossos bots de desempenho, com e sem Sparkplug, para ver seu impacto.

Spoiler: estamos bastante satisfeitos.

::: note
Os benchmarks abaixo listam vários bots rodando vários sistemas operacionais. Embora o sistema operacional seja destacado no nome do bot, não acreditamos que isso tenha muito impacto nos resultados. Em vez disso, as diferentes máquinas também têm configurações diferentes de CPU e memória, que acreditamos serem a principal fonte das diferenças.
:::

# Speedometer

[Speedometer](https://browserbench.org/Speedometer2.0/) é um benchmark que tenta emular o uso de frameworks de sites do mundo real, construindo um aplicativo web de rastreamento de lista de tarefas usando alguns dos frameworks populares e testando a performance desse aplicativo ao adicionar e excluir tarefas. Descobrimos que ele reflete bem os comportamentos reais de carregamento e interação, e repetidamente verificamos que as melhorias no Speedometer são refletidas em nossas métricas do mundo real.

Com o Sparkplug, a pontuação do Speedometer melhora de 5-10%, dependendo de qual bot estamos analisando.

![Melhora mediana no score Speedometer com Sparkplug, em diversos bots de desempenho. As barras de erro indicam o intervalo interquartil.](/_img/sparkplug/benchmark-speedometer.svg)

# Testes de navegação

O Speedometer é um ótimo benchmark, mas ele conta apenas parte da história. Além disso, temos um conjunto de "testes de navegação", que são gravações de um conjunto de sites reais que podemos reproduzir, scriptar um pouco de interação e obter uma visão mais realista de como nossas várias métricas se comportam no mundo real.

Nestes benchmarks, optamos por observar nossa métrica "tempo na thread principal do V8", que mede a quantidade total de tempo gasto no V8 (incluindo compilação e execução) na thread principal (ou seja, excluindo análise em fluxo ou compilação otimizada em segundo plano). Esta é a melhor maneira de ver como o Sparkplug compensa enquanto excluímos outras fontes de ruído nos benchmarks.

Os resultados são variados e muito dependem da máquina e do site, mas no geral parecem ótimos: vemos melhorias na ordem de aproximadamente 5–15%.

::: figure Melhora mediana no tempo na thread principal do V8 nos testes de navegação com 10 repetições. As barras de erro indicam o intervalo interquartil.
![Resultado para o bot linux-perf](/_img/sparkplug/benchmark-browsing-linux-perf.svg) ![Resultado para o bot win-10-perf](/_img/sparkplug/benchmark-browsing-win-10-perf.svg) ![Resultado para o bot benchmark-browsing-mac-10_13_laptop_high_end-perf](/_img/sparkplug/benchmark-browsing-mac-10_13_laptop_high_end-perf.svg) ![Resultado para o bot mac-10_12_laptop_low_end-perf](/_img/sparkplug/benchmark-browsing-mac-10_12_laptop_low_end-perf.svg) ![Resultado para o bot mac-m1_mini_2020](/_img/sparkplug/benchmark-browsing-mac-m1_mini_2020-perf.svg)
:::

Em conclusão: o V8 tem um novo compilador ultrarrápido não otimizador, que melhora o desempenho do V8 em benchmarks do mundo real em 5–15%. Ele já está disponível no V8 v9.1 por trás da flag `--sparkplug`, e será lançado no Chrome 91.
