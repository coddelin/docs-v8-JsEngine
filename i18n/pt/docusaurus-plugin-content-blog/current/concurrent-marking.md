---
title: "Marcação concorrente no V8"
author: "Ulan Degenbaev, Michael Lippautz, e Hannes Payer — libertadores da thread principal"
avatars:
  - "ulan-degenbaev"
  - "michael-lippautz"
  - "hannes-payer"
date: 2018-06-11 13:33:37
tags:
  - internos
  - memória
description: "Este post descreve a técnica de coleta de lixo chamada marcação concorrente."
tweet: "1006187194808233985"
---
Este post descreve a técnica de coleta de lixo chamada _marcação concorrente_. A otimização permite que uma aplicação JavaScript continue a execução enquanto o coletor de lixo escaneia o heap para encontrar e marcar objetos vivos. Nossos benchmarks mostram que a marcação concorrente reduz o tempo gasto marcando na thread principal em 60%–70%. A marcação concorrente é a última peça do projeto [Orinoco](/blog/orinoco) — o projeto para substituir incrementalmente o antigo coletor de lixo pelo novo coletor de lixo principalmente concorrente e paralelo. A marcação concorrente está habilitada por padrão no Chrome 64 e Node.js v10.

<!--truncate-->
## Fundamentos

Marcar é uma fase do coletor de lixo [Mark-Compact](https://en.wikipedia.org/wiki/Tracing_garbage_collection) do V8. Durante esta fase, o coletor descobre e marca todos os objetos vivos. A marcação começa a partir do conjunto de objetos vivos conhecidos, como o objeto global e as funções atualmente ativas — os chamados roots. O coletor marca os roots como vivos e segue os ponteiros neles para descobrir mais objetos vivos. O coletor continua marcando os objetos recém-descobertos e seguindo os ponteiros até que não haja mais objetos para marcar. No final da marcação, todos os objetos não marcados no heap estão inacessíveis a partir da aplicação e podem ser recuperados com segurança.

Podemos pensar na marcação como uma [traversal de gráfico](https://en.wikipedia.org/wiki/Graph_traversal). Os objetos no heap são os nós do gráfico. Ponteiros de um objeto para outro são as arestas do gráfico. Dado um nó no gráfico, podemos encontrar todas as arestas de saída desse nó usando a [classe oculta](/blog/fast-properties) do objeto.

![Figura 1. Gráfico de objetos](/_img/concurrent-marking/00.svg)

O V8 implementa a marcação usando dois bits de marcação por objeto e uma lista de trabalho de marcação. Dois bits de marcação codificam três cores: branco (`00`), cinza (`10`), e preto (`11`). Inicialmente, todos os objetos são brancos, o que significa que o coletor ainda não os descobriu. Um objeto branco torna-se cinza quando o coletor o descobre e o empurra para a lista de trabalho de marcação. Um objeto cinza torna-se preto quando o coletor o retira da lista de trabalho de marcação e visita todos os seus campos. Este esquema é chamado marcação tri-color. A marcação termina quando não há mais objetos cinza. Todos os objetos brancos restantes são inacessíveis e podem ser recuperados com segurança.

![Figura 2. A marcação começa pelos roots](/_img/concurrent-marking/01.svg)

![Figura 3. O coletor transforma um objeto cinza em preto processando seus ponteiros](/_img/concurrent-marking/02.svg)

![Figura 4. O estado final após a marcação ser concluída](/_img/concurrent-marking/03.svg)

Observe que o algoritmo de marcação descrito acima funciona apenas se a aplicação estiver pausada enquanto a marcação estiver em andamento. Se permitirmos que a aplicação continue a execução durante a marcação, a aplicação pode alterar o gráfico e eventualmente enganar o coletor para liberar objetos vivos.

## Reduzindo a pausa de marcação

Marcação realizada de uma só vez pode levar vários centenas de milissegundos para heaps grandes.

![](/_img/concurrent-marking/04.svg)

Pausas tão longas podem levar aplicações a ficarem não responsivas e resultar em uma experiência de usuário ruim. Em 2011, o V8 passou da marcação stop-the-world para a marcação incremental. Durante a marcação incremental, o coletor de lixo divide o trabalho de marcação em partes menores e permite que a aplicação execute entre as partes:

![](/_img/concurrent-marking/05.svg)

O coletor de lixo escolhe quanta marcação incremental realizar em cada parte para coincidir com a taxa de alocações pela aplicação. Em casos comuns, isso melhora significativamente a responsividade da aplicação. Para heaps grandes sob pressão de memória, ainda pode haver longas pausas enquanto o coletor tenta acompanhar as alocações.

A marcação incremental não vem sem custos. A aplicação tem que notificar o coletor de lixo sobre todas as operações que mudam o gráfico de objetos. O V8 implementa a notificação usando uma write-barrier no estilo Dijkstra. Após cada operação de gravação da forma `object.field = value` em JavaScript, o V8 insere o código da write-barrier:

```cpp
// Chamado após `object.field = value`.
write_barrier(object, field_offset, value) {
  if (color(object) == black && color(value) == white) {
    set_color(value, grey);
    marking_worklist.push(value);
  }
}
```

A barreira de escrita impõe o invariante de que nenhum objeto preto aponta para um objeto branco. Isso também é conhecido como o forte invariante de três cores e garante que a aplicação não possa ocultar um objeto vivo do coletor de lixo, portanto, todos os objetos brancos no final da marcação são verdadeiramente inacessíveis para a aplicação e podem ser liberados com segurança.

A marcação incremental se integra bem com o agendamento de coleta de lixo em tempo ocioso, como descrito em um [post anterior no blog](/blog/free-garbage-collection). O agendador de tarefas Blink do Chrome pode agendar pequenas etapas de marcação incremental durante o tempo ocioso na thread principal sem causar travamento. Essa otimização funciona muito bem se houver tempo ocioso disponível.

Devido ao custo da barreira de escrita, a marcação incremental pode reduzir o throughput da aplicação. É possível melhorar tanto o throughput quanto os tempos de pausa utilizando threads de trabalho adicionais. Existem duas maneiras de fazer a marcação em threads de trabalho: marcação paralela e marcação concorrente.

**A marcação paralela** ocorre na thread principal e nas threads de trabalho. A aplicação é pausada durante toda a fase de marcação paralela. É a versão multi-thread da marcação com parada do mundo.

![](/_img/concurrent-marking/06.svg)

**A marcação concorrente** ocorre principalmente nas threads de trabalho. A aplicação pode continuar sendo executada enquanto a marcação concorrente está em andamento.

![](/_img/concurrent-marking/07.svg)

As duas seções a seguir descrevem como adicionamos suporte para marcação paralela e concorrente no V8.

## Marcação paralela

Durante a marcação paralela, podemos assumir que a aplicação não está sendo executada simultaneamente. Isso simplifica substancialmente a implementação porque podemos assumir que o gráfico de objetos é estático e não muda. Para marcar o gráfico de objetos em paralelo, precisamos tornar as estruturas de dados do coletor de lixo seguras para threads e encontrar uma maneira eficiente de compartilhar o trabalho de marcação entre as threads. O diagrama a seguir mostra as estruturas de dados envolvidas na marcação paralela. As setas indicam a direção do fluxo de dados. Para simplicidade, o diagrama omite estruturas de dados que são necessárias para a desfragmentação do heap.

![Figura 5. Estruturas de dados para marcação paralela](/_img/concurrent-marking/08.svg)

Note que as threads apenas leem o gráfico de objetos e nunca o alteram. Os bits de marcação dos objetos e a lista de trabalho de marcação devem suportar acessos de leitura e gravação.

## Lista de trabalho de marcação e roubo de trabalho

A implementação da lista de trabalho de marcação é crítica para o desempenho e equilibra o desempenho rápido local da thread com a quantidade de trabalho que pode ser distribuída para outras threads caso elas fiquem sem trabalho.

Os extremos nesse espaço de compensação são (a) usar uma estrutura de dados completamente concorrente para melhor compartilhamento, já que todos os objetos podem ser potencialmente compartilhados, e (b) usar uma estrutura de dados completamente local da thread onde nenhum objeto pode ser compartilhado, otimizando para o throughput local da thread. A Figura 6 mostra como o V8 equilibra essas necessidades usando uma lista de trabalho de marcação baseada em segmentos para inserção e remoção locais da thread. Uma vez que um segmento fica cheio, ele é publicado em um pool global compartilhado onde está disponível para roubo. Dessa forma, o V8 permite que as threads de marcação operem localmente sem nenhuma sincronização pelo maior tempo possível e ainda lidem com casos em que uma única thread alcance um novo sub-gráfico de objetos enquanto outra thread fica sem trabalho ao esgotar completamente seus segmentos locais.

![Figura 6. Lista de trabalho de marcação](/_img/concurrent-marking/09.svg)

## Marcação concorrente

A marcação concorrente permite que o JavaScript seja executado na thread principal enquanto threads de trabalho estão visitando objetos no heap. Isso abre portas para várias possíveis condições de concorrência de dados. Por exemplo, o JavaScript pode estar escrevendo em um campo de objeto ao mesmo tempo que uma thread de trabalho está lendo o campo. As condições de concorrência de dados podem confundir o coletor de lixo a ponto de liberar um objeto vivo ou confundir valores primitivos com ponteiros.

Cada operação na thread principal que altera o gráfico de objetos é uma potencial fonte de condição de concorrência de dados. Como o V8 é um mecanismo de alto desempenho com muitas otimizações no layout de objetos, a lista de fontes potenciais de condições de concorrência de dados é bastante longa. Aqui está uma divisão em alto nível:

- Alocação de objetos.
- Gravação em um campo de objeto.
- Mudanças no layout do objeto.
- Desserialização a partir do instantâneo.
- Materialização durante a desotimização de uma função.
- Evacuação durante a coleta de lixo da geração jovem.
- Alteração de código.

A thread principal precisa se sincronizar com as threads de trabalho nessas operações. O custo e a complexidade da sincronização dependem da operação. A maioria das operações permite sincronização leve com acessos atômicos à memória, mas algumas operações requerem acesso exclusivo ao objeto. Nas subseções a seguir, destacamos alguns dos casos interessantes.

### Barreira de escrita

A condição de concorrência de dados causada por uma gravação em um campo de objeto é resolvida transformando a operação de gravação em uma [gravação atômica relaxada](https://en.cppreference.com/w/cpp/atomic/memory_order#Relaxed_ordering) e ajustando a barreira de escrita:

```cpp
// Chamado após atomic_relaxed_write(&object.field, value);
write_barrier(object, field_offset, value) {
  if (color(value) == branco && atomic_color_transition(value, branco, cinza)) {
    marking_worklist.push(value);
  }
}
```

Compare com a barreira de escrita usada anteriormente:

```cpp
// Chamado após `object.field = value`.
write_barrier(object, field_offset, value) {
  if (color(object) == preto && color(value) == branco) {
    set_color(value, cinza);
    marking_worklist.push(value);
  }
}
```

Há duas mudanças:

1. A verificação da cor do objeto fonte (`color(object) == preto`) foi removida.
2. A transição de cor do `value` de branco para cinza ocorre de forma atômica.

Sem a verificação da cor do objeto fonte, a barreira de escrita torna-se mais conservadora, ou seja, pode marcar objetos como vivos mesmo que esses objetos não sejam realmente acessíveis. Removemos a verificação para evitar uma barreira de memória cara que seria necessária entre a operação de gravação e a barreira de escrita:

```cpp
atomic_relaxed_write(&object.field, value);
memory_fence();
write_barrier(object, field_offset, value);
```

Sem a barreira de memória, a operação de leitura da cor do objeto pode ser reordenada antes da operação de gravação. Se não impedirmos o reordenamento, a barreira de escrita pode observar a cor cinza do objeto e abortar, enquanto uma thread de trabalho marca o objeto sem ver o novo valor. A barreira de escrita original proposta por Dijkstra et al. também não verifica a cor do objeto. Eles fizeram isso por simplicidade, mas precisamos disso para correção.

### Fila de trabalho de desistência

Algumas operações, como a modificação de código, requerem acesso exclusivo ao objeto. Desde cedo, decidimos evitar locks por objeto porque eles podem levar ao problema de inversão de prioridade, em que a thread principal precisa esperar por uma thread de trabalho que foi desagendada enquanto mantinha um lock no objeto. Em vez de bloquear o objeto, permitimos que a thread de trabalho desista de visitar o objeto. A thread de trabalho faz isso colocando o objeto na fila de trabalho de desistência, que é processada apenas pela thread principal:

![Figura 7. A fila de trabalho de desistência](/_img/concurrent-marking/10.svg)

Threads de trabalho desistem em objetos de código otimizados, classes escondidas e coleções fracas porque visitá-los exigiria bloqueios ou protocolos de sincronização caros.

Em retrospectiva, a fila de trabalho de desistência revelou-se ótima para o desenvolvimento incremental. Começamos a implementação com threads de trabalho desistindo em todos os tipos de objetos e adicionando concorrência, um por vez.

### Mudanças no layout de objetos

Um campo de um objeto pode armazenar três tipos de valores: um ponteiro identificado, um número inteiro pequeno identificado (também conhecido como Smi), ou um valor não identificado como um número de ponto flutuante não embalado. [Identificação de ponteiros](https://en.wikipedia.org/wiki/Tagged_pointer) é uma técnica bem conhecida que permite uma representação eficiente de números inteiros não embalados. No V8, o bit menos significativo de um valor identificado indica se ele é um ponteiro ou um número inteiro. Isso se baseia no fato de que ponteiros são alinhados por palavra. As informações sobre se um campo é identificado ou não são armazenadas na classe escondida do objeto.

Algumas operações no V8 mudam um campo de um objeto de identificado para não identificado (ou vice-versa) ao fazer a transição do objeto para outra classe escondida. Tal mudança no layout de objetos é insegura para a marcação concorrente. Caso a mudança ocorra enquanto uma thread de trabalho está visitando o objeto simultaneamente usando a antiga classe escondida, dois tipos de bugs podem ocorrer. Primeiro, a thread de trabalho pode ignorar um ponteiro pensando que é um valor não identificado. A barreira de escrita protege contra esse tipo de bug. Segundo, a thread de trabalho pode tratar um valor não identificado como um ponteiro e desreferenciá-lo, o que resultaria em um acesso inválido à memória, seguido tipicamente por um crash do programa. Para lidar com esse caso, usamos um protocolo de snapshot que sincroniza no bit de marcação do objeto. O protocolo envolve duas partes: a thread principal que muda um campo de um objeto de identificado para não identificado e a thread de trabalho visitando o objeto. Antes de mudar o campo, a thread principal garante que o objeto está marcado como preto e o coloca na fila de trabalho de desistência para ser visitado posteriormente:

```cpp
atomic_color_transition(object, branco, cinza);
if (atomic_color_transition(object, cinza, preto)) {
  // O objeto será revisitado na thread principal durante a drenagem
  // da fila de trabalho de desistência.
  bailout_worklist.push(object);
}
unsafe_object_layout_change(object);
```

Como mostrado no trecho de código abaixo, a thread de trabalho primeiro carrega a classe escondida do objeto e faz o snapshot de todos os campos de ponteiro do objeto especificados pela classe escondida usando [operações de carga atômica relaxadas](https://en.cppreference.com/w/cpp/atomic/memory_order#Relaxed_ordering). Depois, ela tenta marcar o objeto como preto usando uma operação de comparação e troca atômica. Se a marcação tiver sucesso, isso significa que o snapshot deve ser consistente com a classe escondida porque a thread principal marca o objeto como preto antes de mudar seu layout.

```cpp
snapshot = [];
hidden_class = atomic_relaxed_load(&object.hidden_class);
para (field_offset em pointer_field_offsets(hidden_class)) {
  pointer = atomic_relaxed_load(object + field_offset);
  snapshot.add(field_offset, pointer);
}
se (atomic_color_transition(object, grey, black)) {
  visit_pointers(snapshot);
}
```

Note que um objeto branco que passa por uma alteração de layout insegura precisa ser marcado na thread principal. Alterações de layout inseguras são relativamente raras, então isso não tem um grande impacto no desempenho de aplicativos do mundo real.

## Juntando tudo

Integrámos a marcação concorrente na infraestrutura existente de marcação incremental. A thread principal inicia a marcação escaneando as raízes e preenchendo a lista de trabalho de marcação. Depois disso, ela posta tarefas de marcação concorrente nas threads de trabalho. As threads de trabalho ajudam a thread principal a fazer um progresso mais rápido na marcação, drenando a lista de trabalho cooperativamente. De vez em quando, a thread principal participa da marcação processando a lista de trabalho de saída e a lista de trabalho de marcação. Assim que as listas de trabalho de marcação ficam vazias, a thread principal finaliza a coleta de lixo. Durante a finalização, a thread principal reescaneia as raízes e pode descobrir mais objetos brancos. Esses objetos são marcados em paralelo com a ajuda das threads de trabalho.

![](/_img/concurrent-marking/11.svg)

## Resultados

Nossa [ferramenta de benchmarking do mundo real](/blog/real-world-performance) mostra uma redução de cerca de 65% e 70% no tempo de marcação na thread principal por ciclo de coleta de lixo em dispositivos móveis e desktop, respectivamente.

![Tempo gasto na marcação na thread principal (menor é melhor)](/_img/concurrent-marking/12.svg)

A marcação concorrente também reduz as interrupções na coleta de lixo no Node.js. Isso é particularmente importante, já que o Node.js nunca implementou o agendamento de coleta de lixo em tempo ocioso e, portanto, nunca conseguiu esconder o tempo de marcação em fases não críticas para interrupções. A marcação concorrente foi lançada no Node.js v10.
