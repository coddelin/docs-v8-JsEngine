---
title: "TurboFan"
description: "本文檔收錄了關於 TurboFan（V8 的優化編譯器）的一些資源。"
---
TurboFan 是 V8 的其中一個優化編譯器，利用了一種叫[「Sea of Nodes」](https://darksi.de/d.sea-of-nodes/)的概念。V8 的部落格文章提供了一篇[TurboFan 的高層次概述](/blog/turbofan-jit)。更多詳細資訊可以參考下列資源。

## 文章與部落格帖子

- [TurboFan 的故事](https://benediktmeurer.de/2017/03/01/v8-behind-the-scenes-february-edition)
- [Ignition + TurboFan 與 ES2015](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition)
- [V8 的投機優化介紹](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)

## 講座

- [CodeStubAssembler: Redux](https://docs.google.com/presentation/d/1u6bsgRBqyVY3RddMfF1ZaJ1hWmqHZiVMuPRw_iKpHlY)
- [TurboFan 編譯器概述](https://docs.google.com/presentation/d/1H1lLsbclvzyOF3IUR05ZUaZcqDxo7_-8f4yJoxdMooU/edit)
- [TurboFan IR](https://docs.google.com/presentation/d/1Z9iIHojKDrXvZ27gRX51UxHD-bKf1QcPzSijntpMJBM)
- [TurboFan 的 JIT 設計](https://docs.google.com/presentation/d/1sOEF4MlF7LeO7uq-uThJSulJlTh--wgLeaVibsbb3tc)
- [為動態語言提供快速算術運算](https://docs.google.com/a/google.com/presentation/d/1wZVIqJMODGFYggueQySdiA3tUYuHNMcyp_PndgXsO1Y)
- [V8 中的反優化](https://docs.google.com/presentation/d/1Z6oCocRASCfTqGq1GCo1jbULDGS-w-nzxkbVF7Up0u0)
- [TurboFan：為 V8 設計的新代碼生成架構](https://docs.google.com/presentation/d/1_eLlVzcj94_G4r9j9d_Lj5HRKFnq6jgpuPJtnmIBs88) ([影片](https://www.youtube.com/watch?v=M1FBosB5tjM))
- [關於慵懶的一次實習](https://docs.google.com/presentation/d/1AVu1wiz6Deyz1MDlhzOWZDRn6g_iFkcqsGce1F23i-M) (+ [部落格帖子](/blog/lazy-unlinking))

## 設計文檔

這些是主要關注 TurboFan 內部原理的設計文檔。

- [函數上下文專門化](https://docs.google.com/document/d/1CJbBtqzKmQxM1Mo4xU0ENA7KXqb1YzI6HQU8qESZ9Ic)
- [Rest 參數與 arguments 特殊對象的優化方案](https://docs.google.com/document/d/1DvDx3Xursn1ViV5k4rT4KB8HBfBb2GdUy3wzNfJWcKM)
- [TurboFan 開發工具整合](https://docs.google.com/document/d/1zl0IA7dbPffvPPkaCmLVPttq4BYIfAe2Qy8sapkYgRE)
- [TurboFan 內聯](https://docs.google.com/document/d/1l-oZOW3uU4kSAHccaMuUMl_RCwuQC526s0hcNVeAM1E)
- [TurboFan 內聯策略](https://docs.google.com/document/d/1VoYBhpDhJC4VlqMXCKvae-8IGuheBGxy32EOgC2LnT8)
- [TurboFan 冗餘邊界檢查與溢出檢查消除](https://docs.google.com/document/d/1R7-BIUnIKFzqki0jR4SfEZb3XmLafa04DLDrqhxgZ9U)
- [無需代碼修補的慵懶反優化](https://docs.google.com/document/d/1ELgd71B6iBaU6UmZ_lvwxf_OrYYnv0e4nuzZpK05-pg)
- [寄存器分配器](https://docs.google.com/document/d/1aeUugkWCF1biPB4tTZ2KT3mmRSDV785yWZhwzlJe5xY)
- [TurboFan 中的投影節點](https://docs.google.com/document/d/1C9P8T98P1T_r2ymuUFz2jFWLUL7gbb6FnAaRjabuOMY/edit)

## 相關設計文檔

這些設計文檔也對 TurboFan 產生了重大影響。

- [計算屬性名稱的（重新）設計文檔](https://docs.google.com/document/d/1eH1R6_C3lRrLtXKw0jNqAsqJ3cBecrqqvfRzLpfq7VE)
- [ES2015 及後續的性能計劃](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)
- [迭代器內建函數設計文檔](https://docs.google.com/document/d/13z1fvRVpe_oEroplXEEX0a3WK94fhXorHjcOMsDmR-8)
- [讓 ES2015 的類更快](https://docs.google.com/document/d/1iCdbXuGVV8BK750wmP32eF4sCrnZ8y3Qlz0JiaLh9j8)
- [正則表達式內建函數的（重新）設計文檔](https://docs.google.com/document/d/1MuqFjsfaRPL2ZqzVoeMRqtcAmcJSwmHljTbRIctVVUk)
- [展開調用的性能](https://docs.google.com/document/d/1DWPizOSKqHhSJ7bdEI0HIVnner84xToEKUYqgXm3g30)
