---
title: "一个额外的非回溯正则表达式引擎"
author: "马丁·比德林梅尔"
date: 2021-01-11
tags:
 - 内部机制
 - 正则表达式
description: "V8 现在新增了一个正则表达式引擎作为回退选项，可防止许多灾难性回溯问题的发生。"
tweet: "1348635270762139650"
---
从 v8.8 开始，V8 附带了一个新的实验性非回溯正则表达式引擎（除了现有的 [Irregexp 引擎](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html) 之外），它保证相对于目标字符串的大小按线性时间执行。这个实验性引擎可以通过下列所述的功能标志启用。

<!--truncate-->
![`/(a*)*b/.exec('a'.repeat(n))` 的运行时间，n ≤ 100](/_img/non-backtracking-regexp/runtime-plot.svg)

以下是配置新的正则表达式引擎的方法：

- `--enable-experimental-regexp_engine-on-excessive-backtracks` 启用在过多回溯时回退至非回溯引擎。
- `--regexp-backtracks-before-fallback N`（默认 N = 50,000）指定回溯被认为是“过多”的次数，即触发回退的阈值。
- `--enable-experimental-regexp-engine` 启用对非标准的 `l`（“线性”）标志的识别，如 `/(a*)*b/l` 中的正则表达式。使用此标志构建的正则表达式将始终使用新引擎立即执行；Irregexp 完全不参与。如果新正则表达式引擎无法处理带有 `l` 标志的正则表达式的模式，则在构建时会抛出异常。我们希望此功能可以在某些时候用于加强运行在不可信输入上的正则表达式的安全性。目前它仍处于实验阶段，因为 Irregexp 对大多数常见模式的执行速度比新引擎快了好几个数量级。

回退机制并不适用于所有模式。要触发回退机制，正则表达式必须满足以下条件：

- 不包含反向引用，
- 不包含前瞻或后顾，
- 不包含大型或深度嵌套的有限重复，例如 `/a{200,500}/`，并且
- 未设置 `u`（Unicode）或 `i`（大小写不敏感）标志。

## 背景：灾难性回溯

V8 中的正则表达式匹配由 Irregexp 引擎处理。Irregexp 将正则表达式即时编译为专门的本机代码（或[字节码](/blog/regexp-tier-up)），因此作为处理大多数模式的引擎速度极快。然而，对于某些模式，Irregexp 的运行时间可能会因输入字符串的大小而呈指数增长。上面提到的例子 `/(a*)*b/.exec('a'.repeat(100))` 如果由 Irregexp 执行，在我们的生命周期内永远无法完成。

那么这里到底发生了什么呢？Irregexp 是一个*回溯*引擎。当面临如何继续匹配的选择时，Irregexp 会先完全探索第一个备选项，然后如果有必要，回溯以探索第二个备选项。例如，考虑将模式 `/abc|[az][by][0-9]/` 与目标字符串 `'ab3'` 进行匹配的情况。这里 Irregexp 首先尝试匹配 `/abc/`，并在第二个字符后失败。然后它回溯两字符并成功匹配了第二个备选项 `/[az][by][0-9]/`。在具有量词的模式中，例如 `/(abc)*xyz/`，Irregexp 在匹配主体后必须选择是再次匹配主体还是继续处理剩余模式。

让我们试着理解当使用较小的目标字符串（比如 `'aaa'`）匹配 `/(a*)*b/` 时的情况。此模式包含嵌套量词，因此我们要求 Irregexp 匹配 `a` 的*序列的序列*，然后匹配 `b`。显然不会匹配，因为目标字符串不包含 `b`。但是，`/(a*)*/` 匹配，并且以指数级不同的方式进行匹配：

```js
'aaa'           'aa', 'a'           'aa', ''
'a', 'aa'       'a', 'a', 'a'       'a', 'a', ''
…
```

事先，Irregexp 无法排除最终未能匹配 `/b/` 是由于选择了错误的匹配方式导致的，因此它必须尝试所有变体。这种问题被称为“指数型”或“灾难性”回溯。

## 正则表达式作为自动机和字节码

为了理解一种对灾难性回溯免疫的替代算法，我们必须通过[自动机](https://en.wikipedia.org/wiki/Nondeterministic_finite_automaton)快速做个小插曲。每个正则表达式都等价于一个自动机。例如，上面的正则表达式 `/(a*)*b/` 对应于以下自动机：

![与 `/(a*)*b/` 对应的自动机](/_img/non-backtracking-regexp/example-automaton.svg)

请注意，自动机并不是由模式唯一决定的；上面展示的自动机是通过机械翻译过程得到的自动机，也是用于 V8 新正则表达式引擎处理 `/(a*)*/` 的自动机。
未标记的边是ε转换：它们不消耗输入。ε转换对于保持自动机大小接近模式大小是必要的。天真地消除ε转换可能会导致转换数量的平方增长。
ε转换还允许通过以下四种基本状态构造对应正则表达式的自动机：

![正则表达式字节码指令](/_img/non-backtracking-regexp/state-types.svg)

在这里我们只分类状态的*输出*转换，而状态的输入转换仍然可以是任意的。由这些状态组成的自动机可以表示为*字节码程序*，每个状态对应一个指令。例如，一个有两个ε转换的状态表述为一个`FORK`指令。

## 回溯算法

让我们重新审视Irregexp所基于的回溯算法并以自动机的术语描述它。假设我们有一个对应模式的字节码数组`code`，并想要`test`输入是否匹配模式。假设`code`如下所示：

```js
const code = [
  {opcode: 'FORK', forkPc: 4},
  {opcode: 'CONSUME', char: '1'},
  {opcode: 'CONSUME', char: '2'},
  {opcode: 'JMP', jmpPc: 6},
  {opcode: 'CONSUME', char: 'a'},
  {opcode: 'CONSUME', char: 'b'},
  {opcode: 'ACCEPT'}
];
```

这个字节码对应于(粘性)模式`/12|ab/y`。`FORK`指令的`forkPc`字段是可以继续的备选状态/指令的索引(“程序计数器”)，类似地对于`jmpPc`。索引是从零开始的。现在可以用JavaScript实现回溯算法如下。

```js
let ip = 0; // 输入位置。
let pc = 0; // 程序计数器：下一个指令的索引。
const stack = []; // 回溯栈。
while (true) {
  const inst = code[pc];
  switch (inst.opcode) {
    case 'CONSUME':
      if (ip < input.length && input[ip] === inst.char) {
        // 输入与预期匹配：继续。
        ++ip;
        ++pc;
      } else if (stack.length > 0) {
        // 输入字符错误，但我们可以回溯。
        const back = stack.pop();
        ip = back.ip;
        pc = back.pc;
      } else {
        // 字符错误，无法回溯。
        return false;
      }
      break;
    case 'FORK':
      // 保存备选项以供以后回溯使用。
      stack.push({ip: ip, pc: inst.forkPc});
      ++pc;
      break;
    case 'JMP':
      pc = inst.jmpPc;
      break;
    case 'ACCEPT':
      return true;
  }
}
```

如果字节码程序包含不消耗任何字符的循环，即如果自动机仅有ε转换构成的循环，该实现将无限循环。这个问题可以通过查看单个字符的前瞻来解决。Irregexp比这个简单实现复杂得多，但最终还是基于同样的算法。

## 非回溯算法

回溯算法对应于自动机的*深度优先*遍历：我们总是完整地探索`FORK`语句的第一个备选项，然后在必要时回溯到第二个备选项。与之相对的非回溯算法令人不意外地基于自动机的*广度优先*遍历。在这里我们同时考虑所有备选项，并与输入字符串当前位置保持锁步。因此我们维护一个当前状态列表，然后通过每个输入字符对应的转换推进所有状态。关键在于，我们从当前状态列表中删除重复项。

一个简单的JavaScript实现看起来像这样：

```js
// 输入位置。
let ip = 0;
// 当前pc值列表，如果我们找到匹配则为'ACCEPT'。我们从pc 0开始并跟随ε转换。
let pcs = followEpsilons([0]);

while (true) {
  // 如果我们找到了匹配，就结束……
  if (pcs === 'ACCEPT') return true;
  // ……或者我们已经耗尽了输入字符串。
  if (ip >= input.length) return false;

  // 仅继续与正确字符匹配的pcs。
  pcs = pcs.filter(pc => code[pc].char === input[ip]);
  // 将剩余的pcs推进到下一条指令。
  pcs = pcs.map(pc => pc + 1);
  // 跟随ε转换。
  pcs = followEpsilons(pcs);

  ++ip;
}
```

这里`followEpsilons`是一个函数，它接受一个程序计数器列表并计算可以通过ε转换到达的`CONSUME`指令处的程序计数器列表(即仅执行`FORK`和`JMP`)。返回的列表不应包含重复项。如果可以到达`ACCEPT`指令，该函数返回'ACCEPT'。它可以这样实现：

```js
function followEpsilons(pcs) {
  // 我们到目前为止已看到的pcs集合。
  const visitedPcs = new Set();
  const result = [];

  while (pcs.length > 0) {
    const pc = pcs.pop();

    // 如果我们以前已经看到这个pc，就可以忽略它。
    if (visitedPcs.has(pc)) continue;
    visitedPcs.add(pc);

    const inst = code[pc];
    switch (inst.opcode) {
      case 'CONSUME':
        result.push(pc);
        break;
      case 'FORK':
        pcs.push(pc + 1, inst.forkPc);
        break;
      case 'JMP':
        pcs.push(inst.jmpPc);
        break;
      case 'ACCEPT':
        return 'ACCEPT';
    }
  }

  return result;
}
```

由于通过 `visitedPcs` 集合消除重复项，我们知道在 `followEpsilons` 中每个程序计数器只会被检查一次。这保证了 `result` 列表中没有重复项，并且 `followEpsilons` 的运行时间受 `code` 数组的大小（即模式的大小）限制。`followEpsilons` 最多被调用 `input.length` 次，因此正则表达式匹配的总运行时间受 `𝒪(pattern.length * input.length)` 限制。

非回溯算法可以扩展以支持大多数 JavaScript 正则表达式特性，例如单词边界或（子）匹配边界的计算。不幸的是，如果没有重大改变以改变渐近的最坏情况复杂性，后向引用、前瞻和后顾是无法支持的。

V8 的新正则表达式引擎基于此算法及其在 [re2](https://github.com/google/re2) 和 [Rust regex](https://github.com/rust-lang/regex) 库中的实现。Russ Cox（也是 re2 库的原作者）在一系列优秀的 [博客文章](https://swtch.com/~rsc/regexp/) 中对该算法进行了比这里更深入的探讨。
