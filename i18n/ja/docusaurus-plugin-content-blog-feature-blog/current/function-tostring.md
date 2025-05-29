---
title: &apos;修正された `Function.prototype.toString`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-25
tags:
  - ECMAScript
  - ES2019
description: &apos;Function.prototype.toString はホワイトスペースやコメントを含むソースコードの正確なスライスを返すようになりました。&apos;
---
[`Function.prototype.toString()`](https://tc39.es/Function-prototype-toString-revision/) は、ホワイトスペースやコメントを含むソースコードの正確なスライスを返すようになりました。以下は、旧動作と新動作を比較した例です:

<!--truncate-->
```js
// `function` キーワードと関数名の間のコメント、および
// 関数名の後のスペースに注目してください。
function /* コメント */ foo () {}

// 以前のV8では:
foo.toString();
// → &apos;function foo() {}&apos;
//             ^ コメントなし
//                ^ スペースなし

// 現在では:
foo.toString();
// → &apos;function /* コメント */ foo () {}&apos;
```

## 機能サポート

<feature-support chrome="66 /blog/v8-release-66#function-tostring"
                 firefox="yes"
                 safari="no"
                 nodejs="8"
                 babel="no"></feature-support>
