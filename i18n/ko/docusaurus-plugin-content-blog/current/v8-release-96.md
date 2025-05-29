---
title: "V8 릴리스 v9.6"
author: "잉그바 스테파니안 ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-10-13
tags:
 - 릴리스
description: "V8 릴리스 v9.6은 WebAssembly에 참조 타입 지원을 제공합니다."
tweet: "1448262079476076548"
---
매 4주마다 우리는 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새 브랜치를 생성합니다. 각 버전은 Chrome 베타 마일스톤 직전 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 최신 브랜치 [V8 버전 9.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.6)을 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 Chrome 96 스테이블과 함께 릴리스될 때까지 베타 상태에 있습니다. V8 v9.6은 개발자들이 활용할 수 있는 다양한 요소들로 가득 차 있습니다. 이번 게시물에서는 릴리스에 앞서 몇 가지 주요 하이라이트를 미리 살펴봅니다.

<!--truncate-->
## WebAssembly

### 참조 타입

V8 v9.6에 포함된 [참조 타입 제안](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md)은 WebAssembly 모듈에서 JavaScript 외부 참조를 불투명하게 사용하는 것을 허용합니다. `externref` (이전 명칭: `anyref`) 데이터 타입은 JavaScript 객체에 대한 참조를 안전하게 유지하는 방법을 제공하며 V8의 가비지 컬렉터와 완전히 통합됩니다.

참조 타입에 대한 선택적 지원을 이미 포함하고 있는 몇 가지 툴체인으로는 [Rust용 wasm-bindgen](https://rustwasm.github.io/wasm-bindgen/reference/reference-types.html)과 [AssemblyScript](https://www.assemblyscript.org/compiler.html#command-line-options)가 있습니다.

## V8 API

`git log branch-heads/9.5..branch-heads/9.6 include/v8\*.h`를 사용하여 API 변경 사항 목록을 확인할 수 있습니다.

활성 V8 체크아웃을 보유한 개발자는 `git checkout -b 9.6 -t branch-heads/9.6`를 사용하여 V8 v9.6의 새로운 기능을 실험해 볼 수 있습니다. 또는 [Chrome의 베타 채널에 구독](https://www.google.com/chrome/browser/beta.html)하여 곧 새로운 기능들을 직접 시도해 볼 수 있습니다.
