---
title: "Oilpanライブラリ"
author: "Anton Bikineev、Omer Katz（[@omerktz](https://twitter.com/omerktz)）、Michael Lippautz（[@mlippautz](https://twitter.com/mlippautz)）効率的で効果的なファイル移動者たち"
avatars: 
  - anton-bikineev
  - omer-katz
  - michael-lippautz
date: 2021-11-10
tags: 
  - internals
  - memory
  - cppgc
description: "V8は、管理されたC++メモリをホストするためのガベージコレクションライブラリOilpanを搭載しています。"
tweet: "1458406645181165574"
---

この投稿のタイトルから、オイルパンに関する書籍のコレクションを深掘りするのかと思うかもしれませんが、今回は違います。その代わりに、V8 v9.4以降ライブラリとしてホストされているC++ガベージコレクターであるOilpanについて詳しく見ていきます。

<!--truncate-->
Oilpanは[トレースベースのガベージコレクター](https://en.wikipedia.org/wiki/Tracing_garbage_collection)であり、マークフェーズでオブジェクトグラフをトラバースしてライブオブジェクトを特定します。その後スイープフェーズでデッドオブジェクトが回収されます。このプロセスについては[過去にブログで言及](https://v8.dev/blog/high-performance-cpp-gc)しています。両フェーズはC++アプリケーションコードと並行して、または交互に実行される可能性があります。ヒープオブジェクトの参照処理は厳密であり、ネイティブスタックに対しては保守的です。つまり、Oilpanはヒープ上の参照がどこにあるかを知っていますが、スタックについてはランダムなビット列がポインタを表すと仮定してメモリをスキャンする必要があります。また、ガベージコレクションがネイティブスタックなしで実行される場合、特定のオブジェクトに対してヒープのデフラグ（圧縮）をサポートします。

では、なぜV8を通じてライブラリとして提供しているのでしょうか？

WebKitからフォークされたBlinkはもともと、ヒープメモリを管理するために[C++の一般的なパラダイム](https://en.cppreference.com/w/cpp/memory/shared_ptr)である参照カウンティングを使用していました。参照カウンティングはメモリ管理の問題を解決するためのものですが、サイクルによるメモリリークが発生しやすいという問題があります。この本質的な問題に加えて、Blinkでは[解放済みメモリの再利用問題](https://en.wikipedia.org/wiki/Dangling_pointer)にも悩まされていました。これは、パフォーマンス上の理由から参照カウンティングが省略されることがあるためです。Oilpanは当初、プログラミングモデルの簡略化およびメモリリークや解放済みメモリの再利用問題の解消を目的として、特にBlink向けに開発されました。我々は、Oilpanがモデルの簡略化の達成およびコードの安全性向上に成功したと考えています。

BlinkにOilpanを導入したもう一つの理由は、V8のような他のガベージ収集システムとの統合を進めることでした。そして最終的に、[統一されたJavaScriptとC++ヒープ](https://v8.dev/blog/tracing-js-dom)の実装が実現され、OilpanはC++オブジェクトの処理を担当するようになりました[^1]。管理対象となるオブジェクト階層が増え、V8との統合が進むにつれて、Oilpanは次第に複雑化し、チームはV8のガベージコレクターで用いられる概念を再発明していることに気付きました。Blinkでの統合では、統一ヒープの「Hello World」ガベージコレクションテストを実行するために約3万のターゲットをビルドする必要がありました。

2020年初頭、私たちはBlinkからOilpanを切り離し、ライブラリとしてカプセル化する取り組みを開始しました。コードをV8内にホストし、可能な限り抽象化を再利用し、ガベージコレクションインターフェイスを整理することにしました。これまでに述べた問題をすべて解決することに加えて、[ライブラリ](https://docs.google.com/document/d/1ylZ25WF82emOwmi_Pg-uU6BI1A-mIbX_MG9V87OFRD8/)は他のプロジェクトもガベージコレクションされたC++を利用できるようにしました。このライブラリをV8 v9.4でリリースし、Chromium M94でBlinkに導入しました。

## 箱の中身は？

V8の他部分と同様に、Oilpanは現在[安定したAPI](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/)を提供しており、組み込み側は通常の[V8の規約](https://v8.dev/docs/api)に依存できます。例えば、これによりAPIは適切にドキュメント化され、（[GarbageCollected](https://chromium.googlesource.com/v8/v8.git/+/main/include/cppgc/garbage-collected.h#17)を参照）削除や変更対象となる場合には廃止までの期間が設けられます。

Oilpanのコアは、`cppgc`名前空間で独立したC++ガベージコレクタとして利用可能です。このセットアップにより、既存のV8プラットフォームを再利用して、管理されたC++オブジェクトのためのヒープを作成することもできます。ガベージコレクションはタスクのインフラストラクチャに統合して自動的に実行されるように設定したり、ネイティブスタックを考慮して手動でトリガーすることも可能です。このアイデアは、管理されたC++オブジェクトだけを使用したいエンベッダーが、V8全体に対処する必要を回避することを目的としています。この[hello worldプログラム](https://chromium.googlesource.com/v8/v8.git/+/main/samples/cppgc/hello-world.cc)を例としてご覧ください。この構成のエンベッダーであるPDFiumは、[XFAのセキュリティ](https://groups.google.com/a/chromium.org/g/chromium-dev/c/RAqBXZWsADo/m/9NH0uGqCAAAJ?utm_medium=email&utm_source=footer)を強化するためにOilpanの独立バージョンを利用しており、より動的なPDFコンテンツを可能にしています。

便利なことに、Oilpanのコアに対するテストはこのセットアップを使用しており、特定のガベージコレクションテストを構築して実行するのに数秒しかかかりません。本日時点で、Oilpanのコアには[400以上のそのような単体テスト](https://source.chromium.org/chromium/chromium/src/+/main:v8/test/unittests/heap/cppgc/)が存在します。このセットアップは、新しいことを試したり実験したりするためのプレイグラウンドとしても機能しており、パフォーマンスに関する仮定を検証するためにも使用できます。

Oilpanライブラリは、V8を通じて統一ヒープで動作する際にC++オブジェクトを処理することも担当しており、C++とJavaScriptのオブジェクトグラフを完全に絡めることができます。この構成は、DOMなどのC++メモリを管理するためにBlinkで使用されています。Oilpanはまた、独自のトレイトシステムを公開しており、特定の生存判定ニーズを持つ型でガベージコレクタのコアを拡張することを可能にします。この方法により、Blinkは独自のコレクションライブラリを提供することが可能になり、JavaScriptスタイルのエフェメロンマップ（[`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)）をC++で構築することさえできます。我々はこれをすべての人に推奨するわけではありませんが、カスタマイズの必要がある場合にこのシステムが何を可能にするかを示しています。

## 次はどこに向かうのか？

Oilpanライブラリは、パフォーマンスを向上させるために活用できる堅実な基盤を提供します。以前は、V8のパブリックAPIでガベージコレクション特有の機能を指定してOilpanと連携する必要がありましたが、現在では必要なものを直接実装することが可能です。これにより、速い反復が可能になり、可能な場合にはショートカットを利用しパフォーマンスを向上させることもできます。

また、Oilpanを通じて直接基本的なコンテナを提供する可能性も感じています。これにより他のエンベッダーも、以前はBlink専用に作成されたデータ構造の恩恵を受けることができます。

Oilpanの明るい未来を見据えつつ、既存の[`EmbedderHeapTracer`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-embedder-heap.h;l=75) APIはこれ以上改良されず、将来的には廃止される可能性があることを述べておきます。これらのAPIを利用して独自のトレースシステムをすでに実装しているエンベッダーの場合、新たに作成された[Oilpanヒープ](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-cppgc.h;l=91)上にC++オブジェクトを割り当て、これをV8 Isolateにアタッチするだけで移行が可能なはずです。[`TracedReference`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-traced-handle.h;l=334)（V8への参照用）や[内部フィールド](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-object.h;l=502)（V8からの出力参照用）などの参照をモデリングする既存のインフラストラクチャもOilpanでサポートされています。

今後もガベージコレクションの改善にご期待ください！

問題が発生した場合や提案がある場合は、以下にお知らせください：

- [oilpan-dev@chromium.org](mailto:oilpan-dev@chromium.org)
- Monorail: [Blink>GarbageCollection](https://bugs.chromium.org/p/chromium/issues/entry?template=Defect+report+from+user&components=Blink%3EGarbageCollection) (Chromium), [Oilpan](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user&components=Oilpan) (V8)

[^1]: コンポーネント全体のガベージコレクションに関する詳細情報は[この研究記事](https://research.google/pubs/pub48052/)をご覧ください。
