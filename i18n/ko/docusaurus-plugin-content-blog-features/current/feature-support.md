---
title: "기능 지원"
permalink: "/features/support/"
layout: "layouts/base.njk"
description: "이 문서는 V8 웹사이트에서 사용되는 JavaScript 및 WebAssembly 언어 기능 지원 목록을 설명합니다."
---
# JavaScript/Wasm 기능 지원

[우리의 JavaScript 및 WebAssembly 언어 기능 설명자](/features)는 다음과 같은 기능 지원 목록을 자주 포함합니다:

<feature-support chrome="71"
                 firefox="65"
                 safari="12"
                 nodejs="12"
                 babel="yes"></feature-support>

지원이 없는 기능은 다음과 같이 보일 것입니다:

<feature-support chrome="no"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

최신 기능의 경우 각 환경에서 혼합적인 지원 상태를 보는 것이 일반적입니다:

<feature-support chrome="partial"
                 firefox="yes"
                 safari="yes"
                 nodejs="no"
                 babel="yes"></feature-support>

목표는 V8 및 Chrome뿐만 아니라 더 넓은 JavaScript 생태계에서 기능의 성숙도를 간단히 보여주는 것입니다. 이는 V8과 같은 적극적으로 개발 중인 JavaScript VM에서의 네이티브 구현에 국한되지 않고 여기에서는 [Babel](https://babeljs.io/) 아이콘을 사용하여 나타내는 도구 지원도 포함합니다.

<!--truncate-->
Babel 항목은 다양한 의미를 포함합니다:

- [클래스 필드](/features/class-fields)와 같은 구문 언어 기능의 경우, 전환 지원을 의미합니다.
- [`Promise.allSettled`](/features/promise-combinators#promise.allsettled)와 같은 새로운 API인 언어 기능의 경우, 폴리필 지원을 의미합니다. (Babel은 [코어-js 프로젝트](https://github.com/zloirock/core-js)를 통해 폴리필을 제공합니다.)

Chrome 로고는 V8, Chromium 및 Chromium 기반 브라우저를 나타냅니다.
