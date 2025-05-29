---
title: '更快的非同步函式與 Promise'
author: 'Maya Armyanova（[@Zmayski](https://twitter.com/Zmayski)），永遠處於等待狀態的預測者，以及 Benedikt Meurer（[@bmeurer](https://twitter.com/bmeurer)），專業性能承諾者'
avatars:
  - 'maya-armyanova'
  - 'benedikt-meurer'
date: 2018-11-12 16:45:07
tags:
  - ECMAScript
  - 基準測試
  - 簡報
description: '更快且更易於除錯的非同步函式與 Promise 即將於 V8 v7.2 / Chrome 72 推出。'
tweet: '1062000102909169670'
---
JavaScript 中的非同步處理傳統上被認為速度並不特別快。更糟的是，對即時運行的 JavaScript 應用進行除錯——尤其是 Node.js 伺服器——並不容易，_特別是_涉及非同步程式時。不過幸運的是，時代正在改變。本文將探討我們如何在 V8（以及某種程度上其他 JavaScript 引擎）中優化非同步函式與 Promise，並描述我們如何改進非同步程式碼的除錯體驗。

<!--truncate-->
:::note
**注意：** 如果您更喜歡觀看簡報而不是閱讀文章，請欣賞下面的影片！否則，跳過影片繼續閱讀。
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/DFP5DKDQfOc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

## 非同步程式設計的新方法

### 從回呼到 Promise 再到非同步函式

在 Promise 成為 JavaScript 語言的一部分之前，基於回呼的 API 通常用於非同步程式碼，特別是在 Node.js 中。以下是一個範例：

```js
function handler(done) {
  validateParams((error) => {
    if (error) return done(error);
    dbQuery((error, dbResults) => {
      if (error) return done(error);
      serviceCall(dbResults, (error, serviceResults) => {
        console.log(result);
        done(error, serviceResults);
      });
    });
  });
}
```

以這種方式使用深層嵌套的回呼的特定模式通常被稱為_「回呼地獄」_，因為它使得程式碼的可讀性變差且難以維護。

幸運的是，現在 Promise 已經成為 JavaScript 語言的一部分，相同的程式碼可以用更優雅且更易於維護的方式撰寫：

```js
function handler() {
  return validateParams()
    .then(dbQuery)
    .then(serviceCall)
    .then(result => {
      console.log(result);
      return result;
    });
}
```

更近一步，JavaScript 獲得了[非同步函式](https://web.dev/articles/async-functions)的支援。上述的非同步程式碼現在可以用類似同步程式碼的方式撰寫：

```js
async function handler() {
  await validateParams();
  const dbResults = await dbQuery();
  const results = await serviceCall(dbResults);
  console.log(results);
  return results;
}
```

有了非同步函式，程式碼變得更加簡潔，並且控制和資料流也變得更加易於理解，儘管執行仍然是非同步的。（請注意 JavaScript 的執行仍然在單一執行緒中，這意味著非同步函式本身並未建立實際的執行緒。）

### 從事件監聽器回呼到非同步迭代

另一種在 Node.js 中特別常見的非同步範例是 [`ReadableStream`](https://nodejs.org/api/stream.html#stream_readable_streams)。以下是一個例子：

```js
const http = require('http');

http.createServer((req, res) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    res.write(body);
    res.end();
  });
}).listen(1337);
```

這段程式碼可能有一點難以理解：輸入的數據分塊處理僅在回呼內部可訪問，並且流的結尾訊號也是在回呼中處理。在忽略功能立即終止，以及實際處理必須發生在回呼中的情況下，很容易引入錯誤。

幸好，一個 ES2018 的新功能[非同步迭代](http://2ality.com/2016/10/asynchronous-iteration.html)可以簡化這段程式碼：

```js
const http = require('http');

http.createServer(async (req, res) => {
  try {
    let body = '';
    req.setEncoding('utf8');
    for await (const chunk of req) {
      body += chunk;
    }
    res.write(body);
    res.end();
  } catch {
    res.statusCode = 500;
    res.end();
  }
}).listen(1337);
```

與其將實際的請求處理邏輯放置在 `'data'` 和 `'end'` 回呼中，我們現在可以將所有邏輯放置在單一的非同步函式中，並使用新的 `for await…of` 迴圈來非同步地迭代這些分塊。我們還加入了一個 `try-catch` 區塊以避免 `unhandledRejection` 問題[^1]。

[^1]: 感謝 [Matteo Collina](https://twitter.com/matteocollina) 指引我們至 [此問題](https://github.com/mcollina/make-promises-safe/blob/master/README.md#the-unhandledrejection-problem)。

你現在就可以在生產環境中使用這些新功能了！異步函數在 **Node.js 8 (V8 v6.2 / Chrome 62)** 中已完全支持，而異步迭代器和生成器在 **Node.js 10 (V8 v6.8 / Chrome 68)** 中也已完全支持！

## 異步性能改進

我們在 V8 v5.5 (Chrome 55 & Node.js 7) 和 V8 v6.8 (Chrome 68 & Node.js 10) 之間，顯著提升了異步程式碼的性能。我們達到了這樣的性能水平，開發者可以安全地使用這些新的程式設計範式，而不用擔心速度問題。

![](/_img/fast-async/doxbee-benchmark.svg)

上圖顯示了 [doxbee 基準測試](https://github.com/v8/promise-performance-tests/blob/master/lib/doxbee-async.js)，該測試測量了大量使用 Promise 的程式碼性能。請注意，圖表顯示了執行時間，這意味著數值越低越好。

在 [parallel 基準測試](https://github.com/v8/promise-performance-tests/blob/master/lib/parallel-async.js)（專門針對 [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) 的性能進行測試）的結果更加令人興奮：

![](/_img/fast-async/parallel-benchmark.svg)

我們成功將 `Promise.all` 的性能提升了 **8 倍**。

然而，以上的基準測試是合成的微型基準測試。V8 團隊更關注我們的優化如何影響[實際用戶程式碼的真實性能](/blog/real-world-performance)。

![](/_img/fast-async/http-benchmarks.svg)

上圖展示了一些著名的 HTTP 中間件框架的性能測試結果，這些框架大量使用了 Promise 和 `async` 函數。請注意，此圖顯示了每秒處理的請求數，與前面的圖表不同，數值越高越好。從 Node.js 7 (V8 v5.5) 到 Node.js 10 (V8 v6.8)，這些框架的性能得到了顯著提高。

這些性能改進是以下三項關鍵成就的結果：

- [TurboFan](/docs/turbofan)，全新的優化編譯器 🎉
- [Orinoco](/blog/orinoco)，全新的垃圾回收器 🚛
- Node.js 8 中的一個 bug，該 bug 導致 `await` 跳過 microticks 🐛

當我們在 [Node.js 8](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367) 中[推出 TurboFan](/blog/launching-ignition-and-turbofan) 時，這使整體性能大大增強。

我們還一直在開發一個名為 Orinoco 的新垃圾回收器，該回收器將垃圾回收工作移至主執行緒之外，從而大大提升了請求處理性能。

最後但同樣重要的是，Node.js 8 中有一個有用的 bug，該 bug 導致 `await` 在某些情況下跳過 microticks，從而提升了性能。這個 bug 開始是規範違反，但後來給了我們一個優化的想法。我們先來解釋這個錯誤的行為：

:::note
**注意：**以下行為在撰文時按照 JavaScript 的規範是正確的。自那時以來，我們的規範提案已被接受，以下的“錯誤”行為現在是正確的。
:::

```js
const p = Promise.resolve();

(async () => {
  await p; console.log('after:await');
})();

p.then(() => console.log('tick:a'))
 .then(() => console.log('tick:b'));
```

上述程式碼創建了一個已完成的 Promise `p`，並 `await` 它的結果，同時還鏈接了兩個處理器到它上面。你期望以什麼順序執行 `console.log` 調用？

由於 `p` 已完成，你可能期望它先打印 `'after:await'`，然後是 `'tick'`。事實上，在 Node.js 8 中你會得到這樣的行為：

![Node.js 8 中的 `await` 錯誤](/_img/fast-async/await-bug-node-8.svg)

儘管此行為看起來很直觀，但根據規範，它並不正確。Node.js 10 實現了正確的行為，也就是首先執行鏈接的處理器，然後才繼續執行異步函數。

![Node.js 10 不再有 `await` 的錯誤](/_img/fast-async/await-bug-node-10.svg)

這種_“正確行為”_可以說並不馬上顯而易見，實際上對 JavaScript 開發者來說是令人驚訝的，因此值得說明。在進入 Promise 和異步函數的魔法世界之前，讓我們先了解一些基礎。

### 任務與微任務

在高層次來看，JavaScript 中有_任務_和_微任務_。任務處理 I/O 和計時器等事件，一次執行一個。微任務實現 `async`/`await` 和 Promise 的延遲執行，並在每個任務的結束執行。微任務隊列總是在執行返回到事件循環之前清空。

![微任務與任務之間的區別](/_img/fast-async/microtasks-vs-tasks.svg)

欲了解更多詳細信息，請查看 Jake Archibald 的 [瀏覽器中的任務、微任務、隊列和排程解釋](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/)。Node.js 的任務模型非常相似。

### Async 函數

根據 MDN 的說法，async 函數是一種利用隱式 Promise 以異步方式返回結果的函數。Async 函數旨在使異步代碼看起來像同步代碼一樣，從而隱藏開發者面臨的一些異步處理的複雜性。

最簡單的 async 函數看起來是這樣的：

```js
async function computeAnswer() {
  return 42;
}
```

當調用時，它返回一個 Promise，您可以像處理其他 Promise 一樣獲取其值。

```js
const p = computeAnswer();
// → Promise

p.then(console.log);
// 在下一個循環中輸出 42
```

您只能在下一次運行微任務時獲得該 Promise `p` 的值。換句話說，以上程序在語義上等同於使用 `Promise.resolve` 和該值：

```js
function computeAnswer() {
  return Promise.resolve(42);
}
```

async 函數的真正力量來自 `await` 表達式，該表達式會使函數執行暫停，直到 Promise 被解決，然後在 Promise 履行後恢復執行。`await` 的值是 Promise 履行後的值。以下是一個展示這一含義的例子：

```js
async function fetchStatus(url) {
  const response = await fetch(url);
  return response.status;
}
```

`fetchStatus` 的執行在 `await` 處被掛起，在 `fetch` 的 Promise 履行後繼續執行。這多少等價於將處理器鏈接到 `fetch` 返回的 Promise。

```js
function fetchStatus(url) {
  return fetch(url).then(response => response.status);
}
```

該處理器包含 async 函數中 `await` 之後的代碼。

通常您會向 `await` 傳遞一個 Promise，但您實際上可以等待任何任意 JavaScript 值。如果 `await` 後面的表達式的值不是 Promise，則它會被轉換為 Promise。這意味著如果您想這麼做，可以 `await 42`：

```js
async function foo() {
  const v = await 42;
  return v;
}

const p = foo();
// → Promise

p.then(console.log);
// 最終輸出`42`
```

更有趣的是，`await` 適用於任何 [`thenable`](https://promisesaplus.com/)，即任何擁有 `then` 方法的對象，即使它不是一個真正的 Promise。所以您可以實現有趣的事，例如一個測量實際睡眠時間的異步睡眠：

```js
class Sleep {
  constructor(timeout) {
    this.timeout = timeout;
  }
  then(resolve, reject) {
    const startTime = Date.now();
    setTimeout(() => resolve(Date.now() - startTime),
               this.timeout);
  }
}

(async () => {
  const actualTime = await new Sleep(1000);
  console.log(actualTime);
})();
```

讓我們看看 V8 根據 [規範](https://tc39.es/ecma262/#await) 在底層如何處理 `await`，以下是一個簡單的 async 函數 `foo`：

```js
async function foo(v) {
  const w = await v;
  return w;
}
```

調用時，它將參數 `v` 包裝成 Promise，並暫停 async 函數的執行，直到該 Promise 解決。一旦解決，函數的執行恢復，`w` 被分配為 Promise 履行的值。這個值隨後從 async 函數返回。

### `await` 的底層運行機制

首先，V8 將此函數標記為_可恢復_，這意味著可以暫停執行，然後在稍後恢復（在 `await` 點）。然後，它創建一個稱為 `implicit_promise`（隱式 Promise）的對象，該 Promise 是當您調用 async 函數時返回的，並最終解決為由 async 函數生成的值。

![簡單 async 函數與引擎將其轉化後的比較](/_img/fast-async/await-under-the-hood.svg)

然後來到有趣的部分：實際的 `await`。首先，傳遞給 `await` 的值被包裝成一個 Promise。接著，在被包裝的 Promise 上附加處理器，以便 Promise 履行後恢復函數的執行，而 async 函數的執行暫停，將 `implicit_promise` 返回給調用者。一旦 Promise 履行，async 函數的執行恢復，並使用 `promise` 的值 `w`，同時 `implicit_promise` 用 `w` 解決。

簡而言之，`await v` 的初始步驟是：

1. 將 `v`（傳遞給 `await` 的值）包裝成 Promise。
1. 附加處理器以便稍後恢復 async 函數。
1. 暫停 async 函數並將 `implicit_promise` 返回給調用者。

讓我們逐步解析各項操作。假設被 `await` 的值已經是一個 Promise，該 Promise 用值 `42` 履行。之後引擎會創建一個新的 `promise`，並使用被 `await` 的值對其進行解決。這個操作在下一次輪轉中對這些 Promise 的延遲鏈接進行表達，根據規範稱為 [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob)。

![](/_img/fast-async/await-step-1.svg)

然後，執行引擎創建另一個所謂的 `throwaway`（一次性）Promise。之所以稱為「一次性」，是因為它從來不會被鏈接到其他東西——它完全是執行引擎內部的操作。這個 `throwaway` Promise 然後會被鏈接到 `promise` 上，並帶上適當的處理器以恢復異步函數的執行。這個 `performPromiseThen` 操作基本上就是 [`Promise.prototype.then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) 背後的實現方式。最後，異步函數的執行被掛起，控制權返回給函數調用者。

![](/_img/fast-async/await-step-2.svg)

執行會回到調用者，最終調用堆疊變空。然後，JavaScript 引擎開始運行微任務：它執行之前安排的 [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob)，該任務會安排一個新的 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) 將 `promise` 鏈接到傳遞給 `await` 的值上。然後，引擎返回到微任務隊列的處理，因為微任務隊列必須在主事件循環繼續之前清空。

![](/_img/fast-async/await-step-3.svg)

接下來是 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)，它使用我們正在 `await` 的 Promise 的值來履行 `promise` —— 在此例中是 `42` —— 並將這個反應添加到 `throwaway` Promise 上。然後，引擎再次返回到微任務循環，裡面包含最後一個待處理的微任務。

![](/_img/fast-async/await-step-4-final.svg)

現在第二個 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) 將解決方案傳遞給 `throwaway` Promise，並恢復異步函數的掛起執行，從 `await` 返回值 `42`。

![`await` 開銷的總結圖表](/_img/fast-async/await-overhead.svg)

總結我們學到的內容，每個 `await` 都要求執行引擎創建**兩個額外的** Promise（即使右側已經是一個 Promise），並且需要**至少三個**微任務隊列計數。誰會想到一個簡單的 `await` 表達式竟然會帶來這麼大的開銷？！

![](/_img/fast-async/await-code-before.svg)

讓我們來看看這些開銷是從哪裡來的。第一行負責創建包裝 Promise。第二行立即用 `await` 的值 `v` 解決該 Promise。這兩行引入了一個額外的 Promise 和三個微任務計數中的兩個。如果 `v` 已經是一個 Promise（這是最常見的情況，因為應用通常會 `await` 在 Promise 上），這就會相當昂貴。在開發者少見地 `await` 例如 `42` 這種值的情況下，引擎仍須將此值包裝為一個 Promise。

事實證明，在規範中已經存在一個 [`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve) 操作，它僅在需要時執行包裝操作：

![](/_img/fast-async/await-code-comparison.svg)

此操作會將 Promise 保持不變，並僅按需將其他值包裝為 Promise。這樣，就可以為傳遞給 `await` 的值已經是 Promise 的常見情況節省一個額外的 Promise，並加速兩次微任務隊列計數。在 V8 v7.2 中，[此新行為已默認啟用](/blog/v8-release-72#async%2Fawait)。對於 V8 v7.1，可以使用 `--harmony-await-optimization` 標誌啟用新行為。我們已[建議將該更改添加到 ECMAScript 規範中](https://github.com/tc39/ecma262/pull/1250)。

以下是新改進的 `await` 的工作方式，它背後的分步操作：

![](/_img/fast-async/await-new-step-1.svg)

假設我們再次 `await` 一個已履行為 `42` 的 Promise。由於 [`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve) 的神奇，`promise` 現在僅引用與 `v` 相同的 Promise，因此這一步不需要執行任何操作。之後，執行引擎就和以前完全一樣，創建 `throwaway` Promise，安排一個 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) 在微任務隊列的下一次節拍中恢復異步函數，掛起函數的執行，並返回調用者。

![](/_img/fast-async/await-new-step-2.svg)

最終當所有 JavaScript 執行完成後，執行引擎開始運行微任務，因此它會執行 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)。這個任務將 `promise` 的解決傳遞給 `throwaway`，並恢復異步函數的執行，從 `await` 得到結果 `42`。

![`await` 開銷減少的總結圖表](/_img/fast-async/await-overhead-removed.svg)

這項優化避免了當傳遞給 `await` 的值已經是一個 Promise 時，必須創建一個包裝 Promise 的必要性，在這種情況下，我們從至少**三個**微任務計數降至只有**一個**。這種行為類似於 Node.js 8 中的情況，但現在它不再是一個錯誤——而是一個正在標準化的優化！

令人感覺奇怪的是，儘管 `throwaway` Promise 完全是執行引擎內部的實現，但執行引擎仍須創建該 Promise。事實證明，`throwaway` Promise 只是用於滿足規範中內部 `performPromiseThen` 操作的 API 約束。

![](/_img/fast-async/await-optimized.svg)

這個問題最近已在ECMAScript規範的一次[編輯性修改](https://github.com/tc39/ecma262/issues/694)中得到了處理。引擎在大多數情況下[^2]已不再需要為`await`創建`throwaway` promise。

[^2]: 如果在Node.js中使用[`async_hooks`](https://nodejs.org/api/async_hooks.html)，V8仍需要創建`throwaway` promise，因為`before`和`after`鉤子是在`throwaway` promise的上下文中運行的。

![對比優化前後`await`代碼的對比圖](/_img/fast-async/node-10-vs-node-12.svg)

將Node.js 10中的`await`與可能出現在Node.js 12中的經優化的`await`進行比較，可以顯示出此更改的性能影響：

![](/_img/fast-async/benchmark-optimization.svg)

**現在`async`/`await`的性能已超過手寫的Promise代碼**。這裡的主要結論是我們顯著減少了異步函數的開銷——這不僅限於V8，而且跨所有JavaScript引擎皆適用，這得益於規範的修補。

**更新：** 從V8 v7.2和Chrome 72開始，`--harmony-await-optimization`默認已啟用。[該補丁](https://github.com/tc39/ecma262/pull/1250)已被合併到ECMAScript規範中。

## 改善的開發者體驗

除了性能之外，JavaScript開發者還關注診斷和修復問題的能力，而這在處理異步代碼時並不總是容易的。[Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)支持*異步調用棧追踪*，即包含當前同步棧部分及異步部分的調用棧：

![](/_img/fast-async/devtools.png)

這在本地開發過程中是一個非常有用的功能。然而，這種方法在應用程序部署後並不能真正幫助到你。在事後調試時，你只能在日誌文件中看到`Error#stack`的輸出，這並不能告訴你有關異步部分的任何信息。

我們最近在研究[*零成本異步棧追踪*](https://bit.ly/v8-zero-cost-async-stack-traces)，它為`Error#stack`屬性增加了對異步函數調用的支持。“零成本”聽起來很令人激動，不是嗎？那麼當Chrome DevTools功能有顯著開銷時，它怎麼能是零成本的呢？考慮以下場景，其中`foo`異步調用了`bar`，而`bar`在使用`await`等待一個Promise後拋出了異常：

```js
async function foo() {
  await bar();
  return 42;
}

async function bar() {
  await Promise.resolve();
  throw new Error('BEEP BEEP');
}

foo().catch(error => console.log(error.stack));
```

在Node.js 8或Node.js 10中運行此代碼會導致以下輸出：

```text/2
$ node index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
```

注意，雖然調用`foo()`導致了錯誤，但`foo`完全不在調用棧中。這使得JavaScript開發者在事後調試時變得困難，無論你的代碼是部署在Web應用程序中還是部署在某些雲容器內。

這裡有趣的一點是引擎知道它在`bar`完成後需要從哪裡繼續：即`foo`函數中的`await`之後的地方。巧合的是，那也是函數`foo`被暫停的地方。引擎可以使用此信息來重構異步調用棧的部分，主要是`await`出現的位置。有了這些更改，輸出變為：

```text/2,7
$ node --async-stack-traces index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
    at async foo (index.js:2:3)
```

在調用棧中，最頂部的函數最先出現，其後是剩餘的同步調用棧，最後是函數`foo`中異步調用`bar`的部分。此更改在V8中通過新引入的`--async-stack-traces`標誌實現。**更新：** 自V8 v7.3起，`--async-stack-traces`默認已啟用。

不過，如果你將此與上面 Chrome Developer Tools 中的非同步堆疊跟蹤進行比較，你會注意到堆疊跟蹤中非同步部分缺少實際的 `foo` 調用位置。如前所述，這種方法利用了 `await` 的恢復和暫停位置是相同的這一事實 —— 但對於普通的 [`Promise#then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) 或 [`Promise#catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch) 調用，情況並非如此。更多背景知識可閱讀 Mathias Bynens 的解釋：[為什麼 `await` 勝過 `Promise#then()`](https://mathiasbynens.be/notes/async-stack-traces)。

## 結論

我們通過兩項重大優化使非同步函數更快：

- 移除了兩個額外的微刻，及
- 移除了 `throwaway` 承諾。

除此之外，我們通過[*零成本非同步堆疊跟蹤*](https://bit.ly/v8-zero-cost-async-stack-traces) 改善了開發者的體驗，該特性可與非同步函數中的 `await` 和 `Promise.all()` 一起使用。

我們還為 JavaScript 開發者提供了一些不錯的性能建議：

- 優先使用 `async` 函數和 `await`，而不是手寫的承諾代碼，及
- 遵循 JavaScript 引擎提供的本地承諾實現，以受益於快捷方式，例如，避免 `await` 的兩個微刻。
