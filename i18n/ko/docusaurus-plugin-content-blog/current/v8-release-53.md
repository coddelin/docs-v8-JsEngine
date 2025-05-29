---
title: "V8 릴리스 v5.3"
author: "V8 팀"
date: 2016-07-18 13:33:37
tags:
  - 릴리스
description: "V8 v5.3은 성능 개선과 메모리 소비 감소를 제공합니다."
---
약 6주마다, [릴리스 프로세스](/docs/release-process)의 일환으로 V8의 새 브랜치를 생성합니다. 각 버전은 Chrome Beta 마일스톤을 위한 Chrome 브랜치 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 우리의 새로운 브랜치 [V8 버전 5.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.3)을 발표하게 되어 기쁩니다. 이는 Chrome 53 Stable과 조정하여 릴리스될 때까지 베타 상태에 있을 예정입니다. V8 v5.3은 개발자에게 다양한 기능을 제공하며, 몇 주 후 릴리스에 앞서 주요 사항의 미리보기를 제공합니다.

<!--truncate-->
## 메모리

### 새로운 Ignition 인터프리터

Ignition, V8의 새로운 인터프리터는 모든 기능이 완성되었으며 저메모리 Android 기기에서 Chrome 53에서 활성화됩니다. 인터프리터는 JIT 코드에서 즉각적인 메모리 절감을 제공하며 코드 실행 중 더 빠른 시작을 위해 향후 최적화를 허용할 것입니다. Ignition은 V8의 기존 최적화 컴파일러(TurboFan과 Crankshaft)와 협력하여 “핫” 코드가 여전히 최적 성능으로 실행되도록 보장합니다. 우리는 인터프리터 성능을 계속 개선하고 있으며 곧 모바일과 데스크톱 플랫폼에서 모두 Ignition을 활성화할 계획입니다. Ignition의 설계, 아키텍처 및 성능 향상에 대한 더 많은 정보를 보려면 곧 있을 블로그 게시물을 확인하십시오. V8의 임베디드 버전은 `--ignition` 플래그를 사용하여 Ignition 인터프리터를 활성화할 수 있습니다.

### 지터 감소

V8 v5.3에는 애플리케이션 지터와 가비지 컬렉션 시간을 줄이기 위한 다양한 변경 사항이 포함되어 있습니다. 이러한 변경 사항은 다음을 포함합니다:

- 외부 메모리 처리를 줄이기 위한 약한 글로벌 핸들 최적화
- 이주 지터를 줄이기 위해 전체 가비지 컬렉션힙 통합
- 가비지 컬렉션 마킹 단계에서 V8의 [블랙 할당](/blog/orinoco) 추가 최적화

이 개선 사항을 통해 인기 있는 웹페이지 집합을 탐색하는 동안 약 25%의 가비지 컬렉션 일시 중지 시간을 줄였습니다. 지터 감소를 위한 최근 가비지 컬렉션 최적화에 대한 자세한 내용은 “Jank Busters” 블로그 게시물을 참조하십시오: [Part 1](/blog/jank-busters) 및 [Part 2](/blog/orinoco).

## 성능

### 페이지 시작 시간 개선

V8 팀은 최근 25개의 실제 웹사이트 페이지 로드(페이스북, 레딧, 위키피디아, 인스타그램 등 인기 사이트 포함)에 대해 성능 개선 사항을 추적하기 시작했습니다. V8 v5.1 (2016년 4월 Chrome 51에서 측정)과 V8 v5.3 (최근 Chrome Canary 53에서 측정) 사이에 측정된 웹사이트 집합 전반에서 시작 시간이 약 7% 개선되었습니다. 실제 웹사이트 로드 개선은 Speedometer 벤치마크에서 얻은 유사한 이익, 즉 V8 v5.3에서 14% 더 빠르게 실행되는 결과와 일치했습니다. 새 테스트 도구 구성, 런타임 개선 사항, 페이지 로드 동안 V8이 시간을 소비하는 곳에 대한 분석 등에 대한 더 많은 정보를 보려면 곧 게시될 스타트업 성능에 대한 블로그 게시물을 확인하십시오.

### ES2015 `Promise` 성능

V8의 [Bluebird ES2015 `Promise` 벤치마크 스위트](https://github.com/petkaantonov/bluebird/tree/master/benchmark)에서 성능이 아키텍처와 벤치마크에 따라 V8 v5.3에서 20–40% 개선되었습니다.

![V8의 Promise 성능이 Nexus 5x에서 시간에 따라 개선된 모습](/_img/v8-release-53/promise.png)

## V8 API

[API 변경 사항 요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인하십시오. 이 문서는 주요 릴리스 몇 주 후에 정기적으로 업데이트됩니다.

[정상적은 V8 체크아웃](https://v8.dev/docs/source-code#using-git)이 활성화된 개발자는 `git checkout -b 5.3 -t branch-heads/5.3` 명령으로 V8 5.3의 새 기능을 실험할 수 있습니다. 또는 [Chrome의 Beta 채널에 구독](https://www.google.com/chrome/browser/beta.html)하여 곧 직접 새 기능을 시도해볼 수 있습니다.
