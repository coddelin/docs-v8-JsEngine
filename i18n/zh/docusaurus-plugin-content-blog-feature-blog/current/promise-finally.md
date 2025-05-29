---
title: "`Promise.prototype.finally`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2017-10-23
tags:
  - ECMAScript
  - ES2018
description: "Promise.prototype.finally 使得可以注册在 Promise 被解决（即成功或拒绝）时调用的回调函数。"
tweet: "922459978857824261"
---
`Promise.prototype.finally` 使得可以注册在 Promise 被解决（即成功或拒绝）时调用的回调函数。

想象一下，你想要获取一些数据并显示在页面上。哦，你希望请求开始时显示一个加载动画，并且在请求完成后隐藏它。当出现问题时，你会显示一条错误消息。

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

如果请求成功，我们会显示数据。如果出现问题，我们会显示一条错误消息。

在任何情况下，我们都需要调用 `hideLoadingSpinner()`。到目前为止，我们不得不在 `then()` 和 `catch()` 块中重复调用它。有了 `Promise.prototype.finally`，我们可以做到更好：

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

这不仅减少了代码的重复，还更清晰地分离了成功/错误处理阶段和清理阶段。很棒吧！

目前，同样的事情可以通过 `async`/`await` 实现，而不需要使用 `Promise.prototype.finally`：

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

由于 [`async` 和 `await` 的使用效果更好](https://mathiasbynens.be/notes/async-stack-traces)，我们的建议仍然是使用它们，而不是普通的 Promise。不过，如果你因为某些原因更喜欢普通的 Promise，`Promise.prototype.finally` 可以帮助让你的代码更简单和更清晰。

## `Promise.prototype.finally` 支持

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="11.1"
                 nodejs="10"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>
