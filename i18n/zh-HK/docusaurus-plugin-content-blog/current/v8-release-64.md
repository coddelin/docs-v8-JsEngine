---
title: 'V8 發布 v6.4'
author: 'V8 團隊'
date: 2017-12-19 13:33:37
tags:
  - 發布
description: 'V8 v6.4 包含性能改進、新的 JavaScript 語言特性等內容。'
tweet: '943057597481082880'
---
每六週，我們會根據[發布流程](/docs/release-process)創建一個新的 V8 分支。每個版本在 Chrome Beta 里程碑前都會從 V8 的 Git 主分支分叉而來。今天我們很高興宣布最新分支 [V8 版本 6.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.4)，該版本目前處於 beta 階段，數週後將與 Chrome 64 Stable 一起發布。V8 v6.4 為開發者帶來了各種令人欣喜的功能。本篇文章預覽了一些即將推出的亮點內容。

<!--truncate-->
## 速度

V8 v6.4 將 `instanceof` 運算符的性能[提升](https://bugs.chromium.org/p/v8/issues/detail?id=6971)了 3.6 倍。直接結果是，[uglify-js](http://lisperator.net/uglifyjs/) 根據[V8 的 Web Tooling Benchmark](https://github.com/v8/web-tooling-benchmark)，速度提升了 15–20%。

此版本還解決了 `Function.prototype.bind` 的一些性能瓶頸。例如，TurboFan 現在能[一致性地內聯](https://bugs.chromium.org/p/v8/issues/detail?id=6946)所有對 `bind` 的單態調用。此外，TurboFan 還支持 _綁定回調模式_，這意味著可以通過以下方式替代：

```js
doSomething(callback, someObj);
```

現在可以使用：

```js
doSomething(callback.bind(someObj));
```

這樣，代碼更具可讀性，同時仍然能保持相同的性能。

得益於[Peter Wong](https://twitter.com/peterwmwong)的最新貢獻，[`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) 和 [`WeakSet`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet) 現已使用 [CodeStubAssembler](/blog/csa) 實現，導致性能最多提升至 5 倍。

![](/_img/v8-release-64/weak-collection.svg)

作為 V8[持續努力](https://bugs.chromium.org/p/v8/issues/detail?id=1956)改進數組內置性能的一部分，我們通過使用 CodeStubAssembler 重新實現了 `Array.prototype.slice`，使其性能提升了約 4 倍。此外，對於許多案例，現在調用 `Array.prototype.map` 和 `Array.prototype.filter` 可進行內聯，性能表現已與手寫版本相媲美。

我們努力使數組、型數組及字符串中的越界加載[不再產生 ~10 倍的性能損失](https://bugs.chromium.org/p/v8/issues/detail?id=7027)，這是基於發現[此編碼模式](/blog/elements-kinds#avoid-reading-beyond-length)在實際使用中被廣泛採用。

## 記憶體

V8 内建代碼對象和字節碼處理程序現在可以延遲反序列化自快照，這會顯著減少每個 Isolate 使用的內存。在 Chrome 的基準測試中，瀏覽常見站點時每個標籤節省了幾百 KB。

![](/_img/v8-release-64/codespace-consumption.svg)

請期待明年初的專題博客文章。

## ECMAScript 語言特性

此次 V8 發布支持了兩項令人興奮的新正則表達式特性。

在帶有 `/u` 標記的正則表達式中，[Unicode 屬性逃逸](https://mathiasbynens.be/notes/es-unicode-property-escapes)現已默認啟用。

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → true
```

正則表達式中的[命名捕獲組](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features#named_captures)現在也已默認啟用。

```js
const pattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u;
const result = pattern.exec('2017-12-15');
// result.groups.year === '2017'
// result.groups.month === '12'
// result.groups.day === '15'
```

關於這些特性更多的細節可以參考我們的博客文章[即將推出的正則表達式特性](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features)。

感謝 [Groupon](https://twitter.com/GrouponEng)，V8 現在實現了 [`import.meta`](https://github.com/tc39/proposal-import-meta)，這使嵌入者能夠暴露有關當前模塊的宿主特定元數據。例如，Chrome 64 現在可以通過 `import.meta.url` 暴露模塊 URL，且 Chrome 計劃未來將向 `import.meta` 添加更多屬性。

為了協助通過國際化格式器產生的字符串進行本地相關的格式化，開發者現在可以使用 [`Intl.NumberFormat.prototype.formatToParts()`](https://github.com/tc39/proposal-intl-formatToParts) 將數字格式化為標記及其類型列表。感謝 [Igalia](https://twitter.com/igalia) 在 V8 中完成了這一實現！

## V8 API

請使用 `git log branch-heads/6.3..branch-heads/6.4 include/v8.h` 獲取 API 更改的列表。

擁有[活躍的 V8 源代碼檢出](/docs/source-code#using-git)的開發者可以使用 `git checkout -b 6.4 -t branch-heads/6.4` 來嘗試 V8 v6.4 中的新功能。或者，您可以[訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，並儘快自己嘗試新功能。
