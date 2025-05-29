---
title: 'V8 エクストラ'
author: 'ドメニック・ドニコラ（[@domenic](https://twitter.com/domenic)）、ストリーム魔術師'
avatars:
  - 'domenic-denicola'
date: 2016-02-04 13:33:37
tags:
  - 内部構造
description: 'V8 v4.8には「V8 エクストラ」が含まれています。これは高性能で自己ホスト型APIを書くことを可能にするシンプルなインターフェイスです。'
---
V8はJavaScript言語の組み込みオブジェクトと関数の大部分をJavaScript自体で実装しています。たとえば、[Promisesの実装](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js)がJavaScriptで書かれているのを見ることができます。このような組み込み機能は、_自己ホスト型_ と呼ばれます。これらの実装は、[スタートアップスナップショット](/blog/custom-startup-snapshots)に含まれており、新しいコンテキストをランタイムで自己ホスト型の組み込み機能をセットアップして初期化する必要なく迅速に作成できます。

<!--truncate-->
ChromiumのようなV8の埋め込み側がAPIをJavaScriptで書きたいと思うことがあります。これは、[Streams](https://streams.spec.whatwg.org/)のように自己完結型のプラットフォーム機能や、既存の低レベルの機能群を基に構築された、高レベルの機能群から成る「層状プラットフォーム」の一部である機能に特に適しています。Node.jsのように、埋め込み側APIを初期設定として追加コードを実行することは常に可能ですが、理想的には埋め込み側でも自己ホスト型のAPIでV8と同じ性能上のメリットを得られるべきです。

V8 エクストラは、V8の[v4.8リリース](/blog/v8-release-48)で導入された新機能であり、シンプルなインターフェイスを通じて埋め込み側が高性能な自己ホスト型APIを作成できるよう設計されています。エクストラは埋め込み側が提供するJavaScriptファイルであり、これらはV8スナップショットに直接コンパイルされます。また、JavaScriptでセキュアなAPIを書くことを容易にするいくつかのヘルパーユーティリティにもアクセスできます。

## 例

V8 エクストラファイルは特定の構造を持つ単純なJavaScriptファイルです:

```js
(function(global, binding, v8) {
  'use strict';
  const Object = global.Object;
  const x = v8.createPrivateSymbol('x');
  const y = v8.createPrivateSymbol('y');

  class Vec2 {
    constructor(theX, theY) {
      this[x] = theX;
      this[y] = theY;
    }

    norm() {
      return binding.computeNorm(this[x], this[y]);
    }
  }

  Object.defineProperty(global, 'Vec2', {
    value: Vec2,
    enumerable: false,
    configurable: true,
    writable: true
  });

  binding.Vec2 = Vec2;
});
```

ここで注意すべき点がいくつかあります:

- `global`オブジェクトはスコープチェーンには存在しません。そのため、（`Object`などの）アクセスは提供される`global`引数を明示的に通じて行う必要があります。
- `binding`オブジェクトは、埋め込み側の値を格納したり取得するための場所です。C++のAPI `v8::Context::GetExtrasBindingObject()` を埋め込み側からの `binding` オブジェクトへのアクセスに利用します。私たちのおもちゃの例では、埋め込み側にノルム計算を実行させています。本物の例では、URL解決のような複雑な操作を埋め込み側に委託するかもしれません。また、`Vec2`コンストラクタを`binding`オブジェクトに追加することで、埋め込み側コードが（変更される可能性のある）`global`オブジェクトを経由せずに`Vec2`インスタンスを作成できるようにしています。
- `v8`オブジェクトは、セキュアなコードを書くための少数のAPIを提供します。ここでは、外部から操作できない方法で内部状態を保存するためのプライベートシンボルを作成します。（プライベートシンボルはV8内の概念であり、標準のJavaScriptコードでは意味を成しません。）V8の組み込み機能はしばしば「%-関数呼び出し」を使用しますが、これはV8の内部実装の詳細であるため、埋め込み側が依存するには適していません。そのため、V8 エクストラでは%-関数を使用できません。

これらのオブジェクトがどこから来るのか気になるかもしれません。これらの3つすべては[V8のブートストラッパー](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/bootstrapper.cc)で初期化されます。ここではいくつかの基本的なプロパティが設定されますが、ほとんどの初期化はV8の自己ホスト型JavaScriptに委ねられています。たとえば、ほぼすべての.jsファイルが`global`に何かをインストールします。例として、[promise.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js&sq=package:chromium&l=439)や[uri.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/uri.js&sq=package:chromium&l=371)を参照してください。そして、私たちは[v8オブジェクトにAPIをいくつかの場所](https://code.google.com/p/chromium/codesearch#search/&q=extrasUtils&sq=package:chromium&type=cs)にインストールします。（`binding`オブジェクトは、エクストラや埋め込み側によって変更されるまで空です。そのため、V8自体で関連する唯一のコードは、それを作成するブートストラッパーの部分です。）

最後に、エクストラをコンパイルすることをV8に伝えるために、プロジェクトのgypファイルに以下の行を追加します:

```js
'v8_extra_library_files': ['./Vec2.js']
```

（実際の例は[V8のgypファイル](https://code.google.com/p/chromium/codesearch#chromium/src/v8/build/standalone.gypi&sq=package:chromium&type=cs&l=170)で確認できます。）

## 実際のV8エクストラ

V8エクストラは、埋め込み側が機能を実装するための新しく軽量な方法を提供します。JavaScriptコードは、配列、マップ、プロミスなどのJavaScriptの組み込みをより簡単に操作でき、他のJavaScript関数を簡単に呼び出すことができ、例外処理を慣例的な方法で扱うことができます。C++実装とは異なり、V8エクストラを介してJavaScriptで実装された機能はインライン化の恩恵を受けることができ、それらを呼び出す際には境界を越えるコストがかかりません。これらの利点は、ChromiumのWeb IDLバインディングのような従来のバインディングシステムと比較して特に顕著です。

V8エクストラは昨年導入され、改良されてきました。現在Chromiumでは、[ストリームの実装](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/core/streams/ReadableStream.js)に利用されています。また、Chromiumでは[V8エクストラを使ったスクロールカスタマイズ](https://codereview.chromium.org/1333323003)や[効率的なジオメトリアPI](https://groups.google.com/a/chromium.org/d/msg/blink-dev/V_bJNtOg0oM/VKbbYs-aAgAJ)の実装を検討中です。

V8エクストラはまだ進行中の作業であり、インターフェイスには改善が必要な点や欠点があります。改善の余地がある主な分野はデバッグの部分です。エラーを追跡するのは容易ではなく、ランタイムデバッグは通常プリントステートメントによって行われます。将来的には、Chromium自体および同じプロトコルを使用する埋め込み者のために、V8エクストラをChromiumの開発者ツールとトレースフレームワークに統合することを目指しています。

V8エクストラを使用する際のもう1つの注意点は、セキュリティと堅牢性の高いコードを書くために開発者が追加の努力を払う必要があることです。V8エクストラコードは、V8の自己ホスト型組み込み機能のコードと同様に、スナップショット上で直接動作します。それはユーザー側のJavaScriptと同じオブジェクトにアクセスし、アクセスを防ぐバインディングレイヤーや別コンテキストはありません。例えば、`global.Object.prototype.hasOwnProperty.call(obj, 5)`のような一見単純なものでも、組み込みがユーザーコードによって変更されるために失敗する可能性のある方法が6つあります。Chromiumのような埋め込みでは、ユーザーコードの動作にかかわらず堅牢である必要があるため、従来のC++で実装された機能を書く場合よりもエクストラを書く際にはより注意が必要です。

V8エクストラについてさらに詳しく知りたい場合は、[設計文書](https://docs.google.com/document/d/1AT5-T0aHGp7Lt29vPWFr2-qG8r3l9CByyvKwEuA8Ec0/edit#heading=h.32abkvzeioyz)をご覧ください。この文書ではさらに詳細を説明しています。V8エクストラの改善を楽しみにしており、開発者と埋め込み者がV8ランタイムに表現力豊かで高性能な追加機能を記述できるようにする方法をもっと追加していきたいと思っています。
