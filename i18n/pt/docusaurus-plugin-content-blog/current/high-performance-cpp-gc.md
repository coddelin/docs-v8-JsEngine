---
title: 'Coleta de lixo de alto desempenho para C++'
author: 'Anton Bikineev, Omer Katz ([@omerktz](https://twitter.com/omerktz)), e Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), especialistas em memória C++'
avatars:
  - 'anton-bikineev'
  - 'omer-katz'
  - 'michael-lippautz'
date: 2020-05-26
tags:
  - internals
  - memória
  - cppgc
description: 'Este post descreve o coletor de lixo Oilpan para C++, seu uso no Blink e como ele otimiza a varredura, ou seja, a recuperação de memória inacessível.'
tweet: '1265304883638480899'
---

No passado, já [falamos](https://v8.dev/blog/trash-talk) [muito](https://v8.dev/blog/concurrent-marking) [sobre](https://v8.dev/blog/tracing-js-dom) coleta de lixo para JavaScript, o modelo de objetos de documentos (DOM) e como tudo isso é implementado e otimizado no V8. No entanto, nem tudo no Chromium é JavaScript, já que a maior parte do navegador e de seu mecanismo de renderização Blink, onde o V8 está embutido, são escritos em C++. O JavaScript pode ser usado para interagir com o DOM, que é então processado pelo pipeline de renderização.

<!--truncate-->
Como o grafo de objetos C++ em torno do DOM está fortemente entrelaçado com os objetos Javascript, a equipe do Chromium mudou, há alguns anos, para um coletor de lixo chamado [Oilpan](https://www.youtube.com/watch?v=_uxmEyd6uxo) para gerenciar este tipo de memória. Oilpan é um coletor de lixo escrito em C++ para gerenciar memória em C++, que pode ser conectado ao V8 usando [rastreamento entre componentes](https://research.google/pubs/pub47359/), tratando o grafo de objetos C++/JavaScript entrelaçado como um único heap.

Este post é o primeiro de uma série de posts sobre Oilpan que fornecerão uma visão geral dos princípios básicos do Oilpan e suas APIs para C++. Neste post, abordaremos alguns dos recursos suportados, explicaremos como eles interagem com vários subsistemas do coletor de lixo e faremos uma análise detalhada sobre a recuperação concorrente de objetos na fase de varredura.

O mais empolgante é que o Oilpan está atualmente implementado no Blink, mas está sendo movido para o V8 na forma de uma [biblioteca de coleta de lixo](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/). O objetivo é tornar a coleta de lixo em C++ facilmente disponível para todos os embutidores do V8 e para mais desenvolvedores de C++ em geral.

## Antecedentes

Oilpan implementa um coletor de lixo do tipo [Mark-Sweep](https://en.wikipedia.org/wiki/Tracing_garbage_collection), onde a coleta de lixo é dividida em duas fases: *marcação*, em que o heap gerenciado é escaneado em busca de objetos vivos, e *varredura*, onde os objetos mortos no heap gerenciado são recuperados.

Já cobrimos os fundamentos da marcação ao introduzir a [marcação concorrente no V8](https://v8.dev/blog/concurrent-marking). Recapitulando, escanear todos os objetos em busca de objetos vivos pode ser entendido como uma travessia de grafo, onde os objetos são nós e os ponteiros entre objetos são arestas. A travessia começa nas raízes, que são registros, a pilha de execução nativa (daqui em diante, a chamaremos de pilha) e outros globais, como descrito [aqui](https://v8.dev/blog/concurrent-marking#background).

C++ não é diferente de JavaScript nesse aspecto. Em contraste com o JavaScript, no entanto, os objetos C++ são estaticamente tipados e, portanto, não podem alterar sua representação em tempo de execução. Os objetos C++ gerenciados usando Oilpan aproveitam este fato e fornecem uma descrição de ponteiros para outros objetos (arestas no grafo) usando o padrão visitor. O padrão básico para descrever objetos Oilpan é o seguinte:

```cpp
class LinkedNode final : public GarbageCollected<LinkedNode> {
 public:
  LinkedNode(LinkedNode* next, int value) : next_(next), value_(value) {}
  void Trace(Visitor* visitor) const {
    visitor->Trace(next_);
  }
 private:
  Member<LinkedNode> next_;
  int value_;
};

LinkedNode* CreateNodes() {
  LinkedNode* first_node = MakeGarbageCollected<LinkedNode>(nullptr, 1);
  LinkedNode* second_node = MakeGarbageCollected<LinkedNode>(first_node, 2);
  return second_node;
}
```

No exemplo acima, `LinkedNode` é gerenciado pelo Oilpan, como indicado pela herança de `GarbageCollected<LinkedNode>`. Quando o coletor de lixo processa um objeto, ele descobre ponteiros de saída invocando o método `Trace` do objeto. O tipo `Member` é um ponteiro inteligente que é sintaticamente semelhante, por exemplo, a `std::shared_ptr`, fornecido pelo Oilpan e usado para manter um estado consistente enquanto atravessa o grafo durante a marcação. Tudo isso permite ao Oilpan saber precisamente onde os ponteiros estão localizados em seus objetos gerenciados.

Leitores ávidos provavelmente perceberam ~~e podem estar assustados~~ que `first_node` e `second_node` são mantidos como ponteiros brutos de C++ na pilha no exemplo acima. Oilpan não adiciona abstrações para trabalhar com a pilha, confiando exclusivamente na varredura conservadora da pilha para encontrar ponteiros em seu heap gerenciado ao processar raízes. Isso funciona iterando palavra por palavra na pilha e interpretando essas palavras como ponteiros no heap gerenciado. Isso significa que Oilpan não impõe uma penalização de desempenho ao acessar objetos alocados na pilha. Em vez disso, transfere o custo para o tempo de coleta de lixo, onde escaneia a pilha de forma conservadora. Oilpan, conforme integrado no navegador, tenta adiar a coleta de lixo até alcançar um estado em que seja garantido que não há nada interessante na pilha. Como a web é baseada em eventos e a execução é impulsionada por tarefas nos loops de eventos, essas oportunidades são abundantes.

Oilpan é usado no Blink, que é uma grande base de código C++ com muito código maduro e, portanto, também suporta:

- Herança múltipla através de mixins e referências para esses mixins (ponteiros internos).
- Gatilho de coleta de lixo durante a execução de construtores.
- Manter objetos vivos a partir de memória não gerenciada por meio de ponteiros inteligentes `Persistent`, que são tratados como raízes.
- Coleções abrangendo contêineres sequenciais (ex.: vetor) e associativos (ex.: conjunto e mapa) com compactação de estruturas de coleção.
- Referências fracas, callbacks fracos e [ephemerons](https://en.wikipedia.org/wiki/Ephemeron).
- Callbacks de finalizadores que são executados antes de reclamar objetos individuais.

## Varredura para C++

Fique atento a uma postagem separada no blog sobre como a marcação no Oilpan funciona em detalhes. Para este artigo, assumimos que a marcação foi feita e que Oilpan descobriu todos os objetos alcançáveis com a ajuda de seus métodos `Trace`. Após a marcação, todos os objetos alcançáveis têm seu bit de marca definido.

Agora, a varredura é a fase em que objetos mortos (aqueles inatingíveis durante a marcação) são recuperados e sua memória subjacente é retornada ao sistema operacional ou disponibilizada para alocações subsequentes. A seguir, mostramos como o varredor do Oilpan funciona, tanto de uma perspectiva de uso e restrições, quanto de como atinge alta taxa de reciclagem.

O varredor encontra objetos mortos iterando a memória do heap e verificando os bits de marca. Para preservar a semântica do C++, o varredor precisa invocar o destrutor de cada objeto morto antes de liberar sua memória. Os destrutores não triviais são implementados como finalizadores.

Do ponto de vista do programador, não há uma ordem definida na qual os destrutores são executados, já que a iteração usada pelo varredor não considera a ordem de construção. Isso impõe uma restrição de que finalizadores não podem tocar em outros objetos no heap. Este é um desafio comum para escrever código de usuário que exige ordem de finalização, já que linguagens gerenciadas geralmente não suportam ordem em sua semântica de finalização (ex.: Java). Oilpan usa um plugin do Clang que verifica estaticamente, entre muitas outras coisas, que nenhum objeto no heap seja acessado durante a destruição de um objeto:

```cpp
class GCed : public GarbageCollected<GCed> {
 public:
  void DoSomething();
  void Trace(Visitor* visitor) {
    visitor->Trace(other_);
  }
  ~GCed() {
    other_->DoSomething();  // erro: Finalizador '~GCed' acessa
                            // campo potencialmente finalizado 'other_'.
  }
 private:
  Member<GCed> other_;
};
```

Para os curiosos: Oilpan fornece callbacks de pré-finalização para casos complexos que exigem acesso ao heap antes que os objetos sejam destruídos. Esses callbacks impõem mais sobrecarga que os destrutores em cada ciclo de coleta de lixo e, portanto, são usados com moderação no Blink.

## Varredura incremental e concorrente

Agora que abordamos as restrições dos destrutores em um ambiente de C++ gerenciado, é hora de analisar como o Oilpan implementa e otimiza a fase de varredura em mais detalhes.

Antes de mergulhar nos detalhes, é importante lembrar como os programas geralmente são executados na web. Qualquer execução, por exemplo, programas JavaScript, mas também coleta de lixo, é impulsionada pela thread principal despachando tarefas em um [loop de eventos](https://en.wikipedia.org/wiki/Event_loop). O navegador, assim como outros ambientes de aplicação, suporta tarefas em segundo plano que são executadas simultaneamente com a thread principal para auxiliar no processamento de trabalho da thread principal.

Começando de forma simples, o Oilpan originalmente implementou varredura stop-the-world, que era executada como parte da pausa de finalização da coleta de lixo, interrompendo a execução da aplicação na thread principal:

![Varredura stop-the-world](/_img/high-performance-cpp-gc/stop-the-world-sweeping.svg)

Para aplicações com restrições de tempo real suaves, o fator determinante ao lidar com coleta de lixo é a latência. A varredura stop-the-world pode induzir um tempo de pausa significativo, resultando em latência perceptível ao usuário. Como próximo passo para reduzir a latência, a varredura foi feita incremental:

![Varredura incremental](/_img/high-performance-cpp-gc/incremental-sweeping.svg)

Com a abordagem incremental, a varredura é dividida e delegada para tarefas adicionais na thread principal. No melhor cenário, essas tarefas são executadas completamente em [tempo inativo](https://research.google/pubs/pub45361/), evitando interferir na execução regular do aplicativo. Internamente, o sistema de varredura divide o trabalho em unidades menores com base na noção de páginas. As páginas podem estar em dois estados interessantes: páginas *a varrer* que o sistema ainda precisa processar e páginas *já varridas* que já foram processadas pelo sistema. A alocação considera apenas páginas já varridas e irá reabastecer buffers de alocação local (LABs) a partir de listas livres que mantêm uma lista de blocos de memória disponíveis. Para obter memória de uma lista livre, o aplicativo tentará primeiro encontrar memória em páginas já varridas, depois tentará ajudar a processar páginas a varrer incorporando o algoritmo de varredura na alocação e, finalmente, solicitará nova memória do sistema operacional caso não haja nenhuma disponível.

O Oilpan tem usado a varredura incremental há anos, mas à medida que os aplicativos e seus respectivos gráficos de objetos cresceram cada vez mais, a varredura começou a impactar o desempenho do aplicativo. Para melhorar a varredura incremental, começamos a usar tarefas em segundo plano para o rebolso concorrente de memória. Há duas regras básicas usadas para eliminar disputas de dados entre tarefas em segundo plano executando o sistema de varredura e o aplicativo alocando novos objetos:

- O sistema de varredura só processa memória que está morta e, por definição, não é acessível pelo aplicativo.
- O aplicativo só aloca em páginas já varridas, que, por definição, não estão mais sendo processadas pelo sistema de varredura.

Ambas as regras garantem que não deve haver concorrência pelo objeto e sua memória. Infelizmente, o C++ depende fortemente de destrutores, que são implementados como finalizadores. O Oilpan obriga finalizadores a rodarem na thread principal para auxiliar os desenvolvedores e evitar disputas de dados no próprio código do aplicativo. Para resolver esse problema, o Oilpan adia a finalização de objetos para a thread principal. Mais concretamente, sempre que o sistema de varredura concorrente encontra um objeto que tem um finalizador (destrutor), ele o insere em uma fila de finalização que será processada em uma fase de finalização separada, que sempre é executada na thread principal, também responsável pela execução do aplicativo. O fluxo de trabalho geral com a varredura concorrente se parece com isto:

![Varredura concorrente usando tarefas em segundo plano](/_img/high-performance-cpp-gc/concurrent-sweeping.svg)

Como finalizadores podem exigir acesso a todo o conteúdo do objeto, a adição da memória correspondente à lista livre é adiada até depois da execução do finalizador. Se nenhum finalizador for executado, o sistema de varredura rodando na thread de segundo plano imediatamente adiciona a memória recuperada à lista livre.

# Resultados

A varredura em segundo plano foi lançada no Chrome M78. Nosso [framework de benchmarking de mundo real](https://v8.dev/blog/real-world-performance) mostra uma redução no tempo de varredura da thread principal de 25%-50% (42% em média). Veja abaixo um conjunto selecionado de itens de linha.

![Tempo de varredura da thread principal em milissegundos](/_img/high-performance-cpp-gc/results.svg)

O restante do tempo gasto na thread principal é destinado à execução de finalizadores. Há trabalho contínuo para reduzir finalizadores em tipos de objetos amplamente instanciados no Blink. A parte emocionante aqui é que todas essas otimizações são feitas no código do aplicativo, já que a varredura se ajustará automaticamente na ausência de finalizadores.

Fique atento a mais postagens sobre coleta de lixo em C++ de forma geral e atualizações sobre a biblioteca Oilpan especificamente, à medida que avançamos para um lançamento que pode ser usado por todos os usuários do V8.
