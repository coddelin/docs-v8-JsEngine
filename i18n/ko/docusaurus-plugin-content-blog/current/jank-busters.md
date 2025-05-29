---
title: &apos;Jank Busters Part One&apos;
author: &apos;the jank busters: Jochen Eisinger, Michael Lippautz, and Hannes Payer&apos;
avatars:
  - &apos;michael-lippautz&apos;
  - &apos;hannes-payer&apos;
date: 2015-10-30 13:33:37
tags:
  - memory
description: &apos;이 글은 Chrome 41과 Chrome 46 사이에 구현된 최적화에 대해 논의하며, 이는 가비지 수집 지연 시간을 상당히 줄여 사용자 경험을 개선합니다.&apos;
---
지연(jank), 즉 눈에 띄는 끊김은 Chrome이 16.66ms(60프레임/초) 내에 프레임을 렌더링하지 못할 때 발생합니다. 현재로서는 V8의 대부분의 가비지 수집 작업이 메인 렌더링 스레드에서 수행되며, 이는 종종 너무 많은 객체를 유지관리해야 할 때 지연을 유발합니다. 지연을 제거하는 것은 항상 V8 팀([1](https://blog.chromium.org/2011/11/game-changer-for-interactive.html), [2](https://www.youtube.com/watch?v=3vPOlGRH6zk), [3](/blog/free-garbage-collection))의 최우선 과제였습니다. 이 글은 Chrome 41에서 Chrome 46 사이에 구현되어 가비지 수집 지연을 크게 줄임으로써 사용자 경험을 개선한 몇 가지 최적화에 대해 논의합니다.

<!--truncate-->
![그림 1: 메인 스레드에서 가비지 수집 수행](/_img/jank-busters/gc-main-thread.png)

가비지 수집 중 지연의 주요 원인 중 하나는 다양한 부기 데이터 구조를 처리하는 것입니다. 이 데이터 구조들 중 많은 부분이 가비지 수집과는 관련이 없는 최적화를 가능하게 합니다. 예로는 모든 ArrayBuffer의 목록과 각 ArrayBuffer의 뷰 목록이 있습니다. 이 목록들은 ArrayBuffer 뷰에 대한 접근에서 성능 손실 없이 DetachArrayBuffer 작업을 효율적으로 수행할 수 있도록 해줍니다. 그러나 웹 페이지에서 수백만 개의 ArrayBuffer를 생성하는 경우(예: WebGL 기반 게임), 가비지 수집 중 이러한 목록을 업데이트하는 것이 상당한 지연을 유발합니다. Chrome 46에서는 이러한 목록을 제거하고 모든 ArrayBuffer 읽기 및 쓰기 전에 체크를 삽입함으로써 분리된 버퍼를 감지하도록 했습니다. 이로 인해 프로그램 실행 중에 큰 부기 목록을 걷는 비용이 분산되어 결과적으로 지연이 줄어듭니다. 비록 접근당 체크는 ArrayBuffer를 많이 사용하는 프로그램의 처리량을 이론적으로 늦출 수 있지만, 실제로는 V8의 최적화 컴파일러가 중복된 체크를 제거하고 남은 체크를 반복문 외부로 이동할 수 있어 전체 성능 페널티가 거의 없거나 전혀 없이 훨씬 부드러운 실행 프로파일을 제공합니다.

또 다른 지연의 원인은 Chrome과 V8 사이에서 공유되는 객체의 수명을 추적하는 부기와 관련되어 있습니다. Chrome과 V8의 메모리 힙은 별개이지만, DOM 노드와 같이 Chrome의 C++ 코드에서 구현되고 JavaScript에서 접근 가능한 특정 객체에 대해서는 동기화가 필요합니다. V8은 Chrome이 V8 힙 객체를 구현 세부사항을 알지 못한 채 조작할 수 있도록 핸들이라는 불투명 데이터 유형을 생성합니다. 객체의 수명은 핸들에 연결되어 있습니다: Chrome이 핸들을 유지하는 한, V8의 가비지 컬렉터는 객체를 폐기하지 않습니다. V8은 V8 API를 통해 Chrome에 다시 전달하는 각 핸들에 대해 글로벌 참조라는 내부 데이터 구조를 생성하며, 이는 V8의 가비지 컬렉터에게 객체가 여전히 활성 상태임을 알려줍니다. WebGL 게임의 경우, Chrome은 수백만 개의 이러한 핸들을 생성할 수 있으며, V8은 이에 따라 해당 수명 관리를 위해 글로벌 참조를 생성해야 합니다. 메인 가비지 수집 지연 중 이러한 대규모 글로벌 참조를 처리하는 것은 지연으로 관찰될 수 있습니다. 다행히도 WebGL로 전달된 객체는 종종 단순히 전달될 뿐 실제로 수정되지는 않으므로 간단한 정적 [탈출 분석](https://en.wikipedia.org/wiki/Escape_analysis)이 가능합니다. 기본적으로 소규모 배열을 매개변수로 사용한다고 알려진 WebGL 함수의 경우 기본 데이터를 스택에 복사하여 글로벌 참조가 불필요하게 만듭니다. 이러한 혼합 접근 방식의 결과는 렌더링 중심 WebGL 게임의 일시 중지 시간을 최대 50%까지 줄이는 것입니다.

V8의 가비지 수집은 대부분 메인 렌더링 스레드에서 수행됩니다. 가비지 수집 작업을 동시 스레드로 이동하면 가비지 수집기의 대기 시간이 줄어들고 지연도 더욱 감소합니다. 이는 메인 JavaScript 애플리케이션과 가비지 수집기가 동시에 같은 객체를 관찰하고 수정할 수 있기 때문에 본질적으로 복잡한 작업입니다. 지금까지 동시성은 일반 객체 JS 힙의 오래된 세대를 쓸어내는 데 제한되어 있었습니다. 최근에는 V8 힙의 코드 및 맵 공간을 동시 쓸어내기(sweeping)도 구현했습니다. 추가적으로, 메인 스레드에서 수행되어야 할 작업을 줄이기 위해 사용되지 않는 페이지의 동시 제거(unmapping)도 구현했습니다, c.f. 그림 2.

![Figure 2: 일부 가비지 컬렉션 작업이 동시 가비지 컬렉션 스레드에서 수행됨.](/_img/jank-busters/gc-concurrent-threads.png)

논의된 최적화의 영향은 WebGL 기반 게임에서 명확히 볼 수 있습니다. 예를 들어 [Turbolenz의 Oort Online 데모](http://oortonline.gl/)입니다. 다음 동영상은 Chrome 41과 Chrome 46을 비교합니다:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PgrCJpbTs9I" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

현재 우리는 더 많은 가비지 컬렉션 구성 요소를 점진적, 동시적 및 병렬적으로 만드는 작업을 진행 중이며, 메인 스레드에서의 가비지 컬렉션 정지 시간을 더욱 줄이는 것을 목표로 하고 있습니다. 흥미로운 패치가 준비 중이니 계속 지켜봐 주세요.
