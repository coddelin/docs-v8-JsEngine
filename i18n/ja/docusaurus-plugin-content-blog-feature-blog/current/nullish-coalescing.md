---
title: "ヌリッシュ合体"
author: "ジャスティン・リッジウェル"
avatars:
  - "justin-ridgewell"
date: 2019-09-17
tags:
  - ECMAScript
  - ES2020
description: "JavaScriptのヌリッシュ合体演算子は、より安全なデフォルト式を可能にします。"
tweet: "1173971116865523714"
---
ヌリッシュ合体提案 [nullish coalescing proposal](https://github.com/tc39/proposal-nullish-coalescing/) (`??`) は、デフォルト値を処理するために設計された新しいショートサーキット演算子を追加します。

既に他のショートサーキット演算子 `&&` と `||` に慣れているかもしれません。これらの両演算子は「truthy」と「falsy」の値を扱います。コード例 `lhs && rhs` を想像してください。もし `lhs` (左辺) が falsy なら、式は `lhs` を評価します。それ以外の場合、式は `rhs` (右辺) を評価します。コード例 `lhs || rhs` の場合、その逆が真となります。もし `lhs` が truthy なら、式は `lhs` を評価します。それ以外の場合、式は `rhs` を評価します。

<!--truncate-->
では、「truthy」と「falsy」とは具体的に何を意味するのでしょうか? スペックの用語では、これらは [`ToBoolean`](https://tc39.es/ecma262/#sec-toboolean) 抽象操作に相当します。通常のJavaScript開発者にとっては、**すべての値**がtruthyですが、一部のfalsy値には`undefined`、`null`、`false`、`0`、`NaN`、空文字列`''`が含まれます。（技術的には`document.all`に関連する値もfalsyですが、それについては後ほど触れます。）

では、`&&`および`||`の問題点は何でしょうか？そして、なぜ新しいヌリッシュ合体演算子が必要なのでしょうか？それはtruthyとfalsyの定義がすべてのシナリオに適合せず、これがバグにつながるためです。以下を想像してください。

```js
function Component(props) {
  const enable = props.enabled || true;
  // …
}
```

この例では、`enabled`プロパティをコンポーネント内の機能が有効化されているかどうかを制御するオプションのブールプロパティとして扱います。つまり、`enabled`を明示的に`true`または`false`に設定できます。しかし、これは_オプション_プロパティであるため、設定を省略することで暗黙的に`undefined`に設定できます。`undefined`の場合、コンポーネントを`enabled = true`（デフォルト値）として扱いたいと考えています。

この時点で、コード例にバグがあることに気づくことができると思います。`enabled = true`を明示的に設定すると、`enable`変数は`true`になります。設定を省略して暗黙的に`enabled = undefined`とすると、`enable`変数は`true`になります。しかし、`enabled = false`を明示的に設定しても、`enable`変数は引き続き`true`になります！本来の意図は値をデフォルトで`true`にすることでしたが、実際には値を強制してしまいました。この場合の修正は期待する値について非常に明示的になることです。

```js
function Component(props) {
  const enable = props.enabled !== false;
  // …
}
```

この種のバグはすべてのfalsy値で頻繁に発生します。これが非常に簡単にオプションの文字列（空文字列`''`が有効な入力と見なされる場合）やオプションの数値（`0`が有効な入力と見なされる場合）に関連する場合があるのです。この問題があまりにも一般的であるため、このようなデフォルト値割り当てを処理するためにヌリッシュ合体演算子を導入しています。

```js
function Component(props) {
  const enable = props.enabled ?? true;
  // …
}
```

ヌリッシュ合体演算子（`??`）は`||`演算子に非常に似ていますが、演算子を評価する際に「truthy」を使用しません。その代わりに「nullish」の定義、つまり「値が`null`または`undefined`と厳密に等しいか」を使用します。式`lhs ?? rhs`を想像してください。もし`lhs`がnullishでないなら、式は`lhs`を評価します。それ以外の場合、式は`rhs`を評価します。

具体的には、`false`、`0`、`NaN`、空文字列`''`はすべてfalsy値であるがnullishではありません。そのようなfalsyであるがnullishでない値が`lhs ?? rhs`の左辺である場合、式は右辺ではなくそれらを評価します。バグを撃退！

```js
false ?? true;   // => false
0 ?? 1;          // => 0
'' ?? 'default'; // => ''

null ?? [];      // => []
undefined ?? []; // => []
```

## 分解代入の際のデフォルト割り当てについては？

最後のコード例は、オブジェクトで分解代入を使用してデフォルト割り当てを行うことで解決できることに気付いたかもしれません。

```js
function Component(props) {
  const {
    enabled: enable = true,
  } = props;
  // …
}
```

やや説明的な記述ですが、完全に有効なJavaScriptです。ただし、多少異なるセマンティクスを使用します。オブジェクト分解内のデフォルト割り当ては、プロパティが`undefined`と厳密に等しい場合に割り当てをデフォルトにします。

しかし、`undefined`のみを対象にした厳密な等価テストは常に望ましいわけではなく、分解対象のオブジェクトが必ずしも利用可能であるわけではありません。例えば、関数の返り値（分解するオブジェクトがない場合）のデフォルト化、または関数が`null`（DOM APIでは一般的）を返す場合などです。このような時にヌリッシュ合体を使用すべきなのです。

```js
// 簡潔なヌリッシュ合体
const link = document.querySelector('link') ?? document.createElement('link');

// デフォルトのアサインメント構文でボイラープレート
const {
  link = document.createElement('link'),
} = {
  link: document.querySelector('link') || undefined
};
```

さらに、[optional chaining](/features/optional-chaining)のような新しい機能の一部は、分割代入とうまく動作しない場合があります。分割代入ではオブジェクトが必要なため、optional chainingが`undefined`を返したときに例外処理をする必要があります。一方で、nullish coalescingではそのような問題はありません。

```js
// Optional chainingとnullish coalescingの組み合わせ
const link = obj.deep?.container.link ?? document.createElement('link');

// Optional chainingを使用したデフォルトの分割代入
const {
  link = document.createElement('link'),
} = (obj.deep?.container || {});
```

## 演算子のミックスとマッチ

言語設計は難しいもので、開発者の意図に曖昧さが生じることなく新しい演算子を作るのは簡単ではありません。例えば、`&&`と`||`演算子を混在させたことがあるなら、この曖昧さに直面したことがあるでしょう。例えば、式`lhs && middle || rhs`を考えてみましょう。JavaScriptでは、これは実際には`(lhs && middle) || rhs`として解析されます。一方、式`lhs || middle && rhs`の場合、実際には`lhs || (middle && rhs)`として解析されます。

`&&`演算子は`||`演算子よりも左辺および右辺に対して高い優先順位を持つため、暗黙の括弧は`&&`を囲むように解釈されます。`??`演算子を設計する際には、その優先順位をどのようにするかを決める必要がありました。それには次のような可能性がありました。

1. `&&`や`||`よりも低い優先順位
2. `&&`よりも低く、`||`よりも高い優先順位
3. `&&`や`||`よりも高い優先順位

これらの優先順位定義のそれぞれに対して、4つのテストケースを検討する必要がありました。

1. `lhs && middle ?? rhs`
2. `lhs ?? middle && rhs`
3. `lhs || middle ?? rhs`
4. `lhs ?? middle || rhs`

各テスト式において、暗黙的な括弧がどこに入るべきかを決定しなければなりませんでした。そして、それが開発者の意図した通りに式を正確に包まなければ、不適切なコードを書くことになる可能性があります。残念ながら、どの優先順位レベルを選んでもあるテスト式が開発者の意図を侵害する可能性がありました。

最終的に、`??`と（`&&`または`||`）を混在させる際は明示的な括弧が必要とされる設計にしました。（括弧表示のグループについても明確にしました！ミタジョーク！）演算子グループの1つを括弧で囲まないと構文エラーが発生します。

```js
// 明示的な括弧グループが混在時に必要
(lhs && middle) ?? rhs;
lhs && (middle ?? rhs);

(lhs ?? middle) && rhs;
lhs ?? (middle && rhs);

(lhs || middle) ?? rhs;
lhs || (middle ?? rhs);

(lhs ?? middle) || rhs;
lhs ?? (middle || rhs);
```

このようにすれば、言語のパーサーは開発者の意図に常に一致します。また、後からコードを読む人にもすぐに理解できます。素晴らしいですね！

## `document.all`について教えて

[`document.all`](https://developer.mozilla.org/en-US/docs/Web/API/Document/all)は、絶対に使うべきではない特殊な値です。ただし、使用する場合は、それが「truthy」および「nullish」とどのように相互作用するかを知っておくと役立ちます。

`document.all`は配列のようなオブジェクトであり、配列のようにインデックス付きプロパティやlengthを持っています。オブジェクトは通常truthyですが、驚いたことに`document.all`はfalsyな値のように振る舞います！実際には、`null`および`undefined`の両方と緩やかに等しいのです（通常これによってプロパティを持つことができなくなります）。

`&&`または`||`と一緒に使用すると、`document.all`はfalsyのように振る舞います。しかし、厳密には`null`や`undefined`と等しくないため、nullishではありません。このため、`document.all`を`??`とともに使用すると、他のオブジェクトと同じように動作します。

```js
document.all || true; // => true
document.all ?? true; // => HTMLAllCollection[]
```

## nullish coalescingのサポート

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9547"
                 firefox="72 https://bugzilla.mozilla.org/show_bug.cgi?id=1566141"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-nullish-coalescing-operator"></feature-support>
