---
title: 'Поддержка функций'
permalink: /features/support/
layout: layouts/base.njk
description: 'Этот документ объясняет списки поддержки функций языка JavaScript и WebAssembly, используемые на сайте V8.'
---
# Поддержка функций JavaScript/Wasm

[Наши объяснения функций JavaScript и WebAssembly](/features) часто включают списки поддержки функций, как показано ниже:

<feature-support chrome="71"
                 firefox="65"
                 safari="12"
                 nodejs="12"
                 babel="yes"></feature-support>

Функция без какой-либо поддержки будет выглядеть так:

<feature-support chrome="no"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

Для передовых функций часто бывает смешанная поддержка в различных средах:

<feature-support chrome="partial"
                 firefox="yes"
                 safari="yes"
                 nodejs="no"
                 babel="yes"></feature-support>

Цель — предоставить быстрый обзор зрелости функции не только в V8 и Chrome, но и во всей экосистеме JavaScript. Обратите внимание, что это не ограничивается нативными реализациями в активно разрабатываемых JavaScript-VM, таких как V8, но также включает поддержку инструментов, представленную здесь с помощью иконки [Babel](https://babeljs.io/).

<!--truncate-->
Запись Babel охватывает различные значения:

- Для синтаксических функций языка, таких как [class fields](/features/class-fields), это относится к поддержке транспиляции.
- Для функций языка, которые являются новыми API, такими как [`Promise.allSettled`](/features/promise-combinators#promise.allsettled), это относится к поддержке полифиллов. (Babel предлагает полифиллы через [проект core-js](https://github.com/zloirock/core-js).)

Логотип Chrome представляет V8, Chromium и любые браузеры на основе Chromium.
