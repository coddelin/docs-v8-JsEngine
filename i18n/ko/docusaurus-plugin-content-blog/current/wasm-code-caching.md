---
title: "WebAssembly 개발자를 위한 코드 캐싱"
author: '[Bill Budge](https://twitter.com/billb), 캐싱에 'Ca-ching!'을 더하다'
avatars:
  - bill-budge
date: 2019-06-17
tags:
  - WebAssembly
  - internals
description: "이 글은 Chrome의 WebAssembly 코드 캐싱 시스템과, 대형 WebAssembly 모듈을 사용하는 애플리케이션의 로딩 속도를 높이기 위해 이를 어떻게 활용할 수 있는지를 설명합니다."
tweet: "1140631433532334081"
---
개발자들 사이에는 가장 빠른 코드는 실행되지 않는 코드라는 말이 있습니다. 마찬가지로, 가장 빠른 컴파일 코드도 컴파일되지 않아야 합니다. WebAssembly 코드 캐싱은 Chrome과 V8에 새롭게 도입된 최적화 기술로, 컴파일러가 생성한 네이티브 코드를 캐싱하여 코드 컴파일을 피하려고 합니다. 우리는 [JavaScript 코드 캐싱](/blog/code-caching)에 관해 이미 [글을 작성](/blog/improved-code-caching)했으며, 이 최적화를 활용하기 위한 모범 사례에 대해 논의한 바 있습니다. 이번 블로그 글에서는 Chrome의 WebAssembly 코드 캐싱 운영 방식과 이를 통해 대형 WebAssembly 모듈을 사용하는 애플리케이션의 로딩 속도를 높이는 방법에 대해 설명합니다.

<!--truncate-->
## WebAssembly 컴파일 개요

WebAssembly는 Web에서 비(非)JavaScript 코드를 실행할 수 있는 방법입니다. 웹 애플리케이션은 `.wasm` 리소스를 로드함으로써 WebAssembly를 사용할 수 있는데, 이는 C, C++, Rust와 같은 다른 언어에서 부분적으로 컴파일된 코드를 포함합니다. WebAssembly 컴파일러는 `.wasm` 리소스를 디코드하고, 형식이 올바른지 검증한 후에 이를 사용자의 기계에서 실행 가능한 네이티브 머신 코드로 컴파일합니다.

V8에는 WebAssembly를 위한 두 개의 컴파일러가 있습니다: Liftoff와 TurboFan. [Liftoff](/blog/liftoff)는 기본 컴파일러로, 최대한 빠르게 모듈을 컴파일하여 실행을 최대한 빠르게 시작할 수 있도록 합니다. TurboFan은 JavaScript와 WebAssembly를 위한 V8의 최적화 컴파일러입니다. 이 컴파일러는 웹 앱이 장기적으로 최적의 성능을 얻을 수 있도록 고품질 네이티브 코드를 생성하기 위해 백그라운드에서 작동합니다. 대형 WebAssembly 모듈의 경우 TurboFan이 네이티브 코드로 완전히 컴파일하는 데 30초에서 1분 이상 걸릴 수 있습니다.

이때 코드 캐싱이 유용합니다. TurboFan이 대형 WebAssembly 모듈의 컴파일을 완료하면, Chrome은 코드를 캐시에 저장하여 다음 번 모듈 로드 시 Liftoff 및 TurboFan 컴파일링 과정을 건너뛰게 됩니다. 이는 빠른 시작과 전력 소비 감소에 기여하며, 컴파일 작업은 CPU 집약적이기 때문입니다.

WebAssembly 코드 캐싱은 Chrome에서 JavaScript 코드 캐싱에 사용되는 동일한 메커니즘을 사용합니다. 동일한 유형의 저장소와, 서로 다른 원본(origin)별로 컴파일된 코드를 분리할 수 있도록 하는 [사이트 격리](https://developers.google.com/web/updates/2018/07/site-isolation)라는 Chrome 보안 기능과 관련된 이중 키 캐싱 기술을 채택하고 있습니다.

## WebAssembly 코드 캐싱 알고리즘

현재 WebAssembly 캐싱은 스트리밍 API 호출인 `compileStreaming`과 `instantiateStreaming`에 대해서만 구현되어 있습니다. 이들은 `.wasm` 리소스의 HTTP 페치 작업에서 동작하며, Chrome의 리소스 페치 및 캐싱 메커니즘을 더 쉽게 사용할 수 있게 해줍니다. 또한 WebAssembly 모듈을 식별하는 키로 사용할 수 있는 편리한 리소스 URL을 제공합니다. 캐싱 알고리즘은 다음과 같이 작동합니다:

1. `.wasm` 리소스가 처음 요청될 때(즉, _콜드 런_인 경우), Chrome은 네트워크에서 이를 다운로드하고 V8로 스트리밍하여 컴파일합니다. Chrome은 또한 브라우저의 리소스 캐시(사용자 기기의 파일 시스템에 저장됨)에도 `.wasm` 리소스를 저장합니다. 이 리소스 캐시는 필요 시 다음 번 로드 속도를 높이는 데 도움이 됩니다.
1. TurboFan이 해당 모듈의 컴파일을 완전히 완료한 경우, 그리고 `.wasm` 리소스가 충분히 큰 경우(현재 기준으로 128 kB 이상), Chrome은 컴파일된 코드를 WebAssembly 코드 캐시에 기록합니다. 이 코드 캐시는 1단계의 리소스 캐시와 물리적으로 별도입니다.
1. 동일한 `.wasm` 리소스가 두 번째로 요청될 때(즉, _핫 런_인 경우), Chrome은 리소스 캐시에서 `.wasm` 리소스를 로드하고 동시에 코드 캐시를 쿼리합니다. 캐시 적중(cache hit)이 발생하면, 컴파일된 모듈 바이트가 렌더러 프로세스로 전송되어 V8로 전달되고, 이는 모듈을 컴파일하는 대신 코드를 역직렬화합니다. 역직렬화는 컴파일보다 빠르고 CPU 소모가 적습니다.
1. 캐시된 코드가 더 이상 유효하지 않을 수도 있습니다. 이는 `.wasm` 리소스가 변경되었거나, Chrome의 빠른 출시 주기로 인해 V8이 변경되었기 때문일 수 있습니다(즉 최소 6주마다 변화가 예상됨). 이 경우 캐시에 저장된 네이티브 코드는 캐시에서 삭제되며, 1단계의 방식대로 컴파일이 진행됩니다.

이 설명을 기반으로 웹사이트가 WebAssembly 코드 캐싱을 효과적으로 활용하기 위한 몇 가지 권장 사항을 제시할 수 있습니다.

## Tip 1: WebAssembly 스트리밍 API 사용하기

코드 캐싱은 스트리밍 API와 함께 사용할 때만 작동하므로, JavaScript 코드 스니펫처럼 `compileStreaming` 또는 `instantiateStreaming`을 사용하여 WebAssembly 모듈을 컴파일하거나 인스턴스화하세요:

```js
(async () => {
  const fetchPromise = fetch('fibonacci.wasm');
  const { instance } = await WebAssembly.instantiateStreaming(fetchPromise);
  const result = instance.exports.fibonacci(42);
  console.log(result);
})();
```

이 [기사](https://developers.google.com/web/updates/2018/04/loading-wasm)는 WebAssembly 스트리밍 API를 사용하는 것의 장점에 대해 자세히 설명합니다. Emscripten은 기본적으로 앱의 로더 코드를 생성할 때 이 API를 사용하려고 시도합니다. 스트리밍은 `.wasm` 리소스가 올바른 MIME 타입을 가지고 있어야 하므로 서버가 응답에서 `Content-Type: application/wasm` 헤더를 보내야 한다는 점에 유의하세요.

## Tip 2: 캐싱 친화적이 되기

코드 캐싱은 리소스 URL과 `.wasm` 리소스가 최신 상태인지 여부에 따라 달라지므로, 이를 안정적으로 유지하도록 노력해야 합니다. `.wasm` 리소스를 다른 URL에서 가져온 경우 리소스가 별도로 간주되어 V8이 모듈을 다시 컴파일해야 합니다. 마찬가지로 리소스 캐시에 `.wasm` 리소스가 더 이상 유효하지 않을 경우 Chrome은 캐싱된 코드를 삭제해야 합니다.

### 코드를 안정적으로 유지하기

새로운 WebAssembly 모듈을 선적할 때마다 완전히 다시 컴파일해야 합니다. 새로운 기능을 제공하거나 버그를 수정하기 위해 필요한 경우에만 코드를 새 버전으로 선적하세요. 코드가 변경되지 않은 경우 이를 Chrome에 알려주세요. 브라우저가 WebAssembly 모듈 같은 리소스 URL에 대한 HTTP 요청을 수행하면 해당 URL의 마지막으로 가져온 날짜 및 시간을 포함합니다. 서버가 파일이 변경되지 않았다는 것을 알고 있다면 Chrome 및 V8에 캐싱된 리소스와 따라서 캐싱된 코드가 여전히 유효하다는 것을 알려주는 `304 Not Modified` 응답을 보낼 수 있습니다. 반면에 `200 OK` 응답을 반환하면 캐싱된 `.wasm` 리소스를 업데이트하고 코드 캐시를 무효화하여 WebAssembly를 다시 초기 실행 상태로 되돌립니다. [웹 리소스 최적화 베스트 프랙티스](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching)를 따라 `.wasm` 리소스가 캐싱 가능한지, 얼마나 오랫동안 유효할 것으로 예상되는지 또는 마지막으로 수정된 시점에 대해 브라우저에 정보를 제공하도록 응답을 사용하세요.

### 코드의 URL을 변경하지 않기

캐싱된 컴파일된 코드는 `.wasm` 리소스의 URL에 연결되어 있으므로 실제 리소스를 스캔하지 않고도 쉽게 찾을 수 있습니다. 이는 리소스의 URL을 변경하면(모든 쿼리 매개변수가 포함된 경우!) 리소스 캐시에 새로운 항목이 생성되어 완전히 다시 컴파일해야 하며 새로운 코드 캐시 항목이 생성된다는 것을 의미합니다.

### 큰 사이즈로 가기(하지만 너무 크지는 않게!)

WebAssembly 코드 캐싱의 주요 휴리스틱은 `.wasm` 리소스의 크기입니다. `.wasm` 리소스가 특정 크기 임계값보다 작을 경우 컴파일된 모듈 바이트를 캐싱하지 않습니다. 여기서 이유는 V8이 작은 모듈을 빠르게 컴파일할 수 있으며, 캐시에서 컴파일된 코드를 로드하는 것보다 더 빠를 수 있다는 것입니다. 현재는 `.wasm` 리소스 크기가 128 kB 이상일 때를 기준으로 합니다.

그러나 크기가 크다고 항상 좋은 것은 아닙니다. 캐시는 사용자 기기에서 공간을 차지하므로 Chrome은 너무 많은 공간을 소비하지 않도록 주의합니다. 현재 데스크톱 기기에서 코드 캐시는 보통 몇 백 메가바이트 데이터를 저장합니다. Chrome 캐시는 총 캐시 크기의 일부로 캐시에서 가장 큰 항목을 제한하므로 컴파일된 WebAssembly 코드 크기에 대한 추가 제한이 약 150 MB 입니다(총 캐시 크기의 절반). 컴파일된 모듈은 종종 해당 `.wasm` 리소스보다 5–7배 더 큰 경우가 많습니다.

이 크기 휴리스틱 및 캐싱 동작은 사용자와 개발자에게 가장 적합한 방식을 결정하는 과정에서 변경될 수 있습니다.

### 서비스 워커 사용하기

WebAssembly 코드 캐싱은 워커 및 서비스 워커를 지원하므로 이를 사용하여 새로운 버전의 코드를 로드, 컴파일 및 캐싱하여 앱이 다음 번 시작할 때 사용할 수 있게 할 수 있습니다. 모든 웹 사이트는 최소한 한 번은 WebAssembly 모듈을 완전히 컴파일해야 합니다 — 워커를 사용하여 사용자가 이를 느끼지 않도록 하세요.

## 추적

개발자로서 Chrome이 컴파일된 모듈을 캐싱하고 있는지 확인하고 싶을 수 있습니다. WebAssembly 코드 캐싱 이벤트는 기본적으로 Chrome의 개발자 도구에 표시되지 않으므로, 모듈이 캐싱되고 있는지 확인하는 가장 좋은 방법은 약간 더 낮은 수준의 `chrome://tracing` 기능을 사용하는 것입니다.

`chrome://tracing`은 일정 기간 동안 Chrome에서 도구화된 추적 기록을 저장합니다. 추적은 모든 브라우저 동작을 기록하며, 다른 탭, 창 및 확장 프로그램도 포함하므로 깨끗한 사용자 프로필에서 확장 프로그램을 비활성화하고 다른 브라우저 탭을 열지 않은 상태에서 수행하면 더욱 효과적입니다:

```bash
# 깨끗한 사용자 프로필과 확장 프로그램이 비활성화된 상태에서 새 Chrome 브라우저 세션 시작
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

`chrome://tracing`로 이동하여 ‘Record’를 클릭하여 추적 세션을 시작합니다. 나타나는 대화 창에서 ‘Edit Categories’를 클릭한 다음 오른쪽의 ‘Disabled by Default Categories’ 아래에서 `devtools.timeline` 카테고리를 확인합니다 (수집 데이터를 줄이기 위해 미리 선택된 다른 카테고리를 선택 해제할 수 있습니다). 그런 다음 대화창에서 ‘Record’를 클릭하여 추적을 시작합니다.

다른 탭에서 앱을 로드하거나 다시 로드합니다. TurboFan 컴파일이 완료되도록 충분히 실행합니다(10초 이상). 완료되면, ‘Stop’을 클릭하여 추적을 종료합니다. 이벤트의 타임라인 뷰가 나타납니다. 추적 창의 오른쪽 상단엔 텍스트 상자가 있으며, ‘View Options’ 바로 오른쪽에 있습니다. `v8.wasm`를 입력하여 WebAssembly 이벤트 이외의 항목을 필터링합니다. 다음 이벤트 하나 이상을 볼 수 있어야 합니다:

- `v8.wasm.streamFromResponseCallback` — instantiateStreaming에 전달된 리소스 fetch가 응답을 받음.
- `v8.wasm.compiledModule` — TurboFan이 `.wasm` 리소스를 컴파일 완료함.
- `v8.wasm.cachedModule` — Chrome이 컴파일된 모듈을 코드 캐시에 저장함.
- `v8.wasm.moduleCacheHit` — Chrome이 `.wasm` 리소스를 로드하는 동안 캐시에서 코드를 발견함.
- `v8.wasm.moduleCacheInvalid` — V8이 캐시된 코드가 구식이어서 이를 역직렬화할 수 없었음.

첫 실행(cold run)에서는 `v8.wasm.streamFromResponseCallback` 및 `v8.wasm.compiledModule` 이벤트를 볼 것으로 기대됩니다. 이는 WebAssembly 모듈이 수신되었고 컴파일이 성공했음을 나타냅니다. 두 이벤트가 모두 관찰되지 않으면, WebAssembly 스트리밍 API 호출이 올바르게 작동하는지 확인하십시오.

첫 실행 후 크기 임계값을 초과한 경우, `v8.wasm.cachedModule` 이벤트도 볼 것을 기대합니다. 이는 컴파일된 코드가 캐시에 저장되었음을 의미합니다. 이 이벤트가 발생할 수 있지만 쓰기가 어떤 이유로 성공하지 않을 수 있습니다. 이를 관찰할 방법은 현재 없지만 이벤트 메타데이터에서 코드 크기를 확인할 수 있습니다. 매우 큰 모듈은 캐시에 맞지 않을 수 있습니다.

캐시가 제대로 작동할 경우, 두 번째 실행(hot run)에서는 `v8.wasm.streamFromResponseCallback` 및 `v8.wasm.moduleCacheHit`의 두 가지 이벤트가 발생합니다. 이러한 이벤트의 메타데이터를 통해 컴파일된 코드의 크기를 확인할 수 있습니다.

`chrome://tracing` 사용에 대한 자세한 내용은 [JavaScript (bytes) 코드 캐싱 관련 개발자를 위한 기사](/blog/code-caching-for-devs)를 참조하십시오.

## 결론

대부분의 개발자에게는 코드 캐싱이 “그냥 작동“할 것입니다. 다른 캐시와 마찬가지로 안정적인 상태에서 가장 잘 작동합니다. Chrome의 캐싱 휴리스틱은 버전마다 변경될 수 있지만, 코드 캐싱에는 활용할 수 있는 동작과 피할 수 있는 제한이 있습니다. `chrome://tracing`을 사용한 세심한 분석을 통해 웹 앱에 의해 WebAssembly 코드 캐시를 조정하고 최적화할 수 있습니다.
