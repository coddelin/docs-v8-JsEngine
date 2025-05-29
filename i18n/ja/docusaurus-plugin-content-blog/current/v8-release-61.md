---
title: &apos;V8リリース v6.1&apos;
author: &apos;V8チーム&apos;
date: 2017-08-03 13:33:37
tags:
  - リリース
description: &apos;V8 v6.1では、バイナリサイズが縮小され、パフォーマンスが向上しています。また、asm.jsが検証され、WebAssemblyとしてコンパイルされるようになりました。&apos;
---
V8では、[リリースプロセス](/docs/release-process)の一環として、6週間ごとに新しいブランチを作成します。各バージョンは、Chrome Betaのマイルストーン直前にV8のGitマスターからブランチされます。本日、私たちは新しいブランチ[V8 version 6.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.1)を発表できることを嬉しく思います。このバージョンは数週間後にChrome 61 Stableとの連携でリリースされるまでベータ版となります。V8 v6.1は、開発者向けの便利な機能でいっぱいです。リリースに先立ち、いくつかのハイライトを事前にご紹介します。

<!--truncate-->
## パフォーマンスの向上

[反復処理](http://exploringjs.com/es6/ch_iteration.html)または[`Map.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach) / [`Set.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/forEach)メソッドを介して、MapsおよびSetsのすべての要素を訪問する操作は、V8 v6.0以降最大11倍の性能向上を達成しました。[専用ブログ記事](https://benediktmeurer.de/2017/07/14/faster-collection-iterators/)で詳しい情報をご覧ください。

![](/_img/v8-release-61/iterating-collections.svg)

さらに、他の言語機能のパフォーマンス向上にも取り組みました。たとえば、[`Object.prototype.isPrototypeOf`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isPrototypeOf)メソッドは、クラスやコンストラクター関数ではなく主にオブジェクトリテラルと`Object.create`を使用するコンストラクターを使わないコードにとって重要であり、現在では常に速く、場合によっては[instanceof演算子](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof)を使用するよりも速くなっています。

![](/_img/v8-release-61/checking-prototype.svg)

可変引数の関数呼び出しおよびコンストラクター呼び出しも大幅に高速化されました。[`Reflect.apply`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply)および[`Reflect.construct`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct)を使用した呼び出しでは、最新バージョンで最大17倍の速度向上が見られます。

![](/_img/v8-release-61/call-construct.svg)

`Array.prototype.forEach`はTurboFanでインライン化され、すべての主要な非ホーリー[要素の種類](/blog/elements-kinds)に最適化されました。

## バイナリサイズの削減

V8チームは廃止されたCrankshaftコンパイラを完全に削除し、バイナリサイズを大幅に削減しました。加えて、組み込み生成器を削除したことで、プラットフォームに応じてV8の配布バイナリサイズが700KB以上削減されました。

## asm.jsが検証されWebAssemblyにコンパイルされるように

V8がasm.jsコードを検出した場合、そのコードを検証しようと試みます。有効なasm.jsコードはWebAssemblyに変換されます。V8の性能評価によれば、これによりスループット性能が向上する傾向があります。ただし、追加の検証ステップにより、スタートアップ性能における単独のリグレッションが発生する可能性があります。

この機能はChromium側でデフォルトで有効化されただけであることにご注意ください。組み込みまたはasm.jsバリデーターを使用したい場合は、フラグ`--validate-asm`を有効化してください。

## WebAssembly

WebAssemblyコードでブレークポイントにヒットした場合、DevToolsでローカル変数を表示することが可能になりました。

## V8 API

[API変更の概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をチェックしてください。このドキュメントは、各主要リリース後数週間してから定期的に更新されます。

[アクティブなV8チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 6.1 -t branch-heads/6.1`を使用してV8 v6.1の新機能を試すことができます。または、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)を購読して、直接新機能を試すこともできます。
