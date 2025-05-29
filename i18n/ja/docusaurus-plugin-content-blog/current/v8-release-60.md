---
title: "V8リリース v6.0"
author: "V8チーム"
date: 2017-06-09 13:33:37
tags:
  - リリース
description: "V8 v6.0は複数のパフォーマンス改善を含み、`SharedArrayBuffer`やオブジェクトのrest/spreadプロパティのサポートを導入しました。"
---
6週間ごとに、[リリースプロセス](/docs/release-process)の一環としてV8の新しいブランチを作成します。各バージョンはChrome Betaマイルストーンの直前にV8のGitのマスターからブランチされます。本日、[V8バージョン6.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.0)を発表いたします。このバージョンは数週間後にChrome 60 Stableとの連携でリリースされるまでベータ版となります。V8 6.0は開発者向けのさまざまな機能で満たされています。このリリースを見越して、いくつかのハイライトをご紹介したいと思います。

<!--truncate-->
## `SharedArrayBuffer`s

V8 v6.0では、[`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)のサポートを導入しました。これは、JavaScriptワーカー間でメモリを共有し、ワーカー間の制御フローを同期するための低レベルなメカニズムです。SharedArrayBufferを使用すると、JavaScriptで共有メモリ、アトミック操作、およびfutexを利用できます。また、SharedArrayBufferにより、asm.jsやWebAssemblyを通じてスレッドアプリケーションをWebに移植することが可能になります。

簡単な低レベルのチュートリアルについては、仕様の[チュートリアルページ](https://github.com/tc39/ecmascript_sharedmem/blob/master/TUTORIAL.md)をご覧いただくか、または[pthreads移植のためのEmscriptenドキュメント](https://kripken.github.io/emscripten-site/docs/porting/pthreads.html)を参照してください。

## オブジェクトのrest/spreadプロパティ

このリリースでは、オブジェクトの分割代入におけるrestプロパティと、オブジェクトリテラルにおけるspreadプロパティを導入しました。オブジェクトのrest/spreadプロパティは、ES.nextのStage 3機能です。

また、spreadプロパティは多くの場合、`Object.assign()`の簡潔な代替手段を提供します。

```js
// オブジェクトの分割代入のrestプロパティ:
const person = {
  firstName: 'Sebastian',
  lastName: 'Markbåge',
  country: 'USA',
  state: 'CA',
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Sebastian
console.log(lastName); // Markbåge
console.log(rest); // { country: 'USA', state: 'CA' }

// オブジェクトリテラルのspreadプロパティ:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Sebastian', lastName: 'Markbåge', country: 'USA', state: 'CA' }
```

詳細については、[オブジェクトのrestとspreadプロパティに関する説明](/features/object-rest-spread)をご覧ください。

## ES2015のパフォーマンス

V8 v6.0はES2015機能のパフォーマンス向上を継続して行っています。このリリースには言語機能の実装に対する最適化が含まれており、結果としてV8の[ARES-6](http://browserbench.org/ARES-6/)スコアが約10%向上します。

## V8 API

API変更の概要については、[こちら](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご覧ください。このドキュメントは、各主要リリースから数週間後に定期的に更新されます。

[アクティブなV8のチェックアウト](/docs/source-code#using-git)をお持ちの開発者の方は、`git checkout -b 6.0 -t branch-heads/6.0`を使用してV8 6.0の新機能を試すことができます。または、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)をサブスクライブして、まもなく新機能をお試しください。
