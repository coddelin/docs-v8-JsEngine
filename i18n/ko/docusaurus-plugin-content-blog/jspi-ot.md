---
title: "WebAssembly JSPI가 오리진 트라이얼을 시작합니다"
description: "JSPI의 오리진 트라이얼 시작을 설명합니다"
author: "Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl"
date: 2024-03-06
tags: 
  - WebAssembly
---
WebAssembly의 JavaScript Promise Integration(JSPI) API가 Chrome M123 릴리스와 함께 오리진 트라이얼에 진입합니다. 이를 통해 여러분과 사용자들이 이 새로운 API로부터 이점이 있는지 테스트할 수 있습니다.

JSPI는 순차적 코드라고 불리는 코드를 WebAssembly로 컴파일한 후 _비동기적인_ 웹 API에 액세스할 수 있도록 하는 API입니다. 많은 웹 API는 JavaScript의 `Promise`를 기반으로 설계되어 요청된 작업을 즉시 수행하는 대신 그 작업을 수행하겠다는 `Promise`를 반환합니다. 작업이 최종적으로 수행되면 브라우저의 작업 실행기가 `Promise`와 함께 콜백을 호출합니다. JSPI는 이 구조에 연결되며, WebAssembly 애플리케이션이 `Promise`가 반환될 때 중단되고, `Promise`가 완료될 때 다시 실행되는 기능을 제공합니다.

<!--truncate-->
JSPI와 사용 방법에 대한 자세한 내용은 [여기](https://v8.dev/blog/jspi)를 참조하시고, 사양 자체는 [여기](https://github.com/WebAssembly/js-promise-integration)를 참조하십시오.

## 요구 사항

오리진 트라이얼에 등록하는 것 외에도 적절한 WebAssembly와 JavaScript를 생성해야 합니다. Emscripten을 사용하는 경우 이 과정은 간단합니다. 최소 버전 3.1.47을 사용하고 있는지 확인하십시오.

## 오리진 트라이얼 등록

JSPI는 아직 정식 출시 이전 상태로, 표준화 과정을 거치고 있으며 해당 과정의 4단계에 도달해야 완전히 출시됩니다. 현재 이를 사용하려면 Chrome 브라우저에서 플래그를 설정하거나 오리진 트라이얼 토큰을 신청하여 사용자들이 직접 플래그를 설정하지 않아도 사용 가능하도록 할 수 있습니다.

등록하려면 [여기](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889)로 이동하여 등록 과정에 따라 신청하십시오. 오리진 트라이얼에 대한 일반적인 정보는 [이 링크](https://developer.chrome.com/docs/web-platform/origin-trials)를 참조하십시오.

## 잠재적 문제점

[웹Assembly 커뮤니티](https://github.com/WebAssembly/js-promise-integration/issues)에서 JSPI API의 일부 측면에 대해 논의가 있었습니다. 그 결과 일부 변경 사항이 있으며, 이것들이 시스템에서 완전히 구현되기까지 시간이 걸릴 것입니다. 이러한 변경 사항은 소프트 론칭될 것으로 예상되며, 기존 API는 최소한 오리진 트라이얼 기간 말까지 유지될 것입니다.

또한, 오리진 트라이얼 기간 동안 완전히 해결되지 않을 가능성이 높은 몇 가지 알려진 문제가 있습니다:

집중적으로 분산된 계산을 생성하는 애플리케이션의 경우, 비동기 API에 액세스하기 위해 JSPI로 래핑된 시퀀스의 성능이 저하될 수 있습니다. 이는 래핑된 호출을 생성할 때 사용하는 리소스가 호출 사이에서 캐시되지 않기 때문이며, 생성된 스택을 정리하기 위해 가비지 컬렉션에 의존합니다.
우리는 현재 각 래핑된 호출에 대해 고정 크기 스택을 할당합니다. 이 스택은 복잡한 애플리케이션을 처리할 수 있도록 필연적으로 커야 하지만, 간단한 래핑된 호출의 대다수가 동시에 처리될 경우 메모리 압박이 발생할 수 있습니다.

이 두 문제 모두 JSPI를 실험하는 데 장애가 되지는 않을 것으로 예상하며, JSPI가 공식 출시되기 전에 해결될 것입니다.

## 피드백

JSPI는 표준 과정에 있는 프로젝트이므로, 모든 문제와 피드백은 [여기](https://github.com/WebAssembly/js-promise-integration/issues)에 공유해주시길 바랍니다. 하지만 Chrome 버그 보고 [사이트](https://issues.chromium.org/new)를 통해 버그 보고서를 제기할 수도 있습니다. 코드 생성에 문제가 있다고 의심된다면 [이 링크](https://github.com/emscripten-core/emscripten/issues)를 사용하여 문제를 보고하세요.

마지막으로 발견한 이점에 대해 공유해주시면 감사하겠습니다. [이슈 트래커](https://github.com/WebAssembly/js-promise-integration/issues)를 통해 여러분의 경험을 알려주시기 바랍니다.
