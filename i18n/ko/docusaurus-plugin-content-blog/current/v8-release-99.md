---
title: "V8 release v9.9"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), at his 99%"
avatars:
 - "ingvar-stepanyan"
date: 2022-01-31
tags:
 - release
description: "V8 release v9.9 brings new internationalization APIs."
tweet: "1488190967727411210"
---
매 4주마다, 우리는 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새 브랜치를 만듭니다. 각 버전은 Chrome 베타 단계 이전에 V8의 Git 메인 브랜치에서 생성됩니다. 오늘 우리는 가장 최신 브랜치인 [V8 버전 9.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.9)를 발표하게 되어 기쁩니다. V8 v9.9는 몇 주 후 Chrome 99 Stable 릴리스와 함께 발표될 예정이며 현재 베타 버전을 제공합니다. V8 v9.9는 개발자 친화적인 다양한 신규 기능으로 가득합니다. 이 포스트에서는 릴리스를 앞두고 하이라이트를 미리 보여드립니다.

<!--truncate-->
## 자바스크립트

### Intl.Locale 확장

v7.4에서 [`Intl.Locale` API](https://v8.dev/blog/v8-release-74#intl.locale)를 런칭했습니다. v9.9에서는 `Intl.Locale` 객체에 새로운 7가지 속성(`calendars`, `collations`, `hourCycles`, `numberingSystems`, `timeZones`, `textInfo`, `weekInfo`)을 추가했습니다.

`Intl.Locale`의 `calendars`, `collations`, `hourCycles`, `numberingSystems`, `timeZones` 속성은 공통적으로 사용되는 선호 식별자의 배열을 반환하며, 다른 `Intl` API와 함께 사용되도록 설계되었습니다:

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

`Intl.Locale`의 `textInfo` 속성은 텍스트와 관련된 정보를 지정하기 위한 객체를 반환합니다. 현재에는 `direction` 속성 하나만 있으며, 로케일에서 텍스트의 기본 방향성을 나타냅니다. 이는 [HTML의 `dir` 속성](https://developer.mozilla.org/ko/docs/Web/HTML/Global_attributes/dir) 및 [CSS `direction` 속성](https://developer.mozilla.org/ko/docs/Web/CSS/direction)과 함께 사용되도록 설계되었습니다. 이는 텍스트의 문자 정렬을 나타내며 `ltr` (왼쪽에서 오른쪽) 또는 `rtl` (오른쪽에서 왼쪽)이 가능합니다:

```js
arabicEgyptLocale.textInfo
// { direction: 'rtl' }
japaneseLocale.textInfo
// { direction: 'ltr' }
chineseTaiwanLocale.textInfo
// { direction: 'ltr' }
```

`Intl.Locale`의 `weekInfo` 속성은 주와 관련된 정보를 지정하기 위한 객체를 반환합니다. 반환되는 객체의 `firstDay` 속성은 1에서 7 사이의 숫자로 주의 첫 번째 날을 나타냅니다. 1은 월요일, 2는 화요일, 3은 수요일, 4는 목요일, 5는 금요일, 6은 토요일, 7은 일요일을 의미합니다. `minimalDays` 속성은 달 또는 연도의 첫 번째 주에 필요한 최소 일 수를 의미합니다. 반환되는 객체의 `weekend` 속성은 보통 두 개의 요소가 포함된 정수 배열로, `firstDay`와 동일하게 인코딩됩니다. 이는 달력을 기준으로 주말에 포함되는 주의 요일을 나타냅니다. 주말의 일 수는 로케일마다 다르며 연속적이지 않을 수 있습니다.

```js
arabicEgyptLocale.weekInfo
// {firstDay: 6, weekend: [5, 6], minimalDays: 1}
// 주의 첫 번째 날은 토요일입니다. 주말은 금요일과 토요일입니다.
// 달 또는 연도의 첫 번째 주는 최소 1일 이상을 포함하는 주입니다.
```

### Intl 열거

v9.9에서는 [`Intl.supportedValuesOf(code)`](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf)라는 새로운 함수를 추가했습니다. 이 함수는 v8에서 Intl API가 지원하는 식별자의 배열을 반환합니다. 지원되는 `code` 값으로는 `calendar`, `collation`, `currency`, `numberingSystem`, `timeZone`, 및 `unit`이 포함됩니다. 이 새로운 메서드는 웹 개발자가 구현에서 지원되는 값을 쉽게 찾을 수 있도록 설계되었습니다.

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

다음 명령어를 사용하여 API 변경 사항의 목록을 확인할 수 있습니다: `git log branch-heads/9.8..branch-heads/9.9 include/v8\*.h`.
