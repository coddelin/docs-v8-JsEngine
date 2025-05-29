---
title: &apos;Octane 은퇴&apos;
author: &apos;V8 팀&apos;
date: 2017-04-12 13:33:37
tags:
  - 벤치마크
description: &apos;V8 팀은 Octane 을 권장되는 벤치마크에서 은퇴시킬 때가 되었다고 믿습니다.&apos;
---
JavaScript 벤치마크의 역사는 지속적인 진화의 이야기입니다. 웹이 단순한 문서에서 동적 클라이언트 측 애플리케이션으로 확장되면서, 새로운 JavaScript 벤치마크가 새로운 사용 사례를 위한 중요한 작업 부하를 측정하기 위해 만들어졌습니다. 이러한 지속적인 변화로 인해 개별 벤치마크의 수명이 제한됩니다. 웹 브라우저와 가상 머신(VM) 구현이 특정 테스트 케이스를 과도하게 최적화하기 시작하면 벤치마크 자체는 원래 사용 사례에 대한 효과적인 대리 역할을 하지 못하게 됩니다. 초기 JavaScript 벤치마크 중 하나인 [SunSpider](https://webkit.org/perf/sunspider/sunspider.html)는 빠른 최적화 컴파일러를 제공하기 위한 초기 유인을 제공했습니다. 그러나 VM 엔지니어들이 [미세 벤치마크의 한계](https://blog.mozilla.org/nnethercote/2014/06/16/a-browser-benchmarking-manifesto/)를 발견하고 SunSpider의 [제한](https://bugs.webkit.org/show_bug.cgi?id=63864)을 [최적화](https://benediktmeurer.de/2016/12/16/the-truth-about-traditional-javascript-benchmarks/#the-notorious-sunspider-examples) [방법](https://bugzilla.mozilla.org/show_bug.cgi?id=787601)을 찾으면서 브라우저 커뮤니티는 [SunSpider를 은퇴시켰습니다](https://trac.webkit.org/changeset/187526/webkit).

<!--truncate-->
## Octane의 기원

초기 미세 벤치마크의 일부 약점을 완화하기 위해 설계된 [Octane 벤치마크 스위트](https://developers.google.com/octane/)는 2012년에 처음 공개되었습니다. 이는 이전의 간단한 [V8 테스트 케이스](http://www.netchain.com/Tools/v8/) 세트에서 발전하여 일반적인 웹 성능을 측정하기 위한 일반적인 벤치마크가 되었습니다. Octane은 17개의 다양한 테스트로 구성되어 있으며, 이는 Martin Richards의 커널 시뮬레이션 테스트에서부터 [Microsoft의 TypeScript 컴파일러](http://www.typescriptlang.org/)의 자체 컴파일 버전에 이르는 다양한 작업 부하를 다루도록 설계되었습니다. Octane의 내용은 그 생성 시점의 JavaScript 성능 측정에 대한 지배적 지혜를 반영합니다.

## 감소하는 수익과 과도 최적화

출시 후 몇 년 동안 Octane은 JavaScript VM 생태계에 독특한 가치를 제공했습니다. V8을 포함한 엔진들이 고성능이 요구되는 애플리케이션 클래스를 최적화할 수 있도록 했습니다. 이러한 CPU 집약적인 작업 부하는 초기에는 VM 구현에서 충분히 서비스되지 않았습니다. Octane은 엔진 개발자들이 컴퓨팅 집약적인 애플리케이션이 JavaScript를 C++ 또는 Java의 실행 가능한 대안으로 만들 정도의 속도에 도달할 수 있도록 최적화를 제공하는 데 도움을 줬습니다. 또한, Octane은 긴 또는 예측 불가능한 일시 중지를 피하면서 웹 브라우저를 개선시키는 쓰레기 수집의 발전을 이끌었습니다.

그러나 2015년까지 대부분의 JavaScript 구현은 Octane의 높은 점수를 달성하기 위해 필요한 컴파일러 최적화를 구현했습니다. Octane에서 더 높은 점수를 얻기 위한 노력은 실제 웹 페이지 성능의 점진적으로 감소하는 개선으로 이어졌습니다. [Octane 실행 프로필과 일반적인 웹사이트 로드 비교](/blog/real-world-performance) (예: Facebook, Twitter, Wikipedia) 조사 결과, 벤치마크는 실제 세계의 코드가 하는 방식으로 V8의 [파서](https://medium.com/dev-channel/javascript-start-up-performance-69200f43b201#.7v8b4jylg)나 브라우저 [로드 스택](https://medium.com/reloading/toward-sustainable-loading-4760957ee46f#.muk9kzxmb)을 실행하지 않는다는 것을 발견했습니다. 더욱이 Octane의 JavaScript 스타일은 대부분의 현대 프레임워크 및 라이브러리가 사용하는 관습 및 패턴(변환된 코드나 최신 ES2015+ 언어 기능은 말할 것도 없고)과 일치하지 않습니다. 이는 Octane을 사용하여 V8 성능을 측정하는 것이 현대 웹을 위한 중요한 사용 사례를 포착하지 못했음을 의미합니다. 예를 들어, 프레임워크를 빠르게 로드하거나 상태 관리의 새로운 패턴으로 대규모 애플리케이션을 지원하거나 ES2015+ 기능이 [ES5 동등물만큼 빠른](https://v8.dev/blog/performance-es2015)지 확인하는 것 등이 있습니다.

또한, JavaScript 최적화로 Octane 점수를 높이는 것이 실제 시나리오에서는 오히려 부정적인 영향을 미치는 경우를 발견하기 시작했습니다. Octane은 함수 호출 오버헤드를 줄이기 위해 공격적인 인라이닝을 장려하지만, Octane에 맞춰진 인라이닝 전략은 실제 사용 사례에서 컴파일 비용 증가 및 메모리 사용량 증가로 인해 성능 저하를 초래했습니다. 예를 들어, [다이내믹 프리테뉴어링](http://dl.acm.org/citation.cfm?id=2754181)처럼 실제로 유용할 수 있는 최적화까지도 Octane 점수를 올리기 위해 지나치게 구체적인 휴리스틱을 개발함으로써, 일반적인 경우의 성능을 저하시키거나 거의 효과를 발휘하지 않는 결과를 초래할 수 있었습니다. 우리가 발견한 바로는, Octane에서 도출된 프리테뉴어링 휴리스틱이 [Ember와 같은 현대적인 프레임워크](https://bugs.chromium.org/p/v8/issues/detail?id=3665)에서 성능 저하를 초래했다는 점입니다. `instanceof` 연산자는 Octane 특정 사례에 맞춘 또 다른 최적화의 예로, 이는 [Node.js 애플리케이션에서 심각한 성능 저하](https://github.com/nodejs/node/issues/9634)를 초래했습니다.

또 다른 문제는 시간이 지나면서, Octane의 작은 버그들이 최적화의 타겟이 된다는 점입니다. 예를 들어, Box2DWeb 벤치마크에서는 두 객체를 `<` 및 `>=` 연산자로 비교하는 [버그](http://crrev.com/1355113002)를 활용하여 Octane에서 약 15%의 성능 향상을 얻을 수 있었습니다. 그러나 이 최적화는 실제 환경에서는 효과가 없었고, 보다 일반적인 유형의 비교 최적화를 복잡하게 만들었습니다. 심지어 Octane은 실제 환경 최적화를 부정적으로 평가하기도 합니다. 다른 VM을 작업하는 엔지니어들은 [지적한 바 있습니다](https://bugzilla.mozilla.org/show_bug.cgi?id=1162272)만, Octane은 자주 발견되는 죽은 코드로 인해 대부분의 실제 웹사이트 로딩 속도를 높이는 지연 구문 분석(lazy parsing) 기술을 페널티 대상으로 삼고 있다는 점입니다.

## Octane 및 기타 합성 벤치마크를 넘어

이러한 사례는 Octane 점수를 높이고자 실제 웹사이트 실행에 악영향을 끼친 많은 최적화들 중 일부에 불과합니다. 불행히도, Kraken 및 JetStream을 포함하여 다른 정적 또는 합성 벤치마크에서도 유사한 문제가 존재합니다. 간단히 말해, 이러한 벤치마크는 실제 속도를 측정하기에 충분하지 않으며, VM 엔지니어가 좁은 사용 사례를 과하게 최적화하면서 일반적인 경우를 충분히 최적화하지 못하게 되는 인센티브를 창출하여 JavaScript 코드 실행 속도를 저하시키는 결과를 초래합니다.

대부분의 JS VM에서 점수가 정체되고, 특정 Octane 벤치마크 최적화와 더 많은 실제 코드의 속도 개선 간 충돌이 증가함에 따라, 우리는 Octane을 권장 벤치마크로 은퇴할 때가 되었다고 믿고 있습니다.

Octane은 JS 생태계가 계산적으로 비싼 JavaScript에서 큰 성과를 이루는 데 기여했습니다. 하지만 이제 다음 단계는 [실제 웹 페이지](/blog/real-world-performance), 현대적인 라이브러리, [프레임워크](http://stateofjs.com/2016/frontend/), ES2015+ [언어 기능](/blog/high-performance-es2015), 새로운 [상태 관리](http://redux.js.org/) 패턴, [불변 객체 할당](https://facebook.github.io/immutable-js/), 그리고 [모듈](https://webpack.github.io/) [번들링](http://browserify.org/)의 성능을 향상시키는 것입니다. V8은 Node.js의 서버 측을 포함해 여러 환경에서 실행되므로, 우리는 실제 Node 애플리케이션을 이해하고 [AcmeAir](https://github.com/acmeair/acmeair-nodejs)와 같은 작업을 통해 서버 측 JavaScript 성능을 측정하는 데 시간과 노력을 기울이고 있습니다.

[측정 방법론의 개선](/blog/real-world-performance) 및 실제 환경 성능을 더 잘 반영하는 [새 작업 부하](/blog/optimizing-v8-memory)에 대한 더 많은 게시물을 확인하십시오. 우리는 사용자가 가장 필요로 하고 개발자에게 가장 중요한 성능을 계속 추구하게 되어 매우 기쁩니다!
