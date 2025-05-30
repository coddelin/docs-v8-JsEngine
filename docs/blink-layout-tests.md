---
title: "Blink 网页测试（又称布局测试）"
description: "V8 的基础设施会持续运行 Blink 的网页测试，以防止与 Chromium 集成出现问题。本文件描述在这些测试失败时应该怎么做。"
---
我们会在[集成控制台](https://ci.chromium.org/p/v8/g/integration/console)上持续运行[Blink 网页测试（以前称为“布局测试”）](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md)，以防止与 Chromium 集成出现问题。

在测试失败时，机器人会比较 V8 的最新版本与 Chromium 的固定 V8 版本的结果，以仅标记新引入的 V8 问题（误报率 < 5%）。由于 [Linux 版本](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Blink%20Linux)机器人测试所有修订，归因很简单。

通常会回滚引入新故障的提交，以解除自动滚入 Chromium 的阻止。如果您发现您破坏了布局测试，或者您的提交因为此类问题而被回滚，并且这些更改是预期的，请按照以下过程在重新提交您的 CL 之前，将更新的基准添加到 Chromium：

1. 提交一个 Chromium 更改，为更改的测试设置 `[ Failure Pass ]`（[了解更多](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#updating-the-expectations-files)）。
1. 提交您的 V8 代码更改（CL），并等待 1-2 天，直到它滚入 Chromium。
1. 按照[以下说明](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md#Rebaselining-Web-Tests)，手动生成新的基准。注意，如果您仅对 Chromium 进行更改，[此首选自动程序](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#how-to-rebaseline)应该适合您。
1. 从测试期望文件中移除 `[ Failure Pass ]` 条目，并在 Chromium 中提交它以及新的基准。

请为所有代码更改（CL）关联一个 `Bug: …` 页脚。
