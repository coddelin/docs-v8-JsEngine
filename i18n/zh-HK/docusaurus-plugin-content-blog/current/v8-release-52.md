---
title: 'V8 版本 v5.2'
author: 'V8 團隊'
date: 2016-06-04 13:33:37
tags:
  - 版本發布
description: 'V8 v5.2 包含支援 ES2016 語言功能。'
---
大約每隔六週，我們根據[版本發布流程](/docs/release-process)創建 V8 的新分支。每個版本都來自 V8 的 Git 主分支，並立即在 Chrome Beta 的里程碑分支之前創建分支。今天我們榮幸地宣布最新的分支，[V8 版本 5.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.2)，它將進入 Beta 階段，並與 Chrome 52 穩定版協調發布。V8 5.2 包含各種面向開發者的精彩功能，因此我們希望在幾週後版本發布之前為您預覽一些亮點。

<!--truncate-->
## ES2015 與 ES2016 支援

V8 v5.2 包含對 ES2015（即 ES6）與 ES2016（即 ES7）的支援。

### 指數運算符

此版本包含對 ES2016 指數運算符的支援，它是一種中置語法，用於替代 `Math.pow`。

```js
let n = 3**3; // n == 27
n **= 2; // n == 729
```

### 規範演化

關於支持逐步演化的規範及針對網頁相容性問題和尾調用進行的標準討論的複雜性，詳情請參閱 V8 部落格文章[ES2015、ES2016及未來](/blog/modern-javascript)。

## 性能

V8 v5.2 包含進一步的優化，以提升 JavaScript 內建功能的性能，包括針對陣列操作（例如 isArray 方法、in 運算符和 Function.prototype.bind）的改進。這是基於對熱門網頁運行時調用統計的新分析而持續進行的內建加速工作的一部分。詳情請參閱 [V8 Google I/O 2016 講座](https://www.youtube.com/watch?v=N1swY14jiKc)，並期待即將發布的文章，分享來自真實世界網站的性能優化內容。

## V8 API

請查看我們的[API 更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文檔會在每次主要版本發布後的幾周後定期更新。

擁有[活躍的 V8 檢出版本](https://v8.dev/docs/source-code#using-git)的開發者可以使用 `git checkout -b 5.2 -t branch-heads/5.2` 來試驗 V8 v5.2 中的新功能。或者，您可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並很快親自試用新的功能。
