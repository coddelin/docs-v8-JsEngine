---
title: '시뮬레이터를 사용한 Arm 디버깅'
description: 'Arm 시뮬레이터와 디버거는 V8 코드 생성을 작업할 때 매우 유용할 수 있습니다.'
---
시뮬레이터와 디버거는 V8 코드 생성을 작업할 때 매우 유용할 수 있습니다.

- 실제 하드웨어에 접근하지 않고 코드 생성을 테스트할 수 있으므로 편리합니다.
- [교차 컴파일](/docs/cross-compile-arm)이나 네이티브 컴파일이 필요 없습니다.
- 시뮬레이터는 생성된 코드의 디버깅을 완벽히 지원합니다.

이 시뮬레이터는 V8 목적을 위해 설계되었다는 점을 유념하세요. V8에서 사용하는 기능만 구현되어 있으므로 구현되지 않은 기능이나 명령어를 만날 수 있습니다. 이 경우 자유롭게 이를 구현하여 코드를 제출하세요!

- [컴파일](#compiling)
- [디버거 시작](#start_debug)
- [디버깅 명령어](#debug_commands)
    - [printobject](#po)
    - [trace](#trace)
    - [break](#break)
- [추가 브레이크포인트 기능](#extra)
    - [32비트: `stop()`](#arm32_stop)
    - [64비트: `Debug()`](#arm64_debug)

## 시뮬레이터를 사용한 Arm 컴파일

기본적으로 x86 호스트에서 gm을 사용하여 Arm을 컴파일하면 시뮬레이터 빌드가 제공됩니다:

```bash
gm arm64.debug # 64비트 빌드 또는...
gm arm.debug   # ... 32비트 빌드.
```

V8 테스트 스위트를 실행하려는 경우 속도가 느릴 수 있으므로 `optdebug` 구성으로 빌드하는 것도 가능합니다.

## 디버거 시작

명령줄에서 `n`개의 명령어 이후 바로 디버거를 시작할 수 있습니다:

```bash
out/arm64.debug/d8 --stop_sim_at <n> # 또는 32비트 빌드의 경우 out/arm.debug/d8.
```

또는 생성된 코드에서 브레이크포인트 명령어를 생성할 수 있습니다:

네이티브 브레이크포인트 명령어는 프로그램을 `SIGTRAP` 신호로 중단시켜 gdb를 사용하여 문제를 디버깅할 수 있도록 합니다. 하지만 시뮬레이터에서 실행 중인 경우, 생성된 코드의 브레이크포인트 명령어는 시뮬레이터 디버거로 이동합니다.

`DebugBreak()`를 [Torque](/docs/torque-builtins), [CodeStubAssembler](/docs/csa-builtins)에서, [TurboFan](/docs/turbofan) 패스에서 노드로, 또는 직접 어셈블러를 사용하여 브레이크포인트를 생성하는 다양한 방법이 있습니다.

여기서는 저수준 네이티브 코드를 디버깅하는 데 집중하므로 어셈블러 방법을 살펴보겠습니다:

```cpp
TurboAssembler::DebugBreak();
```

`add`라는 이름의 TurboFan으로 컴파일된 JIT 함수가 있고 시작점에서 브레이크를 걸고 싶다고 가정해 봅시다. `test.js` 예제:



```js
// 최적화된 함수.
function add(a, b) {
  return a + b;
}

// --allow-natives-syntax로 활성화된 전형적인 치트 코드.
%PrepareFunctionForOptimization(add);

// 최적화 컴파일러에 타입 피드백을 제공하여 `a`와 `b`가 숫자라고 추정하도록 합니다.
add(1, 3);

// 최적화를 강제합니다.
%OptimizeFunctionOnNextCall(add);
add(5, 7);
```

TurboFan의 [코드 생성기](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/code-generator.cc?q=CodeGenerator::AssembleCode)에 연결하여 어셈블러에 액세스해 브레이크포인트를 삽입할 수 있습니다:

```cpp
void CodeGenerator::AssembleCode() {
  // ...

  // 최적화 중인지 확인한 다음 현재 함수 이름을 조회하여 브레이크포인트를 삽입합니다.
  if (info->IsOptimizing()) {
    AllowHandleDereference allow_handle_dereference;
    if (info->shared_info()->PassesFilter("add")) {
      tasm()->DebugBreak();
    }
  }

  // ...
}
```

그리고 이를 실행합니다:

```simulator
$ d8 \
    # `%` 치트 코드 JS 함수 활성화.
    --allow-natives-syntax \
    # 함수 디스어셈블.
    --print-opt-code --print-opt-code-filter="add" --code-comments \
    # 가독성을 위해 스펙터 완화 비활성화.
    --no-untrusted-code-mitigations \
    test.js
--- 원본 코드 ---
(a, b) {
  return a + b;
}


--- 최적화된 코드 ---
optimization_id = 0
source_position = 12
kind = OPTIMIZED_FUNCTION
name = add
stack_slots = 6
compiler = turbofan
address = 0x7f0900082ba1

명령어 (size = 504)
0x7f0900082be0     0  d45bd600       상수 풀 시작 (num_const = 6)
0x7f0900082be4     4  00000000       상수
0x7f0900082be8     8  00000001       상수
0x7f0900082bec     c  75626544       상수
0x7f0900082bf0    10  65724267       상수
0x7f0900082bf4    14  00006b61       상수
0x7f0900082bf8    18  d45bd7e0       상수
                  -- 프롤로그: 코드 시작 레지스터 확인 --
0x7f0900082bfc    1c  10ffff30       adr x16, #-0x1c (주소 0x7f0900082be0)
0x7f0900082c00    20  eb02021f       cmp x16, x2
0x7f0900082c04    24  54000080       b.eq #+0x10 (주소 0x7f0900082c14)
                  중단 메시지:
                  코드 시작 레지스터에 전달된 올바르지 않은 값
0x7f0900082c08    28  d2800d01       movz x1, #0x68
                  -- 중단으로의 인라인된 트램펄린 --
0x7f0900082c0c    2c  58000d70       ldr x16, pc+428 (주소 0x00007f0900082db8)    ;; 오프 힙 대상
0x7f0900082c10    30  d63f0200       blr x16
                  -- 서막: 최적화 해제 확인 --
                  [ TaggedPointer 디컴프레스
0x7f0900082c14    34  b85d0050       ldur w16, [x2, #-48]
0x7f0900082c18    38  8b100350       add x16, x26, x16
                  ]
0x7f0900082c1c    3c  b8407210       ldur w16, [x16, #7]
0x7f0900082c20    40  36000070       tbz w16, #0, #+0xc (addr 0x7f0900082c2c)
                  -- 최적화 해제된 코드 컴파일을 위한 인라인 트램펄린 --
0x7f0900082c24    44  58000c31       ldr x17, pc+388 (addr 0x00007f0900082da8)    ;; 오프 힙 대상
0x7f0900082c28    48  d61f0220       br x17
                  -- B0 시작(프레임 구성) --
(...)

--- 코드 끝 ---
# 디버거 중단점 0: DebugBreak
0x00007f0900082bfc 10ffff30            adr x16, #-0x1c (addr 0x7f0900082be0)
sim>
```

최적화된 함수 시작점에서 멈춘 것을 확인할 수 있고, 시뮬레이터가 프롬프트를 제공했습니다!

참고로, 이는 단지 예제일 뿐이며 V8은 빠르게 변화하므로 세부 사항이 달라질 수 있습니다. 그러나 어셈블러를 사용할 수 있는 곳에서는 이를 수행할 수 있어야 합니다.

## 디버깅 명령

### 일반 명령

디버거 프롬프트에서 `help`를 입력하면 사용 가능한 명령에 대한 세부 사항을 확인할 수 있습니다. 여기에는 `stepi`, `cont`, `disasm` 등과 같은 일반적인 gdb 유사 명령이 포함됩니다. 시뮬레이터가 gdb 하에서 실행되는 경우, `gdb` 디버거 명령은 gdb의 제어를 제공합니다. 그런 다음 `cont`를 사용하여 디버거로 돌아갈 수 있습니다.

### 아키텍처별 명령

각 타겟 아키텍처는 고유한 시뮬레이터 및 디버거를 구현하므로 경험과 세부 사항은 다를 수 있습니다.

- [printobject](#po)
- [trace](#trace)
- [break](#break)

#### `printobject $register` (alias `po`)

레지스터에 있는 JS 객체를 설명합니다.

예를 들어, 이번에는 [예제](#test.js)를 32비트 Arm 시뮬레이터 빌드에서 실행한다고 가정합니다. 레지스터에 전달된 입력 인수를 확인할 수 있습니다:

```simulator
$ ./out/arm.debug/d8 --allow-natives-syntax test.js
시뮬레이터가 정지에 도달하여 다음 명령에서 중단되었습니다:
  0x26842e24  e24fc00c       sub ip, pc, #12
sim> print r1
r1: 0x4b60ffb1 1264648113
# 현재 함수 객체는 r1에 전달됩니다.
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

# 이제 r7에 전달된 현재 JS 컨텍스트를 출력합니다.
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

#### `trace` (alias `t`)

실행된 명령의 추적을 활성화하거나 비활성화합니다.

활성화되면 시뮬레이터는 실행 중인 명령어를 디스어셈블된 상태로 출력합니다. 64비트 Arm 빌드에서 실행 중이라면, 시뮬레이터는 레지스터 값 변경 사항도 추적할 수 있습니다.

명령 줄에서 `--trace-sim` 플래그를 사용하여 시작부터 추적을 활성화할 수도 있습니다.

같은 [예제](#test.js):

```simulator
$ out/arm64.debug/d8 --allow-natives-syntax \
    # --debug-sim은 64비트 Arm에서 디스어셈블리 활성화를 위해 필요합니다.
    # 추적 시.
    --debug-sim test.js
# 디버거 중단점 0: DebugBreak
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (addr 0x7f1e00082be0)
sim> trace
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (addr 0x7f1e00082be0)
디스어셈블리, 레지스터 및 메모리 쓰기 추적 활성화

# lr 레지스터에 저장된 리턴 주소에서 중단점을 설정합니다.
sim> break lr
0x7f1f880abd28에서 중단점 설정
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (addr 0x7f1e00082be0)

# 계속 진행하면 함수 실행이 추적되며, 이를 통해
# 무슨 일이 일어나고 있는지 이해할 수 있게 됩니다.
sim> continue
#    x0: 0x00007f1e00082ba1
#    x1: 0x00007f1e08250125
#    x2: 0x00007f1e00082be0
(...)

# 스택에서 'a'와 'b' 인수를 로드한 후, 그것들이 태그된 숫자인지 확인합니다.
# 이는 가장 낮은 비트가 0인 경우를 나타냅니다.
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

# 그런 다음 'a'와 'b'를 태그 해제하고 함께 더합니다.
0x00007f1e00082ca8  13017c44            asr w4, w2, #1
#    x4: 0x0000000000000005
0x00007f1e00082cac  2b830484            adds w4, w4, w3, asr #1
# NZCV: N:0 Z:0 C:0 V:0
#    x4: 0x000000000000000c
# 이는 5 + 7 == 12로, 모두 잘되었습니다!

# 그런 다음 오버플로를 확인하고 결과를 다시 태그합니다.
0x00007f1e00082cb0  54000a46            b.vs #+0x148 (addr 0x7f1e00082df8)
0x00007f1e00082cb4  2b040082            adds w2, w4, w4
# NZCV: N:0 Z:0 C:0 V:0
#    x2: 0x0000000000000018
0x00007f1e00082cb8  54000466            b.vs #+0x8c (addr 0x7f1e00082d44)


# 마지막으로 결과를 x0에 배치합니다.
0x00007f1e00082cbc  aa0203e0            mov x0, x2
#    x0: 0x0000000000000018
(...)

0x00007f1e00082cec  d65f03c0            ret
중단점을 0x7f1f880abd28에서 발견하고 비활성화했습니다.
0x00007f1f880abd28  f85e83b4            ldur x20, [fp, #-24]
sim>
```

#### `break $address`

지정된 주소에 중단점을 삽입합니다.

32비트 ARM에서는 하나의 중단점만 가질 수 있으며, 이를 삽입하려면 코드 페이지의 쓰기 보호를 비활성화해야 합니다. 64비트 ARM 시뮬레이터에는 이러한 제한이 없습니다.

우리의 [예제](#test.js)를 다시 살펴봅니다:

```simulator
$ out/arm.debug/d8 --allow-natives-syntax \
    # 어느 주소에서 멈출지 파악하는 데 유용합니다.
    --print-opt-code --print-opt-code-filter="add" \
    test.js
(...)

시뮬레이터가 중단에 도달하여 다음 명령어에서 멈춤:
  0x488c2e20  e24fc00c       sub ip, pc, #12

# 중단점을 로드하는 흥미로운 주소에서 설정
# 'a' 및 'b'를 로드합니다.
sim> break 0x488c2e9c
sim> continue
  0x488c2e9c  e59b200c       ldr r2, [fp, #+12]

# 'disasm'으로 미리 확인할 수도 있습니다.
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

# 첫 번째 `adds` 명령어 결과에서 중단점 설정 시도.
sim> break 0x488c2ebc
중단점 설정 실패

# 아, 중단점을 먼저 삭제해야 했습니다.
sim> del
sim> break 0x488c2ebc
sim> cont
  0x488c2ebc  6a000037       bvs +228 -> 0x488c2fa0

sim> print r4
r4: 0x0000000c 12
# 이는 5 + 7 == 12로, 모두 잘되었습니다!
```

### 추가 기능이 포함된 생성된 중단점 명령어

`TurboAssembler::DebugBreak()` 대신 동일한 효과를 지니지만 추가 기능이 있는 저수준 명령어를 사용할 수 있습니다.

- [32비트: `stop()`](#arm32_stop)
- [64비트: `Debug()`](#arm64_debug)

#### `stop()` (32비트 ARM)

```cpp
Assembler::stop(Condition cond = al, int32_t code = kDefaultStopCode);
```

첫 번째 인수는 조건이며, 두 번째는 중단 코드입니다. 코드가 지정되고 256 미만일 경우, 중단은 "관찰됨"으로 간주되며 비활성화/활성화할 수 있습니다. 또한 시뮬레이터가 이 코드를 몇 번 히트했는지 추적하는 카운터도 있습니다.

다음과 같은 V8 C++ 코드를 작업한다고 상상해 보세요:

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

다음은 샘플 디버깅 세션 예제입니다:

첫 번째 중단점 감지.

```simulator
시뮬레이터가 123번 중단점에 도달하여 다음 명령어에서 중단:
  0xb53559e8  e1a00000       mov r0, r0
```

다음 중단점을 `disasm`으로 볼 수 있습니다.

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

적어도 한 번 감지된 모든(관찰된) 중단점에 대한 정보를 표시할 수 있습니다.

```simulator
sim> stop info all
중단점 정보:
stop 123 - 0x7b:      활성화됨,      카운터 = 1
sim> cont
시뮬레이터가 1번 중단점에 도달하여 다음 명령어에서 중단:
  0xb5355a04  e1a00000       mov r1, r1
sim> stop info all
중단점 정보:
stop 1 - 0x1:         활성화됨,      카운터 = 1
stop 123 - 0x7b:      활성화됨,      카운터 = 1
```

중단점을 비활성화하거나 활성화할 수 있습니다. (관찰된 중단점에만 해당됩니다.)

```simulator
sim> stop disable 1
sim> cont
시뮬레이터가 정지점 123에 멈췄으며, 다음 명령어에서 중단됩니다:
  0xb5356808  e1a00000       mov r0, r0
sim> cont
시뮬레이터가 정지점 123에 멈췄으며, 다음 명령어에서 중단됩니다:
  0xb5356c28  e1a00000       mov r0, r0
sim> stop info all
정지점 정보:
정지점 1 - 0x1:         비활성화됨,     카운터 = 2
정지점 123 - 0x7b:      활성화됨,      카운터 = 3
sim> stop enable 1
sim> cont
시뮬레이터가 정지점 1에 멈췄으며, 다음 명령어에서 중단됩니다:
  0xb5356c44  e1a00000       mov r1, r1
sim> stop disable all
sim> con
```

#### `Debug()` (64-비트 Arm)

```cpp
MacroAssembler::Debug(const char* message, uint32_t code, Instr params = BREAK);
```

이 명령어는 기본적으로 중단점이지만, 디버거에서 [`trace`](#trace) 명령을 통해 추적을 활성화하거나 비활성화할 수도 있습니다. 또한 메시지와 코드를 식별자로 지정할 수도 있습니다.

다음은 JS 함수를 호출하는 프레임을 준비하는 네이티브 빌트인에서 가져온 V8 C++ 코드 작업 예시입니다.

```cpp
int64_t bad_frame_pointer = -1L;  // 올바르지 않은 프레임 포인터, 사용 시 실패해야 함.
__ Mov(x13, bad_frame_pointer);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);
```

`DebugBreak()`으로 중단점을 삽입하여 현재 상태를 검사할 수 있습니다. 그러나, `Debug()`를 사용하면 다음 코드 추적과 같이 더 나아가 작업이 가능합니다:

```cpp
// 추적 시작 및 디스어셈블리와 레지스터 값 로깅 활성화.
__ Debug("start tracing", 42, TRACE_ENABLE | LOG_ALL);

int64_t bad_frame_pointer = -1L;  // 올바르지 않은 프레임 포인터, 사용 시 실패해야 함.
__ Mov(x13, bad_frame_pointer);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);

// 추적 중지.
__ Debug("stop tracing", 42, TRACE_DISABLE);
```

이 코드는 작업 중인 코드 조각의 레지스터 값만을 추적할 수 있게 합니다:

```simulator
$ d8 --allow-natives-syntax --debug-sim test.js
# NZCV: N:0 Z:0 C:0 V:0
# FPCR: AHP:0 DN:0 FZ:0 RMode:0b00 (Nearest로 반올림)
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
