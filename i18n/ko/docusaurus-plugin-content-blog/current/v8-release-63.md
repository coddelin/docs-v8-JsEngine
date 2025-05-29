---
title: "V8 릴리스 v6.3"
author: "V8 팀"
date: 2017-10-25 13:33:37
tags:
  - 릴리스
description: "V8 v6.3는 성능 개선, 메모리 소비 감소 및 새로운 JavaScript 언어 기능 지원을 포함합니다."
tweet: "923168001108643840"
---
6주마다 우리는 [릴리스 프로세스](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 Git 마스터에서 브랜치됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 6.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.3)를 발표하게 되어 기쁩니다. 이 브랜치는 몇 주 후 Chrome 63 안정 버전과 함께 릴리스될 때까지 베타 버전입니다. V8 v6.3는 다양한 개발자 친화적인 기능으로 가득 찼습니다. 이 글에서는 릴리스를 기대하며 주목할 만한 하이라이트를 미리 살펴봅니다.

<!--truncate-->
## 속도

[Jank Busters](/blog/jank-busters) III는 [Orinoco](/blog/orinoco) 프로젝트의 일환으로 출시되었습니다. 동시 마킹([70-80%](https://chromeperf.appspot.com/report?sid=612eec65c6f5c17528f9533349bad7b6f0020dba595d553b1ea6d7e7dcce9984)이 비차단 스레드에서 수행됨)이 제공됩니다.

파서가 이제 [함수를 두 번째로 미리 분석할 필요가 없습니다](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.un2pnqwbiw11). 이는 우리의 내부 Top25 시작 벤치마크에서 [14% 중간값 파싱 시간 개선](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.dvuo4tqnsmml)을 의미합니다.

`string.js`가 완전히 CodeStubAssembler로 포팅되었습니다. [peterwmwong](https://twitter.com/peterwmwong) 님께서 [그의 멋진 기여](https://chromium-review.googlesource.com/q/peter.wm.wong)에 대해 감사드립니다! 개발자로서 이는 `String#trim`과 같은 기본 제공 문자열 함수가 V8 v6.3부터 훨씬 더 빨라졌음을 의미합니다.

`Object.is()`의 성능은 이제 대체 옵션들과 거의 동일합니다. 일반적으로 V8 v6.3는 ES2015+ 성능 개선을 지속적으로 추구합니다. 기타 항목 외에 [다형적 심볼 액세스 속도](https://bugs.chromium.org/p/v8/issues/detail?id=6367), [다형적 생성자 호출 인라인 처리](https://bugs.chromium.org/p/v8/issues/detail?id=6885), [(태그된) 템플릿 리터럴](https://pasteboard.co/GLYc4gt.png) 속도를 향상시켰습니다.

![V8의 지난 6번 릴리스의 성능](/_img/v8-release-63/ares6.svg)

약화된 최적화 함수 목록은 제거되었습니다. 자세한 내용은 [전용 블로그 게시물](/blog/lazy-unlinking)에서 확인할 수 있습니다.

언급된 사항들은 속도 개선 사항들의 포괄적인 목록은 아닙니다. 많은 다른 성능 관련 작업도 이루어졌습니다.

## 메모리 소비

[쓰기 배리어가 CodeStubAssembler로 전환되었습니다](https://chromium.googlesource.com/v8/v8/+/dbfdd4f9e9741df0a541afdd7516a34304102ee8). 이로 인해 격리마다 약 100 KB의 메모리가 절약됩니다.

## JavaScript 언어 기능

V8는 이제 다음의 3단계 기능을 지원합니다: [동적 모듈 임포트 `import()`](/features/dynamic-import), [`Promise.prototype.finally()`](/features/promise-finally) 및 [비동기 반복자/생성자](https://github.com/tc39/proposal-async-iteration).

[동적 모듈 임포트](/features/dynamic-import)를 통해 런타임 조건에 따라 모듈을 매우 간단하게 임포트할 수 있습니다. 이는 애플리케이션이 특정 코드 모듈을 지연 로드해야 할 때 유용합니다.

[`Promise.prototype.finally`](/features/promise-finally)는 프로미스가 결정된 후 간단히 정리할 수 있는 방법을 도입합니다.

[비동기 반복자/생성자](https://github.com/tc39/proposal-async-iteration)의 도입으로 비동기 함수로 반복하는 작업이 더욱 원활해졌습니다.

`Intl` 측면에서, [`Intl.PluralRules`](/features/intl-pluralrules)가 이제 지원됩니다. 이 API는 성능 좋은 국제화된 복수화를 가능하게 합니다.

## 검사기/디버깅

Chrome 63에서는 [블록 범위](https://docs.google.com/presentation/d/1IFqqlQwJ0of3NuMvcOk-x4P_fpi1vJjnjGrhQCaJkH4/edit#slide=id.g271d6301ff_0_44)가 DevTools UI에서도 지원됩니다. 참고로 검사기 프로토콜은 이미 V8 v6.2부터 블록 범위를 지원합니다.

## V8 API

API 변경 사항에 대한 [요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인하세요. 이 문서는 주요 릴리스 몇 주 후에 정기적으로 업데이트됩니다.

활성 V8 체크아웃이 있는 개발자는 git checkout -b 6.3 -t branch-heads/6.3를 사용하여 V8 v6.3의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome 베타 채널](https://www.google.com/chrome/browser/beta.html)에 가입하여 곧 직접 새로운 기능을 확인할 수 있습니다.
