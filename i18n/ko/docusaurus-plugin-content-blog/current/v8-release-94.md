---
title: "V8 릴리스 v9.4"
author: "잉바르 스테파냐안 ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-09-06
tags:
 - release
description: "V8 릴리스 v9.4는 자바스크립트에 클래스 정적 초기화 블록을 도입합니다."
tweet: "1434915404418277381"
---
매 6주마다 우리는 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 새로운 V8 브랜치를 생성합니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 Git 마스터에서 브랜칭됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 9.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4)를 발표하게 되어 기쁩니다. 해당 버전은 몇 주 후 Chrome 94 Stable과 함께 릴리스되기 전까지 베타 상태에 있습니다. V8 v9.4는 개발자를 위한 다양한 기능으로 가득 차 있습니다. 이 글은 릴리스를 기대하며 몇 가지 주요 기능을 미리 살펴봅니다.

<!--truncate-->
## 자바스크립트

### 클래스 정적 초기화 블록

클래스는 클래스 평가 시 한 번 실행되어야 하는 코드를 정적 초기화 블록을 통해 그룹화할 수 있는 기능을 제공합니다.

```javascript
class C {
  // 이 블록은 클래스 자체가 평가될 때 실행됩니다
  static { console.log("C's static block"); }
}
```

v9.4부터 클래스 정적 초기화 블록이 `--harmony-class-static-blocks` 플래그 없이 사용할 수 있게 됩니다. 이러한 블록의 범위에 대한 자세한 의미론은 [설명서](https://v8.dev/features/class-static-initializer-blocks)를 참고하세요.

## V8 API

`git log branch-heads/9.3..branch-heads/9.4 include/v8.h`를 사용하여 API 변경사항 목록을 확인할 수 있습니다.

활성화된 V8 체크아웃을 가진 개발자는 `git checkout -b 9.4 -t branch-heads/9.4`를 사용하여 V8 v9.4의 새로운 기능을 실험해볼 수 있습니다. 또는 [Chrome 베타 채널](https://www.google.com/chrome/browser/beta.html)에 가입하여 곧 새로운 기능을 직접 체험해볼 수도 있습니다.
