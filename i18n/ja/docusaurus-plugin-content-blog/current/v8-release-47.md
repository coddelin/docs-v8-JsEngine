---
title: 'V8リリース v4.7'
author: 'V8チーム'
date: 2015-10-14 13:33:37
tags:
  - リリース
description: 'V8 v4.7はメモリ使用量の削減と新しいES2015言語機能のサポートを提供します。'
---
およそ6週間ごとに、[リリースプロセス](https://v8.dev/docs/release-process)の一環としてV8の新しいブランチが作成されます。それぞれのバージョンは、Chromeのベータ版マイルストーンのためにChromeがブランチ化される直前に、V8のGitマスターからブランチ化されます。本日は、私たちの最新のブランチ、[V8バージョン4.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.7)を発表できることを嬉しく思います。このバージョンはChrome 47の安定版と連動してリリースされるまでベータ版となります。V8 v4.7には開発者向けのさまざまな新機能が詰まっており、数週間後のリリースに向けて一部のハイライトをお届けします。

<!--truncate-->
## 改良されたECMAScript 2015 (ES6) サポート

### Rest オペレーター

[Restオペレーター](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/rest_parameters)は、不定数の引数を関数に渡すことを可能にします。これは`arguments`オブジェクトに似ています。

```js
// Restオペレーターを使用しない場合
function concat() {
  var args = Array.prototype.slice.call(arguments, 1);
  return args.join('');
}

// Restオペレーターを使用する場合
function concatWithRest(...strings) {
  return strings.join('');
}
```

## 今後のES機能サポート

### `Array.prototype.includes`

[`Array.prototype.includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes)は、ES2016に含まれるためのステージ3提案中の新しい機能です。これは指定された配列内に要素があるかどうかを判断する簡潔な構文を提供し、ブール値を返します。

```js
[1, 2, 3].includes(3); // true
['apple', 'banana', 'cherry'].includes('apple'); // true
['apple', 'banana', 'cherry'].includes('peach'); // false
```

## パース時のメモリ負荷の軽減

[V8パーサーの最近の変更](https://code.google.com/p/v8/issues/detail?id=4392)により、大きな入れ子関数を含むファイルを解析する際のメモリ消費が大幅に削減されました。特に、これにより以前より大きなasm.jsモジュールをV8で実行することが可能になりました。

## V8 API

私たちの[API変更サマリー](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご覧ください。この文書は、各主要リリースの数週間後に定期的に更新されます。[アクティブなV8チェックアウト](https://v8.dev/docs/source-code#using-git)を持つ開発者は、`git checkout -b 4.7 -t branch-heads/4.7`を使用してV8 v4.7の新機能を試すことができます。あるいは、[Chromeのベータ版チャンネルに登録する](https://www.google.com/chrome/browser/beta.html)ことで、すぐに新機能を自分で試すことができます。
