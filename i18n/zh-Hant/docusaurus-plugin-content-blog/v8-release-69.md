---
title: "V8 發佈 v6.9"
author: "V8 團隊"
date: "2018-08-07 13:33:37"
tags: 
  - release
description: "V8 v6.9 特性包括透過嵌入內建功能降低記憶體使用量、更快的 WebAssembly 啟動速度（使用 Liftoff 引擎）、更好的 DataView 與 WeakMap 性能，以及更多內容！"
tweet: "1026825606003150848"
---
每隔六週，我們會根據我們的[發佈流程](/docs/release-process)建立 V8 的一個新分支。每個版本都從 V8 的 Git 主分支中分支出來，時間恰逢 Chrome Beta 里程碑之前。今天我們很高興宣布最新的分支，[V8 版本 6.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.9)，它正在 Beta 階段，並將在幾週後與 Chrome 69 的 Stable 版本同步發佈。V8 v6.9 包含各種面向開發者的功能。本文在正式發佈之前提供一些亮點預覽。

<!--truncate-->
## 通過嵌入內建功能節省記憶體

V8 附帶了一個廣泛的內建函數庫。例子包括內建對象上的方法，如 `Array.prototype.sort` 和 `RegExp.prototype.exec`，以及一系列內部功能。由於它們的生成耗時較久，內建函數在構建時進行編譯並序列化到一個[快照](/blog/custom-startup-snapshots)，稍後在運行時反序列化以創建初始的 JavaScript 堆狀態。

目前內建函數在每個 Isolate 中消耗 700 KB（Isolate 大致對應於 Chrome 中的瀏覽器標籤）。這相當浪費，我們去年開始致力於減少這種開銷。在 V8 v6.4 中，我們實現了[延遲反序列化](/blog/lazy-deserialization)，確保每個 Isolate 只支付實際需要的內建功能（但每個 Isolate 仍然擁有自己的副本）。

[嵌入內建功能](/blog/embedded-builtins)更進一步。嵌入內建功能由所有 Isolate 共享，並嵌入到二進位文件本身中，而不是複製到 JavaScript 堆中。這意味著無論運行了多少個 Isolate，內建功能在記憶體中只存在一次。尤其現在[網站隔離](https://developers.google.com/web/updates/2018/07/site-isolation)已默認啟用，這一特性特別有用。使用嵌入內建功能，我們在 x64 平台上的前 10k 網站中觀察到了 V8 堆大小中位數降低_9%_。在這些網站中，50% 節省至少 1.2 MB，30% 節省至少 2.1 MB，10% 節省 3.7 MB 或更多。

V8 v6.9 支援在 x64 平台上嵌入內建功能。其他平台將很快在即將的版本中增加支援。更多詳細信息，請參閱我們的[專門博客文章](/blog/embedded-builtins)。

## 性能改進

### Liftoff，WebAssembly 的全新第一級編譯器

WebAssembly 獲得了一個新的基線編譯器，用於快速啟動帶有大型 WebAssembly 模組的復雜網站（例如 Google Earth 和 AutoCAD）。根據硬體，我們觀察到性能提升超過 10 倍。更多詳細信息，請參閱[詳細的 Liftoff 博客文章](/blog/liftoff)。

<figure>
  <img src="/_img/v8-liftoff.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>V8 用於 WebAssembly 的基線編譯器 Liftoff 的標誌</figcaption>
</figure>

### 更快的 `DataView` 操作

[`DataView`](https://tc39.es/ecma262/#sec-dataview-objects)方法已用 V8 Torque 重新實現，與以前的運行時實現相比，節省了昂貴的 C++ 調用。此外，現在我們在使用 TurboFan 編譯 JavaScript 代碼時會內聯調用 `DataView` 方法，從而為熱點代碼提供更佳的峰值性能。使用 `DataView` 現在和使用 `TypedArray` 一樣高效，最終使 `DataView` 成為性能敏感場景中的可行選擇。我們將在即將發佈的有關 `DataView` 的博客文章中更詳細地介紹此內容，敬請期待！

### 垃圾回收期間 `WeakMap` 的更快處理

V8 v6.9 通過改進 `WeakMap` 處理減少了標記-壓縮垃圾回收的暫停時間。現在並發和增量標記可以處理 `WeakMap`，而以前所有這些工作都在標記-壓縮垃圾回收的最終原子暫停期間完成。由於並非所有工作都可以移出暫停，垃圾回收現在還會執行更多並行工作以進一步減少暫停時間。這些優化基本上將[Web Tooling Benchmark](https://github.com/v8/web-tooling-benchmark)中標記-壓縮垃圾回收的平均暫停時間減半。

`WeakMap` 處理使用了一種固定點迭代算法，在某些情況下可能會退化成二次方運行時行為。隨著新版本的發布，V8 現在能夠切換到另一種算法，該算法保證在特定次數的迭代內如果 GC 未完成，則以線性時間完成。之前，最壞情況的例子可以構造成就算堆內存相對較小，GC 完成也需要幾秒鐘，而線性算法則在幾毫秒內完成。

## JavaScript 語言特性

V8 v6.9 支援 [`Array.prototype.flat` 和 `Array.prototype.flatMap`](/features/array-flat-flatmap)。

`Array.prototype.flat` 根據指定的 `depth` 將給定的數組遞歸展平，默認為 `1`:

```js
// 展平一層：
const array = [1, [2, [3]]];
array.flat();
// → [1, 2, [3]]

// 遞歸展平直到數組不再包含嵌套數組：
array.flat(Infinity);
// → [1, 2, 3]
```

`Array.prototype.flatMap` 類似於 `Array.prototype.map`，除了將結果展平到新數組中。

```js
[2, 3, 4].flatMap((x) => [x, x * 2]);
// → [2, 4, 3, 6, 4, 8]
```

更多詳細資訊，請查看 [我們的 `Array.prototype.{flat,flatMap}` 說明文件](/features/array-flat-flatmap)。

## V8 API

請使用 `git log branch-heads/6.8..branch-heads/6.9 include/v8.h` 獲取 API 更改列表。

擁有 [有效 V8 簽出](/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 6.9 -t branch-heads/6.9` 體驗 V8 v6.9 的新功能。或者您可以 [訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，很快自行嘗試這些新功能。
