---
title: &apos;トップレベルの`await`&apos;
author: &apos;Myles Borins ([@MylesBorins](https://twitter.com/MylesBorins))&apos;
avatars:
  - &apos;myles-borins&apos;
date: 2019-10-08
tags:
  - ECMAScript
  - Node.js 14
description: &apos;トップレベルの`await`がJavaScriptモジュールに登場！間もなく非同期関数に入ることなく`await`を使用できるようになります。&apos;
tweet: &apos;1181581262399643650&apos;
---
[トップレベルの`await`](https://github.com/tc39/proposal-top-level-await)は、開発者が非同期関数の外部で`await`キーワードを使用できるようにします。それは、他のモジュールがそれらを`import`する際に、モジュールのボディを評価する前に待機する大きな非同期関数のように動作します。

<!--truncate-->
## 従来の動作

`async`/`await`が初めて導入されると、非同期関数の外部で`await`を使用しようとすると`SyntaxError`が発生しました。多くの開発者は即時実行される非同期関数式を利用することで、この機能にアクセスしました。

```js
await Promise.resolve(console.log(&apos;🎉&apos;));
// → SyntaxError: awaitは非同期関数内でのみ有効です

(async function() {
  await Promise.resolve(console.log(&apos;🎉&apos;));
  // → 🎉
}());
```

## 新しい動作

トップレベルの`await`が導入されることで、上記のコードは[モジュール](/features/modules)内で期待通りに動作するようになります。

```js
await Promise.resolve(console.log(&apos;🎉&apos;));
// → 🎉
```

:::note
**注:** トップレベルの`await`はモジュールのトップレベルでのみ機能します。従来のスクリプトや非同期でない関数へのサポートはありません。
:::

## 使用例

これらの使用例は[仕様提案リポジトリ](https://github.com/tc39/proposal-top-level-await#use-cases)から引用されています。

### 動的依存パス

```js
const strings = await import(`/i18n/${navigator.language}`);
```

これにより、モジュールは実行時の値を使用して依存関係を決定することができます。これは開発/本番モードの分割、国際化、環境の分割などに便利です。

### 資源の初期化

```js
const connection = await dbConnector();
```

これはモジュールがリソースを表現することを可能にし、モジュールが使用できない場合にエラーを生成することも可能にします。

### 依存関係のフォールバック

以下の例では、CDN AからJavaScriptライブラリを読み込み、それが失敗した場合はCDN Bにフォールバックします。

```js
let jQuery;
try {
  jQuery = await import(&apos;https://cdn-a.example.com/jQuery&apos;);
} catch {
  jQuery = await import(&apos;https://cdn-b.example.com/jQuery&apos;);
}
```

## モジュールの実行順序

トップレベルの`await`を導入することでJavaScriptにおける最大の変化の1つは、グラフ内でのモジュールの実行順序です。JavaScriptエンジンはモジュールを[後順トラバーサル](https://en.wikibooks.org/wiki/A-level_Computing/AQA/Paper_1/Fundamentals_of_algorithms/Tree_traversal#Post-order)で実行します: モジュールグラフの左端の部分木から始まり、モジュールを評価し、それらのバインディングをエクスポートし、その兄弟を実行し、その後に親を実行します。このアルゴリズムは再帰的に実行され、モジュールグラフのルートを実行するまで続きます。

トップレベルの`await`以前では、この順序は常に同期的かつ決定的でした: コードを複数回実行しても、グラフは同じ順序で実行される保証がありました。トップレベルの`await`が導入されると、その保証は引き続き存在しますが、トップレベルの`await`を使用しない場合に限ります。

モジュールでトップレベルの`await`を使用すると、以下のようになります。

1. 現在のモジュールの実行は、`await`されたPromiseが解決されるまで遅延されます。
1. 子モジュールが`await`を呼び出し、その兄弟がバインディングをエクスポートするまで、親モジュールの実行が遅延されます。
1. 兄弟モジュール、及び親モジュールの兄弟は、グラフ内で循環や他の`await`されたPromiseがない場合に同期的な順序で実行を続けます。
1. `await`を呼び出したモジュールは、`await`されたPromiseが解決された後に実行を再開します。
1. 親モジュールおよびその後のツリーは、他の`await`されたPromiseがない場合は同期的な順序で実行を続けます。

## これはすでにDevToolsで動作していませんか？

実際に動作しています！[Chrome DevTools](https://developers.google.com/web/updates/2017/08/devtools-release-notes#await)、[Node.js](https://github.com/nodejs/node/issues/13209)、Safari Web InspectorのREPLでは、既にトップレベルの`await`をサポートしています。ただし、この機能は標準ではなく、REPLに限定されていました！これは言語仕様の一部であるトップレベルの`await`提案とは異なり、モジュールにのみ適用されます。本番コードでトップレベルの`await`を使用して、それが仕様提案のセマンティクスに完全に一致するかどうかをテストする場合は、DevToolsやNode.js REPLではなく、実際のアプリでテストすることを確実にしてください！

## トップレベルの`await`は問題を引き起こす可能性があるのでは？

おそらく、[Rich Harris](https://twitter.com/Rich_Harris)が作成した[悪名高いジスト](https://gist.github.com/Rich-Harris/0b6f317657f5167663b493c722647221)を目にしたことがあるでしょう。このジストでは、トップレベルの`await`に関する懸念がいくつか初めて提起され、JavaScript言語にその機能を実装しないよう促されました。具体的な懸念事項としては以下が挙げられます:

- トップレベルの`await`が実行をブロックする可能性がある。
- トップレベルの`await`がリソースのフェッチをブロックする可能性がある。
- CommonJSモジュールの明確な相互運用性がない。

提案のステージ3バージョンはこれらの問題に直接対処しています:

- 同じ階層の他のスクリプトは実行を続けられるため、決定的なブロックは発生しません。
- トップレベルの`await`はモジュールグラフの実行フェーズ中に発生します。この時点で、すべてのリソースはすでにフェッチおよびリンクされています。リソースのフェッチをブロックするリスクはありません。
- トップレベルの`await`はモジュールに限定されています。スクリプトやCommonJSモジュールへのサポートは明確にありません。

新しい言語機能には常に予期しない動作のリスクがあります。たとえばトップレベルの`await`の場合、循環モジュール依存がデッドロックを引き起こす可能性があります。

トップレベルの`await`がない場合、多くのJavaScript開発者は`await`にアクセスするために非同期即時実行関数式を使用していました。しかし、このパターンはグラフの実行やアプリケーションの静的解析可能性を低下させます。このような理由から、トップレベルの`await`の欠如は、この機能によって導入される危険性よりも大きなリスクと見なされていました。

## トップレベルの`await`のサポート

<feature-support chrome="89 https://bugs.chromium.org/p/v8/issues/detail?id=9344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519100"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=202484"
                 nodejs="14"
                 babel="no https://github.com/babel/proposals/issues/44"></feature-support>
