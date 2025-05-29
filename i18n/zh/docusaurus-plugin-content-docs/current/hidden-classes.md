---
title: 'V8中的地图（隐藏类）'
description: 'V8如何跟踪和优化对象的感知结构？'
---

让我们展示V8如何构建它的隐藏类。主要的数据结构是：

- `Map`：隐藏类本身。它是对象中的第一个指针值，因此可以轻松比较两个对象是否具有相同的类。
- `DescriptorArray`：该类所具有的属性的完整列表以及有关它们的信息。在某些情况下，属性值甚至直接存在于此数组中。
- `TransitionArray`：从此`Map`到兄弟`Map`的“边”数组。每条边都是一个属性名，可以被认为是“如果我在当前类中添加一个该名字的属性，我会转移到什么类？”

由于许多`Map`对象只有一个过渡到另一个（即，它们是“过渡性”地图，仅在到某个其它东西的路径上使用），V8并不总是为它创建一个完整的`TransitionArray`。取而代之，它会直接链接到这个“下一个”`Map`。系统必须在被指向的`Map`的`DescriptorArray`中进行一些深入挖掘，才能弄清楚与过渡相关联的名称。

这是一个非常丰富的主题。不过，它可能会有所改变，但如果您理解本文中的概念，将来变化应该可以逐步理解。

## 为什么需要隐藏类？

当然，V8可以不使用隐藏类，它会将每个对象视为一个属性集合。然而，一个非常有用的原则可能会被忽略：智能设计的原则。V8推测您只会创建有限的**不同**类型的对象。每种类型的对象将会以可以最终被看作是典型的方式使用。我说“最终被看作”是因为JavaScript语言是一种脚本语言，而不是预编译语言。所以V8永远不知道接下来会发生什么。为了利用智能设计（即假设传入的代码背后有智慧），V8必须观察和等待，让结构的感觉逐渐渗透。隐藏类机制是实现这一点的主要手段。当然，这种机制需要具备复杂的监听功能，而这些功能就是Inline Cache（ICs），关于它们已经有许多文章撰写。

因此，如果您认为这是合理且必要的工作，请跟随我！

## 示例

```javascript
function Peak(name, height, extra) {
  this.name = name;
  this.height = height;
  if (isNaN(extra)) {
    this.experience = extra;
  } else {
    this.prominence = extra;
  }
}

m1 = new Peak("马特洪峰", 4478, 1040);
m2 = new Peak("温德尔施泰因山", 1838, "不错");
```

通过这段代码，我们已经从根地图（也称为初始地图）生成了一棵有趣的地图树，它附加在函数`Peak`上：

<figure>
  <img src="/_img/docs/hidden-classes/drawing-one.svg" width="400" height="480" alt="隐藏类示例" loading="lazy"/>
</figure>

每个蓝色框都是一个地图，从初始地图开始。如果我们以某种方式运行函数`Peak`而不添加一个属性，则返回对象的地图就是初始地图。后续的地图是通过添加各地图之间边缘上标明的属性名而产生的。这些地图中每一个都列出了关联对象的属性。此外，它还描述了每个属性的确切位置。最后，从这些地图中的一个，比如说`Map3`，如果您为`Peak()`中`extra`参数传递了一个数字，则该地图会成为对象的隐藏类，并且该对象可以沿着反向链接一直回溯到初始地图。

让我们再次绘制这个图，加入额外的信息。注释（i0），（i1）表示对象字段位置0、1等：

<figure>
  <img src="/_img/docs/hidden-classes/drawing-two.svg" width="400" height="480" alt="隐藏类示例" loading="lazy"/>
</figure>

如果在您创建至少7个`Peak`对象之前花时间研究这些地图，您会遇到**松弛跟踪**，这可能会令人困惑。我有[另一个关于该主题的文章](https://v8.dev/blog/slack-tracking)。只需再创建7个对象，它就会完成。这时，您的`Peak`对象将有正好3个对象存储的属性，无法在对象中直接添加更多属性。任何额外的属性都将被传递到对象的属性后备存储。这只是一个属性值的数组，其索引来自地图（更准确地说，来自地图连接的`DescriptorArray`）。让我们在新行中给`m2`添加一个属性，然后重新审视地图树：

```javascript
m2.cost = "代价高昂"；
```

<figure>
  <img src="/_img/docs/hidden-classes/drawing-three.svg" width="400" height="480" alt="隐藏类示例" loading="lazy"/>
</figure>

我在这里偷偷做了一些修改。注意，所有属性都加了"const"注解，这意味着从V8的角度来看，自构造函数以来它们从未被更改，因此在初始化后可以视为常量。TurboFan（优化编译器）对此非常喜欢。假设函数将`m2`作为一个常量全局引用，那么在编译时就可以查找到`m2.cost`，因为该字段被标记为常量。稍后我会在文章中对此进行回顾。

注意属性"cost"被标记为`const p0`，这意味着它是一个存储在**属性存储区（properties backing store）**索引零处的常量属性，而不是直接存储在对象中。这是因为对象中已经没有更多空间了。这些信息可以通过`%DebugPrint(m2)`看到：

```
d8> %DebugPrint(m2);
DebugPrint: 0x2f9488e9: [JS_OBJECT_TYPE]
 - map: 0x219473fd <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x2f94876d <Object map = 0x21947335>
 - elements: 0x419421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x2f94aecd <PropertyArray[3]> {
    0x419446f9: [String] in ReadOnlySpace: #name: 0x237125e1
        <String[11]: #Wendelstein> (const data field 0)
    0x23712581: [String] in OldSpace: #height:
        1838 (const data field 1)
    0x23712865: [String] in OldSpace: #experience: 0x237125f9
        <String[4]: #good> (const data field 2)
    0x23714515: [String] in OldSpace: #cost: 0x23714525
        <String[16]: #one arm, one leg>
        (const data field 3) properties[0]
 }
 ...
{name: "Wendelstein", height: 1, experience: "good", cost: "one arm, one leg"}
d8>
```

你可以看到，我们有4个属性，全部标记为const。前3个存储在对象中，最后一个存储在`properties[0]`中，这意味着它位于属性存储区的第一个插槽中。我们可以检查一下：

```
d8> %DebugPrintPtr(0x2f94aecd)
DebugPrint: 0x2f94aecd: [PropertyArray]
 - map: 0x41942be9 <Map>
 - length: 3
 - hash: 0
         0: 0x23714525 <String[16]: #one arm, one leg>
       1-2: 0x41942329 <undefined>
```

额外的属性是为了防止你突然决定添加更多属性。

## 真实结构

我们在这一点上可以做出不同的选择，但既然你能读到这里，说明你一定很喜欢V8。那么我想尝试画出我们使用的真实数据结构，也就是在“Map”、“DescriptorArray”和“TransitionArray”中提到的那些。现在你对后台隐藏类构建的概念有所了解，不妨通过正确的名称和结构将你的思维与代码更加紧密地联系起来。让我尝试用V8的表示重现上一张图。首先，我将画出**DescriptorArrays**，它保存了给定Map的属性列表。这些数组可以共享——关键是Map本身知道在DescriptorArray中可以查看多少属性。由于属性按照添加时间的顺序排列，因此这些数组可以由多个Map共享。看这里：

<figure>
  <img src="/_img/docs/hidden-classes/drawing-four.svg" width="600" height="480" alt="隐藏类示例" loading="lazy"/>
</figure>

注意，**Map1**、**Map2**和**Map3**都指向**DescriptorArray1**。每个Map中"descriptors"字段旁边的数字表示DescriptorArray中属于该Map的字段数量。所以**Map1**只知道"name"属性，只查看**DescriptorArray1**中列出的第一个属性。而**Map2**拥有两个属性"name"和"height"，因此它查看**DescriptorArray1**中的第一个和第二项属性（name和height）。这种共享方式可以节省大量空间。

自然地，当存在分叉时，我们无法共享。例如，如果添加了"experience"属性，会从Map2过渡到Map4，而添加了"prominence"属性会过渡到Map3。你可以看到Map4和Map5以与DescriptorArray1被三个Map共享相同的方式共享DescriptorArray2。

我们"真实"的图中唯一缺失的是`TransitionArray`，到目前为止它还是隐喻的。让我们做出调整。我去掉了**反向指针**的线条，这样图就更清晰了。只要记住，从树中的任何Map，你也可以向上遍历树。

<figure>
  <img src="/_img/docs/hidden-classes/drawing-five.svg" width="600" height="480" alt="隐藏类示例" loading="lazy"/>
</figure>

仔细研究这张图是非常有收获的。**问题：如果在"name"之后添加新属性"rating"，而不是继续添加"height"和其他属性，会发生什么？**

**答案**：Map1会得到一个真正的**TransitionArray**来跟踪分叉。如果添加属性*height*，我们应该过渡到**Map2**。然而，如果添加属性*rating*，我们应该过渡到一个新Map，**Map6**。这个Map将需要一个新的DescriptorArray来提及*name*和*rating*。此时对象中还有多余的空闲插槽（只使用了三个中的一个），因此属性*rating*将被分配到这些插槽之一。

*我用`%DebugPrintPtr()`验证了我的答案，并绘制了以下内容：*

<figure>
  <img src="/_img/docs/hidden-classes/drawing-six.svg" width="500" height="480" alt="隐藏类示例" loading="lazy"/>
</figure>

不需要求我停下来，我明白了这类图表的上限！但我认为你可以理解这些部分是如何运作的。想象一下，如果在添加了这个伪属性*rating*之后，我们继续添加*height*、*experience*和*cost*。那么，我们就得创建 **Map7**、**Map8** 和 **Map9**。因为我们坚持在已建立的映射链中间添加这个属性，会产生许多结构的重复。我实在没心情再画那个图表了——不过如果你发送给我，我会把它加到这个文档中:)。

我用了方便的 [DreamPuf](https://dreampuf.github.io/GraphvizOnline) 项目来轻松制作这些图表。这是之前图表的一个 [链接](https://dreampuf.github.io/GraphvizOnline/#digraph%20G%20%7B%0A%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%233F53FF%22%5D%0A%20%20edge%20%5Bfontname%3DHelvetica%5D%0A%20%20%0A%20%20Map0%20%5Blabel%3D%22%7B%3Ch%3E%20Map0%20%7C%20%3Cd%3E%20descriptors%20(0)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map1%20%5Blabel%3D%22%7B%3Ch%3E%20Map1%20%7C%20%3Cd%3E%20descriptors%20(1)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map2%20%5Blabel%3D%22%7B%3Ch%3E%20Map2%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(2)%7D%22%5D%3B%0A%20%20Map3%20%5Blabel%3D%22%7B%3Ch%3E%20Map3%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map4%20%5Blabel%3D%22%7B%3Ch%3E%20Map4%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%0A%20%20Map5%20%5Blabel%3D%22%7B%3Ch%3E%20Map5%20%7C%20%3Cd%3E%20descriptors%20(4)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map6%20%5Blabel%3D%22%7B%3Ch%3E%20Map6%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%3B%0A%20%20Map0%3At%20-%3E%20Map1%20%5Blabel%3D%22name%20(inferred)%22%5D%3B%0A%20%20%0A%20%20Map4%3At%20-%3E%20Map5%20%5Blabel%3D%22cost%20(inferred)%22%5D%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20descriptor%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22black%22%2C%20style%3Dfilled%2C%20color%3D%22%23FFB34D%22%5D%3B%0A%20%20%0A%20%20DA0%20%5Blabel%3D%22%7BDescriptorArray0%20%7C%20(empty)%7D%22%5D%0A%20%20Map0%3Ad%20-%3E%20DA0%3B%0A%20%20DA1%20%5Blabel%3D%22%7BDescriptorArray1%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20prominence%20(const%20i2)%7D%22%5D%3B%0A%20%20Map1%3Ad%20-%3E%20DA1%3B%0A%20%20Map2%3Ad%20-%3E%20DA1%3B%0A%20%20Map3%3Ad%20-%3E%20DA1%3B%0A%20%20%0A%20%20DA2%20%5Blabel%3D%22%7BDescriptorArray2%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20experience%20(const%20i2)%20%7C%20cost%20(const%20p0)%7D%22%5D%3B%0A%20%20Map4%3Ad%20-%3E%20DA2%3B%0A%20%20Map5%3Ad%20-%3E%20DA2%3B%0A%20%20%0A%20%20DA3%20%5Blabel%3D%22%7BDescriptorArray3%20%7C%20name%20(const%20i0)%20%7C%20rating%20(const%20i1)%7D%22%5D%3B%0A%20%20Map6%3Ad%20-%3E%20DA3%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20transition%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%23B3813E%22%5D%3B%0A%20%20TA0%20%5Blabel%3D%22%7BTransitionArray0%20%7C%20%3Ca%3E%20experience%20%7C%20%3Cb%3E%20prominence%7D%22%5D%3B%0A%20%20Map2%3At%20-%3E%20TA0%3B%0A%20%20TA0%3Aa%20-%3E%20Map4%3Ah%3B%0A%20%20TA0%3Ab%20-%3E%20Map3%3Ah%3B%0A%20%20%0A%20%20TA1%20%5Blabel%3D%22%7BTransitionArray1%20%7C%20%3Ca%3E%20rating%20%7C%20%3Cb%3E%20height%7D%22%5D%3B%0A%20%20Map1%3At%20-%3E%20TA1%3B%0A%20%20TA1%3Ab%20-%3E%20Map2%3B%0A%20%20TA1%3Aa%20-%3E%20Map6%3B%0A%7D)。

## TurboFan 和 const 属性

到目前为止，所有这些字段在 `DescriptorArray` 中都被标记为 `const`。让我们尝试一下。用调试构建运行以下代码：

```javascript
// 运行方式：
// d8 --allow-natives-syntax --no-lazy-feedback-allocation --code-comments --print-opt-code
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

let m1 = new Peak("马特洪峰", 4478);
m2 = new Peak("文德尔斯坦山", 1838);

// 确保松弛跟踪完成。
for (let i = 0; i < 7; i++) new Peak("blah", i);

m2.cost = "一条手臂，一个腿";
function foo(a) {
  return m2.cost;
}

foo(3);
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

你会看到优化函数 `foo()` 的打印输出。代码非常短。你将在函数的末尾看到：

```
...
40  mov eax,0x2a812499          ;; 对象: 0x2a812499 <String[16]: #一条手臂，一个腿>
45  mov esp,ebp
47  pop ebp
48  ret 0x8                     ;; 返回 "一条手臂，一个腿"!
```

TurboFan，小机灵鬼，直接插入了 `m2.cost` 的值。那么，你怎么看！

当然，在最后一次调用 `foo()` 之后，你可以插入这一行：

```javascript
m2.cost = "无价";
```

你认为会发生什么？可以确定的一件事是，我们不能让 `foo()` 保持原样，它会返回错误的答案。重新运行程序，但加上标志 `--trace-deopt`，这样系统去除优化代码时你就会得到通知。在优化后的 `foo()` 打印输出之后，你会看到这些行：

```
[标记依赖代码 0x5c684901 0x21e525b9 <共享函数信息 foo> (opt #0) 进行去优化，
    原因：字段-常量]
[在所有上下文中去优化标记代码]
```

哇。

<figure>
  <img src="/_img/docs/hidden-classes/i_like_it_a_lot.gif" width="440" height="374" alt="我非常喜欢" loading="lazy"/>
</figure>

如果强制重新优化，您将获得不太完美的代码，但仍然可以从我们描述的 Map 结构中获益匪浅。请记住，从我们的图表来看，属性*成本*是对象属性存储中的第一个属性。嗯，它可能已经失去了它的常量指定，但我们仍然有它的地址。基本上，在具有**Map5**的对象中，我们可以肯定地验证全局变量 `m2` 仍然拥有它，我们只需要——

1. 加载属性存储，并且
2. 读取第一个数组元素。

让我们看看这个。在最后一行下面添加以下代码：

```javascript
// 强制重新优化 foo()。
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

现在来看看生成的代码：

```
...
40  mov ecx,0x42cc8901          ;; 对象: 0x42cc8901 <Peak map = 0x3d5873ad>
45  mov ecx,[ecx+0x3]           ;; 加载属性存储
48  mov eax,[ecx+0x7]           ;; 获取第一个元素。
4b  mov esp,ebp
4d  pop ebp
4e  ret 0x8                     ;; 使用寄存器 eax 返回它！
```

天哪。这正是我们所说应该发生的事情。也许我们开始了解了。

TurboFan 还足够聪明，可以在变量 `m2` 改变为不同的类时进行反优化。您可以通过类似以下有趣的代码观看最新优化的代码再次被反优化：

```javascript
m2 = 42;  // 哈哈。
```

## 接下来去哪儿

很多选择。映射迁移。字典模式（也称为"慢模式"）。此领域有很多可探索的东西，我希望您像我一样享受其中的乐趣——感谢您的阅读！
