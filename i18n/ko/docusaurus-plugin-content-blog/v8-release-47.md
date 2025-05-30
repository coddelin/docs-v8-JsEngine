---
title: "V8 릴리스 v4.7"
author: "V8 팀"
date: "2015-10-14 13:33:37"
tags: 
  - 릴리스
description: "V8 v4.7은 메모리 소모 감소와 새로운 ES2015 언어 기능 지원을 제공합니다."
---
약 6주마다 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새로운 브랜치를 생성합니다. 각 버전은 Chrome의 Chrome Beta 마일스톤 브랜치가 이루어지기 직전에 V8의 Git 마스터에서 분기됩니다. 오늘 우리는 최신 브랜치를 발표하게 되어 기쁩니다. [V8 버전 4.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.7)은 Chrome 47 안정 버전과 조정하여 출시될 때까지 베타 단계에 있을 것입니다. V8 v4.7은 개발자 중심의 다양한 기능으로 가득 차 있으며, 몇 주 후에 있을 릴리스를 기대하며 주요 내용의 미리보기를 제공하고자 합니다.

<!--truncate-->
## 개선된 ECMAScript 2015 (ES6) 지원

### Rest 연산자

[Rest 연산자](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/rest_parameters)는 개발자가 함수에 무한 개의 인수를 전달할 수 있도록 합니다. 이는 `arguments` 객체와 유사합니다.

```js
// Rest 연산자 없이
function concat() {
  var args = Array.prototype.slice.call(arguments, 1);
  return args.join('');
}

// Rest 연산자를 사용하여
function concatWithRest(...strings) {
  return strings.join('');
}
```

## 다가오는 ES 기능 지원

### `Array.prototype.includes`

[`Array.prototype.includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes)는 ES2016에 포함되기 위한 현재 3단계 제안으로 새로운 기능입니다. 이 기능은 주어진 배열 안에 요소가 있는지 여부를 결정하기 위한 간결한 구문을 제공하며, 불리언 값을 반환합니다.

```js
[1, 2, 3].includes(3); // true
['apple', 'banana', 'cherry'].includes('apple'); // true
['apple', 'banana', 'cherry'].includes('peach'); // false
```

## 구문 분석 시 메모리 압박 완화

[V8 파서의 최근 변경 사항](https://code.google.com/p/v8/issues/detail?id=4392)은 큰 중첩 함수가 있는 파일을 구문 분석할 때 소모되는 메모리를 크게 줄였습니다. 특히, 이를 통해 V8은 이전보다 더 큰 asm.js 모듈을 실행할 수 있게 되었습니다.

## V8 API

[API 변경 사항 요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인해 보십시오. 이 문서는 주요 릴리스 후 몇 주마다 정기적으로 업데이트됩니다. [활성화된 V8 체크아웃](https://v8.dev/docs/source-code#using-git)을 가지고 있는 개발자는 `git checkout -b 4.7 -t branch-heads/4.7` 명령어를 사용하여 V8 v4.7의 새로운 기능을 실험해 볼 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)에 가입하여 곧 새로운 기능을 직접 시도해 볼 수 있습니다.
