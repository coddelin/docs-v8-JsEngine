---
title: "V8リリース v9.9"
author: "イングヴァール・ステパニャン（[@RReverser](https://twitter.com/RReverser)） 彼の99%"
avatars: 
 - "ingvar-stepanyan"
date: 2022-01-31
tags: 
 - release
description: "V8リリース v9.9は、新しい国際化APIを提供します。"
tweet: "1488190967727411210"
---
4週間ごとに、私たちは[V8のリリースプロセス](https://v8.dev/docs/release-process)の一環として新しいブランチを作成しています。各バージョンは、Chromeのベータマイルストーンの直前にV8のGitメインからブランチされます。本日は、新しいブランチ[V8バージョン9.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.9)を発表できることを嬉しく思います。このバージョンは数週間後のChrome 99の安定版と共にリリースされるまでベータ版です。V8 v9.9には、開発者向けのさまざまな便利なツールが満載されています。この投稿では、リリースに向けたハイライトの一部をプレビューします。

<!--truncate-->
## JavaScript

### Intl.Locale拡張

v7.4で[`Intl.Locale` API](https://v8.dev/blog/v8-release-74#intl.locale)を導入しました。このv9.9では、`Intl.Locale`オブジェクトに7つの新しいプロパティを追加しました：`calendars`、`collations`、`hourCycles`、`numberingSystems`、`timeZones`、`textInfo`、`weekInfo`。

`Intl.Locale`の`calendars`、`collations`、`hourCycles`、`numberingSystems`、および`timeZones`プロパティは、一般的に使用される優先識別子の配列を返し、他の`Intl` APIで使用することを目的としています：

```js
const arabicEgyptLocale = new Intl.Locale('ar-EG')
// ar-EG
arabicEgyptLocale.calendars
// ['gregory', 'coptic', 'islamic', 'islamic-civil', 'islamic-tbla']
arabicEgyptLocale.collations
// ['compat', 'emoji', 'eor']
arabicEgyptLocale.hourCycles
// ['h12']
arabicEgyptLocale.numberingSystems
// ['arab']
arabicEgyptLocale.timeZones
// ['Africa/Cairo']
```

`Intl.Locale`の`textInfo`プロパティは、テキストに関する情報を指定するオブジェクトを返します。現在、このオブジェクトには1つのプロパティ、`direction`のみが含まれており、ロケール内のテキストのデフォルトの方向性を示します。これは、[HTMLの`dir`属性](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir)や[CSSの`direction`プロパティ](https://developer.mozilla.org/en-US/docs/Web/CSS/direction)で使用することを目的としています。この方向性は、文字の並び順を示し、`ltr`（左から右）または`rtl`（右から左）のいずれかです：

```js
arabicEgyptLocale.textInfo
// { direction: 'rtl' }
japaneseLocale.textInfo
// { direction: 'ltr' }
chineseTaiwanLocale.textInfo
// { direction: 'ltr' }
```

`Intl.Locale`の`weekInfo`プロパティは、週に関連する情報を指定するオブジェクトを返します。返されるオブジェクトの`firstDay`プロパティは、週の最初の日を示す1から7までの数字です。1は月曜日、2は火曜日、3は水曜日、4は木曜日、5は金曜日、6は土曜日、7は日曜日を指します。返されるオブジェクトの`minimalDays`プロパティは、特定の月または年で最初の週として認識されるために必要な最小日数を示します。返されるオブジェクトの`weekend`プロパティは、通常は2つの要素を含む整数の配列であり、`firstDay`と同じ形式でエンコードされます。これはカレンダーの目的で「週末」と見なされる曜日を示します。地域によって週末の日数が異なることがあり、連続しているとは限りません。

```js
arabicEgyptLocale.weekInfo
// {firstDay: 6, weekend: [5, 6], minimalDays: 1}
// 週の最初の日は土曜日。週末は金曜日と土曜日。
// 特定の月や年の最初の週は、その月や年に少なくとも1日を含む週。
```

### Intlの列挙

v9.9では、[`Intl.supportedValuesOf(code)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf)という新しい関数を追加しました。この関数は、Intl APIでサポートされている識別子の配列を返します。サポートされている`code`の値は`calendar`、`collation`、`currency`、`numberingSystem`、`timeZone`、および`unit`です。この新しいメソッドの情報により、ウェブ開発者が各実装でサポートされている値を簡単に発見できるようになります。

```js
Intl.supportedValuesOf('calendar')
// ['buddhist', 'chinese', 'coptic', 'dangi', ...]

Intl.supportedValuesOf('collation')
// ['big5han', 'compat', 'dict', 'emoji', ...]

Intl.supportedValuesOf('currency')
// ['ADP', 'AED', 'AFA', 'AFN', 'ALK', 'ALL', 'AMD', ...]

Intl.supportedValuesOf('numberingSystem')
// ['adlm', 'ahom', 'arab', 'arabext', 'bali', ...]

Intl.supportedValuesOf('timeZone')
// ['Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers', ...]

Intl.supportedValuesOf('unit')
// ['acre', 'bit', 'byte', 'celsius', 'centimeter', ...]
```

## V8 API

`git log branch-heads/9.8..branch-heads/9.9 include/v8\*.h`を使用して、APIの変更点の一覧を取得してください。
