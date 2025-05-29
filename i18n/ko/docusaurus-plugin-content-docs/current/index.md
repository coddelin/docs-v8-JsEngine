---
title: "문서"
description: "V8 프로젝트에 대한 문서입니다."
slug: "/"
---
V8는 Google의 오픈 소스 고성능 JavaScript 및 WebAssembly 엔진으로, C++로 작성되었습니다. 이는 Chrome 및 Node.js를 포함한 여러 곳에서 사용됩니다.

이 문서는 V8을 응용 프로그램에서 사용하려는 C++ 개발자와 V8의 설계 및 성능에 관심이 있는 모든 사람을 대상으로 합니다. 이 문서는 V8에 대해 소개하며, 나머지 문서는 코드 내에서 V8을 사용하는 방법, 일부 설계 세부 정보 및 V8의 성능을 측정하기 위한 JavaScript 벤치마크를 제공합니다.

## V8 소개

V8는 <a href="https://tc39.es/ecma262/">ECMAScript</a> 및 <a href="https://webassembly.github.io/spec/core/">WebAssembly</a>를 구현하며, x64, IA-32 또는 ARM 프로세서를 사용하는 Windows, macOS 및 Linux 시스템에서 실행됩니다. 추가 시스템(IBM i, AIX) 및 프로세서(MIPS, ppcle64, s390x)는 외부에서 유지됩니다. 자세한 내용은 [포트](/ports)를 참조하세요. V8는 C++ 응용 프로그램에 임베드될 수 있습니다.

V8는 JavaScript 소스 코드를 컴파일하고 실행하며, 객체를 위한 메모리 할당을 처리하고, 더 이상 필요하지 않은 객체를 가비지 수집합니다. V8의 스톱-더-월드 방식의 세대별 정확한 가비지 수집기는 V8의 성능의 주요 요소 중 하나입니다.

JavaScript는 일반적으로 브라우저에서 클라이언트 측 스크립팅에 사용되며, 예를 들어 문서 객체 모델(DOM) 객체를 조작하는 데 사용됩니다. 그러나 DOM은 일반적으로 JavaScript 엔진이 아닌 브라우저에 의해 제공됩니다. V8에도 동일하게 적용되며, Google Chrome이 DOM을 제공합니다. 그러나 V8는 ECMA 표준에 지정된 모든 데이터 유형, 연산자, 객체 및 기능을 제공합니다.

V8는 모든 C++ 응용 프로그램이 자체 객체와 기능을 JavaScript 코드에 노출할 수 있게 합니다. JavaScript에 노출할 객체와 기능은 여러분이 결정할 몫입니다.

## 문서 개요

- [소스에서 V8 빌드하기](/build)
    - [V8 소스 코드 체크아웃](/source-code)
    - [GN으로 빌드하기](/build-gn)
    - [ARM/Android용 교차 컴파일 및 디버깅](/cross-compile-arm)
    - [iOS용 교차 컴파일](/cross-compile-ios)
    - [GUI 및 IDE 설정](/ide-setup)
    - [Arm64에서 컴파일하기](/compile-arm64)
- [기여하기](/contribute)
    - [존중하는 코드](/respectful-code)
    - [V8의 공개 API 및 그 안정성](/api)
    - [V8 커미터가 되는 법](/become-committer)
    - [커미터의 책임](/committer-responsibility)
    - [Blink 웹 테스트(레이아웃 테스트)](/blink-layout-tests)
    - [코드 커버리지 평가](/evaluate-code-coverage)
    - [릴리스 프로세스](/release-process)
    - [설계 검토 지침](/design-review-guidelines)
    - [JavaScript/WebAssembly 언어 기능 구현 및 배포](/feature-launch-process)
    - [WebAssembly 기능의 스테이징 및 배포 체크리스트](/wasm-shipping-checklist)
    - [플레이크 이분 탐색](/flake-bisect)
    - [포트 처리](/ports)
    - [공식 지원](/official-support)
    - [병합 및 패치](/merge-patch)
    - [Node.js 통합 빌드](/node-integration)
    - [보안 버그 보고](/security-bugs)
    - [로컬 벤치마크 실행](/benchmarks)
    - [테스트하기](/test)
    - [이슈 분류](/triage-issues)
- 디버깅
    - [시뮬레이터를 사용한 ARM 디버깅](/debug-arm)
    - [ARM/Android용 교차 컴파일 및 디버깅](/cross-compile-arm)
    - [GDB로 내장 기능 디버깅](/gdb)
    - [V8 인스펙터 프로토콜을 통해 디버깅](/inspector)
    - [GDB JIT 컴파일 인터페이스 통합](/gdb-jit)
    - [메모리 누수 조사](/memory-leaks)
    - [스택 트레이스 API](/stack-trace-api)
    - [D8 사용하기](/d8)
    - [V8 도구](https://v8.dev/tools)
- V8 임베딩
    - [V8 임베딩 가이드](/embed)
    - [버전 번호](/version-numbers)
    - [내장 함수](/builtin-functions)
    - [i18n 지원](/i18n)
    - [신뢰할 수 없는 코드 완화](/untrusted-code-mitigations)
- 내부 구조
    - [Ignition](/ignition)
    - [TurboFan](/turbofan)
    - [Torque 사용자 매뉴얼](/torque)
    - [Torque 내장 기능 쓰기](/torque-builtins)
    - [CSA 내장 기능 쓰기](/csa-builtins)
    - [새로운 WebAssembly 명령 추가](/webassembly-opcode)
    - [맵(히든 클래스)](/hidden-classes)
    - [슬랙 추적 - 무엇인가요?](/blog/slack-tracking)
    - [WebAssembly 컴파일 파이프라인](/wasm-compilation-pipeline)
- 최적화 가능한 JavaScript 작성
    - [V8 샘플 기반 프로파일러 사용](/profile)
    - [Chromium에서 V8 프로파일링](/profile-chromium)
    - [Linux `perf`를 사용한 V8 프로파일링](/linux-perf)
    - [V8 추적하기](/trace)
    - [런타임 호출 통계 사용](/rcs)
