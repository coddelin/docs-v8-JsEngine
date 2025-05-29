---
title: &apos;GDB JIT Compilation Interface 整合&apos;
description: &apos;GDB JIT Compilation Interface 整合讓 V8 可以提供 GDB 與 V8 執行時產生的原生程式碼的符號和除錯資訊。&apos;
---
GDB JIT Compilation Interface 整合讓 V8 可以提供 GDB 與 V8 執行時產生的原生程式碼的符號和除錯資訊。

當 GDB JIT Compilation Interface 被停用時，GDB 中的典型回溯包含用 `??` 標記的框架。這些框架對應於動態生成的程式碼：

```
#8  0x08281674 in v8::internal::Runtime_SetProperty (args=...) at src/runtime.cc:3758
#9  0xf5cae28e in ?? ()
#10 0xf5cc3a0a in ?? ()
#11 0xf5cc38f4 in ?? ()
#12 0xf5cbef19 in ?? ()
#13 0xf5cb09a2 in ?? ()
#14 0x0809e0a5 in v8::internal::Invoke (construct=false, func=..., receiver=..., argc=0, args=0x0,
    has_pending_exception=0xffffd46f) at src/execution.cc:97
```

然而，啟用 GDB JIT Compilation Interface 可以讓 GDB 生成更具資訊性的堆疊追踪：

```
#6  0x082857fc in v8::internal::Runtime_SetProperty (args=...) at src/runtime.cc:3758
#7  0xf5cae28e in ?? ()
#8  0xf5cc3a0a in loop () at test.js:6
#9  0xf5cc38f4 in test.js () at test.js:13
#10 0xf5cbef19 in ?? ()
#11 0xf5cb09a2 in ?? ()
#12 0x0809e1f9 in v8::internal::Invoke (construct=false, func=..., receiver=..., argc=0, args=0x0,
    has_pending_exception=0xffffd44f) at src/execution.cc:97
```

對 GDB 仍未知的框架對應於沒有來源資訊的原生程式碼。詳細資訊請參見[已知限制](#known-limitations)。

GDB JIT Compilation Interface 規範詳見 GDB 文件：https://sourceware.org/gdb/current/onlinedocs/gdb/JIT-Interface.html

## 先決條件

- V8 v3.0.9 或更新版本
- GDB 7.0 或更新版本
- Linux 作業系統
- Intel 相容架構的 CPU (ia32 或 x64)

## 啟用 GDB JIT Compilation Interface

GDB JIT Compilation Interface 目前預設不包含於編譯中，且在執行時停用。要啟用：

1. 使用定義了 `ENABLE_GDB_JIT_INTERFACE` 建置 V8 函式庫。如果您使用 scons 編譯 V8，可加入 `gdbjit=on`。
1. 啟動 V8 時加入 `--gdbjit` 參數。

要檢查是否正確啟用了 GDB JIT 整合，可以嘗試在 `__jit_debug_register_code` 上設置斷點。這個函式會通知 GDB 新的程式碼物件。

## 已知限制

- GDB 的 JIT Interface（截至 GDB 7.2）目前在程式碼物件註冊方面處理效率不高。每次註冊需要更久的時間：註冊了 500 個物件後，每次註冊需超過 50 毫秒；註冊了 1000 個物件時，每次註冊需超過 300 毫秒。這個問題已[向 GDB 開發者回報](https://sourceware.org/ml/gdb/2011-01/msg00002.html)，但目前尚無解決方案。為減少 GDB 的壓力，目前 GDB JIT 整合有兩種模式：_預設_ 和 _完整_（通過 `--gdbjit-full` 啟用）。在 _預設_ 模式下，V8 僅通知 GDB 有附加來源資訊的程式碼物件（通常包括所有使用者腳本）。而 _完整_ 模式則通知所有生成的程式碼物件（如 stubs、ICs、trampolines）。

- 在 x64 架構中，GDB 無法在沒有 `.eh_frame` 部分的情況下正確解開堆疊 ([問題 1053](https://bugs.chromium.org/p/v8/issues/detail?id=1053))

- GDB 未被通知從快照反序列化的程式碼 ([問題 1054](https://bugs.chromium.org/p/v8/issues/detail?id=1054))

- 僅支持 Intel 相容 CPU 上的 Linux 作業系統。對於不同的作業系統，需生成不同的 ELF 標頭或使用完全不同的物件格式。

- 啟用 GDB JIT Interface 會停用壓縮版 GC。這是為了減少 GDB 的壓力，因為解除註冊並重新註冊每個移動過的程式碼物件將產生大量開銷。

- GDB JIT 整合只提供_近似的_來源資訊。它未提供任何關於區域變數、函式參數、堆疊佈局等資訊。它無法啟用逐步執行 JavaScript 程式碼或者在給定行上設置斷點。然而，可以通過函式名稱設置斷點。
