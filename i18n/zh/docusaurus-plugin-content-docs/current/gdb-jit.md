---
title: &apos;GDB JIT 编译接口集成&apos;
description: &apos;GDB JIT 编译接口集成允许 V8 为从 V8 运行时生成的原生代码向 GDB 提供符号和调试信息。&apos;
---
GDB JIT 编译接口集成允许 V8 为从 V8 运行时生成的原生代码向 GDB 提供符号和调试信息。

当 GDB JIT 编译接口被禁用时，GDB 中一个典型的回溯会包含标记为 `??` 的帧。这些帧对应于动态生成的代码：

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

然而，启用 GDB JIT 编译接口可以让 GDB 生成更具参考价值的堆栈跟踪：

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

仍然未知的帧对应于没有来源信息的原生代码。有关详情，请参阅[已知限制](#known-limitations)。

GDB JIT 编译接口在 GDB 文档中有说明：https://sourceware.org/gdb/current/onlinedocs/gdb/JIT-Interface.html

## 前提条件

- V8 v3.0.9 或更高版本
- GDB 7.0 或更高版本
- Linux 操作系统
- 具有 Intel 兼容架构的 CPU（ia32 或 x64）

## 启用 GDB JIT 编译接口

默认情况下，GDB JIT 编译接口目前在编译时被排除，并在运行时被禁用。要启用它：

1. 使用定义了 `ENABLE_GDB_JIT_INTERFACE` 构建 V8 库。如果您使用 scons 构建 V8，请通过 `gdbjit=on` 运行它。
1. 在启动 V8 时传递 `--gdbjit` 标志。

要验证是否正确启用了 GDB JIT 集成，请尝试在 `__jit_debug_register_code` 上设置断点。此函数会在通知 GDB 关于新代码对象时调用。

## 已知限制

- GDB JIT 接口的 GDB 部分（截至 GDB 7.2）目前无法非常有效地处理代码对象的注册。每次注册所需的时间都会增加：注册 500 个对象后，每次新的注册需要超过 50ms；注册 1000 个代码对象后，每次新的注册需要超过 300 ms。此问题已[向 GDB 开发人员报告](https://sourceware.org/ml/gdb/2011-01/msg00002.html)，但目前尚无解决方案。为了减轻 GDB 的压力，GDB JIT 集成的当前实现以两种模式运行：_默认_ 模式和 _完全_ 模式（通过 `--gdbjit-full` 标志启用）。在 _默认_ 模式下，V8 仅通知 GDB 附加有源信息的代码对象（这通常包括所有用户脚本）。在 _完全_ 模式下，则通知 GDB 所有生成的代码对象（如存根、IC、跳板）。

- 在 x64 上，如果没有 `.eh_frame` 节，GDB 无法正确展开堆栈（[问题 1053](https://bugs.chromium.org/p/v8/issues/detail?id=1053)）

- GDB 不会被通知关于从快照反序列化的代码（[问题 1054](https://bugs.chromium.org/p/v8/issues/detail?id=1054)）

- 仅支持在 Intel 兼容 CPU 的 Linux 操作系统上运行。对于不同的操作系统，要么需要生成不同的 ELF 标头，要么需要使用完全不同的对象格式。

- 启用 GDB JIT 接口会禁用压缩垃圾回收。这是为了减少 GDB 的压力，因为取消注册和重新注册每个移动的代码对象会带来显著的开销。

- GDB JIT 集成仅提供 _近似_ 的源信息。它不提供任何关于局部变量、函数参数、堆栈布局等的信息。它无法启用逐步执行 JavaScript 代码或在指定行设置断点。然而，可以通过函数名称设置断点。
