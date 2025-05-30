---
title: "V8 發佈 v6.2"
author: "V8 團隊"
date: "2017-09-11 13:33:37"
tags: 
  - 發佈
description: "V8 v6.2 包含性能改進、更豐富的 JavaScript 語言功能、增加的最大字串長度等其他特性。"
---
每隔六週，我們會根據[發佈過程](/docs/release-process)創建一個新的 V8 分支。每個版本會在 Chrome Beta 里程碑之前直接從 V8 的 Git 主分支拉出分支。我們今天很高興宣佈最新的分支，[V8 版本 6.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.2)，此版本目前處於 Beta 階段，並將於幾週內與 Chrome 62 穩定版同步發佈。V8 v6.2 滿載了眾多面向開發者的功能。本篇提供一些亮點的預覽，期待正式發佈。

<!--truncate-->
## 性能改進

[`Object#toString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString) 的性能此前已被認定為一個潛在的瓶頸，因其常被流行的函式庫如 [lodash](https://lodash.com/) 和 [underscore.js](http://underscorejs.org/) 以及框架如 [AngularJS](https://angularjs.org/) 所使用。多種輔助函式如 [`_.isPlainObject`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isPlainObject.js#L13-L50)、[`_.isDate`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isDate.js#L8-L25)、[`angular.isArrayBuffer`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L739-L741) 或 [`angular.isRegExp`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L680-L689) 常用於應用程式和函式庫代碼中進行運行時類型檢查。

隨著 ES2015 的到來，`Object#toString` 通過新的 [`Symbol.toStringTag`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag) 符號變得可猴子補丁，這也使得 `Object#toString` 更加繁重並更難以加速。在此版本中，我們將 [SpiderMonkey JavaScript 引擎](https://bugzilla.mozilla.org/show_bug.cgi?id=1369042#c0) 中最初實現的一項優化移植至 V8，使 `Object#toString` 的處理速度提升了 **6.5 倍**。

![](/_img/v8-release-62/perf.svg)

此改進也影響了 Speedometer 瀏覽器基準測試，特別是 AngularJS 子測試，我們測得性能改善了 3%。閱讀[詳細部落格文章](https://ponyfoo.com/articles/investigating-performance-object-prototype-to-string-es2015)以獲取更多信息。

![](/_img/v8-release-62/speedometer.svg)

我們也顯著改善了 [ES2015 Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 的性能，使得通過 `someProxy(params)` 或 `new SomeOtherProxy(params)` 呼叫 Proxy 對象的速度提高了最高達 **5 倍**：

![](/_img/v8-release-62/proxy-call-construct.svg)

同樣地，在通過 `someProxy.property` 訪問 Proxy 對象上的屬性時，性能上有幾乎 **6.5 倍** 的改善：

![](/_img/v8-release-62/proxy-property.svg)

這是正在進行的實習的一部分。請保持關注更詳細的部落格文章和最終結果。

我們還很高興地宣佈，由於 [Peter Wong](https://twitter.com/peterwmwong) 的[貢獻](https://chromium-review.googlesource.com/c/v8/v8/+/620150)，[`String#includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes) 內建函式的性能從上一個版本提升了超過 **3 倍**。

內部哈希表的 Hashcode 查找速度更快了，這使得 `Map`、`Set`、`WeakMap` 和 `WeakSet` 的性能得到了提升。一篇即將發布的部落格文章將詳細解釋這項優化。

![](/_img/v8-release-62/hashcode-lookups.png)

垃圾收集器現在使用 [Parallel Scavenger](https://bugs.chromium.org/p/chromium/issues/detail?id=738865) 來收集所謂的 heap 的 young generation。

## 改善的低內存模式

在最近幾個版本中，V8 的低內存模式得到了改進（例如[將初始半空間大小設置為 512 KB](https://chromium-review.googlesource.com/c/v8/v8/+/594387)）。低內存設備現在更少出現內存不足的情況。不過，這種低內存行為可能對運行時性能產生負面影響。

## 更多正則表達式功能

正則表達式對 [dotAll 模式](https://github.com/tc39/proposal-regexp-dotall-flag) 的支持已通過 `s` 標誌啟用，並且現在默認啟用。在 dotAll 模式下，正則表達式中的 `.` 原子會匹配任何字符，包括行終止符。

```js
/foo.bar/su.test('foo\nbar'); // true
```

[後置斷言](https://github.com/tc39/proposal-regexp-lookbehind)，另一個新的正則表示式特性，現在預設可用。這個名稱已經很好地描述了它的含意。後置斷言提供了一種方式來限制模式只能在其後面跟隨後置斷言群組中的模式時匹配。它有匹配和非匹配兩種形式：

```js
/(?<=\$)\d+/.exec('$1 is worth about ¥123'); // ['1']
/(?<!\$)\d+/.exec('$1 is worth about ¥123'); // ['123']
```

有關這些功能的更多詳細資訊，請參閱我們的博客文章標題 [即將推出的正則表示式功能](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features)。

## 範本字串修訂

根據[相關提案](https://tc39.es/proposal-template-literal-revision/)，範本字串中對逃逸序列的限制已經放寬。這為範本標籤啟用了新的使用場景，例如編寫 LaTeX 處理器。

```js
const latex = (strings) => {
  // …
};

const document = latex`
\newcommand{\fun}{\textbf{Fun!}}
\newcommand{\unicode}{\textbf{Unicode!}}
\newcommand{\xerxes}{\textbf{King!}}
Breve over the h goes \u{h}ere // 非法標記！
`;
```

## 增加最大字串長度

在 64 位平台上，最大字串長度從 `2**28 - 16` 增加到 `2**30 - 25` 字元。

## Full-codegen 已移除

在 V8 v6.2 中，舊的管道中的最後主要部分已被移除。在此版本中刪除了超過 30K 行代碼 — 明顯降低了代碼復雜性。

## V8 API

請查看我們的 [API 變更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。該文檔通常在每次重大版本更新之後的幾周內定期更新。

擁有[活躍 V8 源碼檢出](/docs/source-code#using-git)的開發者可以使用 `git checkout -b 6.2 -t branch-heads/6.2` 來試驗 V8 v6.2 的新功能。或者您可以[訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，很快自己試用新功能。
