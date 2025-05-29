---
title: "V8 發行版本 v5.1"
author: "V8 團隊"
date: 2016-04-23 13:33:37
tags:
  - 發行
description: "V8 v5.1 提供性能改進、降低停滯和記憶體消耗，以及增加對 ECMAScript 語言功能的支援。"
---
V8 [發行流程](/docs/release-process) 的第一步是在 Chromium 為 Chrome Beta 里程碑（大約每六週）的分支之前從 Git 主倉創建新分支。我們最新的發行分支是 [V8 v5.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.1)，其將保持 Beta 狀態，直到我們與 Chrome 51 穩定版本一起發佈穩定版本。以下是此版本 V8 的新開發者功能亮點。

<!--truncate-->
## 改進的 ECMAScript 支援

V8 v5.1 包含若干改進，以符合 ES2017 草案規範。

### `Symbol.species`

像 `Array.prototype.map` 這樣的陣列方法會將子類的實例構造為輸出，並可以通過修改 [`Symbol.species`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/species) 來自定義此行為。類似的變更也應用於其他內建類。

### `instanceof` 自定義

構造函數可以實現自己的 [`Symbol.hasInstance`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Other_symbols) 方法，覆蓋默認行為。

### Iterator 關閉

迭代器（在 [`for`-`of`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) 循環或其他內建迭代，如 [spread](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator) 運算符）現會檢查是否存在關閉方法，並在迭代提前結束時調用該方法。這可用作迭代完成後的清理。

### RegExp 子類的 `exec` 方法

RegExp 子類可以覆蓋 `exec` 方法來僅更改核心匹配算法，並保證高階函數（如 `String.prototype.replace`）調用此方法。

### 函數名稱推斷

為函數表達式推斷的函數名稱現在通常可在 [`name`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name) 屬性中獲得，遵循 ES2015 規範化的規則。這可能改變現有堆棧跟蹤並提供與舊版 V8 不同的名稱。此外，它還為有計算屬性名稱的屬性和方法提供了有用的名稱：

```js
class Container {
  ...
  [Symbol.iterator]() { ... }
  ...
}
const c = new Container;
console.log(c[Symbol.iterator].name);
// → '[Symbol.iterator]'
```

### `Array.prototype.values`

與其他集合類型類似，`Array` 的 [`values`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values) 方法返回一個迭代器，用於遍歷陣列內容。

## 性能改進

V8 v5.1 還帶來了一些 JavaScript 功能的重要性能改進：

- 執行如 `for`-`in` 的循環
- `Object.assign`
- Promise 和 RegExp 的實例化
- 調用 `Object.prototype.hasOwnProperty`
- `Math.floor`、`Math.round` 和 `Math.ceil`
- `Array.prototype.push`
- `Object.keys`
- `Array.prototype.join` 和 `Array.prototype.toString`
- 壓縮重復字串，例如 `'.'.repeat(1000)`

## WebAssembly (Wasm)

V8 v5.1 提供初步的 [WebAssembly](/blog/webassembly-experimental) 支援。您可以通過 `d8` 中的標誌 `--expose_wasm` 啟用此功能。也可以使用 Chrome 51（Beta 頻道）試用 [Wasm demos](https://webassembly.github.io/demo/)。

## 記憶體

V8 實現了更多 [Orinoco](/blog/orinoco) 的切片：

- 並行年輕代撤離
- 可擴展的記憶集
- 黑分配

其影響是減少停滯並在需要時降低記憶體消耗。

## V8 API

請查看我們的 [API 變更摘要](https://bit.ly/v8-api-changes)。這份文件通常會在每次主要版本發行幾週後定期更新。

擁有 [活動的 V8 源碼檢出](https://v8.dev/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 5.1 -t branch-heads/5.1` 來試驗 V8 v5.1 的新功能。或者您也可以 [訂閱 Chrome Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並儘快試用新功能。
