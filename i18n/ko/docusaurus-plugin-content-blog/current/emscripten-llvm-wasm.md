---
title: "Emscripten과 LLVM WebAssembly 백엔드"
author: "Alon Zakai"
avatars:
  - "alon-zakai"
date: 2019-07-01 16:45:00
tags:
  - WebAssembly
  - tooling
description: "Emscripten이 LLVM WebAssembly 백엔드로 전환하여 링크 시간이 훨씬 더 빨라지고 많은 이점을 제공합니다."
tweet: "1145704863377981445"
---
WebAssembly는 일반적으로 소스 언어에서 컴파일되며, 이는 개발자가 WebAssembly를 사용하기 위해 *도구*가 필요함을 의미합니다. 그렇기 때문에 V8 팀은 [LLVM](http://llvm.org/), [Emscripten](https://emscripten.org/), [Binaryen](https://github.com/WebAssembly/binaryen/), [WABT](https://github.com/WebAssembly/wabt)와 같은 관련 오픈 소스 프로젝트에서 작업하고 있습니다. 이 게시물은 Emscripten과 LLVM에서 우리가 수행해 온 작업을 설명하며, 곧 Emscripten이 기본적으로 [LLVM WebAssembly 백엔드](https://github.com/llvm/llvm-project/tree/main/llvm/lib/Target/WebAssembly)로 전환할 수 있게 될 것입니다. 많은 테스트를 거쳐 문제를 보고해주세요!

<!--truncate-->
LLVM WebAssembly 백엔드는 이미 Emscripten에서 옵션으로 제공되고 있었으며, 우리는 백엔드 통합 작업과 오픈 소스 WebAssembly 도구 커뮤니티와의 협업을 병행하며 이 백엔드를 개발해왔습니다. 이제 WebAssembly 백엔드가 대부분의 측정 지표에서 이전의 “[fastcomp](https://github.com/emscripten-core/emscripten-fastcomp/)” 백엔드를 능가하는 수준에 도달하였으며, 따라서 기본값을 변경하려고 합니다. 이 발표는 변경 전에 최대한 많은 테스트를 받을 수 있도록 미리 이루어지는 것입니다.

여러 흥미로운 이유로 이 업그레이드는 중요합니다:

- **훨씬 더 빠른 링크**: LLVM WebAssembly 백엔드는 [`wasm-ld`](https://lld.llvm.org/WebAssembly.html)와 함께 WebAssembly 객체 파일을 사용한 증분 컴파일을 완전히 지원합니다. Fastcomp은 비트코드 파일의 LLVM IR을 사용하여 링크 시 모두 LLVM에서 컴파일해야 했으며, 이는 느린 링크 시간의 주요 원인이었습니다. 반면 WebAssembly 객체 파일에서는 `.o` 파일이 이미 컴파일된 WebAssembly(링크 가능한 재배치 형식)를 포함하므로, 링크 단계가 fastcomp과 비교할 때 훨씬 빠를 수 있습니다. 아래에서 실제 환경 측정을 통해 7배의 속도 향상을 보여드립니다!
- **더 빠르고 더 작은 코드**: 우리는 LLVM WebAssembly 백엔드와 Emscripten 실행 후 Binaryen 최적화 도구에서 많은 노력을 기울였습니다. 그 결과, LLVM WebAssembly 백엔드는 대부분의 속도 및 크기 벤치마크에서 fastcomp을 능가합니다.
- **모든 LLVM IR 지원**: Fastcomp은 `clang`이 내보낸 LLVM IR을 처리할 수 있었지만, 아키텍처의 한계로 인해 종종 다른 소스에서는 실패하곤 했습니다. 특히, Fastcomp이 처리할 수 있는 유형으로 IR을 “합법화”하는 데 문제가 있었습니다. 반면 LLVM WebAssembly 백엔드는 공통 LLVM 백엔드 인프라를 사용하며, 모든 것을 처리할 수 있습니다.
- **새로운 WebAssembly 기능**: Fastcomp은 `asm2wasm`을 실행하기 전에 asm.js로 컴파일하였기 때문에 테일 콜, 예외, SIMD와 같은 새로운 WebAssembly 기능을 처리하는 데 어려움이 있었습니다. WebAssembly 백엔드는 이러한 기능 작업을 진행할 자연스러운 장소이며, 실제로 이러한 모든 기능에 대해 작업하고 있습니다!
- **업스트림에서의 더 빠른 전체 업데이트**: 마지막 포인트와 관련하여, 업스트림 WebAssembly 백엔드를 사용하면 항상 최신 LLVM 업스트림을 사용할 수 있으므로 `clang`에서 새로운 C++ 언어 기능, 새로운 LLVM IR 최적화를 포함한 모든 최신 기능을 즉시 활용할 수 있습니다.

## 테스트

WebAssembly 백엔드를 테스트하려면, [최신 `emsdk`](https://github.com/emscripten-core/emsdk)를 사용하고 다음을 수행하세요:

```
emsdk install latest-upstream
emsdk activate latest-upstream
```

여기서 “Upstream”은 LLVM WebAssembly 백엔드가 기존 fastcomp과 달리 LLVM 업스트림에 있다는 것을 의미합니다. 사실, 업스트림에 있기 때문에 `emsdk`를 사용할 필요 없이 직접 LLVM+`clang`을 빌드하여 사용할 수도 있습니다! (Emscripten과 함께 이러한 빌드를 사용하려면 `.emscripten` 파일에 해당 경로를 추가하기만 하면 됩니다.)

현재 `emsdk [install|activate] latest`를 사용하면 fastcomp을 계속 사용합니다. 또한 “latest-fastcomp”도 동일하게 작동합니다. 기본 백엔드를 전환하면 “latest”는 “latest-upstream”과 동일하게 작동하며, 해당 시점에 “latest-fastcomp”는 fastcomp을 얻을 수 있는 유일한 방법이 될 것입니다. Fastcomp은 여전히 유용하기 때문에 옵션으로 남아 있습니다. 이와 관련된 추가 메모는 마지막 부분에서 확인하실 수 있습니다.

## 히스토리

이것은 Emscripten에서 **세 번째** 백엔드이자 **두 번째** 마이그레이션이 될 것입니다. 첫 번째 백엔드는 JavaScript로 작성되었으며 텍스트 형식의 LLVM IR을 파싱했습니다. 2010년 실험적으로 유용했지만, LLVM의 텍스트 형식이 변경되거나 컴파일 속도가 기대만큼 빠르지 않다는 등의 명백한 단점이 있었습니다. 2013년에는 “fastcomp”라는 별명을 가진 LLVM 포크에서 새로운 백엔드가 작성되었습니다. 이를 통해 이전의 JS 백엔드가 약간 변형된 방식으로 수행했던 [asm.js](https://en.wikipedia.org/wiki/Asm.js)를 생성하도록 설계되었습니다 (하지만 이전 백엔드는 이를 잘 수행하지 못했습니다). 결과적으로 코드 품질과 컴파일 시간 모두에서 큰 향상이 있었습니다.

Emscripten에서는 비교적 사소한 변경이었습니다. Emscripten이 컴파일러이긴 하지만, 원래의 백엔드와 fastcomp는 항상 프로젝트에서 상대적으로 작은 부분만을 차지했습니다 — 시스템 라이브러리, 도구체인 통합, 언어 바인딩 등에는 훨씬 더 많은 코드가 들어갑니다. 따라서 컴파일러 백엔드를 전환하는 것이 극적인 변화이긴 해도, 전체 프로젝트 중 한 부분에만 영향을 미치게 됩니다.

## 벤치마크

### 코드 크기

![코드 크기 측정 (낮을수록 좋음)](/_img/emscripten-llvm-wasm/size.svg)

(여기 모든 크기는 fastcomp에 정규화되었습니다.) 보시다시피, WebAssembly 백엔드의 크기는 거의 항상 더 작습니다! 차이는 주로 왼쪽의 소규모 마이크로벤치마크(소문자로 표시된 이름)에서 두드러집니다. 이는 시스템 라이브러리의 새로운 개선 사항이 더 큰 영향을 미치기 때문입니다. 하지만 오른쪽의 대규모 매크로벤치마크(대문자로 표시된 이름)에서도 대부분의 경우 코드 크기가 줄어드는 것을 볼 수 있습니다. 매크로벤치마크 중 유일한 퇴보 사례는 LZMA로, 최신 LLVM이 다른 인라인 결정을 내려 다소 운이 나빴습니다.

전체적으로 매크로벤치마크는 평균 **3.7%** 축소됩니다. 컴파일러 업그레이드치고는 나쁘지 않습니다! 테스트 스위트에 포함되지 않은 실제 코드베이스에서도 비슷한 결과를 볼 수 있습니다. 예를 들어 웹으로 포팅된 [Cube 2 게임 엔진](http://cubeengine.com/)의 [BananaBread](https://github.com/kripken/BananaBread/)는 **6% 이상** 축소되었고, [Doom 3은](http://www.continuation-labs.com/projects/d3wasm/) **15%** 축소되었습니다!

이 크기 개선(그리고 다음에 논의할 속도 개선)은 여러 요인에 기인합니다:

- LLVM의 백엔드 코드 생성은 fastcomp와 같은 단순 백엔드가 할 수 없는 [GVN](https://en.wikipedia.org/wiki/Value_numbering)과 같은 작업을 수행할 수 있을 정도로 스마트합니다.
- 최신 LLVM은 더 나은 IR 최적화를 제공합니다.
- 앞서 언급한 바와 같이, WebAssembly 백엔드의 출력에 대해 Binaryen 옵티마이저를 조정하기 위해 많은 작업을 수행했습니다.

### 속도

![속도 측정 (낮을수록 좋음)](/_img/emscripten-llvm-wasm/speed.svg)

(측정은 V8에서 수행되었습니다.) 마이크로벤치마크 중에서 속도는 혼재된 결과를 보입니다 — 이는 그다지 놀랍지 않습니다. 대부분의 마이크로벤치마크는 단일 함수나 루프에 의해 지배되기 때문에, Emscripten이 생성한 코드의 변경은 VM의 최적화 선택에서 다소 운이 좋거나 나쁜 결과를 초래할 수 있습니다. 전체적으로 보았을 때, 마이크로벤치마크는 개선된 것, 동일한 것, 퇴보된 것이 대략 동일한 숫자를 차지합니다. 보다 현실적인 매크로벤치마크를 살펴보면, 다시 한번 LZMA는 이전에 언급한 운이 나쁜 인라인 결정 때문에 예외적이지만, 그 외의 모든 매크로벤치마크는 개선됩니다!

매크로벤치마크의 평균 변화는 **3.2%** 속도 향상입니다.

### 빌드 시간

![BananaBread의 컴파일 및 링크 시간 측정 (낮을수록 좋음)](/_img/emscripten-llvm-wasm/build.svg)

빌드 시간 변경은 프로젝트에 따라 다르겠지만, 여기 BananaBread에서 일부 예제 숫자를 보여드립니다. BananaBread는 112개의 파일과 95,287개의 코드 줄로 구성된 완전하지만 컴팩트한 게임 엔진입니다. 왼쪽에는 소스 파일을 오브젝트 파일로 컴파일하는 컴파일 단계에 대한 빌드 시간이 있습니다. 프로젝트의 기본 `-O3`을 사용합니다 (모든 시간은 fastcomp에 정규화됨). 보시다시피 WebAssembly 백엔드를 사용할 때 컴파일 단계는 약간 더 오래 걸립니다. 이는 이 단계에서 더 많은 작업을 수행하기 때문입니다 — fastcomp처럼 단순히 소스를 비트코드로만 컴파일하는 것이 아니라, 비트코드를 WebAssembly로도 컴파일하기 때문입니다.

오른쪽을 보면, 링크 단계의 숫자가 있습니다 (fastcomp에 정규화됨). 즉, 최종 실행 파일을 생성하는 단계로 여기서는 `-O0`을 사용하여 증분 빌드에 적합합니다 (완전히 최적화하려면 `-O3`도 사용할 수 있습니다, 아래 참조). 컴파일 단계에서의 약간의 증가가 가치가 있는 것으로 판명됩니다. 왜냐하면 링크가 **7배 이상 빠르게** 이루어지기 때문입니다! 이것이 증분 컴파일의 진정한 장점입니다. 링크 단계의 대부분은 오브젝트 파일의 빠른 연결 작업일 뿐입니다. 그리고 소스 파일 하나만 변경하고 다시 빌드하면 거의 모든 것은 그 빠른 링크 단계만 필요하므로, 실제 개발 과정에서 이 속도 향상을 항상 경험할 수 있습니다.

위에서 언급했듯이, 빌드 시간 변화는 프로젝트마다 다릅니다. BananaBread보다 작은 프로젝트에서는 링크 시간 속도의 향상이 더 작을 수 있고, 더 큰 프로젝트에서는 더 클 수 있습니다. 또 다른 요인은 최적화입니다. 위에서 언급했듯이 테스트는 `-O0`으로 링크되었으나, 릴리스 빌드에서는 아마도 `-O3`를 사용하고 싶을 것입니다. 이 경우 Emscripten은 최종 WebAssembly에 대해 Binaryen 최적화를 실행하고 [meta-dce](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/) 및 코드 크기와 속도를 위한 기타 유용한 작업을 실행합니다. 물론 이는 추가 시간이 걸리며, 릴리스 빌드에서는 충분히 가치가 있습니다. BananaBread의 경우 WebAssembly 크기가 2.65MB에서 1.84MB로 감소하여 **30%** 이상의 개선을 보여줍니다. 하지만 빠른 단계적 빌드를 위해 `-O0`을 사용하여 이를 생략할 수 있습니다.

## 알려진 문제

LLVM WebAssembly 백엔드는 일반적으로 코드 크기와 속도 모두에서 우위를 점하지만, 몇 가지 예외가 있습니다:

- [Fasta](https://github.com/emscripten-core/emscripten/blob/incoming/tests/fasta.cpp)는 [비트랩핑 부동소수점-정수 변환](https://github.com/WebAssembly/nontrapping-float-to-int-conversions)이 없으면 회귀합니다. 이는 WebAssembly MVP에 포함되지 않은 새로운 WebAssembly 기능입니다. MVP에서는 유효한 정수 범위를 벗어난 경우 부동소수점-정수 변환이 트랩을 유발할 수 있습니다. 이 기능의 이론적 근거는 C에서 어차피 정의되지 않은 동작이고 VM 구현이 용이하다는 점입니다. 그러나 이것은 LLVM이 부동소수점을 정수로 변환하는 방식과 잘 맞지 않으며, 결과적으로 추가적인 경계가 필요하고 코드 크기와 오버헤드가 증가합니다. 새로운 비트랩핑 연산은 이를 방지하지만 아직 모든 브라우저에 존재하지 않을 수 있습니다. 소스 파일을 `-mnontrapping-fptoint`로 컴파일하여 이를 사용할 수 있습니다.
- LLVM WebAssembly 백엔드는 Fastcomp과 다른 백엔드일 뿐만 아니라 훨씬 새로운 LLVM을 사용합니다. 새로운 LLVM은 다른 인라인 결정을 내릴 수 있습니다. 이러한 결정은 프로파일 기반 최적화가 없는 경우 휴리스틱 기반이며, 결과적으로 도움이 될 수도 있고 해가 될 수도 있습니다. 이전에 언급했던 LZMA 벤치마크의 특정 예시는 새로운 LLVM이 한 함수를 5번 인라이닝하여 오히려 해를 끼친 경우입니다. 자신의 프로젝트에서 이런 문제가 발생한다면 특정 소스 파일을 `-Os`로 빌드하여 코드 크기에 집중하거나, `__attribute__((noinline))` 등을 사용할 수 있습니다.

최적화되어야 하지만 아직 인지하지 못한 다른 문제가 있을 수 있습니다. 발견하시면 저희에게 알려주세요!

## 기타 변경 사항

소수의 Emscripten 기능은 Fastcomp 및 / 또는 asm.js에 연결되어 있어 WebAssembly 백엔드에서는 기본적으로 작동할 수 없기 때문에 대안을 마련하고 있습니다.

### JavaScript 출력

WebAssembly 출력이 아닌 옵션은 여전히 일부 경우 중요합니다. 모든 주요 브라우저가 WebAssembly를 지원한 지 시간이 꽤 되었지만, 여전히 오랜된 기계, 오래된 전화기 등에서는 WebAssembly 지원이 없습니다. 또한, WebAssembly가 새로운 기능을 추가함에 따라 이러한 문제가 계속 중요해질 것입니다. JS로 컴파일하는 것은 WebAssembly만큼 작거나 빠르지는 않더라도 모든 사용자에게 도달할 수 있는 보장을 제공합니다. Fastcomp에서는 단순히 asm.js 출력을 직접 사용했지만, WebAssembly 백엔드에서는 명백히 다른 것이 필요합니다. 이를 위해 Binaryen의 [`wasm2js`](https://github.com/WebAssembly/binaryen#wasm2js)를 사용하며, 이름에서 알 수 있듯이 WebAssembly를 JS로 컴파일합니다.

이는 아마 전체 블로그 게시물로 작성할 가치가 있지만, 간단히 말하자면 여기서 핵심 설계 결정은 더 이상 asm.js를 지원할 필요가 없다는 것입니다. asm.js는 일반 JS보다 훨씬 빠르게 실행될 수 있지만, asm.js AOT 최적화를 지원하는 거의 모든 브라우저가 어쨌든 WebAssembly를 지원합니다(실제로 Chrome은 내부적으로 asm.js를 WebAssembly로 변환하여 최적화합니다!). 따라서 JS 대안 옵션을 논할 때 asm.js를 사용할 필요가 없습니다; 사실 더 간단하고 WebAssembly에서 더 많은 기능을 지원할 수 있으며 JS 크기도 크게 줄어듭니다! 따라서 `wasm2js`는 asm.js를 대상으로 하지 않습니다.

하지만 이러한 설계의 부작용은 Fastcomp에서 만든 asm.js 빌드와 WebAssembly 백엔드에서 만든 JS 빌드를 비교할 경우 asm.js가 훨씬 더 빠를 수 있다는 점입니다 — 특히 asm.js AOT 최적화를 지원하는 최신 브라우저에서 테스트하는 경우 그렇습니다. 이는 아마도 당신의 브라우저가 그러할 것이지만 WebAssembly 옵션이 필요할 실제 브라우저는 그렇지 않을 것입니다! 적절한 비교를 위해서는 asm.js 최적화가 없는 브라우저를 사용하거나 이를 비활성화해야 합니다. `wasm2js` 출력이 여전히 더 느리다면, 저희에게 알려주세요!

`wasm2js`는 동적 링크와 pthreads와 같은 덜 사용되는 기능이 없지만, 대부분의 코드는 이미 작동하며, 신중하게 퍼지 테스트를 완료했습니다. JS 출력을 테스트하려면 그냥 WebAssembly를 비활성화하기 위해 `-s WASM=0`로 빌드하면 됩니다. `emcc`는 그런 후 `wasm2js`를 실행하고, 최적화된 빌드인 경우 다양한 유용한 최적화도 실행합니다.

### 다른 유의 사항

- [Asyncify](https://github.com/emscripten-core/emscripten/wiki/Asyncify)와 [Emterpreter](https://github.com/emscripten-core/emscripten/wiki/Emterpreter) 옵션은 Fastcomp에서만 작동합니다. 대체 [작업이](https://github.com/WebAssembly/binaryen/pull/2172) [진행](https://github.com/WebAssembly/binaryen/pull/2173) [중](https://github.com/emscripten-core/emscripten/pull/8808)[입니다](https://github.com/emscripten-core/emscripten/issues/8561). 이는 결국 이전 옵션보다 개선될 것으로 기대됩니다.
- 미리 만들어진 라이브러리는 재구성이 필요합니다: 일부 `library.bc`가 fastcomp로 빌드된 경우, 최신 Emscripten을 사용하여 소스에서 다시 빌드해야 합니다. 이는 fastcomp가 LLVM을 새로운 버전으로 업그레이드하여 비트코드 형식을 변경했을 때 항상 발생했던 문제이며, 이제 WebAssembly 객체 파일로 변경됨으로써 같은 영향을 미칩니다.

## 결론

현재 우리의 주요 목표는 이 변경 사항과 관련된 모든 버그를 수정하는 것입니다. 테스트를 해보고 문제를 보고해주세요!

상황이 안정되면 기본 컴파일러 백엔드를 최신 WebAssembly 백엔드로 전환할 것입니다. 앞서 언급했듯이 Fastcomp은 옵션으로 유지될 것입니다.

궁극적으로는 Fastcomp을 완전히 제거하고 싶습니다. 그렇게 하면 상당한 유지보수 부담을 제거하고, WebAssembly 백엔드에서 새로운 기능을 더 집중적으로 개발할 수 있으며, Emscripten의 전반적인 개선 속도를 높이는 등의 여러 장점이 있습니다. 코드베이스 테스트 결과를 공유해주시면 Fastcomp 제거 일정 계획을 세울 수 있습니다.

### 감사의 말씀

LLVM WebAssembly 백엔드, `wasm-ld`, Binaryen, Emscripten 및 이 글에서 언급된 기타 작업에 참여한 모든 분들께 감사드립니다! 멋진 사람들의 일부 목록은 다음과 같습니다: aardappel, aheejin, alexcrichton, dschuff, jfbastien, jgravelle, nwilson, sbc100, sunfish, tlively, yurydelendik.
