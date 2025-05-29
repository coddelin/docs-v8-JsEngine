---
title: "V8 릴리즈 v6.4"
author: "V8 팀"
date: "2017-12-19 13:33:37"
tags: 
  - 릴리즈
description: "V8 v6.4는 성능 향상, 새로운 JavaScript 언어 기능 등을 포함하고 있습니다."
tweet: "943057597481082880"
---
매 6주마다 [릴리즈 프로세스](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 생성합니다. 각 버전은 Chrome Beta 마일스톤 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 [V8 버전 6.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.4)의 새로운 브랜치를 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 Chrome 64 Stable과 함께 릴리즈될 때까지 베타 상태입니다. V8 v6.4는 개발자들에게 유용한 여러 기능들로 가득 차 있습니다. 이 게시물은 릴리즈를 앞두고 주요 내용을 미리 살펴봅니다.

<!--truncate-->
## 속도

V8 v6.4는 `instanceof` 연산자의 성능을 3.6배 [개선](https://bugs.chromium.org/p/v8/issues/detail?id=6971)했습니다. 그 결과, [uglify-js](http://lisperator.net/uglifyjs/)는 [V8 웹 도구 벤치마크](https://github.com/v8/web-tooling-benchmark)에 따르면 이제 15–20% 더 빨라졌습니다.

이번 릴리즈는 `Function.prototype.bind`의 성능 저하 문제도 해결했습니다. 예를 들어, TurboFan이 이제 모든 단형의 `bind` 호출을 [일관되게 인라인](https://bugs.chromium.org/p/v8/issues/detail?id=6946) 처리합니다. 또한, TurboFan은 _바운드 콜백 패턴_을 지원하며, 이제 다음과 같이:

```js
doSomething(callback, someObj);
```

다음처럼 사용할 수 있습니다:

```js
doSomething(callback.bind(someObj));
```

이 방법으로 코드는 더 읽기 쉬워지고 동일한 성능을 얻을 수 있습니다.

[Peter Wong](https://twitter.com/peterwmwong)의 기여 덕분에 [`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)과 [`WeakSet`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet)이 이제 [CodeStubAssembler](/blog/csa)를 사용하여 구현되어 전반적으로 최대 5배의 성능 향상을 가져왔습니다.

![](/_img/v8-release-64/weak-collection.svg)

V8의 배열 내장 함수 성능을 개선하기 위한 [지속적인 노력](https://bugs.chromium.org/p/v8/issues/detail?id=1956)의 일환으로, `Array.prototype.slice` 성능이 CodeStubAssembler를 사용하여 재구현되어 약 4배 향상되었습니다. 추가로, 많은 경우에서 `Array.prototype.map`과 `Array.prototype.filter`가 인라인 처리되어 수작업으로 작성된 버전과 경쟁력 있는 성능을 갖추게 되었습니다.

또한, 배열, 타이핑된 배열, 문자열에서 경계를 벗어난 로드가 [~10배의 성능 저하를 더 이상 초래하지 않도록 처리했](https://bugs.chromium.org/p/v8/issues/detail?id=7027)습니다. 이는 [이러한 코딩 패턴](/blog/elements-kinds#avoid-reading-beyond-length)이 실사용 사례에서 관찰되었기 때문입니다.

## 메모리

V8의 내장 코드 객체와 바이트코드 핸들러는 이제 스냅샷에서 지연해서 비직렬화되며, 이는 각 Isolate가 소비하는 메모리를 크게 줄일 수 있습니다. Chrome 벤치마크에 따르면 일반적인 사이트를 탐색할 때 탭당 수백 KB를 절약할 수 있음을 확인했습니다.

![](/_img/v8-release-64/codespace-consumption.svg)

내년 초 이 주제에 대한 전용 블로그 게시물을 기대하세요.

## ECMAScript 언어 기능

이번 V8 릴리즈에는 두 가지 흥미로운 새 정규 표현식 기능이 포함되어 있습니다.

유니코드 속성 이스케이프([Unicode property escapes](https://mathiasbynens.be/notes/es-unicode-property-escapes))가 `/u` 플래그를 가진 정규 표현식에서 기본적으로 활성화되었습니다.

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → true
```

정규 표현식에서 [명명된 캡처 그룹](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features#named_captures) 지원이 이제 기본적으로 활성화되었습니다.

```js
const pattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u;
const result = pattern.exec('2017-12-15');
// result.groups.year === '2017'
// result.groups.month === '12'
// result.groups.day === '15'
```

이 기능들에 대한 자세한 내용은 [다가오는 정규 표현식 기능](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features)이라는 블로그 게시물에서 확인할 수 있습니다.

[Groupon](https://twitter.com/GrouponEng)의 기여로, V8은 이제 [`import.meta`](https://github.com/tc39/proposal-import-meta)를 구현하여 현재 모듈에 대한 호스트 특정 메타데이터를 노출할 수 있게 했습니다. 예를 들어, Chrome 64는 `import.meta.url`을 통해 모듈 URL을 노출하며, Chrome은 앞으로 `import.meta`에 더 많은 속성을 추가할 계획입니다.

국제화 포매터로 생성된 문자열의 로컬 중심 서식을 도울 수 있도록, 개발자는 이제 [`Intl.NumberFormat.prototype.formatToParts()`](https://github.com/tc39/proposal-intl-formatToParts)를 사용하여 숫자를 토큰과 해당 유형 목록으로 포맷할 수 있습니다. 이는 [Igalia](https://twitter.com/igalia)의 V8 구현 덕분입니다!

## V8 API

`git log branch-heads/6.3..branch-heads/6.4 include/v8.h` 명령어를 사용하여 API 변경 사항 목록을 확인하세요.

[활성 V8 체크아웃](/docs/source-code#using-git)을 보유한 개발자는 `git checkout -b 6.4 -t branch-heads/6.4` 명령어를 사용하여 V8 v6.4의 새로운 기능을 실험해볼 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)에 구독하여 곧 새로운 기능을 직접 사용해볼 수 있습니다.
