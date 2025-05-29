---
title: '有 `Math.random()`，然後有 `Math.random()`'
author: '楊國 ([@hashseed](https://twitter.com/hashseed))，軟體工程師兼骰子設計師'
avatars:
  - 'yang-guo'
date: 2015-12-17 13:33:37
tags:
  - ECMAScript
  - internals
description: 'V8 的 Math.random 實現現在使用名為 xorshift128+ 的算法，相較於舊的 MWC1616 實現提升了隨機性。'
---
> `Math.random()` 返回一個帶正號、且大於等於 `0` 且小於 `1` 的 `Number` 值，這個值是隨機選出的或是伪隨機選出的，並且在該範圍內近似於均勻分佈，使用實現依賴的算法或策略。此函數不接受任何參數。

<!--truncate-->
— _[ES 2015, section 20.2.2.27](http://tc39.es/ecma262/#sec-math.random)_

`Math.random()` 是 JavaScript 中最知名也最常用的隨機來源。 在 V8 和大多數其他 JavaScript 引擎中，它是使用 [伪隨機數生成器](https://en.wikipedia.org/wiki/Pseudorandom_number_generator) (PRNG) 實現的。 隨著所有 PRNG 的使用，隨機數是由內部狀態衍生的，內部狀態每產生一個新的隨機數就會被固定算法改變。 因此，對於給定的初始狀態，隨機數序列是確定性的。由於內部狀態的位元大小 n 是有限的，PRNG 生成的數字最終會重複出現。該 [置換循環](https://en.wikipedia.org/wiki/Cyclic_permutation) 週期長度的上限是 2<sup>n</sup>。

有很多不同的 PRNG 算法；其中最知名的包括 [Mersenne-Twister](https://en.wikipedia.org/wiki/Mersenne_Twister) 和 [LCG](https://en.wikipedia.org/wiki/Linear_congruential_generator)。 每個都有其特定的特點、優勢和缺點。理想情況下，它應該可使用最少的記憶體作為初始狀態，執行速度快，有較大的週期長度，並提供高品質的隨機分佈。雖然可以輕鬆測量或計算記憶體使用、性能和週期長度，但質量更難確定。統計測試測試隨機數品質背後有許多數學理論。業界標準的 PRNG 測試套件 [TestU01](http://simul.iro.umontreal.ca/testu01/tu01.html) 實現了許多這類測試。

直到 [2015 年晚期](https://github.com/v8/v8/blob/ceade6cf239e0773213d53d55c36b19231c820b5/src/js/math.js#L143)（最高版本 4.9.40），V8 使用的 PRNG 是 MWC1616（乘法加進位，結合兩個 16 位元部分）。它使用 64 位元的內部狀態，運算過程大致如下：

```cpp
uint32_t state0 = 1;
uint32_t state1 = 2;
uint32_t mwc1616() {
  state0 = 18030 * (state0 & 0xFFFF) + (state0 >> 16);
  state1 = 30903 * (state1 & 0xFFFF) + (state1 >> 16);
  return state0 << 16 + (state1 & 0xFFFF);
}
```

然後 32 位元的值會根據規範轉換成 0 和 1 之間的浮點數值。

MWC1616 使用非常少的記憶體，計算速度也非常快，但不幸的是，其品質略遜一籌：

- 它能生成的隨機值數量上限是 2<sup>32</sup>，而非雙精度浮點數可以表示的 0 和 1 之間的 2<sup>52</sup> 數字。
- 結果的較高有效位幾乎完全依賴於 state0 的值。週期長度最多是 2<sup>32</sup>，但不是一些大的循環週期，而是許多小的週期。如果初始狀態選擇不當，週期長度可能少於四千萬。
- 它在 TestU01 套件里的許多統計測試中失敗。

這一點被 [指出](https://medium.com/@betable/tifu-by-using-math-random-f1c308c4fd9d)，在了解問題並進行研究後，我們決定基於名為 [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf) 的算法重新實現 `Math.random`。 它使用 128 位內部狀態，週期長度為 2<sup>128</sup> - 1，並通過了 TestU01 套件中的所有測試。

此實現 [在 V8 v4.9.41.0](https://github.com/v8/v8/blob/085fed0fb5c3b0136827b5d7c190b4bd1c23a23e/src/base/utils/random-number-generator.h#L102) 上市，就是我們意識到問題的幾天內。 它在 Chrome 49 中可用。 [Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=322529#c99) 和 [Safari](https://bugs.webkit.org/show_bug.cgi?id=151641) 也轉向了使用 xorshift128+。

在 V8 v7.1 中，實現再次調整[CL](https://chromium-review.googlesource.com/c/v8/v8/+/1238551/5)，僅依賴 state0。請在[原始碼](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/base/utils/random-number-generator.h;l=119?q=XorShift128&sq=&ss=chromium)中查找進一步的實現詳細資訊。

然而請不要誤會：即使 xorshift128+ 相較於 MWC1616 有了巨大的進步，它仍然不是 [密碼學安全](https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator) 的隨機數生成器。在像是雜湊、簽名生成以及加密/解密等使用場景中，普通的 PRNG 皆不適合。Web Cryptography API 引入了 [`window.crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/RandomSource/getRandomValues)，這是一種能夠以性能為代價返回密碼學安全的隨機值的方法。

請記住，如果您在 V8 和 Chrome 中發現可以改進的地方，即使這些改進 — 像這個一樣 — 並未直接影響到規範遵循、穩定性或安全性，請提交 [問題報告到我們的追蹤系統](https://bugs.chromium.org/p/v8/issues/entry?template=Defect%20report%20from%20user)。
