---
title: '웹어셈블리 브라우저 미리보기'
author: 'V8 팀'
date: 2016-10-31 13:33:37
tags:
  - 웹어셈블리
description: '웹어셈블리 또는 Wasm은 웹을 위한 새로운 런타임 및 컴파일 대상이며, 이제 Chrome Canary에서 플래그 뒤에서 사용할 수 있습니다!'
---
오늘 우리는 [Firefox](https://hacks.mozilla.org/2016/10/webassembly-browser-preview)와 [Edge](https://blogs.windows.com/msedgedev/2016/10/31/webassembly-browser-preview/)와 함께 웹어셈블리 브라우저 미리보기를 발표하게 되어 기쁩니다. [웹어셈블리](http://webassembly.org/) 또는 Wasm은 Google, Mozilla, Microsoft, Apple 및 [W3C 웹어셈블리 커뮤니티 그룹](https://www.w3.org/community/webassembly/)의 협력자들에 의해 설계된 웹을 위한 새로운 런타임 및 컴파일 대상입니다.

<!--truncate-->
## 이 단계는 무엇을 의미하나요?

이 마일스톤은 다음과 같은 점에서 중요합니다:

- 우리의 [MVP](http://webassembly.org/docs/mvp/) (최소 실행 가능 제품) 디자인 (포함 [의미론](http://webassembly.org/docs/semantics/), [바이너리 형식](http://webassembly.org/docs/binary-encoding/), 및 [JS API](http://webassembly.org/docs/js/))의 출시 후보
- V8 및 SpiderMonkey 트렁크에서 플래그 뒤에서 웹어셈블리의 호환 가능하고 안정적인 구현, Chakra 개발 빌드에서의 구현, 그리고 JavaScriptCore에서 개발 진행
- C/C++ 소스 파일에서 웹어셈블리 모듈을 컴파일하기 위한 [작동 도구 체인](http://webassembly.org/getting-started/developers-guide/)
- 커뮤니티 피드백에 기반한 변경사항을 제외하고 웹어셈블리를 기본적으로 제공하기 위한 [로드맵](http://webassembly.org/roadmap/)

[프로젝트 사이트](http://webassembly.org/)에서 웹어셈블리에 대해 더 읽어보실 수 있으며, [개발자 가이드](http://webassembly.org/getting-started/developers-guide/)를 따라 웹어셈블리 컴파일을 C & C++로 시험해볼 수 있습니다. [바이너리 형식](http://webassembly.org/docs/binary-encoding/) 및 [JS API](http://webassembly.org/docs/js/) 문서는 각각 웹어셈블리의 바이너리 인코딩 및 브라우저에서 웹어셈블리 모듈을 인스턴스화하는 메커니즘을 설명합니다. 다음은 wasm이 어떻게 보이는지 보여주는 간단한 샘플입니다:

![웹어셈블리에서 최대 공약수 함수 구현의 예, 원시 바이트, 텍스트 형식(WAST), 및 C 소스 코드가 나열되어 있습니다.](/_img/webassembly-browser-preview/gcd.svg)

웹어셈블리는 아직 Chrome에서 플래그 뒤에 있으므로 ([chrome://flags/#enable-webassembly](chrome://flags/#enable-webassembly)), 아직 프로덕션 사용에 권장되지 않습니다. 그러나 브라우저 미리보기 기간은 사양의 디자인 및 구현에 대한 [피드백](http://webassembly.org/community/feedback/)을 적극적으로 수집하는 시점입니다. 개발자들은 애플리케이션을 컴파일하고 포팅하여 브라우저에서 실행하는 것을 시험해보는 것이 권장됩니다.

V8는 계속해서 [TurboFan 컴파일러](/blog/turbofan-jit)에서 웹어셈블리 구현을 최적화하고 있습니다. 지난 3월 처음 실험적 지원을 발표한 이후, 병렬 컴파일 지원을 추가했습니다. 또한, 기존 asm.js 사이트가 웹어셈블리의 사전 컴파일 이점을 일부 누릴 수 있도록 [내부적으로](https://www.chromestatus.com/feature/5053365658583040) asm.js를 웹어셈블리로 변환하는 대체 asm.js 파이프라인이 거의 완료 단계에 있습니다.

## 다음은 무엇인가요?

커뮤니티 피드백으로 인한 주요 디자인 변경이 없는 경우, 웹어셈블리 커뮤니티 그룹은 Q1 2017에 공식 사양을 작성할 계획이며, 이 시점에서 브라우저는 웹어셈블리를 기본적으로 제공하도록 권장받게 됩니다. 그 시점부터 바이너리 형식은 버전 1로 재설정되고 웹어셈블리는 버전 없이 기능 테스트되고 하위 호환성을 유지할 것입니다. 보다 상세한 [로드맵](http://webassembly.org/roadmap/)은 웹어셈블리 프로젝트 사이트에서 찾을 수 있습니다.
