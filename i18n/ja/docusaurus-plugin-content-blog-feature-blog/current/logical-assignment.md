---
title: '論理代入'
author: 'Shu-yu Guo ([@_shu](https://twitter.com/_shu))'
avatars:
  - 'shu-yu-guo'
date: 2020-05-07
tags:
  - ECMAScript
  - ES2021
  - Node.js 16
description: 'JavaScriptは論理演算を伴う複合代入をサポートするようになりました。'
tweet: '1258387483823345665'
---
JavaScriptは、代入と二項演算を簡潔に表現できる一連の[複合代入演算子](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Assignment_Operators)をサポートしています。現在は、数学的またはビット演算のみがサポートされています。

<!--truncate-->
これまで欠けていたのは、論理演算と代入を組み合わせる機能です。それがついに実現！JavaScriptは新しい演算子`&&=`, `||=`, および `??=`を使用して論理代入をサポートするようになりました。

## 論理代入演算子

新しい演算子について詳しく見ていく前に、既存の複合代入演算子についておさらいしましょう。たとえば、`lhs += rhs`の意味は概ね`lhs = lhs + rhs`と等価です。この概念は、二項演算子`@`（`+`や`|`など）を例とした`lhs @= rhs`にも当てはまります。ただし、左辺が変数の場合のみ厳密に正しいことに注意してください。たとえば、`obj[computedPropertyName()] += rhs`のような複雑な左辺では、左辺は一度だけ評価されます。

それでは新しい演算子を詳しく見ていきましょう。既存の演算子とは異なり、`@`が論理演算（`&&`, `||`, `??`）の場合、`lhs @= rhs`は`lhs = lhs @ rhs`と概ね等価ではありません。

```js
// 論理積のセマンティクスを復習:
x && y
// → x が truthy な場合: y
// → x が truthy でない場合: x

// まず論理積代入。以下の2行は同等です。
// 既存の複合代入演算子と同様に、より複雑な左辺は1回だけ評価されます。
x &&= y;
x && (x = y);

// 論理和のセマンティクス:
x || y
// → x が truthy な場合: x
// → x が truthy でない場合: y

// 同様に論理和代入:
x ||= y;
x || (x = y);

// Nullish coalescing演算子のセマンティクス:
x ?? y
// → x が null または undefined な場合: y
// → x が null または undefined でない場合: x

// 最後に Nullish coalescing 代入:
x ??= y;
x ?? (x = y);
```

## 短絡評価のセマンティクス

数学的およびビット演算の対応演算子とは異なり、論理代入は対応する論理演算の短絡評価の動作に従います。つまり、右辺が評価される場合にのみ代入が実行されます。

最初はこれが混乱を招くかもしれません。他の複合代入と同じように、なぜ無条件に左辺に代入しないのでしょうか？

これには実際的な理由があります。論理演算と代入を組み合わせると、代入が論理演算の結果に基づいて条件付きで発生するべき副作用を引き起こす可能性があるためです。無条件に副作用を引き起こすと、プログラムの性能や正確性に悪影響を及ぼすことがあります。

具体例として、デフォルトメッセージを要素に設定する関数の2つのバージョンで説明します。

```js
// 何も上書きされていない場合、デフォルトメッセージを表示します。
// innerHTML が空の場合のみ代入します。msgElement の inner 要素
// がフォーカスを失うことはありません。
function setDefaultMessage() {
  msgElement.innerHTML ||= '<p>メッセージがありません<p>';
}

// 何も上書きされていない場合、デフォルトメッセージを表示します。
// 不具合あり！呼び出されるたびに msgElement の inner 要素
// がフォーカスを失う可能性があります。
function setDefaultMessageBuggy() {
  msgElement.innerHTML = msgElement.innerHTML || '<p>メッセージがありません<p>';
}
```

:::note
**注意:** `innerHTML`プロパティは[仕様](https://w3c.github.io/DOM-Parsing/#dom-innerhtml-innerhtml)上、`null`や`undefined`ではなく空文字列を返すため、`??=`ではなく`||=`を使用する必要があります。コードを書く際には、多くのWeb APIが空や不在を意味するために`null`や`undefined`を使用しないことを覚えておいてください。
:::

HTML では、要素の`.innerHTML`プロパティに代入すると、その要素の内包要素が削除され、新しく代入された文字列から解析された要素が挿入されます。新しい文字列が古い文字列と同じであっても、余計な処理が発生し、inner要素がフォーカスを失う原因となります。このような意図しない副作用を避けるため、論理代入演算子のセマンティクスは短絡評価によって代入を条件付きにします。

他の複合代入演算子との対称性を次のように考えると理解しやすいかもしれません。数学的およびビット演算子は無条件であるため、代入も無条件です。一方、論理演算子は条件付きであるため、代入も条件付きになります。

## 論理代入のサポート

<feature-support chrome="85"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1629106"
                 safari="14 https://developer.apple.com/documentation/safari-release-notes/safari-14-beta-release-notes#New-Features:~:text=論理代入演算子のサポートが追加されました。"
                 nodejs="16"
                 babel="はい https://babeljs.io/docs/en/babel-plugin-proposal-logical-assignment-operators"></feature-support>
