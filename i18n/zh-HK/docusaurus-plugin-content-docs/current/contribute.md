---
title: '貢獻至 V8'
description: '本文檔說明了如何為 V8 貢獻。'
---
本頁面提供的信息解釋了如何為 V8 貢獻。請在提交貢獻之前確保完整閱讀。

## 獲取代碼

參閱[檢出 V8 源代碼](/docs/source-code)。

## 在您貢獻之前

### 在 V8 的郵件列表中徵詢指導

在開始進行較大的 V8 貢獻之前，請先通過 [V8 貢獻者郵件列表](https://groups.google.com/group/v8-dev) 與我們聯繫，以便我們提供幫助並可能指導您。事先協調可以更容易避免後續的挫折。

### 簽署 CLA

在我們使用您的代碼之前，您需要在線簽署[Google 個人貢獻者許可協議](https://cla.developers.google.com/about/google-individual)。這主要是因為即使您的貢獻成為我們代碼庫的一部分，您仍然保留對改動的版權，因此我們需要您的許可來使用和分發您的代碼。我們還需要確保其他一些事情，例如如果您知道您的代碼侵犯了他人的專利，您會告知我們。在您提交代碼供審核並獲得成員批准後才需要完成該步驟，但在我們將您的代碼納入代碼庫之前，必須完成。

由公司提交的貢獻受到不同於上述協議的約束，即[軟件授權和公司貢獻者許可協議](https://cla.developers.google.com/about/google-corporate)。

在此處在線簽署[這些協議](https://cla.developers.google.com/)。

## 提交您的代碼

V8 的源代碼遵循[Google C++ 樣式指南](https://google.github.io/styleguide/cppguide.html)，因此您應熟悉這些準則。在提交代碼之前，您必須通過我們所有的[測試](/docs/test)，並成功運行預提交檢查：

```bash
git cl presubmit
```

預提交腳本使用 Google 的 linter[`cpplint.py`](https://raw.githubusercontent.com/google/styleguide/gh-pages/cpplint/cpplint.py)。它是[`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools) 的一部分，並且必須在您的 `PATH` 中——因此，如果您將 `depot_tools` 添加到您的 `PATH`，一切都應該正常運行。

### 上傳到 V8 的代碼審查工具

所有提交，包括項目成員的提交，都需要審核。我們使用與 Chromium 項目相同的代碼審查工具和過程。為了提交補丁，您需要獲取[`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools)，並按照[請求審核](https://chromium.googlesource.com/chromium/src/+/master/docs/contributing.md)的說明進行操作（使用您的 V8 工作空間而不是 Chromium 工作空間）。

### 注意故障或回歸

一旦您獲得代碼審查批准，您可以使用提交隊列合併您的補丁。提交隊列會運行一系列測試，如果所有測試都通過，它會提交您的補丁。您的更改被提交後，最好觀察[控制台](https://ci.chromium.org/p/v8/g/main/console)直到機器人在您的更改後變為綠色，因為控制台運行的測試比提交隊列稍多一些。
