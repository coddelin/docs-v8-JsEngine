---
title: "`Object.hasOwn`"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars: 
  - "victor-gomes"
date: 2021-07-01
tags: 
  - ECMAScript
description: "`Object.hasOwn`は`Object.prototype.hasOwnProperty`をより使いやすくします。"
tweet: "1410577516943847424"
---

今日では、次のようなコードを書くことが非常に一般的です。

```js
const hasOwnProperty = Object.prototype.hasOwnProperty;

if (hasOwnProperty.call(object, 'foo')) {
  // `object`にはプロパティ`foo`があります。
}
```

また、[has](https://www.npmjs.com/package/has)や[lodash.has](https://www.npmjs.com/package/lodash.has)のように、`Object.prototype.hasOwnProperty`の簡易版を提供するライブラリを使用することもあります。

[`Object.hasOwn`提案](https://github.com/tc39/proposal-accessible-object-hasownproperty)を使用することで、次のように簡単に記述できます。

```js
if (Object.hasOwn(object, 'foo')) {
  // `object`にはプロパティ`foo`があります。
}
```

`Object.hasOwn`は既にV8 v9.3で`--harmony-object-has-own`フラグを使用して利用可能であり、間もなくChromeでも導入される予定です。

## `Object.hasOwn`対応状況

<feature-support chrome="yes https://chromium-review.googlesource.com/c/v8/v8/+/2922117"
                 firefox="yes https://hg.mozilla.org/try/rev/94515f78324e83d4fd84f4b0ab764b34aabe6d80"
                 safari="yes https://bugs.webkit.org/show_bug.cgi?id=226291"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#accessible-objectprototypehasownproperty"></feature-support>

<!--truncate-->