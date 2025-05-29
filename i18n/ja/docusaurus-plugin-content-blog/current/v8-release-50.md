---
title: 'V8リリース v5.0'
author: 'V8チーム'
date: 2016-03-15 13:33:37
tags:
  - リリース
description: 'V8 v5.0は性能改善を伴い、いくつかの新しいES2015言語機能のサポートを追加します。'
---
V8の[リリースプロセス](/docs/release-process)での最初のステップは、Gitマスターから新しいブランチを作成することです。この作業はおおよそ6週間ごとにChrome BetaマイルストーンのためにChromiumがブランチする直前に行われます。我々の最新のリリースブランチは[V8 v5.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.0)で、Chrome 50 Stableと併せて安定版をリリースするまでベータ版として維持されます。このバージョンのV8での開発者向け新機能のハイライトを以下に示します。

<!--truncate-->
:::note
**注記:** バージョン番号5.0は、意味論的な意義を持つものではなく、大きなリリースとしてマークされることはありません（小さなリリースと区別して）。
:::

## 改善されたECMAScript 2015 (ES6) サポート

V8 v5.0は、正規表現（regex）マッチングに関連する多くのES2015機能を含んでいます。

### RegExp Unicodeフラグ

[RegExp Unicodeフラグ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Parameters)、`u`は、正規表現マッチングの新しいUnicodeモードをオンにします。Unicodeフラグは、パターンおよび正規表現文字列をUnicodeコードポイントの一連として扱います。また、Unicodeコードポイントエスケープの新しい構文を公開します。

```js
/😊{2}/.test('😊😊');
// false

/😊{2}/u.test('😊😊');
// true

/\u{76}\u{38}/u.test('v8');
// true

/\u{1F60A}/u.test('😊');
// true
```

`u`フラグはまた、`.`アトム（単一文字マッチャーとも呼ばれる）が基本多言語面（BMP）内の文字だけでなく、任意のUnicode記号をマッチするようになります。

```js
const string = 'the 🅛 train';

/the\s.\strain/.test(string);
// false

/the\s.\strain/u.test(string);
// true
```

### RegExpカスタマイズフック

ES2015には、正規表現サブクラスがマッチングの意味論を変更できるフックが含まれています。サブクラスは`Symbol.match`、`Symbol.replace`、`Symbol.search`、および`Symbol.split`という名前のメソッドをオーバーライドして、`String.prototype.match`などのメソッドに対する正規表現サブクラスの動作を変更することができます。

## ES2015およびES5機能における性能改善

リリース5.0では、すでに実装されているES2015およびES5機能にいくつかの注目すべき性能改善がもたらされます。

レストパラメータの実装は前のリリースよりも8〜10倍速くなり、多くの引数を関数呼び出し後に単一の配列にまとめる操作がより効率的になります。オブジェクトの列挙可能なプロパティを`for`-`in`によって返される順序で反復するために使用される`Object.keys`は、約2倍速くなりました。

## V8 API

API変更の[概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご確認ください。この文書は、各主要リリース後数週間で定期的に更新されます。

[アクティブなV8チェックアウト](https://v8.dev/docs/source-code#using-git)を持つ開発者は`git checkout -b 5.0 -t branch-heads/5.0`を使用してV8 5.0の新機能を試すことができます。あるいは[Chrome's Betaチャンネル](https://www.google.com/chrome/browser/beta.html)に登録して、すぐに新機能を自分で試してみることもできます。
