---
title: "高性能的ES2015及更高版本"
author: "Benedikt Meurer [@bmeurer](https://twitter.com/bmeurer)，ECMAScript性能工程师"
avatars:
  - "benedikt-meurer"
date: 2017-02-17 13:33:37
tags:
  - ECMAScript
description: "V8对于ES2015+语言特性的性能现已与其转译为ES5的对应版本相媲美。"
---
过去几个月里，V8团队专注于使新添加的[ES2015](https://www.ecma-international.org/ecma-262/6.0/)及其他更新的JavaScript特性的性能达到与其转译为[ES5](https://www.ecma-international.org/ecma-262/5.1/)对应版本相当的水平。

<!--truncate-->
## 动机

在深入探讨各种改进细节之前，我们应先考虑为什么ES2015+特性的性能至关重要，尽管[Babel](http://babeljs.io/)在现代Web开发中得到了广泛的使用：

1. 首先，有一些新的ES2015特性只是按需填充，例如[`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)内置方法。当Babel转译[对象展开属性](https://github.com/sebmarkbage/ecmascript-rest-spread)（这些特性被许多[React](https://facebook.github.io/react)和[Redux](http://redux.js.org/)应用广泛使用）时，如果虚拟机支持，它会依赖[`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)，而不是ES5等效实现。
1. 填充ES2015特性通常会增加代码体积，这对当前[Web性能危机](https://channel9.msdn.com/Blogs/msedgedev/nolanlaw-web-perf-crisis)，尤其是在新兴市场常见的移动设备上，造成了显著的影响。因此，仅仅是传输、解析和编译代码的开销可能已经非常高，甚于实际的执行成本。
1. 最后但并非最不重要的是，客户端JavaScript只是依赖于V8引擎的众多环境之一。对于服务器端的应用和工具，也有[Node.js](https://nodejs.org/)，开发者无需转译到ES5代码，而是可以直接使用目标Node.js版本中[相关V8版本](https://nodejs.org/en/download/releases/)支持的特性。

让我们来看看[Redux文档](http://redux.js.org/docs/recipes/UsingObjectSpreadOperator.html)中的以下代码片段：

```js
function todoApp(state = initialState, action) {
  switch (action.type) {
    case SET_VISIBILITY_FILTER:
      return { ...state, visibilityFilter: action.filter };
    default:
      return state;
  }
}
```

该代码中有两项内容需要转译：state的默认参数以及对象字面量中对state的展开。Babel生成了以下ES5代码：

```js
'use strict';

var _extends = Object.assign || function(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};

function todoApp() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialState;
  var action = arguments[1];

  switch (action.type) {
    case SET_VISIBILITY_FILTER:
      return _extends({}, state, { visibilityFilter: action.filter });
    default:
      return state;
  }
}
```

现在想象一下，如果[`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)比Babel生成的填充`_extends`慢了几个数量级。在这种情况下，从一个不支持[`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)的浏览器升级到支持ES2015的浏览器版本将成为严重的性能倒退，并可能阻碍ES2015的实际采用。

这个例子还突出了转译的另一个重要缺点：传递给用户的生成代码通常比开发者最初编写的ES2015+代码大得多。在上面的例子中，原始代码是203个字符（压缩后为176字节），而生成的代码是588个字符（压缩后为367字节）。这是体积增加了两倍的情况。让我们再来看看[异步迭代器](https://github.com/tc39/proposal-async-iteration)提案中的另一个示例：

```js
async function* readLines(path) {
  let file = await fileOpen(path);
  try {
    while (!file.EOF) {
      yield await file.readLine();
    }
  } finally {
    await file.close();
  }
}
```

Babel将这187个字符（150字节压缩后）翻译成了多达2987个字符（971字节压缩后）的ES5代码，这还不包括作为额外依赖所需的[regenerator runtime](https://babeljs.io/docs/plugins/transform-regenerator/)：

```js
'use strict';

var _asyncGenerator = function() {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function(resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };
        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;
        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function(arg) {
            resume('next', arg);
          }, function(arg) {
            resume('throw', arg);
          });
        } else {
          settle(result.done ? 'return' : 'normal', result.value);
        }
      } catch (err) {
        settle('throw', err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case 'return':
          front.resolve({
            value: value,
            done: true
          });
          break;
        case 'throw':
          front.reject(value);
          break;
        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }
      front = front.next;
      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }
    this._invoke = send;
    if (typeof gen.return !== 'function') {
      this.return = undefined;
    }
  }
  if (typeof Symbol === 'function' && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function() {
      return this;
    };
  }
  AsyncGenerator.prototype.next = function(arg) {
    return this._invoke('next', arg);
  };
  AsyncGenerator.prototype.throw = function(arg) {
    return this._invoke('throw', arg);
  };
  AsyncGenerator.prototype.return = function(arg) {
    return this._invoke('return', arg);
  };
  return {
    wrap: function wrap(fn) {
      return function() {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function await (value) {
      return new AwaitValue(value);
    }
  };
}();

var readLines = function () {
  var _ref = _asyncGenerator.wrap(regeneratorRuntime.mark(function _callee(path) {
    var file;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return _asyncGenerator.await(fileOpen(path));

          case 2:
            file = _context.sent;
            _context.prev = 3;

          case 4:
            if (file.EOF) {
              _context.next = 11;
              break;
            }

            _context.next = 7;
            return _asyncGenerator.await(file.readLine());

          case 7:
            _context.next = 9;
            return _context.sent;

          case 9:
            _context.next = 4;
            break;

          case 11:
            _context.prev = 11;
            _context.next = 14;
            return _asyncGenerator.await(file.close());

          case 14:
            return _context.finish(11);

          case 15:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[3,, 11, 15]]);
  }));

  return function readLines(_x) {
    return _ref.apply(this, arguments);
  };
}();
```

这是代码大小增加了**650%**（泛用的`_asyncGenerator`函数可能在打包代码时共享，因此可以通过多次使用异步迭代器来摊销部分成本）。我们认为长期来看，仅仅提供转写到ES5的代码是不可行的，因为大小增加不仅会影响下载时间/成本，还会增加额外的解析和编译开销。如果我们真的想要大幅改善现代网页应用的页面加载速度和响应速度，尤其是在移动设备上，我们必须不仅支持开发人员使用ES2015+编写代码，还要鼓励他们直接使用ES2015+而不是转写到ES5。仅为那些不支持ES2015的旧版浏览器提供完全转写的代码包。对于虚拟机实现者，这一愿景意味着我们需要原生支持ES2015+功能**并且**提供合理的性能。

## 测量方法论

如上所述，目前 ES2015+ 特性的绝对性能表现已经不算是问题了。目前的最高优先级是确保 ES2015+ 特性的性能与其简单的 ES5 实现相当，更重要的是，与 Babel 生成的版本相当。恰好已经有一个名为 [SixSpeed](https://github.com/kpdecker/six-speed) 的项目，由 [Kevin Decker](http://www.incaseofstairs.com/) 开发，它基本上实现了我们所需的功能：对 ES2015 特性与简单的 ES5 和由转译器生成的代码进行性能对比。

![SixSpeed基准测试](/_img/high-performance-es2015/sixspeed.png)

因此，我们决定以此作为我们初步的 ES2015+ 性能工作的基础。我们 [fork了 SixSpeed](https://fhinkel.github.io/six-speed/) 并添加了一些基准测试。我们首先专注于最严重的性能退化问题，具体来说，从简单的 ES5 到推荐的 ES2015+ 版本，性能下降超过 2 倍的部分，因为我们的基本假设是简单的 ES5 版本至少与 Babel 生成的版本性能相当。

## 为现代语言构建现代架构

过去，V8 在优化 ES2015+ 中的语言特性方面遇到了一些困难。例如，为 Crankshaft（V8 的经典优化编译器）添加异常处理（即 try/catch/finally）支持从未变得可行。这导致 V8 在优化类似 for...of 的 ES6 特性（它实际上包含一个隐式的 finally 子句）方面能力有限。Crankshaft 的局限性以及将新语言特性添加到 full-codegen（V8 的基线编译器）中的总体复杂性，使得难以保证新 ES 特性能在标准化后尽快被添加并优化到 V8 中。

幸运的是，Ignition 和 TurboFan（[V8 的新解释器和编译器管线](/blog/test-the-future)）从一开始就设计为支持整个 JavaScript 语言，包括高级控制流、异常处理，以及最新的 `for`-`of` 和 ES2015 的解构赋值。Ignition 和 TurboFan 的架构紧密集成，使得能够快速添加新特性并进行快速和逐步的优化。

我们为现代语言特性实现的许多改进只有在新的 Ignition/TurboFan 管线中才能实现。Ignition 和 TurboFan 在优化生成器和异步函数方面特别关键。生成器早在 V8 中就已被支持，但由于 Crankshaft 中的控制流限制，无法优化。异步函数实际上是生成器之上的语法糖，因此属于同一类别。新的编译器管线利用 Ignition 理解抽象语法树（AST）并生成字节码，将复杂的生成器控制流解糖为更简单的局部控制流字节码。TurboFan 可以更容易地优化生成的字节码，因为它不需要了解生成器控制流的具体内容，只需知道如何在生成器中保存和恢复函数的状态。

![JavaScript生成器在Ignition和TurboFan中的表示方式](/_img/high-performance-es2015/generators.svg)

## 现状

我们的短期目标是尽快将平均性能下降减少到不到2倍。我们首先从表现最差的测试开始，从 Chrome 54 到 Chrome 58（Canary），我们将性能下降超过2倍的测试数量从16个减少到8个，同时将最差性能下降从 Chrome 54 中的19倍降低到 Chrome 58（Canary）中的仅6倍。期间我们还显著减少了平均和中位性能下降值：

![ES2015+与原生等效ES5性能下降对比](/_img/high-performance-es2015/slowdown.svg)

你可以看到 ES2015+ 和 ES5 性能趋于一致的明显趋势。平均来说，相比 ES5，我们的性能提升超过 47%。以下是我们从 Chrome 54 开始解决的一些重要问题。

![ES2015+与简单ES5等效性能对比](/_img/high-performance-es2015/comparison.svg)

最显著的是我们改善了基于迭代的新语言结构的性能，比如扩展运算符、解构赋值以及 `for`-`of` 循环。例如，使用数组解构赋值：

```js
function fn() {
  var [c] = data;
  return c;
}
```

…现在与简单的 ES5 版本一样快：

```js
function fn() {
  var c = data[0];
  return c;
}
```

…而且比 Babel 生成的代码快得多（也更短）：

```js
'use strict';

var _slicedToArray = function() {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;
    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);
        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i['return']) _i['return']();
      } finally {
        if (_d) throw _e;
      }
    }
    return _arr;
  }
  return function(arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError('Invalid attempt to destructure non-iterable instance');
    }
  };
}();

function fn() {
  var _data = data,
      _data2 = _slicedToArray(_data, 1),
      c = _data2[0];

  return c;
}
```

您可以查看我们在上一次[慕尼黑NodeJS用户组](http://www.mnug.de/)聚会上做的[高速ES2015](https://docs.google.com/presentation/d/1wiiZeRQp8-sXDB9xXBUAGbaQaWJC84M5RNxRyQuTmhk)演讲以获取更多详细信息：

我们致力于继续改进ES2015+功能的性能。如果您对技术细节感兴趣，请查看V8的[ES2015及后续性能计划](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)。
