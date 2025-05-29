---
title: &apos;V8の未来をテストするために助けてください！&apos;
author: &apos;Daniel Clifford ([@expatdanno](https://twitter.com/expatdanno)), オリジナルミュンヘンV8醸造者&apos;
date: 2017-02-14 13:33:37
tags:
  - internals
description: &apos;今日、Chrome CanaryでIgnitionとTurboFanを使用したV8の新しいコンパイラパイプラインをプレビューできます！&apos;
---
V8チームは現在、[リアルワールドのJavaScript](/blog/real-world-performance)に向けた将来のスピードアップを実現する新しいデフォルトのコンパイラパイプラインに取り組んでいます。この新しいパイプラインは、すべてのChromeチャンネルに新しい構成を展開する際に驚きがないことを確認するために、今日Chrome Canaryでプレビューできます。

<!--truncate-->
新しいコンパイラパイプラインは、[Ignitionインタープリタ](/blog/ignition-interpreter)と[TurboFanコンパイラ](/docs/turbofan)を使用してすべてのJavaScriptを実行します（以前のパイプラインではFull-codegenとCrankshaftコンパイラが使用されていました）。Chrome CanaryとChrome Developerチャンネルのランダムなサブセットのユーザーはすでに新しい構成をテストしています。ただし、誰でもabout:flagsでフラグを切り替えることで新しいパイプラインを選択する（または古いものに戻す）ことができます。

好きなウェブサイトでChromeを使用して新しいパイプラインを選択してテストすることで、新しいパイプラインのテストを支援できます。ウェブ開発者の方は、是非新しいコンパイラパイプラインを使用してウェブアプリケーションをテストしてください。安定性、正確性、またはパフォーマンスに回帰がある場合は、[V8のバグトラッカーに問題を報告してください](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline)。

## 新しいパイプラインを有効にする方法

### Chrome 58の場合

1. 最新の[Beta](https://www.google.com/chrome/browser/beta.html)をインストール
2. ChromeでURL `about:flags` を開く
3. 「**Experimental JavaScript Compilation Pipeline**」を検索し、「**Enabled**」に設定

![](/_img/test-the-future/58.png)

### Chrome 59.0.3056以降の場合

1. 最新の[Canary](https://www.google.com/chrome/browser/canary.html) または [Dev](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel)をインストール
2. ChromeでURL `about:flags` を開く
3. 「**Classic JavaScript Compilation Pipeline**」を検索し、「**Disabled**」に設定

![](/_img/test-the-future/59.png)

標準の値は「**Default**」となります。これは、A/Bテストの構成に応じて新しい**もしくは**従来のパイプラインがアクティブになることを意味します。

## 問題を報告する方法

新しいパイプラインを使用する際にデフォルトのパイプラインと比較してブラウジング体験が大きく変化した場合はぜひお知らせください。ウェブ開発者の方は、新しいパイプラインが（モバイル）ウェブアプリケーションのパフォーマンスにどのように影響するかを確認するためにテストしてください。ウェブアプリケーションが奇妙な動作をしたり（またはテストが失敗したり）したことを発見した場合は、ぜひ情報をお寄せください：

1. 前のセクションで述べた方法に従って新しいパイプラインを正しく有効化していることを確認。
2. [V8のバグトラッカーにバグを作成](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline)。
3. 問題を再現するために使用できるサンプルコードを添付。
