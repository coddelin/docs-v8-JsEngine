---
title: "`Intl.DisplayNames`"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu)) 과 Frank Yung-Fong Tang"
avatars: 
  - "shu-yu-guo"
  - "frank-tang"
date: 2020-02-13
tags: 
  - Intl
  - Node.js 14
description: "Intl.DisplayNames API는 언어, 지역, 스크립트, 통화의 로컬화된 이름을 제공합니다."
tweet: "1232333889005334529"
---
전 세계를 대상으로 하는 웹 애플리케이션은 다양한 언어로 언어, 지역, 스크립트, 통화의 표시 이름을 보여줄 필요가 있습니다. 이러한 이름의 번역에는 데이터가 필요하며, 이는 [Unicode CLDR](http://cldr.unicode.org/translation/)에서 제공됩니다. 애플리케이션의 일부로 데이터를 포함시키는 것은 개발자 시간에 비용이 발생합니다. 사용자들은 언어 및 지역 이름의 일관된 번역을 선호할 가능성이 있으며, 세계의 지리적 변화에 맞춰 해당 데이터를 최신 상태로 유지하려면 지속적인 유지 관리가 필요합니다.

<!--truncate-->
다행히 대부분의 JavaScript 런타임은 이미 최신 번역 데이터를 제공하고 있습니다. 새로운 `Intl.DisplayNames` API는 JavaScript 개발자에게 이러한 번역에 직접 액세스할 수 있는 기능을 제공하여 애플리케이션이 로컬화된 이름을 더 쉽게 표시할 수 있도록 합니다.

## 사용 예

다음 예제는 [ISO-3166 2글자 국가 코드](https://www.iso.org/iso-3166-country-codes.html)를 사용하여 영어로 지역 이름을 얻기 위해 `Intl.DisplayNames` 객체를 생성하는 방법을 보여줍니다.

```js
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
regionNames.of('US');
// → 'United States'
regionNames.of('BA');
// → 'Bosnia & Herzegovina'
regionNames.of('MM');
// → 'Myanmar (Burma)'
```

다음 예제는 [Unicode's 언어 식별자 문법](http://unicode.org/reports/tr35/#Unicode_language_identifier)을 사용하여 번체 중국어로 언어 이름을 가져옵니다.

```js
const languageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
languageNames.of('fr');
// → '法文'
languageNames.of('zh');
// → '中文'
languageNames.of('de');
// → '德文'
```

다음 예제는 [ISO-4217 3글자 통화 코드](https://www.iso.org/iso-4217-currency-codes.html)를 사용하여 간체 중국어로 통화 이름을 가져옵니다. 특정 언어에서 단수형 및 복수형이 구분되는 경우, 통화 이름은 단수형입니다. 복수형은 [`Intl.NumberFormat`](https://v8.dev/features/intl-numberformat)을 사용할 수 있습니다.

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

다음 예제는 [ISO-15924 4글자 스크립트 코드](http://unicode.org/iso15924/iso15924-codes.html)를 사용하여 영어로 스크립트를 보여줍니다.

```js
const scriptNames = new Intl.DisplayNames(['en'], { type: 'script' });
scriptNames.of('Latn');
// → 'Latin'
scriptNames.of('Arab');
// → 'Arabic'
scriptNames.of('Kana');
// → 'Katakana'
```

더 정교한 사용을 위해 두 번째 `options` 매개변수는 `style` 속성을 지원합니다. `style` 속성은 표시 이름의 길이와 관련되며, `"long"`, `"short"`, `"narrow"` 중 하나일 수 있습니다. 서로 다른 스타일의 값이 항상 차이가 있는 것은 아닙니다. 기본값은 `"long"`입니다.

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

## 전체 API

다음은 `Intl.DisplayNames`의 전체 API입니다.

```js
Intl.DisplayNames(locales, options)
Intl.DisplayNames.prototype.of( code )
```

생성자는 다른 `Intl` API와 일관성을 유지합니다. 첫 번째 인수는 [로케일 목록](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation)이고, 두 번째 매개변수는 `localeMatcher`, `type`, `style` 속성을 가진 `options` 매개변수입니다.

`"localeMatcher"` 속성은 [다른 `Intl` API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation)와 동일하게 처리됩니다. `type` 속성은 `"region"`, `"language"`, `"currency"`, `"script"` 중 하나일 수 있습니다. `style` 속성은 `"long"`, `"short"`, 또는 `"narrow"`일 수 있으며 기본값은 `"long"`입니다.

`Intl.DisplayNames.prototype.of( code )`는 인스턴스가 생성된 `type`에 따라 다음 형식을 기대합니다.

- `type`이 `"region"`일 때 `code`는 [ISO-3166 2글자 국가 코드](https://www.iso.org/iso-3166-country-codes.html) 또는 [UN M49 3자리 지역 코드](https://unstats.un.org/unsd/methodology/m49/)이어야 합니다.
- `type`이 `"language"`일 때, `code`는 반드시 [Unicode의 언어 식별자 문법](https://unicode.org/reports/tr35/#Unicode_language_identifier)에 따라야 합니다.
- `type`이 `"currency"`일 때, `code`는 반드시 [ISO-4217 3-문자 통화 코드](https://www.iso.org/iso-4217-currency-codes.html)여야 합니다.
- `type`이 `"script"`일 때, `code`는 반드시 [ISO-15924 4-문자 스크립트 코드](https://unicode.org/iso15924/iso15924-codes.html)여야 합니다.

## 결론

다른 `Intl` API와 마찬가지로, `Intl.DisplayNames`가 더 널리 사용됨에 따라 라이브러리와 애플리케이션은 자체 번역 데이터를 패키징하고 사용하는 대신 네이티브 기능을 사용하는 것을 선호하게 될 것입니다.

## `Intl.DisplayNames` 지원

<feature-support chrome="81 /blog/v8-release-81#intl.displaynames"
                 firefox="86 https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/86#javascript"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=209779"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="no"></feature-support>
