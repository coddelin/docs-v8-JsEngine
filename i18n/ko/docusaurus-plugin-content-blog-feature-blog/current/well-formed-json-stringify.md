---
title: "잘 구성된 `JSON.stringify`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-09-11
tags:
  - ECMAScript
  - ES2019
description: "JSON.stringify가 이제 고립된 서러게이트를 위한 이스케이프 시퀀스를 출력하여, 출력이 유효한 유니코드(및 UTF-8로 표현 가능)로 만듭니다."
---
`JSON.stringify`는 이전에 입력에 고립된 서러게이트가 포함되어 있으면 잘못된 유니코드 문자열을 반환하도록 지정되었습니다:

```js
JSON.stringify('\uD800');
// → '"�"'
```

[“잘 구성된 `JSON.stringify`” 제안](https://github.com/tc39/proposal-well-formed-stringify)은 `JSON.stringify`의 동작을 변경하여 고립된 서러게이트에 대해 이스케이프 시퀀스를 출력하도록 하고, 결과가 유효한 유니코드(및 UTF-8로 표현 가능)가 되도록 만듭니다:

<!--truncate-->
```js
JSON.stringify('\uD800');
// → '"\\ud800"'
```

참고로, `JSON.parse(stringified)`는 여전히 이전과 동일한 결과를 생성합니다.

이 기능은 JavaScript에서 오래 기다려왔던 작은 수정사항입니다. JavaScript 개발자로서 신경 써야 할 것이 한 가지 줄어든 셈입니다. [_JSON ⊂ ECMAScript_](/features/subsume-json)와 결합하여 JSON-stringified 데이터를 JavaScript 프로그램의 리터럴로 안전하게 포함시킬 수 있게 하고, 생성된 코드를 어떤 유니코드 호환 인코딩(예: UTF-8)으로 디스크에 저장할 수 있게 합니다. 이는 [메타프로그래밍 사용 사례](/features/subsume-json#embedding-json)에 매우 유용합니다.

## 기능 지원

<feature-support chrome="72 /blog/v8-release-72#well-formed-json.stringify"
                 firefox="64"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-json"></feature-support>
