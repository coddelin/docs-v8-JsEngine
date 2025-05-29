---
title: "V8 發佈 v9.6"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-10-13
tags: 
 - release
description: "V8 發佈 v9.6 為 WebAssembly 帶來了支援 Reference Types (參考類型) 的功能。"
tweet: "1448262079476076548"
---
每四週，我們會按照[發佈流程](https://v8.dev/docs/release-process)創建一個新的 V8 分支。每個版本都在緊接 Chrome Beta 里程碑之前，從 V8 的 Git 主分支中分支出來。今天，我們很高興地宣佈我們最新的分支，[V8 version 9.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.6)，目前處於 Beta 測試階段，將在幾週內隨 Chrome 96 穩定版一同推出。V8 v9.6 帶來了許多面向開發者的新功能和改進。這篇文章提前預覽了一些亮點，敬請期待正式發佈。

<!--truncate-->
## WebAssembly

### 參考類型

[參考類型提案](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md) 已在 V8 v9.6 中實現，支持在 WebAssembly 模組中以不透明的方式使用來自 JavaScript 的外部參考。`externref`（先前稱為 `anyref`）數據類型提供了一種安全的方式來持有對 JavaScript 物件的參考，並完全整合到 V8' 的垃圾回收機制中。

目前已有少數工具鏈對參考類型提供可選支援，例如 [適用於 Rust 的 wasm-bindgen](https://rustwasm.github.io/wasm-bindgen/reference/reference-types.html) 和 [AssemblyScript](https://www.assemblyscript.org/compiler.html#command-line-options)。

## V8 API

請使用 `git log branch-heads/9.5..branch-heads/9.6 include/v8\*.h` 查看 API 更改的列表。

擁有啟用中 V8 源碼庫的開發者，可以使用 `git checkout -b 9.6 -t branch-heads/9.6` 來試驗 V8 v9.6 的新功能。或者，你也可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，不久後親自試用新功能。
