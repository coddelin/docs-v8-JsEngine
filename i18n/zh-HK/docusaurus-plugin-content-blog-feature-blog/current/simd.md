---
title: '快速、平行應用程式與 WebAssembly SIMD'
author: 'Deepti Gandluri ([@dptig](https://twitter.com/dptig))、Thomas Lively ([@tlively52](https://twitter.com/tlively52))、Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
date: 2020-01-30
updated: 2022-11-06
tags:
  - WebAssembly
description: '將向量操作引入 WebAssembly'
tweet: '1222944308183085058'
---
SIMD 代表 _單指令，多資料_。SIMD 指令是一種特別的指令類型，通過同時對多個資料元素進行相同的操作來利用應用程式中的資料平行性。對計算密集型應用程式，例如音訊／影片編解碼器、影像處理器，都是利用 SIMD 指令加速性能的典型範例。大多數現代架構都支援某些種類的 SIMD 指令。

<!--truncate-->
WebAssembly SIMD 提案定義了一個跨大多數現代架構可使用的可攜化、高效能的 SIMD 操作子集。該提案許多元素源自 [SIMD.js 提案](https://github.com/tc39/ecmascript_simd)，而該提案最初來源於 [Dart SIMD](https://www.researchgate.net/publication/261959129_A_SIMD_programming_model_for_dart_javascriptand_other_dynamically_typed_scripting_languages) 規範。SIMD.js 提案是一種 API，該 API 在 TC39 被提議，包含支援 SIMD 計算的新型態和函數，但最後被棄用，以支持更透明地在 WebAssembly 中支援 SIMD 操作。[WebAssembly SIMD 提案](https://github.com/WebAssembly/simd) 被引入，作為一種方法使瀏覽器能利用底層硬體的資料層級平行性。

## WebAssembly SIMD 提案

WebAssembly SIMD 提案的高層次目標是以保證可攜化效能的方式，將向量操作引入 WebAssembly 規範。

SIMD 指令集很大，並且在不同架構上有差異。WebAssembly SIMD 提案中包含的操作是那些在廣泛的平臺上支援良好且被證明效能卓越的。為此，目前提案僅限於標準化固定寬度的 128 位元 SIMD 操作。

目前提案引入了一個新的 `v128` 值類型，以及許多基於此類型的新操作。選擇這些操作的標準是：

- 這些操作在多個現代架構中應有良好的支援。
- 在相關指令組內多個架構上的性能收益應為正。
- 所選的操作集合應盡量減少可能的性能斷層。

該提案現在進入了[最終狀態（階段4）](https://github.com/WebAssembly/simd/issues/480)，V8 和其工具鏈已具有工作實現。

## 啟用 SIMD 支援

### 功能檢測

首先需要注意的是，SIMD 是一項新功能，尚未在所有支持 WebAssembly 的瀏覽器中可用。您可以在 [webassembly.org](https://webassembly.org/roadmap/) 網站上找到哪些瀏覽器支持新的 WebAssembly 功能。

為確保所有使用者都能加載您的應用程式，您需要建立兩個不同版本 - 一個啟用了 SIMD，另一個沒有啟用 - 並根據功能檢測結果加載相應的版本。要在運行時檢測 SIMD，您可以使用 [`wasm-feature-detect`](https://github.com/GoogleChromeLabs/wasm-feature-detect) 庫，並像這樣加載相應模組：

```js
import { simd } from 'wasm-feature-detect';

(async () => {
  const hasSIMD = await simd();
  const module = await (
    hasSIMD
      ? import('./module-with-simd.js')
      : import('./module-without-simd.js')
  );
  // …現在像通常那樣使用 `module`
})();
```

要了解如何建立帶有 SIMD 支援的程式碼，請查看[如下](#building-with-simd-support) 的章節。

### 瀏覽器中的 SIMD 支援

WebAssembly SIMD 從 Chrome 91 開始預設可用。請確保使用下文所述的最新工具鏈版本，以及最新的 wasm-feature-detect 庫，以檢測支持最終版規範的引擎。如有任何異常情況，請[提交問題](https://crbug.com/v8)。

WebAssembly SIMD 也在 Firefox 89 及以上版本中受到支持。

## 建立支持 SIMD 的程式

### 建立面向 SIMD 的 C / C++

WebAssembly 的 SIMD 支援需要使用啟用了 WebAssembly LLVM 後端的最新版本 clang。Emscripten 也支持 WebAssembly SIMD 提案。使用 [emsdk](https://emscripten.org/docs/getting_started/downloads.html) 安裝並啟用 Emscripten 的 `latest` 發行版本，以使用 SIMD 功能。

```bash
./emsdk install latest
./emsdk activate latest
```

在將您的應用程式移植使用 SIMD 時，有幾種啟用生成 SIMD 程式碼的方式。安裝最新的上游 emscripten 版本後，使用 emscripten 編譯並傳遞 `-msimd128` 標誌以啟用 SIMD。

```bash
emcc -msimd128 -O3 foo.c -o foo.js
```

已經移植到使用 WebAssembly 的應用程式可能會受益於 SIMD，而無需對原始程式碼進行修改，這得益於 LLVM 的自動向量化優化。

這些優化可以自動將每次迴圈迭代中進行算術運算的迴圈轉換為等效的迴圈，使用 SIMD 指令同時在多個輸入上執行相同的算術運算。當提供 `-msimd128` 標誌時，LLVM 的自動向量化器在優化等級 `-O2` 和 `-O3` 中預設啟用。

例如，下面是一個將兩個輸入陣列的元素相乘並將結果存儲到輸出陣列中的函數。

```cpp
void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i++) {
    out[i] = in_a[i] * in_b[i];
  }
}
```

在未傳遞 `-msimd128` 標誌的情況下，編譯器會生成以下 WebAssembly 迴圈:

```wasm
(loop
  (i32.store
    … get address in `out` …
    (i32.mul
      (i32.load … get address in `in_a` …)
      (i32.load … get address in `in_b` …)
  …
)
```

但是使用 `-msimd128` 標誌時，自動向量化器會將其轉換為包含以下迴圈的程式碼:

```wasm
(loop
  (v128.store align=4
    … get address in `out` …
    (i32x4.mul
       (v128.load align=4 … get address in `in_a` …)
       (v128.load align=4 … get address in `in_b` …)
    …
  )
)
```

迴圈主體具有相同的結構，但在迴圈主體內使用 SIMD 指令一次處理四個元素的載入、相乘和存儲。

若要更細粒度地控制由編譯器生成的 SIMD 指令，包含 [`wasm_simd128.h` 標頭檔案](https://github.com/llvm/llvm-project/blob/master/clang/lib/Headers/wasm_simd128.h)，該標頭檔案定義了一組內聯函數。內聯函數是特殊的函數，在呼叫時，編譯器會將其轉換為對應的 WebAssembly SIMD 指令，除非它可以進行更多優化。

例如，下面是手動重寫為使用 SIMD 內聯函數的相同函數。

```cpp
#include <wasm_simd128.h>

void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i += 4) {
    v128_t a = wasm_v128_load(&in_a[i]);
    v128_t b = wasm_v128_load(&in_b[i]);
    v128_t prod = wasm_i32x4_mul(a, b);
    wasm_v128_store(&out[i], prod);
  }
}
```

這段手動重寫的程式碼假定輸入和輸出陣列是對齊的且不別名，並且 size 是 4 的倍數。自動向量化器無法做出這些假設，必須生成額外的程式碼以處理不滿足這些條件的情況，因此手寫 SIMD 程式碼通常比自動向量化的 SIMD 程式碼更小。

### 交叉編譯現有的 C / C++ 專案

許多現有專案在針對其他平臺時已經支援 SIMD，尤其是在 x86 / x86-64 平臺上的 [SSE](https://en.wikipedia.org/wiki/Streaming_SIMD_Extensions) 和 [AVX](https://en.wikipedia.org/wiki/Advanced_Vector_Extensions) 指令以及 ARM 平臺上的 [NEON](https://en.wikipedia.org/wiki/ARM_architecture#Advanced_SIMD_(Neon)) 指令。通常有兩種方式實現這些功能。

第一種方式是通過匯編檔案來處理 SIMD 運算，並在建構過程中與 C / C++ 連結在一起。匯編語法和指令高度依賴平臺且不可移植，因此，為了利用 SIMD，此類專案需要增加對 WebAssembly 的支援目標，並使用 [WebAssembly 文本格式](https://webassembly.github.io/spec/core/text/index.html) 或上述內聯函數重新實現對應的功能。

另一種常見方式是直接從 C / C++ 程式碼中使用 SSE / SSE2 / AVX / NEON 內聯函數，此時 Emscripten 可以起到幫助作用。Emscripten [提供相容標頭檔和模擬層](https://emscripten.org/docs/porting/simd.html) 對於所有這些指令集，並提供一個模擬層，將其直接編譯為 Wasm 內聯函數或其他情況則編譯為標量程式碼。

要交叉編譯此類專案，首先通過專案特定的配置標誌啟用 SIMD，例如 `./configure --enable-simd`，以便它傳遞 `-msse`、`-msse2`、`-mavx` 或 `-mfpu=neon` 給編譯器並呼叫對應的內聯函數。然後，額外傳遞 `-msimd128` 以同時啟用 WebAssembly SIMD，可以使用 `CFLAGS=-msimd128 make …` / `CXXFLAGS="-msimd128 make …` 或直接在建置配置中修改以針對 Wasm。

### 建構 Rust 以支援 SIMD

當將 Rust 程式碼編譯為支援 WebAssembly SIMD 時，您需要啟用與上述 Emscripten 相同的 `simd128` LLVM 特性。

如果您可以直接控制 `rustc` 標誌或者通過環境變數 `RUSTFLAGS`，傳遞 `-C target-feature=+simd128`:

```bash
rustc … -C target-feature=+simd128 -o out.wasm
```

或

```bash
RUSTFLAGS="-C target-feature=+simd128" cargo build
```

與在 Clang / Emscripten 中相同，啟用 `simd128` 特性時，LLVM 的自動向量化器默認為優化代碼啟用。

例如，上述 `multiply_arrays` 的 Rust 等效代碼

```rust
pub fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.iter()
    .zip(in_b)
    .zip(out)
    .for_each(|((a, b), dst)| {
        *dst = a * b;
    });
}
```

會為輸入的對齊部分生成類似的自動向量化代碼。

如果需要手動控制 SIMD 操作，可以使用夜間工具鏈，啟用 Rust 特性 `wasm_simd` 並直接從 [`std::arch::wasm32`](https://doc.rust-lang.org/stable/core/arch/wasm32/index.html#simd) 命名空間調用內部函數：

```rust
#![feature(wasm_simd)]

use std::arch::wasm32::*;

pub unsafe fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.chunks(4)
    .zip(in_b.chunks(4))
    .zip(out.chunks_mut(4))
    .for_each(|((a, b), dst)| {
      let a = v128_load(a.as_ptr() as *const v128);
      let b = v128_load(b.as_ptr() as *const v128);
      let prod = i32x4_mul(a, b);
      v128_store(dst.as_mut_ptr() as *mut v128, prod);
    });
}
```

或者，使用像 [`packed_simd`](https://crates.io/crates/packed_simd_2) 這樣的助手庫，跨越多個平台的 SIMD 實現進行抽象。

## 引人注目的用途

WebAssembly SIMD 提案旨在加速高計算應用，例如音頻/視頻編解碼器、圖像處理應用程序、加密應用程序等。目前，WebAssembly SIMD 在普遍使用的開源項目中已實驗性支持，例如 [Halide](https://github.com/halide/Halide/blob/master/README_webassembly.md)、[OpenCV.js](https://docs.opencv.org/3.4/d5/d10/tutorial_js_root.html) 和 [XNNPACK](https://github.com/google/XNNPACK)。

一些有趣的演示來自 Google Research 團隊的 [MediaPipe 項目](https://github.com/google/mediapipe)。

根據其描述，MediaPipe 是一個構建多模態（例如視頻、音頻、任何時間序列數據）應用機器學習管道的框架。而且它也有 [Web 版](https://developers.googleblog.com/2020/01/mediapipe-on-web.html)！

其中一個最具視覺吸引力的演示，在 CPU 上（非 GPU）構建的手部跟踪系統，非常容易觀察 SIMD 所帶來的性能差異。[在沒有 SIMD 的情況下](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking/gl_graph_demo.html)，現代筆記本電腦上只能得到大約 14-15 FPS（每秒幀數），而 [在 Chrome Canary 中啟用了 SIMD](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking_simd/gl_graph_demo.html) 後，可以獲得更流暢的 38-40 FPS。

<figure>
  <video autoplay muted playsinline loop width="600" height="216" src="/_img/simd/hand.mp4"></video>
</figure>

另一組利用 SIMD 獲得流暢體驗的有趣演示來自 OpenCV——一個流行的計算機視覺庫，也可以編譯為 WebAssembly。它們可通過 [鏈接](https://bit.ly/opencv-camera-demos) 來訪問，或者查看以下預錄版本：

<figure>
  <video autoplay muted playsinline loop width="256" height="512" src="/_img/simd/credit-card.mp4"></video>
  <figcaption>卡片讀取</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="646" src="/_img/simd/invisibility-cloak.mp4"></video>
  <figcaption>隱形斗篷</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="658" src="/_img/simd/emotion-recognizer.mp4"></video>
  <figcaption>表情符號替換</figcaption>
</figure>

## 未來工作

目前固定寬度 SIMD 提案處於 [Phase 4](https://github.com/WebAssembly/meetings/blob/master/process/phases.md#3-implementation-phase-community--working-group)，因此被認為是完成的。

一些未來 SIMD 擴展探索已在 [Relaxed SIMD](https://github.com/WebAssembly/relaxed-simd) 和 [Flexible Vectors](https://github.com/WebAssembly/flexible-vectors) 提案中開始，其在撰寫本文時處於 Phase 1。
