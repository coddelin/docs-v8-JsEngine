---
title: "V8 릴리즈 v5.5"
author: "V8 팀"
date: "2016-10-24 13:33:37"
tags: 
  - 릴리즈
description: "V8 v5.5는 메모리 소비 감소와 ECMAScript 언어 기능 지원 증가를 제공합니다."
---
매 6주마다 [릴리즈 프로세스](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome 베타 마일스톤 전 바로 V8의 Git 마스터에서 분기됩니다. 오늘은 새로운 브랜치인 [V8 버전 5.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.5)를 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 Chrome 55 Stable과의 협업을 통해 출시되기 전까지 베타 상태에 있습니다. V8 v5.5에는 개발자에게 유용한 다양한 기능이 포함되어 있으므로, 릴리즈를 기대하며 몇 가지 주요 사항을 미리 살펴보고자 합니다.

<!--truncate-->
## 언어 기능

### 비동기 함수

v5.5에서는 V8이 JavaScript ES2017 [비동기 함수](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions)를 지원합니다. 이는 Promise를 사용하고 생성하는 코드를 더 쉽게 작성할 수 있도록 합니다. 비동기 함수를 사용하면 Promise가 해결되기를 기다리는 것이 단순히 await를 통해 입력하고 값이 동기적으로 제공된 것처럼 진행하는 것만큼 간단합니다 - 콜백이 필요하지 않습니다. 소개를 보려면 [이 글](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions)을 참고하세요.

다음은 URL을 가져와 응답 텍스트를 반환하는 함수로, 일반적인 비동기 방식인 Promise 기반 스타일로 작성된 예제입니다.

```js
function logFetch(url) {
  return fetch(url)
    .then(response => response.text())
    .then(text => {
      console.log(text);
    }).catch(err => {
      console.error('가져오기 실패', err);
    });
}
```

다음은 비동기 함수를 사용하여 콜백을 제거한 동일한 코드입니다.

```js
async function logFetch(url) {
  try {
    const response = await fetch(url);
    console.log(await response.text());
  } catch (err) {
    console.log('가져오기 실패', err);
  }
}
```

## 성능 향상

V8 v5.5는 메모리 사용량 측면에서 여러 중요한 개선 사항을 제공합니다.

### 메모리

메모리 소비는 JavaScript 가상 머신 성능 트레이드오프 공간에서 중요한 요소입니다. 최근 몇 개의 릴리즈에서 V8 팀은 현대 웹 개발 패턴을 대표하는 여러 웹사이트를 분석하고 메모리 사용량을 상당히 줄였습니다. V8 5.5는 V8 힙 크기와 존 메모리 사용량 감소로 인해 **저메모리 장치**에서 Chrome 전체 메모리 소비를 최대 35%까지 줄였습니다(V8 5.3이 포함된 Chrome 53과 비교). 다른 장치 부문도 존 메모리 감소의 혜택을 누릴 수 있습니다. 자세한 내용은 [전용 블로그 글](/blog/optimizing-v8-memory)을 참조하세요.

## V8 API

API 변경사항 [요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인하세요. 이 문서는 주요 릴리즈 이후 몇 주 내에 정기적으로 업데이트됩니다.

### V8 인스펙터 이전

V8 인스펙터가 Chromium에서 V8로 이전되었습니다. 이제 인스펙터 코드는 [V8 저장소](https://chromium.googlesource.com/v8/v8/+/master/src/inspector/)에 완전히 포함되어 있습니다.

앱 [활성 V8 체크아웃](/docs/source-code#using-git)이 있는 개발자는 `git checkout -b 5.5 -t branch-heads/5.5`를 사용하여 V8 5.5의 새로운 기능을 실험해볼 수 있습니다. 또는 [Chrome's Beta 채널](https://www.google.com/chrome/browser/beta.html)을 구독하여 곧 새로운 기능을 직접 사용해보실 수 있습니다.
