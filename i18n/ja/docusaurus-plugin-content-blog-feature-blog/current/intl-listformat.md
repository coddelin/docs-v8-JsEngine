---
title: '`Intl.ListFormat`'
author: 'Mathias Bynens（[@mathias](https://twitter.com/mathias)）およびFrank Yung-Fong Tang'
avatars:
  - 'mathias-bynens'
  - 'frank-tang'
date: 2018-12-18
tags:
  - Intl
  - Node.js 12
  - io19
description: 'Intl.ListFormat APIは、パフォーマンスを犠牲にすることなくリストのローカライズされたフォーマットを可能にします。'
tweet: '1074966915557351424'
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
const lf = new Intl.ListFormat('en');
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank and Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine, and Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora, and Harrison'
```

英語で「or」となる選択肢のフォーマットも、オプションの`options`パラメータを使用してサポートされています：

```js
const lf = new Intl.ListFormat('en', { type: 'disjunction' });
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank or Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine, or Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora, or Harrison'
```

別の言語（中国語、言語コード`zh`）を使用する例を以下に示します：

```js
const lf = new Intl.ListFormat('zh');
lf.format(['永鋒']);
// → '永鋒'
lf.format(['永鋒', '新宇']);
// → '永鋒和新宇'
lf.format(['永鋒', '新宇', '芳遠']);
// → '永鋒、新宇和芳遠'
lf.format(['永鋒', '新宇', '芳遠', '澤遠']);
// → '永鋒、新宇、芳遠和澤遠'
```

`options`パラメータを使用すると、より高度な利用が可能です。以下に、様々なオプションとその組み合わせ、およびそれらが[UTS#35](https://unicode.org/reports/tr35/tr35-general.html#ListPatterns)で定義されたリストパターンにどのように対応しているかの概要を示します：


| 種類                  | オプション                                   | 説明                                                                                     | 例                                 |
| --------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------- |
| 標準（または種類なし） | `{}` (デフォルト)                           | 任意のプレースホルダのための典型的な「and」リスト                                         | `'January, February, and March'` |
| または                | `{ type: 'disjunction' }`                 | 任意のプレースホルダのための典型的な「or」リスト                                         | `'January, February, or March'`  |
| 単位                  | `{ type: 'unit' }`                        | 単位向けの広いリスト                                                                     | `'3 feet, 7 inches'`             |
| unit-short            | `{ type: 'unit', style: 'short' }`        | 短い形式の単位向けのリスト                                                               | `'3 ft, 7 in'`                   |
| unit-narrow           | `{ type: 'unit', style: 'narrow' }`       | 画面スペースが非常に限られている場合の狭い形式の単位向けのリスト                         | `'3′ 7″'`                        |


多くの言語（英語など）では、これら多くのリスト間で違いがない可能性があります。一方、他の言語では、スペーシング、接続詞の長さや存在、あるいは区切り記号が異なることがあります。

## 結論

`Intl.ListFormat` APIが広く利用可能になるにつれて、ライブラリはハードコードされたCLDRデータベースへの依存を放棄し、ネイティブのリストフォーマット機能を採用して、ロードタイムのパフォーマンス、解析およびコンパイルタイムのパフォーマンス、実行時のパフォーマンス、メモリ使用量を向上させるでしょう。

## `Intl.ListFormat` サポート

<feature-support chrome="72 /blog/v8-release-72#intl.listformat"
                 firefox="いいえ"
                 safari="いいえ"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="いいえ"></feature-support>
