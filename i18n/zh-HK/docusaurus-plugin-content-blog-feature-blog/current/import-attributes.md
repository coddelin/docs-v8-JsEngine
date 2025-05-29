---
title: "導入屬性"
author: "郭書宇 ([@_shu](https://twitter.com/_shu))"
avatars:
  - "shu-yu-guo"
date: 2024-01-31
tags:
  - ECMAScript
description: "導入屬性：導入斷言的演進"
tweet: ""
---

## 之前

V8 在 v9.1 中發布了 [導入斷言](https://chromestatus.com/feature/5765269513306112) 功能。此功能允許模組導入語句使用 `assert` 關鍵字來包含額外資訊。目前，這些額外資訊可用於在 JavaScript 模組中導入 JSON 和 CSS 模組。

<!--truncate-->
## 導入屬性

從那時起，導入斷言已經演進為 [導入屬性](https://github.com/tc39/proposal-import-attributes)。該功能的目的保持不變：允許模組導入語句包含額外資訊。

最重要的區別在於，導入斷言具有僅斷言語義，而導入屬性具有更寬鬆的語義。僅斷言語義意味著額外資訊只影響模組是否被加載，而不影響模組如何被加載。例如，JSON 模組憑藉其 MIME 類型總是被加載為 JSON 模組，而 `assert { type: 'json' }` 子句只能在請求模組的 MIME 類型不是 `application/json` 時導致加載失敗。

然而，僅斷言語義存在一個致命缺陷。在 Web 上，HTTP 請求的形態取決於所請求資源的類型。例如，[`Accept` 標頭](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept) 影響響應的 MIME 類型，而 [`Sec-Fetch-Dest` 元資料標頭](https://web.dev/articles/fetch-metadata) 影響網絡伺服器是否接受或拒絕請求。由於導入斷言無法影響模組的加載方式，其無法改變 HTTP 請求的形態。請求的資源類型也影響使用的 [內容安全政策](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)：導入斷言無法正確與 Web 的安全模型合作。

導入屬性放寬僅斷言語義，允許屬性影響模組的加載方式。換句話說，導入屬性可以生成包含適當的 `Accept` 和 `Sec-Fetch-Dest` 標頭的 HTTP 請求。為了將語法與新的語義匹配，舊的 `assert` 關鍵字被更新為 `with`：

```javascript
// main.mjs
//
// 新的 'with' 語法。
import json from './foo.json' with { type: 'json' };
console.log(json.answer); // 42
```

## 動態 `import()`

同樣，[動態 `import()`](https://v8.dev/features/dynamic-import#dynamic) 也被類似更新以接受 `with` 選項。

```javascript
// main.mjs
//
// 新的 'with' 選項。
const jsonModule = await import('./foo.json', {
  with: { type: 'json' }
});
console.log(jsonModule.default.answer); // 42
```

## `with` 的可用性

導入屬性在 V8 v12.3 中已默認啟用。

## `assert` 的棄用和最終移除

`assert` 關鍵字在 V8 v12.3 中被棄用，並計劃於 v12.6 中移除。請使用 `with` 而非 `assert`！使用 `assert` 子句將在控制台打印警告，敦促使用 `with`。

## 導入屬性支持

<feature-support chrome="123 https://chromestatus.com/feature/5205869105250304"
                 firefox="no"
                 safari="17.2 https://developer.apple.com/documentation/safari-release-notes/safari-17_2-release-notes"
                 nodejs="20.10 https://nodejs.org/docs/latest-v20.x/api/esm.html#import-attributes"
                 babel="yes https://babeljs.io/blog/2023/05/26/7.22.0#import-attributes-15536-15620"></feature-support>
