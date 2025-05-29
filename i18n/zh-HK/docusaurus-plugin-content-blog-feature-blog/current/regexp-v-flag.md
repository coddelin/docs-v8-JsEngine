---
title: "RegExp `v` 標誌與集合符號及字符串屬性"
author: "Mark Davis ([@mark_e_davis](https://twitter.com/mark_e_davis)), Markus Scherer 和 Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mark-davis"
  - "markus-scherer"
  - "mathias-bynens"
date: 2022-06-27
tags:
  - ECMAScript
description: "新的 RegExp `v` 標誌啟用了 `unicodeSets` 模式，解鎖了擴展字符類的支持，包括字符串的 Unicode 屬性、集合符號和改進的大小寫不敏感匹配。"
tweet: "1541419838513594368"
---
JavaScript 自 ECMAScript 3（1999 年）以來便支持正則表達式。十六年後，ES2015 引入了[Unicode 模式（`u` 標誌）](https://mathiasbynens.be/notes/es6-unicode-regex)、[粘性模式（`y` 標誌）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky#description)和[ `RegExp.prototype.flags` 的取數器](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/flags)。再過三年，ES2018 引入了[`dotAll` 模式（`s` 標誌）](https://mathiasbynens.be/notes/es-regexp-proposals#dotAll)、[後行斷言](https://mathiasbynens.be/notes/es-regexp-proposals#lookbehinds)、[命名捕獲組](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups)以及[Unicode 字符屬性逃脫](https://mathiasbynens.be/notes/es-unicode-property-escapes)。而在 ES2020 中，[`String.prototype.matchAll`](https://v8.dev/features/string-matchall) 讓使用正則表達式變得更簡單。JavaScript 正則表達式已走過很長一段路，並仍在改進。

<!--truncate-->
最新的例子是[新的 `unicodeSets` 模式，通過使用 `v` 標誌啟用](https://github.com/tc39/proposal-regexp-v-flag)。這種新的模式解鎖了_擴展字符類_的支持，包括以下功能：

- [字符串的 Unicode 屬性](/features/regexp-v-flag#unicode-properties-of-strings)
- [集合符號 + 字符串字面語法](/features/regexp-v-flag#set-notation)
- [改進的大小寫不敏感匹配](/features/regexp-v-flag#ignoreCase)

本文將深入探討這些功能。但首先——以下是如何使用這個新標誌：

```js
const re = /…/v;
```

`v` 標誌可以與現有的正則表達式標誌組合，但有一個顯著的例外。`v` 標誌啟用了所有 `u` 標誌的優質部分，並添加了額外的功能和改進——其中一些與 `u` 標誌不向後兼容。最重要的是，`v` 是完全獨立於 `u` 的模式，而不是一個補充模式。由於這個原因，`v` 和 `u` 標誌不能組合——試圖在同一正則表達式上使用這兩個標誌會導致錯誤。唯一有效的選擇是：要麼使用 `u`，要麼使用 `v`，要麼既不使用 `u` 也不使用 `v`。但由於 `v` 是最完整的選擇，所以很容易作出選擇...

讓我們來探討新功能！

## 字符串的 Unicode 屬性

Unicode 標準為每個符號分配各種屬性和屬性值。例如，要獲得希臘語腳本使用的符號集，請在 Unicode 數據庫中搜索其 `Script_Extensions` 屬性值包括 `Greek` 的符號。

ES2018 Unicode 字符屬性逃脫使得在 ECMAScript 正則表達式中可以原生訪問這些 Unicode 字符屬性。例如，模式 `\p{Script_Extensions=Greek}` 匹配所有用於希臘腳本的符號：

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → true
```

根據定義，Unicode 字符屬性擴展到一組代碼點，因此可以轉換為包含其單獨匹配代碼點的字符類。例如，`\p{ASCII_Hex_Digit}` 等價於 `[0-9A-Fa-f]`：它僅通過一次匹配單個 Unicode 字符/代碼點。在某些情況下，這是不夠的：

```js
// Unicode 定義了一個名為“Emoji”的字符屬性。
const re = /^\p{Emoji}$/u;

// 匹配僅由 1 個代碼點組成的表情符號：
re.test('⚽'); // '\u26BD'
// → true ✅

// 匹配由多個代碼點組成的表情符號：
re.test('👨🏾‍⚕️'); // '\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F'
// → false ❌
```

在上述示例中，正則表達式未匹配 👨🏾‍⚕️ 表情符號，因為它恰好由多個代碼點組成，而 `Emoji` 是 Unicode 的_字符_屬性。

幸運的是，Unicode 標準也定義了一些[字串的屬性](https://www.unicode.org/reports/tr18/#domain_of_properties)。這些屬性擴展到一組字串，每個字串包含一個或多個代碼點。在正則表達式中，字串的屬性轉化為一組替代。為了說明這一點，想像一下有一個適用於字串的 Unicode 屬性，包括 `'a'`、`'b'`、`'c'`、`'W'`、`'xy'` 和 `'xyz'`。此屬性可以轉化為以下任一正則表達式模式（使用替代方式）：`xyz|xy|a|b|c|W` 或 `xyz|xy|[a-cW]`。（最長的字串優先，因此像 `'xy'` 的前綴不會隱藏更長的字串如 `'xyz'`。）不同於現有的 Unicode 屬性轉義，此模式可以匹配多字符字串。以下是使用字串屬性的示例：

```js
const re = /^\p{RGI_Emoji}$/v;

// 匹配僅由 1 個代碼點組成的 emoji:
re.test('⚽'); // '\u26BD'
// → true ✅

// 匹配由多個代碼點組成的 emoji:
re.test('👨🏾‍⚕️'); // '\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F'
// → true ✅
```

此代碼片段指的是字串屬性 `RGI_Emoji`，Unicode 定義其為“所有有效 emoji（字符和序列）中建議用於通用交換的一個子集”。有了這個，我們現在可以匹配 emoji，而不管它們在底層由多少代碼點組成！

`v` 標誌從一開始就支持以下 Unicode 字串屬性：

- `Basic_Emoji`
- `Emoji_Keycap_Sequence`
- `RGI_Emoji_Modifier_Sequence`
- `RGI_Emoji_Flag_Sequence`
- `RGI_Emoji_Tag_Sequence`
- `RGI_Emoji_ZWJ_Sequence`
- `RGI_Emoji`

此支持屬性列表可能會隨著 Unicode 標準定義更多字串屬性而擴展。儘管目前所有的字串屬性都是與 emoji 有關的，但未來的字串屬性可能會服務於完全不同的使用場景。

:::note
**注意:** 雖然字串屬性目前基於新的 `v` 標誌，[我們計劃最終也在 `u` 模式中提供它們](https://github.com/tc39/proposal-regexp-v-flag/issues/49)。
:::

## 集合表示法 + 字串字面量語法

當使用 `\p{…}` 轉義（無論是字符屬性還是新的字串屬性）時，執行差異／減法或交集可能會很有用。使用 `v` 標誌，字符類現在可以嵌套，並且可以在其中執行這些集合操作，而不是使用相鄰的前瞻或後瞻斷言或冗長的字符類來表示計算出的範圍。

### 使用 `--` 的差異／減法

語法 `A--B` 可用於匹配字串_在 `A` 但不在 `B` 中_，亦即差異／減法。

例如，如果您想匹配所有希臘符號，但不包括字母 `π`？使用集合表示法，解決這很簡單：

```js
/[\p{Script_Extensions=Greek}--π]/v.test('π'); // → false
```

通過使用 `--` 進行差異／減法，正則表達式引擎為您完成了繁重的工作，同時讓您的代碼保持可讀性和可維護性。

如果不僅僅一個字符，我們想減去字符集合 `α`、`β` 和 `γ`，怎麼辦？沒有問題——我們可以使用嵌套字符類並減去其內容：

```js
/[\p{Script_Extensions=Greek}--[αβγ]]/v.test('α'); // → false
/[\p{Script_Extensions=Greek}--[α-γ]]/v.test('β'); // → false
```

另一個示例是匹配非 ASCII 數字，例如稍後將其轉換為 ASCII 數字：

```js
/[\p{Decimal_Number}--[0-9]]/v.test('𑜹'); // → true
/[\p{Decimal_Number}--[0-9]]/v.test('4'); // → false
```

集合表示法也可與新的字串屬性一起使用：

```js
// 注意: 🏴 包括 7 個代碼點。

/^\p{RGI_Emoji_Tag_Sequence}$/v.test('🏴'); // → true
/^[\p{RGI_Emoji_Tag_Sequence}--\q{🏴}]$/v.test('🏴'); // → false
```

此示例匹配任何 RGI emoji 標籤序列_除了_蘇格蘭旗幟。注意使用 `\q{…}`，它是在字符類中用於字串字面量的另一新語法。例如，`\q{a|bc|def}` 匹配字串 `a`、`bc` 和 `def`。如果沒有 `\q{…}`，不可能減去硬編碼的多字符字串。

### 使用 `&&` 的交集

語法 `A&&B` 匹配_同時在`A`和`B`中的_字串，亦即交集。這讓您可以做一些事情，比如匹配希臘字母：

```js
const re = /[\p{Script_Extensions=Greek}&&\p{Letter}]/v;
// U+03C0 希臘小寫字母 PI
re.test('π'); // → true
// U+1018A 希臘零符號
re.test('𐆊'); // → false
```

匹配所有 ASCII 空格：

```js
const re = /[\p{White_Space}&&\p{ASCII}]/v;
re.test('\n'); // → true
re.test('\u2028'); // → false
```

或匹配所有蒙古數字：

```js
const re = /[\p{Script_Extensions=Mongolian}&&\p{Number}]/v;
// U+1817 蒙古數字七
re.test('᠗'); // → true
// U+1834 蒙古字母 CHA
re.test('ᠴ'); // → false
```

### 聯集

匹配_在 A 或在 B 中_的字串以前已經可以通過使用像 `[\p{Letter}\p{Number}]` 之類的字符類來對單字符字串實現。使用 `v` 標誌，此功能變得更加強大，因為它現在可以與字串屬性或字串字面量用法相結合：

```js
const re = /^[\p{Emoji_Keycap_Sequence}\p{ASCII}\q{🇧🇪|abc}xyz0-9]$/v;

re.test('4️⃣'); // → true
re.test('_'); // → true
re.test('🇧🇪'); // → true
re.test('abc'); // → true
re.test('x'); // → true
re.test('4'); // → true
```

此模式中的字符類結合了：

- 一個字串屬性（`\p{Emoji_Keycap_Sequence}`）
- 一個字符屬性（`\p{ASCII}`）
- 用於多代碼點字串 `🇧🇪` 和 `abc` 的字串字面量語法
- 用於單字符 `x`、`y` 和 `z` 的傳統字符類語法
- 經典字元類別語法，用於表示`0`至`9`的字元範圍

另一個例子是匹配所有常用的旗幟表情符號，無論它們是以兩個字母的ISO代碼編碼 (`RGI_Emoji_Flag_Sequence`) 還是以特殊標籤序列 (`RGI_Emoji_Tag_Sequence`) 編碼：

```js
const reFlag = /[\p{RGI_Emoji_Flag_Sequence}\p{RGI_Emoji_Tag_Sequence}]/v;
// 一個旗幟序列，由2個碼位組成（比利時的旗幟）：
reFlag.test('🇧🇪'); // → true
// 一個標籤序列，由7個碼位組成（英格蘭的旗幟）：
reFlag.test('🏴'); // → true
// 一個旗幟序列，由2個碼位組成（瑞士的旗幟）：
reFlag.test('🇨🇭'); // → true
// 一個標籤序列，由7個碼位組成（威爾士的旗幟）：
reFlag.test('🏴'); // → true
```

## 改進的大小寫不敏感匹配

ES2015 的 `u` 標誌存在[令人困惑的大小寫不敏感匹配行為](https://github.com/tc39/proposal-regexp-v-flag/issues/30)。請考慮以下兩個正則表達式：

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;
```

第一個模式匹配所有的小寫字母。第二個模式使用 `\P` 而不是 `\p` 來匹配除小寫字母以外的所有字元，但之後將其包裹在一個否定的字元類別 (`[^…]`) 中。通過設置 `i` 標誌 (`ignoreCase`)，兩個正則表達式都變為大小寫不敏感。

直觀上，您可能期望兩個正則表達式具有相同的行為。但實際上，它們的行為大不相同：

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;

const string = 'aAbBcC4#';

string.replaceAll(re1, 'X');
// → 'XXXXXX4#'

string.replaceAll(re2, 'X');
// → 'aAbBcC4#''
```

新的 `v` 標誌具有更少令人驚訝的行為。使用 `v` 標誌代替 `u` 標誌，兩個模式將表現相同：

```js
const re1 = /\p{Lowercase_Letter}/giv;
const re2 = /[^\P{Lowercase_Letter}]/giv;

const string = 'aAbBcC4#';

string.replaceAll(re1, 'X');
// → 'XXXXXX4#'

string.replaceAll(re2, 'X');
// → 'XXXXXX4#'
```

更普遍情況下，`v` 標誌使得 `[^\p{X}]` ≍ `[\P{X}]` ≍ `\P{X}` 和 `[^\P{X}]` ≍ `[\p{X}]` ≍ `\p{X}`，無論是否設置 `i` 標誌。

## 延伸閱讀

[提案倉庫](https://github.com/tc39/proposal-regexp-v-flag) 包含了有關這些功能及其設計決定的更多細節和背景信息。

作為我們對這些 JavaScript 功能的工作的一部分，我們不僅僅是對 ECMAScript 規範進行提案更改。我們還將“字串屬性”的定義上傳到 [Unicode UTS#18](https://unicode.org/reports/tr18/#Notation_for_Properties_of_Strings)，以便其他編程語言可以以統一的方式實現類似的功能。我們還在[提議對 HTML 標準進行更改](https://github.com/whatwg/html/pull/7908)，目標是在 `pattern` 屬性中啟用這些新功能。

## RegExp `v` 標誌的支持

V8 v11.0 (Chrome 110) 通過 `--harmony-regexp-unicode-sets` 標誌提供了對此新功能的實驗性支持。V8 v12.0 (Chrome 112) 默認啟用了這些新功能。Babel 也支持將 `v` 標誌進行轉譯 — [在 Babel REPL 中試用這篇文章中的示例](https://babeljs.io/repl#?code_lz=MYewdgzgLgBATgUxgXhgegNoYIYFoBmAugGTEbC4AWhhaAbgNwBQTaaMAKpQJYQy8xKAVwDmSQCgEMKHACeMIWFABbJQjBRuYEfygBCVmlCRYCJSABW3FOgA6ABwDeAJQDiASQD6AUTOWAvvTMQA&presets=stage-3)! 下面的支持表提供了連結到追蹤問題的資料，您可以訂閱以獲取更新。

<feature-support chrome="112 https://bugs.chromium.org/p/v8/issues/detail?id=11935"
                 firefox="116 https://bugzilla.mozilla.org/show_bug.cgi?id=regexp-v-flag"
                 safari="17 https://bugs.webkit.org/show_bug.cgi?id=regexp-v-flag"
                 nodejs="20"
                 babel="7.17.0 https://babeljs.io/blog/2022/02/02/7.17.0"></feature-support>
