---
title: "正則表達式匹配索引"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski))，經常表達新功能"
avatars:
  - "maya-armyanova"
date: 2019-12-17
tags:
  - ECMAScript
  - Node.js 16
description: "正則表達式匹配索引提供每個匹配捕獲組的 `start` 和 `end` 索引。"
tweet: "1206970814400270338"
---
JavaScript 現在配備了一項新的正則表達式增強功能，稱為「匹配索引」。假設您想在 JavaScript 代碼中找到與保留字重合的無效變量名，並在變量名稱下方顯示插入符號和「下劃線」，例如：

<!--truncate-->
```js
const function = foo;
      ^------- 無效的變量名
```

在上述示例中，`function` 是保留字，不能用作變量名。為此，我們可能會編寫以下函數：

```js
function displayError(text, message) {
  const re = /\b(continue|function|break|for|if)\b/d;
  const match = text.match(re);
  // 索引 `1` 對應於第一個捕獲組。
  const [start, end] = match.indices[1];
  const error = ' '.repeat(start) + // 調整插入符號的位置。
    '^' +
    '-'.repeat(end - start - 1) +   // 添加下劃線。
    ' ' + message;                  // 添加消息。
  console.log(text);
  console.log(error);
}

const code = 'const function = foo;'; // 有缺陷的代碼
displayError(code, '無效的變量名');
```

:::note
**注意:** 為簡化起見，上述示例僅包含一些 JavaScript 的 [保留字](https://mathiasbynens.be/notes/reserved-keywords)。
:::

簡而言之，新的 `indices` 陣列存儲每個匹配捕獲組的起始和結束位置。當源正則表達式使用 `/d` 標誌時，這個新的陣列可用於所有會生成正則表達式匹配對象的內建功能，包括 `RegExp#exec`、`String#match` 和 [`String#matchAll`](https://v8.dev/features/string-matchall)。

繼續閱讀，如果您對這如何工作的細節感興趣。

## 動機

讓我們來到一個更複雜的示例，思考如何解決分析程式語言的任務（例如 [TypeScript 編譯器](https://github.com/microsoft/TypeScript/tree/master/src/compiler) 的工作）——首先將輸入源代碼分割成標記，然後為這些標記提供語法結構。如果使用者編寫了一些語法不正確的代碼，我們希望向他們提供有意義的錯誤，理想情況下，指出首先遇到問題代碼的位置。例如，給出以下代碼片段：

```js
let foo = 42;
// 一些其他代碼
let foo = 1337;
```

我們希望向程序員呈現如下的錯誤：

```js
let foo = 1337;
    ^
SyntaxError: 識別符 'foo' 已經被聲明
```

為了實現這一點，我們需要一些基本組件，其中第一個是識別 TypeScript 的識別符。然後我們將專注於確定錯誤發生的具體位置。我們來看以下示例，使用正則表達式來判斷字符串是否是有效的識別符：

```js
function isIdentifier(name) {
  const re = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
  return re.exec(name) !== null;
}
```

:::note
**注意:** 真實世界的解析器可能會利用正則表達式中新引入的 [屬性逃脫](https://github.com/tc39/proposal-regexp-unicode-property-escapes#other-examples)，並使用以下正則表達式來匹配所有有效的 ECMAScript 識別符名稱：

```js
const re = /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u;
```

為簡化起見，我們暫時使用之前的正則表達式，該正則表達式只匹配拉丁字符、數字和下劃線。
:::

如果我們遇到如上述的變量聲明錯誤，並希望向使用者打印出錯誤的精確位置，我們可能希望擴展前面的正則表達式並使用類似的函數：

```js
function getDeclarationPosition(source) {
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/;
  const match = re.exec(source);
  if (!match) return -1;
  return match.index;
}
```

可以使用 `RegExp.prototype.exec` 返回的匹配對象上的 `index` 屬性，它返回整個匹配的起始位置。不過對於上述描述的用途而言，我們通常希望使用（可能是多個）捕獲組。直到最近，JavaScript 才公開捕獲組匹配的子字符串開始和結束的索引。

## 正則表達式匹配索引解釋

理想情況下，我們希望在變量名稱的位置打印一條錯誤，而不是在 `let` / `const` 關鍵字的位置（如上述示例）。但為此，我們需要找到索引 `2` 的捕獲組的位置。（索引 `1` 指的是 `(let|const|var)` 捕獲組，索引 `0` 指的是整個匹配。）

如上所述，[新的 JavaScript 功能](https://github.com/tc39/proposal-regexp-match-indices) 在 `RegExp.prototype.exec()` 的結果（子字串的數組）中新增了一個 `indices` 屬性。讓我們改進上面的範例以使用這個新屬性：

```js
function getVariablePosition(source) {
  // 注意 `d` 標誌，啟用了 `match.indices`
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return undefined;
  return match.indices[2];
}
getVariablePosition('let foo');
// → [4, 7]
```

此範例返回數組 `[4, 7]`，這是來自索引為 `2` 的群組匹配子字串的 `[開始, 結束)` 位置。基於此信息，我們的編譯器現在可以打印所需的錯誤。

## 額外功能

`indices` 對象還包含一個 `groups` 屬性，可以通過 [命名捕獲群組](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups) 的名稱進行索引。使用該功能，上面的函數可以重寫為：

```js
function getVariablePosition(source) {
  const re = /(?<keyword>let|const|var)\s+(?<id>[a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return -1;
  return match.indices.groups.id;
}
getVariablePosition('let foo');
```

## RegExp 匹配索引的支持

<feature-support chrome="90 https://bugs.chromium.org/p/v8/issues/detail?id=9548"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519483"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=202475"
                 nodejs="16"
                 babel="no"></feature-support>
