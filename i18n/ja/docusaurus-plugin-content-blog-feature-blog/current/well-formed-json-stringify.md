---
title: "適切に形成された`JSON.stringify`"
author: "Mathias Bynens（[@mathias](https://twitter.com/mathias)）"
avatars:
  - "mathias-bynens"
date: 2018-09-11
tags:
  - ECMAScript
  - ES2019
description: "JSON.stringifyは現在、孤立したサロゲートペアにエスケープシーケンスを出力するため、その出力は有効なUnicode（UTF-8で表現可能）となっている。"
---
`JSON.stringify`は以前、入力に孤立したサロゲートペアが含まれている場合、不正な形式のUnicode文字列を返す仕様でした：

```js
JSON.stringify('\uD800');
// → '"�"'
```

[「適切に形成された`JSON.stringify`」提案](https://github.com/tc39/proposal-well-formed-stringify)では、`JSON.stringify`が孤立したサロゲートペアに対してエスケープシーケンスを出力するように変更され、その出力は有効なUnicode（UTF-8で表現可能）となります：

<!--truncate-->
```js
JSON.stringify('\uD800');
// → '"\\ud800"'
```

なお、`JSON.parse(stringified)`はこれまで通りの結果を生成します。

この機能は、JavaScriptで長らく修正が求められていた小さな改良です。JavaScriptの開発者として安心して使用できる点が1つ増えました。[_JSON ⊂ ECMAScript_](/features/subsume-json)と組み合わせることで、JSON化されたデータをJavaScriptプログラム内のリテラルとして安全に埋め込むことができ、任意のUnicode互換エンコーディング（例：UTF-8）で生成されたコードをディスクに書き出すことが可能になります。これは[メタプログラミングの用途](/features/subsume-json#embedding-json)にとって非常に便利です。

## 機能サポート

<feature-support chrome="72 /blog/v8-release-72#well-formed-json.stringify"
                 firefox="64"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-json"></feature-support>
