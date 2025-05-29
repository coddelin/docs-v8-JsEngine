---
title: "BlinkOn 6会議でのV8"
author: "V8チーム"
date: 2016-07-21 13:33:37
tags:
  - プレゼンテーション
description: "BlinkOn 6でのV8チームのプレゼンテーション概要。"
---
BlinkOnは、Blink、V8、Chromiumの貢献者による年2回開催されるミーティングです。BlinkOn 6は6月16日と17日にミュンヘンで開催されました。V8チームはアーキテクチャ、デザイン、パフォーマンスの取り組み、言語実装に関する数々のプレゼンテーションを行いました。

<!--truncate-->
以下にV8 BlinkOnでの話を埋め込んでいます。

## 実世界のJavaScriptパフォーマンス

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/xCx4uC7mn6Y" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 長さ: 31:41
- [スライド](https://docs.google.com/presentation/d/14WZkWbkvtmZDEIBYP5H1GrbC9H-W3nJSg3nvpHwfG5U/edit)

V8がJavaScriptパフォーマンスを測定する方法の歴史や、ベンチマークの異なる時代、そしてリアルワールドの人気ウェブサイトのページロードをV8コンポーネント毎に詳細に分解して測定する新しい手法について説明します。

## Ignition: V8のインタープリタ

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/r5OWCtuKiAk" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 長さ: 36:39
- [スライド](https://docs.google.com/presentation/d/1OqjVqRhtwlKeKfvMdX6HaCIu9wpZsrzqpIVIwQSuiXQ/edit)

V8の新しいインタープリタ「Ignition」を紹介し、エンジン全体のアーキテクチャと、Ignitionがメモリ使用量や起動パフォーマンスに与える影響について説明します。

## V8のGCでのRAIL指標を測定・最適化する方法

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/VITAyGT-CJI" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 長さ: 27:11
- [スライド](https://docs.google.com/presentation/d/15EQ603eZWAnrf4i6QjPP7S3KF3NaL3aAaKhNUEatVzY/edit)

V8がRAIL（Response、Animation、Idle、Loading）指標を使用して低レイテンシのガベージコレクションを目指す方法や、モバイルのジャンクを減らすために最近行われた最適化について解説します。

## ECMAScript 2015以降

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/KrGOzEwqRDA" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 長さ: 28:52
- [スライド](https://docs.google.com/presentation/d/1o1wld5z0BM8RTqXASGYD3Rvov8PzrxySghmrGTYTgw0/edit)

V8の新しい言語機能の実装、これらの機能がウェブプラットフォームと統合する方法、そして進化を続けるECMAScript言語の標準プロセスについて最新情報を提供します。

## V8からBlinkへのトレーシングラッパー（ライトニングトーク）

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PMDRfYw4UYQ?start=3204" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 長さ: 2:31
- [スライド](https://docs.google.com/presentation/d/1I6leiRm0ysSTqy7QWh33Gfp7_y4ngygyM2tDAqdF0fI/edit)

V8とBlinkオブジェクト間のトレーシングラッパー、そのラッパーがメモリリークを防ぎ、レイテンシを低減する方法について強調します。
