---
title: "JavaScript의 새로운 초능력: 명시적 리소스 관리"
author: 'Rezvan Mahdavi Hezaveh'
avatars:
  - 'rezvan-mahdavi-hezaveh'
date: 2025-05-09
tags:
  - ECMAScript
description: '명시적 리소스 관리 제안은 개발자가 리소스의 수명주기를 명시적으로 관리할 수 있는 권한을 부여합니다.'
tweet: ''
---

*명시적 리소스 관리* 제안은 파일 핸들, 네트워크 연결 등과 같은 리소스의 수명 주기를 명시적으로 관리하기 위한 결정론적 접근 방식을 도입합니다. 이 제안은 다음과 같은 언어 추가 사항을 포함합니다: `using` 및 `await using` 선언은 리소스가 범위를 벗어날 때 자동으로 dispose 메서드를 호출합니다. `[Symbol.dispose]()` 및 `[Symbol.asyncDispose]()` 심볼은 정리 작업용입니다. 두 개의 새로운 글로벌 객체 `DisposableStack` 및 `AsyncDisposableStack`은 폐기 가능한 리소스를 집계하기 위한 컨테이너로 제공되며, `SuppressedError`는 리소스 폐기 중 오류가 발생하고 기존 오류가 마스킹되는 시나리오를 해결하기 위한 새로운 유형의 오류로 (최근에 발생한 오류와 억제된 오류 모두를 포함) 도입되었습니다. 이러한 추가 사항은 리소스 폐기에 대한 세밀한 제어를 제공하여 개발자가 더욱 견고하고 성능이 뛰어나며 유지 관리가 용이한 코드를 작성할 수 있도록 합니다.

<!--truncate-->
## `using` 및 `await using` 선언

명시적 리소스 관리 제안의 핵심은 `using` 및 `await using` 선언에 있습니다. `using` 선언은 동기 리소스를 위해 설계되었으며, 폐기 가능한 리소스의 `[Symbol.dispose]()` 메서드가 선언된 범위가 종료될 때 호출되도록 보장합니다. 비동기 리소스의 경우, `await using` 선언은 유사하게 작동하지만 `[Symbol.asyncDispose]()` 메서드가 호출되고, 이 호출 결과가 대기되도록 보장하여 비동기 정리 작업을 허용합니다. 이러한 구분은 개발자가 동기 및 비동기 리소스를 신뢰성 있게 관리할 수 있도록 하며, 누수를 방지하고 전체 코드 품질을 향상시킵니다. `using` 및 `await using` 키워드는 `{}` 중괄호 안에서 (예: 블록, for 루프 및 함수 본문) 사용할 수 있으며, 최상위 레벨에서는 사용할 수 없습니다.

예를 들어, [`ReadableStreamDefaultReader`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader)를 사용할 때 `reader.releaseLock()`을 호출하여 스트림을 잠금 해제하고 다른 곳에서 사용할 수 있도록 하는 것이 중요합니다. 하지만 오류 처리는 일반적인 문제를 도입합니다: 읽기 과정 중 오류가 발생하고 오류가 전파되기 전에 `releaseLock()`을 호출하는 것을 잊어버리면 스트림이 잠긴 상태로 남습니다. 다음과 같이 단순한 예를 시작해 봅시다:

```javascript
let responsePromise = null;

async function readFile(url) {  
    if (!responsePromise) {
        // 아직 약속이 없는 경우에만 가져오기
        responsePromise = fetch(url);
    }
    const response = await responsePromise;
    if (!response.ok) {
      throw new Error(`HTTP 오류! 상태: ${response.status}`);
    }
    const processedData = await processData(response);

    // processedData로 작업 수행
    ...
 }

async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // 데이터를 처리하고 결과를 processedData에 저장
            ...
            // 여기에서 오류가 발생합니다!
        }
    }
    
    // 이 줄 전에 오류가 발생했기 때문에 스트림이 잠긴 상태로 남습니다.
    reader.releaseLock(); 

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

따라서 개발자가 스트림을 사용할 때 `try...finally` 블록을 작성하고 `releaseLock()`을 `finally`에 배치하는 것이 중요합니다. 이 패턴은 항상 `reader.releaseLock()`이 호출되도록 보장합니다.

```javascript
async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    try {
        while (!done) {
            ({ done, value } = await reader.read());
            if (value) {
                // 데이터를 처리하고 결과를 processedData에 저장
                ...
                // 여기에서 오류가 발생합니다!
            }
        }
    } finally {
        // 리더의 스트림 잠금이 항상 해제됩니다.
        reader.releaseLock();
    }

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

이 코드를 작성하는 또 다른 방법은 `readerResource`라는 일회용 객체를 만들고, 이 객체에는 리더(`response.body.getReader()`)와 `this.reader.releaseLock()`을 호출하는 `[Symbol.dispose]()` 메서드가 포함되도록 하는 것입니다. `using` 선언은 코드 블록이 종료될 때 `readerResource[Symbol.dispose]()`가 호출되도록 보장하며, `releaseLock`을 호출할 필요가 없어지는 이유는 `using` 선언이 이를 처리하기 때문입니다. 스트림 같은 웹 API에 `[Symbol.dispose]` 및 `[Symbol.asyncDispose]`가 통합되면 개발자가 수동 래퍼 객체를 작성할 필요가 없어질 수 있습니다.

```javascript
 async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;

    // 리더를 일회용 리소스로 감싸기
    using readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
        },
    };
    const { reader } = readerResource;

    let done = false;
    let value;
    let processedData;
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // 데이터를 처리하고 결과를 processedData에 저장
            ...
            // 여기에서 오류가 발생했습니다!
        }
    }
    return processedData;
  }
 // readerResource[Symbol.dispose]()가 자동으로 호출됩니다.

 readFile(&apos;https://example.com/largefile.dat&apos;);
```

## `DisposableStack` 및 `AsyncDisposableStack`

여러 일회용 리소스를 관리하기 쉽게 하기 위해, 제안은 `DisposableStack` 및 `AsyncDisposableStack`을 소개합니다. 이러한 스택 기반 구조는 개발자가 여러 리소스를 그룹화하고 조율된 방식으로 폐기할 수 있도록 합니다. 리소스는 스택에 추가되며, 스택이 동기적으로 또는 비동기적으로 폐기될 때 리소스는 추가된 역순으로 폐기되어 그들 간의 종속성을 올바르게 처리합니다. 이는 여러 관련 리소스를 다루는 복잡한 시나리오에서 정리 프로세스를 간소화합니다. 두 구조는 리소스 또는 폐기 작업을 추가하기 위한 `use()`, `adopt()`, `defer()`와 같은 메서드를 제공하며, 정리를 트리거하기 위한 `dispose()` 또는 `asyncDispose()` 메서드를 제공합니다. `DisposableStack`과 `AsyncDisposableStack`은 각각 `[Symbol.dispose]()` 및 `[Symbol.asyncDispose]()`를 가지고 있어 `using` 및 `await using` 키워드와 함께 사용할 수 있습니다. 지정된 범위 내에서 여러 리소스의 폐기를 관리하는 강력한 방안을 제공합니다.

각 메서드를 살펴보고 예제를 봅시다:

`use(value)`는 리소스를 스택의 맨 위에 추가합니다.

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log(&apos;리더 락 해제.&apos;);
        },
    };
    using stack = new DisposableStack();
    stack.use(readerResource);
}
// 리더 락 해제.
```

`adopt(value, onDispose)`는 비일회용 리소스와 폐기 콜백을 스택의 맨 위에 추가합니다.

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader = > {
        reader.releaseLock();
        console.log(&apos;리더 락 해제.&apos;);
      });
}
// 리더 락 해제.
```

`defer(onDispose)`는 스택 맨 위에 폐기 콜백을 추가합니다. 관련 리소스가 없는 정리 작업을 추가하는 데 유용합니다.

```javascript
{
    using stack = new DisposableStack();
    stack.defer(() => console.log("완료."));
}
// 완료.
```

`move()`는 현재 스택 내의 모든 리소스를 새로운 `DisposableStack`으로 이동합니다. 이는 리소스 소유권을 코드의 다른 부분으로 이전해야 하는 경우 유용할 수 있습니다.

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader = > {
        reader.releaseLock();
        console.log(&apos;리더 락 해제.&apos;);
      });
    using newStack = stack.move();
}
// 여기에서는 newStack만 존재하며 그 안에 있는 리소스가 폐기됩니다.
// 리더 락 해제.
```

`dispose()`는 DisposableStack에서, `disposeAsync()`는 AsyncDisposableStack에서 이 객체 내의 리소스를 폐기합니다.

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log(&apos;리더 락 해제.&apos;);
        },
    };
    let stack = new DisposableStack();
    stack.use(readerResource);
    stack.dispose();
}
// 리더 락 해제.
```

## 가용성

명시적 자원 관리는 Chromium 134 및 V8 v13.8에서 제공됩니다.

## 명시적 자원 관리 지원

<feature-support chrome="134 https://chromestatus.com/feature/5071680358842368"
                 firefox="134 (nightly) https://bugzilla.mozilla.org/show_bug.cgi?id=1927195"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=248707" 
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#explicit-resource-management"></feature-support>
