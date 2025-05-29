---
title: &apos;Suporte a recursos&apos;
permalink: /features/support/
layout: layouts/base.njk
description: &apos;Este documento explica as listas de suporte a recursos das linguagens JavaScript e WebAssembly usadas no site do V8.&apos;
---
# Suporte a recursos JavaScript/Wasm

[Nossos explicadores de recursos das linguagens JavaScript e WebAssembly](/features) frequentemente incluem listas de suporte a recursos como a seguinte:

<feature-support chrome="71"
                 firefox="65"
                 safari="12"
                 nodejs="12"
                 babel="yes"></feature-support>

Um recurso sem nenhum suporte ficaria assim:

<feature-support chrome="no"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

Para recursos de ponta, é comum ver suporte misto entre os ambientes:

<feature-support chrome="partial"
                 firefox="yes"
                 safari="yes"
                 nodejs="no"
                 babel="yes"></feature-support>

O objetivo é fornecer uma visão geral rápida da maturidade de um recurso, não apenas no V8 e Chrome, mas em todo o ecossistema JavaScript. Observe que isso não se limita a implementações nativas em VMs de JavaScript desenvolvidas ativamente, como o V8, mas também inclui suporte de ferramentas, representado aqui usando o ícone do [Babel](https://babeljs.io/).

<!--truncate-->
A entrada do Babel cobre vários significados:

- Para recursos sintáticos da linguagem, como [campos de classe](/features/class-fields), refere-se ao suporte de transpilação.
- Para recursos da linguagem que são novas APIs, como [`Promise.allSettled`](/features/promise-combinators#promise.allsettled), refere-se ao suporte de polyfill. (O Babel oferece polyfills por meio do [projeto core-js](https://github.com/zloirock/core-js).)

O logotipo do Chrome representa o V8, Chromium e qualquer navegador baseado em Chromium.
