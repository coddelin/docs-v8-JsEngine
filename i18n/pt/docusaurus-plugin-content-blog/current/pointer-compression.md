---
title: &apos;Compressão de Ponteiros no V8&apos;
author: &apos;Igor Sheludko e Santiago Aboy Solanes, *os* compressores de ponteiros&apos;
avatars:
  - &apos;igor-sheludko&apos;
  - &apos;santiago-aboy-solanes&apos;
date: 2020-03-30
tags:
  - internos
  - memória
description: &apos;O V8 reduziu o tamanho do seu heap em até 43%! Saiba como em “Compressão de Ponteiros no V8”!&apos;
tweet: &apos;1244653541379182596&apos;
---
Há uma batalha constante entre memória e desempenho. Como usuários, gostaríamos que as coisas fossem rápidas e consumissem o menor espaço de memória possível. Infelizmente, normalmente melhorar o desempenho tem um custo no consumo de memória (e vice-versa).

<!--truncate-->
Em 2014, o Chrome passou de um processo de 32 bits para um processo de 64 bits. Isso proporcionou ao Chrome maior [segurança, estabilidade e desempenho](https://blog.chromium.org/2014/08/64-bits-of-awesome-64-bit-windows_26.html), mas veio acompanhado de um custo de memória, uma vez que cada ponteiro agora ocupa oito bytes em vez de quatro. Assumimos o desafio de reduzir essa sobrecarga no V8 para tentar recuperar o máximo possível dos 4 bytes desperdiçados.

Antes de mergulhar na implementação, precisamos saber onde estamos para avaliar corretamente a situação. Para medir nossa memória e desempenho, usamos um conjunto de [páginas da web](https://v8.dev/blog/optimizing-v8-memory) que refletem os sites populares do mundo real. Os dados mostraram que o V8 contribui com até 60% do consumo de memória do [processo do renderizador](https://www.chromium.org/developers/design-documents/multi-process-architecture) do Chrome em desktops, com uma média de 40%.

![Porcentagem de consumo de memória do V8 na memória do renderizador do Chrome](/_img/pointer-compression/memory-chrome.svg)

Compressão de Ponteiros é um dos vários esforços em andamento no V8 para reduzir o consumo de memória. A ideia é muito simples: em vez de armazenar ponteiros de 64 bits, podemos armazenar deslocamentos de 32 bits a partir de um endereço “base”. Com uma ideia tão simples, quanto podemos ganhar com essa compressão no V8?

O heap do V8 contém uma série de itens, como valores de ponto flutuante, caracteres de string, bytecode de interpretador e valores marcados (veja a próxima seção para detalhes). Ao inspecionar o heap, descobrimos que em sites do mundo real esses valores marcados ocupam cerca de 70% do heap do V8!

Vamos dar uma olhada mais de perto no que são valores marcados.

## Marcação de valores no V8

Valores do JavaScript no V8 são representados como objetos e alocados no heap do V8, independentemente de serem objetos, arrays, números ou strings. Isso nos permite representar qualquer valor como um ponteiro para um objeto.

Muitos programas JavaScript realizam cálculos em valores inteiros, como incrementar um índice em um loop. Para evitar a necessidade de alocar um novo objeto numérico cada vez que um número inteiro é incrementado, o V8 utiliza a famosa técnica de [marcação de ponteiro](https://en.wikipedia.org/wiki/Tagged_pointer) para armazenar dados adicionais ou alternativos em ponteiros de heap do V8.

Os bits de marcação têm um duplo propósito: indicam ponteiros fortes/fracos para objetos localizados no heap do V8 ou um pequeno número inteiro. Assim, o valor de um número inteiro pode ser armazenado diretamente no valor marcado, sem a necessidade de alocar armazenamento adicional para ele.

O V8 sempre aloca objetos no heap em endereços alinhados a palavras, o que permite usar os 2 (ou 3, dependendo do tamanho da palavra da máquina) bits menos significativos para marcação. Em arquiteturas de 32 bits, o V8 usa o bit menos significativo para distinguir Smis de ponteiros de objetos de heap. Para ponteiros de heap, ele usa o segundo bit menos significativo para distinguir referências fortes de fracas:

<pre>
                        |----- 32 bits -----|
Ponteiro:               |_____endereço_____ <b>w1</b>|
Smi:                    |___valor_int31____ <b>0</b>|
</pre>

onde *w* é um bit usado para distinguir ponteiros fortes dos fracos.

Observe que um valor Smi só pode transportar uma carga útil de 31 bits, incluindo o bit de sinal. No caso de ponteiros, temos 30 bits que podem ser usados como carga útil de endereço de objeto de heap. Devido ao alinhamento de palavras, a granularidade de alocação é de 4 bytes, o que nos dá 4 GB de espaço endereçável.

Em arquiteturas de 64 bits, os valores do V8 se parecem com isto:

<pre>
            |----- 32 bits -----|----- 32 bits -----|
Ponteiro:   |__________________endereço___________<b>w1</b>|
Smi:        |____valor_int32____|000000000000000000<b>0</b>|
</pre>

Você pode perceber que, diferentemente das arquiteturas de 32 bits, nas arquiteturas de 64 bits o V8 pode usar 32 bits para a carga útil do valor Smi. As implicações dos Smis de 32 bits na compressão de ponteiros são discutidas nas seções seguintes.

## Valores marcados comprimidos e novo layout do heap

Com a Compressão de Ponteiros, nosso objetivo é, de alguma forma, encaixar ambos os tipos de valores marcados em 32 bits nas arquiteturas de 64 bits. Podemos ajustar os ponteiros em 32 bits por:

- garantir que todos os objetos do V8 sejam alocados dentro de um intervalo de memória de 4 GB
- representar os ponteiros como deslocamentos dentro desse intervalo

Ter um limite tão rígido é lamentável, mas o V8 no Chrome já tem um limite de 2 GB ou 4 GB no tamanho do heap do V8 (dependendo de quão poderoso é o dispositivo subjacente), mesmo em arquiteturas de 64 bits. Outros embutidos do V8, como Node.js, podem exigir heaps maiores. Se impusermos um máximo de 4 GB, isso significaria que esses embutidos não poderiam usar a Compressão de Ponteiros.

A questão agora é como atualizar o layout do heap para garantir que ponteiros de 32 bits identifiquem exclusivamente objetos V8.

### Layout trivial de heap

O esquema de compressão trivial seria alocar objetos nos primeiros 4 GB do espaço de endereço.

![Layout trivial de heap](/_img/pointer-compression/heap-layout-0.svg)

Infelizmente, isso não é uma opção para o V8, já que o processo de renderização do Chrome pode precisar criar várias instâncias do V8 no mesmo processo de renderização, por exemplo, para Web/Service Workers. Caso contrário, com este esquema, todas essas instâncias do V8 competem pelo mesmo espaço de endereço de 4 GB e, assim, há um limite de memória de 4 GB imposto a todas as instâncias do V8 juntas.

### Layout de heap, v1

Se organizarmos o heap do V8 em uma região contígua de 4 GB do espaço de endereço em outro lugar, então um deslocamento **sem sinal** de 32 bits a partir da base identifica exclusivamente o ponteiro.

<figure>
  <img src="/_img/pointer-compression/heap-layout-1.svg" width="827" height="323" alt="" loading="lazy"/>
  <figcaption>Layout de heap, base alinhada ao início</figcaption>
</figure>

Se também garantirmos que a base esteja alinhada a 4 GB, então os 32 bits superiores são os mesmos para todos os ponteiros:

```
            |----- 32 bits -----|----- 32 bits -----|
Ponteiro:    |________base_______|______offset_____w1|
```

Podemos também tornar Smis compressíveis limitando a carga útil de Smi a 31 bits e colocando-a nos 32 bits inferiores. Basicamente, tornando-os semelhantes aos Smis em arquiteturas de 32 bits.

```
         |----- 32 bits -----|----- 32 bits -----|
Smi:     |sssssssssssssssssss|____int31_value___0|
```

onde *s* é o valor de sinal da carga útil de Smi. Se tivermos uma representação com extensão de sinal, seremos capazes de comprimir e descomprimir Smis com apenas um deslocamento aritmético de um bit na palavra de 64 bits.

Agora, podemos ver que a metade superior de palavras tanto de ponteiros quanto de Smis é totalmente definida pela metade inferior de palavras. Então, podemos armazenar apenas esta última na memória, reduzindo a memória necessária para armazenar o valor marcado pela metade:

```
                    |----- 32 bits -----|----- 32 bits -----|
Ponteiro comprimido:                     |______offset_____w1|
Smi comprimido:                          |____int31_value___0|
```

Dado que a base está alinhada a 4 GB, a compressão é apenas uma truncagem:

```cpp
uint64_t uncompressed_tagged;
uint32_t compressed_tagged = uint32_t(uncompressed_tagged);
```

O código de descompressão, no entanto, é um pouco mais complicado. Precisamos distinguir entre estender o sinal do Smi e estender zero no ponteiro, bem como se devemos ou não adicionar a base.

```cpp
uint32_t compressed_tagged;

uint64_t uncompressed_tagged;
if (compressed_tagged & 1) {
  // caso do ponteiro
  uncompressed_tagged = base + uint64_t(compressed_tagged);
} else {
  // caso do Smi
  uncompressed_tagged = int64_t(compressed_tagged);
}
```

Vamos tentar mudar o esquema de compressão para simplificar o código de descompressão.

### Layout de heap, v2

Se, em vez de ter a base no início dos 4 GB, colocarmos a base no _meio_, podemos tratar o valor comprimido como um deslocamento **assinado** de 32 bits da base. Note que toda a reserva não está mais alinhada a 4 GB, mas a base está.

![Layout de heap, base alinhada ao meio](/_img/pointer-compression/heap-layout-2.svg)

Neste novo layout, o código de compressão permanece o mesmo.

O código de descompressão, no entanto, torna-se mais agradável. A extensão de sinal agora é comum para ambos os casos, Smi e ponteiro, e o único ramo é se adicionar a base no caso do ponteiro.

```cpp
int32_t compressed_tagged;

// Código comum para ambos os casos, ponteiro e Smi
int64_t uncompressed_tagged = int64_t(compressed_tagged);
if (uncompressed_tagged & 1) {
  // caso do ponteiro
  uncompressed_tagged += base;
}
```

O desempenho de condições no código depende da unidade de previsão de ramificações no CPU. Achamos que, se implementássemos a descompressão de uma maneira sem ramificações, poderíamos ter um desempenho melhor. Com uma pequena quantidade de magia de bits, podemos escrever uma versão sem ramificações do código acima:

```cpp
int32_t compressed_tagged;

// Mesmo código para ambos os casos, ponteiro e Smi
int64_t sign_extended_tagged = int64_t(compressed_tagged);
int64_t selector_mask = -(sign_extended_tagged & 1);
// Máscara é 0 no caso de Smi ou todos os bits 1 no caso de ponteiro
int64_t uncompressed_tagged =
    sign_extended_tagged + (base & selector_mask);
```

Então, decidimos começar com a implementação sem ramificações.

## Evolução de desempenho

### Desempenho inicial

Medimos o desempenho no [Octane](https://v8.dev/blog/retiring-octane#the-genesis-of-octane) — um benchmark de desempenho máximo que usamos no passado. Embora não estejamos mais focados em melhorar o desempenho máximo em nosso trabalho diário, também não queremos regredir o desempenho máximo, especialmente para algo tão sensível ao desempenho quanto _todos os ponteiros_. Octane continua a ser um bom benchmark para esta tarefa.

Este gráfico mostra a pontuação do Octane na arquitetura x64 enquanto otimizávamos e ajustávamos a implementação de Compressão de Ponteiros. No gráfico, valores mais altos são melhores. A linha vermelha representa a construção x64 existente com ponteiros de tamanho completo, enquanto a linha verde é a versão com ponteiros comprimidos.

![Primeira rodada de melhorias do Octane](/_img/pointer-compression/perf-octane-1.svg)

Com a primeira implementação funcional, tivemos um gap de regressão de ~35%.

#### Incremento (1), +7%

Primeiramente, validamos nossa hipótese de que “sem ramificação é mais rápido”, comparando a descompressão sem ramificação com a com ramificação. Acabou que nossa hipótese estava errada, e a versão com ramificação era 7% mais rápida no x64. Isso foi uma diferença bastante significativa!

Vamos dar uma olhada no assembly x64.

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| Descompressão | Sem ramificação        | Com ramificação             |
|---------------|-----------------------|----------------------------|
| Código        | ```asm                | ```asm                     \
|               | movsxlq r11,[…]       | movsxlq r11,[…]            \
|               | movl r10,r11          | testb r11,0x1              \
|               | andl r10,0x1          | jz done                    \
|               | negq r10              | addq r11,r13               \
|               | andq r10,r13          | done:                      \
|               | addq r11,r10          |                            | \
|               | ```                   | ```                        |
| Resumo        | 20 bytes              | 13 bytes                   |
| ^^            | 6 instruções executadas | 3 ou 4 instruções executadas |
| ^^            | sem ramificações      | 1 ramificação              |
| ^^            | 1 registrador adicional |                          |
<!-- markdownlint-enable no-space-in-code -->
:::

**r13** aqui é um registrador dedicado usado para o valor base. Note como o código sem ramificação é maior e requer mais registradores.

No Arm64, observamos o mesmo - a versão com ramificação era claramente mais rápida em CPUs poderosas (embora o tamanho do código fosse o mesmo para ambos os casos).

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| Descompressão | Sem ramificação         | Com ramificação             |
|---------------|-------------------------|-----------------------------|
| Código        | ```asm                  | ```asm                      \
|               | ldur w6, […]            | ldur w6, […]                \
|               | sbfx x16, x6, #0, #1    | sxtw x6, w6                 \
|               | and x16, x16, x26       | tbz w6, #0, #done           \
|               | add x6, x16, w6, sxtw   | add x6, x26, x6             \
|               |                         | done:                       \
|               | ```                     | ```                         |
| Resumo        | 16 bytes                | 16 bytes                    |
| ^^            | 4 instruções executadas | 3 ou 4 instruções executadas |
| ^^            | sem ramificações        | 1 ramificação               |
| ^^            | 1 registrador adicional |                             |
<!-- markdownlint-enable no-space-in-code -->
:::

Em dispositivos Arm64 de baixo desempenho, quase não observamos diferenças de desempenho em nenhuma direção.

Nossa conclusão é: preditores de ramificação em CPUs modernas são muito bons, e o tamanho do código (particularmente o comprimento do caminho de execução) afetou mais o desempenho.

#### Incremento (2), +2%

[TurboFan](https://v8.dev/docs/turbofan) é o compilador otimizador do V8, construído em torno de um conceito chamado “Mar de Nós”. Em resumo, cada operação é representada como um nó em um grafo (Veja uma versão mais detalhada [neste post do blog](https://v8.dev/blog/turbofan-jit)). Esses nós têm várias dependências, incluindo tanto fluxos de dados quanto fluxos de controle.

Existem duas operações que são cruciais para a Compressão de Ponteiros: Carregamentos e Armazenamentos, pois conectam o heap do V8 com o resto do pipeline. Se fossemos descomprimir toda vez que carregássemos um valor comprimido do heap e comprimi-lo antes de armazená-lo, o pipeline poderia continuar funcionando como fazia no modo de ponteiro completo. Portanto, adicionamos novas operações explícitas de valor no grafo de nós - Descomprimir e Comprimir.

Existem casos em que a descompressão não é realmente necessária. Por exemplo, se um valor comprimido é carregado de algum lugar apenas para ser armazenado em um novo local.

Para otimizar operações desnecessárias, implementamos uma nova fase de “Eliminação de Descompressão” no TurboFan. Sua função é eliminar descompressões seguidas diretamente por compressões. Como esses nós podem não estar diretamente próximos uns dos outros, ele também tenta propagar descompressões pelo grafo, na esperança de encontrar uma compressão mais à frente e eliminá-los ambos. Isso nos deu uma melhoria de 2% na pontuação do Octane.

#### Incremento (3), +2%

Enquanto analisávamos o código gerado, percebemos que a descompressão de um valor que tinha acabado de ser carregado produzia um código um pouco verboso demais:

```asm
movl rax, <mem>   // carregar
movlsxlq rax, rax // extensão de sinal
```

Assim que corrigimos para estender o sinal do valor carregado da memória diretamente:

```asm
movlsxlq rax, <mem>
```

obtivemos mais uma melhoria de 2%.

#### Incremento (4), +11%

As fases de otimização do TurboFan funcionam utilizando correspondência de padrões no gráfico: uma vez que um sub-gráfico corresponde a um certo padrão, ele é substituído por um sub-gráfico ou instrução semanticamente equivalente (mas melhor).

Tentativas malsucedidas de encontrar uma correspondência não são uma falha explícita. A presença de operações explícitas de Descompressão/Compressão no gráfico fez com que tentativas anteriormente bem-sucedidas de correspondência de padrões não fossem mais bem-sucedidas, resultando em falhas silenciosas de otimização.

Um exemplo de otimização "quebrada" foi [pré-tenuring de alocação](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43823.pdf). Após atualizar a correspondência de padrões para estar ciente dos novos nós de compressão/descompressão, obtivemos mais um aumento de 11%.

### Melhorias adicionais

![Segunda rodada de melhorias do Octane](/_img/pointer-compression/perf-octane-2.svg)

#### Incremento (5), +0,5%

Durante a implementação da Eliminação de Descompressão no TurboFan, aprendemos muito. A abordagem com nó explícito de Descompressão/Compressão possuía as seguintes propriedades:

Prós:

- A explicitação de tais operações nos permitiu otimizar descompressões desnecessárias ao fazer correspondência canônica de padrões de sub-gráficos.

Mas, conforme continuamos a implementação, descobrimos os contras:

- Uma explosão combinatória de operações de conversão possíveis devido a novas representações de valores internos tornou-se incontrolável. Agora poderíamos ter ponteiro comprimido, Smi comprimido e qualquer coisa comprimida (valores comprimidos que poderiam ser ponteiro ou Smi), além do conjunto existente de representações (Smi marcado, ponteiro marcado, qualquer coisa marcada, word8, word16, word32, word64, float32, float64, simd128).
- Algumas otimizações existentes baseadas em correspondência de padrões de gráficos simplesmente não dispararam, o que causou regressões aqui e ali. Embora tenhamos identificado e corrigido algumas delas, a complexidade do TurboFan continuou aumentando.
- O alocador de registradores estava cada vez mais insatisfeito com a quantidade de nós no gráfico, muitas vezes gerando código ruim.
- Os gráficos de nós maiores desaceleraram as fases de otimização do TurboFan e aumentaram o consumo de memória durante a compilação.

Decidimos dar um passo atrás e pensar em uma maneira mais simples de suportar Compressão de Ponteiros no TurboFan. A nova abordagem é abandonar as representações de Ponteiro/Smi/Qualquer Coisa Comprimido e tornar todos os nós explícitos de Compressão/Descompressão implícitos dentro de Armazenamentos e Carregamentos, assumindo que sempre descomprimimos antes de carregar e comprimimos antes de armazenar.

Também adicionamos uma nova fase no TurboFan que substituiria a fase “Eliminação de Descompressão”. Essa nova fase reconheceria quando realmente não precisamos comprimir ou descomprimir e atualizaria os Carregamentos e Armazenamentos de acordo. Tal abordagem reduziu significativamente a complexidade do suporte à Compressão de Ponteiros no TurboFan e melhorou a qualidade do código gerado.

A nova implementação foi tão eficaz quanto a versão inicial e trouxe uma melhoria adicional de 0,5%.

#### Incremento (6), +2,5%

Estávamos chegando perto da paridade de desempenho, mas a lacuna ainda estava lá. Precisávamos de ideias mais inovadoras. Uma delas foi: e se garantirmos que qualquer código que lida com valores Smi nunca “olhe” para os 32 bits superiores?

Vamos relembrar a implementação da descompressão:

```cpp
// Implementação antiga de descompressão
int64_t uncompressed_tagged = int64_t(compressed_tagged);
if (uncompressed_tagged & 1) {
  // caso de ponteiro
  uncompressed_tagged += base;
}
```

Se os 32 bits superiores de um Smi forem ignorados, podemos assumi-los como indefinidos. Então, podemos evitar o caso especial entre os casos de ponteiro e Smi e adicionar incondicionalmente a base ao descomprimir, mesmo para Smis! Chamamos essa abordagem de “corrompimento de Smi”.

```cpp
// Nova implementação de descompressão
int64_t uncompressed_tagged = base + int64_t(compressed_tagged);
```

Além disso, como não nos importamos mais com a extensão de sinal do Smi, essa mudança nos permite retornar ao layout de heap v1. Este é aquele com a base apontando para o início da reserva de 4GB.

<figure>
  <img src="/_img/pointer-compression/heap-layout-1.svg" width="827" height="323" alt="" loading="lazy"/>
  <figcaption>Layout do heap, base alinhada ao início</figcaption>
</figure>

Em termos de código de descompressão, isso muda uma operação de extensão de sinal para uma extensão de zero, que é igualmente barata. No entanto, isso simplifica as coisas do lado da execução (C++). Por exemplo, o código de reserva da região de espaço de endereço (veja a seção [Alguns detalhes de implementação](#some-implementation-details)).

Aqui está o código assembly para comparação:

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| Descompressão | Com Muitos Ramos            | Corrompendo Smi              |
|---------------|-----------------------------|------------------------------|
| Código        | ```asm                      | ```asm                       \
|               | movsxlq r11,[…]             | movl r11,[rax+0x13]          \
|               | testb r11,0x1               | addq r11,r13                 \
|               | jz done                     |                              | \
|               | addq r11,r13                |                              | \
|               | done:                       |                              | \
|               | ```                         | ```                          |
| Resumo        | 13 bytes                    | 7 bytes                      |
| ^^            | 3 ou 4 instruções executadas| 2 instruções executadas      |
| ^^            | 1 ramo                      | sem ramos                    |
<!-- markdownlint-enable no-space-in-code -->
:::

Então, adaptamos todos os pedaços de código que usam Smi no V8 para o novo esquema de compressão, o que nos deu uma melhoria adicional de 2,5%.

### Diferença restante

A diferença de desempenho restante é explicada por duas otimizações para builds de 64 bits que tivemos que desabilitar devido à incompatibilidade fundamental com a Compressão de Ponteiros.

![Última rodada de melhorias do Octane](/_img/pointer-compression/perf-octane-3.svg)

#### Otimização de Smi de 32 bits (7), -1%

Vamos relembrar como os Smis se parecem no modo de ponteiro completo em arquiteturas de 64 bits.

```
        |----- 32 bits -----|----- 32 bits -----|
Smi:    |____int32_value____|0000000000000000000|
```

O Smi de 32 bits possui os seguintes benefícios:

- ele pode representar um intervalo maior de números inteiros sem a necessidade de encapsulá-los em objetos numéricos; e
- tal formato proporciona acesso direto ao valor de 32 bits ao ler/gravar.

Essa otimização não pode ser feita com Compressão de Ponteiros, pois não há espaço no ponteiro comprimido de 32 bits devido ao bit que distingue os ponteiros dos Smis. Se desativarmos os Smis de 32 bits na versão completa de ponteiro de 64 bits, vemos uma regressão de 1% no score do Octane.

#### Desencapsulamento de campo de número de ponto flutuante (8), -3%

Essa otimização tenta armazenar valores de ponto flutuante diretamente nos campos do objeto sob certas suposições. O objetivo é reduzir ainda mais a quantidade de alocações de objetos numéricos do que os Smis conseguem sozinhos.

Imagine o seguinte código JavaScript:

```js
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const p = new Point(3.1, 5.3);
```

De modo geral, ao observar como o objeto `p` parece na memória, veremos algo assim:

![Objeto `p` na memória](/_img/pointer-compression/heap-point-1.svg)

Você pode ler mais sobre classes ocultas e propriedades e elementos de armazenamento de apoio neste [artigo](https://v8.dev/blog/fast-properties).

Em arquiteturas de 64 bits, os valores de ponto flutuante têm o mesmo tamanho que os ponteiros. Então, se assumirmos que os campos do `Point` sempre contêm valores numéricos, podemos armazená-los diretamente nos campos do objeto.

![](/_img/pointer-compression/heap-point-2.svg)

Se a suposição quebrar para algum campo, digamos após executar esta linha:

```js
const q = new Point(2, &apos;ab&apos;);
```

então valores numéricos para a propriedade `y` devem ser armazenados encapsulados. Além disso, se houver código otimizado especulativamente em algum lugar que depende dessa suposição, ele não pode mais ser usado e deve ser descartado (desotimizado). A razão para tal generalização de “tipo de campo” é minimizar o número de formas de objetos criados a partir da mesma função construtora, o que, por sua vez, é necessário para um desempenho mais estável.

![Objetos `p` e `q` na memória](/_img/pointer-compression/heap-point-3.svg)

Se aplicada, o desencapsulamento de campo de número de ponto flutuante traz os seguintes benefícios:

- fornece acesso direto aos dados de ponto flutuante através do ponteiro do objeto, evitando a desreferência adicional via objeto numérico; e
- nos permite gerar códigos otimizados menores e mais rápidos para laços curtos que acessam campos de número de ponto flutuante com frequência (por exemplo, em aplicações de processamento numérico).

Com a Compressão de Ponteiros ativada, os valores de ponto flutuante simplesmente não cabem mais nos campos comprimidos. No entanto, no futuro, poderemos adaptar essa otimização para a Compressão de Ponteiros.

Observe que códigos de processamento numérico que requerem alta taxa de transferência podem ser reescritos de forma otimizável mesmo sem essa otimização de desencapsulamento de campo de ponto flutuante (de uma forma compatível com a Compressão de Ponteiros), armazenando dados em Float64 TypedArrays, ou até mesmo usando [Wasm](https://webassembly.github.io/spec/core/).

#### Mais melhorias (9), 1%

Finalmente, um pouco de ajuste fino na otimização de eliminação de descompressão no TurboFan rendeu mais 1% de melhoria de desempenho.

## Alguns detalhes de implementação

Para simplificar a integração da Compressão de Ponteiros no código existente, decidimos descomprimir os valores em cada carregamento e comprimi-los em cada armazenamento. Assim, alteramos apenas o formato de armazenamento dos valores marcados, mantendo o formato de execução inalterado.

### Lado do código nativo

Para poder gerar código eficiente quando a descompressão é necessária, o valor base deve estar sempre disponível. Felizmente, o V8 já tinha um registrador dedicado sempre apontando para uma "tabela de raízes" contendo referências a objetos internos do JavaScript e do V8, que devem estar sempre disponíveis (por exemplo, undefined, null, true, false e muitos outros). Este registrador é chamado de "registrador de raiz" e é usado para gerar código embutido [menor e compartilhável](https://v8.dev/blog/embedded-builtins).

Portanto, colocamos a tabela de raízes na área de reserva do heap do V8 e, assim, o registrador de raiz tornou-se utilizável para ambos os propósitos - como ponteiro de raiz e como valor base para descompressão.

### Lado do C++

O runtime do V8 acessa objetos no heap do V8 através de classes C++ que oferecem uma visão conveniente dos dados armazenados no heap. Note que os objetos V8 são mais parecidos com estruturas [POD](https://en.wikipedia.org/wiki/Passive_data_structure) do que com objetos C++. As classes auxiliares de "visão" contêm apenas um campo uintptr_t com um valor marcado respectivo. Como as classes de visão possuem tamanho de palavra, podemos passá-las por valor sem nenhum overhead (muito obrigado aos compiladores modernos de C++).

Aqui está um exemplo fictício de uma classe auxiliar:

```cpp
// Classe oculta
class Map {
 public:
  …
  inline DescriptorArray instance_descriptors() const;
  …
  // O valor real do ponteiro marcado armazenado no objeto de visão Map.
  const uintptr_t ptr_;
};

DescriptorArray Map::instance_descriptors() const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uintptr_t da = *reinterpret_cast<uintptr_t*>(field_address);
  return DescriptorArray(da);
}
```

Para minimizar o número de alterações necessárias para uma primeira execução da versão comprimida do ponteiro, integramos o cálculo do valor base necessário para descompressão nos getters.

```cpp
inline uintptr_t GetBaseForPointerCompression(uintptr_t address) {
  // Arredonda o endereço para baixo até 4 GB
  const uintptr_t kBaseAlignment = 1 << 32;
  return address & -kBaseAlignment;
}

DescriptorArray Map::instance_descriptors() const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uint32_t compressed_da = *reinterpret_cast<uint32_t*>(field_address);

  uintptr_t base = GetBaseForPointerCompression(ptr_);
  uintptr_t da = base + compressed_da;
  return DescriptorArray(da);
}
```

As medições de desempenho confirmaram que o cálculo do valor base em cada carregamento prejudica o desempenho. A razão é que os compiladores C++ não sabem que o resultado da chamada GetBaseForPointerCompression() é o mesmo para qualquer endereço do heap do V8 e, assim, o compilador não consegue mesclar os cálculos dos valores base. Como o código consiste em várias instruções e uma constante de 64 bits, isso resulta em um aumento significativo de código.

Para resolver esse problema, reutilizamos o ponteiro de instância do V8 como base para a descompressão (lembre-se dos dados da instância do V8 no layout do heap). Este ponteiro geralmente está disponível nas funções de runtime, então simplificamos o código dos getters exigindo um ponteiro de instância do V8 e isso recuperou as regressões:

```cpp
DescriptorArray Map::instance_descriptors(const Isolate* isolate) const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uint32_t compressed_da = *reinterpret_cast<uint32_t*>(field_address);

  // Nenhum arredondamento é necessário, pois o ponteiro Isolate já é a base.
  uintptr_t base = reinterpret_cast<uintptr_t>(isolate);
  uintptr_t da = DecompressTagged(base, compressed_value);
  return DescriptorArray(da);
}
```

## Resultados

Vamos dar uma olhada nos números finais da Compressão de Ponteiros! Para esses resultados, usamos os mesmos testes de navegação que apresentamos no início deste post do blog. Como lembrete, são histórias de uso de navegação que encontramos como representativas do uso de sites reais.

Neles, observamos que a Compressão de Ponteiros reduz o **tamanho do heap do V8 em até 43%**! Por sua vez, isso reduz a **memória do processo de renderização do Chrome em até 20%** no Desktop.

![Economia de memória ao navegar no Windows 10](/_img/pointer-compression/v8-heap-memory.svg)

Outra coisa importante a notar é que nem todos os sites melhoram na mesma medida. Por exemplo, a memória do heap do V8 costumava ser maior no Facebook do que no New York Times, mas com a Compressão de Ponteiros, isso foi invertido. Essa diferença pode ser explicada pelo fato de que alguns sites têm mais valores Marcados do que outros.

Além dessas melhorias de memória, também vimos melhorias de desempenho no mundo real. Em sites reais, utilizamos menos CPU e tempo do coletor de lixo!

![Melhorias no tempo de CPU e coleta de lixo](/_img/pointer-compression/performance-improvements.svg)

## Conclusão

A jornada para chegar aqui não foi fácil, mas valeu a pena. [300+ commits](https://github.com/v8/v8/search?o=desc&q=repo%3Av8%2Fv8+%22%5Bptr-compr%5D%22&s=committer-date&type=Commits) depois, o V8 com Compressão de Ponteiros usa tanto memória quanto se estivéssemos executando uma aplicação de 32 bits, enquanto mantém o desempenho de uma de 64 bits.

Estamos sempre buscando melhorar as coisas e temos as seguintes tarefas relacionadas em nosso pipeline:

- Melhorar a qualidade do código assembly gerado. Sabemos que, em alguns casos, podemos gerar menos código, o que deve melhorar o desempenho.
- Resolver regressões de desempenho relacionadas, incluindo um mecanismo que permita desfazer a caixa de campos double novamente de maneira compatível com a compressão de ponteiros.
- Explorar a ideia de suportar heaps maiores, na faixa de 8 a 16 GB.
