---
title: 'Biblioteca Oilpan'
author: 'Anton Bikineev, Omer Katz ([@omerktz](https://twitter.com/omerktz)) e Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), eficientes e eficazes na movimentação de arquivos'
avatars:
  - anton-bikineev
  - omer-katz
  - michael-lippautz
date: 2021-11-10
tags:
  - internals
  - memory
  - cppgc
description: 'O V8 inclui Oilpan, uma biblioteca de coleta de lixo para gerenciar memória C++'
tweet: '1458406645181165574'
---

Embora o título deste post possa sugerir uma imersão em uma coleção de livros sobre cárteres de óleo - o que, considerando as normas de construção para cárteres, é um tema com uma quantidade surpreendente de literatura - nós, em vez disso, iremos olhar mais de perto para o Oilpan, um coletor de lixo C++ que é oferecido por meio do V8 como uma biblioteca desde a versão V8 v9.4.

<!--truncate-->
Oilpan é um [coletor de lixo baseado em rastreamento](https://en.wikipedia.org/wiki/Tracing_garbage_collection), o que significa que ele determina os objetos vivos percorrendo um grafo de objetos em uma fase de marcação. Os objetos mortos são então recuperados em uma fase de varredura, sobre a qual já [blogamos no passado](https://v8.dev/blog/high-performance-cpp-gc). Ambas as fases podem rodar intercaladas ou em paralelo ao código de aplicação C++ real. O manuseio de referências para objetos no heap é preciso, mas conservador para a pilha nativa. Isso significa que o Oilpan sabe onde estão as referências no heap, mas precisa escanear a memória assumindo que sequências aleatórias de bits representam ponteiros para a pilha. O Oilpan também suporta compactação (desfragmentação do heap) para certos objetos quando a coleta de lixo é executada sem uma pilha nativa.

Então, qual é a ideia de oferecê-lo como uma biblioteca através do V8?

O Blink, ao ser derivado do WebKit, originalmente utilizava contagem de referências, um [paradigma bem conhecido para código C++](https://en.cppreference.com/w/cpp/memory/shared_ptr), para gerenciar sua memória no heap. A contagem de referências deveria resolver problemas de gerenciamento de memória, mas é conhecida por ser suscetível a vazamentos de memória devido a ciclos. Além desse problema inerente, o Blink também sofria de [problemas de uso após liberação](https://en.wikipedia.org/wiki/Dangling_pointer), já que, às vezes, a contagem de referências era omitida por razões de desempenho. O Oilpan foi inicialmente desenvolvido especificamente para o Blink a fim de simplificar o modelo de programação e acabar com vazamentos de memória e problemas de uso após liberação. Acreditamos que o Oilpan conseguiu simplificar o modelo e também tornar o código mais seguro.

Outra razão talvez menos explícita para introduzir o Oilpan no Blink foi ajudar na integração com outros sistemas que usam coleta de lixo, como o V8, que acabou resultando na implementação de um [heap unificado para JavaScript e C++](https://v8.dev/blog/tracing-js-dom), onde o Oilpan cuida do processamento de objetos C++[^1]. Com cada vez mais hierarquias de objetos sendo gerenciadas e uma melhor integração com o V8, o Oilpan tornou-se cada vez mais complexo ao longo do tempo, e a equipe percebeu que estava reinventando os mesmos conceitos do coletor de lixo do V8 e resolvendo os mesmos problemas. A integração no Blink exigia a construção de cerca de 30 mil alvos para na verdade rodar um teste de coleta de lixo básico para o heap unificado.

No início de 2020, começamos uma jornada para extrair o Oilpan do Blink e encapsulá-lo em uma biblioteca. Decidimos hospedar o código no V8, reutilizar abstrações sempre que possível e fazer uma limpeza na interface de coleta de lixo. Além de corrigir todos os problemas mencionados acima, [uma biblioteca](https://docs.google.com/document/d/1ylZ25WF82emOwmi_Pg-uU6BI1A-mIbX_MG9V87OFRD8/) também permitiria que outros projetos utilizassem C++ com coleta de lixo. Lançamos a biblioteca no V8 v9.4 e a ativamos no Blink a partir do Chromium M94.

## O que contém na biblioteca?

Semelhante ao restante do V8, o Oilpan agora fornece uma [API estável](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/), e os integradores podem confiar nas [convenções regulares do V8](https://v8.dev/docs/api). Por exemplo, isso significa que as APIs estão devidamente documentadas (veja [GarbageCollected](https://chromium.googlesource.com/v8/v8.git/+/main/include/cppgc/garbage-collected.h#17)) e passarão por um período de descontinuação caso estejam sujeitas a remoção ou alteração.

O núcleo do Oilpan está disponível como um coletor de lixo independente em C++ no namespace `cppgc`. A configuração também permite reutilizar uma plataforma V8 existente para criar um heap para objetos gerenciados em C++. As coletas de lixo podem ser configuradas para serem executadas automaticamente, integrando na infraestrutura de tarefas ou podem ser acionadas explicitamente considerando também a pilha nativa. A ideia é permitir que incorporadores que desejam apenas objetos gerenciados em C++ evitem lidar com o V8 como um todo, veja este [programa de olá mundo](https://chromium.googlesource.com/v8/v8.git/+/main/samples/cppgc/hello-world.cc) como exemplo. Um incorporador dessa configuração é o PDFium, que usa a versão independente do Oilpan para [garantir XFA](https://groups.google.com/a/chromium.org/g/chromium-dev/c/RAqBXZWsADo/m/9NH0uGqCAAAJ?utm_medium=email&utm_source=footer), permitindo um conteúdo PDF mais dinâmico.

Convenientemente, os testes para o núcleo do Oilpan usam esta configuração, o que significa que é uma questão de segundos para construir e executar um teste de coleta de lixo específico. Atualmente, existem [>400 desses testes unitários](https://source.chromium.org/chromium/chromium/src/+/main:v8/test/unittests/heap/cppgc/) para o núcleo do Oilpan. A configuração também serve como um campo de experimentação para testar novas abordagens e pode ser usada para validar suposições sobre desempenho bruto.

A biblioteca Oilpan também cuida do processamento de objetos C++ ao rodar no heap unificado através do V8, o que permite uma integração total dos gráficos de objetos C++ e JavaScript. Essa configuração é usada no Blink para gerenciar a memória C++ do DOM e outras funções. O Oilpan também expõe um sistema de traços que permite estender o núcleo do coletor de lixo com tipos que têm necessidades muito específicas para determinar a vivacidade. Dessa forma, é possível para o Blink fornecer suas próprias bibliotecas de coleção que até mesmo permitem criar mapas efêmeros ao estilo JavaScript ([`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)) em C++. Não recomendamos isso para todos, mas mostra do que este sistema é capaz caso haja necessidade de personalização.

## Para onde estamos indo?

A biblioteca Oilpan nos proporciona uma base sólida que agora podemos utilizar para melhorar o desempenho. Enquanto antes precisaríamos especificar funcionalidades específicas de coleta de lixo na API pública do V8 para interagir com o Oilpan, agora podemos implementar diretamente o que precisamos. Isso permite rápida iteração e também atalhos para melhorar o desempenho sempre que possível.

Também vemos potencial em fornecer alguns contêineres básicos diretamente pelo Oilpan para evitar reinventar a roda. Isso permitiria que outros incorporadores se beneficiassem de estruturas de dados que foram anteriormente criadas especificamente para o Blink.

Vendo um futuro promissor para o Oilpan, gostaríamos de mencionar que as APIs existentes [`EmbedderHeapTracer`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-embedder-heap.h;l=75) não serão mais melhoradas e podem ser descontinuadas em algum momento. Assumindo que os incorporadores que usam essas APIs já implementaram seu próprio sistema de rastreamento, migrar para o Oilpan deve ser tão simples quanto apenas alocar os objetos C++ em um novo [heap Oilpan](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-cppgc.h;l=91) que então é anexado a um Isolate do V8. A infraestrutura existente para modelagem de referências como [`TracedReference`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-traced-handle.h;l=334) (para referências internas ao V8) e [campos internos](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-object.h;l=502) (para referências externas ao V8) são suportados pelo Oilpan.

Fique atento para mais melhorias na coleta de lixo no futuro!

Encontrou problemas ou tem sugestões? Nos avise:

- [oilpan-dev@chromium.org](mailto:oilpan-dev@chromium.org)
- Monorail: [Blink>GarbageCollection](https://bugs.chromium.org/p/chromium/issues/entry?template=Defect+report+from+user&components=Blink%3EGarbageCollection) (Chromium), [Oilpan](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user&components=Oilpan) (V8)

[^1]: Encontre mais informações sobre coleta de lixo entre componentes no [artigo de pesquisa](https://research.google/pubs/pub48052/).
