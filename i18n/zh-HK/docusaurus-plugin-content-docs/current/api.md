---
title: "V8 的公共 API"
description: "本文討論了 V8 的公共 API 穩定性，以及開發者如何對其進行變更。"
---
本文討論了 V8 的公共 API 穩定性，以及開發者如何對其進行變更。

## API 穩定性

如果 Chromium 的金絲雀版本中的 V8 出現崩潰的情況，則會回滾至上一個金絲雀版本的 V8。 因此，保持 V8 的 API 在不同金絲雀版本之間的兼容性非常重要。

我們持續運行一個 [bot](https://ci.chromium.org/p/v8/builders/luci.v8.ci/Linux%20V8%20API%20Stability)，用來檢測 API 穩定性違規情況。該機器人會將 Chromium 的 HEAD 與 V8 的 [當前金絲雀版本](https://chromium.googlesource.com/v8/v8/+/refs/heads/canary)一起編譯。

目前該機器人的失敗僅作為 FYI，無需採取任何行動。回滾時，可以使用責任列表輕鬆識別相關 CL。

如果你導致了該機器人的失敗，請記住下次在 V8 修改與依賴 Chromium 修改之間增大時間窗口。

## 如何更改 V8 的公共 API

V8 被許多不同的嵌入者使用：Chrome、Node.js、gjstest 等。更改 V8 的公共 API（基本上是 `include/` 目錄下的文件）時，我們需要確保嵌入者能夠平滑地更新到新的 V8 版本。特別是，我們不能假設嵌入者會在更新到新 V8 版本並調整其代碼以適配新 API 時採用原子性更改的方式。

嵌入者應能夠在使用上一版本 V8 的情況下調整其代碼以適配新 API。以下所有指導均遵循此規則。

- 添加新類型、常量和函數是安全的，但需注意一點：不要向現有類添加純虛函數。新虛函數應有默認實現。
- 如果函數參數具有默認值，則添加新參數是安全的。
- 移除或重命名類型、常量和函數是不安全的。使用 [`V8_DEPRECATED`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=395&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde) 和 [`V8_DEPRECATE_SOON`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=403&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde) 宏，它們會在嵌入者調用已棄用的方法時產生編譯時警告。例如，假設我們希望將函數 `foo` 重命名為函數 `bar`。那麼我們需要執行以下操作：
    - 在現有函數 `foo` 附近添加新函數 `bar`。
    - 等待 CL 推送到 Chrome。調整 Chrome 以使用 `bar`。
    - 用 `V8_DEPRECATED("Use bar instead") void foo();` 標註 `foo`。
    - 在同一 CL 中調整使用 `foo` 的測試以使用 `bar`。
    - 在 CL 中寫明更改原因及高層次更新指導。
    - 等到下一次 V8 分支。
    - 移除函數 `foo`。

    `V8_DEPRECATE_SOON` 是 `V8_DEPRECATED` 的較軟版本。Chrome 不會因其而崩潰，因此步驟 b 無需執行。但 `V8_DEPRECATE_SOON` 不適用於移除函數。

    你仍需用 `V8_DEPRECATED` 進行標註並等待下一次分支才能移除函數。

    可以使用 `v8_deprecation_warnings` GN 標誌測試 `V8_DEPRECATED`。
    可以使用 `v8_imminent_deprecation_warnings` 測試 `V8_DEPRECATE_SOON`。

- 更改函數簽名是不安全的。按照上述的方式使用 `V8_DEPRECATED` 和 `V8_DEPRECATE_SOON` 宏。

我們為每個 V8 版本維護一份 [提到重要 API 更改的文檔](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。

此外還有定期更新的 [doxygen API 文檔](https://v8.dev/api)。
