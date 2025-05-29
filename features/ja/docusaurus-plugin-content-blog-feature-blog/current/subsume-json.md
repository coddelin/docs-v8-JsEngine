---
title: &apos;JSONをECMAScriptの部分集合として統合する（Subsume JSON a.k.a. JSON ⊂ ECMAScript）&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-08-14
tags:
  - ES2019
description: &apos;JSONは現在、ECMAScriptの構文的部分集合になりました。&apos;
tweet: &apos;1161649929904885762&apos;
---
[_JSON ⊂ ECMAScript_ 提案](https://github.com/tc39/proposal-json-superset)により、JSONはECMAScriptの構文的部分集合となりました。これがすでにそうでなかったことに驚いたなら、あなたは一人ではありません！

## 古いES2018の挙動

ES2018では、ECMAScriptの文字列リテラルにはエスケープされていないU+2028 LINE SEPARATORおよびU+2029 PARAGRAPH SEPARATOR文字を含めることができませんでした。これらはそのコンテキストでも行終端子と見なされるためです：

```js
// 未エスケープのU+2028文字を含む文字列。
const LS = &apos; &apos;;
// → ES2018: SyntaxError

// `eval`によって生成された、未エスケープのU+2029文字を含む文字列:
const PS = eval(&apos;"\u2029"&apos;);
// → ES2018: SyntaxError
```

これは問題です。なぜなら、JSON文字列にはこれらの文字を含めることができるからです。その結果、開発者はこれらの文字を処理するために、ECMAScriptプログラム内に有効なJSONを埋め込む際に特別な後処理ロジックを実装する必要がありました。このようなロジックがなければ、コードに微妙なバグが発生したり、[セキュリティ問題](#security)が生じる可能性さえありました！

<!--truncate-->
## 新しい挙動

ES2019では、文字列リテラルに未エスケープのU+2028とU+2029文字を含めることができるようになり、これによりECMAScriptとJSONの間の不一致が解消されました。

```js
// 未エスケープのU+2028文字を含む文字列。
const LS = &apos; &apos;;
// → ES2018: SyntaxError
// → ES2019: 例外なし

// `eval`によって生成された、未エスケープのU+2029文字を含む文字列:
const PS = eval(&apos;"\u2029"&apos;);
// → ES2018: SyntaxError
// → ES2019: 例外なし
```

この小さな改善により、開発者のメンタルモデルが大幅に簡素化され（覚えるべきエッジケースが1つ減る！）、有効なJSONをECMAScriptプログラムに埋め込む際に必要な後処理ロジックが削減されます。

## JavaScriptプログラムにJSONを埋め込む

この提案の結果として、`JSON.stringify`は有効なECMAScriptの文字列リテラル、オブジェクトリテラル、および配列リテラルを生成するために使用できるようになりました。また、別の[_形式が正しい`JSON.stringify`_ 提案](/features/well-formed-json-stringify)により、これらのリテラルはUTF-8やその他のエンコーディングで安全に表現できるようになります（これにより、ディスク上のファイルに書き込む際に役立ちます）。これは、動的にJavaScriptソースコードを作成してディスクに書き込むなどのメタプログラミングのユースケースで非常に便利です。

以下は、与えられたデータオブジェクトを埋め込む有効なJavaScriptプログラムを、JSON文法がECMAScriptの部分集合であることを利用して作成する例です：

```js
// 一部のデータを表すJavaScriptオブジェクト（または配列、文字列）。
const data = {
  LineTerminators: &apos;\n\r  &apos;,
  // 注: 文字列には4文字が含まれています: &apos;\n\r\u2028\u2029&apos;.
};

// データをJSON文字列化した形式に変換します。JSON ⊂
// ECMAScriptにより、`JSON.stringify`の出力は構文的に有効な
// ECMAScriptリテラルであることが保証されています：
const jsObjectLiteral = JSON.stringify(data);

// データをオブジェクトリテラルとして埋め込む有効なECMAScriptプログラムを作成します。
const program = `const data = ${ jsObjectLiteral };`;
// → &apos;const data = {"LineTerminators":"…"};&apos;
// （対象がインライン< script >の場合は追加のエスケープが必要です。）

// ECMAScriptプログラムを含むファイルをディスクに書き込みます。
saveToDisk(filePath, program);
```

上記のスクリプトは以下のコードを生成し、これは同等のオブジェクトとして評価されます：

```js
const data = {"LineTerminators":"\n\r  "};
```

## `JSON.parse`を使用してJavaScriptプログラムにJSONを埋め込む

[_JSONのコスト_](/blog/cost-of-javascript-2019#json)に説明されているように、以下のようにJavaScriptオブジェクトリテラルとしてデータをインライン化する代わりに：

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…データをJSON文字列化した形式で表現し、それをランタイムでJSONパースすることで、大規模なオブジェクト（10kB以上）の場合のパフォーマンス向上が見込まれます：

```js
const data = JSON.parse(&apos;{"foo":42,"bar":1337}&apos;); // 🚀
```

以下は実装例です：

```js
// 一部のデータを表すJavaScriptオブジェクト（または配列、文字列）。
const data = {
  LineTerminators: &apos;\n\r  &apos;,
  // 注: 文字列には4文字が含まれています: &apos;\n\r\u2028\u2029&apos;.
};

// データをJSON文字列化した形式に変換します。
const json = JSON.stringify(data);

// ここで、データをJavaScript文字列リテラルとしてスクリプト本体に挿入したいのですが
// https://v8.dev/blog/cost-of-javascript-2019#json を参照しながら、データ内の特別な文字 `"` などをエスケープします。
// JSON ⊂ ECMAScriptのおかげで、`JSON.stringify`の出力は
// 構文的に有効なECMAScriptリテラルであることが保証されています：
const jsStringLiteral = JSON.stringify(json);
// JavaScript文字列リテラルをJSONを表現する`JSON.parse`呼び出し内に埋め込んだ、有効な
// ECMAScriptプログラムを作成します。
const program = `const data = JSON.parse(${ jsStringLiteral });`;
// → &apos;const data = JSON.parse("…");&apos;
// （ターゲットがインラインの<script>の場合は追加のエスケープが必要です。）

// ECMAScriptプログラムをファイルに書き込む。
saveToDisk(filePath, program);
```

上記のスクリプトは以下のコードを生成し、同等のオブジェクトを評価します:

```js
const data = JSON.parse("{\"LineTerminators\":\"\\n\\r  \"}");
```

[Googleによる`JSON.parse`とJavaScriptオブジェクトリテラルの比較ベンチマーク](https://github.com/GoogleChromeLabs/json-parse-benchmark)は、ビルドステップでこのテクニックを活用しています。Chrome DevToolsの“コピーとしてJS”機能は、[類似の技術を採用することで大幅に簡素化](https://chromium-review.googlesource.com/c/chromium/src/+/1464719/9/third_party/blink/renderer/devtools/front_end/elements/DOMPath.js)されました。

## セキュリティに関する注意

JSON ⊂ ECMAScriptは、特に文字列リテラルの場合のJSONとECMAScript間の不一致を減少させます。文字列リテラルはオブジェクトや配列などの他のJSON対応データ構造にも出現する可能性があるため、上記のコード例が示すようにこれらの場合も対処します。

しかし、U+2028とU+2029はECMAScript文法の他には改行文字として扱われ続けます。これは、JSONをJavaScriptプログラムに注入する際に安全でない場合があることを意味します。次の例を考えてみてください。サーバがあるユーザー提供コンテンツを`JSON.stringify()`で処理した後、HTMLレスポンスに注入する場合です:

```ejs
<script>
  // デバッグ情報:
  // User-Agent: <%= JSON.stringify(ua) %>
</script>
```

`JSON.stringify`の結果がスクリプト内の一行コメントに注入されていることに注目してください。

上記の例のように使用される場合、`JSON.stringify()`は1行を返すことが保証されています。ただし、「1行」とは何を意味するかが[JSONとECMAScriptの間で異なる](https://speakerdeck.com/mathiasbynens/hacking-with-unicode?slide=136)のが問題です。もし`ua`にエスケープされていないU+2028やU+2029文字が含まれている場合、一行コメントから抜け出し、`ua`の残りをJavaScriptソースコードとして実行してしまいます:

```html
<script>
  // デバッグ情報:
  // User-Agent: "ユーザー提供文字列<U+2028>  alert(&apos;XSS&apos;);//"
</script>
<!-- …は次と同じ意味: -->
<script>
  // デバッグ情報:
  // User-Agent: "ユーザー提供文字列
  alert(&apos;XSS&apos;);//"
</script>
```

:::note
**注意:** 上記の例では、生の未エスケープU+2028文字は`<U+2028>`として表現され、理解しやすくしています。
:::

JSON ⊂ ECMAScriptはここでは役立ちません。これは文字列リテラルにのみ影響するためであり、この場合 `JSON.stringify` の出力が直接JavaScript文字列リテラルを生成しない位置に注入されています。

これらの2つの文字に特別な後処理が導入されない限り、上記のコードスニペットはクロスサイトスクリプティング（XSS）の脆弱性を提示します！

:::note
**注意:** ユーザー管理下にある入力を後処理し、コンテキストに応じて特殊文字列を逃さないことが非常に重要です。この特定のケースでは、`<script>`タグ内に注入しているので、[ `</script`, `<script`, そして `<!-​-` をもエスケープ](https://mathiasbynens.be/notes/etago#recommendations)する必要があります。
:::

## JSON ⊂ ECMAScript のサポート

<feature-support chrome="66 /blog/v8-release-66#json-ecmascript"
                 firefox="yes"
                 safari="yes"
                 nodejs="10"
                 babel="yes https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-json-strings"></feature-support>
