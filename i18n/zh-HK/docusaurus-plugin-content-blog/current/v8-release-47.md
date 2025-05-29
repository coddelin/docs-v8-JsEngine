---
title: &apos;V8 版本 v4.7&apos;
author: &apos;V8 團隊&apos;
date: 2015-10-14 13:33:37
tags:
  - 發佈
description: &apos;V8 v4.7 帶來了內存使用量的減少以及對新的 ES2015 語言功能的支援。&apos;
---
大約每六週，我們會按照 [發佈流程](https://v8.dev/docs/release-process) 創建一個新的 V8 分支。每個版本的分支都會在 Chrome 為 Chrome Beta 里程碑分支前，立即從 V8 的 Git 主分支創建。今天，我們很高興地宣布我們最新的分支 [V8 版本 4.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.7)，該版本將進入 Beta 測試，直到與 Chrome 47 穩定版同步釋出。V8 v4.7 為開發者提供了豐富的功能，我們希望提前分享一些亮點，為即將幾週後的發佈做準備。

<!--truncate-->
## 改進對 ECMAScript 2015 (ES6) 的支援

### 剩餘運算符

[剩餘運算符](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/rest_parameters) 讓開發者能夠將不定數量的參數傳遞給函數。它類似於 `arguments` 物件。

```js
// 無剩餘運算符
function concat() {
  var args = Array.prototype.slice.call(arguments, 1);
  return args.join(&apos;&apos;);
}

// 使用剩餘運算符
function concatWithRest(...strings) {
  return strings.join(&apos;&apos;);
}
```

## 支援即將到來的 ES 功能

### `Array.prototype.includes`

[`Array.prototype.includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes) 是一個新的特性，目前是 ES2016 的 stage 3 提議。它為確定某個元素是否存在於陣列中提供了簡明的語法，並返回布林值。

```js
[1, 2, 3].includes(3); // true
[&apos;apple&apos;, &apos;banana&apos;, &apos;cherry&apos;].includes(&apos;apple&apos;); // true
[&apos;apple&apos;, &apos;banana&apos;, &apos;cherry&apos;].includes(&apos;peach&apos;); // false
```

## 減輕解析時的內存壓力

[最近對 V8 解析器的更改](https://code.google.com/p/v8/issues/detail?id=4392) 大幅減少了解析包含大型嵌套函數的檔案時所耗費的內存。特別是，這使得 V8 能夠運行比以往更大的 asm.js 模塊。

## V8 API

請查看我們的 [API 變更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。這份文檔會在每次主要版本釋出後的幾週內定期更新。有 [V8 活動檢出](https://v8.dev/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 4.7 -t branch-heads/4.7` 來嘗試 V8 v4.7 中的新功能。或者你也可以 [訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，來親自嘗試這些新功能。
