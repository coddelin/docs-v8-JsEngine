---
title: 'V8发布v4.7'
author: 'V8团队'
date: 2015-10-14 13:33:37
tags:
  - 发布
description: 'V8 v4.7减少了内存消耗，并支持新的ES2015语言特性。'
---
大约每六周，我们根据[发布流程](https://v8.dev/docs/release-process)为V8创建一个新的分支。每个版本都从V8的Git主分支中分离出来，时间正好在Chrome分支进入Chrome Beta里程碑之前。今天我们很高兴宣布我们的最新分支，[V8版本4.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.7)，它将处于测试阶段，直到与Chrome 47稳定版协调发布为止。V8 v4.7包含各种面向开发者的功能，因此为了迎接几周后的正式发布，我们想介绍一些亮点。

<!--truncate-->
## 改进的ECMAScript 2015 (ES6)支持

### 剩余操作符

[剩余操作符](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/rest_parameters)使开发者能够将不定数量的参数传递给一个函数。它类似于`arguments`对象。

```js
// 没有使用剩余操作符
function concat() {
  var args = Array.prototype.slice.call(arguments, 1);
  return args.join('');
}

// 使用剩余操作符
function concatWithRest(...strings) {
  return strings.join('');
}
```

## 支持即将推出的ES特性

### `Array.prototype.includes`

[`Array.prototype.includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes)是一个目前处于ES2016第3阶段提案的新特性。它提供了一种简洁的语法，用于通过返回布尔值确定某个元素是否在给定数组中。

```js
[1, 2, 3].includes(3); // true
['apple', 'banana', 'cherry'].includes('apple'); // true
['apple', 'banana', 'cherry'].includes('peach'); // false
```

## 减轻解析时的内存压力

[最近对V8解析器的更改](https://code.google.com/p/v8/issues/detail?id=4392)极大地减少了解析具有大量嵌套函数的文件时所消耗的内存。特别是，这使V8能够运行比以前更大的asm.js模块。

## V8 API

请查看我们的[API更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。该文档会在每个主要版本发布几周后定期更新。拥有[活跃的V8检出](https://v8.dev/docs/source-code#using-git)的开发者可以使用`git checkout -b 4.7 -t branch-heads/4.7`来尝试V8 v4.7中的新特性。或者，您可以[订阅Chrome的Beta频道](https://www.google.com/chrome/browser/beta.html)，并很快亲自尝试新特性。
