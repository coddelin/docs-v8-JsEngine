---
title: "ES2015、ES2016，以及未來發展"
author: "V8 團隊，ECMAScript 愛好者"
date: 2016-04-29 13:33:37
tags:
  - ECMAScript
description: "V8 v5.2 支援 ES2015 和 ES2016！"
---
V8 團隊非常重視 JavaScript 語言的演進，致力於讓其成為更加具表達力和明確定義的語言，讓開發快速、安全且正確的網頁應用程式變得更加容易。2015 年 6 月，TC39 標準委員會正式通過了 [ES2015 規範](https://www.ecma-international.org/ecma-262/6.0/)，這是 JavaScript 語言迄今為止最大規模的一次更新。新增功能包括 [類別](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Classes)、[箭頭函式](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Functions/Arrow_functions)、[Promise](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Promise)、[迭代器 / 產生器](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Guide/Iterators_and_Generators)、[代理](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Proxy)、[知名符號](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols)，以及其他語法糖。TC39 亦加快了新規範的發布節奏，並於 2016 年 2 月發布了 [ES2016 候選草案](https://tc39.es/ecma262/2016/)，將於當年夏天正式通過。雖然由於發布週期縮短，ES2016 的更新內容不如 ES2015 廣泛，但它引入了 [指數運算子](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Operators/Arithmetic_Operators#Exponentiation) 和 [`Array.prototype.includes`](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Array/includes) 等值得注意的特性。

<!--truncate-->
今天，我們達成了一項重要的里程碑：**V8 支援 ES2015 和 ES2016**。你可以在 Chrome Canary 中立即使用這些新語言功能，並且它們將在 Chrome 52 中預設啟用。

由於規範不斷演進的特性、不同型別的相容性測試之間的差異，以及維持網頁相容性的複雜性，確定某個 ECMAScript 版本何時被認為完全由 JavaScript 引擎支援是很困難的。繼續閱讀以了解為何規範支援比版本號更為細緻，為何正確的尾端呼叫仍在討論中，以及尚存的局限性。

## 不斷演進的規範

當 TC39 決定更頻繁地發布 JavaScript 規範的更新時，最先進的語言版本便成為了主要的草擬版本。雖然 ECMAScript 規範的版本仍然每年發布並通過審核，但 V8 實現了一種結合了最近一次通過審核的版本（例如 ES2015）、某些已接近標準化並且足夠安全實施的功能（例如來自 ES2016 候選草案的指數運算子和 `Array.prototype.includes()`），以及來自更新版本草案中的一些錯誤修正和網頁相容性修正的策略。採取這種方法的部分理由在於，瀏覽器中的語言實現應與規範保持一致，即使是要更新規範以達到這一目的。事實上，實現某個版本的已審核規範的過程通常會揭示出許多構成下一版本規範的修正和澄清。

![目前已實現的演進中的 ECMAScript 規範部分](/_img/modern-javascript/shipped-features.png)

例如，當實現 ES2015 的 [RegExp sticky flag](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky) 時，V8 團隊發現 ES2015 規範的語義破壞了許多現有的網站（包括所有使用受歡迎的 [XRegExp](https://github.com/slevithan/xregexp) 函式庫版本 2.x.x 的網站）。由於相容性是網路的基石，V8 和 Safari JavaScriptCore 工程師 [提出了一項修正提案](https://github.com/tc39/ecma262/pull/511) 用於解決該問題，此提案經 TC39 同意通過。該修正不會出現在經審核的版本中直到 ES2017，但它仍然是 ECMAScript 語言的一部分，我們已經實現了它以便啟用 RegExp sticky flag。

語言規範的持續完善，以及每個版本（包括尚未通過審核的草案）替代、修訂和澄清前一版本的事實，讓理解 ES2015 和 ES2016 支援的複雜性變得不那麼容易。雖然難以簡潔地總結，但或許最準確的說法是 _V8 支援“持續維護的未來 ECMAScript 標準草案”中的合規功能_！

## 測量相容性

為了理解此規範的複雜性，有多種方法可以衡量 JavaScript 引擎與 ECMAScript 標準的兼容性。V8 團隊以及其他瀏覽器廠商使用 [Test262 測試套件](https://github.com/tc39/test262) 作為遵守持續維護的未來 ECMAScript 標準草案的最高標準。該測試套件會持續更新以匹配規範，並提供 16,000 個功能測試來檢驗所有功能和邊界情況，這些功能構成了一個兼容且符合規範的 JavaScript 實現。目前 V8 通過了約 98% 的 Test262 測試，其餘的 2% 是一些邊界情況以及尚未準備好上線的未來 ES 功能。

由於難以瀏覽大量的 Test262 測試，存在其他的一些兼容性測試，例如 [Kangax 兼容性表](http://kangax.github.io/compat-table/ES2015/)。Kangax 可以讓人快速查看某一特定功能（例如 [箭頭函數](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)）是否已於某個引擎中實現，但它並未測試所有 Test262 中的兼容性邊界情況。目前，Chrome Canary 在 Kangax 的 ES2015 兼容性表中得分為 98%，而在 Kangax 的 ES2016 部分（例如標為「2016 features」和「2016 misc」的 ESnext 標籤部分）則得分為 100%。

剩餘 2% 的 Kangax ES2015 表測試與 [正確尾調用](http://www.2ality.com/2015/06/tail-call-optimization.html) 有關，該功能已在 V8 中實現，但由於以下所述未解決的開發者體驗問題，該功能在 Chrome Canary 中被故意關閉。啟用「Experimental JavaScript features」標誌（強制開啟此功能）後，Canary 在 ES2015 的 Kangax 表總得分即為 100%。

## 正確尾調用

正確尾調用已被實現，但尚未上線，因為此功能的更改[目前在 TC39 進行討論中](https://github.com/tc39/proposal-ptc-syntax)。ES2015 規定嚴格模式下尾部位置的函數調用不應導致堆棧溢出。雖然這對於某些編程模式是一個有用的保證，但當前語義存在兩個問題。首先，由於尾調用消除是隱式的，程序員可能 [難以確定](http://2ality.com/2015/06/tail-call-optimization.html#checking-whether-a-function-call-is-in-a-tail-position) 哪些函數實際上處於尾調用位置。這意味著開發者可能直到堆棧溢出時才發現程序中的錯位尾調用嘗試。其次，實現正確尾調用需要從堆棧中刪除尾調用堆棧幀，這會丟失執行流程的信息。這進一步帶來了兩個後果：

1. 由於堆棧中存在間斷性，這使得在調試過程中難以理解執行如何到達某個點。
2. [`error.stack`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack) 中包含的執行流程信息較少，可能會破壞收集和分析客戶端錯誤的遙測軟件。

實施 [影子堆棧](https://bugs.webkit.org/attachment.cgi?id=274472&action=review) 可以提高調用堆棧的可讀性，但 V8 和 DevTools 團隊認為，當調試期間顯示的堆棧完全確定且始終匹配真實的虛擬機堆棧狀態時，調試才最簡單、最可靠且最準確。此外，影子堆棧的性能開銷過高，無法一直保持啟用。

基於這些理由，V8 團隊強烈支持通過特殊語法來表示正確尾調用。一個名為 [TC39 提案](https://github.com/tc39/proposal-ptc-syntax) 的掛起提案，即語法尾調用，由 Mozilla 和 Microsoft 的委員會成員共同支援，用以指定此行為。我們已按照 ES2015 規範實現並階段性部署正確尾調用，並開始按照新提案規範實現語法尾調用。V8 團隊計劃在下一次 TC39 會議上解決該問題，然後才默認上線隱式正確尾調用或語法尾調用。您可以通過使用 V8 標誌 `--harmony-tailcalls` 和 `--harmony-explicit-tailcalls` 來測試每個版本。**更新：**這些標誌已被移除。

## 模組

ES2015 最令人振奮的承諾之一是支持 JavaScript 模組，以組織和分離應用程式的不同部分到命名空間中。ES2015 規範了模組的 [`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) 和 [`export`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export) 聲明，但未規範模組如何載入到 JavaScript 程式中。在瀏覽器中，載入行為最近通過 [`<script type="module">`](https://blog.whatwg.org/js-modules) 得到規範。雖然需要額外的標準化工作來規範先進的動態模組載入 API，但 Chromium 對模組腳本標籤的支持已 [正在開發](https://groups.google.com/a/chromium.org/d/msg/blink-dev/uba6pMr-jec/tXdg6YYPBAAJ)。您可以在[起始 bug](https://bugs.chromium.org/p/v8/issues/detail?id=1569)中跟蹤實現進度，以及從 [whatwg/loader](https://github.com/whatwg/loader) 儲存庫閱讀更多關於實驗性載入 API 的想法。

## ESnext 及未來

未來，開發者可以期待 ECMAScript 的更新將以更小、更頻繁的更新以及更短的實現週期出現。V8 團隊已經在努力將即將推出的功能，如 [`async`/`await`](https://github.com/tc39/ecmascript-asyncawait) 關鍵字、[`Object.values`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values) / [`Object.entries`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries)、[`String.prototype.{padStart,padEnd}`](http://tc39.es/proposal-string-pad-start-end/) 和 [RegExp lookbehind](/blog/regexp-lookbehind-assertions) 引入到運行時。請隨時關注我們有關 ESnext 實現進展和現有 ES2015 與 ES2016+ 功能性能優化的更多更新。

我們致力於不斷發展 JavaScript，並努力在早期實現新功能、確保現有網頁的兼容性和穩定性，以及為 TC39 提供關於設計問題的實現反饋方面取得平衡。我們期待著開發者利用這些新功能所構建的令人驚嘆的體驗。
