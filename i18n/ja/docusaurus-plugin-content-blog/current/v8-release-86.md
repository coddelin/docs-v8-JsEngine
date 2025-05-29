---
title: 'V8 リリース v8.6'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), キーボードファザー'
avatars:
 - 'ingvar-stepanyan'
date: 2020-09-21
tags:
 - リリース
description: 'V8 リリース v8.6 は、尊重するコード、パフォーマンスの向上、規範的な変更をもたらします。'
tweet: '1308062287731789825'
---
私たちは6週間ごとに、新しいバージョンのV8を[リリースプロセス](https://v8.dev/docs/release-process)の一環として作成します。各バージョンは、Chrome Beta のマイルストーン直前に V8 の Git マスターから分岐されます。本日は、新しいブランチ [V8 バージョン 8.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.6)を正式発表します。このバージョンは、数週間後に Chrome 86 Stable と連携してリリースされるまで Beta 段階にあります。V8 v8.6 には、開発者向けの様々な機能が詰め込まれています。この投稿ではリリースを前にそのハイライトの一部をプレビューします。

<!--truncate-->
## 尊重するコード

v8.6 バージョンでは、V8 のコードベースが[より尊重されるもの](https://v8.dev/docs/respectful-code)になっています。チームは、プロジェクト内の一部の不敏感な用語を置き換えることで、Google の人種的平等へのコミットメントに従う Chromium 全体の取り組みに参加しました。これはまだ進行中の取り組みで、外部の貢献者の皆様もぜひご協力ください！まだ利用可能なタスクのリストは[こちら](https://docs.google.com/document/d/1rK7NQK64c53-qbEG-N5xz7uY_QUVI45sUxinbyikCYM/edit)で確認できます。

## JavaScript

### オープンソース化された JS-Fuzzer

JS-Fuzzer は、Oliver Chang によって最初に作成された mutaion ベースの JavaScript ファザーです。これは過去に V8 の[安定性](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3AStability-Crash%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1)と[セキュリティ](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3ASecurity%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1)の基盤となり、現在[オープンソース化](https://chromium-review.googlesource.com/c/v8/v8/+/2320330)されました。

このファザーは、拡張可能な[ミュテータークラス](https://chromium.googlesource.com/v8/v8/+/320d98709f/tools/clusterfuzz/js_fuzzer/mutators/)によって構成された [Babel](https://babeljs.io/) AST 変換を使用して既存のクロスエンジンテストケースを変化させます。最近では JavaScript の[正確性の問題](https://bugs.chromium.org/p/chromium/issues/list?q=blocking%3A1050674%20-status%3ADuplicate&can=1)を検出するため、差分テストモードでのファザーインスタンスの運用も開始しました。貢献は大歓迎です！詳細は[README](https://chromium.googlesource.com/v8/v8/+/master/tools/clusterfuzz/js_fuzzer/README.md)を参照してください。

### `Number.prototype.toString` の速度向上

JavaScript 数値を文字列に変換する操作は、一般的な場合には驚くほど複雑になる可能性があります。浮動小数点精度、科学表記、NaN や無限大、丸め処理などを考慮する必要があります。計算を行う前には、結果として得られる文字列がどれほど大きいかも分かりません。このため、`Number.prototype.toString` の実装は C++ のランタイム関数にフォールバックしていました。

しかし、多くの場合、単純で小さな整数（「Smi」）を出力したいだけです。これははるかに簡単な操作であり、C++ ランタイム関数を呼び出すコストはもはや価値がありません。そのため、この一般的なケースのオーバーヘッドを削減するため、Microsoft の仲間たちと協力して、Torque で記述された小さな整数用の簡単な高速パスを `Number.prototype.toString` に追加しました。この改善により、数値印刷のマイクロベンチマークが約75％向上しました。

### `Atomics.wake` の削除

`Atomics.wake` は `Atomics.notify` に名前が変更され、[v7.3](https://v8.dev/blog/v8-release-73#atomics.notify) の仕様変更に対応しました。廃止された `Atomics.wake` エイリアスは現在削除されています。

### 小さな規範的な変更

- 無名クラスには、値が空文字列 `''` である `.name` プロパティが追加されました。[仕様変更](https://github.com/tc39/ecma262/pull/1490)。
- テンプレート文字列リテラルでは、[スローピーモード](https://developer.mozilla.org/en-US/docs/Glossary/Sloppy_mode)で `\8` と `\9` のエスケープシーケンスが禁止されました。また、[厳格モード](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)ではすべての文字列リテラルで禁止されます。[仕様変更](https://github.com/tc39/ecma262/pull/2054)。
- ビルトインの `Reflect` オブジェクトは、値が `'Reflect'` である `Symbol.toStringTag` プロパティを持つようになりました。[仕様変更](https://github.com/tc39/ecma262/pull/2057)。

## WebAssembly

### SIMD on Liftoff

LiftoffはWebAssemblyのベースラインコンパイラであり、V8 v8.5以降すべてのプラットフォームで提供されています。[SIMD提案](https://v8.dev/features/simd)は、WebAssemblyが一般的に利用可能なハードウェアベクトル命令を利用し、計算集約型ワークロードの高速化を可能にします。現在、[Origin Trial](https://v8.dev/blog/v8-release-84#simd-origin-trial)中であり、標準化前にデベロッパーが機能を試験的に使用できます。

これまでSIMDは、V8の最上位コンパイラであるTurboFanでのみ実装されていました。これにより、SIMD命令の最大性能を得ることが可能になります。SIMD命令を使用するWebAssemblyモジュールは、TurboFanでコンパイルされたスカラー版よりも始動が速く、しばしばランタイム性能も向上します。例えば、浮動小数点数の配列を受け取り、その値をゼロに制限する関数（ここではJavaScriptで記述）を例に挙げます：

```js
function clampZero(f32array) {
  for (let i = 0; i < f32array.length; ++i) {
    if (f32array[i] < 0) {
      f32array[i] = 0;
    }
  }
}
```

この関数の異なる2つの実装、LiftoffとTurboFanを比較しましょう：

1. ループを4回展開したスカラー実装。
2. `i32x4.max_s`命令を使用したSIMD実装。

Liftoffスカラー実装を基準として、以下の結果が得られます：

![Liftoff SIMDがLiftoffスカラーに比べて約2.8倍高速であり、TurboFan SIMDが約7.5倍高速であることを示すグラフ](/_img/v8-release-86/simd.svg)

### WebAssemblyからJavaScriptへの呼び出しが高速化

WebAssemblyがインポートされたJavaScript関数を呼び出す際には、いわゆる「Wasm-to-JSラッパー」（または「インポートラッパー」）を介します。このラッパーは[引数を](https://webassembly.github.io/spec/js-api/index.html#tojsvalue)JavaScriptが理解できるオブジェクトに変換し、JavaScriptへの呼び出しから戻る際には戻り値を再び[WebAssembly](https://webassembly.github.io/spec/js-api/index.html#towebassemblyvalue)に変換します。

JavaScriptの`arguments`オブジェクトがWebAssemblyから渡された引数と完全に一致するようにするため、引数の数が不一致の場合には「arguments adapter trampoline」を使用して呼び出します。

しかし、多くの場合これは不要です。なぜなら呼び出される関数が`arguments`オブジェクトを使用しない場合があるからです。v8.6では、Microsoftのコントリビューターによる[パッチ](https://crrev.com/c/2317061)を適用し、このようなケースで引数アダプターを介さずに呼び出しを行うことで、対象の呼び出しを大幅に高速化しました。

## V8 API

### `Isolate::HasPendingBackgroundTasks`を使用してバックグラウンドタスクの保留を検出

新しいAPI関数`Isolate::HasPendingBackgroundTasks`により、埋め込みが将来的に新しいフォアグラウンドタスクを投稿する予定のバックグラウンド作業（例えばWebAssemblyのコンパイルなど）が保留されているかどうかを確認することができます。

このAPIは、埋め込みがまだ保留中のWebAssemblyコンパイルが存在し、さらなるスクリプト実行を開始するにもかかわらず、V8をシャットダウンする問題を解決するはずです。`Isolate::HasPendingBackgroundTasks`を使用することで、埋め込みはV8をシャットダウンする代わりに新しいフォアグラウンドタスクを待つことができます。

`git log branch-heads/8.5..branch-heads/8.6 include/v8.h`を使用してAPI変更のリストを取得してください。

V8のアクティブなチェックアウトを持つ開発者は、`git checkout -b 8.6 -t branch-heads/8.6`を使用してV8 v8.6の新しい機能を試すことができます。または[Chromeのベータチャンネルに申し込む](https://www.google.com/chrome/browser/beta.html)ことで、間もなく新しい機能を試すことができます。
