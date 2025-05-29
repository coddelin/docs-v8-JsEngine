---
title: "追踪 V8"
description: "本文档解释了如何利用 V8 的内置追踪支持。"
---
V8 提供了追踪支持。它在通过 Chrome 的追踪系统嵌入 V8 时[自动工作](/docs/rcs)。但您也可以在任何独立的 V8 或在使用默认平台的嵌入器中启用它。有关 trace-viewer 的更多详细信息可以在[这里](https://github.com/catapult-project/catapult/blob/master/tracing/README.md)找到。

## 在 `d8` 中追踪

要开始追踪，请使用 `--enable-tracing` 选项。V8 生成一个 `v8_trace.json` 文件，您可以在 Chrome 中打开它。要在 Chrome 中打开它，请转到 `chrome://tracing`，点击“加载”，然后加载 `v8-trace.json` 文件。

每个追踪事件都与一组类别相关联，您可以根据类别启用/禁用追踪事件的记录。仅使用上述标志会启用默认类别（一组开销较低的类别）。要启用更多类别并更详细地控制不同参数，您需要传递一个配置文件。

以下是一个配置文件 `traceconfig.json` 的示例：

```json
{
  "record_mode": "record-continuously",
  "included_categories": ["v8", "disabled-by-default-v8.runtime_stats"]
}
```

使用追踪和 traceconfig 文件调用 `d8` 的示例：

```bash
d8 --enable-tracing --trace-config=traceconfig.json
```

追踪配置文件格式与 Chrome Tracing 的格式兼容，但是在类别列表中我们不支持正则表达式，且 V8 不需要排除的类别列表，因此 V8 的追踪配置文件可以在 Chrome 追踪中重用，但如果追踪配置文件包含正则表达式，则无法将 Chrome 的追踪配置文件在 V8 追踪中重用。此外，V8 会忽略排除的类别列表。

## 在追踪中启用运行时调用统计

要获取运行时调用统计（<abbr>RCS</abbr>），请启用以下两个类别进行追踪记录：`v8` 和 `disabled-by-default-v8.runtime_stats`。每个顶级 V8 追踪事件都包含该事件期间的运行时统计信息。通过在 `trace-viewer` 中选择任何这些事件，下方面板中会显示运行时统计表。选择多个事件会创建合并视图。

![](/_img/docs/trace/runtime-stats.png)

## 在追踪中启用 GC 对象统计

要在追踪中获取 GC 对象统计信息，您需要收集一个启用了类别 `disabled-by-default-v8.gc_stats` 的追踪记录，并且需要使用以下 `--js-flags`：

```
--track_gc_object_stats --noincremental-marking
```

加载追踪到 `trace-viewer` 后，搜索名为 `V8.GC_Object_Stats` 的切片。统计信息会显示在下方面板中。选择多个切片会创建合并视图。

![](/_img/docs/trace/gc-stats.png)
