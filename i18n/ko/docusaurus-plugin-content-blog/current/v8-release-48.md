---
title: "V8 릴리즈 v4.8"
author: "V8 팀"
date: 2015-11-25 13:33:37
tags:
  - 릴리즈
description: "V8 v4.8은 여러 새로운 ES2015 언어 기능을 지원합니다."
---
대략 6주마다, 우리는 V8의 [릴리즈 프로세스](/docs/release-process)의 일환으로 새로운 브랜치를 만듭니다. 각 버전은 크롬 베타 마일스톤을 위해 크롬이 브랜치되기 직전에 V8의 Git 마스터에서 브랜치됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 4.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.8)을 발표하게 되어 기쁩니다. 이 버전은 Chrome 48 안정 버전과 협조하여 출시되기 전까지 베타 상태에 있을 것입니다. V8 4.8은 개발자들이 사용할 수 있는 여러 가지 기능을 포함하고 있으므로, 몇 주 후 출시를 앞두고 몇 가지 주요 사항을 미리 보여드리고자 합니다.

<!--truncate-->
## 개선된 ECMAScript 2015 (ES6) 지원

이번 V8 릴리즈는 ES2015 사양에서 정의된 [잘 알려진 심볼](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols)을 지원합니다. 이는 개발자들이 이전에는 숨겨져 있던 낮은 레벨의 언어 구조를 활용할 수 있게 합니다.

### `@@isConcatSpreadable`

`true`일 경우 `Array.prototype.concat`에 의해 객체가 배열 요소로 평탄화되어야 함을 나타내는 부울 값 속성의 이름입니다.

```js
(function() {
  'use strict';
  class AutomaticallySpreadingArray extends Array {
    get [Symbol.isConcatSpreadable]() {
      return true;
    }
  }
  const first = [1];
  const second = new AutomaticallySpreadingArray();
  second[0] = 2;
  second[1] = 3;
  const all = first.concat(second);
  // [1, 2, 3] 출력
  console.log(all);
}());
```

### `@@toPrimitive`

값을 기본형으로 암묵적으로 변환하기 위해 객체에서 호출할 메서드의 이름입니다.

```js
(function(){
  'use strict';
  class V8 {
    [Symbol.toPrimitive](hint) {
      if (hint === 'string') {
        console.log('string');
        return 'V8';
      } else if (hint === 'number') {
        console.log('number');
        return 8;
      } else {
        console.log('default:' + hint);
        return 8;
      }
    }
  }

  const engine = new V8();
  console.log(Number(engine));
  console.log(String(engine));
}());
```

### `ToLength`

ES2015 사양은 배열과 유사한 객체의 길이로 사용하기에 적합한 정수로 인수를 변환하는 추상 연산을 조정합니다. (직접 관찰할 수는 없지만, 이는 음수 길이를 가진 배열과 유사한 객체를 다룰 때 간접적으로 보일 수 있습니다.)

## V8 API

우리의 [API 변경 요약](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)을 확인해 보세요. 이 문서는 주요 릴리즈가 있을 때 몇 주 후에 정기적으로 업데이트됩니다.

[활성 V8 체크아웃](https://v8.dev/docs/source-code#using-git)을 가진 개발자들은 `git checkout -b 4.8 -t branch-heads/4.8`를 사용하여 V8 v4.8의 새로운 기능을 실험해볼 수 있습니다. 또는 [크롬의 베타 채널](https://www.google.com/chrome/browser/beta.html)에 구독하여 기능을 곧 직접 체험할 수 있습니다.
