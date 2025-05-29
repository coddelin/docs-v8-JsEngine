---
title: "V8 發佈 v6.0"
author: "V8 團隊"
date: 2017-06-09 13:33:37
tags:
  - 發佈
description: "V8 v6.0 帶來了多項性能改進，並引入了對 `SharedArrayBuffer` 和物件的剩餘/展開屬性的支援。"
---
每六週，我們會根據 [發佈流程](/docs/release-process) 創建一個新的 V8 分支。每個版本都是從 V8 的 Git 主分支在 Chrome Beta 里程碑前立即分支出來的。今天，我們很高興地向大家宣布我們最新的分支，[V8 版本 6.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.0)，該版本將進入 Beta 阶段，直到幾週後與 Chrome 60 Stable 一同發佈。V8 6.0 包含了各種面向開發者的功能。我們希望在正式發佈之前為大家介紹一些亮點。

<!--truncate-->
## `SharedArrayBuffer`s

V8 v6.0 引入了對 [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) 的支援，這是一種低階機制，用於在 JavaScript worker 之間共享記憶體並同步 worker 控制流。SharedArrayBuffer 使 JavaScript 能夠訪問共享記憶體、原子操作和 futex。此外，SharedArrayBuffer 使能通過 asm.js 或 WebAssembly 將多線程應用程式移植到網頁。

如需簡短的低階教程，請參閱規範 [教程頁面](https://github.com/tc39/ecmascript_sharedmem/blob/master/TUTORIAL.md) 或查看 [Emscripten 文檔](https://kripken.github.io/emscripten-site/docs/porting/pthreads.html) 以移植 pthreads。

## 物件的剩餘/展開屬性

本次發佈引入了對象解構賦值的剩餘屬性以及對象字面量的展開屬性。物件的剩餘/展開屬性是 Stage 3 的 ES.next 功能。

展開屬性還在許多情況下提供了一個簡潔的 `Object.assign()` 替代方法。

```js
// 對象解構賦值的剩餘屬性:
const person = {
  firstName: 'Sebastian',
  lastName: 'Markbåge',
  country: 'USA',
  state: 'CA',
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Sebastian
console.log(lastName); // Markbåge
console.log(rest); // { country: 'USA', state: 'CA' }

// 對象字面量的展開屬性:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Sebastian', lastName: 'Markbåge', country: 'USA', state: 'CA' }
```

如需更多資訊，請參閱 [我們關於物件的剩餘和展開屬性的解釋文檔](/features/object-rest-spread)。

## ES2015 性能

V8 v6.0 持續改進 ES2015 功能的性能。本次發佈包含對語言功能實現的優化，這些優化總體上使得 V8 的 [ARES-6](http://browserbench.org/ARES-6/) 得分提高了大約 10%。

## V8 API

請查看我們的 [API 更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文檔會在每次主要發佈後的數週內定期更新。

擁有 [活躍的 V8 檢出版本](/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 6.0 -t branch-heads/6.0` 実驗 V8 6.0 中的新功能。或者您可以 [訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，很快就可以自己嘗試這些新功能。
