---
title: "`Promise.prototype.finally`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-10-23
tags: 
  - ECMAScript
  - ES2018
description: "Promise.prototype.finally는 프로미스가 정산될 때(즉, 완료 또는 거부됨)에 호출될 콜백을 등록할 수 있도록 합니다."
tweet: "922459978857824261"
---
`Promise.prototype.finally`는 프로미스가 _정산_될 때(즉, 완료 또는 거부됨)에 호출될 콜백을 등록할 수 있도록 합니다.

페이지에 표시할 데이터를 가져오고 싶다고 상상해보세요. 그리고 요청이 시작될 때 로딩 스피너를 표시하고 요청이 완료되면 숨기고 싶습니다. 문제가 발생하면 대신 오류 메시지를 표시합니다.

```js
const fetchAndDisplay = ({ url, element }) => {
  showLoadingSpinner();
  fetch(url)
    .then((response) => response.text())
    .then((text) => {
      element.textContent = text;
      hideLoadingSpinner();
    })
    .catch((error) => {
      element.textContent = error.message;
      hideLoadingSpinner();
    });
};

<!--truncate-->
fetchAndDisplay({
  url: someUrl,
  element: document.querySelector('#output')
});
```

요청이 성공하면 데이터를 표시합니다. 문제가 발생하면 대신 오류 메시지를 표시합니다.

어느 경우이든 `hideLoadingSpinner()`를 호출해야 합니다. 지금까지는 `then()` 및 `catch()` 블록에서 호출을 복제하는 것 외에는 선택지가 없었습니다. 그러나 `Promise.prototype.finally`를 사용하면 더 나은 방법을 사용할 수 있습니다:

```js
const fetchAndDisplay = ({ url, element }) => {
  showLoadingSpinner();
  fetch(url)
    .then((response) => response.text())
    .then((text) => {
      element.textContent = text;
    })
    .catch((error) => {
      element.textContent = error.message;
    })
    .finally(() => {
      hideLoadingSpinner();
    });
};
```

이는 코드 중복을 줄일 뿐만 아니라 성공/오류 처리 단계와 정리 단계도 더 명확하게 구분합니다. 깔끔하죠!

현재 `async`/`await`로도 같은 작업을 할 수 있으며 `Promise.prototype.finally`가 없어도 가능합니다:

```js
const fetchAndDisplay = async ({ url, element }) => {
  showLoadingSpinner();
  try {
    const response = await fetch(url);
    const text = await response.text();
    element.textContent = text;
  } catch (error) {
    element.textContent = error.message;
  } finally {
    hideLoadingSpinner();
  }
};
```

[`async`와 `await`가 엄밀히 더 좋기](https://mathiasbynens.be/notes/async-stack-traces) 때문에 저희의 권장은 여전히 기본적인 프로미스 대신 사용하는 것입니다. 그렇긴 해도, 어떤 이유로 기본 프로미스를 선호하는 경우 `Promise.prototype.finally`가 코드를 더 간단하고 깨끗하게 만드는 데 도움을 줄 수 있습니다.

## `Promise.prototype.finally` 지원

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="11.1"
                 nodejs="10"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>
