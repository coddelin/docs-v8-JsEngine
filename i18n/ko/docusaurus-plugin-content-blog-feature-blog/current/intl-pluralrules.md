---
title: "`Intl.PluralRules`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2017-10-04
tags:
  - Intl
description: "복수형 처리는 언뜻 간단해 보이는 문제들 중 하나지만, 각 언어마다 고유한 복수형 규칙이 있다는 것을 깨닫게 되면 복잡해질 수 있습니다. Intl.PluralRules API가 이를 도와줄 수 있습니다!"
tweet: "915542989493202944"
---
Iñtërnâtiônàlizætiøn은 어렵습니다. 복수형 처리는 언뜻 간단해 보이는 문제들 중 하나지만, 각 언어마다 고유한 복수형 규칙이 있다는 것을 깨닫게 되면 복잡해질 수 있습니다.

영어 복수형의 경우 가능한 결과는 두 가지뿐입니다. “cat”이라는 단어를 예로 들어보겠습니다:

- 1 cat, 즉 `'one'` 형태로, 영어에서는 단수형으로 알려져 있습니다.
- 2 cats, 하지만 42 cats, 0.5 cats 등도 포함됩니다. 즉, `'other'` 형태(유일한 다른 형태)로, 영어에서는 복수형으로 알려져 있습니다.

새롭게 제공되는 [`Intl.PluralRules` API](https://github.com/tc39/proposal-intl-plural-rules)는 주어진 숫자를 기준으로 선택한 언어에서 어떤 형태를 적용해야 하는지 알려줍니다.

```js
const pr = new Intl.PluralRules('en-US');
pr.select(0);   // 'other' (예: '0 cats')
pr.select(0.5); // 'other' (예: '0.5 cats')
pr.select(1);   // 'one'   (예: '1 cat')
pr.select(1.5); // 'other' (예: '0.5 cats')
pr.select(2);   // 'other' (예: '0.5 cats')
```

<!--truncate-->
다른 국제화 API들과는 다르게, `Intl.PluralRules`는 자체적으로 형식을 지정하지 않는 낮은 수준의 API입니다. 대신, 이를 활용하여 자신만의 형식기를 구축할 수 있습니다:

```js
const suffixes = new Map([
  // 참고: 실제 사용 사례에서는 복수형을 하드코딩하지 않고
  // 번역 파일의 일부로 처리하는 것이 좋습니다.
  ['one',   'cat'],
  ['other', 'cats'],
]);
const pr = new Intl.PluralRules('en-US');
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // '1 cat'
formatCats(0);   // '0 cats'
formatCats(0.5); // '0.5 cats'
formatCats(1.5); // '1.5 cats'
formatCats(2);   // '2 cats'
```

상대적으로 간단한 영어 복수형 규칙에 대해서는 과잉 처리처럼 보일 수 있지만, 모든 언어가 동일한 규칙을 따르지는 않습니다. 일부 언어는 단일 복수형만 가지고 있으며, 일부 언어는 여러 가지 형태를 가지고 있습니다. [웨일스어](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules)는 예를 들어, 여섯 가지 다른 복수형 형태를 가지고 있습니다!

```js
const suffixes = new Map([
  ['zero',  'cathod'],
  ['one',   'gath'],
  // 참고: `two` 형태는 특정 단어에 대해서만 `'one'` 형태와 동일합니다.
  // 하지만 웨일스어의 모든 단어가 그러한 것은 아닙니다.
  ['two',   'gath'],
  ['few',   'cath'],
  ['many',  'chath'],
  ['other', 'cath'],
]);
const pr = new Intl.PluralRules('cy');
const formatWelshCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatWelshCats(0);   // '0 cathod'
formatWelshCats(1);   // '1 gath'
formatWelshCats(1.5); // '1.5 cath'
formatWelshCats(2);   // '2 gath'
formatWelshCats(3);   // '3 cath'
formatWelshCats(6);   // '6 chath'
formatWelshCats(42);  // '42 cath'
```

다중 언어를 지원하면서 올바른 복수형 처리를 구현하려면 각 언어와 복수형 규칙에 대한 데이터베이스가 필요합니다. [Unicode CLDR](http://cldr.unicode.org/)은 이러한 데이터를 포함하고 있지만, 이를 JavaScript에서 사용하려면 JavaScript 코드 옆에 내장되어 함께 제공되어야 하며, 이로 인해 로드 시간, 파싱 시간, 메모리 사용량이 증가할 수 있습니다. `Intl.PluralRules` API는 이러한 부담을 JavaScript 엔진으로 전환하여 더욱 효율적인 국제화된 복수형 처리 지원을 제공합니다.

:::note
**참고:** CLDR 데이터는 각 언어별 형식 매핑을 포함하지만, 개별 단어에 대한 단수/복수형 목록은 제공되지 않습니다. 따라서 여전히 직접 번역하고 제공해야 합니다.
:::

## 서수 숫자

옵션 매개변수의 `type` 속성을 통해 다양한 선택 규칙을 지원합니다. 위의 예에서 사용된 암시적 기본값은 `'cardinal'`입니다. 숫자에 대한 서수 표시자를 식별하려면 (예: `1` → `1st`, `2` → `2nd` 등), `{ type: 'ordinal' }`를 사용하십시오:

```js
const pr = new Intl.PluralRules('en-US', {
  type: 'ordinal'
});
const suffixes = new Map([
  ['one',   'st'],
  ['two',   'nd'],
  ['few',   'rd'],
  ['other', 'th'],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // '0th'
formatOrdinals(1);   // '1st'
formatOrdinals(2);   // '2nd'
formatOrdinals(3);   // '3rd'
formatOrdinals(4);   // '4th'
formatOrdinals(11);  // '11th'
formatOrdinals(21);  // '21st'
formatOrdinals(42);  // '42nd'
formatOrdinals(103); // '103rd'
```

`Intl.PluralRules`는 다른 국제화 기능에 비해 저수준 API입니다. 따라서 직접 사용하지 않더라도, 이 API에 의존하는 라이브러리나 프레임워크를 사용할 수 있습니다.

이 API가 더 널리 사용 가능해짐에 따라, [Globalize](https://github.com/globalizejs/globalize#plural-module)와 같은 라이브러리가 하드코딩된 CLDR 데이터베이스에 대한 종속성을 제거하고 네이티브 기능을 선호하게 됩니다. 이를 통해 로드 시간 성능, 파싱 시간 성능, 실행 시간 성능 및 메모리 사용이 개선됩니다.

## `Intl.PluralRules` 지원

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
