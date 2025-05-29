---
title: &apos;V8 릴리스 v6.7&apos;
author: &apos;V8 팀&apos;
date: 2018-05-04 13:33:37
tags:
  - 릴리스
tweet: &apos;992506342391742465&apos;
description: &apos;V8 v6.7은 더 많은 신뢰할 수 없는 코드 완화 조치를 추가하고 BigInt 지원을 제공합니다.&apos;
---
6주마다 우리는 [릴리스 프로세스](/docs/release-process)의 일환으로 새로운 V8 브랜치를 만듭니다. 각 버전은 Chrome Beta 마일스톤 직전에 V8의 Git 마스터에서 브랜치됩니다. 오늘 우리는 [V8 버전 6.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.7)이라는 최신 브랜치를 발표하게 되어 기쁩니다. 이 버전은 몇 주 내에 Chrome 67 Stable과 함께 릴리스될 때까지 베타 상태에 있습니다. V8 v6.7은 개발자들이 흥미로워할 다양한 기능들을 포함하고 있습니다. 이번 글에서는 주요 기능들에 대한 미리보기를 제공합니다.

<!--truncate-->
## JavaScript 언어 기능

V8 v6.7에서는 BigInt 지원이 기본적으로 활성화되어 제공됩니다. BigInt는 JavaScript에서 임의 정밀도의 정수를 표현할 수 있는 새로운 숫자 기본형입니다. JavaScript에서 BigInt를 어떻게 사용할 수 있는지에 대한 자세한 내용은 [BigInt 기능 설명서](/features/bigint)를 읽어보세요. 또한 [V8 구현에 대한 자세한 정보가 포함된 게시물](/blog/bigint)도 확인해보세요.

## 신뢰할 수 없는 코드 완화

V8 v6.7에서는 [사이드 채널 취약점에 대한 더 많은 완화 조치](/docs/untrusted-code-mitigations)가 적용되어 신뢰할 수 없는 JavaScript 및 WebAssembly 코드로 정보가 유출되는 것을 방지합니다.

## V8 API

API 변경사항 목록을 확인하려면 `git log branch-heads/6.6..branch-heads/6.7 include/v8.h`를 사용하세요.

[활성화된 V8 체크아웃](/docs/source-code#using-git)을 가진 개발자는 `git checkout -b 6.7 -t branch-heads/6.7`를 사용하여 V8 v6.7의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널에 가입](https://www.google.com/chrome/browser/beta.html)하여 곧 새로운 기능을 직접 시도해볼 수 있습니다.
