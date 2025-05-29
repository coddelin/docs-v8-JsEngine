---
title: '크롬, Speedometer 2.0을 환영합니다!'
author: 'Blink 팀과 V8 팀'
date: 2018-01-24 13:33:37
tags:
  - 벤치마크
description: 'Speedometer 2.0을 기반으로 Blink와 V8에서 지금까지 이룬 성능 향상에 대한 개요입니다.'
tweet: '956232641736421377'
---
Speedometer 1.0이 2014년에 처음 출시된 이후, Blink와 V8 팀은 이 벤치마크를 인기 있는 JavaScript 프레임워크의 실제 사용을 위한 기준으로 삼아왔으며 상당한 속도 향상을 달성했습니다. 이러한 향상이 실제 사용자에게 주는 혜택을 실시간 웹사이트를 측정하여 독립적으로 확인했으며, 인기 있는 웹사이트의 페이지 로드 시간이 개선됨에 따라 Speedometer 점수도 향상되었습니다.

<!--truncate-->
그 동안 JavaScript는 빠르게 발전하며 ES2015 및 이후 표준에서 많은 새로운 언어 기능이 추가되었습니다. 프레임워크도 마찬가지로 발전하여 Speedometer 1.0은 시간이 지남에 따라 구식이 되었습니다. 따라서 Speedometer 1.0을 최적화 지표로 사용하는 것은 적극적으로 사용되는 최신 코드 패턴을 측정하지 않을 위험을 증가시킬 수 있습니다.

Blink와 V8 팀은 [최근 업데이트된 Speedometer 2.0 벤치마크 출시](https://webkit.org/blog/8063/speedometer-2-0-a-benchmark-for-modern-web-app-responsiveness/)를 환영합니다. 원래 개념을 현대적인 프레임워크, 트랜스파일러 및 ES2015 기능 목록에 적용함으로써 벤치마크는 최적화를 위한 주요 후보로 다시 자리잡게 됩니다. Speedometer 2.0은 [실제 성능 벤치마킹 도구 벨트](/blog/real-world-performance)에 훌륭한 추가 요소입니다.

## 크롬의 지금까지의 성과

Blink와 V8 팀은 이미 개선의 첫 단계를 완료하였으며, 이 벤치마크의 중요성을 입증하며 실제 성능에 집중하는 여정을 계속하고 있습니다. 2017년 7월에 출시된 Chrome 60과 최신 Chrome 64를 비교했을 때, 2016년 중반의 Macbook Pro(4코어, 16GB RAM)에서 총 점수(분당 실행 횟수)에서 약 21% 개선을 이뤘습니다.

![Chrome 60과 64의 Speedometer 2 점수 비교](/_img/speedometer-2/scores.png)

Speedometer 2.0의 개별 항목을 확대해보겠습니다. [`Function.prototype.bind`](https://chromium.googlesource.com/v8/v8/+/808dc8cff3f6530a627ade106cbd814d16a10a18)을 개선함으로써 React 런타임의 성능을 두 배로 향상시켰습니다. Vanilla-ES2015, AngularJS, Preact, VueJS는 [JSON 파싱 속도를 높임](https://chromium-review.googlesource.com/c/v8/v8/+/700494)과 다양한 다른 성능 개선으로 인해 19%–42% 향상되었습니다. jQuery-TodoMVC 앱의 런타임은 Blink의 DOM 구현 개선으로 줄어들었으며, 여기에는 [더 가벼운 폼 컨트롤](https://chromium.googlesource.com/chromium/src/+/f610be969095d0af8569924e7d7780b5a6a890cd)과 [HTML 파서 조정](https://chromium.googlesource.com/chromium/src/+/6dd09a38aaae9c15adf5aad966f761f180bf1cef)이 포함됩니다. V8의 인라인 캐시와 최적화 컴파일러의 추가 조정으로 전체적으로 성능을 개선했습니다.

![Chrome 60에서 64까지 Speedometer 2 하위 테스트의 점수 개선](/_img/speedometer-2/improvements.png)

Speedometer 1.0에서 주요 변경 사항은 최종 점수 계산 방식입니다. 이전에는 모든 점수 평균이 가장 느린 항목만 작업하도록 선호되었습니다. 각 항목에서 소비된 절대 시간을 보면 예를 들어 EmberJS-Debug 버전이 가장 빠른 벤치마크보다 약 35배 오래 걸립니다. 따라서 전체 점수를 개선하려면 EmberJS-Debug에 집중하는 것이 가장 큰 가능성을 제공합니다.

![](/_img/speedometer-2/time.png)

Speedometer 2.0은 최종 점수 계산에 기하 평균을 사용하여 각 프레임워크에 동일한 투자를 선호합니다. 위에서 언급한 Preact의 최근 16.5% 개선을 고려해 보겠습니다. 총 시간에 대한 적은 기여로 인해 16.5% 개선을 포기하면 공평하지 않을 것입니다.

Speedometer 2.0을 통해 웹 전체에 더 많은 성능 개선을 가져올 것을 기대하고 있습니다. 더 많은 성능 개선에 대한 소식을 기대해주세요.
