---
title: "문제 분류"
description: "이 문서는 V8의 버그 추적기에서 문제를 다루는 방법을 설명합니다."
---
이 문서는 [V8의 버그 추적기](/bugs)에서 문제를 다루는 방법을 설명합니다.

## 문제를 분류하는 방법

- *V8 추적기*: 상태를 `Untriaged`로 설정
- *Chromium 추적기*: 상태를 `Untriaged`로 설정하고 구성 요소를 `Blink>JavaScript`로 추가

## Chromium 추적기에서 V8 문제를 할당하는 방법

문제를 다음 카테고리 중 하나의 V8 전문 셰리프 큐로 이동시켜 주세요:

- 메모리: `component:blink>javascript status=Untriaged label:Performance-Memory`
    - [이곳](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=component%3Ablink%3Ejavascript+status%3DUntriaged+label%3APerformance-Memory+&colspec=ID+Pri+M+Stars+ReleaseBlock+Cr+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=tiles)에서 조회 가능
- 안정성: `status=available,untriaged component:Blink>JavaScript label:Stability -label:Clusterfuzz`
    - [이곳](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=status%3Davailable%2Cuntriaged+component%3ABlink%3EJavaScript+label%3AStability+-label%3AClusterfuzz&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids)에서 조회 가능
    - CC가 필요하지 않으며 자동으로 셰리프가 분류
- 성능: `status=untriaged component:Blink>JavaScript label:Performance`
    - [이곳](https://bugs.chromium.org/p/chromium/issues/list?colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&x=m&y=releaseblock&cells=tiles&q=component%3Ablink%3Ejavascript%20status%3DUntriaged%20label%3APerformance&can=2)에서 조회 가능
    - CC가 필요하지 않으며 자동으로 셰리프가 분류
- Clusterfuzz: 문제 상태를 다음과 같이 설정:
    - `label:ClusterFuzz component:Blink>JavaScript status:Untriaged`
    - [이곳](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=label%3AClusterFuzz+component%3ABlink%3EJavaScript+status%3AUntriaged&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids)에서 조회 가능.
    - CC가 필요하지 않으며 자동으로 셰리프가 분류
- 보안: 모든 보안 문제는 Chromium 보안 셰리프에 의해 분류됩니다. 자세한 정보는 [보안 버그 보고](/docs/security-bugs)를 참조하십시오.

셰리프의 주의를 끌 필요가 있는 경우, 로테이션 정보를 참고하십시오.

모든 문제에서 `Blink>JavaScript` 구성 요소를 사용하십시오.

**이 내용은 Chromium 문제 추적기에서 추적되는 문제에만 적용됩니다.**
