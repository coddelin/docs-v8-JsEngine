---
title: "V8 릴리스 v8.7"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), V8 담당자"
avatars:
 - "ingvar-stepanyan"
date: 2020-10-23
tags:
 - release
description: "V8 릴리스 v8.7은 네이티브 호출을 위한 새로운 API, Atomics.waitAsync, 버그 수정 및 성능 개선을 제공합니다."
tweet: "1319654229863182338"
---
매 6주마다 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 V8의 Git 마스터에서 Chrome 베타 마일스톤 직전에 브랜칭됩니다. 오늘은 [V8 버전 8.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.7) 브랜치를 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 Chrome 87 Stable과 함께 출시될 때까지 베타 상태에 있습니다. V8 v8.7에는 다양한 종류의 개발자에게 제공하는 유용한 기능들이 포함되어 있습니다. 이번 게시물에서는 이 릴리스를 앞두고 하이라이트를 간략히 살펴봅니다.

<!--truncate-->
## 자바스크립트

### 안전하지 않은 빠른 JS 호출

V8 v8.7은 자바스크립트에서 네이티브 호출을 수행하기 위한 향상된 API를 제공합니다.

이 기능은 아직 실험 단계에 있으며 V8의 `--turbo-fast-api-calls` 플래그나 Chrome의 `--enable-unsafe-fast-js-calls` 플래그를 통해 활성화할 수 있습니다. 이 기능은 Chrome의 일부 네이티브 그래픽 API 성능을 향상시키도록 설계되었으나, 다른 임베더에서도 사용할 수 있습니다. 개발자가 `v8::FunctionTemplate`의 인스턴스를 생성할 수 있는 새로운 방법을 제공하며, 이는 [헤더 파일](https://source.chromium.org/chromium/chromium/src/+/master:v8/include/v8-fast-api-calls.h)에 문서화되어 있습니다. 기존 API를 사용해 생성된 함수에는 영향을 미치지 않습니다.

자세한 정보와 사용 가능한 기능 목록은 [이 설명서](https://docs.google.com/document/d/1nK6oW11arlRb7AA76lJqrBIygqjgdc92aXUPYecc9dU/edit?usp=sharing)를 참고하세요.

### `Atomics.waitAsync`

[`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md)가 이제 V8 v8.7에서 사용할 수 있습니다.

[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait)와 [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify)는 뮤텍스와 기타 동기화 방법을 구현하는 데 유용한 저수준 동기화 원시기능입니다. 하지만 `Atomics.wait`는 블로킹 방식이기 때문에 메인 스레드에서 호출할 수 없으며, 이를 시도하면 TypeError가 발생합니다. 비블로킹 버전인 [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md)는 메인 스레드에서도 사용할 수 있습니다.

`Atomics` API에 대한 자세한 설명은 [우리의 설명서](https://v8.dev/features/atomics)를 확인하세요.

## V8 API

`git log branch-heads/8.6..branch-heads/8.7 include/v8.h`를 사용하여 API 변경 목록을 확인하세요.

활성화된 V8 체크아웃을 보유한 개발자는 `git checkout -b 8.7 -t branch-heads/8.7`를 사용해 V8 v8.7의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome 베타 채널 구독](https://www.google.com/chrome/browser/beta.html)을 통해 곧 새로운 기능을 직접 체험할 수 있습니다.
