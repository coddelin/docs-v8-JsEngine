---
title: "`at`メソッドで相対インデックスアクセス"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars: 
  - "shu-yu-guo"
date: 2021-07-13
tags: 
  - ECMAScript
description: "JavaScriptは、配列、TypedArray、および文字列に対する相対インデックスメソッドを導入しました。"
---

新しい`at`メソッドは、`Array.prototype`、各種TypedArrayプロトタイプ、そして`String.prototype`に追加され、コレクションの末尾付近にある要素に簡潔かつ簡単にアクセスできるようになります。

コレクションの末尾からN番目の要素にアクセスすることは一般的な操作です。しかし、通常の方法では冗長で、たとえば`my_array[my_array.length - N]`のような記述になったり、`my_array.slice(-N)[0]`のようにパフォーマンスが適切でない場合があります。新しい`at`メソッドは負のインデックスを「末尾から」と解釈することで、この操作をより快適にします。上記の例は`my_array.at(-N)`と表現できます。

<!--truncate-->
統一性のために、正のインデックスもサポートされており、通常のプロパティアクセスと等価です。

この新しいメソッドは非常に小さな機能であるため、その完全なセマンティクスは以下の準拠するポリフィル実装によって理解できます：

```js
function at(n) {
  // 引数を整数に変換
  n = Math.trunc(n) || 0;
  // 負のインデックスを末尾からのアクセスとして許可
  if (n < 0) n += this.length;
  // 範囲外のアクセスはundefinedを返す
  if (n < 0 || n >= this.length) return undefined;
  // それ以外の場合は、通常のプロパティアクセス
  return this[n];
}
```

## 文字列についての注意

`at`は最終的に通常のインデックス操作を行うため、文字列に対して`at`を呼び出すと通常のインデックス操作と同様にコードユニットが返されます。そして文字列に対する通常のインデックス操作と同様に、コードユニットはUnicode文字列に必要なものではない場合があります！使用するケースに応じて[`String.prototype.codePointAt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt)が適切かどうか検討してください。

## `at`メソッドの対応状況

<feature-support chrome="92"
                 firefox="90"
                 safari="no"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#relative-indexing-method"></feature-support>
