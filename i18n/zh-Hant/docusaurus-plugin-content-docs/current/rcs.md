---
title: "Runtime Call Stats"
description: "本文件解釋瞭如何使用 Runtime Call Stats 獲取詳細的 V8 內部指標。"
---
[開發者工具性能面板 (DevTools Performance panel)](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/) 通過可視化各種 Chrome 內部指標，為您的網頁應用提供運行時性能洞察。然而，某些低層次的 V8 指標目前尚未在開發者工具中公開。本文將指導您通過 `chrome://tracing` 收集詳細的 V8 內部指標，這被稱為 Runtime Call Stats 或 RCS。

Tracing 記錄整個瀏覽器的行為，包括其他標籤頁、窗口和擴展，所以最好在乾淨的用戶配置檔中，禁用擴展且不打開其他標籤頁時使用：

```bash
# 啟動一個新的 Chrome 瀏覽器會話，使用乾淨的用戶配置檔並禁用擴展
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

在第一個標籤頁中輸入您想測量的頁面的 URL，但還不要加載該頁面。

![](/_img/rcs/01.png)

新增第二個標籤頁，然後打開 `chrome://tracing`。提示：您可以只輸入 `chrome:tracing`，無需斜槓。

![](/_img/rcs/02.png)

單擊“Record”按鈕準備錄製跟蹤。首先選擇“Web developer”，然後選擇“Edit categories”。

![](/_img/rcs/03.png)

從列表中選擇 `v8.runtime_stats`。根據您調查的詳細程度，您也可以選擇其他類別。

![](/_img/rcs/04.png)

按下“Record”並切換回第一個標籤頁加載頁面。最快的方法是使用 <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>1</kbd> 直接跳轉至第一個標籤頁，然後按 <kbd>Enter</kbd> 接受輸入的 URL。

![](/_img/rcs/05.png)

等待頁面完成加載或緩衝區已滿，然後點擊“Stop”停止錄製。

![](/_img/rcs/06.png)

尋找包含已錄製標籤頁的網頁標題的“Renderer”部分。最簡單的方法是單擊“Processes”，然後單擊“None”取消選中所有條目，然後僅選擇您感興趣的 renderer。

![](/_img/rcs/07.png)

通過按住 <kbd>Shift</kbd> 並拖動選擇跟蹤事件/切片。確保覆蓋 _所有_ 部分，包括 `CrRendererMain` 和任何 `ThreadPoolForegroundWorker`。底部會出現一個包含所有選定切片的表格。

![](/_img/rcs/08.png)

滾動到表格的右上角，點擊 “Runtime call stats table” 旁邊的鏈接。

![](/_img/rcs/09.png)

在出現的視圖中，滾動到底部查看 V8 佔用時間的詳細表格。

![](/_img/rcs/10.png)

通過展開分類，您可以進一步深入到數據中。

![](/_img/rcs/11.png)

## 命令行界面

使用 [`d8`](/docs/d8) 並帶上 `--runtime-call-stats` 標誌，即可從命令行獲取 RCS 指標：

```bash
d8 --runtime-call-stats foo.js
```
