---
title: 'ECMAScript仕様を理解する 第4部'
author: '[Marja Hölttä](https://twitter.com/marjakh)、推測的仕様観察者'
avatars:
  - marja-holtta
date: 2020-05-19
tags:
  - ECMAScript
  - ECMAScriptの理解
description: 'ECMAScript仕様書を読むためのチュートリアル'
tweet: '1262815621756014594'
---

[すべてのエピソード](/blog/tags/understanding-ecmascript)

## ウェブの他の部分では

[Jason Orendorff](https://github.com/jorendorff)氏がMozillaから[JS文法の特異性に関する深い分析](https://github.com/mozilla-spidermonkey/jsparagus/blob/master/js-quirks.md#readme)を公開しました。実装詳細は異なるものの、どのJSエンジンもこれらの特異性に同じ課題を抱えています。

<!--truncate-->
## カバー文法

このエピソードでは、私たちは「*カバー文法*」についてさらに深掘りします。カバー文法は、最初に曖昧に見える文法構造を指定する方法です。

ここでも簡潔にするために `[In, Yield, Await]` の添え字は省略します。これらの意味と使い方については[第3部](/blog/understanding-ecmascript-part-3)をご覧ください。

## 有限先読み

一般的に、パーサーは有限先読み（一定数の後続トークン）に基づいて使用する生産を決定します。

場合によっては、次のトークンが使用すべき生産を明確に決定します。[例えば](https://tc39.es/ecma262/#prod-UpdateExpression):

```grammar
UpdateExpression :
  LeftHandSideExpression
  LeftHandSideExpression ++
  LeftHandSideExpression --
  ++ UnaryExpression
  -- UnaryExpression
```

`UpdateExpression` を解析していて次のトークンが `++` または `--` の場合、すぐに使用するべき生産が分かります。次のトークンがこれらでない場合でも、それほど問題ではありません: 現在の位置から `LeftHandSideExpression` を解析し、解析が終了した後で何をするかを決定します。

`LeftHandSideExpression` の後に続くトークンが `++` の場合、使用すべき生産は `UpdateExpression : LeftHandSideExpression ++` です。 `--` の場合も同様です。そして、`LeftHandSideExpression` の後に続くトークンが `++` でも `--` でもない場合、使用する生産は `UpdateExpression : LeftHandSideExpression` になります。

### アロー関数のパラメータリストか括弧付き式か？

アロー関数のパラメータリストと括弧付き式を区別することはもっと複雑です。

例を挙げると:

```js
let x = (a,
```

これは次のようなアロー関数の始まりでしょうか？

```js
let x = (a, b) => { return a + b };
```

あるいは、次のような括弧付き式でしょうか？

```js
let x = (a, 3);
```

この括弧付きの何かはどれだけ長くても問題ありません - 私たちは有限のトークン数に基づいてそれが何であるかを知ることはできません。

素朴な生産が以下のようだとしましょう:

```grammar
AssignmentExpression :
  ...
  ArrowFunction
  ParenthesizedExpression

ArrowFunction :
  ArrowParameterList => ConciseBody
```

この場合、有限先読みでは使用する生産を選択できません。`AssignmentExpression` を解析していて次のトークンが `(` の場合、次に何を解析するかをどのように決定しますか？ `ArrowParameterList` または `ParenthesizedExpression` を解析できますが、その推測が間違っている可能性があります。

### 非常に許容的な新しい記号: `CPEAAPL`

仕様書ではこの問題を解決するために、記号 `CoverParenthesizedExpressionAndArrowParameterList`（略して `CPEAAPL`）を導入しています。`CPEAAPL` は実際には `ParenthesizedExpression` か `ArrowParameterList` のどちらかですが、まだどちらかはわかりません。

[生産](https://tc39.es/ecma262/#prod-CoverParenthesizedExpressionAndArrowParameterList)は非常に許容的で、`ParenthesizedExpression` や `ArrowParameterList` に含まれるすべての構造を許容します:

```grammar
CPEAAPL :
  ( Expression )
  ( Expression , )
  ( )
  ( ... BindingIdentifier )
  ( ... BindingPattern )
  ( Expression , ... BindingIdentifier )
  ( Expression , ... BindingPattern )
```

例えば、以下の式はすべて有効な `CPEAAPL` です:

```js
// 有効な ParenthesizedExpression と ArrowParameterList:
(a, b)
(a, b = 1)

// 有効な ParenthesizedExpression:
(1, 2, 3)
(function foo() {})

// 有効な ArrowParameterList:
()
(a, b,)
(a, ...b)
(a = 1, ...b)

// 無効ですが、それでも CPEAAPL:
(1, ...b)
(1, )
```

末尾のカンマと `...` は `ArrowParameterList` のみで発生します。一部の構造（たとえば `b = 1`）はどちらにも発生しますが、意味が異なります: `ParenthesizedExpression` の中では代入、`ArrowParameterList` の中ではデフォルト値付きのパラメータです。数字やその他の `PrimaryExpressions` は有効なパラメータ名（またはパラメータの分解パターン）ではないため、`ParenthesizedExpression` のみで発生します。しかし、それらすべてが `CPEAAPL` の中に含まれることができます。

### 生産の中で `CPEAAPL` を使用する

これで、非常に許容的な `CPEAAPL` を [`AssignmentExpression`の生成規則](https://tc39.es/ecma262/#prod-AssignmentExpression)で使用できるようになりました。（注：`ConditionalExpression`は長い生成規則チェーンを通じて`PrimaryExpression`に繋がりますが、ここでは省略しています。）

```grammar
AssignmentExpression :
  ConditionalExpression
  ArrowFunction
  ...

ArrowFunction :
  ArrowParameters => ConciseBody

ArrowParameters :
  BindingIdentifier
  CPEAAPL

PrimaryExpression :
  ...
  CPEAAPL

```

`AssignmentExpression`を解析する必要があり、次のトークンが`(`である状況を再度想定してみましょう。この場合、`CPEAAPL`を解析し、後でどの生成規則を使用するのかを決定します。`ArrowFunction`を解析しているか`ConditionalExpression`を解析しているかに関わらず、次に解析するシンボルはどちらの場合でも`CPEAAPL`です！

`CPEAAPL`を解析した後、元の`AssignmentExpression`（`CPEAAPL`を含むもの）の生成規則を選択できます。この判断は`CPEAAPL`の後に続くトークンに基づいて行われます。

トークンが`=>`の場合、以下の生成規則を使用します：

```grammar
AssignmentExpression :
  ArrowFunction
```

トークンが他のものである場合、以下の生成規則を使用します：

```grammar
AssignmentExpression :
  ConditionalExpression
```

例えば：

```js
let x = (a, b) => { return a + b; };
//      ^^^^^^
//     CPEAAPL
//             ^^
//             CPEAAPLの後に続くトークン

let x = (a, 3);
//      ^^^^^^
//     CPEAAPL
//            ^
//            CPEAAPLの後に続くトークン
```

この時点で、`CPEAAPL`をそのまま保持し、プログラムの残りを解析し続けることができます。例えば、`CPEAAPL`が`ArrowFunction`内にある場合、それが有効な矢印関数のパラメータリストであるかどうかをまだ判断する必要はありません。それは後で確認できます。（現実のパーサーは、すぐに妥当性チェックを行う可能性がありますが、仕様の観点ではそれは必要ありません。）

### CPEAAPLsの制限

前述のように、`CPEAAPL`の生成規則は非常に許容的であり、`(1, ...a)`のような構文的に無効な構造を許可しています。文法に従ってプログラムを解析した後、この非合法な構造を禁止する必要があります。

仕様は以下の制限を追加することでこれを行います：

:::ecmascript-algorithm
> [静的意味論: 初期エラー](https://tc39.es/ecma262/#sec-grouping-operator-static-semantics-early-errors)
>
> `PrimaryExpression : CPEAAPL`
>
> `CPEAAPL`が`ParenthesizedExpression`をカバーしていない場合、構文エラーとなります。

:::ecmascript-algorithm
> [補足構文](https://tc39.es/ecma262/#sec-primary-expression)
>
> 生成規則のインスタンスを処理する際
>
> `PrimaryExpression : CPEAAPL`
>
> `CPEAAPL`の解釈は以下の文法を使用して精緻化されます：
>
> `ParenthesizedExpression : ( Expression )`

これはどういう意味かというと：構文木で`PrimaryExpression`の場所に`CPEAAPL`が出現した場合、それは実際には`ParenthesizedExpression`であり、これが唯一の有効な生成規則であるということです。

`Expression`は空になることはないため、`( )`は有効な`ParenthesizedExpression`ではありません。`,`で区切られたリスト（例：`(1, 2, 3)`）は[コンマ演算子](https://tc39.es/ecma262/#sec-comma-operator)によって作成されます：

```grammar
Expression :
  AssignmentExpression
  Expression , AssignmentExpression
```

同様に、`CPEAAPL`が`ArrowParameters`の場所に出現した場合、以下の制限が適用されます：

:::ecmascript-algorithm
> [静的意味論: 初期エラー](https://tc39.es/ecma262/#sec-arrow-function-definitions-static-semantics-early-errors)
>
> `ArrowParameters : CPEAAPL`
>
> `CPEAAPL`が`ArrowFormalParameters`をカバーしていない場合、構文エラーとなります。

:::ecmascript-algorithm
> [補足構文](https://tc39.es/ecma262/#sec-arrow-function-definitions)
>
> この生成規則が認識された場合
>
> `ArrowParameters` : `CPEAAPL`
>
> `CPEAAPL`の解釈は以下の文法を使用して精緻化されます：
>
> `ArrowFormalParameters :`
> `( UniqueFormalParameters )`

### その他のカバー文法

`CPEAAPL`に加え、仕様は他の曖昧な構造に対してもカバー文法を使用します。

`ObjectLiteral`は、矢印関数のパラメータリストの中に現れる`ObjectAssignmentPattern`のカバー文法として使用されます。このため、`ObjectLiteral`は実際のオブジェクトリテラル内に現れることができない構造を許可します。

```grammar
ObjectLiteral :
  ...
  { PropertyDefinitionList }

PropertyDefinition :
  ...
  CoverInitializedName

CoverInitializedName :
  IdentifierReference Initializer

Initializer :
  = AssignmentExpression
```

例えば：

```js
let o = { a = 1 }; // 構文エラー

// デフォルト値を持つ分割代入パラメータを持つ矢印関数：
//
let f = ({ a = 1 }) => { return a; };
f({}); // 1を返す
f({a : 6}); // 6を返す
```

非同期矢印関数も有限の先読みでは曖昧に見える場合があります：

```js
let x = async(a,
```

これは関数`async`への呼び出しなのか、それとも非同期矢印関数なのか？

```js
let x1 = async(a, b);
let x2 = async();
function async() { }

let x3 = async(a, b) => {};
let x4 = async();
```

この目的のために、文法は`CPEAAPL`と同様に機能するカバー文法記号`CoverCallExpressionAndAsyncArrowHead`を定義します。

## 要約

このエピソードでは、仕様がカバー文法をどのように定義し、有限の先読みでは現在の構文構造を特定できない場合にそれを使用する方法について調べました。

具体的には、矢印関数のパラメータリストと括弧で囲まれた式を区別する方法、また仕様が最初に曖昧に見える構造を許容的に解析し、後で静的意味規則で制限するためにカバー文法を使用する方法について調べました。
