---
title: &apos;`Intl.ListFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias)) 和 Frank Yung-Fong Tang&apos;
avatars:
  - &apos;mathias-bynens&apos;
  - &apos;frank-tang&apos;
date: 2018-12-18
tags:
  - Intl
  - Node.js 12
  - io19
description: &apos;Intl.ListFormat API 讓本地化的列表格式化成為可能，同時不犧牲性能。&apos;
tweet: &apos;1074966915557351424&apos;
---
現代的網絡應用通常使用包含動態數據的列表。例如，一個相片查看應用可能顯示如下內容：

> 此相片包括 **Ada、Edith、_和_ Grace**。

一款文字遊戲可能會顯示另一種類型的列表：

> 選擇你的超能力：**隱形、心靈控制、_或_ 共情能力**。

由於每種語言的列表格式化習慣和詞語各不相同，實現一個本地化的列表格式化器並非易事。不僅需要獲取所有希望支持語言中的相關詞語（如上例中的 “and” 或 “or”），還需要對所有這些語言的格式化習慣進行編碼！[Unicode CLDR](http://cldr.unicode.org/translation/lists) 提供這些數據，但要在 JavaScript 中使用它，這些數據需嵌入並隨其他庫代碼一起傳遞。這樣不幸會增加庫的捆綁大小，進而對加載時間、解析/編譯成本及內存消耗造成負面影響。

<!--truncate-->
全新的 `Intl.ListFormat` API 將這種負擔轉移到了 JavaScript 引擎上，該引擎可以發送語言區域數據並使其直接對 JavaScript 開發者可用。`Intl.ListFormat` 使本地化的列表格式化成為可能，且不犧牲性能。

## 使用範例

以下範例展示了如何使用英語創建一個用於連詞的列表格式化器：

```js
const lf = new Intl.ListFormat(&apos;en&apos;);
lf.format([&apos;Frank&apos;]);
// → &apos;Frank&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;]);
// → &apos;Frank and Christine&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;]);
// → &apos;Frank, Christine, and Flora&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;, &apos;Harrison&apos;]);
// → &apos;Frank, Christine, Flora, and Harrison&apos;
```

分列（如英語中的 “or”）也可以通過可選的 `options` 參數支持：

```js
const lf = new Intl.ListFormat(&apos;en&apos;, { type: &apos;disjunction&apos; });
lf.format([&apos;Frank&apos;]);
// → &apos;Frank&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;]);
// → &apos;Frank or Christine&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;]);
// → &apos;Frank, Christine, or Flora&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;, &apos;Harrison&apos;]);
// → &apos;Frank, Christine, Flora, or Harrison&apos;
```

以下是一個使用不同語言（如中文，語言代碼 `zh`）的範例：

```js
const lf = new Intl.ListFormat(&apos;zh&apos;);
lf.format([&apos;永鋒&apos;]);
// → &apos;永鋒&apos;
lf.format([&apos;永鋒&apos;, &apos;新宇&apos;]);
// → &apos;永鋒和新宇&apos;
lf.format([&apos;永鋒&apos;, &apos;新宇&apos;, &apos;芳遠&apos;]);
// → &apos;永鋒、新宇和芳遠&apos;
lf.format([&apos;永鋒&apos;, &apos;新宇&apos;, &apos;芳遠&apos;, &apos;澤遠&apos;]);
// → &apos;永鋒、新宇、芳遠和澤遠&apos;
```

`options` 參數支持更高級的使用方式。以下是各項選項及其組合的概覽，以及它們如何與 [UTS#35](https://unicode.org/reports/tr35/tr35-general.html#ListPatterns) 定義的列表模式相對應：


| 類型                  | 選項                                   | 描述                                                                                     | 範例                  |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| 標準（或無類型）        | `{}` （預設）                            | 對任意佔位符適用的典型 “和” 列表                                                             | `&apos;January, February, and March&apos;` |
| 或                    | `{ type: &apos;disjunction&apos; }`                 | 對任意佔位符適用的典型 “或” 列表                                                             | `&apos;January, February, or March&apos;`  |
| 單位                  | `{ type: &apos;unit&apos; }`                        | 適用於寬單位的列表                                                                  | `&apos;3 feet, 7 inches&apos;`             |
| 簡短單位              | `{ type: &apos;unit&apos;, style: &apos;short&apos; }`        | 適用於簡短單位的列表                                                                 | `&apos;3 ft, 7 in&apos;`                   |
| 狹窄單位              | `{ type: &apos;unit&apos;, style: &apos;narrow&apos; }`       | 適用於狹窄單位的列表，適合螢幕空間非常有限的情況                     | `&apos;3′ 7″&apos;`                        |


注意，在許多語言（例如英文）中，這些列表可能之間並沒有明顯的區別。在其他語言中，間距、連詞的長度或存在性以及分隔符可能有所變化。

## 結論

隨著 `Intl.ListFormat` API 越來越普及，您將發現各個程式庫逐步放棄對硬編碼 CLDR 資料庫的依賴，轉而採用原生的列表格式化功能，從而提升載入時間性能、解析和編譯時間性能、運行時性能以及記憶體使用效率。

## 支援 `Intl.ListFormat`

<feature-support chrome="72 /blog/v8-release-72#intl.listformat"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
