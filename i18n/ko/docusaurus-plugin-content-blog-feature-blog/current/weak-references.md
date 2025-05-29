---
title: '약한 참조와 파이널라이저'
author: '사티야 구나세카란 ([@_gsathya](https://twitter.com/_gsathya)), 마티아스 바이넨스 ([@mathias](https://twitter.com/mathias)), 슈유 꿔 ([@_shu](https://twitter.com/_shu)), 레셰크 스비르스키 ([@leszekswirski](https://twitter.com/leszekswirski))'
avatars:
- 'sathya-gunasekaran'
- 'mathias-bynens'
- 'shu-yu-guo'
- 'leszek-swirski'
date: 2019-07-09
updated: 2020-06-19
tags:
  - ECMAScript
  - ES2021
  - io19
  - Node.js 14
description: '약한 참조와 파이널라이저가 자바스크립트에 등장합니다! 이 글에서는 새로운 기능을 설명합니다.'
tweet: '1148603966848151553'
---
일반적으로 자바스크립트에서 객체에 대한 참조는 _강하게 유지_됩니다. 즉, 객체를 참조하고 있는 동안에는 가비지 컬렉션이 이루어지지 않습니다.

```js
const ref = { x: 42, y: 51 };
// `ref`(혹은 같은 객체에 대한 다른 참조)를 갖고 있는 한,
// 객체는 가비지 컬렉션되지 않습니다.
```

현재로서는 `WeakMap`과 `WeakSet`만이 자바스크립트에서 약하게 객체를 참조하는 유일한 방법입니다. `WeakMap`이나 `WeakSet`에 객체를 추가해도 가비지 컬렉션을 막을 수는 없습니다.

```js
const wm = new WeakMap();
{
  const ref = {};
  const metaData = 'foo';
  wm.set(ref, metaData);
  wm.get(ref);
  // → metaData
}
// 이제 이 블록 스코프 내에서 `ref`에 대한 참조를 갖고 있지 않기 때문에,
// `wm`의 키임에도 불구하고 가비지 컬렉션이 가능합니다.

<!--truncate-->
const ws = new WeakSet();
{
  const ref = {};
  ws.add(ref);
  ws.has(ref);
  // → true
}
// 이제 이 블록 스코프 내에서 `ref`에 대한 참조를 갖고 있지 않기 때문에,
// `ws`의 키임에도 불구하고 가비지 컬렉션이 가능합니다.
```

:::note
**참고:** `WeakMap.prototype.set(ref, metaData)`를 객체 `ref`에 값 `metaData`를 가진 속성을 추가하는 것으로 생각할 수 있습니다: 객체를 참조하고 있는 동안에는 메타데이터를 가져올 수 있습니다. 더 이상 객체를 참조하지 않으면, `WeakMap`의 참조를 통해 추가된 경우에도 객체가 가비지 컬렉션될 수 있습니다. 유사하게, `WeakSet`은 모든 값이 불리언인 `WeakMap`의 특수한 형태로 생각할 수 있습니다.

자바스크립트의 `WeakMap`은 실제로 _약하지_ 않습니다: 키가 생존하는 한 콘텐츠를 실제로 _강하게_ 참조합니다. `WeakMap`은 키가 가비지 컬렉션된 이후에만 콘텐츠를 약하게 참조합니다. 이러한 관계를 더 정확하게 표현하는 이름은 [_에페메론_](https://en.wikipedia.org/wiki/Ephemeron)입니다.
:::

`WeakRef`는 객체 수명에 대한 창을 제공하며 _진정한_ 약한 참조를 제공하는 더 고급화된 API입니다. 예제를 통해 함께 살펴봅시다.

예를 들어, 서버와 통신하기 위해 웹 소켓을 사용하는 채팅 웹 애플리케이션을 작업한다고 가정해봅시다. `MovingAvg` 클래스는 성능 진단 목적으로 웹 소켓에서 이벤트 세트를 유지하여 지연 시간의 간단한 이동 평균을 계산하는 데 사용됩니다.

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener('message', this.listener);
  }

  compute(n) {
    // 최근 n 이벤트에 대한 간단한 이동 평균을 계산합니다.
    // …
  }
}
```

이 클래스는 지연 시간의 간단한 이동 평균을 언제 시작하고 중지할지를 제어할 수 있도록 해주는 `MovingAvgComponent` 클래스에 의해 사용됩니다.

```js
class MovingAvgComponent {
  constructor(socket) {
    this.socket = socket;
  }

  start() {
    this.movingAvg = new MovingAvg(this.socket);
  }

  stop() {
    // 가비지 컬렉터가 메모리를 회수할 수 있도록 허용합니다.
    this.movingAvg = null;
  }

  render() {
    // 렌더링 수행.
    // …
  }
}
```

서버 메시지를 `MovingAvg` 인스턴스에 모두 유지하는 것은 많은 메모리를 사용한다는 것을 알고 있기 때문에, 모니터링이 중지되었을 때 가비지 컬렉터가 메모리를 회수하도록 `this.movingAvg`를 null로 설정합니다.

그러나 DevTools의 메모리 패널에서 확인한 후, 메모리가 전혀 회수되지 않았다는 것을 발견했습니다! 경험 많은 웹 개발자는 이미 버그를 발견했을 가능성이 있습니다: 이벤트 리스너는 강한 참조로 간주되며 명시적으로 제거해야 합니다.

`start()`를 호출한 후 객체 그래프는 다음과 같으며, 실선 화살표는 강한 참조를 의미합니다. `MovingAvgComponent` 인스턴스로부터 실선 화살표로 접근 가능한 모든 것은 가비지 컬렉션 대상이 아닙니다.

![](/_img/weakrefs/after-start.svg)

`stop()`을 호출한 후에는, 소켓의 리스너를 통해서는 제거하지 않았더라도 `MovingAvgComponent` 인스턴스에서 `MovingAvg` 인스턴스로의 강한 참조를 제거했습니다.

![](/_img/weakrefs/after-stop.svg)

따라서 이벤트 리스너는 `MovingAvg` 인스턴스에서 `this`를 참조함으로써, 이벤트 리스너가 제거되지 않은 한 전체 인스턴스를 계속 생존 시킵니다.

지금까지 해결책은 `dispose` 메소드를 통해 이벤트 리스너의 등록을 수동으로 해제하는 것이었습니다.

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener(&apos;message&apos;, this.listener);
  }

  dispose() {
    this.socket.removeEventListener(&apos;message&apos;, this.listener);
  }

  // …
}
```

이 접근법의 단점은 수동 메모리 관리입니다. `MovingAvgComponent` 및 `MovingAvg` 클래스를 사용하는 모든 다른 사용자들은 반드시 `dispose` 메서드를 호출해야 하며 그렇지 않으면 메모리 누수가 발생합니다. 더 나쁜 것은 수동 메모리 관리가 계단식으로 이어진다는 점입니다. `MovingAvgComponent`를 사용하는 사람들도 반드시 `stop` 메서드를 호출해야 하며 그렇지 않으면 메모리 누수가 발생하고, 이와 같은 방식으로 이어집니다. 애플리케이션의 동작은 이 진단 클래스의 이벤트 리스너에 의존하지 않으며, 리스너는 계산 면에서는 비싸지 않지만 메모리 사용 면에서는 비싸게 작용합니다. 우리가 정말로 원하는 것은 `MovingAvg` 인스턴스와 논리적으로 연결되어 있어야 하고, 따라서 `MovingAvg`가 가비지 컬렉터에 의해 자동으로 메모리가 회수되는 다른 자바스크립트 객체처럼 사용될 수 있어야 한다는 것입니다.

`WeakRef`를 사용하면 실제 이벤트 리스너에 약한 참조를 생성하고, 그런 다음 이 `WeakRef`를 외부 이벤트 리스너로 래핑하여 딜레마를 해결할 수 있습니다. 이 방법을 통해 가비지 컬렉터는 실제 이벤트 리스너와 이를 유지하는 메모리, 예를 들어 `MovingAvg` 인스턴스와 그 `events` 배열을 정리할 수 있습니다.

```js
function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener);
  const wrapper = (ev) => { weakRef.deref()?.(ev); };
  socket.addEventListener(&apos;message&apos;, wrapper);
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); };
    addWeakListener(socket, this.listener);
  }
}
```

:::note
**참고:** 함수에 대한 `WeakRef`는 신중하게 사용해야 합니다. 자바스크립트 함수는 [클로저](https://en.wikipedia.org/wiki/Closure_(computer_programming))이며 내부 함수에서 참조된 자유 변수 값들을 포함하는 외부 환경을 강하게 참조합니다. 이러한 외부 환경에는 _다른_ 클로저가 참조하는 변수들이 포함될 수 있습니다. 즉, 클로저를 사용할 때 해당 메모리는 다른 클로저가 미묘한 방식으로 강하게 참조하는 경우가 많습니다. 이는 `addWeakListener`가 별도의 함수이고 `wrapper`가 `MovingAvg` 생성자 내에 로컬로 존재하지 않는 이유입니다. V8에서는 `wrapper`가 `MovingAvg` 생성자 내에 로컬로 존재하며 `WeakRef`로 래핑된 리스너와 동일한 렉시컬 스코프를 공유할 경우 `MovingAvg` 인스턴스와 그 모든 속성들이 래퍼 리스너로부터 공유 환경을 통해 접근 가능하게 되며 인스턴스가 컬렉션되지 않게 됩니다. 코드를 작성할 때 이 점을 유념하십시오.
:::

우리는 먼저 이벤트 리스너를 만들어 이를 `this.listener`로 할당합니다. 따라서 이것은 `MovingAvg` 인스턴스에 의해 강하게 참조됩니다. 즉, `MovingAvg` 인스턴스가 살아 있는 동안 이벤트 리스너도 살아 있습니다.

그다음 `addWeakListener`에서 실제 이벤트 리스너를 _타겟_으로 하는 `WeakRef`를 생성합니다. `wrapper` 내부에서 이를 `deref`합니다. `WeakRef`는 타겟이 다른 강한 참조가 없으면 가비지 컬렉션을 방지하지 않으므로, 타겟을 얻기 위해 수동으로 dereference해야 합니다. 타겟이 그동안 가비지 컬렉션된 경우 `deref`는 `undefined`를 반환합니다. 그렇지 않으면 타겟이 반환되며 이는 우리가 [옵셔널 체이닝](/features/optional-chaining)을 사용하여 호출하게 되는 원래의 `listener` 함수입니다.

이벤트 리스너가 `WeakRef`로 래핑되었기 때문에 이를 강하게 참조하는 유일한 것은 `MovingAvg` 인스턴스의 `listener` 속성입니다. 즉, 이벤트 리스너의 생명 주기를 `MovingAvg` 인스턴스의 생명 주기에 성공적으로 연결했습니다.

접근 가능성 다이어그램으로 돌아가면, 다음과 같이 `WeakRef` 구현과 함께 `start()`를 호출한 후의 객체 그래프를 볼 수 있습니다. 점선 화살표는 약한 참조를 나타냅니다.

![](/_img/weakrefs/weak-after-start.svg)

`stop()`을 호출한 후에는 리스너에 대한 유일한 강한 참조를 제거합니다:

![](/_img/weakrefs/weak-after-stop.svg)

결국 가비지 컬렉션이 발생한 후에는 `MovingAvg` 인스턴스와 리스너가 수집됩니다:

![](/_img/weakrefs/weak-after-gc.svg)

그러나 여기에는 여전히 문제가 있습니다. 우리는 `WeakRef`로 리스너를 래핑함으로써 `listener`에 간접성을 추가했지만, `addWeakListener`의 래퍼는 원래 `listener`가 누수를 발생시켰던 동일한 이유로 여전히 누수를 발생시키고 있습니다. 물론 이것은 누수가 줄어든 경우로, 누수를 발생시키는 것은 전체 `MovingAvg` 인스턴스가 아닌 래퍼만이기 때문에 누수가 줄어들었지만 이는 여전히 누수입니다. 이를 해결할 수 있는 방법은 `WeakRef`의 동반 기능인 `FinalizationRegistry`입니다. 새로운 `FinalizationRegistry` API를 사용하면 등록된 객체를 가비지 컬렉터가 제거할 때 실행할 콜백을 등록할 수 있습니다. 이러한 콜백은 _최종화 작업_이라고 합니다.

:::note
**참고:** 이벤트 리스너가 가비지 컬렉션된 직후에 최종화 콜백이 즉시 실행되지 않으므로 중요한 로직이나 메트릭에 사용하지 마십시오. 가비지 컬렉션과 최종화 콜백의 실행 시점은 명시되어 있지 않습니다. 실제로, 가비지 컬렉션을 전혀 실행하지 않는 엔진도 완전히 준수하는 것으로 간주됩니다. 그러나 엔진이 가비지 컬렉션을 실행하고 최종화 콜백이 나중에 호출될 것이라고 가정해도 안전합니다(탭 닫기나 워커 종료 등 환경이 제거되는 경우 제외). 코드를 작성할 때 이러한 불확실성을 염두에 두십시오.
:::

`FinalizationRegistry`를 사용하여 내부 이벤트 리스너가 가비지 컬렉션될 때 `wrapper`를 소켓에서 제거하는 콜백을 등록할 수 있습니다. 우리의 최종 구현은 다음과 같습니다:

```js
const gListenersRegistry = new FinalizationRegistry(({ socket, wrapper }) => {
  socket.removeEventListener(&apos;message&apos;, wrapper); // 6
});

function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener); // 2
  const wrapper = (ev) => { weakRef.deref()?.(ev); }; // 3
  gListenersRegistry.register(listener, { socket, wrapper }); // 4
  socket.addEventListener(&apos;message&apos;, wrapper); // 5
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); }; // 1
    addWeakListener(socket, this.listener);
  }
}
```

:::참고
**참고:** `gListenersRegistry`는 최종화자가 실행되도록 하기 위해 전역 변수로 설정됩니다. `FinalizationRegistry`는 등록된 객체에 의해 유지되지 않습니다. 레지스트리가 가비지 컬렉션되면 최종화자가 실행되지 않을 수 있습니다.
:::

이벤트 리스너를 만들고 이를 `this.listener`에 할당하여 `MovingAvg` 인스턴스에 강하게 참조되도록 합니다 (1). 그런 다음 작업을 수행하는 이벤트 리스너를 `WeakRef`로 래핑하여 가비지 컬렉션 가능하게 만들고, `this`를 통해 `MovingAvg` 인스턴스에 대한 참조를 누출하지 않도록 합니다(2). `WeakRef`를 `deref`하여 여전히 살아 있는지 확인한 다음, 살아 있다면 호출하는 래퍼를 만듭니다(3). 내부 리스너를 `FinalizationRegistry`에 등록하고 _보조 값_ `{ socket, wrapper }`를 등록 값으로 전달합니다(4). 그런 다음 반환된 래퍼를 `socket`의 이벤트 리스너로 추가합니다(5). `MovingAvg` 인스턴스와 내부 리스너가 가비지 컬렉션된 후 어느 시점에서 최종화자가 실행될 수 있으며, 보조 값이 전달됩니다. 최종화자 내부에서 래퍼도 제거하고, `MovingAvg` 인스턴스 사용과 관련된 모든 메모리를 가비지 컬렉션 가능하게 만듭니다(6).

이를 통해 `MovingAvgComponent` 초기 구현은 메모리를 누출하지 않으며 수동 폐기가 필요하지 않습니다.

## 과도하게 사용하지 마세요

이 새로운 기능에 대해 듣고 나면 `WeakRef`를 모든 것에 적용하고 싶어질 수 있습니다. 그러나 이는 좋은 생각이 아닐 가능성이 높습니다. 일부 상황은 `WeakRef`와 최종화자를 사용하기에 적합하지 않습니다.

일반적으로, 가비지 컬렉터가 특정 시점에 `WeakRef`를 정리하거나 최종화자를 호출하는 것에 의존하지 않는 코드를 작성하는 것을 피하십시오 — [불가능합니다](https://github.com/tc39/proposal-weakrefs#a-note-of-caution)! 또한 객체가 가비지 컬렉션 가능 여부는 클로저의 표현과 같이 세부적이고 자바스크립트 엔진 및 동일 엔진의 여러 버전 간에 다를 수 있는 구현 세부 사항에 따라 달라질 수 있습니다. 특히 최종화자 콜백은:

- 가비지 컬렉션 직후에 발생하지 않을 수 있습니다.
- 실제 가비지 컬렉션 순서대로 발생하지 않을 수 있습니다.
- 브라우저 창이 닫힐 경우 발생하지 않을 수 있습니다.

따라서 중요한 로직을 최종화자 코드 경로에 배치하지 마십시오. 이들은 가비지 컬렉션에 응답하여 정리를 수행하는 데 유용하지만, 메모리 사용량에 대한 의미 있는 메트릭을 기록하는 데 신뢰할 수 있게 사용할 수는 없습니다. 해당 사용 사례에 대해서는 [`performance.measureUserAgentSpecificMemory`](https://web.dev/monitor-total-page-memory-usage/)를 참조하십시오.

`WeakRef`와 최종화자는 메모리를 절약하는 데 도움을 줄 수 있으며, 점진적 개선 수단으로 제한적으로 사용할 때 가장 효과적입니다. 이는 고급 사용자 기능이므로 대부분의 사용은 프레임워크나 라이브러리 내에서 발생할 것으로 예상됩니다.

## `WeakRef` 지원

<feature-support chrome="74 https://v8.dev/blog/v8-release-84#weak-references-and-finalizers"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1561074"
                 safari="no"
                 nodejs="14.6.0"
                 babel="no"></feature-support>
