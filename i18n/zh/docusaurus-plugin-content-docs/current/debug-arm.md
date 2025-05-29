---
title: '使用模拟器进行Arm调试'
description: 'Arm模拟器和调试器在处理V8代码生成时非常有帮助。'
---
模拟器和调试器在处理V8代码生成时非常有帮助。

- 它很方便，因为无需接触真实硬件即可测试代码生成。
- 不需要交叉编译或本机编译。
- 模拟器完全支持生成代码的调试。

请注意，此模拟器专为V8设计。仅实现了V8使用的功能，您可能会遇到未实现的功能或指令。在这种情况下，请随意实现它们并提交代码！

- [编译](#compiling)
- [启动调试器](#start_debug)
- [调试命令](#debug_commands)
    - [printobject](#po)
    - [trace](#trace)
    - [break](#break)
- [额外的断点功能](#extra)
    - [32位: `stop()`](#arm32_stop)
    - [64位: `Debug()`](#arm64_debug)

## 使用模拟器进行Arm编译

默认情况下，在x86主机上使用[gm](/docs/build-gn#gm)进行Arm编译将生成模拟器构建：

```bash
gm arm64.debug # 对于64位构建或...
gm arm.debug   # ...对于32位构建。
```

您也可以选择构建`optdebug`配置，因为`debug`可能稍微慢一些，特别是在运行V8测试套件时。

## 启动调试器

您可以在执行`n`指令后立即从命令行启动调试器：

```bash
out/arm64.debug/d8 --stop_sim_at <n> # 或者使用out/arm.debug/d8进行32位构建。
```

或者，您可以在生成的代码中生成一个断点指令：

本地运行时，断点指令会导致程序以`SIGTRAP`信号暂停，从而可以使用gdb调试问题。然而，如果使用模拟器运行，生成代码中的断点指令会将您带入模拟器调试器。

您可以通过多种方式使用`DebugBreak()`生成断点，包括从[Torque](/docs/torque-builtins)、[CodeStubAssembler](/docs/csa-builtins)、作为[TurboFan](/docs/turbofan)进程中的节点，或直接使用汇编器。

这里我们重点介绍低级本地代码的调试，让我们来看看使用汇编器的方法：

```cpp
TurboAssembler::DebugBreak();
```

假设我们有一个通过[TurboFan](/docs/turbofan)编译的名为`add`的即时编译函数，并且我们想要在开始时中断。给定一个`test.js`示例：



```js
// 我们的优化函数。
function add(a, b) {
  return a + b;
}

// 使用--allow-natives-syntax启用典型作弊代码。
%PrepareFunctionForOptimization(add);

// 给优化编译器类型反馈，以便它会推测`a`和`b`是数字。
add(1, 3);

// 强制优化。
%OptimizeFunctionOnNextCall(add);
add(5, 7);
```

为了实现这一点，我们可以钩入TurboFan的[代码生成器](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/code-generator.cc?q=CodeGenerator::AssembleCode)并访问汇编器插入断点：

```cpp
void CodeGenerator::AssembleCode() {
  // ...

  // 检查是否正在优化，然后查找当前函数的名称并插入一个断点。
  if (info->IsOptimizing()) {
    AllowHandleDereference allow_handle_dereference;
    if (info->shared_info()->PassesFilter("add")) {
      tasm()->DebugBreak();
    }
  }

  // ...
}
```

让我们运行它：

```simulator
$ d8 \
    # 启用'%'作弊代码JavaScript函数。
    --allow-natives-syntax \
    # 反汇编我们的函数。
    --print-opt-code --print-opt-code-filter="add" --code-comments \
    # 禁用Spectre缓解措施以提高可读性。
    --no-untrusted-code-mitigations \
    test.js
--- 原始源码 ---
(a, b) {
  return a + b;
}


--- 优化代码 ---
optimization_id = 0
source_position = 12
kind = OPTIMIZED_FUNCTION
name = add
stack_slots = 6
compiler = turbofan
address = 0x7f0900082ba1

指令 (size = 504)
0x7f0900082be0     0  d45bd600       常量池开始 (num_const = 6)
0x7f0900082be4     4  00000000       常量
0x7f0900082be8     8  00000001       常量
0x7f0900082bec     c  75626544       常量
0x7f0900082bf0    10  65724267       常量
0x7f0900082bf4    14  00006b61       常量
0x7f0900082bf8    18  d45bd7e0       常量
                  -- 序言: 检查代码起始寄存器 --
0x7f0900082bfc    1c  10ffff30       adr x16, #-0x1c (地址 0x7f0900082be0)
0x7f0900082c00    20  eb02021f       cmp x16, x2
0x7f0900082c04    24  54000080       b.eq #+0x10 (地址 0x7f0900082c14)
                  中止消息:
                  代码起始寄存器传递的值错误
0x7f0900082c08    28  d2800d01       movz x1, #0x68
                  -- 内联跳板到中止 --
0x7f0900082c0c    2c  58000d70       ldr x16, pc+428 (地址 0x00007f0900082db8)    ;; 离堆目标
0x7f0900082c10    30  d63f0200       blr x16
                  -- 序幕：检查反优化 --
                  [ 解压标签指针
0x7f0900082c14    34  b85d0050       ldur w16, [x2, #-48]
0x7f0900082c18    38  8b100350       add x16, x26, x16
                  ]
0x7f0900082c1c    3c  b8407210       ldur w16, [x16, #7]
0x7f0900082c20    40  36000070       tbz w16, #0, #+0xc (地址 0x7f0900082c2c)
                  -- 内嵌跳板到 CompileLazyDeoptimizedCode --
0x7f0900082c24    44  58000c31       ldr x17, pc+388 (地址 0x00007f0900082da8)    ;; 堆外目标
0x7f0900082c28    48  d61f0220       br x17
                  -- B0 开始 (构建栈帧) --
(...)

--- 代码结束 ---
# 调试器命中 0: DebugBreak
0x00007f0900082bfc 10ffff30            adr x16, #-0x1c (地址 0x7f0900082be0)
sim>
```

我们可以看到，我们在优化函数开始处停止，并且模拟器给了我们一个提示！

注意，这只是一个示例，V8变化很快，因此细节可能会有所不同。但只要能访问汇编器，您应该能够做到这些。

## 调试命令

### 常用命令

在调试器提示符中输入 `help` 可查看可用命令的详细信息。这些包括通常的类似 gdb 的命令，例如 `stepi`、`cont`、`disasm` 等。如果模拟器在 gdb 下运行，则 `gdb` 调试器命令将交给 gdb 控制。然后可以使用 gdb 的 `cont` 返回调试器。

### 特定架构命令

每个目标架构实现其自己的模拟器和调试器，因此体验和细节会有所不同。

- [printobject](#po)
- [trace](#trace)
- [break](#break)

#### `printobject $register` (别名 `po`)

描述寄存器中的 JS 对象。

例如，假设这次我们在 32 位 Arm 模拟器构建上运行 [我们的示例](#test.js)。我们可以检查寄存器中传递的入参：

```simulator
$ ./out/arm.debug/d8 --allow-natives-syntax test.js
模拟器命中停止，即将在下一条指令处中断：
  0x26842e24  e24fc00c       sub ip, pc, #12
sim> 打印 r1
r1: 0x4b60ffb1 1264648113
# 当前函数对象通过 r1 传递。
sim> 打印对象 r1
r1:
0x4b60ffb1: [Function] 在 OldSpace
 - 映射: 0x485801f9 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - 原型: 0x4b6010f1 <JSFunction (sfi = 0x42404e99)>
 - 元素: 0x5b700661 <FixedArray[0]> [HOLEY_ELEMENTS]
 - 函数原型:
 - 初始映射:
 - 共享信息: 0x4b60fe9d <SharedFunctionInfo add>
 - 名称: 0x5b701c5d <String[#3]: add>
 - 形式参数数量: 2
 - 类型: NormalFunction
 - 上下文: 0x4b600c65 <NativeContext[261]>
 - 代码: 0x26842de1 <Code OPTIMIZED_FUNCTION>
 - 源代码: (a, b) {
  返回 a + b;
}
(...)

# 现在打印通过 r7 传递的当前 JS 上下文。
sim> 打印对象 r7
r7:
0x449c0c65: [NativeContext] 在 OldSpace
 - 映射: 0x561000b9 <Map>
 - 长度: 261
 - 范围信息: 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
 - 前一个: 0
 - 本地上下文: 0x449c0c65 <NativeContext[261]>
           0: 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
           1: 0
           2: 0x449cdaf5 <JSObject>
           3: 0x58480c25 <JSGlobal Object>
           4: 0x58485499 <其他堆对象 (EMBEDDER_DATA_ARRAY_TYPE)>
           5: 0x561018a1 <Map(HOLEY_ELEMENTS)>
           6: 0x3408027d <undefined>
           7: 0x449c75c1 <JSFunction ArrayBuffer (sfi = 0x4be8ade1)>
           8: 0x561010f9 <Map(HOLEY_ELEMENTS)>
           9: 0x449c967d <JSFunction arrayBufferConstructor_DoNotInitialize (sfi = 0x4be8c3ed)>
          10: 0x449c8dbd <JSFunction Array (sfi = 0x4be8be59)>
(...)
```

#### `trace` (别名 `t`)

启用或禁用跟踪执行的指令。

启用后，模拟器将在执行指令时打印反汇编指令。如果您运行的是 64 位 Arm 构建，模拟器还能够跟踪寄存器值的变化。

您也可以使用命令行标志 `--trace-sim` 在启动时启用跟踪。

使用相同的 [示例](#test.js)：

```simulator
$ out/arm64.debug/d8 --allow-natives-syntax \
    # 在 64 位 Arm 上需要 --debug-sim 以启用反汇编
    # 当跟踪时。
    --debug-sim test.js
# 调试器命中 0: DebugBreak
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (地址 0x7f1e00082be0)
sim> 跟踪
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (地址 0x7f1e00082be0)
启用反汇编、寄存器和内存写入跟踪

# 在 lr 寄存器中存储的返回地址上设置断点。
sim> break lr
在 0x7f1f880abd28 设置断点
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (地址 0x7f1e00082be0)

# 继续操作将跟踪函数的执行，直到返回，从而使我们弄明白发生了什么。
sim> 继续
#    x0: 0x00007f1e00082ba1
#    x1: 0x00007f1e08250125
#    x2: 0x00007f1e00082be0
(...)

# 我们首先从堆栈加载 &apos;a&apos; 和 &apos;b&apos; 参数并检查它们是否
# 是标签数字。这可以通过最低有效位为 0 来标识。
0x00007f1e00082c90  f9401fe2            ldr x2, [sp, #56]
#    x2: 0x000000000000000a <- 0x00007f1f821f0278
0x00007f1e00082c94  7200005f            测试 w2, #0x1
# NZCV: N:0 Z:1 C:0 V:0
0x00007f1e00082c98  54000ac1            不等于跳转 #+0x158 (地址 0x7f1e00082df0)
0x00007f1e00082c9c  f9401be3            加载 x3, [sp, #48]
#    x3: 0x000000000000000e <- 0x00007f1f821f0270
0x00007f1e00082ca0  7200007f            测试 w3, #0x1
# NZCV: N:0 Z:1 C:0 V:0
0x00007f1e00082ca4  54000a81            不等于跳转 #+0x150 (地址 0x7f1e00082df4)

# 然后我们解除标记并将 'a' 和 'b' 相加。
0x00007f1e00082ca8  13017c44            算术右移 w4, w2, #1
#    x4: 0x0000000000000005
0x00007f1e00082cac  2b830484            相加 w4, w4, w3, 算术右移 #1
# NZCV: N:0 Z:0 C:0 V:0
#    x4: 0x000000000000000c
# 那是 5 + 7 == 12，一切正常！

# 然后我们检查溢出并重新标记结果。
0x00007f1e00082cb0  54000a46            溢出跳转 #+0x148 (地址 0x7f1e00082df8)
0x00007f1e00082cb4  2b040082            相加 w2, w4, w4
# NZCV: N:0 Z:0 C:0 V:0
#    x2: 0x0000000000000018
0x00007f1e00082cb8  54000466            溢出跳转 #+0x8c (地址 0x7f1e00082d44)


# 最后我们将结果放置到 x0 中。
0x00007f1e00082cbc  aa0203e0            移动 x0, x2
#    x0: 0x0000000000000018
(...)

0x00007f1e00082cec  d65f03c0            返回
触发并禁用了一个断点于地址 0x7f1f880abd28。
0x00007f1f880abd28  f85e83b4            加载 x20, [fp, #-24]
sim>
```

#### `break $address`

在指定地址插入断点。

请注意在 32 位 Arm 上，你只能有一个断点并且需要禁用代码页的写保护以插入它。64 位 Arm 模拟器没有这些限制。

再次使用我们的 [示例](#test.js)：

```模拟器
$ out/arm.debug/d8 --allow-natives-syntax \
    # 这有助于了解需要断点的地址。
    --print-opt-code --print-opt-code-filter="add" \
    test.js
(...)

模拟器触发停止，并在下一个指令处断点：
  0x488c2e20  e24fc00c       减法 ip, pc, #12

# 在一个已知的有趣地址上断点，开始加载 'a' 和 'b'。
#
sim> break 0x488c2e9c
sim> continue
  0x488c2e9c  e59b200c       加载 r2, [fp, #+12]

# 我们可以通过 'disasm' 预览一下。
sim> disasm 10
  0x488c2e9c  e59b200c       加载 r2, [fp, #+12]
  0x488c2ea0  e3120001       测试 r2, #1
  0x488c2ea4  1a000037       不等于跳转 +228 -> 0x488c2f88
  0x488c2ea8  e59b3008       加载 r3, [fp, #+8]
  0x488c2eac  e3130001       测试 r3, #1
  0x488c2eb0  1a000037       不等于跳转 +228 -> 0x488c2f94
  0x488c2eb4  e1a040c2       移动 r4, r2, 算术右移 #1
  0x488c2eb8  e09440c3       相加 r4, r4, r3, 算术右移 #1
  0x488c2ebc  6a000037       溢出跳转 +228 -> 0x488c2fa0
  0x488c2ec0  e0942004       相加 r2, r4, r4

# 然后尝试断点在第一次 `adds` 指令的结果处。
sim> break 0x488c2ebc
设置断点失败

# 哦，我们需要先删除断点。
sim> del
sim> break 0x488c2ebc
sim> cont
  0x488c2ebc  6a000037       溢出跳转 +228 -> 0x488c2fa0

sim> 打印 r4
r4: 0x0000000c 12
# 那是 5 + 7 == 12，一切正常！
```

### 生成的断点指令以及一些附加功能

对比 `TurboAssembler::DebugBreak()`，你可以使用一个更底层的指令，具有相同效果并附加功能。

- [32 位: `stop()`](#arm32_stop)
- [64 位: `Debug()`](#arm64_debug)

#### `stop()` (32 位 Arm)

```cpp
Assembler::stop(Condition cond = al, int32_t code = kDefaultStopCode);
```

第一个参数是条件，第二个是停止代码。如果指定代码且小于 256，该停止被称为“受监视”，可以被禁用/启用；计数器也会记录模拟器命中此代码的次数。

假设我们正在处理以下 V8 C++ 代码：

```cpp
__ stop(al, 123);
__ mov(r0, r0);
__ mov(r0, r0);
__ mov(r0, r0);
__ mov(r0, r0);
__ mov(r0, r0);
__ stop(al, 0x1);
__ mov(r1, r1);
__ mov(r1, r1);
__ mov(r1, r1);
__ mov(r1, r1);
__ mov(r1, r1);
```

以下是一个调试会话示例：

我们命中了第一个停止。

```模拟器
模拟器命中停止 123，并在下一个指令处中断：
  0xb53559e8  e1a00000       移动 r0, r0
```

我们可以通过 `disasm` 看到后续停止。

```模拟器
sim> disasm
  0xb53559e8  e1a00000       移动 r0, r0
  0xb53559ec  e1a00000       移动 r0, r0
  0xb53559f0  e1a00000       移动 r0, r0
  0xb53559f4  e1a00000       移动 r0, r0
  0xb53559f8  e1a00000       移动 r0, r0
  0xb53559fc  ef800001       停止 1 - 0x1
  0xb5355a00  e1a00000       移动 r1, r1
  0xb5355a04  e1a00000       移动 r1, r1
  0xb5355a08  e1a00000       移动 r1, r1
```

可以打印所有至少被命中一次的（受监视的）停止的信息。

```模拟器
sim> stop info all
停止信息：
停止 123 - 0x7b:      已启用,      计数器 = 1
sim> cont
模拟器命中停止 1，并在下一个指令处中断：
  0xb5355a04  e1a00000       移动 r1, r1
sim> stop info all
停止信息：
停止 1 - 0x1:         已启用,      计数器 = 1
停止 123 - 0x7b:      已启用,      计数器 = 1
```

停止可以被禁用或启用。（仅限受监视的停止）

```模拟器
sim> stop disable 1
sim> cont
模拟器触发停止123，在下一条指令处中断：
  0xb5356808  e1a00000       mov r0, r0
sim> 继续
模拟器触发停止123，在下一条指令处中断：
  0xb5356c28  e1a00000       mov r0, r0
sim> 停止信息 全部
停止信息：
停止1 - 0x1:         已禁用，     计数器 = 2
停止123 - 0x7b:      已启用，      计数器 = 3
sim> 启用停止 1
sim> 继续
模拟器触发停止1，在下一条指令处中断：
  0xb5356c44  e1a00000       mov r1, r1
sim> 禁用停止 全部
sim> 继续
```

#### `Debug()` (64位 Arm)

```cpp
宏汇编器::Debug(const char* message, uint32_t code, Instr params = BREAK);
```

该指令默认是一个断点，但也可以启用和禁用跟踪，就像在调试器中使用 [`trace`](#trace) 命令一样。您还可以为其指定一个消息和一个代码作为标识符。

假设我们正在处理这段V8 C++代码，该代码取自用于准备调用JS函数帧的原生内置功能。

```cpp
int64_t bad_frame_pointer = -1L;  // 错误的帧指针，如果使用它应该失败。
__ Mov(x13, bad_frame_pointer);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);
```

可以使用 `DebugBreak()` 插入断点，这样我们可以在运行时检查当前状态。如果使用 `Debug()` ，我们还可以进一步跟踪这段代码：

```cpp
// 开始跟踪并记录反汇编和寄存器值。
__ Debug("开始跟踪", 42, TRACE_ENABLE | LOG_ALL);

int64_t bad_frame_pointer = -1L;  // 错误的帧指针，如果使用它应该失败。
__ Mov(x13, bad_frame_pointer);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);

// 停止跟踪。
__ Debug("停止跟踪", 42, TRACE_DISABLE);
```

这使我们可以仅仅跟踪我们正在处理的代码片段的寄存器值：

```模拟器
$ d8 --allow-natives-syntax --debug-sim test.js
# NZCV: N:0 Z:0 C:0 V:0
# FPCR: AHP:0 DN:0 FZ:0 RMode:0b00 (向最接近值舍入)
#    x0: 0x00007fbf00000000
#    x1: 0x00007fbf0804030d
#    x2: 0x00007fbf082500e1
(...)

0x00007fc039d31cb0  9280000d            movn x13, #0x0
#   x13: 0xffffffffffffffff
0x00007fc039d31cb4  d280004c            movz x12, #0x2
#   x12: 0x0000000000000002
0x00007fc039d31cb8  d2864110            movz x16, #0x3208
#   ip0: 0x0000000000003208
0x00007fc039d31cbc  8b10034b            add x11, x26, x16
#   x11: 0x00007fbf00003208
0x00007fc039d31cc0  f940016a            ldr x10, [x11]
#   x10: 0x0000000000000000 <- 0x00007fbf00003208
0x00007fc039d31cc4  a9be7fea            stp x10, xzr, [sp, #-32]!
#    sp: 0x00007fc033e81340
#   x10: 0x0000000000000000 -> 0x00007fc033e81340
#   xzr: 0x0000000000000000 -> 0x00007fc033e81348
0x00007fc039d31cc8  a90137ec            stp x12, x13, [sp, #16]
#   x12: 0x0000000000000002 -> 0x00007fc033e81350
#   x13: 0xffffffffffffffff -> 0x00007fc033e81358
0x00007fc039d31ccc  910063fd            add fp, sp, #0x18 (24)
#    fp: 0x00007fc033e81358
0x00007fc039d31cd0  d45bd600            hlt #0xdeb0
```
