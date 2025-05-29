---
title: "Indicium: V8 運行時追蹤工具"
author: "Zeynep Cankara ([@ZeynepCankara](https://twitter.com/ZeynepCankara))"
avatars:
  - "zeynep-cankara"
date: 2020-10-01 11:56:00
tags:
  - 工具
  - 系統分析器
description: "Indicium: V8 系統分析器工具，用於分析 Map/IC 事件。"
tweet: "1311689392608731140"
---
# Indicium: V8 系統分析器

過去三個月對我來說是一段非常棒的學習經歷，因為我作為實習生加入了 V8 團隊（Google London），並且正在開發一個新工具 [*Indicium*](https://v8.dev/tools/head/system-analyzer)。

這款系統分析器是一個統一的網頁介面，用於追蹤、調試以及分析 Inline Caches (ICs) 和 Map 在真實應用中如何被創建與修改的模式。

V8 已經擁有一套針對 [ICs](https://mathiasbynens.be/notes/shapes-ics) 和 [Maps](https://v8.dev/blog/fast-properties) 的追蹤基礎設施，可以通過 [IC Explorer](https://v8.dev/tools/v8.7/ic-explorer.html) 處理和分析 IC 事件，以及通過 [Map Processor](https://v8.dev/tools/v8.7/map-processor.html) 分析 Map 事件。但之前的工具無法統合分析 Maps 和 ICs，而系統分析器現在能夠做到這一點。

<!--truncate-->
![Indicium](/_img/system-analyzer/indicium-logo.png)

## 案例研究

讓我們通過一個示例來展示如何使用 Indicium 分析在 V8 中的 Map 和 IC 日誌事件。

```javascript
class Point {
  constructor(x, y) {
    if (x < 0 || y < 0) {
      this.isNegative = true;
    }
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}

let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

// 熱身
for (let i = 0; i < 10e5; i++) {
  dotProduct = a.dotProduct(b);
}

console.time('snippet1');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet1');

a = new Point(-1, -1);
b = new Point(-2, -2);
console.time('snippet2');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet2');
```

在這裡，我們有一個 `Point` 類，它存儲了兩個坐標以及基於坐標值的額外布爾值。這個 `Point` 類有一個 `dotProduct` 方法，返回傳入對象與接收者的點積。

為了更容易解釋程式的運作，讓我們將程式劃分為兩個部分（忽略熱身階段）：

### *snippet 1*

```javascript
let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

console.time('snippet1');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet1');
```

### *snippet 2*

```javascript
a = new Point(-1, -1);
b = new Point(-2, -2);
console.time('snippet2');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet2');
```

執行程式後，我們注意到性能有所下降。儘管測量的是兩個相似程式段的性能；通過在 for 循環中調用 `dotProduct` 函數來訪問 `Point` 對象實例的 `x` 和 `y` 屬性。

程式段 1 運行速度約為程式段 2 的三倍。唯一的區別是我們在程式段 2 的 `Point` 對象中使用了負值的 `x` 和 `y` 屬性。

![程式段性能分析](/_img/system-analyzer/initial-program-performance.png)

為了分析這種性能差異，我們可以使用 V8 的各種日誌選項。這正是系統分析器的優勢所在。它可以顯示日誌事件並將它們與 Map 事件連結在一起，讓我們探索 V8 中隱藏的魔力。

在進一步研究案例之前，讓我們熟悉系統分析器工具的面板。該工具有四個主要面板：

- 時間軸面板，用於分析 Map/ICs 事件隨著時間的變化，
- Map 面板，用於視覺化 Map 的過渡樹，
- IC 面板，提供關於 IC 事件的統計信息，
- 源面板，用於在腳本上顯示 Map/IC 文件的位置。

![系統分析器概述](/_img/system-analyzer/system-analyzer-overview.png)

![通過函數名稱分組 IC 事件，深入了解與 `dotProduct` 相關的 IC 事件。](/_img/system-analyzer/case1_1.png)

我們正在分析函數 `dotProduct` 如何可能導致此性能差異。因此，我們通過函數名稱分組 IC 事件，以深入了解與 `dotProduct` 函數相關的 IC 事件。

我們首先注意到，在該函數的 IC 事件中記錄了兩種不同的 IC 狀態轉換。一種是從未初始化到單態，另一種是從單態到多態。多態 IC 狀態表明我們現在正在跟蹤與 `Point` 對象相關的多個 Map，這種多態狀態的性能較差，因為需要執行額外的檢查。

我們想知道為什麼我們要為相同類型的對象創建多個 Map 結構。為此，我們切換有關 IC 狀態的資訊按鈕，以獲取從未初始化到單態的 Map 地址的更多資訊。

![與單態 IC 狀態相關的 Map 轉換樹。](/_img/system-analyzer/case1_2.png)

![與多態 IC 狀態相關的 Map 轉換樹。](/_img/system-analyzer/case1_3.png)

對於單態 IC 狀態，我們可以可視化轉換樹，並看到我們僅動態地添加了兩個屬性 `x` 和 `y`，但在多態 IC 狀態中，我們有一個包含三個屬性 `isNegative`、`x` 和 `y` 的新 Map。

![Map 面板將檔案位置信息傳遞給 Source 面板上突出顯示的檔案位置。](/_img/system-analyzer/case1_4.png)

我們點擊 Map 面板的檔案位置部分，以查看在源代碼中何處添加了此 `isNegative` 屬性，並利用這些見解來解決性能回退問題。

因此，現在的問題是 *如何利用工具生成的見解來解決性能回退問題*？

最低限度的解決方案是始終初始化 `isNegative` 屬性。通常，建議所有實例屬性應在構造函數中進行初始化。

現在，更新後的 `Point` 類如下所示：

```javascript
class Point {
  constructor(x, y) {
    this.isNegative = x < 0 || y < 0;
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}
```

如果我們再次執行修改後的 `Point` 類的腳本，我們會看到案例研究開頭定義的兩段代碼的性能非常相似。

在更新的追蹤中，我們看到避免了多態 IC 狀態，因為我們未為相同類型的對象創建多個 Map。

![修改後的 Point 對象的 Map 轉換樹。](/_img/system-analyzer/case2_1.png)

## 系統分析器

現在讓我們深入了解系統分析器中存在的不同面板。

### 時間軸面板

時間軸面板允許按時間選擇，從而可以在特定時間點或選定的時間範圍內可視化 IC/Map 狀態。它支持篩選功能，例如放大/縮小選定時間範圍的日誌事件。

![時間軸面板概述](/_img/system-analyzer/timeline-panel.png)

![時間軸面板概述 (續)](/_img/system-analyzer/timeline-panel2.png)

### Map 面板

Map 面板有兩個子面板：

1. Map 詳情
2. Map 轉換

Map 面板可視化所選 Map 的轉換樹。所選 Map 顯示在 Map 詳情子面板中的元數據。可以使用提供的界面搜索與 Map 地址相關的特定轉換樹。在 Map 轉換子面板之上的 Stats 子面板中，我們可以看到有關引起 Map 轉換的屬性和 Map 事件類型的統計信息。

![Map 面板概述](/_img/system-analyzer/map-panel.png)

![Stats 面板概述](/_img/system-analyzer/stats-panel.png)

### IC 面板

IC 面板顯示落在特定時間範圍內的 IC 事件的統計信息，這些事件通過時間軸面板進行篩選。此外，IC 面板允許根據各種選項（類型、類別、Map、檔案位置）對 IC 事件進行分組。從分組選項中，Map 和檔案位置分組選項與 Map 和源代碼面板交互，分別顯示與 IC 事件相關聯的 Map 的轉換樹並突出顯示檔案位置。

![IC 面板概述](/_img/system-analyzer/ic-panel.png)

![IC 面板概述 (續)](/_img/system-analyzer/ic-panel2.png)

![IC 面板概述 (續)](/_img/system-analyzer/ic-panel3.png)

![IC 面板概述 (續)](/_img/system-analyzer/ic-panel4.png)

### Source 面板

Source 面板顯示已載入的腳本並帶有可點擊的標記，這些標記可發出自定義事件以選擇自定義面板中 Map 和 IC 日誌事件。可以從下拉欄選擇已載入的腳本。從 Map 和 IC 面板中選擇檔案位置可以在源代碼面板上突出顯示選定的檔案位置。

![Source 面板概述](/_img/system-analyzer/source-panel.png)

### 致謝

我要感謝 V8 和 Android Web 團隊中的每個人，特別是我的主持人 Sathya 和聯合主持人 Camillo 在實習期間全程支持我，並給予我參與如此酷的項目工作的機會。

今年夏天在 Google 實習的經歷非常棒！
