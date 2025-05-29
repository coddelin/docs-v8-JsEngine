---
title: "V8 릴리스 v9.7"
author: "잉그바르 스테파냔 ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-11-05
tags: 
 - 릴리스
description: "V8 릴리스 v9.7에서는 배열에서 역방향으로 검색할 수 있는 새로운 JavaScript 메소드를 제공합니다."
tweet: ""
---
매 4주마다, 우리는 우리의 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일부로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome Beta 마일스톤 직전에 V8의 Git 메인에서 분기됩니다. 오늘 우리는 새로운 브랜치인 [V8 버전 9.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.7)을 발표하게 되어 기쁩니다. 이는 몇 주 후 Chrome 97 Stable과 함께 릴리스될 때까지 베타 상태에 있습니다. V8 v9.7은 개발자들을 위한 다양한 풍부한 콘텐츠로 가득 차 있습니다. 이 글은 릴리스 이전에 일부 주요 내용을 미리 보여줍니다.

<!--truncate-->
## JavaScript

### `findLast` 및 `findLastIndex` 배열 메소드

`Array` 및 `TypedArray`의 `findLast`와 `findLastIndex` 메소드는 배열의 끝에서부터 조건에 맞는 요소를 찾습니다.

예를 들어:

```js
[1,2,3,4].findLast((el) => el % 2 === 0)
// → 4 (마지막 짝수 요소)
```

이 메소드는 v9.7부터 플래그 없이 사용할 수 있습니다.

자세한 내용은 [기능 설명서](https://v8.dev/features/finding-in-arrays#finding-elements-from-the-end)를 참조하세요.

## V8 API

`git log branch-heads/9.6..branch-heads/9.7 include/v8\*.h` 명령을 사용하여 API 변경 사항 목록을 확인하세요.

활성 V8 체크아웃을 가진 개발자는 `git checkout -b 9.7 -t branch-heads/9.7` 명령을 사용하여 V8 v9.7의 새로운 기능들을 실험할 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)을 구독하여 새로운 기능들을 곧 직접 시도해볼 수 있습니다.
