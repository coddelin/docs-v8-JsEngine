---
title: "WebAssembly 與 JavaScript BigInt 的整合"
author: "Alon Zakai"
avatars:
  - "alon-zakai"
date: 2020-11-12
tags:
  - WebAssembly
  - ECMAScript
description: "BigInt 讓 JavaScript 和 WebAssembly 之間傳遞 64 位元整數變得簡單。本文解釋其意義及用途，包括使開發人員更容易、更快地執行程式碼，並加速建構時間。"
tweet: "1331966281571037186"
---
[JS-BigInt-Integration](https://github.com/WebAssembly/JS-BigInt-integration) 功能讓 JavaScript 和 WebAssembly 之間的 64 位元整數傳遞變得簡單。本文解釋這代表什麼及其用途，包括使開發人員更容易、更快地執行程式碼，並加速建構時間。

<!--truncate-->
## 64 位元整數

JavaScript 的 Numbers 是 doubles，也就是 64 位元浮點值。這樣的值可以精確地包含任意 32 位元整數，但不是所有的 64 位元整數。而 WebAssembly 則完全支援 64 位元整數，即 `i64` 類型。當兩者连接時會出現問題：例如，如果一個 Wasm 函式返回 i64，那麼從 JavaScript 調用時 VM 會拋出異常，如下所示：

```
TypeError: Wasm function signature contains illegal type
```

如錯誤所述，`i64` 對於 JavaScript 來說並不是一個合法的類型。

歷史上，解決這個問題的最佳方案是進行 Wasm 的“合法化”。合法化是指將 Wasm 的導入和導出轉換為 JavaScript 可接受的有效類型。在實踐中，這做了兩件事：

1. 用兩個 32 位元的值取代 64 位元整數參數，分別代表低位元和高位元。
2. 用一個 32 位元的值（代表低位元）取代 64 位元整數的返回值，並在側面用一個 32 位元的值表示高位元。

例如，考慮以下 Wasm 模組：

```wasm
(module
  (func $send_i64 (param $x i64)
    ..))
```

合法化會將其轉換為：

```wasm
(module
  (func $send_i64 (param $x_low i32) (param $x_high i32)
    (local $x i64) ;; 其餘程式碼將使用的真實值
    ;; 將 $x_low 和 $x_high 合併為 $x 的程式碼
    ..))
```

合法化是在工具端完成的，在執行它的 VM 收到它之前。例如，[Binaryen](https://github.com/WebAssembly/binaryen) 工具鏈庫有一個名為 [LegalizeJSInterface](https://github.com/WebAssembly/binaryen/blob/fd7e53fe0ae99bd27179cb35d537e4ce5ec1fe11/src/passes/LegalizeJSInterface.cpp) 的 pass 進行該轉換，當需要時會在 [Emscripten](https://emscripten.org/) 中自動運行。

## 合法化的缺點

合法化對許多情況來說運行不錯，但它確實有一些缺點，例如將 32 位元片段合併或拆分為 64 位元值所需的額外工作。雖然這些情況很少出現在熱路徑中，但當發生時減速可能會很明顯 - 稍後我們將看到一些數據。

另一個煩惱是合法化對用戶是可見的，因為它改變了 JavaScript 和 Wasm 之間的界面。以下是一個例子：

```c
// example.c

#include <stdint.h>

extern void send_i64_to_js(int64_t);

int main() {
  send_i64_to_js(0xABCD12345678ULL);
}
```

```javascript
// example.js

mergeInto(LibraryManager.library, {
  send_i64_to_js: function(value) {
    console.log("JS received: 0x" + value.toString(16));
  }
});
```

這是一個簡單的 C 程式，調用了一個 [JavaScript 庫](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#implement-c-in-javascript) 函式（也就是，我們在 C 中定義一個 extern C 函式，並在 JavaScript 中實現它，作為 Wasm 和 JavaScript 之間呼叫的一種簡單且低層次的方式）。該程式所做的只是將一個 `i64` 傳遞給 JavaScript，在那裡我們試圖打印它。

我們可以用以下指令建構該程式：

```
emcc example.c --js-library example.js -o out.js
```

當我們運行它時，並沒有得到預期的結果：

```
node out.js
JS received: 0x12345678
```

我們發送了 `0xABCD12345678`，但只接收到 `0x12345678` 😔。這裡發生的情況是合法化將該 `i64` 拆分為兩個 `i32`，而我們的程式碼只接收到低 32 位元，並忽略了另一個參數。為了正確處理，我們需要做如下修改：

```javascript
  // 該 i64 被拆分成了兩個 32 位元參數，“低位”和“高位”。
  send_i64_to_js: function(low, high) {
    console.log("JS received: 0x" + high.toString(16) + low.toString(16));
  }
```

現在執行時，我們得到：

```
JS received: 0xabcd12345678
```

如您所見，可以接受合法化。但它有時會讓人感到有些煩惱！

## 解決方案：JavaScript BigInts

JavaScript 現在有 [BigInt](/features/bigint) 值，可以表示任意大小的整數，因此可以正確表示 64 位元整數。使用它來表示 Wasm 中的 `i64` 是理所當然的。而這正是 JS-BigInt-Integration 的功能！

Emscripten 支援 Wasm 的 BigInt 整合功能，我們可以利用它來編譯不需要任何合法化技巧的原始範例，只需添加 `-s WASM_BIGINT`：

```
emcc example.c --js-library example.js -o out.js -s WASM_BIGINT
```

接著我們可以執行它（注意，目前我們需要傳遞 Node.js 一個參數來啟用 BigInt 整合）：

```
node --experimental-wasm-bigint a.out.js
JS 收到: 0xabcd12345678
```

完美，這正是我們想要的結果！

而且這不僅更簡單，還更快。如前所述，在實際情況中 `i64` 轉換很少會發生在熱路徑上，但當它確實發生時，性能下降可能會很明顯。如果我們將上述範例改成一個基準測試，執行大量 `send_i64_to_js` 呼叫，那麼 BigInt 版本的速度快了 18%。

BigInt 整合的另一個好處是工具鏈可以避免合法化。如果 Emscripten 不需要合法化，那麼對 LLVM 輸出的 Wasm 就不需要進行任何處理，從而加快構建速度。如果您以 `-s WASM_BIGINT` 進行建構，並且不提供任何需要更改的其他參數，就能獲得這種加速。例如，`-O0 -s WASM_BIGINT` 是可行的（但經過最佳化的建構會 [執行 Binaryen 優化器](https://emscripten.org/docs/optimizing/Optimizing-Code.html#link-times)，這對縮小大小很重要）。

## 結論

WebAssembly 的 BigInt 整合已在 [多個瀏覽器](https://webassembly.org/roadmap/) 中實現，包括於 2020-08-25 推出的 Chrome 85，您今天就可以試試！
