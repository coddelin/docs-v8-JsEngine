---
title: "V8 リリース v8.9"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), 呼び出し待ち"
avatars: 
 - "ingvar-stepanyan"
date: 2021-02-04
tags: 
 - リリース
description: "V8 リリース v8.9 は、引数数のミスマッチがある呼び出しの性能を向上します。"
tweet: "1357358418902802434"
---
6週間ごとに、[リリースプロセス](https://v8.dev/docs/release-process)の一環として、新しい V8 のブランチを作成しています。各バージョンは、Chrome ベータマイルストーンの直前に V8 の Git マスターから分岐されます。本日、新しいブランチ [V8 バージョン 8.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.9) を発表できることを嬉しく思います。このバージョンは、数週間後に Chrome 89 の安定版と連携してリリースされるまでベータ版となります。V8 v8.9 は、開発者に向けたさまざまな新機能が満載です。この投稿では、リリースに先立っていくつかの重要なハイライトを紹介します。

<!--truncate-->
## JavaScript

### トップレベル `await`

トップレベルの [`await`](https://v8.dev/features/top-level-await) は、V8 の主要な埋め込みエンジンである [Blink レンダリングエンジン](https://www.chromium.org/blink) 89 で利用可能になりました。

スタンドアロン V8 では、トップレベルの `await` は引き続き `--harmony-top-level-await` フラグの後ろに隠されています。

詳細については、[私たちの説明ページ](https://v8.dev/features/top-level-await)をご覧ください。

## パフォーマンス

### 引数数ミスマッチがある呼び出しの高速化

JavaScript では、実際に渡される引数の数が期待される引数の数と異なる場合でも関数を呼び出すことができます。すなわち、宣言された形式パラメータより少ない、または多い引数を渡すことが可能です。前者は「不足適用」と呼ばれ、後者は「過剰適用」と呼ばれます。

不足適用のケースでは、残りのパラメータは `undefined` 値に割り当てられます。過剰適用のケースでは、残りの引数は残余引数や `Function.prototype.arguments` プロパティを使用してアクセスすることができます。あるいは、それらは単純に過剰で無視されます。現在、多くのウェブフレームワークや Node.js フレームワークが、この JavaScript の機能を使用してオプションパラメータを受け入れ、より柔軟な API を作成しています。

最近まで、V8 では引数数ミスマッチに対応するために特別な仕組み、すなわち「引数アダプタフレーム」を使用していました。しかし、引数の適用にはパフォーマンスコストが伴い、これは現代のフロントエンドおよびミドルウェアフレームワークで一般的に必要とされます。しかし、スタック内の引数の順序を逆にするなど巧妙な設計により、この追加のフレームを削除し、V8 コードベースを簡素化し、ほとんどすべてのオーバーヘッドを取り除くことができます。

![引数アダプタフレームを削除した場合のパフォーマンス影響を示すマイクロベンチマークのグラフ。](/_img/v8-release-89/perf.svg)

グラフは、[JIT-less モード](https://v8.dev/blog/jitless) (Ignition) で実行した場合、11.2% のパフォーマンス向上があり、もはやオーバーヘッドが存在しないことを示しています。TurboFan を使用する場合、最大で 40% の速度向上が得られます。ミスマッチがないケースと比較したオーバーヘッドは、[関数エピローグ](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/x64/code-generator-x64.cc;l=4905;drc=5056f555010448570f7722708aafa4e55e1ad052) の小さな最適化によるものです。詳細については、[設計ドキュメント](https://docs.google.com/document/d/15SQV4xOhD3K0omGJKM-Nn8QEaskH7Ir1VYJb9_5SjuM/edit)をご覧ください。

これらの改善の背後にある詳細について知りたい場合は、[専用のブログ投稿](https://v8.dev/blog/adaptor-frame)をご覧ください。

## V8 API

`git log branch-heads/8.8..branch-heads/8.9 include/v8.h` を使用して、API 変更のリストを取得してください。

アクティブな V8 チェックアウトを持つ開発者は、`git checkout -b 8.9 -t branch-heads/8.9` を使用して V8 v8.9 の新機能を試すことができます。または、[Chrome の Beta チャンネル](https://www.google.com/chrome/browser/beta.html)を購読して、自分で新しい機能を試すこともできます。
