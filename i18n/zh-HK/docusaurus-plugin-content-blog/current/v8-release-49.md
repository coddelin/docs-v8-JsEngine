---
title: 'V8 發佈 v4.9'
author: 'V8 團隊'
date: 2016-01-26 13:33:37
tags:
  - 發佈
description: 'V8 v4.9 帶來改進的 `Math.random` 實現，並新增對多個 ES2015 語言功能的支持。'
---
大約每六週，我們會根據 [發佈流程](/docs/release-process) 創建 V8 的新分支。每個版本均從 V8 的 Git 主分支分支出來，正好在 Chrome 分支到 Chrome Beta 里程碑之前。今天我們很高興宣布我們最新的分支 [V8 版本 4.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.9)，該版本將進入 Beta，直到與 Chrome 49 Stable 協調釋出為止。V8 4.9 包含各種面向開發者的更新，因此我們希望在幾周後發佈之前為您提供一些亮點預覽。

<!--truncate-->
## 91% ECMAScript 2015 (ES6) 支持

在 V8 發佈 4.9 中，我們釋出了更多的 JavaScript ES2015 功能，這比任何之前的版本都要多，使我們的完成度達到 91%，如 [Kangax 相容性表](https://kangax.github.io/compat-table/es6/)（截至 1 月 26 日）所測量的那樣。V8 現在支持解構賦值、默認參數、Proxy 對象和 Reflect API。版本 4.9 還使得 `class` 和 `let` 等塊級構造在非嚴格模式下可用，並增加了對正則表達式的粘性標誌和可自定義的 `Object.prototype.toString` 輸出的支持。

### 解構賦值

現在變量聲明、參數和賦值都支持通過模式進行對象和數組的[解構賦值](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)。例如：

```js
const o = {a: [1, 2, 3], b: {p: 4}, c: {q: 5}};
let {a: [x, y], b: {p}, c, d} = o;              // x=1, y=2, p=4, c={q: 5}
[x, y] = [y, x];                                // x=2, y=1
function f({a, b}) { return [a, b]; }
f({a: 4});                                      // [4, undefined]
```

數組模式可以包含餘數模式，這將分配數組的剩餘部分：

```js
const [x, y, ...r] = [1, 2, 3, 4];              // x=1, y=2, r=[3,4]
```

此外，模式元素可以被賦予默認值，在相應的屬性沒有匹配時使用默認值：

```js
const {a: x, b: y = x} = {a: 4};                // x=4, y=4
// 或…
const [x, y = 0, z = 0] = [1, 2];               // x=1, y=2, z=0
```

解構賦值可以用來使訪問對象和數組中的數據更加簡潔。

### Proxy 和 Reflect

經過多年的開發，V8 現在附帶了一個完整的 [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 實現，並與 ES2015 規範保持一致。Proxy 是一種強大的機制，可以通過一組由開發者提供的鉤子定制屬性訪問來虛擬化對象和函數。除了對象虛擬化外，Proxy 還可用於實現攔截、為屬性設置添加驗證、簡化調試和剖析，以及解鎖類似 [膜](http://tvcutsem.github.io/js-membranes/) 的高級抽象。

要代理一個對象，您需要創建一個定義各種陷阱的處理器占位對象，並將其應用到 Proxy 所虛擬化的目標對象：

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

Proxy 對象伴隨著 Reflect 模塊，該模塊為所有代理陷阱定義了合適的默認值：

```js
const debugMe = new Proxy({}, {
  get(target, name, receiver) {
    console.log(`Debug: get called for field: ${name}`);
    return Reflect.get(target, name, receiver);
  },
  set(target, name, value, receiver) {
    console.log(`Debug: set called for field: ${name}, and value: ${value}`);
    return Reflect.set(target, name, value, receiver);
  }
});

debugMe.name = 'John Doe';
// Debug: set called for field: name, and value: John Doe
const title = `Mr. ${debugMe.name}`; // → 'Mr. John Doe'
// Debug: get called for field: name
```

有關 Proxy 和 Reflect API 的使用更多信息，請參見 [MDN Proxy 頁面](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#Examples) 的示例部分。

### 默認參數

在 ES5 及以下版本中，功能定義中的可選參數需要使用樣板代碼檢查參數是否為未定義：

```js
function sublist(list, start, end) {
  if (typeof start === 'undefined') start = 0;
  if (typeof end === 'undefined') end = list.length;
  ...
}
```

ES2015 現在允許功能參數具有[默認值](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters)，提供更加清晰和簡潔的函數定義：

```js
function sublist(list, start = 0, end = list.length) { … }
sublist([1, 2, 3], 1);
// sublist([1, 2, 3], 1, 3)
```

預設參數可以與解構搭配使用，當然：

```js
function vector([x, y, z] = []) { … }
```

### 類別與在寬鬆模式中的詞法聲明

自 V8 4.1 和 4.2 版本開始，V8 已支援詞法聲明（`let`、`const`、區塊級別的 `function`）以及類別，但目前為止使用這些功能仍需嚴格模式。自 V8 4.9 版本起，根據 ES2015 規範，所有這些功能在非嚴格模式下也已啟用。這使得在開發者工具的主控台中進行原型設計更加容易，儘管我們通常鼓勵開發人員為新代碼升級到嚴格模式。

### 正規表示式

V8 現在支援正規表示式中的新[黏著標誌](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky)。黏著標誌切換搜尋在字符串中是從字符串的起始位置（正常）還是從 `lastIndex` 屬性（黏著）開始。這種行為有助於有效地解析任意長度的輸入字符串並使用多個不同的正規表示式。要啟用黏著搜尋，只需在正規表示式中添加 `y` 標誌（例如：`const regex = /foo/y;`）。

### 可自訂輸出 `Object.prototype.toString`

使用 `Symbol.toStringTag`，使用者定義的類型現在可以自訂在傳遞給 `Object.prototype.toString` 時的輸出（無論是直接傳遞或作為字符串強制類型轉換的結果）：

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

## 改進的 `Math.random()`

V8 v4.9 改進了 `Math.random()` 的實現。[如上月公告所述](/blog/math-random)，我們將 V8 的 PRNG 演算法切換為 [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf)，以提供更高質量的偽隨機性。

## V8 API

請查看我們的[API 變更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文件在每次主要版本發布幾週後會定期更新。

擁有[有效的 V8 源碼檢出](https://v8.dev/docs/source-code#using-git)的開發人員可以使用 `git checkout -b 4.9 -t branch-heads/4.9` 來試驗 V8 v4.9 中的新功能。或者，您可以訂閱[Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並很快自己試用新功能。
