---
title: "`Intl.DisplayNames`"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu)) と Frank Yung-Fong Tang"
avatars: 
  - "shu-yu-guo"
  - "frank-tang"
date: 2020-02-13
tags: 
  - Intl
  - Node.js 14
description: "Intl.DisplayNames APIは、言語、地域、スクリプト、通貨のローカライズされた名前を提供します。"
tweet: "1232333889005334529"
---
全世界のユーザーに届くWebアプリケーションは、多くの異なる言語で言語名、地域名、スクリプト名、通貨名を表示する必要があります。それらの名称の翻訳にはデータが必要であり、そのデータは[Unicode CLDR](http://cldr.unicode.org/translation/)で利用可能です。これらのデータをアプリケーションの一部としてパッケージングすることは開発者の時間を費やすことにつながります。ユーザーは言語名や地域名の翻訳において一貫性を好む傾向があり、世界の地政学的動向に合わせてそのデータを更新するには、絶え間ないメンテナンスが必要です。

<!--truncate-->
幸いなことに、ほとんどのJavaScriptランタイムは既にその翻訳データを提供し、最新状態を維持しています。新しい`Intl.DisplayNames` APIはJavaScript開発者がその翻訳に直接アクセスできるようにし、ローカライズされた名前を簡単に表示することができます。

## 使用例

[ISO-3166 2文字の国コード](https://www.iso.org/iso-3166-country-codes.html)を使用して英語で地域名を取得するために`Intl.DisplayNames`オブジェクトを作成する例を以下に示します。

```js
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
regionNames.of('US');
// → 'United States'
regionNames.of('BA');
// → 'Bosnia & Herzegovina'
regionNames.of('MM');
// → 'Myanmar (Burma)'
```

[Unicodeの言語識別子構文](http://unicode.org/reports/tr35/#Unicode_language_identifier)を使用して、繁体字中国語で言語名を取得する例を以下に示します。

```js
const languageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
languageNames.of('fr');
// → '法文'
languageNames.of('zh');
// → '中文'
languageNames.of('de');
// → '德文'
```

[ISO-4217 3文字の通貨コード](https://www.iso.org/iso-4217-currency-codes.html)を使用して簡体字中国語で通貨名を取得する例を以下に示します。一部の言語では単数形と複数形の形式が異なる場合がありますが、通貨名は単数形で表示されます。複数形の場合、[`Intl.NumberFormat`](https://v8.dev/features/intl-numberformat)を使用できます。

```js
const currencyNames = new Intl.DisplayNames(['zh-Hans'], {type: 'currency'});
currencyNames.of('USD');
// → '美元'
currencyNames.of('EUR');
// → '欧元'
currencyNames.of('JPY');
// → '日元'
currencyNames.of('CNY');
// → '人民币'
```

[ISO-15924 4文字のスクリプトコード](http://unicode.org/iso15924/iso15924-codes.html)を使用して英語でスクリプト名を取得する最終的なサポートされているタイプの例を以下に示します。

```js
const scriptNames = new Intl.DisplayNames(['en'], { type: 'script' });
scriptNames.of('Latn');
// → 'Latin'
scriptNames.of('Arab');
// → 'Arabic'
scriptNames.of('Kana');
// → 'Katakana'
```

より高度な使用例として、第2引数の`options`パラメータには`style`プロパティもサポートされています。`style`プロパティは表示名の幅に対応しており、`"long"`、`"short"`、または`"narrow"`のいずれかを指定できます。異なるスタイルの値が常に異なるわけではありません。デフォルトは`"long"`です。

```js
const longLanguageNames = new Intl.DisplayNames(['en'], { type: 'language' });
longLanguageNames.of('en-US');
// → 'American English'
const shortLanguageNames = new Intl.DisplayNames(['en'], { type: 'language', style: 'short' });
shortLanguageNames.of('en-US');
// → 'US English'
const narrowLanguageNames = new Intl.DisplayNames(['en'], { type: 'language', style: 'narrow' });
narrowLanguageNames.of('en-US');
// → 'US English'
```

## 完全なAPI

`Intl.DisplayNames`の完全なAPIは以下の通りです。

```js
Intl.DisplayNames(locales, options)
Intl.DisplayNames.prototype.of( code )
```

コンストラクタは他の`Intl` APIと一貫性があります。第1引数は[ロケールのリスト](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation)であり、第2引数は`localeMatcher`、`type`、`style`プロパティを受け入れる`options`パラメータです。

`"localeMatcher"`プロパティは[他の`Intl` API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation)と同様に扱われます。`type`プロパティは`"region"`、`"language"`、`"currency"`または`"script"`を指定できます。`style`プロパティは`"long"`、`"short"`または`"narrow"`を指定でき、デフォルトは`"long"`です。

`Intl.DisplayNames.prototype.of( code )`ではインスタンスの`type`に応じて以下の形式が期待されます。

- `type`が`"region"`の場合、`code`は[ISO-3166 2文字の国コード](https://www.iso.org/iso-3166-country-codes.html)または[UN M49 3桁の地域コード](https://unstats.un.org/unsd/methodology/m49/)である必要があります。
- `type`が`"language"`の場合、`code`は[Unicodeの言語識別子文法](https://unicode.org/reports/tr35/#Unicode_language_identifier)に準拠する必要があります。
- `type`が`"currency"`の場合、`code`は[ISO-4217の3文字通貨コード](https://www.iso.org/iso-4217-currency-codes.html)である必要があります。
- `type`が`"script"`の場合、`code`は[ISO-15924の4文字スクリプトコード](https://unicode.org/iso15924/iso15924-codes.html)である必要があります。

## 結論

他の`Intl` APIと同様に、`Intl.DisplayNames`が広く利用可能になると、ライブラリやアプリケーションは独自の翻訳データをパッケージングして配布する代わりに、ネイティブ機能を利用することを選ぶようになります。

## `Intl.DisplayNames`のサポート

<feature-support chrome="81 /blog/v8-release-81#intl.displaynames"
                 firefox="86 https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/86#javascript"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=209779"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="no"></feature-support>
