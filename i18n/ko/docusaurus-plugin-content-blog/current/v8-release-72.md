---
title: 'V8 릴리스 v7.2'
author: 'Andreas Haas, 트랩 관리자'
avatars:
  - andreas-haas
date: 2018-12-18 11:48:21
tags:
  - release
description: 'V8 v7.2는 고속 JavaScript 파싱, 더 빠른 async-await, ia32에서의 메모리 소비 감소, 공개 클래스 필드 등 다양한 기능을 제공합니다!'
tweet: '1074978755934863361'
---
V8의 [릴리스 프로세스](/docs/release-process)에 따라 우리는 매 6주마다 새로운 브랜치를 생성합니다. V8의 Git 마스터에서 Chrome 베타 마일스톤 직전에 각 버전이 브랜치됩니다. 오늘 우리는 새로운 브랜치인 [V8 버전 7.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.2)를 발표하게 되어 기쁩니다. 이는 몇 주 동안의 Chrome 72 Stable과의 조정된 릴리스까지 베타 상태로 유지됩니다. V8 v7.2는 개발자를 위한 다양한 기능을 제공합니다. 이 포스트에서 주요 하이라이트에 대해 미리 살펴보겠습니다.

<!--truncate-->
## 메모리

[임베디드 빌트인](/blog/embedded-builtins)은 이제 ia32 아키텍처에서 기본적으로 지원되고 활성화됩니다.

## 성능

### JavaScript 파싱

평균적으로 웹 페이지는 시작 시 V8 시간의 9.5%를 JavaScript를 파싱하는 데 사용합니다. 따라서 우리는 V8 v7.2에서 가장 빠른 JavaScript 파서를 제공하는 데 초점을 맞추었습니다. 파싱 속도가 전반적으로 크게 개선되었습니다. v7.0 이후 데스크톱에서 약 30%의 속도 향상이 이루어졌습니다. 아래 그래프는 최근 몇 달 동안 실세계 Facebook 로딩 벤치마크에서 인상적인 개선을 기록한 내용을 보여줍니다.

![V8 parse time on facebook.com (lower is better)](/_img/v8-release-72/facebook-parse-time.png)

우리는 여러 인기 있는 웹사이트에서 최신 v7.2 릴리스와 비교한 개선 사항을 보여주는 그래프도 준비했습니다.

![V8 parse times relative to V8 v7.2 (lower is better)](/_img/v8-release-72/relative-parse-times.svg)

종합적으로 최근 개선 사항은 평균 파싱 비율을 9.5%에서 7.5%로 감소시켜 더 빠른 로드 시간과 더 응답성이 뛰어난 페이지를 제공합니다.

### `async`/`await`

V8 v7.2는 기본적으로 [더 빠른 `async`/`await` 구현](/blog/fast-async#await-under-the-hood)을 제공합니다. 우리는 [스펙 제안](https://github.com/tc39/ecma262/pull/1250)을 제출했으며, 이 변경 사항이 ECMAScript 사양에 공식적으로 병합되기 위해 웹 호환성 데이터를 수집하고 있습니다.

### 전개 요소

V8 v7.2는 배열 리터럴 앞부분에 나타나는 전개 요소의 성능을 크게 개선했습니다. 예를 들어 `[...x]`나 `[...x, 1, 2]` 같은 경우입니다. 개선은 배열, 원시 문자열, 집합, 맵 키, 맵 값 및 — 확장으로 — `Array.from(x)`에도 적용됩니다. 자세한 내용은 [전개 요소의 속도 향상에 관한 심층 기사](/blog/spread-elements)를 참조하세요.

### WebAssembly

우리는 많은 WebAssembly 벤치마크를 분석하고 이를 사용하여 최상위 실행 계층에서 코드 생성 개선을 이끌었습니다. 특히, V8 v7.2는 최적화 컴파일러의 스케줄러에서 노드 분할과 백엔드에서의 루프 회전을 가능하게 했습니다. 또한 래퍼 캐싱을 개선하고 가져온 JavaScript 수학 함수를 호출할 때 오버헤드를 줄여주는 맞춤 래퍼를 도입했습니다. 추가로, 많은 코드 패턴의 성능을 개선하는 레지스터 할당기 변경 사항도 설계했으며 이는 이후 버전에 적용될 예정입니다.

### 트랩 핸들러

트랩 핸들러는 WebAssembly 코드의 일반적인 처리량을 개선하고 있습니다. Windows, macOS 및 Linux에서 V8 v7.2에 구현되고 제공됩니다. Chromium에서는 Linux에서 활성화됩니다. Windows와 macOS에서도 안정성 확인 후 이를 따르게 됩니다. 우리는 현재 Android에서도 사용할 수 있도록 작업 중입니다.

## 비동기 스택 트레이스

[이전에 언급했듯이](/blog/fast-async#improved-developer-experience), 우리는 `error.stack` 속성을 비동기 호출 프레임으로 풍부하게 하는 [제로-코스트 비동기 스택 트레이스](https://bit.ly/v8-zero-cost-async-stack-traces)라는 새로운 기능을 추가했습니다. 이는 현재 `--async-stack-traces` 명령줄 플래그 뒤에서 사용할 수 있습니다.

## JavaScript 언어 기능

### 공개 클래스 필드

V8 v7.2는 [공개 클래스 필드](/features/class-fields)를 지원합니다. 기존 방식 대신:

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log('Meow!');
  }
}
```

이렇게 작성할 수 있습니다:

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log('Meow!');
  }
}
```

[비공개 클래스 필드](/features/class-fields#private-class-fields)에 대한 지원은 향후 V8 릴리스에서 계획되어 있습니다.

### `Intl.ListFormat`

V8 v7.2는 [`Intl.ListFormat` 제안](/features/intl-listformat)을 지원하여 목록의 지역화된 포맷을 가능하게 합니다.

```js
const lf = new Intl.ListFormat('en');
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank and Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine, and Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora, and Harrison'
```

자세한 정보와 사용 예시는 [`Intl.ListFormat` 설명서](/features/intl-listformat)을 참조하세요.

### 올바른 형태의 `JSON.stringify`

`JSON.stringify`는 이제 고립된 서러게이트에 대한 이스케이프 시퀀스를 출력하여, 출력 결과가 유효한 유니코드(UTF-8로 표현 가능)가 되도록 합니다:

```js
// 이전 동작:
JSON.stringify('\uD800');
// → '"�"'

// 새로운 동작:
JSON.stringify('\uD800');
// → '"\\ud800"'
```

자세한 내용은 [올바른 형태의 `JSON.stringify` 설명서](/features/well-formed-json-stringify)을 참조하세요.

### 모듈 네임스페이스 내보내기

[JavaScript 모듈](/features/modules)에서는 다음 구문을 사용하는 것이 가능했습니다:

```js
import * as utils from './utils.mjs';
```

그러나 대칭적인 `export` 구문은 존재하지 않았습니다… [지금까지는](/features/module-namespace-exports):

```js
export * as utils from './utils.mjs';
```

이는 다음과 동등합니다:

```js
import * as utils from './utils.mjs';
export { utils };
```

## V8 API

`git log branch-heads/7.1..branch-heads/7.2 include/v8.h`를 사용하여 API 변경 사항 목록을 확인할 수 있습니다.

[활동적인 V8 체크아웃](/docs/source-code#using-git)을 보유한 개발자는 `git checkout -b 7.2 -t branch-heads/7.2`를 사용하여 V8 v7.2의 새로운 기능을 실험할 수 있습니다. 또는 [Chrome의 베타 채널에 가입](https://www.google.com/chrome/browser/beta.html)하여 곧 새 기능을 직접 시도해 볼 수 있습니다.
