---
title: "V8 發布 v5.0"
author: "V8 團隊"
date: 2016-03-15 13:33:37
tags:
  - 發布
description: "V8 v5.0 提供性能改進，並加入對多個新的 ES2015 語言特性的支持。"
---
V8 [發布流程](/docs/release-process) 的第一步是從 Git 主分支中新建一個分支，這通常在 Chromium 為 Chrome Beta 里程碑分支（大約每六週一次）之前進行。我們最新的發布分支是 [V8 v5.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.0)，這個版本將在與 Chrome 50 穩定版一同發布之前保持 Beta 狀態。以下是此版本 V8 面向開發者的新功能亮點。

<!--truncate-->
:::note
**注意：** 版本號 5.0 並不具有語義上的特殊意義，也不標示一次主要發布（與次要發布相對）。
:::

## 改進的 ECMAScript 2015 (ES6) 支持

V8 v5.0 包含若干與正則表達式（regex）匹配有關的 ES2015 特性。

### RegExp Unicode 標誌

[RegExp Unicode 標誌](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Parameters) `u` 開啟了正則表達式匹配的新 Unicode 模式。Unicode 標誌將模式和正則表達式字符串作為一系列 Unicode 代碼點來處理，並且引入了新的 Unicode 代碼點轉義語法。

```js
/😊{2}/.test('😊😊');
// false

/😊{2}/u.test('😊😊');
// true

/\u{76}\u{38}/u.test('v8');
// true

/\u{1F60A}/u.test('😊');
// true
```

此外，`u` 標誌還使得 `.` 原子（也稱為單字符匹配）能夠匹配任何 Unicode 符號，而不僅僅是基本多語言平面 (BMP) 中的字符。

```js
const string = 'the 🅛 train';

/the\s.\strain/.test(string);
// false

/the\s.\strain/u.test(string);
// true
```

### RegExp 自定義鉤子

ES2015 包括可以自定義 RegExp 子類的匹配語義的鉤子。子類可以覆蓋名為 `Symbol.match`, `Symbol.replace`, `Symbol.search` 和 `Symbol.split` 的方法，以改變 RegExp 子類在 `String.prototype.match` 等方法中的行為。

## ES2015 和 ES5 特性的性能改進

5.0 版本還為已實現的 ES2015 和 ES5 特性帶來了一些顯著的性能提升。

例如，rest 參數的實現比上一個版本快了 8-10 倍，使得在函數調用後將大量參數收集到單個數組中變得更加高效。而 `Object.keys` 現在的運行速度約為之前的 2 倍，該方法可用於按 `for`-`in` 返回的相同順序迭代對象的可枚舉屬性。

## V8 API

請查看我們的 [API 變更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。該文檔在每次主要版本發布後的幾週內定期更新。

擁有 [V8 活躍檢出的開發者](https://v8.dev/docs/source-code#using-git) 可以使用 `git checkout -b 5.0 -t branch-heads/5.0` 來試驗 V8 5.0 的新功能。或者，您也可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，很快親自嘗試這些新功能。
