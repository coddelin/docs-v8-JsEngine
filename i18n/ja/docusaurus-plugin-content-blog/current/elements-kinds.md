---
title: &apos;V8におけるElementsの種類&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-09-12 13:33:37
tags:
  - internals
  - presentations
description: &apos;この記事では、V8が配列操作を裏で最適化する仕組みと、それがJavaScript開発者にとって何を意味するかを技術的に深掘りします。&apos;
tweet: &apos;907608362191376384&apos;
---
:::note
**注:** 記事を読むよりプレゼンを見る方が好みの方には、以下の動画をぜひお楽しみください！
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/m9cTaYI95Zc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

JavaScriptのオブジェクトは、任意のプロパティを関連付けることができます。オブジェクトプロパティ名には任意の文字が含まれることが可能です。JavaScriptエンジンが最適化を選択する興味深いケースの1つが、名前が純粋に数値であるプロパティ、特に[配列インデックス](https://tc39.es/ecma262/#array-index)です。

<!--truncate-->
V8では、整数名を持つプロパティ（最も一般的な形式は`Array`コンストラクタによって生成されたオブジェクト）が特別に扱われます。これらの数値インデックスプロパティは多くの状況で他のプロパティと同様に振る舞いますが、V8は最適化目的でこれらを数値以外のプロパティから別に保存することを選択します。内部的には、V8はこれらのプロパティに特別な名前を付けています：_elements_（要素）。オブジェクトは[プロパティ](/blog/fast-properties)を持ち、それらが値にマッピングされますが、配列はインデックスを持ち、それらが要素にマッピングされます。

これらの内部構造がJavaScript開発者に直接公開されることはありませんが、なぜ特定のコードパターンが他のパターンよりも高速であるかを説明します。

## 一般的なelementsの種類

JavaScriptコードの実行中、V8は各配列がどの種類の要素を含んでいるかを追跡します。この情報により、V8はこの要素の種類に特化した配列操作を最適化することができます。例えば、`reduce`、`map`、または`forEach`を配列で呼び出すとき、V8は配列が含む要素の種類に基づいてこれらの操作を最適化することができます。

たとえば、以下のような配列を考えてみましょう：

```js
const array = [1, 2, 3];
```

それはどの種類の要素を含んでいるのでしょうか？ `typeof`演算子に尋ねると、この配列には`number`が含まれていると教えてくれるでしょう。言語レベルではそれだけです：JavaScriptは整数、小数、倍精度数を区別せず、すべてがただの`number`です。しかし、エンジンレベルではもっと正確な区別をすることができます。この配列のelementsの種類は`PACKED_SMI_ELEMENTS`です。V8では、Smiという用語は小さな整数を保存するために使用される特定の形式を指します。（後で`PACKED`について説明します。）

その後、同じ配列に浮動小数点数を追加すると、より汎用的なelementsの種類に遷移します：

```js
const array = [1, 2, 3];
// elements種類: PACKED_SMI_ELEMENTS
array.push(4.56);
// elements種類: PACKED_DOUBLE_ELEMENTS
```

配列に文字列リテラルを追加すると、elementsの種類が再び変更されます。

```js
const array = [1, 2, 3];
// elements種類: PACKED_SMI_ELEMENTS
array.push(4.56);
// elements種類: PACKED_DOUBLE_ELEMENTS
array.push(&apos;x&apos;);
// elements種類: PACKED_ELEMENTS
```

これまでに3種類のelementsが確認されましたが、以下の基本的な型です：

- <b>Sm</b>all <b>i</b>ntegers、別名Smi。
- 浮動小数点数やSmiとして表現できない整数のためのDouble。
- SmiやDoubleとして表現できない値のための通常のelements。

DoubleはSmiのより一般的な変種であり、通常のelementsはDoubleのさらにその上の一般化です。Smiとして表現できる数値の集合は、Doubleとして表現できる数値の集合の部分集合です。

ここで重要なのは、elementsの種類の遷移が1方向にしか行われないことです：特定の（例えば`PACKED_SMI_ELEMENTS`）からより一般的な（例えば`PACKED_ELEMENTS`）へ。一度配列が`PACKED_ELEMENTS`としてマークされると、例えば`PACKED_DOUBLE_ELEMENTS`に戻ることはできません。

ここまでで学んだことは以下の通りです：

- V8は各配列にelementsの種類を割り当てます。
- 配列のelementsの種類は固定されておらず、ランタイムで変更することができます。前述の例では、`PACKED_SMI_ELEMENTS`から`PACKED_ELEMENTS`に遷移しました。
- elementsの種類の遷移は特定の種類からより一般的な種類への遷移のみ可能です。

## `PACKED`と`HOLEY`の種類

これまで、密なまたは詰まった配列を扱ってきました。配列に空穴を作る（つまり配列をスパースにする）と、elementsの種類が「HOLEY」の変種に降格されます：

```js
const array = [1, 2, 3, 4.56, &apos;x&apos;];
// elements種類: PACKED_ELEMENTS
array.length; // 5
array[9] = 1; // array[5]からarray[8]は現在空穴
// elements種類: HOLEY_ELEMENTS
```

V8はこの区別を行う理由として、詰められた配列に対する操作は穴あき配列に比べてより効率的に最適化できるためです。詰められた配列では、ほとんどの操作が効率的に実行可能です。一方、穴あき配列に対する操作では、追加のチェックやプロトタイプチェーンでの高コストな検索が必要となります。

これまで見てきた基本的な要素の種類（つまり、Smi、倍精度浮動小数点数、通常の要素）はそれぞれ2つの形態があります：詰められたものと穴あきのものです。例えば`PACKED_SMI_ELEMENTS`から`PACKED_DOUBLE_ELEMENTS`に移行できるだけでなく、どの`PACKED`種別からもその`HOLEY`種別に移行することができます。

まとめると：

- 最も一般的な要素の種類には`PACKED`と`HOLEY`の形態があります。
- 詰められた配列に対する操作は、穴あき配列に対する操作よりも効率的です。
- 要素の種類は`PACKED`から`HOLEY`の形態に移行することができます。

## 要素の種類の格子構造

V8はこのタグ移行システムを[格子構造](https://en.wikipedia.org/wiki/Lattice_%28order%29)として実装しています。以下は最も一般的な要素の種類のみを使った簡略化された可視化です：

![](/_img/elements-kinds/lattice.svg)

格子を下方向に移行することしかできません。例えば、Smiの配列に1つの浮動小数点数が追加されると、それが後にSmiに上書きされたとしてもその配列はDOUBLEとしてマークされます。同様に、一度配列に穴が作られると、それを後で埋めても永久に穴あきとしてマークされます。

:::note
**更新 @ 2025-02-28:** [特に`Array.prototype.fill`の場合](https://chromium-review.googlesource.com/c/v8/v8/+/6285929)には例外があります。
:::

現在、V8は[21種類の異なる要素の種類](https://cs.chromium.org/chromium/src/v8/src/elements-kind.h?l=14&rcl=ec37390b2ba2b4051f46f153a8cc179ed4656f5d)を区別しており、それぞれに独自の最適化が可能なセットがあります。

一般的に、より具体的な要素の種類はより細かい最適化を可能にします。格子構造で下部に行くほど、そのオブジェクトの操作は遅くなる可能性があります。最適な性能を得るためには、必要のないものをより不特定な種類に移行しないようにし、現在の状況に適用可能な最も具体的な種類を使用するようにしてください。

## パフォーマンスのヒント

ほとんどの場合、要素種別のトラッキングは見えない形で内部で機能しており、気にする必要はありません。しかし、以下のいくつかのことを実行することで、このシステムから最大限の利益を得ることができます。

### 配列の長さを超えて読み取らないようにする

やや意外に思えるかもしれませんが（この記事のタイトルを考えると）、最も重要なパフォーマンスのヒントは要素種別のトラッキングには直接関連していません（ただし、内部で発生することは少し似ています）。配列の長さを超えて読み取ることは、驚くべき性能への影響を与えます。例えば、`array.length === 5`のときに`array[42]`を読み取る場合です。この場合、配列インデックス`42`は範囲外であり、そのプロパティは配列自体に存在しないため、JavaScriptエンジンは高コストなプロトタイプチェーンの検索を実行する必要があります。ロードがこの状況に遭遇すると、「このロードは特殊なケースを処理する必要がある」とV8に記憶され、範囲外の読み取りを行う前ほど高速になることは二度とありません。

以下のようなループを書かないでください：

```js
// このようなコードは避けてください！
for (let i = 0, item; (item = items[i]) != null; i++) {
  doSomething(item);
}
```

このコードは配列内のすべての要素を読み取った後、さらに1つ読み取ります。これは`undefined`または`null`の要素を見つけたときに終了します。（jQueryはこのパターンをいくつかの場所で使用しています。）

代わりに、古い形態の方法でループを書いて、最後の要素に到達するまで単に繰り返してください。

```js
for (let index = 0; index < items.length; index++) {
  const item = items[index];
  doSomething(item);
}
```

ループしているコレクションが`Iterable`（配列や`NodeList`の場合）である場合、それがさらに良い方法です：単に`for-of`を使用してください。

```js
for (const item of items) {
  doSomething(item);
}
```

配列の場合、`forEach`のビルトイン関数を使用することもできます：

```js
items.forEach((item) => {
  doSomething(item);
});
```

現在では、`for-of`と`forEach`の性能は古典的な`for`ループと同等です。

配列の長さを超えて読み取らないようにしてください！この場合、V8の範囲チェックが失敗し、そのプロパティが存在するか確認するチェックが失敗し、それからプロトタイプチェーンを検索する必要があります。その影響はさらに悪化し、誤って値を計算に使用した場合、例えば：

```js
function Maximum(array) {
  let max = 0;
  for (let i = 0; i <= array.length; i++) { // 不適切な比較！
    if (array[i] > max) max = array[i];
  }
  return max;
}
```

ここでは、最後の繰り返しで配列の長さを超えて読み取り、`undefined`を返します。これによりロードだけでなく比較も汚染されます：数字の比較だけでなく特殊なケースも処理しなければならなくなります。終了条件を適切な`i < array.length`に修正することで、この例の性能が**6倍**改善されます（配列が10,000要素の場合で測定され、繰り返し回数は0.01％しか減少しません）。

### 要素種別の移行を避ける

一般的に、配列で多くの操作を行う必要がある場合、可能な限り具体的な要素の種類に固執するようにしてください。そうすることで、V8がこれらの操作を最大限に最適化できます。

これは思ったよりも難しいです。例えば、`-0`を小さな整数の配列に追加するだけで、それが`PACKED_DOUBLE_ELEMENTS`に移行する原因になります。

```js
const array = [3, 2, 1, +0];
// PACKED_SMI_ELEMENTS
array.push(-0);
// PACKED_DOUBLE_ELEMENTS
```

その結果、この配列の今後の操作は、SMIの場合とは完全に異なる方法で最適化されます。

コード内で`-0`と`+0`を明示的に区別する必要がない限り、`-0`は避けてください。（おそらく必要ありません。）

`NaN`や`Infinity`についても同様です。これらはダブルとして表されるため、単一の`NaN`または`Infinity`を`SMI_ELEMENTS`の配列に追加すると、それが`DOUBLE_ELEMENTS`に移行します。

```js
const array = [3, 2, 1];
// PACKED_SMI_ELEMENTS
array.push(NaN, Infinity);
// PACKED_DOUBLE_ELEMENTS
```

整数の配列で多数の操作を行う予定がある場合は、`-0`を正規化し、`NaN`や`Infinity`をブロックして値を初期化することを検討してください。その結果、配列は`PACKED_SMI_ELEMENTS`タイプに留まります。この一回限りの正規化コストは、後の最適化の価値がある場合があります。

実際のところ、数値配列に対して数学的操作を行う場合は、TypedArrayの使用を検討してください。これについては専門の要素タイプもあります。

### 配列ライクなオブジェクトより配列を好む

JavaScriptの一部のオブジェクト（特にDOM内）は配列のように見えますが、適切な配列ではありません。このような配列ライクなオブジェクトを自分で作成することもできます：

```js
const arrayLike = {};
arrayLike[0] = 'a';
arrayLike[1] = 'b';
arrayLike[2] = 'c';
arrayLike.length = 3;
```

このオブジェクトには`length`があり、インデックス付きの要素アクセスをサポートしています（まるで配列のように！）が、そのプロトタイプには`forEach`などの配列メソッドが欠けています。ただし、配列ジェネリックをこれに呼び出すことは可能です：

```js
Array.prototype.forEach.call(arrayLike, (value, index) => {
  console.log(`${ index }: ${ value }`);
});
// このログには'0: a'、'1: b'、そして'2: c'が出力されます。
```

このコードでは配列ライクなオブジェクトに`Array.prototype.forEach`ビルトインを呼び出し、期待通りに動作します。ただし、適切な配列で`forEach`を呼び出したほうが高速で、V8で高度に最適化されたものです。このオブジェクトで配列ビルトインを複数回使用する予定がある場合は、事前に適切な配列に変換することを検討してください：

```js
const actualArray = Array.prototype.slice.call(arrayLike, 0);
actualArray.forEach((value, index) => {
  console.log(`${ index }: ${ value }`);
});
// このログには'0: a'、'1: b'、そして'2: c'が出力されます。
```

一回限りの変換コストは、その後の最適化の価値がある場合があります。特に配列に対して多数の操作を行う予定がある場合はなおさらです。

例えば、`arguments`オブジェクトは配列ライクなオブジェクトです。これに対して配列ビルトインを呼び出すことは可能ですが、その操作は適切な配列に対して完全に最適化される方法では最適化されません。

```js
const logArgs = function() {
  Array.prototype.forEach.call(arguments, (value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs('a', 'b', 'c');
// このログには'0: a'、'1: b'、そして'2: c'が出力されます。
```

ES2015の残余パラメータはここで役立ちます。これにより、配列ライクな`arguments`オブジェクトの代わりに使用できる適切な配列が生成され、よりエレガントな方法で使用できます。

```js
const logArgs = (...args) => {
  args.forEach((value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs('a', 'b', 'c');
// このログには'0: a'、'1: b'、そして'2: c'が出力されます。
```

現在では、`arguments`オブジェクトを直接使用する理由はほとんどありません。

一般的に、可能な限り配列ライクなオブジェクトを避け、適切な配列を使用してください。

### ポリモーフィズムを回避する

多くの異なる要素タイプを持つ配列を処理するコードがある場合、それによりポリモーフィックな操作が生じ、単一の要素タイプのみを操作するバージョンのコードよりも遅くなります。

次の例を考えてみてください。ライブラリ関数がさまざまな要素タイプで呼び出されます。（これはネイティブの`Array.prototype.forEach`ではありません。このネイティブには、この要素タイプ固有の最適化に加えて独自の最適化セットがあります。）

```js
const each = (array, callback) => {
  for (let index = 0; index < array.length; ++index) {
    const item = array[index];
    callback(item);
  }
};
const doSomething = (item) => console.log(item);

each([], () => {});

each(['a', 'b', 'c'], doSomething);
// `each`は`PACKED_ELEMENTS`で呼び出されます。V8はインラインキャッシュ
// （または「IC」）を使用して、`each`がこの特定の要素タイプで呼び出されたことを記憶します。
// V8は楽観的に、`each`関数内の`array.length`および`array[index]`へのアクセスが
// モノモーフィック（つまり、単一の要素タイプのみを受け取る）であると仮定します
// 証明されるまで。以降のすべての`each`の呼び出しでは、V8は
// 要素タイプが`PACKED_ELEMENTS`であるかどうかをチェックします。そうであれば、
// 前に生成されたコードを再利用できます。そうでない場合は、さらに作業が必要です。

each([1.1, 2.2, 3.3], doSomething);
// `each` が `PACKED_DOUBLE_ELEMENTS` で呼び出されます。V8は
// 現在 `each` に渡される異なる要素の種類をICで見ているため、
// `each` 関数内の `array.length` と `array[index]` アクセスが
// 多態的としてマークされます。これにより、V8は
// `each` が呼び出されるたびに追加のチェックが必要になります。
// `PACKED_ELEMENTS` 用（一度目と同じ）、新しい `PACKED_DOUBLE_ELEMENTS`
// 用、そして他の要素の種類用（一度目と同じ）。これがパフォーマンスに
// 悪影響を及ぼします。

each([1, 2, 3], doSomething);
// `each` が `PACKED_SMI_ELEMENTS` で呼び出されます。これにより、さらに
// 多態性の度合いがトリガーされます。現在、`each` のICには3つの異なる
// 要素の種類があります。今後の`each` の呼び出しごとに、生成されたコードを
// 再利用するために、さらに別の要素の種類チェックが必要になります。
// これがパフォーマンスコストを伴います。
```

標準組み込みメソッド（例えば `Array.prototype.forEach` など）は、この種の多態性をはるかに効率的に処理できます。そのため、パフォーマンスが重要な状況では、ユーザー独自のライブラリ関数ではなくこれらを使用することを検討してください。

V8における単形性 vs 多形性の別の例は、オブジェクトの形状、つまりオブジェクトの隠れたクラスに関係します。このケースについて学びたい場合は、[Vyacheslav の記事](https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html)をチェックしてください。

### ホールの作成を避ける

実際のコーディングパターンでは、ホール配列またはパック配列をアクセスする際のパフォーマンスの違いは通常、重要ではないか、測定もできないほど小さいです。もし（これは非常に限定的な状況ですが！）パフォーマンス測定が、最適化されたコード内で最後の1命令を保存する価値があると示した場合は、配列をパックされた要素モードに保つよう試みることができます。例えば以下のように配列を作成してみましょう：

```js
const array = new Array(3);
// この時点で配列はスパースです。そのため `HOLEY_SMI_ELEMENTS` としてマークされます。
// つまり、現在の情報から得られる最も具体的な可能性です。
array[0] = &apos;a&apos;;
// あれ、これは小さい整数ではなく文字列です…種類が `HOLEY_ELEMENTS’ に移行します。
array[1] = &apos;b&apos;;
array[2] = &apos;c&apos;;
// この時点で、配列内の3つすべての位置が埋まっているため、
// 配列はパックされます（つまり、もはやスパースではありません）。しかし、
// `PACKED_ELEMENTS` などのより具体的な種類に移行することはできません。要素の種類は
// `HOLEY_ELEMENTS` のままです。
```

一度配列がホールとして指定されると、後でそのすべての要素が存在していても永久にホールとして保持されます！

配列を作成するより良い方法は、リテラルを使用することです：

```js
const array = [&apos;a&apos;, &apos;b&apos;, &apos;c&apos;];
// 要素の種類: PACKED_ELEMENTS
```

事前にすべての値がわからない場合は、空の配列を作成し、後で値を `push` します。

```js
const array = [];
// …
array.push(someValue);
// …
array.push(someOtherValue);
```

このアプローチでは、配列がホール要素の種類に移行することはありません。その結果、V8はこの配列に対して一部の操作でわずかに最適化されたコードを生成できる可能性があります。

## 要素の種類のデバッグ

与えられたオブジェクトの「要素の種類」を調べるには、`d8` のデバッグビルドを取得し（[ソースからビルドする](/docs/build)か、[`jsvu`](https://github.com/GoogleChromeLabs/jsvu)を使って事前コンパイル済みバイナリを取得）、以下を実行します：

```bash
out/x64.debug/d8 --allow-natives-syntax
```

これにより、特別な関数（例えば `%DebugPrint(object)` など）が利用可能な `d8` REPL が開きます。その出力中の「elements」フィールドが、渡したオブジェクトの「要素の種類」を示します。

```js
d8> const array = [1, 2, 3]; %DebugPrint(array);
DebugPrint: 0x1fbbad30fd71: [JSArray]
 - map = 0x10a6f8a038b1 [FastProperties]
 - prototype = 0x1212bb687ec1
 - elements = 0x1fbbad30fd19 <FixedArray[3]> [PACKED_SMI_ELEMENTS (COW)]
 - length = 3
 - properties = 0x219eb0702241 <FixedArray[0]> {
    #length: 0x219eb0764ac9 <AccessorInfo> (const accessor descriptor)
 }
 - elements= 0x1fbbad30fd19 <FixedArray[3]> {
           0: 1
           1: 2
           2: 3
 }
[…]
```

「COW」は[コピーオンライト (copy-on-write)](https://en.wikipedia.org/wiki/Copy-on-write)を意味します。これは別の内部最適化です。今のところ心配する必要はありません。その話題はまた別の記事にて！

デバッグビルドで利用可能な他の便利なフラグは `--trace-elements-transitions` です。有効にすると、V8 が要素の種類遷移が発生するたびに通知するようになります。

```bash
$ cat my-script.js
const array = [1, 2, 3];
array[3] = 4.56;

$ out/x64.debug/d8 --trace-elements-transitions my-script.js
elements transition [PACKED_SMI_ELEMENTS -> PACKED_DOUBLE_ELEMENTS] in ~+34 at x.js:2 for 0x1df87228c911 <JSArray[3]> from 0x1df87228c889 <FixedArray[3]> to 0x1df87228c941 <FixedDoubleArray[22]>
```
