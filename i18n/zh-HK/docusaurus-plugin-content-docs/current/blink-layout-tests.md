---
title: "Blink 網頁測試（又名版面配置測試）"
description: "V8 的基礎設施持續運行 Blink 的網頁測試，以防止與 Chromium 的整合問題。本文檔描述了遇到此類測試失敗時該怎麼做。"
---
我們在 [整合控制台](https://ci.chromium.org/p/v8/g/integration/console) 上持續運行 [Blink 的網頁測試（之前稱為“版面配置測試”）](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md)，以防止與 Chromium 的整合問題。

在測試失敗的情況下，機器人會比較 V8 主分支和 Chromium 固定的 V8 版本的結果，以僅標記新引入的 V8 問題（假陽性率 < 5%）。歸因非常簡單，因為 [Linux 發行版](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Blink%20Linux) 機器人測試所有修訂版本。

通常，包含新引入的故障的提交會被回退以避免阻止自動提交到 Chromium。如果您發現自己破壞了版面配置測試或您的提交因這類破壞而被回退，並且如果這些更改是預期中的，請按照以下流程在重新提交您的 CL 之前將更新的基線添加到 Chromium：

1. 提交一個 Chromium 更改，為更改的測試設置 `[ Failure Pass ]`（[詳細資訊](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#updating-the-expectations-files)）。
1. 提交您的 V8 CL 並等待1-2天讓它進入 Chromium。
1. 按照[這些指示](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md#Rebaselining-Web-Tests)手動生成新的基線。請注意，如果您僅對 Chromium 進行更改，[這種首選的自動流程](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#how-to-rebaseline)應該適合您。
1. 從測試預期檔案中刪除 `[ Failure Pass ]` 條目，並將其與新的基線一起提交到 Chromium。

請將所有 CL 與 `Bug: …` 尾註相關聯。
