---
title: "Lançamento do V8 v7.9"
author: "Santiago Aboy Solanes, especialista em compressão de ponteiros"
avatars: 
  - "santiago-aboy-solanes"
date: 2019-11-20
tags: 
  - lançamento
description: "O V8 v7.9 apresenta a remoção da depreciação para transições de Double ⇒ Tagged, tratamento de getters de API em funções internas, cache de OSR e suporte do Wasm para múltiplos espaços de código."
tweet: "1197187184304050176"
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é ramificada do master do Git do V8 imediatamente antes de um marco Beta do Chrome. Hoje, estamos felizes em anunciar nosso mais novo branch, [V8 versão 7.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.9), que está em beta até seu lançamento em coordenação com o Chrome 79 Stable em algumas semanas. O V8 v7.9 está repleto de novidades voltadas para desenvolvedores. Esta postagem fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Desempenho (tamanho e velocidade)

### Remoção da depreciação para transições de Double ⇒ Tagged

Você deve lembrar de posts anteriores no blog que o V8 rastreia como os campos são representados nas formas dos objetos. Quando a representação de um campo muda, a forma atual do objeto precisa ser 'depreciada', e uma nova forma é criada com a nova representação de campo.

Uma exceção a isso é quando os valores antigos dos campos são garantidos como compatíveis com a nova representação. Nesses casos, podemos simplesmente substituir a nova representação diretamente na forma do objeto, e ela ainda funcionará para os valores dos campos dos objetos antigos. No V8 v7.6, habilitamos essas mudanças de representação in-place para transições Smi ⇒ Tagged e HeapObject ⇒ Tagged, mas não conseguimos evitar Double ⇒ Tagged devido à nossa otimização MutableHeapNumber.

No V8 v7.9, eliminamos o MutableHeapNumber e, em vez disso, usamos HeapNumbers que são implicitamente mutáveis quando pertencem a um campo de representação Double. Isso significa que precisamos ser um pouco mais cuidadosos ao lidar com HeapNumbers (que agora são mutáveis se estiverem em um campo double e imutáveis caso contrário), mas os HeapNumbers são compatíveis com a representação Tagged, e, portanto, podemos evitar a depreciação no caso Double ⇒ Tagged também.

Essa mudança relativamente simples melhorou a pontuação do Speedometer AngularJS em 4%.

![Melhorias na pontuação do Speedometer AngularJS](/_img/v8-release-79/speedometer-angularjs.svg)

### Tratamento de getters de API em funções internas

Anteriormente, o V8 sempre saltava para o runtime C++ ao lidar com getters definidos pela API de incorporação (como o Blink). Estes incluíam getters definidos na especificação HTML, como `Node.nodeType`, `Node.nodeName`, etc.

O V8 fazia todo o percurso no protótipo na função interna para carregar o getter e depois saltava para o runtime quando percebia que o getter era definido pela API. No runtime C++, fazia novamente o percurso da cadeia de protótipo para obter o getter antes de executá-lo, duplicando muito trabalho.

Em geral, [o mecanismo de caching inline (IC)](https://mathiasbynens.be/notes/shapes-ics) pode ajudar a mitigar isso, já que o V8 instala um manipulador de IC após o primeiro salto para o runtime C++. Mas com a nova [alocação de feedback preguiçosa](https://v8.dev/blog/v8-release-77#lazy-feedback-allocation), o V8 não instala manipuladores de IC até que a função tenha sido executada por algum tempo.

Agora, no V8 v7.9, esses getters são tratados nas funções internas sem precisar saltar para o runtime C++, mesmo quando não têm manipuladores de IC instalados, aproveitando stubs especiais da API que podem chamar diretamente o getter da API. Isso resulta em uma redução de 12% no tempo gasto no runtime IC no benchmark do Speedometer para Backbone e jQuery.

![Melhorias no Speedometer para Backbone e jQuery](/_img/v8-release-79/speedometer.svg)

### Cache de OSR

Quando o V8 identifica que certas funções são frequentemente usadas, ele as marca para otimização na próxima chamada. Quando a função é executada novamente, o V8 compila a função usando o compilador otimizado e começa a usar o código otimizado a partir da chamada subsequente. No entanto, para funções com loops longos, isso não é suficiente. O V8 utiliza uma técnica chamada substituição on-stack (OSR) para instalar código otimizado para a função que está sendo executada atualmente. Isso nos permite começar a usar o código otimizado durante a primeira execução da função, enquanto ela está presa em um loop quente.

Se a função for executada uma segunda vez, é muito provável que seja otimizada novamente via OSR. Antes do V8 v7.9, era necessário reotimizar novamente a função para realizar a OSR. Contudo, a partir da v7.9, adicionamos cache OSR para reter o código otimizado para substituições OSR, sendo indexado pelo cabeçalho do loop que foi usado como ponto de entrada na função OSRed. Isso melhorou o desempenho de alguns benchmarks de desempenho máximo em 5–18%.

![Melhorias no cache de OSR](/_img/v8-release-79/osr-caching.svg)

## WebAssembly

### Suporte para múltiplos espaços de código

Até agora, cada módulo WebAssembly consistia em exatamente um espaço de código em arquiteturas de 64 bits, que era reservado na criação do módulo. Isso nos permitia usar chamadas próximas dentro de um módulo, mas nos limitava a 128 MB de espaço de código no arm64 e exigia a reserva prévia de 1 GB no x64.

No v7.9, o V8 ganhou suporte para múltiplos espaços de código em arquiteturas de 64 bits. Isso nos permite reservar apenas o espaço de código estimado necessário e adicionar mais espaços de código posteriormente, se necessário. Um salto longo é usado para chamadas entre espaços de código que estão muito distantes para saltos próximos. Em vez de ~1000 módulos WebAssembly por processo, o V8 agora suporta vários milhões, limitado apenas pela quantidade real de memória disponível.

## API do V8

Por favor, use `git log branch-heads/7.8..branch-heads/7.9 include/v8.h` para obter uma lista das alterações na API.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 7.9 -t branch-heads/7.9` para experimentar os novos recursos no V8 v7.9. Alternativamente, você pode [inscrever-se no canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos por si mesmo em breve.
