---
title: 'V8リリース v6.8'
author: 'V8チーム'
date: 2018-06-21 13:33:37
tags:
  - リリース
description: 'V8 v6.8はメモリ消費削減および複数のパフォーマンス改善を特徴としています。'
tweet: '1009753739060826112'
---
6週間ごとに、[リリースプロセス](/docs/release-process)の一環として新しいV8のブランチを作成します。各バージョンは、Chrome Betaのマイルストーン直前にV8のGitマスターから分岐します。本日、最新のブランチ[V8バージョン6.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.8)を発表できることを嬉しく思います。このバージョンは数週間後にChrome 68 Stableと連携してリリースされるまでベータ版で提供されます。V8 v6.8には、多くの開発者向けの機能が満載されています。この投稿では、リリースを前にいくつかのハイライトをご紹介します。

<!--truncate-->
## メモリ

JavaScript関数は不要に外側の関数とそのメタデータ（`SharedFunctionInfo`または`SFI`として知られる）を保持していました。特に短命のIIFE（即時呼び出し関数式）に依存する関数が多いコードでは、これが原因で間欠的なメモリリークが発生することがありました。この変更前では、アクティブな`Context`（関数実行のヒープ上の表現）は、コンテキストを作成した関数の`SFI`を保持していました:

![](/_img/v8-release-68/context-jsfunction-before.svg)

`Context`がデバッグに必要な簡易化された情報を含む`ScopeInfo`オブジェクトを指すことで、`SFI`への依存関係が解消されます。

![](/_img/v8-release-68/context-jsfunction-after.svg)

モバイルデバイスのトップ10ページのセットで、すでに3％のV8メモリ改善を観測しています。

同時に、`SFI`自体のメモリ消費を削減し、不必要なフィールドを削除したり、可能な場合に圧縮したりして、そのサイズを約25％削減しました。将来のリリースではさらに削減が予定されています。典型的なWebサイトでは、`SFI`がV8メモリの2〜6％を占めていますので、多くの関数を持つコードでもメモリ改善が見られるはずです。

## パフォーマンス

### 配列分解の改良

最適化コンパイラは配列分解のための理想的なコードを生成していませんでした。例えば、`[a, b] = [b, a]`を使用して変数を交換するのは、`const tmp = a; a = b; b = tmp`を使用するよりも2倍遅かったです。一時的な割り当てをすべて排除するためにエスケープ解析を解除した後、一時的な配列を使用した配列分解は代入のシーケンスと同じ速さになりました。

### `Object.assign`の改良

`Object.assign`にはこれまでC++で記述された高速なパスがありました。これにより、各`Object.assign`呼び出しでJavaScriptからC++への境界を越える必要がありました。組み込み性能を向上させる明らかな方法は、JavaScriptサイドに高速パスを実装することでした。選択肢は2つありました: ネイティブJS組み込みとして実装する（この場合、不要なオーバーヘッドが発生する）か、[CodeStubAssembler技術](/blog/csa)を使用して実装する（より柔軟性がある）。後者の方法を選びました。新しい`Object.assign`の実装は、[Speedometer2/React-Reduxのスコアを約15％改善し、Speedometer 2の総合スコアを1.5％改善します](https://chromeperf.appspot.com/report?sid=d9ea9a2ae7cd141263fde07ea90da835cf28f5c87f17b53ba801d4ac30979558&start_rev=550155&end_rev=552590)。

### `TypedArray.prototype.sort`の改良

`TypedArray.prototype.sort`には2つのパスがあります: ユーザーが比較関数を提供しない場合に使用される高速パスと、それ以外すべてのための低速パスです。これまで、低速パスは`Array.prototype.sort`の実装を再利用していましたが、これは`TypedArray`をソートするのに必要以上の処理を行っていました。V8 v6.8では、低速パスが[CodeStubAssembler](/blog/csa)で実装されたものに置き換えられました（直接のCodeStubAssemblerではなく、その上に構築されたドメイン固有言語を使用）。

比較関数なしで`TypedArray`をソートする際の性能は同じですが、比較関数を使用した場合は最大2.5倍の高速化が図られています。

![](/_img/v8-release-68/typedarray-sort.svg)

## WebAssembly

V8 v6.8では、Linux x64プラットフォーム上で[トラップベースの境界チェック](https://docs.google.com/document/d/17y4kxuHFrVxAiuCP_FFtFA2HP5sNPsCD10KEx17Hz6M/edit)を使用し始めることができます。このメモリ管理の最適化により、WebAssemblyの実行速度が大幅に向上します。すでにChrome 68で使用されていますが、将来的にはさらに多くのプラットフォームが順次サポートされる予定です。

## V8 API

`git log branch-heads/6.7..branch-heads/6.8 include/v8.h`を使用して、API変更の一覧を取得してください。

[アクティブなV8チェックアウト](/docs/source-code#using-git)をしている開発者は、`git checkout -b 6.8 -t branch-heads/6.8`を使用してV8 v6.8の新機能を試すことができます。あるいは、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)に登録して、間もなく自分で新機能を試すことができます。
