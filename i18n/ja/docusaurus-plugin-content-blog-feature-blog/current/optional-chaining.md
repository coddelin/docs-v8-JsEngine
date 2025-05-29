---
title: "Optional chaining"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), オプショナルチェーンの突破者"
avatars: 
  - "maya-armyanova"
date: 2019-08-27
tags: 
  - ECMAScript
  - ES2020
description: "オプショナルチェーンは組み込みのヌルチェックを伴うプロパティアクセスを読みやすく簡潔に記述することを可能にします。"
tweet: "1166360971914481669"
---
JavaScriptでの長いプロパティアクセスチェーンはエラーが発生しやすく、そのどれもが`null`または`undefined`（「ヌリッシュ」値として知られる）に評価される可能性があります。それぞれの手順でプロパティの存在を確認することは、簡単に深く入れ子になった`if`文構造やプロパティアクセスチェーンを複製する長い`if`条件に変わる可能性があります：

<!--truncate-->
```js
// エラーが発生しやすいバージョン、例外を投げる可能性あり。
const nameLength = db.user.name.length;

// エラーが発生しにくいが、可読性が低い。
let nameLength;
if (db && db.user && db.user.name)
  nameLength = db.user.name.length;
```

上記は三項演算子を使用して表現することもできますが、可読性が向上するわけではありません：

```js
const nameLength =
  (db
    ? (db.user
      ? (db.user.name
        ? db.user.name.length
        : undefined)
      : undefined)
    : undefined);
```

## オプショナルチェーン演算子の導入

こんなコードを書きたくないので、何らかの代替策が望ましい。他のプログラミング言語は「オプショナルチェーン」と呼ばれる機能を使用してこの問題に対して優雅な解決策を提供しています。[最近の仕様提案](https://github.com/tc39/proposal-optional-chaining)によると、「オプショナルチェーンは、先頭にトークン`?.`で始まる1つ以上のプロパティアクセスや関数呼び出しのチェーンを指します。」

新しいオプショナルチェーン演算子を使用すると、上記の例を次のように書き換えることができます：

```js
// エラーをチェックしながら、さらに読みやすい。
const nameLength = db?.user?.name?.length;
```

`db`、`user`、`name`が`undefined`または`null`である場合、どうなりますか？オプショナルチェーン演算子を使用すると、JavaScriptはエラーを投げる代わりに`nameLength`を`undefined`に初期化します。

この動作は`if (db && db.user && db.user.name)`をチェックするよりも堅牢です。例えば、`name`が常に文字列であることが保証されていた場合、`name?.length`を`name.length`に変更することができます。そして、`name`が空の文字列であった場合でも、正しい長さ`0`を取得します。これは、空の文字列が`if`節内で`false`のように動作するための偽値（falsy value）のためです。オプショナルチェーン演算子はこの一般的なバグの原因を修正します。

## 追加の構文形式：呼び出しと動的プロパティ

オプショナルメソッドを呼び出すための演算子のバージョンもあります：

```js
// インターフェースにオプショナルメソッドを拡張し、これは管理者ユーザーのみに存在します。
const adminOption = db?.user?.validateAdminAndGetPrefs?.().option;
```

構文は意外に感じるかもしれませんが、`?.()`が実際の演算子であり、その前の式に適用されます。

演算子の第三の使用法があり、すなわちオプショナルな動的プロパティアクセスで、これは`?.[]`を介して行われます。括弧内の引数によって参照される値を返すか、値を取得するオブジェクトが存在しない場合は`undefined`を返します。以下は上記の例を基にした可能なユースケースです：

```js
// 静的プロパティアクセスの機能を拡張し、
// 動的に生成されたプロパティ名を使用。
const optionName = 'optional setting';
const optionLength = db?.user?.preferences?.[optionName].length;
```

この最後の形式は配列のオプショナルインデックスにも利用可能で、例：

```js
// `usersArray`が`null`または`undefined`の場合、
// `userName`は優雅に`undefined`に評価されます。
const userIndex = 42;
const userName = usersArray?.[userIndex].name;
```

オプショナルチェーン演算子は[ヌリッシュ合体`??`演算子](/features/nullish-coalescing)と組み合わせることができ、`undefined`ではないデフォルト値が必要な場合に使用されます。これにより、安全な深いプロパティアクセスと指定されたデフォルト値が可能になり、これまで[lodashの`_.get`](https://lodash.dev/docs/4.17.15#get)のようなライブラリを必要としていた一般的なユースケースに対応します：

```js
const object = { id: 123, names: { first: 'Alice', last: 'Smith' }};

{ // lodashを使用して：
  const firstName = _.get(object, 'names.first');
  // → 'Alice'

  const middleName = _.get(object, 'names.middle', '(no middle name)');
  // → '(no middle name)'
}

{ // オプショナルチェーンとヌリッシュ合体を使用して：
  const firstName = object?.names?.first ?? '(no first name)';
  // → 'Alice'

  const middleName = object?.names?.middle ?? '(no middle name)';
  // → '(no middle name)'
}
```

## オプショナルチェーン演算子の特性

オプショナルチェーン演算子には、いくつか興味深い特性があります：_ショートサーキット_、_スタッキング_、および_オプショナル削除_です。これらをそれぞれ例で説明してみましょう。

_ショートサーキット_は、オプショナルチェーン演算子が早期に返る場合、式の残りを評価しないことを意味します：

```js
// `age` は、`db` と `user` が定義されている場合にのみインクリメントされます。
db?.user?.grow(++age);
```

「スタッキング」とは、プロパティへのアクセスのシーケンスで複数のオプショナルチェーン演算子を適用できることを意味します:

```js
// オプショナルチェーンの後に別のオプショナルチェーンをつけることができます。
const firstNameLength = db.users?.[42]?.names.first.length;
```

それでも、1つのチェーン内で複数のオプショナルチェーン演算子を使用する際は慎重であるべきです。値がnullもしくはundefinedにならないことが保証されている場合、そのプロパティにアクセスするために`?.`を使うことは推奨されません。上記の例では、`db`は常に定義されていると考えられていますが、`db.users`と`db.users[42]`はそうではないかもしれません。データベース内にそのようなユーザーがいるならば、`names.first.length`は常に定義されていると想定されます。

「オプショナル削除」とは、`delete`演算子をオプショナルチェーンと組み合わせて使用することを意味します:

```js
// `db.user` は、`db` が定義されている場合にのみ削除されます。
delete db?.user;
```

詳細については[提案の「セマンティクス」セクション](https://github.com/tc39/proposal-optional-chaining#semantics)をご覧ください。

## オプショナルチェーンのサポート状況

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9553"
                 firefox="74 https://bugzilla.mozilla.org/show_bug.cgi?id=1566143"
                 safari="13.1 https://bugs.webkit.org/show_bug.cgi?id=200199"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining"></feature-support>
