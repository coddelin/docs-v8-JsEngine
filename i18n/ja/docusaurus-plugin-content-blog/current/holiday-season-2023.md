---
title: &apos;V8はこれまで以上に速く、安全です！&apos;
author: &apos;[Victor Gomes](https://twitter.com/VictorBFG)、グリューワインの専門家&apos;
avatars:
  - victor-gomes
date: 2023-12-14
tags:
  - JavaScript
  - WebAssembly
  - セキュリティ
  - ベンチマーク
description: "2023年におけるV8の印象的な成果"
tweet: &apos;&apos;
---

速さが単なる特徴ではなく、生活の一部である刺激的なV8の世界へようこそ。2023年を締めくくるにあたり、今年達成したV8の印象的な成果を祝う時が来ました。

革新的なパフォーマンス最適化を通じて、V8はWebの進化し続ける景観において可能な限界を押し広げ続けています。今年は、新しい中間層コンパイラを導入し、上位層コンパイラのインフラストラクチャ、ランタイム、ガベージコレクタにいくつかの改善を実施しました。その結果、広範囲で大幅な速度向上が実現しました。

<!--truncate-->
パフォーマンスの向上に加え、JavaScriptとWebAssemblyの両方にエキサイティングな新機能を追加しました。また、[WebAssembly Garbage Collection (WasmGC)](https://v8.dev/blog/wasm-gc-porting)を使用して、効率的にWebにガベージコレクション対応言語を導入する新しいアプローチを採用しました。

さらに、私たちの卓越への献身はそこでは止まりません – 私たちは安全性も最優先しています。サンドボックスインフラストラクチャを改善し、V8に[Control-flow Integrity (CFI)](https://en.wikipedia.org/wiki/Control-flow_integrity)を導入することで、ユーザーにより安全な環境を提供しました。

以下に、今年の主なハイライトをまとめました。

# Maglev: 新しい中間層の最適化コンパイラ

[Maglev](https://v8.dev/blog/maglev)という名前の新しい最適化コンパイラを導入しました。このコンパイラは、既存の[Sparkplug](https://v8.dev/blog/sparkplug)と[TurboFan](https://v8.dev/docs/turbofan)の間に戦略的に配置され、非常に高速な最適化コンパイラとして効率的かつ卓越した速度で最適化されたコードを生成します。Maglevは、基準となる非最適化コンパイラSparkplugより20倍遅く、上位層コンパイラTurboFanより10～100倍速くコードを生成します。Maglevにより、[JetStream](https://browserbench.org/JetStream2.1/)が8.2%向上し、[Speedometer](https://browserbench.org/Speedometer2.1/)が6%向上するなど、大幅なパフォーマンス向上が観察されました。高速なコンパイル速度とTurboFanへの依存の削減により、SpeedometerのランにおけるV8の全体消費エネルギーが10%節約されました。[完全ではありませんが](https://en.m.wikipedia.org/wiki/Full-employment_theorem)、現在の状態はChrome 117での導入を正当化します。詳細は[ブログ投稿](https://v8.dev/blog/maglev)にて。

# Turboshaft: 上位層の最適化コンパイラ向け新アーキテクチャ

Maglevだけが改善されたコンパイラ技術への投資ではありません。上位層の最適化コンパイラTurbofanに新しい内部アーキテクチャTurboshaftを導入しました。これにより、新しい最適化の拡張が容易になり、コンパイル速度も向上しています。Chrome 120以降では、CPU非依存のバックエンドフェーズはすべてTurboshaftを使用しており、従来のTurbofanの約2倍の速度でコンパイルしています。これによりエネルギーが節約され、来年以降さらにエキサイティングなパフォーマンス向上への道が開かれています。今後の更新にご期待ください！

# 高速なHTMLパーサー

ベンチマーク時間のかなりの部分がHTML解析に費やされることを確認しました。V8の直接的な強化ではありませんが、パフォーマンス最適化の専門知識を活用し、Blinkに高速なHTMLパーサーを追加しました。これらの変更により、Speedometerのスコアが3.4%向上しました。この改良はChromeに非常に大きなポジティブな影響を与えたため、WebKitプロジェクトはこれらの変更を[リポジトリ](https://github.com/WebKit/WebKit/pull/9926)に迅速に統合しました。Webの高速化という共同目標に貢献できることを誇りに思います！

# 高速なDOM割り当て

また、DOM側への積極的な投資も行っています。[Oilpan](https://chromium.googlesource.com/v8/v8/+/main/include/cppgc/README.md) - DOMオブジェクトの割り当て用アロケータにおけるメモリ割り当て戦略の最適化を行いました。ページプールを導入し、カーネルへの往復のコストを大幅に削減しました。Oilpanは圧縮ポインタと非圧縮ポインタの両方をサポートし、Blinkで高頻度で使用するフィールドの圧縮を回避しています。解凍が頻繁に行われるため、これはパフォーマンスに広範な影響を与えました。さらに、アロケータが速いとわかったことで、頻繁に割り当てられるクラスを油田化し、割り当ての作業負荷を3倍高速化し、SpeedometerのようなDOMを多用するベンチマークで大幅な改善を示しました。

# 新しいJavaScript機能

JavaScriptは新たに標準化された機能により進化を続けており、今年も例外ではありませんでした。我々は[サイズ変更可能なArrayBuffers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer#resizing_arraybuffers)と[ArrayBufferの転送](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer)、文字列の[`isWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/isWellFormed)と[`toWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toWellFormed)、[正規表現の`v`フラグ](https://v8.dev/features/regexp-v-flag)（別名Unicodeセット表記）、[`JSON.parse`のsourceオプション](https://github.com/tc39/proposal-json-parse-with-source)、[配列のグループ化](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy)、[`Promise.withResolvers`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers)、そして[`Array.fromAsync`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fromAsync)を導入しました。残念ながら、[イテレーターのヘルパー](https://github.com/tc39/proposal-iterator-helpers)にウェブ互換性の問題が発見されたため導入を取りやめましたが、TC39と協力して問題を修正し、近いうちに再導入する予定です。最後に、`let`と`const`束縛に対しいくつかの冗長な時間的デッドゾーンチェックを[省略することで](https://docs.google.com/document/d/1klT7-tQpxtYbwhssRDKfUMEgm-NS3iUeMuApuRgZnAw/edit?usp=sharing)ES6+ JSコードを高速化しました。

# WebAssemblyのアップデート

今年、Wasmに関する多くの新機能やパフォーマンス改善が実現しました。[マルチメモリ](https://github.com/WebAssembly/multi-memory)、[テールコール](https://github.com/WebAssembly/tail-call)（詳細は[当社ブログ記事](https://v8.dev/blog/wasm-tail-call)をご覧ください）、および[リラックスされたSIMD](https://github.com/WebAssembly/relaxed-simd)のサポートを有効化し、次世代のパフォーマンスを解き放ちました。[memory64](https://github.com/WebAssembly/memory64)もメモリを大量消費するアプリケーションのために実装を終え、提案が[フェーズ4](https://github.com/WebAssembly/memory64/issues/43)に達するのを待っています。また、[例外処理提案](https://github.com/WebAssembly/exception-handling)の最新アップデートを取り入れつつ、以前のフォーマットもサポートしました。そして、[JSPI](https://v8.dev/blog/jspi)に投資を続けることで、[ウェブ上でさらに多くの新たなアプリケーションクラスを可能にする](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y/edit#bookmark=id.razn6wo5j2m)ことを目指しています。来年もご期待ください！

# WebAssemblyガベージコレクション

ウェブに新たなアプリケーションクラスをもたらすという点に関連して、数年にわたる[提案](https://github.com/WebAssembly/gc/blob/main/proposals/gc/MVP.md)の標準化および[実装](https://bugs.chromium.org/p/v8/issues/detail?id=7748)の努力を経て、ついにWebAssemblyガベージコレクション（WasmGC）を導入しました。Wasmは、V8の既存のガベージコレクターによって管理されるオブジェクトや配列を割り当てるための組み込み機能を持つようになりました。それにより、Java、Kotlin、Dartなどのガベージコレクションを利用する言語で書かれたアプリケーションをWasmにコンパイルすることが可能になります。これらは通常JavaScriptにコンパイルする場合の約2倍の速度で動作します。詳細は[当社ブログ記事](https://v8.dev/blog/wasm-gc-porting)をご覧ください。

# セキュリティ

セキュリティ面では、今年の主なトピックはサンドボックス化、ファジング、そしてCFIでした。[サンドボックス化](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing)の面では、コードテーブルや信頼できるポインタテーブルといった欠けているインフラの構築に注力しました。ファジングに関しては、インフラ構築から特殊用途のファジングツールや言語カバレッジの向上まで投資を行いました。これらの取り組みの一部は[こちらのプレゼンテーション](https://www.youtube.com/watch?v=Yd9m7e9-pG0)でご紹介しています。最後に、CFI関連では[CFIアーキテクチャ](https://v8.dev/blog/control-flow-integrity)の基盤を築き、可能な限り多くのプラットフォームで実現できるようにしました。この他にも、[一般的な攻撃手法](https://crbug.com/1445008)を回避するための取り組みや、[V8CTF](https://github.com/google/security-research/blob/master/v8ctf/rules.md)と呼ばれる新しいエクスプロイト賞金プログラムの開始など、小規模ながら注目すべき努力も含まれています。

# 結論

今年を通じて、数多くのインクリメンタルなパフォーマンス向上に取り組みました。これらの小規模プロジェクトとブログ記事で詳述したものの総合的な影響は非常に大きいです！以下は、2023年に達成されたV8のパフォーマンス向上を示すベンチマークスコアで、JetStreamでは`14%`、Speedometerでは驚異的な`34%`の成長を遂げました。

![13インチM1 MacBook Proで測定されたウェブ性能ベンチマーク。](/_img/holiday-season-2023/scores.svg)

これらの結果は、V8がかつてないほど高速かつ安全であることを示しています。開発者の皆さん、準備を整えてください。V8との旅は、速くそして激しいウェブの探検が始まったばかりです！我々はV8を地球上最高のJavaScriptとWebAssemblyエンジンであり続けるよう取り組み続けます！

V8の全スタッフから、ウェブの旅路で高速、安全、そして素晴らしい体験に満ち溢れた喜びのホリデーシーズンをお過ごしいただけますようお祈りしています！
