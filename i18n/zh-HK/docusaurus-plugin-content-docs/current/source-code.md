---
title: '檢視 V8 原始碼'
description: '本文件説明如何在本地檢視 V8 原始碼。'
---
本文件説明如何在本地檢視 V8 原始碼。如果您只是想在線瀏覽原始碼，請使用以下鏈接：

- [瀏覽](https://chromium.googlesource.com/v8/v8/)
- [瀏覽最新進展](https://chromium.googlesource.com/v8/v8/+/master)
- [更改](https://chromium.googlesource.com/v8/v8/+log/master)

## 使用 Git

V8 的 Git 儲存庫位於 https://chromium.googlesource.com/v8/v8.git，並在 GitHub 上設有正式鏡像：https://github.com/v8/v8。

請不要僅僅執行 `git clone` 此類 URL！如果您希望從您的檢出版本構建 V8，請按照以下指導説明正確設置所有內容。

## 指導説明

1. 在 Linux 或 macOS 上，首先安裝 Git，然後安裝 [`depot_tools`](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up)。

    在 Windows 上，按照 Chromium 的説明 ([Google 員工參考](https://goto.google.com/building-chrome-win)，[非 Google 員工參考](https://chromium.googlesource.com/chromium/src/+/master/docs/windows_build_instructions.md#Setting-up-Windows)) 安裝 Git、Visual Studio、Windows 的 Debugging tools 和 `depot_tools`。

1. 通過在終端/命令行中執行以下指令來更新 `depot_tools`。在 Windows 上，必須使用 Command Prompt (`cmd.exe`)，而非 PowerShell 或其它工具。

    ```
    gclient
    ```

1. 若需 **推送訪問** ，需設置 `.netrc` 文件及您的 Git 密碼：

    1. 前往 https://chromium.googlesource.com/new-password 並用您的提交者帳户（通常為 `@chromium.org` 帳户）登錄。注意：創建新密碼並不會自動撤銷任何以前創建的密碼。請確保您使用的電子郵件與 `git config user.email` 中設置的相同。
    1. 查看灰色框中的 shell 命令，將這些行貼到您的 shell 中。

1. 現在，獲取 V8 原始碼，包括所有分支和依賴項：

    ```bash
    mkdir ~/v8
    cd ~/v8
    fetch v8
    cd v8
    ```

完成後您會處於分離頭部狀態。

您可以選擇指定新分支如何被跟蹤：

```bash
git config branch.autosetupmerge always
git config branch.autosetuprebase always
```

或者，您可以像以下方式創建新的本地分支（推薦）：

```bash
git new-branch fix-bug-1234
```

## 保持最新

使用 `git pull` 更新您的當前分支。注意，如果您不處於某個分支，`git pull` 將不起作用，您需要使用 `git fetch`。

```bash
git pull
```

有時 V8 的依賴項會被更新。您可執行以下指令同步它們：

```bash
gclient sync
```

## 提交代碼以供審查

```bash
git cl upload
```

## 提交

您可以使用 codereview 上的 CQ 勾選框進行提交（推薦）。另見 [Chromium 指南](https://chromium.googlesource.com/chromium/src/+/master/docs/infra/cq.md) 以獲取 CQ 標誌及常見問題解答。

若您需要超出默認範圍的 trybots，可以在 Gerrit 上的提交訊息中添加以下內容（例如添加 nosnap bot）：

```
CQ_INCLUDE_TRYBOTS=tryserver.v8:v8_linux_nosnap_rel
```

手動執行時，更新您的分支：

```bash
git pull --rebase origin
```

然後執行以下指令提交：

```bash
git cl land
```

## Try jobs

此部分僅適用於 V8 項目的成員。

### 從 codereview 創建 try job

1. 上傳一個 CL 到 Gerrit。

    ```bash
    git cl upload
    ```

1. 試用該 CL，並像下面這樣將試驗任務發送到 try bots：

    ```bash
    git cl try
    ```

1. 等待 try bots 編譯，並通過電子郵件接收結果。您也可以在 Gerrit 上檢查您的補丁的試驗狀態。

1. 若補丁應用失敗，您需要重定您的補丁或指定 V8 的同步版本：

```bash
git cl try --revision=1234
```

### 從本地分支創建 try job

1. 在本地儲存庫的 git 分支上提交一些更改。

1. 試用更改，並像下面這樣將試驗任務發送到 try bots：

    ```bash
    git cl try
    ```

1. 等待 try bots 編譯，並通過電子郵件接收結果。注意：目前某些複本存在問題。推薦從 codereview 發送試驗任務。

### 有用的參數

revision 參數指示 try bot 使用哪個版本的代碼庫來應用您的本地更改。若無 revision，則使用 [V8 的 LKGR 版本](https://v8-status.appspot.com/lkgr) 作為基準。

```bash
git cl try --revision=1234
```

若希望避免使您的試驗任務運行於所有 bots，可使用 `--bot` 標誌，並指定一個逗號分隔的建構器名稱清單。例如：

```bash
git cl try --bot=v8_mac_rel
```

### 檢視 try server

```bash
git cl try-results
```

## 原始碼分支

V8 有多个不同分支；如果您不確定應該选择哪個版本，您很可能需要最新的穩定版本。查看我們的[發佈流程](/docs/release-process)以了解更多關於分支的資訊。

您可能會希望关注 Chrome 穩定（或測試版）頻道所提供的 V8 版本，請參見 https://omahaproxy.appspot.com/。
