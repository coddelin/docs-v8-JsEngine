---
title: "V8 release v9.0"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), 줄바꿈 포함"
avatars: 
 - "ingvar-stepanyan"
date: 2021-03-17
tags: 
 - 릴리스
description: "V8 release v9.0은 정규 표현식 매칭 인덱스와 다양한 성능 개선 사항을 지원합니다."
tweet: "1372227274712494084"
---
매 6주마다 우리는 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새로운 브랜치를 생성합니다. 각 버전은 Chrome Beta 마일스톤 직전 바로 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 최신 브랜치 [V8 버전 9.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.0)을 발표하게 되어 기쁩니다. 이 브랜치는 몇 주 뒤 Chrome 90 Stable과 함께 릴리스될 때까지 베타 상태에 있습니다. V8 v9.0은 개발자에게 유용한 다양한 기능들로 가득 차 있습니다. 이 게시물은 릴리스에 앞서 몇 가지 하이라이트를 미리 보여줍니다.

<!--truncate-->
## 자바스크립트

### 정규 표현식 매칭 인덱스

v9.0부터 개발자는 정규 표현식 매칭에서 캡처 그룹의 시작과 끝 위치의 배열을 선택적으로 얻을 수 있습니다. 이 배열은 `/d` 플래그가 설정된 정규 표현식에서 매칭 객체의 `.indices` 속성을 통해 사용할 수 있습니다.

```javascript
const re = /(a)(b)/d;      // /d 플래그에 주목하세요.
const m = re.exec('ab');
console.log(m.indices[0]); // 인덱스 0은 전체 매칭입니다.
// → [0, 2]
console.log(m.indices[1]); // 인덱스 1은 첫 번째 캡처 그룹입니다.
// → [0, 1]
console.log(m.indices[2]); // 인덱스 2는 두 번째 캡처 그룹입니다.
// → [1, 2]
```

[설명](https://v8.dev/features/regexp-match-indices)을 참조하여 자세히 알아보세요.

### 더 빠른 `super` 속성 접근

`super` 속성(예: `super.x`)에 접근하는 것이 V8의 인라인 캐시 시스템과 TurboFan에서의 최적화된 코드 생성을 사용하여 최적화되었습니다. 이 변경 사항을 통해 `super` 속성 접근이 일반적인 속성 접근과 더욱 비슷해졌음을 아래 그래프에서 확인할 수 있습니다.

![최적화된 super 속성 접근 비교](/_img/fast-super/super-opt.svg)

자세한 내용은 [블로그 게시물](https://v8.dev/blog/fast-super)을 확인하세요.

### `for ( async of` 사용 금지

최근에 [문법 모호성](https://github.com/tc39/ecma262/issues/2034)이 발견되었고 V8 v9.0에서 [수정되었습니다](https://chromium-review.googlesource.com/c/v8/v8/+/2683221).

`for ( async of` 토큰 시퀀스는 이제 더 이상 구문 분석되지 않습니다.

## 웹어셈블리

### 더 빠른 JS-to-Wasm 호출

V8은 WebAssembly와 JavaScript 함수 매개변수에 대해 서로 다른 표현을 사용합니다. 이러한 이유로 JavaScript가 내보내진 WebAssembly 함수를 호출하면 *JS-to-Wasm wrapper*를 거쳐야 하며, 이는 JavaScript와 WebAssembly 간 매개변수와 결과를 변환하는 역할을 합니다.

안타깝게도 이것은 성능 비용을 발생시키며 JavaScript에서 WebAssembly로의 호출이 JavaScript 내부 호출만큼 빠르지 않았습니다. 이러한 오버헤드를 최소화하기 위해 JS-to-Wasm wrapper는 호출 지점에서 인라인 처리할 수 있게 되었으며, 이는 코드를 단순화하고 추가적인 프레임을 제거합니다.

예를 들어 두 실수 값을 더하는 WebAssembly 함수가 있다고 가정합시다:

```cpp
double addNumbers(double x, double y) {
  return x + y;
}
```

그리고 이를 입력 매개변수로 사용하여 JavaScript에서 벡터를 더해본다고 가정하면:

```javascript
const addNumbers = instance.exports.addNumbers;

function vectorSum(len, v1, v2) {
  const result = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = addNumbers(v1[i], v2[i]);
  }
  return result;
}

const N = 100_000_000;
const v1 = new Float64Array(N);
const v2 = new Float64Array(N);
for (let i = 0; i < N; i++) {
  v1[i] = Math.random();
  v2[i] = Math.random();
}

// 웜업.
for (let i = 0; i < 5; i++) {
  vectorSum(N, v1, v2);
}

// 측정.
console.time();
const result = vectorSum(N, v1, v2);
console.timeEnd();
```

이 단순화된 마이크로벤치마크에서 다음과 같은 개선 사항이 나타납니다:

![마이크로벤치마크 비교](/_img/v8-release-90/js-to-wasm.svg)

이 기능은 아직 실험적이며 `--turbo-inline-js-wasm-calls` 플래그를 통해 활성화할 수 있습니다.

자세한 내용은 [디자인 문서](https://docs.google.com/document/d/1mXxYnYN77tK-R1JOVo6tFG3jNpMzfueQN1Zp5h3r9aM/edit)를 참조하세요.

## V8 API

`git log branch-heads/8.9..branch-heads/9.0 include/v8.h`를 사용하여 API 변경 사항 목록을 확인하세요.

활성화된 V8 체크아웃을 가진 개발자는 `git checkout -b 9.0 -t branch-heads/9.0`을 사용하여 V8 v9.0의 새로운 기능을 실험해 볼 수 있습니다. 또는 [Chrome의 Beta 채널](https://www.google.com/chrome/browser/beta.html)에 가입하여 곧 새 기능을 직접 경험해보실 수 있습니다.
