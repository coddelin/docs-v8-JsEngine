---
title: "`Object.hasOwn`"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars:
  - "victor-gomes"
date: 2021-07-01
tags:
  - ECMAScript
description: "`Object.hasOwn` 讓 `Object.prototype.hasOwnProperty` 更加易用。"
tweet: "1410577516943847424"
---

今天，編寫像這樣的代碼很常見：

```js
const hasOwnProperty = Object.prototype.hasOwnProperty;

if (hasOwnProperty.call(object, 'foo')) {
  // `object` 擁有屬性 `foo`。
}
```

或者使用一些庫來提供簡化版的 `Object.prototype.hasOwnProperty`，例如 [has](https://www.npmjs.com/package/has) 或 [lodash.has](https://www.npmjs.com/package/lodash.has)。

通過 [`Object.hasOwn` 提案](https://github.com/tc39/proposal-accessible-object-hasownproperty)，我們可以簡單地編寫：

```js
if (Object.hasOwn(object, 'foo')) {
  // `object` 擁有屬性 `foo`。
}
```

`Object.hasOwn` 已經可以在 V8 v9.3 中使用，只需啟用 `--harmony-object-has-own` 標誌，並且我們很快會在 Chrome 中推出。

## `Object.hasOwn` 支援情況

<feature-support chrome="yes https://chromium-review.googlesource.com/c/v8/v8/+/2922117"
                 firefox="yes https://hg.mozilla.org/try/rev/94515f78324e83d4fd84f4b0ab764b34aabe6d80"
                 safari="yes https://bugs.webkit.org/show_bug.cgi?id=226291"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#accessible-objectprototypehasownproperty"></feature-support>

<!--truncate-->