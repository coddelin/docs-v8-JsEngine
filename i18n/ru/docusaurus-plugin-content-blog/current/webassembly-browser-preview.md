---
title: "Веб-просмотр WebAssembly"
author: "Команда V8"
date: "2016-10-31 13:33:37"
tags: 
  - WebAssembly
description: "WebAssembly или Wasm — это новая среда выполнения и цель компиляции для веба, теперь доступная за флагом в Chrome Canary!"
---
Сегодня мы рады объявить совместно с [Firefox](https://hacks.mozilla.org/2016/10/webassembly-browser-preview) и [Edge](https://blogs.windows.com/msedgedev/2016/10/31/webassembly-browser-preview/) о веб-просмотре WebAssembly. [WebAssembly](http://webassembly.org/) или Wasm — это новая среда выполнения и цель компиляции для веба, разработанная совместно специалистами из Google, Mozilla, Microsoft, Apple и [W3C WebAssembly Community Group](https://www.w3.org/community/webassembly/).

<!--truncate-->
## Что означает данный этап?

Этот этап значим, поскольку он отмечает:

- кандидат на выпуск нашей [MVP](http://webassembly.org/docs/mvp/) (минимально жизнеспособный продукт) разработки (включая [семантику](http://webassembly.org/docs/semantics/), [бинарный формат](http://webassembly.org/docs/binary-encoding/) и [JS API](http://webassembly.org/docs/js/))
- совместимые и стабильные реализации WebAssembly за флагом в trunk в V8 и SpiderMonkey, в сборках для разработки Chakra и на стадии разработки в JavaScriptCore
- [рабочий инструмент](http://webassembly.org/getting-started/developers-guide/) для разработчиков для компиляции модулей WebAssembly из исходных файлов C/C++
- [дорожную карту](http://webassembly.org/roadmap/) для включения WebAssembly по умолчанию, при условии изменений на основе обратной связи от сообщества

Вы можете узнать больше о WebAssembly на [сайте проекта](http://webassembly.org/), а также следовать нашему [руководству для разработчиков](http://webassembly.org/getting-started/developers-guide/) для тестирования компиляции WebAssembly из C и C++ с использованием Emscripten. Документы по [бинарному формату](http://webassembly.org/docs/binary-encoding/) и [JS API](http://webassembly.org/docs/js/) описывают бинарное кодирование WebAssembly и механизм создания модулей WebAssembly в браузере соответственно. Вот простой пример того, как выглядит wasm:

![Реализация функции Наибольшего Общего Делителя в WebAssembly, показывающая необработанные байты, текстовый формат (WAST) и исходный код на C.](/_img/webassembly-browser-preview/gcd.svg)

Поскольку WebAssembly все еще доступен за флагом в Chrome ([chrome://flags/#enable-webassembly](chrome://flags/#enable-webassembly)), его пока не рекомендуют использовать в производственных целях. Однако период веб-просмотра является временем, когда активно собирается [обратная связь](http://webassembly.org/community/feedback/) по дизайну и реализации спецификации. Разработчиков призывают тестировать компиляцию и перенос приложений, а также запускать их в браузере.

V8 продолжает оптимизировать реализацию WebAssembly в [компиляторе TurboFan](/blog/turbofan-jit). С марта прошлого года, когда мы впервые объявили об экспериментальной поддержке, мы добавили поддержку параллельной компиляции. Кроме того, мы близки к завершению альтернативного asm.js пайплайна, который преобразует asm.js в WebAssembly [под капотом](https://www.chromestatus.com/feature/5053365658583040), так что существующие сайты на asm.js смогут получить преимущества компиляции WebAssembly до выполнения.

## Что дальше?

Если не будет существенных изменений дизайна, возникающих из обратной связи сообщества, группа WebAssembly Community планирует создать официальную спецификацию в первом квартале 2017 года, после чего браузерам будет рекомендовано включить WebAssembly по умолчанию. С этого момента бинарный формат будет сброшен до версии 1, а WebAssembly станет бесверсийным, протестированным на наличие функций и обратно совместимым. Более подробная [дорожная карта](http://webassembly.org/roadmap/) доступна на сайте проекта WebAssembly.
