---
title: "数字分隔符"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-05-28
tags: 
  - ECMAScript
  - ES2021
  - io19
description: "JavaScript现在支持用下划线作为数字字面量的分隔符，从而提升源码的可读性和可维护性。"
tweet: "1129073383931559936"
---
大型数字字面量对人眼来说难以快速解析，特别是当数字中有大量重复数字时：

```js
1000000000000
   1019436871.42
```

为了提高可读性，[一个新的JavaScript语言特性](https://github.com/tc39/proposal-numeric-separator)允许在数字字面量中使用下划线作为分隔符。因此，上述内容现在可以改写为按千分进行分组，例如：

<!--truncate-->
```js
1_000_000_000_000
    1_019_436_871.42
```

现在更容易看出第一个数字是万亿，而第二个数字在10亿的范围内。

数字分隔符帮助提高各种类型数字字面量的可读性：

```js
// 一个使用千分分组的十进制整数字面量：
1_000_000_000_000
// 一个使用千分分组的十进制字面量：
1_000_000.220_720
// 一个使用八位分组的二进制整数字面量：
0b01010110_00111000
// 一个使用四位分组的二进制整数字面量：
0b0101_0110_0011_1000
// 一个按字节分组的十六进制整数字面量：
0x40_76_38_6A_73
// 一个使用千分分组的BigInt字面量：
4_642_473_943_484_686_707n
```

它们甚至可以用于八进制整数字面量（尽管[我想不出一个示例](https://github.com/tc39/proposal-numeric-separator/issues/44)能够展示分隔符对这种字面量有何意义）：

```js
// 一个八进制整数字面量中的数字分隔符：🤷‍♀️
0o123_456
```

注意，JavaScript还有一种遗留的八进制字面量语法，不需要显式的`0o`前缀。例如，`017 === 0o17`。这种语法在严格模式下或模块中不被支持，不应该在现代代码中使用。因此，这类字面量不支持数字分隔符。应使用`0o17`风格的字面量。

## 数字分隔符的支持情况

<feature-support chrome="75 /blog/v8-release-75#numeric-separators"
                 firefox="70 https://hacks.mozilla.org/2019/10/firefox-70-a-bountiful-release-for-all/"
                 safari="13"
                 nodejs="12.5.0 https://nodejs.org/en/blog/release/v12.5.0/"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-numeric-separator"></feature-support>
