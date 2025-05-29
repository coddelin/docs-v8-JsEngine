---
title: &apos;수정된 `Function.prototype.toString`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-25
tags:
  - ECMAScript
  - ES2019
description: &apos;Function.prototype.toString이 이제 공백과 주석을 포함한 소스 코드 텍스트의 정확한 조각을 반환합니다.&apos;
---
[`Function.prototype.toString()`](https://tc39.es/Function-prototype-toString-revision/)이 이제 공백과 주석을 포함한 소스 코드 텍스트의 정확한 조각을 반환합니다. 이전 동작과 새로운 동작을 비교한 예제를 아래에서 확인하세요:

<!--truncate-->
```js
// `function` 키워드와 함수 이름 사이의 주석을 주목하세요.
// 그리고 함수 이름 뒤의 공백도 주목하세요.
function /* a comment */ foo () {}

// 이전에는 V8에서:
foo.toString();
// → &apos;function foo() {}&apos;
//             ^ 주석 없음
//                ^ 공백 없음

// 이제는:
foo.toString();
// → &apos;function /* comment */ foo () {}&apos;
```

## 기능 지원

<feature-support chrome="66 /blog/v8-release-66#function-tostring"
                 firefox="yes"
                 safari="no"
                 nodejs="8"
                 babel="no"></feature-support>
