---
title: "错误原因"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars:
  - "victor-gomes"
date: 2021-07-07
tags:
  - ECMAScript
description: "JavaScript 现在支持错误原因。"
tweet: "1412774651558862850"
---

假设你有一个函数要调用两个独立的工作负载 `doSomeWork` 和 `doMoreWork`。这两个函数可能抛出同样类型的错误，但你需要以不同的方式处理它们。

捕获错误并通过附加上下文信息将其抛出是解决此问题的一种常见方法，例如：

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new CustomError('某些工作失败', err);
  }
  doMoreWork();
}

try {
  doWork();
} catch (err) {
  // |err| 是来自 |doSomeWork| 还是 |doMoreWork|?
}
```

不幸的是，上面的解决方案非常繁琐，因为需要创建自己的 `CustomError`。更糟糕的是，没有任何开发工具能够为意外的异常提供有帮助的诊断信息，因为没有关于如何正确表示这些错误的共识。

<!--truncate-->
迄今为止缺少的是一种标准化的错误链式处理方式。JavaScript 现在支持错误原因。一个额外的选项参数可以添加到 `Error` 构造函数中，包含一个 `cause` 属性，其值将被分配给错误实例。错误可以很容易地进行链式处理。

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new Error('某些工作失败', { cause: err });
  }
  try {
    doMoreWork();
  } catch (err) {
    throw new Error('更多工作失败', { cause: err });
  }
}

try {
  doWork();
} catch (err) {
  switch(err.message) {
    case '某些工作失败':
      handleSomeWorkFailure(err.cause);
      break;
    case '更多工作失败':
      handleMoreWorkFailure(err.cause);
      break;
  }
}
```

此功能在 V8 v9.3 中可用。

## 错误原因支持

<feature-support chrome="93 https://chromium-review.googlesource.com/c/v8/v8/+/2784681"
                 firefox="91 https://bugzilla.mozilla.org/show_bug.cgi?id=1679653"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=223302"
                 nodejs="no"
                 babel="no"></feature-support>
