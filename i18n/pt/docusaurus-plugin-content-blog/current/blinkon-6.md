---
title: "V8 na conferência BlinkOn 6"
author: "a equipe do V8"
date: 2016-07-21 13:33:37
tags:
  - apresentações
description: "Uma visão geral das apresentações da equipe do V8 no BlinkOn 6."
---
BlinkOn é uma reunião semestral de colaboradores do Blink, V8 e Chromium. O BlinkOn 6 foi realizado em Munique nos dias 16 e 17 de junho. A equipe do V8 realizou várias apresentações sobre arquitetura, design, iniciativas de desempenho e implementação de linguagem.

<!--truncate-->
As palestras do V8 no BlinkOn estão incorporadas abaixo.

## Desempenho do JavaScript no mundo real

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/xCx4uC7mn6Y" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Duração: 31:41
- [Slides](https://docs.google.com/presentation/d/14WZkWbkvtmZDEIBYP5H1GrbC9H-W3nJSg3nvpHwfG5U/edit)

Descreve a história de como o V8 mede o desempenho do JavaScript, as diferentes eras de benchmarking e uma nova técnica para medir carregamentos de páginas em sites populares do mundo real com análises detalhadas do tempo por componente do V8.

## Ignition: um interpretador para o V8

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/r5OWCtuKiAk" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Duração: 36:39
- [Slides](https://docs.google.com/presentation/d/1OqjVqRhtwlKeKfvMdX6HaCIu9wpZsrzqpIVIwQSuiXQ/edit)

Apresenta o novo interpretador Ignition do V8, explicando a arquitetura do motor como um todo e como o Ignition afeta o uso de memória e o desempenho de inicialização.

## Como medimos e otimizamos para RAIL no GC do V8

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/VITAyGT-CJI" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Duração: 27:11
- [Slides](https://docs.google.com/presentation/d/15EQ603eZWAnrf4i6QjPP7S3KF3NaL3aAaKhNUEatVzY/edit)

Explica como o V8 usa as métricas Response, Animation, Idle, Loading (RAIL) para atingir a coleta de lixo de baixa latência e as otimizações recentes que fizemos para reduzir travamentos em dispositivos móveis.

## ECMAScript 2015 e além

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/KrGOzEwqRDA" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Duração: 28:52
- [Slides](https://docs.google.com/presentation/d/1o1wld5z0BM8RTqXASGYD3Rvov8PzrxySghmrGTYTgw0/edit)

Fornece uma atualização sobre a implementação de novos recursos de linguagem no V8, como esses recursos se integram à plataforma da web e o processo de padronização que continua a evoluir a linguagem ECMAScript.

## Rastreamento de wrappers do V8 ao Blink (palestra relâmpago)

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PMDRfYw4UYQ?start=3204" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Duração: 2:31
- [Slides](https://docs.google.com/presentation/d/1I6leiRm0ysSTqy7QWh33Gfp7_y4ngygyM2tDAqdF0fI/edit)

Destaca o rastreamento de wrappers entre objetos do V8 e do Blink e como eles ajudam a prevenir vazamentos de memória e reduzir a latência.
