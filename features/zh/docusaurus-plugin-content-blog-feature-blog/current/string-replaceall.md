---
title: 'String.prototype.replaceAll'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-11-11
tags:
  - ECMAScript
  - ES2021
  - Node.js 16
description: 'JavaScript 现在通过新的 `String.prototype.replaceAll` API 提供了对全局子字符串替换的一流支持。'
tweet: '1193917549060280320'
---
如果你曾经处理过 JavaScript 中的字符串，很可能遇到过 `String#replace` 方法。`String.prototype.replace(searchValue, replacement)` 根据你指定的参数返回一个替换了一些匹配项的字符串：

<!--truncate-->
```js
'abc'.replace('b', '_');
// → 'a_c'

'🍏🍋🍊🍓'.replace('🍏', '🥭');
// → '🥭🍋🍊🍓'
```

一个常见的用例是替换所有给定子字符串的实例。然而，`String#replace` 并未直接处理这种用例。当 `searchValue` 是一个字符串时，只替换子字符串的第一个匹配项：

```js
'aabbcc'.replace('b', '_');
// → 'aa_bcc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replace('🍏', '🥭');
// → '🥭🍏🍋🍋🍊🍊🍓🍓'
```

为了解决这个问题，开发者通常将搜索字符串转换为带有全局(`g`)标志的正则表达式。通过这种方式，`String#replace` 能够替换所有匹配项：

```js
'aabbcc'.replace(/b/g, '_');
// → 'aa__cc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replace(/🍏/g, '🥭');
// → '🥭🥭🍋🍋🍊🍊🍓🍓'
```

作为开发者，如果你的需求只是一场全局子字符串替换，进行这样的字符串到正则表达式的转换是非常令人沮丧的。更重要的是，这种转换容易出错，是导致常见 bug 的原因！请看以下例子：

```js
const queryString = 'q=query+string+parameters';

queryString.replace('+', ' ');
// → 'q=query string+parameters' ❌
// 只有第一个匹配项被替换。

queryString.replace(/+/, ' ');
// → SyntaxError: invalid regular expression ❌
// 原来，`+` 是正则表达式模式中的特殊字符。

queryString.replace(/\+/, ' ');
// → 'q=query string+parameters' ❌
// 转义正则表达式中的特殊字符使其变为有效，
// 但这仍然只替换字符串中第一个出现的 `+`。

queryString.replace(/\+/g, ' ');
// → 'q=query string parameters' ✅
// 转义正则表达式中的特殊字符并添加 `g` 标志才会起作用。
```

将类似 `+` 的字符串文字转换为全局正则表达式不仅仅是去掉 `quotes` 引号，将其包裹在 `/` 斜杠中并添加 `g` 标志——必须转义在正则表达式中有特殊意义的字符。这很容易被遗忘，也很难正确操作，因为 JavaScript 没有内置的机制来转义正则表达式模式。

另一种方法是结合使用 `String#split` 和 `Array#join`：

```js
const queryString = 'q=query+string+parameters';
queryString.split('+').join(' ');
// → 'q=query string parameters'
```

这种方法避免了转义，但会产生将字符串拆分为部分数组并再拼接回一起的开销。

显然，这些解决方法都不理想。如果在 JavaScript 中，像全局子字符串替换这样一个基本操作能够变得直接就好了。

## `String.prototype.replaceAll`

新的 `String#replaceAll` 方法解决了这些问题，并提供了一个直接的机制来执行全局子字符串替换：

```js
'aabbcc'.replaceAll('b', '_');
// → 'aa__cc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replaceAll('🍏', '🥭');
// → '🥭🥭🍋🍋🍊🍊🍓🍓'

const queryString = 'q=query+string+parameters';
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

为了与语言中的现有 API 保持一致，`String.prototype.replaceAll(searchValue, replacement)` 的行为与 `String.prototype.replace(searchValue, replacement)` 完全相同，仅有以下两处例外：

1. 如果 `searchValue` 是字符串，`String#replace` 只替换子字符串的第一个匹配项，而 `String#replaceAll` 替换 _所有_ 匹配项。
1. 如果 `searchValue` 是非全局的正则表达式，`String#replace` 会像处理字符串一样仅替换一个匹配项。然而在这种情况下，`String#replaceAll` 会抛出异常，因为这可能是一个错误：如果你确实想“替换所有”匹配项，应使用全局正则表达式；如果只想替换一个匹配项，可以使用 `String#replace`。

新的功能重点在第一个例项里。`String.prototype.replaceAll` 为 JavaScript 提供了无需依赖正则表达式或其他解决方法的全局子字符串替换的优雅支持。

## 关于特殊替换模式的注意事项

值得注意的是：`replace` 和 `replaceAll` 都支持[特殊替换模式](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement)。虽然这些模式在结合正则表达式使用时最为有用，但其中的一些模式（`$$`, `$&`, ``$` ``, 和 `$&apos;`）在执行简单字符串替换时也会生效，这可能会令人感到意外：

```js
&apos;xyz&apos;.replaceAll(&apos;y&apos;, &apos;$$&apos;);
// → &apos;x$z&apos;（不是 &apos;x$$z&apos;）
```

如果您的替换字符串包含这些模式之一，并且您希望按原样使用它们，可以通过使用一个返回该字符串的替换函数来避免神奇的替换行为：

```js
&apos;xyz&apos;.replaceAll(&apos;y&apos;, () => &apos;$$&apos;);
// → &apos;x$$z&apos;
```

## `String.prototype.replaceAll` 支持情况

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9801"
                 firefox="77 https://bugzilla.mozilla.org/show_bug.cgi?id=1608168#c8"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
