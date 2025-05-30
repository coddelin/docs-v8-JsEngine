---
title: "V8 的版本編號方案"
description: "此文檔說明 V8 的版本編號方案。"
---
V8 版本號的格式為 `x.y.z.w`，其中：

- `x.y` 是 Chromium 的里程碑數字除以 10（例如 M60 → `6.0`）
- 每當有新的 [LKGR](https://www.chromium.org/chromium-os/developer-library/glossary/#acronyms) 時，`z` 會自動增加（通常每天幾次）
- 分支點之後為手動回合的補丁增加時，`w` 會增加

如果 `w` 是 `0`，它會被省略。例如，v5.9.211（而不是 “v5.9.211.0”）在回合補丁後會被提升到 v5.9.211.1。

## 我應該使用哪個 V8 版本？

V8 的嵌入者通常應該使用 *與 Chrome 中配送的 V8 次要版本對應的分支頭*。

### 尋找與最新穩定版 Chrome 對應的 V8 次要版本

要找到此版本，

1. 前往 https://chromiumdash.appspot.com/releases
2. 在表中找到最新穩定版 Chrome 版本
3. 點擊 (i) 並檢查 `V8` 欄位


### 尋找對應分支的分支頭

V8 的版本相關分支不會出現在線上的儲存庫 https://chromium.googlesource.com/v8/v8.git；而是只有標籤出現。要找到該分支的分支頭，可以訪問以下形式的 URL：

```
https://chromium.googlesource.com/v8/v8.git/+/branch-heads/<minor-version>
```

例子：對於上述找到的 V8 次要版本 12.1，我們訪問 https://chromium.googlesource.com/v8/v8.git/+/branch-heads/12.1，找到標題為 “Version 12.1.285.2” 的提交。

**注意：** 你不應該僅僅找到與上述次要 V8 版本對應的數字最大的標籤，因為有時這些版本不受支持，例如，它們可能是在決定次要版本的切割點之前被標記的。此類版本不會接收回合或其他更新。

例子：V8 標籤 `5.9.212`，`5.9.213`，`5.9.214`，`5.9.214.1`，…，以及 `5.9.223` 都被放棄了，儘管它們數字上大於 5.9.211.33 的 **分支頭**。

### 檢出對應分支的分支頭

如果你已經擁有源代碼，你可以直接檢出分支頭。如果你使用 `depot_tools` 獲取了源代碼，那麼你應該能夠執行

```bash
git branch --remotes | grep branch-heads/
```

來列出相關分支。你需要檢出與上述找到的 V8 次要版本對應的分支並使用它。你最終所處的標籤就是適合你作為嵌入者使用的 V8 版本。

如果你沒有使用 `depot_tools`，則編輯 `.git/config`，並在 `[remote "origin"]` 節中新增以下行：

```
fetch = +refs/branch-heads/*:refs/remotes/branch-heads/*
```
