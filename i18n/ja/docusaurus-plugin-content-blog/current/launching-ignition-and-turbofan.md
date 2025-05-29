---
title: &apos;IgnitionとTurboFanの導入&apos;
author: &apos;V8チーム&apos;
date: 2017-05-15 13:33:37
tags:
  - internals
description: &apos;V8 v5.9では、IgnitionインタープリターとTurboFan最適化コンパイラを基盤とした新しいJavaScript実行パイプラインが導入されています。&apos;
---
本日、V8 v5.9用の新しいJavaScript実行パイプラインの導入を発表できることに興奮しています。このバージョンはChrome v59の安定版に到達します。この新しいパイプラインにより、実際のJavaScriptアプリケーションで大幅なパフォーマンス改善と大きなメモリ節約を実現しました。本記事の最後で数値について詳しく説明しますが、まずはパイプライン自体について見ていきましょう。

<!--truncate-->
新しいパイプラインは、V8のインタープリターである[Ignition](/docs/ignition)と、V8の最新最適化コンパイラである[TurboFan](/docs/turbofan)を基盤としています。これらの技術は、ここ数年のV8ブログをフォローしている方には馴染みがある[はず](/blog/turbofan-jit)[です](/blog/ignition-interpreter)[が](/blog/test-the-future)、新しいパイプラインへの切り替えは両技術にとって大きなマイルストーンとなります。

<figure>
  <img src="/_img/v8-ignition.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Ignitionのロゴ、V8の全く新しいインタープリター</figcaption>
</figure>

<figure>
  <img src="/_img/v8-turbofan.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>TurboFanのロゴ、V8の全く新しい最適化コンパイラ</figcaption>
</figure>

初めて、IgnitionとTurboFanがV8 v5.9においてJavaScript実行に普遍的かつ排他的に使用されることになります。さらに、v5.9以降、[2010年以来V8に貢献してきた](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)フルコードジェンおよびクランクシャフトは、JavaScript実行において使用されなくなります。これらの技術は、最近のJavaScript言語機能およびそれらの機能が必要とする最適化に対応できなくなったためです。我々は、これらを完全に削除する予定です。したがって、今後はV8全体のアーキテクチャがよりシンプルで維持可能なものになります。

## 長い旅

IgnitionとTurboFanを組み合わせたパイプラインの開発はほぼ3年半に及びます。これは、実際のJavaScriptパフォーマンスを測定し、フルコードジェンとクランクシャフトの短所を慎重に検討した結果、V8チームが得た集合的な洞察の結晶です。この基盤を用いて、今後何年にもわたりJavaScript言語全体を最適化し続けることができます。

TurboFanプロジェクトは、もともと2013年末にクランクシャフトの短所に対処するために開始されました。クランクシャフトはJavaScript言語のサブセットのみを最適化可能です。例えば、JavaScriptのtry、catch、finallyキーワードで区切られたコードブロックを使用する構造化例外処理を最適化する設計にはなっていません。クランクシャフトに新しい言語機能のサポートを追加するのは難しく、これらの機能はほぼ常に管理対象の九つのプラットフォームすべてにおいてアーキテクチャ固有のコードを書くことを必要とします。さらに、クランクシャフトのアーキテクチャは最適なマシンコードを生成する能力が制限されています。そのため、JavaScriptのパフォーマンスを最大限に引き出すことが難しく、V8チームがチップアーキテクチャごとに1万行を超えるコードを維持する必要があります。

TurboFanは当初から、当時のJavaScript標準、ES5に含まれる言語機能だけでなく、将来計画されていたES2015以降のすべての機能も最適化できるよう設計されました。これは、高レベルと低レベルのコンパイラ最適化を明確に分離し、新しい言語機能をアーキテクチャ固有のコードを変更せずに追加できるようにするレイヤードコンパイラ設計を導入します。さらにTurboFanは、各管理対象プラットフォーム向けのアーキテクチャ固有のコードを最初から非常に少なくすることを可能にする、明示的な命令選択フェーズを追加します。この新しいフェーズでは、アーキテクチャ固有のコードは一度書くだけで済み、その後あまり変更する必要はありません。このような決定により、V8がサポートするすべてのアーキテクチャ向けの、より維持可能で拡張性のある最適化コンパイラが実現されます。

V8のIgnitionインタープリターの背後にある元々の動機は、モバイルデバイスでのメモリー消費を削減することでした。Ignition以前は、V8のフルコードジェン基本コンパイラが生成するコードが、ChromeにおけるJavaScriptヒープ全体の約3分の1を占めることが典型的で、Webアプリケーションの実際のデータに使用できるスペースが減少しました。IgnitionがRAMに制限のあるAndroidデバイス向けにChrome M53で有効化されたとき、基準、非最適化状態のJavaScriptコードのメモリフットプリントは、ARM64ベースのモバイルデバイスで9倍縮小しました。

その後、V8チームはIgnitionのバイトコードがCrankshaftのようにソースコードを再コンパイルする必要がなく、TurboFanを使用して直接最適化された機械コードを生成できるという事実を活用しました。Ignitionのバイトコードは、V8の基本実行モデルをよりクリーンで誤りの少ないものとし、V8の[適応的最適化](https://en.wikipedia.org/wiki/Adaptive_optimization)の主要な特徴である非最適化メカニズムを簡素化します。さらに、バイトコードの生成はFull-codegenの基盤コンパイルコードの生成よりも速いため、Ignitionを有効化することは一般的にスクリプトの起動時間を改善し、それによってウェブページの読み込みを向上させます。

IgnitionとTurboFanの設計を緊密に結び付けることで、全体的なアーキテクチャにはさらに多くの利点があります。例えば、Ignitionの高性能バイトコードハンドラを手書きのアセンブリコードで記述する代わりに、V8チームはTurboFanの[中間表現](https://en.wikipedia.org/wiki/Intermediate_representation)を使用してハンドラの機能を表現し、TurboFanが最適化と最終コード生成をV8がサポートする多数のプラットフォーム向けに行います。これにより、IgnitionがV8のすべての対応チップアーキテクチャで優れた性能を示すことが保証される一方で、9つの別々のプラットフォームポートを維持する負担が排除されます。

## 数値を確認する

歴史はさておき、次に新しいパイプラインの実際の性能とメモリ消費について見てみましょう。

V8チームはリアルワールドの使用例の性能を[Telemetry - Catapult](https://catapult.gsrc.io/telemetry)フレームワークを使用して継続的に監視しています。このブログでは[以前](/blog/real-world-performance)、実際のテストデータを使用して性能最適化作業を進める重要性について議論し、[WebPageReplay](https://github.com/chromium/web-page-replay)をTelemetryと組み合わせて利用する方法を説明しました。IgnitionとTurboFanへの切り替えは、それらの実際のテストケースで性能の向上を示しています。具体的には、新しいパイプラインは著名なウェブサイトのユーザー操作ストーリーテストで大幅な速度向上をもたらします：

![ユーザー操作ベンチマークでV8に費やされる時間の減少](/_img/launching-ignition-and-turbofan/improvements-per-website.png)

Speedometerは合成ベンチマークですが、V8チームは以前、他の合成ベンチマークよりも現代的なJavaScriptの実際のワークロードをより正確に近似することを明らかにしました。IgnitionとTurboFanへの切り替えにより、V8のSpeedometerスコアはプラットフォームやデバイスによって5%-10%改善します。

新しいパイプラインは、サーバーサイドJavaScriptの速度も向上させます。Node.jsのベンチマークである[AcmeAir](https://github.com/acmeair/acmeair-nodejs)は架空の航空会社のサーバーバックエンド実装をシミュレートしますが、V8 v5.9を使用すると10%以上のスピードアップを実現しています。

![WebおよびNode.jsベンチマークの改善](/_img/launching-ignition-and-turbofan/benchmark-scores.png)

IgnitionとTurboFanはV8の全体的なメモリ使用量も削減します。Chrome M59では、新しいパイプラインがデスクトップおよび高性能モバイルデバイスでV8のメモリ使用量を5%-10%削減しました。この削減は、このブログで[以前に取り上げた](/blog/ignition-interpreter)Ignitionのメモリ節約をV8が対応するすべてのデバイスとプラットフォームに持ち込んだ結果です。

これらの改善は始まりにすぎません。新しいIgnitionとTurboFanのパイプラインは、JavaScriptの性能をさらに向上させ、ChromeとNode.js両方でV8のフットプリントを縮小するための最適化を進める道を開きます。我々はこれらの改善を開発者やユーザーに展開しながら共有するのを楽しみにしています。今後もご期待ください。
