---
title: "WebAssembly JSPI está entrando em fase de teste de origem"
description: "Explicamos o início do teste de origem para JSPI"
author: "Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl"
date: 2024-03-06
tags: 
  - WebAssembly
---
A API de Integração de Promessas em JavaScript (JSPI) do WebAssembly está entrando em um teste de origem, com o lançamento do Chrome M123. Isso significa que você pode testar se você e seus usuários podem se beneficiar dessa nova API.

JSPI é uma API que permite que código chamado sequencial – que foi compilado para WebAssembly – acesse APIs da Web que são _assíncronas_. Muitas APIs da Web são criadas em termos de `Promise`s do JavaScript: ao invés de executar a operação solicitada imediatamente, elas retornam uma `Promise` para fazê-lo. Quando a ação é finalmente realizada, o sistema de tarefas do navegador invoca quaisquer callbacks com a Promise. JSPI se integra a essa arquitetura para permitir que um aplicativo WebAssembly seja suspenso quando a `Promise` é retornada e retomado quando a `Promise` é resolvida.

<!--truncate-->
Você pode saber mais sobre JSPI e como usá-lo [aqui](https://v8.dev/blog/jspi) e a especificação em si está [aqui](https://github.com/WebAssembly/js-promise-integration).

## Requisitos

Além de se registrar para o teste de origem, você também precisará gerar os WebAssembly e JavaScript apropriados. Se você estiver usando Emscripten, isso é simples. Certifique-se de estar utilizando, pelo menos, a versão 3.1.47.

## Registrando-se para o teste de origem

JSPI ainda está em pré-lançamento; está passando por um processo de padronização e não será totalmente lançado até chegarmos à fase 4 desse processo. Para usá-lo hoje, você pode definir uma flag no navegador Chrome; ou pode solicitar um token de teste de origem que permitirá que seus usuários o acessem sem precisar definir a flag por conta própria.

Para se registrar, você pode ir [aqui](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889), certifique-se de seguir o processo de inscrição. Para saber mais sobre testes de origem em geral, [este](https://developer.chrome.com/docs/web-platform/origin-trials) é um bom ponto de partida.

## Alguns possíveis problemas

Houve algumas [discussões](https://github.com/WebAssembly/js-promise-integration/issues) na comunidade WebAssembly sobre alguns aspectos da API JSPI. Como resultado, algumas mudanças estão sendo indicadas, o que levará tempo para serem totalmente implementadas. Antecipamos que essas mudanças serão *lançadas de forma gradual*: compartilharemos as mudanças conforme elas forem disponibilizadas, porém, a API existente será mantida pelo menos até o final do teste de origem.

Além disso, existem alguns problemas conhecidos que provavelmente não serão totalmente resolvidos durante o período de teste de origem:

Para aplicações que criam intensivamente cálculos derivados, o desempenho de uma sequência encapsulada (ou seja, usando JSPI para acessar uma API assíncrona) pode ser prejudicado. Isso ocorre porque os recursos utilizados ao criar a chamada encapsulada não são armazenados em cache entre as chamadas; confiamos na coleta de lixo para liberar as pilhas que são criadas.
Atualmente, alocamos uma pilha de tamanho fixo para cada chamada encapsulada. Essa pilha é necessariamente grande para acomodar aplicações complexas. No entanto, isso também significa que uma aplicação com um grande número de chamadas simples encapsuladas _em execução_ pode enfrentar pressão de memória.

Nenhum desses problemas provavelmente impedirá a experimentação com JSPI; esperamos que eles sejam resolvidos antes do lançamento oficial do JSPI.

## Feedback

Como JSPI é um esforço de padronização, preferimos que quaisquer problemas e comentários sejam compartilhados [aqui](https://github.com/WebAssembly/js-promise-integration/issues). No entanto, relatórios de bugs podem ser realizados no site padrão de relatórios de bugs do Chrome [aqui](https://issues.chromium.org/new). Se você suspeitar de um problema com a geração de código, use [este](https://github.com/emscripten-core/emscripten/issues) para relatar um problema.

Por fim, gostaríamos de ouvir sobre quaisquer benefícios que você tenha descoberto. Utilize o [rastreador de problemas](https://github.com/WebAssembly/js-promise-integration/issues) para compartilhar sua experiência.
