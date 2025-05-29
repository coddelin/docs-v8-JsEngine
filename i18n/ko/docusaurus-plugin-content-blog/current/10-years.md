---
title: "V8 출시 10주년 기념"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), V8 역사가"
avatars: 
  - "mathias-bynens"
date: "2018-09-11 19:00:00"
tags: 
  - benchmarks
description: "V8 프로젝트의 지난 10년 동안 주요 이정표와 프로젝트가 비밀로 유지되었던 초기 시절에 대한 개요입니다."
tweet: "1039559389324238850"
---
이번 달은 Google Chrome과 V8 프로젝트가 출시된 지 10주년이 되는 달입니다. 이 글은 V8 프로젝트의 지난 10년 동안 주요 이정표와 프로젝트가 여전히 비밀로 유지되었던 초기 시절에 대한 개요를 제공합니다.

<!--truncate-->
<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/G0vnrPTuxZA" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption><a href="http://gource.io/"><code>gource</code></a>를 사용하여 만들어진, 시간에 따른 V8 코드 베이스의 시각화입니다.</figcaption>
</figure>

## V8 출시 이전: 초기 시절

Google은 **2006년** 가을에 [Lars Bak](https://en.wikipedia.org/wiki/Lars_Bak_%28computer_programmer%29)을 고용하여 Chrome 웹 브라우저용 새로운 JavaScript 엔진을 구축하도록 했습니다. 그 당시 Chrome은 여전히 비밀스러운 Google 내부 프로젝트였습니다. Lars는 최근 실리콘밸리에서 덴마크의 Aarhus로 이사했습니다. Google 사무실은 그곳에 없었고 Lars는 덴마크에 남고 싶어 했기 때문에, Lars와 프로젝트의 원래 엔지니어들은 그의 농장에 있는 별채에서 작업을 시작했습니다. 새로운 JavaScript 런타임은 고전 머슬카에서 찾을 수 있는 강력한 엔진을 재미있게 참조하여 “V8”로 명명되었습니다. 이후 V8 팀이 커지면서 개발자들은 소박한 작업장에서 Aarhus의 현대적인 사무실 건물로 이동했지만, 팀은 세상에서 가장 빠른 JavaScript 런타임을 구축하려는 특유의 추진력과 집중력을 유지했습니다.

## V8의 출시 및 진화

V8은 **2008년** 9월 2일 [Chrome이 출시된 날](https://blog.chromium.org/2008/09/welcome-to-chromium_02.html)과 같은 날 오픈 소스로 공개되었습니다. [최초의 커밋](https://chromium.googlesource.com/v8/v8/+/43d26ecc3563a46f62a0224030667c8f8f3f6ceb)은 2008년 6월 30일로 거슬러 올라갑니다. 그 날짜 이전에는 V8 개발이 비공개 CVS 리포지토리에서 진행되었습니다. 처음에는 V8이 ia32 및 ARM 명령어 세트만 지원했고, [SCons](https://scons.org/)를 빌드 시스템으로 사용했습니다.

**2009년**에는 실제 정규 표현식에 대한 성능 향상을 가져온 새로운 정규 표현식 엔진인 [Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)가 도입되었습니다. x64 포트의 도입으로 지원되는 명령어 세트의 수가 두 개에서 세 개로 증가했습니다. 2009년에는 또한 V8을 포함하는 [Node.js 프로젝트의 첫 번째 릴리스](https://github.com/nodejs/node-v0.x-archive/releases/tag/v0.0.1)가 이루어졌습니다. 비브라우저 프로젝트가 V8을 포함할 가능성은 원래 Chrome 만화에서 [명시적으로 언급](https://www.google.com/googlebooks/chrome/big_16.html)되었으며, Node.js를 통해 실제로 이루어졌습니다! Node.js는 가장 인기 있는 JavaScript 생태계 중 하나로 성장했습니다.

**2010년**에는 V8이 새로운 최적화 JIT 컴파일러를 도입하면서 런타임 성능이 큰 폭으로 향상되었습니다. [Crankshaft](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)는 이전 V8 컴파일러(이름 없이)에 비해 두 배 빠른 기계 코드를 생성하며 코드 크기를 30% 줄였습니다. 같은 해에 V8은 네 번째 명령어 세트인 32비트 MIPS를 추가했습니다.

**2011년**에는 가비지 컬렉션이 크게 개선되었습니다. [새로운 점진적 가비지 컬렉터](https://blog.chromium.org/2011/11/game-changer-for-interactive.html)는 탁월한 최고 성능과 낮은 메모리 사용량을 유지하면서 일시 중지 시간을 크게 줄였습니다. V8은 Isolates 개념을 도입하여 임베더가 프로세스에서 V8 런타임의 여러 인스턴스를 실행할 수 있도록 했으며, 이를 통해 Chrome에서 더 가벼운 웹 워커가 가능해졌습니다. SCons에서 [GYP](https://gyp.gsrc.io/)로 빌드 시스템을 변경한 첫 번째 빌드 시스템 마이그레이션이 이루어졌습니다. 우리는 ES5 엄격 모드 지원을 구현했습니다. 한편, 개발은 Aarhus에서 독일 뮌헨으로 이전되었으며 원래 Aarhus 팀의 많은 교류와 새로운 리더십 아래 진행되었습니다.

**2012**년은 V8 프로젝트에 있어 중요한 이정표를 남긴 해였습니다. 팀은 [SunSpider](https://webkit.org/perf/sunspider/sunspider.html)와 [Kraken](https://krakenbenchmark.mozilla.org/) 벤치마크 도구를 통해 성능을 최적화하기 위한 속도 스프린트를 진행했습니다. 이후, 주요 JS 엔진의 런타임 및 JIT 기술에 대대적인 개선을 유도하기 위해 [Octane](https://chromium.github.io/octane/) (핵심은 [V8 Bench](http://www.netchain.com/Tools/v8/))라는 새로운 벤치마크 도구를 개발했습니다. 이러한 노력의 결과 중 하나로 V8의 런타임 프로파일러에서 '핫'한 함수 탐지를 위해 무작위 샘플링에서 결정론적, 횟수 기반 기법으로 전환했습니다. 이는 특정 페이지 로드(또는 벤치마크 실행)가 다른 것들보다 무작위로 훨씬 느려질 가능성을 크게 줄였습니다.

**2013**년에는 [asm.js](http://asmjs.org/)라는 JavaScript의 저수준 서브셋이 등장했습니다. asm.js는 정적으로 타입 지정된 산술, 함수 호출 및 기본 타입만을 사용하는 힙 액세스로 제한되므로, 검증된 asm.js 코드는 예측 가능한 성능으로 실행될 수 있었습니다. 우리는 기존 벤치마크의 업데이트와 함께 asm.js 같은 사용 사례를 대상하는 새로운 벤치마크를 갖춘 [Octane 2.0](https://blog.chromium.org/2013/11/announcing-octane-20.html)을 출시했습니다. Octane은 [할당 접기](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/42478.pdf) 및 [타입 전환 및 선할당을 위한 할당-사이트 기반 최적화](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43823.pdf) 등의 새로운 컴파일러 최적화를 이끌어 내며 정점 성능을 크게 개선했습니다. 내부적으로 'Handlepocalypse'라고 부른 노력의 일환으로 V8 핸들 API가 올바르고 안전하게 사용하기 쉽도록 완전히 재작성되었습니다. 또한 2013년에는 JavaScript에서 `TypedArray`의 Chrome 구현을 [Blink에서 V8로 이동](https://codereview.chromium.org/13064003)했습니다.

**2014**년에는 [동시 컴파일](https://blog.chromium.org/2014/02/compiling-in-background-for-smoother.html)을 통해 주요 스레드에서 JIT 컴파일 작업의 일부를 옮겨 이용 가능 저하를 줄이고 성능을 크게 개선했습니다. 같은 해 말에 새로운 최적화 컴파일러인 TurboFan의 초기 버전을 [도입](https://github.com/v8/v8/commit/a1383e2250dc5b56b777f2057f1600537f02023e)했습니다. 한편, 파트너들은 PPC, MIPS64, ARM64라는 세 가지 새로운 명령어 집합 아키텍처로 V8을 포팅하는 데 도움을 줬습니다. Chromium을 따라 V8은 또 다른 빌드 시스템인 [GN](https://gn.googlesource.com/gn/#gn)으로 전환했습니다. V8 테스트 인프라는 각 패치를 다양한 빌드 봇에서 테스트할 수 있는 _Tryserver_를 포함해 큰 발전을 이루었습니다. 소스 제어에서는 V8이 SVN에서 Git으로 마이그레이션되었습니다.

**2015**년은 V8 프로젝트의 여러 방면에서 바쁜 한 해였습니다. [코드 캐싱 및 스크립트 스트리밍](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html)을 구현하여 웹 페이지 로드 시간을 크게 단축했습니다. 런타임 시스템의 할당 메멘토(memento) 사용에 대한 작업은 [ISMM 2015에서](https://ai.google/research/pubs/pub43823) 발표되었습니다. 같은 해 후반, 새 인터프리터인 Ignition에 대한 작업을 [시작했습니다](https://github.com/v8/v8/commit/7877c4e0c77b5c2b97678406eab7e9ad6eba4a4d). 우리는 [강한 모드](https://docs.google.com/document/d/1Qk0qC4s_XNCLemj42FqfsRLp49nDQMZ1y7fwf5YjaI4/view)의 아이디어를 실험하여 더 강력한 보장과 예측 가능한 성능을 얻으려 했습니다. 강한 모드를 플래그 뒤에서 구현했지만, 그 이점이 비용을 정당화하지 못한다는 결론에 이르렀습니다. [커밋 큐](https://dev.chromium.org/developers/testing/commit-queue)의 추가로 생산성과 안정성이 크게 개선되었습니다. V8의 가비지 컬렉터는 Blink와 같은 임베더와 협력하여 유휴 기간 동안 가비지 컬렉션 작업을 예약하기 시작했습니다. [유휴 시간 가비지 컬렉션](/blog/free-garbage-collection)은 관찰 가능한 가비지 컬렉션 이용 가능 저하와 메모리 소비를 크게 줄였습니다. 12월에는 [첫 번째 WebAssembly 프로토타입](https://github.com/titzer/v8-native-prototype)이 V8에 도입되었습니다.

**2016**년에는 ES2015(이전에는 "ES6"으로 알려짐) 기능 세트(프로미스, 클래스 문법, 렉시컬 스코핑, 디스트럭처링 등)를 포함하여 ES2016 몇 가지 기능의 마지막 조각들을 배포하였습니다. 또한 새로운 Ignition 및 TurboFan 파이프라인을 출시하기 시작하여 이를 사용하여 [ES2015 및 ES2016 기능을 컴파일하고 최적화](/blog/v8-release-56)했으며, [저사양 Android 디바이스](/blog/ignition-interpreter)에서 Ignition을 기본값으로 배포했습니다. 공백 시간 동안 쓰레기 수집에 성공적으로 작업한 결과를 [PLDI 2016](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/45361.pdf)에서 발표했습니다. 우리는 [Orinoco 프로젝트](/blog/orinoco)를 시작했으며, V8의 주요 쓰레드 쓰레기 수집 시간을 줄이기 위한 대부분 병렬 및 동시 쓰레기 수집기를 구축했습니다. 주요 재초점에서 우리는 합성 마이크로 벤치마크에서 벗어나 [실세계 성능](/blog/real-world-performance)을 측정하고 최적화하기 시작했습니다. 디버깅 측면에서는 V8 인스펙터가 Chromium에서 V8로 [이관](/blog/v8-release-55)되어 모든 V8 임베더(Chromium뿐만 아니라)가 Chrome DevTools를 사용하여 V8에서 실행 중인 JavaScript를 디버깅할 수 있게 되었습니다. WebAssembly 프로토타입이 다른 브라우저 제조업체와의 협력하에 프로토타입에서 [실험적 지원](/blog/webassembly-experimental)으로 발전했습니다. V8은 [ACM SIGPLAN 프로그래밍 언어 소프트웨어 상](http://www.sigplan.org/Awards/Software/)을 수상했습니다. 추가적으로 새로운 포트인 S390이 추가되었습니다.

**2017**년에는 마침내 엔진의 여러 해에 걸친 대대적인 개편을 완료하여 기본적으로 새로운 [Ignition 및 TurboFan](/blog/launching-ignition-and-turbofan) 파이프라인을 활성화할 수 있었습니다. 이를 통해 Crankshaft([130,380 줄의 코드 삭제](https://chromium-review.googlesource.com/c/v8/v8/+/547717)) 및 [Full-codegen](https://chromium-review.googlesource.com/c/v8/v8/+/584773)을 코드베이스에서 제거할 수 있었습니다. 우리는 Orinoco v1.0을 출시했으며, 여기에는 [동시 마킹](/blog/concurrent-marking), 동시 스위핑, 병렬 스캐빈징 및 병렬 압축이 포함되었습니다. Node.js를 Chromium과 함께 첫 번째 V8 임베더로 공식 인정했습니다. 그 이후로 Node.js 테스트 스위트를 깨뜨리는 V8 패치는 적용할 수 없도록 했습니다. 인프라에는 정확성을 보장하는 fuzzing 지원이 추가되어 어떤 코드도 실행 구성과 관계없이 일관된 결과를 생성하도록 했습니다.

산업 전반에 걸친 협력적인 론칭에서 V8이 [WebAssembly를 기본값으로 활성화](/blog/v8-release-57)했습니다. 우리는 [JavaScript 모듈](/features/modules)의 지원과 ES2017 및 ES2018 기능 세트(비동기 함수, 공유 메모리, 비동기 반복, 나머지/펼치기 속성, 그리고 RegExp 기능 포함)를 구현했습니다. 우리는 [JavaScript 코드 커버리지에 대한 네이티브 지원](/blog/javascript-code-coverage)을 배포했으며, V8의 최적화가 실세계 개발자 도구 및 JavaScript 출력 성능에 미치는 영향을 측정하기 위해 [Web Tooling Benchmark](/blog/web-tooling-benchmark)을 출시했습니다. JavaScript 객체에서 C++ DOM 객체로, 그리고 반대로 [Wrapper tracing](/blog/tracing-js-dom)을 사용하여 Chrome에서 오랫동안 지속된 메모리 누수를 해결하고 JavaScript 및 Blink 힙의 객체들을 전이적 폐쇄 처리 효율적으로 처리할 수 있게 되었습니다. 이후 이 인프라를 사용하여 힙 스냅샷 개발자 도구의 기능을 증대시켰습니다.

**2018**년에는 [Spectre/Meltdown 취약점](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html)이 공개되며 CPU 정보 보안에 대한 우리가 알고 있던 바를 뒤집는 산업 전반의 보안 사건이 있었습니다. V8 엔지니어들은 관리 언어 위협을 이해하고 완화 조치를 개발하기 위해 광범위한 공격적 연구를 수행했습니다. V8은 신뢰할 수 없는 코드를 실행하는 임베더를 위해 Spectre 및 유사한 사이드 채널 공격에 대한 [완화 조치](/docs/untrusted-code-mitigations)를 배포했습니다.

최근 우리는 WebAssembly 응용 프로그램의 시작 시간을 크게 줄이면서도 예측 가능한 성능을 유지하는 [Liftoff](/blog/liftoff)라는 WebAssembly용 초기 컴파일러를 배포했습니다. 우리는 [`BigInt`](/blog/bigint)를 배포했으며, 이는 [임의-정밀도 정수](/features/bigint)를 가능하게 하는 새로운 JavaScript 원시 타입입니다. 우리는 [임베디드 내장함수](/blog/embedded-builtins)를 구현했으며, 이를 [지연 역직렬화](/blog/lazy-deserialization)하여 여러 Isolates의 V8 풋프린트를 크게 줄일 수 있었습니다. 우리는 [백그라운드 스레드에서 스크립트 바이트코드 컴파일](/blog/background-compilation)을 가능하게 했습니다. 우리는 V8와 Blink의 쓰레기 수집을 동기화하여 단일 컴포넌트 간의 작동을 가능케하는 [Unified V8-Blink Heap 프로젝트](https://docs.google.com/presentation/d/12ZkJ0BZ35fKXtpM342PmKM5ZSxPt03_wsRgbsJYl3Pc)를 시작했습니다. 그리고 해가 아직 끝나지 않았습니다...

## 성능의 상승과 하락

크롬의 V8 벤치 점수는 V8의 변경 사항이 성능에 미친 영향을 보여줍니다. (이 원래 크롬 베타에서 여전히 실행 가능한 몇 안 되는 벤치마크 중 하나가 V8 벤치입니다.)

![2008년부터 2018년까지 크롬의 [V8 벤치](http://www.netchain.com/Tools/v8/) 점수](/_img/10-years/v8-bench.svg)

이 벤치마크에서 우리의 점수는 지난 **10년 동안 4배** 증가했습니다!

그러나 몇 년간 두 번의 성능 하락을 점으로 관찰할 수 있습니다. 이 두 점은 V8 역사에서 중요한 사건에 해당하기 때문에 흥미롭습니다. 2015년 성능 하락은 V8이 ES2015 기능의 초보 버전을 배포했을 때 발생했습니다. 이러한 기능은 V8 코드베이스에서 교차적이므로 초기 릴리스에서는 성능보다는 정확성에 집중했습니다. 이러한 약간의 속도 하락을 수용하여 개발자에게 기능을 최대한 빨리 제공하였습니다. 2018년 초에 Spectre 취약점이 공개되어 V8이 사용자를 잠재적인 공격으로부터 보호하기 위한 완화 조치를 배포함으로써 또 다른 성능 하락이 발생했습니다. 다행히 크롬이 [사이트 격리](https://developers.google.com/web/updates/2018/07/site-isolation)를 배포하면서 성능을 다시 이전 수준으로 되돌릴 수 있습니다.

이 차트에서 얻을 수 있는 또 다른 인사이트는 약 2013년부터 평탄화되기 시작했다는 점입니다. 이는 V8이 성능 향상을 포기하고 투자하지 않았다는 의미일까요? 전혀 그렇지 않습니다! 그래프의 평탄화는 V8 팀이 합성 마이크로 벤치마크(V8 Bench 및 Octane와 같은)에서 최적화를 위해 [실제 세계 성능](/blog/real-world-performance)으로 방향을 전환한 것을 나타냅니다. V8 Bench는 현대적인 JavaScript 기능을 사용하지 않으며 실제 프로덕션 코드와 유사하지 않은 오래된 벤치마크입니다. 더 최근의 Speedometer 벤치마크 스위트와 비교해 보십시오:

![Chrome의 [Speedometer 1](https://browserbench.org/Speedometer/) 점수 (2013년에서 2018년까지)](/_img/10-years/speedometer-1.svg)

V8 Bench는 2013년에서 2018년 사이에 최소한의 개선을 보여주었지만, 같은 기간 동안 우리의 Speedometer 1 점수는 (또다시) **4배** 상승했습니다. (Speedometer 1을 사용한 이유는 Speedometer 2가 2013년 당시 지원되지 않았던 현대적인 JavaScript 기능을 사용하기 때문입니다.)

현재 우리는 [훨씬 더 나은](/blog/speedometer-2) [벤치마크](/blog/web-tooling-benchmark)가 있으며 이러한 벤치마크는 현대적인 JavaScript 애플리케이션을 더 정확하게 반영합니다. 그뿐만 아니라 우리는 [기존 웹 애플리케이션을 적극적으로 측정하고 최적화](/https://www.youtube.com/watch?v=xCx4uC7mn6Y)하고 있습니다.

## 요약

V8은 원래 Google Chrome용으로 개발되었지만, 항상 독립 코드베이스와 자바스크립트 실행 서비스를 사용할 수 있도록 하는 내장 API를 가진 독립적인 프로젝트였습니다. 지난 10년 동안 프로젝트의 개방적인 특성은 이를 웹 플랫폼뿐만 아니라 Node.js와 같은 다른 컨텍스트에서도 중요한 기술로 발전시키는 데 도움이 되었습니다. 그 과정에서 프로젝트는 여러 변화와 극적인 성장을 겪으면서도 상황에 맞게 진화하고 계속해서 관련성을 유지해 왔습니다.

초기에는 V8이 두 개의 명령 세트만 지원했습니다. 지난 10년 동안 지원되는 플랫폼 목록은 ia32, x64, ARM, ARM64, 32- 및 64비트 MIPS, 64비트 PPC, S390으로 8개까지 확대되었습니다. V8의 빌드 시스템은 SCons에서 GYP로, 다시 GN으로 이전했습니다. 프로젝트는 덴마크에서 독일로 이동했으며 현재는 런던, 마운틴뷰, 샌프란시스코를 포함한 전 세계에 엔지니어들이 있으며 Google 외부에서도 더 많은 지역에서 기여자들을 보유하고 있습니다. 우리는 JavaScript 컴파일 파이프라인 전체를 이름 없는 컴포넌트에서 Full-codegen(기본 컴파일러), Crankshaft(피드백 기반 최적화 컴파일러)에서 Ignition(인터프리터), TurboFan(더 나은 피드백 기반 최적화 컴파일러)으로 변환했습니다. V8은 단순한 JavaScript 엔진이었던 것에서 WebAssembly까지 지원하는 엔진으로 발전했습니다. JavaScript 언어 자체도 ECMAScript 3에서 ES2018로 발전했으며 최신 V8은 ES2018 이후의 기능도 구현합니다.

웹의 이야기 속도는 길고 지속적입니다. Chrome과 V8의 10번째 생일을 기념하는 것은 비록 이것이 큰 이정표이나 웹 플랫폼의 이야기가 25년 이상 지속되어 왔음을 반영하기에 좋은 기회입니다. 향후 적어도 그만큼 긴 시간 동안 웹의 이야기는 계속될 것이라는 데 의심의 여지가 없습니다. 우리는 V8, JavaScript 및 WebAssembly가 이 이야기에 계속 흥미로운 캐릭터로 남을 수 있도록 최선을 다하고 있습니다. 앞으로의 10년이 어떤 것을 가져올지 기대됩니다. 계속 지켜봐 주세요!
