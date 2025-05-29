---
 title: "讓 V8 提前準備：利用顯式編譯提示加速 JavaScript 啟動"
 author: "Marja Hölttä"
 avatars: 
   - marja-holtta
 date: 2025-04-29
 tags: 
   - JavaScript
 description: "顯式編譯提示控制哪些 JavaScript 文件和函數被提前解析和編譯"
 tweet: ""
---

讓 JavaScript 更快速運行是提供響應性網頁應用的關鍵。即使 V8 有先進的優化技術，在啟動期間解析和編譯關鍵 JavaScript 仍然可能成為性能瓶頸。能夠在初始腳本編譯過程中確定需編譯的 JavaScript 函數，有助於加速網頁載入。

<!--truncate-->
當處理從網絡加載的腳本時，V8 必須為每個函數選擇：立即（"提前"）編譯它或延遲此過程。如果未編譯的函數稍後被調用，V8 必須即時編譯該函數。

如果在頁面載入期間 JavaScript 函數最終需調用，提前編譯會更有利，因為：

- 在腳本的初始處理過程中，我們至少需要進行輕量級解析以找到函數的結尾。在 JavaScript 中，找到函數結尾需要完全解析語法（我們無法僅通過計算大括號的數量來取巧——語法太複雜）。先進行輕量級解析再進行完全解析是重複工作。
- 如果我們決定提前編譯某個函數，其工作會在後台線程中進行，部分工作會與從網絡加載腳本的過程交錯進行。而如果僅在函數被調用時編譯它，那就太晚了，因為主線程在函數編譯完成之前無法繼續。

您可以在[這裡](https://v8.dev/blog/preparser)了解 V8 如何解析和編譯 JavaScript。

許多網頁會受益於選擇正確的函數進行提前編譯。例如，在我們對流行網頁的實驗中，20 個網頁中有 17 個有明顯改善，平均前台解析和編譯時間減少了 630 毫秒。

我們正在開發一項功能，[顯式編譯提示](https://github.com/WICG/explicit-javascript-compile-hints-file-based)，允許網頁開發者控制哪些 JavaScript 文件和函數被提前編譯。Chrome 136 現已提供版本，您可以選擇特定文件進行提前編譯。

該版本對於擁有可以提前編譯的“核心文件”非常有用，或者如果您能調整代碼位置以創建此類核心文件也相當有用。

您可以通過在文件頂部插入魔術註解來觸發整個文件的提前編譯

```js
//# allFunctionsCalledOnLoad
```

使用該功能時應謹慎——編譯過多會消耗時間和內存！

## 親自體驗 - 編譯提示功能

您可以通過讓 V8 記錄函數事件來觀察編譯提示的效果。例如，您可以使用以下文件設置一個最小測試。

index.html:

```html
<script src="script1.js"></script>
<script src="script2.js"></script>
```

script1.js:

```js
function testfunc1() {
  console.log('testfunc1 called!');
}

testfunc1();
```

script2.js:

```js
//# allFunctionsCalledOnLoad

function testfunc2() {
  console.log('testfunc2 called!');
}

testfunc2();
```

記得使用乾淨的用戶數據目錄運行 Chrome，這樣代碼緩存就不會干擾您的實驗。示例命令行為：

```sh
rm -rf /tmp/chromedata && google-chrome --no-first-run --user-data-dir=/tmp/chromedata --js-flags=--log-function_events > log.txt
```

導航到您的測試頁面後，您可以在日誌中看到以下函數事件：

```sh
$ grep testfunc log.txt
function,preparse-no-resolution,5,18,60,0.036,179993,testfunc1
function,full-parse,5,18,60,0.003,181178,testfunc1
function,parse-function,5,18,60,0.014,181186,testfunc1
function,interpreter,5,18,60,0.005,181205,testfunc1
function,full-parse,6,48,90,0.005,184024,testfunc2
function,interpreter,6,48,90,0.005,184822,testfunc2
```

因為 `testfunc1` 是延遲編譯的，我們在它最終被調用時看到了 `parse-function` 事件：

```sh
function,parse-function,5,18,60,0.014,181186,testfunc1
```

而對於 `testfunc2`，我們則未看到相應的事件，因為編譯提示強制它提前解析並編譯。

## 顯式編譯提示的未來

從長遠來看，我們希望能選擇具體的函數進行提前編譯。這將使網頁開發者能夠精確控制想要編譯的函數，並進一步提升編譯性能來優化網頁。敬請期待！
