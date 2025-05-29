---
title: &apos;`Intl.ListFormat`&apos;
author: &apos;Mathias Bynens（[@mathias](https://twitter.com/mathias)）およびFrank Yung-Fong Tang&apos;
avatars:
  - &apos;mathias-bynens&apos;
  - &apos;frank-tang&apos;
date: 2018-12-18
tags:
  - Intl
  - Node.js 12
  - io19
description: &apos;Intl.ListFormat APIは、パフォーマンスを犠牲にすることなくリストのローカライズされたフォーマットを可能にします。&apos;
tweet: &apos;1074966915557351424&apos;
---
モダンなWebアプリケーションでは、動的なデータで構成されたリストがよく使用されます。例えば、写真ビューアアプリでは以下のような表示がされることがあります：

> この写真には**Ada、Edith、_および_Grace**が含まれます。

テキストベースのゲームでは、異なる種類のリストが用いられるかもしれません：

> あなたの超能力を選んでください：**不可視化、念動力、_または_共感力**。

各言語ごとにリストのフォーマットの慣例や単語が異なるため、ローカライズされたリストフォーマッタを実装するのは簡単ではありません。サポートしたいすべての言語の単語（上記の例では「and」や「or」など）のリストが必要なだけでなく、それらの言語における特定のフォーマットの慣例もすべてエンコードする必要があります。[Unicode CLDR](http://cldr.unicode.org/translation/lists)はそのデータを提供していますが、それをJavaScriptで使用するには、他のライブラリコードと一緒に埋め込んで配送する必要があります。このため、そのようなライブラリの場合、バンドルサイズが増加し、読み込み時間、解析/コンパイルコスト、メモリ使用量に悪影響を及ぼします。

<!--truncate-->
新しい`Intl.ListFormat` APIはその負担をJavaScriptエンジンに移し、ロケールデータを提供し、JavaScript開発者が直接利用できるようにします。`Intl.ListFormat`は、パフォーマンスを犠牲にすることなくリストのローカライズされたフォーマットを可能にします。

## 使用例

以下の例では、英語を使用して接続詞のためのリストフォーマッタを作成する方法を示しています：

```js
const lf = new Intl.ListFormat(&apos;en&apos;);
lf.format([&apos;Frank&apos;]);
// → &apos;Frank&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;]);
// → &apos;Frank and Christine&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;]);
// → &apos;Frank, Christine, and Flora&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;, &apos;Harrison&apos;]);
// → &apos;Frank, Christine, Flora, and Harrison&apos;
```

英語で「or」となる選択肢のフォーマットも、オプションの`options`パラメータを使用してサポートされています：

```js
const lf = new Intl.ListFormat(&apos;en&apos;, { type: &apos;disjunction&apos; });
lf.format([&apos;Frank&apos;]);
// → &apos;Frank&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;]);
// → &apos;Frank or Christine&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;]);
// → &apos;Frank, Christine, or Flora&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;, &apos;Harrison&apos;]);
// → &apos;Frank, Christine, Flora, or Harrison&apos;
```

別の言語（中国語、言語コード`zh`）を使用する例を以下に示します：

```js
const lf = new Intl.ListFormat(&apos;zh&apos;);
lf.format([&apos;永鋒&apos;]);
// → &apos;永鋒&apos;
lf.format([&apos;永鋒&apos;, &apos;新宇&apos;]);
// → &apos;永鋒和新宇&apos;
lf.format([&apos;永鋒&apos;, &apos;新宇&apos;, &apos;芳遠&apos;]);
// → &apos;永鋒、新宇和芳遠&apos;
lf.format([&apos;永鋒&apos;, &apos;新宇&apos;, &apos;芳遠&apos;, &apos;澤遠&apos;]);
// → &apos;永鋒、新宇、芳遠和澤遠&apos;
```

`options`パラメータを使用すると、より高度な利用が可能です。以下に、様々なオプションとその組み合わせ、およびそれらが[UTS#35](https://unicode.org/reports/tr35/tr35-general.html#ListPatterns)で定義されたリストパターンにどのように対応しているかの概要を示します：


| 種類                  | オプション                                   | 説明                                                                                     | 例                                 |
| --------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------- |
| 標準（または種類なし） | `{}` (デフォルト)                           | 任意のプレースホルダのための典型的な「and」リスト                                         | `&apos;January, February, and March&apos;` |
| または                | `{ type: &apos;disjunction&apos; }`                 | 任意のプレースホルダのための典型的な「or」リスト                                         | `&apos;January, February, or March&apos;`  |
| 単位                  | `{ type: &apos;unit&apos; }`                        | 単位向けの広いリスト                                                                     | `&apos;3 feet, 7 inches&apos;`             |
| unit-short            | `{ type: &apos;unit&apos;, style: &apos;short&apos; }`        | 短い形式の単位向けのリスト                                                               | `&apos;3 ft, 7 in&apos;`                   |
| unit-narrow           | `{ type: &apos;unit&apos;, style: &apos;narrow&apos; }`       | 画面スペースが非常に限られている場合の狭い形式の単位向けのリスト                         | `&apos;3′ 7″&apos;`                        |


多くの言語（英語など）では、これら多くのリスト間で違いがない可能性があります。一方、他の言語では、スペーシング、接続詞の長さや存在、あるいは区切り記号が異なることがあります。

## 結論

`Intl.ListFormat` APIが広く利用可能になるにつれて、ライブラリはハードコードされたCLDRデータベースへの依存を放棄し、ネイティブのリストフォーマット機能を採用して、ロードタイムのパフォーマンス、解析およびコンパイルタイムのパフォーマンス、実行時のパフォーマンス、メモリ使用量を向上させるでしょう。

## `Intl.ListFormat` サポート

<feature-support chrome="72 /blog/v8-release-72#intl.listformat"
                 firefox="いいえ"
                 safari="いいえ"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="いいえ"></feature-support>
