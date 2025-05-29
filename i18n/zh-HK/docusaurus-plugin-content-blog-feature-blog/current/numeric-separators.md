---
title: "數字分隔符"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-05-28
tags:
  - ECMAScript
  - ES2021
  - io19
description: "JavaScript 現在支援在數字字面值中使用底線作為分隔符，提升原始碼的可讀性和可維護性。"
tweet: "1129073383931559936"
---
大型數字字面值難以讓人眼快速解析，尤其是當數字中有許多重複的數字時:

```js
1000000000000
   1019436871.42
```

為了提升可讀性，[一項新的 JavaScript 語言特性](https://github.com/tc39/proposal-numeric-separator)允許在數字字面值中使用底線作為分隔符。因此，可以將上述數字重新編寫，以每千位分組為例:

<!--truncate-->
```js
1_000_000_000_000
    1_019_436_871.42
```

現在更容易辨別第一個數字是兆，第二個數字是十億級別。

數字分隔符幫助提升各種數字字面值的可讀性:

```js
// 帶每千位分組的十進位整數字面值:
1_000_000_000_000
// 帶每千位分組的十進位字面值:
1_000_000.220_720
// 帶每八位分組的二進位整數字面值:
0b01010110_00111000
// 帶每四位分組的二進位整數字面值:
0b0101_0110_0011_1000
// 帶每字節分組的十六進位整數字面值:
0x40_76_38_6A_73
// 帶每千位分組的 BigInt 字面值:
4_642_473_943_484_686_707n
```

數字分隔符甚至適用於八進位整數字面值（儘管[目前我想不到有什麼例子](https://github.com/tc39/proposal-numeric-separator/issues/44)顯示分隔符能為此類字面值帶來價值）:

```js
// 八進位整數字面值中的數字分隔符: 🤷‍♀️
0o123_456
```

需要注意的是，JavaScript 也有一種不帶 `0o` 前綴的舊式八進位字面值語法。例如，`017 === 0o17`。此語法不被嚴格模式或模組支持，且不應在現代程式碼中使用。因此，數字分隔符不支持這些字面值。請使用 `0o17` 樣式的字面值。

## 對數字分隔符的支援

<feature-support chrome="75 /blog/v8-release-75#numeric-separators"
                 firefox="70 https://hacks.mozilla.org/2019/10/firefox-70-a-bountiful-release-for-all/"
                 safari="13"
                 nodejs="12.5.0 https://nodejs.org/en/blog/release/v12.5.0/"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-numeric-separator"></feature-support>
