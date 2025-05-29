---
title: "V8の正規表現を高速化する"
author: "Jakob Gruber、レギュラーソフトウェアエンジニア"
avatars:
  - "jakob-gruber"
date: 2017-01-10 13:33:37
tags:
  - internals
  - RegExp
description: "V8は最近、自己ホスト型JavaScript実装から、新しいコード生成アーキテクチャ（TurboFanベース）に直接接続する形の実装にRegExpの組み込み関数を移行しました。"
---
このブログ投稿では、V8が最近実施したRegExpの組み込み関数を自己ホスト型JavaScript実装から[TurboFan](/blog/v8-release-56)を基盤とする新しいコード生成アーキテクチャに直接接続する形になった移行について説明します。

<!--truncate-->
V8のRegExp実装は、広く最速のRegExpエンジンの1つと考えられている[Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)の上に構築されています。このエンジン自体は文字列に対するパターンマッチングを実行する低レベルなロジックをカプセル化していますが、[`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec)のようなRegExpプロトタイプ上の関数は、その機能をユーザーに公開するために必要な追加作業を行います。

これまで、V8のさまざまなコンポーネントはJavaScriptで実装されてきました。最近まで、`regexp.js`はその1つであり、RegExpコンストラクタの実装、すべてのプロパティおよびプロトタイプのプロパティをホストしていました。

しかし、これは予測不可能なパフォーマンスや低レベル機能のためにC++ランタイムへの高価な移行を含む欠点があります。ES6での組み込みサブクラス化（JavaScript開発者が独自のカスタマイズされたRegExp実装を提供できるようにする機能）が最近追加されたことで、RegExpのパフォーマンスがさらに低下しました。RegExp組み込みがサブクラス化されていない場合でも、これらの性能低下は完全には自己ホスト型JavaScript実装で対応できませんでした。

したがって、JavaScriptからRegExp実装を移行することを決定しました。しかし、パフォーマンスを維持することは予想以上に困難でした。完全なC++実装への最初の移行はかなり遅く、元の実装のパフォーマンスの約70%にしか達しませんでした。調査の結果、いくつかの原因を見つけました:

- [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec)には、特に正規表現エンジンへの移行やRegExp結果の構成に関連する部分文字列呼び出しなど、極めて性能が敏感な領域がいくつか含まれています。JavaScript実装は「スタブ」と呼ばれるネイティブアセンブリ言語で記述された、または最適化コンパイラパイプラインに直接フックするこの高度に最適化されたコードを利用していました。 C++からこれらのスタブをアクセスすることはできず、それらのランタイム相当物はかなり遅いです。
- RegExpの`lastIndex`などのプロパティへのアクセスは高価になる可能性があり、名前によるルックアップやプロトタイプチェーンのトラバースを必要とする場合もあります。V8の最適化コンパイラは、このようなアクセスを効率的な操作に自動的に置き換えることができる場合がよくありますが、これらの場合はC++で明示的に対処する必要があります。
- C++では、JavaScriptオブジェクトへの参照は、ガーベージコレクションと協力するためにいわゆる`Handle`でラップする必要があります。Handle管理は、純粋なJavaScript実装と比較してさらなるオーバーヘッドを生じさせます。

RegExp移行の新しい設計は、V8開発者がプラットフォームに依存しないコードを記述できるようにする[CodeStubAssembler](/blog/csa)に基づいています。これにより、最適化コンパイラTurboFanにも使用されるバックエンドによって高速なプラットフォーム固有のコードに後で変換されます。CodeStubAssemblerを使用することで、初期C++実装のすべての欠点に対処できます。スタブ（正規表現エンジンへのエントリポイントなど）はCodeStubAssemblerから簡単に呼び出すことができます。高速プロパティアクセスは依然としていわゆる高速経路で明示的に実装する必要がありますが、CodeStubAssemblerではこれらのアクセスは非常に効率的です。HandleはC++以外では存在しません。そして、実装が非常に低レベルで動作するようになったので、必要でない場合は高価な結果構成をスキップするなどのさらなるショートカットを取ることができます。

結果は非常に良好です。[大規模な正規表現ワークロード](https://github.com/chromium/octane/blob/master/regexp.js)におけるスコアは15%向上し、最近のサブクラス化に関連するパフォーマンス低下を大きく回復しました。マイクロベンチマーク（図1）では、[`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec)で7%、[`RegExp.prototype[@@split]`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/@@split)では最大102%の改善が見られます。

![図1: 関数ごとの正規表現の速度向上](/_img/speeding-up-regular-expressions/perf.png)

では、JavaScript開発者として正規表現を高速化するにはどうすればよいでしょうか？正規表現の内部にフックを入れることに興味がない場合は、最高のパフォーマンスを得るために、正規表現インスタンスやそのプロトタイプを変更しないことを確認してください:

```js
const re = /./g;
re.exec('');  // 高速パス。
re.new_property = '遅い';
RegExp.prototype.new_property = 'これも遅い';
re.exec('');  // 低速パス。
```

また、正規表現のサブクラス化は非常に有用である場合もありますが、サブクラス化された正規表現インスタンスはより汎用的な処理が必要となるため、低速パスを取ることに注意してください:

```js
class SlowRegExp extends RegExp {}
new SlowRegExp(".", "g").exec('');  // 低速パス。
```

完全な正規表現の移行はV8 v5.7で利用可能になります。
