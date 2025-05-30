---
title: "關於 Node.js 的 Hash flooding 漏洞問題…"
author: "Yang Guo ([@hashseed](https://twitter.com/hashseed))"
avatars: 
  - "yang-guo"
date: "2017-08-11 13:33:37"
tags: 
  - security
description: "Node.js 曾受到 Hash flooding 漏洞的影響。本篇文章提供一些背景資料，並解釋 V8 中的解決方案。"
---
今年七月初，Node.js 發佈了一個[安全更新](https://nodejs.org/en/blog/vulnerability/july-2017-security-releases/)，針對所有當前維護的分支來解決 Hash flooding 漏洞問題。這項臨時修復以顯著降低啟動性能為代價。同時，V8 已實施了一項解決方案，可以避免性能下降。

<!--truncate-->
本文旨在提供一些關於該漏洞的背景與歷史資訊，以及最終的解決方案。

## Hash flooding 攻擊

Hash 表是計算機科學中最重要的數據結構之一。它被廣泛應用於 V8，例如存儲物件的屬性。通常情況下，插入新項的效率非常高，為[𝒪(1)](https://en.wikipedia.org/wiki/Big_O_notation)。然而，Hash 碰撞可能導致最壞情況 𝒪(n)。這意味著插入 n 個項可能需要最多 𝒪(n²) 的時間。

在 Node.js 中，[HTTP 標頭](https://nodejs.org/api/http.html#http_response_getheaders)以 JavaScript 物件的形式表示。標頭名稱和值的對以物件屬性存儲。通過精心準備的 HTTP 請求，攻擊者可能發動拒絕服務攻擊。Node.js 進程會變得無響應，忙於處理最壞情況的 Hash 表插入。

這種攻擊早在 [2011 年 12 月](https://events.ccc.de/congress/2011/Fahrplan/events/4680.en.html)就已被披露，並顯示出影響了一系列編程語言。為何 V8 和 Node.js 過了這麼久才解決這個問題呢？

事實上，在漏洞披露後不久，V8 工程師很快與 Node.js 社區合作開發了一個[緩解措施](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40)。從 Node.js v0.11.8 開始，該問題已經得到解決。這項修復引入了一種名為 _Hash 種子值_ 的機制。Hash 種子在啟動時隨機選取，用以對特定 V8 實例中的每一個 Hash 值進行種子化。在不了解 Hash 種子的情況下，攻擊者很難命中最壞情況，更不用說針對所有 Node.js 實例發動攻擊。

這段修正的[提交信息](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40)的一部分內容如下：

> 此版本僅解決對那些自己編譯 V8 或那些不使用快照的人的問題。基於快照的預編譯版 V8 仍將具有可預測的字符串 Hash 值。

此版本僅解決對那些自己編譯 V8 或那些不使用快照的人的問題。基於快照的預編譯版 V8 仍將具有可預測的字符串 Hash 值。

## 啟動快照

啟動快照是 V8 中的一種機制，用以顯著加速引擎啟動以及創建新的上下文（即通過 Node.js 中的 [vm 模塊](https://nodejs.org/api/vm.html)）。與其從頭開始設置初始物件和內部數據結構，V8 將從現有的快照進行反序列化。一個基於最新快照構建的 V8 啟動時間少於 3ms，新上下文創建時間僅需幾分之一毫秒。不使用快照的情況下，啟動時間超過 200ms，而新上下文則超過 10ms。這是一個量級上的差異。

我們在[上一篇文章](/blog/custom-startup-snapshots)中提到了任何 V8 嵌入者如何利用啟動快照。

預構建的快照包含 Hash 表和其他基於 Hash 值的數據結構。一旦從快照初始化後，Hash 種子值便無法改變，否則這些數據結構會遭到破壞。捆綁快照的 Node.js 發佈版有固定的 Hash 種子，導致緩解措施失效。

這就是提交信息中特別警告的原因。

## 幾乎修復，但仍有問題

快進到 2015 年，一個 Node.js 的[問題](https://github.com/nodejs/node/issues/1631)報告說創建新上下文的性能有所退化。不出所料，這是因為啟動快照作為緩解措施的一部分被禁用了。然而，當時參與討論的人並不都了解背後的[原因](https://github.com/nodejs/node/issues/528#issuecomment-71009086)。

正如這篇文章所解釋的，V8 使用一個偽隨機數生成器來生成 Math.random 的結果。每個 V8 上下文都擁有自己的隨機數生成器狀態，這樣可以防止 Math.random 的結果在不同的上下文中變得可預測。

隨機數生成器狀態在上下文初始化後立刻從外部來源設置種子。無論上下文是從零開始創建還是從快照反序列化創建，這都無關緊要。

隨機數生成器的狀態不知何故被與雜湊種子[混淆](https://github.com/nodejs/node/issues/1631#issuecomment-100044148)。因此，從 [io.js v2.0.2](https://github.com/nodejs/node/pull/1679) 開始，預構建的快照成為官方版本的一部分。

## 第二次嘗試

直到 2017 年 5 月，在 V8、[Google 的 Project Zero](https://googleprojectzero.blogspot.com/) 以及 Google Cloud Platform 之間進行一些內部討論時，才意識到 Node.js 仍然易受到雜湊洪泛攻擊的影響。

初步響應來自我們的同事 [Ali](https://twitter.com/ofrobots) 和 [Myles](https://twitter.com/MylesBorins)，他們隸屬於 [Google Cloud Platform 的 Node.js 團隊](https://cloud.google.com/nodejs/)。他們與 Node.js 社群合作，[再次禁用啟動快照](https://github.com/nodejs/node/commit/eff636d8eb7b009c40fb053802c169ba1417293d)。這次，他們還添加了一個[測試用例](https://github.com/nodejs/node/commit/9fedc1f09648ff7cebed65883966f5647686a38a)。

但我們並不希望僅僅停留在這裡。禁用啟動快照會對性能產生[顯著](https://github.com/nodejs/node/issues/14229)的影響。多年來，我們在 V8 中添加了許多新的[語言](/blog/high-performance-es2015) [功能](/blog/webassembly-browser-preview) 和[複雜](/blog/launching-ignition-and-turbofan) [優化](/blog/speeding-up-regular-expressions)。其中一些增加使得從零開始的啟動成本更高。在安全版本發布後，我們立即著手尋找長期解決方案，目標是能夠[重新啟用啟動快照](https://github.com/nodejs/node/issues/14171)的同時不會受到雜湊洪泛攻擊的影響。

從[提議的解決方案](https://docs.google.com/document/d/1br7T3jk5JAJSYaT8eZdQlqrPTDRClheGpRU1-BpY1ss/edit)中，我們選擇並實現了最切合實際的一個。從快照反序列化後，我們會選擇一個新的雜湊種子。受影響的數據結構接著進行重新雜湊以確保一致性。

事實證明，在普通的啟動快照中，實際受影響的數據結構很少。令我們欣喜的是，在此期間，[重新雜湊雜湊表](https://github.com/v8/v8/commit/0e8e0030775518b69eb8522823ea3754e6bddc69) 在 V8 中已變得非常容易。這增加的開銷微不足道。

重新啟用啟動快照的修補程序已被[合併](https://github.com/nodejs/node/commit/2ae2874ae7dfec2c55b5d390d25b6eed9932f78d)[到](https://github.com/nodejs/node/commit/14e4254f68f71a6afaf3ebe16794172b08e68d7b) Node.js 中。它已成為最近的 Node.js v8.3.0 [版本](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367) 的一部分。
