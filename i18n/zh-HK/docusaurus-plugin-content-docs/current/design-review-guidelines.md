---
title: "設計審查指南"
description: "此文件解釋了 V8 項目的設計審查指南。"
---
請確保在適用的情況下遵循以下指南。

制定 V8 設計審查的正式化有多種驅動因素：

1. 明確個人貢獻者（IC）誰是決策者，並突出在項目因技術分歧而無法推進的情況下的前進路徑
1. 創建一個直接的設計討論論壇
1. 確保 V8 技術領導（TL）意識到所有重大變更並有機會在技術領導（TL）層面提供其意見
1. 增加全球所有 V8 貢獻者的參與度

## 摘要

![V8 設計審查指南概覽](/_img/docs/design-review-guidelines/design-review-guidelines.svg)

重要事項：

1. 假設善意
1. 保持友好與文明
1. 實際務實

所提方案基於以下假設/支柱：

1. 所提工作流程將個人貢獻者（IC）置於主導地位。他們負責推動流程。
1. 他們的指導 TL 負責幫助他們導航並找到合適的 LGTM 提供者。
1. 如果功能無爭議，應儘量減少開銷。
1. 如果有很多爭議，該功能可以&lsquo;升級&rsquo;至 V8 Eng Review Owners 會議，在那裡決定進一步步驟。

## 角色

### 個人貢獻者（IC）

LGTM: 不適用
此人為該功能的創建者和設計文檔的創建者。

### IC 的技術領導（TL）

LGTM: 必須具有
此人是特定項目或組件的 TL。很可能此人是您所涉及的主要組件的負責人。如果尚不清楚誰是 TL，請通過 [v8-eng-review-owners@googlegroups.com](mailto:v8-eng-review-owners@googlegroups.com) 向 V8 Eng Review Owners 咨詢。TL 負責在適當情況下添加更多人到必需的 LGTM 提供者列表中。

### LGTM 提供者

LGTM: 必須具有
這是一個需要提供 LGTM 的人。他們可能是 IC 或 TL(M)。

### 文檔的隨機評論者（RRotD）

LGTM: 非必需
這是僅僅審查並對提案發表意見的人。他們的意見應被考慮，儘管不需要他們的 LGTM。

### V8 Eng Review Owners

LGTM: 非必需
被卡住的提案可以通過v8[eng-review-owners@googlegroups.com](mailto:eng-review-owners@googlegroups.com) 向 V8 Eng Review Owners 升級。此類升級的潛在用例：

- 一個 LGTM 提供者無回應
- 設計無法達成共識

V8 Eng Review Owners 可以推翻非 LGTM 或 LGTM。

## 詳細工作流程

![V8 設計審查指南概覽](/_img/docs/design-review-guidelines/design-review-guidelines.svg)

1. 開始：IC 決定處理某個功能/被分配一個功能
1. IC 將其早期設計文檔/解釋器/一頁文件發送給幾位 RRotD
    1. 原型被認為是“設計文檔”的一部分
1. IC 添加其認為應該提供 LGTM 的人到 LGTM 提供者列表中。TL 必須在 LGTM 提供者列表中。
1. IC 合併反饋。
1. TL 添加更多人到 LGTM 提供者列表中。
1. IC 將早期設計文檔/解釋器/一頁文件發送至 [v8-dev+design@googlegroups.com](mailto:v8-dev+design@googlegroups.com)。
1. IC 收集 LGTMs，TL 幫助他們。
    1. LGTM 提供者審查文檔，添加評論並在文檔開頭給出 LGTM 或不給 LGTM。如果添加不給 LGTM，他們有義務列出理由。
    1. 可選：LGTM 提供者可以將自己從 LGTM 提供者列表中移除和/或建議其他 LGTM 提供者
    1. IC 和 TL 工作以解決未解決的問題。
    1. 如果收集到所有 LGTM，發送電子郵件到 [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com) （例如通過點擊原始主題）並宣布實現。
1. 可選：如果 IC 和 TL 被阻止和/或希望進行更廣泛的討論，他們可以將該問題升級到 V8 Eng Review Owners。
    1. IC 發送郵件到 [v8-eng-review-owners@googlegroups.com](mailto:v8-eng-review-owners@googlegroups.com)
        1. CC TL
        1. 郵件中包含設計文檔的鏈接
    1. 每位 V8 Eng Review Owners 成員都有義務審查文檔，並可以選擇性地將自己添加到 LGTM 提供者列表中。
    1. 決定解鎖功能的下一步措施。
    1. 如果仍未解決障礙或發現新的、無法解決的障礙，轉到 8。
1. 可選：如果已經批准的功能之後被添加“不給 LGTMs”，應像普通未解決問題一樣對待。
    1. IC 和 TL 工作以解決未解決的問題。
1. 結束：IC 繼續處理功能。

並且始終記住：

1. 假設善意
1. 保持友好與文明
1. 實際務實

## 常見問題

### 如何判斷功能是否值得擁有設計文檔？

以下是某些情況下適用設計文檔的一些指引：

- 涉及至少兩個組件
- 需要與非 V8 專案進行對帳，例如：Debugger，Blink
- 實現所需時間超過 1 週
- 是一個語言功能
- 會涉及平台專有的程式碼
- 使用者可見的更改
- 需特別考量安全性或安全性影響不明顯

如有疑問，請詢問 TL。

### 如何決定誰應被加入 LGTM 提供者的列表？

以下是一些應將人員加入 LGTM 提供者列表的指引：

- 預期會修改的原始檔案/目錄的 OWNER
- 預期會修改的主要元件的元件專家
- 您的更改的下游使用者，例如在您更改 API 時

### 誰是“我的”TL？

這可能是主元件的 OWNER，該元件是您的功能將會修改的部分。如果不清楚誰是 TL，請通過 [v8-eng-review-owners@googlegroups.com](mailto:v8-eng-review-owners@googlegroups.com) 詢問 V8 Eng Review Owners。

### 我在哪裡可以找到設計文檔的範本？

[點擊這裡](https://docs.google.com/document/d/1CWNKvxOYXGMHepW31hPwaFz9mOqffaXnuGqhMqcyFYo/template/preview)。

### 如果發生重大變更怎麼辦？

請確保您仍然獲得了所有的 LGTM，例如通過發送清晰且合理的期限，提醒 LGTM 提供者做出否決。

### LGTM 提供者沒有對我的文檔發表評論，我該怎麼辦？

在這種情況下，您可以按照以下升級步驟進行處理：

- 通過郵件、Hangouts 或文檔的評論/分配功能直接聯繫他們，並特別要求他們明確添加 LGTM 或非 LGTM。
- 讓您的 TL 參與進來並尋求他們的幫助。
- 升級至 [v8-eng-review-owners@googlegroups.com](mailto:v8-eng-review-owners@googlegroups.com)。

### 有人將我添加為文檔的 LGTM 提供者，我該怎麼辦？

V8 致力於使決策更加透明並使升級更加直接。如果您認為設計足夠好且應實行，請在表格中您名字旁的單元格中添加“LGTM”。

如果您有阻止意見或建議，請在表格中您名字旁的單元格中添加“Not LGTM，因為 \<原因>”。請準備好進行另一輪審查的可能。

### 這與 Blink Intents 流程如何協作？

V8 設計審查指南補充了 [V8 的 Blink Intent+Errata 流程](/docs/feature-launch-process)。如果您正在啟動新的 WebAssembly 或 JavaScript 語言功能，請遵循 V8 的 Blink Intent+Errata 流程以及 V8 設計審查指南。在您發送實現意圖的時點，收集所有的 LGTM 可能是有意義的。
