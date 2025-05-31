---
title: "弱引用與終結器"
author: "Sathya Gunasekaran ([@_gsathya](https://twitter.com/_gsathya)), Mathias Bynens ([@mathias](https://twitter.com/mathias)), Shu-yu Guo ([@_shu](https://twitter.com/_shu)), 和 Leszek Swirski ([@leszekswirski](https://twitter.com/leszekswirski))"
avatars: 
- "sathya-gunasekaran"
- "mathias-bynens"
- "shu-yu-guo"
- "leszek-swirski"
date: 2019-07-09
updated: 2020-06-19
tags: 
  - ECMAScript
  - ES2021
  - io19
  - Node.js 14
description: "弱引用與終結器即將加入 JavaScript！本文將解釋這項新功能。"
tweet: "1148603966848151553"
---
通常，在 JavaScript 中對物件的引用是 _強引用_，這意味著只要你擁有對該物件的引用，它就不會被垃圾回收機制回收。

```js
const ref = { x: 42, y: 51 };
// 只要你能訪問 `ref`（或者其他任何對同一物件的引用），該物件就不會被垃圾回收機制回收。
```

目前，`WeakMap` 和 `WeakSet` 是 JavaScript 中唯一可以弱引用物件的方式：將物件作為 `WeakMap` 或 `WeakSet` 的鍵添加，並不會防止該物件被垃圾回收機制回收。

```js
const wm = new WeakMap();
{
  const ref = {};
  const metaData = 'foo';
  wm.set(ref, metaData);
  wm.get(ref);
  // → metaData
}
// 在這個區塊範圍內，我們不再有對 `ref` 的引用，因此它
// 現在可以被垃圾回收機制回收，儘管它是 `wm` 的一個鍵
// 且我們仍然可以訪問 `wm`。

<!--truncate-->
const ws = new WeakSet();
{
  const ref = {};
  ws.add(ref);
  ws.has(ref);
  // → true
}
// 在這個區塊範圍內，我們不再有對 `ref` 的引用，因此它
// 現在可以被垃圾回收機制回收，儘管它是 `ws` 的一個鍵
// 且我們仍然可以訪問 `ws`。
```

:::note
**注意：** 你可以將 `WeakMap.prototype.set(ref, metaData)` 理解為對物件 `ref` 新增一個值為 `metaData` 的屬性：只要你有對該物件的引用，就能取得該元資料。一旦你不再擁有對該物件的引用，即使你仍然擁有對該 `WeakMap` 的引用，物件仍可以被垃圾回收機制回收。同樣地，你可以將 `WeakSet` 理解為 `WeakMap` 的特例，其中所有的值為布林值。

JavaScript 的 `WeakMap` 並不是真正的 _弱引用_：只要鍵還存活，它實際上會 _強引用_ 其內容。只有當鍵被垃圾回收機制回收時，`WeakMap` 才會對其內容做弱引用。此類關係更準確的名稱是 [_短命物件（ephemeron）_](https://en.wikipedia.org/wiki/Ephemeron)。
:::

`WeakRef` 是更高級的 API，提供真正的弱引用，允許你窺探物件的生命週期。讓我們一起來看一個範例。

在這個範例中，假設我們正在開發一個使用 WebSocket 與伺服器通信的聊天網路應用程式。想像一個 `MovingAvg` 類別，為了性能診斷的目的，它保留來自 WebSocket 的一組事件，用於計算簡單的延遲移動平均值。

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener('message', this.listener);
  }

  compute(n) {
    // 計算最後 n 個事件的簡單移動平均值。
    // …
  }
}
```

它被用於一個 `MovingAvgComponent` 類別，讓你可以控制何時開始和停止監控延遲的簡單移動平均值。

```js
class MovingAvgComponent {
  constructor(socket) {
    this.socket = socket;
  }

  start() {
    this.movingAvg = new MovingAvg(this.socket);
  }

  stop() {
    // 允許垃圾回收機制回收記憶體。
    this.movingAvg = null;
  }

  render() {
    // 進行渲染。
    // …
  }
}
```

我們知道，在實例 `MovingAvg` 中保留所有伺服器消息會佔用很多記憶體，因此當監控停止時，我們特別把 `this.movingAvg` 設為 null，讓垃圾回收機制回收記憶體。

然而，在 DevTools 的記憶體面板檢查後，我們發現記憶體根本沒有被回收！經驗豐富的網頁開發者可能已經注意到這個問題：事件監聽器是強引用，必須明確移除。

讓我們用可達性圖解來清楚說明這件事。呼叫 `start()` 後，我們的物件圖解如下，實線箭頭表示強引用。從 `MovingAvgComponent` 實例出發經由實線箭頭可到達的所有東西都無法被垃圾回收機制回收。

![](/_img/weakrefs/after-start.svg)

呼叫 `stop()` 後，我們已經移除了 `MovingAvgComponent` 實例到 `MovingAvg` 實例的強引用，但還沒有移除通過 Socket 的監聽器的引用。

![](/_img/weakrefs/after-stop.svg)

因此，在 `MovingAvg` 實例中的監聽器，由於引用了 `this`，會使整個實例保持存活，直到事件監聽器被移除。

到目前為止，解決方案是通過 `dispose` 方法手動註銷事件監聽器。

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener('message', this.listener);
  }

  dispose() {
    this.socket.removeEventListener('message', this.listener);
  }

  // …
}
```

這個方法的缺點是需要手動管理記憶體。`MovingAvgComponent` 和所有其他使用 `MovingAvg` 類的用戶都必須記住調用 `dispose` 方法，否則就會導致記憶體洩漏。更糟糕的是，手動記憶體管理是級聯的：`MovingAvgComponent` 的使用者必須記住調用 `stop` 方法，否則就會導致記憶體洩漏，以此類推。應用程式的行為不依賴於此診斷類的事件監聽器，且該監聽器在記憶體使用方面代價昂貴，但在計算方面負擔不大。我們真正需要的是使監聽器的生命週期與 `MovingAvg` 實例邏輯上綁定，以便可以像其他 JavaScript 對象一樣自動由垃圾回收器回收記憶體。

`WeakRef` 使得通過創建實際事件監聽器的 _弱引用_ 來解決這個問題成為可能，並將該 `WeakRef` 包裝在一個外層事件監聽器中。這樣，垃圾回收器可以清理實際事件監聽器以及它保持活著的記憶體，比如 `MovingAvg` 實例及其 `events` 陣列。

```js
function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener);
  const wrapper = (ev) => { weakRef.deref()?.(ev); };
  socket.addEventListener('message', wrapper);
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); };
    addWeakListener(socket, this.listener);
  }
}
```

:::note
**注意：** 必須謹慎對待指向函數的 `WeakRef`。JavaScript 函數是[閉包](https://en.wikipedia.org/wiki/Closure_(computer_programming))，並且會強引用其外部環境，這些外部環境包含了函數內部引用的自由變量的值。這些外部環境可能包含其他閉包也引用的變量。也就是說，在處理閉包時，它們的記憶體通常以隱晦的方式被其他閉包強引用。這就是為什麼 `addWeakListener` 是一個單獨的函數，而 `wrapper` 並非 `MovingAvg` 的構造函數內部的局部變量。在 V8 中，如果 `wrapper` 是位於 `MovingAvg` 的構造函數內部，並且與 `WeakRef` 中封裝的監聽器共享詞法範圍，則 `MovingAvg` 實例及其所有屬性感都可通過封裝的環境從 `wrapper` 監聽器中被訪問，導致該實例不可回收。在寫代碼時，請記住這一點。
:::

我們首先創建事件監聽器並將其賦值給 `this.listener`，使其被 `MovingAvg` 實例強引用。換句話說，只要 `MovingAvg` 實例存在，事件監聽器也會存在。

然後，在 `addWeakListener` 中，我們創建一個目標是實際事件監聽器的 `WeakRef`。在 `wrapper` 中，我們進行 `deref`。因為如果目標沒有其他強引用，`WeakRef` 不會阻止目標被垃圾回收，我們必須手動解引用以獲取目標。如果此期間目標已被垃圾回收，`deref` 返回 `undefined`。否則，返回原始目標，也就是我們使用[可選鍊](/features/optional-chaining)調用的 `listener` 函數。

由於事件監聽器被包含在 `WeakRef` 中，對它的唯一強引用是 `MovingAvg` 實例上的 `listener` 屬性。也就是說，我們成功地將事件監聽器的生命週期繫結到 `MovingAvg` 實例的生命週期。

回到可達性圖，調用 `start()` 並使用 `WeakRef` 實現之後，我們的對象圖如下，其中虛線箭頭表示弱引用。

![](/_img/weakrefs/weak-after-start.svg)

調用 `stop()` 之後，我們移除了對監聽器的唯一強引用：

![](/_img/weakrefs/weak-after-stop.svg)

最終，垃圾回收發生後，`MovingAvg` 實例與監聽器將被回收：

![](/_img/weakrefs/weak-after-gc.svg)

但這裡仍然有個問題：我們通過包裝 `WeakRef` 為 `listener` 添加了一個間接層，但 `addWeakListener` 中的 `wrapper` 仍然因為 `listener` 最初洩漏的原因而洩漏。當然這是一個較小的洩漏，因為只有 `wrapper` 洩漏，而不是整個 `MovingAvg` 實例，但它仍然是洩漏。解決此問題的方法是與 `WeakRef` 搭配使用的功能 `FinalizationRegistry`。使用新的 `FinalizationRegistry` API，我們可以註冊回調，以在垃圾回收器清除註冊對象時執行該回調。此類回調稱為 _終結器_。

:::note
**注意：** 在垃圾回收事件監聽器後，最終化回調不會立即執行，因此不要將其用於重要邏輯或指標。垃圾回收和最終化回調的執行時機並未指定。實際上，一個永遠不垃圾回收的引擎也會完全符合規範。然而，可以安全地假設引擎_會_進行垃圾回收，並且最終化回調會在稍後的某個時間被調用，除非環境被丟棄（例如標籤頁關閉或工作者終止）。在編寫代碼時請記住這種不確定性。
:::

我們可以通過 `FinalizationRegistry` 註冊一個回調，在內部事件監聽器被垃圾回收時從 socket 上移除 `wrapper`。我們的最終實現如下所示：

```js
const gListenersRegistry = new FinalizationRegistry(({ socket, wrapper }) => {
  socket.removeEventListener('message', wrapper); // 6
});

function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener); // 2
  const wrapper = (ev) => { weakRef.deref()?.(ev); }; // 3
  gListenersRegistry.register(listener, { socket, wrapper }); // 4
  socket.addEventListener('message', wrapper); // 5
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); }; // 1
    addWeakListener(socket, this.listener);
  }
}
```

:::注意
**注意：** `gListenersRegistry` 是一個全局變量，以確保最終化器被執行。一個 `FinalizationRegistry` 不會因為有註冊在其上的對象而被保持活動。如果一個登記器本身被垃圾回收，其最終化器可能不會執行。
:::

我們創建了一個事件監聽器並將其分配給 `this.listener`，以便它被 `MovingAvg` 實例強引用(1)。然後我們將執行工作的事件監聽器包裝在 `WeakRef` 中，使其可被垃圾回收，並避免通過 `this` 間接保留對 `MovingAvg` 實例的引用(2)。我們創建了一個包裝器，對 `WeakRef` 進行 `deref` 檢查其是否仍然存活，如果存活則調用它(3)。我們將內部監聽器註冊到 `FinalizationRegistry`，並傳遞持有值 `{ socket, wrapper }` 到註冊中(4)。然後我們將返回的包裝器添加為 `socket` 的事件監聽器(5)。在 `MovingAvg` 實例和內部監聽器被垃圾回收後的某個時間，最終化器可能會運行，並接收到傳遞的持有值。在最終化器內部，我們還移除了包裝器，使得與使用 `MovingAvg` 實例相關的所有內存都可以被垃圾回收(6)。

通過這一切，我們的 `MovingAvgComponent` 原始實現既不會導致內存洩漏，也不需要任何手動處理。

## 別過度使用

在了解這些新功能後，可能會想要對所有東西使用 `WeakRef` 。然而，這可能不是個好主意。有些情況明確地_不是_使用 `WeakRef` 和最終化器的好用例。

一般來說，避免撰寫依賴於垃圾回收器在任何可預測時間內清理 `WeakRef` 或調用最終化器的代碼 — [這是不可能的](https://github.com/tc39/proposal-weakrefs#a-note-of-caution)！此外，對象是否可被垃圾回收可能取決於實現細節，例如閉包的表示方式，這些細節既微妙又可能在不同的 JavaScript 引擎間以及相同引擎的不同版本間有所不同。具體來說，最終化回調：

- 可能不會在垃圾回收後立即發生。
- 可能不會按照實際垃圾回收的順序發生。
- 可能完全不發生，例如瀏覽器窗口關閉時。

因此，不要在最終化器的代碼路徑中放置重要邏輯。它們對於響應垃圾回收進行清理很有用，但不能可靠地用於記錄有意義的內存使用指標。對於此用例，請參見 [`performance.measureUserAgentSpecificMemory`](https://web.dev/monitor-total-page-memory-usage/)。

`WeakRef` 和最終化器可以幫助您節省內存，當作為進一步增強的手段時使用效果最佳。由於它們是高級用戶功能，我們預計大多數使用情況會出現在框架或庫中。

## `WeakRef` 支持

<feature-support chrome="74 https://v8.dev/blog/v8-release-84#weak-references-and-finalizers"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1561074"
                 safari="no"
                 nodejs="14.6.0"
                 babel="no"></feature-support>
