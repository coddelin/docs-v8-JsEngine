---
title: "使用 V8 的基於樣本的分析器"
description: "本文檔解釋了如何使用 V8 的基於樣本的分析器。"
---
V8 內建了基於樣本的性能分析功能。分析默認為關閉狀態，但可以通過 `--prof` 命令行選項啟用。採樣器會記錄 JavaScript 和 C/C++ 代碼的堆棧。

## 構建

按照 [使用 GN 構建](/docs/build-gn) 的說明構建 `d8` 殼層。

## 命令行

要開始進行性能分析，請使用 `--prof` 選項。在分析過程中，V8 會生成一個包含分析數據的 `v8.log` 文件。

Windows:

```bash
build\Release\d8 --prof script.js
```

其他平台（如果想分析 `x64` 構建，請將 `ia32` 替換為 `x64`）：

```bash
out/ia32.release/d8 --prof script.js
```

## 處理生成的輸出

日誌文件處理是通過在 d8 殼層中運行 JS 腳本完成的。為了實現這一功能，`d8` 可執行文件（或符號鏈接，或者在 Windows 系統中的 `d8.exe`）需要位於您的 V8 源碼檢出目錄的根目錄下，或者位於環境變數 `D8_PATH` 指定的路徑中。注意：這個二進制文件僅用於處理日誌，而非實際的性能分析，因此其版本等並不重要。

**確保用於分析的 `d8` 沒有以 `is_component_build` 構建！**

Windows:

```bash
tools\windows-tick-processor.bat v8.log
```

Linux:

```bash
tools/linux-tick-processor v8.log
```

macOS:

```bash
tools/mac-tick-processor v8.log
```

## `--prof` 的 Web UI

通過使用 `--preprocess` 預處理日誌（以解析 C++ 符號等）。

```bash
$V8_PATH/tools/linux-tick-processor --preprocess > v8.json
```

在瀏覽器中打開 [`tools/profview/index.html`](https://v8.dev/tools/head/profview)，並選擇那裡的 `v8.json` 文件。

## 例子輸出

```
基準測試中的統計分析結果 benchmarks\v8.log, (4192 ticks, 0 未計算, 0 排除)。

 [共享庫]:
   ticks  total  nonlib   name
      9    0.2%    0.0%  C:\WINDOWS\system32\ntdll.dll
      2    0.0%    0.0%  C:\WINDOWS\system32\kernel32.dll

 [JavaScript]:
   ticks  total  nonlib   name
    741   17.7%   17.7%  LazyCompile: am3 crypto.js:108
    113    2.7%    2.7%  LazyCompile: Scheduler.schedule richards.js:188
    103    2.5%    2.5%  LazyCompile: rewrite_nboyer earley-boyer.js:3604
    103    2.5%    2.5%  LazyCompile: TaskControlBlock.run richards.js:324
     96    2.3%    2.3%  Builtin: JSConstructCall
    ...

 [C++]:
   ticks  total  nonlib   name
     94    2.2%    2.2%  v8::internal::ScavengeVisitor::VisitPointers
     33    0.8%    0.8%  v8::internal::SweepSpace
     32    0.8%    0.8%  v8::internal::Heap::MigrateObject
     30    0.7%    0.7%  v8::internal::Heap::AllocateArgumentsObject
    ...


 [GC]:
   ticks  total  nonlib   name
    458   10.9%

 [自底向上的（重點）分析]:
  注意：百分比顯示某個調用在其父調用總量中所佔比重。
  占比小於 2.0％ 的調用者未顯示。

   ticks parent  name
    741   17.7%  LazyCompile: am3 crypto.js:108
    449   60.6%    LazyCompile: montReduce crypto.js:583
    393   87.5%      LazyCompile: montSqrTo crypto.js:603
    212   53.9%        LazyCompile: bnpExp crypto.js:621
    212  100.0%          LazyCompile: bnModPowInt crypto.js:634
    212  100.0%            LazyCompile: RSADoPublic crypto.js:1521
    181   46.1%        LazyCompile: bnModPow crypto.js:1098
    181  100.0%          LazyCompile: RSADoPrivate crypto.js:1628
    ...
```

## 分析網頁應用程序

當今的高度優化虛擬機可以讓網頁應用程序運行得非常快速。但是，僅僅依賴它們來實現卓越的性能可能還遠遠不夠：精心優化的算法或更少代價的函數往往能在所有瀏覽器上實現數倍性能提升。[Chrome 開發者工具](https://developers.google.com/web/tools/chrome-devtools/)的 [CPU 分析器](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/reference) 有助於您分析代碼的瓶頸問題。但有時候，您需要更深入、更細粒度的分析：這正是 V8 的內部分析器派上用場的時候。

讓我們使用該分析器來分析 [Mandelbrot 探索器演示](https://web.archive.org/web/20130313064141/http://ie.microsoft.com/testdrive/performance/mandelbrotexplorer/)，這是 Microsoft [推出](https://blogs.msdn.microsoft.com/ie/2012/11/13/ie10-fast-fluid-perfect-for-touch-and-available-now-for-windows-7/) 的 IE10 附帶的演示版本。在該演示發布後，V8 修復了一個導致計算不必要變慢的錯誤（因此在演示的博客文章中 Chrome 性能表現不佳），並進一步優化了引擎，實現了一個比標準系統庫提供的更快速的 `exp()` 近似算法。隨著這些更改，**演示在 Chrome 上的運行速度比先前測量的快了 8 倍**。

但是如果你希望程式碼在所有瀏覽器上都能跑得更快呢？你應該首先**了解你的 CPU 忙於什麼**。在 Chrome（Windows 和 Linux [Canary](https://tools.google.com/dlpage/chromesxs)）中使用以下命令列參數，這將使它為你指定的 URL（在我們的例子中，是沒有 Web workers 的 Mandelbrot 示範本地版本）輸出 profiler 擷取資料（到 `v8.log` 檔案）：

```bash
./chrome --js-flags='--prof' --no-sandbox 'http://localhost:8080/'
```

在準備測試案例時，確保它在加載完成後立即開始工作，並當計算完成時關閉 Chrome（按 Alt+F4），這樣就只有你關心的擷取資料會出現在日誌檔案中。另外，請注意，使用此技術對 web workers 的分析還不正確。

接著，使用 V8 附帶的 `tick-processor` 腳本處理 `v8.log` 檔案（或新的實用的線上版本）：

```bash
v8/tools/linux-tick-processor v8.log
```

下面是一段處理後的輸出裡的有趣片段，應該能引起你的注意：

```
統計分析結果來自 null，（14306 擷取，0 未計，0 排除）。
 [共用函式庫]:
   擷取  總計  非函式庫   名稱
   6326   44.2%    0.0%  /lib/x86_64-linux-gnu/libm-2.15.so
   3258   22.8%    0.0%  /.../chrome/src/out/Release/lib/libv8.so
   1411    9.9%    0.0%  /lib/x86_64-linux-gnu/libpthread-2.15.so
     27    0.2%    0.0%  /.../chrome/src/out/Release/lib/libwebkit.so
```

頂部區域顯示 V8 花了比它自身程式碼更多的時間在一個跟操作系統有關的系統函式庫中。讓我們通過檢視「自底向上」的輸出區域來了解這些時間的原因，在這裡你可以讀取縮排的行作為「被呼叫自」（行開頭帶有 `*` 表示該函式已被 TurboFan 優化）：

```
[自底向上的（重度）分析]:
  注意：百分比顯示特定呼叫者在其父呼叫中的比例。
  佔比少於 2.0% 的呼叫者未顯示。

   擷取 父級  名稱
   6326   44.2%  /lib/x86_64-linux-gnu/libm-2.15.so
   6325  100.0%    LazyCompile: *exp native math.js:91
   6314   99.8%      LazyCompile: *calculateMandelbrot http://localhost:8080/Demo.js:215
```

**總時間的 44% 以上花在執行系統函式庫中的 `exp()` 函式上**！加上一些調用系統函式庫的額外負擔，這意味著整體時間的大約三分之二花在了評估 `Math.exp()` 上。

如果你查看 JavaScript 程式碼，你會發現 `exp()` 的唯一用途是生成平滑的灰階調色板。生成平滑灰階調色板的方法有無數種，但假設你真的非常喜歡指數梯度。這裡正是演算法優化派上用場的地方。

你會注意到 `exp()` 被調用時的範圍是 `-4 < x < 0`，因此我們可以安全地將其替換為該範圍下的 [Taylor 近似](https://en.wikipedia.org/wiki/Taylor_series)，以僅僅使用一次乘法和幾次除法來生成同樣的平滑梯度：

```
exp(x) ≈ 1 / ( 1 - x + x * x / 2) for -4 < x < 0
```

通過這種方式微調演算法，與最新的 Canary 相比表現多提升了額外的 30%，與基於系統函式庫的 `Math.exp()` 在 Chrome Canary 中的表現相比提升了 5 倍。

![](/_img/docs/profile/mandelbrot.png)

這個例子展示了 V8 的內部分析工具如何幫助你更深入了解程式碼的瓶頸，以及更聰明的演算法如何進一步提升性能。

要了解更多關於反映當今複雜且要求較高的網頁應用程式的基準測試，請閱讀 [V8 如何衡量真實世界的性能](/blog/real-world-performance)。
