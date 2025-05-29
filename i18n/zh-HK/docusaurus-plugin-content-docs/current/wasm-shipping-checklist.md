---
title: &apos;WebAssembly 功能的階段和發佈檢查清單&apos;
description: &apos;此文件提供了關於在 V8 中何時分階段和發佈 WebAssembly 功能的工程要求檢查清單。&apos;
---
此文件提供了在 V8 中分階段和發佈 WebAssembly 功能的工程要求檢查清單。這些檢查清單是作為指導原則，可能並不適用於所有功能。實際的發佈過程可參見 [V8 發佈過程](https://v8.dev/docs/feature-launch-process)。

# 階段

## 何時分階段一個 WebAssembly 功能

[分階段](https://docs.google.com/document/d/1ZgyNx7iLtRByBtbYi1GssWGefXXciLeADZBR_FxG-hE) WebAssembly 功能標誌著其實現階段的結束。當以下清單完成時，實現階段即結束：

- V8 中的實現已完成。包括：
    - TurboFan 中的實現（如適用）
    - Liftoff 中的實現（如適用）
    - 解釋器中的實現（如適用）
- V8 中有測試
- 通過運行 [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh) 將規範測試加入 V8。
- 所有現有的提議規範測試均通過。缺少的規範測試儘管很遺憾，但不應阻礙分階段。

請注意，該功能提議在標準化過程中的階段對於在 V8 中分階段並不重要。但該提議應基本穩定。

## 如何分階段一個 WebAssembly 功能

- 在 [`src/wasm/wasm-feature-flags.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-feature-flags.h) 中，將該功能標誌從 `FOREACH_WASM_EXPERIMENTAL_FEATURE_FLAG` 宏列表移至 `FOREACH_WASM_STAGING_FEATURE_FLAG` 宏列表。
- 在 [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh) 中，將提議的倉庫名稱加入到 `repos` 倉庫列表中。
- 運行 [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh) 以創建並上傳新提議的規範測試。
- 在 [`test/wasm-spec-tests/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-spec-tests/testcfg.py) 中，將提議的倉庫名稱和功能標誌加入到 `proposal_flags` 列表中。
- 在 [`test/wasm-js/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-js/testcfg.py) 中，將提議的倉庫名稱和功能標誌加入到 `proposal_flags` 列表中。

參考 [類型反射分階段](https://crrev.com/c/1771791) 的示例。

# 發佈

## 何時可以發佈一個 WebAssembly 功能

- 滿足 [V8 發佈過程](https://v8.dev/docs/feature-launch-process)。
- 實現在模糊測試中有覆蓋（如適用）。
- 該功能已分階段數週以獲得模糊測試的覆蓋範圍。
- 該功能提議達到 [第 4 階段](https://github.com/WebAssembly/proposals)。
- 所有 [規範測試](https://github.com/WebAssembly/spec/tree/master/test) 均通過。
- 滿足 [Chromium 開發工具檢查清單](https://docs.google.com/document/d/1WbL-fGuLbbNr5-n_nRGo_ILqZFnh5ZjRSUcDTT3yI8s/preview)。

## 如何發佈一個 WebAssembly 功能

- 在 [`src/wasm/wasm-feature-flags.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/wasm/wasm-feature-flags.h) 中，將該功能標誌從 `FOREACH_WASM_STAGING_FEATURE_FLAG` 宏列表移至 `FOREACH_WASM_SHIPPED_FEATURE_FLAG` 宏列表。
    - 確保在 CL 上添加一個 blink CQ bot，以檢查啟用該功能是否會導致 [blink 網頁測試](https://v8.dev/docs/blink-layout-tests) 失敗（在 CL 描述的頁腳中添加此行：`Cq-Include-Trybots: luci.v8.try:v8_linux_blink_rel`）。
- 此外，透過將 `FOREACH_WASM_SHIPPED_FEATURE_FLAG` 中的第三個參數更改為 `true` 來默認啟用該功能。
- 在兩個里程碑後設置一個提醒以刪除該功能標誌。
