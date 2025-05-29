---
title: &apos;더 빠른 비동기 함수와 프로미스&apos;
author: &apos;Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), 항상 대기하는 기대자, 그리고 Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), 전문 성능 약속자&apos;
avatars:
  - &apos;maya-armyanova&apos;
  - &apos;benedikt-meurer&apos;
date: 2018-11-12 16:45:07
tags:
  - ECMAScript
  - benchmarks
  - presentations
description: &apos;더 빠르고 디버그하기 쉬운 비동기 함수와 프로미스가 V8 v7.2 / Chrome 72에 도입됩니다.&apos;
tweet: &apos;1062000102909169670&apos;
---
자바스크립트에서 비동기 처리는 전통적으로 빠르지 않다고 여겨졌습니다. 게다가 라이브 자바스크립트 애플리케이션, 특히 Node.js 서버를 디버그하는 일은 쉬운 일이 아닙니다. _특히나_ 비동기 프로그래밍에서는 그러합니다. 다행히도 시간이 지나면서 변화가 일어나고 있습니다. 이 글에서는 V8(및 어느 정도는 다른 자바스크립트 엔진들에서도)에서 비동기 함수와 프로미스를 최적화한 방법과 비동기 코드를 디버깅하는 경험을 향상시킨 방법을 설명합니다.

<!--truncate-->
:::note
**참고:** 글을 읽기보다 발표 영상을 선호하신다면 아래 영상을 즐겨보세요! 그렇지 않다면, 영상을 건너뛰고 계속 읽어주세요.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/DFP5DKDQfOc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

## 비동기 프로그래밍의 새로운 접근 방식

### 콜백에서 프로미스, 그리고 비동기 함수로

자바스크립트 언어에 프로미스가 도입되기 전에는 콜백 기반 API가 비동기 코드를 위해 일반적으로 사용되었습니다. 특히 Node.js에서 그렇습니다. 다음은 그 예입니다:

```js
function handler(done) {
  validateParams((error) => {
    if (error) return done(error);
    dbQuery((error, dbResults) => {
      if (error) return done(error);
      serviceCall(dbResults, (error, serviceResults) => {
        console.log(result);
        done(error, serviceResults);
      });
    });
  });
}
```

이와 같은 방식으로 깊이 중첩된 콜백을 사용하는 특정 패턴은 일반적으로 _“콜백 지옥”_이라고 불리며, 이는 코드의 가독성을 떨어뜨리고 유지보수를 어렵게 만듭니다.

다행히도, 자바스크립트 언어에 프로미스가 도입되면서 동일한 코드를 더 우아하고 유지 보수하기 쉽게 작성할 수 있게 되었습니다:

```js
function handler() {
  return validateParams()
    .then(dbQuery)
    .then(serviceCall)
    .then(result => {
      console.log(result);
      return result;
    });
}
```

더 최근에 자바스크립트는 [비동기 함수](https://web.dev/articles/async-functions)를 지원하기 시작했습니다. 위의 비동기 코드는 이제 동기 코드와 매우 유사하게 작성될 수 있습니다:

```js
async function handler() {
  await validateParams();
  const dbResults = await dbQuery();
  const results = await serviceCall(dbResults);
  console.log(results);
  return results;
}
```

비동기 함수를 사용하면 실행이 여전히 비동기적임에도 불구하고 코드가 더 간결해지고 제어 및 데이터 흐름이 훨씬 더 쉽게 추적될 수 있습니다. (참고로 자바스크립트 실행은 여전히 단일 스레드에서 이루어지므로 비동기 함수 자체가 물리적 스레드를 생성하지 않습니다.)

### 이벤트 리스너 콜백에서 비동기 반복으로

Node.js에서 특히 흔한 또 다른 비동기 패러다임은 [`ReadableStream`](https://nodejs.org/api/stream.html#stream_readable_streams)의 개념입니다. 여기 한 예가 있습니다:

```js
const http = require(&apos;http&apos;);

http.createServer((req, res) => {
  let body = &apos;&apos;;
  req.setEncoding(&apos;utf8&apos;);
  req.on(&apos;data&apos;, (chunk) => {
    body += chunk;
  });
  req.on(&apos;end&apos;, () => {
    res.write(body);
    res.end();
  });
}).listen(1337);
```

이 코드는 읽기 어려운 경우가 있습니다. 들어오는 데이터는 콜백 안에서만 접근 가능한 청크 단위로 처리되며, 스트림의 종료 신호 역시 콜백 안에서 처리됩니다. 여기서 함수가 즉시 종료되고 실제 처리가 콜백 내에서 이루어져야 한다는 사실을 인지하지 못하면 쉽게 버그를 도입할 수 있습니다.

다행히도 [비동기 반복](http://2ality.com/2016/10/asynchronous-iteration.html)이라는 새로운 ES2018 기능이 이 코드를 단순화할 수 있습니다:

```js
const http = require(&apos;http&apos;);

http.createServer(async (req, res) => {
  try {
    let body = &apos;&apos;;
    req.setEncoding(&apos;utf8&apos;);
    for await (const chunk of req) {
      body += chunk;
    }
    res.write(body);
    res.end();
  } catch {
    res.statusCode = 500;
    res.end();
  }
}).listen(1337);
```

이전에는 요청 처리를 실제로 처리하는 로직을 `&apos;data&apos;`와 `&apos;end&apos;`라는 두 가지 다른 콜백에 넣어야 했지만, 이제는 모든 것을 단일 비동기 함수에 넣을 수 있습니다. 또한 새 `for await…of` 반복문을 사용하여 청크를 비동기적으로 반복 처리할 수 있습니다. 또한 `try-catch` 블록을 추가하여 `unhandledRejection` 문제[^1]를 방지했습니다.

[^1]: [Matteo Collina](https://twitter.com/matteocollina)가 [이 문제](https://github.com/mcollina/make-promises-safe/blob/master/README.md#the-unhandledrejection-problem)를 지적해주신 것에 감사드립니다.

이 새로운 기능은 오늘날 생산 환경에서 이미 사용할 수 있습니다! 비동기 함수는 **Node.js 8 (V8 v6.2 / Chrome 62)부터 완전히 지원되며**, 비동기 이터레이터 및 제너레이터는 **Node.js 10 (V8 v6.8 / Chrome 68)부터 완전히 지원됩니다**!

## 비동기 성능 개선

V8 v5.5 (Chrome 55 & Node.js 7)와 V8 v6.8 (Chrome 68 & Node.js 10) 사이에서 비동기 코드 성능을 크게 개선하는 데 성공했습니다. 개발자는 속도를 걱정하지 않고 이 새로운 프로그래밍 패러다임을 안전하게 사용할 수 있습니다.

![](/_img/fast-async/doxbee-benchmark.svg)

위 차트는 [doxbee 벤치마크](https://github.com/v8/promise-performance-tests/blob/master/lib/doxbee-async.js)를 보여줍니다. 이를 통해 약속 중심 코드의 성능을 측정합니다. 차트는 실행 시간을 시각화하므로, 낮을수록 더 좋습니다.

[병렬 벤치마크](https://github.com/v8/promise-performance-tests/blob/master/lib/parallel-async.js)의 결과는 더욱 흥미롭습니다. 여기서는 특히 [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)의 성능을 강조합니다:

![](/_img/fast-async/parallel-benchmark.svg)

`Promise.all` 성능을 **8배** 개선하는 데 성공했습니다.

그러나 위 벤치마크는 합성 마이크로 벤치마크입니다. V8 팀은 [실제 사용자 코드의 실제 성능](/blog/real-world-performance)에 우리의 최적화가 미치는 영향을 더 관심있게 봅니다.

![](/_img/fast-async/http-benchmarks.svg)

위 차트는 약속과 비동기 함수를 많이 사용하는 일부 인기 있는 HTTP 미들웨어 프레임워크의 성능을 시각화합니다. 이번 그래프는 초당 요청 수를 나타내며, 이전 차트와 달리 높을수록 더 좋습니다. 이러한 프레임워크의 성능은 Node.js 7 (V8 v5.5)과 Node.js 10 (V8 v6.8) 사이에서 크게 개선되었습니다.

이러한 성능 개선은 다음의 세 가지 주요 성과의 결과입니다:

- [TurboFan](/docs/turbofan), 새로운 최적화 컴파일러 🎉
- [Orinoco](/blog/orinoco), 새로운 가비지 컬렉터 🚛
- Node.js 8에서 `await`가 마이크로틱을 건너뛰게 만든 버그 🐛

[TurboFan을 출시했을 때](/blog/launching-ignition-and-turbofan) [Node.js 8에서](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367), 전반적으로 큰 성능 향상을 이루었습니다.

우리는 또한 Orinoco라는 새로운 가비지 컬렉터를 개발했으며, 이것은 가비지 컬렉션 작업을 메인 스레드에서 분리하여 요청 처리 성능도 크게 개선됩니다.

그리고 마지막으로, Node.js 8에서 발생한 편리한 버그가 있어서 `await`가 일부 경우에 마이크로틱을 건너뛰게 만들어 성능이 더 좋아지게 되었습니다. 이 버그는 처음에는 의도치않은 명세 위반이었지만, 나중에 이를 최적화의 아이디어로 활용했습니다. 버그 동작을 설명해보겠습니다:

:::note
**참고:** 작성 당시 자바스크립트 명세에 따르면 아래의 동작은 올바른 것입니다. 이후 우리의 명세 제안이 수락되어 아래 "버그가 존재했던" 동작이 이제 올바른 것이 되었습니다.
:::

```js
const p = Promise.resolve();

(async () => {
  await p; console.log(&apos;after:await&apos;);
})();

p.then(() => console.log(&apos;tick:a&apos;))
 .then(() => console.log(&apos;tick:b&apos;));
```

위 프로그램은 충족된 약속 `p`를 생성하고 결과를 `await`하며, 또한 이를 두 개의 핸들러에 연결합니다. `console.log` 호출이 실행되는 순서를 어떻게 예상합니까?

`p`가 충족되었으므로, 먼저 `&apos;after:await&apos;`을 출력한 다음 `&apos;tick&apos;`을 출력할 것이라고 예상할 수 있습니다. 실제로 Node.js 8에서는 이러한 동작을 볼 수 있습니다:

![Node.js 8에서의 `await` 버그](/_img/fast-async/await-bug-node-8.svg)

이 동작은 직관적으로 보일 수 있지만, 명세에 따르면 올바르지 않습니다. Node.js 10은 올바른 동작을 구현했으며, 연결된 핸들러를 먼저 실행한 다음 비동기 함수를 계속 실행합니다.

![Node.js 10에서는 더 이상 `await` 버그가 없습니다](/_img/fast-async/await-bug-node-10.svg)

이 _“올바른 동작”_은 즉시 명확하지 않을 수 있으며, 실제로 자바스크립트 개발자들에게 놀라운 것으로 나타났습니다. 그래서 약속과 비동기 함수의 신비로운 세계를 탐구하기 전에 몇 가지 기본 사항을 시작하겠습니다.

### 작업 vs. 마이크로작업

높은 수준에서 자바스크립트에는 _작업(Task)_과 _마이크로작업(Microtask)_이 있습니다. 작업은 I/O 및 타이머와 같은 이벤트를 처리하며, 한 번에 한 개씩 실행됩니다. 마이크로작업은 `async`/`await` 및 약속을 위한 지연 실행을 구현하며, 각 작업의 끝에서 실행됩니다. 마이크로작업 큐는 항상 이벤트 루프로 실행이 반환되기 전에 비워집니다.

![마이크로작업과 작업의 차이점](/_img/fast-async/microtasks-vs-tasks.svg)

더 자세한 내용은 Jake Archibald의 [브라우저의 작업, 마이크로태스크, 큐, 스케줄에 대한 설명](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/)을 확인하세요. Node.js의 작업 모델도 매우 유사합니다.

### 비동기 함수

MDN에 따르면, 비동기 함수는 암시적 프라미스를 사용하여 비동기적으로 작동하고 결과를 반환하는 함수입니다. 비동기 함수는 비동기 코드가 동기 코드처럼 보이도록 하여 개발자가 비동기 처리를 다룰 때의 복잡성을 숨기는 것을 목적으로 합니다.

가장 간단한 비동기 함수는 다음과 같습니다:

```js
async function computeAnswer() {
  return 42;
}
```

호출하면 프라미스를 반환하며, 다른 프라미스처럼 값을 얻을 수 있습니다.

```js
const p = computeAnswer();
// → Promise

p.then(console.log);
// 다음 턴에 42를 출력
```

이 프라미스 `p`의 값은 마이크로태스크가 다음 실행될 때 얻을 수 있습니다. 즉, 위 코드는 값과 함께 `Promise.resolve`를 사용하는 것과 의미적으로 동일합니다:

```js
function computeAnswer() {
  return Promise.resolve(42);
}
```

비동기 함수의 진정한 강점은 `await` 표현식에서 나옵니다. 이 표현식은 프라미스가 해결될 때까지 함수 실행을 멈추고, 완료 후 다시 실행을 재개합니다. `await`의 값은 완료된 프라미스의 값이 됩니다. 이는 다음 예제로 알 수 있습니다:

```js
async function fetchStatus(url) {
  const response = await fetch(url);
  return response.status;
}
```

`fetchStatus`의 실행은 `await`에서 중단되며, 이후 `fetch` 프라미스가 완료되면 재개됩니다. 이는 `fetch`로부터 반환된 프라미스에 핸들러를 체이닝하는 것과 거의 동일합니다.

```js
function fetchStatus(url) {
  return fetch(url).then(response => response.status);
}
```

핸들러는 비동기 함수의 `await` 이후 코드가 포함됩니다.

일반적으로 `Promise`를 `await`에 전달하지만, 실제로는 모든 임의의 JavaScript 값을 기다릴 수 있습니다. `await` 뒤의 표현식의 값이 프라미스가 아닌 경우, 프라미스로 변환됩니다. 따라서 원한다면 `await 42`를 사용할 수도 있습니다:

```js
async function foo() {
  const v = await 42;
  return v;
}

const p = foo();
// → Promise

p.then(console.log);
// 마지막에 `42` 출력
```

더 흥미롭게도, `await`은 [“thenable”](https://promisesaplus.com/), 즉 `then` 메서드를 가진 모든 객체에서도 동작합니다. 실제 프라미스가 아니어도 말입니다. 따라서 실제로 걸린 시간을 측정하는 비동기적인 sleep 같은 재미있는 기능을 구현할 수 있습니다:

```js
class Sleep {
  constructor(timeout) {
    this.timeout = timeout;
  }
  then(resolve, reject) {
    const startTime = Date.now();
    setTimeout(() => resolve(Date.now() - startTime),
               this.timeout);
  }
}

(async () => {
  const actualTime = await new Sleep(1000);
  console.log(actualTime);
})();
```

이제 [명세](https://tc39.es/ecma262/#await)를 따라 V8이 `await`을 어떻게 처리하는지 살펴봅시다. 다음은 간단한 비동기 함수 `foo`입니다:

```js
async function foo(v) {
  const w = await v;
  return w;
}
```

호출 시, 파라미터 `v`를 프라미스로 래핑하고, 이 프라미스가 해결될 때까지 비동기 함수의 실행을 중단합니다. 그런 다음 실행이 재개되고 `w`에 완료된 프라미스의 값이 할당됩니다. 이 값은 이후 비동기 함수에서 반환됩니다.

### 내부에서의 `await` 처리

먼저 V8은 이 함수를 _재개 가능_으로 표시합니다. 이는 실행이 중단되었다가 나중에 재개될 수 있다는 뜻입니다(`await` 지점에서). 그런 다음, 비동기 함수 호출 시 반환되는 프라미스인 `implicit_promise`을 생성하며, 이는 나중에 비동기 함수에 의해 생성된 값으로 해결됩니다.

![간단한 비동기 함수와 엔진이 이를 변환한 모습의 비교](/_img/fast-async/await-under-the-hood.svg)

다음으로 흥미로운 부분, 실제 `await`입니다. 먼저 `await`에 전달된 값이 프라미스로 래핑됩니다. 그런 다음, 이 래핑된 프라미스에 핸들러가 첨부되어, 프라미스가 완료되면 함수를 다시 실행하고, 비동기 함수의 실행을 중단하고 호출자에게 `implicit_promise`를 반환합니다. 프라미스가 완료되면, 비동기 함수의 실행이 `promise`로부터의 값 `w`로 재개되고, `implicit_promise`은 `w`로 해결됩니다.

요약하면, `await v`의 초기 단계는 다음과 같습니다:

1. `await`에 전달된 값 `v`를 프라미스로 래핑합니다.
1. 비동기 함수를 나중에 다시 실행하기 위한 핸들러를 첨부합니다.
1. 비동기 함수의 실행을 중단하고, 호출자에게 `implicit_promise`를 반환합니다.

각 작업을 단계별로 살펴봅시다. `await`되는 것이 이미 완료된 값 `42`와 함께 프라미스라고 가정합니다. 그런 다음 엔진은 새 `promise`를 생성하고, `await`된 값으로 해당 값을 해결합니다. 이는 다음 턴에서 이러한 프라미스를 연쇄적으로 처리하며, 명세에서 [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob)로 표현됩니다.

![](/_img/fast-async/await-step-1.svg)

그러면 엔진은 또 다른 이른바 `throwaway` 프로미스를 생성합니다. 이것은 *throwaway* 라고 불리는데, 아무것도 여기에 체인되지 않기 때문입니다 — 이것은 완전히 엔진 내부적으로 사용됩니다. 이 `throwaway` 프로미스는 `promise`에 체인되고, 비동기 함수 실행을 재개하기 위한 적절한 핸들러와 함께 설정됩니다. 이 `performPromiseThen` 작동은 [`Promise.prototype.then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then)이 내부적으로 수행하는 일과 본질적으로 동일합니다. 마지막으로 비동기 함수의 실행은 중지되고, 제어는 호출자에게 반환됩니다.

![](/_img/fast-async/await-step-2.svg)

호출자의 실행이 계속되고, 결국 호출 스택이 비어집니다. 그런 다음 JavaScript 엔진은 마이크로태스크를 실행하기 시작합니다: 이전에 예약된 [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob)을 실행하고, `await`에 전달된 값에 `promise`를 체인하도록 새로운 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)을 예약합니다. 그런 다음 엔진은 다시 마이크로태스크 큐를 처리합니다, 왜냐하면 마이크로태스크 큐는 기본 이벤트 루프를 계속하기 전에 비워야 하기 때문입니다.

![](/_img/fast-async/await-step-3.svg)

다음으로 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)에서 우리가 `await` 중인 프로미스의 값 — 이번 경우에는 `42` — 을 통해 `promise`를 완료하고, `throwaway` 프로미스에 반응을 예약합니다. 그런 다음 엔진은 다시 마이크로태스크 루프를 반환하며, 마지막 마이크로태스크를 처리하기 위해 처리됩니다.

![](/_img/fast-async/await-step-4-final.svg)

이 두 번째 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)은 `throwaway` 프로미스에 걸친 해결을 전파하고, 중단된 비동기 함수의 실행을 재개하여 `await`로부터 값 `42`를 반환합니다.

`await`의 오버헤드 요약![](/_img/fast-async/await-overhead.svg)

우리가 배운 내용을 요약하자면, 각 `await`마다 엔진은 (오른쪽 항이 이미 프로미스인 경우에도) **두 개의 추가 프로미스**를 생성해야 하고, 적어도 **세 개의 마이크로태스크 큐 틱**이 필요합니다. 단일 `await` 표현이 이렇게나 많은 오버헤드를 초래한다는 사실을 누가 알았을까요?!

![](/_img/fast-async/await-code-before.svg)

이 오버헤드가 어디서 비롯되는지 살펴봅시다. 첫 번째 줄은 래퍼 프로미스를 생성하는 역할을 합니다. 두 번째 줄은 그 래퍼 프로미스를 `await`한 값 `v`로 즉시 완료합니다. 이 두 줄이 하나의 추가 프로미스와 세 개 중 두 개의 마이크로틱 비용을 차지합니다. 애플리케이션이 일반적으로 프로미스를 `await`하므로, `v`가 이미 프로미스일 경우에는 꽤나 비싸죠. 개발자가 드물게 `42`와 같은 것을 `await`한다면, 엔진은 여전히 이를 프로미스로 래핑해야 합니다.

사실 규격에 이미 필요할 때만 래핑을 수행하는 [`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve) 작업이 있습니다:

![](/_img/fast-async/await-code-comparison.svg)

이 작업은 프로미스를 변경하지 않고 다른 값만 필요할 때 프로미스로 래핑합니다. 이를 통해 `await`에 전달된 값이 이미 프로미스인 경우에는 추가 프로미스 하나와 마이크로태스크 큐의 두 틱을 절약할 수 있습니다. 이 새로운 동작은 이미 [V8 v7.2에서 기본적으로 활성화되어 있습니다](/blog/v8-release-72#async%2Fawait). V8 v7.1에서는 `--harmony-await-optimization` 플래그를 사용하여 새로운 동작을 활성화할 수 있습니다. 우리는 또한 [이 변경사항을 ECMAScript 표준에 제안했습니다](https://github.com/tc39/ecma262/pull/1250).

개선된 `await`가 무대 뒤에서 단계별로 작동하는 방식을 살펴봅시다:

![](/_img/fast-async/await-new-step-1.svg)

다시 `42`로 완료된 프로미스를 `await`한다고 가정해 봅시다. [`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve)의 마법 덕분에 이제 `promise`는 단순히 동일한 프로미스 `v`를 참조합니다. 그래서 이 단계에서는 할 일이 없습니다. 이후 엔진은 이전과 마찬가지로 계속 진행하며, `throwaway` 프로미스를 생성하고, 비동기 함수 실행을 마이크로태스크 큐의 다음 틱에서 재개하기 위해 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)을 예약하고, 함수 실행을 중단하며 호출자에게 반환합니다.

![](/_img/fast-async/await-new-step-2.svg)

그런 다음 모든 JavaScript 실행이 끝나면, 엔진은 마이크로태스크를 실행하기 시작하며 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)을 실행합니다. 이 작업은 `promise`의 해결을 `throwaway`로 전달하고 비동기 함수의 실행을 재개하여 `await`에서 `42`를 반환합니다.

`await` 오버헤드 감소 요약![](/_img/fast-async/await-overhead-removed.svg)

이 최적화는 `await`에 전달된 값이 이미 프로미스인 경우 래퍼 프로미스를 생성할 필요를 없애며, 이 경우 최소 **세 개의 마이크로틱**에서 단지 **하나의 마이크로틱**으로 줄어듭니다. 이 동작은 Node.js 8이 했던 것과 유사하지만, 이제는 더 이상 버그가 아닌 표준화될 최적화입니다!

엔진이 이 `throwaway` 프로미스를 만들어야 하는 것이 여전히 잘못된 느낌이 들지만, 이는 완전히 엔진 내부와 관련이 있습니다. 알고 보니, `throwaway` 프로미스는 사양에서 내부 `performPromiseThen` 작업의 API 제약을 충족시키기 위해서만 존재했습니다.

![](/_img/fast-async/await-optimized.svg)

이 문제는 최근 ECMAScript 사양에 대한 [편집 변경](https://github.com/tc39/ecma262/issues/694)에서 해결되었습니다. 엔진은 더 이상 대부분의 경우[^2] `throwaway` 프라미스를 생성할 필요가 없습니다.

[^2]: Node.js에서 [`async_hooks`](https://nodejs.org/api/async_hooks.html)를 사용하는 경우, V8은 여전히 `throwaway` 프라미스를 생성해야 합니다. 이는 `before` 및 `after` 후크가 `throwaway` 프라미스의 _컨텍스트_ 내에서 실행되기 때문입니다.

![최적화 전후 `await` 코드 비교](/_img/fast-async/node-10-vs-node-12.svg)

Node.js 10의 `await`와 최적화된 Node.js 12 버전의 `await`을 비교하면 이 변경의 성능 영향을 확인할 수 있습니다:

![](/_img/fast-async/benchmark-optimization.svg)

**이제 `async`/`await`은 직접 작성한 프라미스 코드보다 성능이 뛰어납니다.** 여기서 중요한 점은 비동기 함수의 오버헤드를 크게 줄였다는 것입니다. 이는 V8 뿐만 아니라 사양의 수정으로 인해 모든 JavaScript 엔진에서 실현되었습니다.

**업데이트:** V8 v7.2 및 Chrome 72부터는 `--harmony-await-optimization`이 기본적으로 활성화되었습니다. [사양의 패치](https://github.com/tc39/ecma262/pull/1250)가 병합되었습니다.

## 개발자 경험 개선

성능 외에도, JavaScript 개발자들은 문제를 진단하고 해결할 수 있는 능력도 중요시합니다. 이는 비동기 코드를 다룰 때 항상 쉬운 일은 아닙니다. [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)는 현재 스택의 동기 부분뿐만 아니라 비동기 부분도 포함하는 *async 스택 트레이스*를 지원합니다:

![](/_img/fast-async/devtools.png)

이 기능은 로컬 개발 중에 매우 유용합니다. 그러나 이 접근 방식은 애플리케이션이 배포된 후에는 별로 도움이 되지 않습니다. 사후 디버깅 동안에는 로그 파일에서 `Error#stack` 출력만 볼 수 있으며, 이는 비동기 부분에 대한 정보를 제공하지 않습니다.

우리는 최근 [*제로 비용 비동기 스택 트레이스*](https://bit.ly/v8-zero-cost-async-stack-traces)를 작업 중입니다. 이는 `Error#stack` 속성을 비동기 함수 호출로 풍부하게 만듭니다. “제로 비용”이라는 단어가 매력적으로 들리지 않습니까? 그러나 Chrome DevTools 기능은 주요 오버헤드가 따라오는데, 어떻게 제로 비용일 수 있을까요? `foo`가 비동기적으로 `bar`를 호출하고 `bar`가 프라미스를 `await`한 후 예외를 발생시키는 예제를 검토해봅시다:

```js
async function foo() {
  await bar();
  return 42;
}

async function bar() {
  await Promise.resolve();
  throw new Error(&apos;BEEP BEEP&apos;);
}

foo().catch(error => console.log(error.stack));
```

Node.js 8 또는 Node.js 10에서 이 코드를 실행하면 다음과 같은 출력이 나옵니다:

```text/2
$ node index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
```

`foo()` 호출이 오류를 유발하지만, `foo`는 스택 트레이스에 전혀 포함되지 않음을 주의하세요. 이는 JavaScript 개발자가 사후 디버깅을 수행하기 어렵게 만듭니다. 이는 코드가 웹 애플리케이션으로 배포되었든, 특정 클라우드 컨테이너 내에서 실행되든 상관없이 동일합니다.

흥미로운 점은 `bar`가 완료되었을 때 엔진이 어디에서 계속 실행해야 하는지 알고 있다는 것입니다: 함수 `foo`의 `await` 바로 뒤에서입니다. 마침 그곳이 함수 `foo`가 일시 중단된 장소이기도 합니다. 엔진은 이 정보를 사용하여 비동기 스택 트레이스의 일부, 즉 `await` 지점을 재구성할 수 있습니다. 이 변경으로 출력은 다음과 같이 됩니다:

```text/2,7
$ node --async-stack-traces index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
    at async foo (index.js:2:3)
```

스택 트레이스에서 가장 위에 있는 함수가 먼저 나오고, 나머지 동기 스택 트레이스가 그 뒤를 따르며, 함수 `foo`의 비동기 호출이 그 뒤를 잇습니다. 이 변경 사항은 새 `--async-stack-traces` 플래그 뒤에서 V8에 구현되었습니다. **업데이트:** V8 v7.3부터 `--async-stack-traces`가 기본적으로 활성화되었습니다.

하지만 위의 Chrome DevTools에서 비동기 스택 추적과 비교해보면, 비동기 스택 추적의 `foo` 실제 호출 위치가 누락된 것을 알 수 있습니다. 앞서 언급했듯이, 이 접근법은 `await`의 재개와 중단 위치가 동일하다는 사실을 활용합니다. 하지만 일반적인 [`Promise#then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) 또는 [`Promise#catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch) 호출에서는 그렇지 않습니다. 자세한 배경은 Mathias Bynens의 [왜 `await`가 `Promise#then()`보다 좋은가](https://mathiasbynens.be/notes/async-stack-traces)에 대한 설명을 참조하세요.

## 결론

두 가지 주요 최적화를 통해 비동기 함수의 속도를 개선했습니다:

- 두 개의 추가 마이크로틱을 제거했고,
- `throwaway` 프라미스를 제거했습니다.

그뿐만 아니라 [*제로 비용 비동기 스택 추적*](https://bit.ly/v8-zero-cost-async-stack-traces)을 통해 개발자 경험을 향상시켰습니다. 이는 비동기 함수의 `await` 및 `Promise.all()`와 함께 작동합니다.

또한 JavaScript 개발자를 위한 몇 가지 유용한 성능 조언이 있습니다:

- 직접 작성한 프라미스 코드보다 `async` 함수와 `await`를 선호하세요, 그리고
- JavaScript 엔진이 제공하는 네이티브 프라미스 구현을 사용하여 두 마이크로틱을 회피하는 이점을 누리세요.
