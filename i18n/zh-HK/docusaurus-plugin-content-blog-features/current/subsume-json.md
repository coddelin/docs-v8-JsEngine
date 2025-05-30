---
title: "包括 JSON，即 JSON ⊂ ECMAScript"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-08-14
tags: 
  - ES2019
description: "JSON 現在是 ECMAScript 的語法子集。"
tweet: "1161649929904885762"
---
隨著[提案 _JSON ⊂ ECMAScript_](https://github.com/tc39/proposal-json-superset)，JSON 成為 ECMAScript 的語法子集。如果你對此感到驚訝，並非只有你一個！

## 舊的 ES2018 行為

在 ES2018 中，ECMAScript 的字串文本不能包含未轉義的 U+2028 行分隔符和 U+2029 段落分隔符字元，因為即使在該上下文中，它們仍被認為是行終結符：

```js
// 包含原始 U+2028 字元的字串。
const LS = ' ';
// → ES2018: 語法錯誤

// 一個由 `eval` 生成的，包含原始 U+2029 字元的字串：
const PS = eval('"\u2029"');
// → ES2018: 語法錯誤
```

這是有問題的，因為 JSON 字串_可以_包含這些字元。因此，開發者在嵌入有效的 JSON 到 ECMAScript 程式中時，必須實現特殊的後處理邏輯來處理這些字元。沒有這樣的邏輯，程式碼可能會有細微的錯誤，甚至導致[安全問題](#security)。

<!--truncate-->
## 新的行為

在 ES2019 中，字串文本現在可以包含原始的 U+2028 和 U+2029 字元，消除了 ECMAScript 與 JSON 之間的令人困惑的不一致。

```js
// 包含原始 U+2028 字元的字串。
const LS = ' ';
// → ES2018: 語法錯誤
// → ES2019: 不會拋出例外

// 一個由 `eval` 生成的，包含原始 U+2029 字元的字串：
const PS = eval('"\u2029"');
// → ES2018: 語法錯誤
// → ES2019: 不會拋出例外
```

這個小改進大大簡化了開發者的思維模型（少了一個邊緣案例需要記住！），並減少了在將有效的 JSON 嵌入 ECMAScript 程式時，對於特殊後處理邏輯的需求。

## 在 JavaScript 程式中嵌入 JSON

這一提案的結果是，`JSON.stringify` 現在可以用來生成有效的 ECMAScript 字串文本、物件文本和陣列文本。而且，由於單獨的[_良構的 `JSON.stringify` 提案](/features/well-formed-json-stringify)，這些文本可以安全地用 UTF-8 或其他編碼表示（如果你想將它們寫到磁碟中的檔案，這很有幫助）。這對於元編程用途非常有用，比如動態生成 JavaScript 原始碼並將其寫入磁碟。

以下是利用 JSON 語法已成為 ECMAScript 子集的情況，創建一個嵌入給定資料物件的有效 JavaScript 程式的範例：

```js
// 一個表示某些資料的 JavaScript 物件（或陣列、或字串）。
const data = {
  LineTerminators: '\n\r  ',
  // 注意：字串包含 4 個字元：'\n\r\u2028\u2029'。
};

// 將資料轉換為 JSON 字串格式。由於 JSON ⊂
// ECMAScript，`JSON.stringify` 的輸出保證為語法有效的 ECMAScript 文本：
const jsObjectLiteral = JSON.stringify(data);

// 創建一個有效的 ECMAScript 程式，將資料作為物件文本嵌入。
const program = `const data = ${ jsObjectLiteral };`;
// → 'const data = {"LineTerminators":"…"};'
// （如果目標是內嵌的 <script>，則需要額外的轉義。）

// 將包含 ECMAScript 程式的檔案寫入磁碟。
saveToDisk(filePath, program);
```

上述腳本生成以下程式碼，該程式碼求值為一個等價的物件：

```js
const data = {"LineTerminators":"\n\r  "};
```

## 使用 `JSON.parse` 在 JavaScript 程式中嵌入 JSON

如[關於 JSON 的成本](/blog/cost-of-javascript-2019#json)中所解釋，不是像這樣將資料內嵌為一個 JavaScript 物件文本：

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…資料可以以 JSON 字串格式表示，然後在運行時透過 JSON 解析，以提高處理大物件（10 kB+）時的性能：

```js
const data = JSON.parse('{"foo":42,"bar":1337}'); // 🚀
```

以下是一個實現範例：

```js
// 一個表示某些資料的 JavaScript 物件（或陣列、或字串）。
const data = {
  LineTerminators: '\n\r  ',
  // 注意：字串包含 4 個字元：'\n\r\u2028\u2029'。
};

// 將資料轉換為 JSON 字串格式。
const json = JSON.stringify(data);

// 現在，我們希望將 JSON 作為 JavaScript 字串文本插入腳本正文，
// 根據 https://v8.dev/blog/cost-of-javascript-2019#json，轉義資料中的特殊字元如 `"`。
// 由於 JSON ⊂ ECMAScript，`JSON.stringify` 的輸出保證為
// 語法有效的 ECMAScript 文本：
const jsStringLiteral = JSON.stringify(json);
// 創建一個有效的 ECMAScript 程式，將表示 JSON 資料的 JavaScript
// 字串文本嵌入到 `JSON.parse` 呼叫中。
const program = `const data = JSON.parse(${ jsStringLiteral });`;
// → 'const data = JSON.parse("…");'
// （如果目標是內聯 <script>，需要額外的轉義。）

// 將包含 ECMAScript 程式的檔案寫到磁碟。
saveToDisk(filePath, program);
```

上述腳本生成以下程式碼，並會解析為一個等效的物件：

```js
const data = JSON.parse("{\"LineTerminators\":\"\\n\\r  \"}");
```

[Google 的基準測試將 `JSON.parse` 與 JavaScript 物件字面量進行比較](https://github.com/GoogleChromeLabs/json-parse-benchmark) 在其建置步驟中利用了此技術。Chrome DevTools 的“複製成 JS”功能通過採用類似技術已經[大幅簡化](https://chromium-review.googlesource.com/c/chromium/src/+/1464719/9/third_party/blink/renderer/devtools/front_end/elements/DOMPath.js)。

## 關於安全性的一些說明

JSON ⊂ ECMAScript 專門針對字串字面量減少了 JSON 與 ECMAScript 之間的不匹配。由於字串字面量可能存在於 JSON 支援的其他資料結構（如物件和陣列）中，它也解決了這些情況，如上述程式碼範例所示。

然而，U+2028 和 U+2029 在 ECMAScript 語法的其他部分仍然被視為行終止符的字符。這意味著某些情況下將 JSON 插入到 JavaScript 程式中仍然是不安全的。請看這個例子，其中伺服器在執行 `JSON.stringify()` 後將一些用戶提供的內容插入到 HTML 響應中：

```ejs
<script>
  // 調試資訊：
  // 使用者代理：<%= JSON.stringify(ua) %>
</script>
```

請注意，`JSON.stringify` 的結果被插入到腳本的單行註解中。

在上述例子中使用時，`JSON.stringify()` 保證只返回單一行問題在於什麼被認為是“單行”[在 JSON 和 ECMAScript 之間有所不同](https://speakerdeck.com/mathiasbynens/hacking-with-unicode?slide=136)。如果 `ua` 包含未轉義的 U+2028 或 U+2029 字符，我們會跳出此單行註解，並將 `ua` 的剩餘部分作為 JavaScript 原始碼執行：

```html
<script>
  // 調試資訊：
  // 使用者代理："用戶提供的字串<U+2028>  alert('XSS');//"
</script>
<!-- …等效於： -->
<script>
  // 調試資訊：
  // 使用者代理："用戶提供的字串
  alert('XSS');//"
</script>
```

:::note
**注意：** 在上述例子中，未轉義的 U+2028 字符原樣表示為 `<U+2028>` 以便更容易理解。
:::

JSON ⊂ ECMAScript 在這種情況下無法提供幫助，因為它僅影響字串字面量——而在此例中，`JSON.stringify` 的輸出被插入到一個位置，它並未直接生成 JavaScript 字串字面量。

除非對這兩個字符進行特殊的後處理，否則上述程式碼片段可能會造成跨站腳本攻擊漏洞（XSS）！

:::note
**注意：** 根據上下文，對用戶控制的輸入進行後處理以跳脫任何特殊字符序列至關重要。在本文所述的情況中，我們正在 `<script>` 標籤中注入內容，因此我們必須（也）[跳脫 `</script`、`<script` 和 `<!-​-`](https://mathiasbynens.be/notes/etago#recommendations)。
:::

## JSON ⊂ ECMAScript 支援

<feature-support chrome="66 /blog/v8-release-66#json-ecmascript"
                 firefox="yes"
                 safari="yes"
                 nodejs="10"
                 babel="yes https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-json-strings"></feature-support>
