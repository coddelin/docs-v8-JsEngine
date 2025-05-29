---
title: "O custo do JavaScript em 2019"
author: "Addy Osmani ([@addyosmani](https://twitter.com/addyosmani)), Faxineiro de JavaScript, e Mathias Bynens ([@mathias](https://twitter.com/mathias)), Libertador da Thread Principal"
avatars: 
  - "addy-osmani"
  - "mathias-bynens"
date: 2019-06-25
tags: 
  - internos
  - análise sintática
description: "Os principais custos do processamento de JavaScript são o tempo de download e de execução de CPU."
tweet: "1143531042361487360"
---
:::note
**Nota:** Se você prefere assistir a uma apresentação em vez de ler artigos, aproveite o vídeo abaixo! Caso contrário, pule o vídeo e continue lendo.
:::

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/X9eRLElSW1c" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=X9eRLElSW1c">“O custo do JavaScript”</a> apresentado por Addy Osmani na Conferência #PerfMatters 2019.</figcaption>
</figure>

<!--truncate-->
Uma grande mudança no [custo do JavaScript](https://medium.com/@addyosmani/the-cost-of-javascript-in-2018-7d8950fbb5d4) nos últimos anos foi a melhoria na velocidade com que os navegadores podem analisar e compilar os scripts. **Em 2019, os custos predominantes do processamento de scripts agora são o download e o tempo de execução da CPU.**

A interação do usuário pode ser atrasada se a thread principal do navegador estiver ocupada executando JavaScript, por isso otimizar os gargalos do tempo de execução de scripts e da rede pode ter impacto significativo.

## Orientação prática de alto nível

O que isso significa para os desenvolvedores web? Os custos de análise e compilação já **não são tão lentos** quanto pensávamos. As três coisas em que focar para pacotes de JavaScript são:

- **Melhorar o tempo de download**
    - Mantenha seus pacotes de JavaScript pequenos, especialmente para dispositivos móveis. Pacotes pequenos melhoram a velocidade de download, reduzem o uso de memória e diminuem os custos de CPU.
    - Evite ter apenas um único pacote grande; se um pacote exceder ~50–100 kB, divida-o em pacotes menores separados. (Com a multiplexação do HTTP/2, várias mensagens de solicitação e resposta podem estar em trânsito ao mesmo tempo, reduzindo a sobrecarga de solicitações adicionais.)
    - Nos dispositivos móveis, envie uma quantidade muito menor, especialmente devido às velocidades de rede e também para manter o uso de memória baixo.
- **Melhorar o tempo de execução**
    - Evite [Tarefas Longas](https://w3c.github.io/longtasks/) que podem manter a thread principal ocupada e atrasar o tempo em que as páginas se tornam interativas. Após o download, o tempo de execução do script agora é um custo predominante.
- **Evite scripts inline grandes** (pois ainda são analisados e compilados na thread principal). Uma boa regra prática é: se o script tiver mais de 1 kB, evite colocá-lo inline (também porque 1 kB é quando o [cache de código](/blog/code-caching-for-devs) entra em ação para scripts externos).

## Por que o tempo de download e execução é importante?

Por que é importante otimizar os tempos de download e execução? Os tempos de download são cruciais para redes de baixo desempenho. Apesar do crescimento do 4G (e até mesmo 5G) ao redor do mundo, nossos [tipos de conexão efetiva](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType) permanecem inconsistentes, com muitos de nós enfrentando velocidades que parecem 3G (ou piores) enquanto estamos em movimento.

O tempo de execução do JavaScript é importante para telefones com CPUs lentas. Devido às diferenças em CPU, GPU e desaceleração térmica, há grandes disparidades entre o desempenho de telefones de alta e baixa qualidade. Isso é relevante para o desempenho do JavaScript, já que a execução depende da CPU.

Na verdade, do tempo total que uma página leva para carregar em um navegador como o Chrome, até 30% desse tempo pode ser gasto na execução de JavaScript. Abaixo está o carregamento de uma página de um site com uma carga de trabalho bastante típica (Reddit.com) em um computador desktop de alto desempenho:

![O processamento de JavaScript representa de 10 a 30% do tempo gasto no V8 durante o carregamento da página.](/_img/cost-of-javascript-2019/reddit-js-processing.svg)

Nos dispositivos móveis, leva 3–4× mais tempo para um telefone mediano (Moto G4) executar o JavaScript do Reddit em comparação com um dispositivo de alta qualidade (Pixel 3), e mais de 6× mais tempo em um dispositivo de baixa qualidade (o &lt;$100 Alcatel 1X):

![O custo do JavaScript do Reddit em algumas classes de dispositivos diferentes (baixa, média e alta qualidade)](/_img/cost-of-javascript-2019/reddit-js-processing-devices.svg)

:::note
**Nota:** O Reddit tem experiências diferentes para desktop e web móvel, então os resultados do MacBook Pro não podem ser comparados aos outros resultados.
:::

Ao tentar otimizar o tempo de execução do JavaScript, fique atento às [Tarefas Longas](https://web.dev/long-tasks-devtools/) que podem estar monopolizando a thread de interface por longos períodos. Estas podem bloquear tarefas críticas de serem executadas, mesmo se a página parecer visualmente pronta. Divida estas tarefas em tarefas menores. Ao dividir o código e priorizar a ordem em que ele é carregado, você pode tornar as páginas interativas mais rapidamente e, com sorte, ter menor latência de entrada.

![Tarefas longas monopolizam a thread principal. Você deve dividi-las.](/_img/cost-of-javascript-2019/long-tasks.png)

## O que o V8 fez para melhorar a análise/compilação?

A velocidade de análise de JavaScript bruto no V8 aumentou 2× desde o Chrome 60. Ao mesmo tempo, o custo bruto de análise (e compilação) tornou-se menos visível/importante devido a outros trabalhos de otimização no Chrome que o paralelizam.

O V8 reduziu a quantidade de trabalho de análise e compilação na thread principal em uma média de 40% (por exemplo, 46% no Facebook, 62% no Pinterest) com a maior melhoria sendo 81% (YouTube), ao analisar e compilar em uma thread de trabalhador. Isso é adicional à análise/compilação por streaming fora da thread principal já existente.

![Tempos de análise do V8 em diferentes versões](/_img/cost-of-javascript-2019/chrome-js-parse-times.svg)

Também podemos visualizar o impacto no tempo de CPU dessas mudanças em diferentes versões do V8 nas versões do Chrome. No mesmo tempo que levou o Chrome 61 para analisar o JS do Facebook, o Chrome 75 agora pode analisar o JS do Facebook e 6 vezes o JS do Twitter.

![No tempo que levou o Chrome 61 para analisar o JS do Facebook, o Chrome 75 agora pode analisar tanto o JS do Facebook quanto 6 vezes o JS do Twitter.](/_img/cost-of-javascript-2019/js-parse-times-websites.svg)

Vamos nos aprofundar em como essas mudanças foram desbloqueadas. Em resumo, recursos de script podem ser analisados e compilados por streaming em uma thread de trabalhador, o que significa:

- O V8 pode analisar+compilar JavaScript sem bloquear a thread principal.
- O streaming começa assim que o parser HTML completo encontra uma tag `<script>`. Para scripts que bloqueiam o parser, o parser HTML é interrompido, enquanto para scripts assíncronos ele continua.
- Para a maioria das velocidades de conexão do mundo real, o V8 analisa mais rápido que o download, então o V8 termina de analisar+compilar alguns milissegundos após os últimos bytes do script serem baixados.

A explicação não tão curta é… Versões muito mais antigas do Chrome baixariam um script inteiro antes de começar a analisá-lo, o que é uma abordagem direta, mas não utiliza totalmente a CPU. Entre as versões 41 e 68, o Chrome começou a analisar scripts assíncronos e adiados em uma thread separada assim que o download começava.

![Os scripts chegam em vários pedaços. O V8 começa o streaming assim que vê pelo menos 30 kB.](/_img/cost-of-javascript-2019/script-streaming-1.svg)

No Chrome 71, movemos para uma configuração baseada em tarefas onde o agendador podia analisar vários scripts assíncronos/adiados de uma vez. O impacto dessa mudança foi uma redução de ~20% no tempo de análise na thread principal, resultando em uma melhoria geral de ~2% no TTI/FID conforme medido em websites reais.

![O Chrome 71 mudou para uma configuração baseada em tarefas onde o agendador podia analisar múltiplos scripts assíncronos/adiados ao mesmo tempo.](/_img/cost-of-javascript-2019/script-streaming-2.svg)

No Chrome 72, passamos a usar o streaming como a principal forma de análise: agora também scripts síncronos regulares são analisados dessa forma (exceto scripts inline). Também paramos de cancelar a análise baseada em tarefas se a thread principal precisar dela, já que isso apenas duplica desnecessariamente qualquer trabalho já realizado.

[Versões anteriores do Chrome](/blog/v8-release-75#script-streaming-directly-from-network) suportavam análise e compilação por streaming onde os dados de fonte do script vindos da rede tinham de passar pela thread principal do Chrome antes de serem encaminhados para o streamer.

Isso muitas vezes resultava no parser de streaming esperando por dados que chegavam da rede, mas ainda não haviam sido encaminhados para a tarefa de streaming porque estavam bloqueados por outros trabalhos na thread principal (como análise de HTML, layout ou execução de JavaScript).

Agora estamos experimentando começar a análise na pré-carga, e o salto na thread principal era um bloqueio para isso antes.

A apresentação de Leszek Swirski no BlinkOn descreve isso com mais detalhes:

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/D1UJgiG4_NI" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=D1UJgiG4_NI">“Analisando JavaScript em tempo zero*”</a> apresentado por Leszek Swirski no BlinkOn 10.</figcaption>
</figure>

## Como essas mudanças refletem o que você vê no DevTools?

Além do mencionado acima, havia [um problema no DevTools](https://bugs.chromium.org/p/chromium/issues/detail?id=939275) que renderizava toda a tarefa do parser de uma forma que dá a entender que está usando CPU (bloqueio total). No entanto, o parser bloqueia sempre que está sem dados (que precisam passar pela thread principal). Desde que mudamos de uma única thread de streaming para tarefas de streaming, isso se tornou realmente óbvio. Veja o que você costumava ver no Chrome 69:

![O problema do DevTools que renderizava toda a tarefa do parser de uma forma que sugere que está usando CPU (bloqueio total)](/_img/cost-of-javascript-2019/devtools-69.png)

A tarefa 'analisar script' mostra levar 1,08 segundos. No entanto, analisar JavaScript não é realmente tão lento! A maior parte desse tempo é gasto sem fazer nada, apenas aguardando os dados passarem pelo thread principal.

O Chrome 76 pinta um quadro diferente:

![No Chrome 76, a análise é dividida em várias tarefas menores de transmissão.](/_img/cost-of-javascript-2019/devtools-76.png)

Em geral, o painel de desempenho do DevTools é ótimo para obter uma visão geral de alto nível do que está acontecendo na sua página. Para métricas específicas do V8 detalhadas, como tempos de análise e compilação de JavaScript, recomendamos [usar o Chrome Tracing com Runtime Call Stats (RCS)](/docs/rcs). Nos resultados do RCS, `Parse-Background` e `Compile-Background` mostram quanto tempo foi gasto analisando e compilando JavaScript fora do thread principal, enquanto `Parse` e `Compile` capturam as métricas do thread principal.

![](/_img/cost-of-javascript-2019/rcs.png)

## Qual é o impacto no mundo real dessas mudanças?

Vamos analisar alguns exemplos de sites do mundo real e como o streaming de script se aplica.

![Tempo gasto no thread principal vs. thread em segundo plano para analisar e compilar o JS do Reddit em um MacBook Pro](/_img/cost-of-javascript-2019/reddit-main-thread.svg)

Reddit.com tem vários pacotes de mais de 100 kB que são envolvidos em funções externas, causando muita [compilação preguiçosa](/blog/preparser) no thread principal. No gráfico acima, o tempo no thread principal é tudo o que realmente importa porque manter o thread principal ocupado pode atrasar a interatividade. O Reddit gasta a maior parte do seu tempo no thread principal com mínimo uso do thread de trabalho/em segundo plano.

Eles se beneficiariam dividindo alguns de seus pacotes maiores em pacotes menores (por exemplo, 50 kB cada) sem o envolvimento para maximizar a paralelização — para que cada pacote pudesse ser analisado + compilado separadamente e reduzir a análise/compilação no thread principal durante a inicialização.

![Tempo gasto no thread principal vs. thread em segundo plano para analisar e compilar o JS do Facebook em um MacBook Pro](/_img/cost-of-javascript-2019/facebook-main-thread.svg)

Também podemos analisar um site como Facebook.com. O Facebook carrega ~6 MB de JS compactado em ~292 solicitações, algumas delas assíncronas, outras pré-carregadas e algumas recuperadas com prioridade mais baixa. Muitos de seus scripts são muito pequenos e granulares — isso pode ajudar na paralelização geral no thread de trabalho/em segundo plano, já que esses scripts menores podem ser analisados/compilados simultaneamente.

Nota, você provavelmente não é o Facebook e provavelmente não tem um aplicativo de longa duração como o Facebook ou Gmail onde essa quantidade de script pode ser justificada no desktop. No entanto, em geral, mantenha seus pacotes bem definidos e carregue apenas o que for necessário.

Embora a maior parte do trabalho de análise e compilação do JavaScript possa ocorrer de forma de transmissão em um thread em segundo plano, ainda há algum trabalho que precisa ocorrer no thread principal. Quando o thread principal está ocupado, a página não pode responder à entrada do usuário. Fique atento ao impacto que o download e a execução de código têm na sua experiência de usuário.

:::note
**Nota:** Atualmente, nem todos os motores de JavaScript e navegadores implementam o streaming de script como uma otimização de carregamento. Ainda acreditamos que a orientação geral aqui leva a boas experiências de usuário em geral.
:::

## O custo de analisar JSON

Como a gramática do JSON é muito mais simples do que a gramática do JavaScript, o JSON pode ser analisado de maneira mais eficiente que o JavaScript. Esse conhecimento pode ser aplicado para melhorar o desempenho de inicialização de aplicativos da web que enviam literais de objetos de configuração semelhantes ao JSON grandes (como armazenamentos inline do Redux). Em vez de incluir os dados como um literal de objeto JavaScript, assim:

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…ele pode ser representado na forma de JSON-stringificada e, em seguida, analisado em JSON em tempo real:

```js
const data = JSON.parse('{"foo":42,"bar":1337}'); // 🚀
```

Contanto que a string JSON seja avaliada apenas uma vez, a abordagem `JSON.parse` é [muito mais rápida](https://github.com/GoogleChromeLabs/json-parse-benchmark) em comparação com o literal do objeto JavaScript, especialmente para carregamentos frios. Uma boa regra prática é aplicar essa técnica para objetos de 10 kB ou maior — mas, como sempre, com conselhos de performance, meça o impacto real antes de fazer qualquer alteração.

![`JSON.parse('…')` é [muito mais rápido](https://github.com/GoogleChromeLabs/json-parse-benchmark) para analisar, compilar e executar em comparação com um literal JavaScript equivalente — não apenas no V8 (1.7× mais rápido), mas em todos os principais motores JavaScript.](/_img/cost-of-javascript-2019/json.svg)

O vídeo a seguir explica em mais detalhes de onde vem a diferença de desempenho, começando no minuto 02:10.

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/ff4fgQxPaO0?start=130" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=ff4fgQxPaO0">“Aplicativos mais rápidos com <code>JSON.parse</code>”</a> apresentado por Mathias Bynens no #ChromeDevSummit 2019.</figcaption>
</figure>

Veja [nosso _JSON ⊂ ECMAScript_ explicador de recursos](/features/subsume-json#embedding-json-parse) para uma implementação de exemplo que, dado um objeto arbitrário, gera um programa JavaScript válido que o `JSON.parse`.

Há um risco adicional ao usar literais de objetos simples para grandes quantidades de dados: eles podem ser analisados _duas vezes_!

1. A primeira análise ocorre quando o literal é pré-analisado.
2. A segunda análise ocorre quando o literal é analisado de forma preguiçosa.

A primeira análise não pode ser evitada. Felizmente, a segunda análise pode ser evitada colocando o literal do objeto no nível superior ou dentro de um [PIFE](/blog/preparser#pife).

## O que dizer sobre analisar/compilar em visitas repetidas?

A otimização de cache de código (byte) do V8 pode ajudar. Quando um script é solicitado pela primeira vez, o Chrome faz o download e o entrega ao V8 para compilar. Ele também armazena o arquivo no cache em disco do navegador. Quando o arquivo JS é solicitado pela segunda vez, o Chrome pega o arquivo do cache do navegador e o entrega novamente ao V8 para compilar. Desta vez, no entanto, o código compilado é serializado e anexado ao arquivo de script em cache como metadados.

![Visualização de como o cache de código funciona no V8](/_img/cost-of-javascript-2019/code-caching.png)

Na terceira vez, o Chrome pega tanto o arquivo quanto os metadados do arquivo do cache, e entrega ambos ao V8. O V8 desserializa os metadados e pode pular a compilação. O cache de código entra em ação se as duas primeiras visitas acontecerem dentro de 72 horas. O Chrome também tem um cache de código antecipado se um service worker for usado para armazenar scripts. Você pode ler mais sobre o cache de código em [cache de código para desenvolvedores web](/blog/code-caching-for-devs).

## Conclusões

O tempo de download e execução são os principais gargalos para carregar scripts em 2019. Procure um pequeno conjunto de scripts síncronos (inline) para seu conteúdo acima da dobra com um ou mais scripts adiados para o restante da página. Divida seus grandes pacotes para se concentrar apenas em enviar o código que o usuário precisa quando ele precisa. Isso maximiza a paralelização no V8.

No celular, você desejará enviar muito menos script devido à rede, consumo de memória e tempo de execução para CPUs mais lentas. Equilibre latência com capacidade de armazenamento em cache para maximizar a quantidade de trabalho de análise e compilação que pode ocorrer fora do thread principal.

## Leituras adicionais

- [Análise extremamente rápida, parte 1: otimizando o scanner](/blog/scanner)
- [Análise extremamente rápida, parte 2: análise preguiçosa](/blog/preparser)
