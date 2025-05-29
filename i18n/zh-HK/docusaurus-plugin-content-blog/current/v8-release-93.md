---
title: "V8 發佈 v9.3"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-08-09
tags:
 - 發佈
description: "V8 發佈 v9.3 帶來了 Object.hasOwn 和 Error cause 的支援，改進了編譯效能，並在 Android 上禁用了不受信任的程式碼生成緩解措施。"
tweet: ""
---
每隔六週，我們會根據我們的[發佈流程](https://v8.dev/docs/release-process)創建一個新的 V8 分支。每個版本都是在 Chrome Beta 里程碑之前從 V8 的主 Git 分支分離出來。今天我們很高興地宣佈我們最新的分支，[V8 版本 9.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.3)，該版本目前處於測試版本，直到幾週後與 Chrome 93 Stable 一起發佈。V8 v9.3 包含了各種面向開發者的全新功能。本篇文章將預覽一些期待中的亮點。

<!--truncate-->
## JavaScript

### Sparkplug 批次編譯

我們在 v9.1 中發佈了快速的新中層 JIT 編譯器 [Sparkplug](https://v8.dev/blog/sparkplug)。出於安全原因，V8 使用 [寫保護](https://en.wikipedia.org/wiki/W%5EX) 為生成的程式碼記憶體設置許可權，在可寫（編譯期間）和可執行之間切換。目前，這是通過 `mprotect` 調用來實現的。然而，由於 Sparkplug 編譯程式碼的速度非常快，對每個單獨編譯的函數調用 `mprotect` 的成本成為了編譯時間的主要瓶頸。在 V8 v9.3 中，我們為 Sparkplug 引入了批次編譯機制：不再單獨編譯每個函數，而是一次編譯多個函數。這樣可以通過每個批次只翻轉一次記憶體頁面的許可權來分攤開銷。

批次編譯在不影響 JavaScript 執行的情況下，將整體編譯時間（Ignition + Sparkplug）減少了最多 44%。如果僅考慮 Sparkplug 程式碼的編譯成本，則影響更大，例如，在 Win 10 上對 `docs_scrolling` 基準測試（見下圖）編譯時間減少 82%。令人意外的是，批次編譯帶來的效能提升甚至超過了 W^X 的成本，因為將類似的操作批量處理對 CPU 本身更有效。在下圖中可以看到 W^X 對編譯時間（Ignition + Sparkplug）的影響，以及批次編譯是如何有效減輕這些開銷的。

![基準測試](/_img/v8-release-93/sparkplug.svg)

### `Object.hasOwn`

`Object.hasOwn` 是 `Object.prototype.hasOwnProperty.call` 的一個更容易用的別名。

例如：

```javascript
Object.hasOwn({ prop: 42 }, 'prop')
// → true
```

更多內容（但不多！）請參考我們的[功能介紹](https://v8.dev/features/object-has-own)。

### Error cause

從 v9.3 開始，各種內建的 `Error` 建構函數擴展接受包含 `cause` 屬性的選項包作為第二個參數。如果提供了這樣的選項包，其 `cause` 屬性的值將作為該 `Error` 實例的一個自有屬性被設置。這為錯誤的鏈接提供了一個標準化的方式。

例如：

```javascript
const parentError = new Error('parent');
const error = new Error('parent', { cause: parentError });
console.log(error.cause === parentError);
// → true
```

和往常一樣，請參閱我們更深入的[功能介紹](https://v8.dev/features/error-cause)。

## Android 平台上停用不受信任程式碼生成的緩解措施

三年前，我們引入了一組[程式碼生成緩解措施](https://v8.dev/blog/spectre)以防禦 Spectre 攻擊。我們一直知道這僅僅是一個臨時的解決方案，僅提供部分針對 [Spectre](https://spectreattack.com/spectre.pdf) 攻擊的保護。唯一有效的保護方式是通過[網站隔離](https://blog.chromium.org/2021/03/mitigating-side-channel-attacks.html)來隔離網站。網站隔離已在桌面設備上的 Chrome 啟用了一段時間，但是由於資源限制，在 Android 上啟用完整的網站隔離一直是一個挑戰。然而，從 Chrome 92 開始，包含敏感資料的許多更多網站已在 Android 平台上啟用了[網站隔離](https://security.googleblog.com/2021/07/protecting-more-with-site-isolation.html)。

因此，我們決定對 Android 停用 V8 的 Spectre 程式碼生成緩解措施。這些緩解措施比網站隔離的效果差，並帶來效能成本。停用它們可使 Android 與桌面平台保持一致，自 V8 v7.0 開始，桌面平台上的這些緩解措施已被關閉。通過停用這些緩解措施，我們在 Android 上的基準測試效能上看到了一些顯著的提升。

![效能提升](/_img/v8-release-93/code-mitigations.svg)

## V8 API

請使用 `git log branch-heads/9.2..branch-heads/9.3 include/v8.h` 來獲取 API 變更的清單。
