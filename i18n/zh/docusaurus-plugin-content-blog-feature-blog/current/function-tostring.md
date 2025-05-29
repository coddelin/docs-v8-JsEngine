---
title: '修订 `Function.prototype.toString`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-03-25
tags:
  - ECMAScript
  - ES2019
description: 'Function.prototype.toString 现在会返回源码文本的精确部分，包括空格和注释。'
---
[`Function.prototype.toString()`](https://tc39.es/Function-prototype-toString-revision/) 现在会返回源码文本的精确部分，包括空格和注释。以下是旧行为与新行为的对比示例：

<!--truncate-->
```js
// 注意 `function` 关键字与函数名称之间的注释
// 以及函数名称后的空格。
function /* 注释 */ foo () {}

// 之前，在 V8 中：
foo.toString();
// → 'function foo() {}'
//             ^ 无注释
//                ^ 无空格

// 现在：
foo.toString();
// → 'function /* 注释 */ foo () {}'
```

## 特性支持

<feature-support chrome="66 /blog/v8-release-66#function-tostring"
                 firefox="yes"
                 safari="no"
                 nodejs="8"
                 babel="no"></feature-support>
