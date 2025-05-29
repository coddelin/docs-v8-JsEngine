---
title: "`Object.hasOwn`"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars: 
  - "victor-gomes"
date: 2021-07-01
tags: 
  - ECMAScript
description: "'`Object.hasOwn` 使得 `Object.prototype.hasOwnProperty` 更易访问。"
tweet: "1410577516943847424"
---

今天，写如下代码很常见：

```js
const hasOwnProperty = Object.prototype.hasOwnProperty;

if (hasOwnProperty.call(object, 'foo')) {
  // `object` 拥有属性 `foo`。
}
```

或者使用库，这些库提供了简单版本的 `Object.prototype.hasOwnProperty`，比如 [has](https://www.npmjs.com/package/has) 或 [lodash.has](https://www.npmjs.com/package/lodash.has)。

通过 [`Object.hasOwn` 提案](https://github.com/tc39/proposal-accessible-object-hasownproperty)，我们可以简单地写成：

```js
if (Object.hasOwn(object, 'foo')) {
  // `object` 拥有属性 `foo`。
}
```

`Object.hasOwn` 已经在 V8 v9.3 中启用，可以通过 `--harmony-object-has-own` 标志使用，且我们即将在 Chrome 中上线。

## `Object.hasOwn` 支持

<feature-support chrome="yes https://chromium-review.googlesource.com/c/v8/v8/+/2922117"
                 firefox="yes https://hg.mozilla.org/try/rev/94515f78324e83d4fd84f4b0ab764b34aabe6d80"
                 safari="yes https://bugs.webkit.org/show_bug.cgi?id=226291"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#accessible-objectprototypehasownproperty"></feature-support>

<!--truncate-->