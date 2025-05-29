---
title: "V8 發佈 v9.7"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-11-05
tags:
 - release
description: "V8 發佈 v9.7，帶來了在陣列中向後查找的新的 JavaScript 方法。"
tweet: ""
---
每隔四周，我們會創建一個新的 V8 分支，作為我們[發佈流程](https://v8.dev/docs/release-process)的一部分。每個版本的分支都在 Chrome Beta 的里程碑之前，直接從 V8 的 Git main 分支中分出。今天，我們很高興公佈我們的最新分支，[V8 版本 9.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.7)，目前它正在 Beta 測試，直到幾周後與 Chrome 97 穩定版協同發佈。V8 v9.7 充滿了各種面向開發者的功能。本文提供了一些亮點的預覽，以期對即將的發佈引發期待。

<!--truncate-->
## JavaScript

### `findLast` 和 `findLastIndex` 陣列方法

`Array` 和 `TypedArray` 上的 `findLast` 和 `findLastIndex` 方法從陣列的末尾找到匹配條件的元素。

例如：

```js
[1,2,3,4].findLast((el) => el % 2 === 0)
// → 4 (最後一個偶數元素)
```

從 v9.7 開始，這些方法無需使用任何標誌即可使用。

如需更多詳細資訊，請參見我們的[功能解釋](https://v8.dev/features/finding-in-arrays#finding-elements-from-the-end)。

## V8 API

請使用 `git log branch-heads/9.6..branch-heads/9.7 include/v8\*.h` 獲取 API 更改的列表。

擁有當前 V8 檢出版本的開發者可以使用 `git checkout -b 9.7 -t branch-heads/9.7` 試驗 V8 v9.7 的新功能。或者，您也可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並很快親自嘗試這些新功能。
