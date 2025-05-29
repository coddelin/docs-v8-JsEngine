---
title: 'WebAssembly JSPI 新APIについて'
description: 'この記事では、JavaScript Promise Integration (JSPI) APIに関する今後の変更点を詳しく説明します。'
author: 'Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl'
date: 2024-06-04
tags:
  - WebAssembly
---
WebAssemblyのJavaScript Promise Integration (JSPI) APIに新しいAPIが登場しました。これはChromeリリースM126で利用可能です。変更点、Emscriptenでの使用方法、JSPIのロードマップについて説明します。

JSPIは、*逐次処理*APIを使用したWebAssemblyアプリケーションが、*非同期*のWeb APIにアクセスするためのAPIです。多くのWeb APIはJavaScriptの`Promise`オブジェクトを基に作成されています。つまり、要求された操作を即座に実行する代わりに、それを実行する`Promise`を返します。一方で、WebAssemblyにコンパイルされた多くのアプリケーションは、呼び出し元が完了するまでブロックするAPIが主流のC/C++の世界から来ています。

<!--truncate-->
JSPIはWebアーキテクチャに組み込まれ、`Promise`が返されるときにWebAssemblyアプリケーションを一時停止し、`Promise`が解決されたときに再開する仕組みを提供します。

JSPIおよびその使用方法についての詳細は、[このブログ記事](https://v8.dev/blog/jspi)や[仕様書](https://github.com/WebAssembly/js-promise-integration)で確認できます。

## 何が新しいのか？

### `Suspender` オブジェクト廃止

2024年1月、Wasm CGのStacksサブグループは、JSPIのAPIを改訂することを[決定](https://github.com/WebAssembly/meetings/blob/297ac8b5ac00e6be1fe33b1f4a146cc7481b631d/stack/2024/stack-2024-01-29.md)しました。具体的には、明示的な`Suspender`オブジェクトの代わりに、JavaScript/WebAssemblyの境界を一時停止する計算を決定する区切りとして使用します。

違いは比較的小さいですが、潜在的には重要です。一時停止する計算がある場合、ラップされたWebAssemblyエクスポートへの直近の呼び出しが一時停止の『カットポイント』を決定します。

これにより、JSPIを使用する開発者はそのカットポイントに対する制御が若干制限されます。一方で、`Suspender`オブジェクトを明示的に管理する必要がなくなるため、APIの使用はかなり簡単になります。

### `WebAssembly.Function`の廃止

もう一つの変更点は、APIのスタイルに関するものです。JSPIラッパーを`WebAssembly.Function`コンストラクターで特徴付ける代わりに、特定の関数やコンストラクターを提供します。

これには次のような利点があります：

- [*型リフレクション*提案](https://github.com/WebAssembly/js-types)への依存関係を排除します。
- JSPIのツール作成を簡素化します：新しいAPI関数はWebAssembly関数の型を明示的に参照する必要がなくなります。

この変更は、明示的に参照される`Suspender`オブジェクトが不要になるという決定によって可能になりました。

### 一時停止せずに返す

三つ目の変更は、一時停止呼び出しの挙動に関係します。一時停止インポートからJavaScript関数を呼び出す際、常に一時停止する代わりに、JavaScript関数が実際に`Promise`を返す場合のみ一時停止します。

この変更は一見するとW3C TAGの[推奨](https://www.w3.org/2001/tag/doc/promises-guide#accepting-promises)に反するように思えますが、JSPIユーザーにとって安全な最適化を意味します。これは、JSPIが実際には`Promise`を返す関数への*呼び出し元*の役割を果たしているためです。

この変更はほとんどのアプリケーションに最小限の影響しか与えませんが、一部のアプリケーションでは、ブラウザーのイベントループへの不要な往復を回避することで顕著なメリットを得られるでしょう。

### 新しいAPI

APIはシンプルです：WebAssemblyモジュールからエクスポートされた関数を受け取り、`Promise`を返す関数に変換する関数が用意されています：

```js
Function Webassembly.promising(Function wsFun)
```

引数がJavaScript`Function`として型指定されている場合でも、実際にはWebAssembly関数に限定されていることに注意してください。

一時停止側では、新しいクラス`WebAssembly.Suspending`があり、引数としてJavaScript関数を取るコンストラクターも提供されています。WebIDLでは次のように記述します：

```js
interface Suspending{
  constructor (Function fun);
}
```

このAPIは非対称的な印象を与えるかもしれません：WebAssembly関数を取り、新しいpromising（*原文ママ*）関数を返す関数がありますが、一方で一時停止する関数をマークするには、`Suspending`オブジェクトで囲みます。これは、背後で何が起こっているのかについてのより深い現実を反映しています。

インポートの一時停止挙動は、インポートへの*呼び出し*の一部で本質的に発生します。つまり、インスタンス化されたモジュール内のある関数がインポートを呼び出し、その結果として一時停止します。

一方で、`promising`関数は通常のWebAssembly関数を受け取り、一時停止に対応して`Promise`を返す新しい関数を返します。

### 新しいAPIの使用方法

Emscriptenを使用している場合、新しいAPIを使用するには通常コードを変更する必要はありません。使用しているEmscriptenのバージョンが少なくとも3.1.61であり、使用しているChromeのバージョンが少なくとも126.0.6478.17（Chrome M126）である必要があります。

独自の統合を構築している場合、コードは大幅に簡素化されるはずです。特に、渡された`Suspender`オブジェクトを保存するコード（およびインポートを呼び出す際にそれを取得するコード）はもう必要ありません。WebAssemblyモジュール内で通常の順序的なコードを使用するだけで済みます。

### 古いAPI

古いAPIは少なくとも2024年10月29日（Chrome M128）までは動作し続けます。それ以降、古いAPIを削除する予定です。

Emscripten自体もバージョン3.1.61以降は古いAPIをサポートしなくなりますのでご注意ください。

### ブラウザでどのAPIが有効かを検出する

APIの変更は軽視してはいけません。この場合、JSPI自体がまだ暫定的であるため変更が可能となっています。ブラウザでどのAPIが有効かを確認する簡単な方法があります:

```js
function oldAPI(){
  return WebAssembly.Suspender!=undefined
}

function newAPI(){
  return WebAssembly.Suspending!=undefined
}
```

`oldAPI`関数は、古いJSPI APIがブラウザで有効である場合にtrueを返します。一方、`newAPI`関数は、新しいJSPI APIが有効である場合にtrueを返します。

## JSPIで何が起きているのか?

### 実装の側面

JSPIへの最大の変更は、実際にはほとんどのプログラマーにとって見えないものです。それは、いわゆる拡張可能なスタックです。

現在のJSPIの実装は固定サイズのスタックを割り当てることに基づいています。実際には割り当てられたスタックはかなり大きいです。これは、再帰を正しく処理するために深いスタックを必要とする任意のWebAssembly計算を収容できる必要があるためです。

しかし、この方法は持続可能な戦略ではありません。数百万のサスペンドされたコルーチンをサポートしたいと考えていますが、各スタックが1MBのサイズであればそれは不可能です。

拡張可能なスタックというのは、WebAssemblyのスタックが必要に応じて拡張可能なスタック割り当て戦略を指します。そのため、必要なスタック領域が小さいアプリケーションの場合は非常に小さなスタックから開始し、アプリケーションが領域不足になる（いわゆるスタックオーバーフロー）場合にスタックを拡張します。

拡張可能なスタックを実装するためのいくつかの潜在的な技術があります。その1つはセグメント化されたスタックです。セグメント化されたスタックは固定サイズのスタック領域の連鎖で構成されており、異なるセグメントは異なるサイズを持つことができます。

なお、コルーチンのスタックオーバーフロー問題を解決しようとしている一方で、主要または中央スタックを拡張可能にする予定はありません。そのため、アプリケーションがスタック領域不足に陥った場合、JSPIを使用しない限り拡張可能なスタックは問題を解決しません。

### 標準化プロセス

公開時点で、[JSPIのオリジントライアル](https://v8.dev/blog/jspi-ot)が活発に行われています。新しいAPIはオリジントライアルの残り期間中、Chrome M126で利用可能です。

オリジントライアルの期間中、以前のAPIも利用可能ですが、それはChrome M128の直後に廃止される予定です。

その後、JSPIの主要な活動は標準化プロセスに焦点を当てます。JSPIは現在（公開時点で）W3C Wasm CGプロセスのフェーズ3にあります。次のステップ、つまりフェーズ4への移行は、JSPIをJavaScriptおよびWebAssemblyエコシステムの標準APIとして採用するための重要な段階を意味します。

JSPIのこれらの変化についてどう思うか私たちに教えてください！[W3C WebAssembly Community Group repo](https://github.com/WebAssembly/js-promise-integration)で議論に参加してください。
