---
title: 'V8での`DataView`パフォーマンスの向上'
author: 'Théotime Grohens（<i lang="fr">データビューの賢人</i>）とBenedikt Meurer（[@bmeurer](https://twitter.com/bmeurer)）、プロフェッショナルなパフォーマンスパル'
avatars:
  - 'benedikt-meurer'
date: 2018-09-18 11:20:37
tags:
  - ECMAScript
  - ベンチマーク
description: 'V8 v6.9では、DataViewと同等のTypedArrayコード間のパフォーマンスギャップを埋め、DataViewをパフォーマンスが重要なリアルワールドアプリケーションで利用可能にしました。'
tweet: '1041981091727466496'
---
[`DataView`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView)は、JavaScriptで低レベルメモリアクセスを行うための2つの可能な方法の1つです。もう1つは[`TypedArray`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray)です。これまで、V8において`TypedArray`sは`DataView`sよりもかなり最適化されており、グラフィックス集約ワークロードやバイナリデータのデコード/エンコードなどの作業において低いパフォーマンスを示していました。この理由の多くは歴史的な選択に起因しています。例えば、[asm.js](http://asmjs.org/)が`DataView`sではなく`TypedArray`sを選択していたことにより、エンジンが`TypedArray`sのパフォーマンスに焦点を当てるよう促されていました。

<!--truncate-->
このパフォーマンスペナルティのため、Google MapsチームのようなJavaScript開発者は`DataView`sを避け、`TypedArray`sに頼ることを選びましたが、その代償としてコードの複雑さが増しました。この記事では、`DataView`のパフォーマンスを[V8 v6.9](/blog/v8-release-69)で同等の`TypedArray`コードに匹敵するレベルに引き上げる—さらにその性能を上回る—方法を説明します。これにより、`DataView`はパフォーマンスの重要なリアルワールドアプリケーションで利用可能となりました。

## 背景

ES2015の導入以来、JavaScriptは[`ArrayBuffer`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)という生のバイナリバッファでのデータの読み書きをサポートしています。`ArrayBuffer`sは直接アクセスすることができず、プログラムは`DataView`または`TypedArray`であるいわゆる*array buffer view*オブジェクトを使用する必要があります。

`TypedArray`sはプログラムがバッファを均一な型の値の配列としてアクセスできるようにします。例えば、`Int16Array`や`Float32Array`などがあります。

```js
const buffer = new ArrayBuffer(32);
const array = new Int16Array(buffer);

for (let i = 0; i < array.length; i++) {
  array[i] = i * i;
}

console.log(array);
// → [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225]
```

一方で、`DataView`sはより細かいデータアクセスを可能にします。これによりプログラマーはバッファから読み出す値や書き込む値の型を選択することができ、各数字型に特化したゲッターやセッターを提供します。これによりデータ構造の直列化に役立ちます。

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

const person = { age: 42, height: 1.76 };

view.setUint8(0, person.age);
view.setFloat64(1, person.height);

console.log(view.getUint8(0)); // 期待される出力: 42
console.log(view.getFloat64(1)); // 期待される出力: 1.76
```

さらに、`DataView`sはデータストレージのエンディアンを選択することも可能です。これによりネットワーク、ファイル、GPUなど外部ソースからデータを受信する際に役立ちます。

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

view.setInt32(0, 0x8BADF00D, true); // リトルエンディアンで書き込み。
console.log(view.getInt32(0, false)); // ビッグエンディアンで読み込み。
// 期待される出力: 0x0DF0AD8B (233876875)
```

効率的な`DataView`の実装は以前から長らくフィーチャーリクエストでありました（[このバグレポート](https://bugs.chromium.org/p/chromium/issues/detail?id=225811)をご参照ください、5年以上前のものです）。この度、DataViewパフォーマンスが同等レベルまで向上したことを嬉しくお知らせします！

## レガシーランタイム実装

最近まで、`DataView`のメソッドはV8内で組み込みのC++ランタイム関数として実装されていました。これには非常にコストがかかるため、各呼び出しでJavaScriptからC++へ（またその逆へ）の高価な移行が必要でした。

この実装によって発生する実際のパフォーマンスコストを調査するため、ネイティブの`DataView`ゲッター実装をJavaScriptラッパーと比較するパフォーマンスベンチマークを設定しました。このラッパーは`DataView`の動作をシミュレートし、基礎となるバッファからバイト単位でデータを読み取るために`Uint8Array`を使用し、これらのバイトから戻り値を計算します。例えば、リトルエンディアン32ビット符号なし整数値を読み込むための関数は以下の通りです:

```js
function LittleEndian(buffer) { // リトルエンディアン`DataView`読み取りをシミュレート。
  this.uint8View_ = new Uint8Array(buffer);
}

LittleEndian.prototype.getUint32 = function(byteOffset) {
  return this.uint8View_[byteOffset] |
    (this.uint8View_[byteOffset + 1] << 8) |
    (this.uint8View_[byteOffset + 2] << 16) |
    (this.uint8View_[byteOffset + 3] << 24);
};
```

`TypedArray`はすでにV8で大幅に最適化されているため、これが達成したいパフォーマンスの目標となっています。

![オリジナルの`DataView`パフォーマンス](/_img/dataview/dataview-original.svg)

ベンチマークでは、ネイティブの`DataView`のゲッターのパフォーマンスが、ビッグエンディアンおよびリトルエンディアンの読み取りのいずれにおいても、`Uint8Array`ベースのラッパーよりも**4倍**遅いことがわかりました。

## 基準パフォーマンスの向上

`DataView`オブジェクトのパフォーマンス改善を始めるにあたり、まず実装をC++ランタイムから[`CodeStubAssembler`（CSAとも呼ばれる)](/blog/csa)へ移行しました。CSAは、TurboFanの機械レベル中間表現（IR）で直接コードを書くことを可能にする移植可能なアセンブリ言語で、V8のJavaScript標準ライブラリの最適化部品の実装に用いられます。CSAにコードを書き換えることでC++への呼び出しを完全にバイパスし、TurboFanのバックエンドを活用して効率的な機械コードを生成します。

しかし、手作業でCSAコードを書くのは面倒です。CSAにおける制御フローはアセンブリのように表現され、明示的なラベルや`goto`を用いるため、一目でコードを読み取るのが難しくなります。

V8の最適化されたJavaScript標準ライブラリへの開発者の貢献を容易にし、読みやすさと保守性を向上させるため、CSAにコンパイルされる新しい言語V8 *Torque*の設計を開始しました。*Torque*の目標は、CSAコードの記述や保守を難しくする低レベルの詳細を抽象化しつつ、同じパフォーマンス特性を維持することです。

`DataView`コードを書き直すことは、Torqueを新しいコードで使用し始める絶好の機会となり、Torque開発者に対して言語に関する多くのフィードバックを提供しました。Torqueで書かれた`DataView`の`getUint32()`メソッドの実装は以下の通りです。

```torque
macro LoadDataViewUint32(buffer: JSArrayBuffer, offset: intptr,
                    requested_little_endian: bool,
                    signed: constexpr bool): Number {
  let data_pointer: RawPtr = buffer.backing_store;

  let b0: uint32 = LoadUint8(data_pointer, offset);
  let b1: uint32 = LoadUint8(data_pointer, offset + 1);
  let b2: uint32 = LoadUint8(data_pointer, offset + 2);
  let b3: uint32 = LoadUint8(data_pointer, offset + 3);
  let result: uint32;

  if (requested_little_endian) {
    result = (b3 << 24) | (b2 << 16) | (b1 << 8) | b0;
  } else {
    result = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
  }

  return convert<Number>(result);
}
```

`DataView`メソッドをTorqueに移行することで**3倍のパフォーマンス向上**を達成しましたが、まだ`Uint8Array`ベースのラッパーのパフォーマンスには及びませんでした。

![Torque `DataView`パフォーマンス](/_img/dataview/dataview-torque.svg)

## TurboFan向けの最適化

JavaScriptコードが頻繁に実行される場合、TurboFan最適化コンパイラを使用してコンパイルし、解釈されたバイトコードより効率的に動作する高度に最適化された機械コードを生成します。

TurboFanは、入力されるJavaScriptコードを内部的なグラフ表現（具体的には[“sea of nodes”](https://darksi.de/d.sea-of-nodes/)）に変換することで機能します。最初の段階ではJavaScriptの操作やセマンティクスに一致する高レベルのノードが使用され、それを段階的に低レベルのノードへと詳細化し、最終的に機械コードを生成します。

特に、関数呼び出し（たとえば`DataView`メソッドの呼び出し）は、内部的には`JSCall`ノードとして表現され、最終的には生成された機械コード内で実際の関数呼び出しにまで簡略化されます。

しかし、TurboFanでは、`JSCall`ノードが既知の関数（たとえばビルトイン関数）の呼び出しであるかを確認し、IR内でそのノードをインライン化することが可能です。これにより、複雑な`JSCall`はコンパイル時に関数を表すサブグラフへと置き換えられます。これにより、関数の内部を広いコンテキストの一部として最適化することが可能になり、特に高コストな関数呼び出しを削除できます。

![初期TurboFan `DataView`パフォーマンス](/_img/dataview/dataview-turbofan-initial.svg)

TurboFanでのインライン化を実装することで、ついに`Uint8Array`ラッパーのパフォーマンスに匹敵し、さらには超えることができ、以前のC++実装に比べて**8倍**高速になりました。

## さらなるTurboFan最適化

`DataView`メソッドをインライン化した後、TurboFanが生成する機械コードを見ると、まだ改善の余地があることが分かりました。これらのメソッドの最初の実装は、仕様に非常に忠実に従おうとしており、たとえば基になる`ArrayBuffer`の範囲外の読み取りや書き込みを試みた際にはエラーをスローしていました。

しかしながら、TurboFanで記述するコードは、一般的な頻繁に使用されるケースにおいて可能な限り高速化することを目的としており、すべての可能なエッジケースをサポートする必要はありません。これらのエラーを詳細に処理する機能をすべて削除し、例外をスローする必要がある場合にはTorqueの基本実装にデオプティマイズするだけで済むようにしたところ、生成されるコードのサイズを約35%削減することができ、大幅な速度向上を実現しました。また、TurboFanコードがかなり簡素化されました。

TurboFanで可能な限り特化するというアイデアに従って、TurboFan最適化されたコード内で非常に大きいインデックスやオフセット（Smi範囲外）に対するサポートも削除しました。これにより、32ビット値に収まらないオフセットに必要なfloat64演算の処理を除去し、大きな整数をヒープに保存する必要もなくなりました。

初期のTurboFan実装と比較すると、`DataView`のベンチマークスコアが2倍以上に向上しました。`DataView`は現在、`Uint8Array`ラッパーと比較して約3倍速く、元の`DataView`実装と比較して約**16倍速く**なっています！

![最終的なTurboFan `DataView`性能](/_img/dataview/dataview-turbofan-final.svg)

## 影響

私たちは独自のベンチマークに加えて、実際の例において新しい実装の性能への影響を評価しました。

`DataView`は、JavaScriptからバイナリ形式でエンコードされたデータをデコードする際によく使用されます。そのようなバイナリ形式の一つに[FBX](https://en.wikipedia.org/wiki/FBX)があります。これは3Dアニメーションを交換するために使用される形式です。人気のあるJavaScript3Dライブラリである[three.js](https://threejs.org/)のFBXローダーにインストゥルメントを行い、その実行時間が10%（約80ミリ秒）削減されることを確認しました。

`DataView`の全体的な性能を`TypedArray`と比較しました。その結果、ネイティブエンディアン（Intelプロセッサ上ではリトルエンディアン）で整列されたデータにアクセスする際の性能において、新しい`DataView`実装はほぼ同等の性能を提供し、性能差を大幅に縮め、`DataView`をV8での実用的な選択肢としました。

![`DataView` vs. `TypedArray`ピーク性能](/_img/dataview/dataview-vs-typedarray.svg)

`TypedArray`のシムに頼るのではなく、適切な場面で`DataView`を使用できるようになったことを期待しています。`DataView`の使用に関するフィードバックをぜひお寄せください！[バグトラッカー](https://crbug.com/v8/new)、v8-users@googlegroups.comへのメール、または[@v8js on Twitter](https://twitter.com/v8js)からご連絡いただけます。
