---
title: "Nullish coalescing"
author: "Justin Ridgewell"
avatars: 
  - "justin-ridgewell"
date: 2019-09-17
tags: 
  - ECMAScript
  - ES2020
description: "JavaScript 的 Nullish 合併運算符使得默認表達式更安全。"
tweet: "1173971116865523714"
---
新的 [Nullish 合併提案](https://github.com/tc39/proposal-nullish-coalescing/) (`??`) 添加了一個短路運算符，用於處理默認值。

你可能已經熟悉其他短路運算符 `&&` 和 `||`。這兩個運算符處理“真值”和“假值”。假設代碼示例 `lhs && rhs`，如果 `lhs`（讀作 _左側_）是假值，該表達式求值為 `lhs`。否則，則求值為 `rhs`（讀作 _右側_）。而在代碼示例 `lhs || rhs` 中則相反。如果 `lhs` 是真值，該表達式求值為 `lhs`。否則，則求值為 `rhs`。

<!--truncate-->
但是“真值”和“假值”到底意味著什麼呢？在規範中，它等同於 [`ToBoolean`](https://tc39.es/ecma262/#sec-toboolean) 抽象操作。對於我們普通的 JavaScript 開發者來說，**除了** 假值 `undefined`、`null`、`false`、`0`、`NaN` 和空字符串 `''` 外，所有值都是真值。（技術上說，`document.all` 相關的值也是假值，但我們稍後會探討這一點。）

那麼 `&&` 和 `||` 有什麼問題呢？為什麼我們需要新的 Nullish 合併運算符？這是因為“真值”和“假值”的定義不適合所有場景，這會導致錯誤。想像以下示例：

```js
function Component(props) {
  const enable = props.enabled || true;
  // …
}
```

在此示例中，將 `enabled` 屬性視為一個可選的布爾屬性，用於控制元件中的某些功能是否被啟用。也就是說，我們可以顯式將 `enabled` 設置為 `true` 或 `false`。但由於它是一個 _可選_ 屬性，我們可以通過不設置它，來隱式將其設置為 `undefined`。如果它是 `undefined`，我們希望將其視為 `enabled = true`（默認值）。

到目前為止，你可能已經能夠察覺此代碼示例的錯誤。如果我們顯式設置 `enabled = true`，則 `enable` 變量為 `true`。如果我們隱式設置 `enabled = undefined`，則 `enable` 變量仍為 `true`。而如果我們顯式設置 `enabled = false`，則 `enable` 變量仍然是 `true`！我們的初衷是使值默認為 `true`，但我們實際上是強制設置了該值。此時的修復方法是非常明確地定義我們期望的值：

```js
function Component(props) {
  const enable = props.enabled !== false;
  // …
}
```

我們在任何假值場景中都會看到這類錯誤。這可能很容易是可選的字串（其中空字串 `''` 被視為有效輸入），亦或是可選的數值（其中 `0` 被視為有效輸入）。這是如此常見的一個問題，我們現在推出了 Nullish 合併運算符來處理這類默認值賦值場景：

```js
function Component(props) {
  const enable = props.enabled ?? true;
  // …
}
```

Nullish 合併運算符 (`??`) 的行為非常類似於 `||` 運算符，不過在評估運算符時不使用“真值”的定義。相反，它使用“Nullish”的定義，即“該值是否嚴格等於 `null` 或 `undefined`”。因此，設想表達式 `lhs ?? rhs`：如果 `lhs` 不是 Nullish，則求值為 `lhs`。否則，則求值為 `rhs`。

明確來說，值 `false`、`0`、`NaN` 和空字符串 `''` 都是“假值”，但它們不是 Nullish。在 `lhs ?? rhs` 中，這些假值但非 Nullish 的值作為左側時，表達式回傳該值，而不是右側。錯誤不再存在！

```js
false ?? true;   // => false
0 ?? 1;          // => 0
'' ?? 'default'; // => ''

null ?? [];      // => []
undefined ?? []; // => []
```

## 那麼物件解構時的默認賦值呢？

你可能注意到，最後的代碼示例也可以使用物件解構中的默認賦值來修復：

```js
function Component(props) {
  const {
    enabled: enable = true,
  } = props;
  // …
}
```

這雖然有點繁瑣，但仍然是完全合法的 JavaScript。它使用稍有不同的語義。物件解構中的默認賦值會檢查屬性是否嚴格等於 `undefined`，如果是，則默認賦值。

但僅檢查是否等於 `undefined` 的嚴格相等測試並不總是可取的，且並不總有物件可供解構。例如，可能你想要對函數的回傳值進行默認（無物件可解構）。或者可能該函數回傳 `null`（DOM APIs 中常見的情況）。這些時候你可能需要借助 Nullish 合併運算符：

```js
// 簡潔明了的 Nullish 合併
const link = document.querySelector('link') ?? document.createElement('link');

// 預設指派解構，搭配樣板程式碼
const {
  link = document.createElement('link'),
} = {
  link: document.querySelector('link') || undefined
};
```

此外，某些新特性如 [選擇性鏈結](/features/optional-chaining) 在與解構搭配使用時未必能完美運作。由於解構需要一個物件，因此必須在選擇性鏈結可能返回 `undefined` 而非物件時進行防護。但使用空值合併運算符，則沒有這個問題：

```js
// 選擇性鏈結與空值合併運算符合併使用
const link = obj.deep?.container.link ?? document.createElement('link');

// 預設指派解構，搭配選擇性鏈結
const {
  link = document.createElement('link'),
} = (obj.deep?.container || {});
```

## 混合與搭配運算符

語言的設計十分困難，並非每次都能在不引起開發者意圖模糊的情況下創造新運算符。若您曾混合使用 `&&` 與 `||` 運算符，可能也遇到過這種模糊情況。假設表達式 `lhs && middle || rhs`。在 JavaScript 中，這實際上被解析為 `(lhs && middle) || rhs`。再假設表達式 `lhs || middle && rhs`。這次則被解析為 `lhs || (middle && rhs)`。

您可能注意到，`&&` 運算符對左右側的優先順序高於 `||` 運算符，意味著隱含的括號包住 `&&` 而不是 `||`。在設計 `??` 運算符時，我們需要決定其優先順序。它可以選擇以下之一：

1. 優先順序低於 `&&` 和 `||`
1. 優先順序低於 `&&` 但高於 `||`
1. 優先順序高於 `&&` 和 `||`

對於每個優先順序定義，我們必須通過四個可能的測試用例進行驗證：

1. `lhs && middle ?? rhs`
1. `lhs ?? middle && rhs`
1. `lhs || middle ?? rhs`
1. `lhs ?? middle || rhs`

在每個測試表達式中，我們需要決定隱含的括號應該放在哪裡。如果括號未能完全按照開發者的意圖包裹表達式，則會導致糟糕的程式碼。不幸的是，不論選擇哪種優先順序，其中之一測試表達式可能違背開發者的意圖。

最終，我們決定在混合使用 `??` 與 (`&&` 或 `||`) 時需要顯式括號（注意我使用括號分組時非常明確！開個玩笑！）。如果混用，您必須將其中一組運算符包裹在括號中，否則會引發語法錯誤。

```js
// 混合使用時需要顯式括號分組
(lhs && middle) ?? rhs;
lhs && (middle ?? rhs);

(lhs ?? middle) && rhs;
lhs ?? (middle && rhs);

(lhs || middle) ?? rhs;
lhs || (middle ?? rhs);

(lhs ?? middle) || rhs;
lhs ?? (middle || rhs);
```

如此一來，語言解析器一定能符合開發者的意圖。任何稍後閱讀代碼的人也能立即理解。真棒！

## 關於 `document.all`

[`document.all`](https://developer.mozilla.org/en-US/docs/Web/API/Document/all) 是一種特殊的值，您絕不應該使用它。但若您確實使用了它，最好了解它如何與 “truthy”（真值）和 “nullish”（空值）互動。

`document.all` 是類陣列物件，意味着它具有類似陣列的索引屬性和長度。物件通常被視為真值（truthy）——但出乎意料地，`document.all` 假裝是個假值（falsy）！事實上，它與 `null` 和 `undefined` 都是寬鬆相等的（通常這意味著它根本無法擁有屬性）。

使用 `document.all` 與 `&&` 或 `||` 時，它會假裝為假值。但它不與 `null` 或 `undefined` 嚴格相等，因此不是空值（nullish）。故而，使用 `document.all` 與 `??` 時，它的表現和其他物件無異。

```js
document.all || true; // => true
document.all ?? true; // => HTMLAllCollection[]
```

## 空值合併運算符的支援

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9547"
                 firefox="72 https://bugzilla.mozilla.org/show_bug.cgi?id=1566141"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-nullish-coalescing-operator"></feature-support>
