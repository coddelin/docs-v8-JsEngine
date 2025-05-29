---
title: "V8 發佈 v5.6"
author: "V8 團隊"
date: 2016-12-02 13:33:37
tags:
  - 發佈
description: "V8 v5.6 帶來了全新的編譯器管線、效能改進以及對 ECMAScript 語言功能的增強支持。"
---
每六週，我們會根據[發佈過程](/docs/release-process)創建 V8 的新分支。每個版本都從 V8 的 Git master 分支在 Chrome Beta 里程碑之前建立。今天，我們很高興宣布最新的分支，[V8 版本 5.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.6)，該版本將進入 Beta 阶段，並在幾週後與 Chrome 56 Stable 的發佈同步推出。V8 5.6 為開發人員帶來了各種新功能，以下是一些亮點的預覽，我們期待其正式發佈。

<!--truncate-->
## 為 ES.next（及更多）啟用的 Ignition 和 TurboFan 管線

從 5.6 開始，V8 可以最佳化整個 JavaScript 語言。此外，許多語言功能在 V8 中通過全新的最佳化管線進行處理。此管線使用 V8 的[Ignition 解釋器](/blog/ignition-interpreter)作為基線，並使用 V8 更強大的[TurboFan 最佳化編譯器](/docs/turbofan)來優化頻繁執行的方法。新的管線會啟用新的語言功能（例如 ES2015 和 ES2016 規範中的許多新功能）或當 Crankshaft（[V8 的“經典”最佳化編譯器](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)）無法最佳化方法時（例如 try-catch，with）。

為何僅將部分 JavaScript 語言功能通過新的管線？新的管線更適合最佳化 JS 語言的全範圍（過去和現在）。它是更健康、更現代的程式碼庫，專門為包括在低內存設備上執行 V8 的實際案例設計。

我們已開始在 V8 中使用 Ignition/TurboFan 處理最新的 ES.next 功能（ES.next = 根據 ES2015 和以後規範指定的 JavaScript 功能），並會隨著性能改進進一步將更多功能路由至此管線。中期目標是 V8 團隊將所有 JavaScript 在 V8 中的執行切換至新的管線。然而，只要存在真實的使用案例，Crankshaft 能比新的 Ignition/TurboFan 管線更快地執行 JavaScript，短期內我們將同時支持這兩個管線以確保所有情況下 V8 中的 JavaScript 代碼執行速度最快。

那麼，為什麼新的管線同時使用新的 Ignition 解釋器和新的 TurboFan 最佳化編譯器？快速高效地執行 JavaScript 需要在 JavaScript 虛擬機器中具有多種機制或層級來完成低級執行工作。例如，首層開始快速執行代碼，而第二層則花更長時間進行熱函數編譯以最大化長時間運行代碼的性能。

Ignition 和 TurboFan 是 V8 的兩個新執行層級，當它們一起使用時效果最好。基於效率、簡單性和規模考慮，TurboFan 設計成從 V8 的 Ignition 解釋器生成的[位元碼](https://en.wikipedia.org/wiki/Bytecode)開始進行 JavaScript 方法的最佳化。通過使兩個元件密切配合，可以因為對方的存在進行最佳化，這使得兩者都能更高效地完成工作。因此，從 5.6 開始，所有將由 TurboFan 最佳化的函數首先將通過 Ignition 解釋器執行。使用這個統一的 Ignition/TurboFan 管線使得那些過去無法進行最佳化的功能現在可以利用 TurboFan 的最佳化處理。例如，通過將[生成器](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)路由到 Ignition 和 TurboFan 兩者，生成器的運行性能幾乎提高了三倍。

欲了解更多有關 V8 採用 Ignition 和 TurboFan 的旅程，請參閱 [Benedikt 的專門部落格文章](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition/)。

## 性能改進

V8 v5.6 帶來了一些關鍵的內存和性能足跡提升。

### 因內存引發的卡頓

[并行記憶集過濾](https://bugs.chromium.org/p/chromium/issues/detail?id=648568)被引入：向 [Orinoco](/blog/orinoco)邁出的一步。

### 極大提升的 ES2015 性能

開發者通常使用轉譯器開始使用新的語言功能，原因有兩個挑戰：向後兼容性和性能顧慮。

V8 的目標是縮小轉譯器與 V8 的 "原生" ES.next 性能之間的差距，以消除後者的挑戰。我們在使新語言功能的性能達到其轉譯 ES5 等效項的水準方面已取得了巨大進展。在此版本中，您會發現 ES2015 功能的性能顯著快於以前的 V8 版本，在某些情況下，ES2015 功能的性能甚至接近其轉譯 ES5 等效項。

特別是 [spread](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Spread_operator) 運算子現在應該可以直接使用。與其這樣寫…

```js
// 如 Math.max，但對於沒有參數時返回 0 而不是 -∞。
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max.apply(Math, args);
}
```

…您現在可以這樣寫…

```js
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max(...args);
}
```

…且獲得類似的性能結果。特別是 V8 v5.6 包括了以下微基準測試的性能提升：

- [destructuring](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring)
- [destructuring-array](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-array)
- [destructuring-string](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-string)
- [for-of-array](https://github.com/fhinkel/six-speed/tree/master/tests/for-of-array)
- [generator](https://github.com/fhinkel/six-speed/tree/master/tests/generator)
- [spread](https://github.com/fhinkel/six-speed/tree/master/tests/spread)
- [spread-generator](https://github.com/fhinkel/six-speed/tree/master/tests/spread-generator)
- [spread-literal](https://github.com/fhinkel/six-speed/tree/master/tests/spread-literal)

請參考下方圖表來比較 V8 v5.4 和 v5.6。

![比較 V8 v5.4 和 v5.6 的 ES2015 功能性能使用 [SixSpeed](https://fhinkel.github.io/six-speed/)](/_img/v8-release-56/perf.png)

這只是開始；在即將推出的版本中還有更多改進！

## 語言功能

### `String.prototype.padStart` / `String.prototype.padEnd`

[`String.prototype.padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) 和 [`String.prototype.padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd) 是 ECMAScript 的最新第 4 階段新增功能。這些庫函數已正式隨 v5.6 發佈。

:::note
**註：** 被重新取消發佈。
:::

## WebAssembly 瀏覽器預覽

包含 V8 v5.6 的 Chromium 56 即將發布 WebAssembly 瀏覽器預覽。請參考[專門的部落格文章](/blog/webassembly-browser-preview)以了解更多信息。

## V8 API

請查看我們的 [API 變更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文檔會在每次重大發布後幾週內定期更新。

擁有 [活動 V8 檢出版本](/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 5.6 -t branch-heads/5.6` 來試驗 V8 v5.6 的新功能。或者，您也可以[訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，並很快親自嘗試這些新功能。
