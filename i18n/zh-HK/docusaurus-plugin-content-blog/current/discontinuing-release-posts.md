---
title: "停止發佈版本部落格文章"
author: "郭書宇 ([@shu_](https://twitter.com/_shu))"
avatars:
 - "shu-yu-guo"
date: 2022-06-17
tags:
 - release
description: "V8 將停止版本部落格文章，改為根據 Chrome 發佈計劃和功能部落格文章進行更新。"
tweet: "1537857497825824768"
---

歷史上，每個 V8 的新版本分支都有一篇部落格文章發布。您可能注意到自 v9.9 以來沒有新的版本部落格文章了。從 v10.0 開始，我們將停止為每個新分支發佈版本部落格文章。但不用擔心，以前您從部落格文章中獲取的所有資訊仍然可以找到！繼續閱讀以了解前往何處獲取這些資訊。

<!--truncate-->
## 發佈計劃與當前版本

您是閱讀版本部落格文章來確定 V8 的最新版本嗎？

V8 隨 Chrome 的發佈計劃進行。如果需要查詢 V8 的最新穩定版本，請參考 [Chrome 發佈路線圖](https://chromestatus.com/roadmap)。

每四週，我們會按照[發佈流程](https://v8.dev/docs/release-process)創建一個新的 V8 分支。每個版本分支會在 Chrome Beta 里程碑之前從 V8 的 Git 主分支中分出。這些分支處於測試版階段，並與 [Chrome 發佈路線圖](https://chromestatus.com/roadmap)協調成為最終版本。

要查找 Chrome 版本對應的 V8 分支：

1. 將 Chrome 版本號除以 10，可得 V8 的版本號。例如，Chrome 102 對應 V8 10.2。
1. 對於版本號 X.Y，其分支可在以下格式的 URL 中找到：

```
https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/X.Y
```

例如，可以在 https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/10.2 找到 10.2 分支。

有關版本號與分支的更多資訊，請參閱 [我們的詳細文章](https://v8.dev/docs/version-numbers)。

針對 V8 版本 X.Y，擁有活動 V8 檢出版本的開發者可以使用 `git checkout -b X.Y -t branch-heads/X.Y` 來試驗該版本的新功能。

## 新的 JavaScript 或 WebAssembly 功能

您是閱讀版本部落格文章來瞭解有哪些新的 JavaScript 或 WebAssembly 功能在旗標後實現或已預設啟用嗎？

請參考 [Chrome 發佈路線圖](https://chromestatus.com/roadmap)，該路線圖列出了每個版本的新功能及其里程碑。

請注意，[單獨的、深入的功能文章](/features) 可能會在功能在 V8 中實現之前或之後發布。

## 值得注意的性能改進

您是閱讀版本部落格文章來了解值得注意的性能改進嗎？

未來，我們會針對希望凸顯的性能改進單獨撰寫部落格文章，就像我們過去為類似 [Sparkplug](https://v8.dev/blog/sparkplug) 的改進所做的那樣。

## API 變更

您是閱讀版本部落格文章來了解 API 的變更嗎？

要查看某個較早版本 A.B 和較晚版本 X.Y 之間修改 V8 API 的提交列表，請在活動 V8 檢出中使用 `git log branch-heads/A.B..branch-heads/X.Y include/v8\*.h`。
