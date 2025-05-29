---
title: '웹어셈블리 자바스크립트 프로미스 통합 API 소개'
description: '이 문서는 JSPI를 소개하고 이를 사용하기 위한 간단한 예제를 제공합니다'
author: '프랜시스 매케이브, 티보 미쇼, 일리야 레즈보프, 브렌던 달'
date: 2024-07-01
tags:
  - 웹어셈블리
---
자바스크립트 프로미스 통합(JSPI) API는 외부 기능에 대한 _동기적_ 접근을 가정하여 작성된 웹어셈블리 애플리케이션이 실제로는 _비동기적_인 환경에서도 원활히 작동할 수 있도록 합니다.

<!--truncate-->
이 노트는 JSPI API의 핵심 기능, 접근 방법, 소프트웨어 개발 방법 및 예제를 제공합니다.

## ‘JSPI’는 무엇을 위한 것인가요?

비동기 API는 작업의 _시작_과 _해결_을 분리하여 작동합니다. 후자는 시작 후 일정 시간이 지나야 처리됩니다. 가장 중요한 점은 애플리케이션이 작업을 시작한 후 계속 실행되며, 작업이 완료되면 알림을 받는다는 점입니다.

예를 들어, `fetch` API를 사용하여 웹 애플리케이션이 URL에 연관된 컨텐츠를 접근할 수 있습니다. 그러나 `fetch` 함수는 직접적으로 결과를 반환하지 않고 대신 `Promise` 객체를 반환합니다. `fetch` 응답과 원래 요청 간의 연결은 이 `Promise` 객체에 _콜백_을 첨부하여 재구성됩니다. 콜백 함수는 응답을 검사하고 데이터를 수집할 수 있습니다(물론 데이터가 존재하는 경우).

많은 경우 C/C++ (및 여러 다른 언어) 애플리케이션은 초기에는 _동기적_ API를 기반으로 작성됩니다. 예를 들어 POSIX `read` 함수는 I/O 작업이 완료될 때까지 완료되지 않습니다: `read` 함수는 작업이 완료될 때까지 *블록*됩니다.

그러나 브라우저의 메인 스레드를 블록하는 것은 허용되지 않으며, 많은 환경에서도 동기적 프로그래밍이 지원되지 않습니다. 그 결과, 간단한 API를 원하는 애플리케이션 프로그래머의 기대와 I/O가 비동기 코드로 작성되어야 하는 넓은 생태계 간의 불일치가 발생합니다. 이는 기존의 레거시 애플리케이션을 포팅하는 데 많은 비용이 들기 때문에 특히 문제가 됩니다.

JSPI는 동기적 애플리케이션과 비동기 웹 API 간의 간극을 연결하는 API입니다. 이는 비동기 웹 API 함수가 반환한 `Promise` 객체를 가로채고 웹어셈블리 애플리케이션을 _중단_시킴으로써 작동합니다. 비동기 I/O 작업이 완료되면 웹어셈블리 애플리케이션이 _재개_됩니다. 이를 통해 웹어셈블리 애플리케이션은 직선형 코드로 비동기 작업을 수행하고 결과를 처리할 수 있습니다.

주목할 점은, JSPI를 사용하는 데 웹어셈블리 애플리케이션 자체를 거의 변경할 필요가 없다는 점입니다.

### JSPI는 어떻게 작동하나요?

JSPI는 자바스크립트 호출로부터 반환된 `Promise` 객체를 가로채고 웹어셈블리 애플리케이션의 주 로직을 중단함으로써 작동합니다. 이 `Promise` 객체에 콜백이 첨부되어 브라우저의 이벤트 루프 작업 실행기에 의해 호출되면 중단된 웹어셈블리 코드를 재개합니다.

추가로, 웹어셈블리 내보내기는 원래의 반환값 대신 `Promise` 객체를 반환하도록 리팩토링됩니다. 이 `Promise` 객체는 웹어셈블리 애플리케이션에서 반환된 값이 됩니다: 웹어셈블리 코드가 중단되면[^first], 내보내기 `Promise` 객체가 웹어셈블리 호출의 반환값으로 제공됩니다.

[^first]: 웹어셈블리 애플리케이션이 한 번 이상 중단되면 이후의 중단은 브라우저의 이벤트 루프로 되돌아가며 웹 애플리케이션에서 직접적으로 보이지 않습니다.

내보내기 프로미스는 원래의 호출이 완료되었을 때 해결됩니다: 원래의 웹어셈블리 함수가 정상값을 반환하면 내보내기 `Promise` 객체가 그 값(자바스크립트 객체로 변환됨)으로 해결됩니다; 예외가 던져지면 내보내기 `Promise` 객체는 거부됩니다.

#### 가져오기 및 내보내기 래핑

이는 웹어셈블리 모듈 인스턴스화 단계에서 가져오기 및 내보내기를 _래핑_함으로써 활성화됩니다. 함수 래퍼는 일반적인 비동기 가져오기에 중단 동작을 추가하고 중단을 `Promise` 객체 콜백으로 라우팅합니다.

웹어셈블리 모듈의 모든 가져오기 및 내보내기를 래핑할 필요는 없습니다. 실행 경로가 비동기 API 호출을 포함하지 않는 내보내기는 래핑하지 않는 것이 좋습니다. 또한, 웹어셈블리 모듈의 가져오기가 모두 비동기 API 함수는 아니므로, 이러한 가져오기도 래핑하지 않는 것이 좋습니다.

물론 이를 가능하게 하는 상당한 내부 메커니즘이 있지만,[^1] 자바스크립트 언어와 웹어셈블리 자체는 JSPI로 인해 변경되지 않습니다. 운영은 자바스크립트와 웹어셈블리 간의 경계에서만 이루어집니다.

웹 애플리케이션 개발자의 관점에서는, 결과가 JavaScript에서 작성된 다른 비동기 함수가 작동하는 유사한 방식으로 비동기 함수와 Promise의 JavaScript 세계에 참여하는 코드 본체가 됩니다. 웹어셈블리 개발자의 관점에서는, 동기 API를 사용하여 응용 프로그램을 작성하면서 웹의 비동기 생태계에 참여할 수 있는 기능을 제공합니다.

### 기대 성능

웹어셈블리 모듈을 일시 중지 및 재개할 때 사용되는 메커니즘은 본질적으로 일정한 시간이 소요되므로, JSPI를 사용하는 데 다른 변환 기반 접근 방식에 비해 높은 비용이 발생하지 않을 것으로 예상합니다.

비동기 API 호출에서 반환된 `Promise` 객체를 웹어셈블리로 전파하는 데 일정한 양의 작업이 필요합니다. 마찬가지로 Promise가 해결되면 일정 시간 오버헤드로 웹어셈블리 애플리케이션이 재개될 수 있습니다.

그러나 브라우저의 다른 Promise 스타일 API와 마찬가지로, 웹어셈블리 애플리케이션이 일시 중지될 때는 브라우저의 태스크 러너에 의해 다시 '깨우는' 경우를 제외하고는 다시 실행되지 않습니다. 이는 웹어셈블리 계산을 시작한 JavaScript 코드 실행 자체가 브라우저로 반환되어야 함을 의미합니다.

### JSPI를 사용하여 JavaScript 프로그램을 일시 중지할 수 있습니까?

JavaScript는 비동기 계산을 표현하기 위한 잘 개발된 메커니즘(`Promise` 객체 및 `async` 함수 표기법)을 이미 가지고 있습니다. JSPI는 이를 대체하는 것이 아니라 잘 통합되도록 설계되었습니다.

### 오늘 JSPI를 어떻게 사용할 수 있나요?

JSPI는 현재 W3C WebAssembly WG에 의해 표준화되고 있습니다. 이 글을 쓰는 시점에서 이는 표준화 프로세스의 3단계에 있으며, 2024년 말까지 완전한 표준화를 기대하고 있습니다.

JSPI는 Linux, MacOS, Windows 및 ChromeOS에서 Intel 및 Arm 플랫폼 모두에서 64비트 및 32비트를 포함하여 Chrome에서 사용할 수 있습니다.[^firefox]

[^firefox]: JSPI는 Firefox nightly에서도 사용할 수 있습니다. about:config 패널에서 "`javascript.options.wasm_js_promise_integration`"을 켜고 &mdash; 다시 시작하세요.

JSPI는 오늘날 두 가지 방식으로 사용할 수 있습니다: [origin trial](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889)을 통해 사용하거나 Chrome 플래그를 통해 로컬에서 사용할 수 있습니다. 로컬에서 테스트하려면 Chrome에서 `chrome://flags`로 이동하여 “Experimental WebAssembly JavaScript Promise Integration (JSPI)”을 검색하고 확인란을 선택하십시오. 효과를 내기 위해 제안된 대로 다시 실행하십시오.

API의 최신 버전을 얻으려면 최소한 버전 `126.0.6478.26`을 사용해야 합니다. 안정성 업데이트가 적용되도록 개발 채널을 사용하는 것이 좋습니다. 또한, WebAssembly를 생성하기 위해 Emscripten을 사용하려는 경우(이를 추천합니다), 최소 `3.1.61` 버전을 사용하는 것이 좋습니다.

활성화되면 JSPI를 사용하는 스크립트를 실행할 수 있어야 합니다. 아래에서는 JSPI를 사용하는 WebAssembly 모듈을 C/C++으로 생성하는 방법을 보여줍니다. 애플리케이션이 Emscripten을 사용하지 않는 다른 언어를 포함한다면 [제안서](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md)를 참조하여 API가 작동하는 방식을 확인하는 것이 좋습니다.

#### 제한 사항

Chrome의 JSPI 구현은 이미 일반적인 사용 사례를 지원합니다. 하지만 여전히 실험적인 것으로 간주되므로 몇 가지 제한 사항이 있습니다:

- 명령줄 플래그를 사용하거나 origin trial에 참여해야 합니다.
- JSPI 내보내기 호출은 고정 크기 스택에서 실행됩니다.
- 디버깅 지원이 다소 제한적입니다. 특히, DevTools 패널에서 일어나는 다양한 이벤트를 보기 어려울 수 있습니다. JSPI 애플리케이션 디버깅에 대한 더 풍부한 지원을 제공하는 것이 로드맵에 포함되어 있습니다.

## 작은 데모

이 모든 것이 작동하는 것을 보기 위해 간단한 예를 시도해 봅시다. 이 C 프로그램은 JavaScript에서 덧셈을 요청하고, 더 나쁘게는 JavaScript `Promise` 객체를 사용하여 덧셈을 수행하여 놀랍도록 비효율적인 방식으로 피보나치 수를 계산합니다:[^2]

```c
long promiseFib(long x) {
 if (x == 0)
   return 0;
 if (x == 1)
   return 1;
 return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}
// 덧셈을 promise로 수행
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});
```

`promiseFib` 함수 자체는 단순한 재귀 형태의 피보나치 함수입니다. (우리 관점에서) 흥미로운 부분은 두 피보나치 절반을 합산하기 위해 JSPI를 사용하는 `promiseAdd` 정의입니다.

`EM_ASYNC_JS` Emscripten 매크로를 사용하여 C 프로그램 본문 내의 JavaScript 함수로 `promiseFib` 함수를 작성할 수 있습니다. JavaScript에서 덧셈은 일반적으로 Promise를 포함하지 않으므로 Promise를 작성하여 강제로 이를 수행해야 합니다.

`EM_ASYNC_JS` 매크로는 JSPI를 사용하여 마치 일반 함수처럼 Promise의 결과에 액세스할 수 있도록 필요한 접착 코드를 생성합니다.

작은 데모를 컴파일하려면 Emscripten의 `emcc` 컴파일러를 사용합니다:[^4]

```sh
emcc -O3 badfib.c -o b.html -s JSPI
```

이 명령은 프로그램을 컴파일하여 로드 가능한 HTML 파일(`b.html`)을 생성합니다. 여기서 가장 특별한 명령줄 옵션은 `-s JSPI`입니다. 이는 Promise를 반환하는 JavaScript 가져오기를 인터페이스하기 위해 JSPI를 사용하는 코드를 생성하는 옵션입니다.

생성된 `b.html` 파일을 Chrome에 로드하면 다음과 비슷한 출력을 볼 수 있습니다:

```
fib(0) 0μs 0μs 0μs
fib(1) 0μs 0μs 0μs
fib(2) 0μs 0μs 3μs
fib(3) 0μs 0μs 4μs
…
fib(15) 0μs 13μs 1225μs
```

이는 처음 15개의 피보나치 숫자와 각 숫자를 계산하는 데 필요한 평균 마이크로초 시간을 나열한 것입니다. 각 줄의 세 시간 값은 순수 WebAssembly 계산, 혼합 JavaScript/WebAssembly 계산에 소요된 시간 및 계산의 중단 버전에 대한 시간을 나타냅니다.

`fib(2)`은 Promise에 액세스하는 가장 작은 계산이며, `fib(15)`가 계산될 때까지 약 1000번의 `promiseAdd` 호출이 이루어졌습니다. 이는 JSPI 함수의 실제 비용이 대략 1μs임을 나타내며, 이는 두 개의 정수를 더하는 비용보다 훨씬 높지만 외부 I/O 함수에 액세스하는 데 일반적으로 필요한 밀리초보다 훨씬 작습니다.

## JSPI를 사용하여 코드 지연 로드하기

다음 예제에서는 JSPI를 사용하여 약간 놀라운 방식으로 동적으로 코드를 로드하는 방법에 대해 살펴보겠습니다. 이 아이디어는 필요한 코드를 포함하는 모듈을 `fetch`하는데, 이는 필요한 함수가 처음 호출될 때까지 지연됩니다.

JSPI를 사용하는 이유는 `fetch`와 같은 API가 본질적으로 비동기 성격을 가지고 있기 때문이며, 애플리케이션의 임의의 위치, 특히 아직 존재하지 않는 함수의 호출 중에 이를 호출할 수 있기를 원하기 때문입니다.

핵심 아이디어는 동적으로 로드된 함수를 스텁으로 교체하는 것입니다; 이 스텁은 먼저 누락된 함수 코드를 로드하고, 로드된 코드로 자신의 내용을 대체한 다음 원래 인수를 사용하여 새롭게 로드된 코드를 호출합니다. 이후 함수에 대한 모든 호출은 직접 로드된 함수로 이동합니다. 이 전략은 동적으로 코드를 로드하는 본질적으로 투명한 접근 방식을 허용합니다.

우리가 로드할 모듈은 비교적 간단하며, `42`를 반환하는 함수를 포함하고 있습니다:

```c
// 이것은 간단한 42 제공자입니다
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42(){
  return 42l;
}
```

`p42.c`라는 파일에 있으며, Emscripten을 사용하여 '추가 기능' 없이 컴파일합니다:

```sh
emcc p42.c -o p42.wasm --no-entry -Wl,--import-memory
```

`EMSCRIPTEN_KEEPALIVE` 접두사는 Emscripten 매크로로, 코드 내에서 사용되지 않더라도 `provide42` 함수가 제거되지 않도록 합니다. 이로 인해 동적으로 로드하려는 함수를 포함하는 WebAssembly 모듈이 생성됩니다.

`p42.c` 생성 시 추가된 `-Wl,--import-memory` 플래그는 메인 모듈이 사용하는 동일한 메모리에 접근할 수 있도록 보장합니다.[^3]

코드를 동적으로 로드하려면 표준 `WebAssembly.instantiateStreaming` API를 사용합니다:

```js
WebAssembly.instantiateStreaming(fetch('p42.wasm'));
```

이 표현식은 `fetch`를 사용하여 컴파일된 Wasm 모듈을 찾고 `WebAssembly.instantiateStreaming`을 사용하여 fetch 결과를 컴파일하고 인스턴스화된 모듈을 생성합니다. `fetch`와 `WebAssembly.instantiateStreaming` 모두 Promise를 반환하므로 단순히 결과에 접근하여 필요한 함수를 추출할 수 없습니다. 대신 이를 JSPI 스타일로 `EM_ASYNC_JS` 매크로를 사용하여 가져옵니다:

```c
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('loading promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});
```

`console.log` 호출을 확인하여 우리의 로직이 올바르게 작동하는지 확인합니다.

`addFunction`은 Emscripten API의 일부이지만 실행 시 사용 가능하도록 하기 위해 이를 `emcc`에 필수 의존 항목임을 알려야 합니다. 이를 다음 줄로 수행합니다:

```c
EM_JS_DEPS(funDeps, "$addFunction")
```

코드를 동적으로 로드하려면 불필요한 코드를 로드하지 않도록 해야 하며, 이 경우 `provide42`에 대한 후속 호출이 리로드를 트리거하지 않도록 해야 합니다. 이를 위해 C의 간단한 기능을 사용할 수 있습니다: `provide42`를 직접 호출하지 않고, 이를 로드하도록 하는 트램펄린을 통하여 호출하며, 실제로 실행하기 직전에 트램펄린을 자체 우회하도록 변경합니다. 이를 적절한 함수 포인터를 사용하여 수행할 수 있습니다:

```c
extern fooFun get42;

long stub(){
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;
```

프로그램의 나머지 부분에서 우리는 호출하려는 함수가 `get42`라고 부릅니다. 초기에 이는 `stub`을 통해 구현되며, `resolveFun`을 호출하여 실제로 함수를 로드합니다. 로드가 성공한 후, `get42`를 새로 로드된 함수로 변경하고 호출합니다.

우리의 메인 함수는 `get42`를 두 번 호출합니다:[^6]

```c
int main() {
  printf("first call p42() = %ld\n", get42());
  printf("second call = %ld\n", get42());
}
```

브라우저에서 이를 실행한 결과는 다음과 같은 로그를 생성합니다:

```
약속 로딩 중 promise42
첫 번째 호출 p42() = 42
두 번째 호출 = 42
```

`약속 로딩 중 promise42`는 한 번만 나타나지만, `get42`는 실제로 두 번 호출된다는 점을 주목하세요.

이 예제는 JSPI가 예상치 못한 방식으로 사용할 수 있음을 보여줍니다: 코드를 동적으로 로딩하는 것은 약속을 생성하는 것과는 상당히 거리가 있어 보입니다. 게다가 WebAssembly 모듈을 동적으로 연결하는 다른 방법들도 있습니다; 이는 그 문제에 대한 궁극적인 해결책을 나타내려는 것이 아닙니다.

이 새로운 기능을 사용하여 여러분이 무엇을 할 수 있는지 정말 기대됩니다! W3C WebAssembly 커뮤니티 그룹 [repo](https://github.com/WebAssembly/js-promise-integration)에서 논의에 참여하세요.

## 부록 A: `badfib` 전체 목록


```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <emscripten.h>

typedef long (testFun)(long, int);

#define microSeconds (1000000)

long add(long x, long y) {
  return x + y;
}

// JS에게 덧셈 요청
EM_JS(long, jsAdd, (long x, long y), {
  return x + y;
});

// 덧셈 약속
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});

__attribute__((noinline))
long localFib(long x) {
 if (x==0)
   return 0;
 if (x==1)
   return 1;
 return add(localFib(x - 1), localFib(x - 2));
}

__attribute__((noinline))
long jsFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return jsAdd(jsFib(x - 1), jsFib(x - 2));
}

__attribute__((noinline))
long promiseFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}

long runLocal(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += localFib(x);
  return temp / count;
}

long runJs(long x,int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += jsFib(x);
  return temp / count;
}

long runPromise(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += promiseFib(x);
  return temp / count;
}

double runTest(testFun test, int limit, int count){
  clock_t start = clock();
  test(limit, count);
  clock_t stop = clock();
  return ((double)(stop - start)) / CLOCKS_PER_SEC;
}

void runTestSequence(int step, int limit, int count) {
  for (int ix = 0; ix <= limit; ix += step){
    double light = (runTest(runLocal, ix, count) / count) * microSeconds;
    double jsTime = (runTest(runJs, ix, count) / count) * microSeconds;
    double promiseTime = (runTest(runPromise, ix, count) / count) * microSeconds;
    printf("fib(%d) %gμs %gμs %gμs %gμs\n",ix, light, jsTime, promiseTime, (promiseTime - jsTime));
  }
}

EMSCRIPTEN_KEEPALIVE int main() {
  int step =  1;
  int limit = 15;
  int count = 1000;
  runTestSequence(step, limit, count);
  return 0;
}
```

## 부록 B: `u42.c` 및 `p42.c` 목록

`u42.c` C 코드는 우리의 동적 로딩 예제의 주요 부분을 나타냅니다:

```c
#include <stdio.h>
#include <emscripten.h>

typedef long (*fooFun)();

// 함수 약속
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('약속 로딩 중 promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});

EM_JS_DEPS(funDeps, "$addFunction")

extern fooFun get42;

long stub() {
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;

int main() {
  printf("첫 번째 호출 p42() = %ld\n", get42());
  printf("두 번째 호출 = %ld\n", get42());
}
```

`p42.c` 코드는 동적으로 로드된 모듈을 나타냅니다.

```c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42() {
  return 42l;
}
```

<!-- 각주들은 아래쪽에 위치합니다. -->
## 참고 사항

[^1]: 기술적으로 궁금하다면, [JSPI에 대한 WebAssembly 제안](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md) 및 [V8 스택 전환 설계 포트폴리오](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y)를 참조하십시오.

[^2]: 전체 프로그램은 아래 부록 A에 포함되어 있습니다.

[^3]: 특정 예제에는 이 플래그가 필요하지 않지만, 더 큰 작업에는 이 플래그가 필요할 가능성이 높습니다.

[^4]: Emscripten 버전이 ≥ 3.1.61 이상이어야 합니다.

[^6]: 전체 프로그램은 부록 B에 표시되어 있습니다.
