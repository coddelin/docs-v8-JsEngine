---
title: '`Intl.RelativeTimeFormat`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-10-22
tags:
  - Intl
  - Node.js 12
  - io19
description: 'Intl.RelativeTimeFormat 使相对时间的本地化格式化成为可能，同时不牺牲性能。'
tweet: '1054387117571354624'
---
现代 Web 应用程序通常使用诸如“昨天”、“42 秒前”或“3 个月后”的短语代替完整的日期和时间戳。这种 _相对时间格式化值_ 已经变得如此普遍，以至于许多流行的库都实现了以本地化方式格式化它们的工具函数。（例如 [Moment.js](https://momentjs.com/)、[Globalize](https://github.com/globalizejs/globalize)、和 [date-fns](https://date-fns.org/docs/)。）

<!--truncate-->
实现本地化相对时间格式化器的一个问题是，你需要为你想支持的每种语言准备自定义的单词或短语列表（例如“昨天”或“上个季度”）。[Unicode CLDR](http://cldr.unicode.org/) 提供了这些数据，但要在 JavaScript 中使用它，必须将其嵌入并与其他库代码一起发布。不幸的是，这会增加这些库的包大小，对加载时间、解析/编译成本和内存消耗造成负面影响。

全新的 `Intl.RelativeTimeFormat` API 将这个负担转移到 JavaScript 引擎，由引擎提供区域设置数据，并直接向 JavaScript 开发者开放。`Intl.RelativeTimeFormat` 使相对时间的本地化格式化成为可能，同时不牺牲性能。

## 使用示例

以下示例展示了如何使用英语创建一个相对时间格式化器。

```js
const rtf = new Intl.RelativeTimeFormat('en');

rtf.format(3.14, 'second');
// → 'in 3.14 seconds'

rtf.format(-15, 'minute');
// → '15 minutes ago'

rtf.format(8, 'hour');
// → 'in 8 hours'

rtf.format(-2, 'day');
// → '2 days ago'

rtf.format(3, 'week');
// → 'in 3 weeks'

rtf.format(-5, 'month');
// → '5 months ago'

rtf.format(2, 'quarter');
// → 'in 2 quarters'

rtf.format(-42, 'year');
// → '42 years ago'
```

请注意，传递给 `Intl.RelativeTimeFormat` 构造函数的参数可以是一个包含 [BCP 47 语言标签](https://tools.ietf.org/html/rfc5646) 的字符串，或者 [一组这样的语言标签](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Intl#语言标识和协商)。

以下是使用不同语言（西班牙语）的示例：

```js
const rtf = new Intl.RelativeTimeFormat('es');

rtf.format(3.14, 'second');
// → 'dentro de 3,14 segundos'

rtf.format(-15, 'minute');
// → 'hace 15 minutos'

rtf.format(8, 'hour');
// → 'dentro de 8 horas'

rtf.format(-2, 'day');
// → 'hace 2 días'

rtf.format(3, 'week');
// → 'dentro de 3 semanas'

rtf.format(-5, 'month');
// → 'hace 5 meses'

rtf.format(2, 'quarter');
// → 'dentro de 2 trimestres'

rtf.format(-42, 'year');
// → 'hace 42 años'
```

此外，`Intl.RelativeTimeFormat` 构造函数接受一个可选的 `options` 参数，它可以对输出进行细粒度控制。为了说明其灵活性，让我们查看一些基于默认设置的英语输出示例：

```js
// 使用默认设置（与之前一样）为英语创建一个相对时间格式化器。
// 在这个示例中，默认值被显式传递进去。
const rtf = new Intl.RelativeTimeFormat('en', {
  localeMatcher: 'best fit', // 其他值：'lookup'
  style: 'long', // 其他值：'short' 或 'narrow'
  numeric: 'always', // 其他值：'auto'
});

// 现在，让我们尝试一些特殊情况！

rtf.format(-1, 'day');
// → '1 day ago'

rtf.format(0, 'day');
// → 'in 0 days'

rtf.format(1, 'day');
// → 'in 1 day'

rtf.format(-1, 'week');
// → '1 week ago'

rtf.format(0, 'week');
// → 'in 0 weeks'

rtf.format(1, 'week');
// → 'in 1 week'
```

你可能注意到，上面的格式化器产生了 `'1 day ago'` 而不是 `'yesterday'`，以及略显尴尬的 `'in 0 weeks'` 而不是 `'this week'`。这是因为默认情况下，格式化器在输出中使用数值值。

要改变此行为，请将 `numeric` 选项设置为 `'auto'`（而不是隐含的默认值 `'always'`）：

```js
// 创建一个为英语语言的相对时间格式化器，
// 不一定需要始终在输出中使用数值值。
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'yesterday'

rtf.format(0, 'day');
// → 'today'

rtf.format(1, 'day');
// → 'tomorrow'

rtf.format(-1, 'week');
// → 'last week'

rtf.format(0, 'week');
// → 'this week'

rtf.format(1, 'week');
// → 'next week'
```

与其他 `Intl` 类类似，`Intl.RelativeTimeFormat` 除了 `format` 方法外，还有一个 `formatToParts` 方法。虽然 `format` 涵盖了最常见的使用场景，但如果需要访问生成输出的各个部分，`formatToParts` 会非常有用：

```js
// 创建一个用于英文语言的相对时间格式化器，
// 输出中并不总是需要使用数值。
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → '昨天'

rtf.formatToParts(-1, 'day');
// → [{ type: 'literal', value: '昨天' }]

rtf.format(3, 'week');
// → '3周后'

rtf.formatToParts(3, 'week');
// → [{ type: 'literal', value: '3周后' },
//    { type: 'integer', value: '3', unit: 'week' },
//    { type: 'literal', value: '周' }]
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
