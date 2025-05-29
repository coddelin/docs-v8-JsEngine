---
title: "V8 릴리스 v5.7"
author: "V8 팀"
date: 2017-02-06 13:33:37
tags:
  - 릴리스
description: "V8 v5.7은 기본적으로 WebAssembly를 활성화하고, 성능 향상과 ECMAScript 언어 기능 지원을 강화했습니다."
---
매 6주마다, 우리는 [릴리스 프로세스](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 Git master에서 브랜칭됩니다. 오늘 우리는 [V8 버전 5.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.7)의 출시를 발표하게 되어 기쁩니다. 이 버전은 Chrome 57 안정 버전과 함께 몇 주 후 출시될 때까지 베타 단계에 있습니다. V8 5.7은 개발자들에게 많은 혜택을 제공합니다. 출시를 기대하며 몇 가지 주요 사항을 미리 소개하고자 합니다.

<!--truncate-->
## 성능 향상

### 네이티브 비동기 함수가 Promise만큼 빠릅니다

비동기 함수는 이제 Promise로 작성된 동일한 코드와 거의 동일한 속도로 실행됩니다. [마이크로 벤치마크](https://codereview.chromium.org/2577393002)에 따르면, 비동기 함수의 실행 성능이 4배 향상되었습니다. 같은 기간 동안 Promise의 전체 성능도 두 배로 증가했습니다.

![Linux x64에서 V8의 비동기 성능 향상](/_img/v8-release-57/async.png)

### 지속적인 ES2015 성능 향상

V8은 개발자가 성능 비용 없이 새로운 기능을 사용할 수 있도록 ES2015 언어 기능을 더 빠르게 개선하고 있습니다. 스프레드 연산자, 구조 분해 할당, 제너레이터는 이제 [기본 ES5 동등체만큼 빠릅니다](https://fhinkel.github.io/six-speed/).

### RegExp 15% 더 빠릅니다

RegExp 함수를 자체 호스팅된 JavaScript 구현에서 TurboFan의 코드 생성 아키텍처에 연결된 구현으로 마이그레이션함으로써 RegExp 전반적인 성능이 약 15% 향상되었습니다. 자세한 내용은 [전용 블로그 게시물](/blog/speeding-up-regular-expressions)에서 확인할 수 있습니다.

## JavaScript 언어 기능

ECMAScript 표준 라이브러리에 대한 몇 가지 최근 추가 기능이 이번 릴리스에 포함되었습니다. 두 가지 String 메서드인 [`padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart)와 [`padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd)는 유용한 문자열 서식 기능을 제공하며, [`Intl.DateTimeFormat.prototype.formatToParts`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts)는 작성자가 로케일에 따라 날짜/시간 서식을 사용자 지정할 수 있도록 합니다.

## WebAssembly 활성화

Chrome 57(V8 v5.7 포함)은 기본적으로 WebAssembly를 활성화한 첫 번째 릴리스가 될 것입니다. 자세한 내용은 [webassembly.org](http://webassembly.org/)의 시작 문서와 [MDN](https://developer.mozilla.org/en-US/docs/WebAssembly/API)의 API 문서를 참조하세요.

## V8 API 추가

[API 변경 요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인하세요. 이 문서는 각 주요 릴리스 후 몇 주간 정기적으로 업데이트됩니다. [활성 V8 체크아웃](/docs/source-code#using-git)을 가진 개발자는 `git checkout -b 5.7 -t branch-heads/5.7`을 사용하여 V8 v5.7의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)에 가입하고 곧 새로운 기능을 직접 시도할 수 있습니다.

### `PromiseHook`

이 C++ API는 사용자가 Promise의 수명 주기를 추적하는 프로파일링 코드를 구현할 수 있도록 합니다. 이는 노드의 [AsyncHook API](https://github.com/nodejs/node-eps/pull/18)를 활성화하여 [비동기 컨텍스트 전파](https://docs.google.com/document/d/1tlQ0R6wQFGqCS5KeIw0ddoLbaSYx6aU7vyXOkv-wvlM/edit#)를 구축할 수 있도록 합니다.

`PromiseHook` API는 네 가지 수명 주기 훅을 제공합니다: 초기화(init), 해결(resolve), 사전(before), 사후(after). 초기화 훅은 새 Promise가 생성될 때 실행되며, 해결 훅은 Promise가 해결될 때 실행됩니다. 사전 & 사후 훅은 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) 바로 전과 후에 실행됩니다. 자세한 내용은 [트래킹 이슈](https://bugs.chromium.org/p/v8/issues/detail?id=4643)와 [설계 문서](https://docs.google.com/document/d/1rda3yKGHimKIhg5YeoAmCOtyURgsbTH_qaYR79FELlk/edit)를 확인하세요.
