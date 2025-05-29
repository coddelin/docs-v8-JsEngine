---
title: "V8 發佈 v8.1"
author: "Dominik Inführ，國際化的神秘人物"
avatars:
  - "dominik-infuehr"
date: 2020-02-25
tags:
  - release
description: "V8 v8.1 提供改良的國際化支援，通過新的 Intl.DisplayNames API。"
---

每六周，我們按照 [發佈流程](https://v8.dev/docs/release-process) 創建一個新的 V8 分支。每個版本都在 Chrome Beta 里程碑之前，從 V8 的 Git 主分支中分支出來。今天，我們很高興地宣布我們最新的分支， [V8 版本 8.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.1)，這個版本目前處於測試版，直到幾周後與穩定版 Chrome 81 一起正式發佈。V8 v8.1 呈現大量開發者面向的新功能。這篇文章提前預覽其中一些亮點，以期待正式發佈。

<!--truncate-->
## JavaScript

### `Intl.DisplayNames`

新的 `Intl.DisplayNames` API 能讓程式員輕鬆地顯示語言、地區、文字腳本和貨幣的翻譯名稱。

```js
const zhLanguageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
const enRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const itScriptNames = new Intl.DisplayNames(['it'], { type: 'script' });
const deCurrencyNames = new Intl.DisplayNames(['de'], {type: 'currency'});

zhLanguageNames.of('fr');
// → '法文'
enRegionNames.of('US');
// → '美國'
itScriptNames.of('Latn');
// → '拉丁文'
deCurrencyNames.of('JPY');
// → '日圓'
```

今天就將翻譯資料維護的負擔轉交給運行環境吧！詳情請參閱 [功能解釋](https://v8.dev/features/intl-displaynames)，了解完整的 API 和更多範例。

## V8 API

請使用 `git log branch-heads/8.0..branch-heads/8.1 include/v8.h` 獲取 API 變更的列表。

擁有 [活動的 V8 檢出](https://v8.dev/docs/source-code#using-git) 的開發者，可以使用 `git checkout -b 8.1 -t branch-heads/8.1` 試驗 V8 v8.1 的新功能。或者也可以 [訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，不久之後自己試試新功能。
