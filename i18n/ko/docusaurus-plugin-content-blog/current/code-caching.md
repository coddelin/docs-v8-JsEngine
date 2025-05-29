---
title: '코드 캐싱'
author: '양궈 ([@hashseed](https://twitter.com/hashseed)), 소프트웨어 엔지니어'
avatars:
  - 'yang-guo'
date: 2015-07-27 13:33:37
tags:
  - internals
description: 'V8는 이제 (바이트)코드 캐싱, 즉 JavaScript 파싱 및 컴파일의 결과를 캐싱하는 기능을 지원합니다.'
---
V8는 [즉시 컴파일(JIT)](https://en.wikipedia.org/wiki/Just-in-time_compilation)을 사용하여 JavaScript 코드를 실행합니다. 이는 스크립트를 실행하기 직전에 파싱 및 컴파일이 필요하다는 것을 의미하며, 이는 상당한 오버헤드를 초래할 수 있습니다. 우리가 [최근 발표한 것처럼](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html), 코드 캐싱은 이러한 오버헤드를 줄이는 기술입니다. 스크립트가 처음으로 컴파일될 때, 캐시 데이터가 생성되어 저장됩니다. V8가 동일한 스크립트를 다시 컴파일해야 할 때, 심지어 다른 V8 인스턴스에서도, 캐시 데이터를 사용하여 컴파일 결과를 처음부터 다시 컴파일하지 않고 재구성할 수 있습니다. 결과적으로 스크립트는 훨씬 더 빠르게 실행됩니다.

<!--truncate-->
코드 캐싱은 V8 버전 4.2부터 사용할 수 있으며 Chrome에만 국한되지 않습니다. 이는 V8의 API를 통해 제공되므로 모든 V8 임베더가 이를 활용할 수 있습니다. 이 기능을 테스트하기 위한 [테스트 케이스](https://chromium.googlesource.com/v8/v8.git/+/4.5.56/test/cctest/test-api.cc#21090)는 이 API를 사용하는 방법의 예로 활용됩니다.

V8가 스크립트를 컴파일할 때, `v8::ScriptCompiler::kProduceCodeCache` 옵션을 전달하여 이후 컴파일 속도를 높이기 위한 캐시 데이터를 생성할 수 있습니다. 컴파일이 성공하면, 캐시 데이터는 소스 객체에 첨부되며 `v8::ScriptCompiler::Source::GetCachedData`를 통해 검색할 수 있습니다. 그런 다음 나중을 위해, 예를 들어 디스크에 저장하는 방식으로 이를 유지할 수 있습니다.

이후 컴파일 시, 이전에 생성된 캐시 데이터를 소스 객체에 첨부하고 `v8::ScriptCompiler::kConsumeCodeCache` 옵션을 전달할 수 있습니다. 이번에는 V8가 코드를 컴파일하지 않고 제공된 캐시 데이터를 역직렬화하여 코드가 훨씬 더 빠르게 생성됩니다.

캐시 데이터를 생성하는 데에는 일정한 연산 및 메모리 비용이 수반됩니다. 이러한 이유로 Chrome은 동일한 스크립트가 몇 일 내에 적어도 두 번 이상 발견된 경우에만 캐시 데이터를 생성합니다. 이를 통해 Chrome은 평균적으로 스크립트 파일을 실행 가능한 코드로 두 배 더 빠르게 변환하여 사용자가 이후 페이지를 로드할 때마다 소중한 시간을 절약할 수 있도록 합니다.
