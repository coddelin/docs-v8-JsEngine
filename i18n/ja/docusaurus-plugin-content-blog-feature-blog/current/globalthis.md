---
title: "globalThis"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-07-16
tags:
  - ECMAScript
  - ES2020
  - Node.js 12
  - io19
description: "globalThisは、スクリプトの目標に関係なく、任意のJavaScript環境でグローバルthisにアクセスするための統一されたメカニズムを導入します。"
tweet: "1151140681374547969"
---
もし以前にWebブラウザで使用するJavaScriptを書いたことがあるなら、グローバル`this`にアクセスするために`window`を使用した可能性があります。Node.jsでは、`global`を使ったことがあるかもしれません。どちらの環境でも動作するコードを書く場合、利用可能なものを検出して使用してきたかもしれませんが、サポートする環境とユースケースの数が増えるごとにチェックすべき識別子のリストは増加します。それはすぐに管理ができなくなります：

<!--truncate-->
```js
// グローバル`this`を取得するための素朴な試み。これは使用しないでください！
const getGlobalThis = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  // 注意: これでも間違った結果を返す可能性があります！
  if (typeof this !== 'undefined') return this;
  throw new Error('グローバル`this`を見つけることができませんでした');
};
const theGlobalThis = getGlobalThis();
```

上記のアプローチがなぜ不十分なのか（およびさらに複雑な手法）についての詳細は、[_普遍的なJavaScriptにおける恐ろしい`globalThis`ポリフィル_](https://mathiasbynens.be/notes/globalthis)をご覧ください。

[`globalThis`プロポーザル](https://github.com/tc39/proposal-global)は、JavaScriptの環境（ブラウザ、Node.js、またはその他）に関係なく、スクリプトの目標（従来のスクリプトまたはモジュール？）に関係なくグローバル`this`にアクセスするための*統一*されたメカニズムを導入します。

```js
const theGlobalThis = globalThis;
```

最新のコードでは、グローバル`this`にアクセスする必要がないかもしれません。JavaScriptモジュールを使えば、グローバルな状態をいじるのではなく、機能を宣言的に`import`および`export`できます。しかし、`globalThis`はポリフィルやその他のグローバルアクセスを必要とするライブラリにとって依然として有用です。

## `globalThis`のサポート

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-globalthis"></feature-support>
