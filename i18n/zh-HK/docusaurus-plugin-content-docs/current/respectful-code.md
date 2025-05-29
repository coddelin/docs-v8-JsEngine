---
title: &apos;尊重的程式碼&apos;
description: &apos;包容性是 V8 文化的核心，我們的價值包括互相以尊嚴對待彼此。因此，每個人都應能在不受到偏見和歧視有害影響的情況下做出貢獻。&apos;
---

包容性是 V8 文化的核心，我們的價值包括互相以尊嚴對待彼此。因此，每個人都應能在不受到偏見和歧視有害影響的情況下做出貢獻。然而，我們的程式碼庫、使用介面和文件中的術語可能會延續這些歧視。本文件提供指導方針，旨在解決程式碼和文件中的不尊重術語。

## 政策

應避免具有貶義、有害或直接或間接延續歧視的術語。

## 此政策的範圍是什麼？

包括貢獻者在為 V8 工作時可能閱讀的任何內容，例如：

- 變數、類型、函數、檔案、建置規則、執行檔、匯出的變數名稱， ...
- 測試資料
- 系統輸出和顯示
- 文件（包括源文件內部和外部的文件）
- 提交訊息

## 原則

- 保持尊重：不必使用貶義語言來描述事物的運作方式。
- 尊重文化敏感語言：某些詞彙可能具有重要的歷史或政治意義。請注意這一點並使用替代詞。

## 如何知道某些特定術語是否合適？

應用上述原則。如果有任何疑問，您可以聯繫 `v8-dev@googlegroups.com`。

## 應避免使用哪些術語的示例？

此列表並非全面。它僅包含一些人們經常遇到的示例。


| 術語      | 建議替代術語                                                  |
| --------- | ------------------------------------------------------------- |
| master    | primary, controller, leader, host                             |
| slave     | replica, subordinate, secondary, follower, device, peripheral |
| whitelist | allowlist, exception list, inclusion list                     |
| blacklist | denylist, blocklist, exclusion list                           |
| insane    | unexpected, catastrophic, incoherent                          |
| sane      | expected, appropriate, sensible, valid                        |
| crazy     | unexpected, catastrophic, incoherent                          |
| redline   | priority line, limit, soft limit                              |


## 如果我正在與違反此政策的事物交互，該怎麼辦？

這種情況已經出現過幾次，尤其是在實現規範的程式碼中。在這些情況下，與規範中的術語不同可能會妨礙理解實現。對於這些情況，我們建議以下方式，按降低優先級排列：

1. 如果使用替代術語不會妨礙理解，請使用替代術語。
1. 如果做不到，請勿在執行交互的程式碼層級之外延續該術語。在必要的地方，在 API 邊界使用替代術語。
