---
title: "BigInt：JavaScriptにおける任意精度整数"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-05-01
tags: 
  - ECMAScript
  - ES2020
  - io19
description: "BigIntはJavaScriptにおける新しい数値プリミティブで、任意精度の整数を表現できます。本記事ではいくつかの使用例を紹介し、JavaScriptのNumberと比較することでChrome 67における新しい機能について説明します。"
tweet: "990991035630206977"
---
`BigInt`はJavaScriptにおける新しい数値プリミティブで、任意精度の整数を表現できます。`BigInt`を使用すると、`Number`で安全な整数制限を超える大きな整数を安全に保存し操作することができます。本記事ではいくつかの使用例を紹介し、JavaScriptの`Number`と比較することでChrome 67における新機能を説明します。

<!--truncate-->
## 使用例

任意精度の整数は、JavaScriptに多くの新しい使用例をもたらします。

`BigInt`を使用すると、オーバーフローを防ぎながら整数演算を正確に行うことができます。このこと自体が無数の新しい可能性を生み出します。例えば、金融技術における大きな数値の数学的演算がよく使用されます。

[大きな整数ID](https://developer.twitter.com/en/docs/basics/twitter-ids)や[高精度のタイムスタンプ](https://github.com/nodejs/node/pull/20220)は、JavaScriptでは`Number`として安全に表現することができません。このことが[しばしば](https://github.com/stedolan/jq/issues/1399)、[現実のバグ](https://github.com/nodejs/node/issues/12115)を引き起こし、JavaScriptの開発者がそれらを文字列として表現する原因となります。`BigInt`を使用すれば、これらのデータを数値として表現することができます。

`BigInt`は最終的な`BigDecimal`実装の基礎となる可能性があります。これは小数精度で金額を表現し、それらの精度を落とさない演算（いわゆる`0.10 + 0.20 !== 0.30問題`）を行うのに役立つでしょう。

これまで、JavaScriptのアプリケーションはこれらの使用例において`BigInt`のような機能をエミュレートするユーザーランドライブラリに頼る必要がありました。`BigInt`が広く利用可能になると、これらのアプリケーションはランタイム依存性を削減し、ネイティブの`BigInt`を選ぶことができます。これにより、ロード時間、解析時間、コンパイル時間が削減されるだけでなく、実行時の性能も大幅に向上します。

![Chromeにおけるネイティブ`BigInt`実装が有名なユーザーランドライブラリよりも優れた性能を示します。](/_img/bigint/performance.svg)

## 現状: `Number`

JavaScriptにおける`Number`は[倍精度浮動小数点](https://en.wikipedia.org/wiki/Floating-point_arithmetic)として表現されます。このため、精度に限りがあります。`Number.MAX_SAFE_INTEGER`定数は安全にインクリメントできる最大の整数を示します。その値は`2**53-1`です。

```js
const max = Number.MAX_SAFE_INTEGER;
// → 9_007_199_254_740_991
```

:::note
**注意:** この大きな数値の数字を見やすくするため、グループ化してアンダースコアを区切り文字として使用しています。[数値リテラルセパレータ提案](/features/numeric-separators)は、通常のJavaScript数値リテラルでこれを可能にします。
:::

1回インクリメントすると期待通りの結果が得られます。

```js
max + 1;
// → 9_007_199_254_740_992 ✅
```

しかし、もう1回インクリメントすると、結果がもはやJavaScriptの`Number`として正確に表現することができなくなります。

```js
max + 2;
// → 9_007_199_254_740_992 ❌
```

`max + 1`と`max + 2`が同じ結果を生成することに注意してください。これにより、JavaScriptでこの特定の値が正確かどうかを判断する方法がなくなります。安全な整数範囲（`Number.MIN_SAFE_INTEGER`から`Number.MAX_SAFE_INTEGER`まで）外での整数計算は精度を失う可能性があります。この理由で、安全な範囲内の数値整数値のみを信頼することができます。

## 新たな革新: `BigInt`

`BigInt`はJavaScriptにおける新しい数値プリミティブで、[任意精度](https://en.wikipedia.org/wiki/Arbitrary-precision_arithmetic)の整数を表現することができます。`BigInt`を使用すると、`Number`の安全な整数制限を超える大きな整数を安全に保存し操作することができます。

`BigInt`を作成するには、任意の整数リテラルに`n`サフィックスを追加します。たとえば、`123`は`123n`になります。グローバル`BigInt(number)`関数を使用して、`Number`を`BigInt`に変換することもできます。言い換えれば、`BigInt(123) === 123n`です。これら2つの技術を使用して、以前の問題を解決しましょう。

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2n;
// → 9_007_199_254_740_993n ✅
```

ここにもう1つの例があります。2つの`Number`を掛け合わせてみましょう。

```js
1234567890123456789 * 123;
// → 151851850485185200000 ❌
```

最下位桁を確認すると、`9`と`3`があり、掛け算の結果は`7`で終わるはずです（`9 * 3 === 27`）。しかし、結果は0が並んで終わっています。それは正しくありません！代わりに`BigInt`を使用して試してみましょう。

```js
1234567890123456789n * 123n;
// → 151851850485185185047n ✅
```

今回は正しい結果が得られました。

`Number`の安全な整数の制限は`BigInt`には適用されません。そのため、`BigInt`を使用すると、精度を失う心配をせずに正確な整数演算を実行できます。

### 新しいプリミティブ

`BigInt`はJavaScript言語の新しいプリミティブです。そのため、`typeof`演算子を使用して検出できる独自の型を持っています:

```js
typeof 123;
// → 'number'
typeof 123n;
// → 'bigint'
```

`BigInt`が別の型であるため、`BigInt`は`Number`と厳密に等しくなることはありません。たとえば、`42n !== 42`です。`BigInt`を`Number`と比較する場合は、比較を行う前に一方の型を他方に変換するか、抽象的等価演算子（`==`）を使用してください:

```js
42n === BigInt(42);
// → true
42n == 42;
// → true
```

論理値に強制型変換された場合（たとえば、`if`、`&&`、`||`、または`Boolean(int)`を使用した場合）、`BigInt`は`Number`と同じロジックに従います。

```js
if (0n) {
  console.log('if');
} else {
  console.log('else');
}
// → 'else'がログ出力されます。なぜなら、`0n`は偽だからです。
```

### 演算子

`BigInt`は最も一般的な演算子をサポートします。二項演算子の`+`、`-`、`*`、および`**`は期待どおりに動作します。`/`と`%`も動作し、必要に応じてゼロに向かって丸められます。ビット演算`|`、`&`、`<<`、`>>`、および`^`は負の値に対して[2の補数表現](https://ja.wikipedia.org/wiki/2%E3%81%AE%E8%A3%9C%E6%95%B0)を仮定してビット演算を実行します。これは`Number`と同じです。

```js
(7 + 6 - 5) * 4 ** 3 / 2 % 3;
// → 1
(7n + 6n - 5n) * 4n ** 3n / 2n % 3n;
// → 1n
```

単項演算子`-`は負の`BigInt`値を表すために使用できます（例: `-42n`）。単項演算子`+`はサポートされていません。なぜなら、`+x`は常に`Number`を生成するか例外をスローするべきであると期待するasm.jsコードを崩壊させるためです。

注意点として、`BigInt`と`Number`の間で操作を混在させることは許可されていません。このルールは良いもので、暗黙の型変換によって情報が失われる可能性を防ぎます。以下の例を考えてみてください:

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2.5;
// → ?? 🤔
```

結果はどうなるべきでしょうか？良い答えはありません。`BigInt`は小数を表現できず、`Number`は安全な整数の範囲を超えた`BigInt`を表現できません。そのため、`BigInt`と`Number`の操作を混在させると`TypeError`例外がスローされます。

このルールの例外は、`===`、`<`、`>=` などの比較演算子です。これらは真偽値を返すため、精度を失うリスクはありません。

```js
1 + 1n;
// → TypeError
123 < 124n;
// → true
```

`BigInt`と`Number`は一般に混在しないため、既存のコードを`Number`から`BigInt`に“魔法のように”変換することを避けてください。どちらの分野で操作するかを決定し、その決定に固執してください。大きな整数に対して動作する新しいAPIに適しているのは`BigInt`です。安全な整数範囲内であることが確認されている整数値には依然として`Number`を使用するのが理にかなっています。

さらに注目すべき点として、[符号なし右シフト演算子`>>>`](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Unsigned_right_shift)は`BigInt`には意味がありません。なぜなら、`BigInt`は常に符号付きだからです。このため、`>>>`は`BigInt`では動作しません。

### API

いくつかの新しい`BigInt`専用のAPIが利用可能です。

グローバル`BigInt`コンストラクタは`Number`コンストラクタに似ています。それは引数を`BigInt`に変換します（前述のとおり）。変換が失敗すると、`SyntaxError`または`RangeError`例外がスローされます。

```js
BigInt(123);
// → 123n
BigInt(1.5);
// → RangeError
BigInt('1.5');
// → SyntaxError
```

最初の例は数値リテラルを`BigInt()`に渡しています。これは悪い慣習です。なぜなら、`Number`は精度を失う可能性があり、`BigInt`への変換が行われる前にすでに精度を失っている可能性があるからです:

```js
BigInt(123456789123456789);
// → 123456789123456784n ❌
```

このため、`BigInt`リテラル表記（`n`サフィックス付き）を使用するか、`BigInt()`に文字列（`Number`ではありません！）を渡すことをお勧めします:

```js
123456789123456789n;
// → 123456789123456789n ✅
BigInt('123456789123456789');
// → 123456789123456789n ✅
```

2つのライブラリ関数により、`BigInt`値を特定のビット数に制限された符号付きまたは符号なし整数としてラップすることができます。`BigInt.asIntN(width, value)`は`BigInt`値を`幅`桁の2進符号付き整数にラップし、`BigInt.asUintN(width, value)`は`BigInt`値を`幅`桁の2進符号なし整数にラップします。たとえば、64ビット算術を行う場合、これらのAPIを使用して適切な範囲内に収めることができます:

```js
// 符号付き64ビット整数として表現可能な
// 最高のBigInt値。
const max = 2n ** (64n - 1n) - 1n;
BigInt.asIntN(64, max);
// → 9223372036854775807n
BigInt.asIntN(64, max + 1n);
// → -9223372036854775808n
//   ^ オーバーフローによって負になる
```

`BigInt`値が64ビット整数範囲（つまり絶対数値のための63ビット + 符号のための1ビット）を超えるとすぐにオーバーフローが発生することに注意してください。

`BigInt`により、他のプログラミング言語で一般的に使用される64ビット符号付きおよび符号なし整数を正確に表現することが可能になります。新しい型付き配列のフレーバーである`BigInt64Array`と`BigUint64Array`により、そのような値のリストを効率的に表現し操作することが簡単になります。

```js
const view = new BigInt64Array(4);
// → [0n, 0n, 0n, 0n]
view.length;
// → 4
view[0];
// → 0n
view[0] = 42n;
view[0];
// → 42n
```

`BigInt64Array`のフレーバーは、その値が符号付き64ビットの範囲内にとどまることを保証します。

```js
// 符号付き64ビット整数として表現可能な最大の`BigInt`値。
const max = 2n ** (64n - 1n) - 1n;
view[0] = max;
view[0];
// → 9_223_372_036_854_775_807n
view[0] = max + 1n;
view[0];
// → -9_223_372_036_854_775_808n
//   ^ オーバーフローにより負の値となる
```

`BigUint64Array`のフレーバーは、符号なし64ビットの範囲を使用して同じことを行います。

## `BigInt`のポリフィルとトランスパイリング

現時点では、`BigInt`はChromeでのみサポートされています。他のブラウザも実装に向けて積極的に取り組んでいます。しかし、ブラウザ互換性を犠牲にせずに`BigInt`の機能を*今日*使いたい場合はどうすればよいでしょうか？その答えは少なくとも興味深いものです。

他のほとんどのモダンなJavaScript機能とは異なり、`BigInt`をES5にトランスパイルすることは合理的に不可能です。

`BigInt`の提案には[演算子の挙動を変更する](#operators)（例えば`+`、`>=`など）ことが含まれます。この変更を直接ポリフィルすることは不可能であり、また、`BigInt`コードをBabelなどのツールを使用してフォールバックコードにトランスパイルすることもほとんどの場合不可能です。その理由は、このようなトランスパイルはプログラム内の*すべての演算子*を入力の型チェックを行う関数への呼び出しに置き換えなければならず、これによりランタイムのパフォーマンスが許容できないほど低下するためです。さらに、トランスパイルされたバンドルのファイルサイズが大幅に増加し、ダウンロード、解析、コンパイル時間に悪影響を与えるでしょう。

現在は、より実行可能で未来志向の解決策として[JSBIライブラリ](https://github.com/GoogleChromeLabs/jsbi#why)を使用してコードを書くことです。JSBIはV8およびChromeの`BigInt`実装をJavaScriptに移植したもので、設計上、ネイティブの`BigInt`機能と完全に同じように動作します。その違いは、構文に依存する代わりに[API](https://github.com/GoogleChromeLabs/jsbi#how)を公開することです。

```js
import JSBI from './jsbi.mjs';

const max = JSBI.BigInt(Number.MAX_SAFE_INTEGER);
const two = JSBI.BigInt('2');
const result = JSBI.add(max, two);
console.log(result.toString());
// → '9007199254740993'
```

関心のあるすべてのブラウザがネイティブの`BigInt`をサポートするようになったら、[`babel-plugin-transform-jsbi-to-bigint`を使用してコードをネイティブの`BigInt`コードにトランスパイル](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint)し、JSBI依存を削除できます。例えば、上記の例は次のようにトランスパイルされます。

```js
const max = BigInt(Number.MAX_SAFE_INTEGER);
const two = 2n;
const result = max + two;
console.log(result);
// → '9007199254740993'
```

## さらなる学び

`BigInt`が舞台裏でどのように動作するか（例えば、メモリ内での表現や演算の方法など）に興味がある場合は、[実装の詳細を含むV8ブログ記事をご覧ください](/blog/bigint)。

## `BigInt`サポート

<feature-support chrome="67 /blog/bigint"
                 firefox="68 https://wingolog.org/archives/2019/05/23/bigint-shipping-in-firefox"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes #polyfilling-transpiling"></feature-support>
