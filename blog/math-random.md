---
title: "有 `Math.random()`，也有 `Math.random()`"
author: "杨国 ([@hashseed](https://twitter.com/hashseed))，软件工程师兼骰子设计师"
avatars: 
  - "yang-guo"
date: "2015-12-17 13:33:37"
tags: 
  - ECMAScript
  - 内部机制
description: "V8 的 Math.random 实现现在使用一种名为 xorshift128+ 的算法，与旧的 MWC1616 实现相比，提高了随机性。"
---
> `Math.random()` 返回一个带正号的 `Number` 值，大于或等于 `0` 但小于 `1`，在该范围内随机或伪随机地选择，近似均匀分布，使用与实现相关的算法或策略。本函数不接受任何参数。

<!--truncate-->
— _[ES 2015，第 20.2.2.27 节](http://tc39.es/ecma262/#sec-math.random)_

`Math.random()` 是 JavaScript 中最广为人知且使用最频繁的随机源。在 V8 和大多数其他 JavaScript 引擎中，它是通过一个 [伪随机数生成器](https://en.wikipedia.org/wiki/Pseudorandom_number_generator) (PRNG) 实现的。和所有 PRNG 一样，随机数是从内部状态导出的，该状态通过固定算法对每个新生成的随机数进行更改。因此，对于给定的初始状态，随机数序列是确定性的。由于内部状态的位大小 n 是有限的，PRNG 生成的数字最终会重复出现。这个 [排列周期](https://en.wikipedia.org/wiki/Cyclic_permutation) 的周期长度上限为 2<sup>n</sup>。

有许多不同的 PRNG 算法；其中最知名的有 [Mersenne-Twister](https://en.wikipedia.org/wiki/Mersenne_Twister) 和 [LCG](https://en.m.wikipedia.org/wiki/Linear_congruential_generator)。每种算法都有其特点、优势和缺点。理想情况下，它应尽可能少使用初始状态的内存，快速计算，具有较长的周期长度，并提供高质量的随机分布。虽然内存使用、性能和周期长度可以轻松测量或计算，但质量很难确定。有许多数学方法可以对随机数的质量进行统计测试。事实上的标准 PRNG 测试套件 [TestU01](http://simul.iro.umontreal.ca/testu01/tu01.html) 实现了许多这样的测试。

直到 [2015 年晚期](https://github.com/v8/v8/blob/ceade6cf239e0773213d53d55c36b19231c820b5/src/js/math.js#L143)（版本 4.9.40 之前），V8 的 PRNG 选择是 MWC1616（用进位相乘，结合两个 16 位部分）。它使用了 64 位内部状态，看起来大致如下：

```cpp
uint32_t state0 = 1;
uint32_t state1 = 2;
uint32_t mwc1616() {
  state0 = 18030 * (state0 & 0xFFFF) + (state0 >> 16);
  state1 = 30903 * (state1 & 0xFFFF) + (state1 >> 16);
  return state0 << 16 + (state1 & 0xFFFF);
}
```

然后将 32 位值转化为在 0 和 1 之间的浮点数，以符合规范。

MWC1616 使用了很少的内存并且计算得相当快，但遗憾的是质量表现不佳：

- 它可以生成的随机值数量限制为 2<sup>32</sup>，相比之下，双精度浮点数可以表示的 0 到 1 之间的数字为 2<sup>52</sup>。
- 结果较重要的上半部分几乎完全取决于 state0 的值。周期长度最多为 2<sup>32</sup>，但与几个大的排列周期不同，它存在许多短周期。如果初始状态选择不佳，周期长度可能少于 4000 万。
- 它无法通过 TestU01 套件中的许多统计测试。

这一点已被 [指出](https://medium.com/@betable/tifu-by-using-math-random-f1c308c4fd9d)，在了解了问题并经过一些研究后，我们决定基于一种名为 [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf) 的算法重新实现 `Math.random`。它使用 128 位内部状态，周期长度为 2<sup>128</sup> - 1，并通过了 TestU01 套件中的所有测试。

这一实现 [在 V8 v4.9.41.0](https://github.com/v8/v8/blob/085fed0fb5c3b0136827b5d7c190b4bd1c23a23e/src/base/utils/random-number-generator.h#L102) 中上线，仅在我们意识到问题后的几天内完成。该功能随着 Chrome 49 一起发布。 [Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=322529#c99) 和 [Safari](https://bugs.webkit.org/show_bug.cgi?id=151641) 也切换到了 xorshift128+。

在 V8 v7.1 中，基于 [CL](https://chromium-review.googlesource.com/c/v8/v8/+/1238551/5) 的仅依赖 state0 的实现再次进行了调整。请在 [源代码](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/base/utils/random-number-generator.h;l=119?q=XorShift128&sq=&ss=chromium) 中进一步了解实现细节。

然而请注意：尽管 xorshift128+ 比 MWC1616 有了巨大的改进，它仍然不是[密码安全的](https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator)。对于诸如哈希、签名生成和加密/解密等使用场景，普通的伪随机数生成器是不合适的。Web 加密 API 引入了 [`window.crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/RandomSource/getRandomValues)，一种返回密码安全随机值的方法，但会有性能成本。

请记住，如果您发现 V8 和 Chrome 中的改进空间，即使这些改进——如这一个——并不直接影响规范遵从性、稳定性或安全性，请在我们的[问题追踪器](https://bugs.chromium.org/p/v8/issues/entry?template=Defect%20report%20from%20user)上提交一个问题。
