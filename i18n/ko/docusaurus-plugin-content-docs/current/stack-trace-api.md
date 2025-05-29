---
title: "스택 추적 API"
description: "이 문서는 V8의 JavaScript 스택 추적 API에 대해 설명합니다."
---
V8에서 생성된 모든 내부 오류는 생성 시 스택 추적을 캡처합니다. 이 스택 추적은 JavaScript에서 비표준 `error.stack` 속성을 통해 접근할 수 있습니다. V8은 스택 추적을 수집하고 형식화하는 방법을 제어하기 위한 다양한 훅 및 사용자 정의 오류가 스택 추적을 수집할 수 있도록 허용하는 기능을 가지고 있습니다. 이 문서는 V8의 JavaScript 스택 추적 API를 설명합니다.

## 기본 스택 추적

기본적으로 V8에서 던져지는 거의 모든 오류는 문자열로 형식화된 최상위 10개의 스택 프레임을 포함하는 `stack` 속성을 가지고 있습니다. 아래는 완전히 형식화된 스택 추적의 예입니다:

```
ReferenceError: FAIL is not defined
   at Constraint.execute (deltablue.js:525:2)
   at Constraint.recalculate (deltablue.js:424:21)
   at Planner.addPropagate (deltablue.js:701:6)
   at Constraint.satisfy (deltablue.js:184:15)
   at Planner.incrementalAdd (deltablue.js:591:21)
   at Constraint.addConstraint (deltablue.js:162:10)
   at Constraint.BinaryConstraint (deltablue.js:346:7)
   at Constraint.EqualityConstraint (deltablue.js:515:38)
   at chainTest (deltablue.js:807:6)
   at deltaBlue (deltablue.js:879:2)
```

오류가 생성될 때 스택 추적이 수집되며 오류가 던져진 위치나 횟수에 상관없이 동일합니다. 일반적으로 10개의 프레임만 수집되는데, 이는 충분히 유용하면서도 성능에 악영향을 미치지 않는 수입니다. 수집되는 스택 프레임의 개수를 제어하려면 변수를 설정하십시오:

```js
Error.stackTraceLimit
```

`0`으로 설정하면 스택 추적 수집이 비활성화됩니다. 수집할 프레임 수의 최대값으로 사용할 수 있는 값은 유한한 정수 값입니다. `Infinity`로 설정하면 모든 프레임이 수집됩니다. 이 변수는 현재 컨텍스트에만 영향을 미치며, 다른 값을 필요로 하는 각 컨텍스트마다 명시적으로 설정해야 합니다. (V8 용어의 “컨텍스트”는 Google Chrome의 페이지 또는 `<iframe>`과 동일합니다). 모든 컨텍스트에 영향을 미치는 기본값을 설정하려면 다음 V8 명령줄 플래그를 사용하십시오:

```bash
--stack-trace-limit <value>
```

Google Chrome을 실행할 때 이 플래그를 V8에 전달하려면 다음을 사용하십시오:

```bash
--js-flags='--stack-trace-limit <value>'
```

## 비동기 스택 추적

`--async-stack-traces` 플래그는 ([V8 v7.3](https://v8.dev/blog/v8-release-73#async-stack-traces)부터 기본적으로 활성화됨) 새로운 [제로 비용 비동기 스택 추적](https://bit.ly/v8-zero-cost-async-stack-traces)을 가능하게 하며, `Error` 인스턴스의 `stack` 속성을 비동기 스택 프레임, 즉 코드의 `await` 위치를 포함하도록 확장합니다. 이러한 비동기 프레임은 `stack` 문자열에서 `async`로 표시됩니다:

```
ReferenceError: FAIL is not defined
    at bar (<anonymous>)
    at async foo (<anonymous>)
```

이 문서를 작성하는 시점에서 이 기능은 `await` 위치, `Promise.all()`, `Promise.any()`로 제한됩니다. 이러한 경우 엔진이 추가적인 오버헤드 없이 필요한 정보를 재구성할 수 있기 때문에 이 기능은 제로 비용입니다.

## 사용자 정의 예외에 대한 스택 추적 수집

내장 오류에 사용되는 스택 추적 메커니즘은 사용자 스크립트에서도 사용할 수 있는 일반적인 스택 추적 수집 API를 사용하여 구현됩니다. 다음 함수:

```js
Error.captureStackTrace(error, constructorOpt)
```

주어진 `error` 객체에 `captureStackTrace` 호출 시점의 스택 추적을 제공하는 `stack` 속성을 추가합니다. `Error.captureStackTrace`를 통해 수집된 스택 추적은 즉시 수집, 형식화되어 주어진 `error` 객체에 첨부됩니다.

선택적 `constructorOpt` 매개변수를 사용하면 함수 값을 전달할 수 있습니다. 스택 추적을 수집할 때 이 함수에 대한 최상위 호출부터 위의 모든 프레임(이 호출 포함)이 스택 추적에서 제외됩니다. 이는 사용자에게 유용하지 않은 구현 세부정보를 숨기는 데 유용할 수 있습니다. 스택 추적을 캡처하는 사용자 정의 오류를 정의하는 일반적인 방법은 다음과 같습니다:

```js
function MyError() {
  Error.captureStackTrace(this, MyError);
  // 추가 초기화 코드는 여기에 작성합니다.
}
```

두 번째 인수로 MyError를 전달하면 스택 추적에서 MyError에 대한 생성자 호출이 나타나지 않습니다.

## 스택 추적 커스터마이징

Java의 경우 예외의 스택 추적은 스택 상태를 검사할 수 있는 구조화된 값이지만, V8에서의 스택 속성은 형식화된 스택 추적을 포함하는 단순 문자열 형태로 저장됩니다. 이는 다른 브라우저와의 호환성을 유지하기 위한 것 외에는 특별한 이유가 없습니다. 그러나 이는 하드코딩된 것이 아니라 기본 동작이며 사용자 스크립트에서 재정의할 수 있습니다.

효율성을 위해 스택 추적은 캡처 시 형식화되지 않으며, 첫 번째로 스택 속성이 접근될 때(요청 시) 형식화됩니다. 스택 추적은 다음 호출을 통해 형식화됩니다:

```js
Error.prepareStackTrace(error, structuredStackTrace)
```

그리고 이 호출이 반환하는 값을 `stack` 속성의 값으로 사용합니다. 다른 함수 값을 `Error.prepareStackTrace`에 할당하면 해당 함수는 스택 트레이스를 포맷하는 데 사용됩니다. 이는 스택 트레이스를 준비 중인 오류 객체와 스택의 구조화된 표현을 전달받습니다. 사용자 정의 스택 트레이스 포맷터는 스택 트레이스를 원하는 대로 포맷할 수 있으며 문자열이 아닌 값을 반환할 수도 있습니다. `prepareStackTrace` 호출이 완료된 후에도 구조화된 스택 트레이스 객체에 대한 참조를 유지하는 것은 안전하며 이는 유효한 반환 값이 될 수 있습니다. 그러나 사용자 정의 `prepareStackTrace` 함수는 `Error` 객체의 스택 속성이 액세스된 경우에만 호출된다는 점을 유의하십시오.

구조화된 스택 트레이스는 각각이 스택 프레임을 나타내는 `CallSite` 객체 배열입니다. `CallSite` 객체는 다음 메서드를 정의합니다

- `getThis`: `this` 값을 반환
- `getTypeName`: 문자열로서 `this`의 타입을 반환. 이는 사용 가능한 경우 `this`의 생성자 필드에 저장된 함수의 이름이며, 그렇지 않으면 객체의 `[[Class]]` 내부 속성입니다.
- `getFunction`: 현재 함수를 반환
- `getFunctionName`: 현재 함수의 이름(보통은 `name` 속성)을 반환. 만약 `name` 속성이 없으면 함수의 컨텍스트로부터 이름을 추정하려고 시도합니다.
- `getMethodName`: 현재 함수를 포함하고 있는 `this` 또는 해당 프로토타입의 속성 이름을 반환
- `getFileName`: 현재 함수가 스크립트에서 정의된 경우 스크립트 이름을 반환
- `getLineNumber`: 현재 함수가 스크립트에서 정의된 경우 현재 줄 번호를 반환
- `getColumnNumber`: 현재 함수가 스크립트에서 정의된 경우 현재 열 번호를 반환
- `getEvalOrigin`: 현재 함수가 `eval` 호출을 사용하여 생성된 경우 `eval`이 호출된 위치를 나타내는 문자열을 반환
- `isToplevel`: 최상위 수준 호출인가요? 즉, 글로벌 객체인가요?
- `isEval`: 이 호출이 `eval` 호출로 정의된 코드에서 발생합니까?
- `isNative`: 이 호출이 네이티브 V8 코드에서 발생합니까?
- `isConstructor`: 생성자 호출입니까?
- `isAsync`: 비동기 호출입니까? (예: `await`, `Promise.all()`, 또는 `Promise.any()`)
- `isPromiseAll`: 비동기 `Promise.all()` 호출입니까?
- `getPromiseIndex`: `Promise.all()` 또는 `Promise.any()`의 비동기 스택 트레이스에서 따랐던 프라미스 요소의 인덱스를 반환하거나, `CallSite`가 비동기 `Promise.all()` 또는 `Promise.any()` 호출이 아닌 경우 `null`을 반환.

기본 스택 트레이스는 CallSite API를 사용하여 생성되므로 이 API를 통해 제공되는 모든 정보도 여기에서 사용할 수 있습니다.

엄격 모드 함수에 부과된 제한을 유지하기 위해, 엄격 모드 함수가 있는 프레임과 아래의 모든 프레임(호출자 등)은 해당 수신 객체와 함수 객체에 액세스할 수 없습니다. 이러한 프레임의 경우 `getFunction()`과 `getThis()`는 `undefined`를 반환합니다.

## 호환성

여기에서 설명하는 API는 V8에만 특정적이며 다른 JavaScript 구현에서는 지원되지 않습니다. 대부분의 구현은 `error.stack` 속성을 제공하지만 스택 트레이스의 형식은 여기에서 설명한 형식과 다를 가능성이 높습니다. 이 API를 사용하는 권장 방법은 다음과 같습니다:

- 코드가 V8에서 실행되고 있다는 것을 알고 있다면, 포맷된 스택 트레이스의 레이아웃에만 의존하십시오.
- 코드가 어떤 구현에서 실행되고 있는지와 상관없이 `Error.stackTraceLimit`과 `Error.prepareStackTrace`를 설정하는 것은 안전하지만, 해당 설정은 코드가 V8에서 실행되는 경우에만 효과를 발휘한다는 점을 알아야 합니다.

## 부록: 스택 트레이스 형식

V8에서 사용되는 기본 스택 트레이스 형식은 각 스택 프레임에 대해 다음 정보를 제공할 수 있습니다:

- 호출이 생성자 호출인지 여부.
- `this` 값의 유형 (`Type`).
- 호출된 함수 이름 (`functionName`).
- `this` 또는 해당 프로토타입 중 하나의 속성 이름 (`methodName`)이 함수를 포함하는지 여부.
- 소스 코드 내 현재 위치 (`location`).

이 정보 중 일부는 사용할 수 없으며, 사용 가능한 정보의 양에 따라 스택 프레임에 대한 다양한 형식이 사용됩니다. 위의 정보를 모두 사용할 수 있다면 포맷된 스택 프레임은 다음과 같습니다:

```
at Type.functionName [as methodName] (location)
```

생성자 호출의 경우:

```
at new functionName (location)
```

비동기 호출의 경우:

```
at async functionName (location)
```

`functionName`과 `methodName` 중 하나만 사용할 수 있거나, 둘 다 사용할 수 있지만 동일한 경우, 형식은 다음과 같습니다:

```
at Type.name (location)
```

둘 다 사용할 수 없는 경우 `<anonymous>`가 이름으로 사용됩니다.

`Type` 값은 `this`의 생성자 필드에 저장된 함수 이름입니다. V8에서는 모든 생성자 호출이 이 속성을 생성자 함수로 설정하므로 개체가 생성된 후 이 필드가 적극적으로 변경되지 않는 한 해당 개체가 생성된 함수 이름을 포함합니다. 사용할 수 없는 경우 객체의 `[[Class]]` 속성이 사용됩니다.

글로벌 객체의 특별한 경우에는 `Type`이 표시되지 않습니다. 이 경우 스택 프레임은 다음과 같이 포맷됩니다:

```
at functionName [as methodName] (location)
```

위치 자체에는 여러 형태가 있습니다. 가장 일반적인 형식은 현재 함수가 정의된 스크립트 내 파일 이름, 줄 번호 및 열 번호입니다:

```
fileName:lineNumber:columnNumber
```

현재 함수가 `eval`을 사용하여 생성된 경우 형식은 다음과 같습니다:

```
eval at position
```

...여기서 `position`은 `eval` 호출이 발생한 전체 위치입니다. 이는 중첩된 `eval` 호출이 있을 경우 위치가 중첩될 수 있음을 의미합니다. 예를 들어:

```
eval at Foo.a (eval at Bar.z (myscript.js:10:3))
```

스택 프레임이 V8의 라이브러리 내에 있는 경우 위치는:

```
native
```

…그리고 사용할 수 없는 경우, 위치는:

```
unknown location
```
