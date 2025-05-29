---
title: "Хорошо сформированный `JSON.stringify`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-09-11
tags:
  - ECMAScript
  - ES2019
description: "JSON.stringify теперь выводит экранированные последовательности для одиночных суррогатов, что делает его вывод валидным Unicode (и представимым в UTF-8)."
---
`JSON.stringify` ранее был определен так, что возвращал некорректные строки Unicode, если входные данные содержали одиночные суррогаты:

```js
JSON.stringify('\uD800');
// → '"�"'
```

[Предложение «хорошо сформированного `JSON.stringify`»](https://github.com/tc39/proposal-well-formed-stringify) изменяет `JSON.stringify`, чтобы он выводил экранированные последовательности для одиночных суррогатов, делая его вывод валидным Unicode (и представимым в UTF-8):

<!--truncate-->
```js
JSON.stringify('\uD800');
// → '"\\ud800"'
```

Обратите внимание, что `JSON.parse(stringified)` все еще производит те же результаты, что и раньше.

Эта функция — небольшое исправление, которое давно назрело в JavaScript. Это еще одна вещь, о которой не нужно беспокоиться разработчику JavaScript. В сочетании с [_JSON ⊂ ECMAScript_](/features/subsume-json) это позволяет безопасно встраивать данные, сериализованные через JSON, как литералы в программы на JavaScript и записывать сгенерированный код на диск в любой совместимый с Unicode формат кодировки (например, UTF-8). Это очень полезно для [случаев использования метапрограммирования](/features/subsume-json#embedding-json).

## Поддержка функции

<feature-support chrome="72 /blog/v8-release-72#well-formed-json.stringify"
                 firefox="64"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-json"></feature-support>
