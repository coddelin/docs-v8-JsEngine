---
title: '介紹 WebAssembly JavaScript Promise Integration API'
description: '本文介紹 JSPI，並提供一些簡單的範例以幫助您開始使用它'
author: 'Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl'
date: 2024-07-01
tags:
  - WebAssembly
---
JavaScript Promise Integration (JSPI) API 允許使用假設 _同步_ 訪問外部功能編寫的 WebAssembly 應用程式在實際功能 _非同步_ 的環境中順暢運行。

<!--truncate-->
本文概要介紹 JSPI API 的核心功能、如何訪問它、如何為其開發軟體，並提供一些可以嘗試的範例。

## JSPI 的用途是什麼？

非同步 API 的操作通過分離操作的 _啟動_ 與其 _完成_ 來進行；後者是在前者之後的一段時間完成。最重要的是，應用程式在啟動操作後繼續執行；並在操作完成時收到通知。

例如，使用 `fetch` API，Web 應用程式可以訪問與 URL 關聯的內容；然而，`fetch` 函數不直接返回抓取的結果；相反，它返回了一個 `Promise` 對象。透過附加一個 _回呼函數_ 到那個 `Promise` 對象，重新建立抓取響應與原始請求之間的連繫。該回呼函數可以檢視響應並收集數據（當然如果有數據的話）。

在許多情況下，C/C++（以及許多其他語言）應用程式最初是針對 _同步_ API 編寫的。例如，Posix 的 `read` 函數在 I/O 操作完成之前不會完成：`read` 函數 *阻塞* 直到讀取完成。

然而，瀏覽器的主執行緒不允許阻塞；許多環境也不支持同步編程。這導致了應用程式程序員期望使用易於使用的 API 需求與更廣泛的生態系統——要求 I/O 使用非同步代碼編寫——之間的不匹配。這對於需要昂貴移植的現有的遺留應用尤其是個問題。

JSPI 是一個跨越同步應用與非同步 Web API 之間差距的 API。它透過攔截非同步 Web API 函數返回的 `Promise` 對象並 _暫停_ WebAssembly 應用程式來工作。當非同步 I/O 操作完成後，WebAssembly 應用程式會被 _恢復_。這使得 WebAssembly 應用程式可以使用直線式代碼來完成非同步操作並處理其結果。

重要的是，使用 JSPI 幾乎不需要對 WebAssembly 應用程式本身進行任何更改。

### JSPI 如何運作？

JSPI 透過攔截從調用 JavaScript 的返回值 `Promise` 對象並暫停 WebAssembly 應用程式的主要邏輯來工作。附加到此 `Promise` 對象的回呼函數會在瀏覽器的事件循環任務執行器調用時恢復暫停的 WebAssembly 代碼。

此外，WebAssembly 的導出被改寫以返回一個 `Promise` 對象 &mdash; 而不是原始的導出的返回值。此 `Promise` 對象成為 WebAssembly 應用程式返回的值：當 WebAssembly 代碼被暫停時,[^first] 導出的 `Promise` 對象作為進入 WebAssembly 的調用返回值。

[^first]: 如果 WebAssembly 應用程式被多次暫停，後續的暫停將返回到瀏覽器的事件循環，並且不會直接對 Web 應用程式可見。

當原始調用完成時，導出的 Promise 被解析：如果原始的 WebAssembly 函數返回正常值，則導出的 `Promise` 對象用該值（轉換為 JavaScript 對象）完成解析；如果拋出異常，則導出的 `Promise` 對象被拒絕。

#### 包裝匯入和導出

這通過在 WebAssembly 模組的實例化階段 _包裝_ 匯入和導出來實現。函數包裝器為普通的非同步匯入增加了暫停行為，並將暫停路由到 `Promise` 對象的回呼函數。

不需要包裝 WebAssembly 模組的所有導出和匯入。一些執行路徑不涉及調用非同步 API 的導出最好保留未包裝。同樣，並非所有 WebAssembly 模組的匯入都屬於非同步 API 函數；這些匯入也不應該被包裝。

當然，有大量內部機制支持這些操作；[^1]但 JSPI 並未更改 JavaScript 語言或 WebAssembly 本身。其操作範圍僅限於 JavaScript 與 WebAssembly 之間的邊界。

從網頁應用開發者的角度來看，結果是一段代碼可以參與到 JavaScript 世界中，通過異步函數和 Promises 的方式運作，類似於 JavaScript 中其他異步函數的工作方式。從 WebAssembly 開發者的角度來看，這使得他們可以使用同步 API 編寫應用，但同時也能參與到 Web 的異步生態系統中。

### 預期性能

由於在暫停和恢復 WebAssembly 模組時使用的機制基本上是常數時間的，我們不認為使用 JSPI 會有很高的成本——尤其是相較於其他基於轉換的方法。

傳遞由異步 API 調用返回的 `Promise` 對象至 WebAssembly 需要固定的工作量。同樣，當 Promise 被解決時，WebAssembly 應用可以以固定時間的開銷恢復執行。

然而，與瀏覽器中的其他 Promise 樣式 API 一樣，任何時候當 WebAssembly 應用暫停，它不會被再次“喚醒”，除非是由瀏覽器的任務調度程序引發的。這需要啟動 WebAssembly 計算的 JavaScript 代碼的執行返回給瀏覽器。

### 我可以使用 JSPI 暫停 JavaScript 程序嗎？

JavaScript 已經擁有一個完善的機制來表示異步計算：即 `Promise` 對象和 `async` 函數表示法。JSPI 被設計為與此很好地整合，而不是取代它。

### 我今天可以如何使用 JSPI？

JSPI 當前正在由 W3C WebAssembly 工作組標準化。截至本文撰寫時，它處於標準流程的第 3 階段，我們預期在 2024 年底之前會完成全部標準化。

JSPI 可用於 Linux、MacOS、Windows 和 ChromeOS 上的 Chrome 遊覽器，支援 Intel 和 Arm 平台，包括 64 位和 32 位。[註^firefox]

[^firefox]: JSPI 也可在 Firefox nightly 版本中使用：在 about:config 面板中啟用 "`javascript.options.wasm_js_promise_integration`"，然後重新啟動。

您現在可以以兩種方式使用 JSPI：通過一個 [origin trial](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889) 或者本地通過 Chrome 標誌啟動。要在本地測試，請在 Chrome 中訪問 `chrome://flags`，搜索“Experimental WebAssembly JavaScript Promise Integration (JSPI)”並選中該框。按照提示重新啟動以使其生效。

您應該使用至少版本 `126.0.6478.26` 以獲得最新版本的 API。我們建議使用 Dev 通道以確保任何穩定性更新已應用。此外，如果您希望使用 Emscripten 生成 WebAssembly（我們推薦您這樣做），那麼您應該使用至少版本 `3.1.61`。

啟用後，您應該能夠運行使用 JSPI 的腳本。以下是如何使用 Emscripten 在 C/C++ 中生成一個使用 JSPI 的 WebAssembly 模組。如果您的應用涉及其他語言，例如不使用 Emscripten，我們建議您查看 [提案](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md) 中的 API 工作方式。

#### 限制

JSPI 的 Chrome 實現已經支援典型的用例。然而，它仍被認為是實驗性的，因此需要注意以下幾點限制：

- 需要使用命令行標誌，或參與 origin trial。
- 每次調用一個 JSPI 導出都會使用固定大小的堆棧。
- 調試支援相對較少。特別是，在 Dev 工具面板中查看不同事件可能會有困難。為調試 JSPI 應用提供更豐富的支援已列入規劃路線。

## 一個小示例

為了查看所有這些是如何工作的，我們嘗試一個簡單的例子。這個 C 程序以一種糟糕的方式計算斐波那契數：通過讓 JavaScript 進行加法，更糟的是使用 JavaScript 的 `Promise` 對象：[註^2]

```c
long promiseFib(long x) {
 if (x == 0)
   return 0;
 if (x == 1)
   return 1;
 return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}
// 承諾加法
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});
```

`promiseFib` 函數本身是一個簡單的斐波那契函數的遞歸版本。令人感興趣的部分（從我們的角度來看）是 `promiseAdd` 的定義，它通過 JSPI 執行對兩個斐波那契部分的加法。

我們使用 `EM_ASYNC_JS` Emscripten 宏在我們的 C 程序中將 `promiseFib` 函數寫成一個 JavaScript 函數。由於加法在 JavaScript 中通常不涉及 Promises，我們必須藉由構造一個 `Promise` 強制使其如此。

該 `EM_ASYNC_JS` 宏生成所有必要的膠合代碼，以便我們可以使用 JSPI 獲取 Promise 的結果，就像它是一個普通函數一樣。

為了編譯我們的小示例，我們使用 Emscripten 的 `emcc` 編譯器：[註^4]

```sh
emcc -O3 badfib.c -o b.html -s JSPI
```

這將編譯我們的程序，創建一個可加載的 HTML 文件 (`b.html`)。這裡最特別的命令行選項是 `-s JSPI`。這啟動了使用 JSPI 的選項，用於與返回 Promises 的 JavaScript 導入進行交互。

如果將生成的 `b.html` 文件加載到 Chrome，您應該能夠看到類似以下的輸出：

```
fib(0) 0μs 0μs 0μs
fib(1) 0μs 0μs 0μs
fib(2) 0μs 0μs 3μs
fib(3) 0μs 0μs 4μs
…
fib(15) 0μs 13μs 1225μs
```

這只是第一個15個斐波那契數列的列表，後面跟著計算單個斐波那契數所需的平均時間（微秒）。每行的三個時間值分別指純WebAssembly計算時間、混合JavaScript/WebAssembly計算時間，以及暫停版本計算的時間。

注意，`fib(2)` 是涉及訪問Promise的最小計算，當計算 `fib(15)` 時，大約已進行了1000次對 `promiseAdd` 的調用。這表明JSPI函數的實際成本大約為1μs——明顯高於僅僅添加兩個整數的成本，但遠低於通常需要訪問外部I/O函數所需的毫秒級時間。

## 使用JSPI延遲加載程式碼

在下一個例子中，我們將探討JSPI的一個可能有些意外的用途：動態加載程式碼。其思想是`fetch`一個包含所需程式碼的模組，但將其延遲到第一次調用所需函數時進行。

我們需要使用JSPI，因為像`fetch`這樣的API本質上是異步的，但我們希望能夠從應用程式中的任意位置調用它們——特別是在調用尚不存在的函數的過程中。

核心思想是將動態加載的函數替換為一個存根；該存根首先加載缺失的函數程式碼，然後用加載的程式碼替換自身，並使用原始參數調用新加載的程式碼。對函數的任何後續調用都直接指向加載的函數。此策略允許以基本透明的方式動態加載程式碼。

我們要加載的模組相對簡單，它包含一個返回`42`的函數：

```c
// 這是一個簡單的提供者，提供四十二
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42(){
  return 42l;
}
```

它位於名為`p42.c`的文件中，並使用Emscripten進行編譯且不構建任何“額外內容”：

```sh
emcc p42.c -o p42.wasm --no-entry -Wl,--import-memory
```

`EMSCRIPTEN_KEEPALIVE` 前綴是 Emscripten 的一個宏，它確保函數`provide42`不會被刪除，儘管它在程式碼中未使用。這會生成一個包含我們希望動態加載的函數的WebAssembly模組。

我們向`p42.c` 的構建添加的 `-Wl,--import-memory` 標誌是為了確保它可以訪問主模組的相同內存。[^3]

為了動態加載程式碼，我們使用標準的 `WebAssembly.instantiateStreaming` API：

```js
WebAssembly.instantiateStreaming(fetch('p42.wasm'));
```

此表達式使用`fetch`定位已編譯的Wasm模組，使用`WebAssembly.instantiateStreaming`來編譯fetch結果並從中創建一個已實例化的模組。`fetch`和`WebAssembly.instantiateStreaming`均返回Promises；因此我們不能簡單地訪問結果並提取我們需要的函數。而是通過使用`EM_ASYNC_JS`宏將其包裝成JSPI風格的導入。

```c
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('loading promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});
```

注意`console.log`調用，我們將使用它來確保邏輯正確。

`addFunction` 是 Emscripten API 的一部分，但為了確保它在運行時可用，我們必須通知 `emcc` 它是一個必需的依賴項。我們通過以下行來實現：

```c
EM_JS_DEPS(funDeps, "$addFunction")
```

在動態加載程式碼的情況下，我們希望確保不必要地加載程式碼；在這種情況下，我們希望確保對`provide42`的後續調用不會觸發重新加載。C有一個簡單的功能，我們可以使用它：我們不直接調用`provide42`，而是通過一個跳板，使函數被加載，然後在真正調用函數之前更改跳板以繞過自身。我們可以使用適當的函數指針來完成此操作：

```c
extern fooFun get42;

long stub(){
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;
```

從程式碼其余部分的視角來看，我們要調用的函數名為`get42`。它最初的實現是通過`stub`，該`stub`調用`resolveFun`實際加載函數。在成功加載後，我們將`get42`指向新加載函數的指針——並調用它。

我們的主函數調用了`get42`兩次：[^6]

```c
int main() {
  printf("first call p42() = %ld\n", get42());
  printf("second call = %ld\n", get42());
}
```

在瀏覽器中運行此程式的結果是一個日誌，其內容看起來像：

```
載入 promise42
第一次呼叫 p42() = 42
第二次呼叫 = 42
```

請注意，`載入 promise42` 這一行僅出現一次，而 `get42` 實際上被呼叫了兩次。

此範例展示了 JSPI 可被用於一些意想不到的方式：動態載入程式碼似乎與建立 promise 相去甚遠。此外，還有其他方法可用來動態連結 WebAssembly 模組；這並不是該問題的最終解決方案。

我們非常期待看到您能使用此新功能做些什麼！加入討論，請訪問 W3C WebAssembly 社群小組 [repo](https://github.com/WebAssembly/js-promise-integration)。

## 附錄 A: `badfib` 的完整程式碼


```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <emscripten.h>

typedef long (testFun)(long, int);

#define microSeconds (1000000)

long add(long x, long y) {
  return x + y;
}

// 要求 JS 進行加法
EM_JS(long, jsAdd, (long x, long y), {
  return x + y;
});

// promise 一次加法
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});

__attribute__((noinline))
long localFib(long x) {
 if (x==0)
   return 0;
 if (x==1)
   return 1;
 return add(localFib(x - 1), localFib(x - 2));
}

__attribute__((noinline))
long jsFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return jsAdd(jsFib(x - 1), jsFib(x - 2));
}

__attribute__((noinline))
long promiseFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}

long runLocal(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += localFib(x);
  return temp / count;
}

long runJs(long x,int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += jsFib(x);
  return temp / count;
}

long runPromise(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += promiseFib(x);
  return temp / count;
}

double runTest(testFun test, int limit, int count){
  clock_t start = clock();
  test(limit, count);
  clock_t stop = clock();
  return ((double)(stop - start)) / CLOCKS_PER_SEC;
}

void runTestSequence(int step, int limit, int count) {
  for (int ix = 0; ix <= limit; ix += step){
    double light = (runTest(runLocal, ix, count) / count) * microSeconds;
    double jsTime = (runTest(runJs, ix, count) / count) * microSeconds;
    double promiseTime = (runTest(runPromise, ix, count) / count) * microSeconds;
    printf("fib(%d) %gμs %gμs %gμs %gμs\n",ix, light, jsTime, promiseTime, (promiseTime - jsTime));
  }
}

EMSCRIPTEN_KEEPALIVE int main() {
  int step =  1;
  int limit = 15;
  int count = 1000;
  runTestSequence(step, limit, count);
  return 0;
}
```

## 附錄 B: `u42.c` 和 `p42.c` 的程式碼

`u42.c` C 程式碼代表我們動態載入範例的主要部分：

```c
#include <stdio.h>
#include <emscripten.h>

typedef long (*fooFun)();

// promise 一個函數
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('載入 promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});

EM_JS_DEPS(funDeps, "$addFunction")

extern fooFun get42;

long stub() {
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;

int main() {
  printf("第一次呼叫 p42() = %ld\n", get42());
  printf("第二次呼叫 = %ld\n", get42());
}
```

`p42.c` 程式碼是被動態載入的模組。

```c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42() {
  return 42l;
}
```

<!-- 註腳置於底部。 -->
## 註解

[^1]: 對技術狂熱者，請參閱 [WebAssembly JSPI 提案](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md) 和 [V8 堆疊切換設計專案](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y)。

[^2]: 注意：我們在附錄 A 中提供完整程式碼。

[^3]: 對於我們的具體範例，不需要此旗標，但對於更大的程式則可能需要。

[^4]: 注意：需要版本 ≥ 3.1.61 的 Emscripten。

[^6]: 完整程式碼可參考附錄 B。
