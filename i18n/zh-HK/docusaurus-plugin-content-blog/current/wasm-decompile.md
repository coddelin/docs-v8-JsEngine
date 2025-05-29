---
title: &apos;裡面的 `.wasm` 是什麼？介紹一下：`wasm-decompile`&apos;
author: &apos;Wouter van Oortmerssen ([@wvo](https://twitter.com/wvo))&apos;
avatars:
  - &apos;wouter-van-oortmerssen&apos;
date: 2020-04-27
tags:
  - WebAssembly
  - 工具
description: &apos;WABT 新增了一個反編譯工具，可以讓閱讀 Wasm 模組內容更容易一些。&apos;
tweet: &apos;1254829913561014272&apos;
---
我們有越來越多的編譯器和其他工具生成或操作 `.wasm` 文件，有時您可能想要看看其內部結構。也許您是此類工具的開發者，或者更直接地說，您是一個面向 Wasm 的程序員，並想了解生成的代碼模樣，這樣做是出於性能或其他原因。

<!--truncate-->
問題在於，Wasm 是比較低階的，就像實際的組合代碼。特別是，與 JVM 不同，所有數據結構都已被編譯成加載/存儲操作，而不是方便命名的類和字段。像 LLVM 這樣的編譯器可以進行大量的轉換，使生成的代碼看起來與輸入代碼完全不同。

## 反編譯還是..解碼？

您可以使用像 `wasm2wat`（[WABT](https://github.com/WebAssembly/wabt) 工具包的一部分）這樣的工具，將 `.wasm` 轉換為 Wasm 的標準文本格式 `.wat`，這是一個非常忠實，但不太易讀的表示。

例如，下面是一個簡單的 C 函數，比如點積計算：

```c
typedef struct { float x, y, z; } vec3;

float dot(const vec3 *a, const vec3 *b) {
    return a->x * b->x +
           a->y * b->y +
           a->z * b->z;
}
```

我們使用 `clang dot.c -c -target wasm32 -O2`，然後使用 `wasm2wat -f dot.o` 將其轉換成這樣的 `.wat`：

```wasm
(func $dot (type 0) (param i32 i32) (result f32)
  (f32.add
    (f32.add
      (f32.mul
        (f32.load
          (local.get 0))
        (f32.load
          (local.get 1)))
      (f32.mul
        (f32.load offset=4
          (local.get 0))
        (f32.load offset=4
          (local.get 1))))
    (f32.mul
      (f32.load offset=8
        (local.get 0))
      (f32.load offset=8
        (local.get 1))))))
```

那是一段非常少量的代碼，但已經因許多原因不太好閱讀。除了缺乏基於表達式的語法以及普遍冗長之外，理解將數據結構視為內存加載操作並不容易。現在想象看看一個大型程序的輸出，情況會很快變得難以理解。

與其使用 `wasm2wat`，運行 `wasm-decompile dot.o`，您會看到：

```c
function dot(a:{ a:float, b:float, c:float },
             b:{ a:float, b:float, c:float }):float {
  return a.a * b.a + a.b * b.b + a.c * b.c
}
```

這看起來更熟悉。除了基於表達式的語法模仿您可能熟悉的編程語言外，反編譯器還查看了函數中的所有加載和存儲，並嘗試推斷其結構。然後它為每個用作指針的變量附加了一個"內聯"的結構聲明。它並不會創建具名結構聲明，因為它不一定知道哪一組 3 個浮點數表示相同的概念。

## 反編譯至什麼？

`wasm-decompile` 生成的輸出試圖看起來是"非常平均的編程語言"，同時仍然緊密貼合其所表示的 Wasm。

它的目標 #1 是可讀性：幫助讀者以盡可能易於理解的代碼了解 `.wasm` 中的內容。其目標 #2 是仍然儘可能基於 1:1 表示 Wasm，以便不失去作為反編譯器的實用性。顯然，這兩個目標並不總是可以統一。

這個輸出並不是設計成實際的編程語言，當前沒有方法將其編譯回 Wasm。

### 加載和存儲

如上所示，`wasm-decompile` 查看針對特定指針的所有加載和存儲操作。如果它們形成一組連續的訪問，它將輸出其中之一的"內聯"結構聲明。

如果並非所有"字段"都被訪問，無法確定這是否應該是一個結構，或是某種形式的無關內存訪問。在此情況下，它回退到簡單類型如 `float_ptr`（如果類型相同），或者在最壞的情況下，輸出一個數組訪問如 `o[2]:int`，意思是：`o` 指向 `int` 值，我們正在訪問第三個。

這個最後的情況比您想像的更常見，因為 Wasm 局部變量更像是寄存器而不是變量，因此優化代碼可能會為無關對象共享相同的指針。

反編譯器試圖在索引方面更智能，並檢測模式如 `(base + (index << 2))[0]:int`，這是常見的 C 數組索引操作如 `base[index]` 的結果，其中 `base` 指向一個 4 字節類型。這些在代碼中非常常見，因為 Wasm 在加載和存儲中僅具有固定偏移量。`wasm-decompile` 將它們轉回 `base[index]:int`。

此外，它知道當絕對地址引用數據段時。

### 控制流程

最為人熟悉的是 Wasm 的 if-then 結構，它相當於熟悉的 `if (cond) { A } else { B }` 語法，另外在 Wasm 中它可以實際返回一個值，因此它也可以表示某些語言可用的三元運算子語法 `cond ? A : B`。

Wasm 的其餘控制流程基於 `block` 和 `loop` 塊，以及 `br`、`br_if` 和 `br_table` 跳躍指令。反編譯器與這些結構保持相當接近，而不是試圖推導它們可能源自的 while/for/switch 結構，因為通常這樣處理能更好地應對優化過的輸出。例如，典型的循環在 `wasm-decompile` 的輸出中可能看起來像這樣：

```c
loop A {
  // 這裡是循環的主體。
  if (cond) continue A;
}
```

這裡的 `A` 是一個標籤，允許多個這樣的循環嵌套。使用 `if` 和 `continue` 來控制循環可能相比 while 循環顯得有些不習慣，但它直接對應於 Wasm 的 `br_if`。

塊類似，但不是向後分支，而是向前分支：

```c
block {
  if (cond) break;
  // 主體內容在這裡。
}
```

這實際上實現了一個 if-then。未來版本的反編譯器在可能的情況下可能會將其轉換為真正的 if-then。

Wasm 最令人驚訝的控制結構是 `br_table`，它的功能類似於一個 `switch`，但使用嵌套的 `block`，這往往很難閱讀。反編譯器將它展平，使其更容易理解，例如：
稍微容易理解：

```c
br_table[A, B, C, ..D](a);
label A:
return 0;
label B:
return 1;
label C:
return 2;
label D:
```

這類似於基於 `a` 的 `switch`，其中 `D` 是默認情況。

### 其他有趣的功能

反編譯器：

- 能夠從除錯或鏈接信息中提取名稱，或者自行生成名稱。使用現有名稱時，它有特殊的代碼可簡化 C++ 名稱重整的符號。
- 已經支持多值提案，這使得將內容轉化為表達式和語句更困難。當返回多個值時，會使用額外的變量。
- 它甚至可以從數據段的_內容_生成名稱。
- 為所有 Wasm 區段類型生成美觀的聲明，而不僅僅是代碼。例如，它嘗試通過將數據段以文本形式輸出（如果可能）來使其可讀。
- 支持運算符優先級（大多數 C 風格語言通用）以減少常見表達式中的 `()`。

### 限制

反編譯 Wasm 從根本上說比反編譯 JVM 字節碼困難。

後者未經優化，因此相對忠實於原始代碼的結構，並且即使名字可能丟失，也指向唯一的類，而不是僅僅的內存位置。

相比之下，大多數 `.wasm` 输出经过了 LLVM 的深度优化，因此通常失去了大部分原始結構。输出代码與程序员编写的代码非常不同。这使得 Wasm 的反編譯器成为更大的挑战，但这不意味着我们不应该尝试！

## 更多

查看更多内容的最佳方法当然是反编译自己的 Wasm 项目！

此外，有关 `wasm-decompile` 的更深入指南在[此處](https://github.com/WebAssembly/wabt/blob/master/docs/decompiler.md)。其實現位於[此處](https://github.com/WebAssembly/wabt/tree/master/src)中以 `decompiler` 開頭的源文件中（歡迎提交拉取請求以使其更好！）。一些測試用例展示了 `.wat` 和反編譯器之間差異的更多示例，可以在[此處](https://github.com/WebAssembly/wabt/tree/master/test/decompile)找到。
