---
title: &apos;V8 릴리스 v5.4&apos;
author: &apos;V8 팀&apos;
date: 2016-09-09 13:33:37
tags:
  - 릴리스
description: &apos;V8 v5.4는 성능 향상 및 메모리 소비 감소를 제공합니다.&apos;
---
매 6주마다, 우리는 [릴리스 프로세스](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 생성합니다. 각 버전은 Chrome Beta 이정표 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 [V8 버전 5.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.4)를 발표하게 되어 매우 기쁩니다. 이 버전은 Chrome 54 Stable과 함께 출시되기 전까지 몇 주 동안 베타로 제공됩니다. V8 v5.4는 개발자가 사용할 수 있는 다양한 기능이 포함되어 있으므로, 릴리스를 앞두고 몇 가지 주요 내용을 미리 보여드리고자 합니다.

<!--truncate-->
## 성능 향상

V8 v5.4는 메모리 풋프린트 및 시작 속도에서 여러 주요 개선 사항을 제공합니다. 이는 주로 초기 스크립트 실행을 가속화하고 Chrome에서 페이지 로드를 줄이는 데 도움을 줍니다.

### 메모리

V8의 메모리 소비를 측정할 때, _최대 메모리_ 소비와 _평균 메모리_ 소비라는 두 가지 메트릭이 매우 중요합니다. 일반적으로 최대 소비를 줄이는 것은 평균 소비를 줄이는 것만큼 중요합니다. 실행 중인 스크립트가 순간적으로 가용 메모리를 초과하면, 평균 메모리 소비가 높지 않더라도 _메모리 부족_ 충돌을 일으킬 수 있기 때문입니다. 최적화 목적으로 V8의 메모리는 두 가지 범주로 나눌 수 있습니다: 실제 JavaScript 객체가 포함된 _온 힙 메모리_와 컴파일러, 파서, 가비지 수집기가 할당하는 내부 데이터 구조 등이 포함된 _오프 힙 메모리_.

버전 5.4에서는 512MB 이하의 RAM을 가진 저용량 기기를 위해 V8의 가비지 수집기를 조정했습니다. 표시된 웹사이트에 따라 _온 힙 메모리_의 _최대 메모리_ 소비가 최대 **40%** 감소합니다.

V8 JavaScript 파서 안에서 메모리 관리가 단순화되어 불필요한 할당을 방지하고, _오프 힙 최대 메모리_ 사용량을 최대 **20%** 줄였습니다. 이러한 메모리 절감은 asm.js 애플리케이션을 포함하여 대형 스크립트 파일의 메모리 사용량을 줄이는 데 특히 유용합니다.

### 시작 및 속도

V8 파서를 최적화하는 과정에서 메모리 소비를 줄이는 것뿐만 아니라, 파서의 실행 성능도 개선되었습니다. 이러한 최적화는 JavaScript 내장 함수와 JavaScript 객체의 속성 접근 방식에 대해 글로벌 [인라인 캐시](https://en.wikipedia.org/wiki/Inline_caching)를 사용하는 방식 등을 포함하여 다른 최적화와 결합하여 뛰어난 시작 성능 향상을 가져왔습니다.

실제 JavaScript 성능을 측정하는 우리의 [내부 시작 테스트 스위트](https://www.youtube.com/watch?v=xCx4uC7mn6Y)에 따르면, 성능이 평균 5% 향상되었습니다. [Speedometer](http://browserbench.org/Speedometer/) 벤치마크도 이러한 최적화의 이점을 받아 [v5.2와 비교하여 약 10~13%](https://chromeperf.appspot.com/report?sid=f5414b72e864ffaa4fd4291fa74bf3fd7708118ba534187d36113d8af5772c86&start_rev=393766&end_rev=416239) 향상되었습니다.

![](/_img/v8-release-54/speedometer.png)

## V8 API

[API 변경 사항 요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인하세요. 이 문서는 주요 릴리스 후 몇 주 후에 정기적으로 업데이트됩니다.

[활성 V8 체크아웃](/docs/source-code#using-git) 중인 개발자는 `git checkout -b 5.4 -t branch-heads/5.4`를 사용하여 V8 v5.4의 새 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)을 구독하여 곧 직접 새 기능을 시도해볼 수 있습니다.
