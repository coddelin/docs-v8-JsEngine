---
title: &apos;動態 `import()`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-11-21
tags:
  - ECMAScript
  - ES2020
description: &apos;動態 import() 相較於靜態 import 解鎖了新功能。本文比較了兩者並概述了新功能。&apos;
tweet: &apos;932914724060254208&apos;
---
[動態 `import()`](https://github.com/tc39/proposal-dynamic-import) 引入了一種新的類函數形式的 `import`，相較於靜態 `import` 解鎖了新的功能。本文比較了兩者並概述了新功能。

<!--truncate-->
## 靜態 `import` (回顧)

Chrome 61 支援 ES2015 `import` 語句，用於 [模塊](/features/modules)。

以下是位於 `./utils.mjs` 的模塊：

```js
// 預設導出
export default () => {
  console.log(&apos;來自預設導出的問候！&apos;);
};

// 命名導出 `doStuff`
export const doStuff = () => {
  console.log(&apos;正在處理…&apos;);
};
```

以下是如何靜態導入和使用 `./utils.mjs` 模塊：

```html
<script type="module">
  import * as module from &apos;./utils.mjs&apos;;
  module.default();
  // → 日誌 &apos;來自預設導出的問候！&apos;
  module.doStuff();
  // → 日誌 &apos;正在處理…&apos;
</script>
```

:::note
**注意：** 上面的例子使用了 `.mjs` 擴展名來表示它是一個模塊，而不是普通腳本。在 Web 上，只要文件以正確的 MIME 類型（如 JavaScript 文件的 `text/javascript`）在 `Content-Type` HTTP 標頭中提供，文件的擴展名並不重要。

`.mjs` 擴展名在其他平台（如 [Node.js](https://nodejs.org/api/esm.html#esm_enabling) 和 [`d8`](/docs/d8)）中特別有用，因為這些地方沒有 MIME 類型或其他強制性掛鉤（如 `type="module"`）來區分模塊和普通腳本。我們在這裡使用相同的擴展名以保持跨平台的一致性並明確區分模塊和普通腳本。
:::

這種導入模塊的語法形式是一種 *靜態* 聲明：它只接受字符串常量作為模塊指定符，並通過運行時前的“鏈接”過程將綁定引入本地作用域。靜態 `import` 語法只能用於文件的頂層。

靜態 `import` 支援靜態分析、打包工具、樹搖等重要用例。

在某些場合，可能需要：

- 按需（或有條件地）導入模塊
- 在運行時計算模塊指定符
- 從普通腳本中（而不是模塊）導入模塊

上述情況均無法使用靜態 `import`。

## 動態 `import()` 🔥

[動態 `import()`](https://github.com/tc39/proposal-dynamic-import) 引入了一個類函數形式的 `import`，滿足了這些用例。`import(moduleSpecifier)` 返回一個請求模塊命名空間對象的承諾，該對象是在獲取、實例化和評估模塊及其所有依賴項後創建的。

以下是如何動態導入和使用 `./utils.mjs` 模塊的方式：

```html
<script type="module">
  const moduleSpecifier = &apos;./utils.mjs&apos;;
  import(moduleSpecifier)
    .then((module) => {
      module.default();
      // → 日誌 &apos;來自預設導出的問候！&apos;
      module.doStuff();
      // → 日誌 &apos;正在處理…&apos;
    });
</script>
```

由於 `import()` 返回的是承諾，因此可以使用 `async`/`await` 替代基於 `then` 的回調樣式：

```html
<script type="module">
  (async () => {
    const moduleSpecifier = &apos;./utils.mjs&apos;;
    const module = await import(moduleSpecifier)
    module.default();
    // → 日誌 &apos;來自預設導出的問候！&apos;
    module.doStuff();
    // → 日誌 &apos;正在處理…&apos;
  })();
</script>
```

:::note
**注意：** 雖然 `import()` 看起來像是一個函數調用，但它被指定為 *語法*，只是恰好使用了括號（類似於 [`super()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super)）。這意味著 `import` 不繼承自 `Function.prototype`，因此您無法對其使用 `call` 或 `apply`，例如 `const importAlias = import` 是不起作用的。實際上，`import` 甚至不是一個對象！但這在實踐中並不重要。
:::

以下是動態 `import()` 如何實現小型單頁應用程式中的導航時延遲加載模塊的示例：

```html
<!DOCTYPE html>
<meta charset="utf-8">
<title>我的圖書館</title>
<nav>
  <a href="books.html" data-entry-module="books">書籍</a>
  <a href="movies.html" data-entry-module="movies">電影</a>
  <a href="video-games.html" data-entry-module="video-games">電子遊戲</a>
</nav>
<main>這是一個按需加載內容的占位符。</main>
<script>
  const main = document.querySelector(&apos;main&apos;);
  const links = document.querySelectorAll(&apos;nav > a&apos;);
  for (const link of links) {
    link.addEventListener(&apos;click&apos;, async (event) => {
      event.preventDefault();
      try {
        const module = await import(`/${link.dataset.entryModule}.mjs`);
        // 模組匯出了一個名為 `loadPageInto` 的函式。
        module.loadPageInto(main);
      } catch (error) {
        main.textContent = error.message;
      }
    });
  }
</script>
```

動態 `import()` 所啟用的延遲載入功能，在正確應用時會非常強大。為了展示此功能，[Addy](https://twitter.com/addyosmani) 修改了 [一個範例 Hacker News PWA](https://hnpwa-vanilla.firebaseapp.com/)，它在第一次載入時靜態匯入了所有的依賴模組，包括註解。[更新版本](https://dynamic-import.firebaseapp.com/) 使用了動態 `import()` 來延遲載入註解，避開了載入、解析和編譯的成本，直到使用者真正需要它們。

:::note
**注意：** 如果您的應用程式從其他域匯入腳本（無論是靜態或動態），這些腳本需要返回有效的 CORS 標頭（例如 `Access-Control-Allow-Origin: *`）。這是因為模組腳本（及其匯入的模組）是使用 CORS 來提取的，和一般腳本不同。
:::

## 建議

靜態 `import` 和動態 `import()` 都非常有用，每一個都有其非常明確的使用場景。在初始渲染依賴（尤其是頁面折疊上方的內容）中使用靜態 `import`。其他情況下，請考慮使用動態 `import()` 按需載入依賴模組。

## 動態 `import()` 的支援

<feature-support chrome="63"
                 firefox="67"
                 safari="11.1"
                 nodejs="13.2 https://nodejs.medium.com/announcing-core-node-js-support-for-ecmascript-modules-c5d6dc29b663"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-syntax-dynamic-import"></feature-support>
