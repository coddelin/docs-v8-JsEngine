---
title: &apos;`Intl.NumberFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias)) 그리고 Shane F. Carr&apos;
avatars:
  - &apos;mathias-bynens&apos;
  - &apos;shane-carr&apos;
date: 2019-08-08
tags:
  - Intl
  - io19
description: &apos;Intl.NumberFormat는 지역별 숫자 형식을 지원합니다.&apos;
tweet: &apos;1159476407329873920&apos;
---
현재 `Intl.NumberFormat` API에 대해 알고 있을 수도 있습니다. 이 API는 현대 환경에서 이미 오랫동안 지원되고 있습니다.

<feature-support chrome="24"
                 firefox="29"
                 safari="10"
                 nodejs="0.12"
                 babel="yes"></feature-support>

`Intl.NumberFormat`의 기본 형태는 지역별 숫자 형식을 지원하는 재사용 가능한 포매터 인스턴스를 생성할 수 있도록 합니다. 다른 `Intl.*Format` API처럼, 포매터 인스턴스는 `format`과 `formatToParts` 메서드 모두를 지원합니다:

<!--truncate-->
```js
const formatter = new Intl.NumberFormat(&apos;en&apos;);
formatter.format(987654.321);
// → &apos;987,654.321&apos;
formatter.formatToParts(987654.321);
// → [
// →   { type: &apos;integer&apos;, value: &apos;987&apos; },
// →   { type: &apos;group&apos;, value: &apos;,&apos; },
// →   { type: &apos;integer&apos;, value: &apos;654&apos; },
// →   { type: &apos;decimal&apos;, value: &apos;.&apos; },
// →   { type: &apos;fraction&apos;, value: &apos;321&apos; }
// → ]
```

**참고:** `Intl.NumberFormat`의 많은 기능은 `Number.prototype.toLocaleString`을 사용하여 달성할 수 있지만, 재사용 가능한 포매터 인스턴스를 생성할 수 있기 때문에 `Intl.NumberFormat`을 사용하는 것이 [더 효율적](/blog/v8-release-76#localized-bigint)인 경우가 많습니다.

최근 `Intl.NumberFormat` API는 새로운 기능이 추가되었습니다.

## `BigInt` 지원

`Number`와 더불어 `Intl.NumberFormat`은 이제 [`BigInt`]도 (/features/bigint) 형식을 지원합니다:

```js
const formatter = new Intl.NumberFormat(&apos;fr&apos;);
formatter.format(12345678901234567890n);
// → &apos;12 345 678 901 234 567 890&apos;
formatter.formatToParts(123456n);
// → [
// →   { type: &apos;integer&apos;, value: &apos;123&apos; },
// →   { type: &apos;group&apos;, value: &apos; &apos; },
// →   { type: &apos;integer&apos;, value: &apos;456&apos; }
// → ]
```

<feature-support chrome="76 /blog/v8-release-76#localized-bigint"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## 측정 단위

`Intl.NumberFormat`은 현재 다음과 같은 _단순 단위_를 지원합니다:

- 각도: `degree`
- 면적: `acre`, `hectare`
- 농도: `percent`
- 디지털: `bit`, `byte`, `kilobit`, `kilobyte`, `megabit`, `megabyte`, `gigabit`, `gigabyte`, `terabit`, `terabyte`, `petabyte`
- 시간: `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`, `year`
- 길이: `millimeter`, `centimeter`, `meter`, `kilometer`, `inch`, `foot`, `yard`, `mile`, `mile-scandinavian`
- 질량: `gram`, `kilogram`, `ounce`, `pound`, `stone`
- 온도: `celsius`, `fahrenheit`
- 부피: `liter`, `milliliter`, `gallon`, `fluid-ounce`

지역화된 단위로 숫자를 포맷하려면 `style` 및 `unit` 옵션을 사용하세요:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;kilobyte&apos;,
});
formatter.format(1.234);
// → &apos;1.234 kB&apos;
formatter.format(123.4);
// → &apos;123.4 kB&apos;
```

시간이 지나면서 더 많은 단위가 지원될 수 있습니다. 최신 목록은 [사양](https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers)을 참조하세요.

위에 나열된 단순 단위를 분자와 분모로 결합하여 '에이커당 리터' 또는 '초당 미터'와 같은 복합 단위를 표현할 수 있습니다:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
});
formatter.format(299792458);
// → &apos;299,792,458 m/s&apos;
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## 압축, 과학적, 공학적 표기법

_압축 표기법_은 더 큰 숫자를 표현하기 위해 지역별 기호를 사용합니다. 이는 과학적 표기법의 더 인간 친화적인 대안입니다:

```js
{
  // 표준 표기법 테스트.
  const formatter = new Intl.NumberFormat(&apos;en&apos;, {
    notation: &apos;standard&apos;, // 이는 기본값으로 암시됩니다.
  });
  formatter.format(1234.56);
  // → &apos;1,234.56&apos;
  formatter.format(123456);
  // → &apos;123,456&apos;
  formatter.format(123456789);
  // → &apos;123,456,789&apos;
}

{
  // 압축 표기법 테스트.
  const formatter = new Intl.NumberFormat(&apos;en&apos;, {
    notation: &apos;compact&apos;,
  });
  formatter.format(1234.56);
  // → &apos;1.2K&apos;
  formatter.format(123456);
  // → &apos;123K&apos;
  formatter.format(123456789);
  // → &apos;123M&apos;
}
```

:::note
**참고:** 기본적으로 압축 표기법은 가장 가까운 정수로 반올림하며 항상 2개의 유효 숫자를 유지합니다. `{minimum,maximum}FractionDigits` 또는 `{minimum,maximum}SignificantDigits`를 설정하여 이 동작을 재정의할 수 있습니다.
:::

`Intl.NumberFormat`는 [과학적 표기법](https://en.wikipedia.org/wiki/Scientific_notation)으로 숫자를 형식화할 수 있습니다:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
  notation: &apos;scientific&apos;,
});
formatter.format(299792458);
// → &apos;2.998E8 m/s&apos;
```

[공학 표기법](https://en.wikipedia.org/wiki/Engineering_notation)도 지원됩니다:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
  notation: &apos;engineering&apos;,
});
formatter.format(299792458);
// → &apos;299.792E6 m/s&apos;
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## 부호 표시

특정 상황(예: 변화량 표시)에서는 숫자가 양수일 때에도 명시적으로 부호를 표시하는 것이 도움이 됩니다. 새로운 `signDisplay` 옵션이 이를 가능하게 합니다:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;percent&apos;,
  signDisplay: &apos;always&apos;,
});
formatter.format(-12.34);
// → &apos;-12.34%&apos;
formatter.format(12.34);
// → &apos;+12.34%&apos;
formatter.format(0);
// → &apos;+0%&apos;
formatter.format(-0);
// → &apos;-0%&apos;
```

값이 `0`일 때 부호 표시를 방지하려면 `signDisplay: &apos;exceptZero&apos;`를 사용하세요:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;percent&apos;,
  signDisplay: &apos;exceptZero&apos;,
});
formatter.format(-12.34);
// → &apos;-12.34%&apos;
formatter.format(12.34);
// → &apos;+12.34%&apos;
formatter.format(0);
// → &apos;0%&apos;
// 참고로: -0은 예상대로 부호가 표시됩니다:
formatter.format(-0);
// → &apos;-0%&apos;
```

통화의 경우, `currencySign` 옵션은 로케일별 부정 통화 금액을 위한 설정인 _회계 형식_을 활성화합니다; 예를 들어 통화 금액을 괄호로 감싸는 형식이 포함됩니다:

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;currency&apos;,
  currency: &apos;USD&apos;,
  signDisplay: &apos;exceptZero&apos;,
  currencySign: &apos;accounting&apos;,
});
formatter.format(-12.34);
// → &apos;($12.34)&apos;
formatter.format(12.34);
// → &apos;+$12.34&apos;
formatter.format(0);
// → &apos;$0.00&apos;
formatter.format(-0);
// → &apos;($0.00)&apos;
```

<feature-support chrome="77"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

## 더 많은 정보

관련 [스펙 제안](https://github.com/tc39/proposal-unified-intl-numberformat)은 각 개별 `Intl.NumberFormat` 기능을 감지하는 방법에 대한 지침을 포함한 더 많은 정보와 예제를 제공합니다.
