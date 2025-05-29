---
title: 'Trash talk: o coletor de lixo Orinoco'
author: 'Peter ‘o garbo’ Marshall ([@hooraybuffer](https://twitter.com/hooraybuffer))'
avatars:
  - 'peter-marshall'
date: 2019-01-03 17:45:34
tags:
  - internals
  - memória
  - apresentações
description: 'Orinoco, o coletor de lixo do V8, evoluiu de uma implementação sequencial de pausa total para um coletor em grande parte paralelo e concorrente com fallback incremental.'
tweet: '1080867305532416000'
---
Ao longo dos últimos anos, o coletor de lixo (GC) do V8 mudou bastante. O projeto Orinoco transformou um coletor de lixo sequencial e de pausa total em um coletor em grande parte paralelo e concorrente com fallback incremental.

<!--truncate-->
:::note
**Nota:** Se você prefere assistir a uma apresentação em vez de ler artigos, aproveite o vídeo abaixo! Caso contrário, pule o vídeo e continue lendo.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/Scxz6jVS4Ls" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

Todo coletor de lixo tem algumas tarefas essenciais que precisa realizar periodicamente:

1. Identificar objetos vivos/mortos
1. Reciclar/reutilizar a memória ocupada por objetos mortos
1. Compactar/desfragmentar a memória (opcional)

Essas tarefas podem ser realizadas em sequência ou intercaladas arbitrariamente. Uma abordagem direta é pausar a execução do JavaScript e realizar cada uma dessas tarefas em sequência na thread principal. Isso pode causar problemas de travamento e latência na thread principal, dos quais já falamos em [posts anteriores](/blog/jank-busters) [no blog](/blog/orinoco), além de reduzir a taxa de transferência do programa.

## GC Principal (Marcação-Compactação Completa)

O GC principal coleta lixo de todo o heap.

![GC principal ocorre em três fases: marcação, varredura e compactação.](/_img/trash-talk/01.svg)

### Marcação

Descobrir quais objetos podem ser coletados é uma parte essencial da coleta de lixo. Coletores de lixo fazem isso usando a acessibilidade como um proxy para 'vivacidade'. Isso significa que qualquer objeto atualmente acessível dentro do runtime deve ser mantido, e objetos inacessíveis podem ser coletados.

A marcação é o processo pelo qual objetos acessíveis são encontrados. O GC começa em um conjunto de ponteiros de objetos conhecidos, chamado 'conjunto de raízes'. Isso inclui a pilha de execução e o objeto global. Ele então segue cada ponteiro para um objeto JavaScript e marca esse objeto como acessível. O GC segue todos os ponteiros dentro desse objeto e continua esse processo recursivamente até que todos os objetos acessíveis no runtime tenham sido encontrados e marcados.

### Varredura

A varredura é um processo onde lacunas na memória deixadas por objetos mortos são adicionadas a uma estrutura de dados chamada lista livre. Uma vez que a marcação foi concluída, o GC encontra lacunas contíguas deixadas por objetos inacessíveis e as adiciona à lista livre apropriada. As listas livres são separadas pelo tamanho do pedaço de memória para busca rápida. No futuro, quando quisermos alocar memória, apenas olhamos para a lista livre e encontramos um pedaço de memória de tamanho apropriado.

### Compactação

O GC principal também escolhe evacuar/compactar algumas páginas, com base em uma heurística de fragmentação. Você pode pensar na compactação como uma espécie de desfragmentação de disco rígido em um PC antigo. Copiamos objetos sobreviventes para outras páginas que não estão sendo compactadas atualmente (usando a lista livre para essa página). Dessa forma, podemos aproveitar as pequenas e dispersas lacunas dentro da memória deixadas por objetos mortos.

Uma possível fraqueza de um coletor de lixo que copia objetos sobreviventes é que, quando alocamos muitos objetos de longa duração, pagamos um custo alto para copiar esses objetos. É por isso que escolhemos compactar apenas algumas páginas altamente fragmentadas e apenas realizar varredura em outras, sem copiar objetos sobreviventes.

## Layout geracional

O heap no V8 é dividido em diferentes regiões chamadas [gerações](/blog/orinoco-parallel-scavenger). Há uma geração jovem (dividida ainda em subgerações 'berçário' e 'intermediária') e uma geração antiga. Os objetos são alocados primeiro no berçário. Se sobreviverem ao próximo GC, permanecem na geração jovem, mas são considerados 'intermediários'. Se sobreviverem a outro GC, são movidos para a geração antiga.

![O heap do V8 é dividido em gerações. Objetos são movidos entre gerações quando sobrevivem a um GC.](/_img/trash-talk/02.svg)

Na coleta de lixo, há um termo importante: 'A Hipótese Geracional'. Isso basicamente afirma que a maioria dos objetos morre jovem. Em outras palavras, a maioria dos objetos é alocada e quase imediatamente se torna inacessível, do ponto de vista do GC. Isso não é válido apenas para V8 ou JavaScript, mas para a maioria das linguagens dinâmicas.

O layout de heap generacional do V8 foi projetado para explorar esse fato sobre o tempo de vida dos objetos. O GC é um GC compactador/mover, o que significa que ele copia objetos que sobrevivem à coleta de lixo. Isso pode parecer contraintuitivo: copiar objetos é caro no momento do GC. Mas sabemos que apenas uma porcentagem muito pequena dos objetos realmente sobrevive a uma coleta de lixo, de acordo com a hipótese geracional. Movendo apenas os objetos que sobrevivem, toda alocação restante se torna lixo 'implícito'. Isso significa que pagamos um custo (pela cópia) proporcional ao número de objetos sobreviventes, não ao número de alocações.

## GC Menor (Scavenger)

Existem dois coletores de lixo no V8. O [**GC Maior (Mark-Compact)**](#major-gc) coleta lixo de todo o heap. O **GC Menor (Scavenger)** coleta lixo na geração jovem. O GC maior é eficaz para coletar lixo de todo o heap, mas a hipótese geracional nos diz que objetos recém-alocados têm uma grande probabilidade de precisar de coleta de lixo.

No Scavenger, que coleta apenas dentro da geração jovem, os objetos sobreviventes são sempre evacuados para uma nova página. O V8 usa um design de ‘semi-espaço’ para a geração jovem. Isso significa que metade do espaço total está sempre vazia, para permitir esta etapa de evacuação. Durante uma coleta, essa área inicialmente vazia é chamada de ‘Espaço-Para’. A área de onde copiamos é chamada de ‘Espaço-De’. No pior dos casos, todos os objetos poderiam sobreviver à coleta, e precisaríamos copiar cada objeto.

Para a coleta, temos um conjunto adicional de raízes, que são as referências de velho-para-novo. Estas são ponteiros no espaço antigo que referem-se a objetos na geração jovem. Em vez de rastrear todo o gráfico do heap para cada coleta, usamos [barreiras de escrita](https://www.memorymanagement.org/glossary/w.html#term-write-barrier) para manter uma lista de referências de velho-para-novo. Quando combinado com a pilha e globais, conhecemos toda referência à geração jovem, sem a necessidade de rastrear toda a geração velha.

A etapa de evacuação move todos os objetos sobreviventes para um pedaço contíguo de memória (dentro de uma página). Isso tem a vantagem de remover completamente a fragmentação - lacunas deixadas por objetos mortos. Em seguida, trocamos os dois espaços, ou seja, Espaço-Para torna-se Espaço-De e vice-versa. Uma vez que o GC é concluído, novas alocações ocorrem no próximo endereço livre no Espaço-De.

![O Scavenger evacua objetos vivos para uma nova página.](/_img/trash-talk/03.svg)

Rapidamente ficamos sem espaço na geração jovem apenas com esta estratégia. Objetos que sobrevivem a um segundo GC são evacuados para a geração velha, em vez de para o Espaço-Para.

A etapa final da coleta é atualizar os ponteiros que referenciam os objetos originais, que foram movidos. Cada objeto copiado deixa um endereço de encaminhamento que é usado para atualizar o ponteiro original para apontar para a nova localização.

![O Scavenger evacua objetos ‘intermediários’ para a geração velha e objetos ‘de berçário’ para uma nova página.](/_img/trash-talk/04.svg)

Na coleta, na verdade fazemos estas três etapas — marcação, evacuação e atualização de ponteiros — todas intercaladas, em vez de em fases distintas.

## Orinoco

A maioria desses algoritmos e otimizações são comuns na literatura sobre coleta de lixo e podem ser encontrados em muitas linguagens com coleta de lixo. Mas a coleta de lixo de ponta percorreu um longo caminho. Uma métrica importante para medir o tempo gasto na coleta de lixo é a quantidade de tempo que a thread principal passa pausada enquanto o GC é executado. Para coletores de lixo tradicionais ‘stop-the-world’, esse tempo pode realmente se acumular, e o tempo gasto com o GC prejudica diretamente a experiência do usuário na forma de páginas instáveis e baixa renderização e latência.

<figure>
  <img src="/_img/v8-orinoco.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logotipo do Orinoco, o coletor de lixo do V8</figcaption>
</figure>

Orinoco é o codinome do projeto GC para usar as mais recentes e avançadas técnicas paralelas, incrementais e concorrentes para coleta de lixo, a fim de liberar a thread principal. Existem alguns termos aqui que têm um significado específico no contexto do GC, e vale a pena defini-los em detalhe.

### Paralelo

Paralelo é quando a thread principal e as threads auxiliares realizam uma quantidade aproximadamente igual de trabalho ao mesmo tempo. Esta ainda é uma abordagem ‘stop-the-world’, mas o tempo total de pausa agora é dividido pelo número de threads participantes (mais algum overhead para sincronização). Esta é a mais fácil das três técnicas. O heap do JavaScript está pausado, pois não há JavaScript sendo executado, então cada thread auxiliar só precisa garantir que sincroniza o acesso a quaisquer objetos que outra thread auxiliar também possa querer acessar.

![A thread principal e as threads auxiliares trabalham na mesma tarefa ao mesmo tempo.](/_img/trash-talk/05.svg)

### Incremental

Incremental é quando a thread principal realiza pequenas quantidades de trabalho de forma intermitente. Não realizamos uma coleta de lixo inteira em uma pausa incremental, apenas uma pequena parte do trabalho total necessário para a coleta de lixo. Isso é mais difícil, porque o JavaScript é executado entre cada segmento de trabalho incremental, o que significa que o estado do heap mudou, podendo invalidar o trabalho anterior que foi feito de forma incremental. Como você pode ver no diagrama, isso não reduz o tempo gasto na thread principal (na verdade, geralmente aumenta um pouco), apenas o distribui ao longo do tempo. Ainda assim, essa é uma boa técnica para resolver um dos nossos problemas originais: a latência na thread principal. Ao permitir que o JavaScript seja executado intermitentemente, mas também continuar as tarefas de coleta de lixo, o aplicativo ainda pode responder às entradas do usuário e avançar na animação.

![Pequenos pedaços da tarefa de coleta de lixo são intercalados na execução da thread principal.](/_img/trash-talk/06.svg)

### Concorrente

Concorrente é quando a thread principal executa JavaScript constantemente, e threads auxiliares realizam o trabalho de coleta de lixo totalmente em segundo plano. Esta é a mais difícil das três técnicas: qualquer coisa no heap do JavaScript pode mudar a qualquer momento, invalidando o trabalho que fizemos anteriormente. Além disso, agora existem disputas de leitura/escrita para se preocupar, pois as threads auxiliares e a thread principal lêem ou modificam os mesmos objetos simultaneamente. A vantagem aqui é que a thread principal tem total liberdade para executar JavaScript — embora haja uma pequena sobrecarga devido a alguma sincronização com as threads auxiliares.

![As tarefas de coleta de lixo acontecem totalmente em segundo plano. A thread principal está livre para executar JavaScript.](/_img/trash-talk/07.svg)

## Estado da Coleta de Lixo no V8

### Scavenging

Hoje, o V8 usa o scavenging paralelo para distribuir trabalho entre threads auxiliares durante a coleta de lixo da geração jovem. Cada thread recebe um número de ponteiros, que ela segue, evacuando imediatamente quaisquer objetos vivos para o To-Space. As tarefas de scavenging precisam se sincronizar por meio de operações atômicas de leitura/escrita/comparação-e-troca ao tentar evacuar um objeto; outra tarefa de scavenging pode ter encontrado o mesmo objeto por um caminho diferente e também tentado movê-lo. Qualquer que seja a thread auxiliar que moveu o objeto com sucesso, então retorna e atualiza o ponteiro. Ele deixa um ponteiro de encaminhamento para que outros trabalhadores que alcancem o objeto possam atualizar outros ponteiros conforme os encontrarem. Para uma alocação rápida e sem sincronização de objetos sobreviventes, as tarefas de scavenging usam buffers de alocação locais à thread.

![O scavenging paralelo distribui o trabalho de scavenging entre várias threads auxiliares e a thread principal.](/_img/trash-talk/08.svg)

### Major GC

O Major GC no V8 começa com a marcação concorrente. À medida que o heap se aproxima de um limite calculado dinamicamente, as tarefas de marcação concorrente são iniciadas. As threads auxiliares recebem um número de ponteiros para seguir, e marcam cada objeto que encontram enquanto seguem todas as referências de objetos descobertos. A marcação concorrente acontece totalmente em segundo plano enquanto o JavaScript é executado na thread principal. [Barreiras de escrita](https://dl.acm.org/citation.cfm?id=2025255) são usadas para rastrear novas referências entre objetos que o JavaScript cria enquanto as threads auxiliares estão marcando de forma concorrente.

![O major GC usa marcação e varredura concorrentes, e compactação e atualização de ponteiros em paralelo.](/_img/trash-talk/09.svg)

Quando a marcação concorrente é concluída, ou atingimos o limite de alocação dinâmica, a thread principal realiza uma etapa rápida de finalização da marcação. A pausa da thread principal começa nesta fase. Isso representa o tempo total de pausa do Major GC. A thread principal verifica novamente as raízes, para garantir que todos os objetos vivos estão marcados, e então, juntamente com várias threads auxiliares, inicia a compactação em paralelo e a atualização de ponteiros. Nem todas as páginas no espaço antigo são elegíveis para compactação — aquelas que não são serão varridas usando as listas livres mencionadas anteriormente. A thread principal inicia tarefas de varredura concorrente durante a pausa. Estas tarefas são executadas de forma concorrente com as tarefas de compactação em paralelo e com a própria thread principal — elas podem continuar mesmo quando o JavaScript está sendo executado na thread principal.

## Coleta de Lixo em Tempo Ocioso

Os utilizadores de JavaScript não têm acesso direto ao coletor de lixo; ele é totalmente definido pela implementação. No entanto, o V8 fornece um mecanismo para o incorporador acionar a coleta de lixo, mesmo quando o próprio programa JavaScript não pode. O GC pode postar 'Tarefas Ociosas', que são trabalhos opcionais que eventualmente seriam acionados de qualquer maneira. Incorporadores como o Chrome podem ter alguma noção de tempo livre ou ocioso. Por exemplo, no Chrome, a 60 quadros por segundo, o navegador tem aproximadamente 16,6 ms para renderizar cada quadro de uma animação. Se o trabalho de animação for concluído mais cedo, o Chrome pode optar por executar algumas dessas tarefas ociosas que o GC criou no tempo livre antes do próximo quadro.

![O GC em tempo ocioso aproveita o tempo livre na thread principal para realizar o trabalho de GC de forma proativa.](/_img/trash-talk/10.svg)

Para mais detalhes, consulte [nossa publicação aprofundada sobre o GC em tempo ocioso](https://queue.acm.org/detail.cfm?id=2977741).

## Conclusões

O coletor de lixo no V8 percorreu um longo caminho desde sua criação. Adicionar técnicas paralelas, incrementais e concorrentes ao GC existente foi um esforço de vários anos, mas valeu a pena, movendo muito trabalho para as tarefas em segundo plano. Isso melhorou drasticamente os tempos de pausa, a latência e o carregamento de páginas, tornando a animação, a rolagem e a interação do usuário muito mais suaves. O [Scavenger Paralelo](/blog/orinoco-parallel-scavenger) reduziu o tempo total de coleta de lixo da geração jovem na thread principal em cerca de 20%–50%, dependendo da carga de trabalho. O [GC em tempo ocioso](/blog/free-garbage-collection) pode reduzir a memória heap do JavaScript do Gmail em 45% quando está ocioso. A [marcação e varredura concorrentes](/blog/jank-busters) reduziram os tempos de pausa em jogos pesados com WebGL em até 50%.

Mas o trabalho aqui não está terminado. Reduzir os tempos de pausa na coleta de lixo ainda é importante para oferecer aos usuários a melhor experiência na web, e estamos explorando técnicas ainda mais avançadas. Além disso, o Blink (o renderizador no Chrome) também possui um coletor de lixo (chamado Oilpan), e estamos trabalhando para melhorar a [cooperação](https://dl.acm.org/citation.cfm?doid=3288538.3276521) entre os dois coletores e para portar algumas das novas técnicas do Orinoco para o Oilpan.

A maioria dos desenvolvedores não precisa pensar no GC ao desenvolver programas em JavaScript, mas entender alguns dos seus aspectos internos pode ajudar a pensar sobre o uso de memória e padrões úteis de programação. Por exemplo, com a estrutura geracional do heap do V8, objetos de curta duração são, na verdade, muito baratos do ponto de vista do coletor de lixo, já que só pagamos pelos objetos que sobrevivem à coleta. Esses tipos de padrões funcionam bem para muitas linguagens coletadas pelo lixo, não apenas JavaScript.
