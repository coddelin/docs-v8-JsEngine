---
title: "V8 リリース v6.4"
author: "V8 チーム"
date: 2017-12-19 13:33:37
tags:
  - リリース
description: "V8 v6.4 にはパフォーマンスの向上、新しい JavaScript 言語機能、その他多数の改善が含まれています。"
tweet: "943057597481082880"
---
毎回6週間ごとに、私たちは [リリースプロセス](/docs/release-process) の一環として V8 の新しいブランチを作成します。各バージョンは Chrome Beta マイルストーン直前に V8 の Git マスターからブランチ化されます。本日、新しいブランチ [V8 バージョン 6.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.4) を発表します。このバージョンは数週間後に Chrome 64 Stable と連携してリリースされるまでベータ版として利用可能です。V8 v6.4 には開発者向けの多くの機能が満載です。この投稿では、リリースに向けて注目すべき主な点をプレビューします。

<!--truncate-->
## スピード

V8 v6.4 は [instanceof 演算子の性能を 3.6 倍向上](https://bugs.chromium.org/p/v8/issues/detail?id=6971) させます。この結果として、[uglify-js](http://lisperator.net/uglifyjs/) は [V8 の Web Tooling Benchmark](https://github.com/v8/web-tooling-benchmark) に基づくと、15～20% 高速化されています。

このリリースでは `Function.prototype.bind` の性能問題にも取り組みました。たとえば、TurboFan はすべての単形的（monomorphic）`bind` 呼び出しを [一貫してインライン化](https://bugs.chromium.org/p/v8/issues/detail?id=6946) します。さらに、TurboFan では _バウンドコールバックパターン_ もサポートしており、次のようにする代わりに:

```js
doSomething(callback, someObj);
```

次のように使うことができます:

```js
doSomething(callback.bind(someObj));
```

これにより、コードの可読性が向上し、同じ性能を得ることができます。

[Peter Wong](https://twitter.com/peterwmwong) の最新の貢献により、[`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) と [`WeakSet`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet) が [CodeStubAssembler](/blog/csa) を使用して実装され、性能が最大で 5 倍向上しました。

![](/_img/v8-release-64/weak-collection.svg)

V8 の [継続的な取り組み](https://bugs.chromium.org/p/v8/issues/detail?id=1956) の一環として配列ビルトインの性能を向上させるために、`Array.prototype.slice` の性能が CodeStubAssembler を使って再実装され、約 4 倍向上しました。また、`Array.prototype.map` および `Array.prototype.filter` の呼び出しは多くのケースでインライン化され、手書きのバージョンと競争力のある性能プロファイルを持つようになりました。

配列、型付き配列、文字列の範囲外読み込みが [これまでの ~10 倍の性能低下を引き起こすことがなくなる](https://bugs.chromium.org/p/v8/issues/detail?id=7027) ように働きかけ、不意に [このコーディングパターン](/blog/elements-kinds#avoid-reading-beyond-length) が使われる場合に対応しました。

## メモリ

V8 の組み込みコードオブジェクトとバイトコードハンドラは、スナップショットから遅延的にデシリアライズされるようになり、各 Isolate によって消費されるメモリを大幅に削減する可能性があります。Chrome のベンチマークでは、一般的なサイトを閲覧する場合にタブごとに数百 KB の節約が確認されています。

![](/_img/v8-release-64/codespace-consumption.svg)

このテーマに関する専用のブログ投稿を来年の初めに注目してください。

## ECMAScript 言語機能

この V8 リリースには、2 つの新しいエキサイティングな正規表現機能のサポートが含まれています。

`/u` フラグ付き正規表現では、[Unicode プロパティエスケープ](https://mathiasbynens.be/notes/es-unicode-property-escapes) がデフォルトで有効になりました。

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → true
```

[名前付きキャプチャグループ](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features#named_captures) のサポートもデフォルトで有効になりました。

```js
const pattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u;
const result = pattern.exec('2017-12-15');
// result.groups.year === '2017'
// result.groups.month === '12'
// result.groups.day === '15'
```

これらの機能に関する詳細は、[今後の正規表現機能](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features) というタイトルのブログ投稿をご覧ください。

[Groupon](https://twitter.com/GrouponEng) のおかげで、V8 は [`import.meta`](https://github.com/tc39/proposal-import-meta) を実装し、埋め込みプログラムが現在のモジュールに関するホスト固有のメタデータを公開できるようになりました。たとえば、Chrome 64 は `import.meta.url` を通じてモジュール URL を公開し、将来的には `import.meta` にさらに多くのプロパティを追加する予定です。

国際化フォーマッタによって生成された文字列のローカル対応型のフォーマットを支援するために、開発者は [`Intl.NumberFormat.prototype.formatToParts()`](https://github.com/tc39/proposal-intl-formatToParts) を使用して、数値をトークンとそのタイプのリストへフォーマットできます。[Igalia](https://twitter.com/igalia) の V8 への実装に感謝します！

## V8 API

APIの変更リストを取得するには、`git log branch-heads/6.3..branch-heads/6.4 include/v8.h`をご使用ください。

アクティブな[V8チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 6.4 -t branch-heads/6.4`を使用して、V8 v6.4の新機能を試すことができます。または、[Chromeのベータチャネル](https://www.google.com/chrome/browser/beta.html)に登録して、近日中に新機能を試すこともできます。
