---
title: "JavaScript&apos;s 新超能力：顯式資源管理"
author: &apos;Rezvan Mahdavi Hezaveh&apos;
avatars:
  - &apos;rezvan-mahdavi-hezaveh&apos;
date: 2025-05-09
tags:
  - ECMAScript
description: &apos;「顯式資源管理提案」使開發者能夠顯式管理資源的生命週期。&apos;
tweet: &apos;&apos;
---

「顯式資源管理提案」引入了一種確定性的方法，用於顯式管理資源的生命週期，比如檔案控制代碼、網絡連線等。該提案帶來了以下新增功能：`using` 和 `await using` 聲明，可在資源超出作用域時自動呼叫 dispose 方法；`[Symbol.dispose]()` 和 `[Symbol.asyncDispose]()` 符號，用於清理操作；兩個全新的全域物件 `DisposableStack` 和 `AsyncDisposableStack` 作為容器以匯總可清除的資源；以及 `SuppressedError`，作為一種新的錯誤類型（包含最近拋出的錯誤及被抑制的錯誤），用於解決在處置資源期間出現錯誤可能掩蓋既存錯誤的情況，或者另一資源的處置過程中拋出的錯誤。這些新增功能使開發者能夠通過細粒度的資源處置控制撰寫更可靠、高效且可維護的代碼。

<!--truncate-->
## `using` 和 `await using` 聲明

「顯式資源管理提案」的核心在於 `using` 和 `await using` 聲明。`using` 聲明是為同步資源設計的，確保在聲明所在的作用域退出時呼叫可清除資源的 `[Symbol.dispose]()` 方法。而對於非同步資源，`await using` 聲明作用相似，但保證呼叫 `[Symbol.asyncDispose]()` 方法並等待其結果，從而支援非同步清理操作。這種區分使開發者能夠可靠地管理同步和非同步資源，防止資源洩漏並改善整體代碼質量。`using` 和 `await using` 關鍵字可以用於大括號 `{}` 中（例如塊級、for 循環與函數體），但不能用於頂層。

例如，當使用 [`ReadableStreamDefaultReader`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader) 時，呼叫 `reader.releaseLock()` 以解鎖流並使其可以被其他地方使用是至關重要的。然而，錯誤處理引發了一個常見問題：如果在讀取過程中出現錯誤並且您忘記在錯誤傳播之前呼叫 `releaseLock()`，則流保持鎖定狀態。我們先從一個簡單的例子說起：

```javascript
let responsePromise = null;

async function readFile(url) {  
    if (!responsePromise) {
        // 只在尚未生成 Promise 時進行抓取
        responsePromise = fetch(url);
    }
    const response = await responsePromise;
    if (!response.ok) {
      throw new Error(`HTTP 錯誤！狀態碼: ${response.status}`);
    }
    const processedData = await processData(response);

    // 用 processedData 做一些事情
    ...
 }

async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // 處理數據並將結果保存於 processedData
            ...
            // 這裡拋出錯誤！
        }
    }
    
    // 由於錯誤在本行之前拋出，流仍保持鎖定。
    reader.releaseLock(); 

    return processedData;
  }
 
 readFile(&apos;https://example.com/largefile.dat&apos;);
```

因此，在使用流時，開發者需要確保有 `try...finally` 塊並將 `reader.releaseLock()` 放在 `finally` 中。此模式保證始終呼叫 `reader.releaseLock()`。

```javascript
async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    try {
        while (!done) {
            ({ done, value } = await reader.read());
            if (value) {
                // 處理數據並將結果保存於 processedData
                ...
                // 這裡拋出錯誤！
            }
        }
    } finally {
        // 始終釋放 reader 對流的鎖定。
        reader.releaseLock();
    }

    return processedData;
  }
 
 readFile(&apos;https://example.com/largefile.dat&apos;);
```

寫這段程式碼的另一種替代方法是建立一個名為 `readerResource` 的可釋放物件，它擁有 reader (`response.body.getReader()`) 和一個 `[Symbol.dispose]()` 方法，該方法會呼叫 `this.reader.releaseLock()`。`using` 宣告確保當程式碼塊退出時會自動呼叫 `readerResource[Symbol.dispose]()`，因此不再需要記得手動呼叫 `releaseLock`，因為 `using` 宣告已經處理了這部分工作。在未來，像是流這樣的 Web API 可能會整合 `[Symbol.dispose]` 和 `[Symbol.asyncDispose]`，開發者就不需要手動編寫包裝物件了。

```javascript
 async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;

    // 將 reader 包裹在一個可釋放資源中
    using readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
        },
    };
    const { reader } = readerResource;

    let done = false;
    let value;
    let processedData;
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // 處理數據並將結果儲存到 processedData 中
            ...
            // 這裡會拋出一個錯誤！
        }
    }
    return processedData;
  }
 // readerResource[Symbol.dispose]() 會自動被呼叫。

 readFile(&apos;https://example.com/largefile.dat&apos;);
```

## `DisposableStack` 與 `AsyncDisposableStack`

為了進一步方便管理多個可釋放資源，該提案引入了 `DisposableStack` 與 `AsyncDisposableStack`。這些基於堆疊的結構允許開發者以協調的方式組合並釋放多個資源。資源會被新增到堆疊中，當堆疊被同步或非同步釋放時，資源會以相反的順序被釋放，確保它們之間的相依關係被正確處理。在處理涉及多個相關資源的複雜場景時，這簡化了清理過程。這兩種結構提供了 `use()`、`adopt()` 和 `defer()` 等方法來新增資源或釋放行為，並提供 `dispose()` 或 `asyncDispose()` 方法來觸發清理操作。`DisposableStack` 和 `AsyncDisposableStack` 分別具有 `[Symbol.dispose]()` 和 `[Symbol.asyncDispose]()`，因此可以與 `using` 和 `await using` 關鍵字一起使用。它們提供了一種在定義的範圍內管理多資源釋放的強大方式。

讓我們看看每個方法，並看一個範例：

`use(value)` 將資源新增到堆疊頂部。

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log(&apos;Reader lock released.&apos;);
        },
    };
    using stack = new DisposableStack();
    stack.use(readerResource);
}
// Reader lock released.
```

`adopt(value, onDispose)` 新增一個不可釋放資源及一個釋放回呼函式到堆疊頂部。

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader => {
        reader.releaseLock();
        console.log(&apos;Reader lock released.&apos;);
      });
}
// Reader lock released.
```

`defer(onDispose)` 新增一個釋放回呼函式到堆疊頂部。它對於新增與資源無關的清理行為非常有用。

```javascript
{
    using stack = new DisposableStack();
    stack.defer(() => console.log("done."));
}
// done.
```

`move()` 將當前堆疊中的所有資源移動到新的 `DisposableStack` 中。如果需要將資源的所有權轉移到程式碼的另一部分，這會很有用。

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader => {
        reader.releaseLock();
        console.log(&apos;Reader lock released.&apos;);
      });
    using newStack = stack.move();
}
// 此時僅剩下 newStack，且內部資源將被釋放。
// Reader lock released.
```

`dispose()` 在 DisposableStack 中以及 `disposeAsync()` 在 AsyncDisposableStack 中釋放這個物件內的資源。

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log(&apos;Reader lock released.&apos;);
        },
    };
    let stack = new DisposableStack();
    stack.use(readerResource);
    stack.dispose();
}
// Reader lock released.
```

## 可用性

顯式資源管理已於 Chromium 134 和 V8 v13.8 中發佈。

## 顯式資源管理支援

<feature-support chrome="134 https://chromestatus.com/feature/5071680358842368"
                 firefox="134 (nightly) https://bugzilla.mozilla.org/show_bug.cgi?id=1927195"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=248707" 
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#explicit-resource-management"></feature-support>
