---
title: "匯入聲明"
author: "Dan Clark ([@dandclark1](https://twitter.com/dandclark1)), 匯入聲明的強勢進口商"
avatars: 
  - "dan-clark"
date: 2021-06-15
tags: 
  - ECMAScript
description: "匯入聲明允許模組匯入語句在模組規範之外附加額外的信息"
tweet: ""
---

全新的[匯入聲明](https://github.com/tc39/proposal-import-assertions)功能允許模組匯入語句在模組規範之外附加額外的信息。該功能的初始用途是啟用以[JSON 模組](https://github.com/tc39/proposal-json-modules)形式匯入 JSON 文件：

<!--truncate-->
```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
import json from './foo.json' assert { type: 'json' };
console.log(json.answer); // 42
```

## 背景：JSON 模組和 MIME 類型

人們可能會問，為什麼不能簡單地如下匯入 JSON 模組：

```javascript
import json from './foo.json';
```

在執行模組資源之前，Web 平台會檢查其 MIME 類型的有效性，理論上可以利用這個 MIME 類型來判定資源是 JSON 還是 JavaScript 模組。

但僅依賴 MIME 類型存在一個[安全問題](https://github.com/w3c/webcomponents/issues/839)。

模組可以跨域匯入，開發人員可能會從第三方來源匯入 JSON 模組。如果 JSON 經過適當的清理，他們可能認為即使來自不受信任的第三方這也是基本安全的，因為匯入 JSON 不會執行腳本。

然而，在這種情況下，第三方腳本實際上可以執行，因為第三方伺服器可能會意外回復一個 JavaScript MIME 類型和惡意的 JavaScript 有效負載，從而在匯入者的域中執行代碼。

```javascript
// 如果 evil.com 回復一個
// JavaScript MIME 類型（例如 `text/javascript`），則執行 JS！
import data from 'https://evil.com/data.json';
```

無法使用文件擴展名來判定模組類型，因為[在 Web 上文件擴展名並非可靠的內容類型指標](https://github.com/tc39/proposal-import-assertions/blob/master/content-type-vs-file-extension.md)。因此，我們使用匯入聲明來指示預期的模組類型以防止此類特權升高的陷阱。

當開發人員想要匯入 JSON 模組時，他們必須使用匯入聲明來指定它是 JSON。如果從網路接收到的 MIME 類型與預期類型不匹配，匯入將失敗：

```javascript
// 如果 evil.com 回復的不是 JSON MIME 類型，則失敗。
import data from 'https://evil.com/data.json' assert { type: 'json' };
```

## 動態 `import()`

匯入聲明也可以通過一個新的第二個參數傳遞給[動態 `import()`](https://v8.dev/features/dynamic-import#dynamic)：

```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
const jsonModule = await import('./foo.json', {
  assert: { type: 'json' }
});
console.log(jsonModule.default.answer); // 42
```

JSON 內容是模組的默認匯出，因此可以通過從 `import()` 返回的對象的 `default` 屬性來引用它。

## 結論

目前，匯入聲明的唯一定義用途是用於指定模組類型。然而，該功能被設計為允許任意的鍵/值聲明對，因此如果未來需要以其他方式限制模組匯入，那麼可能會添加其他用途。

同時，帶有新匯入聲明語法的 JSON 模組已在 Chromium 91 中默認可用。[CSS 模組腳本](https://chromestatus.com/feature/5948572598009856)也即將推出，使用相同的模組類型聲明語法。

## 匯入聲明支持

<feature-support chrome="91 https://chromestatus.com/feature/5765269513306112"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="yes https://github.com/babel/babel/pull/12139"></feature-support>
