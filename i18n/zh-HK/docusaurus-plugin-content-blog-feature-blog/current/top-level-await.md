---
title: '頂層`await`'
author: 'Myles Borins ([@MylesBorins](https://twitter.com/MylesBorins))'
avatars:
  - 'myles-borins'
date: 2019-10-08
tags:
  - ECMAScript
  - Node.js 14
description: '頂層`await`即將登陸 JavaScript 模組！您很快就能在非 async 函數中使用 `await`。'
tweet: '1181581262399643650'
---
[頂層`await`](https://github.com/tc39/proposal-top-level-await)使開發者能夠在 async 函數之外使用 `await` 關鍵字。它像是一個大的 async 函數，會讓其他`import`它的模組在開始評估它們的主體之前等待。

<!--truncate-->
## 舊的行為

當`async`/`await`首次引入時，試圖在`async`函數之外使用`await`會導致`SyntaxError`錯誤。許多開發者使用立即調用的 async 函數表達式來訪問該功能。

```js
await Promise.resolve(console.log('🎉'));
// → SyntaxError: await 僅在 async 函數中有效

(async function() {
  await Promise.resolve(console.log('🎉'));
  // → 🎉
}());
```

## 新的行為

使用頂層`await`，上述代碼在[模組](/features/modules)中按預期運行：

```js
await Promise.resolve(console.log('🎉'));
// → 🎉
```

:::note
**注意:** 頂層`await`僅在模組的頂層運行。它不支持經典腳本或非 async 函數。
:::

## 使用場景

以下使用場景來源於[規範提議資料庫](https://github.com/tc39/proposal-top-level-await#use-cases)。

### 動態依賴路徑

```js
const strings = await import(`/i18n/${navigator.language}`);
```

這允許模組在運行時使用值來決定依賴項。對於開發/生產分隔、國際化、環境分隔等非常有用。

### 資源初始化

```js
const connection = await dbConnector();
```

這允許模組表示資源，並且在模組無法使用的情況下生成錯誤。

### 依賴備選方案

下面的例子嘗試從 CDN A 加載一個 JavaScript 庫，如果失敗則回退到 CDN B：

```js
let jQuery;
try {
  jQuery = await import('https://cdn-a.example.com/jQuery');
} catch {
  jQuery = await import('https://cdn-b.example.com/jQuery');
}
```

## 模組執行順序

使用頂層`await`給 JavaScript 帶來的最大變化之一是模組圖中模組執行的順序。JavaScript 引擎以[後序遍歷](https://en.wikibooks.org/wiki/A-level_Computing/AQA/Paper_1/Fundamentals_of_algorithms/Tree_traversal#Post-order)執行模組：從模組圖的最左子樹開始，模組被評估，其綁定被導出，其兄弟模組被執行，然後是其父模組。該算法遞歸運行直到執行模組圖的根。

在頂層`await`之前，此順序始終是同步且確定性的：多次運行代碼時，模組圖保證以相同順序執行。一旦頂層`await`落地，仍然存在相同的保證，但僅限於不使用頂層`await`的情況。

以下是當模組中使用頂層`await`時會發生的情況：

1. 當前模組的執行被推遲，直到等待的 Promise 被解析。
1. 父模組的執行被推遲，直到調用`await`的子模組及其所有兄弟模組導出綁定。
1. 兄弟模組以及父模組的兄弟模組能夠以相同的同步順序繼續執行——假設模組圖中沒有循環或其他`await`的 Promise。
1. 調用`await`的模組在等待的 Promise 解析後恢復執行。
1. 父模組及後續的子樹在沒有其他`await`的 Promise 時繼續按同步順序執行。

## 這在 DevTools 中已經可行嗎？

確實如此！[Chrome DevTools](https://developers.google.com/web/updates/2017/08/devtools-release-notes#await)、[Node.js](https://github.com/nodejs/node/issues/13209) 和 Safari Web Inspector 的 REPL 已經支持頂層`await`一段時間了。然而，這些功能僅限於 REPL，且非標準！這與頂層`await`提議不同，該提議是語言規範的一部分，僅適用於模組。若要在符合規範提案語義的情況下測試依賴頂層`await`的生產代碼，請確保在實際應用中測試，而非僅僅在 DevTools 或 Node.js REPL 中測試！

## 頂層`await`是否會帶來風險？

或許您已經看過 [臭名昭著的 gist](https://gist.github.com/Rich-Harris/0b6f317657f5167663b493c722647221)，由 [Rich Harris](https://twitter.com/Rich_Harris) 提出，最初概述了對於頂層 `await` 的一些擔憂，並敦促 JavaScript 語言不要實現該特性。一些具體的擔憂包括：

- 頂層 `await` 可能會阻塞執行。
- 頂層 `await` 可能會阻塞資源的獲取。
- 對於 CommonJS 模組，沒有明確的互操作故事。

提案階段 3 版本直接解決了這些問題：

- 由於兄弟模組能夠執行，沒有明確的阻塞。
- 頂層 `await` 發生在模組圖的執行階段。在此時，所有資源已經被獲取和鏈接。不存在阻塞資源獲取的風險。
- 頂層 `await` 僅限於模組。明確不支持腳本或 CommonJS 模組。

如同任何新的語言特性，引入總是存在意外行為的風險。例如，使用頂層 `await` 時，環狀模組依賴可能會導致死鎖。

在沒有頂層 `await` 的情況下，JavaScript 開發者通常使用異步立即調用函數表達式來獲得 `await` 的訪問權。不幸的是，這種模式導致了模組圖的執行和應用程式靜態分析的可確定性降低。由於這些原因，頂層 `await` 的缺失被認為是一個更高的風險，勝過該特性帶來的危害。

## 頂層 `await` 的支持

<feature-support chrome="89 https://bugs.chromium.org/p/v8/issues/detail?id=9344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519100"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=202484"
                 nodejs="14"
                 babel="no https://github.com/babel/proposals/issues/44"></feature-support>
