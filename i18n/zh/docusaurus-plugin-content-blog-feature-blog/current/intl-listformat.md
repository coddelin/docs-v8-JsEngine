---
title: '`Intl.ListFormat`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias)) 和 Frank Yung-Fong Tang'
avatars:
  - 'mathias-bynens'
  - 'frank-tang'
date: 2018-12-18
tags:
  - Intl
  - Node.js 12
  - io19
description: 'Intl.ListFormat API 使本地化列表格式化成为可能，同时保证性能不受影响。'
tweet: '1074966915557351424'
---
现代的网页应用通常使用包含动态数据的列表。例如，一个照片查看器应用可能会显示如下内容：

> 此照片包含了 **Ada、Edith 和 Grace**。

而一个基于文本的游戏可能需要展示不同形式的列表：

> 选择你的超级能力： **隐身、心灵致动 或 共情**。

由于每种语言具有不同的列表格式化惯例和用词，实现一个本地化列表格式化工具是极其复杂的。这不仅需要列出每种语言中所有的单词（如上述例子中的 “和” 或 “或”），还需要在编码时定义这些语言的具体格式化规则。[Unicode CLDR](http://cldr.unicode.org/translation/lists) 提供了这些数据，但在 JavaScript 中使用这些数据需要事先嵌入，并与其他库代码一起发送。这不幸会增加这些库的打包体积，从而对加载时间、解析/编译成本以及内存消耗产生负面影响。

<!--truncate-->
全新的 `Intl.ListFormat` API 将这一负担转移到 JavaScript 引擎上，由引擎提供本地数据，并直接向 JavaScript 开发者提供接口。`Intl.ListFormat` 使本地化列表格式化成为可能，同时保证性能不受影响。

## 使用示例

以下示例展示了如何使用英文语言创建一个用于连接词的列表格式化器：

```js
const lf = new Intl.ListFormat('en');
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank and Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine, and Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora, and Harrison'
```

通过可选的 `options` 参数，也可以支持其他类型，比如英文中的“或”列表：

```js
const lf = new Intl.ListFormat('en', { type: 'disjunction' });
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank or Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine, or Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora, or Harrison'
```

下面是一个使用不同语言（中文，语言代码为 `zh`）的示例：

```js
const lf = new Intl.ListFormat('zh');
lf.format(['永鋒']);
// → '永鋒'
lf.format(['永鋒', '新宇']);
// → '永鋒和新宇'
lf.format(['永鋒', '新宇', '芳遠']);
// → '永鋒、新宇和芳遠'
lf.format(['永鋒', '新宇', '芳遠', '澤遠']);
// → '永鋒、新宇、芳遠和澤遠'
```

`options` 参数允许更高级的用法。以下是各种选项及其组合的概述，以及它们与 [UTS#35](https://unicode.org/reports/tr35/tr35-general.html#ListPatterns) 定义的列表模式的对应关系：


| 类型                  | 选项                                   | 描述                                                                                     | 示例                         |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| 标准（或无类型）       | `{}` (默认)                            | 一个典型的“和”列表，用于任意占位符                                                    | `'January, February, and March'` |
| 或                    | `{ type: 'disjunction' }`                 | 一个典型的“或”列表，用于任意占位符                                                    | `'January, February, or March'`  |
| 单位                  | `{ type: 'unit' }`                        | 适合宽单位的列表                                                                   | `'3 feet, 7 inches'`             |
| 单位-短               | `{ type: 'unit', style: 'short' }`        | 适合短单位的列表                                                                   | `'3 ft, 7 in'`                   |
| 单位-窄               | `{ type: 'unit', style: 'narrow' }`       | 适合窄单位的列表，用于屏幕空间非常有限的情况                                      | `'3′ 7″'`                        |


需要注意的是，在很多语言（比如英语）中，这些列表类型间可能没有差别。但在其他语言中，间距、连接词的长度或存在与否以及分隔符可能会有所变化。

## 结论

随着 `Intl.ListFormat` API 越来越广泛地被支持，您会发现库逐渐不再依赖于硬编码的 CLDR 数据库，而是转向原生列表格式化功能，从而改善加载时间性能、解析和编译时间性能、运行时性能以及内存使用。

## `Intl.ListFormat` 支持

<feature-support chrome="72 /blog/v8-release-72#intl.listformat"
                 firefox="不支持"
                 safari="不支持"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="不支持"></feature-support>
