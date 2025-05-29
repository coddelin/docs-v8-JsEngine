---
title: 'V8 릴리스 v7.0'
author: 'Michael Hablich'
avatars:
  - michael-hablich
date: 2018-10-15 17:17:00
tags:
  - release
description: 'V8 v7.0에는 WebAssembly 스레드, Symbol.prototype.description, 더 많은 플랫폼에서의 내장 기능이 포함되었습니다!'
tweet: '1051857446279532544'
---
매 6주마다 우리는 [릴리스 프로세스](/docs/release-process)의 일환으로 새로운 V8 브랜치를 만듭니다. 각 버전은 Chrome Beta 마일스톤 직전에 V8의 Git 마스터에서 브랜치됩니다. 오늘 우리는 크롬 70 안정판과의 협력으로 몇 주 후 출시될 때까지 베타 상태에 있는 [V8 버전 7.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.0)라는 최신 브랜치를 발표하게 되어 기쁩니다. V8 v7.0에는 다양한 개발자들이 활용할 수 있는 도구들이 가득합니다. 이 포스팅에서는 릴리스에 앞서 몇 가지 주요 기능을 미리 만나볼 수 있습니다.

<!--truncate-->
## 내장 기능

[내장 기능](/blog/embedded-builtins)은 여러 V8 격리 간에 생성된 코드를 공유하여 메모리를 절약합니다. V8 v6.9부터 x64에서 내장 기능이 활성화되었습니다. V8 v7.0은 이 메모리 절약 기능을 ia32를 제외한 모든 플랫폼으로 확장합니다.

## WebAssembly 스레드 미리보기

WebAssembly(Wasm)는 C++ 및 기타 언어로 작성된 코드를 웹에서 실행할 수 있도록 컴파일하는 기능을 제공합니다. 네이티브 애플리케이션의 매우 유용한 기능 중 하나는 스레드, 즉 병렬 계산을 위한 기본 요소를 사용할 수 있는 기능입니다. 대부분의 C 및 C++ 개발자는 애플리케이션 스레드 관리를 위한 표준화된 API인 pthreads에 익숙할 것입니다.

[WebAssembly 커뮤니티 그룹](https://www.w3.org/community/webassembly/)은 실질적인 멀티스레드 애플리케이션을 가능하게 하기 위해 웹에 스레드를 도입하는 작업을 진행 중입니다. 이 노력의 일환으로 V8은 WebAssembly 엔진에서 스레드를 지원하는 데 필요한 지원을 구현했습니다. Chrome에서 이 기능을 사용하려면 `chrome://flags/#enable-webassembly-threads`를 통해 활성화하거나, 귀하의 사이트가 [Origin Trial](https://github.com/GoogleChrome/OriginTrials)에 가입할 수 있습니다. Origin Trial은 새로운 웹 기능이 완전히 표준화되기 전에 개발자가 실험할 수 있도록 하며, 이는 새 기능을 확인하고 개선하는 데 매우 중요한 실제 피드백을 수집하는 데 도움을 줍니다.

## JavaScript 언어 기능

[`description` 속성](https://tc39.es/proposal-Symbol-description/)이 `Symbol.prototype`에 추가되었습니다. 이는 `Symbol`의 설명에 더 편리하게 접근할 수 있는 방법을 제공합니다. 이전에는 설명에 `Symbol.prototype.toString()`을 통해 간접적으로만 접근할 수 있었습니다. 이 구현을 기여한 Igalia에게 감사드립니다!

`Array.prototype.sort`는 이제 V8 v7.0에서 안정적입니다. 이전에는 V8이 10개 이상의 요소가 있는 배열에 대해 불안정한 QuickSort를 사용했습니다. 이제 우리는 안정적인 TimSort 알고리즘을 사용합니다. 더 자세한 내용은 [우리 블로그 게시물](/blog/array-sort)을 참조하세요.

## V8 API

`git log branch-heads/6.9..branch-heads/7.0 include/v8.h`를 사용하여 API 변경 사항 목록을 확인하세요.

[활성 V8 체크아웃](/docs/source-code#using-git)이 있는 개발자는 `git checkout -b 7.0 -t branch-heads/7.0`을 사용하여 V8 v7.0의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널을 구독](https://www.google.com/chrome/browser/beta.html)하여 곧 새로운 기능들을 직접 사용해보세요.
