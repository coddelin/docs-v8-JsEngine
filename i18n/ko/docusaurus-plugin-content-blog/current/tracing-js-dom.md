---
title: &apos;JS에서 DOM로, 그리고 다시 되돌아오는 경로 추적&apos;
author: &apos;DOM의 동맹 — 울란 데겐바에브, 알렉세이 필리포브, 미하엘 립파우츠, 그리고 한네스 페이어&apos;
avatars:
  - &apos;ulan-degenbaev&apos;
  - &apos;michael-lippautz&apos;
  - &apos;hannes-payer&apos;
date: 2018-03-01 13:33:37
tags:
  - internals
  - memory
description: &apos;Chrome DevTools는 이제 C++ DOM 객체를 추적하고 스냅샷을 찍을 수 있으며 JavaScript에서 참조된 모든 접근 가능한 DOM 객체를 표시할 수 있습니다.&apos;
tweet: &apos;969184997545562112&apos;
---
Chrome 66에서 메모리 누수를 디버깅하는 것이 훨씬 쉬워졌습니다. Chrome DevTools는 이제 C++ DOM 객체를 추적하고 스냅샷을 찍을 수 있으며 JavaScript에서 참조된 모든 접근 가능한 DOM 객체를 표시할 수 있습니다. 이 기능은 V8 가비지 컬렉터의 새로운 C++ 추적 메커니즘의 이점 중 하나입니다.

<!--truncate-->
## 배경

가비지 컬렉션 시스템에서 메모리 누수는 다른 객체로부터의 비의도적인 참조로 인해 사용되지 않는 객체가 해제되지 않을 때 발생합니다. 웹 페이지의 메모리 누수는 종종 자바스크립트 객체와 DOM 요소 간의 상호 작용을 포함합니다.

다음 [간단한 예제](https://ulan.github.io/misc/leak.html)는 개발자가 이벤트 리스너 등록 해제를 잊었을 때 발생하는 메모리 누수를 보여줍니다. 이벤트 리스너가 참조한 객체는 모두 가비지 컬렉션이 되지 않습니다. 특히, iframe 창이 이벤트 리스너와 함께 누수되는 경우를 나타냅니다.

```js
// 메인 창:
const iframe = document.createElement(&apos;iframe&apos;);
iframe.src = &apos;iframe.html&apos;;
document.body.appendChild(iframe);
iframe.addEventListener(&apos;load&apos;, function() {
  const localVariable = iframe.contentWindow;
  function leakingListener() {
    // `localVariable`로 뭔가를 합니다.
    if (localVariable) {}
  }
  document.body.addEventListener(&apos;my-debug-event&apos;, leakingListener);
  document.body.removeChild(iframe);
  // 버그: `leakingListener` 등록 해제를 잊음.
});
```

누수된 iframe 창은 또한 모든 JavaScript 객체를 계속 유지합니다.

```js
// iframe.html:
class Leak {};
window.globalVariable = new Leak();
```

메모리 누수의 근본 원인을 찾으려면 유지 경로의 개념을 이해하는 것이 중요합니다. 유지 경로는 누수 객체의 가비지 컬렉션을 방지하는 객체 체인입니다. 이 체인은 메인 창의 글로벌 객체와 같은 루트 객체에서 시작하여 누수 객체에서 끝납니다. 체인의 각 중간 객체는 체인 내 다음 객체에 대한 직접 참조를 갖습니다. 예를 들어 iframe의 `Leak` 객체의 유지 경로는 다음과 같습니다:

![그림 1: `iframe`과 이벤트 리스너를 통해 누수된 객체의 유지 경로](/_img/tracing-js-dom/retaining-path.svg)

JavaScript 객체는 V8 힙에 존재하며, DOM 객체는 Chrome에서 C++ 객체로 생성된다는 점에 유의해야 합니다. 유지 경로는 JavaScript와 DOM 경계를 두 번 넘나듭니다(각각 녹색/빨간색으로 강조 표시됨).

## DevTools 힙 스냅샷

DevTools에서 힙 스냅샷을 찍어 원하는 객체의 유지 경로를 검사할 수 있습니다. 힙 스냅샷은 V8 힙의 모든 객체를 정확히 캡처합니다. 최근까지는 C++ DOM 객체에 대한 정보가 대략적으로만 표시되었습니다. 예를 들어, Chrome 65는 `Leak` 객체의 유지 경로를 불완전하게 표시합니다:

![그림 2: Chrome 65에서의 유지 경로](/_img/tracing-js-dom/chrome-65.png)

첫 번째 행만 정확합니다: `Leak` 객체는 실제로 iframe의 창 객체의 `global_variable`에 저장되어 있습니다. 이후 행은 실제 유지 경로를 대략적으로 표시하며, 메모리 누수 디버깅을 어렵게 만듭니다.

Chrome 66부터 DevTools는 C++ DOM 객체를 통해 정확히 추적하여 객체와 참조들을 포착합니다. 이는 이전에 크로스 컴포넌트 가비지 컬렉션을 위해 도입된 강력한 C++ 객체 추적 메커니즘을 기반으로 합니다. 결과적으로 DevTools의 [유지 경로](https://www.youtube.com/watch?v=ixadA7DFCx8)는 이제 정확합니다:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/ixadA7DFCx8" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>그림 3: Chrome 66에서의 유지 경로</figcaption>
</figure>

## 내부 동작: 크로스 컴포넌트 추적

DOM 객체는 Blink에 의해 관리됩니다. Blink는 Chrome의 렌더링 엔진이며 DOM을 화면의 실제 텍스트와 이미지로 번역하는 역할을 합니다. Blink와 DOM의 표현은 C++로 작성되었으므로 DOM은 JavaScript로 직접 노출될 수 없습니다. 대신 DOM의 객체는 두 부분으로 나뉩니다: JavaScript에서 사용할 수 있는 V8 래퍼 객체, 그리고 DOM에서 노드를 나타내는 C++ 객체. 이 객체들은 서로 직접 참조를 갖습니다. Blink와 V8 같은 여러 컴포넌트에 걸쳐 객체의 생존 여부와 소유권을 결정하는 것은 어렵습니다. 모든 관련 당사자가 여전히 살아있는 객체와 회수 가능한 객체에 대해 동의해야 하기 때문입니다.

Chrome 56 및 이전 버전(즉, 2017년 3월까지)에서는 Chrome이 _객체 그룹화_라는 메커니즘을 사용하여 객체의 생존 여부를 결정했습니다. 객체는 문서 내에 포함된 내용을 기준으로 그룹으로 할당되었습니다. 그룹의 모든 포함 객체는 다른 유지 경로를 통해 단일 객체가 살아 있으면 살아 있는 상태로 유지되었습니다. 이는 항상 포함 문서를 참조하는 DOM 노드의 맥락에서 이른바 DOM 트리를 형성하기 때문에 의미가 있었습니다. 그러나 이 추상화는 실제 유지 경로를 모두 제거하여 디버깅에 사용하는 데 어려움을 초래했습니다(그림 2 참조). 이벤트 리스너로 사용되는 JavaScript 클로저와 같이 이 시나리오에 맞지 않는 객체의 경우, 이 접근법은 번거로워졌으며 JavaScript 래퍼 객체가 너무 일찍 수집되어 빈 JS 래퍼로 대체되면서 모든 속성을 잃는 다양한 버그를 초래했습니다.

Chrome 57부터 이 접근법은 교차 구성 요소 추적으로 대체되었습니다. 이는 JavaScript에서 DOM의 C++ 구현으로, 다시 돌아오는 방식으로 생존 여부를 결정하는 메커니즘입니다. 우리는 [이전 블로그 게시물](/blog/orinoco-parallel-scavenger)에서 논의했던 세계 정지 추적 지연을 방지하기 위해 C++ 측에서 쓰기 장벽을 사용하여 점진적 추적을 구현했습니다. 교차 구성 요소 추적은 더 나은 지연 시간을 제공할 뿐만 아니라 구성 요소 경계 간 객체 생존 여부를 더 잘 근사하고 누수를 초래했던 여러 [시나리오](https://bugs.chromium.org/p/chromium/issues/detail?id=501866)를 수정합니다. 이에 더해 DevTools는 그림 3과 같이 실제로 DOM을 나타내는 스냅샷을 제공할 수 있습니다.

한번 사용해 보세요! 여러분의 의견을 듣기를 기대합니다.
