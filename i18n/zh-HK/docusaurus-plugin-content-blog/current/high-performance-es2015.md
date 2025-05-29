---
title: '高效能 ES2015 與後續進階'
author: 'Benedikt Meurer [@bmeurer](https://twitter.com/bmeurer), ECMAScript 效能工程師'
avatars:
  - 'benedikt-meurer'
date: 2017-02-17 13:33:37
tags:
  - ECMAScript
description: 'V8 對 ES2015+ 語言功能的效能表現如今已與其編譯後的 ES5 對應功能相當。'
---
過去幾個月中，V8 團隊致力於提升新加入的 [ES2015](https://www.ecma-international.org/ecma-262/6.0/) 及其他更最新的 JavaScript 功能效能，使其能與編譯後的 [ES5](https://www.ecma-international.org/ecma-262/5.1/) 對應功能相媲美。

<!--truncate-->
## 動機

在我們深入探討各項改進細節之前，首先需要了解為何 ES2015+ 功能效能至關重要，即使目前網頁開發中廣泛使用 [Babel](http://babeljs.io/)：

1. 首先，有一些新的 ES2015 功能僅在需要時進行填補（polyfill），例如內建的 [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)。當 Babel 編譯 [物件展開屬性](https://github.com/sebmarkbage/ecmascript-rest-spread)（此功能在許多 [React](https://facebook.github.io/react) 與 [Redux](http://redux.js.org/) 應用中被大量使用）時，如果虛擬機器支持 [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)，則會使用此功能，取代相應的 ES5 方法。
1. 填補 ES2015 功能通常會增加程式碼大小，這對於目前的 [網頁效能危機](https://channel9.msdn.com/Blogs/msedgedev/nolanlaw-web-perf-crisis)尤其在新興市場常見的行動裝置上影響很大。因此，僅僅是傳遞、解析及編譯程式碼的成本可能就相當高，甚至在執行真正的程式碼之前。
1. 再者，客戶端的 JavaScript 僅是依賴 V8 引擎的一個環境。此外，還有用於伺服器端應用程式及工具的 [Node.js](https://nodejs.org/)，開發者可以直接使用目標 Node.js 版本中的 [相關 V8 版本](https://nodejs.org/en/download/releases/)支持的功能，而無需將程式碼編譯為 ES5。

讓我們看看 [Redux 文件](http://redux.js.org/docs/recipes/UsingObjectSpreadOperator.html)中的以下程式碼片段：

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

以上程式碼有兩個需要編譯的地方：用於 state 的預設參數以及將 state 展開至物件字面值中。Babel 生成以下 ES5 程式碼：

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

假設 [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) 比 Babel 生成的填補 `_extends` 慢很多倍。在這種情況下，從不支持 [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) 的瀏覽器升級到支持 ES2015 的瀏覽器版本將導致嚴重的效能回退，可能進一步阻礙 ES2015 在實際中的採用。

此例子還凸顯了一個編譯的主要缺點：開發者最初撰寫的 ES2015+ 程式碼通常比生成並傳遞給用戶的程式碼要小得多。在上述例子中，原始程式碼為 203 字元（176 bytes gzip 壓縮），而生成程式碼為 588 字元（367 bytes gzip 壓縮）。大小是兩倍增長。再看看來自 [非同步迭代器](https://github.com/tc39/proposal-async-iteration) 提案的另一個例子：

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

Babel 將這 187 個字元（150 字節壓縮）翻譯成 ES5 代碼，加上 [regenerator 執行環境](https://babeljs.io/docs/plugins/transform-regenerator/) 的額外依賴，竟然高達 2987 個字元（971 字節壓縮）：

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

這是一個 **650%** 的大小增長（通用的 `_asyncGenerator` 函數可能可以共享，取決於你如何打包代碼，因此可以在多次使用非同步迭代器時將部分成本分攤）。我們認為長期來看僅傳輸轉譯為 ES5 的代碼並不是可行的，因為大小增長不僅會影響下載時間/成本，還會增加解析和編譯的額外負擔。如果我們真的想要大幅改善現代網頁應用的頁面加載速度和流暢度，尤其是在行動裝置上，我們必須鼓勵開發者寫代碼時不僅使用 ES2015+，還要直接傳輸這些代碼，而不是轉譯成 ES5。僅向不支援 ES2015 的老舊瀏覽器提供完全轉譯的打包代碼。對於虛擬機實現者來說，這種願景意味著我們需要原生支援 ES2015+ 特性 **並且** 提供合理的效能。

## 測量方法

如上所述，ES2015+特性的絕對性能在此刻並非真正的問題。目前的最高優先事項是確保ES2015+特性的性能與其簡單的ES5版本一致，更重要的是與由Babel生成的版本一致。方便的是，已經有一個名為[SixSpeed](https://github.com/kpdecker/six-speed)的項目，由[Kevin Decker](http://www.incaseofstairs.com/)創建，該項目基本上正是我們需要的：ES2015特性與簡單ES5以及由編譯器生成代碼的性能比較。

![SixSpeed基準測試](/_img/high-performance-es2015/sixspeed.png)

因此我們決定以此為基礎開展初步的ES2015+性能工作。我們[分支了SixSpeed](https://fhinkel.github.io/six-speed/)並添加了一些基準測試。我們首先關注最嚴重的退化，即從簡單ES5到推薦的ES2015+版本的減速超過2倍的項目，因為我們的基本假設是簡單的ES5版本至少與Babel生成的符合規範版本一樣快。

## 現代語言的現代架構

過去V8在優化ES2015+中找到的那類語言特性上存在困難。例如，為Crankshaft（V8的經典優化編譯器）添加異常處理（即try/catch/finally）支持從來不是可行的選擇。這意味著V8在優化ES6特性如for...of（其基本上具有隱式finally子句）方面的能力有限。Crankshaft的限制以及向full-codegen（V8的基線編譯器）添加新語言特性的整體複雜性，使得很難在V8中快速標準化並優化新ES特性。

幸運的是，Ignition和TurboFan（[V8的新解釋器和編譯器管道](/blog/test-the-future)）從一開始就被設計為支持整個JavaScript語言，包括先進的控制流、異常處理，以及最近的`for`-`of`和ES2015的解構賦值。Ignition和TurboFan架構的緊密集成使得可以快速添加新特性並快速且逐步優化它們。

我們在現代語言特性中的許多改進只有在新的Ignition/TurboFan管道中才可行。Ignition和TurboFan特別關鍵，能優化生成器和async函數。生成器早已被V8支持，但由於Crankshaft中的控制流限制未能被優化。Async函數本質上是生成器之上的糖衣，因此屬於同一類。新的編譯器管道利用Ignition來理解AST並生成字節碼，將復雜的生成器控制流解糖為更簡單的本地控制流字節碼。TurboFan更容易優化生成的字節碼，因為它不需要知道關於生成器控制流的具體細節，只需要知道如何在yield時保存和恢復函數的狀態。

![JavaScript生成器在Ignition和TurboFan中的表示方式](/_img/high-performance-es2015/generators.svg)

## 現狀概述

我們的短期目標是儘快達到平均減速不到2倍的水準。我們首先查看最差的測試，並從Chrome 54到Chrome 58（Canary）期間，我們成功地將減速超過2倍的測試項目數從16減少到8，同時將最差減速從Chrome 54中的19倍減少到Chrome 58（Canary）中的僅6倍。我們也在此期間顯著減少了平均和中位減速率：

![ES2015+相較於天然ES5等效項目的減速情況](/_img/high-performance-es2015/slowdown.svg)

您可以看到ES2015+與ES5之間明顯的性能趨近。在平均上，我們相較於ES5的性能提升超過了47%。以下是我們從Chrome 54開始解決的一些亮點。

![ES2015+性能相較於簡單ES5等效項目](/_img/high-performance-es2015/comparison.svg)

最值得注意的是，我們提升了基於迭代的新語言結構的性能，例如展開運算符、解構賦值和`for`-`of`循環。例如，使用數組解構賦值：

```js
function fn() {
  var [c] = data;
  return c;
}
```

…現在和簡單的ES5版本一樣快：

```js
function fn() {
  var c = data[0];
  return c;
}
```

…並且比Babel生成的代碼快很多（而且更短）：

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

您可以查看我們在上次 [Munich NodeJS User Group](http://www.mnug.de/) 聚會中進行的[High-Speed ES2015](https://docs.google.com/presentation/d/1wiiZeRQp8-sXDB9xXBUAGbaQaWJC84M5RNxRyQuTmhk) 演講以獲取更多詳細資訊：

我們致力於持續改進 ES2015+ 功能的性能。如果您對詳細資訊感興趣，可以查看 V8 的 [ES2015 and beyond performance plan](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)。
