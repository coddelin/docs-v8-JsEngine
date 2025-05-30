---
title: "V8 發行 v4.5"
author: "V8 團隊"
date: "2015-07-17 13:33:37"
tags: 
  - 發行
description: "V8 v4.5 帶來了性能提升並新增了對多項 ES2015 特性的支持。"
---
每隔約六周，我們會根據 [發行流程](https://v8.dev/docs/release-process)，從 V8 的 Git 主分支創建一個新分支。每個版本都是在 Chrome 為 Beta 里程碑分支之前創建的。今天我們很高興地宣布最新的分支 [V8 版本 4.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.5)，該版本將進入 Beta 階段，直至與 Chrome 45 Stable 的發行協調完成。V8 v4.5 包含了各種面向開發者的改進，我們希望在幾周內發布前先向大家介紹其中的一些亮點。

<!--truncate-->
## 提升 ECMAScript 2015 (ES6) 的支持

V8 v4.5 新增了對多項 [ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/) 特性的支持。

### 箭頭函數

借助 [箭頭函數](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)，能更簡潔地編寫程式碼。

```js
const data = [0, 1, 3];
// 不使用箭頭函數的程式碼
const convertedData = data.map(function(value) { return value * 2; });
console.log(convertedData);
// 使用箭頭函數的程式碼
const convertedData = data.map(value => value * 2);
console.log(convertedData);
```

箭頭函數的 'this' 字典綁定也是一大優勢。這使得在方法中使用回調變得更加簡單。

```js
class MyClass {
  constructor() { this.a = 'Hello, '; }
  hello() { setInterval(() => console.log(this.a + 'World!'), 1000); }
}
const myInstance = new MyClass();
myInstance.hello();
```

### 陣列/型別化陣列函數

[陣列和型別化陣列](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array#Methods) 的所有新方法指定於 ES2015，現已在 V8 v4.5 中得到支持。它們使得處理陣列和型別化陣列更方便。新增的方法包括 `Array.from` 和 `Array.of`。此外，也增加了大多數 `Array` 方法的型別化版本。

### `Object.assign`

[`Object.assign`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) 使開發者能快速合併和克隆物件。

```js
const target = { a: 'Hello, ' };
const source = { b: 'world!' };
// 合併物件
Object.assign(target, source);
console.log(target.a + target.b);
```

這個功能也可以用於添加功能。

## 更多 JavaScript 語言特性可以“優化”

多年來，V8 的傳統優化編譯器 [Crankshaft](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html) 在優化許多常見 JavaScript 模式方面表現出色。然而，它從未有能力支持整個 JavaScript 語言，因此在函數中使用某些特性——如 `try`/`catch` 和 `with`——會阻止其被優化。V8需要對該函數回退到較慢的基準編譯器。

V8 的新優化編譯器 [TurboFan](/blog/turbofan-jit) 的設計目標之一是最終能優化所有 JavaScript，包括 ECMAScript 2015 特性。在 V8 v4.5 中，我們開始使用 TurboFan 優化一些 Crankshaft 不支持的語言特性：`for`-`of`、`class`、`with` 和計算屬性名稱。

以下是一個使用 'for-of' 的程式碼範例，現在可以由 TurboFan 編譯：

```js
const sequence = ['First', 'Second', 'Third'];
for (const value of sequence) {
  // 這個作用域現在可以優化。
  const object = {a: 'Hello, ', b: 'world!', c: value};
  console.log(object.a + object.b + object.c);
}
```

雖然最初使用這些語言特性的函數不會達到 Crankshaft 編譯的其他程式碼的性能高峰，但 TurboFan 現在能將它們的速度提升到超越我們目前基準編譯器的水準。而且，隨著我們為 TurboFan 開發更多的優化，性能將繼續快速提升。

## V8 API

請查看我們的 [API 變更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文件在每次主要發行之後的幾周內定期更新。

擁有 [V8 活動檢出](https://v8.dev/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 4.5 -t branch-heads/4.5` 來試驗 V8 v4.5 的新功能。或者，您可以 [訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並親自嘗試這些新功能。
