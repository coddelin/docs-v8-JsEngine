---
title: 'V8 リリース v8.1'
author: 'Dominik Inführ、謎の国際化男'
avatars:
  - 'dominik-infuehr'
date: 2020-02-25
tags:
  - リリース
description: 'V8 v8.1 では、Intl.DisplayNames API による国際化サポートが改善されました。'
---

6週間ごとに、私たちは[V8 リリースプロセス](https://v8.dev/docs/release-process)の一環として新しいブランチを作成します。各バージョンは Chrome ベータマイルストーンの直前に V8 の Git マスターからブランチ化されます。本日、最新のブランチ [V8 バージョン 8.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.1) を発表できることを嬉しく思います。このバージョンは数週間後に Chrome 81 安定版と連携してリリースされるまで、ベータ版として公開されます。V8 v8.1 には開発者向けのさまざまな新機能が満載です。この投稿ではリリースを前にした注目ポイントのプレビューを提供します。

<!--truncate-->
## JavaScript

### `Intl.DisplayNames`

新しい `Intl.DisplayNames` API を使用すると、プログラマーは言語、地域、スクリプト、通貨の翻訳された名前を簡単に表示できます。

```js
const zhLanguageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
const enRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const itScriptNames = new Intl.DisplayNames(['it'], { type: 'script' });
const deCurrencyNames = new Intl.DisplayNames(['de'], {type: 'currency'});

zhLanguageNames.of('fr');
// → '法文'
enRegionNames.of('US');
// → 'United States'
itScriptNames.of('Latn');
// → 'latino'
deCurrencyNames.of('JPY');
// → 'Japanischer Yen'
```

今日から翻訳データの管理の負担をランタイムに移してください！完全な API の詳細やその他の例については、[機能解説](https://v8.dev/features/intl-displaynames)を参照してください。

## V8 API

API の変更をリストするには、`git log branch-heads/8.0..branch-heads/8.1 include/v8.h` を使用してください。

[アクティブな V8 チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 8.1 -t branch-heads/8.1` を使用して V8 v8.1 の新機能を試すことができます。または、[Chrome のベータ チャンネル](https://www.google.com/chrome/browser/beta.html)に登録して間もなく新機能を試すこともできます。
