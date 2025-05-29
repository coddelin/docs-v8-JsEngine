---
title: "웹 툴링 벤치마크 발표"
author: "Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), 자바스크립트 성능 전문가"
avatars:
  - "benedikt-meurer"
date: 2017-11-06 13:33:37
tags:
  - 벤치마크
  - Node.js
description: "최신 웹 툴링 벤치마크는 Babel, TypeScript 및 기타 실제 프로젝트의 V8 성능 병목 현상을 식별하고 수정하는 데 도움이 됩니다."
tweet: "927572065598824448"
---
자바스크립트 성능은 항상 V8 팀의 중요 관심사였으며, 이번 포스트에서는 최근에 V8에서 일부 성능 병목 현상을 식별하고 수정하기 위해 사용한 최신 자바스크립트 [웹 툴링 벤치마크](https://v8.github.io/web-tooling-benchmark)에 대해 논의하고자 합니다. 이미 V8의 [Node.js에 대한 강력한 의지](/blog/v8-nodejs)에 대해 알고 계실 수도 있습니다. 이 벤치마크는 Node.js를 기반으로 개발된 일반적인 개발자 도구를 사용하여 성능 테스트를 실행함으로써 이러한 의지를 확장합니다. 웹 툴링 벤치마크 도구는 오늘날 개발자와 디자이너가 현대 웹 사이트나 클라우드 기반 애플리케이션을 구축하기 위해 사용하는 동일한 도구들로 구성되어 있습니다. [실제 성능](/blog/real-world-performance/)에 집중하려는 지속적인 노력의 일환으로, 매일 개발자가 실행하는 실제 코드로 벤치마크를 작성하였습니다.

<!--truncate-->
웹 툴링 벤치마크 스위트는 초기부터 Node.js의 중요한 [개발자 도구 사용 사례](https://github.com/nodejs/benchmarking/blob/master/docs/use_cases.md#web-developer-tooling)를 포괄하도록 설계되었습니다. V8 팀은 자바스크립트 핵심 성능에 초점을 맞추므로, 이 벤치마크를 자바스크립트 작업량에 집중하고 Node.js의 특정 입출력이나 외부 상호작용 측정을 제외하는 방식으로 구축하였습니다. 이를 통해 Node.js, 모든 브라우저, 주요 자바스크립트 엔진 셸(v8, ChakraCore, JavaScriptCore, SpiderMonkey)에서 벤치마크를 실행할 수 있습니다. 이 벤치마크는 Node.js로 제한되지 않지만, [Node.js 벤치마킹 워킹 그룹](https://github.com/nodejs/benchmarking)이 툴링 벤치마크를 Node 성능의 표준으로 사용하는 것을 고려하고 있다는 점에 대해 기쁩니다 ([nodejs/benchmarking#138](https://github.com/nodejs/benchmarking/issues/138)).

툴링 벤치마크의 개별 테스트는 JavaScript 기반 애플리케이션을 구축하는 데 일반적으로 사용하는 다양한 도구를 포함합니다. 예를 들어:

- `es2015` 프리셋을 사용한 [Babel](https://github.com/babel/babel) 트랜스파일러.
- Babel에서 사용하는 파서 [Babylon](https://github.com/babel/babylon)이 [lodash](https://lodash.com/) 및 [Preact](https://github.com/developit/preact) 번들을 포함한 여러 인기 있는 입력에서 실행됩니다.
- [webpack](http://webpack.js.org/)에서 사용되는 [acorn](https://github.com/ternjs/acorn) 파서.
- [TodoMVC](https://github.com/tastejs/todomvc) 프로젝트의 [typescript-angular](https://github.com/tastejs/todomvc/tree/master/examples/typescript-angular) 예제 프로젝트에서 실행되는 [TypeScript](http://www.typescriptlang.org/) 컴파일러.

[상세 분석](https://github.com/v8/web-tooling-benchmark/blob/master/docs/in-depth.md)에서 포함된 모든 테스트의 세부 사항을 확인할 수 있습니다.

[Speedometer](http://browserbench.org/Speedometer)와 같은 다른 벤치마크에서 과거 경험을 바탕으로, 프레임워크의 새로운 버전이 출시될 때 테스트가 금방 오래되는 문제를 확인했습니다. 따라서 벤치마크에 포함된 각각의 도구를 더 최신 버전으로 간단히 업데이트할 수 있도록 보장하였습니다. npm 인프라를 기반으로 벤치마크 스위트를 구상함으로써, 자바스크립트 개발 도구의 최신 상태를 항상 테스트할 수 있도록 쉽게 업데이트할 수 있습니다. 테스트 케이스를 업데이트하는 것은 `package.json` 매니페스트에서 버전을 변경하는 것만으로 가능합니다.

우리는 새로운 벤치마크에서 V8의 성능에 대해 지금까지 수집한 모든 관련 정보를 담은 [트래킹 버그](http://crbug.com/v8/6936)와 [스프레드시트](https://docs.google.com/spreadsheets/d/14XseWDyiJyxY8_wXkQpc7QCKRgMrUbD65sMaNvAdwXw)를 생성했습니다. 이미 몇 가지 흥미로운 결과를 발견했습니다. 예를 들어, V8이 `instanceof`에서 느린 경로를 자주 사용하는 것을 발견했습니다 ([v8:6971](http://crbug.com/v8/6971)), 이로 인해 3–4배의 속도 저하가 발생했습니다. 또한 `obj[name] = val` 형태의 속성 할당 사례에서 성능 병목 현상을 발견하여 이를 수정했습니다. 여기서 `obj`가 `Object.create(null)`을 통해 생성된 경우가 있었습니다. 이런 경우에 V8은 `obj`가 `null` 프로토타입을 가지고 있다는 사실을 활용할 수 있음에도 불구하고 빠른 경로에서 벗어났습니다 ([v8:6985](http://crbug.com/v8/6985)). 이 벤치마크를 통해 발견한 이러한 개선 사항들은 Node.js뿐 아니라 Chrome에서도 V8의 성능을 향상시킵니다.

우리는 V8을 더 빠르게 만드는 것뿐만 아니라, 벤치마크 도구와 라이브러리에서 발견되는 성능 문제를 수정하고 상류로 전달했습니다. 예를 들어, 우리는 [바벨](https://github.com/babel/babel)에서 다음과 같은 코드 패턴에 관련된 여러 성능 문제를 발견했습니다:

```js
value = items[items.length - 1];
```

이 코드 패턴은 `items`이 비어 있는지 확인하지 않아 속성 `"-1"`에 접근하게 되는 문제를 초래합니다. 이로 인해 V8은 `"-1"` 조회 때문에 느린 경로를 거치게 되며, 약간 수정된 동일한 JavaScript 버전이 훨씬 더 빠른데도 불구하고 성능 저하가 발생합니다. 우리는 Babel에서 이러한 문제를 수정하는 데 기여했습니다 ([babel/babel#6582](https://github.com/babel/babel/pull/6582), [babel/babel#6581](https://github.com/babel/babel/pull/6581), [babel/babel#6580](https://github.com/babel/babel/pull/6580)). 또한 Babel이 문자열 길이를 초과하여 접근하는 문제를 발견해 수정했습니다 ([babel/babel#6589](https://github.com/babel/babel/pull/6589)), 이로 인해 V8에서 또 다른 느린 경로가 발생했습니다. 추가적으로 우리는 V8에서 [배열 및 문자열의 경계 외 읽기를 최적화했습니다](https://twitter.com/bmeurer/status/926357262318305280). 우리는 이 중요한 사용 사례의 성능 개선을 위해 [커뮤니티와 협력](https://twitter.com/rauchg/status/924349334346276864)하는 것을 기대하고 있으며, 이는 V8 뿐만 아니라 ChakraCore와 같은 다른 JavaScript 엔진에서도 실행될 때 유효합니다.

실제 환경 성능에 대한 강력한 초점과 특히 인기 있는 Node.js 작업 부하 개선에 대한 우리의 관심은 최근 몇 번의 릴리즈 동안 V8의 벤치마크 점수의 지속적인 개선에서 잘 나타납니다:

![](/_img/web-tooling-benchmark/chart.svg)

V8 v5.8 이후, 이는 [Ignition+TurboFan 아키텍처로 전환](/blog/launching-ignition-and-turbofan)하기 전의 마지막 V8 릴리즈인데, V8 도구 벤치마크 점수가 약 **60%** 개선되었습니다.

지난 몇 년 동안 V8 팀은 단 하나의 JavaScript 벤치마크 — 아무리 의도적으로 설계되고 신중하게 만들어졌다 하더라도 — 가 JavaScript 엔진의 전체 성능을 단일 기준으로 사용되어서는 안 된다는 것을 인식하게 되었습니다. 그러나 우리가 새로운 **웹 도구 벤치마크**가 성능 개선에 집중할 만한 JavaScript 성능 영역을 강조한다고 믿습니다. 이름과 초기 동기와는 달리, 웹 도구 벤치마크는 단순히 도구 부하를 대표하는 것에 더해, front-end 중심의 Speedometer 벤치마크가 잘 테스트하지 못하는 더욱 복잡한 JavaScript 응용 프로그램의 많은 범위를 대표한다고 발견했습니다. 이는 Speedometer를 대체하는 것이 아니라 보완적인 테스트 세트입니다.

가장 좋은 소식은 웹 도구 벤치마크가 실제 작업 부하를 기반으로 구성된 만큼, 벤치마크 점수의 최근 개선이 [빌드되는 대기 시간이 줄어들어](https://xkcd.com/303/) 개발자의 생산성을 직접적으로 향상시킬 것으로 기대된다는 것입니다. 이러한 개선 중 다수는 이미 Node.js에서 사용할 수 있습니다: 작성 시점에서 Node 8 LTS는 V8 v6.1에 있고 Node 9는 V8 v6.2에 있습니다.

벤치마크의 최신 버전은 [https://v8.github.io/web-tooling-benchmark/](https://v8.github.io/web-tooling-benchmark/)에서 호스팅되고 있습니다.
