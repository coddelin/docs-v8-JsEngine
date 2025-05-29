---
title: "V8版本 v9.9发布"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), 达到99%的完成度"
avatars:
 - "ingvar-stepanyan"
date: 2022-01-31
tags:
 - 发布
description: "V8版本 v9.9带来了新的国际化API。"
tweet: "1488190967727411210"
---
每隔四周，我们会创建一个新的V8分支，作为我们[发布流程](https://v8.dev/docs/release-process)的一部分。每个版本都在Chrome Beta里程碑之前从V8的Git主分支创建分支。今天，我们很高兴宣布我们的最新分支，[V8版本9.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.9)，目前处于Beta阶段，并将在几周后与Chrome 99 Stable协调发布。V8 v9.9充满了各种面向开发者的功能。本文预览了这次发布的一些亮点。

<!--truncate-->
## JavaScript

### Intl.Locale扩展

在v7.4版本中，我们推出了[`Intl.Locale` API](https://v8.dev/blog/v8-release-74#intl.locale)。在v9.9中，我们为`Intl.Locale`对象添加了七个新属性：`calendars`、`collations`、`hourCycles`、`numberingSystems`、`timeZones`、`textInfo`和`weekInfo`。

`Intl.Locale`的`calendars`、`collations`、`hourCycles`、`numberingSystems`和`timeZones`属性返回这些属性的优先标识符数组，设计用于与其他`Intl` API搭配使用：

```js
const arabicEgyptLocale = new Intl.Locale('ar-EG')
// ar-EG
arabicEgyptLocale.calendars
// ['gregory', 'coptic', 'islamic', 'islamic-civil', 'islamic-tbla']
arabicEgyptLocale.collations
// ['compat', 'emoji', 'eor']
arabicEgyptLocale.hourCycles
// ['h12']
arabicEgyptLocale.numberingSystems
// ['arab']
arabicEgyptLocale.timeZones
// ['Africa/Cairo']
```

`Intl.Locale`的`textInfo`属性返回一个对象，指定与文本相关的信息。目前它只有一个属性`direction`，用于指示语言环境中的文本默认方向性。设计用于[HTML `dir`属性](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir)和[CSS `direction`属性](https://developer.mozilla.org/en-US/docs/Web/CSS/direction)。它表示字符的排序方式 - `ltr`（从左到右）或`rtl`（从右到左）：

```js
arabicEgyptLocale.textInfo
// { direction: 'rtl' }
japaneseLocale.textInfo
// { direction: 'ltr' }
chineseTaiwanLocale.textInfo
// { direction: 'ltr' }
```

`Intl.Locale`的`weekInfo`属性返回一个对象，用于指定与星期相关的信息。返回对象中的`firstDay`属性是一个数字，范围为1到7，用于表示定义星期开始的那个星期几：1代表星期一，2代表星期二，以此类推。`minimalDays`属性表示定义一个月或一年的第一周所需的最少天数。`weekend`属性是一个整数数组，通常包含两个元素，与`firstDay`编码一致。它表示为了日历目的，哪些日期被认为是“周末”。注意每个语言环境中的“周末”天数可能不同，并且可能不是连续的。

```js
arabicEgyptLocale.weekInfo
// {firstDay: 6, weekend: [5, 6], minimalDays: 1}
// 一星期的第一天为星期六。周末是星期五和星期六。
// 一个月或者一年的第一周至少有一天属于该月或该年。
```

### Intl枚举

在v9.9中，我们新增了一个函数[`Intl.supportedValuesOf(code)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf)，它返回一个数组，包含v8对于Intl API支持的标识符。支持的`code`值包括`calendar`、`collation`、`currency`、`numberingSystem`、`timeZone`和`unit`。此新方法中的信息旨在让Web开发人员轻松了解实现支持哪些值。

```js
Intl.supportedValuesOf('calendar')
// ['buddhist', 'chinese', 'coptic', 'dangi', ...]

Intl.supportedValuesOf('collation')
// ['big5han', 'compat', 'dict', 'emoji', ...]

Intl.supportedValuesOf('currency')
// ['ADP', 'AED', 'AFA', 'AFN', 'ALK', 'ALL', 'AMD', ...]

Intl.supportedValuesOf('numberingSystem')
// ['adlm', 'ahom', 'arab', 'arabext', 'bali', ...]

Intl.supportedValuesOf('timeZone')
// ['Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers', ...]

Intl.supportedValuesOf('unit')
// ['acre', 'bit', 'byte', 'celsius', 'centimeter', ...]
```

## V8 API

请使用`git log branch-heads/9.8..branch-heads/9.9 include/v8\*.h`获取API更改列表。
