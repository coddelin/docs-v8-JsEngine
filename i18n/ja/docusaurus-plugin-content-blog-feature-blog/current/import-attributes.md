---
title: "属性をインポート"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars:
  - "shu-yu-guo"
date: 2024-01-31
tags:
  - ECMAScript
description: "インポート属性: インポートアサーションの進化"
tweet: ""
---

## 以前は

V8はv9.1で[インポートアサーション](https://chromestatus.com/feature/5765269513306112)機能を提供しました。この機能により、モジュールインポート文に`assert`キーワードを使用して追加情報を含めることが可能になりました。この追加情報は現在、JavaScriptモジュール内でJSONやCSSモジュールをインポートするために使用されています。

<!--truncate-->
## インポート属性

その後、インポートアサーションは[インポート属性](https://github.com/tc39/proposal-import-attributes)へと進化しました。この機能の目的は変わらず、モジュールインポート文に追加情報を含めることです。

最も重要な違いは、インポートアサーションがアサート専用の意味を持っていたのに対し、インポート属性はより緩やかな意味を持つようになったことです。アサート専用の意味は、追加情報がモジュールがどのようにロードされるかには影響を与えず、ロードされるかどうかにのみ影響を与えるという意味です。例えば、JSONモジュールは常にそのMIMEタイプによってJSONモジュールとしてロードされ、`assert { type: 'json' }`という条件は、リクエストされたモジュールのMIMEタイプが`application/json`ではない場合にのみロードを失敗させることができます。

しかしながら、アサート専用の意味には致命的な欠点がありました。ウェブでは、リソースの種類に応じてHTTPリクエストの構造が異なります。例えば、[`Accept`ヘッダー](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept)はレスポンスのMIMEタイプに影響を与え、[`Sec-Fetch-Dest`メタデータヘッダー](https://web.dev/articles/fetch-metadata)はウェブサーバがリクエストを受理するか拒否するかに影響を与えます。インポートアサーションではモジュールをどのようにロードするかに影響を与えることができなかったため、HTTPリクエストの構造を変更できませんでした。また、要求されるリソースの種類は利用される[コンテンツセキュリティポリシー](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)にも影響しますが、インポートアサーションは正しくウェブのセキュリティモデルと連携することができませんでした。

インポート属性はアサート専用の意味を緩め、属性がモジュールのロード方法に影響を与えることを許可します。言い換えれば、インポート属性は適切な`Accept`および`Sec-Fetch-Dest`ヘッダーを含むHTTPリクエストを生成することができます。新しい意味に合わせるために、旧`assert`キーワードは`with`に更新されました:

```javascript
// main.mjs
//
// 新しい 'with'構文。
import json from './foo.json' with { type: 'json' };
console.log(json.answer); // 42
```

## 動的な`import()`

[動的な`import()`](https://v8.dev/features/dynamic-import#dynamic)も同様に、`with`オプションを受け入れるよう更新されました。

```javascript
// main.mjs
//
// 新しい 'with'オプション。
const jsonModule = await import('./foo.json', {
  with: { type: 'json' }
});
console.log(jsonModule.default.answer); // 42
```

## `with`の利用可能性

インポート属性はV8 v12.3でデフォルトで有効化されています。

## `assert`の廃止予定と最終的な削除

`assert`キーワードはV8 v12.3で廃止され、v12.6で削除される予定です。代わりに`with`を使用してください！`assert`句の使用は、コンソールに警告を出し、`with`の使用を推奨するメッセージを表示します。

## インポート属性のサポート

<feature-support chrome="123 https://chromestatus.com/feature/5205869105250304"
                 firefox="no"
                 safari="17.2 https://developer.apple.com/documentation/safari-release-notes/safari-17_2-release-notes"
                 nodejs="20.10 https://nodejs.org/docs/latest-v20.x/api/esm.html#import-attributes"
                 babel="yes https://babeljs.io/blog/2023/05/26/7.22.0#import-attributes-15536-15620"></feature-support>
