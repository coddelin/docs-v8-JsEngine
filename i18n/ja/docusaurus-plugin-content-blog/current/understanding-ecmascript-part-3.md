---
title: &apos;ECMAScript仕様を理解する, 第3部&apos;
author: &apos;[Marja Hölttä](https://twitter.com/marjakh), 推測的仕様観察者&apos;
avatars:
  - marja-holtta
date: 2020-04-01
tags:
  - ECMAScript
  - ECMAScriptを理解する
description: &apos;ECMAScript仕様の読み方に関するチュートリアル&apos;
tweet: &apos;1245400717667577857&apos;
---

[すべてのエピソード](/blog/tags/understanding-ecmascript)

このエピソードでは、ECMAScript言語の定義とその構文についてさらに深掘りします。文脈自由文法に馴染みのない方は、今が基礎を確認する良いタイミングです。仕様では言語を定義するために文脈自由文法を使用しています。親しみやすい紹介として["Crafting Interpreters"の文脈自由文法に関する章](https://craftinginterpreters.com/representing-code.html#context-free-grammars)を参照するか、より数学的な定義については[Wikipediaのページ](https://en.wikipedia.org/wiki/Context-free_grammar)をご覧ください。

<!--truncate-->
## ECMAScript文法

ECMAScript仕様では、次の4つの文法が定義されています:

[字句文法](https://tc39.es/ecma262/#sec-ecmascript-language-lexical-grammar)は、[ユニコードコードポイント](https://en.wikipedia.org/wiki/Unicode#Architecture_and_terminology)がどのように**入力要素**（トークン、行終端子、コメント、空白）に変換されるかを記述しています。

[構文文法](https://tc39.es/ecma262/#sec-syntactic-grammar)は、構文的に正しいプログラムがどのようにトークンで構成されるかを定義します。

[RegExp文法](https://tc39.es/ecma262/#sec-patterns)は、ユニコードコードポイントがどのように正規表現に変換されるかを記述します。

[数値文字列文法](https://tc39.es/ecma262/#sec-tonumber-applied-to-the-string-type)は、文字列がどのように数値に変換されるかを記述します。

各文法は一連の生成規則からなる文脈自由文法として定義されています。

文法は若干異なる記法を使用します：構文文法は`LeftHandSideSymbol :`を使用し、字句文法とRegExp文法は`LeftHandSideSymbol ::`を使用し、数値文字列文法は`LeftHandSideSymbol :::`を使用します。

次に、字句文法と構文文法についてさらに詳しく見ていきます。

## 字句文法

仕様では、ECMAScriptのソーステキストをユニコードコードポイントのシーケンスと定義しています。たとえば、変数名はASCII文字に限定されず、他のユニコード文字も含むことができます。仕様は実際のエンコーディング（例: UTF-8やUTF-16）については言及せず、ソースコードがすでにそのエンコーディングに基づいてユニコードコードポイントのシーケンスに変換されていると仮定しています。

ECMAScriptソースコードを事前にトークン化することは不可能です。そのため、字句文法の定義は少し複雑になります。

たとえば、`/`が除算演算子なのかRegExpの開始なのかは、それが現れる文脈を見ないと判断できません:

```js
const x = 10 / 5;
```

ここでは`/`は`DivPunctuator`です。

```js
const r = /foo/;
```

ここでは最初の`/`は`RegularExpressionLiteral`の開始です。

テンプレートでも同様の曖昧さが生じます — <code>}`</code>の解釈はその発生する文脈に依存します:

```js
const what1 = &apos;temp&apos;;
const what2 = &apos;late&apos;;
const t = `I am a ${ what1 + what2 }`;
```

ここでは<code>\`I am a $\{</code>は`TemplateHead`であり、<code>\}\`</code>は`TemplateTail`です。

```js
if (0 == 1) {
}`not very useful`;
```

ここでは`}`は`RightBracePunctuator`であり、<code>\`</code>は`NoSubstitutionTemplate`の開始です。

`/`や<code>}`</code>の解釈がその“文脈” — コードの構文構造における位置 — に依存するにもかかわらず、次に説明する文法は依然として文脈自由です。

字句文法は、ある入力要素が許容される文脈とそうではない文脈を区別するためにいくつかの目標記号を使用します。たとえば、目標記号`InputElementDiv`は`/`が除算であり、`/=`が除算代入である文脈で使用されます。[`InputElementDiv`](https://tc39.es/ecma262/#prod-InputElementDiv)生成規則は、この文脈で生成可能なトークンを一覧にしています:

```grammar
InputElementDiv ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  DivPunctuator
  RightBracePunctuator
```

この文脈では、`/`に遭遇すると`DivPunctuator`入力要素が生成されます。ここで`RegularExpressionLiteral`を生成することはできません。

一方で、[`InputElementRegExp`](https://tc39.es/ecma262/#prod-InputElementRegExp)は`/`がRegExpの始まりである文脈における目標記号です:

```grammar
InputElementRegExp ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  RightBracePunctuator
  RegularExpressionLiteral
```

生成規則からわかるように、ここでは`RegularExpressionLiteral`入力要素を生成する可能性はありますが、`DivPunctuator`を生成することはできません。

同様に、`RegularExpressionLiteral`に加えて`TemplateMiddle`と`TemplateTail`が許可されるコンテキストの場合には、別の目標シンボル`InputElementRegExpOrTemplateTail`があります。最後に、`RegularExpressionLiteral`は許可されず、`TemplateMiddle`と`TemplateTail`のみが許可されるコンテキストには、目標シンボル`InputElementTemplateTail`があります。

実装では、構文解析器（“parser”）が辞書解析器（“tokenizer”または“lexer”）を呼び出して、目標シンボルをパラメータとして渡し、その目標シンボルに適した次の入力要素を要求することがあります。

## 構文文法

前述の辞書文法では、Unicodeコードポイントからトークンを構築する方法を規定しました。構文文法はそれを基にして構築され、構文的に正しいプログラムがトークンからどのように構成されるかを規定します。

### 例: レガシー識別子の許容

文法に新しいキーワードを導入することは、既存コードが識別子としてすでにそのキーワードを使用している場合に壊れる可能性がある変更となります。

例えば、`await`がキーワードになる前に、次のようなコードが書かれていたかもしれません:

```js
function old() {
  var await;
}
```

ECMAScript文法は、このコードが引き続き動作するよう、`await`キーワードを慎重に追加しました。非同期関数内では`await`がキーワードなので、次のようなコードは動作しません:

```js
async function modern() {
  var await; // 構文エラー
}
```

`yield`を非ジェネレーターで識別子として許可し、ジェネレーターでは許可しない仕組みも同様に機能します。

`await`を識別子として許可する方法を理解するには、ECMAScript特有の構文文法記法を理解する必要があります。では、実際に見てみましょう！

### 生成規則と略記法

[`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement) の生成規則がどのように定義されているか見てみましょう。一見すると、文法は少し難解に見えるかもしれません:

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

添え字 (`[Yield, Await]`) と接頭辞 (`+` や `?` の記号) にはどのような意味があるのでしょうか？

この記法については、[文法記法](https://tc39.es/ecma262/#sec-grammar-notation)セクションで説明されています。

添え字は、左辺記号のセットに対して生成規則のセットを一度に表現する略記法です。左辺記号には2つのパラメーターがあり、これにより4つの「実際の」左辺記号に展開されます: `VariableStatement`, `VariableStatement_Yield`, `VariableStatement_Await`, および `VariableStatement_Yield_Await`。

ここで、単なる`VariableStatement`は「`_Await`も`_Yield`もない`VariableStatement`」意味します。それを<code>VariableStatement<sub>[Yield, Await]</sub></code>と混同してはいけません。

生成規則の右辺では、略記 `+In` は「`_In`付きのバージョンを使用」、`?Await` は「左辺記号が`_Await`を持つ場合にのみ`_Await`付きのバージョンを使用」を意味します（`?Yield`も同じ）。

略記のもう一つである`~Foo`は、「`_Foo`なしのバージョンを使用」という意味ですが、この規則では使用されていません。

これらの情報を基に、生成規則を次のように展開できます:

```grammar
VariableStatement :
  var VariableDeclarationList_In ;

VariableStatement_Yield :
  var VariableDeclarationList_In_Yield ;

VariableStatement_Await :
  var VariableDeclarationList_In_Await ;

VariableStatement_Yield_Await :
  var VariableDeclarationList_In_Yield_Await ;
```

最終的に、次の2つの点を明らかにする必要があります:

1. `_Await`付きの場合か、`_Await`なしの場合の選択がどこで行われるのか？
2. どこで違いが生じるのか — `Something_Await`と`Something`（`_Await`なしのもの）の生成規則が分岐する箇所はどこか？

### `_Await`有りか無しか？

まず最初に質問1に取り組みましょう。非同期関数と非非同期関数が、関数本体に対してパラメーター`_Await`を選択するかどうかで異なることは簡単に推測できます。非同期関数宣言の生成規則を読むと、[次の規則](https://tc39.es/ecma262/#prod-AsyncFunctionBody)が見つかります:

```grammar
AsyncFunctionBody :
  FunctionBody[~Yield, +Await]
```

`AsyncFunctionBody`にはパラメーターがありませんが、右辺側の`FunctionBody`に追加されます。

この生成規則を展開すると次のようになります:

```grammar
AsyncFunctionBody :
  FunctionBody_Await
```

つまり、非同期関数は`FunctionBody_Await`を持ち、関数本体では`await`がキーワードとして扱われます。

一方で、非非同期関数内では、[関連する生成規則](https://tc39.es/ecma262/#prod-FunctionDeclaration)は次の通りです:

```grammar
FunctionDeclaration[Yield, Await, Default] :
  function BindingIdentifier[?Yield, ?Await] ( FormalParameters[~Yield, ~Await] ) { FunctionBody[~Yield, ~Await] }
```

（`FunctionDeclaration`には別の生成規則がありますが、このコード例には関係ありません。）

組み合わせの展開を避けるため、この特定の生成規則で使用されていない`Default`パラメーターは無視します。

生成規則の展開された形は次の通りです:

```grammar
FunctionDeclaration :
  function BindingIdentifier ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield :
  function BindingIdentifier_Yield ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Await :
  function BindingIdentifier_Await ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield_Await :
  function BindingIdentifier_Yield_Await ( FormalParameters ) { FunctionBody }
```

この生成規則では、`FunctionBody` と `FormalParameters`（`_Yield` および `_Await` を含まない）を常に取得します。これは、展開されていない生成規則で `[~Yield, ~Await]` が付与されているためです。

関数名は異なる扱いを受けます。左辺記号に `_Await` および `_Yield` パラメーターがある場合、それらのパラメーターを取得します。

要約すると、非同期関数は `FunctionBody_Await` をもち、非非同期関数は `_Await` を含まない `FunctionBody` をもちます。非ジェネレーター関数について話しているので、非同期例関数も非非同期例関数も `_Yield` を付与されません。

`FunctionBody` と `FunctionBody_Await` のどちらがどれかを覚えるのは難しいかもしれません。`FunctionBody_Await` は `await` が識別子である関数のためなのか、それとも `await` がキーワードである関数のためなのか？

ここで `_Await` パラメーターは「`await` がキーワードである」ことを意味するように考えることができます。このアプローチは今後の拡張にも対応可能です。新しいキーワード `blob` が導入されたとしても、「blob的」関数の内部でのみ適用される場合、非blob的非非同期非ジェネレーターは現在と同じように `FunctionBody`（`_Await`、`_Yield`、または `_Blob` を含まない）を持ちます。blob的関数は `FunctionBody_Blob` をもち、非同期blob的関数は `FunctionBody_Await_Blob` を持つなどです。この場合でも `Blob` の添字を生成規則に追加する必要がありますが、既存の関数の展開された `FunctionBody` の形式には変更はありません。

### `await` を識別子として禁止する

次に、`FunctionBody_Await` 内にいる場合に `await` が識別子として禁止される仕組みを確認する必要があります。

生成規則の進行を追うことで、`_Await` パラメーターが `FunctionBody` から私たちが前に見ていた `VariableStatement` 生成規則まで変更されることなく伝播される様子がわかります。

したがって、非同期関数内では `VariableStatement_Await` が存在し、非非同期関数内では `VariableStatement` が存在します。

さらに生成規則を追いかけながら、パラメーターの追跡を続けることができます。[`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement) の生成規則は以下の通りです:

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

[`VariableDeclarationList`](https://tc39.es/ecma262/#prod-VariableDeclarationList) のすべての生成規則はパラメーターをそのまま保持します:

```grammar
VariableDeclarationList[In, Yield, Await] :
  VariableDeclaration[?In, ?Yield, ?Await]
```

(ここでは例に関連する [生成規則](https://tc39.es/ecma262/#prod-VariableDeclaration) のみを示しています。)

```grammar
VariableDeclaration[In, Yield, Await] :
  BindingIdentifier[?Yield, ?Await] Initializer[?In, ?Yield, ?Await] opt
```

`opt` の略語は右辺記号が任意であることを意味します。実際にはオプション記号がある生成規則とない生成規則の2つがあります。

例に関連する単純なケースでは、`VariableStatement` はキーワード `var`、後に初期化子なしで単一の `BindingIdentifier`、およびセミコロンで終わります。

`await` を `BindingIdentifier` として禁止または許可するために、以下のようなものが得られることを期待しています:

```grammar
BindingIdentifier_Await :
  Identifier
  yield

BindingIdentifier :
  Identifier
  yield
  await
```

これにより、非同期関数内では `await` を識別子として禁止し、非非同期関数内では識別子として許可することができます。

しかし、仕様はこのように定義されておらず、代わりに以下の [生成規則](https://tc39.es/ecma262/#prod-BindingIdentifier) が見つかります:

```grammar
BindingIdentifier[Yield, Await] :
  Identifier
  yield
  await
```

展開すると、次の生成規則になります:

```grammar
BindingIdentifier_Await :
  Identifier
  yield
  await

BindingIdentifier :
  Identifier
  yield
  await
```

(ここでは例に不要な `BindingIdentifier_Yield` および `BindingIdentifier_Yield_Await` の生成規則は省略しています。)

これは、`await` と `yield` が常に識別子として許可されるように見えます。それはどういうことでしょうか？この記事全体が無駄なのでしょうか？

### 静的意味が救う

実際には、非同期関数内で `await` を識別子として禁止するためには**静的意味**が必要になります。

静的意味は静的なルール、つまりプログラムが実行される前にチェックされるルールを記述します。

この場合、[`BindingIdentifier` の静的意味](https://tc39.es/ecma262/#sec-identifiers-static-semantics-early-errors) は次の構文指導ルールを定義しています:

> ```grammar
> BindingIdentifier[Yield, Await] : await
> ```
>
> この生成規則が <code><sub>[Await]</sub></code> パラメーターを持つ場合、文法エラーになります。

これは効果的に `BindingIdentifier_Await : await` の生成規則を禁止します。

仕様書では、この生成規則を持ちながら静的意味論において構文エラーとして定義する理由は、自動セミコロン挿入（ASI）との干渉によるものだと説明されています。

ASIは、文法生成規則に従ってコードの行を解析できない場合に発動します。ASIは、文や宣言がセミコロンで終わらなければならない要件を満たすためにセミコロンを追加しようとします。（ASIについては後のエピソードで詳しく説明します。）

次のコードを考えてください（仕様書の例より）：

```js
async function too_few_semicolons() {
  let
  await 0;
}
```

もし文法が `await` を識別子として許可しない場合、ASIが発動し、次のような文法的に正しいコードに変換します。このコードでは `let` も識別子として使用されています：

```js
async function too_few_semicolons() {
  let;
  await 0;
}
```

ASIとのこのような干渉は非常に混乱を招くため、静的意味論が使用され、`await` を識別子として許可しない措置が取られました。

### 識別子の`StringValues`の禁止

関連するもう一つのルールがあります：

> ```grammar
> BindingIdentifier : Identifier
> ```
>
> この生成規則が<code><sub>[Await]</sub></code>パラメーターを持ち、`Identifier`の`StringValue`が`"await"`の場合、それは構文エラーとなります。

最初は少し混乱するかもしれませんが、[`Identifier`](https://tc39.es/ecma262/#prod-Identifier)は次のように定義されています：

<!-- markdownlint-disable no-inline-html -->
```grammar
Identifier :
  IdentifierName but not ReservedWord
```
<!-- markdownlint-enable no-inline-html -->

`await`は`ReservedWord`なので、`Identifier`が`await`になることはありません。

実際には、`Identifier`が`await`になることはなく、しかし`StringValue`が`"await"`である別のものになる可能性があります — 文字列シーケンス`await`の異なる表現です。

[識別子名の静的意味論](https://tc39.es/ecma262/#sec-identifier-names-static-semantics-stringvalue)は、識別子名の`StringValue`がどのように計算されるかを定義しています。例えば、Unicodeエスケープシーケンスで`a`を表すのは`\u0061`なので、`\u0061wait`は`StringValue`が`"await"`になります。`\u0061wait`は字句構文ではキーワードとして認識されず、代わりに`Identifier`となります。静的意味論によりこれは非同期関数内で変数名として使用することは禁止されています。

したがって、次は動作します：

```js
function old() {
  var \u0061wait;
}
```

これは動作しません：

```js
async function modern() {
  var \u0061wait; // 構文エラー
}
```

## まとめ

このエピソードでは、字句構文、構文構文、そして構文構文を定義するために使用される省略表記に慣れました。例として、非同期関数内で`await`を識別子として使用することを禁止し、非非同期関数内では許可するという点を掘り下げました。

自動セミコロン挿入やカバー構文など、構文構文の他の興味深い部分については後のエピソードで取り上げますので、お楽しみに！
