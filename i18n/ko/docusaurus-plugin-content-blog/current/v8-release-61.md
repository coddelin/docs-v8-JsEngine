---
title: 'V8 릴리스 v6.1'
author: 'V8 팀'
date: 2017-08-03 13:33:37
tags:
  - 릴리스
description: 'V8 v6.1은 이진 파일 크기 감소와 성능 향상을 제공합니다. 또한, asm.js는 이제 WebAssembly로 검증되고 컴파일됩니다.'
---
6주마다 우리의 [릴리스 프로세스](/docs/release-process)의 일환으로 새로운 V8 브랜치를 만듭니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 Git master에서 브랜치가 생성됩니다. 오늘은 몇 주 후 Chrome 61 Stable과 함께 릴리스되는 V8의 최신 브랜치인 [V8 버전 6.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.1)의 베타 릴리스를 발표하게 되어 기쁩니다. V8 v6.1은 개발자들에게 유용한 다양한 기능들로 가득 차 있습니다. 릴리스를 기대하며 몇 가지 주요 사항들을 미리 소개하겠습니다.

<!--truncate-->
## 성능 향상

Maps와 Sets의 모든 요소를 [반복](http://exploringjs.com/es6/ch_iteration.html)하거나 [`Map.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach) / [`Set.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/forEach) 메서드를 통해 방문하는 작업이 V8 버전 6.0 이후 최대 11배 빠르게 향상되었습니다. 추가 정보는 [전용 블로그 게시물](https://benediktmeurer.de/2017/07/14/faster-collection-iterators/)을 참고하세요.

![](/_img/v8-release-61/iterating-collections.svg)

그 외에도 다른 언어 기능의 성능 향상이 계속 진행되었습니다. 예를 들어 [`Object.prototype.isPrototypeOf`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isPrototypeOf) 메서드는 주로 객체 리터럴과 `Object.create`를 사용하는 생성자 없는 코드에서 중요하며, 이제 항상 빠르고 종종 [`instanceof` 연산자](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof)를 사용하는 것보다 빠릅니다.

![](/_img/v8-release-61/checking-prototype.svg)

가변 개수의 인수를 사용하는 함수 호출 및 생성자 호출도 크게 빨라졌습니다. [`Reflect.apply`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply) 및 [`Reflect.construct`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct)으로 수행된 호출은 최신 버전에서 최대 17배 긍정적인 성능 향상을 받았습니다.

![](/_img/v8-release-61/call-construct.svg)

`Array.prototype.forEach`는 이제 TurboFan에서 인라인 처리되며 주요 비홀리 [요소 유형](/blog/elements-kinds)에 대해 최적화되었습니다.

## 이진 크기 감소

V8 팀은 더 이상 사용되지 않던 Crankshaft 컴파일러를 완전히 제거하여 이진 파일 크기를 크게 줄였습니다. 빌트인 제너레이터 제거와 함께 이 작업은 플랫폼에 따라 V8의 배포 이진 크기를 700KB 이상 감소시켰습니다.

## asm.js가 이제 WebAssembly로 검증 및 컴파일됩니다

V8이 asm.js 코드를 만나면 이제 이를 검증하려 시도하며, 유효한 asm.js 코드는 WebAssembly로 전환됩니다. V8의 성능 평가에 따르면 이는 일반적으로 처리량 성능을 향상시킵니다. 그러나 추가된 검증 단계로 인해 초기 성능에서의 고립된 저하가 발생할 수 있습니다.

이 기능은 Chromium 쪽에서만 기본적으로 활성화되었습니다. 임베더이며 asm.js 검증기를 활용하려면 `--validate-asm` 플래그를 활성화하세요.

## WebAssembly

WebAssembly를 디버깅할 때 이제 DevTools에서 WebAssembly 코드에서 중단점이 발생하면 지역 변수를 표시할 수 있습니다.

## V8 API

[API 변경 요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인하세요. 이 문서는 각 주요 릴리스 몇 주 후에 정기적으로 업데이트됩니다.

[활성 V8 체크아웃](/docs/source-code#using-git)을 가진 개발자는 `git checkout -b 6.1 -t branch-heads/6.1` 명령을 사용하여 V8 v6.1의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)을 구독하여 새 기능을 직접 곧 경험할 수 있습니다.
