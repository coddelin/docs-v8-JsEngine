---
title: "V8 릴리스 v5.0"
author: "V8 팀"
date: "2016-03-15 13:33:37"
tags: 
  - 릴리스
description: "V8 v5.0은 성능 향상을 제공하며 여러 새로운 ES2015 언어 기능을 지원합니다."
---
V8 [릴리스 프로세스](/docs/release-process)의 첫 번째 단계는 크롬 베타 마일스톤을 위해 Chromium이 분기하기 직전에 Git 마스터에서 새 브랜치를 만드는 것입니다(약 6주마다). 우리의 최신 릴리스 브랜치는 [V8 v5.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.0)이며, 이 브랜치는 Chrome 50 Stable과 함께 안정적인 빌드를 릴리스하기 전까지 베타 상태를 유지합니다. 이번 V8 버전에서 새롭게 개발자에게 제공되는 기능을 강조하여 소개합니다.

<!--truncate-->
:::note
**참고:** 버전 번호 5.0은 의미론적 중요성을 가지거나 주요 릴리스를 나타내지는 않습니다(소형 릴리스와 대조적으로).
:::

## 개선된 ECMAScript 2015 (ES6) 지원

V8 v5.0은 정규 표현식(regex) 매칭과 관련된 여러 ES2015 기능을 포함합니다.

### RegExp Unicode 플래그

[RegExp Unicode 플래그](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Parameters), `u`는 정규 표현식 매칭을 위한 새로운 유니코드 모드를 활성화합니다. Unicode 플래그는 패턴과 regex 문자열을 Unicode 코드포인트의 시리즈로 취급합니다. 또한 Unicode 코드포인트 이스케이프 구문을 노출합니다.

```js
/😊{2}/.test('😊😊');
// false

/😊{2}/u.test('😊😊');
// true

/\u{76}\u{38}/u.test('v8');
// true

/\u{1F60A}/u.test('😊');
// true
```

`u` 플래그는 `.` 원자(단일 문자 매칭기라 불림)가 기본 다국어 평면(BMP)에 있는 문자뿐만 아니라 모든 유니코드 기호를 매칭하도록 합니다.

```js
const string = 'the 🅛 train';

/the\s.\strain/.test(string);
// false

/the\s.\strain/u.test(string);
// true
```

### RegExp 사용자 정의 훅

ES2015는 RegExp의 서브클래스를 위한 매칭 의미를 변경하기 위한 훅을 포함하고 있습니다. 서브클래스는 `Symbol.match`, `Symbol.replace`, `Symbol.search`, 및 `Symbol.split`이라는 이름의 메서드를 재정의하여 `String.prototype.match`와 유사한 메서드에 관한 RegExp 서브클래스의 동작을 변경할 수 있습니다.

## ES2015 및 ES5 기능 성능 향상

릴리스 5.0은 이미 구현된 ES2015 및 ES5 기능에 몇 가지 주목할 만한 성능 향상을 제공합니다.

rest 매개변수 구현은 이전 릴리스보다 8-10배 빠르며, 함수 호출 후 많은 수의 인수를 하나의 배열로 수집하는 작업이 더 효율적입니다. 객체의 열거 가능한 속성을 `for`-`in`과 동일한 순서로 반복하는 데 유용한 `Object.keys`는 이제 약 2배 빠릅니다.

## V8 API

API 변경 사항에 대한 [요약을 확인하십시오](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). 이 문서는 각 주요 릴리스 후 몇 주 간격으로 정기적으로 업데이트됩니다.

[활성화된 V8 체크아웃](https://v8.dev/docs/source-code#using-git)을 사용하는 개발자는 `git checkout -b 5.0 -t branch-heads/5.0`를 사용하여 V8 5.0의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널에 구독](https://www.google.com/chrome/browser/beta.html)하여 곧 직접 새로운 기능을 시험해 볼 수 있습니다.
