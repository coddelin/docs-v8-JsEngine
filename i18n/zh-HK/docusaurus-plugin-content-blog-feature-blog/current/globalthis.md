---
title: "`globalThis`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-07-16
tags: 
  - ECMAScript
  - ES2020
  - Node.js 12
  - io19
description: "globalThis 提供了一個統一的機制來在任何 JavaScript 環境中訪問全域 `this`，無論腳本目標是什麼。"
tweet: "1151140681374547969"
---
如果你曾經為瀏覽器編寫 JavaScript，可能使用過 `window` 來訪問全域 `this`。在 Node.js 中，你可能使用過 `global`。如果你編寫了需要同時在這兩個環境中運作的代碼，可能會檢測哪個可用，然後使用它 —— 但隨著你要支持的環境和使用情境增加，需要檢查的標識符列表也會越來越長，事情很快就會變得難以控制：

<!--truncate-->
```js
// 嘗試獲取全域 `this` 的笨方法。不要這樣使用！
const getGlobalThis = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  // 注意：這仍然可能返回錯誤的結果！
  if (typeof this !== 'undefined') return this;
  throw new Error('無法找到全域 `this`');
};
const theGlobalThis = getGlobalThis();
```

有關為什麼上述方法是不足的（以及更複雜的技巧）的詳細說明，請閱讀 [_一個可怕的 `globalThis` polyfill 在通用 JavaScript 中_](https://mathiasbynens.be/notes/globalthis)。

[`globalThis` 提案](https://github.com/tc39/proposal-global) 引入了一個*統一的*機制，可以在任何 JavaScript 環境（瀏覽器、Node.js 或其他？）中訪問全域 `this`，無論腳本目標（經典腳本或模組？）。

```js
const theGlobalThis = globalThis;
```

請注意，現代代碼可能根本不需要訪問全域 `this`。通過 JavaScript 模組，你可以聲明式地 `import` 和 `export` 功能而不是處理全域狀態。`globalThis` 對於需要全域訪問的 polyfill 和其他庫依然有用。

## `globalThis` 支援

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-globalthis"></feature-support>
