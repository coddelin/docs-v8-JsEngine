---
title: "옵셔널 체이닝"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), 옵셔널 체인의 브레이커"
avatars: 
  - "maya-armyanova"
date: 2019-08-27
tags: 
  - ECMAScript
  - ES2020
description: "옵셔널 체이닝은 읽기 쉽고 간결한 표현으로 빌트인 널리쉬(nullish) 체크를 포함한 속성 접근을 가능하게 합니다."
tweet: "1166360971914481669"
---
JavaScript에서 긴 속성 접근 체인은 오류를 일으키기 쉽습니다. 이 중 하나라도 `null` 또는 `undefined`(“nullish” 값으로 알려짐)일 수 있기 때문입니다. 각 단계에서 속성 존재 여부를 확인하는 것은 쉽게 깊이 중첩된 `if`-문 구조 또는 속성 접근 체인을 복제하는 긴 `if`-조건으로 바뀔 수 있습니다:

<!--truncate-->
```js
// 오류 발생 가능 - 예외를 발생시킬 수 있음.
const nameLength = db.user.name.length;

// 덜 오류 발생 가능하지만 가독성이 떨어짐.
let nameLength;
if (db && db.user && db.user.name)
  nameLength = db.user.name.length;
```

위 코드는 삼항 연산자를 사용하여도 가독성에 크게 도움이 되지 않습니다:

```js
const nameLength =
  (db
    ? (db.user
      ? (db.user.name
        ? db.user.name.length
        : undefined)
      : undefined)
    : undefined);
```

## 옵셔널 체이닝 연산자 소개

분명 이런 코드를 작성하고 싶지 않을 것입니다. 그래서 다른 대안을 사용하는 것이 바람직합니다. 일부 언어는 이 문제를 해결하기 위해 “옵셔널 체이닝”이라는 기능을 제공합니다. 최근의 [스펙 제안](https://github.com/tc39/proposal-optional-chaining)에 따르면, “옵셔널 체인은 하나 이상의 속성 접근 및 함수 호출로 이루어진 체인으로, 첫 번째는 `?.` 토큰으로 시작합니다.”

새로운 옵셔널 체이닝 연산자를 사용하면 위의 예제를 다음과 같이 다시 쓸 수 있습니다:

```js
// 여전히 오류를 검사하지만 훨씬 더 가독성이 좋음.
const nameLength = db?.user?.name?.length;
```

`db`, `user`, 또는 `name`이 `undefined` 또는 `null`이면 어떻게 될까요? 옵셔널 체이닝 연산자를 사용하면 JavaScript는 `nameLength`를 `undefined`로 초기화하며 예외를 던지지 않습니다.

이 동작은 또한 우리가 `if (db && db.user && db.user.name)`로 검사하는 것보다 더 강력합니다. 예를 들어, `name`이 항상 문자열임이 보장된다면, `name?.length`를 `name.length`로 변경할 수 있습니다. 그 경우, `name`이 빈 문자열이라면, 여전히 0 길이를 올바르게 얻을 수 있습니다. 이는 빈 문자열이 falsy 값이기 때문인데, 이는 `if` 문에서 `false`로 작동합니다. 옵셔널 체이닝 연산자는 이와 같은 일반적인 버그 소스를 해결합니다.

## 추가 문법 형식: 호출과 동적 속성

옵셔널 메서드 호출을 위한 연산자 버전도 있습니다:

```js
// 관리자 사용자만을 위한 선택적 메서드를 인터페이스에 확장
const adminOption = db?.user?.validateAdminAndGetPrefs?.().option;
```

이 문법은 약간 예상치 못한 느낌을 줄 수 있는데, `?.()`가 실제 연산자이며 이는 _그 앞의_ 표현식에 적용됩니다.

연산자의 세 번째 사용법은 바로 동적 속성 접근으로, 이는 `?.[]`를 통해 이루어집니다. 이는 괄호 안의 인수로 참조된 값을 반환하거나 값을 얻을 객체가 없는 경우 `undefined`를 반환합니다. 다음은 위에서의 예제를 따른 가능한 사용 사례입니다:

```js
// 정적 속성 접근의 성능을
// 동적으로 생성된 속성 이름으로 확장
const optionName = 'optional setting';
const optionLength = db?.user?.preferences?.[optionName].length;
```

이 마지막 형태는 배열을 선택적으로 인덱싱하는 것도 가능합니다. 예:

```js
// `usersArray`가 `null` 또는 `undefined`라면,
// `userName`은 우아하게 `undefined`로 평가됩니다.
const userIndex = 42;
const userName = usersArray?.[userIndex].name;
```

옵셔널 체이닝 연산자는 [널리쉬 병합 `??` 연산자](/features/nullish-coalescing)와 결합하여 `undefined`가 아닌 기본값이 필요할 때 사용할 수 있습니다. 이는 깊은 속성 접근을 안전하게 지정된 기본값으로 수행할 수 있게 하며, 이전에는 [lodash의 `_.get`](https://lodash.dev/docs/4.17.15#get) 같은 사용자 라이브러리가 필요했던 일반적인 사용 사례를 해결합니다:

```js
const object = { id: 123, names: { first: 'Alice', last: 'Smith' }};

{ // lodash 사용:
  const firstName = _.get(object, 'names.first');
  // → 'Alice'

  const middleName = _.get(object, 'names.middle', '(no middle name)');
  // → '(no middle name)'
}

{ // 옵셔널 체이닝 및 널리쉬 병합 사용:
  const firstName = object?.names?.first ?? '(no first name)';
  // → 'Alice'

  const middleName = object?.names?.middle ?? '(no middle name)';
  // → '(no middle name)'
}
```

## 옵셔널 체이닝 연산자의 속성

옵셔널 체이닝 연산자는 _단락 평가(short-circuiting)_, _중첩(stacking)_, _옵셔널 삭제(optional deletion)_라는 몇 가지 흥미로운 속성을 가지고 있습니다. 각 속성을 예제와 함께 살펴보겠습니다.

_단락 평가_란 옵셔널 체이닝 연산자가 조기에 반환하면 나머지 표현식을 평가하지 않는 것을 의미합니다:

```js
// `age`는 `db`와 `user`가 정의된 경우에만 증가합니다.
db?.user?.grow(++age);
```

_스태킹_은 여러 개의 옵셔널 체이닝 연산자를 속성 접근 시퀀스에 적용할 수 있다는 것을 의미합니다:

```js
// 옵셔널 체인은 다른 옵셔널 체인에 뒤따라 올 수 있습니다.
const firstNameLength = db.users?.[42]?.names.first.length;
```

그러나 단일 체인에서 여러 개의 옵셔널 체이닝 연산자를 사용하는 것은 신중해야 합니다. 값이 nullish가 아니라는 것이 보장되는 경우 해당 값에 `?.`로 속성을 접근하는 것은 권장되지 않습니다. 위의 예에서 `db`는 항상 정의되는 것으로 간주되지만 `db.users`와 `db.users[42]`는 정의되지 않을 수 있습니다. 데이터베이스에 해당 사용자가 있는 경우 `names.first.length`는 항상 정의되는 것으로 간주됩니다.

_옵셔널 삭제_는 `delete` 연산자가 옵셔널 체인과 결합될 수 있음을 의미합니다:

```js
// `db.user`는 `db`가 정의된 경우에만 삭제됩니다.
delete db?.user;
```

자세한 내용은 [제안의 _Semantics_ 섹션](https://github.com/tc39/proposal-optional-chaining#semantics)에서 확인할 수 있습니다.

## 옵셔널 체이닝 지원

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9553"
                 firefox="74 https://bugzilla.mozilla.org/show_bug.cgi?id=1566143"
                 safari="13.1 https://bugs.webkit.org/show_bug.cgi?id=200199"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining"></feature-support>
