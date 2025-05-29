---
title: &apos;数値区切り文字&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-05-28
tags:
  - ECMAScript
  - ES2021
  - io19
description: &apos;JavaScriptは数値リテラルにアンダースコアを区切り文字として使用することをサポートし、ソースコードの可読性と保守性を向上させます。&apos;
tweet: &apos;1129073383931559936&apos;
---
大きな数値リテラルは、特に繰り返しの数字が多い場合、人間の目で素早く解析するのが困難です。

```js
1000000000000
   1019436871.42
```

可読性を向上させるために、[新しいJavaScriptの言語機能](https://github.com/tc39/proposal-numeric-separator)で数値リテラルにアンダースコアを区切り文字として使用できるようになりました。その結果、上記のような数値が千単位ごとにグループ化して書き直すことができます。

<!--truncate-->
```js
1_000_000_000_000
    1_019_436_871.42
```

これにより、最初の数値が1兆であることや、2番目の数値が約10億であることが簡単に分かるようになります。

数値区切り文字は、さまざまな種類の数値リテラルの可読性向上に役立ちます。

```js
// 数字を千単位でグループ化した10進数整数リテラル:
1_000_000_000_000
// 数字を千単位でグループ化した10進数リテラル:
1_000_000.220_720
// ビットをオクテット単位でグループ化した2進数整数リテラル:
0b01010110_00111000
// ビットをニブル単位でグループ化した2進数整数リテラル:
0b0101_0110_0011_1000
// 数字をバイト単位でグループ化した16進数整数リテラル:
0x40_76_38_6A_73
// 数字を千単位でグループ化したBigIntリテラル:
4_642_473_943_484_686_707n
```

数値区切り文字は8進数整数リテラルでも動作します（ただし、[そのようなリテラルで区切り文字が有益となる例](https://github.com/tc39/proposal-numeric-separator/issues/44)を思いつきません）。

```js
// 8進数整数リテラル内の数値区切り文字: 🤷‍♀️
0o123_456
```

注意すべき点として、JavaScriptにはExplicitな`0o`プレフィックスなしのレガシーな8進数リテラル構文もあります。例えば、`017 === 0o17`です。この構文はstrictモードやモジュール内ではサポートされておらず、現代のコードでは使用すべきではありません。したがって、これらのリテラルには数値区切り文字はサポートされていません。代わりに`0o17`形式のリテラルを使用してください。

## 数値区切り文字のサポート

<feature-support chrome="75 /blog/v8-release-75#numeric-separators"
                 firefox="70 https://hacks.mozilla.org/2019/10/firefox-70-a-bountiful-release-for-all/"
                 safari="13"
                 nodejs="12.5.0 https://nodejs.org/en/blog/release/v12.5.0/"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-numeric-separator"></feature-support>
