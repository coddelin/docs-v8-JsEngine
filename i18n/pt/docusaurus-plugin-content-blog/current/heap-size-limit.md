---
title: "Um pequeno passo para o Chrome, um grande salto para o V8"
author: "guardians of the heap Ulan Degenbaev, Hannes Payer, Michael Lippautz, e o guerreiro do DevTools Alexey Kozyatinskiy"
avatars:
  - "ulan-degenbaev"
  - "michael-lippautz"
  - "hannes-payer"
date: 2017-02-09 13:33:37
tags:
  - memória
description: "O V8 recentemente aumentou seu limite rígido de tamanho de heap."
---
O V8 tem um limite rígido no tamanho de seu heap. Isso funciona como uma proteção contra aplicações com vazamento de memória. Quando uma aplicação atinge esse limite rígido, o V8 realiza uma série de coletas de lixo como último recurso. Se essas coletas de lixo não forem suficientes para liberar memória, o V8 interrompe a execução e informa uma falha de falta de memória. Sem o limite rígido, uma aplicação com vazamento de memória poderia consumir toda a memória do sistema, prejudicando o desempenho de outras aplicações.

<!--truncate-->
Ironia do destino, esse mecanismo de proteção torna a investigação de vazamentos de memória mais difícil para os desenvolvedores de JavaScript. A aplicação pode ficar sem memória antes que o desenvolvedor consiga inspecionar o heap no DevTools. Além disso, o próprio processo do DevTools pode ficar sem memória porque utiliza uma instância comum do V8. Por exemplo, tirar um snapshot de heap [neste exemplo](https://ulan.github.io/misc/heap-snapshot-demo.html) interrompe a execução devido à falta de memória no Chrome estável atual.

Historicamente, o limite do heap do V8 foi convenientemente definido para caber dentro da faixa de inteiros de 32 bits assinados com uma certa margem. Com o tempo, essa conveniência levou a código descuidado no V8 que misturava tipos com larguras de bits diferentes, efetivamente dificultando a capacidade de aumentar o limite. Recentemente, limpamos o código do coletor de lixo, permitindo o uso de tamanhos maiores de heap. O DevTools já utiliza esse recurso e tirar um snapshot de heap no exemplo mencionado anteriormente funciona como esperado na versão mais recente do Chrome Canary.

Também adicionamos um recurso no DevTools para pausar a aplicação quando ela está próxima de ficar sem memória. Esse recurso é útil para investigar bugs que fazem a aplicação alocar muita memória em um curto período de tempo. Ao executar [este exemplo](https://ulan.github.io/misc/oom.html) com o Chrome Canary mais recente, o DevTools pausa a aplicação antes da falha de falta de memória e aumenta o limite do heap, dando ao usuário a chance de inspecionar o heap, avaliar expressões no console para liberar memória e então retomar a execução para continuar o debugging.

![](/_img/heap-size-limit/debugger.png)

Os integradores do V8 podem aumentar o limite do heap usando a função [`set_max_old_generation_size_in_bytes`](https://codesearch.chromium.org/chromium/src/v8/include/v8-isolate.h?q=set_max_old_generation_size_in_bytes) da API `ResourceConstraints`. Mas cuidado, algumas fases no coletor de lixo têm uma dependência linear do tamanho do heap. As pausas de coleta de lixo podem aumentar com heaps maiores.
