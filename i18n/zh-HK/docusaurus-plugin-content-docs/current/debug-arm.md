---
title: "使用模擬器進行 Arm 除錯"
description: "Arm 模擬器和除錯器在處理 V8 代碼生成時非常有幫助。"
---
模擬器和除錯器在處理 V8 代碼生成時非常有幫助。

- 它很方便，允許您在不需要實際硬體的情況下測試代碼生成。
- 不需要 [交叉](/docs/cross-compile-arm) 或原生編譯。
- 模擬器完全支持生成代碼的除錯。

請注意，此模擬器是專為 V8 目的設計的。僅實現了 V8 使用的功能，您可能會遇到未實現的功能或指令。在這種情況下，請隨時實現它們並提交代碼！

- [編譯](#compiling)
- [啟動除錯器](#start_debug)
- [除錯命令](#debug_commands)
    - [printobject](#po)
    - [trace](#trace)
    - [break](#break)
- [額外的斷點功能](#extra)
    - [32-bit: `stop()`](#arm32_stop)
    - [64-bit: `Debug()`](#arm64_debug)

## 使用模擬器編譯 Arm

默認情況下，在 x86 主機上使用 [gm](/docs/build-gn#gm) 為 Arm 編譯將會生成一個模擬器版本：

```bash
gm arm64.debug # 用於 64 位版本或者...
gm arm.debug   # ... 用於 32 位版本。
```

您還可以構建 `optdebug` 配置，因為 `debug` 可能稍慢，特別是當您想執行 V8 測試套件時。

## 啟動除錯器

您可以在執行 `n` 條指令後直接從命令行啟動除錯器：

```bash
out/arm64.debug/d8 --stop_sim_at <n> # 或者使用 out/arm.debug/d8 用於 32 位版本。
```

或者，您可以在生成的代碼中生成一條斷點指令：

在原生環境中，斷點指令會使程序因 `SIGTRAP` 信號停頓，允許您使用 gdb 除錯。然而，當使用模擬器運行時，生成代碼中的斷點指令將把您帶入模擬器除錯器。

您可以通過多種方式生成斷點，使用 [Torque](/docs/torque-builtins) 中的 `DebugBreak()`，從 [CodeStubAssembler](/docs/csa-builtins)、作為 [TurboFan](/docs/turbofan) 過程中的節點，或直接使用匯編程序。

此處我們主要聚焦於原生低級代碼的除錯，因此我們使用匯編方法：

```cpp
TurboAssembler::DebugBreak();
```

假設我們有一個名為 `add` 的 JIT 函數，該函數使用[Turbofan](/docs/turbofan)編譯，我們希望在開始時斷點。給定一個 `test.js` 的例子：



```js
// 我們的優化函數。
function add(a, b) {
  return a + b;
}

// 典型的作弊代碼，由 --allow-natives-syntax 啟用。
%PrepareFunctionForOptimization(add);

// 為優化編譯器提供類型反饋，因此它會推測 `a` 和 `b` 是
// 數字。
add(1, 3);

// 並強制其進行優化。
%OptimizeFunctionOnNextCall(add);
add(5, 7);
```

為此，我們可以掛接到 TurboFan 的 [代碼生成器](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/code-generator.cc?q=CodeGenerator::AssembleCode) 並訪問匯編程序插入我們的斷點：

```cpp
void CodeGenerator::AssembleCode() {
  // ...

  // 檢查我們是否正在進行優化，然後查找當前函數的名稱並
  // 插入斷點。
  if (info->IsOptimizing()) {
    AllowHandleDereference allow_handle_dereference;
    if (info->shared_info()->PassesFilter("add")) {
      tasm()->DebugBreak();
    }
  }

  // ...
}
```

然後運行它：

```simulator
$ d8 \
    # 啟用 '%' 作弊代碼 JS 函數。
    --allow-natives-syntax \
    # 反組譯我們的函數。
    --print-opt-code --print-opt-code-filter="add" --code-comments \
    # 為了提高可讀性禁用 spectre 緩解措施。
    --no-untrusted-code-mitigations \
    test.js
--- 原始代碼 ---
(a, b) {
  return a + b;
}


--- 優化代碼 ---
optimization_id = 0
source_position = 12
kind = OPTIMIZED_FUNCTION
name = add
stack_slots = 6
compiler = turbofan
address = 0x7f0900082ba1

指令 (大小 = 504)
0x7f0900082be0     0  d45bd600       常數池開始 (num_const = 6)
0x7f0900082be4     4  00000000       常數
0x7f0900082be8     8  00000001       常數
0x7f0900082bec     c  75626544       常數
0x7f0900082bf0    10  65724267       常數
0x7f0900082bf4    14  00006b61       常數
0x7f0900082bf8    18  d45bd7e0       常數
                  -- 序言: 檢查代碼起始寄存器 --
0x7f0900082bfc    1c  10ffff30       adr x16, #-0x1c (地址 0x7f0900082be0)
0x7f0900082c00    20  eb02021f       cmp x16, x2
0x7f0900082c04    24  54000080       b.eq #+0x10 (地址 0x7f0900082c14)
                  中止信息:
                  傳遞給代碼起始寄存器的值錯誤
0x7f0900082c08    28  d2800d01       movz x1, #0x68
                  -- 嵌入中止的跳板 --
0x7f0900082c0c    2c  58000d70       ldr x16, pc+428 (地址 0x00007f0900082db8)    ;; 離堆目標
0x7f0900082c10    30  d63f0200       blr x16
                  -- 序幕：檢查去優化 --
                  [ 解壓縮標記指針
0x7f0900082c14    34  b85d0050       ldur w16, [x2, #-48]
0x7f0900082c18    38  8b100350       add x16, x26, x16
                  ]
0x7f0900082c1c    3c  b8407210       ldur w16, [x16, #7]
0x7f0900082c20    40  36000070       tbz w16, #0, #+0xc (址 0x7f0900082c2c)
                  -- 線上內插到 CompileLazyDeoptimizedCode --
0x7f0900082c24    44  58000c31       ldr x17, pc+388 (址 0x00007f0900082da8)    ;; 堆外目標
0x7f0900082c28    48  d61f0220       br x17
                  -- B0 起始 (構建框架) --
(...)

--- 結束代碼 ---
# 調試器命中 0: DebugBreak
0x00007f0900082bfc 10ffff30            adr x16, #-0x1c (址 0x7f0900082be0)
sim>
```

我們可以看到我們在優化函數的起始處停止，並且模擬器給出了提示！

請注意，這只是個範例，V8 的變化非常快，因此細節可能有所不同。但您應該能在任何提供組譯器的地方執行這操作。

## 調試命令

### 常見命令

在調試器提示符下輸入 `help` 可獲取可用命令的詳細信息。這包括常見的類似 gdb 的命令，比如 `stepi`、`cont`、`disasm` 等。如果模擬器在 gdb 下運行，輸入 `gdb` 指令可切換到 gdb 控制。您可以在 gdb 中使用 `cont` 返回調試器。

### 特定架構命令

每個目標架構都有其自己的模擬器和調試器，因此體驗和細節各有不同。

- [printobject](#po)
- [trace](#trace)
- [break](#break)

#### `printobject $register` (別名 `po`)

描述寄存器中保存的 JS 對象。

例如，假設這次我們在 32 位 Arm 模擬器版本中運行 [範例](#test.js)。我們可以檢查通過寄存器傳遞的傳入參數：

```模擬器
$ ./out/arm.debug/d8 --allow-natives-syntax test.js
模擬器命中停止，下一條指令處中斷：
  0x26842e24  e24fc00c       sub ip, pc, #12
sim> print r1
r1: 0x4b60ffb1 1264648113
# 當前函數對象用 r1 傳遞。
sim> printobject r1
r1:
0x4b60ffb1: [Function] 位於 OldSpace
 - 映射: 0x485801f9 <Map(HOLEY_ELEMENTS)> [快速屬性]
 - 原型: 0x4b6010f1 <JSFunction (sfi = 0x42404e99)>
 - 元素: 0x5b700661 <FixedArray[0]> [HOLEY_ELEMENTS]
 - 函數原型：
 - 初始映射：
 - 共享資訊: 0x4b60fe9d <SharedFunctionInfo add>
 - 名稱: 0x5b701c5d <String[#3]: add>
 - 形式參數數量: 2
 - 種類: 普通函數
 - 上下文: 0x4b600c65 <NativeContext[261]>
 - 代碼: 0x26842de1 <Code OPTIMIZED_FUNCTION>
 - 原始代碼: (a, b) {
  return a + b;
}
(...)

# 現在打印通過 r7 傳遞的當前 JS 上下文。
sim> printobject r7
r7:
0x449c0c65: [NativeContext] 位於 OldSpace
 - 映射: 0x561000b9 <Map>
 - 長度: 261
 - 範圍資訊: 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
 - 先前的: 0
 - 本地上下文: 0x449c0c65 <NativeContext[261]>
           0: 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
           1: 0
           2: 0x449cdaf5 <JSObject>
           3: 0x58480c25 <JSGlobal Object>
           4: 0x58485499 <其他堆對象 (EMBEDDER_DATA_ARRAY_TYPE)>
           5: 0x561018a1 <Map(HOLEY_ELEMENTS)>
           6: 0x3408027d <undefined>
           7: 0x449c75c1 <JSFunction ArrayBuffer (sfi = 0x4be8ade1)>
           8: 0x561010f9 <Map(HOLEY_ELEMENTS)>
           9: 0x449c967d <JSFunction arrayBufferConstructor_DoNotInitialize (sfi = 0x4be8c3ed)>
          10: 0x449c8dbd <JSFunction Array (sfi = 0x4be8be59)>
(...)
```

#### `trace` (別名 `t`)

啟用或禁用執行指令的追蹤。

啟用後，模擬器將在執行指令時打印反彙編指令。如果您運行的是 64 位 Arm 版本，模擬器還能追蹤寄存器值的變化。

您也可以從命令行啟用 `--trace-sim` 標誌以啟用從開始的追蹤。

使用相同的 [範例](#test.js)：

```模擬器
$ out/arm64.debug/d8 --allow-natives-syntax \
    # --debug-sim 是在 64 位 Arm 版本下啟用反彙編時所需的
    # 進行追蹤。
    --debug-sim test.js
# 調試器命中 0: DebugBreak
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (址 0x7f1e00082be0)
sim> trace
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (址 0x7f1e00082be0)
啟用反彙編，寄存器和內存寫入追蹤

# 在 lr 寄存器中存儲的返回地址上設置斷點。
sim> break lr
在 0x7f1f880abd28 設置斷點
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (址 0x7f1e00082be0)

# 繼續運行將跟蹤函數的執行直到返回，允許
# 我們理解發生了什麼。
sim> continue
#    x0: 0x00007f1e00082ba1
#    x1: 0x00007f1e08250125
#    x2: 0x00007f1e00082be0
(...)

# 我們首先從堆疊中加載 `a` 和 `b` 參數並檢查它們
# 是否為標記數字。這通過最不顯位為 0 表示。
0x00007f1e00082c90  f9401fe2            ldr x2, [sp, #56]
#    x2: 0x000000000000000a <- 0x00007f1f821f0278
0x00007f1e00082c94  7200005f            tst w2, #0x1
# NZCV: N:0 Z:1 C:0 V:0
0x00007f1e00082c98  54000ac1            b.ne #+0x158 (addr 0x7f1e00082df0)
0x00007f1e00082c9c  f9401be3            ldr x3, [sp, #48]
#    x3: 0x000000000000000e <- 0x00007f1f821f0270
0x00007f1e00082ca0  7200007f            tst w3, #0x1
# NZCV: N:0 Z:1 C:0 V:0
0x00007f1e00082ca4  54000a81            b.ne #+0x150 (addr 0x7f1e00082df4)

# 然後我們將標籤去除並將 'a' 和 'b' 相加。
0x00007f1e00082ca8  13017c44            asr w4, w2, #1
#    x4: 0x0000000000000005
0x00007f1e00082cac  2b830484            adds w4, w4, w3, asr #1
# NZCV: N:0 Z:0 C:0 V:0
#    x4: 0x000000000000000c
# 就是 5 + 7 == 12，全部正常！

# 然後我們檢查溢出並將結果重新加標籤。
0x00007f1e00082cb0  54000a46            b.vs #+0x148 (addr 0x7f1e00082df8)
0x00007f1e00082cb4  2b040082            adds w2, w4, w4
# NZCV: N:0 Z:0 C:0 V:0
#    x2: 0x0000000000000018
0x00007f1e00082cb8  54000466            b.vs #+0x8c (addr 0x7f1e00082d44)


# 最後我們將結果放置於 x0。
0x00007f1e00082cbc  aa0203e0            mov x0, x2
#    x0: 0x0000000000000018
(...)

0x00007f1e00082cec  d65f03c0            ret
擊中並停用了一個斷點，位於 0x7f1f880abd28。
0x00007f1f880abd28  f85e83b4            ldur x20, [fp, #-24]
sim>
```

#### `break $address`

在指定地址插入一個斷點。

注意，在 32 位 Arm上，您只能有一個斷點，並且需要禁用代碼頁的寫保護才能插入它。64 位 Arm 模擬器則沒有這種限制。

再次使用我們的 [示例](#test.js):

```simulator
$ out/arm.debug/d8 --allow-natives-syntax \
    # 這對於了解需要在哪個地址中斷非常有用。
    --print-opt-code --print-opt-code-filter="add" \
    test.js
(...)

模擬器停止，下一條指令處中斷：
  0x488c2e20  e24fc00c       sub ip, pc, #12

# 在已知的有趣地址中斷，我們開始
# 加載 'a' 和 'b'。
sim> break 0x488c2e9c
sim> continue
  0x488c2e9c  e59b200c       ldr r2, [fp, #+12]

# 我們可以使用 'disasm' 向前查看。
sim> disasm 10
  0x488c2e9c  e59b200c       ldr r2, [fp, #+12]
  0x488c2ea0  e3120001       tst r2, #1
  0x488c2ea4  1a000037       bne +228 -> 0x488c2f88
  0x488c2ea8  e59b3008       ldr r3, [fp, #+8]
  0x488c2eac  e3130001       tst r3, #1
  0x488c2eb0  1a000037       bne +228 -> 0x488c2f94
  0x488c2eb4  e1a040c2       mov r4, r2, asr #1
  0x488c2eb8  e09440c3       adds r4, r4, r3, asr #1
  0x488c2ebc  6a000037       bvs +228 -> 0x488c2fa0
  0x488c2ec0  e0942004       adds r2, r4, r4

# 並嘗試停在第一條 `adds` 指令的結果上。
sim> break 0x488c2ebc
設置斷點失敗

# 啊，我們需要先刪除斷點。
sim> del
sim> break 0x488c2ebc
sim> cont
  0x488c2ebc  6a000037       bvs +228 -> 0x488c2fa0

sim> print r4
r4: 0x0000000c 12
# 就是 5 + 7 == 12，全部正常！
```

### 生成的斷點指令與一些附加功能

除了 `TurboAssembler::DebugBreak()`，您可以使用較低層級的指令，它具有相同的效果，並帶有附加功能。

- [32 位: `stop()`](#arm32_stop)
- [64 位: `Debug()`](#arm64_debug)

#### `stop()` (32 位 Arm)

```cpp
Assembler::stop(Condition cond = al, int32_t code = kDefaultStopCode);
```

第一個參數是條件，第二個是停止代碼。如果指定代碼，且小於 256，則停止被認為是“受監視的”，可以禁用或啟用；模擬器命中該代碼的次數也會被計數。

假設我們正在處理此 V8 C++ 代碼：

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

以下是一個示例調試會話：

我們命中了第一個停止。

```simulator
模擬器命中停止 123，下一條指令處中斷：
  0xb53559e8  e1a00000       mov r0, r0
```

我們可以使用 `disasm` 查看後續停止。

```simulator
sim> disasm
  0xb53559e8  e1a00000       mov r0, r0
  0xb53559ec  e1a00000       mov r0, r0
  0xb53559f0  e1a00000       mov r0, r0
  0xb53559f4  e1a00000       mov r0, r0
  0xb53559f8  e1a00000       mov r0, r0
  0xb53559fc  ef800001       stop 1 - 0x1
  0xb5355a00  e1a00000       mov r1, r1
  0xb5355a04  e1a00000       mov r1, r1
  0xb5355a08  e1a00000       mov r1, r1
```

可以為所有至少命中一次的（受監視）停止打印信息。

```simulator
sim> stop info all
停止信息：
stop 123 - 0x7b:      Enabled,      counter = 1
sim> cont
模擬器命中停止 1，下一條指令處中斷：
  0xb5355a04  e1a00000       mov r1, r1
sim> stop info all
停止信息：
stop 1 - 0x1:         Enabled,      counter = 1
stop 123 - 0x7b:      Enabled,      counter = 1
```

可以禁用或啟用停止。（僅對受監視的停止有效。）

```simulator
sim> stop disable 1
sim> cont
模擬器命中停止點 123，將在下一條指令處中斷：
  0xb5356808  e1a00000       mov r0, r0
sim> 繼續
模擬器命中停止點 123，將在下一條指令處中斷：
  0xb5356c28  e1a00000       mov r0, r0
sim> 停止資訊 全部
停止資訊：
停止點 1 - 0x1:         停用,     計數器 = 2
停止點 123 - 0x7b:      啟用,     計數器 = 3
sim> 啟用停止點 1
sim> 繼續
模擬器命中停止點 1，將在下一條指令處中斷：
  0xb5356c44  e1a00000       mov r1, r1
sim> 停用所有停止點
sim> 繼續
```

#### `Debug()`（64位元 Arm）

```cpp
MacroAssembler::Debug(const char* message, uint32_t code, Instr params = BREAK);
```

此指令預設為中斷點，但也能啟用和停用追蹤，功能類似於在除錯器中使用[`追蹤`](#trace)指令。此外，還可以為其指定一個訊息和代碼作為識別。

假設我們正在處理以下 V8 C++程式碼，該程式片段來自為呼叫 JS 函數準備框架的內建函數。

```cpp
int64_t bad_frame_pointer = -1L;  // 錯誤的框架指標，應該在使用時失敗。
__ Mov(x13, bad_frame_pointer);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);
```

我們可以插入一個 `DebugBreak()` 中斷點，以檢查當前執行情況。但如果使用 `Debug()`，我們甚至可以追蹤該程式碼：

```cpp
// 啟用追蹤並記錄反組譯及寄存器值。
__ Debug("start tracing", 42, TRACE_ENABLE | LOG_ALL);

int64_t bad_frame_pointer = -1L;  // 錯誤的框架指標，應該在使用時失敗。
__ Mov(x13, bad_frame_pointer);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);

// 停止追蹤。
__ Debug("stop tracing", 42, TRACE_DISABLE);
```

使用此方法，我們可以僅針對程式碼片段進行寄存器值追蹤：

```模擬器
$ d8 --allow-natives-syntax --debug-sim test.js
# NZCV: N:0 Z:0 C:0 V:0
# FPCR: AHP:0 DN:0 FZ:0 RMode:0b00 (向最近值取整)
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
