---
title: &apos;ドキュメント&apos;
description: &apos;V8プロジェクトのドキュメント&apos;
slug: /
---
V8は、Googleのオープンソースで高性能なJavaScriptおよびWebAssemblyエンジンで、C++で記述されています。ChromeやNode.jsなどで使用されています。

このドキュメントは、アプリケーションでV8を使用したいと考えるC++開発者や、V8の設計とパフォーマンスに興味がある方を対象としています。本ドキュメントでV8の概要を紹介し、他の資料ではV8をコードで使用する方法や設計の詳細、V8の性能を測定するためのJavaScriptベンチマークについて説明します。

## V8について

V8は<a href="https://tc39.es/ecma262/">ECMAScript</a>および<a href="https://webassembly.github.io/spec/core/">WebAssembly</a>を実装し、x64、IA-32、またはARMプロセッサーを使用するWindows、macOS、Linuxシステムで動作します。追加のシステム（IBM i、AIX）およびプロセッサー（MIPS、ppcle64、s390x）は外部で保守されています。[ports](/ports)を参照してください。V8は任意のC++アプリケーションに埋め込むことができます。

V8はJavaScriptソースコードのコンパイルと実行、オブジェクトのメモリ割り当て、不要になったオブジェクトのガベージコレクションを行います。V8のストップ・ザ・ワールド、世代別、正確なガベージコレクタは、V8のパフォーマンスの重要な鍵の一つです。

JavaScriptは通常、ブラウザ内でクライアントサイドのスクリプトとして使用され、例えばドキュメントオブジェクトモデル（DOM）オブジェクトを操作します。ただし、DOMは通常JavaScriptエンジンで提供されるものではなく、ブラウザによって提供されます。これはV8にも当てはまります。Google ChromeがDOMを提供します。しかし、V8はECMA標準で指定されたすべてのデータ型、演算子、オブジェクト、および関数を提供します。

V8は任意のC++アプリケーションが独自のオブジェクトや関数をJavaScriptコードに公開することを可能にします。どのオブジェクトと関数をJavaScriptに公開するかは、開発者次第です。

## ドキュメント概要

- [ソースコードからV8をビルドする](/build)
    - [V8ソースコードのチェックアウト](/source-code)
    - [GNでビルド](/build-gn)
    - [ARM/Androidのクロスコンパイルとデバッグ](/cross-compile-arm)
    - [iOSのクロスコンパイル](/cross-compile-ios)
    - [GUIおよびIDEのセットアップ](/ide-setup)
    - [Arm64でのコンパイル](/compile-arm64)
- [貢献](/contribute)
    - [尊重のあるコード](/respectful-code)
    - [V8の公開APIとその安定性](/api)
    - [V8コミッターになる](/become-committer)
    - [コミッターの責任](/committer-responsibility)
    - [Blinkウェブテスト（レイアウトテスト）](/blink-layout-tests)
    - [コードカバレッジの評価](/evaluate-code-coverage)
    - [リリースプロセス](/release-process)
    - [デザインレビューガイドライン](/design-review-guidelines)
    - [JavaScript/WebAssembly言語機能の実装と提供](/feature-launch-process)
    - [WebAssembly機能のステージングと提供のチェックリスト](/wasm-shipping-checklist)
    - [Flake bisect](/flake-bisect)
    - [ポートの取り扱い](/ports)
    - [公式サポート](/official-support)
    - [マージとパッチ](/merge-patch)
    - [Node.js統合ビルド](/node-integration)
    - [セキュリティバグの報告](/security-bugs)
    - [ローカルでのベンチマークの実行](/benchmarks)
    - [テスト](/test)
    - [問題のトリアージ](/triage-issues)
- デバッグ
    - [シミュレータを使用したArmデバッグ](/debug-arm)
    - [ARM/Androidのクロスコンパイルとデバッグ](/cross-compile-arm)
    - [GDBを使用した組み込みデバッグ](/gdb)
    - [V8インスペクタープロトコルを介したデバッグ](/inspector)
    - [GDB JITコンパイルインターフェース統合](/gdb-jit)
    - [メモリリークの調査](/memory-leaks)
    - [スタックトレースAPI](/stack-trace-api)
    - [D8の使用](/d8)
    - [V8ツール](https://v8.dev/tools)
- V8の埋め込み
    - [V8埋め込みガイド](/embed)
    - [バージョン番号](/version-numbers)
    - [組み込み関数](/builtin-functions)
    - [多言語対応](/i18n)
    - [信頼されていないコードの緩和策](/untrusted-code-mitigations)
- 内部技術
    - [Ignition](/ignition)
    - [TurboFan](/turbofan)
    - [Torqueユーザーマニュアル](/torque)
    - [Torque組み込みの作成](/torque-builtins)
    - [CSA組み込みの作成](/csa-builtins)
    - [新しいWebAssemblyオペコードの追加](/webassembly-opcode)
    - [マップ（「隠れクラス」）](/hidden-classes)
    - [スラックトラッキングとは何か？](/blog/slack-tracking)
    - [WebAssemblyコンパイルパイプライン](/wasm-compilation-pipeline)
- 最適化可能なJavaScriptの記述
    - [V8のサンプルベースプロファイラーの使用](/profile)
    - [V8を用いたChromiumのプロファイリング](/profile-chromium)
    - [Linux `perf`を使用したV8のプロファイリング](/linux-perf)
    - [V8のトレース](/trace)
    - [ランタイムコール統計の使用](/rcs)
