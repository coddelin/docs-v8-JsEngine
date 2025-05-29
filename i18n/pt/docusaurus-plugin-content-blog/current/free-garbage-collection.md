---
title: 'Obtendo coleta de lixo gratuitamente'
author: 'Hannes Payer e Ross McIlroy, Idle Garbage Collectors'
avatars:
  - 'hannes-payer'
  - 'ross-mcilroy'
date: 2015-08-07 13:33:37
tags:
  - internals
  - memória
description: 'O Chrome 41 oculta operações caras de gerenciamento de memória dentro de pequenos períodos de tempo ocioso não utilizados, reduzindo o atraso.'
---
O desempenho do JavaScript continua sendo um dos aspectos-chave dos valores do Chrome, especialmente quando se trata de proporcionar uma experiência suave. A partir do Chrome 41, o V8 aproveita uma nova técnica para aumentar a responsividade de aplicativos web, ocultando operações caras de gerenciamento de memória dentro de pequenos períodos de tempo ocioso não utilizados. Como resultado, os desenvolvedores web devem esperar rolagem suave e animações fluídas com muito menos atrasos devido à coleta de lixo.

<!--truncate-->
Muitos motores de linguagem modernos, como o motor de JavaScript V8 do Chrome, gerenciam dinamicamente a memória para aplicativos em execução para que os desenvolvedores não precisem se preocupar com isso. O motor periodicamente analisa a memória alocada para o aplicativo, determina quais dados não são mais necessários e os limpa para liberar espaço. Este processo é conhecido como [coleta de lixo](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science)).

No Chrome, buscamos oferecer uma experiência visual suave de 60 quadros por segundo (FPS). Embora o V8 já tente realizar a coleta de lixo em pequenos pedaços, operações maiores de coleta de lixo podem ocorrer em momentos imprevisíveis — às vezes no meio de uma animação — pausando a execução e impedindo que o Chrome alcance a meta de 60 FPS.

O Chrome 41 incluiu um [agendador de tarefas para o motor de renderização Blink](https://blog.chromium.org/2015/04/scheduling-tasks-intelligently-for_30.html) que permite a priorização de tarefas sensíveis à latência para garantir que o Chrome permaneça responsivo e rápido. Além de conseguir priorizar o trabalho, este agendador de tarefas tem conhecimento centralizado de quão ocupado o sistema está, quais tarefas precisam ser realizadas e quão urgentes essas tarefas são. Por isso, ele pode estimar quando o Chrome provavelmente estará ocioso e aproximadamente quanto tempo espera permanecer ocioso.

Um exemplo disso ocorre quando o Chrome está mostrando uma animação em uma página web. A animação atualizará a tela a 60 FPS, dando ao Chrome cerca de 16,6 ms para realizar a atualização. Assim, o Chrome começará a trabalhar no quadro atual logo após o quadro anterior ter sido exibido, executando tarefas de entrada, animação e renderização de quadros para este novo quadro. Se o Chrome concluir todo este trabalho em menos de 16,6 ms, ele não terá mais nada para fazer pelo tempo restante até precisar começar a renderizar o próximo quadro. O agendador do Chrome permite que o V8 aproveite este _período de tempo ocioso_ ao agendar tarefas especiais _ociosas_ quando o Chrome estaria, de outra forma, ocioso.

![Figura 1: Renderização de quadros com tarefas ociosas](/_img/free-garbage-collection/frame-rendering.png)

Tarefas ociosas são tarefas especiais de baixa prioridade que são executadas quando o agendador determina que está em um período ocioso. Tarefas ociosas recebem um prazo que é a estimativa do agendador de quanto tempo espera permanecer ocioso. No exemplo de animação da Figura 1, este seria o momento em que o próximo quadro deveria começar a ser desenhado. Em outras situações (por exemplo, quando nenhuma atividade na tela está ocorrendo) este poderia ser o momento em que a próxima tarefa pendente está programada para ser executada, com um limite superior de 50 ms para garantir que o Chrome permaneça responsivo a entradas inesperadas do usuário. O prazo é usado pelas tarefas ociosas para estimar quanto trabalho podem realizar sem causar atrasos ou interrupções na resposta de entrada.

A coleta de lixo realizada nas tarefas ociosas está oculta em operações críticas sensíveis à latência. Isso significa que essas tarefas de coleta de lixo são realizadas “de graça”. Para entender como o V8 faz isso, vale a pena revisar a estratégia atual de coleta de lixo do V8.

## Exploração detalhada do motor de coleta de lixo do V8

O V8 usa um [coletor de lixo generacional](http://www.memorymanagement.org/glossary/g.html#term-generational-garbage-collection) com o heap do JavaScript dividido em uma geração jovem pequena para objetos recém-alocados e uma geração antiga grande para objetos de longa duração. [Como a maioria dos objetos morre jovem](http://www.memorymanagement.org/glossary/g.html#term-generational-hypothesis), esta estratégia generacional permite que o coletor de lixo realize coletas regulares e curtas na geração jovem menor (conhecida como escavações), sem precisar rastrear objetos na geração antiga.

A geração jovem usa uma estratégia de alocação [semi-espaço](http://www.memorymanagement.org/glossary/s.html#semi.space), onde novos objetos são inicialmente alocados no semi-espaço ativo da geração jovem. Uma vez que esse semi-espaço fica cheio, uma operação de coleta move os objetos vivos para o outro semi-espaço. Objetos que já foram movidos uma vez são promovidos para a geração velha e considerados de longa duração. Assim que os objetos vivos são movidos, o novo semi-espaço torna-se ativo e quaisquer objetos mortos restantes no antigo semi-espaço são descartados.

A duração de uma coleta na geração jovem depende do tamanho dos objetos vivos na geração jovem. Uma coleta será rápida (&lt;1 ms) quando a maioria dos objetos se torna inalcançável na geração jovem. No entanto, se a maioria dos objetos sobreviver a uma coleta, a duração da coleta pode ser significativamente maior.

Uma coleta maior de todo o heap é realizada quando o tamanho dos objetos vivos na geração velha ultrapassa um limite heurístico. A geração velha usa um coletor [marcar-e-varrer](http://www.memorymanagement.org/glossary/m.html#term-mark-sweep) com várias otimizações para melhorar a latência e o consumo de memória. A latência de marcação depende do número de objetos vivos que precisam ser marcados, com a marcação de todo o heap potencialmente levando mais de 100 ms para grandes aplicativos web. Para evitar pausar a thread principal por períodos tão longos, o V8 há muito tempo possui a capacidade de [marcar incrementalmente os objetos vivos em várias etapas pequenas](https://blog.chromium.org/2011/11/game-changer-for-interactive.html), com o objetivo de manter cada etapa de marcação abaixo de 5 ms.

Após a marcação, a memória livre é disponibilizada novamente para o aplicativo varrendo toda a memória da geração velha. Essa tarefa é realizada simultaneamente por threads dedicadas à varredura. Por fim, a compactação de memória é realizada para reduzir a fragmentação de memória na geração velha. Essa tarefa pode ser muito demorada e só é realizada se a fragmentação da memória for um problema.

Resumindo, há quatro principais tarefas de coleta de lixo:

1. Coletas da geração jovem, que geralmente são rápidas
2. Etapas de marcação realizadas pelo marcador incremental, que podem ser arbitrariamente longas dependendo do tamanho da etapa
3. Coletas de lixo completas, que podem levar muito tempo
4. Coletas de lixo completas com compactação agressiva de memória, que podem levar muito tempo, mas limpam a memória fragmentada

Para realizar essas operações em períodos de inatividade, o V8 publica tarefas de coleta de lixo nos momentos ociosos para o agendador. Quando essas tarefas ociosas são executadas, elas recebem um prazo para conclusão. O manipulador de tempo ocioso da coleta de lixo do V8 avalia quais tarefas de coleta de lixo devem ser realizadas para reduzir o consumo de memória, respeitando o prazo para evitar interrupções futuras na renderização de quadros ou na latência de entrada.

O coletor de lixo realizará uma coleta na geração jovem durante uma tarefa ociosa se a taxa de alocação medida do aplicativo mostrar que a geração jovem pode estar cheia antes do próximo período ocioso esperado. Além disso, calcula o tempo médio levado pelas tarefas recentes de coleta para prever a duração das coletas futuras e garantir que não violem os prazos das tarefas ociosas.

Quando o tamanho dos objetos vivos na geração velha está próximo ao limite do heap, a marcação incremental é iniciada. As etapas de marcação incremental podem ser escalonadas linearmente pelo número de bytes que precisam ser marcados. Com base na velocidade média de marcação medida, o manipulador de tempo ocioso da coleta de lixo tenta encaixar o máximo de trabalho de marcação possível em uma tarefa ociosa determinada.

Uma coleta de lixo completa é agendada durante tarefas ociosas se a geração velha estiver quase cheia e se o prazo fornecido para a tarefa for estimado como suficientemente longo para concluir a coleta. O tempo de pausa da coleta é previsto com base na velocidade de marcação multiplicada pelo número de objetos alocados. Coletas de lixo completas com compactação adicional são realizadas apenas se a página da web estiver inativa por um tempo significativo.

## Avaliação de desempenho

Para avaliar o impacto de executar a coleta de lixo durante o tempo ocioso, usamos o [framework de benchmarking de desempenho Telemetry](https://www.chromium.org/developers/telemetry) do Chrome para avaliar quão suavemente os sites populares rolam enquanto carregam. Testamos os [25 principais sites](https://code.google.com/p/chromium/codesearch#chromium/src/tools/perf/benchmarks/smoothness.py&l=15) em uma estação de trabalho Linux, bem como [sites móveis típicos](https://code.google.com/p/chromium/codesearch#chromium/src/tools/perf/benchmarks/smoothness.py&l=104) em um smartphone Android Nexus 6. Ambos abrem páginas populares (incluindo aplicativos web complexos, como Gmail, Google Docs e YouTube) e rolam seu conteúdo por alguns segundos. O Chrome visa manter uma rolagem a 60 FPS para uma experiência do usuário fluida.

A Figura 2 mostra a porcentagem de coleta de lixo que foi agendada durante o tempo ocioso. O hardware mais rápido da estação de trabalho resulta em mais tempo ocioso geral em comparação com o Nexus 6, permitindo que uma porcentagem maior da coleta de lixo seja agendada durante esse tempo ocioso (43% em comparação com 31% no Nexus 6), resultando em cerca de 7% de melhoria na nossa [métrica de interrupção](https://www.chromium.org/developers/design-documents/rendering-benchmarks).

![Figura 2: A porcentagem de coleta de lixo que ocorre durante o tempo ocioso](/_img/free-garbage-collection/idle-time-gc.png)

Além de melhorar a suavidade da renderização da página, esses períodos de inatividade também oferecem uma oportunidade de realizar uma coleta de lixo mais agressiva quando a página se torna totalmente inativa. As melhorias recentes no Chrome 45 aproveitam isso para reduzir drasticamente a quantidade de memória consumida por abas ativas em segundo plano. A Figura 3 mostra uma prévia de como o uso de memória do heap de JavaScript do Gmail pode ser reduzido em cerca de 45% quando se torna inativo, comparado à mesma página no Chrome 43.

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/ij-AFUfqFdI" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>Figura 3: Uso de memória do Gmail na versão mais recente do Chrome 45 (esquerda) vs. Chrome 43</figcaption>
</figure>

Essas melhorias demonstram que é possível ocultar as pausas de coleta de lixo sendo mais inteligente sobre quando as operações caras de coleta de lixo são realizadas. Os desenvolvedores web não precisam mais temer a pausa da coleta de lixo, mesmo ao visar animações perfeitamente suaves de 60 FPS. Fique atento para mais melhorias enquanto impulsionamos os limites do agendamento de coleta de lixo.
