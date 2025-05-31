---
title: "V8 發佈 v9.4"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-09-06
tags: 
 - release
description: "V8 發佈 v9.4 為 JavaScript 帶來類別靜態初始化區塊。"
tweet: "1434915404418277381"
---
每六週，我們會根據 [發佈流程](https://v8.dev/docs/release-process) 創建一個新的 V8 分支。每個版本都會在 Chrome Beta 里程碑之前，直接從 V8 的 Git 主分支分支出來。今天，我們很高興地宣佈我們最新的分支，[V8 版本 9.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4)，該版本在 beta 測試中，並將於數週后與 Chrome 94 Stable 一起發布。V8 v9.4 包含各種針對開發者的新功能。此文章提供了一些即將發布亮點的預覽。

<!--truncate-->
## JavaScript

### 類別的靜態初始化區塊

類別現在可以通過靜態初始化區塊組合每次類別求值時執行的代碼。

```javascript
class C {
  // 此區塊將在類別本身進行求值時執行
  static { console.log("C's 靜態區塊"); }
}
```

從 v9.4 開始，類別靜態初始化區塊將無需 `--harmony-class-static-blocks` 標籤即可使用。關於這些區塊的作用域詳細語義，請參閱[我們的解釋](https://v8.dev/features/class-static-initializer-blocks)。

## V8 API

請使用 `git log branch-heads/9.3..branch-heads/9.4 include/v8.h` 獲取 API 更改的列表。

擁有活躍 V8 檢出項目的開發者可以使用 `git checkout -b 9.4 -t branch-heads/9.4` 來嘗試 V8 v9.4 的新功能。此外，您還可以[訂閱 Chrome 的 Beta 通道](https://www.google.com/chrome/browser/beta.html)，並很快自己嘗試這些新功能。
