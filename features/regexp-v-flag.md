---
title: "RegExp `v` 标记与集合符号及字符串属性"
author: "Mark Davis ([@mark_e_davis](https://twitter.com/mark_e_davis)), Markus Scherer 和 Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mark-davis"
  - "markus-scherer"
  - "mathias-bynens"
date: 2022-06-27
tags: 
  - ECMAScript
description: "新的 RegExp `v` 标记启用了 `unicodeSets` 模式，支持扩展字符类，包括 Unicode 字符串属性、集合符号以及更先进的大小写不敏感匹配功能。"
tweet: "1541419838513594368"
---
JavaScript 自 ECMAScript 3（1999）以来就支持正则表达式。十六年后，ES2015 引入了 [Unicode 模式（`u` 标记）](https://mathiasbynens.be/notes/es6-unicode-regex)、[粘滞模式（`y` 标记）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky#description) 和 [`RegExp.prototype.flags` 访问器](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/flags)。三年后，ES2018 引入了 [`dotAll` 模式（`s` 标记）](https://mathiasbynens.be/notes/es-regexp-proposals#dotAll)、[后瞻断言](https://mathiasbynens.be/notes/es-regexp-proposals#lookbehinds)、[命名捕获组](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups) 和 [Unicode 字符属性转义](https://mathiasbynens.be/notes/es-unicode-property-escapes)。而在 ES2020 中，[`String.prototype.matchAll`](https://v8.dev/features/string-matchall) 简化了使用正则表达式的过程。JavaScript 正则表达式已经取得了长足的发展，并且仍在不断完善。

<!--truncate-->
最新的例子是 [启用 `v` 标记的新 `unicodeSets` 模式](https://github.com/tc39/proposal-regexp-v-flag)。此新模式支持 _扩展字符类_，包括以下特性：

- [Unicode 字符串属性](/features/regexp-v-flag#unicode-properties-of-strings)
- [集合符号 + 字符串字面量语法](/features/regexp-v-flag#set-notation)
- [更先进的大小写不敏感匹配](/features/regexp-v-flag#ignoreCase)

本文将深入探讨这些特性。首先让我们来看如何使用这个新标记：

```js
const re = /…/v;
```

`v` 标记可以与现有的正则表达式标记结合使用，但有一个显著的例外。`v` 标记启用了 `u` 标记的所有优点，并附加了额外的特性和改进——其中一些与 `u` 标记向后兼容性存在冲突。关键在于，`v` 是完全独立于 `u` 的模式，而不是互补模式。因此，`v` 和 `u` 标记不能同时使用——尝试在同一正则表达式中使用这两个标记会导致错误。唯一的有效选项是：要么使用 `u`，要么使用 `v`，要么既不用 `u` 也不用 `v`。由于 `v` 是功能最全面的选项，这个选择很容易做出……

让我们深入了解新的功能！

## Unicode 字符串属性

Unicode 标准将各种属性和属性值分配给每个符号。例如，要获取用于希腊字母表的符号集，可以在 Unicode 数据库中搜索 `Script_Extensions` 属性值包括 `Greek` 的符号。

ES2018 Unicode 字符属性转义使得能够在 ECMAScript 正则表达式中原生访问这些 Unicode 字符属性。例如，模式 `\p{Script_Extensions=Greek}` 匹配所有用于希腊字母表的符号：

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → true
```

根据定义，Unicode 字符属性扩展为一组码位，因此可以被转换为包含其单独匹配码点的字符类。例如，`\p{ASCII_Hex_Digit}` 相当于 `[0-9A-Fa-f]`：它只匹配单个 Unicode 字符或码点。有些情况下，这可能不足以满足需求：

```js
// Unicode 定义了一个名为“Emoji”的字符属性。
const re = /^\p{Emoji}$/u;

// 匹配只由 1 个码点组成的 emoji：
re.test('⚽'); // '\u26BD'
// → true ✅

// 匹配由多个码点组成的 emoji：
re.test('👨🏾‍⚕️'); // '\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F'
// → false ❌
```

在上述示例中，正则表达式不匹配 👨🏾‍⚕️ emoji，因为它由多个码点组成，而 `Emoji` 是 Unicode _字符_ 属性。

幸运的是，Unicode 标准还定义了几个字符串的属性。这些属性扩展为包含一个或多个代码点的一组字符串。在正则表达式中，字符串的属性翻译为一组替代选项。为了说明这一点，假设有一个适用于 `‘a’`，`‘b’`，`‘c’`，`‘W’`，`‘xy’` 和 `‘xyz’` 字符串的 Unicode 属性。这种属性可以转换为以下任意一种正则表达式模式（使用替换）：`xyz|xy|a|b|c|W` 或 `xyz|xy|[a-cW]`。（最长的字符串优先，以便像 `‘xy’` 这样的前缀不会隐藏一个更长的字符串如 `‘xyz’`。）与现有的 Unicode 属性转义不同，这种模式可以匹配多字符字符串。以下是使用字符串属性的一个例子：

```js
const re = /^\p{RGI_Emoji}$/v;

// 匹配只包含一个代码点的 emoji：
re.test('⚽'); // '\u26BD'
// → true ✅

// 匹配包含多个代码点的 emoji：
re.test('👨🏾‍⚕️'); // '\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F'
// → true ✅
```

这个代码片段引用了字符串属性 `RGI_Emoji`，Unicode 定义为“推荐用于一般交换的所有有效 emoji（字符和序列）的子集”。通过这个，我们现在可以匹配 emoji，而不论它们包含多少代码点！

`v` 标志从一开始就支持以下 Unicode 字符串属性：

- `Basic_Emoji`
- `Emoji_Keycap_Sequence`
- `RGI_Emoji_Modifier_Sequence`
- `RGI_Emoji_Flag_Sequence`
- `RGI_Emoji_Tag_Sequence`
- `RGI_Emoji_ZWJ_Sequence`
- `RGI_Emoji`

随着 Unicode 标准定义额外的字符串属性，这个支持的属性列表可能会在将来增长。虽然当前的所有字符串属性都与 emoji 有关，但未来的字符串属性可能会服务于完全不同的用例。

:::注意
**注意：** 虽然字符串属性目前仅在新的 `v` 标志中可用，但我们计划最终也在 `u` 模式中提供它们。
:::

## 集合表示法 + 字符串字面量语法

当使用 `\p{…}` 转义（无论是字符属性还是新的字符串属性）时，进行差异/减法或交集操作可能会很有用。在 `v` 标志的支持下，现在可以在字符类中嵌套，从而直接在其中执行这些集合操作，而无需使用相邻的前瞻或后瞻断言或冗长的字符类来表达计算出的范围。

### 使用 `--` 进行差异/减法

`A--B` 的语法可用于匹配在 `A` 中但不在 `B` 中的字符串，又称差异/减法。

例如，如果您想匹配所有希腊符号但排除字母 `π`，使用集合表示法解决这个问题非常简单：

```js
/[\p{Script_Extensions=Greek}--π]/v.test('π'); // → false
```

通过使用 `--` 进行差异/减法，正则表达式引擎为您处理了复杂的工作，同时保持代码的可读性和可维护性。

如果不是单个字符，而是想减去字符集合 `α`，`β` 和 `γ` 怎么办？没问题 —— 我们可以使用嵌套字符类并减去其内容：

```js
/[\p{Script_Extensions=Greek}--[αβγ]]/v.test('α'); // → false
/[\p{Script_Extensions=Greek}--[α-γ]]/v.test('β'); // → false
```

另一个例子是匹配非 ASCII 数字，例如稍后将其转换为 ASCII 数字：

```js
/[\p{Decimal_Number}--[0-9]]/v.test('𑜹'); // → true
/[\p{Decimal_Number}--[0-9]]/v.test('4'); // → false
```

集合表示法也可以用于新的字符串属性：

```js
// 注意：🏴 包含 7 个代码点。

/^\p{RGI_Emoji_Tag_Sequence}$/v.test('🏴'); // → true
/^[\p{RGI_Emoji_Tag_Sequence}--\q{🏴}]$/v.test('🏴'); // → false
```

此示例匹配所有 RGI emoji 标签序列，但排除苏格兰的旗帜。注意使用 `\q{…}`，这是字符类中的字符串字面量的新语法片段。例如，`\q{a|bc|def}` 匹配字符串 `a`，`bc` 和 `def`。如果没有 `\q{…}`，就无法减去硬编码的多字符字符串。

### 使用 `&&` 进行交集

`A&&B` 语法匹配同时在 `A` 和 `B` 中的字符串，又称交集。这可以让您做诸如匹配希腊字母的事情：

```js
const re = /[\p{Script_Extensions=Greek}&&\p{Letter}]/v;
// U+03C0 希腊小写字母 PI
re.test('π'); // → true
// U+1018A 希腊零符号
re.test('𐆊'); // → false
```

匹配所有 ASCII 空白字符：

```js
const re = /[\p{White_Space}&&\p{ASCII}]/v;
re.test('\n'); // → true
re.test('\u2028'); // → false
```

或者匹配所有蒙古数字：

```js
const re = /[\p{Script_Extensions=Mongolian}&&\p{Number}]/v;
// U+1817 蒙古数字七
re.test('᠗'); // → true
// U+1834 蒙古字母 CHA
re.test('ᠴ'); // → false
```

### 并集

匹配同时在 A 或 B 中的字符串，之前已经可以通过使用描述单字符字符串的字符类解决，比如 `[\p{Letter}\p{Number}]`。有了 `v` 标志，这种功能变得更强大，因为它现在还能与字符串属性或字符串字面量结合使用：

```js
const re = /^[\p{Emoji_Keycap_Sequence}\p{ASCII}\q{🇧🇪|abc}xyz0-9]$/v;

re.test('4️⃣'); // → true
re.test('_'); // → true
re.test('🇧🇪'); // → true
re.test('abc'); // → true
re.test('x'); // → true
re.test('4'); // → true
```

此模式中的字符类组合了：

- 一个字符串属性 (`\p{Emoji_Keycap_Sequence}`)
- 一个字符属性 (`\p{ASCII}`)
- 多代码点字符串 `🇧🇪` 和 `abc` 的字符串字面量语法
- 描述单字符 `x`，`y` 和 `z` 的经典字符类语法
- 经典字符类语法表示字符范围从 `0` 到 `9`

另一个例子是匹配所有常用的旗帜表情符号，无论它们是以双字母 ISO 代码编码（`RGI_Emoji_Flag_Sequence`）还是作为特殊标记序列（`RGI_Emoji_Tag_Sequence`）：

```js
const reFlag = /[\p{RGI_Emoji_Flag_Sequence}\p{RGI_Emoji_Tag_Sequence}]/v;
// 一个旗帜序列，由 2 个代码点组成（比利时的国旗）：
reFlag.test('🇧🇪'); // → true
// 一个标记序列，由 7 个代码点组成（英格兰的国旗）：
reFlag.test('🏴'); // → true
// 一个旗帜序列，由 2 个代码点组成（瑞士的国旗）：
reFlag.test('🇨🇭'); // → true
// 一个标记序列，由 7 个代码点组成（威尔士的国旗）：
reFlag.test('🏴'); // → true
```

## 改进的大小写不敏感匹配

ES2015 `u` 标志存在[令人困惑的大小写不敏感匹配行为](https://github.com/tc39/proposal-regexp-v-flag/issues/30)。请看以下两个正则表达式：

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;
```

第一个模式匹配所有的小写字母。第二个模式使用 `\P` 代替 `\p` 来匹配除小写字母之外的所有字符，但随后被包裹在一个取反字符类中（`[^…]`）。通过设置 `i` 标志（`ignoreCase`）使两个正则表达式均对大小写不敏感。

直观上，你可能期望两个正则表达式表现一致。但在实践中，它们的行为非常不同：

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;

const string = 'aAbBcC4#';

string.replaceAll(re1, 'X');
// → 'XXXXXX4#'

string.replaceAll(re2, 'X');
// → 'aAbBcC4#''
```

新的 `v` 标志有更少令人意外的行为。用 `v` 标志替代 `u` 标志时，两个模式的行为相同：

```js
const re1 = /\p{Lowercase_Letter}/giv;
const re2 = /[^\P{Lowercase_Letter}]/giv;

const string = 'aAbBcC4#';

string.replaceAll(re1, 'X');
// → 'XXXXXX4#'

string.replaceAll(re2, 'X');
// → 'XXXXXX4#'
```

更普遍地说，`v` 标志使得 `[^\p{X}]` ≍ `[\P{X}]` ≍ `\P{X}` 和 `[^\P{X}]` ≍ `[\p{X}]` ≍ `\p{X}`，无论是否设置了 `i` 标志。

## 延伸阅读

[提案仓库](https://github.com/tc39/proposal-regexp-v-flag) 包含了关于这些功能及其设计决策的更多详情和背景信息。

作为我们在这些 JavaScript 功能上的工作的一部分，我们不仅仅提议对 ECMAScript 规范进行更改。我们将“字符串属性”的定义上游提到了 [Unicode UTS#18](https://unicode.org/reports/tr18/#Notation_for_Properties_of_Strings)，以便其他编程语言可以统一实现类似的功能。我们还[提议更改 HTML 标准](https://github.com/whatwg/html/pull/7908)，目标是在 `pattern` 属性中启用这些新功能。

## 正则表达式 `v` 标志支持

V8 v11.0（Chrome 110）通过 `--harmony-regexp-unicode-sets` 标志提供对该新功能的实验性支持。V8 v12.0（Chrome 112）默认启用了该新功能。Babel 也支持将 `v` 标志编译为其他版本——[在 Babel REPL 中试试本文的示例](https://babeljs.io/repl#?code_lz=MYewdgzgLgBATgUxgXhgegNoYIYFoBmAugGTEbC4AWhhaAbgNwBQTaaMAKpQJYQy8xKAVwDmSQCgEMKHACeMIWFABbJQjBRuYEfygBCVmlCRYCJSABW3FOgA6ABwDeAJQDiASQD6AUTOWAvvTMQA&presets=stage-3)！支持表格如下，链接到可以订阅的跟进问题以获取更新信息。

<feature-support chrome="112 https://bugs.chromium.org/p/v8/issues/detail?id=11935"
                 firefox="116 https://bugzilla.mozilla.org/show_bug.cgi?id=regexp-v-flag"
                 safari="17 https://bugs.webkit.org/show_bug.cgi?id=regexp-v-flag"
                 nodejs="20"
                 babel="7.17.0 https://babeljs.io/blog/2022/02/02/7.17.0"></feature-support>
