---
title: "`String.prototype.matchAll`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-02-02
tags:
  - ECMAScript
  - ES2020
  - io19
description: "String.prototype.matchAllは、指定された正規表現が生成するすべてのマッチオブジェクトを簡単に反復処理する方法を提供します。"
---
文字列に対して同じ正規表現を繰り返し適用し、すべての一致を取得することは一般的です。ある程度、`String#match`メソッドを使用することでこれを今日行うことは可能です。

この例では、16進数の数字のみで構成されたすべての単語を見つけ、それぞれの一致をログに記録します:

```js
const string = 'Magic hex numbers: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.match(regex)) {
  console.log(match);
}

// 出力:
//
// 'DEADBEEF'
// 'CAFE'
```

しかし、これでは一致する_サブ文字列_しか得られません。通常、サブ文字列だけではなく、各サブ文字列のインデックスや各一致内のキャプチャグループなどの追加情報も必要です。

独自のループを書き、マッチオブジェクトを自分自身で追跡することでこれを達成することはすでに可能ですが、それは少し面倒であまり便利ではありません:

```js
const string = 'Magic hex numbers: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
let match;
while (match = regex.exec(string)) {
  console.log(match);
}

// 出力:
//
// [ 'DEADBEEF', index: 19, input: 'Magic hex numbers: DEADBEEF CAFE' ]
// [ 'CAFE',     index: 28, input: 'Magic hex numbers: DEADBEEF CAFE' ]
```

新しい`String#matchAll`APIにより、これまでよりも簡単になりました: シンプルな`for`-`of`ループを書くことで、すべてのマッチオブジェクトを取得できます。

```js
const string = 'Magic hex numbers: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.matchAll(regex)) {
  console.log(match);
}

// 出力:
//
// [ 'DEADBEEF', index: 19, input: 'Magic hex numbers: DEADBEEF CAFE' ]
// [ 'CAFE',     index: 28, input: 'Magic hex numbers: DEADBEEF CAFE' ]
```

`String#matchAll`は特にキャプチャグループを持つ正規表現に役立ちます。個々の一致ごとの完全な情報を、キャプチャグループを含めて提供します。

```js
const string = 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;
for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} at ${match.index} with '${match.input}'`);
  console.log(`→ owner: ${match.groups.owner}`);
  console.log(`→ repo: ${match.groups.repo}`);
}

<!--truncate-->
// 出力:
//
// tc39/ecma262 at 23 with 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → owner: tc39
// → repo: ecma262
// v8/v8.dev at 36 with 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → owner: v8
// → repo: v8.dev
```

一般的なアイデアとして、シンプルな`for`-`of`ループを書くと、`String#matchAll`が残りの処理を引き受けてくれます。

:::note
**注:** 名前が示すように、`String#matchAll`は_すべて_のマッチオブジェクトを反復することを目的としています。そのため、`g`フラグを設定したグローバルな正規表現で使用すべきです。非グローバルな正規表現では最大でも一つの一致しか生成されません。グローバルでない正規表現を使用して`matchAll`を呼び出すと`TypeError`例外が発生します。
:::

## `String.prototype.matchAll`のサポート

<feature-support chrome="73 /blog/v8-release-73#string.prototype.matchall"
                 firefox="67"
                 safari="13"
                 nodejs="12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
