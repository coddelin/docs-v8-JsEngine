---
title: "`Promise.prototype.finally`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-10-23
tags: 
  - ECMAScript
  - ES2018
description: "Promise.prototype.finally 讓您可以註冊一個回調函數，在 Promise 被處理完成（即已解決或已拒絕）時被調用。"
tweet: "922459978857824261"
---
`Promise.prototype.finally` 讓您可以註冊一個回調函數，在 Promise 處於 _處理完成_ （即已解決或已拒絕）時被調用。

假設您想要獲取一些資料來顯示在頁面上。此外，您還希望在請求開始時顯示載入的旋轉圖標，而在請求完成時隱藏它。如果出現問題，則改為顯示錯誤訊息。

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

如果請求成功，我們會顯示資料內容。如果出現問題，我們會改為顯示錯誤訊息。

無論是哪種情況，我們都需要調用 `hideLoadingSpinner()`。在此之前，我們別無選擇，只能將這個調用複製到 `then()` 和 `catch()` 區塊中。有了 `Promise.prototype.finally`，我們可以做得更好：

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

這樣不僅減少了代碼重複，還更清晰地將成功/錯誤處理階段與清理階段分離開來，真是棒極了！

當前，也可以使用 `async`/`await` 並不依賴 `Promise.prototype.finally` 實現同樣的功能：

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

由於 [`async` 和 `await` 明顯更好](https://mathiasbynens.be/notes/async-stack-traces)，我們的建議仍然是使用它們來替代原生 Promise。不過，如果因某些原因您更喜歡使用原生 Promise，`Promise.prototype.finally` 可以幫助您使代碼更簡潔明了。

## `Promise.prototype.finally` 支援

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="11.1"
                 nodejs="10"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>
