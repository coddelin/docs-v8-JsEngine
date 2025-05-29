---
title: 'Compilação em segundo plano'
author: '[Ross McIlroy](https://twitter.com/rossmcilroy), defensor da thread principal'
avatars:
  - 'ross-mcilroy'
date: 2018-03-26 13:33:37
tags:
  - internals
description: 'A partir do Chrome 66, o V8 compila o código-fonte JavaScript em uma thread de fundo, reduzindo o tempo gasto na compilação na thread principal entre 5% a 20% em sites típicos.'
tweet: '978319362837958657'
---
TL;DR: A partir do Chrome 66, o V8 compila o código-fonte JavaScript em uma thread de fundo, reduzindo o tempo gasto na compilação na thread principal entre 5% a 20% em sites típicos.

## Contexto

Desde a versão 41, o Chrome suporta [parsing de arquivos fonte JavaScript em uma thread de fundo](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html) via a API [`StreamedSource`](https://cs.chromium.org/chromium/src/v8/include/v8.h?q=StreamedSource&sq=package:chromium&l=1389) do V8. Isso permite que o V8 comece a fazer o parsing do código-fonte JavaScript assim que o Chrome baixa o primeiro pedaço do arquivo da rede, continuando o parsing em paralelo enquanto o Chrome transmite o arquivo pela rede. Isso pode proporcionar melhorias consideráveis no tempo de carregamento, uma vez que o V8 pode praticamente terminar o parsing do JavaScript quando o download do arquivo é concluído.

<!--truncate-->
No entanto, devido a limitações no compilador básico original do V8, o V8 ainda precisava retornar à thread principal para finalizar o parsing e compilar o script em código de máquina JIT que executaria o código do script. Com a mudança para nosso novo [pipeline Ignition + TurboFan](/blog/launching-ignition-and-turbofan), agora somos capazes de mover a compilação de bytecode para a thread de fundo também, liberando a thread principal do Chrome para proporcionar uma experiência de navegação na web mais suave e responsiva.

## Construção de um compilador de bytecode em thread de fundo

O compilador de bytecode Ignition do V8 usa a [árvore sintática abstrata (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree) produzida pelo parser como entrada e produz um fluxo de bytecode (`BytecodeArray`) juntamente com metadados associados, permitindo que o interpretador Ignition execute o código-fonte JavaScript.

![](/_img/background-compilation/bytecode.svg)

O compilador de bytecode do Ignition foi construído com multi-threading em mente, porém várias mudanças foram necessárias ao longo do pipeline de compilação para habilitar a compilação em segundo plano. Uma das principais mudanças foi evitar que o pipeline de compilação acessasse objetos no heap JavaScript do V8 enquanto estivesse em execução na thread de fundo. Objetos no heap do V8 não são seguros para threads, já que o JavaScript é single-threaded, e podem ser modificados pela thread principal ou pelo coletor de lixo do V8 durante a compilação em segundo plano.

Havia dois estágios principais no pipeline de compilação que acessavam objetos no heap do V8: internalização do AST e finalização do bytecode. A internalização do AST é um processo pelo qual objetos literais (strings, números, boilerplate de objetos literais, etc.) identificados no AST são alocados no heap do V8, de modo que possam ser usados diretamente pelo bytecode gerado quando o script for executado. Esse processo tradicionalmente acontecia logo após o parser construir o AST. Como resultado, havia vários passos posteriores no pipeline de compilação que dependiam dos objetos literais terem sido alocados. Para habilitar a compilação em segundo plano, movemos a internalização do AST para mais tarde no pipeline de compilação, após o bytecode ter sido compilado. Isso exigiu modificações nos estágios posteriores do pipeline para acessar os valores literais _crus_ embutidos no AST em vez de valores alocados no heap.

A finalização do bytecode envolve a construção do objeto final `BytecodeArray`, usado para executar a função, juntamente com metadados associados — por exemplo, um `ConstantPoolArray` que armazena constantes referidas pelo bytecode, e uma `SourcePositionTable` que mapeia os números de linha e coluna da fonte JavaScript para o deslocamento do bytecode. Como JavaScript é uma linguagem dinâmica, todos esses objetos precisam viver no heap JavaScript para permitir que sejam coletados caso a função JavaScript associada ao bytecode seja coletada. Anteriormente, alguns desses objetos de metadados seriam alocados e modificados durante a compilação de bytecode, o que envolvia acessar o heap JavaScript. Para habilitar a compilação em segundo plano, o gerador de bytecode do Ignition foi refatorado para rastrear os detalhes desses metadados e adiar sua alocação no heap JavaScript até os estágios finais de compilação.

Com essas mudanças, quase toda a compilação do script pode ser movida para uma thread de fundo, com apenas os curtos passos de internalização do AST e finalização do bytecode acontecendo na thread principal pouco antes da execução do script.

![](/_img/background-compilation/threads.svg)

Atualmente, apenas o código de script de nível superior e expressões de função imediatamente invocadas (IIFEs) são compilados em um thread em segundo plano — funções internas ainda são compiladas de forma tardia (quando executadas pela primeira vez) no thread principal. Esperamos estender a compilação em segundo plano para mais situações no futuro. No entanto, mesmo com essas restrições, a compilação em segundo plano mantém o thread principal livre por mais tempo, permitindo que ele realize outros trabalhos, como reagir à interação do usuário, renderizar animações ou produzir uma experiência mais suave e responsiva.

## Resultados

Avaliamos o desempenho da compilação em segundo plano usando nosso [framework de benchmarking de mundo real](/blog/real-world-performance) em um conjunto de páginas populares da web.

![](/_img/background-compilation/desktop.svg)

![](/_img/background-compilation/mobile.svg)

A proporção de compilação que pode ocorrer em um thread em segundo plano varia dependendo da proporção de bytecode compilado durante a compilação de script de fluxo de nível superior em comparação com a compilação tardia quando funções internas são invocadas (que ainda devem ocorrer no thread principal). Como resultado, a proporção de tempo economizado no thread principal varia, com a maioria das páginas registrando uma redução de 5% a 20% no tempo de compilação do thread principal.

## Próximos passos

O que é melhor do que compilar um script em um thread em segundo plano? Não ter que compilar o script! Junto com a compilação em segundo plano, também estamos trabalhando na melhoria do [sistema de cache de código](/blog/code-caching) do V8 para expandir a quantidade de código armazenado em cache pelo V8, acelerando o carregamento de páginas para sites que você visita com frequência. Esperamos trazer atualizações nesta área em breve. Fique ligado!
