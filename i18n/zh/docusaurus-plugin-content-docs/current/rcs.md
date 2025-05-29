---
title: '运行时调用统计'
description: '本文档解释了如何使用运行时调用统计获取详细的V8内部指标。'
---
[开发者工具性能面板](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/)通过可视化各种Chrome内部指标，提供对您的Web应用运行时性能的深入洞察。然而，某些低级别的V8指标目前并未在开发者工具中展示。本文将指导您通过`chrome://tracing`以最强大的方式收集详细的V8内部指标，称为运行时调用统计或RCS。

跟踪记录整个浏览器的行为，包括其他标签页、窗口和扩展程序，因此最好在干净的用户配置文件中运行，禁用扩展程序，并关闭其他浏览器标签页：

```bash
# 使用干净的用户配置文件并禁用扩展程序启动一个新的Chrome浏览器会话
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

在第一个标签页中输入您想要测量页面的URL，但不要加载页面。

![](/_img/rcs/01.png)

添加第二个标签页并打开`chrome://tracing`。提示：您可以直接输入`chrome:tracing`，无需斜杠。

![](/_img/rcs/02.png)

点击“记录”按钮准备记录跟踪。首先选择“Web开发者”，然后选择“编辑类别”。

![](/_img/rcs/03.png)

从列表中选择`v8.runtime_stats`。根据您的调查细致程度，您可以选择其他类别。

![](/_img/rcs/04.png)

按下“记录”并切换回第一个标签页加载页面。最快的方法是使用<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>1</kbd>直接跳转到第一个标签页，然后按<kbd>Enter</kbd>确认输入的URL。

![](/_img/rcs/05.png)

等待页面加载完成或缓冲区已满，然后“停止”记录。

![](/_img/rcs/06.png)

查找一个包含记录标签页网页标题的“渲染器”部分。最简单的方法是点击“进程”，然后点击“无”以取消选中所有条目，然后只选择您感兴趣的渲染器。

![](/_img/rcs/07.png)

通过按住<kbd>Shift</kbd>并拖动选择跟踪事件/切片。确保覆盖_所有_部分，包括`CrRendererMain`和任何`ThreadPoolForegroundWorker`。底部会出现一个包含所有选中切片的表格。

![](/_img/rcs/08.png)

滚动到表格的右上角，并点击“运行时调用统计表”旁的链接。

![](/_img/rcs/09.png)

在出现的视图中，滚动到底部查看详细的V8时间分配表。

![](/_img/rcs/10.png)

通过展开类别，您可以进一步深入查看数据。

![](/_img/rcs/11.png)

## 命令行界面

运行[`d8`](/docs/d8)并使用`--runtime-call-stats`从命令行获取RCS指标：

```bash
d8 --runtime-call-stats foo.js
```
