---
title: '釋出流程'
description: '本文檔解釋了 V8 的釋出流程。'
---
V8 的釋出流程與 [Chrome](https://www.chromium.org/getting-involved/dev-channel) 的釋出流程緊密相連。V8 團隊使用所有四個 Chrome 釋出渠道將新版本推送給用戶。

如果您想查看某個 Chrome 版本包含哪個 V8 版本，您可以查閱 [Chromiumdash](https://chromiumdash.appspot.com/releases)。在 V8 儲存庫中，針對每個 Chrome 釋出創建一個單獨的分支，以便於追溯，例如 [Chrome M121](https://chromium.googlesource.com/v8/v8/+log/refs/branch-heads/12.1)。

## Canary 釋出

每天一個新的 Canary 版本通過 [Chrome 的 Canary 渠道](https://www.google.com/chrome/browser/canary.html?platform=win64)推送給用戶。通常情況下，可交付的版本是來自 [main](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main) 的最新且穩定版本。

Canary 的分支通常如下所示：

## Dev 釋出

每週一個新的 Dev 版本通過 [Chrome 的 Dev 渠道](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel&platform=win64)推送給用戶。通常情況下，可交付的版本包括 Canary 渠道上的最新穩定的 V8 版本。


## Beta 釋出

大約每兩週創建一個新的主分支，例如 [Chrome 94](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4)。這與 [Chrome Beta 渠道](https://www.google.com/chrome/browser/beta.html?platform=win64) 的創建同步進行。Chrome Beta 版本固定在 V8 的分支的頂部。大約 2 週後，該分支會升級到 Stable。

更改僅在分支上挑選以穩定版本。

Beta 的分支通常如下所示：

```
refs/branch-heads/12.1
```

它們基於 Canary 的分支。

## Stable 釋出

大約每 4 週進行一次新的 Stable 釋出。沒有創建特殊的分支，因為最新的 Beta 分支直接升級為 Stable。此版本通過 [Chrome 的 Stable 渠道](https://www.google.com/chrome/browser/desktop/index.html?platform=win64)推送給用戶。

Stable 釋出的分支通常如下所示：

```
refs/branch-heads/12.1
```

它們是升級（重複使用）的 Beta 分支。

## API

Chromiumdash 也提供了一個 API 用於收集相同的信息：

```
https://chromiumdash.appspot.com/fetch_milestones (獲取 V8 分支名稱，例如 refs/branch-heads/12.1)
https://chromiumdash.appspot.com/fetch_releases (獲取 V8 分支的 git 哈希值)
```

以下參數很有幫助：
mstone=121
channel=Stable,Canary,Beta,Dev
platform=Mac,Windows,Lacros,Linux,Android,Webview,etc.

## 我應該在應用程式中嵌入哪個版本？

與 Chrome 的 Stable 渠道使用的分支相同的最新分支。

我們經常將重要的錯誤修正回合併到穩定分支，因此如果您關心穩定性、安全性和正確性，您也應該包括這些更新——這就是為什麼我們推薦“分支的最新版本”，而不是一個精確版本。

一旦新分支被升級為 Stable，我們便停止維護上一個穩定分支。這每四週就會發生一次，所以您應該準備至少這麼頻繁地更新。

**相關了:** [我應該使用哪個 V8 版本？](/docs/version-numbers#which-v8-version-should-i-use%3F)
