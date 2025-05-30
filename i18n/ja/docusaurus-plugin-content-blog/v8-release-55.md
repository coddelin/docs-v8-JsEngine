---
title: "V8リリース v5.5"
author: "V8チーム"
date: "2016-10-24 13:33:37"
tags: 
  - リリース
description: "V8 v5.5は、メモリ消費の削減とECMAScript言語機能のサポート向上を実現します。"
---
私たちは、[リリースプロセス](/docs/release-process)の一環として、6週間ごとにV8の新しいブランチを作成しています。各バージョンは、Chromeのベータマイルストーンの直前にV8のGitマスターからブランチが作成されます。本日、最新のブランチである[V8バージョン5.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.5)を発表できることを嬉しく思います。このバージョンは、数週間後にChrome 55の安定版とともにリリースされるまでベータ版となります。V8 v5.5は、開発者に向けたいろいろな新機能が満載なので、リリースに先立ちいくつかのハイライトをご紹介します。

<!--truncate-->
## 言語機能

### Async関数

V5.5では、V8はJavaScript ES2017の[async関数](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions)を提供します。これにより、Promiseを使用および作成するコードを書くのが簡単になります。async関数を使用すると、Promiseの解決を待つのが簡単になり、awaitを記述して同期的に利用可能な値として進むだけです - コールバックは必要ありません。詳しくは[この記事](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions)をご覧ください。

以下は、URLを取得してレスポンスのテキストを返す例の関数で、一般的な非同期、Promiseベースのスタイルで書かれています。

```js
function logFetch(url) {
  return fetch(url)
    .then(response => response.text())
    .then(text => {
      console.log(text);
    }).catch(err => {
      console.error('fetch failed', err);
    });
}
```

以下は、async関数を使用してコールバックを削除した同じコードです。

```js
async function logFetch(url) {
  try {
    const response = await fetch(url);
    console.log(await response.text());
  } catch (err) {
    console.log('fetch failed', err);
  }
}
```

## パフォーマンスの向上

V8 v5.5は、メモリフットプリントにおいていくつかの重要な改善を提供します。

### メモリ

メモリ消費は、JavaScript仮想マシンのパフォーマンスのトレードオフにおいて重要な要素です。過去数リリースにわたり、V8チームは現代のウェブ開発パターンを代表するいくつかのウェブサイトを分析し、メモリフットプリントを大幅に削減してきました。V8 5.5は、V8ヒープサイズとゾーンメモリ使用量の削減により、**低メモリデバイス**ではChrome全体のメモリ消費量を最大35%削減します（Chrome 53のV8 5.3と比較）。他のデバイスセグメントでもゾーンメモリ削減の恩恵を受けます。詳しくは[専用ブログ記事](/blog/optimizing-v8-memory)をご覧ください。

## V8 API

[API変更の概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご覧ください。このドキュメントは、各主要リリース後数週間経ってから定期的に更新されます。

### V8インスペクターの移行

V8インスペクターはChromiumからV8に移行されました。このインスペクターコードは現在、[V8リポジトリ](https://chromium.googlesource.com/v8/v8/+/master/src/inspector/)に完全に含まれています。

アクティブな[V8チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 5.5 -t branch-heads/5.5`を使用してV8 5.5の新機能を試すことができます。または、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)を購読し、間もなく新機能を自分で試すことができます。
