---
title: '`Intl.PluralRules`'
author: 'Mathias Bynens（[@mathias](https://twitter.com/mathias)）'
avatars:
  - 'mathias-bynens'
date: 2017-10-04
tags:
  - Intl
description: '处理复数是一个可能看起来很简单的问题，直到你发现每种语言都有自己的复数规则。Intl.PluralRules API 可以提供帮助！'
tweet: '915542989493202944'
---
国际化是一件难事。处理复数是一个可能看起来很简单的问题，直到你发现每种语言都有自己的复数规则。

对于英语的复数化规则，只有两种可能的结果。让我们以“cat（猫）”这个词为例：

- 1 cat，即 `'one'` 形式，在英语中称为单数。
- 2 cats，但也包括 42 cats、0.5 cats 等，即 `'other'` 形式（唯一的其它形式），在英语中称为复数。

全新的 [`Intl.PluralRules` API](https://github.com/tc39/proposal-intl-plural-rules) 可以告诉你，在给定语言中哪种形式适用于特定数字。

```js
const pr = new Intl.PluralRules('en-US');
pr.select(0);   // 'other' (例如 '0 cats')
pr.select(0.5); // 'other' (例如 '0.5 cats')
pr.select(1);   // 'one'   (例如 '1 cat')
pr.select(1.5); // 'other' (例如 '1.5 cats')
pr.select(2);   // 'other' (例如 '2 cats')
```

<!--truncate-->
不同于其他国际化 API，`Intl.PluralRules` 是一个低级别 API 本身不执行任何格式化。相反，你可以在其基础上构建自己的格式化器：

```js
const suffixes = new Map([
  // 注意：在实际使用中，你不会像这样硬编码复数化形式；
  // 它们应该是你翻译文件的一部分。
  ['one',   'cat'],
  ['other', 'cats'],
]);
const pr = new Intl.PluralRules('en-US');
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // '1 cat'
formatCats(0);   // '0 cats'
formatCats(0.5); // '0.5 cats'
formatCats(1.5); // '1.5 cats'
formatCats(2);   // '2 cats'
```

对于相对简单的英语复数规则，这样做可能显得有些多余；然而，并非所有语言都遵循相同的规则。有些语言只有一种复数形式，而有些语言有多种形式。例如，[威尔士语](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules) 就有六种不同的复数形式！

```js
const suffixes = new Map([
  ['zero',  'cathod'],
  ['one',   'gath'],
  // 注意：对于这个特定的单词，`two` 形式恰好与 `'one'`
  // 形式相同，但这并不适用于威尔士语中的所有单词。
  ['two',   'gath'],
  ['few',   'cath'],
  ['many',  'chath'],
  ['other', 'cath'],
]);
const pr = new Intl.PluralRules('cy');
const formatWelshCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatWelshCats(0);   // '0 cathod'
formatWelshCats(1);   // '1 gath'
formatWelshCats(1.5); // '1.5 cath'
formatWelshCats(2);   // '2 gath'
formatWelshCats(3);   // '3 cath'
formatWelshCats(6);   // '6 chath'
formatWelshCats(42);  // '42 cath'
```

为了实现正确的复数化并支持多种语言，需有一个包含语言及其复数规则的数据库。[Unicode CLDR](http://cldr.unicode.org/) 包含了这些数据，但要在 JavaScript 中使用，必须将其嵌入并随其他 JavaScript 代码一起加载，这会增加加载时间、解析时间和内存使用量。`Intl.PluralRules` API 将这一负担转移到 JavaScript 引擎上，从而实现更高性能的国际化复数化处理。

:::note
**注意：**虽然 CLDR 数据包含每种语言的形式映射，但它并不附带每个单词的单数/复数形式列表。你仍需像以前一样自行翻译并提供这些信息。
:::

## 序数

`Intl.PluralRules` API 通过可选的 `options` 参数的 `type` 属性支持不同的选择规则。其隐式默认值（如以上示例中使用的）是 `'cardinal'`。若要针对特定数字找出序数指示符（例如 `1` → `1st`，`2` → `2nd` 等），请使用 `{ type: 'ordinal' }`：

```js
const pr = new Intl.PluralRules('en-US', {
  type: 'ordinal'
});
const suffixes = new Map([
  ['one',   'st'],
  ['two',   'nd'],
  ['few',   'rd'],
  ['other', 'th'],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // '0th'
formatOrdinals(1);   // '1st'
formatOrdinals(2);   // '2nd'
formatOrdinals(3);   // '3rd'
formatOrdinals(4);   // '4th'
formatOrdinals(11);  // '11th'
formatOrdinals(21);  // '21st'
formatOrdinals(42);  // '42nd'
formatOrdinals(103); // '103rd'
```

`Intl.PluralRules` 是一个较低级的 API，尤其是与其他国际化功能相比。因此，即使您不直接使用它，您也可能在使用依赖它的库或框架。

随着此 API 逐渐变得更广泛可用，您会发现诸如 [Globalize](https://github.com/globalizejs/globalize#plural-module) 之类的库逐步放弃对硬编码 CLDR 数据库的依赖，转而采用原生功能，从而提高加载时间性能、解析时间性能、运行时性能以及内存使用效率。

## `Intl.PluralRules` 支持

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
