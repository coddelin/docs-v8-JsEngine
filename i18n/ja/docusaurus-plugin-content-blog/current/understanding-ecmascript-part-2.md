---
title: "ECMAScript仕様を理解する、パート2"
author: "[Marja Hölttä](https://twitter.com/marjakh)、推論的仕様観察者"
avatars: 
  - marja-holtta
date: 2020-03-02
tags: 
  - ECMAScript
  - ECMAScriptの理解
description: "ECMAScript仕様を読むためのチュートリアル、パート2"
tweet: "1234550773629014016"
---

仕様を読むスキルをさらに練習しましょう。まだ前回のエピソードを見ていない場合は、今がそれを確認する良いタイミングです！

[すべてのエピソード](/blog/tags/understanding-ecmascript)

## パート2の準備はいいですか?

仕様を知る楽しみな方法として、まずJavaScriptの機能を選び、それがどのように仕様化されているかを調べます。

> 警告！このエピソードには、2020年2月時点の[ECMAScript仕様](https://tc39.es/ecma262/)からコピーされたアルゴリズムが含まれています。これらはいずれ古くなります。

プロパティがプロトタイプチェーンで検索されることは知っています: オブジェクトが読もうとしているプロパティを持っていない場合、プロトタイプチェーンを検索し続け、プロパティが見つかるか、それ以上プロトタイプを持たないオブジェクトに達するまで探索します。

例えば:

```js
const o1 = { foo: 99 };
const o2 = {};
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 99
```

## プロトタイプの検索はどこで定義されていますか?

この動作がどこで定義されているかを見つけてみましょう。始めるのに良い場所は[オブジェクト内部メソッドのリスト](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots)です。

`[[GetOwnProperty]]`と`[[Get]]`の両方がありますが、自身のプロパティに制限されないバージョンを探しているので、`[[Get]]`を選びます。

残念ながら、[プロパティ記述子仕様型](https://tc39.es/ecma262/#sec-property-descriptor-specification-type)にも`[[Get]]`というフィールドがあります。そのため、仕様を`[[Get]]`のために閲覧する際には、この二つの独立した使用法を慎重に区別する必要があります。

<!--truncate-->
`[[Get]]`は**基本的な内部メソッド**です。**通常のオブジェクト**は基本的な内部メソッドのデフォルトの動作を実装します。**特殊なオブジェクト**はデフォルトの動作から逸脱する独自の内部メソッド`[[Get]]`を定義できます。この投稿では通常のオブジェクトに焦点を当てています。

`[[Get]]`のデフォルト実装は`OrdinaryGet`に委任します:

:::ecmascript-algorithm
> **[`[[Get]] ( P, Receiver )`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-get-p-receiver)**
>
> `O`の`[[Get]]`内部メソッドがプロパティキー`P`とECMAScript言語値`Receiver`と共に呼び出されるとき、次の手順が実行されます:
>
> 1. `? OrdinaryGet(O, P, Receiver)`を返します。

`Receiver`はアクセサプロパティのゲッタ関数を呼び出す際に使用される**this値**であることがすぐに分かります。

`OrdinaryGet`は次のように定義されています:

:::ecmascript-algorithm
> **[`OrdinaryGet ( O, P, Receiver )`](https://tc39.es/ecma262/#sec-ordinaryget)**
>
> 抽象操作`OrdinaryGet`がオブジェクト`O`、プロパティキー`P`、ECMAScript言語値`Receiver`と共に呼び出されるとき、次の手順が実行されます:
>
> 1. `IsPropertyKey(P)`が`true`であることを断言します。
> 1. `desc`を`? O.[[GetOwnProperty]](P)`とします。
> 1. `desc`が`undefined`の場合:
>     1. `parent`を`? O.[[GetPrototypeOf]]()`とします。
>     1. `parent`が`null`の場合、`undefined`を返します。
>     1. `? parent.[[Get]](P, Receiver)`を返します。
> 1. `IsDataDescriptor(desc)`が`true`の場合、`desc.[[Value]]`を返します。
> 1. `IsAccessorDescriptor(desc)`が`true`であることを断言します。
> 1. `getter`を`desc.[[Get]]`とします。
> 1. `getter`が`undefined`の場合、`undefined`を返します。
> 1. `? Call(getter, Receiver)`を返します。

プロトタイプチェーンの探索はステップ3の中にあります: プロパティが自身のプロパティとして見つからない場合、プロトタイプの`[[Get]]`メソッドを呼び出し、再度`OrdinaryGet`に委任します。まだプロパティが見つからない場合、さらにそのプロトタイプの`[[Get]]`メソッドを呼び出し、再度`OrdinaryGet`に委任します。これをプロパティが見つかるか、プロトタイプを持たないオブジェクトに到達するまで繰り返します。

`o2.foo`にアクセスする際、このアルゴリズムがどのように動作するか見てみましょう。まず、`OrdinaryGet`を`O`が`o2`、`P`が`"foo"`の場合で呼び出します。`O.[[GetOwnProperty]]("foo")`は`undefined`を返します。なぜなら`o2`には`"foo"`という自身のプロパティがないためです。そのためステップ3の条件分岐に進みます。ステップ3.aで、`parent`を`o2`のプロトタイプ、つまり`o1`に設定します。`parent`は`null`ではないので、ステップ3.bで返されません。ステップ3.cで、プロパティキー`"foo"`を使用して親の`[[Get]]`メソッドを呼び出し、その結果を返します。

親(`o1`)は通常のオブジェクトなので、その`[[Get]]`メソッドは再度`OrdinaryGet`を呼び出します。この場合、`O`が`o1`で`P`が`"foo"`です。`o1`には`"foo"`という自身のプロパティがあるため、ステップ2で`O.[[GetOwnProperty]]("foo")`は関連するプロパティ記述子を返し、それを`desc`に格納します。

[プロパティ記述子](https://tc39.es/ecma262/#sec-property-descriptor-specification-type)は仕様タイプです。データプロパティ記述子はプロパティの値を直接 `[[Value]]` フィールドに保存します。アクセサプロパティ記述子は `[[Get]]` および/または `[[Set]]` フィールドにアクセサ関数を保存します。この場合、`"foo"` に関連付けられたプロパティ記述子はデータプロパティ記述子です。

ステップ2で `desc` に保存したデータプロパティ記述子は `undefined` ではないため、ステップ3で `if` 分岐を採用しません。次にステップ4を実行します。プロパティ記述子がデータプロパティ記述子であるため、ステップ4でその `[[Value]]` フィールド `99` を返し、終了します。

## `Receiver`とは何か、それはどこから来るのか？

`Receiver` パラメータはアクセサプロパティの場合にのみステップ8で使用されます。これはアクセサプロパティのゲッタ関数を呼び出す際に **this 値** として渡されます。

`OrdinaryGet` は再帰の間で元の `Receiver` を変更せずに通過させます（ステップ3.c）。次に、`Receiver` が最初にどこから来るのか確認してみましょう！

`[[Get]]` が呼び出される箇所を検索すると、参照に対して動作する抽象的な操作 `GetValue` が見つかります。参照は仕様タイプであり、基底値、参照名、および厳密参照フラグで構成されています。`o2.foo` の場合は、基底値がオブジェクト `o2`、参照名が文字列 `"foo"`、厳密参照フラグが `false` となります。この例のコードは厳密ではないためです。

### 脇道: なぜ参照はレコードではないのか？

脇道: 参照はレコードではありませんが、レコードのように見えるかもしれません。三つのコンポーネントを含んでおり、それらは三つの名前付きフィールドとしても同様に表現できます。参照がレコードではない理由は歴史的なものに過ぎません。

### `GetValue` に戻る

`GetValue` がどのように定義されているか見てみましょう:

:::ecmascript-algorithm
> **[`GetValue ( V )`](https://tc39.es/ecma262/#sec-getvalue)**
>
> 1. `ReturnIfAbrupt(V)`。
> 1. `Type(V)` が `Reference` でないなら、`V` を返す。
> 1. `base` を `GetBase(V)` とする。
> 1. `IsUnresolvableReference(V)` が `true` なら、`ReferenceError` 例外を投げる。
> 1. `IsPropertyReference(V)` が `true` なら、以下を実行:
>     1. `HasPrimitiveBase(V)` が `true` なら、以下を実行:
>         1. この場合、`base` が `undefined` または `null` になることはないことを保証する。
>         1. `base` を `! ToObject(base)` に設定する。
>     1. `? base.[[Get]](GetReferencedName(V), GetThisValue(V))` を返す。
> 1. それ以外の場合:
>     1. `base` は環境レコードであることを保証する。
>     1. `? base.GetBindingValue(GetReferencedName(V), IsStrictReference(V))` を返す。

例の参照は `o2.foo` であり、プロパティ参照です。そのため、分岐5を採用します。分岐5.aは採用しません。基底値（`o2`）が [プリミティブ値](/blog/react-cliff#javascript-types)（数値、文字列、シンボル、ビッグイント、真偽値、未定義、またはヌル）ではないためです。

次に、ステップ5.bで `[[Get]]` を呼び出します。渡す `Receiver` は `GetThisValue(V)` であり、この場合は参照の基底値そのものです:

:::ecmascript-algorithm
> **[`GetThisValue( V )`](https://tc39.es/ecma262/#sec-getthisvalue)**
>
> 1. `IsPropertyReference(V)` が `true` であることを保証する。
> 1. `IsSuperReference(V)` が `true` なら、以下を実行:
>     1. `V` の参照の `thisValue` コンポーネントの値を返す。
> 1. `GetBase(V)` を返す。

`o2.foo` では、ステップ2の分岐は採用しません。それはスーパー参照（例えば `super.foo` のようなもの）ではないためですが、ステップ3を採用し、参照の基底値 `o2` を返します。

すべてを組み合わせると、`Receiver` を元の参照の基底値に設定し、その後プロトタイプチェーンのウォーク中に変更しないことが分かります。最終的に、見つけるプロパティがアクセサプロパティの場合、呼び出し時に **this 値** として `Receiver` を使用します。

特に、ゲッタ内の **this 値** はプロトタイプチェーンウォーク中にプロパティが見つかったオブジェクトではなく、プロパティを取得しようとした元のオブジェクトを指します。

試してみましょう！

```js
const o1 = { x: 10, get foo() { return this.x; } };
const o2 = { x: 50 };
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 50
```

この例では、`foo` というアクセサプロパティがあり、それに対してゲッタを定義しています。ゲッタは `this.x` を返します。

次に `o2.foo` にアクセスします。ゲッタは何を返しますか？

ゲッタを呼び出す際の **this 値** はプロパティを取得しようとしたオブジェクト自身であり、プロトタイプチェーンウォーク中にプロパティを見つけたオブジェクトではありません。この場合 **this 値** は `o2` であり、`o1` ではありません。ゲッタが `o2.x` または `o1.x` を返すかどうかを確認することで検証できます。実際に `o2.x` を返します。

動きました！このコードスニペットの挙動を仕様を読んで予測することができました。

## プロパティのアクセス — なぜ `[[Get]]` を呼び出すのか？

`o2.foo` などのプロパティにアクセスする際にオブジェクトの内部メソッド `[[Get]]` が呼び出されることはどこで仕様に記載されているのでしょうか？確かにどこかで定義されているはずです。私の言葉をそのまま鵜呑みにしないでください！

オブジェクトの内部メソッド `[[Get]]` が参照に対して動作する抽象的な操作 `GetValue` から呼び出されることを見つけました。しかし、`GetValue` はどこから呼び出されるのでしょうか？

### `MemberExpression` のランタイムセマンティクス

仕様の文法規則は言語の構文を定義しています。[ランタイムセマンティクス](https://tc39.es/ecma262/#sec-runtime-semantics)は、構文構造が「意味すること」（実行時にどのように評価されるか）を定義します。

[文脈自由文法](https://ja.wikipedia.org/wiki/%E6%96%87%E8%84%88%E8%87%AA%E7%94%B1%E6%96%87%E6%B3%95)に慣れていない場合は、今すぐ確認することをお勧めします！

文法規則については次のエピソードで詳しく見ていきますので、今はシンプルにしておきましょう！特に、このエピソードでは生産式の下付き文字（`Yield`、`Await`など）は無視してかまいません。

以下の生産式は、[`MemberExpression`](https://tc39.es/ecma262/#prod-MemberExpression)がどのようなものかを説明しています：

```grammar
MemberExpression :
  PrimaryExpression
  MemberExpression [ Expression ]
  MemberExpression . IdentifierName
  MemberExpression TemplateLiteral
  SuperProperty
  MetaProperty
  new MemberExpression Arguments
```

ここでは、`MemberExpression`のための7つの生産式があります。`MemberExpression`は単に`PrimaryExpression`であることができます。あるいは、`MemberExpression`と`Expression`を組み合わせて`MemberExpression [ Expression ]`（例: `o2['foo']`）のように構築することもできます。または、`MemberExpression . IdentifierName`（例: `o2.foo`）のようにもなれます。これは私たちの例に関係する生産式です。

`MemberExpression : MemberExpression . IdentifierName`の生産式のランタイムセマンティクスは、それを評価する際の一連の手順を定義しています：

:::ecmascript-algorithm
> **[ランタイムセマンティクス: `MemberExpression : MemberExpression . IdentifierName`の評価](https://tc39.es/ecma262/#sec-property-accessors-runtime-semantics-evaluation)**
>
> 1. `baseReference`を`MemberExpression`を評価した結果とする。
> 2. `baseValue`を`? GetValue(baseReference)`とする。
> 3. この`MemberExpression`に一致するコードが厳格モードコードである場合、`strict`を`true`に設定する。それ以外の場合は`false`に設定する。
> 4. `? EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict)`を返す。

このアルゴリズムは、抽象操作`EvaluatePropertyAccessWithIdentifierKey`に委譲されるため、それも読み込む必要があります：

:::ecmascript-algorithm
> **[`EvaluatePropertyAccessWithIdentifierKey( baseValue, identifierName, strict )`](https://tc39.es/ecma262/#sec-evaluate-property-access-with-identifier-key)**
>
> 抽象操作`EvaluatePropertyAccessWithIdentifierKey`は、値`baseValue`、構文木ノード`identifierName`、およびブール引数`strict`を引数として取ります。以下の手順を実行します：
>
> 1. `identifierName`が`IdentifierName`であることをアサートする。
> 2. `bv`を`? RequireObjectCoercible(baseValue)`とする。
> 3. `propertyNameString`を`identifierName`の`StringValue`とする。
> 4. 基本値コンポーネントが`bv`であり、参照された名前コンポーネントが`propertyNameString`で、厳格参照フラグが`strict`であるタイプ`Reference`の値を返す。

つまり：`EvaluatePropertyAccessWithIdentifierKey`は、与えられた`baseValue`をベースとして使用し、`identifierName`の文字列値をプロパティ名として使用し、`strict`を厳格モードフラグとして使用するReferenceを構築します。

最終的に、このReferenceは`GetValue`に渡されます。これはそのReferenceの使用方法に応じて仕様書内のいくつかの場所で定義されています。

### `MemberExpression`をパラメータとして使用

私たちの例では、プロパティアクセスをパラメータとして使用します：

```js
console.log(o2.foo);
```

この場合、動作は`ArgumentList`生産式のランタイムセマンティクスによって定義され、引数に対して`GetValue`を呼び出します：

:::ecmascript-algorithm
> **[ランタイムセマンティクス: `ArgumentListEvaluation`](https://tc39.es/ecma262/#sec-argument-lists-runtime-semantics-argumentlistevaluation)**
>
> `ArgumentList : AssignmentExpression`
>
> 1. `ref`を`AssignmentExpression`を評価した結果とする。
> 2. `arg`を`? GetValue(ref)`とする。
> 3. 唯一のアイテムが`arg`であるリストを返す。

`o2.foo`は`AssignmentExpression`のように見えませんが、実際にはそうなので、この生産式が適用されます。なぜなのかを知りたい場合は、[こちらの追加コンテンツ](/blog/extras/understanding-ecmascript-part-2-extra)を確認してください。ただし、この時点では必ずしも必要ではありません。

ステップ1における`AssignmentExpression`は`o2.foo`です。`ref`、つまり`o2.foo`を評価した結果は、前述のReferenceです。ステップ2で、それに対して`GetValue`を呼び出します。このため、オブジェクト内部メソッド`[[Get]]`が呼び出され、プロトタイプチェーンの探索が行われることを知っています。

## まとめ

今回のエピソードでは、仕様が言語機能（今回の場合はプロトタイプ検索）を、トリガーとなる構文構造とそれを定義するアルゴリズムという複数の異なるレイヤーでどのように定義するかを見ていきました。
