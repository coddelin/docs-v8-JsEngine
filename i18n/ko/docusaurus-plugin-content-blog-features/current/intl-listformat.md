---
title: "`Intl.ListFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)) 및 Frank Yung-Fong Tang"
avatars: 
  - "mathias-bynens"
  - "frank-tang"
date: 2018-12-18
tags: 
  - Intl
  - Node.js 12
  - io19
description: "Intl.ListFormat API는 성능을 희생하지 않고 로컬화된 목록 포맷팅을 가능하게 합니다."
tweet: "1074966915557351424"
---
모던 웹 애플리케이션은 종종 동적 데이터로 구성된 목록을 사용합니다. 예를 들어, 사진 뷰어 앱은 다음과 같은 내용을 표시할 수 있습니다:

> 이 사진에는 **Ada, Edith, _그리고_ Grace**가 포함되어 있습니다.

텍스트 기반 게임은 다른 종류의 목록을 가질 수 있습니다:

> 초능력을 선택하세요: **투명화, 염력, _또는_ 공감 능력**.

각 언어에는 다른 목록 포맷팅 규칙과 단어가 있기 때문에 로컬화된 목록 포맷터를 구현하는 것은 간단하지 않습니다. 지원하고자 하는 각 언어에 대해 모든 단어(위 예에서는 '그리고' 또는 '혹은'과 같은 단어)를 목록화해야 할 뿐만 아니라, 이러한 언어들의 정확한 포맷팅 규칙을 인코딩해야 합니다! [Unicode CLDR](http://cldr.unicode.org/translation/lists)은 이러한 데이터를 제공하지만 이를 JavaScript에서 사용하려면 다른 라이브러리 코드와 함께 임베드되어 제공되어야 합니다. 이는 불행히도 이러한 라이브러리의 번들 크기를 증가시켜 로드 시간, 파싱/컴파일 비용, 메모리 소비에 부정적인 영향을 미칩니다.

<!--truncate-->
새로운 `Intl.ListFormat` API는 이러한 부담을 JavaScript 엔진으로 옮겨서 로케일 데이터를 포함하고 이를 JavaScript 개발자가 직접 사용할 수 있게 합니다. `Intl.ListFormat`은 성능을 희생하지 않고 로컬화된 목록 포맷팅을 제공합니다.

## 사용 예제

다음 예제는 영어로 접속사 기반 목록 포맷터를 생성하는 방법을 보여줍니다:

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

영어에서는 'or'를 사용하는 선택적 `options` 매개변수를 통해 분리 연결사도 지원됩니다:

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

다른 언어(중국어, 언어 코드 `zh` 사용)를 사용하는 예제는 다음과 같습니다:

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

`options` 매개변수는 더 발전된 사용을 가능하게 합니다. 다음은 다양한 옵션과 조합 및 [UTS#35](https://unicode.org/reports/tr35/tr35-general.html#ListPatterns)에 정의된 목록 패턴과의 대응에 대한 개요입니다:


| 유형                  | 옵션                                   | 설명                                                                                     | 예제                           |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| 기본 (또는 유형 없음) | `{}` (기본값)                            | 임의의 플레이스홀더에 적합한 일반적인 '그리고' 목록                                          | `'January, February, and March'` |
| 또는                  | `{ type: 'disjunction' }`                 | 임의의 플레이스홀더에 적합한 일반적인 '혹은' 목록                                           | `'January, February, or March'`  |
| 단위                  | `{ type: 'unit' }`                        | 넓은 단위에 적합한 목록                                                                   | `'3 feet, 7 inches'`             |
| 단위-짧은            | `{ type: 'unit', style: 'short' }`        | 짧은 단위에 적합한 목록                                                                   | `'3 ft, 7 in'`                   |
| 단위-좁은            | `{ type: 'unit', style: 'narrow' }`       | 화면 공간이 매우 제한적인 좁은 단위에 적합한 목록                                             | `'3′ 7″'`                        |


많은 언어(예: 영어)에서는 이러한 목록 간에 차이가 없을 수 있습니다. 다른 언어에서는 띄어쓰기, 접속사 길이 또는 존재 여부, 구분 기호 등이 변경될 수 있습니다.

## 결론

`Intl.ListFormat` API가 점점 더 널리 사용됨에 따라, 라이브러리들은 하드코딩된 CLDR 데이터베이스 의존성 대신 네이티브 리스트 포맷팅 기능을 사용하게 되어 로드 타임 성능, 구문 분석 및 컴파일 타임 성능, 실행 시간 성능, 그리고 메모리 사용량을 개선하게 될 것입니다.

## `Intl.ListFormat` 지원

<feature-support chrome="72 /blog/v8-release-72#intl.listformat"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
