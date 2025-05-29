---
title: &apos;加速 V8 正規表達式&apos;
author: &apos;Jakob Gruber，一名正規軟體工程師&apos;
avatars:
  - &apos;jakob-gruber&apos;
date: 2017-01-10 13:33:37
tags:
  - 内部
  - RegExp
description: &apos;V8 最近將 RegExp 的內建函數從一個自託管的 JavaScript 實現遷移到直接掛接到我們基於 TurboFan 的新代碼生成架構上。&apos;
---
這篇博客文章涉及 V8 最近將 RegExp 的內建函數從一個自託管的 JavaScript 實現遷移到直接掛接到我們基於 [TurboFan](/blog/v8-release-56) 的新代碼生成架構上。

<!--truncate-->
V8 的 RegExp 實現是基於 [Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html) 的，這被廣泛認為是最快的正規表達式引擎之一。雖然引擎本身封裝了執行字符串模式匹配的低層邏輯，但 RegExp 原型上的函數，例如 [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec)，執行了為用戶提供功能所需的額外工作。

歷史上，V8 的各種組件被以 JavaScript 實現。直到最近，`regexp.js` 仍是其中一部分，承載了 RegExp 構造函數的實現，它所有的屬性以及其原型的屬性。

不幸的是，這種方法有缺點，包括性能不可預測，以及為低層功能轉換到 C++ 運行時的高昂成本。 ES6 最近新增的內建子類化功能（允許 JavaScript 開發人員提供他們自己的自定義 RegExp 實現）導致了進一步的 RegExp 性能損失，即使 RegExp 內建並未被子類化。這些退化不能在自託管 JavaScript 實現中完全解決。

因此，我們決定將 RegExp 實現從 JavaScript 遷移開。但是，保持性能比預期更難。一開始的全 C++ 實現遷移顯著更慢，只達到原始實現性能的約 70%。經過一些調查，我們發現了幾個原因：

- [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) 包含幾個對性能極其敏感的區域，尤其是過渡到底層 RegExp 引擎以及構造帶有相關 substring 調用的 RegExp 結果。對這些區域，JavaScript 實現依賴於稱作「存根（stubs）」的高度優化的代碼片段，這些存根要麼用本機組合語言編寫，要麼直接掛接到優化編譯器管線。從 C++ 無法訪問這些存根，而且它們的運行時等價物顯著更慢。
- 訪問 RegExp 的屬性，例如 `lastIndex`，可能會很昂貴，可能需要按名稱查找並遍歷原型鏈。 V8 的優化編譯器通常可以自動將這類訪問替換為更高效的操作，而在 C++ 中這些情況需要顯式處理。
- 在 C++ 中，對 JavaScript 對象的引用必須包裹在所謂的 `Handle` 中，以便與垃圾回收合作。與純 JavaScript 實現相比，Handle 管理產生了額外的開銷。

我們為 RegExp 遷移的新設計是基於 [CodeStubAssembler](/blog/csa)，它是一種允許 V8 開發者撰寫平台獨立代碼的機制，稍後會由同一後端翻譯成快速的、平台特定的代碼，而該後端也被用於新的優化編譯器 TurboFan。使用 CodeStubAssembler 使我們能夠解決最初 C++ 實現的所有缺點。存根（例如 RegExp 引擎的入口點）可以輕易地從 CodeStubAssembler 調用。雖然快速屬性訪問仍需要在所謂的快速路徑上顯式實現，但在 CodeStubAssembler 中此類訪問非常高效。 Handle 在 C++ 之外根本不存在。而且，由於實現現在運行在非常低的層次上，我們可以進一步採用快捷方式，例如在不需要構造昂貴的結果時跳過它。

結果非常正面。我們在 [一個龐大的正則表達式負載](https://github.com/chromium/octane/blob/master/regexp.js) 上的分數提升了 15%，完全彌補了最近與子類相關的效能損失。微基準測試（圖1）顯示了全方位的提升，從 [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) 的 7% 提升到 [`RegExp.prototype[@@split]`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/@@split) 的 102%。

![圖1：不同功能的正則表達式效能提升](/_img/speeding-up-regular-expressions/perf.png)

那麼作為 JavaScript 開發者，如何確保你的正則表達式的執行速度快呢？如果你不打算鉤入正則表達式的內部，只需確保正則表達式實例及其原型未被修改，即可獲得最佳效能：

```js
const re = /./g;
re.exec(&apos;&apos;);  // 快速路徑。
re.new_property = &apos;慢&apos;;
RegExp.prototype.new_property = &apos;也慢&apos;;
re.exec(&apos;&apos;);  // 慢速路徑。
```

雖然正則表達式子類在某些時候可能非常有用，但請注意，子類化的正則表達式實例需要更通用的處理，因此採用慢速路徑：

```js
class SlowRegExp extends RegExp {}
new SlowRegExp(".", "g").exec(&apos;&apos;);  // 慢速路徑。
```

完整的正則表達式遷移將在 V8 v5.7 中提供。
