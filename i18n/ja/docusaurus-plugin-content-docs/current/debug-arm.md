---
title: "Armシミュレーターを使用したデバッグ"
description: "Armシミュレーターとデバッガは、V8コード生成を扱う際に非常に役立ちます。"
---
シミュレーターとデバッガは、V8コード生成を扱う際に非常に役立ちます。

- 実際のハードウェアにアクセスすることなくコード生成をテストできるため便利です。
- [クロス](/docs/cross-compile-arm)やネイティブコンパイルは不要です。
- シミュレーターは生成されたコードのデバッグを完全にサポートします。

なお、このシミュレーターはV8専用に設計されています。V8が使用する機能のみが実装されているため、未実装の機能や命令に遭遇する可能性があります。その場合は、ご自由に実装してコードを提出してください！

- [コンパイル](#compiling)
- [デバッガの起動](#start_debug)
- [デバッグコマンド](#debug_commands)
    - [printobject](#po)
    - [trace](#trace)
    - [break](#break)
- [追加のブレークポイント機能](#extra)
    - [32ビット: `stop()`](#arm32_stop)
    - [64ビット: `Debug()`](#arm64_debug)

## シミュレーターを使用したArm向けコンパイル

x86ホスト上でデフォルトで、[gm](/docs/build-gn#gm)を使用してArm向けにコンパイルすると、シミュレータビルドが提供されます:

```bash
gm arm64.debug # 64ビットビルドの場合または...
gm arm.debug   # ... 32ビットビルドの場合。
```

V8のテストスイートを実行する場合など、`debug`が少々遅い場合には`optdebug`構成のビルドを行うこともできます。

## デバッガの起動

コマンドラインから`n`命令後すぐにデバッガを起動できます:

```bash
out/arm64.debug/d8 --stop_sim_at <n> # 32ビットビルドの場合は out/arm.debug/d8。
```

または、生成されたコード内でブレークポイント命令を生成することもできます:

ネイティブでは、ブレークポイント命令は`SIGTRAP`シグナルでプログラムを停止させ、gdbで問題をデバッグできます。ただし、シミュレーターを使用している場合、生成されたコード内のブレークポイント命令は代わりにシミュレーターのデバッガを起動します。

ブレークポイントを生成するには、[Torque](/docs/torque-builtins)、[CodeStubAssembler](/docs/csa-builtins)、[TurboFan](/docs/turbofan)のパス内のノード、またはアセンブラを直接使用して、`DebugBreak()`を使用する複数の方法があります。

ここでは低レベルのネイティブコードのデバッグに焦点を当てるため、アセンブラの使用方法を見てみましょう:

```cpp
TurboAssembler::DebugBreak();
```

`add`という名前のjitted関数を[TurboFan](/docs/turbofan)でコンパイルしており、その開始地点でブレークをかけたいと仮定します。`test.js`例を以下に示します:



```js
// 最適化された関数。
function add(a, b) {
  return a + b;
}

// --allow-natives-syntaxオプションによる典型的なチートコード。
%PrepareFunctionForOptimization(add);

// 型フィードバックを最適化コンパイラに与え、`a`と`b`が
// 数値であると推測させる。
add(1, 3);

// そして最適化を強制する。
%OptimizeFunctionOnNextCall(add);
add(5, 7);
```

これを実現するには、TurboFanの[コード生成器](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/code-generator.cc?q=CodeGenerator::AssembleCode)にフックし、アセンブラにアクセスしてブレークポイントを挿入します:

```cpp
void CodeGenerator::AssembleCode() {
  // ...

  // 最適化しているか確認し、現在の関数名を検索して
  // ブレークポイントを挿入する。
  if (info->IsOptimizing()) {
    AllowHandleDereference allow_handle_dereference;
    if (info->shared_info()->PassesFilter("add")) {
      tasm()->DebugBreak();
    }
  }

  // ...
}
```

そして実行してみましょう:

```simulator
$ d8 \
    # '&%' チートコードJS関数を有効化。
    --allow-natives-syntax \
    # 関数を逆アセンブル。
    --print-opt-code --print-opt-code-filter="add" --code-comments \
    # 可読性のためspectre緩和策を無効化。
    --no-untrusted-code-mitigations \
    test.js
--- 生ソース ---
(a, b) {
  return a + b;
}


--- 最適化コード ---
optimization_id = 0
source_position = 12
kind = OPTIMIZED_FUNCTION
name = add
stack_slots = 6
compiler = turbofan
address = 0x7f0900082ba1

命令 (サイズ = 504)
0x7f0900082be0     0  d45bd600       定数プール開始 (num_const = 6)
0x7f0900082be4     4  00000000       定数
0x7f0900082be8     8  00000001       定数
0x7f0900082bec     c  75626544       定数
0x7f0900082bf0    10  65724267       定数
0x7f0900082bf4    14  00006b61       定数
0x7f0900082bf8    18  d45bd7e0       定数
                  -- プロローグ:コード開始レジスタのチェック --
0x7f0900082bfc    1c  10ffff30       adr x16, #-0x1c (アドレス 0x7f0900082be0)
0x7f0900082c00    20  eb02021f       cmp x16, x2
0x7f0900082c04    24  54000080       b.eq #+0x10 (アドレス 0x7f0900082c14)
                  アボートメッセージ:
                  スタートレジスタの値が間違っています
0x7f0900082c08    28  d2800d01       movz x1, #0x68
                  -- アボートへのインライン移行 --
0x7f0900082c0c    2c  58000d70       ldr x16, pc+428 (アドレス 0x00007f0900082db8)    ;; オフヒープターゲット
0x7f0900082c10    30  d63f0200       blr x16
                  -- プロローグ: 非最適化の確認 --
                  [ Tagged ポインタの解凍
0x7f0900082c14    34  b85d0050       ldur w16, [x2, #-48]
0x7f0900082c18    38  8b100350       add x16, x26, x16
                  ]
0x7f0900082c1c    3c  b8407210       ldur w16, [x16, #7]
0x7f0900082c20    40  36000070       tbz w16, #0, #+0xc (addr 0x7f0900082c2c)
                  -- 非最適化コードを怠惰にコンパイルするためのインライントランポリン --
0x7f0900082c24    44  58000c31       ldr x17, pc+388 (addr 0x00007f0900082da8)    ;; オフヒープターゲット
0x7f0900082c28    48  d61f0220       br x17
                  -- B0スタート (フレーム構築) --
(...)

--- コード終了 ---
# デバッガーヒット 0: DebugBreak
0x00007f0900082bfc 10ffff30            adr x16, #-0x1c (addr 0x7f0900082be0)
sim>
```

非最適化関数の開始点で停止し、シミュレーターがプロンプトを表示しました！

これはあくまで例であり、V8は急速に変化するため詳細が異なる場合があります。しかし、アセンブラーが利用可能な場所であれば、これを実行することができます。

## デバッグコマンド

### 一般的なコマンド

デバッガープロンプトで`help`と入力すると、利用可能なコマンドの詳細が表示されます。これには`stepi`、`cont`、`disasm`などのgdbライクな通常コマンドが含まれます。シミュレーターがgdbの下で実行されている場合、`gdb`デバッガーコマンドを使用してgdbを操作できます。その後、gdbから再びデバッガーに戻るには`cont`を使用します。

### アーキテクチャ固有のコマンド

各ターゲットアーキテクチャは独自のシミュレーターとデバッガーを実装しているため、体験と詳細が異なります。

- [printobject](#po)
- [trace](#trace)
- [break](#break)

#### `printobject $register` (エイリアス `po`)

JSオブジェクトがレジスタに保持されている内容を記述します。

例えば、今回私たちが[例](#test.js)を32ビットArmシミュレーター構築で実行しているとします。レジスタに渡された引数を調べることができます。

```simulator
$ ./out/arm.debug/d8 --allow-natives-syntax test.js
シミュレーターが停止、次の命令でブレーク:
  0x26842e24  e24fc00c       sub ip, pc, #12
sim> print r1
r1: 0x4b60ffb1 1264648113
# 現在の関数オブジェクトはr1で渡されました。
sim> printobject r1
r1:
0x4b60ffb1: [Function] in OldSpace
 - map: 0x485801f9 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x4b6010f1 <JSFunction (sfi = 0x42404e99)>
 - elements: 0x5b700661 <FixedArray[0]> [HOLEY_ELEMENTS]
 - function prototype:
 - initial_map:
 - shared_info: 0x4b60fe9d <SharedFunctionInfo add>
 - name: 0x5b701c5d <String[#3]: add>
 - formal_parameter_count: 2
 - kind: NormalFunction
 - context: 0x4b600c65 <NativeContext[261]>
 - code: 0x26842de1 <Code OPTIMIZED_FUNCTION>
 - source code: (a, b) {
  return a + b;
}
(...)

# 今度はr7で渡された現在のJSコンテキストを印刷します。
sim> printobject r7
r7:
0x449c0c65: [NativeContext] in OldSpace
 - map: 0x561000b9 <Map>
 - length: 261
 - scope_info: 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
 - previous: 0
 - native_context: 0x449c0c65 <NativeContext[261]>
           0: 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
           1: 0
           2: 0x449cdaf5 <JSObject>
           3: 0x58480c25 <JSGlobal Object>
           4: 0x58485499 <Other heap object (EMBEDDER_DATA_ARRAY_TYPE)>
           5: 0x561018a1 <Map(HOLEY_ELEMENTS)>
           6: 0x3408027d <undefined>
           7: 0x449c75c1 <JSFunction ArrayBuffer (sfi = 0x4be8ade1)>
           8: 0x561010f9 <Map(HOLEY_ELEMENTS)>
           9: 0x449c967d <JSFunction arrayBufferConstructor_DoNotInitialize (sfi = 0x4be8c3ed)>
          10: 0x449c8dbd <JSFunction Array (sfi = 0x4be8be59)>
(...)
```

#### `trace` (エイリアス `t`)

実行された命令のトレースを有効化または無効化します。

有効化すると、シミュレーターは実行している際に逆アセンブルされた命令を印刷します。64ビットArmビルドを実行している場合、シミュレーターはレジスター値の変更もトレース可能です。

また、コマンドラインで`--trace-sim`フラグを使用して、開始時からトレースを有効にすることもできます。

同じ[例](#test.js)を使用して:

```simulator
$ out/arm64.debug/d8 --allow-natives-syntax \
    # --debug-simは64ビットArmでトレース時に逆アセンブルを有効化するため必要です
    --debug-sim test.js
# デバッガーヒット 0: DebugBreak
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (addr 0x7f1e00082be0)
sim> trace
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (addr 0x7f1e00082be0)
逆アセンブル、レジスター及びメモリ書き込みトレース有効化

# lrレジスターに格納された戻りアドレスでブレークします。
sim> break lr
0x7f1f880abd28にブレークポイントを設定
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (addr 0x7f1e00082be0)

# 関数の実行をトレースしながら継続し、戻るまで何が起こっているのか理解します。
sim> continue
#    x0: 0x00007f1e00082ba1
#    x1: 0x00007f1e08250125
#    x2: 0x00007f1e00082be0
(...)

# まずスタックから引数'a'と'b'を読み込み、それがタグ付けされた数値か確認します。
# これが示されるのは最下位ビットが0の場合です。
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

# 次にタグを外し、'a'と'b'を足し合わせる。
0x00007f1e00082ca8  13017c44            asr w4, w2, #1
#    x4: 0x0000000000000005
0x00007f1e00082cac  2b830484            adds w4, w4, w3, asr #1
# NZCV: N:0 Z:0 C:0 V:0
#    x4: 0x000000000000000c
# つまり5 + 7 = 12、問題なし！

# 次にオーバーフローをチェックし、再度結果にタグを付ける。
0x00007f1e00082cb0  54000a46            b.vs #+0x148 (addr 0x7f1e00082df8)
0x00007f1e00082cb4  2b040082            adds w2, w4, w4
# NZCV: N:0 Z:0 C:0 V:0
#    x2: 0x0000000000000018
0x00007f1e00082cb8  54000466            b.vs #+0x8c (addr 0x7f1e00082d44)


# 最後に結果をx0に配置。
0x00007f1e00082cbc  aa0203e0            mov x0, x2
#    x0: 0x0000000000000018
(...)

0x00007f1e00082cec  d65f03c0            ret
0x7f1f880abd28でブレークポイント命中し無効化されました。
0x00007f1f880abd28  f85e83b4            ldur x20, [fp, #-24]
sim>
```

#### `break $address`

指定されたアドレスにブレークポイントを挿入します。

32ビットArmでは、1つのブレークポイントしか設定できず、コードページの書き込み保護を無効にする必要がありますが、64ビットArmシミュレーターにはこうした制限はありません。

再び[例](#test.js)を使用:

```simulator
$ out/arm.debug/d8 --allow-natives-syntax \
    # どのアドレスで停止するかを知るのに便利です。
    --print-opt-code --print-opt-code-filter="add" \
    test.js
(...)

シミュレーターが停止に命中し、次の命令でブレークしました:
  0x488c2e20  e24fc00c       sub ip, pc, #12

# 興味深い既知のアドレスにブレーク。それにより、
# 'a'と'b'の読み込みを開始します。
sim> break 0x488c2e9c
sim> continue
  0x488c2e9c  e59b200c       ldr r2, [fp, #+12]

# 'disasm'を使用して先読みすることができます。
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

# 最初の`adds`命令の結果に基づいてブレークを試します。
sim> break 0x488c2ebc
ブレークポイントの設定が失敗しました

# ああ、まずブレークポイントを削除する必要があります。
sim> del
sim> break 0x488c2ebc
sim> cont
  0x488c2ebc  6a000037       bvs +228 -> 0x488c2fa0

sim> print r4
r4: 0x0000000c 12
# つまり5 + 7 = 12、問題なし！
```

### いくつかの追加機能を持つ生成されたブレークポイント命令

`TurboAssembler::DebugBreak()`の代わりに、同じ効果を持つが追加の機能を持つ低レベルの命令を使用できます。

- [32ビット: `stop()`](#arm32_stop)
- [64ビット: `Debug()`](#arm64_debug)

#### `stop()` (32ビット Arm)

```cpp
Assembler::stop(Condition cond = al, int32_t code = kDefaultStopCode);
```

最初の引数は条件、2番目は停止コードです。コードが指定され、かつ256未満の場合、その停止は「ウォッチ付き」と見なされ、無効化/有効化できます。また、シミュレーターがこのコードに命中した回数を追跡するカウンターがあります。

以下のようなV8 C++コードを操作していると仮定します:

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

以下はデバッグセッションの一例です:

最初のstopに命中しました。

```simulator
シミュレーターがstop 123に命中し、次の命令でブレークしました:
  0xb53559e8  e1a00000       mov r0, r0
```

次のstopは`disasm`を使用して確認できます。

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

一度でも命中した全ての（ウォッチ付き）stopの情報を表示できます。

```simulator
sim> stop info all
停止情報:
stop 123 - 0x7b:      有効,      カウンター = 1
sim> cont
シミュレーターがstop 1に命中し、次の命令でブレークしました:
  0xb5355a04  e1a00000       mov r1, r1
sim> stop info all
停止情報:
stop 1 - 0x1:         有効,      カウンター = 1
stop 123 - 0x7b:      有効,      カウンター = 1
```

停止は無効化または有効化できます。（ウォッチ付きstopのみ可能です。）

```simulator
sim> stop disable 1
sim> cont
シミュレータが停止ポイント123に到達しました。次の命令で停止します：
  0xb5356808  e1a00000       mov r0, r0
sim> 続行
シミュレータが停止ポイント123に到達しました。次の命令で停止します：
  0xb5356c28  e1a00000       mov r0, r0
sim> 停止情報すべてを表示
停止情報：
停止 1 - 0x1:         無効, カウンター = 2
停止 123 - 0x7b:      有効, カウンター = 3
sim> 停止有効化 1
sim> 続行
シミュレータが停止ポイント1に到達しました。次の命令で停止します：
  0xb5356c44  e1a00000       mov r1, r1
sim> 停止すべて無効化
sim> 続行
```

#### `Debug()` (64-bit Arm)

```cpp
MacroAssembler::Debug(const char* message, uint32_t code, Instr params = BREAK);
```

この命令はデフォルトではブレークポイントですが、トレースの有効化や無効化も可能であり、それがデバッガの[`trace`](#trace)コマンドで行ったかのように機能します。また、識別用のメッセージやコードを提供することもできます。

以下はJS関数を呼び出すためのフレームを準備するネイティブビルトインから取られたV8 C++コードを例にしています。

```cpp
int64_t bad_frame_pointer = -1L;  // 無効なフレームポインタ、使用されるとエラーになるはず。
__ Mov(x13, bad_frame_pointer);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);
```

`DebugBreak()`を使用して現在の状態を確認するためにブレークポイントを挿入することが役立つかもしれません。しかし、`Debug()`を使用するとさらに進んでこのコードをトレースすることができます。

```cpp
// トレースを開始し、逆アセンブルとレジスター値をログとして記録。
__ Debug("トレーシング開始", 42, TRACE_ENABLE | LOG_ALL);

int64_t bad_frame_pointer = -1L;  // 無効なフレームポインタ、使用されるとエラーになるはず。
__ Mov(x13, bad_frame_pointer);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);

// トレースを停止。
__ Debug("トレーシング停止", 42, TRACE_DISABLE);
```

これにより、作業中のコードスニペットだけのレジスター値をトレースすることができます：

```シミュレータ
$ d8 --allow-natives-syntax --debug-sim test.js
# NZCV: N:0 Z:0 C:0 V:0
# FPCR: AHP:0 DN:0 FZ:0 RMode:0b00 (最寄り値への丸め)
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
