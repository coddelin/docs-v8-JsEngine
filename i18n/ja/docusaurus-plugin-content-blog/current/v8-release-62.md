---
title: "V8 リリース v6.2"
author: "V8 チーム"
date: 2017-09-11 13:33:37
tags:
  - リリース
description: "V8 v6.2 にはパフォーマンスの向上、JavaScript 言語機能の充実、最大文字列長の増加などが含まれています。"
---
6週間ごとに、新しいブランチを作成するのが私たちの[リリースプロセス](/docs/release-process)の一環です。各バージョンは、Chrome Beta マイルストーンの直前に V8 の Git マスターからブランチ化されます。本日、最新ブランチである [V8 バージョン 6.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.2) を発表できることを嬉しく思います。このバージョンは数週間後に Chrome 62 ステーブルと共にリリースされるまでベータ版です。V8 v6.2 は、開発者向けのさまざまな興味深い機能を備えています。この投稿では、リリースを見越していくつかのハイライトを紹介します。

<!--truncate-->
## パフォーマンス向上

[`Object#toString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString) のパフォーマンスは以前から潜在的なボトルネックとして認識されており、これは [lodash](https://lodash.com/) や [underscore.js](http://underscorejs.org/) といった人気のあるライブラリや、[AngularJS](https://angularjs.org/) のようなフレームワークで頻繁に使用されているためです。[`_.isPlainObject`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isPlainObject.js#L13-L50)、[`_.isDate`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isDate.js#L8-L25)、[`angular.isArrayBuffer`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L739-L741)、[`angular.isRegExp`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L680-L689) といった各種ヘルパー関数が、アプリケーションやライブラリコード全体でよく使用され、実行時の型チェックを行います。

ES2015 の登場により、[`Symbol.toStringTag`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag) シンボルを介して `Object#toString` がモンキーパッチ可能になり、これによって `Object#toString` はより重く、速度を上げるのが困難になりました。このリリースでは、[SpiderMonkey JavaScript エンジン](https://bugzilla.mozilla.org/show_bug.cgi?id=1369042#c0) で最初に実装された最適化を V8 に移植し、`Object#toString` のスループットを **6.5倍** 向上させました。

![](/_img/v8-release-62/perf.svg)

この最適化は Speedometer ブラウザベンチマーク、特に AngularJS サブテストにも影響を与え、3% の改善を測定しました。[詳細なブログ投稿](https://ponyfoo.com/articles/investigating-performance-object-prototype-to-string-es2015) をぜひお読みください。

![](/_img/v8-release-62/speedometer.svg)

また、[ES2015 プロキシ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) のパフォーマンスが大幅に向上し、`someProxy(params)` または `new SomeOtherProxy(params)` を介したプロキシオブジェクトの呼び出し速度が最大 **5倍** 速くなりました。

![](/_img/v8-release-62/proxy-call-construct.svg)

同様に、`someProxy.property` を介してプロキシオブジェクト上のプロパティにアクセスするパフォーマンスがほぼ **6.5倍** 改善されました。

![](/_img/v8-release-62/proxy-property.svg)

これらは進行中のインターンシップの一環です。より詳細なブログ投稿および最終結果を楽しみにお待ちください。

また、[Peter Wong](https://twitter.com/peterwmwong) 氏の貢献により [`String#includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes) 組み込みのパフォーマンスが前回のリリース以降 **3倍以上** 向上したことをお知らせします。

内部ハッシュテーブルのハッシュコード検索が大幅に高速化され、`Map`、`Set`、`WeakMap`、そして `WeakSet` の性能が向上しました。詳細な最適化の説明は今後のブログ投稿をご期待ください。

![](/_img/v8-release-62/hashcode-lookups.png)

ガーベジコレクタは、ヒープの若いジェネレーションを収集するための [Parallel Scavenger](https://bugs.chromium.org/p/chromium/issues/detail?id=738865) を使用するようになりました。

## 強化された低メモリモード

ここ数回のリリースにわたり、V8 の低メモリモードが強化されてきました（例えば、[初期半空間サイズを 512 KB に設定](https://chromium-review.googlesource.com/c/v8/v8/+/594387) するなど）。低メモリデバイスは、アウト・オブ・メモリの状況に陥ることが少なくなりました。ただし、この低メモリ動作はランタイムパフォーマンスに悪影響を及ぼす可能性があります。

## さらに多くの正規表現機能

[ `dotAll` モード](https://github.com/tc39/proposal-regexp-dotall-flag) のサポートが正規表現でデフォルトで有効になり、 `s` フラグを使用してこの機能を利用できます。`dotAll` モードでは、正規表現内の `.` アトムが行の終端記号を含む任意の文字と一致します。

```js
/foo.bar/su.test('foo\nbar'); // true
```

[後方参照アサーション](https://github.com/tc39/proposal-regexp-lookbehind)という新しい正規表現の機能がデフォルトで利用可能になりました。この名称がその意味をよく表しています。後方参照アサーションは、後方参照グループ内にあるパターンが先行している場合にのみパターンがマッチするように制限する方法を提供します。マッチングの場合と非マッチングの場合の両方があります:

```js
/(?<=\$)\d+/.exec('$1 is worth about ¥123'); // ['1']
/(?<!\$)\d+/.exec('$1 is worth about ¥123'); // ['123']
```

これらの機能の詳細については、[今後の正規表現機能](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features)というタイトルのブログ記事をご覧ください。

## テンプレートリテラルの改訂

テンプレートリテラルでのエスケープシーケンスに対する制限が[関連する提案](https://tc39.es/proposal-template-literal-revision/)に基づいて緩和されました。これにより、LaTeXプロセッサのようなテンプレートタグの新しい使用例が可能になります。

```js
const latex = (strings) => {
  // …
};

const document = latex`
\newcommand{\fun}{\textbf{楽しい！}}
\newcommand{\unicode}{\textbf{ユニコード！}}
\newcommand{\xerxes}{\textbf{王！}}
hの上のブレーベはここに\u{h}あります // 不正なトークン！
`;
```

## 最大文字列長の増加

64ビットプラットフォームでの最大文字列長が`2**28 - 16`文字から`2**30 - 25`文字に増加しました。

## Full-codegenが廃止されました

V8 v6.2では、旧パイプラインの主要な部分が完全に廃止されました。このリリースでは30K行以上のコードが削除され、コードの複雑さが大幅に削減されました。

## V8 API

[APIの変更概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご覧ください。このドキュメントは各主要リリース後数週間で定期的に更新されます。

[アクティブなV8チェックアウト](/docs/source-code#using-git)を持つ開発者は`git checkout -b 6.2 -t branch-heads/6.2`を使ってV8 v6.2の新機能を試せます。または、[Chromeのベータチャンネルを購読する](https://www.google.com/chrome/browser/beta.html)ことで、新機能をすぐに試すことができます。
