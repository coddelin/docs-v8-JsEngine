---
title: "脫離網頁：使用 Emscripten 的獨立 WebAssembly 二進位檔"
author: "Alon Zakai"
avatars:
  - "alon-zakai"
date: 2019-11-21
tags:
  - WebAssembly
  - 工具
description: "Emscripten 現在支援獨立的 Wasm 檔案，這些檔案不需要 JavaScript。"
tweet: "1197547645729988608"
---
Emscripten 一直以來主要專注於編譯到 Web 和其他像是 Node.js 的 JavaScript 環境。但隨著 WebAssembly 開始被 *獨立於* JavaScript 使用，新的用例正在出現，因此我們一直在努力為 Emscripten 增加支援生成 [**獨立 Wasm**](https://github.com/emscripten-core/emscripten/wiki/WebAssembly-Standalone) 檔案的功能，這些檔案不依賴於 Emscripten 的 JS 運行時！這篇文章將解釋為什麼這很有趣。

<!--truncate-->
## 在 Emscripten 中使用獨立模式

首先，讓我們看看使用這項新功能可以做什麼！類似於 [這篇文章](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/)，我們從一個 "Hello World" 類型的程式開始，此程式輸出一個能加法運算的單一函數：

```c
// add.c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int add(int x, int y) {
  return x + y;
}
```

我們通常會用大約像 `emcc -O3 add.c -o add.js` 這樣的命令來編譯，生成 `add.js` 和 `add.wasm`。但這次讓我們告訴 `emcc` 只生成 Wasm：

```
emcc -O3 add.c -o add.wasm
```

當 `emcc` 發現我們僅需 Wasm 時，它就會將其製作成 "獨立版"——一個可以盡可能獨立運行的 Wasm 檔案，不需要任何來自 Emscripten 的 JavaScript 運行時代碼。

反組譯後，它非常簡潔——只有 87 個位元組！它包含明顯的 `add` 函數

```lisp
(func $add (param $0 i32) (param $1 i32) (result i32)
 (i32.add
  (local.get $0)
  (local.get $1)
 )
)
```

和另一個名為 `_start` 的函數，

```lisp
(func $_start
 (nop)
)
```

`_start` 是 [WASI](https://github.com/WebAssembly/WASI) 規範的一部分，Emscripten 的獨立模式生成它以便我們可以在 WASI 的執行時環境中運行。（通常 `_start` 會進行全域初始化，但由於這裡不需要任何初始化，所以它是空的。）

### 手寫 JavaScript 載入器

一個獨立 Wasm 檔案的好處之一是你可以手寫 JavaScript 來載入並運行它，這可以根據你的需求非常簡潔。以 Node.js 為例，我們可以這樣做：

```js
// load-add.js
const binary = require('fs').readFileSync('add.wasm');

WebAssembly.instantiate(binary).then(({ instance }) => {
  console.log(instance.exports.add(40, 2));
});
```

只需要 4 行！執行後預期輸出 `42`。注意，雖然這個例子很簡單，但有些情況下你根本不需要太多 JavaScript，而且可能比 Emscripten 的默認 JavaScript 運行時（支持許多環境和選項）表現得更好。一個實際的例子是 [zeux 的 meshoptimizer](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js)——只有 57 行，包括記憶體管理、增長等！

### 在 Wasm 執行時中運行

另一個獨立 Wasm 檔案的好處是它可以在 Wasm 執行時例如 [wasmer](https://wasmer.io)、[wasmtime](https://github.com/bytecodealliance/wasmtime)、或 [WAVM](https://github.com/WAVM/WAVM) 中運行。例如，考慮這個 Hello World 程式：

```cpp
// hello.cpp
#include <stdio.h>

int main() {
  printf("hello, world!\n");
  return 0;
}
```

我們可以在任何這些執行時環境中編譯並運行：

```bash
$ emcc hello.cpp -O3 -o hello.wasm
$ wasmer run hello.wasm
hello, world!
$ wasmtime hello.wasm
hello, world!
$ wavm run hello.wasm
hello, world!
```

Emscripten 儘量使用 WASI API，因此像這樣的程式最終會使用 100% 的 WASI 並能在支持 WASI 的執行時中運行。（稍後的筆記將提到哪些程式需求超出了 WASI）。

### 構建 Wasm 插件

除了 Web 和伺服器，Wasm 的一個令人興奮的領域是 **插件**。例如，一個圖像編輯器可能有 Wasm 插件，可以對圖像執行濾鏡和其他操作。對於這類用例，你需要一個獨立的 Wasm 二進位檔，就像目前的例子中那樣，但同時它還需要一個適合嵌入式應用的 API。

插件有時與動態庫有關，因為動態庫是一種實現插件的方法。Emscripten 支援使用 [SIDE_MODULE](https://github.com/emscripten-core/emscripten/wiki/Linking#general-dynamic-linking) 選項的動態庫，這是構建 Wasm 插件的一種方式。此處描述的新獨立 Wasm 選項在多方面改進了這種方式：首先，動態庫具有可重定位記憶體，如果你不需要（例如在加載後不需要將 Wasm 與其他 Wasm 連接），則會增加開銷；其次，獨立輸出還被設計為可以在 Wasm 執行環境中運行，如前所述。

好，到目前為止進展順利：Emscripten 可以像以往那樣輸出 JavaScript + WebAssembly，現在也可以單獨輸出 WebAssembly，讓你能夠在沒有 JavaScript 的地方（例如 Wasm 執行環境）運行它，或者編寫自定義 JavaScript 加載器代碼等。現在，讓我們來談談背景和技術細節！

## WebAssembly 的兩個標準 API

WebAssembly 只能訪問它作為匯入接收到的 API —— 核心 Wasm 規範中並沒有具體的 API 詳情。鑑於當前 Wasm 的發展趨勢，似乎會有 3 種主要類型的 API 被人們匯入和使用：

- **Web API**：這是 Wasm 程序在網頁上使用的，這些是現有的 JavaScript 可使用的標準化 API。目前它們是通過 JS glue 代碼間接調用的，但未來隨著 [interface types](https://github.com/WebAssembly/interface-types/blob/master/proposals/interface-types/Explainer.md) 的出現，它們將被直接調用。
- **WASI API**：WASI 專注於在服務器上為 Wasm 標準化 API。
- **其他 API**：各種自定義嵌入將定義它們自己的應用程序專用 API。例如，我們之前提到了一個使用 Wasm 插件執行視覺效果的圖像編輯器。請注意，插件可能還可以訪問“系統”API，比如本地動態庫，也可能被高度沙箱化，完全沒有匯入（嵌入僅調用其方法）。

WebAssembly 處於擁有 [兩套標準化 API](https://www.goodreads.com/quotes/589703-the-good-thing-about-standards-is-that-there-are-so) 的有趣位置。這是合理的，因為一個面向網頁，一個面向服務器，它們的需求確實不同；基於相似的原因，Node.js 與網頁上的 JavaScript API 不完全相同。

然而，除了網頁和服務器，還存在 Wasm 插件。例如，插件可以運行在可能在網頁上的應用程序內，也可能在網頁外；此外，不論嵌入式應用程序在哪裡，插件環境既不是網頁環境也不是服務器環境。所以哪一組 API 將被使用並不立刻清楚 —— 這可能取決於被移植的代碼、嵌入的 Wasm 執行環境等。

## 盡可能統一

Emscripten 希望在這裡提供幫助的一種具體方式是盡可能使用 WASI API，這樣我們可以避免 **不必要** 的 API 差異。如前所述，在網頁上，Emscripten 代碼通過 JavaScript 間接訪問 Web API，因此如果該 JavaScript API 可以看起來像 WASI，我們就在消除一個不必要的 API 差異，並且相同的二進制文件也可以在服務器上運行。換句話說，如果 Wasm 想記錄一些信息，它需要調用 JS，類似下面這樣：

```js
wasm   =>   function musl_writev(..) { .. console.log(..) .. }
```

`musl_writev` 是 [musl libc](https://www.musl-libc.org) 使用的 Linux 系統調用接口的實現，用於將數據寫入文件描述符，並最終用正確的數據調用 `console.log`。Wasm 模塊匯入並調用該 `musl_writev`，該方法定義了 JS 和 Wasm 之間的 ABI。該 ABI 是隨意選擇的（事實上 Emscripten 為了優化其性能已多次改變 ABI）。如果我們將其替換為與 WASI 匹配的 ABI，我們可以得到以下內容：

```js
wasm   =>   function __wasi_fd_write(..) { .. console.log(..) .. }
```

這不是一個很大的變化，只需對 ABI 做一些重構，並且在 JS 環境中運行也沒什麼區別。但是，現在 Wasm 可以在沒有 JS 的情況下運行，因為 WASI runtime 識別該 WASI API！這就是之前提到的獨立 Wasm 示例的工作原理，僅僅是通過重構 Emscripten 以使用 WASI API。

Emscripten 使用 WASI API 的另一個優勢是可以通過發現真實的世界問題為 WASI 規範提供幫助。例如，我們發現 [更改 WASI "whence" 常量](https://github.com/WebAssembly/WASI/pull/106) 是有用的，並且我們開始了關於 [代碼大小](https://github.com/WebAssembly/WASI/issues/109) 和 [POSIX 兼容性](https://github.com/WebAssembly/WASI/issues/122) 的一些討論。

Emscripten 盡可能使用 WASI 也有助於用戶使用單一開發套件目標網頁、服務器和插件環境。Emscripten 並不是唯一允許這樣做的開發套件，因為 WASI SDK 的輸出可以通過 [WASI Web Polyfill](https://wasi.dev/polyfill/) 或 Wasmer 的 [wasmer-js](https://github.com/wasmerio/wasmer-js) 在網頁上運行，但 Emscripten 的網頁輸出更緊湊，因此它允許使用單一開發套件而不影響網頁性能。

話說回來，您可以使用一個指令從 Emscripten 輸出一個獨立的 Wasm 檔案以及可選的 JS 檔案：

```
emcc -O3 add.c -o add.js -s STANDALONE_WASM
```

這會輸出 `add.js` 和 `add.wasm`。Wasm 檔案是獨立的，就像我們之前只有輸出單一的 Wasm 檔案一樣（使用 `-o add.wasm` 時，會自動設置 `STANDALONE_WASM`），但現在多了一個 JS 檔案，這個 JS 檔案可以載入並執行它。如果您不想自行編寫 JS 的話，這個 JS 在 Web 上執行很有用。

## 我們需要*非*獨立的 Wasm 嗎？

為什麼會有 `STANDALONE_WASM` 這個選項？理論上 Emscripten 可以一直啟用 `STANDALONE_WASM`，這樣會簡單一些。但獨立的 Wasm 檔案無法依賴 JS，這有一些缺點：

- 我們無法縮小 Wasm 的匯入和匯出名稱，因為縮小名稱需要雙方協議一致，即 Wasm 和其載入方要相互配合。
- 通常我們會在 JS 中建立 Wasm 的記憶體（Memory），這樣 JS 可以在啟動期間開始使用它，從而可以並行處理工作。但在獨立的 Wasm 中，我們必須在 Wasm 中建立記憶體。
- 有些 API 在 JS 中實現很簡單。例如當 C 的驗證失敗時會調用 [`__assert_fail`](https://github.com/emscripten-core/emscripten/pull/9558)，這通常是由 [JS 實現的](https://github.com/emscripten-core/emscripten/blob/2b42a35f61f9a16600c78023391d8033740a019f/src/library.js#L1235)。它只需要一行代碼，即使包含其調用的 JS 函數，總代碼大小也非常小。另一方面，在獨立構建中我們無法依賴 JS，因此我們使用了 [musl 的 `assert.c`](https://github.com/emscripten-core/emscripten/blob/b8896d18f2163dbf2fa173694eeac71f6c90b68c/system/lib/libc/musl/src/exit/assert.c#L4)。這使用了 `fprintf`，意味著它最終引入了一些 C 的 `stdio` 支持，包括一些帶有間接調用的內容，這使得移除未使用的函數變得困難。總體而言，有許多這樣的細節最終會影響總代碼大小。

如果您希望在 Web 和其他環境中都能運行，並且希望代碼大小和啟動時間達到 100% 優化，那麼您應該製作兩個獨立構建，一個使用 `-s STANDALONE`，一個不使用。這非常簡單，只需切換一個旗標！

## 必要的 API 差異

我們看到 Emscripten 儘可能地使用 WASI API，以避免**不必要**的 API 差異。那麼有沒有**必要**的差異呢？遺憾的是，有——一些 WASI API 需要做出權衡。例如：

- WASI 不支持多種 POSIX 特性，例如 [用戶/組/全域檔案權限](https://github.com/WebAssembly/WASI/issues/122)，因此您無法完全實現（Linux）系統 `ls`（相關詳情請參見該連結）。Emscripten 現有的檔案系統層支持一些這樣的功能，因此如果我們將所有檔案系統操作都切換到 WASI API，則會[喪失一些 POSIX 支持](https://github.com/emscripten-core/emscripten/issues/9479#issuecomment-542815711)。
- WASI 的 `path_open` [在代碼大小上有成本](https://github.com/WebAssembly/WASI/issues/109)，因為它要求在 Wasm 本身中處理額外的權限管理。這段代碼在 Web 上是不必要的。
- WASI 不提供[記憶體增長通知 API](https://github.com/WebAssembly/WASI/issues/82)，因此 JS 運行時必須不斷檢查記憶體是否增長，如果是，則更新其視圖，這會在每次匯入和匯出中造成開銷。為了避免這個開銷，Emscripten 提供了一個通知 API，`emscripten_notify_memory_growth`，您可以在 zeux 的 meshoptimizer 中看到[它被實現為一行代碼](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js#L10)，我們之前提到過它。

隨著時間的推移，WASI 可能會增加更多的 POSIX 支持、記憶體增長通知等功能——WASI 仍然處於高度實驗階段，預計將會有重大變化。目前，為了避免 Emscripten 的回歸，如果您使用某些功能，我們不會輸出 100% 的 WASI 二進制檔案。特別是，打開檔案使用的是 POSIX 方法而不是 WASI 方法，這意味著如果您調用 `fopen`，那麼生成的 Wasm 檔案將不是 100% WASI——但是，如果您只是使用 `printf`（它在已打開的 `stdout` 上運行），則它將是 100% WASI，就像我們在一開始看到的 "hello world" 範例，Emscripten 的輸出可以在 WASI 運行時中執行。

如果對用戶有幫助，我們可以添加一個 `PURE_WASI` 選項，該選項將犧牲代碼大小以換取完全的 WASI 合規性，但如果這不是緊急需求（而且我們目前看到的大多數插件用例並不需要完全的檔案 I/O），那麼可能我們可以等到 WASI 改進到 Emscripten 可以移除這些非 WASI API 的程度。這將是最佳結果，我們正朝該方向努力，如上述連結所示。

然而，即使 WASI 的改進進展順利，不可否認的事實是正如先前提到的，Wasm 已經有兩個標準化的 API。在未來，我預期 Emscripten 會直接使用介面類型呼叫 Web APIs，因為這樣比呼叫一個模仿 WASI 的 JS API 再間接呼叫 Web API（就像先前提到的 `musl_writev` 範例）來得更加緊湊。我們可能會需要一種 polyfill 或某種轉換層來助力，但我們不會毫無必要地使用它，因此我們仍需為 Web 和 WASI 環境製作分別的構建版本。（這有些不盡人意；理論上，如果 WASI 是 Web APIs 的超集，那這種情況可以避免，但很明顯，這樣一來在伺服器端會有妥協。）

## 當前狀態

已經有很多功能在運行！主要的限制有：

- **WebAssembly 的限制**：由於 Wasm 的限制，各種功能，例如 C++ 的例外處理、setjmp 和 pthreads，需要依賴 JavaScript，但目前尚無替代 JS 的良好解決方案。（Emscripten 或許會開始支持其中一些功能 [使用 Asyncify](https://www.youtube.com/watch?v=qQOP6jqZqf8&list=PLqh1Mztq_-N2OnEXkdtF5yymcihwqG57y&index=2&t=0s)，或者我們可能只是等待 [原生的 Wasm 功能](https://github.com/WebAssembly/exception-handling/blob/master/proposals/Exceptions.md) 被實現在虛擬機中。）
- **WASI 的限制**：目前，諸如 OpenGL 和 SDL 的函式庫及 API 尚無對應的 WASI API。

您**仍然可以**在 Emscripten 的獨立模式下使用所有這些功能，但輸出會包含對 JS 運行時支持代碼的呼叫。結果是，它們不會是完全的 WASI（基於類似的原因，這些功能在 WASI SDK 中也不起作用）。這些 Wasm 文件無法在 WASI 運行時中執行，但您可以在 Web 使用它們，或為其編寫自己的 JS 運行時。您也可以將它們用作插件，例如，一個遊戲引擎可以擁有使用 OpenGL 渲染的插件，開發者會以獨立模式編譯它們，然後在引擎的 Wasm 運行時中實現 OpenGL 的匯入接口。獨立的 Wasm 模式在這裡仍然有幫助，因為它讓輸出盡可能獨立於 Emscripten。

您可能還會發現一些 **已經有**非 JS 替代的 API，但我們尚未轉換，因為工作仍在進行中。請 [提交問題](https://github.com/emscripten-core/emscripten/issues)，我們非常歡迎您的幫助！
