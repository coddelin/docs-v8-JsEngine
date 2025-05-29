---
title: 'V8 릴리스 v9.3'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
avatars:
 - 'ingvar-stepanyan'
date: 2021-08-09
tags:
 - release
description: 'V8 릴리스 v9.3에는 Object.hasOwn 및 Error 원인 지원이 추가되었으며, 컴파일 성능이 향상되고 Android에서 신뢰할 수 없는 코드 생성을 방지하는 완화 기능이 비활성화되었습니다.'
tweet: ''
---
매 6주마다 우리는 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새 브랜치를 만듭니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 주요 Git 브랜치에서 분기됩니다. 오늘 우리는 V8 버전 9.3 ([링크](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.3)) 라는 최신 브랜치를 기쁜 마음으로 발표합니다. 이는 몇 주 후 Chrome 93 Stable과 함께 릴리스될 때까지 베타 상태입니다. V8 v9.3은 개발자 친화적인 다양한 기능들로 가득합니다. 이 게시물은 릴리스를 기대하며 몇 가지 주요 내용을 미리 살펴봅니다.

<!--truncate-->
## JavaScript

### Sparkplug 일괄 컴파일

v9.1에서 매우 빠른 중간 계층 JIT 컴파일러 [Sparkplug](https://v8.dev/blog/sparkplug)를 출시했습니다. 보안상의 이유로 V8은 생성하는 코드 메모리를 [쓰기 보호](https://en.wikipedia.org/wiki/W%5EX)하여 컴파일 중 쓰기 가능에서 실행 가능으로 권한을 변경해야 합니다. 이는 현재 `mprotect` 호출을 사용하여 구현됩니다. 그러나 Sparkplug는 매우 빠르게 코드를 생성하기 때문에, 개별 컴파일된 함수에 대해 `mprotect`를 호출하는 비용이 컴파일 시간의 주요 병목 현상이 되었습니다. V8 v9.3에서는 Sparkplug에 대해 일괄 컴파일을 도입합니다: 각 함수를 개별적으로 컴파일하는 대신, 여러 함수를 한 번에 컴파일합니다. 이를 통해 메모리 페이지 권한을 전환하는 비용을 일괄 처리당 한 번만 발생하도록 최소화합니다.

일괄 컴파일은 JavaScript 실행 성능에 영향을 미치지 않으면서 전체 컴파일 시간(Ignition + Sparkplug)을 최대 44%까지 줄였습니다. Sparkplug 코드 컴파일 비용만 고려하면 영향은 더 큽니다. 예를 들어, Win 10 기준으로 `docs_scrolling` 벤치마크(아래 참조)에서는 82% 감소했습니다. 놀랍게도, 일괄 컴파일은 유사한 작업을 묶는 것이 CPU에 유리하기 때문에 W^X 비용 이상으로 컴파일 성능을 향상시켰습니다. 아래 차트에서 컴파일 시간(Ignition + Sparkplug)에 대한 W^X의 영향을 확인할 수 있으며, 일괄 컴파일이 이 오버헤드를 얼마나 잘 완화했는지도 보여줍니다.

![벤치마크](/_img/v8-release-93/sparkplug.svg)

### `Object.hasOwn`

`Object.hasOwn`은 `Object.prototype.hasOwnProperty.call`에 대한 더 쉽게 접근할 수 있는 별칭입니다.

예를 들어:

```javascript
Object.hasOwn({ prop: 42 }, 'prop')
// → true
```

좀 더 상세한 내용은 [기능 설명서](https://v8.dev/features/object-has-own)에서 확인할 수 있습니다.

### 오류 원인

v9.3부터 다양한 내장 `Error` 생성자는 두 번째 매개변수로 `cause` 속성을 가진 옵션 백을 허용하도록 확장되었습니다. 이 옵션 백이 전달되면, `cause` 속성 값이 `Error` 인스턴스의 독자적인 속성으로 등록됩니다. 이를 통해 표준화된 오류 체인링 방법을 제공합니다.

예를 들어:

```javascript
const parentError = new Error('parent');
const error = new Error('parent', { cause: parentError });
console.log(error.cause === parentError);
// → true
```

더 자세한 내용은 [기능 설명서](https://v8.dev/features/error-cause)를 참조하십시오.

## Android에서 비신뢰 코드 완화 비활성화

3년 전, 우리는 Spectre 공격에 대한 방어를 위해 일련의 [코드 생성 완화](https://v8.dev/blog/spectre)를 도입했습니다. 이것은 일시적 대책으로, [Spectre](https://spectreattack.com/spectre.pdf) 공격에 대해 부분적인 보호만 제공함을 항상 인지하고 있었습니다. 유일한 효과적인 보호는 [사이트 격리](https://blog.chromium.org/2021/03/mitigating-side-channel-attacks.html)를 통해 웹사이트를 격리하는 것입니다. 데스크톱 장치에서 Chrome에 사이트 격리가 활성화된 지는 꽤 되었지만, Android에서 전체 사이트 격리를 활성화하는 데는 자원 제약 때문에 더 많은 도전과제가 있었습니다. 그러나 Chrome 92부터 민감한 데이터를 포함한 더 많은 사이트에 대해 [Android에서 사이트 격리](https://security.googleblog.com/2021/07/protecting-more-with-site-isolation.html)가 활성화되었습니다.

따라서 우리는 Android에서 Spectre에 대한 V8의 코드 생성 완화를 비활성화하기로 결정했습니다. 이 완화는 사이트 격리만큼 효과적이지 않으며 성능 비용을 초래합니다. 비활성화를 통해 Android는 데스크톱 플랫폼과 동일한 수준이 되었으며, 이 완화는 V8 v7.0부터 데스크톱에서 비활성화되었습니다. 이를 비활성화함으로써, Android에서 벤치마크 성능이 크게 향상된 것을 확인했습니다.

![성능 향상](/_img/v8-release-93/code-mitigations.svg)

## V8 API

`git log branch-heads/9.2..branch-heads/9.3 include/v8.h`를 사용하여 API 변경 사항 목록을 확인하십시오.
