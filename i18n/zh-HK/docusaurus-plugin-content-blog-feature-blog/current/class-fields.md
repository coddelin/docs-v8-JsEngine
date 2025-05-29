---
title: '公開與私有類別字段'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-12-13
tags:
  - ECMAScript
  - ES2022
  - io19
  - Node.js 14
description: '多個提案擴展了現有的 JavaScript 類別語法，提供了新功能。本文章解釋了 V8 v7.2 和 Chrome 72 中新增的公開類別字段語法，以及即將推出的私有類別字段語法。'
tweet: '1121395767170740225'
---
多個提案擴展了現有的 JavaScript 類別語法，提供了新功能。本文章解釋了 V8 v7.2 和 Chrome 72 中新增的公開類別字段語法，以及即將推出的私有類別字段語法。

以下是一個創建名為 `IncreasingCounter` 的類別實例的程式碼範例：

```js
const counter = new IncreasingCounter();
counter.value;
// 記錄 '獲取目前的值！'
// → 0
counter.increment();
counter.value;
// 記錄 '獲取目前的值！'
// → 1
```

請注意，存取 `value` 會先執行某些程式碼（例如，記錄訊息）然後才返回結果。現在問問自己，您會如何在 JavaScript 中實作這個類別？🤔

## ES2015 類別語法

以下是使用 ES2015 類別語法實作 `IncreasingCounter` 的方式：

```js
class IncreasingCounter {
  constructor() {
    this._count = 0;
  }
  get value() {
    console.log('獲取目前的值！');
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

此類別在原型上安裝了 `value` 取得器和 `increment` 方法。更有趣的是，這個類別有一個建構子會創建 `_count` 實例屬性並將其預設值設定為 `0`。我們目前傾向使用底線前綴來表示 `_count` 不應直接被類別的用戶使用，但這只是一種慣例；它並不是語言強制的 _真正_ “私有”屬性。

<!--truncate-->
```js
const counter = new IncreasingCounter();
counter.value;
// 記錄 '獲取目前的值！'
// → 0

// 沒有什麼能阻止人們閱讀或修改
// `_count` 的實例屬性。😢
counter._count;
// → 0
counter._count = 42;
counter.value;
// 記錄 '獲取目前的值！'
// → 42
```

## 公開類別字段

新的公開類別字段語法允許我們簡化類別的定義：

```js
class IncreasingCounter {
  _count = 0;
  get value() {
    console.log('獲取目前的值！');
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

`_count` 屬性現在可以很好地宣佈在類別的頂部。我們不再需要僅僅為了定義某些字段而使用建構子。真方便！

然而，`_count` 字段仍然是一個公開屬性。在這個特殊範例中，我們想要防止人們直接訪問這個屬性。

## 私有類別字段

這正是私有類別字段的用途。新的私有字段語法類似於公開字段，只是[用 `#` 標記字段表示私有](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md)。您可以將 `#` 視為名稱的一部分：

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log('獲取目前的值！');
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

私有字段無法在類別之外存取：

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

## 公開與私有靜態屬性

類別字段語法也可用於創建公開與私有靜態屬性和方法：

```js
class FakeMath {
  // `PI` 是公開的靜態屬性。
  static PI = 22 / 7; // 足夠接近。

  // `#totallyRandomNumber` 是私有的靜態屬性。
  static #totallyRandomNumber = 4;

  // `#computeRandomNumber` 是私有的靜態方法。
  static #computeRandomNumber() {
    return FakeMath.#totallyRandomNumber;
  }

  // `random` 是公開的靜態方法 (ES2015 語法)
  // 使用了 `#computeRandomNumber`。
  static random() {
    console.log('我聽說你喜歡隨機數...');
    return FakeMath.#computeRandomNumber();
  }
}

FakeMath.PI;
// → 3.142857142857143
FakeMath.random();
// 記錄 '我聽說你喜歡隨機數...'
// → 4
FakeMath.#totallyRandomNumber;
// → SyntaxError
FakeMath.#computeRandomNumber();
// → SyntaxError
```

## 更簡單的子類化

當處理引入額外字段的子類時，類別字段語法的優點變得更加明顯。假設以下的基礎類別 `Animal`：

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}
```

要創建一個引入額外實例屬性的子類 `Cat`，以前您必須先呼叫 `super()` 執行 `Animal` 基礎類別的建構子，再創建該屬性：

```js
class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log('喵！');
  }
}
```

這需要大量樣板代碼，只是為了表明貓不喜歡洗澡。幸運的是，類別字段語法消除了整個構造函數的需要，包括不自然的 `super()` 調用：

```js
class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log('喵！');
  }
}
```

## 功能支援

### 公共類別字段的支援

<feature-support chrome="72 /blog/v8-release-72#public-class-fields"
                 firefox="yes https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/69#JavaScript"
                 safari="yes https://bugs.webkit.org/show_bug.cgi?id=174212"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### 私有類別字段的支援

<feature-support chrome="74 /blog/v8-release-74#private-class-fields"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### 私有方法及存取器的支援

<feature-support chrome="84 /blog/v8-release-84#private-methods-and-accessors"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="yes https://webkit.org/blog/11989/new-webkit-features-in-safari-15/"
                 nodejs="14.6.0"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-private-methods"></feature-support>
