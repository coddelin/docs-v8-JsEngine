---
title: 'V8의 미래 테스트를 도와주세요!'
author: 'Daniel Clifford ([@expatdanno](https://twitter.com/expatdanno)), Original Munich V8 Brewer'
date: 2017-02-14 13:33:37
tags:
  - internals
description: '오늘 Chrome Canary에서 Ignition 및 TurboFan과 함께 V8의 새로운 컴파일러 파이프라인을 미리 경험하세요!'
---
V8 팀은 현재 [실제 JavaScript 성능](/blog/real-world-performance)에 개선을 가져올 수 있는 새로운 기본 컴파일러 파이프라인을 개발 중입니다. Chrome Canary에서 새로운 파이프라인을 오늘 미리 경험하여 모든 Chrome 채널에 새로운 설정을 배포할 때 예상치 못한 문제가 없는지 확인하는 데 도움을 줄 수 있습니다.

<!--truncate-->
새로운 컴파일러 파이프라인은 모든 JavaScript를 실행하기 위해 [Ignition 인터프리터](/blog/ignition-interpreter)와 [TurboFan 컴파일러](/docs/turbofan)를 사용합니다(Full-codegen 및 Crankshaft 컴파일러로 구성된 기존 파이프라인 대신). 랜덤한 Chrome Canary 및 Chrome 개발자 채널 사용자들이 이미 새로운 설정을 테스트하고 있습니다. 그러나 누구나 about:flags에서 플래그를 전환하여 새로운 파이프라인을 사용하도록 선택하거나 이전 버전으로 되돌릴 수 있습니다.

새로운 파이프라인을 테스트하려면 Chrome에서 즐겨 찾는 웹사이트를 이용하며 선택적으로 활성화하고 사용하면 됩니다. 만약 웹 개발자라면 새로운 컴파일러 파이프라인으로 웹 애플리케이션을 테스트해 주세요. 안정성, 올바름, 또는 성능에 대한 문제가 발생하면 [V8 버그 트래커](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline)에 이를 보고해 주시기 바랍니다.

## 새로운 파이프라인 활성화 방법

### Chrome 58에서

1. 최신 [베타](https://www.google.com/chrome/browser/beta.html)를 설치하세요.
2. Chrome에서 `about:flags` URL을 엽니다.
3. "**Experimental JavaScript Compilation Pipeline**"을 검색하여 "**Enabled**"로 설정합니다.

![](/_img/test-the-future/58.png)

### Chrome 59.0.3056 이상에서

1. 최신 Canary [Canary](https://www.google.com/chrome/browser/canary.html) 또는 [Dev](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel)를 설치하세요.
2. Chrome에서 `about:flags` URL을 엽니다.
3. "**Classic JavaScript Compilation Pipeline**"을 검색하여 "**Disabled**"로 설정합니다.

![](/_img/test-the-future/59.png)

기본값은 "**Default**"로 설정되어 있으며, 이는 A/B 테스트 구성에 따라 새로운 파이프라인 **또는** 기존 파이프라인이 활성화됨을 의미합니다.

## 문제 보고 방법

기본 파이프라인 대신 새로운 파이프라인을 사용할 때 브라우징 경험에 극적인 변화가 있다면 알려주시기 바랍니다. 웹 개발자의 경우 새로운 파이프라인이 귀하의 (모바일) 웹 애플리케이션 성능에 어떠한 영향을 미치는지 확인해보세요. 만약 웹 애플리케이션이 이상하게 작동하거나 테스트가 실패한다면 알려주시기 바랍니다:

1. 이전 섹션에 설명된 대로 새로운 파이프라인을 올바르게 활성화했는지 확인하세요.
2. [V8 버그 트래커에 버그를 생성하세요](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline).
3. 문제를 재현할 수 있는 샘플 코드를 첨부하세요.
