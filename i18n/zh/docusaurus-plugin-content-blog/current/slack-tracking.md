---
title: "V8中的Slack追踪"
author: "Michael Stanton ([@alpencoder](https://twitter.com/alpencoder))，备受尊敬的*Slack*大师"
description: "深入了解V8的Slack追踪机制。"
avatars: 
 - "michael-stanton"
date: "2020-09-24 14:00:00"
tags: 
 - internals
---
Slack追踪是一种为新对象分配**比它们实际需要更大的初始大小**的方法，以便快速添加新属性。然后，在一段时间后，**神奇地将未使用的空间归还给系统**。很酷吧？

<!--truncate-->
这尤其有用，因为JavaScript没有静态类。系统无法“一眼看出”你有多少属性。引擎是一点点体验它们的。所以，当你读取:

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak('Matterhorn', 4478);
```

你可能会认为引擎已经拥有了良好性能所需的一切——毕竟你告诉了它该对象有两个属性。然而，V8实际上并不知道接下来会发生什么。这个对象`m1`可能会被传递给其他函数，并向其添加10个新的属性。Slack追踪正是为了解决这种需求，即在没有静态编译来推断整体结构的环境中响应接下来发生的事情。这与V8中的许多机制类似，其基础只是你通常可以对执行提出的一些一般性观点，比如：

- 大多数对象很快会死亡，仅少数存活很久——垃圾回收的“代假设”。
- 程序确实有组织结构——我们为开发者使用的对象构建了[形状或“隐藏类”](https://mathiasbynens.be/notes/shapes-ics)（在V8中我们称这些为**map**），因为我们相信它们会有用。*顺便说一句，[Fast Properties in V8](/blog/fast-properties) 是一篇很棒的文章，提供了关于map和属性访问的有趣细节。*
- 程序有一个初始化状态，当一切都是新的时，很难看出什么是重要的。后来，通过稳定使用可以识别出重要的类和函数——我们的反馈机制和编译器管道正是由这个理念发展而来的。

最后，最重要的是，运行时环境必须非常快，否则我们只是在进行哲学讨论。

现在，V8可以简单地将属性存储在附加到主对象的后备存储中。与直接位于对象中的属性不同，这种后备存储可以通过复制和替换指针无限扩展。然而，访问属性的最快方式是避免这种间接访问，并在对象起始处的固定偏移处查找。下面，我展示了在V8堆中普通JavaScript对象的布局，其中有两个对象内属性。前三个字是每个对象中的标准内容（一个指向map的指针，一个指向属性后备存储的指针，和一个指向元素后备存储的指针）。你可以看到，该对象无法“增长”，因为它紧贴堆中的下一个对象：

![](/_img/slack-tracking/property-layout.svg)

:::note
**注意:** 我省略了属性后备存储的详细信息，因为此刻唯一重要的是它可以随时被替换为更大的存储。然而，它也是V8堆中的一个对象，并且像所有驻留对象一样有一个map指针。
:::

总之，由于对象内属性提供的性能，V8愿意在每个对象中给你额外空间，而**Slack追踪**是完成此操作的方法。最终，你会稳定下来，不再添加新属性，并开始挖掘比特币或做其他事情。

V8给了你多少“时间”？很巧妙，它考虑了你构造特定对象的次数。实际上，映射中有一个计数器，并以系统中一个更神秘的魔法数字**七**初始化。

另一个问题：V8如何知道为对象体提供多少额外空间？它实际上从编译过程获得提示，编译过程提供了一个初始属性数的估算值。此计算包括从原型对象的属性数量，并递归向上遍历原型链。最后，为了确保有余量，它再添加了**八**个（另一个魔法数字！）。你可以在`JSFunction::CalculateExpectedNofProperties()`中看到这一点：

```cpp
int JSFunction::CalculateExpectedNofProperties(Isolate* isolate,
                                               Handle<JSFunction> function) {
  int expected_nof_properties = 0;
  for (PrototypeIterator iter(isolate, function, kStartAtReceiver);
       !iter.IsAtEnd(); iter.Advance()) {
    Handle<JSReceiver> current =
        PrototypeIterator::GetCurrent<JSReceiver>(iter);
    if (!current->IsJSFunction()) break;
    Handle<JSFunction> func = Handle<JSFunction>::cast(current);

    // 超类构造函数应该为期望的属性数量进行编译。
    // 这是为了确保这些属性可用。
    Handle<SharedFunctionInfo> shared(func->shared(), isolate);
    IsCompiledScope is_compiled_scope(shared->is_compiled_scope(isolate));
    if (is_compiled_scope.is_compiled() ||
        Compiler::Compile(func, Compiler::CLEAR_EXCEPTION,
                          &is_compiled_scope)) {
      DCHECK(shared->is_compiled());
      int count = shared->expected_nof_properties();
      // 检查估算值是否合理。
      if (expected_nof_properties <= JSObject::kMaxInObjectProperties - count) {
        expected_nof_properties += count;
      } else {
        return JSObject::kMaxInObjectProperties;
      }
    } else {
      // 如果发生编译错误，继续迭代，
      // 以防原型链中存在需要某些数量内置属性的内建函数。
      continue;
    }
  }
  // 对象中剩余空间的跟踪将在稍后回收多余的对象空间，
  // 所以我们可以宽松地调整估算值，在开始时至少多分配8个插槽。
  if (expected_nof_properties > 0) {
    expected_nof_properties += 8;
    if (expected_nof_properties > JSObject::kMaxInObjectProperties) {
      expected_nof_properties = JSObject::kMaxInObjectProperties;
    }
  }
  return expected_nof_properties;
}
```

让我们回顾一下之前的对象 `m1`：

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak('Matterhorn', 4478);
```

根据 `JSFunction::CalculateExpectedNofProperties` 的计算以及我们的 `Peak()` 函数，我们应该拥有2个对象内的属性，再加上由于 slack tracking 特性，多增加8个。我们可以使用 `%DebugPrint()` 打印 `m1`（这个实用函数暴露了映射结构。可以通过带标志 `--allow-natives-syntax` 执行 `d8` 使用它）：

```
> %DebugPrint(m1);
DebugPrint: 0x49fc866d: [JS_OBJECT_TYPE]
 - map: 0x58647385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x28c821a1 <FixedArray[0]> {
    0x28c846f9: [String] in ReadOnlySpace: #name: 0x5e412439 <String[10]: #Matterhorn> (const data field 0)
    0x5e412415: [String] in OldSpace: #height: 4478 (const data field 1)
 }
  0x58647385: [Map]
 - type: JS_OBJECT_TYPE
 - instance size: 52
 - inobject properties: 10
 - elements kind: HOLEY_ELEMENTS
 - unused property fields: 8
 - enum length: invalid
 - stable_map
 - back pointer: 0x5864735d <Map(HOLEY_ELEMENTS)>
 - prototype_validity cell: 0x5e4126fd <Cell value= 0>
 - instance descriptors (own) #2: 0x49fc8701 <DescriptorArray[2]>
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - constructor: 0x5e4125ed <JSFunction Peak (sfi = 0x5e4124dd)>
 - dependent code: 0x28c8212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - construction counter: 6
```

注意对象的实例大小是52。V8中的对象布局如下：

| word | 内容                                                  |
| ---- | ---------------------------------------------------- |
| 0    | 映射                                                 |
| 1    | 指向属性数组的指针                                   |
| 2    | 指向元素数组的指针                                   |
| 3    | 对象内字段1（指向字符串 `"Matterhorn"` 的指针）      |
| 4    | 对象内字段2（整数值 `4478`）                         |
| 5    | 未使用的对象内字段3                                  |
| …    | …                                                   |
| 12   | 未使用的对象内字段10                                 |

在这个32位的二进制中，指针大小为4，所以我们有普通JavaScript对象的3个初始字，以及对象中10个额外字。它随后告诉我们，有8个“未使用的属性字段”。所以，我们正在经历 slack tracking。我们的对象膨胀了，贪婪地消耗宝贵的字节！

我们如何减小它？我们使用映射中的构造计数器字段。构造计数器达到零后，我们决定不再使用 slack tracking。然后，如果你构造更多的对象，你不会看到上面的计数器减少。为什么？

这是因为上面显示的映射并不是 `Peak` 对象的“映射”。它只是映射链中从**初始映射**开始的一个叶子映射，而`Peak`对象在执行构造函数代码之前被赋予了初始映射。

如何找到初始映射？幸运的是，函数 `Peak()` 有一个指针指向它。我们使用初始映射中的构造计数器来控制 slack tracking：

```
> %DebugPrint(Peak);
d8> %DebugPrint(Peak)
DebugPrint: 0x31c12561: [Function] in OldSpace
 - map: 0x2a2821f5 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x31c034b5 <JSFunction (sfi = 0x36108421)>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - 函数原型: 0x37449c89 <对象映射 = 0x2a287335>
 - 初始映射: 0x46f07295 <映射(HOLEY_ELEMENTS)>   // 这是初始映射。
 - 共享信息: 0x31c12495 <共享函数信息 Peak>
 - 名称: 0x31c12405 <字符串[4]: #Peak>
…

d8> // %DebugPrintPtr 允许您打印初始映射。
d8> %DebugPrintPtr(0x46f07295)
DebugPrint: 0x46f07295: [映射]
 - 类型: JS_OBJECT_TYPE
 - 实例大小: 52
 - 对象内属性数量: 10
 - 元素类型: HOLEY_ELEMENTS
 - 未使用的属性字段数量: 10
 - 枚举长度: 无效
 - 回指: 0x28c02329 <未定义>
 - 原型有效性单元: 0x47f0232d <单元值= 1>
 - 实例描述符（自有）#0: 0x28c02135 <描述符数组[0]>
 - 转换 #1: 0x46f0735d <映射(HOLEY_ELEMENTS)>
     0x28c046f9: [字符串] 在 ReadOnlySpace 中: #名称:
         (转换到(常量数据字段, 属性: [WEC]) @ Any) ->
             0x46f0735d <映射(HOLEY_ELEMENTS)>
 - 原型: 0x5cc09c7d <对象映射 = 0x46f07335>
 - 构造函数: 0x21e92561 <JS函数 Peak (sfi = 0x21e92495)>
 - 依赖代码: 0x28c0212d <其他堆对象 (WEAK_FIXED_ARRAY_TYPE)>
 - 构造计数器: 5
```

看到构造计数器减少到5了吗？如果您希望从我们上面展示的两属性映射中找到初始映射，可以使用%DebugPrintPtr() 通过其回指直到找到一个在回指槽中包含`undefined`的映射。那就是上方的映射。

现在，一棵映射树从初始映射开始成长，每次添加属性都会分出一个分支。我们称这些分支为过渡。在上面的初始映射打印中，您是否看到带有标签“名称”的过渡到下一个映射？直到目前为止，整个映射树看起来像这样：

![(X, Y, Z) 表示 (实例大小, 对象内属性数量, 未使用属性数量).](/_img/slack-tracking/root-map-1.svg)

基于属性名称的这些过渡是JavaScript如何在后台构建其映射的。此初始映射还存储在函数 `Peak` 中，因此当它被用作构造函数时，可以使用该映射来设置 `this` 对象。

```js
const m1 = new Peak('Matterhorn', 4478);
const m2 = new Peak('Mont Blanc', 4810);
const m3 = new Peak('Zinalrothorn', 4221);
const m4 = new Peak('Wendelstein', 1838);
const m5 = new Peak('Zugspitze', 2962);
const m6 = new Peak('Watzmann', 2713);
const m7 = new Peak('Eiger', 3970);
```

这里的妙处在于，在创建`m7`之后，再次运行`%DebugPrint(m1)`会产生一个奇妙的新结果：

```
DebugPrint: 0x5cd08751: [JS_OBJECT_TYPE]
 - 映射: 0x4b387385 <映射(HOLEY_ELEMENTS)> [FastProperties]
 - 原型: 0x5cd086cd <对象映射 = 0x4b387335>
 - 元素: 0x586421a1 <固定数组[0]> [HOLEY_ELEMENTS]
 - 属性: 0x586421a1 <固定数组[0]> {
    0x586446f9: [字符串] 在 ReadOnlySpace 中: #名称:
        0x51112439 <字符串[10]: #Matterhorn> (常量数据字段 0)
    0x51112415: [字符串] 在 OldSpace 中: #高度:
        4478 (常量数据字段 1)
 }
0x4b387385: [映射]
 - 类型: JS_OBJECT_TYPE
 - 实例大小: 20
 - 对象内属性数量: 2
 - 元素类型: HOLEY_ELEMENTS
 - 未使用的属性字段数量: 0
 - 枚举长度: 无效
 - 稳定映射
 - 回指: 0x4b38735d <映射(HOLEY_ELEMENTS)>
 - 原型有效性单元: 0x511128dd <单元值= 0>
 - 实例描述符（自有）#2: 0x5cd087e5 <描述符数组[2]>
 - 原型: 0x5cd086cd <对象映射 = 0x4b387335>
 - 构造函数: 0x511127cd <JS函数 Peak (sfi = 0x511125f5)>
 - 依赖代码: 0x5864212d <其他堆对象 (WEAK_FIXED_ARRAY_TYPE)>
 - 构造计数器: 0
```

我们的实例大小现在是20，即5个字：

| 字 | 内容                           |
| ---- | ------------------------------ |
| 0    | 映射                          |
| 1    | 指向属性数组的指针            |
| 2    | 指向元素数组的指针            |
| 3    | 名称                          |
| 4    | 高度                          |

您可能会好奇这是如何发生的。毕竟，如果这个对象在内存中布局，并且过去有10个属性，系统怎么能容忍这8个没有任何归属的字词呢？事实是我们从未将它们填充任何有趣的内容 —— 或许这能够有所帮助。

如果您好奇我为什么担心这些字词闲置，您需要了解一些关于垃圾收集器的背景知识。对象一个接一个地布局，V8垃圾收集器通过多次遍历内存中的这些对象来跟踪它们。从内存中的第一个字开始，它期望找到指向映射的指针。垃圾收集器会从映射中读取实例大小，然后知道向前移动多远以到达下一个有效对象。对于某些类，它还需要额外计算长度，但就是这么简单。

![](/_img/slack-tracking/gc-heap-1.svg)

在上面的图表中，红色的框是**地图**，白色的框是填充对象实例大小的词条。垃圾收集器可以通过从地图跳到地图来“遍历”堆。

那么当地图的实例大小突然改变时会发生什么？现在，当GC（垃圾收集器）遍历堆时，它会发现自己看到了一个以前没有看到过的词条。在我们的 `Peak` 类的情况中，我们从占用13个词条减少到只有5个（我将“未使用的属性”词条标为黄色）：

![](/_img/slack-tracking/gc-heap-2.svg)

![](/_img/slack-tracking/gc-heap-3.svg)

我们可以通过巧妙地使用一个**实例大小为4的“填充”地图**初始化这些未使用的属性来处理这种情况。这样，当它们暴露在遍历过程中时，GC会轻松地跨过它们。

![](/_img/slack-tracking/gc-heap-4.svg)

这在代码中的 `Factory::InitializeJSObjectBody()` 方法中表现出来：

```cpp
void Factory::InitializeJSObjectBody(Handle<JSObject> obj, Handle<Map> map,
                                     int start_offset) {

  // <部分代码已删除>

  bool in_progress = map->IsInobjectSlackTrackingInProgress();
  Object filler;
  if (in_progress) {
    filler = *one_pointer_filler_map();
  } else {
    filler = *undefined_value();
  }
  obj->InitializeBody(*map, start_offset, *undefined_value(), filler);
  if (in_progress) {
    map->FindRootMap(isolate()).InobjectSlackTrackingStep(isolate());
  }

  // <部分代码已删除>
}
```

这就是捷余追踪（slack tracking）正在发挥作用的表现。对于您创建的每个类，您可以预期它在一段时间内会占用更多内存，但在第7次实例化时我们认为“可以了”，并将剩余空间暴露给GC。这些单词条对象没有所有者——也就是说，没有指向它们的指针——所以当发生垃圾收集时，它们会被释放，并且活动对象可能会被压缩以节省空间。

下图反映了此初始地图的捷余追踪**完成**的状态。请注意，实例大小现在为20（5个词条：地图、属性和元素数组，以及额外的2个槽）。捷余追踪遵循从初始地图开始的整个链条。也就是说，如果初始地图的子代最终使用了全部10个初始额外属性，那么初始地图会保留它们，并将它们标记为未使用：

![(X, Y, Z) 表示 (实例大小，内对象属性数量，未使用属性数量)。](/_img/slack-tracking/root-map-2.svg)

现在捷余追踪已经完成，如果我们向这些 `Peak` 对象中的一个添加另一个属性会发生什么？

```js
m1.country = '瑞士';
```

V8需要进入属性存储区域。我们最终得到以下对象布局：

| 词条 | 值                                    |
| ---- | ------------------------------------- |
| 0    | 地图                                   |
| 1    | 指向属性存储区的指针                     |
| 2    | 指向元素（空数组）的指针                 |
| 3    | 指向字符串 `"Matterhorn"` 的指针        |
| 4    | `4478`                                |

属性存储区看起来如下：

| 词条 | 值                                |
| ---- | --------------------------------- |
| 0    | 地图                               |
| 1    | 长度（3）                          |
| 2    | 指向字符串 `"瑞士"` 的指针             |
| 3    | `undefined`                       |
| 4    | `undefined`                       |
| 5    | `undefined`                       |

我们有那些额外的 `undefined` 值，以防您决定添加更多属性。基于您迄今为止的行为，我们有点预计您可能会这么做！

## 可选属性

有时您可能只会添加属性。在某些情况下，比如如果高度是4000米或更高，您希望记录两个额外的属性 `prominence` 和 `isClimbed`：

```js
function Peak(name, height, prominence, isClimbed) {
  this.name = name;
  this.height = height;
  if (height >= 4000) {
    this.prominence = prominence;
    this.isClimbed = isClimbed;
  }
}
```

您创建了几个不同的变种：

```js
const m1 = new Peak('温德尔斯泰因', 1838);
const m2 = new Peak('马特宏峰', 4478, 1040, true);
const m3 = new Peak('楚格峰', 2962);
const m4 = new Peak('勃朗峰', 4810, 4695, true);
const m5 = new Peak('瓦茨曼山', 2713);
const m6 = new Peak('齐纳尔罗峰', 4221, 490, true);
const m7 = new Peak('艾格山', 3970);
```

在这种情况下，`m1`、`m3`、`m5` 和 `m7` 对象拥有一个地图，而因为额外的属性，`m2`、`m4` 和 `m6` 对象拥有初始地图的子代链中的一个地图。当这个地图家族完成捷余追踪后，**4** 个内对象属性取代了之前的 **2** 个，因为捷余追踪确保为初始地图以下的地图树中任何子代使用的最大内对象属性数量预留了足够的空间。

下面展示了运行上述代码后地图家族的状态，捷余追踪已经完成：

![(X, Y, Z) 表示 (实例大小，内对象属性数量，未使用属性数量)。](/_img/slack-tracking/root-map-3.svg)

## 那么优化代码呢？

在松弛跟踪完成之前，让我们编译一些优化的代码。我们会使用几个本地语法命令强制进行优化编译，以便在松弛跟踪完成之前实现优化编译：

```js
function foo(a1, a2, a3, a4) {
  return new Peak(a1, a2, a3, a4);
}

%PrepareFunctionForOptimization(foo);
const m1 = foo('Wendelstein', 1838);
const m2 = foo('Matterhorn', 4478, 1040, true);
%OptimizeFunctionOnNextCall(foo);
foo('Zugspitze', 2962);
```

这应该足够编译并运行优化后的代码了。我们在TurboFan（优化编译器）中执行一些操作，称为[**创建降级**](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-create-lowering.h;l=32;drc=ee9e7e404e5a3f75a3ca0489aaf80490f625ca27)，其中我们将对象的分配进行内联。这意味着我们生成的本地代码会发出指令，要求GC分配对象的实例大小，然后小心初始化这些字段。然而，如果松弛跟踪在稍后某个时间点停止，这些代码将是无效的。对此我们能做什么？

非常简单！我们只需提前结束这个映射家族的松弛跟踪。这是有道理的，因为通常我们不会在创建了数千个对象之前编译一个优化函数。因此，松弛跟踪*应该*已经完成。如果不是，太糟糕了！这个对象显然不是那么重要，无论如何已经只创建了不到7个。记住，通常情况下，我们只有在程序运行很长时间之后才进行优化。

### 在后台线程上编译

我们可以在主线程上编译优化代码，在这种情况下，由于整个环境已经暂停，我们可以通过一些调用提前结束松弛跟踪并更改初始映射。然而，我们尽可能多地在后台线程上进行编译。在这个线程中，触碰初始映射是危险的，因为它*可能正在主线程上运行的JavaScript代码中发生变化*。因此，我们的方法如下：

1. **猜测**实例大小会是如果现在结束松弛跟踪时的大小。记住这个大小。
1. 当编译即将完成时，我们返回到主线程，在那里我们可以安全地强制完成松弛跟踪（如果它尚未完成）。
1. 检查：实例大小是否符合我们的预测？如果是，**我们很好！** 如果不是，丢弃代码对象并稍后重试。

如果你想在代码中看看这一点，可以查看类[`InitialMapInstanceSizePredictionDependency`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/compilation-dependencies.cc?q=InitialMapInstanceSizePredictionDependency&ss=chromium%2Fchromium%2Fsrc)及其在`js-create-lowering.cc`中的使用是如何创建内联分配的。你会看到`PrepareInstall()`方法在主线程上被调用，这强制完成松弛跟踪。然后`Install()`方法检查我们对实例大小的猜测是否成立。

这里是包含内联分配的优化代码。首先，你会看到与GC的通信，检查我们是否可以通过实例大小简单地前移指针并采用这种方式（这称为提升指针分配）。然后，我们开始填充新对象的字段：

```asm
…
43  mov ecx,[ebx+0x5dfa4]
49  lea edi,[ecx+0x1c]
4c  cmp [ebx+0x5dfa8],edi       ;; 嘿GC，能给我们28（0x1c）字节吗？
52  jna 0x36ec4a5a  <+0x11a>

58  lea edi,[ecx+0x1c]
5b  mov [ebx+0x5dfa4],edi       ;; 好GC，我们拿走了。谢谢再见。
61  add ecx,0x1                 ;; 太棒了。ecx是我的新对象。
64  mov edi,0x46647295          ;; 对象：0x46647295 <Map(HOLEY_ELEMENTS)>
69  mov [ecx-0x1],edi           ;; 存储初始映射。
6c  mov edi,0x56f821a1          ;; 对象：0x56f821a1 <FixedArray[0]>
71  mov [ecx+0x3],edi           ;; 存储属性支持存储（空）
74  mov [ecx+0x7],edi           ;; 存储元素支持存储（空）
77  mov edi,0x56f82329          ;; 对象：0x56f82329 <undefined>
7c  mov [ecx+0xb],edi           ;; 内部属性1 <-- undefined
7f  mov [ecx+0xf],edi           ;; 内部属性2 <-- undefined
82  mov [ecx+0x13],edi          ;; 内部属性3 <-- undefined
85  mov [ecx+0x17],edi          ;; 内部属性4 <-- undefined
88  mov edi,[ebp+0xc]           ;; 获取参数 {a1}
8b  test_w edi,0x1
90  jz 0x36ec4a6d  <+0x12d>
96  mov eax,0x4664735d          ;; 对象：0x4664735d <Map(HOLEY_ELEMENTS)>
9b  mov [ecx-0x1],eax           ;; 推进映射
9e  mov [ecx+0xb],edi           ;; name = {a1}
a1  mov eax,[ebp+0x10]          ;; 获取参数 {a2}
a4  test al,0x1
a6  jnz 0x36ec4a77  <+0x137>
ac  mov edx,0x46647385          ;; 对象：0x46647385 <Map(HOLEY_ELEMENTS)>
b1  mov [ecx-0x1],edx           ;; 推进映射
b4  mov [ecx+0xf],eax           ;; height = {a2}
b7  cmp eax,0x1f40              ;; 高度是否 >= 4000？
bc  jng 0x36ec4a32  <+0xf2>
                  -- B8 开始 --
                  -- B9 开始 --
c2  mov edx,[ebp+0x14]          ;; 获取参数 {a3}
c5  test_b dl,0x1
c8  jnz 0x36ec4a81  <+0x141>
ce  mov esi,0x466473ad          ;; 对象: 0x466473ad <Map(HOLEY_ELEMENTS)>
d3  mov [ecx-0x1],esi           ;; 推进 map
d6  mov [ecx+0x13],edx          ;; prominence = {a3}
d9  mov esi,[ebp+0x18]          ;; 检索参数 {a4}
dc  test_w esi,0x1
e1  jz 0x36ec4a8b  <+0x14b>
e7  mov edi,0x466473d5          ;; 对象: 0x466473d5 <Map(HOLEY_ELEMENTS)>
ec  mov [ecx-0x1],edi           ;; 推进 map 到叶子 map
ef  mov [ecx+0x17],esi          ;; isClimbed = {a4}
                  -- B10 开始 (解构框架) --
f2  mov eax,ecx                 ;; 准备返回这个棒的 Peak 对象!
…
```

顺便提一下，要看到这一切，你需要一个调试构建并传递一些标志。我将代码放入文件并调用了:

```bash
./d8 --allow-natives-syntax --trace-opt --code-comments --print-opt-code mycode.js
```

希望这次探索能够带来乐趣。我特别感谢 Igor Sheludko 和 Maya Armyanova (耐心地!) 审核这篇文章。
