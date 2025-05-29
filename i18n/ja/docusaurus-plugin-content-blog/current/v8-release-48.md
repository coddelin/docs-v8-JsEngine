---
title: 'V8リリース v4.8'
author: 'V8チーム'
date: 2015-11-25 13:33:37
tags:
  - リリース
description: 'V8 v4.8はいくつかの新しいES2015言語機能のサポートを追加しました。'
---
約6週間ごとに、[リリースプロセス](/docs/release-process)の一環としてV8の新しいブランチを作成します。各バージョンは、ChromeがChrome Betaマイルストーン用のブランチを作成する直前にV8のGitマスターから分岐されます。本日、最新のブランチである[V8バージョン4.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.8)を発表できることを嬉しく思います。このバージョンはChrome 48 Stableと連携してリリースされるまでベータ版として滞在します。V8 4.8にはいくつかの開発者向け機能が含まれているため、リリースの数週間前にそのハイライトをプレビューしたいと思います。

<!--truncate-->
## 改善されたECMAScript 2015 (ES6)のサポート

今回のV8のリリースでは、ES2015仕様からの組み込みシンボルである2つの[既知のシンボル](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols)のサポートを提供します。これにより、以前は隠されていたいくつかの低レベル言語構造を活用することができます。

### `@@isConcatSpreadable`

`true`の場合、オブジェクトが`Array.prototype.concat`によってその配列要素に展開されるべきであることを示す、ブール値のプロパティの名前。

```js
(function() {
  'use strict';
  class AutomaticallySpreadingArray extends Array {
    get [Symbol.isConcatSpreadable]() {
      return true;
    }
  }
  const first = [1];
  const second = new AutomaticallySpreadingArray();
  second[0] = 2;
  second[1] = 3;
  const all = first.concat(second);
  // 出力される：[1, 2, 3]
  console.log(all);
}());
```

### `@@toPrimitive`

オブジェクトが暗黙的にプリミティブ値に変換される際に呼び出されるメソッドの名前。

```js
(function(){
  'use strict';
  class V8 {
    [Symbol.toPrimitive](hint) {
      if (hint === 'string') {
        console.log('string');
        return 'V8';
      } else if (hint === 'number') {
        console.log('number');
        return 8;
      } else {
        console.log('default:' + hint);
        return 8;
      }
    }
  }

  const engine = new V8();
  console.log(Number(engine));
  console.log(String(engine));
}());
```

### `ToLength`

ES2015仕様は、型変換の抽象操作を調整し、配列のようなオブジェクトの長さとして使用可能な整数に引数を変換するようにしました。（直接観察可能ではありませんが、負の長さを持つ配列のようなオブジェクトを扱うときに間接的に見える可能性があります。）

## V8 API

[API変更の概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご確認ください。この文書は毎回の主要なリリースの数週間後に定期的に更新されます。

[アクティブなV8チェックアウト](https://v8.dev/docs/source-code#using-git)を持つ開発者は、`git checkout -b 4.8 -t branch-heads/4.8`を使用してV8 v4.8の新機能を試すことができます。また、[Chromeのベータチャンネルを購読](https://www.google.com/chrome/browser/beta.html)してすぐに新しい機能を自分で試すこともできます。
