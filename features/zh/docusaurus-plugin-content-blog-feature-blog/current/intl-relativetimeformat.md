---
title: &apos;`Intl.RelativeTimeFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-10-22
tags:
  - Intl
  - Node.js 12
  - io19
description: &apos;Intl.RelativeTimeFormat 使相对时间的本地化格式化成为可能，同时不牺牲性能。&apos;
tweet: &apos;1054387117571354624&apos;
---
现代 Web 应用程序通常使用诸如“昨天”、“42 秒前”或“3 个月后”的短语代替完整的日期和时间戳。这种 _相对时间格式化值_ 已经变得如此普遍，以至于许多流行的库都实现了以本地化方式格式化它们的工具函数。（例如 [Moment.js](https://momentjs.com/)、[Globalize](https://github.com/globalizejs/globalize)、和 [date-fns](https://date-fns.org/docs/)。）

<!--truncate-->
实现本地化相对时间格式化器的一个问题是，你需要为你想支持的每种语言准备自定义的单词或短语列表（例如“昨天”或“上个季度”）。[Unicode CLDR](http://cldr.unicode.org/) 提供了这些数据，但要在 JavaScript 中使用它，必须将其嵌入并与其他库代码一起发布。不幸的是，这会增加这些库的包大小，对加载时间、解析/编译成本和内存消耗造成负面影响。

全新的 `Intl.RelativeTimeFormat` API 将这个负担转移到 JavaScript 引擎，由引擎提供区域设置数据，并直接向 JavaScript 开发者开放。`Intl.RelativeTimeFormat` 使相对时间的本地化格式化成为可能，同时不牺牲性能。

## 使用示例

以下示例展示了如何使用英语创建一个相对时间格式化器。

```js
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;);

rtf.format(3.14, &apos;second&apos;);
// → &apos;in 3.14 seconds&apos;

rtf.format(-15, &apos;minute&apos;);
// → &apos;15 minutes ago&apos;

rtf.format(8, &apos;hour&apos;);
// → &apos;in 8 hours&apos;

rtf.format(-2, &apos;day&apos;);
// → &apos;2 days ago&apos;

rtf.format(3, &apos;week&apos;);
// → &apos;in 3 weeks&apos;

rtf.format(-5, &apos;month&apos;);
// → &apos;5 months ago&apos;

rtf.format(2, &apos;quarter&apos;);
// → &apos;in 2 quarters&apos;

rtf.format(-42, &apos;year&apos;);
// → &apos;42 years ago&apos;
```

请注意，传递给 `Intl.RelativeTimeFormat` 构造函数的参数可以是一个包含 [BCP 47 语言标签](https://tools.ietf.org/html/rfc5646) 的字符串，或者 [一组这样的语言标签](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Intl#语言标识和协商)。

以下是使用不同语言（西班牙语）的示例：

```js
const rtf = new Intl.RelativeTimeFormat(&apos;es&apos;);

rtf.format(3.14, &apos;second&apos;);
// → &apos;dentro de 3,14 segundos&apos;

rtf.format(-15, &apos;minute&apos;);
// → &apos;hace 15 minutos&apos;

rtf.format(8, &apos;hour&apos;);
// → &apos;dentro de 8 horas&apos;

rtf.format(-2, &apos;day&apos;);
// → &apos;hace 2 días&apos;

rtf.format(3, &apos;week&apos;);
// → &apos;dentro de 3 semanas&apos;

rtf.format(-5, &apos;month&apos;);
// → &apos;hace 5 meses&apos;

rtf.format(2, &apos;quarter&apos;);
// → &apos;dentro de 2 trimestres&apos;

rtf.format(-42, &apos;year&apos;);
// → &apos;hace 42 años&apos;
```

此外，`Intl.RelativeTimeFormat` 构造函数接受一个可选的 `options` 参数，它可以对输出进行细粒度控制。为了说明其灵活性，让我们查看一些基于默认设置的英语输出示例：

```js
// 使用默认设置（与之前一样）为英语创建一个相对时间格式化器。
// 在这个示例中，默认值被显式传递进去。
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, {
  localeMatcher: &apos;best fit&apos;, // 其他值：&apos;lookup&apos;
  style: &apos;long&apos;, // 其他值：&apos;short&apos; 或 &apos;narrow&apos;
  numeric: &apos;always&apos;, // 其他值：&apos;auto&apos;
});

// 现在，让我们尝试一些特殊情况！

rtf.format(-1, &apos;day&apos;);
// → &apos;1 day ago&apos;

rtf.format(0, &apos;day&apos;);
// → &apos;in 0 days&apos;

rtf.format(1, &apos;day&apos;);
// → &apos;in 1 day&apos;

rtf.format(-1, &apos;week&apos;);
// → &apos;1 week ago&apos;

rtf.format(0, &apos;week&apos;);
// → &apos;in 0 weeks&apos;

rtf.format(1, &apos;week&apos;);
// → &apos;in 1 week&apos;
```

你可能注意到，上面的格式化器产生了 `&apos;1 day ago&apos;` 而不是 `&apos;yesterday&apos;`，以及略显尴尬的 `&apos;in 0 weeks&apos;` 而不是 `&apos;this week&apos;`。这是因为默认情况下，格式化器在输出中使用数值值。

要改变此行为，请将 `numeric` 选项设置为 `&apos;auto&apos;`（而不是隐含的默认值 `&apos;always&apos;`）：

```js
// 创建一个为英语语言的相对时间格式化器，
// 不一定需要始终在输出中使用数值值。
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;yesterday&apos;

rtf.format(0, &apos;day&apos;);
// → &apos;today&apos;

rtf.format(1, &apos;day&apos;);
// → &apos;tomorrow&apos;

rtf.format(-1, &apos;week&apos;);
// → &apos;last week&apos;

rtf.format(0, &apos;week&apos;);
// → &apos;this week&apos;

rtf.format(1, &apos;week&apos;);
// → &apos;next week&apos;
```

与其他 `Intl` 类类似，`Intl.RelativeTimeFormat` 除了 `format` 方法外，还有一个 `formatToParts` 方法。虽然 `format` 涵盖了最常见的使用场景，但如果需要访问生成输出的各个部分，`formatToParts` 会非常有用：

```js
// 创建一个用于英文语言的相对时间格式化器，
// 输出中并不总是需要使用数值。
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;昨天&apos;

rtf.formatToParts(-1, &apos;day&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;昨天&apos; }]

rtf.format(3, &apos;week&apos;);
// → &apos;3周后&apos;

rtf.formatToParts(3, &apos;week&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;3周后&apos; },
//    { type: &apos;integer&apos;, value: &apos;3&apos;, unit: &apos;week&apos; },
//    { type: &apos;literal&apos;, value: &apos;周&apos; }]
```

有关剩余选项及其行为的更多信息，请参阅 [提案库中的 API 文档](https://github.com/tc39/proposal-intl-relative-time#api)。

## 结论

`Intl.RelativeTimeFormat` 在 V8 v7.1 和 Chrome 71 中默认可用。随着此 API 的广泛应用，你会发现像 [Moment.js](https://momentjs.com/)、[Globalize](https://github.com/globalizejs/globalize) 和 [date-fns](https://date-fns.org/docs/) 等库逐渐摆脱对硬编码 CLDR 数据库的依赖，转而使用原生相对时间格式化功能，从而提升加载时间性能、解析和编译时间性能、运行时性能和内存使用效率。

## `Intl.RelativeTimeFormat` 支持

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
