---
title: "Выпуск V8 версии v9.6"
author: "Ингвар Степанян ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-10-13
tags:
 - release
description: "Выпуск V8 v9.6 добавляет поддержку Reference Types для WebAssembly."
tweet: "1448262079476076548"
---
Каждые четыре недели мы создаем новую ветку V8 в рамках нашего [процесса выпуска](https://v8.dev/docs/release-process). Каждая версия ветвится от master-ветки V8 прямо перед выходом бета-версии Chrome. Сегодня мы рады представить нашу новую ветку, [V8 версия 9.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.6), которая находится в стадии бета-тестирования до ее выпуска в стабильной версии Chrome 96 через несколько недель. V8 v9.6 наполнена разнообразными интересными новинками для разработчиков. В этом посте представлен обзор ключевых моментов в преддверии выпуска.

<!--truncate-->
## WebAssembly

### Reference Types

[Предложение Reference Types](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md), выпущенное в V8 v9.6, позволяет использовать внешние ссылки из JavaScript непрозрачно в модулях WebAssembly. Тип данных `externref` (ранее известный как `anyref`) предоставляет безопасный способ хранения ссылки на объект JavaScript и полностью интегрирован с сборщиком мусора V8.

Некоторые инструментарии, уже имеющие опциональную поддержку reference types, — это [wasm-bindgen для Rust](https://rustwasm.github.io/wasm-bindgen/reference/reference-types.html) и [AssemblyScript](https://www.assemblyscript.org/compiler.html#command-line-options).

## API V8

Пожалуйста, используйте `git log branch-heads/9.5..branch-heads/9.6 include/v8\*.h`, чтобы получить список изменений API.

Разработчики с активным репозиторием V8 могут использовать `git checkout -b 9.6 -t branch-heads/9.6`, чтобы протестировать новые функции V8 v9.6. Кроме того, вы можете [подписаться на бета-канал Chrome](https://www.google.com/chrome/browser/beta.html) и вскоре испытать новые функции самостоятельно.
