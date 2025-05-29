---
title: '使用 GDB 调试内建函数'
description: '从 V8 v6.9 开始，可以在 GDB 中创建断点来调试 CSA / ASM / Torque 内建函数。'
---
从 V8 v6.9 开始，可以在 GDB（以及可能的其他调试器）中创建断点来调试 CSA / ASM / Torque 内建函数。

```
(gdb) tb i::Isolate::Init
临时断点 1 设置在 0x7ffff706742b: i::Isolate::Init.（2 个位置）
(gdb) r
线程 1 "d8" 命中临时断点 1，位于 0x00007ffff7c55bc0 的 Isolate::Init
(gdb) br Builtins_RegExpPrototypeExec
断点 2 设置在 0x7ffff7ac8784
(gdb) c
线程 1 "d8" 命中断点 2，位于 Builtins_RegExpPrototypeExec () 的 0x00007ffff7ac8784
```

请注意，使用临时断点（GDB 中的快捷命令 `tb`）而不是常规断点（`br`）在此场景下效果更好，因为您只需要在进程启动时使用它。

内建函数在堆栈跟踪中也可见：

```
(gdb) bt
#0  0x00007ffff7ac8784 在 Builtins_RegExpPrototypeExec ()
#1  0x00007ffff78f5066 在 Builtins_ArgumentsAdaptorTrampoline ()
#2  0x000039751d2825b1 在 ?? ()
#3  0x000037ef23a0fa59 在 ?? ()
#4  0x0000000000000000 在 ?? ()
```

注意事项：

- 仅适用于嵌入的内建函数。
- 断点只能设置在内建函数的起始位置。
- 在设置内建函数断点之前，需要在 `Isolate::Init` 中设置初始断点，因为 GDB 会修改二进制文件，而我们在启动时会验证二进制文件中内建部分的哈希值。否则，V8 会因哈希值不匹配而报错：

    ```
    # 在 ../../src/isolate.cc 第 117 行发生致命错误
    # 检查失败：d.Hash() == d.CreateHash() (11095509419988753467 与 3539781814546519144 不匹配)。
    ```
