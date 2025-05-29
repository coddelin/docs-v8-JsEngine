---
title: 'Web Tooling Benchmarkを発表'
author: 'Benedikt Meurer（[@bmeurer](https://twitter.com/bmeurer)、JavaScriptパフォーマンスのジャグラー）'
avatars:
  - 'benedikt-meurer'
date: 2017-11-06 13:33:37
tags:
  - ベンチマーク
  - Node.js
description: '新しいWeb Tooling Benchmarkは、Babel、TypeScript、その他の実際のプロジェクトにおけるV8のパフォーマンスボトルネックを特定し修正するのに役立ちます。'
tweet: '927572065598824448'
---
JavaScriptのパフォーマンスは常にV8チームにとって重要な課題であり、この投稿では最近使用している新しいJavaScript[Web Tooling Benchmark](https://v8.github.io/web-tooling-benchmark)について説明し、V8のパフォーマンスボトルネックを特定および修正する方法を共有します。既にご存じの方もいるかもしれませんが、V8は[Node.jsに対する強いコミットメント](/blog/v8-nodejs)を持っており、このベンチマークは特にNode.jsに基づいて構築された一般的な開発者ツールを使ったパフォーマンステストを実施することでそのコミットメントを拡張しています。Web Tooling Benchmarkに含まれるツールは、現代的なウェブサイトやクラウドベースのアプリケーションを構築するために、開発者やデザイナーが現在使用しているものと同じです。[実際のパフォーマンス](/blog/real-world-performance/)に焦点を合わせる現在進行中の取り組みを継続するために、開発者が毎日実際に使用するコードを基にベンチマークを作成しました。

<!--truncate-->
Web Tooling Benchmarkスイートは、Node.jsの重要な[開発者ツールユースケース](https://github.com/nodejs/benchmarking/blob/master/docs/use_cases.md#web-developer-tooling)をカバーするように初めから設計されました。V8チームは基本的なJavaScriptパフォーマンスに焦点を当てているため、このベンチマークはJavaScriptのワークロードに集中し、Node.js特有のI/Oや外部のインタラクションの測定を除外しています。この構成により、ベンチマークをNode.js、すべてのブラウザ、および主要なJavaScriptエンジンシェル（`ch`（ChakraCore）、`d8`（V8）、`jsc`（JavaScriptCore）、そして`jsshell`（SpiderMonkey））で実行することが可能です。ベンチマークはNode.jsに限定されていないにもかかわらず、[Node.jsベンチマーク作業部会](https://github.com/nodejs/benchmarking)がこのツールベンチマークをNodeパフォーマンスの標準として使用することを検討していることに魅了されています（[nodejs/benchmarking#138](https://github.com/nodejs/benchmarking/issues/138)).

ツールベンチマークの個々のテストでは、開発者が通常JavaScriptベースのアプリケーションを構築する際に使用するさまざまなツールをカバーしています。例えば、以下のツールが含まれています：

- `es2015`プリセットを使用する[Babel](https://github.com/babel/babel)トランスパイラー。
- Babelで使用されるパーサー[Babylon](https://github.com/babel/babylon)、（[lodash](https://lodash.com/)や[Preact](https://github.com/developit/preact)バンドルなどの人気の入力を対象）。
- [webpack](http://webpack.js.org/)で使用される[acorn](https://github.com/ternjs/acorn)パーサー。
- [TodoMVC](https://github.com/tastejs/todomvc)プロジェクトの例である[typescript-angular](https://github.com/tastejs/todomvc/tree/master/examples/typescript-angular)に対して実行される[TypeScript](http://www.typescriptlang.org/)コンパイラ。

含まれるすべてのテストの詳細については、[詳細な分析](https://github.com/v8/web-tooling-benchmark/blob/master/docs/in-depth.md)をご覧ください。

[Speedometer](http://browserbench.org/Speedometer)などの以前のベンチマークの経験に基づき、フレームワークの新しいバージョンが利用可能になると、テストが迅速に時代遅れになることがあるため、ベンチマーク内の各ツールをリリースされる最新バージョンに簡単に更新できるようにしました。npmインフラストラクチャに基づいてベンチマークスイートを構築することで、最新のJavaScript開発ツールの状態を常にテストできるように簡単に更新できます。テストケースを更新する際は、`package.json`マニフェスト内のバージョンを変更するだけです。

新しいベンチマークで収集したV8のパフォーマンスに関する関連情報を含む[追跡バグ](http://crbug.com/v8/6936)と[スプレッドシート](https://docs.google.com/spreadsheets/d/14XseWDyiJyxY8_wXkQpc7QCKRgMrUbD65sMaNvAdwXw)を作成しました。我々の調査はすでにいくつかの興味深い結果を得ています。例えば、`instanceof`でV8がしばしば遅いパスに到達することを発見しました（[v8:6971](http://crbug.com/v8/6971)）、これにより3～4倍のスローダウンが発生しました。また、`Object.create(null)`を介して作成された`obj`に`obj[name] = val`の形式でプロパティを割り当てる特定のケースでパフォーマンスボトルネックを発見し修正しました。これらの場合、`obj`が`null`プロトタイプを持つという事実を利用できるにもかかわらず、V8は高速パスから外れてしまうことがありました（[v8:6985](http://crbug.com/v8/6985)）。このベンチマークの助けを借りたこれらやその他の発見によって、Node.jsだけでなくChromeでもV8が改善されました。

私たちはV8を高速化することだけでなく、ベンチマークのツールやライブラリにおけるパフォーマンスのバグを発見するたびに修正し、上流に改善を反映しました。例えば、[Babel](https://github.com/babel/babel)において以下のようなコードパターンに複数のパフォーマンスのバグがあることを発見しました。

```js
value = items[items.length - 1];
```

このコードは事前に`items`が空かどうかをチェックしないため、プロパティ`"-1"`へのアクセスを引き起こします。このコードパターンは、V8が`"-1"`の検索のために遅いパスを通る原因となりますが、少し修正した同等のJavaScriptコードのバージョンは遥かに高速です。私たちはBabelのこれらの問題を修正する手助けをしました（[babel/babel#6582](https://github.com/babel/babel/pull/6582)、[babel/babel#6581](https://github.com/babel/babel/pull/6581)、および [babel/babel#6580](https://github.com/babel/babel/pull/6580)）。また、Babelが文字列の長さを超えてアクセスするバグを発見し修正しました（[babel/babel#6589](https://github.com/babel/babel/pull/6589)）、これによってV8内で別の遅いパスが発生していました。加えて、V8において[配列や文字列の範囲外の読み込みを最適化しました](https://twitter.com/bmeurer/status/926357262318305280)。この重要な使用ケースの性能を向上させるために、V8の上で実行される場合だけでなく、ChakraCoreのような他のJavaScriptエンジン上で実行される場合についても[コミュニティとの協力を続けることを楽しみにしています](https://twitter.com/rauchg/status/924349334346276864)。

現実世界の性能に重点を置き、特に人気のあるNode.jsのワークロードを改善することに注力していることは、最近数回のリリースにわたるベンチマークスコアの一定の改善によって示されています:

![](/_img/web-tooling-benchmark/chart.svg)

[Ignition+TurboFanアーキテクチャへの切り替え](/blog/launching-ignition-and-turbofan)以前の最後のV8リリースであるV8 v5.8以降、ツールベンチマークにおけるV8のスコアは約**60%**改善されました。

過去数年間、V8チームは1つのJavaScriptベンチマークが JavaScriptエンジン全体の性能の単一の指標として使用されるべきではないことを認識してきました。しかし、私たちは新しい**Web Tooling Benchmark**が注目すべきJavaScript性能の領域を強調していると信じています。その名前と初期の動機にかかわらず、Web Tooling Benchmarkスイートはツールワークロードを代表するだけでなく、Speedometerのようなフロントエンド中心のベンチマークで十分に検証されないより高度なJavaScriptアプリケーションの広範囲を代表していることがわかりました。これはSpeedometerの代替ではなく、補完的なテストセットです。

何よりも嬉しいニュースは、Web Tooling Benchmarkが実際のワークロードを中心に構成されているため、ベンチマークスコアの最近の改善が直接的に[ビルド待ち時間の短縮](https://xkcd.com/303/)を通じて開発者生産性の向上につながると予想されることです。これらの改善の多くはすでにNode.jsで利用可能です。執筆時点では、Node 8 LTSはV8 v6.1を使用し、Node 9はV8 v6.2を使用しています。

ベンチマークの最新バージョンは[https://v8.github.io/web-tooling-benchmark/](https://v8.github.io/web-tooling-benchmark/)にホストされています。
