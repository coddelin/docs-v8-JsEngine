---
title: "V8 릴리즈 v8.1"
author: "Dominik Inführ, 신비로운 국제화의 주인공"
avatars: 
  - "dominik-infuehr"
date: 2020-02-25
tags: 
  - 릴리즈
description: "V8 v8.1은 새로운 Intl.DisplayNames API를 통해 개선된 국제화 지원을 제공합니다."
---

매 6주마다, 우리는 [릴리즈 프로세스](https://v8.dev/docs/release-process)의 일부로 V8의 새로운 브랜치를 생성합니다. 각 버전은 Chrome Beta 마일스톤 직전에 V8의 Git master에서 브랜치됩니다. 오늘 우리는 새로운 브랜치인 [V8 버전 8.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.1)을 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 Chrome 81 Stable과 함께 릴리즈될 때까지 베타 상태에 있습니다. V8 v8.1은 다양한 개발자 중심 기능을 포함하고 있습니다. 이 게시물은 릴리즈를 기대하며 주요 사항에 대한 미리보기를 제공합니다.

<!--truncate-->
## 자바스크립트

### `Intl.DisplayNames`

새로운 `Intl.DisplayNames` API를 사용하면 프로그래머가 언어, 지역, 스크립트 및 통화 이름을 번역하여 쉽게 표시할 수 있습니다.

```js
const zhLanguageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
const enRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const itScriptNames = new Intl.DisplayNames(['it'], { type: 'script' });
const deCurrencyNames = new Intl.DisplayNames(['de'], {type: 'currency'});

zhLanguageNames.of('fr');
// → '法文'
enRegionNames.of('US');
// → 'United States'
itScriptNames.of('Latn');
// → 'latino'
deCurrencyNames.of('JPY');
// → 'Japanischer Yen'
```

오늘부터 번역 데이터 유지 관리 부담을 런타임으로 옮기세요! 전체 API와 더 많은 예제에 대한 세부 정보는 [기능 설명서](https://v8.dev/features/intl-displaynames)를 확인하세요.

## V8 API

API 변경 사항 목록을 확인하려면 `git log branch-heads/8.0..branch-heads/8.1 include/v8.h`를 사용하세요.

[활성화된 V8 체크아웃](/docs/source-code#using-git)을 가진 개발자는 `git checkout -b 8.1 -t branch-heads/8.1`를 사용하여 V8 v8.1의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 Beta 채널](https://www.google.com/chrome/browser/beta.html)에 가입하여 직접 새로운 기능을 곧 사용해볼 수 있습니다.
