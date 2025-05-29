---
title: 'Lançamento do V8 v7.5'
author: 'Dan Elphick, flagelo dos depreciados'
avatars:
  - 'dan-elphick'
date: 2019-05-16 15:00:00
tags:
  - lançamento
description: 'O V8 v7.5 apresenta cache implícito de artefatos de compilação WebAssembly, operações de memória em massa, separadores numéricos em JavaScript e muito mais!'
tweet: '1129073370623086593'
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é ramificada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje, temos o prazer de anunciar nosso mais novo branch, [V8 versão 7.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.5), que está em beta até sua versão final em coordenação com o Chrome 75 Stable em algumas semanas. O V8 v7.5 está cheio de novidades para os desenvolvedores. Este post oferece uma prévia de alguns dos destaques na expectativa do lançamento.

<!--truncate-->
## WebAssembly

### Cache implícito

Estamos planejando implementar o cache implícito de artefatos de compilação do WebAssembly no Chrome 75. Isso significa que usuários que visitarem a mesma página novamente não precisarão compilar os módulos WebAssembly já vistos. Em vez disso, eles são carregados do cache. Isso funciona de maneira semelhante ao [cache de código JavaScript do Chromium](/blog/code-caching-for-devs).

Caso você queira usar um recurso semelhante em sua integração com o V8, inspire-se na implementação do Chromium.

### Operações de memória em massa

[A proposta de memória em massa](https://github.com/webassembly/bulk-memory-operations) adiciona novas instruções ao WebAssembly para atualizar grandes regiões de memória ou tabelas.

`memory.copy` copia dados de uma região para outra, mesmo se as regiões se sobrepõem (como o `memmove` em C). `memory.fill` preenche uma região com um determinado byte (como o `memset` em C). Similar ao `memory.copy`, `table.copy` copia de uma região de uma tabela para outra, mesmo se as regiões se sobrepõem.

```wasm
;; Copie 500 bytes da fonte 1000 para o destino 0.
(memory.copy (i32.const 0) (i32.const 1000) (i32.const 500))

;; Preencha 1000 bytes começando no endereço 100 com o valor `123`.
(memory.fill (i32.const 100) (i32.const 123) (i32.const 1000))

;; Copie 10 elementos da tabela da fonte 5 para o destino 15.
(table.copy (i32.const 15) (i32.const 5) (i32.const 10))
```

A proposta também oferece uma maneira de copiar uma região constante para a memória linear ou tabela. Para isso, primeiro precisamos definir um segmento “passivo”. Ao contrário de segmentos “ativos”, esses segmentos não são inicializados durante a instanciação do módulo. Em vez disso, eles podem ser copiados para uma região de memória ou tabela usando as instruções `memory.init` e `table.init`.

```wasm
;; Defina um segmento de dados passivo.
(data $hello passive "Hello WebAssembly")

;; Copie "Hello" para a memória no endereço 10.
(memory.init (i32.const 10) (i32.const 0) (i32.const 5))

;; Copie "WebAssembly" para a memória no endereço 1000.
(memory.init (i32.const 1000) (i32.const 6) (i32.const 11))
```

## Separadores numéricos em JavaScript

Literais numéricos grandes são difíceis para o olho humano interpretar rapidamente, especialmente quando há muitos dígitos repetidos:

```js
1000000000000
   1019436871.42
```

Para melhorar a legibilidade, [um novo recurso da linguagem JavaScript](/features/numeric-separators) permite o uso de underscores como separadores em literais numéricos. Assim, os exemplos acima podem agora ser reescritos para agrupar os dígitos por milhar, por exemplo:

```js
1_000_000_000_000
    1_019_436_871.42
```

Agora é mais fácil perceber que o primeiro número é um trilhão, e o segundo número está na ordem de 1 bilhão.

Para mais exemplos e informações adicionais sobre separadores numéricos, veja [nosso explicador](/features/numeric-separators).

## Desempenho

### Streaming de scripts diretamente da rede

A partir do Chrome 75, o V8 pode transmitir scripts diretamente da rede para o parser de streaming, sem esperar pela thread principal do Chrome.

Embora versões anteriores do Chrome tivessem parsing e compilação em streaming, os dados de origem do script provenientes da rede sempre precisavam passar pela thread principal do Chrome antes de serem encaminhados ao streamer, por razões históricas. Isso significava que, frequentemente, o parser de streaming ficava esperando por dados que já haviam chegado da rede, mas ainda não haviam sido encaminhados para a tarefa de streaming porque estavam bloqueados por outras coisas acontecendo na thread principal (como parsing HTML, layout ou outra execução de JavaScript).

![Tarefas de parsing em segundo plano bloqueadas no Chrome 74 e versões anteriores](/_img/v8-release-75/before.jpg)

No Chrome 75, conectamos o "pipeline de dados" da rede diretamente ao V8, permitindo que os dados da rede sejam lidos diretamente durante o parsing em streaming, ignorando a dependência da thread principal.

![No Chrome 75+, as tarefas de parsing em segundo plano não são mais bloqueadas pela atividade na thread principal.](/_img/v8-release-75/after.jpg)

Isso nos permite terminar as compilações em streaming mais cedo, melhorando o tempo de carregamento das páginas que utilizam compilação em streaming, bem como reduzindo o número de tarefas de análise em streaming concorrentes (mas paradas), o que reduz o consumo de memória.

## API do V8

Por favor, use `git log branch-heads/7.4..branch-heads/7.5 include/v8.h` para obter uma lista das alterações da API.

Os desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 7.5 -t branch-heads/7.5` para experimentar os novos recursos do V8 v7.5. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos você mesmo em breve.
