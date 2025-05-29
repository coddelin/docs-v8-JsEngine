---
title: "WebAssembly 尾呼叫"
author: "Thibaud Michaud, Thomas Lively"
date: 2023-04-06
tags: 
  - WebAssembly
description: "本文檔說明了 WebAssembly 尾呼叫提案，並通過一些範例進行演示。"
tweet: "1644077795059044353"
---
我們在 V8 v11.2 推出了 WebAssembly 尾呼叫！在本文中，我們將簡要概述此提案，展示 C++ 協程與 Emscripten 的一個有趣用例，並說明 V8 如何內部處理尾呼叫。

## 什麼是尾呼叫優化？

一個呼叫被稱為處於尾部位置（tail position），如果它是目前函數在返回之前執行的最後指令。編譯器可以通過丟棄調用者的幀並將呼叫替換為跳轉來優化此類呼叫。

這對於遞歸函數特別有用。例如，以下是使用 C 寫成的函數計算鏈表中元素的總和：

```c
int sum(List* list, int acc) {
  if (list == nullptr) return acc;
  return sum(list->next, acc + list->val);
}
```

使用常規呼叫，這將消耗 𝒪(n) 的堆棧空間：鏈表的每個元素都會在呼叫堆棧中增加一個新幀。鏈表足夠長時，可能很快就會導致堆棧溢出。通過將呼叫替換為跳轉，尾呼叫優化有效地將此遞歸函數轉換為使用 𝒪(1) 堆棧空間的循環：

<!--truncate-->
```c
int sum(List* list, int acc) {
  while (list != nullptr) {
    acc = acc + list->val;
    list = list->next;
  }
  return acc;
}
```

此優化對於函數式語言尤其重要。這些語言大量依賴遞歸函數，而諸如 Haskell 等純函數語言甚至不提供循環控制結構。任何形式的自定義迭代通常都以某種方式使用遞歸。如果沒有尾呼叫優化，任何非平凡的程式都可能很快遇到堆棧溢出。

### WebAssembly 尾呼叫提案

在 Wasm MVP 中有兩種函數呼叫方式：`call` 和 `call_indirect`。WebAssembly 尾呼叫提案添加了它們的尾呼叫對應：`return_call` 和 `return_call_indirect`。這表示實際執行尾呼叫優化並生成適當的呼叫類型的責任在工具鏈，這樣可以更好地控制性能和堆棧空間使用。

讓我們來看一個遞歸的菲波那契函數。這裡包含了 Wasm 字節碼的文本格式，但您可以在下一部分中找到 C++ 版本：

```wasm/4
(func $fib_rec (param $n i32) (param $a i32) (param $b i32) (result i32)
  (if (i32.eqz (local.get $n))
    (then (return (local.get $a)))
    (else
      (return_call $fib_rec
        (i32.sub (local.get $n) (i32.const 1))
        (local.get $b)
        (i32.add (local.get $a) (local.get $b))
      )
    )
  )
)

(func $fib (param $n i32) (result i32)
  (call $fib_rec (local.get $n) (i32.const 0) (i32.const 1))
)
```

在任何時刻只有一個 `fib_rec` 幀，它在執行下一次遞歸呼叫之前會進行自身解釋（unwinds）。到達基礎情況時，`fib_rec` 將結果 `a` 直接返回到 `fib`。

尾呼叫的一個可觀測結果（除了降低堆棧溢出的風險外）是尾調用框架不會出現在堆棧跟蹤中，也不會出現在捕獲的例外堆棧屬性中，也不會出現在 DevTools 堆棧跟蹤中。在拋出例外或執行暫停時，尾調用框架消失了，V8 無法恢復它們。

## 在 Emscripten 中使用尾呼叫

函數式語言通常依賴尾呼叫，但即使是 C 或 C++ 程式員也可以使用它們。Emscripten（以及 Emscripten 使用的 Clang）支持 musttail 屬性，該屬性告訴編譯器某次呼叫必須編譯為尾呼叫。例如考慮以下遞歸實現的菲波那契函數，它計算第 `n` 個菲波那契數 mod 2^32（因為對於大的 `n` 整數會溢出）：

```c
#include <stdio.h>

unsigned fib_rec(unsigned n, unsigned a, unsigned b) {
  if (n == 0) {
    return a;
  }
  return fib_rec(n - 1, b, a + b);
}

unsigned fib(unsigned n) {
  return fib_rec(n, 0, 1);
}

int main() {
  for (unsigned i = 0; i < 10; i++) {
    printf("fib(%d): %d\n", i, fib(i));
  }

  printf("fib(1000000): %d\n", fib(1000000));
}
```

在使用 `emcc test.c -o test.js` 編譯後，運行此程式會在 Node.js 中導致堆棧溢出錯誤。我們可以通過在 `fib_rec` 的返回中添加 `__attribute__((__musttail__))` 並在編譯參數中加入 `-mtail-call` 修復此問題。現在生成的 Wasm 模塊包含了新的尾呼叫指令，因此我們需要將 `--experimental-wasm-return_call` 傳遞給 Node.js，但堆棧不再溢出。

以下是一個使用互遞歸的範例：

```c
#include <stdio.h>
#include <stdbool.h>

bool is_odd(unsigned n);
bool is_even(unsigned n);

bool is_odd(unsigned n) {
  if (n == 0) {
    return false;
  }
  __attribute__((__musttail__))
  return is_even(n - 1);
}

bool is_even(unsigned n) {
  if (n == 0) {
    return true;
  }
  __attribute__((__musttail__))
  return is_odd(n - 1);
}

int main() {
  printf("is_even(1000000): %d\n", is_even(1000000));
}
```

請注意，這兩個範例都很簡單，如果我們用 `-O2` 編譯器編譯，編譯器可以預先計算答案，即使沒有尾呼叫也不會耗盡堆疊，但這在更複雜的代碼中就不適用。在實際代碼中，`musttail` 屬性對於撰寫高效能解釋器迴圈非常有幫助，正如 Josh Haberman 在[這篇部落格文章](https://blog.reverberate.org/2021/04/21/musttail-efficient-interpreters.html)中所描述的。

除了 `musttail` 屬性之外，C++ 還依賴尾呼叫實現另一個特性：C++20 coroutines。Lewis Baker 在[這篇部落格文章](https://lewissbaker.github.io/2020/05/11/understanding_symmetric_transfer)中深入探討了尾呼叫與 C++20 coroutines 之間的關係，簡而言之，使用了一種模式可能會微妙地導致堆疊溢出，儘管源碼看起來並沒有問題。為了解決這個問題，C++ 委員會增加了一項要求，讓編譯器實現“對稱轉移”，以避免堆疊溢出，而這實際上意味著在內部使用尾呼叫。

當啟用了 WebAssembly 的尾呼叫時，Clang 會根據該部落格文章中的描述實現對稱轉移；但如果未啟用尾呼叫，Clang 會靜默編譯代碼，未實現對稱轉移，這可能導致堆疊溢出，因此技術上不是正確的 C++20 實現！

為了看到其中的差異，可以使用 Emscripten 編譯上述部落格文章中的最後一個例子，並觀察只有在啟用了尾呼叫時才會避免堆疊溢出。請注意，由於最近修復的一個錯誤，這僅在 Emscripten 3.1.35 或更新版本中正確運作。

## V8 中的尾呼叫

如我們之前所見，檢測尾部位置中的呼叫並非引擎的責任。這應該由上游工具鏈完成。因此，TurboFan（V8 的優化編譯器）唯一需要做的事情就是根據呼叫類型和目標函數的簽名發出適當的指令序列。以我們之前的 Fibonacci 範例為例，堆疊的情況如下：

![TurboFan 中的簡單尾呼叫](/_img/wasm-tail-calls/tail-calls.svg)

在左側，我們位於 `fib_rec`（綠色）中，由 `fib`（藍色）呼叫，即將遞歸尾呼叫 `fib_rec`。我們首先通過重置幀指針和堆疊指針解除當前幀。幀指針僅通過從“呼叫者 FP”槽中讀取之前的值來恢復。堆疊指針移動到父幀的頂部，再加上任何潛在堆疊參數和堆疊返回值所需的空間（此處為 0，一切都通過寄存器傳遞）。參數按照 `fib_rec` 的鏈接方式（未在圖中顯示）移動到其期望的寄存器中。最後，我們開始運行 `fib_rec`，其首先創建一個新幀。

`fib_rec` 自身不斷解除與重新構建，直到 `n == 0`，此時它通過寄存器將 `a` 返回給 `fib`。

這是一個簡單的案例，所有參數和返回值都可以存入寄存器中，且被呼叫者與呼叫者的簽名相同。在一般情況下，我們可能需要進行更複雜的堆疊操作：

- 從舊幀讀取輸出參數
- 將參數移動到新幀
- 根據被呼叫者中的堆疊參數數量，通過向上或向下移動返回地址調整幀大小

所有這些讀寫操作可能會互相衝突，因為我們在重用相同的堆疊空間。這與非尾呼叫存在根本差異，非尾呼叫只是將所有堆疊參數和返回地址堆疊到堆疊之上。

![TurboFan 中的複雜尾呼叫](/_img/wasm-tail-calls/tail-calls-complex.svg)

TurboFan 使用“間隙解析器”處理這些堆疊和寄存器操作，該元件接受一組應以平行方式執行的移動操作清單，並生成適當的移動序列來解決移動源與目標之間潛在的干擾。若衝突為非循環型，這只需重新排序移動順序，使所有源在被覆蓋之前被讀取即可。對於循環型衝突（例如交換兩個堆疊參數的情況），這可能需要將其中一個來源移動到臨時寄存器或臨時堆疊槽來打破循環。

Liftoff，我們的基線編譯器，也支持尾呼叫。事實上，它們必須支持，否則基線代碼可能會耗盡堆疊空間。然而，在此層中尾呼叫未被優化：Liftoff 將參數、返回地址和框架指針推入以完成框架，就像這是一個常規呼叫一樣，然後向下移動所有內容以丟棄呼叫者框架：

![Liftoff 中的尾呼叫](/_img/wasm-tail-calls/tail-calls-liftoff.svg)

在跳轉到目標函數之前，我們還會將呼叫者的 FP 彈出到 FP 寄存器中，以恢復其先前的值，並讓目標函數在序言中再次推入。

此策略不需要我們分析和解決移動衝突，這使得編譯速度更快。生成的代碼運行速度較慢，但如果函數足夠熱，最終會[升級](/blog/wasm-dynamic-tiering)到 TurboFan。
