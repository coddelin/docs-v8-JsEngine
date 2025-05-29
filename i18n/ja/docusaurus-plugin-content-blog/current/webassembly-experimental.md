---
title: &apos;V8でのWebAssemblyの実験的サポート&apos;
author: &apos;Seth Thompson, WebAssembly担当&apos;
date: 2016-03-15 13:33:37
tags:
  - WebAssembly
description: &apos;本日より、V8とChromiumでWebAssemblyの実験的サポートがフラグの後ろで利用可能になりました。&apos;
---
_WebAssemblyの包括的な概要と将来のコミュニティコラボレーションのロードマップについては、Mozilla Hacksブログの[A WebAssembly Milestone](https://hacks.mozilla.org/2016/03/a-webassembly-milestone/)をご覧ください。_

2015年6月以来、Google、Mozilla、Microsoft、Apple、および[W3C WebAssembly Community Group](https://www.w3.org/community/webassembly/participants)の共同作業者は、[設計](https://github.com/WebAssembly/design)、[仕様化](https://github.com/WebAssembly/spec)、および実装してきました（[1](https://www.chromestatus.com/features/5453022515691520)、[2](https://platform-status.mozilla.org/#web-assembly)、[3](https://github.com/Microsoft/ChakraCore/wiki/Roadmap)、[4](https://webkit.org/status/#specification-webassembly)）。WebAssemblyはウェブ向けの新しいランタイムおよびコンパイルターゲットです。[WebAssembly](https://webassembly.github.io/)は低レベルで移植可能なバイトコードで、コンパクトなバイナリ形式でエンコードされ、メモリ安全なサンドボックス内でほぼネイティブの速度で実行されるように設計されています。既存の技術を進化させる形で、WebAssemblyはウェブプラットフォームと緊密に統合されており、ネットワーク経由でのダウンロードが迅速で、[asm.js](http://asmjs.org/)（JavaScriptの低レベルサブセット）よりも迅速にインスタンス化可能です。

<!--truncate-->
本日より、V8とChromiumでWebAssemblyの実験的サポートがフラグの後ろで利用可能になりました。V8で試すには、バージョン5.1.117以上の`d8`をコマンドラインで`--expose_wasm`フラグ付きで実行するか、Chrome Canary 51.0.2677.0以上で`chrome://flags#enable-webassembly`下のExperimental WebAssembly機能を有効にしてください。ブラウザを再起動すると、JavaScriptコンテキストからアクセス可能な新しい`Wasm`オブジェクトが利用可能になり、これを通じてWebAssemblyモジュールをインスタンス化および実行するAPIが提供されます。**MozillaとMicrosoftの共同作業者の努力により、[Firefox Nightly](https://hacks.mozilla.org/2016/03/a-webassembly-milestone)と[Microsoft Edge](http://blogs.windows.com/msedgedev/2016/03/15/previewing-webassembly-experiments)の内部ビルド（ビデオスクリーンキャプチャで実演）でも、フラグの後ろで2つの互換性のあるWebAssembly実装が稼働しています。**

WebAssemblyプロジェクトのウェブサイトには、3Dゲームでのランタイムの使用を示す[デモ](https://webassembly.github.io/demo/)が掲載されています。WebAssemblyをサポートするブラウザでは、このデモページはWebGLやその他のウェブプラットフォームAPIを使用してインタラクティブなゲームをレンダリングするwasmモジュールを読み込み、インスタンス化します。他のブラウザでは、このデモページは同じゲームのasm.js版にフォールバックします。

![[WebAssembly demo](https://webassembly.github.io/demo/)](/_img/webassembly-experimental/tanks.jpg)

内部では、V8のWebAssembly実装は既存のJavaScript仮想マシンインフラストラクチャ、特に[TurboFanコンパイラ](/blog/turbofan-jit)を再利用するよう設計されています。特化したWebAssemblyデコーダーは、単一パスで型、ローカル変数インデックス、関数参照、戻り値、制御フローストラクチャをチェックすることでモジュールを検証します。デコーダーはTurboFanグラフを生成し、それがさまざまな最適化パスを通過して最終的に機械コードに変換されます。このバックエンドは、最適化されたJavaScriptやasm.jsのための機械コードを生成するのにも使用されます。今後数ヶ月で、チームはコンパイラの調整、並列処理、およびコンパイルポリシーの改善によって、V8実装の起動時間を改善することに注力します。

また、開発者体験を大幅に向上させる2つの変更が予定されています。WebAssemblyの標準テキスト表現が追加されることで、他のウェブスクリプトやリソースと同様にWebAssemblyバイナリのソースを表示できるようになります。加えて、現在の暫定的な`Wasm`オブジェクトは、JavaScriptからWebAssemblyモジュールをインスタンス化および内部解析できる、より強力で慣用的なメソッドとプロパティのセットに再設計される予定です。
