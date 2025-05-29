---
title: 'V8 릴리즈 v6.0'
author: 'V8 팀'
date: 2017-06-09 13:33:37
tags:
  - release
description: 'V8 v6.0은 여러 성능 개선 사항과 함께 SharedArrayBuffer 및 객체 rest/spread 속성에 대한 지원을 도입합니다.'
---
V8는 [릴리즈 프로세스](/docs/release-process)의 일환으로 6주마다 새로운 브랜치를 만듭니다. 각 버전은 Chrome Beta 마일스톤 직전에 V8 Git 마스터에서 분기됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 6.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.0)을 발표하게 되어 기쁩니다. 이 브랜치는 몇 주 이내에 Chrome 60 Stable과 함께 공개될 때까지 베타 상태로 유지됩니다. V8 6.0에는 다양한 개발자 중심의 기능들이 가득합니다. 릴리즈를 기대하며 주요 기능 몇 가지를 미리 소개해드리고자 합니다.

<!--truncate-->
## `SharedArrayBuffer`s

V8 v6.0은 JavaScript 워커 간의 메모리 공유 및 워커 간의 제어 흐름을 동기화하기 위한 저수준 메커니즘인 [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)를 지원합니다. SharedArrayBuffer는 JavaScript에서 공유 메모리, 원자성, futex에 대한 접근을 제공합니다. SharedArrayBuffer를 사용하면 asm.js 또는 WebAssembly를 통해 스레드 기반 애플리케이션을 웹에 포팅할 수 있는 가능성이 열립니다.

간단한 저수준 튜토리얼은 사양의 [튜토리얼 페이지](https://github.com/tc39/ecmascript_sharedmem/blob/master/TUTORIAL.md)를 참조하거나 pthreads를 포팅하기 위한 [Emscripten 문서](https://kripken.github.io/emscripten-site/docs/porting/pthreads.html)를 확인하세요.

## 객체 rest/spread 속성

이번 릴리즈는 객체 구조 분해 할당을 위한 rest 속성 및 객체 리터럴을 위한 spread 속성을 도입합니다. 객체 rest/spread 속성은 Stage 3 ES.next 기능입니다.

spread 속성은 많은 상황에서 `Object.assign()`에 대한 간결한 대안을 제공합니다.

```js
// 객체 구조 분해 할당을 위한 rest 속성:
const person = {
  firstName: 'Sebastian',
  lastName: 'Markbåge',
  country: 'USA',
  state: 'CA',
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Sebastian
console.log(lastName); // Markbåge
console.log(rest); // { country: 'USA', state: 'CA' }

// 객체 리터럴을 위한 spread 속성:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Sebastian', lastName: 'Markbåge', country: 'USA', state: 'CA' }
```

자세한 내용은 [객체 rest 및 spread 속성에 대한 설명서](/features/object-rest-spread)를 참조하세요.

## ES2015 성능

V8 v6.0은 ES2015 기능의 성능 개선을 계속 진행합니다. 이번 릴리즈는 언어 기능 구현 최적화가 포함되어 있으며, 이는 V8의 [ARES-6](http://browserbench.org/ARES-6/) 점수를 약 10% 향상시키는 결과를 제공합니다.

## V8 API

API 변경 사항 요약은 [여기](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)를 확인하세요. 이 문서는 주요 릴리즈 몇 주 후에 정기적으로 업데이트됩니다.

[활성 V8 체크아웃](/docs/source-code#using-git)을 보유한 개발자는 `git checkout -b 6.0 -t branch-heads/6.0`을 사용하여 V8 6.0에서 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)에 구독하여 곧 직접 새로운 기능을 사용해 볼 수 있습니다.
