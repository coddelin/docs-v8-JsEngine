---
title: "JavaScript/WebAssemblyの言語機能の実装と出荷"
description: "この文書は、V8でJavaScriptまたはWebAssemblyの言語機能を実装し出荷するプロセスについて説明します。"
---
一般的に、V8はJavaScriptおよびWebAssemblyの言語機能に関して、[既に定義された合意に基づく標準のためのBlink Intentプロセス](https://www.chromium.org/blink/launching-features/#process-existing-standard)に従います。V8固有の補足事項は以下に示されています。補足事項で特に指示がない限り、Blink Intentプロセスに従ってください。

JavaScriptの機能に関するこのトピックについて質問がある場合は、syg@chromium.orgおよびv8-dev@googlegroups.comにメールしてください。

WebAssemblyの機能については、gdeepti@chromium.orgおよびv8-dev@googlegroups.comにメールしてください。

## 補足事項

### JavaScriptの機能は通常ステージ3以上になるまで待つ

一般的なルールとして、V8は、JavaScriptの機能提案が[TC39でステージ3以上](https://tc39.es/process-document/)に進むまで実装を待機します。TC39には独自の合意プロセスがあり、ステージ3以上は、すべてのブラウザベンダーを含むTC39の代表者間で合意が明示的に得られ、機能提案が実装に準備が整ったことを示します。この外部合意プロセスにより、ステージ3以上の機能は「Intent to Ship」以外のIntentメールを送信する必要はありません。

### TAGレビュー

小規模なJavaScriptまたはWebAssembly機能の場合、TAGレビューは必須ではありません。TC39とWasm CGが既に重要な技術的監督を提供しているためです。ただし、機能が大規模で横断的なものである場合（例: 他のWebプラットフォームAPIへの変更やChromiumへの修正が必要）、TAGレビューが推奨されます。

### V8とblinkの両方のフラグが必要

機能を実装する際は、V8のフラグとblinkの`base::Feature`の両方が必要です。

blinkのフラグは、緊急時に新しいバイナリを配布せず機能をChromeでオフにするために必要です。通常は[`gin/gin_features.h`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.h)、[`gin/gin_features.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.cc)、および[`gin/v8_initializer.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/v8_initializer.cc)で実装されます。

### 出荷にはファジングが必須

JavaScriptおよびWebAssemblyの機能は最低4週間、または1つのリリースマイルストーンの間ファジングを行い、すべてのファズバグを修正してから出荷できます。

コードが完成したJavaScript機能については、[`src/flags/flag-definitions.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/flags/flag-definitions.h)の`JAVASCRIPT_STAGED_FEATURES_BASE`マクロに機能フラグを移動することでファジングを開始してください。

WebAssemblyについては、[WebAssembly出荷チェックリスト](/docs/wasm-shipping-checklist)を参照してください。

### [Chromestatus](https://chromestatus.com/)とレビューゲート

blink intentプロセスには、Intent to Shipが送信されAPI OWNERの承認を求める前に、[Chromestatus](https://chromestatus.com/)での機能エントリに基づいて承認される必要がある一連のレビューゲートが含まれています。

これらのゲートは主にWeb API向けに調整されており、JavaScriptおよびWebAssembly機能には適用されないゲートもあります。以下は広範なガイドラインです。各機能によって具体的な内容が異なるため、ガイドラインを盲目的に適用しないでください。

#### プライバシー

ほとんどのJavaScriptおよびWebAssembly機能はプライバシーには影響しません。まれに、ユーザーのオペレーティングシステムやハードウェアの情報を明らかにする新しいフィンガープリントベクトルを追加する機能もあります。

#### セキュリティ

JavaScriptおよびWebAssemblyはセキュリティ脆弱性における一般的な攻撃ベクトルですが、新機能のほとんどは追加の攻撃面を生じさせません。[ファジング](#fuzzing)が必須であり、これによりリスクを軽減します。

`ArrayBuffer`などのJavaScript内で知られている一般的な攻撃ベクトルや、サイドチャネル攻撃を可能にする機能に影響を与える場合は、追加の精査が必要でありレビューされなければなりません。

#### エンタープライズ

TC39およびWasm CGの標準化プロセスを通じて、JavaScriptおよびWebAssembly機能は既に厳しい後方互換性の検証を受けています。故意に後方互換性がない機能は非常にまれです。

JavaScriptについては、最近出荷された機能は`chrome://flags/#disable-javascript-harmony-shipping`から無効化することもできます。

#### デバッグ性

JavaScriptおよびWebAssembly機能のデバッグ性は機能によって大きく異なります。新しいビルトインメソッドを追加するだけのJavaScript機能には追加のデバッガサポートは必要ありませんが、新しい能力を追加するWebAssembly機能には大幅な追加デバッガサポートが必要になる可能性があります。

詳細については、[JavaScript機能デバッグチェックリスト](https://docs.google.com/document/d/1_DBgJ9eowJJwZYtY6HdiyrizzWzwXVkG5Kt8s3TccYE/edit#heading=h.u5lyedo73aa9)および[WebAssembly機能デバッグチェックリスト](https://goo.gle/devtools-wasm-checklist)を参照してください。

迷う場合、このゲートが適用されます。

#### テスト

WPTの代わりに、JavaScript機能についてはTest262のテスト、WebAssembly機能についてはWebAssemblyの仕様テストで十分です。

Web Platform Tests (WPT) の追加は必須ではありません。JavaScriptやWebAssemblyの言語機能には、複数の実装で実行される相互運用可能なテストリポジトリがあります。ただし、有益であると考える場合は追加しても構いません。

JavaScriptの機能については、[Test262](https://github.com/tc39/test262) で明示的な正確性のテストが必要です。[stagingディレクトリ](https://github.com/tc39/test262/blob/main/CONTRIBUTING.md#staging)にあるテストも十分です。

WebAssemblyの機能については、[WebAssembly Spec Test リポジトリ](https://github.com/WebAssembly/spec/tree/master/test)で明示的な正確性のテストが必要です。

パフォーマンステストについては、JavaScriptは既存のほとんどのパフォーマンスベンチマーク（例えばSpeedometer）の基盤となっています。

### CCする人

**全ての** “intent to `$something`” のメール（例：“intent to implement”）は、 [v8-users@googlegroups.com](mailto:v8-users@googlegroups.com) と [blink-dev@chromium.org](mailto:blink-dev@chromium.org) の両方をCCしてください。このようにして、他のV8エンベッダーも情報を共有することができます。

### 仕様リポジトリへのリンク

Blink Intentプロセスでは説明文書が必要です。新しいドキュメントを作成する代わりに、関連する仕様リポジトリ（例： [`import.meta`](https://github.com/tc39/proposal-import-meta) ）へのリンクを提供することができます。
