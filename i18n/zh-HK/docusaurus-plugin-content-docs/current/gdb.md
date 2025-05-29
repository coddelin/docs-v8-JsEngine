---
title: &apos;使用 GDB 調試內建函數&apos;
description: &apos;從 V8 v6.9 開始，可以在 GDB 中創建斷點以調試 CSA / ASM / Torque 內建函數。&apos;
---
從 V8 v6.9 開始，可以在 GDB（以及可能的其他調試器）中創建斷點以調試 CSA / ASM / Torque 內建函數。

```
(gdb) tb i::Isolate::Init
Temporary breakpoint 1 at 0x7ffff706742b: i::Isolate::Init. (2 locations)
(gdb) r
Thread 1 "d8" hit Temporary breakpoint 1, 0x00007ffff7c55bc0 in Isolate::Init
(gdb) br Builtins_RegExpPrototypeExec
Breakpoint 2 at 0x7ffff7ac8784
(gdb) c
Thread 1 "d8" hit Breakpoint 2, 0x00007ffff7ac8784 in Builtins_RegExpPrototypeExec ()
```

需要注意的是，使用臨時斷點（GDB 中的快捷命令 `tb`）比使用普通斷點（`br`）更方便，因為您只需要在進程開始時設置一次。

內建函數在堆疊追踪中也可見：

```
(gdb) bt
#0  0x00007ffff7ac8784 in Builtins_RegExpPrototypeExec ()
#1  0x00007ffff78f5066 in Builtins_ArgumentsAdaptorTrampoline ()
#2  0x000039751d2825b1 in ?? ()
#3  0x000037ef23a0fa59 in ?? ()
#4  0x0000000000000000 in ?? ()
```

注意事項：

- 僅適用於嵌入式內建函數。
- 斷點只能設置在內建函數的起始位置。
- 在設置內建函數斷點之前，需要在 `Isolate::Init` 中設置初始斷點，因為 GDB 會修改二進制檔案，並且我們在啟動時驗證二進制檔案內建部份的雜湊值。否則，V8 會報告雜湊值不匹配：

    ```
    # Fatal error in ../../src/isolate.cc, line 117
    # Check failed: d.Hash() == d.CreateHash() (11095509419988753467 vs. 3539781814546519144).
    ```
