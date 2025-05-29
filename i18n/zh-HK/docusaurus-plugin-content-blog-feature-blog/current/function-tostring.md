---
title: &apos;修改後的 `Function.prototype.toString`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-25
tags:
  - ECMAScript
  - ES2019
description: &apos;Function.prototype.toString 現在返回源代码文本的準確片段，包括空格和註釋。&apos;
---
[`Function.prototype.toString()`](https://tc39.es/Function-prototype-toString-revision/) 現在返回源代码文本的準確片段，包括空格和註釋。以下是舊行為與新行為的比較示例：

<!--truncate-->
```js
// 注意 `function` 關鍵字與函數名稱之間的註釋
// 以及函數名稱後的空格。
function /* 一個註釋 */ foo () {}

// 之前，在 V8 中：
foo.toString();
// → &apos;function foo() {}&apos;
//             ^ 没有註釋
//                ^ 没有空格

// 現在：
foo.toString();
// → &apos;function /* 註釋 */ foo () {}&apos;
```

## 功能支援

<feature-support chrome="66 /blog/v8-release-66#function-tostring"
                 firefox="yes"
                 safari="no"
                 nodejs="8"
                 babel="no"></feature-support>
