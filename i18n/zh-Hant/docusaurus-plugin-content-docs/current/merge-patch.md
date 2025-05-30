---
title: "合併與補丁"
description: "本文檔說明如何將 V8 的補丁合併到發行分支。"
---
如果您有一個針對 `main` 分支的重要補丁（例如修復重要的錯誤），需要將其合併到某個 V8 發行分支（refs/branch-heads/12.5），請繼續閱讀。

以下範例使用 V8 的 12.3 版本，您可以用您的版本號替代 `12.3`。欲了解更多有關[V8 版本命名](/docs/version-numbers)的資訊，請參考文檔。

若要合併補丁，必須在 V8 問題追蹤器中建立相關問題。這有助於追蹤合併情況。

## 什麼符合合併條件？

- 補丁修復了 *嚴重* 的錯誤（按重要性排序）：
    1. 安全性錯誤
    1. 穩定性錯誤
    1. 正確性錯誤
    1. 性能錯誤
- 補丁不修改 API。
- 補丁不改變分支切割之前的行為（除非該行為改變是為了解決錯誤）。

更多資訊請參見[相關的 Chromium 頁面](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/process/merge_request.md)。如果有疑問，請發送電子郵件至 [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com)。

## 合併過程

在 V8 問題追蹤器中的合併過程由屬性驅動。因此，請將 'Merge-Request' 設置為相關的 Chrome Milestone。如果合併僅影響 V8 的[移植](https://v8.dev/docs/ports)，請相應地設置 HW 屬性。例如：

```
Merge-Request: 123
HW: MIPS,LoongArch64
```

經過審核後，審核期間此屬性將被調整為：

```
Merge: Approved-123
或
Merge: Rejected-123
```

補丁被提交後，屬性將再次被調整為：

```
Merge: Merged-123, Merged-12.3
```

## 如何檢查提交是否已經被合併/回退/有 Canary 覆蓋

使用 [chromiumdash](https://chromiumdash.appspot.com/commit/) 驗證相關的 CL 是否在 Canary 中被覆蓋。


在頂部的 **Releases** 部分應該顯示 Canary。

## 如何建立合併 CL

### 選項 1：使用 [gerrit](https://chromium-review.googlesource.com/) - 推薦


1. 開啟您希望回合併的 CL。
1. 從右上角的擴展選單（三個垂直點）中選擇 “Cherry pick”。
1. 輸入 “refs/branch-heads/*XX.X*” 作為目標分支（將 *XX.X* 替換為正確的分支）。
1. 修改提交消息：
   1. 在標題前加上 “Merged: ”。
   1. 刪除腳註中與原始 CL 相關的行（如 “Change-Id”、“Reviewed-on”、“Reviewed-by”、“Commit-Queue”、“Cr-Commit-Position”）。務必保留 “(cherry picked from commit XXX)” 行，因為某些工具需要它來將合併與原始 CL 關聯。
1. 如果存在合併衝突，也請繼續建立 CL。要解決衝突（如果有），可以使用 gerrit 的 UI，或者可以使用擴展選單（右上角三點）中的 “下載補丁” 命令輕鬆拉取補丁到本地。
1. 傳送進行審核。

### 選項 2：使用自動化腳本

假設您正在將版本 af3cf11 合併到 12.2 分支（請指定完整的 git 哈希值 - 此處為簡化起見使用了縮寫）。

```
https://source.chromium.org/chromium/chromium/src/+/main:v8/tools/release/merge_to_branch_gerrit.py --branch 12.3 -r af3cf11
```


### 提交後：觀察 [branch waterfall](https://ci.chromium.org/p/v8)

如果您的補丁處理後其中一個建構器並非綠色，則立即回退該合併。機器人（`AutoTagBot`）在 10 分鐘等待後會自動處理正確的版本標記。

## 修補用於 Canary/Dev 的版本

如果您需要修補 Canary/Dev 版本（這種情況應該不常發生），請在問題中抄送 vahl@ 或 machenbach@。Google 員工可在建立 CL 之前參考[內部網站](http://g3doc/company/teams/v8/patching_a_version)。

