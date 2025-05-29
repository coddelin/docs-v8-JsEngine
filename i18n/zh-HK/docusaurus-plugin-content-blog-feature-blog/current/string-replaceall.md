---
title: &apos;`String.prototype.replaceAll`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-11-11
tags:
  - ECMAScript
  - ES2021
  - Node.js 16
description: &apos;JavaScript 現在透過新的 `String.prototype.replaceAll` API，正式支援全局子字串替換。&apos;
tweet: &apos;1193917549060280320&apos;
---
如果你曾經在 JavaScript 中處理過字串，很可能遇到過 `String#replace` 方法。`String.prototype.replace(searchValue, replacement)` 根據你指定的參數返回一個進行部分匹配替換後的字串：

<!--truncate-->
```js
&apos;abc&apos;.replace(&apos;b&apos;, &apos;_&apos;);
// → &apos;a_c&apos;

&apos;🍏🍋🍊🍓&apos;.replace(&apos;🍏&apos;, &apos;🥭&apos;);
// → &apos;🥭🍋🍊🍓&apos;
```

一個常見的使用情境是替換 _所有_ 的指定子字串。然而，`String#replace` 並沒有直接處理這種需求。當 `searchValue` 是一個字串時，只有第一個匹配到的子字串會被替換：

```js
&apos;aabbcc&apos;.replace(&apos;b&apos;, &apos;_&apos;);
// → &apos;aa_bcc&apos;

&apos;🍏🍏🍋🍋🍊🍊🍓🍓&apos;.replace(&apos;🍏&apos;, &apos;🥭&apos;);
// → &apos;🥭🍏🍋🍋🍊🍊🍓🍓&apos;
```

為了解決這個問題，開發者們通常會將搜尋字串轉換為帶有全局標誌（`g`）的正規表達式。這樣一來，`String#replace` 可以對 _所有_ 匹配項進行替換：

```js
&apos;aabbcc&apos;.replace(/b/g, &apos;_&apos;);
// → &apos;aa__cc&apos;

&apos;🍏🍏🍋🍋🍊🍊🍓🍓&apos;.replace(/🍏/g, &apos;🥭&apos;);
// → &apos;🥭🥭🍋🍋🍊🍊🍓🍓&apos;
```

對於開發者來說，如果你只是想要執行全局子字串替換，卻必須進行字串到正規表達式的轉換操作，這真的很麻煩。更重要的是，這種轉換很容易出錯，並且成為常見的 bug 來源！請看以下例子：

```js
const queryString = &apos;q=query+string+parameters&apos;;

queryString.replace(&apos;+&apos;, &apos; &apos;);
// → &apos;q=query string+parameters&apos; ❌
// 僅替換了第一個出現的匹配項。

queryString.replace(/+/, &apos; &apos;);
// → SyntaxError: invalid regular expression ❌
// 原來 `+` 是正規表達式模式中的特殊字符。

queryString.replace(/\+/, &apos; &apos;);
// → &apos;q=query string+parameters&apos; ❌
// 雖然逃逸了正規表達式的特殊字符使正規表達式有效，
// 但這仍然只是替換了字串中第一個出現的 `+`。

queryString.replace(/\+/g, &apos; &apos;);
// → &apos;q=query string parameters&apos; ✅
// 既逃逸了正規表達式特殊字符，又使用了 `g` 標誌，這才奏效。
```

將類似 `&apos;+&apos;` 這樣的字串文字轉換成一個全局正規表達式，並不是簡單地把 `&apos;` 替換成 `/` 符號，然後加上一個 `g` 標誌——我們還必須逃逸所有在正規表達式中具有特殊意義的字符。這很容易被忘記，也難以正確地實現，因為 JavaScript 並沒有提供內建的正規表達式模式逃逸機制。

另一種替代解決方法是結合 `String#split` 和 `Array#join`：

```js
const queryString = &apos;q=query+string+parameters&apos;;
queryString.split(&apos;+&apos;).join(&apos; &apos;);
// → &apos;q=query string parameters&apos;
```

這種方法避免了任何逃逸問題，但帶來了將字串分割成多部分陣列並再拼接回一起的額外開銷。

顯然，這些解決方法都不是理想的。如果 JavaScript 對於像全局子字串替換這樣的基本操作能夠更加直截了當，該有多好？

## `String.prototype.replaceAll`

新的 `String#replaceAll` 方法解決了這些問題，並提供了一種簡便的機制來執行全局子字串替換：

```js
&apos;aabbcc&apos;.replaceAll(&apos;b&apos;, &apos;_&apos;);
// → &apos;aa__cc&apos;

&apos;🍏🍏🍋🍋🍊🍊🍓🍓&apos;.replaceAll(&apos;🍏&apos;, &apos;🥭&apos;);
// → &apos;🥭🥭🍋🍋🍊🍊🍓🍓&apos;

const queryString = &apos;q=query+string+parameters&apos;;
queryString.replaceAll(&apos;+&apos;, &apos; &apos;);
// → &apos;q=query string parameters&apos;
```

為了與語言中現有的 API 保持一致，`String.prototype.replaceAll(searchValue, replacement)` 的行為與 `String.prototype.replace(searchValue, replacement)` 完全相同，除了以下兩個例外：

1. 如果 `searchValue` 是一個字串，那麼 `String#replace` 僅替換第一個匹配到的子字串，而 `String#replaceAll` 則替換 _所有_ 匹配項。
1. 如果 `searchValue` 是一個非全局的正規表達式，那麼 `String#replace` 僅替換一次匹配，類似於它處理字串的方式。而在這種情況下，`String#replaceAll` 則會拋出異常，因為這可能是個錯誤：如果你真的想要“替換所有”匹配項，你應該使用一個全局正規表達式；如果你只想替換一次匹配項，你可以使用 `String#replace`。

第一條中新功能是關鍵所在。`String.prototype.replaceAll` 豐富了 JavaScript，為全局子字串替換提供了第一級支援，無需依賴正規表達式或其他解決方法。

## 關於特殊替換模式的說明

值得指出的是：`replace` 和 `replaceAll` 都支持[特殊替換模式](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement)。儘管這些模式在搭配正規表達式時最有用，其中一些（`$$`、`$&`、``$` `` 和 `$&apos;`）在進行簡單字符串替換時也會生效，這可能會讓人感到意外：

```js
&apos;xyz&apos;.replaceAll(&apos;y&apos;, &apos;$$&apos;);
// → &apos;x$z&apos;（不是 &apos;x$$z&apos;）
```

假如您的替換字符串中包含其中一種模式，且您希望照原樣使用這些模式，則可以通過使用返回該字符串的替換函數來取消魔法替換行為：

```js
&apos;xyz&apos;.replaceAll(&apos;y&apos;, () => &apos;$$&apos;);
// → &apos;x$$z&apos;
```

## `String.prototype.replaceAll` 支持

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9801"
                 firefox="77 https://bugzilla.mozilla.org/show_bug.cgi?id=1608168#c8"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
