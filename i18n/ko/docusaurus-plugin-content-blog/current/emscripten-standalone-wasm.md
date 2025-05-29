---
title: '웹 외부: Emscripten을 사용한 독립형 WebAssembly 바이너리'
author: '알론 자카이'
avatars:
  - '알론 자카이'
date: 2019-11-21
tags:
  - WebAssembly
  - 도구
description: 'Emscripten은 이제 JavaScript가 필요 없는 독립형 Wasm 파일을 지원합니다.'
tweet: '1197547645729988608'
---
Emscripten은 항상 웹 및 Node.js와 같은 기타 JavaScript 환경에 컴파일하는 것을 최우선으로 고려해 왔습니다. 하지만 WebAssembly가 JavaScript *없이* 사용되기 시작하면서 새로운 사용 사례가 등장하고, 우리는 Emscripten에서 [**독립형 Wasm**](https://github.com/emscripten-core/emscripten/wiki/WebAssembly-Standalone) 파일을 출력할 수 있는 지원을 개발해 왔습니다. 이는 Emscripten JS 런타임에 의존하지 않는 파일입니다. 이 게시물에서는 그 이유가 흥미로운 이유를 설명합니다.

<!--truncate-->
## Emscripten에서 독립형 모드 사용하기

먼저, 이 새로운 기능으로 무엇을 할 수 있는지 살펴보겠습니다! [이 게시물](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/)과 비슷하게, 두 숫자를 더하는 단일 함수를 내보내는 "hello world" 유형의 프로그램으로 시작해 보겠습니다:

```c
// add.c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int add(int x, int y) {
  return x + y;
}
```

우리는 보통 `emcc -O3 add.c -o add.js`와 같은 명령으로 이를 빌드하며, 이는 `add.js`와 `add.wasm`을 생성합니다. 대신, `emcc`에 Wasm만 출력하도록 요청하겠습니다:

```
emcc -O3 add.c -o add.wasm
```

`emcc`가 우리가 Wasm만 원한다는 것을 알게 되면, 그것을 "독립형"으로 만듭니다. 즉, Emscripten의 JavaScript 런타임 코드 없이 최대한 독립적으로 실행할 수 있는 Wasm 파일을 생성합니다.

이를 디스어셈블하면 매우 미니멀하며, 단 87바이트입니다! 이는 명백한 `add` 함수만 포함하고 있습니다.

```lisp
(func $add (param $0 i32) (param $1 i32) (result i32)
 (i32.add
  (local.get $0)
  (local.get $1)
 )
)
```

그리고 하나의 추가 함수인 `_start`가 있습니다.

```lisp
(func $_start
 (nop)
)
```

`_start`는 [WASI](https://github.com/WebAssembly/WASI) 사양의 일부이며, Emscripten의 독립형 모드는 WASI 런타임에서 실행할 수 있도록 이를 출력합니다. (일반적으로 `_start`는 글로벌 초기화를 수행하지만, 여기서는 필요하지 않아 비어 있습니다.)

### 사용자 지정 JavaScript 로더 작성하기

이와 같은 독립형 Wasm 파일의 한 가지 장점은 사용 사례에 따라 매우 최소한으로 사용자 지정 JavaScript를 작성하여 이를 로드하고 실행할 수 있다는 점입니다. 예를 들어, Node.js에서 이러한 작업을 수행할 수 있습니다.

```js
// load-add.js
const binary = require('fs').readFileSync('add.wasm');

WebAssembly.instantiate(binary).then(({ instance }) => {
  console.log(instance.exports.add(40, 2));
});
```

단 4줄! 실행하면 예상대로 `42`를 출력합니다. 이 예제가 매우 간단하긴 하지만, 경우에 따라 JavaScript가 거의 필요하지 않을 수도 있으며, Emscripten의 기본 JavaScript 런타임보다 더 간단하게 수행할 수도 있습니다. 실제 예로는 [zeux's meshoptimizer](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js)가 있습니다 - 메모리 관리, 확장 등을 포함하여 단 57줄입니다!

### Wasm 런타임에서 실행하기

독립형 Wasm 파일의 또 다른 장점은 [wasmer](https://wasmer.io), [wasmtime](https://github.com/bytecodealliance/wasmtime), 또는 [WAVM](https://github.com/WAVM/WAVM)과 같은 Wasm 런타임에서 실행할 수 있다는 점입니다. 예를 들어, 이 hello world 프로그램을 고려해보세요.

```cpp
// hello.cpp
#include <stdio.h>

int main() {
  printf("hello, world!\n");
  return 0;
}
```

우리는 이를 여러 런타임에서 빌드하고 실행할 수 있습니다:

```bash
$ emcc hello.cpp -O3 -o hello.wasm
$ wasmer run hello.wasm
hello, world!
$ wasmtime hello.wasm
hello, world!
$ wavm run hello.wasm
hello, world!
```

Emscripten은 가능한 최대한 WASI API를 사용하며, 이와 같은 프로그램은 WASI를 100% 사용하여 WASI를 지원하는 런타임에서 실행할 수 있습니다. (WASI 이상을 요구하는 프로그램에 대한 메모는 이후에 다룹니다.)

### Wasm 플러그인 만들기

웹과 서버 외에도 Wasm의 흥미로운 영역은 **플러그인**입니다. 예를 들어, 이미지 편집기는 필터와 기타 이미징 작업을 수행할 수 있는 Wasm 플러그인을 가질 수 있습니다. 이와 같은 유형의 사용 사례에서는 지금까지의 예제와 같이 독립형 Wasm 바이너리가 필요하지만, 임베딩 애플리케이션을 위한 적절한 API도 필요합니다.

플러그인은 때때로 동적 라이브러리와 관련이 있으며, 동적 라이브러리는 이를 구현하는 한 가지 방법입니다. Emscripten은 [SIDE_MODULE](https://github.com/emscripten-core/emscripten/wiki/Linking#general-dynamic-linking) 옵션을 사용하여 동적 라이브러리를 지원하며, 이는 Wasm 플러그인을 빌드하는 방법 중 하나였습니다. 여기서 설명하는 새로운 독립 실행형 Wasm 옵션은 여러 면에서 이를 개선한 것입니다: 첫째, 동적 라이브러리는 이동 가능한 메모리를 가지고 있으며, 이는 필요하지 않을 경우 오버헤드가 추가됩니다(예를 들어, 로드 후 다른 Wasm과 연결하지 않는 경우). 둘째, 독립 실행형 출력은 이전에 언급했듯이 Wasm 런타임에서도 실행되도록 설계되었습니다.

좋습니다, 여기까지는 잘 따라오셨죠: Emscripten은 항상 그랬던 것처럼 JavaScript + WebAssembly를 출력할 수 있고, 이제 단독으로 WebAssembly만 출력할 수도 있으므로 JavaScript가 없는 Wasm 런타임 같은 곳에서 실행되거나, 맞춤형 JavaScript 로더 코드를 작성할 수도 있습니다. 이제 배경 및 기술적 세부 사항에 대해 이야기해 보겠습니다!

## WebAssembly의 두 가지 표준 API

WebAssembly는 가져온 API만 액세스할 수 있습니다 - 핵심 Wasm 명세에는 구체적인 API 세부 정보가 없습니다. 현재 Wasm의 방향을 고려할 때, 사람들이 가져오고 사용할 주요 API 카테고리는 세 가지로 보입니다:

- **웹 API**: 이것은 Wasm 프로그램이 웹에서 사용하는 것으로, JavaScript도 사용할 수 있는 기존 표준화된 API입니다. 현재는 JS 접착 코드를 통해 간접적으로 호출되지만, [인터페이스 타입](https://github.com/WebAssembly/interface-types/blob/master/proposals/interface-types/Explainer.md)이 적용되면 직접 호출될 것입니다.
- **WASI API**: WASI는 서버에서 Wasm을 위한 API를 표준화하는 데 중점을 둡니다.
- **기타 API**: 다양한 맞춤형 임베딩은 독자적인 애플리케이션 전용 API를 정의할 것입니다. 예를 들어, 앞서 언급한 이미지 편집기에서 Wasm 플러그인이 시각적 효과를 구현하는 API를 제공하는 예를 들 수 있습니다. 플러그인은 네이티브 동적 라이브러리처럼 “시스템” API에 접근할 수 있거나, 매우 샌드박스화되어 전혀 임포트를 사용하지 않을 수도 있습니다(임베딩이 단순히 메서드를 호출하기만 할 경우).

WebAssembly는 [두 가지 표준화된 API 세트](https://www.goodreads.com/quotes/589703-the-good-thing-about-standards-is-that-there-are-so)를 가지는 흥미로운 상황에 있습니다. 이는 하나는 웹용이고 하나는 서버용이라는 점에서 이해가 되며, 이러한 환경은 서로 다른 요구 사항을 가지고 있습니다. 비슷한 이유로 Node.js는 웹상의 JavaScript와 동일한 API를 가지지 않습니다.

그러나 웹과 서버 외에도 Wasm 플러그인이 있습니다. 플러그인은 웹에 있을 수 있는 애플리케이션 내에서 실행되거나([JS 플러그인](https://www.figma.com/blog/an-update-on-plugin-security/#a-technology-change)처럼) 웹과는 독립적으로 실행될 수 있습니다. 또한 임베딩 애플리케이션이 어디에 있든 플러그인 환경은 웹 또는 서버 환경이 아닙니다. 따라서 어떤 API 세트를 사용할지는 명확하지 않습니다 - 포팅되는 코드, 임베딩되는 Wasm 런타임 등에 따라 달라질 수 있습니다.

## 가능한 많이 통합하자!

Emscripten이 여기서 기여할 수 있는 한 가지 구체적인 방법은 WASI API를 최대한 사용함으로써 **불필요한** API 차이를 피하는 것입니다. 이전에 언급했듯이, 웹에서 Emscripten 코드는 JavaScript를 통해 웹 API에 간접적으로 액세스하므로 JavaScript API가 WASI처럼 보일 수 있다면, 불필요한 API 차이를 제거하고 동일한 바이너리를 서버에서 실행할 수 있습니다. 다시 말해, Wasm이 일부 정보를 기록하려면 다음과 같이 JS에 호출해야 합니다:

```js
wasm   =>   function musl_writev(..) { .. console.log(..) .. }
```

`musl_writev`는 데이터를 파일 설명자로 쓰기 위해 [musl libc](https://www.musl-libc.org)가 사용하는 Linux 시스템 호출 인터페이스의 구현체로, 적절한 데이터를 가지고 `console.log`를 호출합니다. Wasm 모듈은 `musl_writev`를 가져와 호출하며, 이는 JS와 Wasm 간의 ABI를 정의합니다. 이 ABI는 임의적이며(사실 Emscripten은 이를 최적화하기 위해 시간이 지나면서 ABI를 변경했습니다). 이를 WASI와 일치하는 ABI로 대체하면 다음과 같이 할 수 있습니다:

```js
wasm   =>   function __wasi_fd_write(..) { .. console.log(..) .. }
```

이는 큰 변화가 아니라 ABI를 약간 리팩토링해야 할 뿐이며, JS 환경에서 실행할 때는 크게 중요하지 않습니다. 하지만 이제 WASI API가 WASI 런타임에서 인식되므로 Wasm이 JS 없이 실행될 수 있습니다! 이것이 이전에 본 독립 실행형 Wasm 예제들이 작동하는 방식으로, 단순히 Emscripten을 WASI API를 사용하도록 리팩토링함으로써 가능합니다.

Emscripten이 WASI API를 사용하는 또 다른 이점은 실제 문제를 발견하여 WASI 사양을 도울 수 있다는 점입니다. 예를 들어, WASI "whence" 상수를 변경하는 것이 유용하다는 것을 발견하고([관련 링크](https://github.com/WebAssembly/WASI/pull/106)), [코드 크기](https://github.com/WebAssembly/WASI/issues/109) 및 [POSIX 호환성](https://github.com/WebAssembly/WASI/issues/122)에 대한 일부 논의를 시작했습니다.

Emscripten이 WASI를 최대한 활용하는 것은 또 한 가지 이점이 있습니다. 사용자들이 웹, 서버 및 플러그인 환경을 대상으로 단일 SDK를 사용할 수 있게 한다는 점입니다. Emscripten만이 이를 제공하는 SDK는 아니며, WASI SDK의 출력은 [WASI Web Polyfill](https://wasi.dev/polyfill/) 또는 Wasmer의 [wasmer-js](https://github.com/wasmerio/wasmer-js)를 통해 웹에서 실행될 수 있습니다. 그러나 Emscripten의 웹 출력은 더 작아서, 웹 성능을 저하시키지 않고 단일 SDK를 사용할 수 있게 합니다.

그런데, Emscripten에서 선택적인 JS와 함께 독립형 Wasm 파일을 단일 명령으로 생성할 수 있습니다:

```
emcc -O3 add.c -o add.js -s STANDALONE_WASM
```

이는 `add.js`와 `add.wasm`을 생성합니다. Wasm 파일은 이전처럼 독립형으로 생성됩니다(우리가 `-o add.wasm`을 설정했을 때 `STANDALONE_WASM`이 자동으로 설정되었습니다), 하지만 이제 이를 로드하고 실행할 수 있는 JS 파일이 추가로 생성됩니다. 이 JS 파일은 웹에서 실행할 때 직접 JS를 작성하지 않고 사용할 수 있어 유용합니다.

## *비독립형* Wasm이 필요한가요?

`STANDALONE_WASM` 플래그는 왜 존재할까요? 이론적으로 Emscripten은 항상 `STANDALONE_WASM`을 설정할 수도 있습니다. 이는 더 간단할 것입니다. 하지만 독립형 Wasm 파일은 JS에 의존할 수 없으며, 이는 몇 가지 단점을 초래합니다:

- Wasm의 가져오기(import) 및 내보내기(export) 이름을 최적화(minify)할 수 없습니다. 최적화는 Wasm과 이를 로드하는 JS가 동의해야만 작동합니다.
- 일반적으로 우리는 JS에서 Wasm 메모리를 생성하여 JS가 시작 시 이를 사용할 수 있도록 하고, 이를 통해 작업을 병렬적으로 수행할 수 있습니다. 그러나 독립형 Wasm에서는 Wasm 자체에서 메모리를 생성해야 합니다.
- 일부 API는 JS에서 구현하기 쉽습니다. 예를 들어, C 어서션이 실패했을 때 호출되는 [`__assert_fail`](https://github.com/emscripten-core/emscripten/pull/9558)은 일반적으로 [JS에서 구현](https://github.com/emscripten-core/emscripten/blob/2b42a35f61f9a16600c78023391d8033740a019f/src/library.js#L1235)됩니다. 이는 단 한 줄로 구현되며, 호출하는 JS 함수까지 포함하더라도 전체 코드 크기는 매우 작습니다. 반면, 독립형 빌드에서는 JS에 의존할 수 없기 때문에 [musl의 `assert.c`](https://github.com/emscripten-core/emscripten/blob/b8896d18f2163dbf2fa173694eeac71f6c90b68c/system/lib/libc/musl/src/exit/assert.c#L4)를 사용합니다. 이는 `fprintf`를 사용하여 많은 C `stdio` 지원을 불러오며, 이는 사용되지 않는 함수를 제거하기 어렵게 만드는 간접 호출을 포함합니다. 전반적으로 이러한 세부 사항들이 총 코드 크기에 영향을 줍니다.

웹과 다른 환경에서 모두 실행하고 싶고, 100% 최적화된 코드 크기와 시작 시간을 원한다면 `-s STANDALONE` 플래그를 사용한 빌드와 사용하지 않은 빌드, 두 가지 별도의 빌드를 만들어야 합니다. 이는 플래그 하나만 변경하면 되므로 매우 간단합니다!

## 필요한 API 차이점

Emscripten이 **불필요한** API 차이점을 피하기 위해 WASI API를 가능한 한 많이 사용하는 것을 보았습니다. 그렇다면 **필요한** 차이점은 있을까요? 아쉽지만, 있습니다. 일부 WASI API는 트레이드오프를 요구합니다. 예를 들어:

- WASI는 [사용자/그룹/전역 파일 권한](https://github.com/WebAssembly/WASI/issues/122)과 같은 다양한 POSIX 기능을 지원하지 않습니다. 결과적으로 리눅스 시스템의 `ls`를 완전히 구현할 수 없습니다(해당 링크에서 세부 정보를 참조하세요). Emscripten의 기존 파일 시스템 레이어는 이러한 것들 중 일부를 지원하므로 모든 파일 시스템 작업에 WASI API를 사용하면 [일부 POSIX 지원을 잃게](https://github.com/emscripten-core/emscripten/issues/9479#issuecomment-542815711) 됩니다.
- WASI의 `path_open`은 [코드 크기에 비용](https://github.com/WebAssembly/WASI/issues/109)이 발생합니다. 이는 Wasm 자체에서 추가 권한 처리가 필요하도록 강요하기 때문입니다. 이 코드는 웹에서는 불필요합니다.
- WASI는 [메모리 증가에 대한 알림 API](https://github.com/WebAssembly/WASI/issues/82)를 제공하지 않으며, 그 결과 JS 런타임은 메모리가 증가했는지 확인하고, 증가했을 경우 뷰를 업데이트하기 위해 매번 가져오기와 내보내기에서 이를 확인해야 합니다. 이러한 오버헤드를 피하기 위해, Emscripten은 `emscripten_notify_memory_growth`라는 알림 API를 제공합니다. 이는 앞서 언급한 zeux의 meshoptimizer에서 [단 한 줄로 구현](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js#L10)되어 있습니다.

시간이 지나면서 WASI가 더 많은 POSIX 지원, 메모리 증가 알림 등을 추가할 수도 있습니다. WASI는 아직 매우 실험적이며 상당한 변화를 겪을 것으로 예상됩니다. 지금은 Emscripten에서 회귀를 피하기 위해 특정 기능을 사용할 경우 100% WASI 바이너리를 생성하지 않습니다. 특히 파일 열기는 WASI가 아닌 POSIX 방법을 사용합니다. 이는 `fopen`을 호출하면 생성된 Wasm 파일이 100% WASI가 되지 않음을 의미합니다. 그러나, 이미 열린 `stdout`에서 작업을 수행하는 `printf`만 사용하는 경우, 우리가 앞서 본 "hello world" 예제처럼 Emscripten의 출력이 WASI 런타임에서 실행되므로 100% WASI가 됩니다.

사용자들에게 유용하다면, 엄격한 WASI 준수를 위해 코드 크기를 희생하는 `PURE_WASI` 옵션을 추가할 수 있습니다. 그러나 이에 대한 긴급성이 높지 않다면(현재까지 본 대부분의 플러그인 사용 사례는 전체 파일 I/O를 필요로 하지 않음), WASI가 개선되어 Emscripten이 이러한 비-WASI API를 제거할 수 있을 때까지 기다리는 것이 더 나을 수 있습니다. 이는 최상의 결과일 것이며, 위에 링크된 내용에서 볼 수 있듯이 우리는 이를 위해 노력하고 있습니다.

그러나 WASI가 개선되더라도, 앞에서 언급한 것처럼 WebAssembly에는 두 가지 표준화된 API가 있다는 사실을 피할 수는 없습니다. 앞으로 Emscripten은 인터페이스 타입을 사용하여 Web API를 직접 호출할 것으로 기대되는데, 이는 WASI-스타일 JS API를 호출한 후 다시 Web API를 호출하는 방식(이전 `musl_writev` 예시와 같은 방식)보다 더 간결하기 때문입니다. 이를 도와줄 폴리필 또는 변환 레이어가 있을 수 있지만, 이를 불필요하게 사용하고 싶지는 않으므로 Web 환경과 WASI 환경에 대해 각각 다른 빌드가 필요할 것입니다. (이는 운이 나쁘게도, WASI가 Web API의 상위 집합이었다면 이 문제를 피할 수 있었을지도 모르지만, 분명히 이는 서버 측에서 타협이 필요했을 것입니다.)

## 현재 상태

꽤 많은 기능이 이미 작동하고 있습니다! 주요 제한 사항은 다음과 같습니다:

- **WebAssembly 제한 사항**: C++ 예외, setjmp, pthreads 등과 같은 다양한 기능이 WebAssembly의 제한으로 인해 JavaScript에 의존하고 있으며, 아직 좋은 비-JS 대체물이 없습니다. (Emscripten은 일부 기능을 [Asyncify를 사용](https://www.youtube.com/watch?v=qQOP6jqZqf8&list=PLqh1Mztq_-N2OnEXkdtF5yymcihwqG57y&index=2&t=0s)하여 지원을 시작할 수 있습니다. 아니면 [네이티브 WebAssembly 기능](https://github.com/WebAssembly/exception-handling/blob/master/proposals/Exceptions.md)이 VM에 도입될 때까지 기다릴 수도 있습니다.)
- **WASI 제한 사항**: OpenGL과 SDL과 같은 라이브러리 및 API는 아직 해당하는 WASI API가 없습니다.

Emscripten의 독립 실행 모드에서는 여전히 위 모든 것을 사용할 **수 있습니다**, 하지만 출력은 JS 런타임 지원 코드 호출을 포함할 것입니다. 결과적으로 100% WASI가 되지 않을 것입니다 (비슷한 이유로 이러한 기능은 WASI SDK에서도 작동하지 않습니다). 해당 WebAssembly 파일은 WASI 런타임에서는 실행되지 않지만, 웹에서 사용할 수 있으며, 이를 위한 자체 JS 런타임을 작성할 수도 있습니다. 또한 이를 플러그인으로 사용할 수 있습니다; 예를 들어, 게임 엔진은 OpenGL을 사용하여 렌더링하는 플러그인이 있을 수 있으며, 개발자는 이를 독립 실행 모드에서 컴파일한 다음 엔진의 WebAssembly 런타임에서 OpenGL 임포트를 구현할 것입니다. 독립 실행 WebAssembly 모드는 여전히 Emscripten이 출력물을 가능한 독립적이게 만드는 데 도움이 됩니다.

아직 변환하지 않은 비-JS 대체물이 있는 API를 찾을 수도 있습니다. 작업이 아직 진행 중입니다. [버그를 제보하십시오](https://github.com/emscripten-core/emscripten/issues), 그리고 언제나 도움을 환영합니다!
