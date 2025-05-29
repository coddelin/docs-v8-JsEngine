---
title: "WebAssembly JSPI에 새로운 API가 추가되었습니다"
description: "이 기사는 JavaScript Promise Integration (JSPI) API의 다가올 변경 사항에 대해 자세히 설명합니다."
author: "프랜시스 맥케이브, 티보 미쇼, 일리야 레즈보프, 브렌든 달"
date: 2024-06-04
tags: 
  - WebAssembly
---
WebAssembly의 JavaScript Promise Integration (JSPI) API에 새로운 API가 추가되었으며 Chrome M126 릴리스에서 사용할 수 있습니다. 변경된 사항, Emscripten과 함께 사용하는 방법, 그리고 JSPI를 위한 로드맵에 대해 논의합니다.

JSPI는 *순차적인* API를 사용하는 WebAssembly 애플리케이션이 *비동기적인* 웹 API에 접근할 수 있도록 하는 API입니다. 많은 웹 API는 JavaScript `Promise` 객체를 바탕으로 만들어졌습니다: 요청된 작업을 즉시 수행하는 대신, 이를 수행하기 위한 `Promise`를 반환합니다. 반면에, WebAssembly로 컴파일된 많은 애플리케이션은 호출자가 완료될 때까지 대기하는 API가 지배적인 C/C++ 세계에서 유래됩니다.

<!--truncate-->
JSPI는 Web 아키텍처에 연결되어 WebAssembly 애플리케이션이 `Promise`가 반환될 때 일시 중단되고 `Promise`가 해결될 때 재개될 수 있도록 합니다.

JSPI와 이를 사용하는 방법에 대해 더 알아보려면 [이 블로그 게시물](https://v8.dev/blog/jspi)과 [사양](https://github.com/WebAssembly/js-promise-integration)을 참고하세요.

## 무엇이 변경되었나요?

### `Suspender` 객체의 종료

2024년 1월, Wasm CG의 Stacks 하위 그룹이 JSPI API를 수정하기로 [투표](https://github.com/WebAssembly/meetings/blob/297ac8b5ac00e6be1fe33b1f4a146cc7481b631d/stack/2024/stack-2024-01-29.md)했습니다. 구체적으로, 명시적인 `Suspender` 객체 대신, JavaScript/WebAssembly 경계를 사용하여 어떤 계산이 중단되는지 결정하는 데 활용됩니다.

이 차이점은 상당히 작지만 잠재적으로 중요합니다: 계산이 중단될 때, 래핑된 WebAssembly 내보내기로 가장 최근에 호출된 지점이 중단'컷 포인트'를 결정합니다.

이로 인해 JSPI를 사용하는 개발자는 해당 컷 포인트에 대한 제어가 다소 줄어듭니다. 반면에, 명시적으로 `Suspender` 객체를 관리하지 않아도 되므로 API가 사용하기 훨씬 더 쉬워집니다.

### `WebAssembly.Function` 제거

또 다른 변경 사항은 API 스타일에 있습니다. JSPI 래퍼를 `WebAssembly.Function` 생성자 대신 특정 함수와 생성자를 통해 설명합니다.

이로 인해 다음과 같은 여러 이점이 있습니다:

- [*Type Reflection* 제안](https://github.com/WebAssembly/js-types)에 대한 의존성을 제거합니다.
- JSPI 도구 사용이 더 간단해집니다: 새 API 함수는 더 이상 명시적으로 WebAssembly 함수의 타입을 참조할 필요가 없습니다.

이 변경은 더 이상 명시적으로 참조되는 `Suspender` 객체가 필요하지 않다는 결정으로 인해 가능해졌습니다.

### 중단 없이 반환하기

세 번째 변경 사항은 중단 호출의 행동과 관련이 있습니다. 중단 수입으로 자바스크립트 함수를 호출할 때 항상 중단하는 대신, 자바스크립트 함수가 실제로 `Promise`를 반환하는 경우에만 중단합니다.

이 변경은 겉보기에는 W3C TAG의 [권장 사항](https://www.w3.org/2001/tag/doc/promises-guide#accepting-promises)을 위반하는 것처럼 보이지만, JSPI 사용자에게 안전한 최적화를 제공합니다. JSPI는 `Promise`를 반환하는 함수의 *호출자* 역할을 하기 때문에 안전합니다.

이 변경은 대부분 애플리케이션에는 최소한의 영향을 미칠 가능성이 크지만, 일부 애플리케이션은 브라우저 이벤트 루프에 대한 불필요한 왕래를 피함으로써 상당한 이점을 누릴 수 있습니다.

### 새 API

API는 간단합니다: WebAssembly 모듈에서 내보낸 함수를 가져와서 `Promise`를 반환하는 함수로 변환하는 함수가 있습니다:

```js
Function Webassembly.promising(Function wsFun)
```

이는 매개변수가 JavaScript `Function`으로 타이핑되어 있다고 해도 실제로는 WebAssembly 함수로 제한된다는 점에 유의하세요.

중단 측에서는 새 클래스 `WebAssembly.Suspending`과 함께 JavaScript 함수가 인수로 포함된 생성자가 추가되었습니다. WebIDL에서 이는 다음과 같이 작성됩니다:

```js
interface Suspending{
  constructor (Function fun);
}
```

이 API는 비대칭적인 느낌을 갖고 있습니다: WebAssembly 함수를 취하여 새로운 약속(_sic_)함수를 반환하는 함수가 있는 반면, 중단 함수를 표시하려면 `Suspending` 객체로 감쌉니다. 이는 내부적으로 무슨 일이 일어나는지에 대한 더 깊은 현실을 반영합니다.

수입의 중단 동작은 호출 내에서 본질적으로 이루어집니다: 즉, 인스턴스화된 모듈 내부의 일부 함수가 수입을 호출하고 그 결과 중단됩니다.

반면에, `promising` 함수는 일반 WebAssembly 함수를 취하여 중단에 응답할 수 있고 `Promise`를 반환할 수 있는 새 함수를 반환합니다.

### 새 API 사용하기

Emscripten 사용자인 경우, 새 API를 사용하는 것이 일반적으로 코드 변경을 필요로 하지 않습니다. 적어도 Emscripten의 버전 3.1.61 이상을 사용해야 하며, 최소 버전 126.0.6478.17 (Chrome M126)의 Chrome을 사용해야 합니다.

자체 통합을 구현하는 경우, 코드가 상당히 간단해질 것입니다. 특히 전달된 `Suspender` 객체를 저장하고 가져오는 코드가 더 이상 필요하지 않습니다. WebAssembly 모듈 내에서 그냥 정규 순차 코드를 사용할 수 있습니다.

### 이전 API

이전 API는 최소한 2024년 10월 29일(Chrome M128)까지 계속 작동할 것입니다. 그 이후에는 이전 API를 제거할 계획입니다.

Emscripten 자체는 버전 3.1.61부터 이전 API를 더 이상 지원하지 않을 것임을 유의하십시오.

### 브라우저에서 사용 중인 API 감지

API를 변경하는 것은 경솔하게 절대 이루어져서는 안 됩니다. 이 경우 JSPI 자체가 아직 임시적이기 때문에 변경이 가능합니다. 브라우저에서 어떤 API가 활성화되었는지 테스트하는 간단한 방법이 있습니다:

```js
function oldAPI(){
  return WebAssembly.Suspender!=undefined
}

function newAPI(){
  return WebAssembly.Suspending!=undefined
}
```

`oldAPI` 함수는 브라우저에서 오래된 JSPI API가 활성화되었는지 여부를 확인하고, `newAPI` 함수는 새로운 JSPI API가 활성화되었는지 여부를 반환합니다.

## JSPI에 무슨 일이 일어나고 있는가?

### 구현 측면

우리가 작업 중인 JSPI의 가장 큰 변화는 대부분의 프로그래머에게는 보이지 않는 것입니다: 이른바 확장 가능한 스택입니다.

현재 JSPI 구현은 고정된 크기의 스택을 할당하는 것입니다. 실제로 할당된 스택은 상당히 큽니다. 이는 재귀 처리를 제대로 처리하려면 깊은 스택이 필요할 수 있는 임의의 WebAssembly 계산을 수용해야 하기 때문입니다.

그러나 이는 지속 가능한 전략이 아닙니다. 우리는 수백만 개의 중단된 코루틴을 지원하고 싶습니다. 스택이 각각 1MB 크기인 경우 이는 불가능합니다.

확장 가능한 스택은 WebAssembly 스택이 필요할 때 성장할 수 있는 스택 할당 전략을 의미합니다. 따라서 작은 스택 공간만 필요한 애플리케이션의 경우 매우 작은 스택으로 시작할 수 있으며, 애플리케이션이 공간을 초과하면 스택을 확장할 수 있습니다(소위 스택 오버플로).

확장 가능한 스택을 구현할 수 있는 여러 가능한 기술이 있습니다. 우리가 조사 중인 기술 중 하나는 분할된 스택(segmented stacks)입니다. 분할된 스택은 고정 크기를 가진 스택 영역 체인으로 구성되며, 각 세그먼트는 크기가 다를 수 있습니다.

코루틴을 위한 스택 오버플로 문제를 해결할 수 있지만, 기본 스택이나 중앙 스택을 확장 가능하게 만들 계획은 없습니다. 따라서 애플리케이션이 스택 공간이 부족하면 확장 가능한 스택은 JSPI를 사용하지 않는 한 문제를 해결하지 못합니다.

### 표준화 과정

게시 당시, [JSPI에 대한 오리진 트라이얼(origin trial)](https://v8.dev/blog/jspi-ot)이 활성 상태입니다. 새 API는 오리진 트라이얼 기간 동안 활성 상태이며, Chrome M126과 함께 사용할 수 있습니다.

이전 API 또한 오리진 트라이얼 기간 동안 사용할 수 있지만, Chrome M128 이후 곧 폐기될 예정입니다.

그 이후에는 JSPI의 주요 초점은 표준화 과정에 맞춰질 것입니다. JSPI는 현재(W3C Wasm CG 과정) 3단계에 있으며, 4단계로 이동하는 다음 단계는 JSPI를 JavaScript 및 WebAssembly 생태계를 위한 표준 API로 채택하는 중요한 과정을 표시합니다.

JSPI의 이러한 변경 사항에 대해 어떻게 생각하시는지 알고 싶습니다! [W3C WebAssembly Community Group repo](https://github.com/WebAssembly/js-promise-integration)에서 토론에 참여하십시오.
