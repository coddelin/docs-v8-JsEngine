---
title: 'V8 릴리스 v8.9'
author: '인그바르 스테파냔 ([@RReverser](https://twitter.com/RReverser)), 대기 중인 호출'
avatars:
 - 'ingvar-stepanyan'
date: 2021-02-04
tags:
 - release
description: 'V8 릴리스 v8.9는 인수 크기 불일치로 인한 호출 성능을 개선합니다.'
tweet: '1357358418902802434'
---
매 6주마다 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 Git 마스터에서 브랜칭됩니다. 오늘 우리는 새로운 브랜치인 [V8 버전 8.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.9)를 발표하게 되어 기쁩니다. 이는 몇 주 후 Chrome 89 Stable과 함께 출시될 때까지 베타 상태로 유지됩니다. V8 v8.9는 개발자들에게 다양한 이점을 제공합니다. 이번 포스트에서는 릴리스를 앞두고 몇 가지 주요 기능을 미리 소개합니다.

<!--truncate-->
## 자바스크립트

### 최상위 `await`

[최상위 `await`](https://v8.dev/features/top-level-await)이 V8의 주요 삽입기인 [Blink 렌더링 엔진](https://www.chromium.org/blink) 89에서 사용할 수 있습니다.

독립형 V8에서는 최상위 `await`가 여전히 `--harmony-top-level-await` 플래그 뒤에 숨겨져 있습니다.

자세한 내용은 [설명서](https://v8.dev/features/top-level-await)를 참조하세요.

## 성능

### 인수 크기 불일치가 있는 호출의 가속화

JavaScript는 함수 호출 시 매개변수의 예상 개수와 다른 인수를 전달할 수 있습니다. 즉, 하나는 선언된 형식 매개변수보다 더 적거나 많은 인수를 전달할 수 있습니다. 전자는 '적용 부족'이라고 하고 후자는 '과잉 적용'이라고 합니다.

적용 부족의 경우, 남은 매개변수는 `undefined` 값으로 할당됩니다. 과잉 적용의 경우 나머지 인수는 나머지 매개변수와 `Function.prototype.arguments` 속성을 사용하여 액세스할 수 있거나 단순히 여분으로 무시됩니다. 요즘 많은 웹 및 Node.js 프레임워크는 이 JS 기능을 사용하여 선택적 매개변수를 수락하고 더 유연한 API를 생성합니다.

최근까지 V8은 인수 크기 불일치 문제를 처리하기 위해 '인수 어댑터 프레임' 이라는 특별한 메커니즘을 사용했습니다. 불행히도, 인수 적응은 성능 비용이 발생하며 이는 현대 프론트엔드 및 미들웨어 프레임워크에서 자주 필요합니다. 그러나 스택에서 인수 순서를 반대로 바꾸는 것과 같은 영리한 설계를 통해 우리는 이 추가 프레임을 제거하고 V8 코드베이스를 단순화하며 이러한 오버헤드를 거의 완전히 없앨 수 있었습니다.

![마이크로 벤치마크를 통해 측정된 인수 어댑터 프레임 제거의 성능 영향.](/_img/v8-release-89/perf.svg)

그래프는 [JIT-less 모드](https://v8.dev/blog/jitless) (Ignition)에서 실행할 때 11.2% 성능 향상이 있으며 오버헤드가 더 이상 없음을 보여줍니다. TurboFan을 사용할 때 최대 40% 속도 향상을 얻을 수 있습니다. 불일치가 없는 경우와 비교한 오버헤드는 [함수 에필로그](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/x64/code-generator-x64.cc;l=4905;drc=5056f555010448570f7722708aafa4e55e1ad052)의 소규모 최적화로 인한 것입니다. 자세한 내용은 [설계 문서](https://docs.google.com/document/d/15SQV4xOhD3K0omGJKM-Nn8QEaskH7Ir1VYJb9_5SjuM/edit)를 참조하세요.

이러한 개선 사항 뒤의 세부 사항에 대해 더 알고 싶다면 [전용 블로그 게시물](https://v8.dev/blog/adaptor-frame)을 확인하세요.

## V8 API

`git log branch-heads/8.8..branch-heads/8.9 include/v8.h` 명령을 사용하여 API 변경 사항 목록을 확인하세요.

활성 V8 체크아웃을 가진 개발자는 `git checkout -b 8.9 -t branch-heads/8.9`로 V8 v8.9의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)에 가입하여 새로운 기능을 곧 직접 사용해볼 수 있습니다.
