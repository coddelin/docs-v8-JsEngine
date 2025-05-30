---
title: "V8リリース v9.5"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-09-21
tags: 
 - リリース
description: "V8リリース v9.5では、更新された国際化APIとWebAssembly例外処理のサポートを提供します。"
tweet: "1440296019623759872"
---
毎月4週間ごとに、私たちは[リリースプロセス](https://v8.dev/docs/release-process)の一環としてV8の新しいブランチを作成しています。各バージョンは、Chrome Betaマイルストーン直前にV8のGitマスターからブランチされます。本日、私たちは最新のブランチである[V8バージョン9.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.5)を発表できることを嬉しく思います。このブランチは、数週間後にChrome 95 Stableとの連携でリリースされるまでベータ版です。V8 v9.5には、開発者向けの魅力的な機能が詰め込まれています。この投稿では、リリースまでの期待を高める主なハイライトをご紹介します。

<!--truncate-->
## JavaScript

### `Intl.DisplayNames` v2

v8.1では、[`Intl.DisplayNames` API](https://v8.dev/features/intl-displaynames)をChrome 81でリリースし、“language”、“region”、“script”、“currency”のタイプをサポートしました。v9.5では、新たに“calendar”および“dateTimeField”の2つのタイプを追加しました。これらは、それぞれ異なるカレンダータイプや日時フィールドの表示名を返します。

```js
const esCalendarNames = new Intl.DisplayNames(['es'], { type: 'calendar' });
const frDateTimeFieldNames = new Intl.DisplayNames(['fr'], { type: 'dateTimeField' });
esCalendarNames.of('roc');  // "calendario de la República de China"
frDateTimeFieldNames.of('month'); // "mois"
```

また、“language”タイプのサポートを強化し、新しいlanguageDisplayオプションを追加しました。このオプションは“standard”または“dialect”のいずれかを指定できます（指定されない場合はデフォルト値となります）。

```js
const jaDialectLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' });
const jaStandardLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' , languageDisplay: 'standard'});
jaDialectLanguageNames.of('en-US')  // "アメリカ英語"
jaDialectLanguageNames.of('en-AU')  // "オーストラリア英語"
jaDialectLanguageNames.of('en-GB')  // "イギリス英語"

jaStandardLanguageNames.of('en-US') // "英語 (アメリカ合衆国)"
jaStandardLanguageNames.of('en-AU') // "英語 (オーストラリア)"
jaStandardLanguageNames.of('en-GB') // "英語 (イギリス)"
```

### 拡張された `timeZoneName` オプション

`Intl.DateTimeFormat API`はv9.5で、新しい`timeZoneName`オプションに以下の4つの値を追加しました。

- “shortGeneric”：短い一般的な非ロケーション形式でタイムゾーン名を出力する（例: "PT", "ET"）。夏時間かどうかを示しません。
- “longGeneric”：長い一般的な非ロケーション形式でタイムゾーン名を出力する（例: "Pacific Time", "Mountain Time"）。夏時間かどうかを示しません。
- “shortOffset”：短いローカライズされたGMT形式でタイムゾーン名を出力する（例: "GMT-8"）。
- “longOffset”：長いローカライズされたGMT形式でタイムゾーン名を出力する（例: "GMT-0800"）。

## WebAssembly

### 例外処理

V8は、[WebAssembly Exception Handling (Wasm EH) 提案](https://github.com/WebAssembly/exception-handling/blob/master/proposals/exception-handling/Exceptions.md)をサポートしました。これにより、互換性のあるツールチェーン（例: [Emscripten](https://emscripten.org/docs/porting/exceptions.html)）でコンパイルされたモジュールがV8で実行可能となりました。この提案は、JavaScriptを使用した以前の回避策と比較してオーバーヘッドを低く抑えることを目的としています。

例えば、[Binaryen](https://github.com/WebAssembly/binaryen/)オプティマイザを例外処理の旧実装と新実装を用いてWebAssemblyにコンパイルしました。

例外処理が有効化されると、コードサイズの増加は[旧JavaScriptベースの例外処理では約43%から、Wasm EH機能ではわずか9%に減少します](https://github.com/WebAssembly/exception-handling/issues/20#issuecomment-919716209)。

大きなテストファイルに対して`wasm-opt.wasm -O3`を実行したところ、例外なしのベースラインと比較してWasm EHバージョンでは性能損失が見られず、JavaScriptベースのEHバージョンでは約30%長くかかりました。

ただし、Binaryenは例外チェックを控えめに使用しています。例外の頻度が高いワークロードでは、性能差がさらに大きくなることが期待されます。

## V8 API

メインのv8.hヘッダーファイルは分割され、それぞれ個別にインクルード可能となりました。例えば、`v8-isolate.h`は`v8::Isolate`クラスを含んでいます。`v8::Local<T>`を渡すメソッドを宣言する多くのヘッダーファイルは、`v8-forward.h`をインポートして`v8::Local`とすべてのV8ヒープオブジェクトタイプの定義を取得できるようになりました。

`git log branch-heads/9.4..branch-heads/9.5 include/v8\*.h`を使用してAPI変更のリストを取得してください。
