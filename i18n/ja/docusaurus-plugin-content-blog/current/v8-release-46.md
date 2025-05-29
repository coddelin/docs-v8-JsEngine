---
title: &apos;V8リリース v4.6&apos;
author: &apos;V8チーム&apos;
date: 2015-08-28 13:33:37
tags:
  - リリース
description: &apos;V8 v4.6はジャンクの削減と新しいES2015言語機能のサポートを提供します。&apos;
---
約6週間ごとに、私たちは[リリースプロセス](https://v8.dev/docs/release-process)の一環としてV8の新しいブランチを作成します。各バージョンはV8のGitマスターからChromeがChrome Betaマイルストーン用にブランチを分岐する直前に分岐されます。本日、私たちは最新のブランチ[V8バージョン4.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.6)を発表できることを喜ばしく思います。このバージョンは、Chrome 46 Stableと連携してリリースされるまでベータ版です。V8 4.6は、開発者向けの便利な機能でいっぱいなので、数週間後のリリースに先立って、いくつかのハイライトを事前にお届けしたいと思います。

<!--truncate-->
## 改良されたECMAScript 2015 (ES6)サポート

V8 v4.6では、いくつかの[ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/)機能をサポートしています。

### スプレッド演算子

[スプレッド演算子](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator)を使用すると、配列を操作するのが非常に便利になります。例えば、単純に配列を結合したい場合、従来の命令的なコードが不要になります。

```js
// 配列の結合
// スプレッド演算子なしのコード
const inner = [3, 4];
const merged = [0, 1, 2].concat(inner, [5]);

// スプレッド演算子を使用したコード
const inner = [3, 4];
const merged = [0, 1, 2, ...inner, 5];
```

スプレッド演算子のもうひとつの優れた使い方として、`apply`の代替があります:

```js
// 配列に格納された引数
// スプレッド演算子なしのコード
function myFunction(a, b, c) {
  console.log(a);
  console.log(b);
  console.log(c);
}
const argsInArray = [&apos;Hi &apos;, &apos;Spread &apos;, &apos;operator!&apos;];
myFunction.apply(null, argsInArray);

// スプレッド演算子を使用したコード
function myFunction (a,b,c) {
  console.log(a);
  console.log(b);
  console.log(c);
}

const argsInArray = [&apos;Hi &apos;, &apos;Spread &apos;, &apos;operator!&apos;];
myFunction(...argsInArray);
```

### `new.target`

[`new.target`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target)はクラスを操作する際に役立つES6の機能の1つです。この機能は実際にはすべての関数に対して暗黙的なパラメータとなります。関数がnewキーワードを使用して呼び出された場合、このパラメータには呼び出された関数への参照が保持されます。newが使用されない場合、このパラメータは未定義となります。

実際には、new.targetを使用すると、関数が通常どおり呼び出されたのか、newキーワードを介してコンストラクタとして呼び出されたのかを確認できます。

```js
function myFunction() {
  if (new.target === undefined) {
    throw &apos;newで呼び出してお試しください。&apos;;
  }
  console.log(&apos;動作しました！&apos;);
}

// エラー:
myFunction();

// 正常動作:
const a = new myFunction();
```

ES6のクラスと継承が使用される場合、スーパークラスのコンストラクタ内のnew.targetは、newで呼び出された派生クラスのコンストラクタにバインドされます。特にこれにより、コンストラクション中にスーパークラスが派生クラスのプロトタイプにアクセスできるようになります。

## ジャンクの削減

[ジャンク](https://en.wiktionary.org/wiki/jank#Noun)は特にゲームプレイ時に悩みの種となります。そして、多くの場合、ゲームが複数プレイヤーを特徴としている場合にはさらに悪化します。[oortonline.gl](http://oortonline.gl/)は、複雑な3Dシーンを粒子効果や最新のシェーダーレンダリングを使用して描画することで現在のブラウザの限界をテストするWebGLベンチマークです。V8チームはこれらの環境でChromeの性能の限界を押し広げるための探求を開始しました。まだ終わってはいませんが、私たちの努力の成果がすでに現れています。Chrome 46では、oortonline.glの性能における素晴らしい進展が見られます。

いくつかの最適化には次のものが含まれます:

- [TypedArrayの性能向上](https://code.google.com/p/v8/issues/detail?id=3996)
    - TypedArrayはTurbulenz（oortonline.glの背後にあるエンジン）などのレンダリングエンジンで頻繁に使用されます。例えば、エンジンはしばしばJavaScriptで型付き配列（例: Float32Array）を作成し、変換を適用した後にWebGLに渡します。
    - キーポイントは、埋め込み側（Blink）とV8の間の相互作用を最適化することでした。
- [TypedArrayやその他のメモリをV8からBlinkに渡す際の性能向上](https://code.google.com/p/chromium/issues/detail?id=515795)
    - WebGLに一方向の通信の一部として型付き配列を渡す際、追加のハンドル（V8が追跡するもの）を作成する必要はありません。
    - 外部（Blink）で割り当てられたメモリ制限を超えた際、完全なガベージコレクションの代わりに増分ガベージコレクションを開始します。
- [アイドル時のガベージコレクションスケジューリング](/blog/free-garbage-collection)
    - ガベージコレクション操作はメインスレッドのアイドル時間中にスケジュールされ、コンポジタをブロックせずよりスムーズなレンダリングが可能になります。
- [ガベージコレクションされたヒープの全古世代に対して併発スイーピングが有効化されました](https://code.google.com/p/chromium/issues/detail?id=507211)
    - 未使用のメモリチャンクの解放がメインスレッドと並行して追加のスレッドで実行され、メインのガベージコレクション停止時間を大幅に短縮します。

良いことに、oortonline.gl に関連するすべての変更は、WebGL を多用するアプリケーションのすべてのユーザーに潜在的な影響を与える一般的な改善です。

## V8 API

API の変更内容については、[変更概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご覧ください。このドキュメントは、各主要リリースの数週間後に定期的に更新されます。

[アクティブな V8 チェックアウト](https://v8.dev/docs/source-code#using-git)を持つ開発者は、`git checkout -b 4.6 -t branch-heads/4.6` を使用して、V8 v4.6 の新機能を試すことができます。または [Chrome のベータチャンネルに登録](https://www.google.com/chrome/browser/beta.html) して、すぐに新機能を試すこともできます。
