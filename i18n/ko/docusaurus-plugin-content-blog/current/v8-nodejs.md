---
title: 'V8 ❤️ Node.js'
author: 'Franziska Hinkelmann, Node Monkey Patcher'
date: 2016-12-15 13:33:37
tags:
  - Node.js
description: '이 블로그 게시물은 V8 및 Chrome DevTools에서 Node.js에 대한 지원을 개선하기 위한 최근의 노력들을 강조합니다.'
---
Node.js의 인기는 지난 몇 년 동안 꾸준히 증가해 왔으며, 우리는 Node.js를 더 나아지게 만들기 위해 노력해 왔습니다. 이 블로그 게시물은 V8과 DevTools에서의 최근 노력을 강조합니다.

## DevTools에서 Node.js 디버그

이제 [Chrome 개발자 도구를 사용하여 Node 애플리케이션을 디버그](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.knjnbsp6t)할 수 있습니다. Chrome DevTools 팀은 디버깅 프로토콜을 구현하는 소스 코드를 Chromium에서 V8로 이전하여 Node Core가 디버거 소스 및 의존성과 동기화 상태를 쉽게 유지할 수 있게 했습니다. 다른 브라우저 벤더 및 IDE 역시 Chrome 디버깅 프로토콜을 사용하며, 이는 Node를 사용할 때의 개발자 경험을 집단적으로 향상시킵니다.

<!--truncate-->
## ES2015 성능 향상

우리는 V8을 그 어느 때보다 빠르게 만들기 위해 열심히 노력하고 있습니다. [최근의 많은 성능 작업은 ES6 기능](https://v8.dev/blog/v8-release-56)을 중심으로 진행되었으며, 여기에는 프로미스, 제너레이터, 파괴자 및 rest/spread 연산자가 포함됩니다. Node 6.2 이상의 V8 버전은 ES6을 완벽히 지원하므로 Node 개발자는 폴리필 없이 새로운 언어 기능을 "네이티브"로 사용할 수 있습니다. 이는 Node 개발자들이 종종 ES6 성능 개선의 첫 번째 혜택을 본다는 것을 의미합니다. 이와 유사하게, 그들은 종종 성능 저하를 가장 먼저 인식합니다. 주의 깊은 Node 커뮤니티 덕분에 우리는 [`instanceof`](https://github.com/nodejs/node/issues/9634), [`buffer.length`](https://github.com/nodejs/node/issues/9006), [긴 인수 리스트](https://github.com/nodejs/node/pull/9643), 그리고 [`let`/`const`](https://github.com/nodejs/node/issues/9729)와 관련된 성능 문제를 포함한 여러 퇴화를 발견하고 수정했습니다.

## Node.js `vm` 모듈과 REPL에 대한 수정 예정

[`vm` 모듈](https://nodejs.org/dist/latest-v7.x/docs/api/vm.html)은 [오랫동안 지속된 몇 가지 제한 사항](https://github.com/nodejs/node/issues/6283)을 가지고 있었습니다. 이러한 문제를 적절히 해결하기 위해, 우리는 V8 API를 확장하여 보다 직관적인 동작을 구현했습니다. 우리는 vm 모듈 개선이 [Node Foundation을 위한 Outreachy](https://nodejs.org/en/foundation/outreachy/)에서 멘토로서 지원하고 있는 프로젝트 중 하나임을 알리게 되어 기쁩니다. 가까운 미래에 이 프로젝트 및 다른 프로젝트에서 추가 진전을 보기를 기대합니다.

## `async`/`await`

비동기 함수와 함께라면 비동기 코드를 순차적으로 프로미스를 기다림으로써 프로그램의 흐름을 크게 단순화할 수 있습니다. `async`/`await`는 [다음 V8 업데이트](https://github.com/nodejs/node/pull/9618)와 함께 Node에 추가될 예정입니다. 프로미스와 제너레이터의 성능을 개선하려는 최근 작업 덕분에 비동기 함수가 빠르게 동작합니다. 관련 작업으로 우리는 [프로미스 훅](https://bugs.chromium.org/p/v8/issues/detail?id=4643), 즉 [Node 비동기 훅 API](https://github.com/nodejs/node-eps/pull/18)에 필요한 일련의 탐색 API를 제공하기 위해 노력하고 있습니다.

## 최신 Node.js를 시도해 보고 싶으신가요?

Node에서 최신 V8 기능을 테스트하고 싶고, 최신 불안정 소프트웨어를 사용하는 것을 신경 쓰지 않는다면, 우리 통합 브랜치를 [여기](https://github.com/v8/node/tree/vee-eight-lkgr)에서 시도해 보세요. [V8은 Node에 지속적으로 통합](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Linux64%20-%20node.js%20integration)되며, V8이 Node.js에 도달하기 전에 문제를 조기에 발견할 수 있습니다. 하지만 주의하세요, 이는 Node.js 최상위 트리보다 더 실험적인 것입니다.
