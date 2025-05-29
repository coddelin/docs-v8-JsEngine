---
title: &apos;V8 릴리즈 v9.5&apos;
author: &apos;Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))&apos;
avatars:
 - &apos;ingvar-stepanyan&apos;
date: 2021-09-21
tags:
 - 릴리즈
description: &apos;V8 릴리즈 v9.5는 업데이트된 국제화 API와 WebAssembly 예외 처리 지원을 제공합니다.&apos;
tweet: &apos;1440296019623759872&apos;
---
매 4주마다 우리는 [릴리즈 프로세스](https://v8.dev/docs/release-process)의 일환으로 V8의 새로운 브랜치를 생성합니다. 각 버전은 크롬 베타 마일스톤 직전에 V8의 Git 마스터에서 브랜칭됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 9.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.5)를 발표하게 되어 기쁩니다. 이번 브랜치는 크롬 95 안정 릴리즈와 함께 몇 주 동안 베타 단계에 있습니다. V8 v9.5는 개발자를 위한 다양한 기능으로 가득합니다. 이 글에서는 릴리즈를 기대하며 주요 하이라이트를 미리 소개합니다.

<!--truncate-->
## JavaScript

### `Intl.DisplayNames` v2

v8.1에서는 크롬 81에서 [`Intl.DisplayNames` API](https://v8.dev/features/intl-displaynames)를 출시했으며, 지원되는 유형으로는 “language”, “region”, “script”, “currency”가 있었습니다. v9.5에서는 이제 “calendar”와 “dateTimeField”라는 두 가지 새로운 지원 유형이 추가되었습니다. 이는 각각 다른 캘린더 유형과 날짜 및 시간 필드의 표시 이름을 반환합니다:

```js
const esCalendarNames = new Intl.DisplayNames([&apos;es&apos;], { type: &apos;calendar&apos; });
const frDateTimeFieldNames = new Intl.DisplayNames([&apos;fr&apos;], { type: &apos;dateTimeField&apos; });
esCalendarNames.of(&apos;roc&apos;);  // "calendario de la República de China"
frDateTimeFieldNames.of(&apos;month&apos;); // "mois"
```

또한 “language” 유형에 대한 지원을 강화하여 languageDisplay 옵션을 추가했습니다. 이 옵션은 “standard” 또는 “dialect”(명시되지 않은 경우 기본값)일 수 있습니다:

```js
const jaDialectLanguageNames = new Intl.DisplayNames([&apos;ja&apos;], { type: &apos;language&apos; });
const jaStandardLanguageNames = new Intl.DisplayNames([&apos;ja&apos;], { type: &apos;language&apos; , languageDisplay: &apos;standard&apos;});
jaDialectLanguageNames.of(&apos;en-US&apos;)  // "アメリカ英語"
jaDialectLanguageNames.of(&apos;en-AU&apos;)  // "オーストラリア英語"
jaDialectLanguageNames.of(&apos;en-GB&apos;)  // "イギリス英語"

jaStandardLanguageNames.of(&apos;en-US&apos;) // "英語 (アメリカ合衆国)"
jaStandardLanguageNames.of(&apos;en-AU&apos;) // "英語 (オーストラリア)"
jaStandardLanguageNames.of(&apos;en-GB&apos;) // "英語 (イギリス)"
```

### 확장된 `timeZoneName` 옵션

`Intl.DateTimeFormat API`는 v9.5에서 `timeZoneName` 옵션에 대해 네 가지 새로운 값을 지원합니다:

- “shortGeneric”: 예를 들면 “PT”, “ET”와 같이 일반적인 짧은 위치 비표시 형식으로 시간대를 출력하며, 서머타임 적용 여부를 표시하지 않습니다.
- “longGeneric”: 예를 들면 “Pacific Time”, “Mountain Time”와 같이 일반적인 긴 위치 비표시 형식으로 시간대를 출력하며, 서머타임 적용 여부를 표시하지 않습니다.
- “shortOffset”: 예를 들면 “GMT-8”와 같이 짧은 로컬라이즈된 GMT 형식으로 시간대를 출력합니다.
- “longOffset”: 예를 들면 “GMT-0800”와 같이 긴 로컬라이즈된 GMT 형식으로 시간대를 출력합니다.

## WebAssembly

### 예외 처리

V8는 이제 [WebAssembly 예외 처리(Wasm EH) 제안](https://github.com/WebAssembly/exception-handling/blob/master/proposals/exception-handling/Exceptions.md)을 지원하여 호환 가능한 툴체인(e.g. [Emscripten](https://emscripten.org/docs/porting/exceptions.html))으로 컴파일된 모듈을 V8에서 실행할 수 있습니다. 이 제안은 JavaScript를 사용하는 기존 해결 방법과 비교하여 오버헤드를 낮게 유지하도록 설계되었습니다.

예를 들어, 우리는 [Binaryen](https://github.com/WebAssembly/binaryen/) 최적화를 기존 및 새로운 예외 처리 구현으로 WebAssembly로 컴파일했습니다.

예외 처리가 활성화되면 코드 크기 증가가 [기존 JavaScript 기반의 예외 처리 43% 대비 새로운 Wasm EH 기능에서는 단지 9%로 감소합니다](https://github.com/WebAssembly/exception-handling/issues/20#issuecomment-919716209).

우리가 몇 가지 큰 테스트 파일에서 `wasm-opt.wasm -O3`을 실행했을 때, Wasm EH 버전은 예외가 없을 때의 기준선과 비교하여 성능 손실이 없었지만, JavaScript 기반의 EH 버전은 약 30% 더 오래 걸렸습니다.

그러나 Binaryen은 예외 확인을 드물게 사용합니다. 예외가 많은 작업에서는 성능 차이가 더욱 클 것으로 예상됩니다.

## V8 API

주요 v8.h 헤더 파일이 여러 부분으로 분리되어 별도로 포함할 수 있습니다. 예를 들어 `v8-isolate.h`는 이제 `v8::Isolate class`를 포함합니다. `v8::Local<T>`를 전달하는 메서드를 선언하는 많은 헤더 파일은 이제 `v8-forward.h`를 가져와서 `v8::Local`와 모든 V8 힙 객체 유형의 정의를 얻을 수 있습니다.

`git log branch-heads/9.4..branch-heads/9.5 include/v8\*.h`를 사용하여 API 변경 사항 목록을 얻으세요.
