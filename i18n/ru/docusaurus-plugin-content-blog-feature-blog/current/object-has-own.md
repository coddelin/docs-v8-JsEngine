---
title: '`Object.hasOwn`'
author: 'Виктор Гомес ([@VictorBFG](https://twitter.com/VictorBFG))'
avatars:
  - 'victor-gomes'
date: 2021-07-01
tags:
  - ECMAScript
description: '`Object.hasOwn` делает `Object.prototype.hasOwnProperty` более доступным.'
tweet: '1410577516943847424'
---

Сегодня очень часто пишут код примерно так:

```js
const hasOwnProperty = Object.prototype.hasOwnProperty;

if (hasOwnProperty.call(object, 'foo')) {
  // У `object` есть свойство `foo`.
}
```

Или используют библиотеки, которые предоставляют простую версию `Object.prototype.hasOwnProperty`, такие как [has](https://www.npmjs.com/package/has) или [lodash.has](https://www.npmjs.com/package/lodash.has).

С предложением [`Object.hasOwn`](https://github.com/tc39/proposal-accessible-object-hasownproperty) можно просто писать:

```js
if (Object.hasOwn(object, 'foo')) {
  // У `object` есть свойство `foo`.
}
```

`Object.hasOwn` уже доступен в V8 v9.3 с флагом `--harmony-object-has-own` и скоро появится в Chrome.

## Поддержка `Object.hasOwn`

<feature-support chrome="yes https://chromium-review.googlesource.com/c/v8/v8/+/2922117"
                 firefox="yes https://hg.mozilla.org/try/rev/94515f78324e83d4fd84f4b0ab764b34aabe6d80"
                 safari="yes https://bugs.webkit.org/show_bug.cgi?id=226291"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#accessible-objectprototypehasownproperty"></feature-support>

<!--truncate-->