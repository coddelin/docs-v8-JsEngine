---
title: "`Math.random()`には`Math.random()`だけではない"
author: "ヤン・グオ ([@hashseed](https://twitter.com/hashseed))、ソフトウェアエンジニア兼サイコロデザイナー"
avatars:
  - "yang-guo"
date: 2015-12-17 13:33:37
tags:
  - ECMAScript
  - 内部構造
description: "V8のMath.random実装は、以前のMWC1616実装に比べてランダム性を向上させるxorshift128+というアルゴリズムを採用しました。"
---
> `Math.random()`は引数を取らず、0以上1未満の正の符号を持つ`Number`値をランダムまたは擬似ランダムにほぼ均等分布で返します。この関数は実装依存のアルゴリズムまたは戦略を使用します。

<!--truncate-->
— _[ES 2015, section 20.2.2.27](http://tc39.es/ecma262/#sec-math.random)_

`Math.random()`は、JavaScriptで最もよく知られ、頻繁に使用されるランダム性のソースです。V8および他の多くのJavaScriptエンジンでは、[擬似乱数生成器（PRNG）](https://en.wikipedia.org/wiki/Pseudorandom_number_generator)を使用して実装されています。すべてのPRNGと同様に、乱数は内部状態から導出され、それぞれの新しい乱数のために固定アルゴリズムによって変化されます。したがって、初期状態が特定の場合、その乱数列は決定的です。内部状態のビットサイズnが限られているため、PRNGが生成する数値は最終的に繰り返されます。この[置換サイクル](https://en.wikipedia.org/wiki/Cyclic_permutation)の周期の上限は2<sup>n</sup>です。

PRNGアルゴリズムにはさまざまな種類があります。その中でもよく知られているものには、[メルセンヌ・ツイスタ](https://en.wikipedia.org/wiki/Mersenne_Twister)や[線形合同法（LCG）](https://en.wikipedia.org/wiki/Linear_congruential_generator)があります。それぞれには独自の特性、利点、および欠点があります。理想的には、初期状態にできるだけ少ないメモリを使用し、計算が速く、周期が長く、高品質なランダム分布を提供することが望まれます。ただし、メモリ使用量、性能、および周期長は容易に測定または計算できますが、品質を判断するのは困難です。乱数の品質を確認するための統計テストには多くの数学が関わっています。事実上の標準的なPRNGテストスイートである[TestU01](http://simul.iro.umontreal.ca/testu01/tu01.html)は、これらのテストの多くを実装しています。

[2015年末](https://github.com/v8/v8/blob/ceade6cf239e0773213d53d55c36b19231c820b5/src/js/math.js#L143)（バージョン4.9.40まで）まで、V8が選んだPRNGはMWC1616（キャリー乗算、16ビット部分を組み合わせたもの）でした。これは64ビットの内部状態を使用し、以下のように動作します：

```cpp
uint32_t state0 = 1;
uint32_t state1 = 2;
uint32_t mwc1616() {
  state0 = 18030 * (state0 & 0xFFFF) + (state0 >> 16);
  state1 = 30903 * (state1 & 0xFFFF) + (state1 >> 16);
  return state0 << 16 + (state1 & 0xFFFF);
}
```

その32ビット値は、仕様に則り0から1の間の浮動小数点数に変換されます。

MWC1616はメモリをほとんど使用せず、計算もかなり速いのですが、残念ながら品質が低い点があります：

- 生成可能な乱数の数が2<sup>32</sup>に制限されており、倍精度浮動小数点数で表現可能な0から1の間の2<sup>52</sup>個の数値に比べて少ない。
- 結果の上位半分はstate0の値にほぼ完全に依存しています。周期は最大2<sup>32</sup>ですが、大きい置換サイクルが少しある代わりに、多くの短いものがあります。不適切な初期状態では、サイクルの長さは4000万未満になる可能性があります。
- TestU01スイートの多くの統計テストに失敗します。

この問題が[指摘されています](https://medium.com/@betable/tifu-by-using-math-random-f1c308c4fd9d)。問題を理解し、調査の結果、[xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf)というアルゴリズムに基づいて`Math.random`を再実装することを決定しました。このアルゴリズムは128ビットの内部状態を使用し、周期長が2<sup>128</sup> - 1で、TestU01スイートのすべてのテストに合格します。

[V8 v4.9.41.0](https://github.com/v8/v8/blob/085fed0fb5c3b0136827b5d7c190b4bd1c23a23e/src/base/utils/random-number-generator.h#L102)で新しい実装が数日以内に取り入れられました。この変更はChrome 49で利用可能になりました。また、[Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=322529#c99)や[Safari](https://bugs.webkit.org/show_bug.cgi?id=151641)もxorshift128+に切り替えました。

V8 v7.1では[CL](https://chromium-review.googlesource.com/c/v8/v8/+/1238551/5)で実装が再調整され、state0のみに依存するようになりました。さらに詳しい実装の詳細は[ソースコード](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/base/utils/random-number-generator.h;l=119?q=XorShift128&sq=&ss=chromium)をご覧ください。

ただし、誤解しないでください。xorshift128+ が MWC1616 に比べて大幅に改善されているとしても、それが依然として[暗号的に安全](https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator)であるわけではありません。ハッシュ化、署名生成、暗号化/復号化のような用途には、通常のPRNGは不適切です。Web Cryptography APIは、[`window.crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/RandomSource/getRandomValues)という暗号的に安全なランダム値を返すメソッドを紹介していますが、これにはパフォーマンスコストが伴います。

V8とChromeの改善点に気づいた場合、たとえ仕様の準拠性、安定性、セキュリティに直接影響を与えないものであったとしても、このケースのように、[バグトラッカーに問題を報告](https://bugs.chromium.org/p/v8/issues/entry?template=Defect%20report%20from%20user)してください。
