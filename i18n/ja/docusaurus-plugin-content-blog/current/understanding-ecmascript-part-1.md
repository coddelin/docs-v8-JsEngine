---
title: 'ECMAScript仕様の理解、第1部'
author: '[Marja Hölttä](https://twitter.com/marjakh)、推測的仕様の観察者'
avatars:
  - marja-holtta
date: 2020-02-03 13:33:37
tags:
  - ECMAScript
  - ECMAScriptの理解
description: 'ECMAScript仕様を読む手引き'
tweet: '1224363301146189824'
---

[全てのエピソードはこちら](/blog/tags/understanding-ecmascript)

この記事では、仕様内の簡単な関数を取り上げ、その記法を理解しようとします。さあ、始めましょう！

## 前書き

JavaScriptを知っていても、その言語仕様である[ECMAScript Language specification、略してECMAScript仕様](https://tc39.es/ecma262/)を読むのは非常に気が重い場合があります。少なくとも初めて読んだときはそう感じました。

<!--truncate-->
具体的な例から始めて、仕様を通してそれを理解していきましょう。以下のコードは`Object.prototype.hasOwnProperty`の使用例を示しています：

```js
const o = { foo: 1 };
o.hasOwnProperty('foo'); // true
o.hasOwnProperty('bar'); // false
```

この例では、`o`には`hasOwnProperty`というプロパティがないので、プロトタイプチェーンを辿って探します。そして、それを`o`のプロトタイプである`Object.prototype`の中に見つけます。

`Object.prototype.hasOwnProperty`がどのように機能するかを説明するために、仕様は疑似コードのような記述を使用します：

:::ecmascript-algorithm
> **[`Object.prototype.hasOwnProperty(V)`](https://tc39.es/ecma262#sec-object.prototype.hasownproperty)**
>
> `hasOwnProperty`メソッドが引数`V`を使って呼び出される場合、以下の手順が実行されます：
>
> 1. `P`を`? ToPropertyKey(V)`とする。
> 2. `O`を`? ToObject(this value)`とする。
> 3. `? HasOwnProperty(O, P)`を返す。
:::

そして…

:::ecmascript-algorithm
> **[`HasOwnProperty(O, P)`](https://tc39.es/ecma262#sec-hasownproperty)**
>
> 抽象操作`HasOwnProperty`は、オブジェクトが指定されたプロパティキーを持つ自身のプロパティを持っているかどうかを判定するために使用されます。ブール値が返されます。この操作は引数`O`（オブジェクト）と`P`（プロパティキー）を使って呼び出されます。この抽象操作は以下の手順を実行します：
>
> 1. 確認：`Type(O)`は`Object`である。
> 2. 確認：`IsPropertyKey(P)`は`true`である。
> 3. `desc`を`? O.[[GetOwnProperty]](P)`とする。
> 4. `desc`が`undefined`の場合、`false`を返す。
> 5. `true`を返す。
:::

しかし、「抽象操作」とは何でしょうか？ `[[ ]]`の中にあるものは何ですか？関数の前の`?`は何を意味しているのでしょうか？その確認文はどういう意味ですか？

調べていきましょう！

## 言語型と仕様型

見慣れたものから始めましょう。仕様では、`undefined`、`true`、`false`など、JavaScriptから既に知っている値を使用します。これらはすべて[**言語値**](https://tc39.es/ecma262/#sec-ecmascript-language-types)、つまり仕様が定義する**言語型**の値です。

仕様は内部的にも言語値を使用します。例えば、内部データ型が`true`と`false`の値を持つフィールドを含む場合があります。一方、JavaScriptエンジンは通常、内部的に言語値を使用しません。例えば、JavaScriptエンジンがC++で記述されている場合、C++の`true`と`false`を使用することが一般的で、JavaScriptの`true`と`false`を内部表現として使用することはありません。

言語型に加えて、仕様は[**仕様型**](https://tc39.es/ecma262/#sec-ecmascript-specification-types)も使用します。これは仕様の中だけに現れる型であり、JavaScript言語には存在しません。JavaScriptエンジンはこれを実装する必要はありません（ただし自由に実装することはできます）。このブログ記事では、仕様型レコード（およびそのサブタイプのCompletion Record）について知ることになります。

## 抽象操作

[**抽象操作**](https://tc39.es/ecma262/#sec-abstract-operations)は、ECMAScript仕様で定義される関数で、仕様を簡潔に記述する目的で定義されています。JavaScriptエンジンはそれらをエンジン内で別々の関数として実装する必要はありません。それらはJavaScriptから直接呼び出すことはできません。

## 内部スロットと内部メソッド

[**内部スロット**および**内部メソッド**](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots)では、名前を`[[ ]]`で囲んでいます。

内部スロットは、JavaScriptオブジェクトや仕様型のデータメンバーで、オブジェクトの状態を保存するために使用されます。内部メソッドは、JavaScriptオブジェクトのメンバー関数です。

例えば、すべてのJavaScriptオブジェクトには、内部スロット`[[Prototype]]`と内部メソッド`[[GetOwnProperty]]`があります。

内部スロットとメソッドはJavaScriptからアクセスできません。例えば、`o.[[Prototype]]`にアクセスしたり、`o.[[GetOwnProperty]]()`を呼び出すことはできません。JavaScriptエンジンはこれらを内部的に使用するために実装することができますが、必ずしもそうする必要はありません。

内部メソッドは、通常、同名の抽象操作に委任する場合があります。例えば、通常オブジェクトの`[[GetOwnProperty]]`に関しては：

:::ecmascript-algorithm
> **[`[[GetOwnProperty]](P)`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-getownproperty-p)**
>
> `O` の `[[GetOwnProperty]]` 内部メソッドがプロパティキー `P` と共に呼び出されるとき、以下のステップを実行する:
>
> 1. `! OrdinaryGetOwnProperty(O, P)` を返す。
:::

（感嘆符が何を意味するのかについては次の章で学びます。）

`OrdinaryGetOwnProperty` は内部メソッドではありません。オブジェクトと関連付けられているわけではないので、代わりに操作対象のオブジェクトがパラメータとして渡されます。

`OrdinaryGetOwnProperty` は「通常」と呼ばれるのは、通常のオブジェクトに対して操作するためです。ECMAScript のオブジェクトは **通常 (ordinary)** か **特殊 (exotic)** のいずれかです。通常のオブジェクトは、**基本的な内部メソッド (essential internal methods)** と呼ばれる一連のメソッドのデフォルトの挙動を持たなければなりません。オブジェクトがデフォルトの挙動から逸脱する場合、それは特殊なオブジェクトとなります。

最もよく知られている特殊なオブジェクトは `Array` です。`length` プロパティが非デフォルトな方法で動作するためです: `length` プロパティを設定すると、`Array` から要素が削除される可能性があります。

基本的な内部メソッドは [こちら](https://tc39.es/ecma262/#table-5) にリストされています。

## 完了記録 (Completion records)

では、疑問符や感嘆符についてはどうでしょうか？それらを理解するためには、[**完了記録 (Completion Records)**](https://tc39.es/ecma262/#sec-completion-record-specification-type) を調べる必要があります！

完了記録は仕様タイプであり（仕様目的でのみ定義されています）、JavaScript エンジンにはそれに対応する内部データ型は不要です。

完了記録は「記録」であり、固定された名前付きフィールドのセットを持つデータ型です。完了記録には以下の3つのフィールドがあります:

:::table-wrapper
| 名前         | 説明                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `[[Type]]`   | 以下のいずれか: `normal`, `break`, `continue`, `return`, `throw`。`normal` を除くすべての型は **急停止完了 (abrupt completions)** を意味します。                   |
| `[[Value]]`  | 完了が発生した際に生成された値。例えば、関数の戻り値や例外（スローされた場合）。 |
| `[[Target]]` | 指定された制御転送に使用される（このブログ記事では関連しません）。                                                                     |
:::

すべての抽象操作は暗黙的に完了記録を返します。それが単純な型（例えば Boolean）のように見えても、それは暗黙的に `normal` 型の完了記録にラップされます（[暗黙の完了値](https://tc39.es/ecma262/#sec-implicit-completion-values) を参照）。

注意点 1: 仕様はこの点で完全に一貫しているわけではありません。一部の補助関数は裸の値を返し、その返り値がそのまま使用され、完了記録から値を抽出することはありません。通常、文脈から明確になります。

注意点 2: 仕様編集者たちは、完了記録の扱いをより明示的にする方向を検討しています。

アルゴリズムが例外をスローする場合、それは `[[Type]]` が `throw` の完了記録を返し、その `[[Value]]` が例外オブジェクトとなることを意味します。今回は `break`, `continue`, `return` タイプについては無視します。

[`ReturnIfAbrupt(argument)`](https://tc39.es/ecma262/#sec-returnifabrupt) は以下のステップを意味します:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. `argument` が急停止の場合、`argument` を返す。
> 2. `argument` を `argument.[[Value]]` に設定する。
<!-- markdownlint-enable blanks-around-lists -->
:::

つまり、完了記録を調べ、急停止完了の場合は即座に返ります。それ以外の場合は、完了記録から値を抽出します。

`ReturnIfAbrupt` は関数呼び出しのように見えるかもしれませんが、そうではありません。`ReturnIfAbrupt()` が出現する関数自体を返すことを意味し、`ReturnIfAbrupt` 関数そのものではありません。それは C 言語のような言語のマクロのように動作します。

`ReturnIfAbrupt` は次のように使用できます:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. `obj` を `Foo()` とする。(`obj` は完了記録である。)
> 2. `ReturnIfAbrupt(obj)`。
> 3. `Bar(obj)`。（ここまでたどり着ける場合、`obj` は完了記録から抽出された値である。）
<!-- markdownlint-enable blanks-around-lists -->
:::

そして、[疑問符](https://tc39.es/ecma262/#sec-returnifabrupt-shorthands) が登場: `? Foo()` は `ReturnIfAbrupt(Foo())` と同等です。略記法を使用することで、エラー処理コードを毎回明示的に書く必要性がなくなります。

同様に、`Let val be ! Foo()` は以下と同等です:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. `val` を `Foo()` とする。
> 2. `val` が急停止完了でないことをアサートする。
> 3. `val` を `val.[[Value]]` に設定する。
<!-- markdownlint-enable blanks-around-lists -->
:::

この知識を使って、`Object.prototype.hasOwnProperty` を次のように書き換えることができます:

:::ecmascript-algorithm
> **`Object.prototype.hasOwnProperty(V)`**
>
> 1. `P` を `ToPropertyKey(V)` とする。
> 2. `P` が突然の完了である場合、`P` を返す。
> 3. `P` を `P.[[Value]]` にセットする。
> 4. `O` を `ToObject(this value)` とする。
> 5. `O` が突然の完了である場合、`O` を返す。
> 6. `O` を `O.[[Value]]` にセットする。
> 7. `temp` を `HasOwnProperty(O, P)` とする。
> 8. `temp` が突然の完了である場合、`temp` を返す。
> 9. `temp` を `temp.[[Value]]` にセットする。
> 10. `NormalCompletion(temp)` を返す。
:::

…そして `HasOwnProperty` を次のように書き直すことができます：

:::ecmascript-algorithm
> **`HasOwnProperty(O, P)`**
>
> 1. 確認: `Type(O)` は `Object` である。
> 2. 確認: `IsPropertyKey(P)` が `true` である。
> 3. `desc` を `O.[[GetOwnProperty]](P)` とする。
> 4. `desc` が突然の完了である場合、`desc` を返す。
> 5. `desc` を `desc.[[Value]]` にセットする。
> 6. `desc` が `undefined` の場合、`NormalCompletion(false)` を返す。
> 7. `NormalCompletion(true)` を返す。
:::

`[[GetOwnProperty]]` 内部メソッドを感嘆符なしで書き直すこともできます：

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> **`O.[[GetOwnProperty]]`**
>
> 1. `temp` を `OrdinaryGetOwnProperty(O, P)` とする。
> 2. 確認: `temp` は突然の完了ではない。
> 3. `temp` を `temp.[[Value]]` にセットする。
> 4. `NormalCompletion(temp)` を返す。
<!-- markdownlint-enable blanks-around-lists -->
:::

ここでは、`temp` が他と衝突しない全く新しい一時変数であると仮定しています。

また、return 文が完了記録以外のものを返す場合、それが暗黙的に `NormalCompletion` にラップされるという知識も利用しています。

### 付随話題: `Return ? Foo()`

仕様では `Return ? Foo()` という表記が使用されています — なぜ疑問符？

`Return ? Foo()` は次のように展開されます：

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. `temp` を `Foo()` とする。
> 2. `temp` が突然の完了である場合、`temp` を返す。
> 3. `temp` を `temp.[[Value]]` にセットする。
> 4. `NormalCompletion(temp)` を返す。
<!-- markdownlint-enable blanks-around-lists -->
:::

これは `Return Foo()` と同じであり、突然の完了と通常の完了の両方に対して同じように振る舞います。

`Return ? Foo()` は編集の理由だけで使用されており、`Foo` が完了記録を返すことをより明確に示すためのものです。

## アサーション

仕様内のアサーションはアルゴリズムの不変条件を主張します。これらは明確さのために追加されていますが、実装に要件を追加するものではありません — 実装はそれらを確認する必要はありません。

## 続き

抽象操作は他の抽象操作に委任します（以下の図を参照してください）が、このブログ記事に基づいてそれらが何をするかを理解できるはずです。プロパティ記述子にも遭遇しますが、それは別の仕様型です。

![`Object.prototype.hasOwnProperty` から始まる関数コールグラフ](/_img/understanding-ecmascript-part-1/call-graph.svg)

## 要約

単純なメソッド — `Object.prototype.hasOwnProperty` — およびそれが呼び出す **抽象操作** を詳しく調べました。エラーハンドリングに関連する短縮記号 `?` および `!` を確認しました。**言語型**、**仕様型**、**内部スロット**、および **内部メソッド** にも遭遇しました。

## 役に立つリンク

[ECMAScript仕様の読み方](https://timothygu.me/es-howto/): 本投稿で取り上げた内容の多くを、若干異なる角度から網羅しているチュートリアル。
