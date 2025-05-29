---
title: 'Обновленный `Function.prototype.toString`'
author: 'Матиас Биненс ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-03-25
tags:
  - ECMAScript
  - ES2019
description: 'Function.prototype.toString теперь возвращает точно такие же фрагменты текста исходного кода, включая пробелы и комментарии.'
---
[`Function.prototype.toString()`](https://tc39.es/Function-prototype-toString-revision/) теперь возвращает точно такие же фрагменты текста исходного кода, включая пробелы и комментарии. Вот пример, сравнивающий старое и новое поведение:

<!--truncate-->
```js
// Обратите внимание на комментарий между ключевым словом `function`
// и именем функции, а также на пробел после
// имени функции.
function /* комментарий */ foo () {}

// Ранее, в V8:
foo.toString();
// → 'function foo() {}'
//             ^ комментарий отсутствует
//                ^ пробел отсутствует

// Теперь:
foo.toString();
// → 'function /* комментарий */ foo () {}'
```

## Поддержка функции

<feature-support chrome="66 /blog/v8-release-66#function-tostring"
                 firefox="yes"
                 safari="no"
                 nodejs="8"
                 babel="no"></feature-support>
