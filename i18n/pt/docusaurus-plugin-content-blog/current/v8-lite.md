---
title: 'Um V8 mais leve'
author: 'Mythri Alle, Dan Elphick, e [Ross McIlroy](https://twitter.com/rossmcilroy), observadores de peso do V8'
avatars:
  - 'mythri-alle'
  - 'dan-elphick'
  - 'ross-mcilroy'
date: 2019-09-12 12:44:37
tags:
  - internos
  - memória
  - apresentações
description: 'O projeto V8 Lite reduziu drasticamente o consumo de memória do V8 em sites típicos, veja como fizemos isso.'
tweet: '1172155403343298561'
---
No final de 2018, começamos um projeto chamado V8 Lite, com o objetivo de reduzir drasticamente o uso de memória do V8. Inicialmente, este projeto foi concebido como um modo *Lite* separado do V8, focado especificamente em dispositivos móveis com pouca memória ou em cenários de uso que priorizam uma menor utilização de memória em vez da velocidade de execução. No entanto, durante o desenvolvimento, percebemos que muitas das otimizações de memória feitas para este modo *Lite* poderiam ser implementadas no V8 regular, beneficiando todos os seus usuários.

<!--truncate-->
Neste post, destacamos algumas das principais otimizações que desenvolvemos e as economias de memória que elas proporcionaram em cargas de trabalho reais.

:::note
**Nota:** Se você prefere assistir a uma apresentação em vez de ler artigos, aproveite o vídeo abaixo! Caso contrário, pule o vídeo e continue lendo.
:::

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/56ogP8-eRqA" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=56ogP8-eRqA">“V8 Lite ⁠— reduzindo a memória do JavaScript”</a> apresentado por Ross McIlroy no BlinkOn 10.</figcaption>
</figure>

## Modo Lite

Para otimizar o uso de memória do V8, primeiro precisávamos entender como a memória é usada pelo V8 e quais tipos de objetos contribuem para uma grande parte do tamanho do heap do V8. Usamos as ferramentas de [visualização de memória](/blog/optimizing-v8-memory#memory-visualization) do V8 para rastrear a composição do heap em várias páginas da web típicas.

<figure>
  <img src="/_img/v8-lite/memory-categorization.svg" width="950" height="440" alt="" loading="lazy"/>
  <figcaption>Porcentagem do heap do V8 usada por diferentes tipos de objetos ao carregar o Times of India.</figcaption>
</figure>

Ao fazer isso, determinamos que uma parte significativa do heap do V8 estava dedicada a objetos que não são essenciais para a execução do JavaScript, mas são usados para otimizar a execução do JavaScript e lidar com situações excepcionais. Exemplos incluem: código otimizado; feedback de tipo usado para determinar como otimizar o código; metadados redundantes para vinculações entre objetos C++ e JavaScript; metadados necessários apenas em circunstâncias excepcionais, como simbolização de rastreamento de pilha; e bytecode de funções que são executadas apenas algumas vezes durante o carregamento da página.

Como resultado disso, começamos a trabalhar em um modo *Lite* do V8 que troca a velocidade de execução do JavaScript por melhorias na economia de memória, reduzindo drasticamente a alocação desses objetos opcionais.

![](/_img/v8-lite/v8-lite.png)

Muitas das mudanças do modo *Lite* puderam ser feitas configurando as configurações existentes do V8, por exemplo, desabilitando o compilador TurboFan do V8. No entanto, outras mudanças exigiram alterações mais complexas no V8.

Em particular, decidimos que, como o modo *Lite* não otimiza o código, poderíamos evitar a coleta de feedback de tipo necessário para o compilador de otimização. Ao executar código no interpretador Ignition, o V8 coleta feedback sobre os tipos de operandos que são passados para várias operações (por exemplo, `+` ou `o.foo`), a fim de adaptar a otimização posterior a esses tipos. Essas informações são armazenadas em *vetores de feedback* que contribuem significativamente para o uso de memória do heap do V8. O modo *Lite* poderia evitar a alocação desses vetores de feedback, no entanto, o interpretador e partes da infraestrutura de cache inline do V8 esperavam que eles estivessem disponíveis, exigindo consideráveis refatorações para suportar essa execução sem feedback.

O modo *Lite* foi lançado no V8 v7.3 e proporciona uma redução de 22% no tamanho típico do heap de páginas da web em comparação com o V8 v7.1, desabilitando a otimização de código, não alocando vetores de feedback e realizando envelhecimento de bytecode raramente executado (descrito abaixo). Este é um ótimo resultado para aplicações que desejam explicitamente trocar desempenho por melhor uso de memória. Contudo, durante esse trabalho percebemos que poderíamos alcançar a maior parte das economias de memória do modo *Lite* sem nenhum impacto no desempenho, tornando o V8 mais preguiçoso.

## Alocação preguiçosa de feedback

Desativar completamente a alocação do vetor de feedback não apenas impede a otimização de código pelo compilador TurboFan do V8, mas também impede que o V8 realize [caching inline](https://mathiasbynens.be/notes/shapes-ics#ics) de operações comuns, como carregamentos de propriedades de objetos no interpretador Ignition. Como resultado, isso causou uma regressão significativa no tempo de execução do V8, reduzindo o tempo de carregamento de página em 12% e aumentando o tempo de CPU utilizado pelo V8 em 120% em cenários típicos de páginas web interativas.

Para trazer a maioria dessas economias ao V8 regular sem essas regressões, movemos para uma abordagem onde alocamos vetores de feedback de maneira preguiçosa após a função ter executado uma certa quantidade de bytecode (atualmente 1KB). Como a maioria das funções não são executadas com frequência, evitamos a alocação de vetores de feedback na maioria dos casos, mas rapidamente as alocamos quando necessário para evitar regressões de desempenho e ainda permitir que o código seja otimizado.

Uma complicação adicional com essa abordagem está relacionada ao fato de que os vetores de feedback formam uma árvore, com os vetores de feedback para funções internas sendo mantidos como entradas no vetor de feedback de suas funções externas. Isso é necessário para que novos closures de função criados recebam o mesmo array de vetor de feedback que todos os outros closures criados para a mesma função. Com a alocação preguiçosa de vetores de feedback, não podemos formar essa árvore usando vetores de feedback, pois não há garantia de que uma função externa terá alocado seu vetor de feedback quando uma função interna o fizer. Para lidar com isso, criamos um novo `ClosureFeedbackCellArray` para manter essa árvore, então substituímos o `ClosureFeedbackCellArray` de uma função por um `FeedbackVector` completo quando ela se torna quente.

![Árvores de vetores de feedback antes e depois da alocação preguiçosa de feedback.](/_img/v8-lite/lazy-feedback.svg)

Nossos experimentos laboratoriais e a telemetria em campo não mostraram regressões de desempenho para feedback preguiçoso em desktops, e em plataformas móveis vimos, na verdade, uma melhoria de desempenho em dispositivos de baixo custo devido à redução na coleta de lixo. Como tal, habilitamos a alocação preguiçosa de feedback em todas as compilações do V8, incluindo o *modo Lite*, onde a leve regressão na memória em comparação com nossa abordagem original de alocação sem feedback é mais do que compensada pela melhoria no desempenho no mundo real.

## Posições de origem preguiçosas

Ao compilar bytecode a partir do JavaScript, são geradas tabelas de posições de origem que vinculam sequências de bytecode a posições de caracteres dentro do código fonte em JavaScript. No entanto, essas informações só são necessárias ao simbolizar exceções ou realizar tarefas de desenvolvedor como depuração, e portanto raramente são utilizadas.

Para evitar esse desperdício, agora compilamos bytecode sem coletar posições de origem (supondo que nenhum depurador ou profiler esteja anexado). As posições de origem são coletadas somente quando uma rastreamento de pilha é realmente gerado, por exemplo ao chamar `Error.stack` ou imprimir a rastreamento de pilha de uma exceção no console. Isso tem um custo, já que gerar posições de origem requer que a função seja novamente analisada e compilada, no entanto, a maioria dos sites não simbolizam rastreamentos de pilha em produção e, portanto, não veem nenhum impacto de desempenho observável.

Um problema que tivemos que enfrentar com este trabalho foi exigir uma geração repetível de bytecode, o que anteriormente não havia sido garantido. Se o V8 gerar bytecode diferente ao coletar posições de origem em comparação ao código original, as posições de origem não se alinham e os rastreamentos de pilha podem apontar para a posição errada no código fonte.

Em certas circunstâncias, o V8 podia gerar bytecode diferente dependendo se uma função era [compilada avidamente ou preguiçosamente](/blog/preparser#skipping-inner-functions), devido à perda de algumas informações do parser entre a análise inicial ávida de uma função e a compilação preguiçosa posterior. Esses desacordos eram principalmente benignos, por exemplo, perder o rastreamento do fato de que uma variável é imutável e, portanto, não poder otimizá-la como tal. No entanto, alguns dos desacordos descobertos por este trabalho tinham o potencial de causar execução de código incorreta em certas circunstâncias. Como resultado, corrigimos esses desacordos e adicionamos verificações e um modo de teste para garantir que a compilação ávida e preguiçosa de uma função sempre produza resultados consistentes, dando-nos maior confiança na correção e consistência do parser e do pré-parser do V8.

## Liberação de bytecode

Bytecode compilado a partir do código fonte de JavaScript ocupa uma parte significativa do espaço de heap do V8, normalmente cerca de 15%, incluindo metadados relacionados. Existem muitas funções que são executadas apenas durante a inicialização ou raramente são usadas após terem sido compiladas.

Como resultado, adicionamos suporte para liberar bytecode compilado de funções durante a coleta de lixo, caso não tenham sido executados recentemente. Para fazer isso, rastreamos a *idade* do bytecode de uma função, incrementando a *idade* a cada coleta de lixo [principal (marcar-compactar)](/blog/trash-talk#major-gc), e redefinindo-a para zero quando a função é executada. Qualquer bytecode que ultrapasse um limite de envelhecimento é elegível para ser coletado na próxima coleta de lixo. Se for coletado e depois executado novamente, ele é recompilado.

Houve desafios técnicos para garantir que o bytecode seja esvaziado apenas quando não for mais necessário. Por exemplo, se a função `A` chama outra função de longa duração `B`, a função `A` pode envelhecer enquanto ainda está na pilha. Não queremos esvaziar o bytecode da função `A` mesmo que ela alcance seu limite de envelhecimento, pois precisamos retornar a ela quando a função de longa duração `B` retornar. Assim, tratamos o bytecode como sendo mantido fracamente pela função quando atinge seu limite de envelhecimento, mas mantido fortemente por quaisquer referências a ele na pilha ou em outro lugar. Só esvaziamos o código quando não há links fortes restantes.

Além de esvaziar o bytecode, também esvaziamos os vetores de feedback associados a essas funções esvaziadas. No entanto, não podemos esvaziar os vetores de feedback durante o mesmo ciclo de GC que o bytecode, porque eles não são retidos pelo mesmo objeto - o bytecode é mantido por um `SharedFunctionInfo` independente do contexto nativo, enquanto o vetor de feedback é retido pelo `JSFunction`, que depende do contexto nativo. Como resultado, esvaziamos os vetores de feedback no ciclo de GC subsequente.

![A estrutura de objetos para uma função envelhecida após dois ciclos de GC.](/_img/v8-lite/bytecode-flushing.svg)

## Otimizações adicionais

Além desses projetos maiores, também identificamos e abordamos algumas ineficiências.

A primeira foi reduzir o tamanho dos objetos `FunctionTemplateInfo`. Esses objetos armazenam metadados internos sobre [`FunctionTemplate`s](/docs/embed#templates), que são usados para permitir que integradores, como o Chrome, forneçam implementações de retorno de chamada em C++ para funções que podem ser chamadas por código JavaScript. O Chrome introduz muitos `FunctionTemplates` para implementar APIs DOM Web, e portanto, os objetos `FunctionTemplateInfo` contribuíam para o tamanho do heap do V8. Após analisar o uso típico de `FunctionTemplates`, descobrimos que, dos onze campos em um objeto `FunctionTemplateInfo`, apenas três geralmente eram configurados com um valor não padrão. Portanto, dividimos o objeto `FunctionTemplateInfo` de forma que os campos raros sejam armazenados em uma tabela lateral que só é alocada sob demanda, se necessário.

A segunda otimização está relacionada à forma como desotimizamos a partir do código otimizado TurboFan. Como o TurboFan realiza otimizações especulativas, ele pode precisar reverter para o interpretador (desotimização) se certas condições não forem mais válidas. Cada ponto de desotimização tem um ID que permite ao tempo de execução determinar onde no bytecode deve retornar a execução no interpretador. Anteriormente, esse ID era calculado fazendo o código otimizado saltar para um deslocamento específico dentro de uma grande tabela de saltos, que carregava o ID correto em um registrador e então saltava para o tempo de execução para realizar a desotimização. Isso tinha a vantagem de exigir apenas uma instrução de salto no código otimizado para cada ponto de desotimização. No entanto, a tabela de saltos de desotimização era pré-alocada e tinha que ser grande o suficiente para suportar todo o intervalo de IDs de desotimização. Modificamos o TurboFan para que os pontos de desotimização no código otimizado carreguem o ID de desotimização diretamente antes de chamar o tempo de execução. Isso nos permitiu remover completamente essa grande tabela de saltos, ao custo de um leve aumento no tamanho do código otimizado.

## Resultados

Lançamos as otimizações descritas acima ao longo das últimas sete versões do V8. Normalmente elas foram introduzidas primeiro em *modo Lite* e, posteriormente, foram incorporadas à configuração padrão do V8.

![Tamanho médio do heap do V8 para um conjunto de páginas típicas da web em um dispositivo AndroidGo.](/_img/v8-lite/savings-by-release.svg)

![Desglose por página das economias de memória do V8 v7.8 (Chrome 78) em comparação com o v7.1 (Chrome 71).](/_img/v8-lite/breakdown-by-page.svg)

Ao longo desse período, reduzimos o tamanho do heap do V8 em uma média de 18% em uma variedade de sites típicos, o que corresponde a uma diminuição média de 1,5 MB para dispositivos móveis AndroidGo de baixo custo. Isso foi possível sem qualquer impacto significativo na performance do JavaScript, seja em benchmarks ou medido em interações reais com páginas da web.

O *modo Lite* pode fornecer ainda mais economias de memória, com algum custo para o desempenho da execução do JavaScript, ao desativar a otimização de funções. Em média, o *modo Lite* fornece 22% de economia de memória, com algumas páginas alcançando reduções de até 32%. Isso corresponde a uma redução de 1,8 MB no tamanho do heap do V8 em um dispositivo AndroidGo.

![Desglose das economias de memória do V8 v7.8 (Chrome 78) em comparação com o v7.1 (Chrome 71).](/_img/v8-lite/breakdown-by-optimization.svg)

Quando dividimos pelo impacto de cada otimização individual, fica claro que páginas diferentes derivam proporções distintas de seus benefícios de cada uma dessas otimizações. No futuro, continuaremos a identificar potenciais otimizações que podem reduzir ainda mais o uso de memória do V8, mantendo a execução de JavaScript extremamente rápida.
