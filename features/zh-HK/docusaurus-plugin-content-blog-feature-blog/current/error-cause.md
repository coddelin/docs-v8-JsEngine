---
title: &apos;錯誤原因&apos;
author: &apos;Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))&apos;
avatars:
  - &apos;victor-gomes&apos;
date: 2021-07-07
tags:
  - ECMAScript
description: &apos;JavaScript 現在支援錯誤原因。&apos;
tweet: &apos;1412774651558862850&apos;
---

假設你有一個函數正在調用兩個分開的工作負載 `doSomeWork` 和 `doMoreWork`。這兩個函數可以拋出同類型的錯誤，但你需要以不同方式處理它們。

捕捉錯誤並帶有額外上下文信息再次拋出是解決這個問題的一種常見方法，例如：

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new CustomError(&apos;某些工作失敗&apos;, err);
  }
  doMoreWork();
}

try {
  doWork();
} catch (err) {
  // |err| 是來自 |doSomeWork| 還是 |doMoreWork|?
}
```

可惜上述解決方案比較繁瑣，因為需要創建自己的 `CustomError`。而更糟的是，沒有任何開發工具能為意外異常提供有用的診斷信息，因為目前還沒有關於如何正確表示這些錯誤的共識。

<!--truncate-->
目前缺少的是一種標準的方式來鏈接錯誤。JavaScript 現在支援錯誤原因。在 `Error` 構造函數中可以添加一個額外的選項參數，並包含 `cause` 屬性，其值會分配給錯誤實例，這樣錯誤就可以很方便地鏈接。

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new Error(&apos;某些工作失敗&apos;, { cause: err });
  }
  try {
    doMoreWork();
  } catch (err) {
    throw new Error(&apos;更多工作失敗&apos;, { cause: err });
  }
}

try {
  doWork();
} catch (err) {
  switch(err.message) {
    case &apos;某些工作失敗&apos;:
      handleSomeWorkFailure(err.cause);
      break;
    case &apos;更多工作失敗&apos;:
      handleMoreWorkFailure(err.cause);
      break;
  }
}
```

此功能已在 V8 v9.3 中提供。

## 錯誤原因支援

<feature-support chrome="93 https://chromium-review.googlesource.com/c/v8/v8/+/2784681"
                 firefox="91 https://bugzilla.mozilla.org/show_bug.cgi?id=1679653"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=223302"
                 nodejs="no"
                 babel="no"></feature-support>
