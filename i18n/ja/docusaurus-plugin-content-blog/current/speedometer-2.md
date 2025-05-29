---
title: "ChromeがSpeedometer 2.0を歓迎！"
author: "BlinkとV8チーム"
date: 2018-01-24 13:33:37
tags:
  - ベンチマーク
description: "Speedometer 2.0を基にしたBlinkとV8におけるパフォーマンス改善の概要。"
tweet: "956232641736421377"
---
Speedometer 1.0が2014年にリリースされて以来、BlinkとV8チームはこのベンチマークを人気のJavaScriptフレームワークの実際の使用状況の代理として活用し、ベンチマーク上で大幅な性能向上を達成しました。これらの改善が実際のユーザーに利益をもたらしていることを確認するため、実際のウェブサイトを測定したところ、人気のウェブサイトのページロード時間が改善されることでSpeedometerスコアも向上することを観察しました。

<!--truncate-->
その間にJavaScriptはES2015以降の標準により多くの新しい言語機能を追加し、急速に進化しました。同様にフレームワークも進化しており、Speedometer 1.0は時間とともに古くなっています。そのため、Speedometer 1.0を最適化の指標として使用すると、積極的に使用されている新しいコードパターンを測定できないリスクが高まります。

BlinkとV8チームは[最近リリースされたSpeedometer 2.0ベンチマーク](https://webkit.org/blog/8063/speedometer-2-0-a-benchmark-for-modern-web-app-responsiveness/)を歓迎します。最新のフレームワーク、トランスパイラ、ES2015機能のリストに適用されることで、再び最適化の主な候補となるこのベンチマークは、[実際のパフォーマンスベンチマークツールキット](/blog/real-world-performance)に素晴らしい追加になります。

## Chromeのこれまでの実績

BlinkとV8チームはすでに最初のラウンドの改善を完了しており、このベンチマークの重要性を示しています。そして実際のパフォーマンスに集中する旅を続けています。2017年7月のChrome 60と最新のChrome 64を比較すると、2016年中期のMacBook Pro（4コア、16GB RAM）で総スコア（毎分の実行数）が約21％向上したことを達成しました。

![Chrome 60と64のSpeedometer 2スコアの比較](/_img/speedometer-2/scores.png)

Speedometer 2.0の個々の項目にズームインしてみましょう。Reactランタイムの性能を[`Function.prototype.bind`](https://chromium.googlesource.com/v8/v8/+/808dc8cff3f6530a627ade106cbd814d16a10a18)の改善により倍増させました。Vanilla-ES2015、AngularJS、Preact、VueJSは[JSONパーシングの速度向上](https://chromium-review.googlesource.com/c/v8/v8/+/700494)やその他のパフォーマンス修正により19％〜42％向上しました。jQuery-TodoMVCアプリのランタイムは、BlinkのDOM実装の改善、例えば[より軽量なフォームコントロール](https://chromium.googlesource.com/chromium/src/+/f610be969095d0af8569924e7d7780b5a6a890cd)や[HTMLパーサーの調整](https://chromium.googlesource.com/chromium/src/+/6dd09a38aaae9c15adf5aad966f761f180bf1cef)によって減少しました。さらに、V8のインラインキャッシュを最適化コンパイラと組み合わせて微調整することで、全体的に改善をもたらしました。

![Chrome 60から64までのSpeedometer 2の各サブテストスコアの改善](/_img/speedometer-2/improvements.png)

Speedometer 1.0と比べて大きな変化は最終スコアの計算方法です。以前は全スコアの平均値が最も遅い項目のみに取り組むことを優先していました。それぞれの項目に費やされた絶対時間を見てみると、例えばEmberJS-Debugバージョンが最速のベンチマークより約35倍長い時間を要していることが分かりました。したがって、全体スコアを改善するにはEmberJS-Debugに焦点を当てることが最も効果的です。

![](/_img/speedometer-2/time.png)

Speedometer 2.0は最終スコアに幾何平均を使用しており、各フレームワークへの均等な投資を好みます。例えば、最近の16.5％のPreact改善を考えてみましょう。その寄与が合計時間に対して小さいからといって、16.5％の改善を無視するのは不公平でしょう。

Speedometer 2.0へのさらなるパフォーマンス改善と、それを通じてウェブ全体への貢献を楽しみにしています。さらに多くのパフォーマンスアップデートをお楽しみに。
