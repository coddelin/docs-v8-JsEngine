---
title: 'GDB로 내장 함수 디버깅'
description: 'V8 v6.9 버전부터 CSA / ASM / Torque 내장 함수에서 GDB를 사용하여 디버그를 위한 브레이크포인트를 설정할 수 있습니다.'
---
V8 v6.9 버전부터 CSA / ASM / Torque 내장 함수를 디버깅하기 위해 GDB (및 다른 디버거일 가능성 있음)에서 브레이크포인트를 설정할 수 있습니다.

```
(gdb) tb i::Isolate::Init
임시 브레이크포인트 1: i::Isolate::Init에서 0x7ffff706742b에 생성됨. (2 곳 위치)
(gdb) r
스레드 1 "d8" 임시 브레이크포인트 1에 도달, 0x00007ffff7c55bc0에서 Isolate::Init
(gdb) br Builtins_RegExpPrototypeExec
브레이크포인트 2: 0x7ffff7ac8784에서 생성됨
(gdb) c
스레드 1 "d8" 브레이크포인트 2에 도달, 0x00007ffff7ac8784에서 Builtins_RegExpPrototypeExec ()
```

프로세스 시작 시에만 필요하기 때문에 일반 브레이크포인트 (`br`) 대신 임시 브레이크포인트 (GDB에서 바로가기 `tb`)를 사용하는 것이 더 적합합니다.

내장 함수는 스택 추적에서도 볼 수 있습니다:

```
(gdb) bt
#0  0x00007ffff7ac8784에서 Builtins_RegExpPrototypeExec ()
#1  0x00007ffff78f5066에서 Builtins_ArgumentsAdaptorTrampoline ()
#2  0x000039751d2825b1에서 ?? ()
#3  0x000037ef23a0fa59에서 ?? ()
#4  0x0000000000000000에서 ?? ()
```

주의 사항:

- 내장 된 함수에서만 작동합니다.
- 브레이크포인트는 내장 함수의 시작 부분에만 설정 가능합니다.
- 내장 함수 브레이크포인트를 설정하기 전에 `Isolate::Init`에서 첫 브레이크포인트가 필요합니다. 이는 GDB가 바이너리를 수정하며 V8은 시작 시 바이너리의 내장 함수 섹션에 대해 해시를 확인하기 때문입니다. 그렇지 않으면 V8에서 해시 불일치에 대한 불만을 표시합니다:

    ```
    # Fatal error in ../../src/isolate.cc, line 117
    # Check failed: d.Hash() == d.CreateHash() (11095509419988753467 vs. 3539781814546519144).
    ```
