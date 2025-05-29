---
title: '不受信任代碼的緩解措施'
description: '如果您嵌入V8並運行不受信任的JavaScript代碼，請啟用V8的緩解措施來幫助防範推測性側信道攻擊。'
---
2018年初，Google的Project Zero研究人員披露了[一種新的攻擊類型](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html)，該攻擊[利用](https://security.googleblog.com/2018/01/more-details-about-mitigations-for-cpu_4.html)許多CPU使用的推測執行優化。由於V8使用了一個優化的JIT編譯器TurboFan來使JavaScript更快速地運行，在某些情況下，它易受披露中描述的側信道攻擊的影響。

## 如果您僅執行可信代碼，那麼什麼都不用改變

如果您的產品僅使用嵌入式V8實例來執行完全由您控制的JavaScript或WebAssembly代碼，那麼您對V8的使用可能不受推測性側信道攻擊（SSCA）漏洞的影響。僅運行您信任的代碼的Node.js實例就是一個未受影響的示例。

要利用該漏洞，攻擊者必須在您的嵌入式環境中執行精心設計的JavaScript或WebAssembly代碼。如果作為開發人員，您對嵌入式V8實例中執行的代碼具有完全控制權，那麼這幾乎不可能發生。然而，如果您的嵌入式V8實例允許下載並執行任意或其他不可信的JavaScript或WebAssembly代碼，或者甚至是生成並隨後執行未完全受您控制的JavaScript或WebAssembly代碼（例如以此作為編譯目標），則您可能需要考慮緩解措施。

## 如果您執行不受信任的代碼……

### 更新到最新的V8以利用緩解措施並啟用緩解措施

該類攻擊的緩解措施從[V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1)版本開始在V8中可用，因此建議將嵌入式V8版本更新到[v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1)或之後的版本。不包括FullCodeGen和/或CrankShaft版本在內的舊版本V8不具備SSCA的緩解措施。

從[V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1)起，V8引入了一個新標誌來幫助抵禦SSCA漏洞。該標誌`--untrusted-code-mitigations`默認通過編譯時的GN標誌`v8_untrusted_code_mitigations`在運行時啟用。

這些緩解措施通過`--untrusted-code-mitigations`運行時標誌啟用：

- 在WebAssembly和asm.js中在內存訪問之前屏蔽地址，以確保推測性執行的內存加載無法訪問WebAssembly和asm.js堆之外的內存。
- 在JIT代碼中屏蔽用於訪問JavaScript數組和字串的索引，以確保推測性路徑的加載無法通過數組和字串加載到JavaScript代碼不應該訪問的內存地址。

嵌入者應意識到這些緩解措施可能帶來性能損失。實際影響在很大程度上取決於您的工作負載。對於例如Speedometer的工作負載，影響可以忽略不計，但對於更極端的計算工作負載，影響可能高達15%。如果您完全信任嵌入式V8實例執行的JavaScript和WebAssembly代碼，可以選擇通過在運行時指定`--no-untrusted-code-mitigations`標誌來禁用這些JIT緩解措施。可以使用`v8_untrusted_code_mitigations` GN標誌在編譯時啟用或禁用緩解措施。

請注意，在假設嵌入者將使用進程隔離的平臺上，例如Chromium使用站點隔離的平臺，V8默認禁用這些緩解措施。

### 在獨立的進程中沙箱化不受信任的執行代碼

如果您在獨立於任何敏感數據的進程中執行不受信任的JavaScript和WebAssembly代碼，那麼SSCA的潛在影響將大大減少。通過進程隔離，SSCA攻擊只能觀察同一進程內與執行代碼一起沙箱化的數據，而無法觀察其他進程中的數據。

### 考慮調整您提供的高精度計時器

高精度計時器使得更容易觀察SSCA漏洞中的側信道。如果您的產品提供了可由不受信任的JavaScript或WebAssembly代碼訪問的高精度計時器，請考慮使這些計時器更加粗糙或為它們添加抖動。
