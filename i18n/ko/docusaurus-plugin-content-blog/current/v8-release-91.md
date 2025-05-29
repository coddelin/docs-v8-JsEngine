---
title: "V8 릴리스 v9.1"
author: "인그바르 스테파냔 ([@RReverser](https://twitter.com/RReverser)), 나만의 브랜드를 테스트 중"
avatars: 
 - "ingvar-stepanyan"
date: 2021-05-04
tags: 
 - 릴리스
description: "V8 릴리스 v9.1은 비공개 브랜드 검사 지원, 기본 활성화된 최상위 await 및 성능 개선을 제공합니다."
tweet: "1389613320953532417"
---
매 6주마다 우리는 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome Beta 마일스톤 바로 이전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 새로운 브랜치 [V8 버전 9.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.1)을 발표하게 되어 기쁩니다. 이는 몇 주 후 Chrome 91 Stable과 조율하여 릴리스될 때까지 베타 상태입니다. V8 v9.1에는 개발자들이 즐길 수 있는 다양한 기능들이 포함되어 있습니다. 이 게시물은 릴리스를 기대하며 몇 가지 주요 사항들을 미리 살펴봅니다.

<!--truncate-->
## 자바스크립트

### `FastTemplateCache` 개선

v8 API는 embedder가 새 인스턴스를 생성할 수 있는 `Template` 인터페이스를 제공합니다.

새 객체 인스턴스를 생성하고 구성하는 데에는 여러 단계가 필요하기 때문에 기존 객체를 복제하는 것이 더 빠른 경우가 많습니다. V8은 템플릿 기반으로 생성된 객체를 조회하고 이를 직접 복제하기 위해 두 단계 캐시 전략(작고 빠른 배열 캐시와 크고 느린 딕셔너리 캐시)을 사용합니다.

이전에는 템플릿이 생성될 때 캐시 인덱스가 할당되었으나 캐시에 삽입될 때가 아닌 시점에 할당되었습니다. 이는 빠른 배열 캐시가 한 번도 인스턴스화되지 않은 템플릿에 예약된다는 문제를 일으켰습니다. 이를 수정함으로써 Speedometer2-FlightJS 벤치마크에서 4.5%의 향상을 이루었습니다.

### 최상위 `await`

[최상위 `await`](https://v8.dev/features/top-level-await)은 V8 v9.1부터 기본적으로 활성화되며 `--harmony-top-level-await` 없이도 사용할 수 있습니다.

참고로, [Blink 렌더링 엔진](https://www.chromium.org/blink)에서는 최상위 `await`이 이미 버전 89부터 [기본 활성화](https://v8.dev/blog/v8-release-89#top-level-await)되었습니다.

이 기능이 활성화되면서 `v8::Module::Evaluate`는 항상 완성 값을 대신하여 `v8::Promise` 객체를 반환하게 됩니다. 모듈 평가가 성공하면 `Promise`는 완성 값으로 해결되고, 실패하면 오류로 거부됩니다. 평가된 모듈이 비동기적이지 않거나(즉, 최상위 `await`을 포함하지 않거나), 비동기적 종속성이 없는 경우 반환된 `Promise`는 충족되거나 거부됩니다. 그렇지 않은 경우 반환된 `Promise`는 보류 상태가 됩니다.

자세한 내용은 [우리의 설명서](https://v8.dev/features/top-level-await)를 참조하세요.

### 비공개 브랜드 확인, 즉 `#foo in obj`

비공개 브랜드 확인 문법은 더 이상 `--harmony-private-brand-checks` 없이도 v9.1에서 기본적으로 활성화됩니다. 이 기능은 [`in` 연산자](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in) 기능을 확장하여, 아래의 예시와 같이 비공개 필드의 `#`-이름에서도 작동할 수 있게 합니다.

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }

  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false
```

더 깊이 알아보려면 [우리의 설명서](https://v8.dev/features/private-brand-checks)를 꼭 확인하세요.

### 짧은 내장 함수 호출

이번 릴리스에서는 임베디드된 내장 함수를 취소(즉, [임베디드된 함수](https://v8.dev/blog/embedded-builtins)를 해제)하여 64비트 데스크톱에서 일시적으로 사용 가능합니다. 해당 머신에서 임베디드 해제를 통해 얻는 성능 이점이 메모리 비용보다 큽니다. 이는 아키텍처뿐 아니라 마이크로 아키텍처 세부 사항 때문입니다.

자세한 내용은 곧 별도의 블로그 게시물로 공개할 예정입니다.

## V8 API

`git log branch-heads/9.0..branch-heads/9.1 include/v8.h`를 사용하여 API 변경 사항 목록을 가져오세요.

활성화된 V8 체크아웃을 사용하는 개발자는 `git checkout -b 9.1 -t branch-heads/9.1`을 통해 V8 v9.1의 새로운 기능을 실험해볼 수 있습니다. 또는 [Chrome의 베타 채널에 구독](https://www.google.com/chrome/browser/beta.html)하여 새로운 기능을 곧 직접 체험할 수 있습니다.
