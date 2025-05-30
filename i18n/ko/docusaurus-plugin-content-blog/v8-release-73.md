---
title: "V8 릴리즈 v7.3"
author: "크레멘스 배커스, 컴파일러 관리자"
avatars: 
  - clemens-backes
date: "2019-02-07 11:30:42"
tags: 
  - release
description: "V8 v7.3는 WebAssembly 및 비동기 성능 개선, 비동기 스택 추적, Object.fromEntries, String#matchAll 등을 포함하여 많은 새로운 기능을 제공합니다!"
tweet: "1093457099441561611"
---
매 6주마다 우리는 [릴리즈 프로세스](/docs/release-process)의 일부로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome 베타 마일스톤 직전에 V8의 Git master에서 분기됩니다. 오늘 우리는 최신 브랜치 [V8 버전 7.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.3)을 발표하게 되어 기쁩니다. 이 브랜치는 몇 주 후 Chrome 73 Stable과 함께 릴리즈될 때까지 베타 단계에 있습니다. V8 v7.3는 개발자 중심의 다양한 새로운 기능들로 가득합니다. 이 글에서는 릴리즈를 기대하며 주요 기능 몇 가지를 미리 살펴봅니다.

<!--truncate-->
## 비동기 스택 추적

[`--async-stack-traces` 플래그](/blog/fast-async#improved-developer-experience)를 기본적으로 활성화합니다. [제로-코스트 비동기 스택 추적](https://bit.ly/v8-zero-cost-async-stack-traces)은 비동기 코드로 가득 찬 생산 환경에서 문제를 진단하기 쉽게 만들어 줍니다. 이제 주로 로그 파일/서비스에 전송되는 `error.stack` 속성이 문제를 유발한 원인을 더 자세히 보여줍니다.

## 더 빠른 `await`

위에서 언급한 `--async-stack-traces` 플래그와 관련하여, 우리는 `--harmony-await-optimization` 플래그도 기본적으로 활성화하고 있습니다. 이는 `--async-stack-traces`의 전제조건입니다. [더 빠른 비동기 함수와 프로미스](/blog/fast-async#await-under-the-hood)에 대한 자세한 내용을 참조하세요.

## 더 빠른 Wasm 시작

Liftoff 내부 최적화를 통해 WebAssembly 컴파일 속도를 크게 개선했으며, 생성된 코드 품질에는 영향을 미치지 않았습니다. 대부분의 작업에서는 컴파일 시간이 15–25% 단축되었습니다.

![Liftoff의 [Epic ZenGarden 데모](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)에서의 컴파일 시간](/_img/v8-release-73/liftoff-epic.svg)

## JavaScript 언어 기능

V8 v7.3에는 여러 새로운 JavaScript 언어 기능이 포함되어 있습니다.

### `Object.fromEntries`

`Object.entries` API는 이미 잘 알려져 있습니다:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]
```

하지만, `entries` 결과를 다시 동일한 객체로 변환할 쉬운 방법이 없었습니다... 지금까지는요! V8 v7.3는 [`Object.fromEntries()`](/features/object-fromentries)를 지원하며, 이는 `Object.entries`의 반대 작업을 수행하는 새로운 내장 API입니다:

```js
const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

더 많은 정보와 사용 사례는 [우리의 `Object.fromEntries` 기능 설명서](/features/object-fromentries)를 참조하세요.

### `String.prototype.matchAll`

글로벌(`g`) 또는 고정(`y`) 정규 표현식의 일반적인 사용 사례는 문자열에 적용하고 모든 일치를 반복하는 것입니다. 새로운 `String.prototype.matchAll` API는 캡처 그룹이 있는 정규 표현식의 경우 특히 이 작업을 더 쉽게 만듭니다:

```js
const string = '즐겨찾는 GitHub 저장소: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;

for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} 위치 ${match.index}, '${match.input}'에서 찾음`);
  console.log(`→ 소유자: ${match.groups.owner}`);
  console.log(`→ 저장소: ${match.groups.repo}`);
}

// 출력:
//
// tc39/ecma262 위치 23, '즐겨찾는 GitHub 저장소: tc39/ecma262 v8/v8.dev'에서 찾음
// → 소유자: tc39
// → 저장소: ecma262
// v8/v8.dev 위치 36, '즐겨찾는 GitHub 저장소: tc39/ecma262 v8/v8.dev'에서 찾음
// → 소유자: v8
// → 저장소: v8.dev
```

더 자세한 내용은 [우리의 `String.prototype.matchAll` 설명서](/features/string-matchall)를 읽어보세요.

### `Atomics.notify`

`Atomics.wake`는 최근 [명세 변경](https://github.com/tc39/ecma262/pull/1220)에 따라 `Atomics.notify`로 이름이 변경되었습니다.

## V8 API

`git log branch-heads/7.2..branch-heads/7.3 include/v8.h`를 사용하여 API 변경 사항 목록을 확인하세요.

[활성 V8 체크아웃](/docs/source-code#using-git)을 가지고 있는 개발자는 `git checkout -b 7.3 -t branch-heads/7.3`를 사용하여 V8 v7.3의 새로운 기능을 실험해볼 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)을 구독하여 곧 새 기능을 직접 사용해볼 수도 있습니다.
