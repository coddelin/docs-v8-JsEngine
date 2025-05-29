---
title: '邏輯賦值'
author: 'Shu-yu Guo ([@_shu](https://twitter.com/_shu))'
avatars:
  - 'shu-yu-guo'
date: 2020-05-07
tags:
  - ECMAScript
  - ES2021
  - Node.js 16
description: 'JavaScript 現在支持邏輯運算的複合賦值。'
tweet: '1258387483823345665'
---
JavaScript 支持一系列[複合賦值運算符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Assignment_Operators)，允許程式員簡潔地表達二元運算與賦值操作。目前僅支持數學運算或位元運算。

<!--truncate-->
目前缺少的是能夠結合邏輯運算與賦值的能力。現在可以了！JavaScript 現在支持新的運算符 `&&=`、`||=` 和 `??=` 的邏輯賦值。

## 邏輯賦值運算符

在深入探討新運算符之前，讓我們回顧一下現有的複合賦值運算符。例如，`lhs += rhs` 的含義大致等同於 `lhs = lhs + rhs`。這種粗略等價性適用於所有現有的運算符 `@=`，其中 `@` 代表像 `+` 或 `|` 的二元運算符。值得注意的是，嚴格來講只有當 `lhs` 是一個變量時這是正確的。對於像 `obj[computedPropertyName()] += rhs` 這樣的表達式中的更複雜的左側，左側只被評估一次。

現在我們來看看新的運算符。與現有的運算符不同，當 `@` 是邏輯運算時：`&&`、`||` 或 `??`，`lhs @= rhs` 並不大致意味著 `lhs = lhs @ rhs`。

```js
// 作為額外的回顧，這裡是邏輯與的語義：
x && y
// → y 當 x 是真值
// → x 當 x 不是真值

// 首先，邏輯與賦值。以下兩行代碼等效。
// 注意，像現有的複合賦值運算符，更複雜的
// 左側只被評估一次。
x &&= y;
x && (x = y);

// 邏輯或的語義：
x || y
// → x 當 x 是真值
// → y 當 x 不是真值

// 同樣地，邏輯或賦值：
x ||= y;
x || (x = y);

// 空值合併運算符的語義：
x ?? y
// → y 當 x 是空值（null 或 undefined）
// → x 當 x 不是空值

// 最後，空值合併賦值：
x ??= y;
x ?? (x = y);
```

## 短路語義

與數學和位元運算符不同，邏輯賦值遵循其相關邏輯運算的短路行為。只有當邏輯運算需要評估右側時，它們才進行賦值。

一開始這可能看起來令人困惑。為什麼不像其他複合賦值那樣無條件地賦值給左側？

這種差異有一個很好的實際理由。當將邏輯運算與賦值結合時，賦值可能會導致基於邏輯運算結果的條件性副作用。無條件地導致副作用可能會對程式的效能甚至正確性產生負面影響。

讓我們通過一個例子來具體化該問題：兩個版本的函數用於在元素中設定默認消息。

```js
// 如果不覆蓋任何內容，顯示默認消息。
// 只有當 innerHTML 是空的時候才賦值。不會
// 引起 msgElement 的內部元素失去焦點。
function setDefaultMessage() {
  msgElement.innerHTML ||= '<p>沒有消息<p>';
}

// 如果不覆蓋任何內容，顯示默認消息。
// 有問題！可能每次調用時導致 msgElement 的
// 內部元素失去焦點。
function setDefaultMessageBuggy() {
  msgElement.innerHTML = msgElement.innerHTML || '<p>沒有消息<p>';
}
```

:::note
**注意：** 因為 `innerHTML` 屬性[規範](https://w3c.github.io/DOM-Parsing/#dom-innerhtml-innerhtml)返回空字符串而不是 `null` 或 `undefined`，必須使用 `||=` 而不是 `??=`。寫代碼時，請記住許多網頁 API 不會使用 `null` 或 `undefined` 表示空或不存在。
:::

在 HTML 中，賦值給元素的 `.innerHTML` 屬性是破壞性的。內部子元素被刪除，並從新分配的字符串解析出的新子元素被插入。即便新字符串與舊字符串相同，它也會導致額外的工作且內部元素失去焦點。正因為不想導致不必要的副作用，邏輯賦值運算符的語義會短路賦值。

以下方式可能有助於思考與其他複合賦值運算符的對稱性。數學和位元運算符是無條件的，因此賦值也是無條件的。邏輯運算符是有條件的，因此賦值也是有條件的。

## 邏輯賦值支持

<feature-support chrome="85"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1629106"
                 safari="14 https://developer.apple.com/documentation/safari-release-notes/safari-14-beta-release-notes#New-Features:~:text=新增%20邏輯賦值運算符%20支援。"
                 nodejs="16"
                 babel="是 https://babeljs.io/docs/en/babel-plugin-proposal-logical-assignment-operators"></feature-support>
