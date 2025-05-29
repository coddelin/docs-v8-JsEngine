---
title: 'V8에서 WebAssembly의 실험적 지원'
author: 'Seth Thompson, WebAssembly 책임자'
date: 2016-03-15 13:33:37
tags:
  - WebAssembly
description: '오늘부터 V8과 Chromium에서 플래그 뒤에 WebAssembly에 대한 실험적 지원이 제공됩니다.'
---
_WebAssembly의 포괄적인 개요와 미래의 커뮤니티 협력을 위한 로드맵은 Mozilla Hacks 블로그의 [A WebAssembly Milestone](https://hacks.mozilla.org/2016/03/a-webassembly-milestone/)를 참조하세요._

2015년 6월부터 Google, Mozilla, Microsoft, Apple 및 [W3C WebAssembly 커뮤니티 그룹](https://www.w3.org/community/webassembly/participants)의 협력자들은 [설계](https://github.com/WebAssembly/design), [명세화](https://github.com/WebAssembly/spec), 및 WebAssembly의 구현([1](https://www.chromestatus.com/features/5453022515691520), [2](https://platform-status.mozilla.org/#web-assembly), [3](https://github.com/Microsoft/ChakraCore/wiki/Roadmap), [4](https://webkit.org/status/#specification-webassembly))에 열심히 노력해왔습니다. [WebAssembly](https://webassembly.github.io/)는 웹을 위한 새로운 실행 환경 및 컴파일 타겟으로, 메모리 안전 샌드박스 내에서 거의 네이티브 속도로 실행되도록 설계된 소형 이진 형식으로 인코딩된 저수준 이동 가능한 바이트 코드입니다. 기존 기술의 진화로서 WebAssembly는 웹 플랫폼에 긴밀히 통합되어 있으며, 네트워크에서 다운로드 속도가 더 빠르고 [asm.js](http://asmjs.org/)라는 JavaScript의 저수준 하위 집합보다 초기화가 더 빠릅니다.

<!--truncate-->
오늘부터 V8과 Chromium에서 플래그 뒤에 WebAssembly에 대한 실험적 지원이 제공됩니다. V8에서 이를 사용하려면 명령줄에서 `d8` 버전 5.1.117 또는 그 이상의 버전을 `--expose_wasm` 플래그와 함께 실행하거나 Chrome Canary 51.0.2677.0 이상의 버전에서 `chrome://flags#enable-webassembly`에서 Experimental WebAssembly 기능을 활성화하세요. 브라우저를 다시 시작한 후 JavaScript 컨텍스트에서 WebAssembly 모듈을 인스턴스화하고 실행할 수 있는 `Wasm` 개체를 사용할 수 있습니다. **Mozilla와 Microsoft 협력자들의 노력 덕분에 [Firefox Nightly](https://hacks.mozilla.org/2016/03/a-webassembly-milestone)와 [Microsoft Edge](http://blogs.windows.com/msedgedev/2016/03/15/previewing-webassembly-experiments)의 내부 빌드에서도 플래그 뒤에서 호환 가능한 WebAssembly 구현 두 개가 실행되고 있습니다(비디오 화면 캡쳐로 시연됨).**

WebAssembly 프로젝트 웹사이트에는 3D 게임에서 런타임 사용 사례를 보여주는 [데모](https://webassembly.github.io/demo/)가 있습니다. WebAssembly를 지원하는 브라우저에서는 데모 페이지가 WebGL 및 기타 웹 플랫폼 API를 사용하여 상호작용할 수 있는 게임을 렌더링하는 wasm 모듈을 로드하고 인스턴스화합니다. 다른 브라우저에서는 같은 게임의 asm.js 버전으로 대체됩니다.

![[WebAssembly 데모](https://webassembly.github.io/demo/)](/_img/webassembly-experimental/tanks.jpg)

WebAssembly의 V8 구현은 JavaScript 가상 머신 인프라를 재사용하도록 설계되었습니다. 특히 [TurboFan 컴파일러](/blog/turbofan-jit)를 활용합니다. 전문화된 WebAssembly 디코더는 모듈의 유형, 로컬 변수 인덱스, 함수 참조, 반환 값 및 제어 흐름 구조를 단일 패스로 확인하여 모듈을 검증합니다. 디코더는 TurboFan 그래프를 생성하며 이는 다양한 최적화 패스를 거쳐 최종적으로 JavaScript 및 asm.js를 위한 최적화된 기계 코드와 동일한 백엔드를 사용하여 기계 코드로 변환됩니다. 앞으로 몇 개월 동안 팀은 컴파일러 튜닝, 병렬 처리 및 컴파일 정책 개선을 통해 V8 구현의 시작 시간을 개선하는 데 집중할 예정입니다.

두 가지 주요 변경 사항이 개발자 경험을 크게 개선할 것입니다. WebAssembly의 표준 텍스트 표현은 개발자가 기타 웹 스크립트나 리소스처럼 WebAssembly 바이너리 소스를 볼 수 있도록 해줍니다. 또한 현재의 임시 `Wasm` 개체는 JavaScript에서 WebAssembly 모듈을 인스턴스화하고 탐색할 수 있는 보다 강력하고 관용적인 메서드와 속성 세트를 제공하도록 재설계될 것입니다.
