---
title: "可選鏈（Optional chaining）"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski))，可選鏈的破壞者"
avatars: 
  - "maya-armyanova"
date: 2019-08-27
tags: 
  - ECMAScript
  - ES2020
description: "可選鏈使屬性訪問的表達更加可讀且簡潔，並內建了空值檢查功能。"
tweet: "1166360971914481669"
---
在 JavaScript 中，長鏈的屬性訪問可能容易出錯，因為其中任何一步都可能評估為 `null` 或 `undefined`（也稱為“空值”）。在每一步進行屬性存在檢查，很容易變成深度嵌套的 `if` 語句或一個長長的 `if` 條件，複製屬性訪問的鏈路：

<!--truncate-->
```js
// 容易出錯的版本，可能會拋出錯誤。
const nameLength = db.user.name.length;

// 不容易出錯，但可讀性較差。
let nameLength;
if (db && db.user && db.user.name)
  nameLength = db.user.name.length;
```

上述代碼也可以使用三元運算符來表示，但可讀性並不會提高：

```js
const nameLength =
  (db
    ? (db.user
      ? (db.user.name
        ? db.user.name.length
        : undefined)
      : undefined)
    : undefined);
```

## 引入可選鏈操作符

顯然你不希望寫那樣的代碼，因此需要一種可行的替代方案。其他一些語言通過使用名為“可選鏈”的功能提供了一個優雅的解決方案。根據[最近的規範提案](https://github.com/tc39/proposal-optional-chaining)，“可選鏈是一個包含一個或多個屬性訪問和函數調用的鏈路，其第一部分以 `?.` 作為標誌開始”。

使用新的可選鏈操作符，我們可以將上述示例重寫如下：

```js
// 同樣檢查錯誤且更加可讀。
const nameLength = db?.user?.name?.length;
```

當 `db`、`user` 或 `name` 為 `undefined` 或 `null` 時會發生什麼？使用可選鏈操作符，JavaScript 將初始化 `nameLength` 為 `undefined`，而不是拋出錯誤。

請注意，此行為也比我們的檢查方式 `if (db && db.user && db.user.name)` 更加健全。例如，如果 `name` 始終保證是字符串，我們可以將 `name?.length` 更改為 `name.length`。那麼，如果 `name` 是空字符串，我們仍然可以得到正確的長度 `0`。這是因為空字符串是一個假值：在 `if` 條件中其行為類似 `false`。可選鏈操作符修復了這個常見的錯誤源。

## 附加的語法形式：方法調用和動態屬性

此外，還有一種適用於調用可選方法的操作符版本：

```js
// 擴展了接口，包含一個僅針對管理員用戶存在的可選方法。
const adminOption = db?.user?.validateAdminAndGetPrefs?.().option;
```

語法可能感到意外，因為 `?.()` 是實際的操作符，應用於它之前的表達式。

操作符的第三種用法即可選的動態屬性訪問，其通過 `?.[]` 完成。它返回括號內參數引用的值，或者當沒有對象可用來獲取該值時返回 `undefined`。以下是一個可能的使用例子，與上面的示例類似：

```js
// 擴展了靜態屬性訪問的功能，並使用動態生成的屬性名稱。
const optionName = 'optional setting';
const optionLength = db?.user?.preferences?.[optionName].length;
```

這種形式也可以用於可選陣列索引，例如：

```js
// 如果 `usersArray` 為 `null` 或 `undefined`，
// 那麼 `userName` 慎重地評估為 `undefined`。
const userIndex = 42;
const userName = usersArray?.[userIndex].name;
```

可選鏈操作符可以與[空值合併 `??` 操作符](/features/nullish-coalescing)結合使用，當需要非 `undefined` 的默認值時。這允許以指定的默認值安全地訪問深層屬性，解決了一個之前需要使用像 [lodash 的 `_.get`](https://lodash.dev/docs/4.17.15#get) 這樣的第三方庫常見的用例：

```js
const object = { id: 123, names: { first: 'Alice', last: 'Smith' }};

{ // 使用 lodash:
  const firstName = _.get(object, 'names.first');
  // → 'Alice'

  const middleName = _.get(object, 'names.middle', '(no middle name)');
  // → '(no middle name)'
}

{ // 使用可選鏈和空值合併:
  const firstName = object?.names?.first ?? '(no first name)';
  // → 'Alice'

  const middleName = object?.names?.middle ?? '(no middle name)';
  // → '(no middle name)'
}
```

## 可選鏈操作符的特性

可選鏈操作符具有一些有趣的特性：_短路_、_堆疊_ 和 _可選刪除_。讓我們通過示例逐一講解。

_短路_ 意味著當可選鏈操作符早期返回時不評估表達式的其餘部分：

```js
// `age` 只有在 `db` 和 `user` 已定義時才會自增。
db?.user?.grow(++age);
```

_堆疊（Stacking）_ 意味著可以在屬性訪問序列中應用多個可選鏈操作符：

```js
// 一個可選鏈操作符可以跟隨另一個可選鏈操作符。
const firstNameLength = db.users?.[42]?.names.first.length;
```

然而，在單一鏈中使用多於一個可選鏈操作符時要謹慎。如果某個值保證不會是 null 或 undefined，那麼在它上使用 `?.` 來訪問屬性是不建議的。以上範例中，`db` 被認為是始終已定義的，但 `db.users` 和 `db.users[42]` 可能不是。如果資料庫中存在這樣的使用者，那麼 `names.first.length` 被認為總是已定義。

_可選刪除（Optional deletion）_ 指的是 `delete` 操作符可以與可選鏈結合使用：

```js
// 只有在 `db` 已定義時，`db.user` 才會被刪除。
delete db?.user;
```

更多詳情可以在 [提案的 _Semantics_ 部分](https://github.com/tc39/proposal-optional-chaining#semantics) 中找到。

## 可選鏈的支持

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9553"
                 firefox="74 https://bugzilla.mozilla.org/show_bug.cgi?id=1566143"
                 safari="13.1 https://bugs.webkit.org/show_bug.cgi?id=200199"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining"></feature-support>
