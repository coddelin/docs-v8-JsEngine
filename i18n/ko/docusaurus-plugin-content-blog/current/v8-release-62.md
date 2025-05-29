---
title: "V8 릴리즈 v6.2"
author: "V8 팀"
date: 2017-09-11 13:33:37
tags:
  - 릴리즈
description: "V8 v6.2는 성능 개선, 더 많은 JavaScript 언어 기능, 증가된 최대 문자열 길이 등을 포함합니다."
---
6주마다 우리는 [릴리즈 프로세스](/docs/release-process)의 일부분으로 V8의 새 브랜치를 생성합니다. 각 버전은 Chrome 베타 이정표 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 새 브랜치인 [V8 버전 6.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.2)를 발표하게 되어 기쁩니다. 이것은 몇 주 뒤 Chrome 62 안정 버전과 함께 릴리즈될 때까지 베타 상태입니다. V8 v6.2는 개발자에게 유용한 다양한 기능으로 가득 차 있습니다. 이 글에서는 릴리즈를 기대하며 주요 내용을 미리 살펴봅니다.

<!--truncate-->
## 성능 개선

[`Object#toString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString)의 성능은 이전에 이미 잠재적 병목으로 식별되었으며, 이는 [lodash](https://lodash.com/), [underscore.js](http://underscorejs.org/) 같은 라이브러리 및 [AngularJS](https://angularjs.org/) 같은 프레임워크에서 자주 사용되기 때문입니다. [`_.isPlainObject`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isPlainObject.js#L13-L50), [`_.isDate`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isDate.js#L8-L25), [`angular.isArrayBuffer`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L739-L741), [`angular.isRegExp`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L680-L689) 등의 여러 헬퍼 함수는 런타임 타입 체크를 수행하기 위해 애플리케이션 및 라이브러리 코드에서 자주 사용됩니다.

ES2015가 등장하면서, 새로운 [`Symbol.toStringTag`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag) 심볼을 통해 `Object#toString`을 변경할 수 있게 되었으며, 이는 `Object#toString`을 더 무겁게 만들고 성능 향상을 더 어렵게 만들었습니다. 이번 릴리즈에서는 [SpiderMonkey JavaScript 엔진](https://bugzilla.mozilla.org/show_bug.cgi?id=1369042#c0)에 처음 구현된 최적화를 V8에 포팅하여 `Object#toString` 처리 속도를 **6.5배** 향상시켰습니다.

![](/_img/v8-release-62/perf.svg)

이는 Speedometer 브라우저 벤치마크 특히 AngularJS 하위 테스트에 영향을 미칩니다. 여기서 우리는 3%의 명확한 개선을 측정했습니다. 자세한 정보는 [세부 블로그 포스트](https://ponyfoo.com/articles/investigating-performance-object-prototype-to-string-es2015)를 읽어보세요.

![](/_img/v8-release-62/speedometer.svg)

또한 [ES2015 프록시](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)의 성능을 크게 개선하여 `someProxy(params)` 또는 `new SomeOtherProxy(params)`를 통해 프록시 객체를 호출하는 속도를 최대 **5배**로 향상시켰습니다:

![](/_img/v8-release-62/proxy-call-construct.svg)

마찬가지로, `someProxy.property`를 통해 프록시 객체에서 속성에 접근하는 성능도 거의 **6.5배** 향상되었습니다:

![](/_img/v8-release-62/proxy-property.svg)

현재 진행 중인 인턴십의 일환입니다. 더 자세한 블로그 포스트와 최종 결과를 기대해주세요.

[Peter Wong](https://twitter.com/peterwmwong)의 [기여](https://chromium-review.googlesource.com/c/v8/v8/+/620150) 덕분에 [`String#includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes) 내장 함수의 성능이 이전 릴리즈 이후에 **3배 이상** 향상된 점도 발표하게 되어 기쁩니다.

내부 해시 테이블의 Hashcode 조회는 훨씬 빨라져 `Map`, `Set`, `WeakMap`, `WeakSet`의 성능이 향상되었습니다. 곧 블로그 포스트에서 이 최적화에 대해 자세히 설명할 예정입니다.

![](/_img/v8-release-62/hashcode-lookups.png)

가비지 컬렉터는 이제 힙의 어린 세대를 수집하기 위해 [병렬 스캐벤저](https://bugs.chromium.org/p/chromium/issues/detail?id=738865)를 사용합니다.

## 저메모리 모드 강화

지난 몇 릴리즈 동안 V8의 저메모리 모드가 개선되었습니다(예: [초기 반공간 크기를 512 KB로 설정](https://chromium-review.googlesource.com/c/v8/v8/+/594387)). 이제 저메모리 장치가 메모리 부족 상황에 덜 직면하게 되었습니다. 이 저메모리 동작은 런타임 성능에 부정적인 영향을 미칠 수 있습니다.

## 더 많은 정규 표현식 기능

정규 표현식을 위해 [`dotAll` 모드](https://github.com/tc39/proposal-regexp-dotall-flag)를 사용하는 `s` 플래그 지원이 이제 기본적으로 활성화되었습니다. `dotAll` 모드에서는 정규 표현식의 `.` 원자가 줄 바꿈 문자 포함 모든 문자를 일치시킵니다.

```js
/foo.bar/su.test('foo\nbar'); // true
```

[Lookbehind assertions](https://github.com/tc39/proposal-regexp-lookbehind)이라는 새로운 정규 표현식 기능이 이제 기본적으로 사용할 수 있습니다. 이름만 봐도 그 의미를 잘 설명합니다. Lookbehind assertions는 lookbehind 그룹 패턴이 앞에 있는 경우에만 패턴을 매칭하게 하는 방법을 제공합니다. 이는 매칭과 비매칭 두 가지 변형으로 제공됩니다:

```js
/(?<=\$)\d+/.exec('$1 is worth about ¥123'); // ['1']
/(?<!\$)\d+/.exec('$1 is worth about ¥123'); // ['123']
```

이 기능들에 대한 자세한 내용은 [다가오는 정규 표현식 기능](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features)이라는 블로그 게시물에서 확인할 수 있습니다.

## 템플릿 리터럴 개정

템플릿 리터럴에서 이스케이프 시퀀스에 대한 제약이 [관련된 제안서](https://tc39.es/proposal-template-literal-revision/)에 따라 완화되었습니다. 이를 통해 LaTeX 프로세서와 같은 템플릿 태그의 새로운 사용 사례가 가능합니다.

```js
const latex = (strings) => {
  // …
};

const document = latex`
\newcommand{\fun}{\textbf{Fun!}}
\newcommand{\unicode}{\textbf{Unicode!}}
\newcommand{\xerxes}{\textbf{King!}}
Breve over the h goes \u{h}ere // Illegal token!
`;
```

## 최대 문자열 길이 증가

64비트 플랫폼에서 최대 문자열 길이가 `2**28 - 16`에서 `2**30 - 25` 문자로 증가했습니다.

## Full-codegen을 제거

V8 v6.2에서 오래된 파이프라인의 주요 부분이 제거되었습니다. 이번 릴리스에서는 3만 줄 이상의 코드가 삭제되었습니다 — 코드 복잡성을 줄이는 명백한 성과입니다.

## V8 API

[API 변경 요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인하세요. 이 문서는 주요 릴리스 몇 주 후에 정기적으로 업데이트됩니다.

[활성 V8 체크아웃](/docs/source-code#using-git)을 보유한 개발자는 `git checkout -b 6.2 -t branch-heads/6.2`를 사용하여 V8 v6.2의 새로운 기능을 실험해 볼 수 있습니다. 또는 [Chrome Beta 채널](https://www.google.com/chrome/browser/beta.html)을 구독하고 곧 새로운 기능을 직접 사용해볼 수 있습니다.
