---
title: &apos;Flake bisect&apos;
description: &apos;本文檔解釋如何進行不穩定測試的二分查找。&apos;
---
不穩定測試報告會在機器人上的單獨步驟中顯示（[範例構建](https://ci.chromium.org/ui/p/v8/builders/ci/V8%20Linux64%20TSAN/38630/overview)）。

每個測試日誌都提供了一條預填命令行，用於觸發自動的不穩定測試二分查找，例如：

```
在命令行觸發不穩定測試二分查找：
bb add v8/try.triggered/v8_flako -p &apos;to_revision="deadbeef"&apos; -p &apos;test_name="MyTest"&apos; ...
```

在第一次觸發不穩定測試二分查找前，使用者必須使用 google.com 賬號登錄：

```bash
bb auth-login
```

然後執行提供的命令，該命令返回運行不穩定測試二分查找的構建 URL（[範例](https://ci.chromium.org/ui/p/v8/builders/try.triggered/v8_flako/b8836020260675019825/overview)）。

如果幸運的話，二分查找會指向一個可疑點。如果沒有，您可能需要進一步閱讀…

## 詳細描述

有關技術細節，也可參見實現的 [跟蹤 bug](https://crbug.com/711249)。不穩定測試二分查找方法與 [findit](https://sites.google.com/chromium.org/cat/findit) 擁有相同的目標，但採用不同的實現。

### 它如何運作？

二分查找任務分為三個階段：校準、向後二分和向內二分。在校準階段，通過增加總超時（或重複次數）來重複測試，直到在一次運行中檢測到足夠的錯誤。然後，向後二分逐漸加倍 Git 範圍，直到找到沒有錯誤的版本號。最後，我們會將二分範圍縮小到好的修訂版本和最舊的壞版本之間。需要注意的是，二分查找不會產生新的構建產品，它完全是基於 V8 持續基礎設施上之前創建的構建。

### 二分查找失敗的情況…

- 在校準期間無法達成足夠的信心。這對於百萬分之一的錯誤或僅在其他測試並行運行時才可見的不穩定行為而言是典型情況（例如，佔用記憶體的測試）。
- 肇事者太久遠。二分查找在一定步驟後退出，或舊的構建已不再可用於 isolate 服務器上。
- 整體二分查找任務超時。在此情況下，可以使用已知的較舊壞版本重新啟動它。

## 自定義不穩定測試二分查找的屬性

- `extra_args`: 傳遞給 V8 的 `run-tests.py` 腳本的額外參數。
- repetitions: 初始測試重複次數（傳遞給 `run-tests.py` 的 `--random-seed-stress-count` 選項；如果使用 `total_timeout_sec` 則不啟用該屬性）。
- `timeout_sec`: 傳遞給 `run-tests.py` 的超時參數。
- `to_revision`: 已知有問題的版本。二分查找將從此開始。
- `total_timeout_sec`: 一次完整二分步驟的初始總超時。在校準期間，如果需要，該時間會多次加倍。設為 0 以禁用並改用 `repetitions` 屬性。
- `variant`: 傳遞給 `run-tests.py` 的測試變體名稱。

## 不需要更改的屬性

- `bisect_buildername`: 生成用於二分查找構建的生成器名稱。
- `bisect_mastername`: 生成用於二分查找構建的生成器的名稱。
- `build_config`: 傳遞給 V8 的 `run-tests.py` 腳本的構建配置（腳本中的參數名稱為 `--mode`，例如：`Release` 或 `Debug`）。
- `isolated_name`: 獨立文件的名稱（例如 `bot_default`, `mjsunit`）。
- `swarming_dimensions`: 分類測試應運行機器類型的 Swarming 維度列表。以字符串列表形式傳遞，每個字符串的格式為 `name:value`。
- `test_name`: 傳遞給 `run-tests.py` 的完全限定測試名稱。例如 `mjsunit/foobar`。

## 提示與技巧

### 二分查找一個掛起測試（例如死鎖）

如果失敗的執行超時，而成功則執行非常迅速，可以調整 `timeout_sec` 參數，避免二分查找延遲於等待掛起的執行超時。例如，如果成功通常在 &lt;1 秒內完成，則將超時設置為較低的值，例如 5 秒。

### 提高對肇事者的信心

在一些執行中，信心水平可能非常低。例如，校準僅在一次運行中檢測到四個錯誤即可滿足。在二分查找期間，每次運行中只要有一個或多個錯誤就被記為失敗。在這些情況下，可以重新啟動二分查找任務，將 `to_revision` 設置為肇事者並使用比原始任務更高的重複次數或總超時，並確認再次得出相同結論。

### 針對超時問題的解決方法

如果全局超時選項導致構建掛起，最好估算出合適的重複次數，並將 `total_timeout_sec` 設置為 `0`。

### 測試行為取決於隨機種子
