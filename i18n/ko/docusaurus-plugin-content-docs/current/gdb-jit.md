---
title: 'GDB JIT 컴파일 인터페이스 통합'
description: 'GDB JIT 컴파일 인터페이스 통합을 통해 V8은 GDB에 V8 런타임에서 생성된 네이티브 코드의 심볼 및 디버깅 정보를 제공합니다.'
---
GDB JIT 컴파일 인터페이스 통합을 통해 V8은 GDB에 V8 런타임에서 생성된 네이티브 코드의 심볼 및 디버깅 정보를 제공합니다.

GDB JIT 컴파일 인터페이스가 비활성화된 경우, GDB의 일반적인 백트레이스에는 `??`로 표시된 프레임이 포함됩니다. 이러한 프레임은 동적으로 생성된 코드에 해당합니다:

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

그러나 GDB JIT 컴파일 인터페이스를 활성화하면 GDB가 보다 유익한 스택 트레이스를 생성할 수 있습니다:

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

여전히 GDB에서 알 수 없는 프레임은 소스 정보가 없는 네이티브 코드에 해당합니다. 자세한 내용은 [알려진 제한 사항](#known-limitations)을 참조하세요.

GDB JIT 컴파일 인터페이스는 GDB 문서에 지정되어 있습니다: https://sourceware.org/gdb/current/onlinedocs/gdb/JIT-Interface.html

## 사전 요구 사항

- V8 v3.0.9 이상
- GDB 7.0 이상
- 리눅스 운영 체제
- Intel 호환 아키텍처(ia32 혹은 x64)를 가진 CPU

## GDB JIT 컴파일 인터페이스 활성화

GDB JIT 컴파일 인터페이스는 기본적으로 컴파일에서 제외되며 런타임에서 비활성화되어 있습니다. 이를 활성화하려면:

1. `ENABLE_GDB_JIT_INTERFACE`가 정의된 상태로 V8 라이브러리를 빌드합니다. scons를 사용하여 V8을 빌드하는 경우 `gdbjit=on` 옵션을 사용하세요.
1. V8을 시작할 때 `--gdbjit` 플래그를 전달합니다.

GDB JIT 통합이 제대로 활성화되었는지 확인하려면 `__jit_debug_register_code`에 브레이크포인트를 설정해 보세요. 이 함수는 GDB에 새 코드 객체를 알리기 위해 호출됩니다.

## 알려진 제한 사항

- 현재(예: GDB 7.2 기준) GDB 측의 JIT 인터페이스는 코드 객체 등록을 매우 효율적으로 처리하지 않습니다. 각 등록은 더 많은 시간이 걸립니다: 500개의 등록된 객체가 있을 경우 각 다음 등록은 50ms 이상, 1000개의 등록된 코드 객체가 있을 경우 300ms 이상 소요됩니다. 이 문제는 [GDB 개발자에게 보고되었습니다](https://sourceware.org/ml/gdb/2011-01/msg00002.html)지만, 현재 사용 가능한 해결책은 없습니다. GDB에 대한 부하를 줄이기 위해 현재 GDB JIT 통합 구현은 두 가지 모드로 동작합니다: _기본_ 및 _전체_ (`--gdbjit-full` 플래그로 활성화). _기본_ 모드에서는 V8이 소스 정보가 첨부된 코드 객체만 GDB에 알립니다(일반적으로 모든 사용자 스크립트 포함). _전체_ 모드에서는 생성된 모든 코드 객체(스텁, IC, 트램펄린 포함)를 GDB에 알립니다.

- x64에서 GDB는 `.eh_frame` 섹션 없이 스택을 올바르게 풀지 못합니다 ([Issue 1053](https://bugs.chromium.org/p/v8/issues/detail?id=1053))

- GDB는 스냅샷에서 역직렬화된 코드에 대해 알림을 받지 않습니다 ([Issue 1054](https://bugs.chromium.org/p/v8/issues/detail?id=1054))

- Intel 호환 CPU에서의 리눅스 운영 체제만 지원됩니다. 다른 운영 체제의 경우 다른 ELF 헤더를 생성하거나 완전히 다른 객체 형식을 사용해야 합니다.

- GDB JIT 인터페이스를 활성화하면 압축 GC가 비활성화됩니다. 이는 이동된 코드 객체를 등록 취소하고 다시 등록하는 작업이 상당한 오버헤드를 발생시킬 수 있으므로 GDB에 대한 부하를 줄이기 위해 수행됩니다.

- GDB JIT 통합은 _대략적인_ 소스 정보만 제공합니다. 로컬 변수, 함수의 매개변수, 스택 레이아웃 등에 대한 정보는 제공하지 않습니다. JavaScript 코드를 단계별로 실행하거나 주어진 줄에서 브레이크포인트를 설정하는 기능은 활성화되지 않습니다. 하지만 함수 이름으로 브레이크포인트를 설정할 수는 있습니다.
