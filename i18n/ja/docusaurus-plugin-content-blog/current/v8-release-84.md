---
title: &apos;V8リリース v8.4&apos;
author: &apos;Camillo Bruni、新鮮なブール値を楽しんでいます&apos;
avatars:
 - &apos;camillo-bruni&apos;
date: 2020-06-30
tags:
 - リリース
description: &apos;V8 v8.4は弱参照と改善されたWebAssemblyパフォーマンスを備えています。&apos;
tweet: &apos;1277983235641761795&apos;
---
6週間ごとに、新しいV8のブランチを[リリースプロセス](https://v8.dev/docs/release-process)の一環として作成します。各バージョンはChrome Betaのマイルストーン直前にV8のGitマスターからブランチ分けされます。本日、私たちは最新のブランチ[V8バージョン8.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.4)をご紹介します。このブランチは数週間後にChrome 84 Stableと連携してリリースされるまでベータ版にあります。V8 v8.4は開発者向けのさまざまな便利な機能で満たされています。この記事では、リリースを前にハイライトのいくつかをプレビューします。

<!--truncate-->
## WebAssembly

### 起動時間の改善

WebAssemblyのベースラインコンパイラ([Liftoff](https://v8.dev/blog/liftoff))は、[アトミック命令](https://github.com/WebAssembly/threads)と[バルクメモリ操作](https://github.com/WebAssembly/bulk-memory-operations)をサポートするようになりました。これにより、これらの比較的新しい仕様を使用しても、驚異的に早い起動時間が得られるようになります。

### 改善されたデバッグ

WebAssemblyにおけるデバッグ体験を改善する取り組みの一環として、実行を一時停止したりブレークポイントに到達したりする際にライブな任意のWebAssemblyフレームを検査することができるようになりました。
これは[Liftoff](https://v8.dev/blog/liftoff)をデバッグに活用することで実現しました。過去には、ブレークポイントが設定されているコードやステップスルーされているコードはすべてWebAssemblyインタープリタで実行する必要があり、実行速度が大幅に低下（しばしば100倍程度）しました。Liftoffを使用することで、パフォーマンス損失は約三分の一に収まり、すべてのコードをステップ実行し、任意のタイミングで検査することができます。

### SIMDのオリジントライアル

SIMD提案は、WebAssemblyが普遍的に利用可能なハードウェアのベクトル命令を活用して、計算負荷の高い作業を加速することを可能にします。V8では[WebAssembly SIMD提案](https://github.com/WebAssembly/simd)を[サポート](https://v8.dev/features/simd)しています。Chromeでこれを有効にするには、`chrome://flags/#enable-webassembly-simd`のフラグを使用するか、[オリジントライアル](https://developers.chrome.com/origintrials/#/view_trial/-4708513410415853567)に登録してください。[オリジントライアル](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md)は開発者が標準化される前の機能を試験的に使用し、貴重なフィードバックを提供することを可能にします。オリジンがトライアルに参加した後は、Chromeのフラグを更新する必要なく、トライアル期間中その機能が有効になります。

## JavaScript

### 弱参照とファイナライザー

:::note
**警告！** 弱参照とファイナライザーは高度な機能です！これらはガベージコレクション動作に依存します。ガベージコレクションは非決定的であり、発生しない可能性もあります。
:::

JavaScriptはガベージコレクトされた言語であり、プログラムによってもう参照されなくなったオブジェクトがガベージコレクターが作動するときに自動的に解放される可能性があります。`WeakMap`や`WeakSet`内の参照を除けば、JavaScriptのすべての参照は強参照であり、参照されたオブジェクトがガベージコレクトされるのを防ぎます。例えば、

```js
const globalRef = {
  callback() { console.log(&apos;foo&apos;); }
};
// globalRefがグローバルスコープを通じて参照可能である限り、
// それ自身およびそのcallbackプロパティ内の関数は解放されません。
```

JavaScriptのプログラマーは、`WeakRef`機能を使用してオブジェクトを弱く保持できるようになりました。弱参照によって参照されたオブジェクトは、強参照されていない場合にガベージコレクトを妨げません。

```js
const globalWeakRef = new WeakRef({
  callback() { console.log(&apos;foo&apos;); }
});

(async function() {
  globalWeakRef.deref().callback();
  // コンソールに「foo」をログ出力します。globalWeakRefは
  // 作成後のイベントループの最初のターンまで生きていることが保証されています。

  await new Promise((resolve, reject) => {
    setTimeout(() => { resolve(&apos;foo&apos;); }, 42);
  });
  // イベントループのターンを待機します。

  globalWeakRef.deref()?.callback();
  // globalWeakRef内部のオブジェクトは、別に参照されていないため、
  // 最初のターン後にガベージコレクトされる可能性があります。
})();
```

`WeakRef`に伴う機能として`FinalizationRegistry`があり、これによりプログラマーはオブジェクトのガベージコレクトが完了した後に呼び出されるコールバックを登録できます。たとえば、以下のプログラムでは、IIFE内の到達不能なオブジェクトが収集された後、コンソールに`42`がログ出力される可能性があります。

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log(heldValue);
});

(function () {
  const garbage = {};
  registry.register(garbage, 42);
  // 第2引数は「保持された値」であり、
  // 第1引数がガベージコレクトされたときにファイナライザーに渡されます。
})();
```

ファイナライザはイベントループ上で実行され、同期的なJavaScriptの実行を中断することはありません。

これらは高度で強力な機能であり、幸運にもあなたのプログラムでは必要ないかもしれません。[解説](https://v8.dev/features/weak-references)をご覧になり、詳しく学んでください。

### プライベートメソッドとアクセサ

v7.4で搭載されたプライベートフィールドが、プライベートメソッドとアクセサのサポートによって完成しました。構文的には、プライベートメソッドとアクセサの名前はプライベートフィールドと同様に`#`で始まります。以下はその構文の一部の例です。

```js
class Component {
  #privateMethod() {
    console.log("私が呼び出されるのはComponent内だけです！");
  }
  get #privateAccessor() { return 42; }
  set #privateAccessor(x) { }
}
```

プライベートメソッドとアクセサは、プライベートフィールドと同じスコープ規則とセマンティクスを持っています。[解説](https://v8.dev/features/class-fields)をご覧になり、詳しく学んでください。

[Igalia](https://twitter.com/igalia)による実装への貢献に感謝します！

## V8 API

`git log branch-heads/8.3..branch-heads/8.4 include/v8.h`を使用して、APIの変更リストを取得してください。

V8のアクティブなチェックアウトを持っている開発者は、`git checkout -b 8.4 -t branch-heads/8.4`を使用して、V8 v8.4の新機能を試しに使用することができます。または、[Chromeのベータチャンネルに登録](https://www.google.com/chrome/browser/beta.html)して、新機能を近日中に体験してください。
