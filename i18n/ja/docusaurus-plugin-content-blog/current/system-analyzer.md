---
title: 'Indicium: V8 ランタイムトレーサーツール'
author: 'ゼイネプ・キャンカラ ([@ZeynepCankara](https://twitter.com/ZeynepCankara))'
avatars:
  - 'zeynep-cankara'
date: 2020-10-01 11:56:00
tags:
  - tools
  - system-analyzer
description: 'Indicium: V8 システム解析ツール。Map/IC イベントを分析する。'
tweet: '1311689392608731140'
---
# Indicium: V8 システム解析ツール

過去3ヶ月間、インターンとしてGoogleロンドンのV8チームに参加し、新しいツール[*Indicium*](https://v8.dev/tools/head/system-analyzer)の開発に取り組む機会を得て、とても素晴らしい学びの経験がありました。

このシステム解析ツールは、インラインキャッシュ (ICs) と Map がリアルワールドのアプリケーションでどのように生成・変更されるかのパターンをトレース、デバッグ、分析するための統一されたウェブインターフェイスです。

V8はすでに[ICs](https://mathiasbynens.be/notes/shapes-ics)と[Maps](https://v8.dev/blog/fast-properties)のトレーシングインフラを持っており、[IC Explorer](https://v8.dev/tools/v8.7/ic-explorer.html)を使用してICイベントを分析し、[Map Processor](https://v8.dev/tools/v8.7/map-processor.html)を使用してMapイベントを分析することができます。しかし、従来のツールではMapとICを総合的に解析することはできませんでしたが、システム解析ツールを使うことでこれが可能になりました。

<!--truncate-->
![Indicium](/_img/system-analyzer/indicium-logo.png)

## ケーススタディ

MapおよびICのログイベントをV8で解析するためにIndiciumの使い方を実演する例を見てみましょう。

```javascript
class Point {
  constructor(x, y) {
    if (x < 0 || y < 0) {
      this.isNegative = true;
    }
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}

let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

// ウォームアップ
for (let i = 0; i < 10e5; i++) {
  dotProduct = a.dotProduct(b);
}

console.time('snippet1');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet1');

a = new Point(-1, -1);
b = new Point(-2, -2);
console.time('snippet2');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet2');
```

ここでは、`Point`クラスを使用して2つの座標と座標値に基づく追加のboolean値を保存しています。`Point`クラスには、渡されたオブジェクトとレシーバー間の内積を返す`dotProduct`メソッドがあります。

プログラムの説明を容易にするため、ウォームアップフェーズを無視してプログラムを2つのスニペットに分けてみましょう：

### *スニペット1*

```javascript
let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

console.time('snippet1');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet1');
```

### *スニペット2*

```javascript
a = new Point(-1, -1);
b = new Point(-2, -2);
console.time('snippet2');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet2');
```

プログラムを実行すると、パフォーマンスの低下に気づきます。この2つのスニペットのパフォーマンスを測定していますが、どちらも`dotProduct`関数を使って`Point`オブジェクトインスタンスのプロパティ`x`と`y`にアクセスしています。

スニペット1はスニペット2より約3倍高速に動作します。その唯一の違いは、スニペット2では`Point`オブジェクトの`x`と`y`プロパティに負の値を使用していることです。

![スニペットのパフォーマンス分析](/_img/system-analyzer/initial-program-performance.png)

このパフォーマンスの違いを分析するために、V8に付属しているさまざまなログオプションを使用することができます。ここでシステム解析ツールの真価が発揮されます。システム解析ツールはログイベントを表示し、それらをMapイベントとリンクさせ、V8内部に隠された魔法を探索することができます。

ケーススタディにさらに深入りする前に、このツールのパネルについて少し慣れましょう。このツールには4つの主要なパネルがあります：

- 時間を通じてMap/ICイベントを解析するタイムラインパネル
- マップの遷移ツリーを視覚化するマップパネル
- ICイベントの統計情報を取得するICパネル
- スクリプト上でMap/ICファイル位置を表示するソースパネル

![システム解析ツールの概要](/_img/system-analyzer/system-analyzer-overview.png)

![ICイベントを関数名でグループ化して、`dotProduct`に関連するICイベントの詳細情報を取得する](/_img/system-analyzer/case1_1.png)

このパフォーマンスの違いを引き起こしている可能性がある`dotProduct`関数を分析しています。したがって、関数名でICイベントをグループ化して、`dotProduct`関数に関連するICイベントの詳細情報をより深く得ることができます。

最初に気づくのは、この関数内で記録されたICイベントによって2つの異なるIC状態遷移があることです。一つは非初期化から単一形態へ、もう一つは単一形態から多態へと変化しています。多態IC状態は`Point`オブジェクトに関連する複数のMapを追跡していることを示しており、この多態状態は追加のチェックを行わなければならないため、パフォーマンスが悪くなります。

なぜ同じ種類のオブジェクトに対して複数のMap形状を作成しているのかを知りたいです。そのために、IC状態に関する情報ボタンを切り替えて、未初期化から単一形態進化までのMapアドレスについての詳細情報を取得します。

![単一形態進化IC状態に関連するMap遷移木。](/_img/system-analyzer/case1_2.png)

![多形進化IC状態に関連するMap遷移木。](/_img/system-analyzer/case1_3.png)

単一形態進化IC状態の場合、遷移木を視覚化し、動的にプロパティ`x`と`y`のみを追加していることが見えます。一方、多形進化IC状態では、`isNegative`、`x`、`y`という3つのプロパティを含む新しいMapがあることが確認できます。

![Sourceパネルでファイル位置を強調表示するMapパネル。](/_img/system-analyzer/case1_4.png)

`isNegative`プロパティがソースコードに追加される箇所を確認するためにMapパネルのファイル位置セクションをクリックし、この洞察を利用してパフォーマンスの低下問題を解決することができます。

ここでの問いは、*ツールから得た洞察を使ってパフォーマンスの低下問題にどのように対処するか*です。

最小限の解決策としては、常に`isNegative`プロパティを初期化することです。一般的には、すべてのインスタンスプロパティをコンストラクタで初期化すべきだというアドバイスがあります。

これにより、更新された`Point`クラスは以下のようになります:

```javascript
class Point {
  constructor(x, y) {
    this.isNegative = x < 0 || y < 0;
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}
```

スクリプトを再実行して更新された`Point`クラスを使用すると、最初の事例研究で定義された2つのスニペットが非常に似たパフォーマンスを示すことが分かります。

更新されたトレースでは、同じ種類のオブジェクトに対して複数のMapを生成していないため、多形進化IC状態を回避することが確認されます。

![修正されたPointオブジェクトのMap遷移木。](/_img/system-analyzer/case2_1.png)

## システムアナライザ

これからシステムアナライザ内の各パネルを詳しく見ていきましょう。

### タイムラインパネル

タイムラインパネルは時間単位で選択を可能にし、特定の時間点または選択範囲内でIC/Map状態を視覚化できます。選択された時間範囲に対するログイベントのズームイン/アウトなどのフィルタリング機能をサポートしています。

![タイムラインパネル概要](/_img/system-analyzer/timeline-panel.png)

![タイムラインパネル概要（続き）](/_img/system-analyzer/timeline-panel2.png)

### Mapパネル

Mapパネルには次の2つのサブパネルがあります:

1. Map詳細
2. Map遷移

Mapパネルは選択されたMapの遷移木を視覚化します。選択されたMapのメタデータはMap詳細サブパネルを通じて表示されます。提供されたインターフェースを使用して特定のMapアドレスに関連付けられている遷移木を検索できます。Map遷移サブパネル上部にあるStatsサブパネルでは、Map遷移を引き起こすプロパティやMapイベントの種類に関する統計を確認できます。

![Mapパネル概要](/_img/system-analyzer/map-panel.png)

![Statsパネル概要](/_img/system-analyzer/stats-panel.png)

### ICパネル

ICパネルでは特定の時間範囲内でのICイベントの統計が表示され、タイムラインパネルでフィルタリングされます。さらに、ICイベントをタイプ、カテゴリ、Map、ファイル位置などさまざまなオプションに基づいてグループ化できます。グループ化オプションの中で、Mapおよびファイル位置によるグループ化は、それぞれMapパネルおよびソースコードパネルとやりとりし、Mapの遷移木を表示し、ICイベントに関連するファイル位置を強調表示します。

![ICパネル概要](/_img/system-analyzer/ic-panel.png)

![ICパネル概要（続き）](/_img/system-analyzer/ic-panel2.png)

![ICパネル概要（続き）](/_img/system-analyzer/ic-panel3.png)

![ICパネル概要（続き）](/_img/system-analyzer/ic-panel4.png)

### ソースパネル

ソースパネルではクリック可能なマーカーが表示され、カスタムイベントが発信され、カスタムパネル全体でMapおよびICログイベントを選択できます。ドリルダウンバーからロードされたスクリプトの選択が可能です。MapパネルおよびICパネルからファイル位置を選択すると、ソースコードパネルで選択されたファイル位置が強調表示されます。

![ソースパネル概要](/_img/system-analyzer/source-panel.png)

### 謝辞

V8チームおよびWeb on Androidチームの皆さん、特にホストのSathyaと共同ホストのCamilloに感謝します。インターン期間中ずっと私をサポートし、この素晴らしいプロジェクトに取り組む機会を与えてくれました。

Googleでインターンシップをしたこの夏はとても素晴らしかったです！
