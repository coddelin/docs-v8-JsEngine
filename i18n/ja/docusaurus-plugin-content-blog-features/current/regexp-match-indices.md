---
title: "RegExp マッチングインデックス"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski))、新しい機能を定期的に表現する"
avatars: 
  - "maya-armyanova"
date: 2019-12-17
tags: 
  - ECMAScript
  - Node.js 16
description: "RegExp マッチングインデックスは、各キャプチャグループの `start` と `end` のインデックスを提供します。"
tweet: "1206970814400270338"
---
JavaScript は、新しい正規表現拡張機能「マッチングインデックス」を搭載されました。JavaScript コードの中で予約語と一致する無効な変数名を見つけて、その変数名の下にキャレット（^）や「下線」を表示したい場合を想像してください。例えば以下のように:

<!--truncate-->
```js
const function = foo;
      ^------- 無効な変数名
```

上記の例では、`function` は予約語であり、変数名として使用することはできません。そのために以下の関数を記述するかもしれません:

```js
function displayError(text, message) {
  const re = /\b(continue|function|break|for|if)\b/d;
  const match = text.match(re);
  // インデックス `1` は最初のキャプチャグループに対応します。
  const [start, end] = match.indices[1];
  const error = ' '.repeat(start) + // キャレットの位置を調整。
    '^' +
    '-'.repeat(end - start - 1) +   // 下線を追加。
    ' ' + message;                  // メッセージを追加。
  console.log(text);
  console.log(error);
}

const code = 'const function = foo;'; // 誤ったコード
displayError(code, '無効な変数名');
```

:::note
**メモ:** 簡略化のため、上記の例には JavaScript の [予約語](https://mathiasbynens.be/notes/reserved-keywords) のみが含まれています。
:::

簡単に言えば、新しい `indices` 配列は各キャプチャグループの開始位置と終了位置を格納します。この新しい配列は、`/d` フラグを使用した正規表現に関連するすべての組み込みメソッドで利用可能です。これは、`RegExp#exec`、`String#match`、および [`String#matchAll`](https://v8.dev/features/string-matchall) を含みます。

詳細が気になる方は読み続けてください。

## 動機

プログラミング言語を解析する（例えば [TypeScript コンパイラ](https://github.com/microsoft/TypeScript/tree/master/src/compiler) が行う作業）がどのように行われるかを考えたときに、もう少し複雑な例に進みましょう。まず入力ソースコードをトークンに分割し、それからそれらのトークンに構文構造を付与します。ユーザーが構文的に誤ったコードを書いた場合、理想的には問題が最初に検出された場所を指し示す有意義なエラーを提示したいですよね。例えば以下のコードスニペットを考えてください:

```js
let foo = 42;
// その他のコード
let foo = 1337;
```

エラーを次のようにプログラマーに提示したいとします:

```js
let foo = 1337;
    ^
SyntaxError: 識別子 'foo' はすでに宣言されています
```

これを達成するには、最初の構築ブロックとして TypeScript の識別子を認識する必要があります。そして、問題が発生した正確な位置を特定することに焦点を当てます。次の例を考え、文字列が有効な識別子であるかどうかを判断する正規表現を使用します:

```js
function isIdentifier(name) {
  const re = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
  return re.exec(name) !== null;
}
```

:::note
**メモ:** 実際のパーサーでは、最近導入された正規表現の [プロパティ・エスケープ](https://github.com/tc39/proposal-regexp-unicode-property-escapes#other-examples) を利用し、有効な ECMAScript 識別子名をすべて一致させるために次の正規表現を使用することができます:

```js
const re = /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u;
```

簡略化のため、前述の Latin 文字、数字、アンダースコアのみを一致させる正規表現を使用します。
:::

上記の変数宣言でエラーが発生し、ユーザーに正確な位置を表示したい場合、上記からの正規表現を拡張し類似の関数を使うかもしれません:

```js
function getDeclarationPosition(source) {
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/;
  const match = re.exec(source);
  if (!match) return -1;
  return match.index;
}
```

`RegExp.prototype.exec` によって返されるマッチオブジェクトの `index` プロパティを使用して、全体一致の開始位置を取得することができます。ただし、上述のユースケースのように（場合によっては複数のキャプチャグループを使用して）一致する部分文字列がどこで始まりどこで終わるかを知りたい場合があります。従来の JavaScript ではキャプチャグループごとに部分文字列が開始される場所と終了する場所のインデックスを公開していませんでした。

## RegExp マッチングインデックスの説明

理想的には、変数名の位置にエラーを表示したいのですが、`let`/`const` キーワードの位置ではありません（前述の例ではそうなっています）。そのためには、キャプチャグループのインデックス `2` の位置を見つける必要があります。（インデックス `1` は `(let|const|var)` キャプチャグループを指し、`0` は全体の一致を指します。）

上記で述べたように、新しいJavaScript機能（[リンク先](https://github.com/tc39/proposal-regexp-match-indices)）は、`RegExp.prototype.exec()`の結果（部分文字列の配列）に`indices`プロパティを追加します。この新しいプロパティを活用する例を改良してみましょう：

```js
function getVariablePosition(source) {
  // `d`フラグに注目してください。これにより`match.indices`が有効になります
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return undefined;
  return match.indices[2];
}
getVariablePosition('let foo');
// → [4, 7]
```

この例は、配列`[4, 7]`を返します。これは、インデックス`2`のグループから一致した部分文字列の`[start, end)`の位置を表しています。この情報を基に、コンパイラは必要なエラーを出力できるようになります。

## 追加機能

`indices`オブジェクトには、[名前付きキャプチャグループ](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups)の名前でインデックスできる`groups`プロパティも含まれています。これを使用すると、上記の関数を次のように書き換えることができます：

```js
function getVariablePosition(source) {
  const re = /(?<keyword>let|const|var)\s+(?<id>[a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return -1;
  return match.indices.groups.id;
}
getVariablePosition('let foo');
```

## RegExpマッチインデックスのサポート

<feature-support chrome="90 https://bugs.chromium.org/p/v8/issues/detail?id=9548"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519483"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=202475"
                 nodejs="16"
                 babel="no"></feature-support>
