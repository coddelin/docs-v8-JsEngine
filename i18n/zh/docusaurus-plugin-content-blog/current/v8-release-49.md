---
title: "V8 发布 v4.9"
author: "V8团队"
date: 2016-01-26 13:33:37
tags:
  - 发布
description: "V8 v4.9 带来了改进的 `Math.random` 实现，并增加了对多个新的 ES2015 语言功能的支持。"
---
大约每六周，我们会创建一个新的 V8 分支，作为 [发布流程](/docs/release-process) 的一部分。每个版本都会在 Chrome 为 Chrome Beta 里程碑分支之前立即从 V8 的 Git 主分支派生。今天我们很高兴地宣布我们的最新分支，[V8 版本 4.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.9)，该分支将在与 Chrome 49 稳定版同步发布之前处于 Beta 阶段。V8 4.9 充满了各种面向开发者的功能，因此在未来几周发布之前，我们希望为您预览一些亮点。

<!--truncate-->
## 91% ECMAScript 2015 (ES6) 支持

在 V8 v4.9 发布中，我们发布了比任何以前版本更多的 JavaScript ES2015 功能，根据 [Kangax 兼容性表](https://kangax.github.io/compat-table/es6/) (截至 1 月 26 日)，完成率达到了 91%。V8 现在支持解构赋值、默认参数、Proxy 对象和 Reflect API。版本 4.9 还使得诸如 `class` 和 `let` 等块级结构能够在非严格模式下使用，并增加了对正则表达式粘性标志和可自定义的 `Object.prototype.toString` 输出的支持。

### 解构赋值

变量声明、参数和赋值现在支持通过模式对对象和数组进行 [解构](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)。例如：

```js
const o = {a: [1, 2, 3], b: {p: 4}, c: {q: 5}};
let {a: [x, y], b: {p}, c, d} = o;              // x=1, y=2, p=4, c={q: 5}
[x, y] = [y, x];                                // x=2, y=1
function f({a, b}) { return [a, b]; }
f({a: 4});                                      // [4, undefined]
```

数组模式可以包含剩余模式，这些模式会被分配剩余的数组元素：

```js
const [x, y, ...r] = [1, 2, 3, 4];              // x=1, y=2, r=[3,4]
```

此外，模式元素可以设置默认值，用于在相应属性没有匹配时使用：

```js
const {a: x, b: y = x} = {a: 4};                // x=4, y=4
// 或…
const [x, y = 0, z = 0] = [1, 2];               // x=1, y=2, z=0
```

解构赋值可以用于使从对象和数组中访问数据更紧凑。

### Proxy和Reflect

经过多年的开发，V8 现在具备与 ES2015 规范一致的完整 [Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 实现。Proxy 是一种强大的机制，用于通过开发者提供的一组钩子自定义属性访问来虚拟化对象和函数。除了对象虚拟化之外，Proxy 还可以用于实现拦截、为属性设置添加验证、简化调试和分析，以及解锁高级抽象如 [membranes](http://tvcutsem.github.io/js-membranes/)。

要代理一个对象，需要创建一个处理器占位对象来定义各种陷阱，并将其应用于 Proxy 要虚拟化的目标对象：

```js
const target = {};
const handler = {
  get(target, name='world') {
    return `Hello, ${name}!`;
  }
};

const foo = new Proxy(target, handler);
foo.bar;
// → 'Hello, bar!'
```

Proxy 对象带有 Reflect 模块，该模块为所有代理陷阱定义了合适的默认行为：

```js
const debugMe = new Proxy({}, {
  get(target, name, receiver) {
    console.log(`调试: get调用字段: ${name}`);
    return Reflect.get(target, name, receiver);
  },
  set(target, name, value, receiver) {
    console.log(`调试: set调用字段: ${name}, 并设置值: ${value}`);
    return Reflect.set(target, name, value, receiver);
  }
});

debugMe.name = 'John Doe';
// 调试: set调用字段: name, 并设置值: John Doe
const title = `Mr. ${debugMe.name}`; // → 'Mr. John Doe'
// 调试: get调用字段: name
```

有关 Proxy 和 Reflect API 用法的更多信息，请参阅 [MDN Proxy 页面](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy#Examples) 的示例部分。

### 默认参数

在 ES5 及以下版本中，函数定义中的可选参数需要使用样板代码来检查参数是否未定义：

```js
function sublist(list, start, end) {
  if (typeof start === 'undefined') start = 0;
  if (typeof end === 'undefined') end = list.length;
  ...
}
```

ES2015 现在允许函数参数具有 [默认值](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/Default_parameters)，提供了更清晰和更简洁的函数定义：

```js
function sublist(list, start = 0, end = list.length) { … }
sublist([1, 2, 3], 1);
// sublist([1, 2, 3], 1, 3)
```

默认参数和解构当然可以结合使用：

```js
function vector([x, y, z] = []) { … }
```

### 类 & 松散模式中的词法声明

V8自版本4.1和4.2起分别支持词法声明（`let`，`const`，块级局部`function`）和类，但迄今为止需要使用严格模式才能使用它们。从V8版本4.9开始，根据ES2015规范，这些功能在非严格模式下也可以使用。这使得在DevTools控制台中进行原型开发更加方便，尽管我们通常鼓励开发者为新代码升级到严格模式。

### 正则表达式

V8现在支持正则表达式的新[粘滞标志](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky)。粘滞标志切换搜索是在字符串开头（常规）还是从`lastIndex`属性开始（粘滞）。这种行为对于高效解析任意长的输入字符串以及使用多个不同的正则表达式非常有用。要启用粘滞搜索，只需在正则表达式中添加`y`标志：（例如：`const regex = /foo/y;`）。

### 可自定义的 `Object.prototype.toString` 输出

使用 `Symbol.toStringTag`，用户自定义类型现在可以在传递给 `Object.prototype.toString`（无论是直接还是作为字符串强制转换的结果）时返回自定义的输出：

```js
class Custom {
  get [Symbol.toStringTag]() {
    return 'Custom';
  }
}
Object.prototype.toString.call(new Custom);
// → '[object Custom]'
String(new Custom);
// → '[object Custom]'
```

## 改进的 `Math.random()`

V8 v4.9改进了`Math.random()`的实现。[如上月公告所示](/blog/math-random)，我们将V8的伪随机数生成器算法切换为[xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf)，以提供更高质量的伪随机性。

## V8 API

请查看我们的[API更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。该文档通常会在每次主要版本发布几周后定期更新。

拥有[活动的V8检出副本](https://v8.dev/docs/source-code#using-git)的开发者可以使用`git checkout -b 4.9 -t branch-heads/4.9`来试验V8 v4.9中的新功能。或者，您可以订阅[Chrome的Beta频道](https://www.google.com/chrome/browser/beta.html)，并很快自行尝试新功能。
