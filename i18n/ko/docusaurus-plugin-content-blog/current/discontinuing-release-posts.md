---
title: &apos;릴리스 블로그 게시물 중단&apos;
author: &apos;Shu-yu Guo ([@shu_](https://twitter.com/_shu))&apos;
avatars:
 - &apos;shu-yu-guo&apos;
date: 2022-06-17
tags:
 - release
description: &apos;V8는 Chrome 릴리스 일정과 기능 블로그 게시물을 위해 릴리스 블로그 게시물을 중단합니다.&apos;
tweet: &apos;1537857497825824768&apos;
---

역사적으로 V8의 각 새 릴리스 브랜치에 대한 블로그 게시물이 있었습니다. v9.9 이후로 릴리스 블로그 게시물이 없음을 알아차렸을지도 모릅니다. v10.0부터 각 새로운 브랜치에 대한 릴리스 블로그 게시물을 중단합니다. 하지만 걱정하지 마세요, 릴리스 블로그 게시물을 통해 얻을 수 있던 모든 정보는 여전히 제공됩니다! 앞으로 해당 정보를 어디에서 찾을 수 있는지 계속 읽어 보세요.

<!--truncate-->
## 릴리스 일정 및 현재 버전

최신 V8 릴리스를 확인하려고 릴리스 블로그 게시물을 읽고 계셨나요?

V8는 Chrome의 릴리스 일정에 따라 진행됩니다. 가장 최신의 안정된 V8 릴리스를 확인하려면 [Chrome 릴리스 로드맵](https://chromestatus.com/roadmap)을 참조하세요.

매 4주마다, 우리는 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일부로 V8의 새 브랜치를 생성합니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 Git 메인 브랜치에서 분기됩니다. 이러한 브랜치는 베타 버전으로서 [Chrome 릴리스 로드맵](https://chromestatus.com/roadmap)에 따라 릴리스됩니다.

Chrome 버전에 대한 특정 V8 브랜치를 찾으려면:

1. Chrome 버전을 10으로 나누어 V8 버전을 확인하세요. 예를 들어, Chrome 102는 V8 10.2입니다.
1. 버전 번호 X.Y의 브랜치는 다음 형식의 URL에서 찾을 수 있습니다:

```
https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/X.Y
```

예를 들어, 10.2 브랜치는 https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/10.2 에서 찾을 수 있습니다.

버전 번호 및 브랜치에 대한 자세한 내용은 [자세한 기사](https://v8.dev/docs/version-numbers)를 참조하세요.

V8 버전 X.Y의 경우, 활성 V8 체크아웃을 가진 개발자는 `git checkout -b X.Y -t branch-heads/X.Y`를 사용하여 해당 버전의 새로운 기능을 실험할 수 있습니다.

## 새로운 JavaScript 또는 WebAssembly 기능

새로운 JavaScript 또는 WebAssembly 기능이 플래그 뒤에 구현되었거나 기본적으로 활성화되었는지 확인하려고 릴리스 블로그 게시물을 읽고 계셨나요?

각 릴리스의 새로운 기능 및 마일스톤이 나열된 [Chrome 릴리스 로드맵](https://chromestatus.com/roadmap)을 참조하세요.

참고로 [별도의 심층 기능 기사](/features)는 기능이 V8에 구현되기 전이나 후에 게시될 수 있습니다.

## 주목할 만한 성능 향상

주목할 만한 성능 향상을 확인하려고 릴리스 블로그 게시물을 읽고 계셨나요?

앞으로, 우리는 [Sparkplug](https://v8.dev/blog/sparkplug)와 같은 성능 향상에 대해 독립적인 블로그 게시물을 작성할 것입니다.

## API 변경

API 변경에 대해 알아보려고 릴리스 블로그 게시물을 읽고 계셨나요?

이전 버전 A.B와 이후 버전 X.Y 사이에 V8 API를 수정한 커밋 목록을 보려면, 활성 V8 체크아웃에서 `git log branch-heads/A.B..branch-heads/X.Y include/v8\*.h`를 사용하세요.
