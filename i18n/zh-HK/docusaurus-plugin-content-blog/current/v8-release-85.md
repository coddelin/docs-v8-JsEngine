---
title: 'V8 版本 v8.5'
author: 'Zeynep Cankara，追蹤一些地圖'
avatars:
 - 'zeynep-cankara'
date: 2020-07-21
tags:
 - 發佈
description: 'V8 版本 v8.5 的特性包括 Promise.any, String#replaceAll, 邏輯賦值運算符, WebAssembly 多值及 BigInt 支持，以及性能改進。'
tweet:
---
每六週，我們會根據我們的 [發佈流程](https://v8.dev/docs/release-process) 創建一個新的 V8 分支。每個版本都是在 Chrome Beta 里程碑發布之前，從 V8 的 Git 主分支分出來的。今天我們很高興地宣布我們的最新分支 [V8 版本 8.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.5)，該版本目前處於測試階段，幾週後將與 Chrome 85 穩定版同步發佈。V8 v8.5 為開發者帶來了各種實用新功能。這篇文章對即將發布的亮點進行了預覽。

<!--truncate-->
## JavaScript

### `Promise.any` 和 `AggregateError`

`Promise.any` 是一個承諾組合器，當任意一個輸入承諾被完成時便解析最終的承諾。

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // 任意一個承諾已完成。
  console.log(first);
  // → 例如 'b'
} catch (error) {
  // 所有承諾都被拒絕。
  console.assert(error instanceof AggregateError);
  // 記錄拒絕的值：
  console.log(error.errors);
}
```

如果所有輸入承諾都被拒絕，那麼最終的承諾就會用包含 `errors` 屬性的 `AggregateError` 對象拒絕，該屬性包含一個拒絕值的數組。

請參考[我們的解釋文檔](https://v8.dev/features/promise-combinators#promise.any)了解更多。

### `String.prototype.replaceAll`

`String.prototype.replaceAll` 提供了一種不用創建全域 `RegExp` 就能替換所有子字符串的簡單方法。

```js
const queryString = 'q=query+string+parameters';

// 可以使用，但需要在正則表達式中進行轉義。
queryString.replace(/\+/g, ' ');
// → 'q=query string parameters'

// 更簡單！
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

請參考[我們的解釋文檔](https://v8.dev/features/string-replaceall)了解更多。

### 邏輯賦值運算符

邏輯賦值運算符是新的複合賦值運算符，結合了邏輯運算 `&&`、`||` 或 `??` 與賦值。

```js
x &&= y;
// 大致相當於 x && (x = y)
x ||= y;
// 大致相當於 x || (x = y)
x ??= y;
// 大致相當於 x ?? (x = y)
```

注意，與數學和位元複合賦值運算符不同，邏輯賦值運算符僅在條件滿足時執行賦值。

請參考[我們的解釋文檔](https://v8.dev/features/logical-assignment)獲取更深入的解釋。

## WebAssembly

### Liftoff 已在所有平台啟用

自 V8 v6.9 起，[Liftoff](https://v8.dev/blog/liftoff) 已被用作 Intel 平台上 WebAssembly 的基線編譯器（並且 Chrome 69 已在桌面系統上啟用了它）。由於擔心內存增長（因基線編譯器生成了更多代碼），直到現在我們才在移動系統中啟用。但近幾個月的實驗證實，對大多數情況來說內存增長是可以忽略的，因此我們最終默認在所有架構上啟用 Liftoff，特別是在 arm 設備上（32-位和 64-位）顯著提升編譯速度。Chrome 85 也跟隨這一改進推出 Liftoff。

### 啟用了多值支持

WebAssembly 對於[多值代碼塊和函數返回值](https://github.com/WebAssembly/multi-value)的支持現在已可全面使用。這反映了提案近期已經被合併到官方 WebAssembly 標準中，並且受到了所有編譯層次的支持。

例如，這現在是有效的 WebAssembly 函數：

```wasm
(func $swap (param i32 i32) (result i32 i32)
  (local.get 1) (local.get 0)
)
```

如果該函數被導出，那麼它也可以從 JavaScript 調用，並返回一個數組：

```js
instance.exports.swap(1, 2);
// → [2, 1]
```

相反，如果一個 JavaScript 函數返回數組（或任何迭代器），它可以被導入並作為多返回值函數在 WebAssembly 模組中調用：

```js
new WebAssembly.Instance(module, {
  imports: {
    swap: (x, y) => [y, x],
  },
});
```

```wasm
(func $main (result i32 i32)
  i32.const 0
  i32.const 1
  call $swap
)
```

更重要的是，工具鏈現在可以使用此特性在 WebAssembly 模組內生成更緊湊且更快速的代碼。

### 支持 JS 的 BigInts

WebAssembly 支援 [從 WebAssembly 的 I64 值與 JavaScript 的 BigInt 相互轉換](https://github.com/WebAssembly/JS-BigInt-integration) 已經正式推出，可供一般使用，符合最新標準的變更。

因此，具有 i64 參數和返回值的 WebAssembly 函數可以從 JavaScript 呼叫，且不會有精度損失：

```wasm
(module
  (func $add (param $x i64) (param $y i64) (result i64)
    local.get $x
    local.get $y
    i64.add)
  (export "add" (func $add)))
```

從 JavaScript 僅能使用 BigInt 作為 I64 的參數：

```js
WebAssembly.instantiateStreaming(fetch('i64.wasm'))
  .then(({ module, instance }) => {
    instance.exports.add(12n, 30n);
    // → 42n
    instance.exports.add(12, 30);
    // → TypeError: 參數不是 BigInt 類型
  });
```

## V8 API

請使用 `git log branch-heads/8.4..branch-heads/8.5 include/v8.h` 獲取 API 變更列表。

擁有活躍 V8 檢出版本的開發者可以使用 `git checkout -b 8.5 -t branch-heads/8.5` 試驗 V8 v8.5 的新功能。或者，您可以 [訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，即刻嘗試新功能。
