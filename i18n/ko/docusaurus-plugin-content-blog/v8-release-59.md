---
title: "V8 릴리스 v5.9"
author: "V8 팀"
date: "2017-04-27 13:33:37"
tags: 
  - release
description: "V8 v5.9는 새로운 Ignition + TurboFan 파이프라인을 포함하며, 모든 플랫폼에서 WebAssembly TrapIf 지원을 추가합니다."
---
매 6주마다 우리는 [릴리스 프로세스](/docs/release-process)의 일환으로 V8의 새 브랜치를 만듭니다. 각 버전은 Chrome Beta 마일스톤 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 우리의 최신 브랜치, [V8 버전 5.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.9)를 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 Chrome 59 Stable과 함께 릴리스될 때까지 베타 상태에 있습니다. V8 5.9는 개발자 친화적 기능들로 가득 차 있습니다. 릴리스를 기대하며 몇 가지 주요 사항을 미리 살펴보겠습니다.

<!--truncate-->
## Ignition+TurboFan 출시

V8 v5.9는 기본적으로 Ignition+TurboFan이 활성화된 첫 번째 버전이 될 것입니다. 일반적으로 이 전환은 메모리 소비를 줄이고 웹 애플리케이션의 시작 속도를 전반적으로 향상시킬 것으로 예상합니다. 새로운 파이프라인이 이미 충분한 테스트를 거쳤기 때문에 안정성이나 성능 문제는 예상하지 않습니다. 하지만 코드가 갑자기 성능이 크게 저하되는 경우 [여기에 문의하세요](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline).

자세한 내용은 [전용 블로그 게시물](/blog/launching-ignition-and-turbofan)을 참조하세요.

## 모든 플랫폼에서 WebAssembly `TrapIf` 지원

[WebAssembly `TrapIf` 지원](https://chromium.googlesource.com/v8/v8/+/98fa962e5f342878109c26fd7190573082ac3abe)은 코드 컴파일에 소요되는 시간을 약 30% 줄였습니다.

![](/_img/v8-release-59/angrybots.png)

## V8 API

[API 변경 요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인해 주세요. 이 문서는 각 주요 릴리스 후 몇 주 후에 정기적으로 업데이트됩니다.

[활성 V8 체크아웃](/docs/source-code#using-git)을 보유한 개발자는 `git checkout -b 5.9 -t branch-heads/5.9`를 사용하여 V8 5.9의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome's Beta 채널에 가입](https://www.google.com/chrome/browser/beta.html)하여 새 기능을 곧 직접 체험할 수 있습니다.
