---
title: "V8 發佈 v9.0"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), 內嵌展示"
avatars: 
 - "ingvar-stepanyan"
date: 2021-03-17
tags: 
 - 發佈
description: "V8 發佈 v9.0，引入對 RegExp 比對索引的支持及各種性能提升。"
tweet: "1372227274712494084"
---
每六週，我們會按照 [發佈流程](https://v8.dev/docs/release-process) 創建一個新的 V8 分支。每個版本會立即從 V8 的 Git 主分支在 Chrome Beta 里程碑之前分支出來。今天，我們很高興地宣布我們最新的分支，[V8 版本 9.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.0)，該分支目前處於 Beta 階段，直到幾週后伴隨 Chrome 90 穩定版的發佈。V8 v9.0 充滿了各種面向開發者的功能改進。這篇文章提供了一些亮點的預覽，敬請期待正式發佈。

<!--truncate-->
## JavaScript

### RegExp 比對索引

從 v9.0 開始，開發者可以選擇獲取正則表達式匹配中捕獲組的起始和結束位置的數組。當正則表達式帶有 `/d` 標誌時，該數組可通過 match 對象的 `.indices` 屬性獲取。

```javascript
const re = /(a)(b)/d;      // 注意 /d 標誌。
const m = re.exec('ab');
console.log(m.indices[0]); // 索引 0 是整個匹配。
// → [0, 2]
console.log(m.indices[1]); // 索引 1 是第 1 個捕獲組。
// → [0, 1]
console.log(m.indices[2]); // 索引 2 是第 2 個捕獲組。
// → [1, 2]
```

請參閱 [我們的解釋文檔](https://v8.dev/features/regexp-match-indices) 進一步了解詳情。

### 更快的 `super` 屬性訪問

`super` 屬性的訪問（例如，`super.x`）通過使用 V8 的內聯快取系統和 TurboFan 中的優化代碼生成得到了提升。有了這些更改，`super` 屬性的訪問現在更接近常規屬性訪問的性能，從下方的圖表中可以看出這一點。

![將 super 屬性訪問與常規屬性訪問相比進行優化](/_img/fast-super/super-opt.svg)

請參閱 [專門的博客文章](https://v8.dev/blog/fast-super) 獲取更多細節。

### 禁用 `for ( async of`

最近發現並在 V8 v9.0 中 [修復](https://chromium-review.googlesource.com/c/v8/v8/+/2683221) 了一個 [語法模糊性](https://github.com/tc39/ecma262/issues/2034)。

現在，令牌序列 `for ( async of` 不再被解析。

## WebAssembly

### 更快的 JS 到 Wasm 調用

V8 對 WebAssembly 和 JavaScript 函數的參數使用不同的表示方式。因此，當 JavaScript 調用導出的 WebAssembly 函數時，調用通過一個所謂的 *JS-to-Wasm 包裝器*，負責將參數從 JavaScript 格式轉換為 WebAssembly 格式，以及在相反方向上適配結果。

然而，這帶來了性能成本，意味著從 JavaScript 到 WebAssembly 的調用速度不如從 JavaScript 到 JavaScript 的調用。為了最小化這種開銷，JS-to-Wasm 包裝器現在可以在調用點進行內聯，簡化代碼並移除這個額外的幀。

假設我們有一個用於兩個浮點數相加的 WebAssembly 函數，如下所示：

```cpp
double addNumbers(double x, double y) {
  return x + y;
}
```

假設我們從 JavaScript 調用它來對一些向量進行加法（以打包數組的形式表示）：

```javascript
const addNumbers = instance.exports.addNumbers;

function vectorSum(len, v1, v2) {
  const result = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = addNumbers(v1[i], v2[i]);
  }
  return result;
}

const N = 100_000_000;
const v1 = new Float64Array(N);
const v2 = new Float64Array(N);
for (let i = 0; i < N; i++) {
  v1[i] = Math.random();
  v2[i] = Math.random();
}

// 預熱。
for (let i = 0; i < 5; i++) {
  vectorSum(N, v1, v2);
}

// 測量。
console.time();
const result = vectorSum(N, v1, v2);
console.timeEnd();
```

在這個簡化的微基準測試中，我們看到以下改進：

![微基準測試比較](/_img/v8-release-90/js-to-wasm.svg)

這個功能仍然是實驗性的，可以通過 `--turbo-inline-js-wasm-calls` 標誌啟用。

更多細節請參見 [設計文檔](https://docs.google.com/document/d/1mXxYnYN77tK-R1JOVo6tFG3jNpMzfueQN1Zp5h3r9aM/edit)。

## V8 API

請使用 `git log branch-heads/8.9..branch-heads/9.0 include/v8.h` 獲取 API 更改的列表。

擁有活躍 V8 檢出版本的開發者可以使用 `git checkout -b 9.0 -t branch-heads/9.0` 來試用 V8 v9.0 的新功能。或者，您可以 [訂閱 Chrome 的 Beta 版本](https://www.google.com/chrome/browser/beta.html)，很快便能親自試用這些新功能。
