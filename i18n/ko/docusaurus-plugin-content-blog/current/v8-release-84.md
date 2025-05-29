---
title: &apos;V8 릴리즈 v8.4&apos;
author: &apos;Camillo Bruni, 신선한 불값을 즐기는 중&apos;
avatars:
 - &apos;camillo-bruni&apos;
date: 2020-06-30
tags:
 - release
description: &apos;V8 v8.4는 약한 참조와 개선된 WebAssembly 성능을 제공합니다.&apos;
tweet: &apos;1277983235641761795&apos;
---
6주마다 우리는 [릴리즈 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 새 브랜치, [V8 버전 8.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.4)를 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 Chrome 84 정식 버전 출시와 함께 출시될 때까지 베타 상태에 있습니다. V8 v8.4는 개발자를 위한 여러 가지 좋은 기능들로 가득합니다. 이 게시물은 출시를 앞둔 주요 하이라이트들을 미리 보여줍니다.

<!--truncate-->
## WebAssembly

### 개선된 시작 시간

WebAssembly의 기본 컴파일러 ([Liftoff](https://v8.dev/blog/liftoff))는 이제 [원자적 명령어](https://github.com/WebAssembly/threads)와 [대량 메모리 작업](https://github.com/WebAssembly/bulk-memory-operations)을 지원합니다. 이것은 최근 사양 추가를 사용하는 경우에도 매우 빠른 시작 시간을 얻을 수 있음을 의미합니다.

### 더 나은 디버깅

WebAssembly의 디버깅 경험을 개선하기 위해 현재 실행을 멈추거나 중단점에 도달할 때 모든 활성 WebAssembly 프레임을 조사할 수 있습니다.
이것은 디버깅을 위해 [Liftoff](https://v8.dev/blog/liftoff)를 재사용하여 실현되었습니다. 과거에는 중단점이 설정되었거나 실행 단계를 거친 모든 코드가 WebAssembly 인터프리터에서 실행되어야 했으며, 이는 실행 속도를 크게 저하시켰습니다 (보통 약 100배 정도). Liftoff를 사용하면 성능이 약 1/3 정도만 저하되며 모든 코드를 탐색하고 언제든지 조사할 수 있습니다.

### SIMD Origin Trial

SIMD 제안은 WebAssembly가 일반적으로 사용 가능한 하드웨어 벡터 명령어를 활용하여 계산 집약적인 작업을 가속화하도록 합니다. V8은 [WebAssembly SIMD 제안](https://github.com/WebAssembly/simd)에 대해 [지원](https://v8.dev/features/simd)을 제공합니다. Chrome에서 이를 활성화하려면 `chrome://flags/#enable-webassembly-simd` 플래그를 사용하거나 [origin trial](https://developers.chrome.com/origintrials/#/view_trial/-4708513410415853567)에 등록하세요. [Origin trials](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md)는 표준화 전에 기능을 실험할 기회를 개발자들에게 제공하며 중요한 피드백을 제공합니다. origin이 해당 trial에 참가하면 사용자는 Chrome 플래그를 업데이트하지 않고도 trial 기간 동안 기능을 사용할 수 있습니다.

## JavaScript

### 약한 참조 및 파이널라이저

:::note
**경고!** 약한 참조 및 파이널라이저는 고급 기능입니다! 이들은 가비지 컬렉션 동작에 의존합니다. 가비지 컬렉션은 비결정적이며 발생하지 않을 수도 있습니다.
:::

JavaScript는 가비지 컬렉션 언어이며, 이는 프로그램에서 더 이상 접근할 수 없는 객체들이 가비지 컬렉션 실행 시 자동으로 회수될 수 있음을 의미합니다. `WeakMap` 및 `WeakSet` 내 참조를 제외하고 JavaScript의 모든 참조는 강하고, 참조된 객체가 가비지 컬렉션되는 것을 방지합니다. 예를 들어,

```js
const globalRef = {
  callback() { console.log(&apos;foo&apos;); }
};
// globalRef가 전역 스코프를 통해 접근 가능한 한,
// globalRef와 그 객체의 callback 속성에 있는 함수는 회수되지 않습니다.
```

JavaScript 프로그래머는 이제 `WeakRef` 기능을 통해 객체를 약한 참조로 유지할 수 있습니다. 약한 참조에 의해 참조된 객체는 강한 참조가 아니라면 가비지 컬렉션이 되는 것을 방지하지 않습니다.

```js
const globalWeakRef = new WeakRef({
  callback() { console.log(&apos;foo&apos;); }
});

(async function() {
  globalWeakRef.deref().callback();
  // 콘솔에 “foo”를 기록합니다. globalWeakRef는
  // 생성된 이후 이벤트 루프의 첫 번째 턴 동안 살아있도록 보장됩니다.

  await new Promise((resolve, reject) => {
    setTimeout(() => { resolve(&apos;foo&apos;); }, 42);
  });
  // 이벤트 루프의 한 턴을 기다립니다.

  globalWeakRef.deref()?.callback();
  // globalWeakRef 내의 객체는 더 이상 접근 가능하지 않아
  // 첫 번째 턴 이후 가비지 컬렉션될 수 있습니다.
})();
```

`WeakRef`의 보완 기능은 `FinalizationRegistry`로, 가비지 컬렉션된 후 객체를 참조하여 콜백을 호출하도록 프로그래머가 등록할 수 있게 해줍니다. 예를 들어, 아래 프로그램은 IIFE 내에서 접근할 수 없는 객체가 수집된 후 콘솔에 `42`를 기록할 수 있습니다.

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log(heldValue);
});

(function () {
  const garbage = {};
  registry.register(garbage, 42);
  // 두 번째 매개변수는 “held” 값으로, 첫 번째 매개변수가 가비지 컬렉션될 때
  // finalizer에 전달됩니다.
})();
```

파이널라이저는 이벤트 루프에서 실행되도록 예약되며, 동기적인 JavaScript 실행을 방해하지 않습니다.

이들은 고급스럽고 강력한 기능이며, 운이 좋다면 프로그램이 이를 필요로 하지 않을 것입니다. 자세한 내용은 우리의 [설명서](https://v8.dev/features/weak-references)를 참조하세요!

### 비공개 메서드와 접근자

v7.4에서 제공된 비공개 필드에 이어 비공개 메서드와 접근자 지원이 추가되었습니다. 구문적으로, 비공개 메서드와 접근자의 이름은 비공개 필드와 마찬가지로 `#`로 시작합니다. 아래는 구문의 간단한 예입니다.

```js
class Component {
  #privateMethod() {
    console.log("저는 Component 내부에서만 호출 가능합니다!");
  }
  get #privateAccessor() { return 42; }
  set #privateAccessor(x) { }
}
```

비공개 메서드와 접근자는 비공개 필드와 동일한 스코핑 규칙과 의미를 가집니다. 자세한 내용은 우리의 [설명서](https://v8.dev/features/class-fields)를 참조하세요.

[Igalia](https://twitter.com/igalia)에게 구현 기여에 감사드립니다!

## V8 API

`git log branch-heads/8.3..branch-heads/8.4 include/v8.h`를 사용하여 API 변경 사항 목록을 얻으세요.

활성 V8 체크아웃을 가진 개발자는 `git checkout -b 8.4 -t branch-heads/8.4`를 사용하여 V8 v8.4의 새로운 기능을 실험해볼 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)에 가입하여 곧 직접 새 기능을 사용해볼 수도 있습니다.
