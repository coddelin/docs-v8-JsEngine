---
title: "WebAssemblyブラウザプレビュー"
author: "V8チーム"
date: 2016-10-31 13:33:37
tags:
  - WebAssembly
description: "WebAssembly（またはWasm）はウェブ向けの新しいランタイムおよびコンパイルターゲットであり、現在Chrome Canaryでフラグの背後で利用できます！"
---
私たちは本日、[Firefox](https://hacks.mozilla.org/2016/10/webassembly-browser-preview)および[Edge](https://blogs.windows.com/msedgedev/2016/10/31/webassembly-browser-preview/)と同時に、WebAssemblyブラウザプレビューを発表します。[WebAssembly](http://webassembly.org/)（またはWasm）は、Google、Mozilla、Microsoft、Apple、そして[W3C WebAssembly Community Group](https://www.w3.org/community/webassembly/)の協力者によって設計された、ウェブ向けの新しいランタイムおよびコンパイルターゲットです。

<!--truncate-->
## このマイルストーンは何を意味するか？

このマイルストーンは以下を意味します：

- 私たちの[MVP](http://webassembly.org/docs/mvp/)（最小限の実行可能製品）の設計（[セマンティクス](http://webassembly.org/docs/semantics/)、[バイナリフォーマット](http://webassembly.org/docs/binary-encoding/)、[JS API](http://webassembly.org/docs/js/)を含む）のリリース候補
- V8やSpiderMonkeyでのフラグの背後にあるWebAssemblyの互換性と安定した実装、Chakraの開発ビルドでの進行中の実装、JavaScriptCoreでの進行中の作業
- 開発者がC/C++ソースファイルからWebAssemblyモジュールをコンパイルするための[動作ツールチェーン](http://webassembly.org/getting-started/developers-guide/)
- コミュニティのフィードバックに基づく変更がない限り、デフォルトオンでWebAssemblyを出荷するための[ロードマップ](http://webassembly.org/roadmap/)

[プロジェクトサイト](http://webassembly.org/)でWebAssemblyについてさらに読むこともできますし、[開発者向けガイド](http://webassembly.org/getting-started/developers-guide/)をフォローして、Emscriptenを使用してC & C++からWebAssemblyのコンパイルを試すこともできます。[バイナリフォーマット](http://webassembly.org/docs/binary-encoding/)および[JS API](http://webassembly.org/docs/js/)ドキュメントは、それぞれWebAssemblyのバイナリエンコーディングとブラウザ内でWebAssemblyモジュールをインスタンス化するためのメカニズムを概説しています。以下は、Wasmがどのように見えるかを示す簡単なサンプルです：

![WebAssemblyでの最大公約数関数の実装、生のバイト、テキスト形式（WAST）、Cソースコードを表示中。](/_img/webassembly-browser-preview/gcd.svg)

WebAssemblyはChromeのフラグ（[chrome://flags/#enable-webassembly](chrome://flags/#enable-webassembly)）の背後にまだあるため、現時点では商用利用には推奨されません。しかし、ブラウザプレビュープレ期間中、仕様の設計と実装に関する[フィードバック](http://webassembly.org/community/feedback/)を積極的に収集しています。開発者にはアプリケーションのコンパイルと移植を試み、それをブラウザで実行することを推奨します。

V8は[TurboFanコンパイラ](/blog/turbofan-jit)におけるWebAssemblyの実装の最適化を続けています。昨年3月に最初の実験的サポートを発表して以来、並行コンパイルのサポートを追加しました。さらに、asm.jsをWebAssemblyに[内部的](https://www.chromestatus.com/feature/5053365658583040)に変換する代替のasm.jsパイプラインがほぼ完成し、既存のasm.jsサイトがWebAssemblyの事前コンパイルのメリットの一部を享受できます。

## 次に何が起こる？

コミュニティのフィードバックによる大きな設計変更がない限り、WebAssembly Community Groupは2017年第1四半期に公式仕様を作成し、その時点でブラウザはWebAssemblyをデフォルトオンで出荷することが推奨されます。その時点以降、バイナリフォーマットはバージョン1にリセットされ、WebAssemblyはバージョンレスとなり、機能テストおよび後方互換性が保証されます。WebAssemblyプロジェクトサイトでより詳細な[ロードマップ](http://webassembly.org/roadmap/)を確認することができます。
