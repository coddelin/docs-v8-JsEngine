---
title: 'WebAssembly機能のステージングおよび出荷に関するチェックリスト'
description: 'このドキュメントは、V8でWebAssembly機能をステージングおよび出荷する際のエンジニアリング要件に関するチェックリストを提供します。'
---
このドキュメントは、V8でWebAssembly機能をステージングおよび出荷する際のエンジニアリング要件に関するチェックリストを提供します。これらのチェックリストは指針として設計されており、すべての機能に適用できるわけではありません。実際のローンチプロセスについては、[V8ローンチプロセス](https://v8.dev/docs/feature-launch-process)をご参照ください。

# ステージング

## WebAssembly機能をステージングするタイミング

WebAssembly機能の[ステージング](https://docs.google.com/document/d/1ZgyNx7iLtRByBtbYi1GssWGefXXciLeADZBR_FxG-hE)は、実装フェーズの終了を定義します。以下のチェックリストが完了すると、実装フェーズが終了となります:

- V8での実装が完了している。これには以下が含まれます:
    - TurboFanでの実装（該当する場合）
    - Liftoffでの実装（該当する場合）
    - インタープリタでの実装（該当する場合）
- V8でのテストが利用可能である
- [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh)を実行して、仕様テストがV8に取り込まれている
- すべての既存の提案仕様テストが成功している。欠落している仕様テストは残念ですが、ステージングをブロックするべきではありません。

標準化プロセスにおける機能提案のステージは、V8でのステージングには影響しません。ただし、提案はほぼ安定している必要があります。

## WebAssembly機能をステージングする方法

- [`src/wasm/wasm-feature-flags.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-feature-flags.h)で、機能フラグを`FOREACH_WASM_EXPERIMENTAL_FEATURE_FLAG`マクロリストから`FOREACH_WASM_STAGING_FEATURE_FLAG`マクロリストへ移動する。
- [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh)で、提案リポジトリ名をリポジトリの`repos`リストへ追加する。
- [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh)を実行して、新しい提案の仕様テストを作成およびアップロードする。
- [`test/wasm-spec-tests/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-spec-tests/testcfg.py)で、提案リポジトリ名と機能フラグを`proposal_flags`リストに追加する。
- [`test/wasm-js/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-js/testcfg.py)で、提案リポジトリ名と機能フラグを`proposal_flags`リストに追加する。

[型反射のステージング](https://crrev.com/c/1771791)を参考にしてください。

# 出荷

## WebAssembly機能が出荷準備が整う時期

- [V8ローンチプロセス](https://v8.dev/docs/feature-launch-process)が満たされている。
- 実装がファジングツールでカバーされている（該当する場合）。
- 機能が数週間ステージングされており、ファジングツールでカバーされている。
- 提案が[ステージ4](https://github.com/WebAssembly/proposals)である。
- すべての[仕様テスト](https://github.com/WebAssembly/spec/tree/master/test)が成功している。
- [Chromium DevToolsのWebAssembly機能に関するチェックリスト](https://docs.google.com/document/d/1WbL-fGuLbbNr5-n_nRGo_ILqZFnh5ZjRSUcDTT3yI8s/preview)が満たされている。

## WebAssembly機能を出荷する方法

- [`src/wasm/wasm-feature-flags.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/wasm/wasm-feature-flags.h)で、機能フラグを`FOREACH_WASM_STAGING_FEATURE_FLAG`マクロリストから`FOREACH_WASM_SHIPPED_FEATURE_FLAG`マクロリストに移動する。
    - 機能を有効にすることによって引き起こされる[blink webテスト](https://v8.dev/docs/blink-layout-tests)の失敗をチェックするために、CLにblink CQボットを追加する (CL説明のフッターにこの行を追加: `Cq-Include-Trybots: luci.v8.try:v8_linux_blink_rel`)。
- さらに、`FOREACH_WASM_SHIPPED_FEATURE_FLAG`内の3番目のパラメータを`true`に変更することによって、デフォルトで機能を有効にする。
- 2つのマイルストーン後に機能フラグを削除するリマインダーを設定する。
