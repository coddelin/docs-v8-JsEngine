---
title: 'Lançamento V8 v7.8'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), o feiticeiro preguiçoso'
avatars:
  - 'ingvar-stepanyan'
date: 2019-09-27
tags:
  - lançamento
description: 'V8 v7.8 apresenta compilação em streaming no preload, API C para WebAssembly, desestruturação de objetos mais rápida, correspondência RegExp melhorada e tempos de inicialização otimizados.'
tweet: '1177600702861971459'
---
A cada seis semanas, criamos uma nova ramificação do V8 como parte de nosso [processo de lançamento](/docs/release-process). Cada versão é criada a partir do master do Git do V8 imediatamente antes de uma etapa Beta do Chrome. Hoje estamos felizes em anunciar nossa ramificação mais recente, [V8 versão 7.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.8), que está em beta até seu lançamento em coordenação com o Chrome 78 Stable em algumas semanas. O V8 v7.8 está recheado de diversos recursos voltados para desenvolvedores. Este artigo fornece uma prévia de alguns dos destaques na antecipação do lançamento.

<!--truncate-->
## Desempenho de JavaScript (tamanho e velocidade)

### Streaming de scripts no preload

Você deve se lembrar de [nosso trabalho de streaming de scripts no V8 v7.5](/blog/v8-release-75#script-streaming-directly-from-network), onde melhoramos nossa compilação em segundo plano para ler dados diretamente da rede. No Chrome 78, estamos habilitando o streaming de scripts durante o preload.

Anteriormente, o streaming de scripts começava quando uma tag `<script>` era encontrada durante a análise do HTML, e a análise ficava em pausa até que a compilação fosse concluída (para scripts normais) ou o script era executado assim que terminava a compilação (para scripts assíncronos). Isso significa que para scripts normais e síncronos como este:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="main.js"></script>
</head>
...
```

…o pipeline anteriormente parecia algo como isto:

<figure>
  <img src="/_img/v8-release-78/script-streaming-0.svg" width="458" height="130" alt="" loading="lazy"/>
</figure>

Como scripts síncronos podem usar `document.write()`, precisamos pausar a análise do HTML ao encontrar a tag `<script>`. Como a compilação começa quando a tag `<script>` é encontrada, há um grande intervalo entre a análise do HTML e a execução do script, período durante o qual não podemos continuar carregando a página.

No entanto, _também_ encontramos a tag `<script>` em um estágio anterior, onde verificamos o HTML em busca de recursos para preload, então o pipeline era realmente mais parecido com isto:

<figure>
  <img src="/_img/v8-release-78/script-streaming-1.svg" width="600" height="130" alt="" loading="lazy"/>
</figure>

É razoavelmente seguro assumir que, se fizermos o preload de um arquivo JavaScript, eventualmente queremos executá-lo. Portanto, desde o Chrome 76, temos experimentado o streaming de preload, onde carregar o script também inicia sua compilação.

<figure>
  <img src="/_img/v8-release-78/script-streaming-2.svg" width="495" height="130" alt="" loading="lazy"/>
</figure>

Ainda melhor, como podemos começar a compilar antes que o script termine de carregar, o pipeline com streaming de preload na verdade se parece mais com isto:

<figure>
  <img src="/_img/v8-release-78/script-streaming-3.svg" width="480" height="217" alt="" loading="lazy"/>
</figure>

Isso significa que, em alguns casos, podemos reduzir o tempo perceptível de compilação (o intervalo entre `<script>`-tag-vista e script-iniciando-execução) para zero. Em nossos experimentos, esse tempo perceptível de compilação caiu, em média, de 5% a 20%.

A melhor notícia é que, graças à nossa infraestrutura de experimentação, conseguimos não apenas habilitar isso por padrão no Chrome 78, mas também ativá-lo para usuários do Chrome 76 em diante.

### Desestruturação de objetos mais rápida

A desestruturação de objetos na forma…

```js
const {x, y} = object;
```

…é quase equivalente à forma descomplicada...

```js
const x = object.x;
const y = object.y;
```

…exceto que também precisa lançar um erro especial caso `object` seja `undefined` ou `null`...

```
$ v8 -e 'const object = undefined; const {x, y} = object;'
unnamed:1: TypeError: Não é possível desestruturar a propriedade `x` de 'undefined' ou 'null'.
const object = undefined; const {x, y} = object;
                                 ^
```

…em vez do erro normal obtido ao tentar desreferenciar undefined:

```
$ v8 -e 'const object = undefined; object.x'
unnamed:1: TypeError: Não é possível ler a propriedade 'x' de undefined
const object = undefined; object.x
                                 ^
```

Essa verificação extra tornava a desestruturação mais lenta que a simples atribuição de variáveis, conforme [relatado para nós pelo Twitter](https://twitter.com/mkubilayk/status/1166360933087752197).

A partir do V8 v7.8, a desestruturação de objetos é **tão rápida** quanto a atribuição equivalente de variáveis descomplicadas (na verdade, geramos o mesmo bytecode para ambos). Agora, em vez de verificações explícitas de `undefined`/`null`, contamos com uma exceção sendo lançada ao carregar `object.x`, e interceptamos a exceção se ela for resultado da desestruturação.

### Posições de origem preguiçosas

Ao compilar bytecode a partir de JavaScript, são geradas tabelas de posição de origem que vinculam sequências de bytecode às posições de caracteres no código-fonte. No entanto, essas informações são usadas apenas ao simbolizar exceções ou realizar tarefas de desenvolvedor, como depuração e criação de perfil, o que leva a um desperdício considerável de memória.

Para evitar isso, agora compilamos bytecode sem coletar posições de origem (assumindo que nenhum depurador ou profiler esteja anexado). As posições de origem só são coletadas quando uma rastreabilidade de pilha é realmente gerada, por exemplo, ao chamar `Error.stack` ou imprimir a rastreabilidade de exceção no console. Isso tem algum custo, já que gerar posições de origem requer que a função seja reanalisada e recompilada, mas a maioria dos sites não utiliza rastreabilidade de pilha em produção, e, portanto, não percebe impacto de desempenho observável. Em nossos testes de laboratório, observamos reduções entre 1-2,5% no uso de memória do V8.

![Economias de memória a partir de posições de origem preguiçosas em um dispositivo AndroidGo](/_img/v8-release-78/memory-savings.svg)

### Falhas mais rápidas em correspondências RegExp

Geralmente, uma RegExp tenta encontrar uma correspondência iterando para frente na string de entrada e verificando uma correspondência a partir de cada posição. Quando a posição se aproxima o suficiente do final da string, onde nenhuma correspondência é possível, o V8 agora (na maioria dos casos) para de tentar encontrar novos inícios possíveis de correspondências e, em vez disso, retorna rapidamente uma falha. Essa otimização se aplica a expressões regulares compiladas e interpretadas e resulta em maior velocidade em cargas de trabalho onde a falha em encontrar uma correspondência é comum, e o comprimento mínimo de qualquer correspondência bem-sucedida é relativamente grande em comparação ao comprimento médio da string de entrada.

No teste UniPoker no JetStream 2, que inspirou este trabalho, o V8 v7.8 traz uma melhoria de 20% na pontuação média de todas as iterações.

## WebAssembly

### API C/C++ do WebAssembly

A partir da versão v7.8, a implementação pelo V8 da [API Wasm C/C++](https://github.com/WebAssembly/wasm-c-api) deixa de ser experimental para ser oficialmente suportada. Isso permite usar uma versão especial do V8 como um mecanismo de execução WebAssembly em suas aplicações C/C++. Nada de JavaScript envolvido! Para mais detalhes e instruções, veja [a documentação](https://docs.google.com/document/d/1oFPHyNb_eXg6NzrE6xJDNPdJrHMZvx0LqsD6wpbd9vY/edit).

### Tempo de inicialização melhorado

Chamar uma função JavaScript a partir do WebAssembly ou uma função WebAssembly a partir de JavaScript envolve executar algum código wrapper, responsável por traduzir os argumentos da função de uma representação para outra. Gerar esses wrappers pode ser bem caro: no [demo Epic ZenGarden](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html), compilar wrappers leva cerca de 20% do tempo de inicialização do módulo (compilação + instanciação) em uma máquina Xeon de 18 núcleos.

Para esta versão, melhoramos a situação aproveitando melhor os threads em segundo plano em máquinas multicore. Baseamo-nos em esforços recentes para [escalar a compilação de funções](/blog/v8-release-77#wasm-compilation) e integramos a compilação de wrappers nesse novo pipeline assíncrono. A compilação de wrappers agora representa cerca de 8% do tempo de inicialização do demo Epic ZenGarden na mesma máquina.

## API do V8

Use `git log branch-heads/7.7..branch-heads/7.8 include/v8.h` para obter uma lista das alterações na API.

Os desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 7.8 -t branch-heads/7.8` para experimentar os novos recursos na versão v7.8 do V8. Alternativamente, você pode [se inscrever no canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos por conta própria em breve.
