---
title: &apos;Indicium: V8 런타임 추적 도구&apos;
author: &apos;Zeynep Cankara ([@ZeynepCankara](https://twitter.com/ZeynepCankara))&apos;
avatars:
  - &apos;zeynep-cankara&apos;
date: 2020-10-01 11:56:00
tags:
  - 도구
  - 시스템-분석기
description: &apos;Indicium: Map/IC 이벤트를 분석하는 V8 시스템 분석 도구&apos;
tweet: &apos;1311689392608731140&apos;
---
# Indicium: V8 시스템 분석기

지난 3개월 동안 저는 V8 팀(Google London)에 인턴으로 합류하면서 많은 것을 배울 수 있는 멋진 경험을 가졌습니다. 그리고 새로운 도구인 [*Indicium*](https://v8.dev/tools/head/system-analyzer)를 개발하고 있었습니다.

이 시스템 분석기는 인라인 캐시(IC)와 Map이 실제 애플리케이션에서 어떻게 생성되고 수정되는지에 대한 패턴을 추적, 디버그 및 분석할 수 있는 통합 웹 인터페이스입니다.

V8은 이미 [ICs](https://mathiasbynens.be/notes/shapes-ics)와 [Maps](https://v8.dev/blog/fast-properties)를 위한 추적 인프라를 가지고 있으며, [IC Explorer](https://v8.dev/tools/v8.7/ic-explorer.html) 및 [Map Processor](https://v8.dev/tools/v8.7/map-processor.html)를 사용하여 IC 이벤트 및 Map 이벤트를 처리하고 분석할 수 있습니다. 그러나 이전 도구들은 Map과 IC를 전체적으로 분석할 수 있는 기능이 부족했으며, 이제 시스템 분석기를 통해 이를 해결할 수 있습니다.

<!--truncate-->
![Indicium](/_img/system-analyzer/indicium-logo.png)

## 사례 연구

Indicium을 사용하여 V8에서 Map 및 IC 로그 이벤트를 분석하는 방법을 보여주는 예제를 살펴보겠습니다.

```javascript
class Point {
  constructor(x, y) {
    if (x < 0 || y < 0) {
      this.isNegative = true;
    }
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}

let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

// 준비 작업
for (let i = 0; i < 10e5; i++) {
  dotProduct = a.dotProduct(b);
}

console.time(&apos;스니펫1&apos;);
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd(&apos;스니펫1&apos;);

a = new Point(-1, -1);
b = new Point(-2, -2);
console.time(&apos;스니펫2&apos;);
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd(&apos;스니펫2&apos;);
```

여기서는 두 좌표와 좌표 값에 따라 추가적인 불리언 값을 저장하는 `Point` 클래스를 정의했습니다. `Point` 클래스에는 전달된 객체와 수신자인 객체 사이의 내적을 반환하는 `dotProduct` 메서드가 들어 있습니다.

프로그램을 더 쉽게 설명하기 위해 프로그램을 두 개의 스니펫으로 나눠봅시다(준비 단계는 무시).

### *스니펫 1*

```javascript
let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

console.time(&apos;스니펫1&apos;);
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd(&apos;스니펫1&apos;);
```

### *스니펫 2*

```javascript
a = new Point(-1, -1);
b = new Point(-2, -2);
console.time(&apos;스니펫2&apos;);
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd(&apos;스니펫2&apos;);
```

프로그램을 실행시키면 성능 저하가 발생하는 것을 확인할 수 있습니다. 비슷한 두 스니펫의 성능을 측정하고 있는데도 불구하고, for 루프에서 `dotProduct` 함수를 호출하여 `Point` 객체의 `x`와 `y` 속성에 접근하는 방식의 차이로 인해 성능 차이를 볼 수 있습니다.

스니펫 1은 스니펫 2보다 약 3배 더 빠르게 실행됩니다. 유일한 차이점은 스니펫 2에서 `Point` 객체의 `x`와 `y` 속성에 대해 음수 값을 사용하는 것입니다.

![스니펫 성능 분석.](/_img/system-analyzer/initial-program-performance.png)

이 성능 차이를 분석하기 위해 V8에서 제공하는 여러 로깅 옵션을 사용할 수 있습니다. 바로 여기에서 시스템 분석기의 강점이 드러납니다. 시스템 분석기는 로그 이벤트를 표시하고 이를 맵 이벤트와 연결하여 V8 내부의 숨겨진 마법을 탐색할 수 있게 합니다.

사례 연구로 들어가기 전에, 시스템 분석기 도구의 패널에 익숙해져 봅시다. 도구에는 네 개의 주요 패널이 있습니다:

- Map/IC 이벤트를 시간에 따라 분석하는 타임라인 패널,
- 맵의 전이 트리를 시각화하는 맵 패널,
- IC 이벤트에 대한 통계를 얻는 IC 패널,
- 스크립트의 Map/IC 파일 위치를 표시하는 소스 패널.

![시스템 분석기 개요](/_img/system-analyzer/system-analyzer-overview.png)

![`dotProduct`에 관련된 IC 이벤트에 대해 더 자세히 알아보기 위해 함수 이름으로 그룹화.](/_img/system-analyzer/case1_1.png)

`dotProduct` 함수가 어떻게 이 성능 차이를 일으킬 수 있는지 분석하고 있습니다. 따라서 IC 이벤트를 함수 이름으로 그룹화하여 `dotProduct` 함수와 관련된 IC 이벤트에 대한 더 심층적인 정보를 얻습니다.

첫 번째로 주목할 점은 이 함수 안에서 IC 이벤트에 의해 기록된 두 개의 다른 IC 상태 전이가 있다는 것입니다. 하나는 초기화되지 않은 상태(uninitialised)에서 단형(monomorphic)으로 전환되고, 다른 하나는 단형에서 다형(polymorphic)으로 전환됩니다. 다형 IC 상태는 이제 `Point` 객체와 관련된 여러 맵을 추적하고 있음을 나타내며, 이 다형 상태는 추가적인 검사를 수행해야 하므로 더 나쁩니다.

같은 유형의 객체에 대해 여러 개의 Map 형태를 생성하는 이유를 알고 싶습니다. 이를 위해 IC 상태에 대한 정보 버튼을 토글하여 초기화되지 않은 상태에서 단일 형태로 전환되는 Map 주소에 대한 추가 정보를 얻습니다.

![단일형 IC 상태와 관련된 Map 전환 트리.](/_img/system-analyzer/case1_2.png)

![다형성 IC 상태와 관련된 Map 전환 트리.](/_img/system-analyzer/case1_3.png)

단일형 IC 상태에서는 전환 트리를 시각화하여 동적으로 두 개의 속성 `x`와 `y`만 추가하고 있지만, 다형성 IC 상태에서는 `isNegative`, `x`, `y` 세 가지 속성을 포함한 새로운 Map을 가지게 됩니다.

![Map 패널이 파일 위치 정보를 전달하여 Source 패널에서 파일 위치를 강조합니다.](/_img/system-analyzer/case1_4.png)

Map 패널의 파일 위치 섹션을 클릭하여 소스 코드에서 `isNegative` 속성이 추가되는 위치를 확인하고 이를 통해 성능 저하 문제를 해결할 수 있습니다.

이제 문제는 *도구를 통해 얻은 통찰력을 사용하여 성능 저하를 어떻게 해결할 수 있을까* 하는 것입니다.

최소한의 솔루션은 항상 `isNegative` 속성을 초기화하는 것입니다. 일반적으로 모든 인스턴스 속성은 생성자에서 초기화하는 것이 좋은 조언입니다.

이제 업데이트된 `Point` 클래스는 다음과 같습니다:

```javascript
class Point {
  constructor(x, y) {
    this.isNegative = x < 0 || y < 0;
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}
```

스크립트를 업데이트된 `Point` 클래스로 다시 실행하면 케이스 스터디 초반에 정의된 두 코드 스니펫이 매우 유사한 성능을 보이는 것을 확인할 수 있습니다.

업데이트된 추적 내역에서 동일한 유형의 객체에 대해 여러 개의 Map을 생성하지 않으므로 다형성 IC 상태를 회피하는 것을 볼 수 있습니다.

![수정된 Point 객체의 Map 전환 트리.](/_img/system-analyzer/case2_1.png)

## 시스템 분석기

이제 시스템 분석기에 존재하는 다양한 패널을 자세히 살펴보겠습니다.

### 타임라인 패널

타임라인 패널은 시간 내에서 선택을 허용하여 특정 시간이나 선택한 시간 범위 동안의 IC/Map 상태를 시각화할 수 있습니다. 이 패널은 선택한 시간 범위에 해당하는 로그 이벤트를 확대/축소하는 필터링 기능을 지원합니다.

![타임라인 패널 개요](/_img/system-analyzer/timeline-panel.png)

![타임라인 패널 개요 (Cont.)](/_img/system-analyzer/timeline-panel2.png)

### Map 패널

Map 패널은 두 개의 하위 패널을 포함합니다:

1. Map 세부 정보
2. Map 전환

Map 패널은 선택된 맵의 전환 트리를 시각화합니다. 선택된 맵의 메타데이터는 Map 세부 정보 하위 패널에 표시됩니다. Map 주소에 대한 특정 전환 트리를 제공된 인터페이스를 통해 검색할 수 있습니다. Map 전환 하위 패널 위에 있는 통계 하위 패널에서는 Map 전환을 유발하는 속성과 Map 이벤트 유형에 관한 통계를 볼 수 있습니다.

![Map 패널 개요](/_img/system-analyzer/map-panel.png)

![Stats 패널 개요](/_img/system-analyzer/stats-panel.png)

### IC 패널

IC 패널은 타임라인 패널을 통해 필터링된 특정 시간 범위 내의 IC 이벤트에 대한 통계를 표시합니다. 또한 IC 패널은 다양한 옵션(유형, 카테고리, Map, 파일 위치)을 바탕으로 IC 이벤트를 그룹화할 수 있습니다. Map 및 파일 위치 그룹화 옵션은 각각 Map 및 소스 코드 패널과 상호작용하여 Map의 전환 트리를 표시하고 IC 이벤트와 관련된 파일 위치를 강조합니다.

![IC 패널 개요](/_img/system-analyzer/ic-panel.png)

![IC 패널 개요 (Cont.)](/_img/system-analyzer/ic-panel2.png)

![IC 패널 개요 (Cont.)](/_img/system-analyzer/ic-panel3.png)

![IC 패널 개요 (Cont.)](/_img/system-analyzer/ic-panel4.png)

### 소스 패널

소스 패널은 로드된 스크립트를 표시하며 클릭 가능한 마커를 통해 맞춤 이벤트를 방출하여 맞춤 패널 간에 Map 및 IC 로그 이벤트를 선택합니다. 로드된 스크립트의 선택은 드릴다운 바를 통해 수행할 수 있습니다. Map 패널 및 IC 패널에서 파일 위치를 선택하면 소스 코드 패널에서 선택된 파일 위치가 강조 표시됩니다.

![소스 패널 개요](/_img/system-analyzer/source-panel.png)

### 감사

저는 V8 및 Web on Android 팀의 모든 분들과 특히 저의 호스트인 Sathya와 공동 호스트 Camillo에게 제 인턴십 내내 저를 지원해주시고 멋진 프로젝트에 참여할 기회를 주셔서 감사드립니다.

Google에서의 여름 인턴십은 정말 놀라운 경험이었습니다!
