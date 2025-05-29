---
title: 'V8发布v4.5'
author: 'V8团队'
date: 2015-07-17 13:33:37
tags:
  - 发布
description: 'V8 v4.5带来了性能提升，并增加了对多个ES2015特性的支持。'
---
大约每六周，我们会根据[发布流程](https://v8.dev/docs/release-process)创建一个新的V8分支。每个版本都是在Chrome为Chrome Beta里程碑分支之前从V8的Git主分支派生出来的。今天，我们很高兴地宣布最新的分支，[V8版本4.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.5)，这个版本将在Beta阶段，直到和Chrome 45稳定版同步发布。V8 v4.5包含了各种面向开发者的精彩内容，因此在几周后的发布之前，我们希望预览一些亮点。

<!--truncate-->
## 改进的ECMAScript 2015 (ES6)支持

V8 v4.5增加了对几个[ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/)特性的支持。

### 箭头函数

通过[箭头函数](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/Arrow_functions)，可以编写更简洁的代码。

```js
const data = [0, 1, 3];
// 没有使用箭头函数的代码
const convertedData = data.map(function(value) { return value * 2; });
console.log(convertedData);
// 使用箭头函数的代码
const convertedData = data.map(value => value * 2);
console.log(convertedData);
```

“this”的词法绑定是箭头函数的另一个主要优势。因此，在方法中使用回调变得更加简单。

```js
class MyClass {
  constructor() { this.a = '你好，'; }
  hello() { setInterval(() => console.log(this.a + '世界！'), 1000); }
}
const myInstance = new MyClass();
myInstance.hello();
```

### 数组/TypedArray函数

在V8 v4.5中，[ES2015](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array#Methods)规范中定义的所有新方法都得到了支持，它们使操作数组和TypedArrays更加方便。新增的方法包括`Array.from`和`Array.of`，还添加了许多在各种TypedArray类型上镜像`Array`方法的功能。

### `Object.assign`

[`Object.assign`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)让开发者可以快速合并和克隆对象。

```js
const target = { a: '你好，' };
const source = { b: '世界！' };
// 合并对象。
Object.assign(target, source);
console.log(target.a + target.b);
```

此功能也可以用于混合功能。

## 更多JavaScript语言特性是“可优化的”

多年来，V8的传统优化编译器[Crankshaft](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)一直擅长优化许多常见的JavaScript模式。然而，它从未能够支持完整的JavaScript语言，在函数中使用某些语言特性（如`try`/`catch`和`with`）会阻止其被优化。V8不得不退回到较慢的基线编译器来处理该函数。

V8的新优化编译器[TurboFan](/blog/turbofan-jit)的设计目标之一是最终能够优化全部JavaScript，包括ECMAScript 2015特性。在V8 v4.5中，我们开始使用TurboFan优化一些Crankshaft不支持的语言特性，例如`for`-`of`、`class`、`with`和计算属性名称。

以下是使用`for-of`的代码示例，它现在可以由TurboFan编译：

```js
const sequence = ['第一', '第二', '第三'];
for (const value of sequence) {
  // 此作用域现已可优化。
  const object = {a: '你好，', b: '世界！', c: value};
  console.log(object.a + object.b + object.c);
}
```

尽管初期使用这些语言特性的函数不会像Crankshaft编译的其他代码达到同样的最佳性能，但TurboFan现在可以将其速度提升至远超当前的基线编译器。更好的是，随着我们开发更多TurboFan优化，性能将继续快速提高。

## V8 API

请查看我们的[API变更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文档将在每次主要发布后的几周内定期更新。

拥有[活动V8检出](https://v8.dev/docs/source-code#using-git)的开发者可以使用`git checkout -b 4.5 -t branch-heads/4.5`来尝试V8 v4.5中的新特性。或者你可以[订阅Chrome的Beta频道](https://www.google.com/chrome/browser/beta.html)，并很快自己尝试这些新功能。
