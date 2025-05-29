---
title: "V8 릴리즈 v7.7"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), 릴리즈 노트의 게으른 작성자"
avatars:
  - "mathias-bynens"
date: 2019-08-13 16:45:00
tags:
  - release
description: "V8 v7.7은 지연된 피드백 할당, 더 빠른 WebAssembly 백그라운드 컴파일, 스택 트레이스 개선 및 새로운 Intl.NumberFormat 기능을 제공한다."
tweet: "1161287541611323397"
---
6주마다 우리는 [릴리즈 프로세스](/docs/release-process)의 일환으로 새 V8 브랜치를 생성합니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 Git 마스터에서 브랜치됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 7.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.7)을 발표하게 되어 기쁩니다. 이 버전은 수 주 후에 Chrome 77 안정 버전과 함께 릴리즈될 때까지 베타 상태에 있습니다. V8 v7.7은 개발자에게 유용한 다양한 기능으로 가득 차 있습니다. 이 글은 릴리즈를 앞두고 주요 기능의 미리보기를 제공합니다.

<!--truncate-->
## 성능 (크기 및 속도)

### 지연된 피드백 할당

JavaScript를 최적화하기 위해 V8은 다양한 연산에 전달되는 피연산자의 타입에 대한 피드백을 수집합니다 (예: `+` 또는 `o.foo`). 이 피드백은 특정 타입에 맞게 연산을 최적화하는 데 사용됩니다. 이 정보는 “피드백 벡터”에 저장되며, 빠른 실행 시간을 달성하기 위해 매우 중요한 정보지만, 이러한 피드백 벡터를 할당하는 데 필요한 메모리 사용량도 비용을 지불하게 됩니다.

V8의 메모리 사용량을 줄이기 위해 이제 함수가 일정량의 바이트코드를 실행한 후에 피드백 벡터를 지연해서 할당합니다. 이는 수집된 피드백의 혜택을 받지 않는 단기간 실행되는 함수에 대해 피드백 벡터를 할당하지 않도록 합니다. 실험실 실험에서는 지연된 피드백 벡터를 할당함으로써 V8 힙 크기를 약 2–8% 절약할 수 있음을 보여주었습니다.

![](/_img/v8-release-77/lazy-feedback-allocation.svg)

실험 결과 실제 환경에서 V8 힙 크기가 데스크톱에서는 1–2%, 모바일 플랫폼에서는 5–6% 감소함을 보였습니다. 데스크톱에서는 성능 상의 퇴보가 없으며, 메모리가 제한된 저가형 휴대폰에서 실제로 성능 개선이 보였습니다. 메모리 절약을 위한 최근 작업에 대한 보다 자세한 블로그 게시물을 기대해 주세요.

### 확장 가능한 WebAssembly 백그라운드 컴파일

지난 마일스톤 동안 우리는 WebAssembly 백그라운드 컴파일의 확장성 작업을 진행했습니다. 컴퓨터의 코어가 많을수록 이 작업의 혜택이 더 커집니다. 아래 그래프는 24코어 Xeon 머신에서 [Epic ZenGarden 데모](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)를 컴파일하면서 작성되었습니다. 사용된 스레드 개수에 따라 컴파일 시간이 V8 v7.4와 비교하여 절반 이하로 줄어듭니다.

![](/_img/v8-release-77/liftoff-compilation-speedup.svg)

![](/_img/v8-release-77/turbofan-compilation-speedup.svg)

### 스택 트레이스 개선

V8에서 발생하는 거의 모든 오류는 생성될 때 스택 트레이스를 캡처합니다. 이 스택 트레이스는 비표준 `error.stack` 속성을 통해 JavaScript에서 접근할 수 있습니다. `error.stack`을 통해 처음으로 스택 트레이스를 검색하면, V8은 기본 구조화된 스택 트레이스를 문자열로 직렬화합니다. 직렬화된 스택 트레이스는 이후 `error.stack`의 접근 속도를 높이기 위해 보존됩니다.

최근 몇 버전 동안 우리는 [스택 트레이스 로직의 내부 리팩터링 작업](https://docs.google.com/document/d/1WIpwLgkIyeHqZBc9D3zDtWr7PL-m_cH6mfjvmoC6kSs/edit) ([추적 버그](https://bugs.chromium.org/p/v8/issues/detail?id=8742))를 진행하여, 코드를 간소화하고 스택 트레이스 직렬화 성능을 최대 30% 향상시켰습니다.

## JavaScript 언어 기능

[`Intl.NumberFormat` API](/features/intl-numberformat)는 로케일에 맞춘 숫자 포맷을 제공하며 이번 릴리즈에서 새로운 기능을 추가했습니다! 이제 축약 표기, 과학 표기, 공학 표기, 부호 표시 및 측정 단위를 지원합니다.

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
});
formatter.format(299792458);
// → '299,792,458 m/s'
```

[우리의 기능 설명서](/features/intl-numberformat)를 참고하여 자세한 내용을 확인하세요.

## V8 API

`git log branch-heads/7.6..branch-heads/7.7 include/v8.h` 명령을 사용하여 API 변경 사항 목록을 확인하세요.

[활성 V8 체크아웃](/docs/source-code#using-git)을 가진 개발자는 `git checkout -b 7.7 -t branch-heads/7.7` 명령을 사용하여 V8 v7.7의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널 구독](https://www.google.com/chrome/browser/beta.html)을 통해 곧 새로운 기능을 직접 사용해볼 수 있습니다.
