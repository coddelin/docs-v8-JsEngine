---
title: "V8发布版本v9.7"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-11-05
tags:
 - release
description: "V8发布版本v9.7为数组提供了新的JavaScript方法用于从后向前搜索元素。"
tweet: ""
---
每四周，我们都会根据[发布流程](https://v8.dev/docs/release-process)创建一个新的V8分支。每个版本都是在Chrome Beta里程碑之前从V8的Git主分支创建的分支。今天我们很高兴宣布我们最新的分支，[V8版本9.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.7)，目前处于测试版状态，并将在几周后与Chrome 97稳定版同步发布。V8 v9.7包含了各种面向开发者的功能亮点。这篇文章提供了即将发布的一些重点预览。

<!--truncate-->
## JavaScript

### `findLast` 和 `findLastIndex` 数组方法

`Array`和`TypedArray`上的`findLast`以及`findLastIndex`方法可以从数组末尾找到符合条件的元素。

例如：

```js
[1,2,3,4].findLast((el) => el % 2 === 0)
// → 4（最后一个偶数元素）
```

这些方法从v9.7开始无需启用标志即可使用。

有关更多详情，请查看我们的[功能解释](https://v8.dev/features/finding-in-arrays#finding-elements-from-the-end)。

## V8 API

请使用`git log branch-heads/9.6..branch-heads/9.7 include/v8\*.h`获取API更改列表。

拥有活动V8检出的开发者可以使用`git checkout -b 9.7 -t branch-heads/9.7`尝试V8 v9.7中的新功能。或者您可以[订阅Chrome Beta频道](https://www.google.com/chrome/browser/beta.html)，并尽快亲自尝试新功能。
