---
title: "JavaScript BigInt와 WebAssembly 통합"
author: "Alon Zakai"
avatars:
  - "alon-zakai"
date: 2020-11-12
tags:
  - WebAssembly
  - ECMAScript
description: "BigInt는 JavaScript와 WebAssembly 간에 64비트 정수를 쉽게 전달할 수 있게 합니다. 이 포스트는 그것이 무엇을 의미하며, 왜 유용한지를 설명합니다. 여기에는 개발자를 위해 더 간단해지고, 코드 실행 속도가 빨라지며, 빌드 시간도 단축되는 이점들이 포함됩니다."
tweet: "1331966281571037186"
---
[JS-BigInt-Integration](https://github.com/WebAssembly/JS-BigInt-integration) 기능은 JavaScript와 WebAssembly 간에 64비트 정수를 쉽게 전달할 수 있도록 합니다. 이 포스트는 그것이 무엇을 의미하며, 왜 유용한지를 설명합니다. 여기에는 개발자를 위해 더 간단해지고, 코드 실행 속도가 빨라지며, 빌드 시간도 단축되는 이점들이 포함됩니다.

<!--truncate-->
## 64비트 정수

JavaScript의 Number는 64비트 부동 소수점 값, 즉 더블입니다. 이러한 값은 모든 32비트 정수를 완벽하게 표현할 수 있지만 모든 64비트 정수를는 표현할 수 없습니다. 반면 WebAssembly는 `i64` 타입을 통해 64비트 정수를 완벽하게 지원합니다. 두 개를 연결할 때 문제가 발생합니다. 예를 들어, Wasm 함수가 `i64`를 반환하면 JavaScript에서 호출할 때 VM이 다음과 같은 예외를 발생시킵니다.

```
TypeError: Wasm function signature contains illegal type
```

오류가 말하듯이, `i64`는 JavaScript에 허용되지 않는 유형입니다.

기존에는 이를 해결하기 위해 Wasm의 “합법화(legalization)”가 사용되었습니다. 합법화는 Wasm의 가져오기 및 내보내기를 JavaScript에 유효한 유형으로 변환하는 것을 의미합니다. 실제로 이는 두 가지 작업을 포함합니다:

1. 64비트 정수 매개 변수를 각각 바닥(low) 및 상위(high) 비트를 나타내는 두 개의 32비트 매개 변수로 대체합니다.
2. 64비트 정수 반환 값을 바닥 비트를 나타내는 32비트 값으로 대체하고, 상위 비트를 나타내는 32비트 값을 추가로 사용합니다.

예를 들어, 다음과 같은 Wasm 모듈을 고려해봅시다:

```wasm
(module
  (func $send_i64 (param $x i64)
    ..))
```

합법화는 이를 다음과 같이 변경합니다:

```wasm
(module
  (func $send_i64 (param $x_low i32) (param $x_high i32)
    (local $x i64) ;; 코드의 나머지 부분에서 사용할 실제 값
    ;; $x_low와 $x_high를 $x로 결합하는 코드
    ..))
```

합법화는 실행 전에 도구 측에서 수행됩니다. 예를 들어, [Binaryen](https://github.com/WebAssembly/binaryen) 도구 체인 라이브러리는 [LegalizeJSInterface](https://github.com/WebAssembly/binaryen/blob/fd7e53fe0ae99bd27179cb35d537e4ce5ec1fe11/src/passes/LegalizeJSInterface.cpp)라는 패스를 제공하며, 이는 [Emscripten](https://emscripten.org/)에서 필요시 자동으로 실행됩니다.

## 합법화의 단점

합법화는 많은 경우에 잘 작동하지만, 몇 가지 단점도 존재합니다. 예를 들어 32비트 조각들을 결합하거나 나누는 추가 작업이 필요합니다. 이는 자주 발생하지는 않지만 중요한 경로에서 발생하면 느려질 수 있습니다. 이에 대한 숫자는 나중에 보겠습니다.

또 다른 단점은 합법화가 JavaScript와 Wasm 간의 인터페이스를 변경하여 사용자에게 눈에 띈다는 점입니다. 아래는 그 예입니다:

```c
// example.c

#include <stdint.h>

extern void send_i64_to_js(int64_t);

int main() {
  send_i64_to_js(0xABCD12345678ULL);
}
```

```javascript
// example.js

mergeInto(LibraryManager.library, {
  send_i64_to_js: function(value) {
    console.log("JS received: 0x" + value.toString(16));
  }
});
```

이것은 [JavaScript 라이브러리](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#implement-c-in-javascript) 함수를 호출하는 작은 C 프로그램입니다. C에서 외부 C 함수를 정의하고 JavaScript에서 구현하여 Wasm과 JavaScript 간에 호출할 수 있는 간단하고 저수준적인 방법입니다. 이 프로그램은 단지 `i64`를 JavaScript로 보내고 이를 출력해 보려 합니다.

이를 빌드하려면 다음을 실행합니다:

```
emcc example.c --js-library example.js -o out.js
```

실행 시 기대했던 결과가 출력되지 않습니다:

```
node out.js
JS received: 0x12345678
```

`0xABCD12345678`을 보냈지만, `0x12345678`만 수신되었습니다 😔. 여기서 발생하는 문제는 합법화가 `i64`를 두 개의 `i32`로 나누었고, 우리의 코드가 낮은 32비트만 받았으며, 보내진 다른 매개 변수를 무시했기 때문입니다. 이를 제대로 처리하려면 다음과 같이 해야 합니다:

```javascript
  // i64는 “low”와 “high”라는 두 개의 32비트 매개 변수로 나뉩니다.
  send_i64_to_js: function(low, high) {
    console.log("JS received: 0x" + high.toString(16) + low.toString(16));
  }
```

이제 실행하면,

```
JS received: 0xabcd12345678
```

합법화와 함께 살 수 있는 방법은 있지만, 약간의 불편함이 있습니다!

## 해결책: JavaScript BigInt

JavaScript에는 이제 임의 크기의 정수를 나타낼 수 있는 [BigInt](/features/bigint) 값이 있으며, 64비트 정수를 정확히 표현할 수 있습니다. 이러한 BigInt를 사용하여 Wasm의 `i64`를 표현하고자 하는 것은 자연스러운 일이며, 바로 JS-BigInt-Integration 기능이 이를 수행합니다!

Emscripten은 Wasm BigInt 통합을 지원하며, 이를 통해 원래 예제를 (합법화를 위한 어떤 핵도 없이) `-s WASM_BIGINT`를 추가하여 컴파일할 수 있습니다:

```
emcc example.c --js-library example.js -o out.js -s WASM_BIGINT
```

그런 다음 실행할 수 있습니다(현재 BigInt 통합을 활성화하기 위해 Node.js에 플래그를 전달해야 한다는 점에 유의하세요):

```
node --experimental-wasm-bigint a.out.js
JS 받음: 0xabcd12345678
```

완벽합니다, 우리가 원했던 그대로입니다!

뿐만 아니라, 이 방식은 더 간단하고 더 빠릅니다. 앞서 언급한 바와 같이, `i64` 변환이 실행 경로에서 발생하는 경우는 드물지만 발생할 경우 속도 저하가 눈에 띄게 나타날 수 있습니다. 위의 예제를 벤치마크로 바꿔서 `send_i64_to_js`를 여러 번 호출하면 BigInt 버전이 18% 더 빠릅니다.

BigInt 통합에서 얻을 수 있는 또 다른 이점은 도구 체인이 합법화를 피할 수 있다는 것입니다. Emscripten이 합법화할 필요가 없다면 LLVM이 생성한 Wasm에서 작업할 필요가 없어져 빌드 시간이 단축됩니다. `-s WASM_BIGINT`로 빌드하고 변경이 필요한 다른 플래그를 제공하지 않으면 이러한 속도 향상을 얻을 수 있습니다. 예를 들어, `-O0 -s WASM_BIGINT`는 작동합니다(그러나 최적화된 빌드는 크기 측면에서 중요한 [Binaryen 옵티마이저를 실행](https://emscripten.org/docs/optimizing/Optimizing-Code.html#link-times)합니다).

## 결론

WebAssembly BigInt 통합이 [여러 브라우저](https://webassembly.org/roadmap/)에 구현되었으며, 2020년 8월 25일에 출시된 Chrome 85를 포함하여 오늘 바로 시도해볼 수 있습니다!
