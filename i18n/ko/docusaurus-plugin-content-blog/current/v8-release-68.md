---
title: &apos;V8 릴리스 v6.8&apos;
author: &apos;V8 팀&apos;
date: 2018-06-21 13:33:37
tags:
  - 릴리스
description: &apos;V8 v6.8은 메모리 소비를 줄이고 여러 성능 개선을 제공합니다.&apos;
tweet: &apos;1009753739060826112&apos;
---
6주마다 저희는 [릴리스 프로세스](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8 Git 마스터에서 브랜치됩니다. 오늘 저희는 새로운 브랜치인 [V8 버전 6.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.8)을 발표하게 되어 기쁩니다. 이 브랜치는 몇 주 후 Chrome 68 Stable과 조정되어 릴리스되기 전까지 베타 상태입니다. V8 v6.8에는 개발자에게 유용한 여러 기능이 추가되었습니다. 이번 포스트에서는 릴리스를 기대하며 몇 가지 주요 사항을 미리 살펴보겠습니다.

<!--truncate-->
## 메모리

JavaScript 함수는 필요 없이 외부 함수와 그 메타데이터(이른바 `SharedFunctionInfo` 또는 `SFI`)를 유지했습니다. 특히, 일시적으로 사용되는 IIFE를 자주 사용하는 함수 중심 코드에서는 이러한 현상이 메모리 누수를 유발할 수 있었습니다. 이 변경 전에는 활성 `Context`(즉, 함수 활성화의 힙 표현)가 `SFI`를 활성화한 함수를 유지했습니다:

![](/_img/v8-release-68/context-jsfunction-before.svg)

`Context`가 디버깅에 필요한 축소된 정보를 포함하는 `ScopeInfo` 객체를 가리키도록 하면 `SFI`와의 종속성을 끊을 수 있습니다.

![](/_img/v8-release-68/context-jsfunction-after.svg)

우리는 상위 10개 페이지 세트에 대해 모바일 장치에서 V8 메모리가 3% 개선된 것을 이미 관찰했습니다.

동시에 `SFI` 자체의 메모리 소비를 줄여 불필요한 필드를 제거하거나 가능한 경우 압축하여 크기를 약 25% 줄였으며, 향후 릴리스에서 추가 감소를 계획하고 있습니다. `SFI`는 일반적인 웹사이트에서 Context에서 분리된 후에도 V8 메모리의 2–6%를 차지했으므로, 많은 함수가 포함된 코드에서 메모리 개선을 관찰할 수 있을 것입니다.

## 성능

### 배열 구조 분해 개선

최적화된 컴파일러는 배열 구조 분해에 대해 이상적인 코드를 생성하지 못했습니다. 예를 들어, `[a, b] = [b, a]`를 사용하여 변수를 교환하는 것이 `const tmp = a; a = b; b = tmp`보다 두 배 더 느렸습니다. 모든 임시 할당을 제거하기 위해 escape 분석을 차단 해제한 후, 임시 배열을 사용하는 배열 구조 분해는 할당 시퀀스만큼 빠르게 작동합니다.

### `Object.assign` 개선

`Object.assign`은 지금까지 C++로 작성된 빠른 경로를 갖고 있었습니다. 이는 각 `Object.assign` 호출마다 JavaScript에서 C++로 경계를 넘나들어야 한다는 것을 의미합니다. 내장된 성능을 개선하는 명백한 방법은 JavaScript 측에서 빠른 경로를 구현하는 것이었습니다. 우리는 두 가지 옵션이 있었는데, 하나는 네이티브 JS 내장 함수로 구현하는 것이고(이 경우 불필요한 오버헤드가 따릅니다), 다른 하나는 [CodeStubAssembler 기술](/blog/csa)을 사용하여 구현하는 것이었습니다(더 많은 유연성을 제공합니다). 우리는 후자의 솔루션을 선택했습니다. 새로운 `Object.assign` 구현은 [Speedometer2/React-Redux 점수를 약 15% 개선시키며 Speedometer 2 전체 점수를 1.5% 향상시켰습니다](https://chromeperf.appspot.com/report?sid=d9ea9a2ae7cd141263fde07ea90da835cf28f5c87f17b53ba801d4ac30979558&start_rev=550155&end_rev=552590).

### `TypedArray.prototype.sort` 개선

`TypedArray.prototype.sort`는 사용자가 비교 함수를 제공하지 않을 때 사용하는 빠른 경로와 그 외의 경우를 위한 느린 경로를 가지고 있습니다. 지금까지 느린 경로는 `Array.prototype.sort`의 구현을 재사용했으며, 이는 `TypedArray`를 정렬하는 데 필요한 것보다 더 많은 작업을 수행했습니다. V8 v6.8은 [CodeStubAssembler](/blog/csa)를 사용하여 느린 경로를 대체합니다. (직접적으로 CodeStubAssembler가 아니라 그 위에 구축된 도메인 특화 언어를 사용).

비교 함수 없이 `TypedArray`를 정렬하는 성능은 동일하며, 비교 함수를 사용하여 정렬할 때 최대 2.5× 속도 향상이 있습니다.

![](/_img/v8-release-68/typedarray-sort.svg)

## WebAssembly

V8 v6.8에서는 Linux x64 플랫폼에서 [트랩 기반 경계 검사](https://docs.google.com/document/d/17y4kxuHFrVxAiuCP_FFtFA2HP5sNPsCD10KEx17Hz6M/edit)를 사용할 수 있습니다. 이 메모리 관리 최적화는 WebAssembly 실행 속도를 크게 향상시킵니다. 이는 이미 Chrome 68에서 사용되고 있으며, 앞으로 더 많은 플랫폼이 점진적으로 지원될 예정입니다.

## V8 API

`git log branch-heads/6.7..branch-heads/6.8 include/v8.h`를 사용하여 API 변경 목록을 확인하십시오.

[활성 V8 체크아웃](/docs/source-code#using-git)을 보유한 개발자는 `git checkout -b 6.8 -t branch-heads/6.8`를 사용하여 V8 v6.8의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널에 구독](https://www.google.com/chrome/browser/beta.html)하여 곧 직접 새로운 기능을 시도해 볼 수 있습니다.
