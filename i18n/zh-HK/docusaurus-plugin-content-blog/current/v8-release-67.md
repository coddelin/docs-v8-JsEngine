---
title: &apos;V8 發佈 v6.7&apos;
author: &apos;V8 團隊&apos;
date: 2018-05-04 13:33:37
tags:
  - 發佈
tweet: &apos;992506342391742465&apos;
description: &apos;V8 v6.7 增加了更多不信任代碼緩解措施並提供 BigInt 支援。&apos;
---
每六週，我們會建立一個 V8 分支，作為我們[發佈流程](/docs/release-process)的一部分。每個版本都從 V8 的 Git master 分支中提取，並與 Chrome Beta 里程碑牢牢同步。今天，我們很高興地宣佈我們最新的分支，[V8 版本 6.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.7)，該版本將進入 Beta 測試階段，直到幾週后與 Chrome 67 Stable 一起發佈。V8 v6.7 提供了大量面向開發者的新功能。這篇文章係爲正式發佈提供了一些亮點預覽。

<!--truncate-->
## JavaScript 語言功能

V8 v6.7 配備了默認啟用的 BigInt 支援功能。BigInt 是 JavaScript 中一種新的數值型原始型別，它可以表示任意精度的整數。閱讀[我們的 BigInt 功能解析](/features/bigint)以獲取更多資訊了解如何在 JavaScript 中使用 BigInt，並查看[我們詳細描述的 V8 實現文章](/blog/bigint)。

## 不信任代碼緩解措施

在 V8 v6.7 中，我們已採用[更多的側信道漏洞緩解措施](/docs/untrusted-code-mitigations)，以防止資訊洩露給不可信的 JavaScript 和 WebAssembly 代碼。

## V8 API

請使用 `git log branch-heads/6.6..branch-heads/6.7 include/v8.h` 來獲取 API 更改的清單。

擁有[活躍 V8 檢出](/docs/source-code#using-git)的開發者可以使用 `git checkout -b 6.7 -t branch-heads/6.7` 來嘗試 V8 v6.7 的新功能。或者，你可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，不久自己嘗試這些新功能。
