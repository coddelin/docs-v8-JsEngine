---
title: 'Tracing V8'
description: '本文件説明如何利用 V8 的內建追踪支持功能。'
---
V8 提供了追踪支持。它[在 V8 嵌入到 Chrome 中時通過 Chrome 追踪系統自動工作](/docs/rcs)。但在任何獨立的 V8 或使用 Default Platform 的嵌入程序中，你也可以啟用該功能。有關 trace-viewer 的更多詳細信息可以[此處](https://github.com/catapult-project/catapult/blob/master/tracing/README.md)找到。

## 在 `d8` 中進行追踪

要開始追踪，使用 `--enable-tracing` 選項。V8 會生成一個 `v8_trace.json` 文件，你可以在 Chrome 中打開。要在 Chrome 中打開，訪問 `chrome://tracing`，點擊“Load”，然後加載 `v8-trace.json` 文件。

每個追踪事件都與一組分類相關聯，你可以根據分類啟用/禁用追踪事件的記錄。僅使用上述標誌將僅啟用默認分類（具有低開銷的一組分類）。要啟用更多分類並更精細地控制不同參數，你需要傳遞一個配置文件。

以下是一個配置文件 `traceconfig.json` 的示例：

```json
{
  "record_mode": "record-continuously",
  "included_categories": ["v8", "disabled-by-default-v8.runtime_stats"]
}
```

使用追踪和 traceconfig 文件調用 `d8` 的示例如下：

```bash
d8 --enable-tracing --trace-config=traceconfig.json
```

追踪配置格式與 Chrome 追踪格式兼容，但我們不支持在包含的分類列表中使用正則表達式，且 V8 不需要排除分類列表，因此 V8 的追踪配置文件可以在 Chrome 追踪中重用，但如果追踪配置文件包含正則表達式，你將無法在 V8 追踪中重用 Chrome 的追踪配置文件。此外，V8 會忽略排除分類列表。

## 在追踪中啟用 Runtime Call Statistics

要獲取 Runtime Call Statistics (<abbr>RCS</abbr>)，請以啟用以下兩個分類的方式進行追踪記錄：`v8` 和 `disabled-by-default-v8.runtime_stats`。每個頂級的 V8 追踪事件包含該事件期間的運行時統計數據。在 `trace-viewer` 中選擇任意事件，運行時統計表將顯示在下方面板中。選擇多個事件將創建合併視圖。

![](/_img/docs/trace/runtime-stats.png)

## 在追踪中啟用 GC Object Statistics

要在追踪中獲取 GC Object Statistics，你需要收集一個啟用了 `disabled-by-default-v8.gc_stats` 分類的追踪，並使用以下 `--js-flags`：

```
--track_gc_object_stats --noincremental-marking
```

一旦你在 `trace-viewer` 中加載了追踪，搜尋名為 `V8.GC_Object_Stats` 的分片。統計數據將顯示在下方面板中。選擇多個分片將創建合併視圖。

![](/_img/docs/trace/gc-stats.png)
