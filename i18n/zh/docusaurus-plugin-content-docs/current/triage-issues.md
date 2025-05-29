---
title: "管理问题"
description: "本文档解释了如何处理 V8 的问题跟踪器中的问题。"
---
本文档解释了如何处理 [V8 的问题跟踪器](/bugs)中的问题。

## 如何获得问题的分类

- *V8 跟踪器*: 将状态设置为 `Untriaged`
- *Chromium 跟踪器*: 将状态设置为 `Untriaged` 并添加组件 `Blink>JavaScript`

## 如何在 Chromium 跟踪器中分配 V8 问题

请将问题移至 V8 专项负责队列中的以下类别之一：

- 内存: `component:blink>javascript status=Untriaged label:Performance-Memory`
    - 将显示在[此处](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=component%3Ablink%3Ejavascript+status%3DUntriaged+label%3APerformance-Memory+&colspec=ID+Pri+M+Stars+ReleaseBlock+Cr+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=tiles)查询中
- 稳定性: `status=available,untriaged component:Blink>JavaScript label:Stability -label:Clusterfuzz`
    - 将显示在[此处](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=status%3Davailable%2Cuntriaged+component%3ABlink%3EJavaScript+label%3AStability+-label%3AClusterfuzz&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids)查询中
    - 无需 CC，问题将由负责人自动分类
- 性能: `status=untriaged component:Blink>JavaScript label:Performance`
    - 将显示在[此处](https://bugs.chromium.org/p/chromium/issues/list?colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&x=m&y=releaseblock&cells=tiles&q=component%3Ablink%3Ejavascript%20status%3DUntriaged%20label%3APerformance&can=2)查询中
    - 无需 CC，问题将由负责人自动分类
- Clusterfuzz: 将问题设置为以下状态：
    - `label:ClusterFuzz component:Blink>JavaScript status:Untriaged`
    - 将显示在[此处](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=label%3AClusterFuzz+component%3ABlink%3EJavaScript+status%3AUntriaged&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids)查询中。
    - 无需 CC，问题将由负责人自动分类
- 安全: 所有安全问题由 Chromium 安全负责人分类。有关更多信息，请参阅[报告安全问题](/docs/security-bugs)。

如果您需要负责人的注意，请查阅轮班信息。

在所有问题中使用组件 `Blink>JavaScript`。

**请注意，这仅适用于 Chromium 问题跟踪器中跟踪的问题。**
