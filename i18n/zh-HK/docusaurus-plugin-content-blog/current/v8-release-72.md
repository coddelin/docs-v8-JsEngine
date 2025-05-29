---
title: &apos;V8 發布 v7.2&apos;
author: &apos;Andreas Haas, 陷阱處理者&apos;
avatars:
  - andreas-haas
date: 2018-12-18 11:48:21
tags:
  - 發布
description: &apos;V8 v7.2 提供高速的 JavaScript 解析、更快的 async-await、降低 ia32 的內存消耗、公開類字段等多項功能！&apos;
tweet: &apos;1074978755934863361&apos;
---
每六週，我們會根據 [發布流程](/docs/release-process) 創建一個新的 V8 分支。每個版本都在 Chrome Beta 的里程碑之前，直接從 V8 的 Git 主分支中分出。今天我們很高興地宣布我們最新的分支，[V8 版本 7.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.2)，目前處於 Beta 階段，直到幾周後與 Chrome 72 穩定版本協同發布。V8 v7.2 擁有許多面向開發者的功能。本文提供一些發布前的亮點預覽。

<!--truncate-->
## 記憶體

[嵌入式內置項目](/blog/embedded-builtins) 現已支援並默認啟用於 ia32 架構。

## 性能

### JavaScript 解析

平均來說，網頁在啟動時耗費約 9.5% 的 V8 時間用於解析 JavaScript。因此我們專注於在 v7.2 中推出 V8 的最快 JavaScript 解析器。我們極大地提高了全局的解析速度。自 v7.0 起，解析速度在桌面端大幅提升了約 30%。下圖記錄了最近幾月在真實世界 Facebook 加載基準測試中的顯著改進。

![V8 在 facebook.com 上的解析時間（時間越短越好）](/_img/v8-release-72/facebook-parse-time.png)

我們在不同場景中對解析器進行了優化。下列的圖表展示了相較於最新 v7.2 發布版本的一些熱門網站的解析時間改進。

![相較於 V8 v7.2 的解析時間（時間越短越好）](/_img/v8-release-72/relative-parse-times.svg)

總而言之，最近的改進將解析平均占比從 9.5% 降至 7.5%，從而縮短網站加載時間並讓頁面更加響應迅速。

### `async`/`await`

V8 v7.2 提供了 [更快的 `async`/`await` 實現](/blog/fast-async#await-under-the-hood)，並且默認啟用。我們提出了 [一份規範提案](https://github.com/tc39/ecma262/pull/1250)，並正在收集網頁兼容性數據，以便將其正式合併進 ECMAScript 規範。

### 展開元素

當展開元素出現在數組字面量的首位時，例如 `[...x]` 或 `[...x, 1, 2]`，V8 v7.2 極大地提高了性能。此改進適用於展開數組、基本字符串、集合、圖鍵、圖值，以及 — 由此擴展 — `Array.from(x)`。查看更多詳情，請參閱 [我們深入的文章加速展開元素](/blog/spread-elements)。

### WebAssembly

我們分析了多項 WebAssembly 的基準測試，並用它們來改進最高執行層的代碼生成。特別是，V8 v7.2 在優化編譯器調度程序中啟用了節點拆分，並在後端啟用了循環旋轉。我們還改進了包裝器緩存，並引入了自定義包裝器，減少了調用導入 JavaScript 數學函數的開銷。此外，我們設計了寄存器分配器的更改，改善了許多代碼模式的性能，這些更改將在後續版本中登陸。

### 捕獲處理程序

捕獲處理程序改進了 WebAssembly 代碼的整體吞吐量。它們已在 V8 v7.2 中實現並適用於 Windows、macOS 和 Linux。在 Chromium 中，Linux 上已啟用此功能。當確認穩定性後，Windows 和 macOS 也將跟進。我們目前正致力於讓其在 Android 上也可用。

## 非同步堆棧追踪

如 [之前提到](/blog/fast-async#improved-developer-experience)，我們新增了一個名為 [零成本非同步堆棧追跡](https://bit.ly/v8-zero-cost-async-stack-traces) 的特性，該特性為 `error.stack` 屬性豐富了非同步的調用框架。目前可以使用 `--async-stack-traces` 命令行標誌啟用該功能。

## JavaScript 語言特性

### 公共類字段

V8 v7.2 增加了對 [公共類字段](/features/class-fields) 的支持。與其像這樣寫：

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log(&apos;喵！&apos;);
  }
}
```

…現在可以寫成：

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log(&apos;喵！&apos;);
  }
}
```

對 [私有類字段](/features/class-fields#private-class-fields) 的支持計劃在未來的 V8 發布中實現。

### `Intl.ListFormat`

V8 v7.2 增加了對 [`Intl.ListFormat` 提案](/features/intl-listformat) 的支持，實現列表的本地化格式化。

```js
const lf = new Intl.ListFormat(&apos;en&apos;);
lf.format([&apos;Frank&apos;]);
// → &apos;Frank&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;]);
// → &apos;Frank and Christine&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;]);
// → &apos;Frank, Christine, and Flora&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;, &apos;Harrison&apos;]);
// → &apos;Frank, Christine, Flora, and Harrison&apos;
```

更多資訊和使用範例，請查閱 [我們的 `Intl.ListFormat` 說明文件](/features/intl-listformat)。

### 合法格式的 `JSON.stringify`

`JSON.stringify` 現在會對單獨的代理項進行轉義處理，使其輸出為有效的 Unicode（並可用 UTF-8 表示）：

```js
// 舊行為:
JSON.stringify(&apos;\uD800&apos;);
// → &apos;"�"&apos;

// 新行為:
JSON.stringify(&apos;\uD800&apos;);
// → &apos;"\\ud800"&apos;
```

更多資訊，請參考 [我們的合法格式 `JSON.stringify` 說明文件](/features/well-formed-json-stringify)。

### 模組名稱空間輸出

在 [JavaScript 模組](/features/modules) 中，已經可以使用以下語法：

```js
import * as utils from &apos;./utils.mjs&apos;;
```

然而，對應的 `export` 語法還不存在… [直到現在](/features/module-namespace-exports)：

```js
export * as utils from &apos;./utils.mjs&apos;;
```

這相當於以下語法：

```js
import * as utils from &apos;./utils.mjs&apos;;
export { utils };
```

## V8 API

請使用 `git log branch-heads/7.1..branch-heads/7.2 include/v8.h` 來檢視 API 的變更列表。

擁有 [目前 V8 檢出版本](/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 7.2 -t branch-heads/7.2` 來試驗 V8 v7.2 中的新功能。或者你也可以 [訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，很快親自試用這些新功能。
