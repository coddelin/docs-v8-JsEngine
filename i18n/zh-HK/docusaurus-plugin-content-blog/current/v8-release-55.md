---
title: "V8 發佈版本 v5.5"
author: "V8 團隊"
date: 2016-10-24 13:33:37
tags:
  - 發佈
description: "V8 v5.5 帶來了更低的記憶體消耗以及對 ECMAScript 語言功能的更高支援。"
---
每六周，我們會為 V8 創建一個新的分支，這是我們[發佈流程](/docs/release-process)的一部分。每個版本都是在 Chrome Beta 里程碑之前直接從 V8 的 Git 主分支中分出來的。今天，我們很高興地宣佈我們最新的分支，[V8 版本 5.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.5)，該版本將在未來幾周內與 Chrome 55 穩定版同步釋出之前進入 Beta 階段。V8 v5.5 充滿了各種面向開發者的好功能，我們希望向您預覽一些亮點，讓您期待該版本的到來。

<!--truncate-->
## 語言功能

### 非同步函數

在 v5.5 中，V8 支援 JavaScript ES2017 [非同步函數](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions)，這使得使用和創建 Promises 的程式碼更加容易。使用非同步函數，等待 Promise 解決只需在其前面輸入 await 並像值同步可用一樣繼續 —— 無需使用回調函數。請參閱[這篇文章](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions)進行介紹。

以下是一個從 URL 獲取並返回響應文本的範例函數，使用了典型的非同步、基於 Promise 的風格。

```js
function logFetch(url) {
  return fetch(url)
    .then(response => response.text())
    .then(text => {
      console.log(text);
    }).catch(err => {
      console.error('fetch failed', err);
    });
}
```

以下是使用非同步函數，移除回調的重寫程式碼。

```js
async function logFetch(url) {
  try {
    const response = await fetch(url);
    console.log(await response.text());
  } catch (err) {
    console.log('fetch failed', err);
  }
}
```

## 性能改進

V8 v5.5 在記憶體佔用方面提供了一些關鍵改進。

### 記憶體

記憶體消耗是 JavaScript 虛擬機性能取捨中的重要維度。在過去的幾個版本中，V8 團隊分析並顯著減少了一些被認為代表現代網頁開發模式的網站的記憶體佔用。V8 5.5 將 Chrome 的整體記憶體消耗最高減少了 **35%** （與 Chrome 53 中的 V8 5.3 相比），這得益於 V8 堆大小和區域記憶體使用的減少。其他設備部分也受益於區域記憶體的減少。請查看[專門的博客文章](/blog/optimizing-v8-memory)以獲得詳細信息。

## V8 API

請查看我們的[API 更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。該文檔會在每次主要版本釋出之後的幾周內定期更新。

### V8 檢測器已遷移

V8 檢測器已從 Chromium 遷移到 V8。檢測器代碼現在完全存在於 [V8 存儲庫](https://chromium.googlesource.com/v8/v8/+/master/src/inspector/)中。

擁有[有效的 V8 檢出](/docs/source-code#using-git)的開發人員可以使用 `git checkout -b 5.5 -t branch-heads/5.5` 來試驗 V8 5.5 中的新功能。或者，您可以[訂閱 Chrome's Beta 頻道](https://www.google.com/chrome/browser/beta.html)並很快親自嘗試這些新功能。
