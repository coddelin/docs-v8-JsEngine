---
title: "從 JavaScript 到 DOM 並回溯的追蹤"
author: "Ulan Degenbaev、Alexei Filippov、Michael Lippautz 和 Hannes Payer —— DOM 的合作夥伴"
avatars: 
  - "ulan-degenbaev"
  - "michael-lippautz"
  - "hannes-payer"
date: "2018-03-01 13:33:37"
tags: 
  - internals
  - memory
description: "Chrome 的 DevTools 現在可以追蹤並快照 C++ DOM 物件，並顯示所有從 JavaScript 可達的 DOM 物件及其引用。"
tweet: "969184997545562112"
---
在 Chrome 66 中調試記憶體洩漏變得更容易。Chrome 的 DevTools 現在可以追蹤並快照 C++ DOM 物件，並顯示所有從 JavaScript 可達的 DOM 物件及其引用。這項功能是新 V8 垃圾回收器的 C++ 追蹤機制的一項優勢。

<!--truncate-->
## 背景

在垃圾回收系統中，記憶體洩漏是指未使用的物件由於其他物件的非故意引用而無法被釋放。網頁中的記憶體洩漏通常涉及 JavaScript 物件與 DOM 元件之間的互動。

以下[一個簡單的示例](https://ulan.github.io/misc/leak.html)展示了當程式員忘記註銷事件監聽器時發生的記憶體洩漏。事件監聽器引用的任何物件都無法被垃圾回收，尤其是 iframe window 和事件監聽器一起洩漏。

```js
// 主窗口:
const iframe = document.createElement('iframe');
iframe.src = 'iframe.html';
document.body.appendChild(iframe);
iframe.addEventListener('load', function() {
  const localVariable = iframe.contentWindow;
  function leakingListener() {
    // 對 `localVariable` 做些事情。
    if (localVariable) {}
  }
  document.body.addEventListener('my-debug-event', leakingListener);
  document.body.removeChild(iframe);
  // BUG: 忘了註銷 `leakingListener`。
});
```

洩漏的 iframe window 還保持其所有 JavaScript 物件處於存活狀態。

```js
// iframe.html:
class Leak {};
window.globalVariable = new Leak();
```

理解保留路徑的概念對於找到記憶體洩漏的根本原因至關重要。保留路徑是一個防止垃圾回收洩漏物件的物件鏈。該鏈由主窗口的全域性物件等 ROOT 物件開始，並在洩漏的物件結束。鏈中的每個中間物件都直接引用鏈中的下一個物件。例如，iframe 中 `Leak` 物件的保留路徑如下所示：

![圖 1：通過 `iframe` 和事件監聽器洩漏的物件的保留路徑](/_img/tracing-js-dom/retaining-path.svg)

請注意，保留路徑跨越了 JavaScript / DOM 邊界（分別以綠色 / 紅色突出顯示）兩次。JavaScript 物件在 V8 堆上，而 DOM 物件是 Chrome 中的 C++ 物件。

## DevTools 堆快照

我們可以通過在 DevTools 中拍攝堆快照來檢查任何物件的保留路徑。堆快照能夠精確捕捉 V8 堆上的所有物件。直到最近，它對於 C++ DOM 物件只有近似資訊。例如，Chrome 65 顯示了一個不完整的玩具示例中 `Leak` 物件的保留路徑：

![圖 2：Chrome 65 中的保留路徑](/_img/tracing-js-dom/chrome-65.png)

只有第一行是精確的：`Leak` 物件確實存放在 iframe 的 window 物件的 `global_variable` 中。後續行近似了真正的保留路徑，這使得記憶體洩漏的除錯變得困難。

從 Chrome 66 開始，DevTools 通過 C++ DOM 物件進行追蹤，並精確捕捉物件及其之間的引用。這基於之前為跨元件垃圾回收引入的強大的 C++ 物件追蹤機制。結果，[DevTools 中的保留路徑](https://www.youtube.com/watch?v=ixadA7DFCx8)現已正確：

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/ixadA7DFCx8" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>圖 3：Chrome 66 中的保留路徑</figcaption>
</figure>

## 底層實作：跨元件追蹤

DOM 物件由 Blink 管理——Chrome 的渲染引擎負責將 DOM 翻譯成螢幕上的文字和圖片。Blink 及其 DOM 表示是用 C++語言編寫的，這意味著 DOM 不能直接暴露給 JavaScript。相反，DOM 中的物件分為兩部分：JavaScript 可用的 V8 包裝物件和表示 DOM 中節點的 C++ 物件。這些物件之間存在直接引用。在 Blink 和 V8 等多個元件中，確定物件的存活狀態和所有權是困難的，因為所有相關方需要達成共識，哪些物件仍然存活，哪些可以回收。

在 Chrome 56 及更舊版本（即直到 2017 年 3 月），Chrome 使用了一種稱為_物件分組_的機制來確定存活性。物件根據是否包含在文件中被分配到群組。只要有一個物件通過其他保留路徑被保留，則包含所有物件的群組都會保持存活狀態。這在 DOM 節點始終引用其所包含的文件（形成所謂的 DOM 樹）的上下文中是合理的。然而，這種抽象移除了所有實際的保留路徑，如圖 2 所示，這使得調試變得困難。對於不符合這種情況的物件，例如作為事件監聽器使用的 JavaScript 閉包，此方法也變得繁瑣，並導致各種錯誤，其中 JavaScript 包裝物件會被過早地收集，從而導致它們被替換為空的 JS 包裝物件，並且會丟失所有屬性。

從 Chrome 57 開始，這種方法被跨組件追蹤所取代，這是一種通過從 JavaScript 到 DOM 的 C++ 實現再返回的方法來確定存活性的機制。我們在 C++ 端實現了增量追蹤，並使用寫屏障以避免我們在[先前的博客文章](/blog/orinoco-parallel-scavenger)中提到的世界停止式追蹤延滯。跨組件追蹤不僅提供了更好的延遲性能，還更好地近似了跨組件邊界的物件存活性，並修復了以前導致內存洩漏的幾個[場景](https://bugs.chromium.org/p/chromium/issues/detail?id=501866)。此外，它還使得 DevTools 得以提供實際呈現 DOM 的快照，如圖 3 所示。

試試看吧！我們很高興聽到您的反饋。
