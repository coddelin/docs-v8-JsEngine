---
title: 'Indicium: V8运行时跟踪工具'
author: 'Zeynep Cankara ([@ZeynepCankara](https://twitter.com/ZeynepCankara))'
avatars:
  - 'zeynep-cankara'
date: 2020-10-01 11:56:00
tags:
  - 工具
  - 系统分析器
description: 'Indicium: V8系统分析工具，用于分析Map/IC事件。'
tweet: '1311689392608731140'
---
# Indicium: V8系统分析器

过去三个月里，我作为实习生加入了V8团队（Google伦敦），这段时间是一次非常棒的学习经历。我一直在开发一个新工具，名为[*Indicium*](https://v8.dev/tools/head/system-analyzer)。

这个系统分析器是一个统一的网页界面，用于追踪、调试和分析Inline Caches（ICs）和Maps在真实应用中被创建和修改的模式。

V8已经有一些针对[ICs](https://mathiasbynens.be/notes/shapes-ics)和[Maps](https://v8.dev/blog/fast-properties)的追踪基础设施，可以使用[IC Explorer](https://v8.dev/tools/v8.7/ic-explorer.html)分析IC事件以及使用[Map Processor](https://v8.dev/tools/v8.7/map-processor.html)分析Map事件。然而，以前的工具无法全面分析Maps和ICs，而现在系统分析器使这一操作成为可能。

<!--truncate-->
![Indicium](/_img/system-analyzer/indicium-logo.png)

## 案例研究

让我们通过一个示例来演示如何使用Indicium分析V8中的Map和IC日志事件。

```javascript
class Point {
  constructor(x, y) {
    if (x < 0 || y < 0) {
      this.isNegative = true;
    }
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}

let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

// 预热
for (let i = 0; i < 10e5; i++) {
  dotProduct = a.dotProduct(b);
}

console.time('snippet1');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet1');

a = new Point(-1, -1);
b = new Point(-2, -2);
console.time('snippet2');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet2');
```

这里，我们定义了一个`Point`类，该类存储两个坐标，以及一个基于坐标值的额外布尔值。`Point`类有一个`dotProduct`方法，用于返回传递的对象与接收对象之间的点积。

为了让解释程序更容易，我们将程序分成两个代码片段（忽略预热阶段）：

### *代码片段1*

```javascript
let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

console.time('snippet1');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet1');
```

### *代码片段2*

```javascript
a = new Point(-1, -1);
b = new Point(-2, -2);
console.time('snippet2');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet2');
```

运行程序后我们注意到性能出现了倒退。虽然我们测量的是两个类似代码片段的性能；通过在循环中调用`dotProduct`函数来访问`Point`对象实例的属性`x`和`y`。

代码片段1的运行速度约为代码片段2的3倍。唯一不同的是，在代码片段2中我们为`Point`对象的`x`和`y`属性使用了负值。

![代码片段性能分析。](/_img/system-analyzer/initial-program-performance.png)

为了分析这种性能差异，我们可以使用V8提供的各种日志选项。这就是系统分析器的优势所在。它可以显示日志事件，并将它们与Map事件关联起来，让我们探索隐藏在V8中的奥秘。

在进一步深入案例研究之前，让我们熟悉系统分析器工具的几个面板。该工具有四个主要面板：

- 一个时间轴面板，用于分析Map/IC事件随时间的变化，
- 一个Map面板，用于可视化地图的过渡树，
- 一个IC面板，用于获取IC事件的统计数据，
- 一个源码面板，用于在脚本中显示Map/IC文件的位置。

![系统分析器概览](/_img/system-analyzer/system-analyzer-overview.png)

![按函数名称分组IC事件，以获取与`dotProduct`相关的IC事件的详细信息。](/_img/system-analyzer/case1_1.png)

我们正在分析函数`dotProduct`如何可能导致这种性能差异。因此我们按函数名称分组IC事件，以获取与`dotProduct`函数相关的IC事件的更多详细信息。

首先我们注意到，由IC事件记录了两种不同的IC状态转换变化。一种从未初始化状态转变为单态（monomorphic），另一种从单态（monomorphic）转变为多态（polymorphic）。多态IC状态表明现在我们正在跟踪与`Point`对象关联的多个Map，并且这种多态状态更差，因为需要执行额外检查。

我们想知道为什么我们为同一类型的对象创建了多个地图形状。为此，我们切换有关IC状态的信息按钮，以获取从未初始化到单态的地图地址的更多信息。

![与单态IC状态相关的地图转换树。](/_img/system-analyzer/case1_2.png)

![与多态IC状态相关的地图转换树。](/_img/system-analyzer/case1_3.png)

对于单态IC状态，我们可以可视化转换树，并看到我们只是动态添加了两个属性`x`和`y`，但当涉及到多态IC状态时，我们有一个新地图，包含三个属性`isNegative`、`x`和`y`。

![地图面板通过文件位置信息与源码面板交互以突出显示文件中的位置。](/_img/system-analyzer/case1_4.png)

我们点击地图面板的文件位置部分以查看源代码中添加`isNegative`属性的位置，并利用这些见解解决性能回归问题。

那么现在的问题是*我们如何利用工具生成的见解来解决性能回归问题*？

最低限度的解决方案是始终初始化`isNegative`属性。一般来说，初始化所有实例属性是在构造函数中应该遵循的建议。

现在，更新后的`Point`类如下所示：

```javascript
class Point {
  constructor(x, y) {
    this.isNegative = x < 0 || y < 0;
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}
```

如果我们再次使用修改后的`Point`类执行脚本，我们会发现案例研究开头定义的两个代码片段性能表现非常相似。

在更新后的追踪记录中，我们发现避免了多态IC状态，因为我们没有为同类型的对象创建多个地图。

![修改后的Point对象的地图转换树。](/_img/system-analyzer/case2_1.png)

## 系统分析工具

现在让我们深入了解系统分析工具中存在的不同面板。

### 时间轴面板

时间轴面板允许根据时间选择，从而可以在离散时间点或选定的时间范围内可视化IC/地图状态。它支持过滤功能，例如缩放选定时间范围的日志事件。

![时间轴面板概览](/_img/system-analyzer/timeline-panel.png)

![时间轴面板概览（续）](/_img/system-analyzer/timeline-panel2.png)

### 地图面板

地图面板包括两个子面板：

1. 地图详情
2. 地图转换

地图面板可视化选定地图的转换树。通过地图详情子面板显示选定地图的元数据。可以使用提供的界面搜索与地图地址相关的特定转换树。从地图转换子面板上方的统计子面板，我们可以看到导致地图转换的属性和地图事件类型的统计信息。

![地图面板概览](/_img/system-analyzer/map-panel.png)

![统计面板概览](/_img/system-analyzer/stats-panel.png)

### IC面板

IC面板显示落入特定时间范围的IC事件统计信息，这些时间范围通过时间轴面板过滤。此外，IC面板允许根据各种选项（类型、类别、地图、文件位置）对IC事件进行分组。从分组选项中，地图和文件位置选项分别与地图和源码面板交互，以显示地图转换树并突出显示与IC事件相关的文件位置。

![IC面板概览](/_img/system-analyzer/ic-panel.png)

![IC面板概览（续）](/_img/system-analyzer/ic-panel2.png)

![IC面板概览（续）](/_img/system-analyzer/ic-panel3.png)

![IC面板概览（续）](/_img/system-analyzer/ic-panel4.png)

### 源码面板

源码面板显示加载的脚本，并带有可点击的标记以触发自定义事件，这些事件会在自定义面板中选择地图和IC日志事件。可以从下拉栏中选择加载的脚本。从地图面板和IC面板选择文件位置会在源码面板上突出显示选定的文件位置。

![源码面板概览](/_img/system-analyzer/source-panel.png)

### 致谢

我要感谢V8团队和Android上的Web团队中的每个人，尤其是我的导师Sathya和联合导师Camillo，他们在我的实习期间一直支持我，并给我机会参与这么酷的项目。

我在Google度过了一个令人惊叹的夏季实习！
