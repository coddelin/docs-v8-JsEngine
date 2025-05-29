---
title: &apos;V8リリース v9.9&apos;
author: &apos;イングヴァール・ステパニャン（[@RReverser](https://twitter.com/RReverser)） 彼の99%&apos;
avatars:
 - &apos;ingvar-stepanyan&apos;
date: 2022-01-31
tags:
 - release
description: &apos;V8リリース v9.9は、新しい国際化APIを提供します。&apos;
tweet: &apos;1488190967727411210&apos;
---
4週間ごとに、私たちは[V8のリリースプロセス](https://v8.dev/docs/release-process)の一環として新しいブランチを作成しています。各バージョンは、Chromeのベータマイルストーンの直前にV8のGitメインからブランチされます。本日は、新しいブランチ[V8バージョン9.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.9)を発表できることを嬉しく思います。このバージョンは数週間後のChrome 99の安定版と共にリリースされるまでベータ版です。V8 v9.9には、開発者向けのさまざまな便利なツールが満載されています。この投稿では、リリースに向けたハイライトの一部をプレビューします。

<!--truncate-->
## JavaScript

### Intl.Locale拡張

v7.4で[`Intl.Locale` API](https://v8.dev/blog/v8-release-74#intl.locale)を導入しました。このv9.9では、`Intl.Locale`オブジェクトに7つの新しいプロパティを追加しました：`calendars`、`collations`、`hourCycles`、`numberingSystems`、`timeZones`、`textInfo`、`weekInfo`。

`Intl.Locale`の`calendars`、`collations`、`hourCycles`、`numberingSystems`、および`timeZones`プロパティは、一般的に使用される優先識別子の配列を返し、他の`Intl` APIで使用することを目的としています：

```js
const arabicEgyptLocale = new Intl.Locale(&apos;ar-EG&apos;)
// ar-EG
arabicEgyptLocale.calendars
// [&apos;gregory&apos;, &apos;coptic&apos;, &apos;islamic&apos;, &apos;islamic-civil&apos;, &apos;islamic-tbla&apos;]
arabicEgyptLocale.collations
// [&apos;compat&apos;, &apos;emoji&apos;, &apos;eor&apos;]
arabicEgyptLocale.hourCycles
// [&apos;h12&apos;]
arabicEgyptLocale.numberingSystems
// [&apos;arab&apos;]
arabicEgyptLocale.timeZones
// [&apos;Africa/Cairo&apos;]
```

`Intl.Locale`の`textInfo`プロパティは、テキストに関する情報を指定するオブジェクトを返します。現在、このオブジェクトには1つのプロパティ、`direction`のみが含まれており、ロケール内のテキストのデフォルトの方向性を示します。これは、[HTMLの`dir`属性](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir)や[CSSの`direction`プロパティ](https://developer.mozilla.org/en-US/docs/Web/CSS/direction)で使用することを目的としています。この方向性は、文字の並び順を示し、`ltr`（左から右）または`rtl`（右から左）のいずれかです：

```js
arabicEgyptLocale.textInfo
// { direction: &apos;rtl&apos; }
japaneseLocale.textInfo
// { direction: &apos;ltr&apos; }
chineseTaiwanLocale.textInfo
// { direction: &apos;ltr&apos; }
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
Intl.supportedValuesOf(&apos;calendar&apos;)
// [&apos;buddhist&apos;, &apos;chinese&apos;, &apos;coptic&apos;, &apos;dangi&apos;, ...]

Intl.supportedValuesOf(&apos;collation&apos;)
// [&apos;big5han&apos;, &apos;compat&apos;, &apos;dict&apos;, &apos;emoji&apos;, ...]

Intl.supportedValuesOf(&apos;currency&apos;)
// [&apos;ADP&apos;, &apos;AED&apos;, &apos;AFA&apos;, &apos;AFN&apos;, &apos;ALK&apos;, &apos;ALL&apos;, &apos;AMD&apos;, ...]

Intl.supportedValuesOf(&apos;numberingSystem&apos;)
// [&apos;adlm&apos;, &apos;ahom&apos;, &apos;arab&apos;, &apos;arabext&apos;, &apos;bali&apos;, ...]

Intl.supportedValuesOf(&apos;timeZone&apos;)
// [&apos;Africa/Abidjan&apos;, &apos;Africa/Accra&apos;, &apos;Africa/Addis_Ababa&apos;, &apos;Africa/Algiers&apos;, ...]

Intl.supportedValuesOf(&apos;unit&apos;)
// [&apos;acre&apos;, &apos;bit&apos;, &apos;byte&apos;, &apos;celsius&apos;, &apos;centimeter&apos;, ...]
```

## V8 API

`git log branch-heads/9.8..branch-heads/9.9 include/v8\*.h`を使用して、APIの変更点の一覧を取得してください。
