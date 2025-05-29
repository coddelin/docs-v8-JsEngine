---
title: &apos;V8 릴리즈 v5.2&apos;
author: &apos;V8 팀&apos;
date: 2016-06-04 13:33:37
tags:
  - 릴리즈
description: &apos;V8 v5.2에는 ES2016 언어 기능 지원이 포함되어 있습니다.&apos;
---
약 6주마다 [릴리즈 프로세스](/docs/release-process)의 일환으로 V8의 새 브랜치를 생성합니다. 각 버전은 Chrome이 Chrome Beta 마일스톤을 위한 브랜치를 분기하기 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 5.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.2)를 발표하게 되어 기쁩니다. 이 브랜치는 Chrome 52 안정 버전과 협력하여 릴리즈될 때까지 베타 상태에 있을 것입니다. V8 5.2는 개발자에게 유용한 다양한 기능으로 가득 차 있으므로 몇 주 후에 릴리즈를 기대하며 몇 가지 주요 내용을 미리 소개해 드리고자 합니다.

<!--truncate-->
## ES2015 및 ES2016 지원

V8 v5.2에는 ES2015(일명 ES6)와 ES2016(일명 ES7)에 대한 지원이 포함되어 있습니다.

### 제곱 연산자

이번 릴리즈에는 `Math.pow`를 대체할 수 있는 접두 표기법인 ES2016 제곱 연산자 지원이 포함되어 있습니다.

```js
let n = 3**3; // n == 27
n **= 2; // n == 729
```

### 사양의 발전

변화하는 사양 지원과 웹 호환성 버그 및 꼬리 호출에 대한 지속적인 표준 논의의 복잡성에 대한 자세한 내용은 V8 블로그 게시물 [ES2015, ES2016, 그리고 그 너머](/blog/modern-javascript)를 참조하세요.

## 성능

V8 v5.2는 자바스크립트 기본 제공 기능 성능을 개선하기 위한 추가 최적화를 포함합니다. 여기에는 isArray 메서드, in 연산자, Function.prototype.bind와 같은 배열 작업 개선이 포함됩니다. 이는 인기 있는 웹 페이지에서 런타임 호출 통계에 대한 새로운 분석에 기반한 기본 제공 기능을 가속화하기 위한 지속적인 작업의 일환입니다. 자세한 내용은 [V8 Google I/O 2016 발표](https://www.youtube.com/watch?v=N1swY14jiKc)를 참조하고 실제 웹사이트에서 얻은 성능 최적화에 관한 다가오는 블로그 게시물을 기대해 주세요.

## V8 API

API 변경 사항의 [요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인하세요. 이 문서는 주요 릴리즈 후 몇 주 후에 정기적으로 업데이트됩니다.

[V8 체크아웃을 활성화한](https://v8.dev/docs/source-code#using-git) 개발자는 `git checkout -b 5.2 -t branch-heads/5.2`를 사용하여 V8 v5.2의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)을 구독하여 곧 새로운 기능을 직접 경험할 수 있습니다.
