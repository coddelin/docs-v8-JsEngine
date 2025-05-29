---
title: 'V8 版本發佈 v7.3'
author: 'Clemens Backes，編譯器專家'
avatars:
  - clemens-backes
date: 2019-02-07 11:30:42
tags:
  - 發佈
description: 'V8 v7.3 提供 WebAssembly 和非同步性能改進、非同步堆疊追蹤、Object.fromEntries、String#matchAll 等多項新功能！'
tweet: '1093457099441561611'
---
每六周，我們會根據[發佈流程](/docs/release-process)創建一個 V8 的新分支。每個版本均從 V8 的 Git 主分支中分出，並在 Chrome Beta 里程碑之前完成。今天我們很高興地宣布我們的最新分支，[V8 版本 7.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.3)，該版本目前處於測試版，幾周後將與 Chrome 73 穩定版同步發布。V8 v7.3 提供了許多面向開發者的精彩功能，本文將預覽部分亮點以期待其正式發佈。

<!--truncate-->
## 非同步堆疊追蹤

我們將 [--async-stack-traces 標誌](/blog/fast-async#improved-developer-experience) 默認啟用。[零成本的非同步堆疊追蹤](https://bit.ly/v8-zero-cost-async-stack-traces) 可讓開發者更容易診斷大量使用非同步代碼時生產環境中的問題，因為通常發送到日誌文件/服務中的 `error.stack` 屬性現在能提供更多有關問題原因的資訊。

## 更快的 `await`

與上述的 `--async-stack-traces` 標誌相關，我們還默認啟用了 `--harmony-await-optimization` 標誌，該標誌是 `--async-stack-traces` 的前提條件。有關更多詳情，請參見[更快的非同步函數和承諾](/blog/fast-async#await-under-the-hood)。

## 更快的 Wasm 啟動

通過對 Liftoff 的內部優化，我們顯著提高了 WebAssembly 的編譯速度，且未降低生成代碼的質量。對於大多數工作負載，編譯時間減少了 15–25%。

![[Epic ZenGarden 演示](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)的 Liftoff 編譯時間](/_img/v8-release-73/liftoff-epic.svg)

## JavaScript 語言功能

V8 v7.3 提供了多項新的 JavaScript 語言功能。

### `Object.fromEntries`

`Object.entries` API 並不是新的功能：

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]
```

不幸的是，之前還沒有一種簡單的方法能夠從 `entries` 的結果中返回等價的物件……直至現在！V8 v7.3 支援 [`Object.fromEntries()`](/features/object-fromentries)，這是一種全新的內建 API，能執行 `Object.entries` 的反操作：

```js
const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

更多資訊和示例使用場景，請參見[我們的 `Object.fromEntries` 特性解釋器](/features/object-fromentries)。

### `String.prototype.matchAll`

全域 (`g`) 或黏性 (`y`) 正則表達式的一個常見使用場景是應用於字串並迭代所有匹配項。全新的 `String.prototype.matchAll` API 使這一操作比以往任何時候都更容易，尤其是對於帶有捕獲組的正則表達式：

```js
const string = 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;

for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} at ${match.index} with '${match.input}'`);
  console.log(`→ owner: ${match.groups.owner}`);
  console.log(`→ repo: ${match.groups.repo}`);
}

// 輸出:
//
// tc39/ecma262 at 23 with 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → owner: tc39
// → repo: ecma262
// v8/v8.dev at 36 with 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → owner: v8
// → repo: v8.dev
```

更多詳情，請閱讀[我們的 `String.prototype.matchAll` 解釋器](/features/string-matchall)。

### `Atomics.notify`

`Atomics.wake` 現已更名為 `Atomics.notify`，以匹配[最近的規範更改](https://github.com/tc39/ecma262/pull/1220)。

## V8 API

請使用 `git log branch-heads/7.2..branch-heads/7.3 include/v8.h` 來獲取 API 更改的清單。

擁有 [活動 V8 檢出](/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 7.3 -t branch-heads/7.3` 來嘗試 V8 v7.3 的新功能。或者，您也可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，很快親自體驗新功能。
