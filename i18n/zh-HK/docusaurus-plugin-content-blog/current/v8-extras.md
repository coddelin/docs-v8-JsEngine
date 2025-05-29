---
title: &apos;V8 附加功能&apos;
author: &apos;Domenic Denicola ([@domenic](https://twitter.com/domenic)), Streams 魔法師&apos;
avatars:
  - &apos;domenic-denicola&apos;
date: 2016-02-04 13:33:37
tags:
  - internals
description: &apos;V8 v4.8 包含 “V8 附加功能”，一個簡單的介面，旨在允許嵌入者編寫高效能的自托管 API。&apos;
---
V8 用 JavaScript 自身實現了 JavaScript 語言內建物件和函數的一個大子集。例如，您可以看到我們的 [Promise 實現](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js) 是用 JavaScript 編寫的。這樣的內建物件被稱為 _自托管_。這些實現被包含在我們的 [啟動快照](/blog/custom-startup-snapshots) 中，以便可以快速創建新上下文，而不需要在運行時設置和初始化自托管的內建物件。

<!--truncate-->
V8 的嵌入者，如 Chromium，有時也希望用 JavaScript 編寫 API。這對於像 [streams](https://streams.spec.whatwg.org/) 這樣自包含的平臺功能，或者那種建構在現有較低層級功能基礎上的“分層平臺”中的更高層級功能特別有用。儘管總是可以在啟動時運行額外的代碼來初始化嵌入者的 API（例如，在 Node.js 中這樣做），但理想情況下，嵌入者應該能為其自托管的 API 獲得與 V8 一樣的速度優勢。

V8 附加功能是 V8 的一項新功能，自從 [v4.8 版本](/blog/v8-release-48) 起推出，旨在通過簡單的介面允許嵌入者編寫高效能的自托管 API。附加功能是由嵌入者提供的 JavaScript 文件，這些文件直接編譯到 V8 的快照中。它們還可以使用一些助手工具，使在 JavaScript 中編寫安全的 API 更加容易。

## 一個範例

一個 V8 附加功能文件只是具有一定結構的 JavaScript 文件：

```js
(function(global, binding, v8) {
  &apos;use strict&apos;;
  const Object = global.Object;
  const x = v8.createPrivateSymbol(&apos;x&apos;);
  const y = v8.createPrivateSymbol(&apos;y&apos;);

  class Vec2 {
    constructor(theX, theY) {
      this[x] = theX;
      this[y] = theY;
    }

    norm() {
      return binding.computeNorm(this[x], this[y]);
    }
  }

  Object.defineProperty(global, &apos;Vec2&apos;, {
    value: Vec2,
    enumerable: false,
    configurable: true,
    writable: true
  });

  binding.Vec2 = Vec2;
});
```

這裡有幾點需要注意：

- `global` 物件不在作用域鏈中，因此任何對它的訪問（例如對 `Object` 的訪問）都必須通過提供的 `global` 參數顯式完成。
- `binding` 物件是一個存放值或從嵌入者中檢索值的位置。一個 C++ API `v8::Context::GetExtrasBindingObject()` 提供了從嵌入者側訪問 `binding` 物件的功能。在我們的玩具範例中，我們允許嵌入者執行範數計算；在真實範例中，您可能將更棘手的事情（如 URL 解析）委派給嵌入者。我們還將 `Vec2` 建構函數添加到 `binding` 物件，以便嵌入者的代碼可以在不經過可能可變的 `global` 物件的情況下創建 `Vec2` 實例。
- `v8` 物件提供了一些 API，使您能夠編寫安全的代碼。這裡，我們創建私人符號，將內部狀態存儲在外部無法操縱的方式中。（私人符號是 V8 的內部概念，在標準 JavaScript 代碼中沒有意義。）V8 的內建物件經常使用“%-函數調用”來處理這類事情，但 V8 的附加功能不能使用%-函數，因為它們是 V8 的內部實現細節，不適合嵌入者依賴。

您可能會好奇這些物件的來源。這三個物件都在 [V8 的啟動程序](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/bootstrapper.cc) 中初始化，該程序安裝了一些基本屬性，但大多數初始化由 V8 的自託管 JavaScript 完成。例如，幾乎每個 V8 中的 .js 文件都在 `global` 上安裝了某些內容；請參見 [promise.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js&sq=package:chromium&l=439) 或 [uri.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/uri.js&sq=package:chromium&l=371)。我們還在 [多個地方](https://code.google.com/p/chromium/codesearch#search/&q=extrasUtils&sq=package:chromium&type=cs) 安裝了 API 到 `v8` 物件上。（`binding` 物件是空的，直到被附加或嵌入者操作，因此在 V8 本身中唯一相關的代碼是啟動程序創建它的時候。）

最後，為了告訴 V8 我們將要編譯一個附加功能，我們需要在項目的 gypfile 中添加一行：

```js
&apos;v8_extra_library_files&apos;: [&apos;./Vec2.js&apos;]
```

（您可以在 [V8 的 gypfile](https://code.google.com/p/chromium/codesearch#chromium/src/v8/build/standalone.gypi&sq=package:chromium&type=cs&l=170) 中看到這樣的實例。）

## V8 附加功能的實踐

V8 附加功能提供了一種新穎且輕量化的方法，供嵌入者實現功能。JavaScript 能更加輕鬆地操作 JavaScript 的內建功能，比如陣列、地圖或是 Promise；它能夠毫無複雜之處地調用其他 JavaScript 函數；並以慣用方式處理異常。與 C++ 的實現方式不同，通過 V8 附加功能實現的 JavaScript 功能可以受益於內聯，調用它們也沒有跨邊界的成本。與傳統的綁定系統（比如 Chromium 的 Web IDL 綁定）相比，這些優勢尤其明顯。

V8 附加功能於去年被引入並逐步改進，目前 Chromium 正使用它們來[實現流](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/core/streams/ReadableStream.js)。Chromium 還在考慮使用 V8 附加功能來實現[滾動自定義](https://codereview.chromium.org/1333323003)和[高效的幾何 API](https://groups.google.com/a/chromium.org/d/msg/blink-dev/V_bJNtOg0oM/VKbbYs-aAgAJ)。

V8 附加功能仍然處於工作進展中，界面有一些不太完善的地方以及一些需要隨時間解決的缺點。主要需要改進的領域是調試方面：錯誤不易追蹤，而運行時的調試大多直接通過打印語句進行。在未來，我們希望將 V8 附加功能整合到 Chromium 的開發者工具和跟蹤框架中，無論是為 Chromium 本身還是為任何使用相同協議的嵌入者。

使用 V8 附加功能時需要謹慎的另一個原因是編寫安全且可靠代碼所需的額外開發努力。V8 附加功能代碼直接操作快照，就像 V8 自托管內建功能的代碼一樣。它直接訪問用戶端 JavaScript 相同的物件，且無任何綁定層或單獨的上下文來防止此類訪問。例如，看似簡單的 `global.Object.prototype.hasOwnProperty.call(obj, 5)` 就有六種可能的方式因用戶代碼修改內建功能而失敗（數一數吧！）。像 Chromium 這樣的嵌入者需要對任何用戶代碼的行為保持穩健，因此在這種環境中，編寫附加功能比編寫傳統 C++ 實現的功能需要更加謹慎。

如果您想了解更多關於 V8 附加功能的資訊，請查看我們的[設計文檔](https://docs.google.com/document/d/1AT5-T0aHGp7Lt29vPWFr2-qG8r3l9CByyvKwEuA8Ec0/edit#heading=h.32abkvzeioyz)，其中包含更詳細的說明。我們期待改進 V8 附加功能，並增加更多功能，使開發者和嵌入者能夠編寫富表現力且高效的 V8 執行期擴展。
