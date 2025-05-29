---
title: "`Object.fromEntries`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), JavaScript whisperer"
avatars:
  - "mathias-bynens"
date: 2019-06-18
tags:
  - ECMAScript
  - ES2019
  - io19
description: "Object.fromEntries 是 JavaScript 內建函式庫的一個實用新增功能，補充了 Object.entries。"
tweet: "1140993821897121796"
---
`Object.fromEntries` 是 JavaScript 內建函式庫的一個實用新增功能。在解釋它的功能之前，了解現有的 `Object.entries` API 會有所幫助。

## `Object.entries`

`Object.entries` API 已經存在一段時間了。

<feature-support chrome="54"
                 firefox="47"
                 safari="10.1"
                 nodejs="7"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>

對於物件中的每個鍵值對，`Object.entries` 會返回一個陣列，第一個元素是鍵，第二個元素是值。

`Object.entries` 尤其在與 `for`-`of` 結合使用時非常有用，因為它能讓你非常優雅地遍歷物件中的所有鍵值對：

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

for (const [key, value] of entries) {
  console.log(`The value of ${key} is ${value}.`);
}
// 日誌:
// x 的值是 42。
// y 的值是 50。
```

不幸的是，直到現在，還沒有一個簡單的方法可以將 entries 結果轉回到等效的物件。

## `Object.fromEntries`

新的 `Object.fromEntries` API 執行了 `Object.entries` 的相反操作。這使得根據其 entries 重建物件變得簡單：

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

一個常見的用例是轉換物件。現在你可以通過遍歷它的 entries，然後使用你可能已經熟悉的陣列方法來完成：

```js
const object = { x: 42, y: 50, abc: 9001 };
const result = Object.fromEntries(
  Object.entries(object)
    .filter(([ key, value ]) => key.length === 1)
    .map(([ key, value ]) => [ key, value * 2 ])
);
// → { x: 84, y: 100 }
```

在這個例子中，我們使用 `filter` 過濾物件來僅保留鍵長度為 `1` 的鍵，也就是僅保留鍵 `x` 和 `y`，不包括鍵 `abc`。接著，我們用 `map` 遍歷剩下的 entries，並為每個返回更新的鍵值對。此例中，我們通過將值乘以 `2` 來使每個值加倍。最終結果是一個新物件，僅包含屬性 `x` 和 `y` 及其新值。

<!--truncate-->
## 物件 vs. 映射

JavaScript 也支援 `Map`s，這通常比普通物件更加適合用作資料結構。因此在你能完全控制的代碼中，你可能會使用 Map 而不是物件。然而，作為開發者，你並不總是能選擇表示形式。有時你處理的資料來自外部 API 或某些庫函數，它返回的是物件而不是 Map。

`Object.entries` 使得將物件轉換成 Map 變得容易：

```js
const object = { language: 'JavaScript', coolness: 9001 };

// 將物件轉換為 Map:
const map = new Map(Object.entries(object));
```

反向操作同樣有用：即使你的代碼使用 Map，你可能仍然需要在某些情況下將資料序列化，例如果將其轉為 JSON 以發送 API 請求。或者，你可能需要將資料傳遞給另一個期望物件而不是 Map 的庫。在這些情況下，你需要基於 Map 資料創建一個物件。`Object.fromEntries` 使這一任務變得很簡單：

```js
// 將 Map 再轉成物件:
const objectCopy = Object.fromEntries(map);
// → { language: 'JavaScript', coolness: 9001 }
```

語言中同時擁有 `Object.entries` 和 `Object.fromEntries`，你現在可以輕鬆地在 Map 和物件之間進行轉換。

### 警告：注意資料遺失

當像上述例子中將 Map 轉換為普通物件時，存在一個隱含的假設：每個鍵都能唯一字串化。如果此假設不成立，就會發生資料遺失：

```js
const map = new Map([
  [{}, 'a'],
  [{}, 'b'],
]);
Object.fromEntries(map);
// → { '[object Object]': 'b' }
// 注意: 值 'a' 已經丟失，因為兩個鍵
// 都字串化為相同的值 '[object Object]'。
```

在使用 `Object.fromEntries` 或其他技巧將 Map 轉換為物件之前，請確保 Map 的鍵能生成唯一的 `toString` 結果。

## `Object.fromEntries` 的支援

<feature-support chrome="73 /blog/v8-release-73#object.fromentries"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>
