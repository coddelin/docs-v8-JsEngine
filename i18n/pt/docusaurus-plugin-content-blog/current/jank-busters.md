---
title: "Jank Busters Parte Um"
author: "os caçadores de jank: Jochen Eisinger, Michael Lippautz e Hannes Payer"
avatars:
  - "michael-lippautz"
  - "hannes-payer"
date: 2015-10-30 13:33:37
tags:
  - memory
description: "Este artigo discute otimizações implementadas entre o Chrome 41 e o Chrome 46, que reduzem significativamente as pausas de coleta de lixo, resultando em uma melhor experiência do usuário."
---
Jank, ou em outras palavras, engasgos visíveis, pode ser percebido quando o Chrome falha em renderizar um quadro dentro de 16,66 ms (interrompendo o movimento de 60 quadros por segundo). Atualmente, a maior parte do trabalho de coleta de lixo do V8 é realizada na thread principal de renderização, cf. Figura 1, frequentemente resultando em jank quando muitos objetos precisam ser mantidos. Eliminar jank sempre foi uma alta prioridade para a equipe do V8 ([1](https://blog.chromium.org/2011/11/game-changer-for-interactive.html), [2](https://www.youtube.com/watch?v=3vPOlGRH6zk), [3](/blog/free-garbage-collection)). Este artigo discute algumas otimizações implementadas entre o Chrome 41 e o Chrome 46, que reduzem significativamente as pausas de coleta de lixo, resultando em uma melhor experiência do usuário.

<!--truncate-->
![Figura 1: Coleta de lixo realizada na thread principal](/_img/jank-busters/gc-main-thread.png)

Uma fonte importante de jank durante a coleta de lixo é o processamento de várias estruturas de dados administrativas. Muitas dessas estruturas de dados permitem otimizações que não estão relacionadas à coleta de lixo. Dois exemplos são a lista de todos os ArrayBuffers e a lista de visualizações de cada ArrayBuffer. Essas listas permitem uma implementação eficiente da operação DetachArrayBuffer sem impor qualquer impacto de desempenho na acessibilidade a uma visualização de ArrayBuffer. Em situações, no entanto, em que uma página da web cria milhões de ArrayBuffers (por exemplo, jogos baseados em WebGL), atualizar essas listas durante a coleta de lixo causa jank significativo. No Chrome 46, removemos essas listas e, em vez disso, detectamos buffers destacados inserindo verificações antes de cada carregamento e armazenamento em ArrayBuffers. Isso distribui o custo de percorrer a grande lista administrativa durante a GC, espalhando-o ao longo da execução do programa, resultando em menos jank. Embora as verificações por acesso possam teoricamente reduzir a taxa de transferência de programas que usam amplamente ArrayBuffers, na prática, o compilador otimizador do V8 muitas vezes pode remover verificações redundantes e elevar as verificações restantes para fora de loops, resultando em um perfil de execução mais suave com pouca ou nenhuma penalidade geral de desempenho.

Outra fonte de jank é a contabilidade associada ao rastreamento da vida útil de objetos compartilhados entre Chrome e V8. Embora os heaps de memória do Chrome e do V8 sejam distintos, eles precisam ser sincronizados para certos objetos, como nós DOM, que são implementados no código C++ do Chrome, mas acessíveis pelo JavaScript. O V8 cria um tipo de dado opaco chamado handle que permite ao Chrome manipular um objeto heap do V8 sem conhecer nenhum detalhe da implementação. A vida útil do objeto está vinculada ao handle: enquanto o Chrome mantém o handle, o coletor de lixo do V8 não descarta o objeto. O V8 cria uma estrutura de dados interna chamada referência global para cada handle que passa de volta ao Chrome através da API do V8, e essas referências globais indicam ao coletor de lixo do V8 que o objeto ainda está vivo. Para jogos WebGL, o Chrome pode criar milhões dessas handles, e o V8, por sua vez, precisa criar as referências globais correspondentes para gerenciar seu ciclo de vida. Processar essas quantidades imensas de referências globais na pausa principal da coleta de lixo é observável como jank. Felizmente, objetos comunicados ao WebGL geralmente são apenas passados adiante e nunca realmente modificados, permitindo uma simples [análise de escape](https://en.wikipedia.org/wiki/Escape_analysis) estática. Em essência, para funções WebGL que normalmente usam pequenos arrays como parâmetros, os dados subjacentes são copiados na pilha, tornando a referência global obsoleta. O resultado de tal abordagem mista é uma redução do tempo de pausa em até 50% para jogos WebGL com uso intenso de rendering.

A maior parte da coleta de lixo do V8 é realizada na thread principal de renderização. Mover operações de coleta de lixo para threads concorrentes reduz o tempo de espera do coletor de lixo e reduz ainda mais o jank. Esta é uma tarefa inerentemente complicada, já que a aplicação principal em JavaScript e o coletor de lixo podem observar e modificar simultaneamente os mesmos objetos. Até agora, a concorrência era limitada à varredura da geração antiga do heap JS de objetos regulares. Recentemente, também implementamos a varredura concorrente do espaço de código e do espaço de mapas do heap do V8. Além disso, implementamos o desmapeamento concorrente de páginas não utilizadas para reduzir o trabalho que deve ser realizado na thread principal, cf. Figura 2.

![Figura 2: Algumas operações de coleta de lixo realizadas nas threads de coleta de lixo concorrentes.](/_img/jank-busters/gc-concurrent-threads.png)

O impacto das otimizações discutidas é claramente visível em jogos baseados em WebGL, como, por exemplo, [o demo Oort Online da Turbolenz](http://oortonline.gl/). O seguinte vídeo compara o Chrome 41 ao Chrome 46:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PgrCJpbTs9I" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

Atualmente estamos no processo de tornar mais componentes da coleta de lixo incrementais, concorrentes e paralelos, para reduzir ainda mais os tempos de pausa da coleta de lixo na thread principal. Fique ligado, pois temos algumas correções interessantes a caminho.
