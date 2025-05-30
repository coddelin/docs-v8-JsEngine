---
title: "動的`import()`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-11-21
tags: 
  - ECMAScript
  - ES2020
description: "動的import()は静的importと比べて新しい可能性を解放します。この記事では両者を比較し、新しい内容の概要を説明します。"
tweet: "932914724060254208"
---
[動的`import()`](https://github.com/tc39/proposal-dynamic-import)は、静的`import`と比べて新しい可能性を引き出す、関数のような形式の新しい`import`を導入します。この記事では両者を比較し、新しい内容の概要を説明します。

<!--truncate-->
## 静的`import`（おさらい）

Chrome 61では、[モジュール](/features/modules)内でのES2015 `import`ステートメントのサポートが出荷されました。

`./utils.mjs`にある次のモジュールを考えてみましょう:

```js
// デフォルトエクスポート
export default () => {
  console.log('デフォルトエクスポートからこんにちは！');
};

// 名前付きエクスポート`doStuff`
export const doStuff = () => {
  console.log('作業中…');
};
```

`./utils.mjs`モジュールを静的にインポートして使用する方法は次の通りです:

```html
<script type="module">
  import * as module from './utils.mjs';
  module.default();
  // → 'デフォルトエクスポートからこんにちは！'をログに出力
  module.doStuff();
  // → '作業中…'をログに出力
</script>
```

:::note
**注記:** 上記の例では`.mjs`拡張子を使用して、それが通常のスクリプトではなくモジュールであることを示しています。ただし、Webではファイル拡張子はあまり重要ではなく、ファイルが正しいMIMEタイプ（例: JavaScriptファイルの場合`text/javascript`）で`Content-Type` HTTPヘッダーで提供されていれば問題ありません。

`.mjs`拡張子は、[Node.js](https://nodejs.org/api/esm.html#esm_enabling)や[`d8`](/docs/d8)など他のプラットフォームで特に有用です。これらのプラットフォームでは、MIMEタイプや`type="module"`のようなスクリプトとモジュールを区別するための必須フックの概念がありません。一貫性を持たせるため、そしてモジュールと通常のスクリプトを明確に区別するため、この拡張子を使用しています。
:::

モジュールをインポートするこの構文形式は*静的*宣言です: モジュール指定子として文字列リテラルのみを受け入れ、実行前の「リンク」プロセスを介してローカルスコープにバインディングを作成します。静的`import`構文はファイルのトップレベルでのみ使用できます。

静的`import`は、静的解析、バンドルツール、ツリーシェイキングなど、重要なユースケースを可能にします。

ただし、次の場合に役立つことがあります:

- オンデマンド（または条件付き）でモジュールをインポートする
- 実行時にモジュール指定子を計算する
- 通常のスクリプト（モジュールではなく）内からモジュールをインポートする

これらのどれも静的`import`で実現することはできません。

## 動的`import()` 🔥

[動的`import()`](https://github.com/tc39/proposal-dynamic-import)はこれらのユースケースに対応する新しい関数のような形式の`import`を導入します。`import(moduleSpecifier)`は、依存モジュールすべておよびそのモジュール自体をフェッチ、インスタンス化、評価した後に作成される、要求されたモジュールの名前空間オブジェクトのPromiseを返します。

`./utils.mjs`モジュールを動的にインポートして使用する方法を以下に示します:

```html
<script type="module">
  const moduleSpecifier = './utils.mjs';
  import(moduleSpecifier)
    .then((module) => {
      module.default();
      // → 'デフォルトエクスポートからこんにちは！'をログに出力
      module.doStuff();
      // → '作業中…'をログに出力
    });
</script>
```

`import()`はPromiseを返すため、`then`ベースのコールバックスタイルの代わりに`async`/`await`を使用することも可能です:

```html
<script type="module">
  (async () => {
    const moduleSpecifier = './utils.mjs';
    const module = await import(moduleSpecifier)
    module.default();
    // → 'デフォルトエクスポートからこんにちは！'をログに出力
    module.doStuff();
    // → '作業中…'をログに出力
  })();
</script>
```

:::note
**注記:** `import()`は関数呼び出しのように_見えます_が、カッコを使用する単なる構文として指定されています（[`super()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super)に似ています）。したがって、`import`は`Function.prototype`から継承していないため、`call`や`apply`をすることはできず、`const importAlias = import`のようなことも動作しません。そもそも`import`はオブジェクトですらないのです。しかしこれは実際には問題になりません。
:::

動的`import()`を使用することで、小規模なシングルページアプリケーション内でナビゲーション時にモジュールを遅延ロードする例を以下に示します:

```html
<!DOCTYPE html>
<meta charset="utf-8">
<title>私のライブラリ</title>
<nav>
  <a href="books.html" data-entry-module="books">本</a>
  <a href="movies.html" data-entry-module="movies">映画</a>
  <a href="video-games.html" data-entry-module="video-games">ビデオゲーム</a>
</nav>
<main>オンデマンドでロードされるコンテンツ用のプレースホルダです。</main>
<script>
  const main = document.querySelector('main');
  const links = document.querySelectorAll('nav > a');
  for (const link of links) {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        const module = await import(`/${link.dataset.entryModule}.mjs`);
        // モジュールは`loadPageInto`という名前の関数をエクスポートしています。
        module.loadPageInto(main);
      } catch (error) {
        main.textContent = error.message;
      }
    });
  }
</script>
```

動的`import()`で有効化される遅延読み込み機能は、正しく適用されると非常に強力です。デモとして、[Addy](https://twitter.com/addyosmani)は、すべての依存関係を初回読み込み時に静的にインポートしていた[例のHacker News PWA](https://hnpwa-vanilla.firebaseapp.com/)を変更しました。[更新されたバージョン](https://dynamic-import.firebaseapp.com/)では、動的`import()`を使用してコメントを遅延ロードし、ユーザーが実際に必要とするまでのロード、解析、およびコンパイルコストを回避しています。

:::note
**注:** アプリが別のドメインからスクリプトをインポートする場合（静的または動的）、スクリプトには有効なCORSヘッダー（例: `Access-Control-Allow-Origin: *`）が含まれる必要があります。これは、通常のスクリプトとは異なり、モジュールスクリプト（およびそのインポート）はCORSでフェッチされるためです。
:::

## 推奨事項

静的`import`と動的`import()`はどちらも有用です。それぞれ非常に異なる使用ケースがあります。静的`import`は初回描画の依存関係、特に画面上部のコンテンツに利用してください。それ以外の場合は、要求に応じて動的`import()`で依存関係を読み込むことを検討してください。

## 動的`import()`のサポート

<feature-support chrome="63"
                 firefox="67"
                 safari="11.1"
                 nodejs="13.2 https://nodejs.medium.com/announcing-core-node-js-support-for-ecmascript-modules-c5d6dc29b663"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-syntax-dynamic-import"></feature-support>
