---
title: "RegExp `v` フラグとセット表記および文字列のプロパティ"
author: "Mark Davis ([@mark_e_davis](https://twitter.com/mark_e_davis)), Markus Scherer, Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mark-davis"
  - "markus-scherer"
  - "mathias-bynens"
date: 2022-06-27
tags:
  - ECMAScript
description: "新しい RegExp `v` フラグは `unicodeSets` モードを有効化し、Unicode の文字列のプロパティ、セット表記、改良された大文字小文字無視マッチングを含む拡張文字クラスのサポートを解放します。"
tweet: "1541419838513594368"
---
JavaScript は ECMAScript 3 (1999) 以来、正規表現をサポートしています。16 年後、ES2015 は [Unicode モード (`u` フラグ)](https://mathiasbynens.be/notes/es6-unicode-regex)、[スティッキーモード (`y` フラグ)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky#description)、および [`RegExp.prototype.flags` エッター](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/flags) を導入しました。そのさらに 3 年後、ES2018 は [`dotAll` モード (`s` フラグ)](https://mathiasbynens.be/notes/es-regexp-proposals#dotAll)、[後読みアサーション](https://mathiasbynens.be/notes/es-regexp-proposals#lookbehinds)、[名前付きキャプチャグループ](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups)、および [Unicode 文字プロパティエスケープ](https://mathiasbynens.be/notes/es-unicode-property-escapes) を導入しました。そして ES2020 では、[`String.prototype.matchAll`](https://v8.dev/features/string-matchall) により正規表現の操作がさらに簡単になりました。JavaScript の正規表現は大きく進化しており、現在も進化中です。

<!--truncate-->
その最新の例が、[新しい `unicodeSets` モード（`v` フラグで有効化）](https://github.com/tc39/proposal-regexp-v-flag) です。この新しいモードにより、以下の機能を含む _拡張文字クラス_ のサポートが解放されます：

- [文字列の Unicode プロパティ](/features/regexp-v-flag#unicode-properties-of-strings)
- [セット表記 + 文字列リテラル構文](/features/regexp-v-flag#set-notation)
- [改良された大文字小文字無視マッチング](/features/regexp-v-flag#ignoreCase)

この記事ではそれぞれについて詳しく説明します。しかしまず最初に — 新しいフラグの使い方はこちらです：

```js
const re = /…/v;
```

`v` フラグは、既存の正規表現フラグと組み合わせて使用することができますが、1 つ例外があります。`v` フラグは `u` フラグの良い部分すべてを有効化しますが、追加の機能と改良も提供します — 一部は `u` フラグとの互換性がありません。重要なのは、`v` は `u` と補完的なモードではなく、完全に独立したモードであるため、`v` と `u` フラグを同時に使用することはできません。同じ正規表現で両方のフラグを使用するとエラーになります。有効な選択肢は次のいずれかです：`u` を使用する、`v` を使用する、または `u` も `v` も使用しない。しかし、`v` は最も機能が充実しているオプションであるため、選択は簡単です...

それでは、新しい機能について掘り下げてみましょう！

## 文字列の Unicode プロパティ

Unicode 標準は、各記号にさまざまなプロパティとプロパティ値を割り当てています。たとえば、ギリシャ文字に使用される記号のセットを取得するには、プロパティ値 `Script_Extensions` に `Greek` を含む記号を Unicode データベースで検索します。

ES2018 の Unicode 文字プロパティエスケープにより、ECMAScript の正規表現内でこれらの Unicode 文字プロパティにネイティブにアクセスできるようになりました。たとえば、パターン `\p{Script_Extensions=Greek}` はギリシャ文字に使われるすべての記号に一致します：

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → true
```

定義によれば、Unicode 文字プロパティはコードポイントの集合に展開されるため、それらが個別に一致するコードポイントを含む文字クラスとしてトランスパイルすることができます。たとえば、`\p{ASCII_Hex_Digit}` は `[0-9A-Fa-f]` と同等で、1 回にマッチするのはシングル Unicode 文字/コードポイントだけです。一部の状況ではこれでは不十分です：

```js
// Unicode は “Emoji” という名前の文字プロパティを定義しています。
const re = /^\p{Emoji}$/u;

// 1 つのコードポイントだけで構成される絵文字にマッチ：
re.test('⚽'); // '\u26BD'
// → true ✅

// 複数のコードポイントで構成される絵文字にマッチ：
re.test('👨🏾‍⚕️'); // '\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F'
// → false ❌
```

上記の例では、正規表現が 👨🏾‍⚕️ 絵文字に一致しないのは、それが複数のコードポイントから構成されており、`Emoji` が Unicode の _文字_ プロパティであるためです。

幸いなことに、Unicode Standardではいくつかの[文字列プロパティ](https://www.unicode.org/reports/tr18/#domain_of_properties)も定義されています。これらのプロパティは、1つ以上のコードポイントを含む文字列のセットに拡張されます。正規表現では、文字列プロパティは選択肢のセットに変換されます。これを説明するために、文字列`'a'`、`'b'`、`'c'`、`'W'`、`'xy'`、および`'xyz'`に適用されるUnicodeプロパティを想像してください。このプロパティは次の正規表現パターン（選択肢を使用）に変換されます：`xyz|xy|a|b|c|W`または`xyz|xy|[a-cW]`。(`'xy'`のような接頭辞が`'xyz'`のようなより長い文字列を隠さないように、最も長い文字列を先に書きます)。現在のUnicodeプロパティエスケープとは異なり、このパターンは複数文字の文字列にマッチすることができます。ここに文字列プロパティを使用した例があります：

```js
const re = /^\p{RGI_Emoji}$/v;

// 1つのコードポイントのみで構成される絵文字にマッチ：
re.test('⚽'); // '\u26BD'
// → true ✅

// 複数のコードポイントで構成される絵文字にマッチ：
re.test('👨🏾‍⚕️'); // '\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F'
// → true ✅
```

このコードスニペットは、Unicodeで「一般的な交換を推奨するすべての有効な絵文字（文字およびシーケンス）のサブセット」として定義されている、`RGI_Emoji`という文字列プロパティを参照しています。これを用いることで、コードポイントが何個含まれていても絵文字にマッチすることが可能になります。

`v`フラグを使うことで、以下のUnicode文字列プロパティがすぐにサポートされるようになります：

- `Basic_Emoji`
- `Emoji_Keycap_Sequence`
- `RGI_Emoji_Modifier_Sequence`
- `RGI_Emoji_Flag_Sequence`
- `RGI_Emoji_Tag_Sequence`
- `RGI_Emoji_ZWJ_Sequence`
- `RGI_Emoji`

今後、Unicode Standardで追加の文字列プロパティが定義されると、このサポートプロパティのリストは拡張される可能性があります。現在のすべての文字列プロパティは絵文字関連ですが、将来的にはまったく異なる用途のためのプロパティになるかもしれません。

:::note
**注:** 現在、文字列プロパティは新しい`v`フラグで制御されていますが、[今後は`u`モードでも使用可能にする予定です](https://github.com/tc39/proposal-regexp-v-flag/issues/49)。
:::

## セット表記 + 文字列リテラル構文

`\p{…}`エスケープ（文字プロパティでも新しい文字列プロパティでも）を使用するとき、差分/減算や交差を実行できると便利な場合があります。`v`フラグを使用すると、文字クラスをネストできるようになり、それらのセット操作を隣接する先読みまたは先退きアサーションや、長い文字クラスではなくその中で実行できるようになります。

### `--`を使用した差分/減算

構文`A--B`を使用すると、「`A`に含まれるが`B`には含まれない」文字列、つまり差分/減算にマッチすることができます。

例えば、ギリシャ文字全体にマッチさせたいけれど、文字`π`は除外したい場合どうしますか？ セット表記を使えば、簡単に解決できます：

```js
/[\p{Script_Extensions=Greek}--π]/v.test('π'); // → false
```

`--`を使うことで差分/減算を表現でき、正規表現エンジンが面倒な処理を行いつつ、コードを読みやすくし、保守性を維持します。

単一文字ではなく、文字集合`α`、`β`、`γ`を引く場合でも問題ありません。ネストされた文字クラスを使用して、その内容を差し引くことができます：

```js
/[\p{Script_Extensions=Greek}--[αβγ]]/v.test('α'); // → false
/[\p{Script_Extensions=Greek}--[α-γ]]/v.test('β'); // → false
```

別の例として、非ASCII数字にマッチする場合があります（後でそれらをASCII数字に変換するためなどの用途）：

```js
/[\p{Decimal_Number}--[0-9]]/v.test('𑜹'); // → true
/[\p{Decimal_Number}--[0-9]]/v.test('4'); // → false
```

セット表記は新しい文字列プロパティでも使用できます：

```js
// 注: 🏴は7つのコードポイントから構成されます。

/^\p{RGI_Emoji_Tag_Sequence}$/v.test('🏴'); // → true
/^[\p{RGI_Emoji_Tag_Sequence}--\q{🏴}]$/v.test('🏴'); // → false
```

この例では、スコットランドの国旗を除くすべてのRGI絵文字タグシーケンスにマッチしています。`\q{…}`の使用に注目してください。これは文字クラス内での文字列リテラルのための新しい構文です。例えば、`\q{a|bc|def}`は文字列`a`、`bc`、`def`にマッチします。`\q{…}`がなければ、複数文字列の文字列を引くことはできません。

### `&&`を使用した交差

構文`A&&B`は、「`A`にも`B`にも含まれる」文字列、つまり交差にマッチします。これにより、例えばギリシャ文字にマッチさせることができます：

```js
const re = /[\p{Script_Extensions=Greek}&&\p{Letter}]/v;
// U+03C0 ギリシャ小文字のパイ
re.test('π'); // → true
// U+1018A ギリシャゼロ記号
re.test('𐆊'); // → false
```

すべてのASCII空白文字にマッチする場合：

```js
const re = /[\p{White_Space}&&\p{ASCII}]/v;
re.test('\n'); // → true
re.test('\u2028'); // → false
```

または、すべてのモンゴル数字にマッチする場合：

```js
const re = /[\p{Script_Extensions=Mongolian}&&\p{Number}]/v;
// U+1817 モンゴル数字の7
re.test('᠗'); // → true
// U+1834 モンゴル文字チャ
re.test('ᠴ'); // → false
```

### 和集合

「`A`に含まれる、または`B`に含まれる」文字列にマッチする場合、以前は単一文字列に対して文字クラス`[\p{Letter}\p{Number}]`を使用して可能でした。`v`フラグを使用することで、この機能がさらに強力になり、文字列プロパティや文字列リテラルとも組み合わせることが可能になります：

```js
const re = /^[\p{Emoji_Keycap_Sequence}\p{ASCII}\q{🇧🇪|abc}xyz0-9]$/v;

re.test('4️⃣'); // → true
re.test('_'); // → true
re.test('🇧🇪'); // → true
re.test('abc'); // → true
re.test('x'); // → true
re.test('4'); // → true
```

このパターンの文字クラスは次を組み合わせています：

- 文字列プロパティ（`\p{Emoji_Keycap_Sequence}`）
- 文字プロパティ（`\p{ASCII}`）
- 複数コードポイント文字列`🇧🇪`および`abc`の文字列リテラル構文
- 孤立した文字`x`、`y`、`z`のための従来の文字クラス構文
- 文字範囲 `0` から `9` の古典的な文字クラス構文

別の例として、ISOの2文字コード(`RGI_Emoji_Flag_Sequence`)または特別なタグシーケンス(`RGI_Emoji_Tag_Sequence`)としてエンコードされたかどうかに関係なく、すべての一般的な旗の絵文字をマッチングする方法:

```js
const reFlag = /[\p{RGI_Emoji_Flag_Sequence}\p{RGI_Emoji_Tag_Sequence}]/v;
// 2つのコードポイントで構成される旗のシーケンス（ベルギーの旗）:
reFlag.test('🇧🇪'); // → true
// 7つのコードポイントで構成されるタグシーケンス（イングランドの旗）:
reFlag.test('🏴'); // → true
// 2つのコードポイントで構成される旗のシーケンス（スイスの旗）:
reFlag.test('🇨🇭'); // → true
// 7つのコードポイントで構成されるタグシーケンス（ウェールズの旗）:
reFlag.test('🏴'); // → true
```

## 改善された大文字小文字を無視したマッチング

ES2015の`u`フラグには[混乱を招く大文字小文字を無視したマッチングの振る舞い](https://github.com/tc39/proposal-regexp-v-flag/issues/30)があります。次の2つの正規表現を考えてみます:

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;
```

最初のパターンはすべての小文字の文字にマッチします。2番目のパターンは`\P`を使用して小文字以外のすべての文字にマッチし、それを否定文字クラス（`[^…]`）でラップしています。どちらの正規表現も`i`フラグ（ignoreCase）を設定して大文字小文字を無視するようになっています。

直感的には、両方の正規表現が同じように動作すると期待するかもしれません。実際には、それらの振る舞いは大きく異なります:

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;

const string = 'aAbBcC4#';

string.replaceAll(re1, 'X');
// → 'XXXXXX4#'

string.replaceAll(re2, 'X');
// → 'aAbBcC4#''
```

新しい`v`フラグでは、このような驚きの少ない振る舞いになります。`u`フラグの代わりに`v`フラグを使用すると、両方のパターンが同じように振る舞います:

```js
const re1 = /\p{Lowercase_Letter}/giv;
const re2 = /[^\P{Lowercase_Letter}]/giv;

const string = 'aAbBcC4#';

string.replaceAll(re1, 'X');
// → 'XXXXXX4#'

string.replaceAll(re2, 'X');
// → 'XXXXXX4#'
```

より一般的に言えば、`v`フラグは`[^\p{X}]` ≍ `[\P{X}]` ≍ `\P{X}` そして `[^\P{X}]` ≍ `[\p{X}]` ≍ `\p{X}`にします。ただし、`i` フラグが設定されているかどうかに関係なく。

## 詳しい読解

[提案リポジトリ](https://github.com/tc39/proposal-regexp-v-flag)は、これらの機能やその設計決定についての詳細と背景を含んでいます。

これらのJavaScript機能の作業の一環として、ECMAScriptの仕様変更を提案するだけでなく、文字列のプロパティに関する定義を[Unicode UTS#18](https://unicode.org/reports/tr18/#Notation_for_Properties_of_Strings)にアップストリーム化しました。他のプログラミング言語が同様の機能を統一的に実装できるようにするためです。また、これらの新しい機能を`pattern`属性で有効にする目的で[HTML Standardの変更を提案中](https://github.com/whatwg/html/pull/7908)です。

## RegExp `v` フラグ サポート

V8 v11.0 (Chrome 110) は、この新しい機能の実験的サポートを `--harmony-regexp-unicode-sets` フラグを介して提供します。V8 v12.0 (Chrome 112)では新機能がデフォルトで有効になっています。Babelも`v`フラグのトランスパイルをサポートしています — [この記事の例をBabel REPLで試してください](https://babeljs.io/repl#?code_lz=MYewdgzgLgBATgUxgXhgegNoYIYFoBmAugGTEbC4AWhhaAbgNwBQTaaMAKpQJYQy8xKAVwDmSQCgEMKHACeMIWFABbJQjBRuYEfygBCVmlCRYCJSABW3FOgA6ABwDeAJQDiASQD6AUTOWAvvTMQA&presets=stage-3)! 以下のサポートテーブルへのリンクには、最新の情報を得るためのトラッキングイシューが含まれています。

<feature-support chrome="112 https://bugs.chromium.org/p/v8/issues/detail?id=11935"
                 firefox="116 https://bugzilla.mozilla.org/show_bug.cgi?id=regexp-v-flag"
                 safari="17 https://bugs.webkit.org/show_bug.cgi?id=regexp-v-flag"
                 nodejs="20"
                 babel="7.17.0 https://babeljs.io/blog/2022/02/02/7.17.0"></feature-support>
