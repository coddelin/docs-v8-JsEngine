---
title: 'V8 릴리즈 v5.8'
author: 'V8 팀'
date: 2017-03-20 13:33:37
tags:
  - release
description: 'V8 v5.8은 임의의 힙 크기 사용을 가능하게 하며 시작 성능을 향상시킵니다.'
---
매 6주마다 V8의 새로운 브랜치를 우리의 [릴리즈 프로세스](/docs/release-process)의 일환으로 만듭니다. 각 버전은 V8의 Git 마스터에서 바로 Chrome 베타 마일스톤 직전에 분기됩니다. 오늘 우리는 우리의 최신 브랜치 [V8 버전 5.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.8)을 발표하게 되어 기쁩니다. 이 브랜치는 몇 주 후에 Chrome 58 Stable과의 협력으로 릴리즈되기 전까지 베타 단계에 있을 예정입니다. V8 5.8은 개발자를 위한 다양한 유용한 기능들로 가득합니다. 릴리즈를 앞두고 주요 내용을 미리 살펴보도록 하겠습니다.

<!--truncate-->
## 임의의 힙 크기

역사적으로 V8 힙 제한은 편리하게도 약간의 여유를 두고 32비트 정수 범위에 맞추어 설정되었습니다. 시간이 지나면서 이러한 편리함은 V8에서 서로 다른 비트 폭의 타입을 혼합하는 문제를 초래하여 제한을 증가할 수 없게 만들었습니다. V8 v5.8에서는 임의의 힙 크기의 사용을 가능하게 하였습니다. 더 자세한 내용은 [전용 블로그 게시물](/blog/heap-size-limit)을 참조하세요.

## 시작 성능

V8 v5.8에서는 시작 중 V8에서 소비되는 시간을 점진적으로 줄이는 작업이 계속되었습니다. 코드 컴파일 및 구문 분석에 소비되는 시간을 줄이고 IC 시스템의 최적화를 통해 우리의 [실제 시작 작업 부하](/blog/real-world-performance)에서 약 5%의 개선을 이루었습니다.

## V8 API

[API 변경사항 요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인해 보세요. 이 문서는 각 주요 릴리즈 후 몇 주 후에 정기적으로 업데이트됩니다.

[활성 V8 체크아웃](/docs/source-code#using-git)을 가진 개발자는 `git checkout -b 5.8 -t branch-heads/5.8`를 사용하여 V8 5.8의 새로운 기능을 시험해 볼 수 있습니다. 아니면 [Chrome 베타 채널](https://www.google.com/chrome/browser/beta.html)에 가입하여 곧 새로운 기능을 직접 시험해 보세요.
