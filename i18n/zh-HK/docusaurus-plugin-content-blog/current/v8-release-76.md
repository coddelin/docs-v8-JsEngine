---
title: 'V8 發佈 v7.6'
author: 'Adam Klein'
avatars:
  - 'adam-klein'
date: 2019-06-19 16:45:00
tags:
  - release
description: 'V8 v7.6 支持 Promise.allSettled、更快速的 JSON.parse、本地化的 BigInt、更快的凍結/密封陣列等更多功能！'
tweet: '1141356209179516930'
---
每六週，我們會創建一個 V8 的新分支作為我們[發佈過程](/docs/release-process)的一部分。每個版本都從 V8 的 Git 主分支分叉，時間為 Chrome Beta 里程碑之前。今天，我們很高興宣布我們最新的分支 [V8 版本 7.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.6)，該版本目前處於測試版本，並將於幾週內隨 Chrome 76 穩定版一起釋出。V8 v7.6 提供了多種面向開發者的新功能。本文為即將發布的亮點提供預覽。

<!--truncate-->
## 性能（大小與速度）

### `JSON.parse` 的改進

在現代 JavaScript 應用程式中，JSON 通常作為結構化資料的通信格式。通過加快 JSON 解析速度，我們可以減少通信延遲。在 V8 v7.6 中，我們重新設計了 JSON 解析器，使其能夠更快地掃描和解析 JSON。這使得來自熱門網頁的資料解析性能快達 2.7 倍。

![顯示在多個網站上改進 `JSON.parse` 性能的圖表](/_img/v8-release-76/json-parsing.svg)

在 V8 v7.5 及之前的版本，JSON 解析器是一個遞歸解析器，其使用的原生堆疊空間與輸入 JSON 資料的嵌套深度相關。這意味著我們可能會因非常深層嵌套的 JSON 資料而耗盡堆疊空間。V8 v7.6 改為使用一個迭代解析器，它管理自己的堆疊，其唯一限制在於可用記憶體。

新的 JSON 解析器也更具記憶體效率。我們通過在創建最終物件之前緩衝屬性，來決定如何以最佳方式分配結果。對於具名屬性的物件，我們根據輸入 JSON 資料中的具名屬性數量分配精確空間（最多 128 個具名屬性）。如果 JSON 物件包含索引屬性名稱，我們分配使用最小空間的元素支持儲存區；這可能是平面陣列或字典。JSON 陣列現在被解析為精確匹配輸入資料中元素數的陣列。

### 凍結/密封陣列的改進

對凍結或密封陣列（以及類陣列對象）上的調用性能進行了多方面的改進。V8 v7.6 提升了以下 JavaScript 編碼模式的性能，其中 `frozen` 是一個凍結或密封的陣列或類陣列對象：

- `frozen.indexOf(v)`
- `frozen.includes(v)`
- 擴展調用如 `fn(...frozen)`
- 有嵌套陣列擴展的擴展調用如 `fn(...[...frozen])`
- 帶有陣列擴展的 apply 調用如 `fn.apply(this, [...frozen])`

下圖顯示了性能的改進。

![顯示在多種陣列操作上的性能提升的圖表](/_img/v8-release-76/frozen-sealed-elements.svg)

[查看 “V8 中快速凍結和密封元素”的設計文檔](https://bit.ly/fast-frozen-sealed-elements-in-v8) 了解更多詳情。

### Unicode 字符串處理

在[將字符串轉換為 Unicode](https://chromium.googlesource.com/v8/v8/+/734c1456d942a03d79aab4b3b0e57afbc803ceea) 時的一項優化使得調用如 `String#localeCompare`、`String#normalize` 和部分的 `Intl` API 的性能顯著提升。例如，該改進使得 `String#localeCompare` 對單字節字符串的原始處理速度提升約 2 倍。

## JavaScript 語言功能

### `Promise.allSettled`

[`Promise.allSettled(promises)`](/features/promise-combinators#promise.allsettled) 當所有輸入的承諾 _結束_ 時（即它們要麼 _實現_ 要麼 _拒絕_），提供一個信號。在您不關心承諾的狀態，而只想知道工作何時完成時（無論是否成功），這非常有用。我們的[承諾合併器解釋器](/features/promise-combinators) 提供了更多詳情和示例。

### 改進的 `BigInt` 支援

[`BigInt`](/features/bigint) 現在在語言中獲得了更好的 API 支援。您現在可以使用 `toLocaleString` 方法以基於語言的方式格式化 `BigInt`，其工作方式與普通數字相同：

```js
12345678901234567890n.toLocaleString('en'); // 🐌
// → '12,345,678,901,234,567,890'
12345678901234567890n.toLocaleString('de'); // 🐌
// → '12.345.678.901.234.567.890'
```

如果您打算使用同一語言格式化多個數字或 `BigInt`，使用 `Intl.NumberFormat` API 更加高效，該 API 現在支持 `BigInt` 的 `format` 和 `formatToParts` 方法。這樣，您可以創建一個可重複使用的格式化實例。

```js
const nf = new Intl.NumberFormat('fr');
nf.format(12345678901234567890n); // 🚀
// → '12 345 678 901 234 567 890'
nf.formatToParts(123456n); // 🚀
// → [
// →   { type: 'integer', value: '123' },
// →   { type: 'group', value: ' ' },
// →   { type: 'integer', value: '456' }
// → ]
```

### `Intl.DateTimeFormat` 改進

應用程式通常會顯示日期區間或日期範圍，例如酒店預訂、服務的計費期間或音樂節的時間跨度。現在 `Intl.DateTimeFormat` API 支援 `formatRange` 和 `formatRangeToParts` 方法，以方便在特定語言環境下格式化日期範圍。

```js
const start = new Date('2019-05-07T09:20:00');
// → '2019年5月7日'
const end = new Date('2019-05-09T16:00:00');
// → '2019年5月9日'
const fmt = new Intl.DateTimeFormat('zh-Hant', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const output = fmt.formatRange(start, end);
// → '2019年5月7日–9日'
const parts = fmt.formatRangeToParts(start, end);
// → [
// →   { 'type': 'month',   'value': '5月',  'source': 'shared' },
// →   { 'type': 'literal', 'value': ' ',   'source': 'shared' },
// →   { 'type': 'day',     'value': '7',   'source': 'startRange' },
// →   { 'type': 'literal', 'value': '–',  'source': 'shared' },
// →   { 'type': 'day',     'value': '9',   'source': 'endRange' },
// →   { 'type': 'literal', 'value': ', ',  'source': 'shared' },
// →   { 'type': 'year',    'value': '2019', 'source': 'shared' },
// → ]
```

此外，`format`、`formatToParts` 和 `formatRangeToParts` 方法現在支援新的 `timeStyle` 和 `dateStyle` 選項：

```js
const dtf = new Intl.DateTimeFormat('zh-Hant', {
  timeStyle: 'medium',
  dateStyle: 'short'
});
dtf.format(Date.now());
// → '2019/06/19, 13:33:37'
```

## 原生堆疊行走

雖然 V8 可以行走其自身的呼叫堆疊（例如在 DevTools 中進行調試或分析時），由於 Windows 作業系統無法行走包含由 TurboFan 生成的程式碼的呼叫堆疊（在 x64 架構上運行時）。這可能導致使用原生偵錯器或 ETW 取樣分析使用 V8 的進程時出現「堆疊損壞」的情況。最近的一項更改使 V8 能夠 [註冊必要的元數據](https://chromium.googlesource.com/v8/v8/+/3cda21de77d098a612eadf44d504b188a599c5f0)，使 Windows 可以在 x64 上行走這些堆疊，且此功能在 v7.6 中默認啟用。

## V8 API

請使用 `git log branch-heads/7.5..branch-heads/7.6 include/v8.h` 查看 API 更改列表。

擁有 [有效 V8 源碼檢出](/docs/source-code#using-git) 的開發人員可以使用 `git checkout -b 7.6 -t branch-heads/7.6` 試驗 V8 v7.6 的新功能。或者您可以 [訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，並立即嘗試這些新功能。
