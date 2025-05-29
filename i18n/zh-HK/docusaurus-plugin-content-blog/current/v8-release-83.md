---
title: &apos;V8 發佈 v8.3&apos;
author: &apos;[Victor Gomes](https://twitter.com/VictorBFG)，在家安全辦公&apos;
avatars:
 - &apos;victor-gomes&apos;
date: 2020-05-04
tags:
 - 發佈
description: &apos;V8 v8.3 提供更快的 ArrayBuffer、更大的 Wasm 記憶體以及已棄用的 API。&apos;
tweet: &apos;1257333120115847171&apos;
---

每六週，我們會按照 [發佈流程](https://v8.dev/docs/release-process) 創建 V8 的新分支。每個版本都是在 Chrome Beta 版本里程碑之前，從 V8 的 Git 主分支中分支出來的。今天，我們很高興地宣佈我們的最新分支 [V8 版本 8.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.3)，它將進入 Beta 階段，直到幾週後與 Chrome 83 穩定版本協同發佈。V8 v8.3 包含了各種對開發者友好的新功能。本文提供了一些亮點內容的預覽。

<!--truncate-->
## 性能

### 提高 `ArrayBuffer` 在垃圾回收器中的追蹤速度

`ArrayBuffer` 的後援存儲是通過嵌入器提供的 `ArrayBuffer::Allocator` 在 V8 堆外分配的。當 `ArrayBuffer` 對象被垃圾回收器回收時，這些後援存儲需要被釋放。V8 v8.3 引入了一種追蹤 `ArrayBuffer` 和其後援存儲的新機制，使垃圾回收器可以與應用程序同時迭代並釋放後援存儲。更多詳細訊息請參閱[此設計文檔](https://docs.google.com/document/d/1-ZrLdlFX1nXT3z-FAgLbKal1gI8Auiaya_My-a0UJ28/edit#heading=h.gfz6mi5p212e)。此改進使 `ArrayBuffer` 密集型工作負載中的總垃圾回收暫停時間減少了 50%。

### 更大容量的 Wasm 記憶體

根據 [WebAssembly 規範](https://webassembly.github.io/spec/js-api/index.html#limits) 的最新更新，V8 v8.3 現在允許模組請求最多 4GB 的記憶體，從而支持更多記憶體密集型的使用場景，並使其能在由 V8 驅動的平台上運行。請注意，這麼大的記憶體可能並非用戶的系統始終可用；我們建議以較小的尺寸創建記憶體，並按需增長，同時優雅地處理增長失敗的情況。

## 修復

### 基於原型鏈含型別化陣列的物件存儲

根據 JavaScript 規範，在將值存儲到指定鍵時，我們需要查找原型鏈以檢查該鍵是否已存在於原型上。通常情況下，這些鍵並不位於原型鏈上，因此當安全時，V8 安裝了快速查找處理程序以避免這些原型鏈查找。

然而，我們最近發現了一種場景，其中 V8 錯誤地安裝了此快速查找處理程序，導致行為不正確。當 `TypedArray` 存在於原型鏈時，對於 `TypedArray` 範圍外的所有鍵值存儲應該被忽略。例如，在以下情況中，`v[2]` 不應添加屬性到 `v`，隨後的讀取應返回 undefined。

```js
v = {};
v.__proto__ = new Int32Array(1);
v[2] = 123;
return v[2]; // 應返回 undefined
```

V8 的快速查找處理程序未處理此情況，因此上述示例中我們會返回 `123`。V8 v8.3 通過在 `TypedArray` 存在於原型鏈時不使用快速查找處理程序修復了此問題。鑒於這不是一種常見情況，我們在基準測試中未見任何性能回退。

## V8 API

### 棄用實驗性的 WeakRefs 和 FinalizationRegistry API

以下與 WeakRefs 相關的實驗性 API 已被棄用：

- `v8::FinalizationGroup`
- `v8::Isolate::SetHostCleanupFinalizationGroupCallback`

`FinalizationRegistry`（由 `FinalizationGroup` 改名）是 [JavaScript 弱引用提案](https://v8.dev/features/weak-references) 的一部分，為 JavaScript 程式設計者提供了一種註冊終結器的方法。這些 API 是為嵌入器調度和運行 `FinalizationRegistry` 清理任務所設計的，其註冊的終結器會被調用；但由於不再需要，這些 API 已被棄用。`FinalizationRegistry` 的清理任務現在由 V8 自動使用嵌入器的 `v8::Platform` 提供的前台任務執行器調度，而不需要任何額外的嵌入器程式碼。

### 其他 API 變更

請使用 `git log branch-heads/8.1..branch-heads/8.3 include/v8.h` 查看 API 變更清單。

擁有 V8 活躍檢出版本的開發者可以使用 `git checkout -b 8.3 -t branch-heads/8.3` 來嘗試 V8 v8.3 的新功能。此外，您也可以[訂閱 Chrome Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並快速試用這些新功能。
