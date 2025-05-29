---
title: "JSON ⊂ ECMAScript 제안"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-08-14
tags:
  - ES2019
description: "JSON이 이제 ECMAScript의 문법적 하위 집합이 되었습니다."
tweet: "1161649929904885762"
---
[_JSON ⊂ ECMAScript_ 제안](https://github.com/tc39/proposal-json-superset)을 통해 JSON은 ECMAScript의 문법적 하위 집합이 되었습니다. 이것이 이미 그렇지 않았다는 사실에 놀란다면, 당신은 혼자가 아닙니다!

## 기존 ES2018 동작

ES2018에서는 ECMA스크립트 문자열 리터럴은 U+2028 LINE SEPARATOR와 U+2029 PARAGRAPH SEPARATOR 문자를 탈출하지 않은 상태로 포함할 수 없었습니다. 왜냐하면 그것들이 이 맥락에서도 줄 종결자로 간주되었기 때문입니다:

```js
// U+2028 문자가 포함된 문자열입니다.
const LS = ' ';
// → ES2018: SyntaxError

// eval로 생성된 U+2029 문자가 포함된 문자열입니다:
const PS = eval('"\u2029"');
// → ES2018: SyntaxError
```

이는 JSON 문자열은 이러한 문자를 포함할 수 있기 때문에 문제가 됩니다. 결과적으로, 유효한 JSON을 ECMAScript 프로그램에 포함할 때 개발자는 이러한 문자를 처리하기 위해 특수한 후처리 로직을 구현해야 했습니다. 이러한 로직 없이는 코드에 미묘한 버그가 생기거나 심지어 [보안 문제](#security)가 발생할 수 있습니다!

<!--truncate-->
## 새로운 동작

ES2019에서는 문자열 리터럴에 이제 U+2028 및 U+2029 문자를 포함할 수 있어 ECMAScript와 JSON 간의 혼란스러운 불일치가 해소되었습니다.

```js
// U+2028 문자가 포함된 문자열입니다.
const LS = ' ';
// → ES2018: SyntaxError
// → ES2019: 예외 없음

// eval로 생성된 U+2029 문자가 포함된 문자열입니다:
const PS = eval('"\u2029"');
// → ES2018: SyntaxError
// → ES2019: 예외 없음
```

이 작은 개선은 개발자의 사고 모델을 크게 단순화하고(기억할 엣지 케이스 하나가 줄어듦!), 유효한 JSON을 ECMAScript 프로그램에 포함할 때 특수한 후처리 로직의 필요성을 줄입니다.

## JavaScript 프로그램에 JSON 포함

이 제안의 결과로, `JSON.stringify`는 이제 유효한 ECMAScript 문자열 리터럴, 객체 리터럴, 배열 리터럴을 생성하는 데 사용할 수 있습니다. 또한 별도의 [_잘 정의된 `JSON.stringify`_ 제안](/features/well-formed-json-stringify) 덕분에 이러한 리터럴은 UTF-8 및 기타 인코딩으로 안전하게 표현될 수 있습니다(디스크에 파일로 기록하려는 경우 유용합니다). 이는 JavaScript 소스 코드를 동적으로 생성하고 디스크에 기록하는 메타프로그래밍 사용 사례에 매우 유용합니다.

다음은 주어진 데이터 객체를 포함하는 올바른 JavaScript 프로그램을 작성하면서 이제 ECMAScript의 하위 집합이 된 JSON 문법을 활용하는 예제입니다:

```js
// 일부 데이터를 나타내는 JavaScript 객체(또는 배열, 문자열).
const data = {
  LineTerminators: '\n\r  ',
  // 주의: 문자열에는 4개의 문자가 포함되어 있습니다: '\n\r\u2028\u2029'.
};

// 데이터를 JSON 문자열 형식으로 변환합니다. JSON ⊂
// ECMAScript 덕분에, `JSON.stringify`의 출력은 문법적으로
// 유효한 ECMAScript 리터럴이 보장됩니다:
const jsObjectLiteral = JSON.stringify(data);

// 데이터를 객체 리터럴로 포함하는 유효한 ECMAScript 프로그램을 생성합니다.
const program = `const data = ${ jsObjectLiteral };`;
// → 'const data = {"LineTerminators":"…"};'
// (대상에 인라인 <script>가 있는 경우 추가적인 이스케이프 처리 필요.)

// ECMAScript 프로그램이 포함된 파일을 디스크에 씁니다.
saveToDisk(filePath, program);
```

위 스크립트는 다음 코드를 생성하며, 이는 동등한 객체로 평가됩니다:

```js
const data = {"LineTerminators":"\n\r  "};
```

## `JSON.parse`를 사용하여 JavaScript 프로그램에 JSON 포함

[_JSON의 비용_](/blog/cost-of-javascript-2019#json)에서 설명된 대로, 다음과 같이 데이터를 JavaScript 객체 리터럴로 인라인하는 대신:

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…데이터를 JSON 문자열 형식으로 표현한 다음 런타임에 JSON을 파싱하여, 대형 객체(10 kB 이상)의 경우 성능이 개선될 수 있습니다:

```js
const data = JSON.parse('{"foo":42,"bar":1337}'); // 🚀
```

다음은 구현 예제입니다:

```js
// 일부 데이터를 나타내는 JavaScript 객체(또는 배열, 문자열).
const data = {
  LineTerminators: '\n\r  ',
  // 주의: 문자열에는 4개의 문자가 포함되어 있습니다: '\n\r\u2028\u2029'.
};

// 데이터를 JSON 문자열 형식으로 변환합니다.
const json = JSON.stringify(data);

// 이제, 데이터를 JavaScript 문자열 리터럴로 스크립트 본문에 삽입합니다.
// 여기서 데이터의 특수 문자(예: `"`)를 이스케이프 처리해야 합니다.
// JSON ⊂ ECMAScript 덕분에 `JSON.stringify`의 출력은
// 문법적으로 유효한 ECMAScript 리터럴이 보장됩니다.
const jsStringLiteral = JSON.stringify(json);
// JSON 데이터를 표현하는 JavaScript 문자열 리터럴을
// `JSON.parse` 호출 내에 포함하는 유효한 ECMAScript 프로그램을 생성합니다.
const program = `const data = JSON.parse(${ jsStringLiteral });`;
// → 'const data = JSON.parse("…");'
// (타겟이 인라인 <script>일 경우 추가 이스케이프가 필요합니다.)

// ECMAScript 프로그램이 포함된 파일을 디스크에 저장합니다.
saveToDisk(filePath, program);
```

위 스크립트는 다음과 같은 코드를 생성하며, 이는 동등한 객체로 평가됩니다:

```js
const data = JSON.parse("{\"LineTerminators\":\"\\n\\r  \"}");
```

[Google의 `JSON.parse`와 JavaScript 객체 리터럴 비교 벤치마크](https://github.com/GoogleChromeLabs/json-parse-benchmark)는 빌드 단계에서 이 기법을 활용합니다. Chrome DevTools의 “JS로 복사” 기능은 [유사한 기법을 채택함으로써 크게 단순화되었습니다](https://chromium-review.googlesource.com/c/chromium/src/+/1464719/9/third_party/blink/renderer/devtools/front_end/elements/DOMPath.js).

## 보안 관련 주의사항

JSON ⊂ ECMAScript는 문자열 리터럴의 경우에 JSON과 ECMAScript 간의 불일치를 줄여줍니다. 문자열 리터럴이 객체나 배열과 같은 다른 JSON 지원 데이터 구조 내에 포함될 수 있으므로, 위의 코드 예제에서 보여주듯 이러한 경우도 처리됩니다.

하지만 U+2028 및 U+2029는 여전히 ECMAScript 문법의 다른 부분에서는 줄 종결자로 처리됩니다. 따라서 여전히 JSON을 JavaScript 프로그램에 삽입하는 것이 안전하지 않은 경우가 존재합니다. 다음의 예를 살펴보세요. 서버가 `JSON.stringify()`를 실행한 후 사용자가 제공한 내용을 HTML 응답에 삽입하는 경우입니다:

```ejs
<script>
  // 디버그 정보:
  // User-Agent: <%= JSON.stringify(ua) %>
</script>
```

`JSON.stringify`의 결과는 스크립트 내 단일 줄 주석에 삽입됩니다.

위 예제와 같이 사용되는 경우 `JSON.stringify()`는 단일 줄을 반환하도록 보장됩니다. 문제는 JSON과 ECMAScript 간에 “단일 줄”의 정의가 [다르다는 점입니다](https://speakerdeck.com/mathiasbynens/hacking-with-unicode?slide=136). `ua`에 U+2028 또는 U+2029 문자가 포함된 경우, 단일 줄 주석에서 벗어나 나머지 부분이 JavaScript 소스 코드로 실행될 수 있습니다:

```html
<script>
  // 디버그 정보:
  // User-Agent: "사용자가 제공한 문자열<U+2028>  alert('XSS');//"
</script>
<!-- …다음과 동일합니다: -->
<script>
  // 디버그 정보:
  // User-Agent: "사용자가 제공한 문자열
  alert('XSS');//"
</script>
```

:::note
**참고:** 위 예제에서 원시적으로 이스케이프 되지 않은 U+2028 문자는 `<U+2028>`로 표시되어 더 쉽게 이해할 수 있습니다.
:::

JSON ⊂ ECMAScript는 여기서 도움이 되지 않습니다. 이는 문자열 리터럴에만 영향을 미치며, 이 경우 `JSON.stringify`의 출력은 JavaScript 문자열 리터럴을 직접 생성하지 않는 위치에 삽입되기 때문입니다.

위 코드 조각은 특별히 두 문자를 위한 후처리가 도입되지 않으면 크로스 사이트 스크립팅 취약점(XSS)을 제시합니다!

:::note
**참고:** 사용자가 제어하는 입력값에 대해 특수 문자 시퀀스를 이스케이프 하도록 후처리를 수행하는 것이 매우 중요합니다. 이 특정 경우에는 `<script>` 태그에 삽입하므로 [</script, <script, 그리고 <!-](https://mathiasbynens.be/notes/etago#recommendations)을 이스케이프해야 합니다.
:::

## JSON ⊂ ECMAScript 지원

<feature-support chrome="66 /blog/v8-release-66#json-ecmascript"
                 firefox="yes"
                 safari="yes"
                 nodejs="10"
                 babel="yes https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-json-strings"></feature-support>
