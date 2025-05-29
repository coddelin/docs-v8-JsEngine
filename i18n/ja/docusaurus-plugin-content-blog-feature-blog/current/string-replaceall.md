---
title: "`String.prototype.replaceAll`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-11-11
tags: 
  - ECMAScript
  - ES2021
  - Node.js 16
description: "JavaScript は、`String.prototype.replaceAll` API を使用して、グローバルな部分文字列置換に直接対応するようになりました。"
tweet: "1193917549060280320"
---
JavaScript で文字列を扱ったことがあるなら、`String#replace` メソッドに出会ったことがあるでしょう。`String.prototype.replace(searchValue, replacement)` は指定されたパラメーターに基づいて一致する部分を置換した結果の文字列を返します:

<!--truncate-->
```js
'abc'.replace('b', '_');
// → 'a_c'

'🍏🍋🍊🍓'.replace('🍏', '🥭');
// → '🥭🍋🍊🍓'
```

よくあるユースケースとして、特定の部分文字列のすべてのインスタンスを置換することがあります。しかし `String#replace` はこのユースケースに直接対応していません。`searchValue` が文字列の場合、部分文字列の最初の一致しか置換されません:

```js
'aabbcc'.replace('b', '_');
// → 'aa_bcc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replace('🍏', '🥭');
// → '🥭🍏🍋🍋🍊🍊🍓🍓'
```

これを回避するために、開発者は検索対象の文字列をグローバル (`g`) フラグ付きの正規表現に変換することがよくあります。こうすると `String#replace` はすべての一致を置換します:

```js
'aabbcc'.replace(/b/g, '_');
// → 'aa__cc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replace(/🍏/g, '🥭');
// → '🥭🥭🍋🍋🍊🍊🍓🍓'
```

開発者として、グローバルな部分文字列置換が欲しいだけなのに、この文字列を正規表現に変換しないといけないのは面倒です。それ以上に、この変換はミスを生みやすく、一般的なバグの元です！以下の例を考えてみてください:

```js
const queryString = 'q=query+string+parameters';

queryString.replace('+', ' ');
// → 'q=query string+parameters' ❌
// 最初の一致しか置換されません。

queryString.replace(/+/, ' ');
// → SyntaxError: invalid regular expression ❌
// 実際 `+` は正規表現パターンの中で特別な意味を持つ文字です。

queryString.replace(/\+/, ' ');
// → 'q=query string+parameters' ❌
// 正規表現の特別な文字をエスケープすれば正規表現は有効になりますが、
// これでもまだ文字列内の最初の `+` の一致しか置換されません。

queryString.replace(/\+/g, ' ');
// → 'q=query string parameters' ✅
// 特別な正規表現の文字をエスケープし、かつ `g` フラグを使用することで機能します。
```

`'+'` のような文字列リテラルをグローバルな正規表現に変換するのは、ただ単に `'` を削除し、正規表現用のスラッシュ `/` で囲み、`g` フラグを追加すればよいだけではありません。正規表現内で特別な意味を持つ文字をエスケープする必要があります。これは簡単に忘れられがちで、正確に実行するのが難しいです。JavaScript が正規表現パターンをエスケープする組み込みメカニズムを提供していないためです。

代替の回避策として `String#split` を `Array#join` と組み合わせる方法があります:

```js
const queryString = 'q=query+string+parameters';
queryString.split('+').join(' ');
// → 'q=query string parameters'
```

このアプローチはエスケープを伴う問題を回避しますが、文字列を部分に分割し、それを再び結合するというオーバーヘッドが発生します。

これら回避策のどれもが理想的ではないのは明らかです。JavaScript でグローバルな部分文字列置換という基本的な操作がもっと簡単にできれば素晴らしいと思いませんか？

## `String.prototype.replaceAll`

新しい `String#replaceAll` メソッドはこれらの問題を解決し、グローバルな部分文字列置換を行うための簡潔なメカニズムを提供します:

```js
'aabbcc'.replaceAll('b', '_');
// → 'aa__cc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replaceAll('🍏', '🥭');
// → '🥭🥭🍋🍋🍊🍊🍓🍓'

const queryString = 'q=query+string+parameters';
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

言語内の既存の API と整合性を保つために、`String.prototype.replaceAll(searchValue, replacement)` は `String.prototype.replace(searchValue, replacement)` と全く同じように動作しますが、以下の 2 点を除いてはそうです:

1. `searchValue` が文字列の場合、`String#replace` は部分文字列の最初の一致のみを置換しますが、`String#replaceAll` はすべての一致を置換します。
1. `searchValue` がグローバルでない正規表現の場合、`String#replace` は文字列の場合と同様に単一の一致のみを置換します。一方 `String#replaceAll` はこの場合には例外をスローします。これはおそらくエラーであり、すべての一致を「置換」したい場合はグローバルな正規表現を使用し、単一の一致のみを置換したい場合は `String#replace` を使用するべきだからです。

新機能の重要な部分は最初の項目にあります。`String.prototype.replaceAll` は正規表現やその他の回避策を使用せずに、グローバルな部分文字列置換をサポートするための初級クラス機能を JavaScript に追加します。

## 特殊な置換パターンについての注意

注目すべき点: `replace` と `replaceAll` の両方は[特殊な置換パターン](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement)をサポートしています。これらは正規表現と組み合わせて使用するのが最も便利ですが、そのうちいくつか（`$$`, `$&`, ``$` ``, `$'`）は単純な文字列置換を行う場合でも効果を発揮することがあり、驚くことがあります:

```js
'xyz'.replaceAll('y', '$$');
// → 'x$z' （'x$$z' ではありません）
```

これらのパターンのいずれかが置換文字列に含まれており、それをそのまま使用したい場合、文字列を返す置換関数を使用して魔法のような置換動作をオプトアウトできます:

```js
'xyz'.replaceAll('y', () => '$$');
// → 'x$$z'
```

## `String.prototype.replaceAll` のサポート

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9801"
                 firefox="77 https://bugzilla.mozilla.org/show_bug.cgi?id=1608168#c8"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
