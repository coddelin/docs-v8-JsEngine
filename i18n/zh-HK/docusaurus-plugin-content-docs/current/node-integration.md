---
title: &apos;如果您的 CL 導致 Node.js 整合構建失敗，該怎麼辦&apos;
description: &apos;本文檔說明如果您的 CL 導致 Node.js 整合構建失敗，該如何處理。&apos;
---
[Node.js](https://github.com/nodejs/node) 使用 V8 的穩定版或測試版。為了進一步整合，V8 團隊使用 V8 的[主分支](https://chromium.googlesource.com/v8/v8/+/refs/heads/main) 构建 Node.js，即使用當前的 V8 版本。我們為 [Linux](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Linux64) 提供了整合機器人，[Windows](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Win64) 和 [Mac](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Mac64) 正在開發中。

如果 [`node_ci_linux64_rel`](https://ci.chromium.org/p/node-ci/builders/try/node_ci_linux64_rel) 機器人在 V8 提交隊列中失敗，可能是您的 CL 存在問題（需要修復），或者需要修改 [Node](https://github.com/v8/node/)。如果 Node 測試失敗，請檢索日誌文件中的 “Not OK”。**本文檔旨在說明如何在本地重現問題，以及當您的 V8 CL 導致構建失敗時，如何修改 [V8 的 Node 分叉](https://github.com/v8/node/)。**

## 源代碼

請按照 node-ci 存儲庫中的[指南](https://chromium.googlesource.com/v8/node-ci)檢出代碼。

## 測試對 V8 的更改

V8 被設置為 node-ci 的 DEPS 項目依賴關係。您可能需要對 V8 進行更改以進行測試或重現故障。要進行更改，請將您的主 V8 檢出設置為遠端：

```bash
cd v8
git remote add v8 <your-v8-dir>/.git
git fetch v8
git checkout v8/<your-branch>
cd ..
```

在編譯之前記得運行 gclient hooks。

```bash
gclient runhooks
JOBS=`nproc` make test
```

## 對 Node.js 進行修改

Node.js 同樣被設置為 node-ci 的 `DEPS` 項目依賴關係。您可能需要對 Node.js 進行修改，以解決由 V8 修改造成的損壞。V8 通過其 [Node.js 分叉](https://github.com/v8/node) 進行測試。您需要擁有 GitHub 帳戶才能修改該分叉。

### 獲取 Node 源代碼

Fork [V8 的 Node.js 存儲庫](https://github.com/v8/node/)（點擊 fork 按鈕），如果之前已經 fork 則跳過此步驟。

將您的 fork 和 V8 的 fork 均添加為現有檢出的遠端：

```bash
cd node
git remote add v8 http://github.com/v8/node
git remote add <your-user-name> git@github.com:<your-user-name>/node.git
git fetch v8
git checkout v8/node-ci-<sync-date>
export BRANCH_NAME=`date +"%Y-%m-%d"`_fix_name
git checkout -b $BRANCH_NAME
```

> **注意** `<sync-date>` 是與上游 Node.js 同步的日期。請選擇最新日期。

對 Node.js 檢出進行修改，並提交修改。然後將更改推送到 GitHub：

```bash
git push <your-user-name> $BRANCH_NAME
```

並針對分支 `node-ci-<sync-date>` 創建一個拉取請求。


一旦拉取請求被合併到 V8 的 Node.js 分叉中，您需要更新 node-ci 的 `DEPS` 文件並創建一個 CL。

```bash
git checkout -b update-deps
gclient setdep --var=node_revision=<merged-commit-hash>
git add DEPS
git commit -m &apos;更新 Node&apos;
git cl upload
```
