---
title: '추가적인 비백트래킹 정규 표현식 엔진'
author: '마틴 비들링마이어'
date: 2021-01-11
tags:
 - internals
 - RegExp
description: 'V8은 이제 추가적인 정규 표현식 엔진을 갖추고 있으며, 이는 재귀적 백트래킹의 여러 사례를 방지하는 역할을 합니다.'
tweet: '1348635270762139650'
---
v8.8부터 V8은 새로운 실험적 비백트래킹 정규 표현식 엔진(기존의 [Irregexp 엔진](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html) 외에)을 갖추고 있으며, 이는 주제 문자열 크기에 따른 실행을 선형 시간으로 보장합니다. 실험적 엔진은 아래에 언급된 기능 플래그를 통해 사용할 수 있습니다.

<!--truncate-->
![`/(a*)*b/.exec('a'.repeat(n))`의 실행 시간(n ≤ 100)](/_img/non-backtracking-regexp/runtime-plot.svg)

새로운 정규 표현식 엔진을 설정하는 방법은 다음과 같습니다:

- `--enable-experimental-regexp_engine-on-excessive-backtracks`는 과도한 백트래킹이 발생할 경우 비백트래킹 엔진으로의 전환을 활성화합니다.
- `--regexp-backtracks-before-fallback N` (기본값 N = 50,000)는 얼마나 많은 백트래킹을 “과도한” 것으로 간주할지 지정합니다, 즉 전환이 시작되는 시점.
- `--enable-experimental-regexp-engine`는 `l`(“선형”) 플래그를 포함하는 비표준 정규 표현식의 인식을 활성화합니다, 예: `/(a*)*b/l`. 이 플래그로 생성된 정규 표현식은 항상 새로운 엔진으로 즉시 실행됩니다; Irregexp는 전혀 관여하지 않습니다. 새로운 정규 표현식 엔진이 `l`-정규 표현식의 패턴을 처리할 수 없으면 생성 시 예외가 발생합니다. 우리는 이 기능이 결국 신뢰할 수 없는 입력에서 정규 표현식을 실행하는 앱을 강화하는 데 사용되기를 바랍니다. 현재로서는 실험적 상태에 머물러야 하며, 대부분의 일반적인 패턴에서 Irregexp는 새로운 엔진보다 수십 배 더 빠릅니다.

대체 메커니즘은 모든 패턴에 적용되지 않습니다. 대체 메커니즘이 작동하려면 정규 표현식은:

- 백참조를 포함하지 않아야 하며,
- 앞뒤를 살펴보기를 포함하지 않아야 하며,
- 큰 반복 또는 깊게 중첩된 유한 반복(`/a{200,500}/` 등)을 포함하지 않아야 하며,
- `u`(유니코드) 또는 `i`(대소문자 구분 없음) 플래그가 설정되지 않아야 합니다.

## 배경: 재귀적 백트래킹

V8에서 정규 표현식 매칭은 Irregexp 엔진에 의해 처리됩니다. Irregexp는 정규 표현식을 특수한 네이티브 코드나 [바이트코드](/blog/regexp-tier-up)로 JIT 컴파일하여 대부분의 패턴에서 매우 빠릅니다. 그러나 일부 패턴에서는 Irregexp의 실행 시간이 입력 문자열 크기에 비례하여 기하급수적으로 증가할 수 있습니다. 위의 예, `/(a*)*b/.exec('a'.repeat(100))`는 Irregexp로 실행할 경우 우리 생애 내에 완료되지 않습니다.

그럼 여기서 무슨 일이 벌어지고 있는 걸까요? Irregexp는 *백트래킹* 엔진입니다. 매칭이 계속될 수 있는 선택지가 있을 경우, Irregexp는 첫 번째 대안을 전부 탐색한 후 필요할 경우 두 번째 대안을 탐색하기 위해 백트래킹합니다. 예를 들어 `/abc|[az][by][0-9]/` 패턴을 주제 문자열 `'ab3'`로 매칭한다고 가정해 보세요. 여기서 Irregexp는 `/abc/`를 먼저 매칭하려고 시도하지만 두 번째 문자에서 실패합니다. 그런 다음 두 문자를 되돌아가 두 번째 대안인 `/[az][by][0-9]/`를 성공적으로 매칭합니다. `/(abc)*xyz/`와 같은 반복자를 포함하는 패턴에서는 Irregexp가 본문을 한 번 매칭한 후 본문을 계속 매칭할지 남은 패턴을 계속할지 선택해야 합니다.

`/(a*)*b/`를 더 작은 주제 문자열 `'aaa'`로 매칭할 때 어떤 일이 벌어지는지 이해하려고 해봅시다. 이 패턴은 중첩된 반복자를 포함하고 있으므로 Irregexp에 *`'a'`의 시퀀스의 시퀀스*를 매칭한 다음 `'b'`를 매칭하도록 요청하는 것입니다. 명백히 매칭이 실패합니다. 왜냐하면 주제 문자열에 `'b'`가 포함되어 있지 않기 때문입니다. 그러나 `/(a*)*/`는 매칭되고 서술적으로 매우 다양한 방식으로 이루어집니다:

```js
'aaa'           'aa', 'a'           'aa', ''
'a', 'aa'       'a', 'a', 'a'       'a', 'a', ''
…
```

Irregexp는 `/b/`를 최종적으로 매칭하지 못한 실패가 `/(a*)*/`를 매칭하는 잘못된 방식에서 비롯된 것이 아니라고 사전에 판단할 수 없으므로 모든 변형을 시도해야 합니다. 이 문제는 기하급수적 또는 “재귀적 백트래킹”으로 알려져 있습니다.

## Automata 및 바이트코드로서의 정규 표현식

재귀적 백트래킹을 방지하는 대체 알고리즘을 이해하기 위해서는 [오토마타](https://en.wikipedia.org/wiki/Nondeterministic_finite_automaton)를 간단히 살펴봐야 합니다. 모든 정규 표현식은 오토마타와 동등합니다. 예를 들어, 위의 정규 표현식 `/(a*)*b/`는 다음 오토마타와 상응합니다:

![`/(a*)*b/`에 해당하는 오토마타](/_img/non-backtracking-regexp/example-automaton.svg)

패턴에 의해 오토마타가 고유하게 결정되지는 않는다는 점에 유의하세요; 위에서 본 것은 기계적 번역 과정으로 얻은 오토마타이며, 이는 V8의 새로운 정규 표현식 엔진 안에서 `/(a*)*/`를 처리하기 위해 사용됩니다.
레이블이 없는 엣지는 엡실론 전이(epsilon transitions)입니다: 입력을 소비하지 않습니다. 엡실론 전이는 오토마타의 크기를 패턴의 크기 근처로 유지하기 위해 필요합니다. 엡실론 전이를 단순히 제거하면 전이 수가 제곱으로 증가할 수 있습니다.
엡실론 전이는 다음 네 가지 기본 유형의 상태에서 시작하여 정규식(RegExp)에 해당하는 오토마타를 구성할 수 있도록 해줍니다:

![정규식 바이트코드 명령어](/_img/non-backtracking-regexp/state-types.svg)

여기에서는 상태의 *출국* 전이만 분류하며, 상태로의 전이는 여전히 임의여야 합니다. 이러한 유형의 상태만으로 구성된 오토마타는 *바이트코드 프로그램*으로 표현될 수 있으며, 모든 상태는 명령어에 해당합니다. 예를 들어, 두 개의 엡실론 전이가 있는 상태는 `FORK` 명령어로 표현됩니다.

## 백트래킹 알고리즘

Irregexp가 기반으로 하는 백트래킹 알고리즘을 다시 살펴보고 이를 오토마타의 관점에서 설명해 봅시다. `code`라는 바이트코드 배열(패턴에 해당하는)과 `input`이 패턴과 일치하는지 `test`하고자 한다고 가정합시다. `code`가 다음과 같은 형태라고 가정합니다:

```js
const code = [
  {opcode: 'FORK', forkPc: 4},
  {opcode: 'CONSUME', char: '1'},
  {opcode: 'CONSUME', char: '2'},
  {opcode: 'JMP', jmpPc: 6},
  {opcode: 'CONSUME', char: 'a'},
  {opcode: 'CONSUME', char: 'b'},
  {opcode: 'ACCEPT'}
];
```

이 바이트코드는 (스티키) 패턴 `/12|ab/y`에 해당합니다. `FORK` 명령어의 `forkPc` 필드는 이어서 진행할 수 있는 대체 상태/명령어의 인덱스(“프로그램 카운터”)이며, `jmpPc`도 동일합니다. 인덱스는 0부터 시작합니다. 이제 백트래킹 알고리즘을 JavaScript로 구현해 봅시다.

```js
let ip = 0; // 입력 위치.
let pc = 0; // 프로그램 카운터: 다음 명령어의 인덱스.
const stack = []; // 백트래킹 스택.
while (true) {
  const inst = code[pc];
  switch (inst.opcode) {
    case 'CONSUME':
      if (ip < input.length && input[ip] === inst.char) {
        // 예상한 입력이 일치합니다: 계속 진행합니다.
        ++ip;
        ++pc;
      } else if (stack.length > 0) {
        // 잘못된 입력 문자지만, 백트래킹할 수 있습니다.
        const back = stack.pop();
        ip = back.ip;
        pc = back.pc;
      } else {
        // 잘못된 문자이며 백트래킹할 수 없습니다.
        return false;
      }
      break;
    case 'FORK':
      // 나중에 백트래킹할 대안을 저장합니다.
      stack.push({ip: ip, pc: inst.forkPc});
      ++pc;
      break;
    case 'JMP':
      pc = inst.jmpPc;
      break;
    case 'ACCEPT':
      return true;
  }
}
```

이 구현은 바이트코드 프로그램에 문자를 소비하지 않는 루프가 포함될 경우 무한 루프로 실행됩니다. 즉, 오토마타가 엡실론 전이만으로 구성된 루프를 포함하는 경우 문제가 발생할 수 있습니다. 이 문제는 한 문자를 미리 확인하는 방법으로 해결할 수 있습니다. Irregexp는 이 간단한 구현보다 훨씬 더 정교하지만, 기본적으로 동일한 알고리즘을 기반으로 합니다.

## 비백트래킹 알고리즘

백트래킹 알고리즘은 오토마타의 *깊이 우선* 탐색에 해당합니다: 우리는 항상 `FORK` 명령어의 첫 번째 대안을 완전히 탐색한 후 필요할 경우 두 번째 대안을 백트래킹합니다. 이와 대조적으로 비백트래킹 알고리즘은 놀랍게도 오토마타의 *너비 우선* 탐색에 기반하고 있습니다. 여기에서는 모든 대안을 동시에 고려하며 입력 문자열의 현재 위치와 동기화하여 진행합니다. 따라서 현재 상태 목록을 유지한 다음, 각 입력 문자에 해당하는 전이를 통해 모든 상태를 진행시킵니다. 중요한 점은 현재 상태 목록에서 중복을 제거하는 것입니다.

간단한 JavaScript 구현은 다음과 같습니다:

```js
// 입력 위치.
let ip = 0;
// 현재 pc 값 목록 또는 `'ACCEPT'`. 일치하는 경우. 우리는 pc 0에서 시작하며 엡실론 전이를 따라갑니다.
let pcs = followEpsilons([0]);

while (true) {
  // 일치하는 pc를 찾았는지 확인...
  if (pcs === 'ACCEPT') return true;
  // 또는 입력 문자열이 다 소진되었는지 확인합니다.
  if (ip >= input.length) return false;

  // 정확한 문자를 소비하는 pcs만 계속 진행합니다.
  pcs = pcs.filter(pc => code[pc].char === input[ip]);
  // 남아있는 pcs를 다음 명령어로 진행합니다.
  pcs = pcs.map(pc => pc + 1);
  // 엡실론 전이를 따라갑니다.
  pcs = followEpsilons(pcs);

  ++ip;
}
```

여기서 `followEpsilons`는 프로그램 카운터 목록을 받아 엡실론 전이만 실행하여 도달할 수 있는 `CONSUME` 명령어에서의 프로그램 카운터 목록을 계산하는 함수입니다(`FORK` 및 `JMP`만 실행). 결과 목록은 중복을 포함하지 않아야 합니다. `ACCEPT` 명령어에 도달할 수 있는 경우, 이 함수는 `'ACCEPT'`를 반환합니다. 이는 다음과 같이 구현될 수 있습니다:

```js
function followEpsilons(pcs) {
  // 지금까지 본 pcs들의 집합.
  const visitedPcs = new Set();
  const result = [];

  while (pcs.length > 0) {
    const pc = pcs.pop();

    // 우리가 이전에 pc를 본 경우 무시할 수 있습니다.
    if (visitedPcs.has(pc)) continue;
    visitedPcs.add(pc);

    const inst = code[pc];
    switch (inst.opcode) {
      case 'CONSUME':
        결과.push(pc);
        break;
      case 'FORK':
        pcs.push(pc + 1, inst.forkPc);
        break;
      case 'JMP':
        pcs.push(inst.jmpPc);
        break;
      case 'ACCEPT':
        return 'ACCEPT';
    }
  }

  return 결과;
}
```

중복이 `visitedPcs` 집합을 통해 제거되었기 때문에, `followEpsilons`에서 각 프로그램 카운터는 한 번만 검사됩니다. 이는 `결과` 목록에 중복이 포함되지 않음을 보장하며, `followEpsilons`의 실행 시간은 `code` 배열의 크기, 즉 패턴의 크기에 의해 제한됩니다. `followEpsilons`은 최대 `input.length`번 호출되므로, 정규식 일치의 전체 실행 시간은 `𝒪(pattern.length * input.length)`에 의해 제한됩니다.

비백트래킹 알고리즘은 예를 들어 단어 경계나 (서브)매치 경계 계산과 같은 JavaScript 정규식의 대부분의 기능을 지원하도록 확장될 수 있습니다. 그러나, 후방 참조, 전방 탐색 및 후방 탐색은 점근적 최악의 경우 복잡성을 변경하지 않고는 지원될 수 없습니다.

V8의 새로운 정규식 엔진은 이 알고리즘 및 [re2](https://github.com/google/re2)와 [Rust regex](https://github.com/rust-lang/regex) 라이브러리의 구현을 기반으로 합니다. 이 알고리즘은 Russ Cox가 작성한 [블로그 게시물 시리즈](https://swtch.com/~rsc/regexp/)에서 여기보다 훨씬 더 깊이 논의됩니다. Russ Cox는 re2 라이브러리의 원작자이기도 합니다.
