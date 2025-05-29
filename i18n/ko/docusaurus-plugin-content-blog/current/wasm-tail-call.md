---
title: 'WebAssembly 꼬리 호출'
author: 'Thibaud Michaud, Thomas Lively'
date: 2023-04-06
tags:
  - WebAssembly
description: '이 문서는 WebAssembly 꼬리 호출 제안을 설명하고 일부 예제를 통해 이를 보여줍니다.'
tweet: '1644077795059044353'
---
우리는 WebAssembly 꼬리 호출을 V8 v11.2에 출시합니다! 이 게시물에서는 이 제안에 대한 간략한 개요를 제공하고, Emscripten을 사용한 C++ 코루틴의 흥미로운 사용 사례를 보여주며, V8이 꼬리 호출을 내부적으로 처리하는 방법을 보여줍니다.

## 꼬리 호출 최적화란?

호출이 현재 함수에서 반환하기 전에 실행되는 마지막 명령일 때 꼬리 위치에 있다고 말합니다. 컴파일러는 호출자 프레임을 버리고 호출을 점프로 대체하여 이러한 호출을 최적화할 수 있습니다.

이것은 특히 재귀 함수에 유용합니다. 예를 들어, 연결 리스트 요소의 합을 계산하는 다음과 같은 C 함수를 보세요:

```c
int sum(List* list, int acc) {
  if (list == nullptr) return acc;
  return sum(list->next, acc + list->val);
}
```

정상적인 호출로는 이 작업은 𝒪(n) 스택 공간을 소비합니다: 리스트의 각 요소는 호출 스택에 새로운 프레임을 추가합니다. 리스트가 충분히 길면 스택이 매우 빠르게 넘칠 수 있습니다. 호출을 점프로 대체함으로써 꼬리 호출 최적화는 이 재귀 함수를 루프로 변환하여 𝒪(1) 스택 공간을 사용하게 만듭니다:

<!--truncate-->
```c
int sum(List* list, int acc) {
  while (list != nullptr) {
    acc = acc + list->val;
    list = list->next;
  }
  return acc;
}
```

이 최적화는 특히 함수형 언어에서 중요합니다. 이러한 언어는 재귀 함수에 크게 의존하며, Haskell과 같은 순수 함수형 언어는 루프 제어 구조를 제공하지도 않습니다. 모든 종류의 사용자 지정 반복은 어떤 형태로든 재귀를 사용합니다. 꼬리 호출 최적화 없이라면 비-사소한 프로그램에서 스택 오버플로우에 매우 빨리 직면할 것입니다.

### WebAssembly 꼬리 호출 제안

Wasm MVP에서 함수를 호출하는 두 가지 방법이 있습니다: `call` 및 `call_indirect`. WebAssembly 꼬리 호출 제안은 이에 꼬리 호출 대응 방법을 추가합니다: `return_call` 및 `return_call_indirect`. 이는 도구 체인이 실제로 꼬리 호출 최적화를 수행하고 적절한 호출 종류를 생성하도록 책임을 지며, 이는 성능과 스택 공간 사용에 대해 더 많은 제어를 제공합니다.

재귀적인 Fibonacci 함수를 살펴보겠습니다. 여기에서 Wasm 바이트코드는 텍스트 형식으로 완전성을 위해 포함되어 있지만, 다음 섹션에서 C++로 찾을 수 있습니다:

```wasm/4
(func $fib_rec (param $n i32) (param $a i32) (param $b i32) (result i32)
  (if (i32.eqz (local.get $n))
    (then (return (local.get $a)))
    (else
      (return_call $fib_rec
        (i32.sub (local.get $n) (i32.const 1))
        (local.get $b)
        (i32.add (local.get $a) (local.get $b))
      )
    )
  )
)

(func $fib (param $n i32) (result i32)
  (call $fib_rec (local.get $n) (i32.const 0) (i32.const 1))
)
```

주어진 시간에는 오직 하나의 `fib_rec` 프레임만 존재하며, 다음 재귀 호출을 수행하기 전에 스스로 언와인드됩니다. 기본 사례에 도달하면 `fib_rec`은 결과 `a`를 직접 `fib`에 반환합니다.

꼬리 호출의 관찰 가능한 결과 중 하나는 (스택 오버플로우 위험 감소 외에도) DevTools 스택 추적에서 꼬리 호출자들이 나타나지 않는다는 것입니다. 발생한 예외의 스택 속성에서도, 실행이 멈춘 DevTools 스택 추적에서도 마찬가지입니다. 예외가 발생하거나 실행이 일시 중지되었을 때, 꼬리 호출자 프레임은 사라졌으며 V8이 이를 복구할 수 있는 방법은 없습니다.

## Emscripten과 함께 꼬리 호출 사용하기

함수형 언어는 종종 꼬리 호출에 의존하지만, C 또는 C++ 프로그래머로서도 이를 사용할 수 있습니다. Emscripten (및 Emscripten이 사용하는 Clang)은 컴파일러가 호출을 꼬리 호출로 컴파일해야 한다고 알려주는 musttail 속성을 지원합니다. 예를 들어, 여기에는 Fibonacci 함수의 재귀적 구현이 있습니다. 이 함수는 `n`번째 Fibonacci 수를 계산하여 2^32로 모듈로 하는데, 이는 큰 `n`의 경우 정수가 넘치기 때문입니다:

```c
#include <stdio.h>

unsigned fib_rec(unsigned n, unsigned a, unsigned b) {
  if (n == 0) {
    return a;
  }
  return fib_rec(n - 1, b, a + b);
}

`fib(unsigned n) {
  return fib_rec(n, 0, 1);
}

int main() {
  for (unsigned i = 0; i < 10; i++) {
    printf("fib(%d): %d\n", i, fib(i));
  }

  printf("fib(1000000): %d\n", fib(1000000));
}
```

이 프로그램을 `emcc test.c -o test.js`로 컴파일한 후 Node.js에서 실행하면 스택 오버플로 오류가 발생합니다. 이를 수정하려면 `fib_rec`의 반환에 `__attribute__((__musttail__))`을 추가하고 컴파일 인수에 `-mtail-call`을 추가합니다. 이제 생성된 Wasm 모듈은 새로운 꼬리 호출 지시를 포함하므로 Node.js에 `--experimental-wasm-return_call` 옵션을 전달해야 하지만 스택이 더 이상 넘치지 않습니다.

다음은 상호 재귀를 사용하는 예입니다:

```c
#include <stdio.h>
#include <stdbool.h>

bool is_odd(unsigned n);
bool is_even(unsigned n);

bool is_odd(unsigned n) {
  if (n == 0) {
    return false;
  }
  __attribute__((__musttail__))
  return is_even(n - 1);
}

bool is_even(unsigned n) {
  if (n == 0) {
    return true;
  }
  __attribute__((__musttail__))
  return is_odd(n - 1);
}

int main() {
  printf("is_even(1000000): %d\n", is_even(1000000));
}
```

이 예들은 간단하여 컴파일 시 `-O2` 최적화 옵션을 사용하면 꼬리 호출을 사용하지 않고 스택이 고갈되지 않도록 컴파일러가 답을 미리 계산할 수 있습니다. 하지만 복잡한 코드에서는 이와 같지 않을 수 있습니다. 실제 코드에서는 꼬리 호출(musttail) 속성을 사용하면 [Josh Haberman의 이 블로그 글](https://blog.reverberate.org/2021/04/21/musttail-efficient-interpreters.html)에 언급된 바와 같이 고성능 인터프리터 루프를 작성하는 데 도움이 됩니다.

꼬리 호출 속성과 더불어, C++은 또 다른 기능에서 꼬리 호출에 의존합니다: C++20 코루틴. C++20 코루틴과 꼬리 호출의 관계는 [Lewis Baker의 이 블로그 글](https://lewissbaker.github.io/2020/05/11/understanding_symmetric_transfer)에 매우 깊이 다뤄져 있지만 간단히 말하면, 겉으로 보기에 문제가 없어 보이더라도 스택 오버플로를 미묘하게 초래할 수 있는 패턴으로 코루틴을 사용할 가능성이 있습니다. 이를 해결하기 위해 C++ 커미티는 컴파일러가 스택 오버플로를 방지하기 위해 실제로는 꼬리 호출을 사용하는 “대칭 전송”을 요구하는 규정을 추가했습니다.

WebAssembly에서 꼬리 호출이 활성화되었을 때 Clang은 해당 블로그 글에서 설명된 대로 대칭 전송을 구현하지만 꼬리 호출이 활성화되지 않았을 때는 대칭 전송 없이 코드를 조용히 컴파일할 수 있습니다. 이는 스택 오버플로를 초래할 수 있으며 기술적으로 C++20의 올바른 구현이 아닙니다!

위 블로그 글에서 마지막 예제를 Emscripten을 사용해 컴파일하고 꼬리 호출이 활성화된 경우에만 스택 오버플로가 방지되는 것을 확인할 수 있습니다. 최근 고쳐진 버그로 인해 Emscripten 3.1.35 또는 이후 버전에서만 올바르게 동작합니다.

## V8에서의 꼬리 호출

앞서 살펴본 바와 같이, 엔진의 책임은 꼬리 위치의 호출을 감지하는 것이 아닙니다. 이는 도구 체인에서 처리해야 합니다. 따라서 TurboFan(V8의 최적화 컴파일러)은 호출 종류와 대상 함수 시그니처에 따라 적절한 명령어 시퀀스를 생성하는 작업만 하면 됩니다. 이전에서 본 Fibonacci 예제의 경우 스택은 다음과 같이 나타납니다:

![TurboFan에서 단순 꼬리 호출](/_img/wasm-tail-calls/tail-calls.svg)

왼쪽에서는 `fib_rec`](초록색) 내부에 있으며 `fib`(파란색)에 의해 호출되었고 곧 `fib_rec`에 재귀적으로 꼬리 호출하려고 합니다. 먼저 현재 프레임을 프레임 포인터와 스택 포인터를 초기화하여 해제합니다. 프레임 포인터는 “Caller FP” 슬롯에서 이전 값을 읽어 복원합니다. 스택 포인터는 부모 프레임의 맨 위로 이동하며, 이 경우에는 전부 레지스터로 전달되며 쌓이는 스택 매개변수와 반환 값의 공간은 필요하지 않습니다. 매개변수는 `fib_rec`의 링크에 따라 예상 레지스터로 이동됩니다(다이어그램에 표시되지 않음). 마지막으로 새 프레임을 생성하며 `fib_rec`을 실행합니다.

`fib_rec`은 `n == 0`이 될 때까지 자신을 해제하고 다시 설정하며, 그 시점에서 `a`를 레지스터를 통해 `fib`에 반환합니다.

이 경우 모든 매개변수와 반환 값이 레지스터에 맞으며 호출자가 대상과 동일한 함수 시그니처를 가집니다. 일반적으로는 복잡한 스택 조작이 필요할 수 있습니다:

- 이전 프레임에서 나가는 매개변수 읽기
- 새 프레임으로 매개변수 이동
- 호출자의 스택 매개변수 수에 따라 반환 주소를 위아래로 이동하여 프레임 크기 조정

이 모든 읽기와 쓰기는 같은 스택 공간을 재사용하기 때문에 서로 충돌할 수 있습니다. 이는 비꼬리 호출이 모든 스택 매개변수와 반환 주소를 스택 맨 위에 추가할 단순한 호출 방식과 중요한 차이점입니다.

![TurboFan에서 복잡한 꼬리 호출](/_img/wasm-tail-calls/tail-calls-complex.svg)

TurboFan은 이동의 원천과 목적지 간 잠재적 충돌을 해결하고자 “갭 리졸버”라는 컴포넌트를 사용합니다. 이것은 개념적으로 동시에 실행되어야 하는 이동의 목록을 가져와 각각의 이동 소스가 덮어쓰기 전에 읽히도록 이동 순서를 정렬한 적절한 명령어 시퀀스를 생성합니다. 충돌이 비순환적인 경우 소스 읽기와 덮어쓰기 사이의 순서를 재조정하는 것으로 충분합니다. 순환적 충돌(예: 두 개의 스택 매개변수를 교환하려는 경우)이 있는 경우 소스 중 하나를 임시 레지스터 또는 임시 스택 슬롯로 옮기는 방법으로 순환을 끊어야 할 수 있습니다.

꼬리 호출은 우리 기초 컴파일러인 Liftoff에서도 지원됩니다. 사실, 스택 공간이 부족할 수 있으므로 반드시 지원되어야 합니다. 하지만 이 단에서는 최적화되지 않습니다: Liftoff는 매개변수, 반환 주소, 프레임 포인터를 푸시하여 일반적인 호출처럼 프레임을 완성한 후 호출자의 프레임을 삭제하기 위해 전체를 아래로 이동합니다:

![Liftoff에서의 꼬리 호출](/_img/wasm-tail-calls/tail-calls-liftoff.svg)

대상 함수로 점프하기 전에, 이전 값을 복원하기 위해 호출자의 FP를 FP 레지스터로 팝하고, 대상 함수가 프롤로그에서 다시 푸시할 수 있도록 합니다.

이 전략은 이동 충돌을 분석하고 해결하는 것을 요구하지 않으므로 컴파일이 더 빨라집니다. 생성된 코드는 느리지만, 함수가 충분히 뜨겁다면 결국 TurboFan으로 [최적화 단계가 올라갑니다](/blog/wasm-dynamic-tiering).
