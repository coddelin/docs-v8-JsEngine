---
title: '`Math.random()`이 있고, 또 다른 `Math.random()`도 있다'
author: 'Yang Guo ([@hashseed](https://twitter.com/hashseed)), 소프트웨어 엔지니어 겸 주사위 디자이너'
avatars:
  - 'yang-guo'
date: 2015-12-17 13:33:37
tags:
  - ECMAScript
  - internals
description: 'V8의 Math.random 구현이 이제 xorshift128+ 알고리즘을 사용하여, 이전 MWC1616 구현보다 무작위성을 개선했습니다.'
---
> `Math.random()`은 0 이상 1 미만의 양수 `Number` 값을 무작위 또는 유사 무작위로 선택하여 대략적으로 균등하게 분포시키는, 구현 의존적 알고리즘 또는 전략을 사용해 반환합니다. 이 함수는 인수를 받지 않습니다.

<!--truncate-->
— _[ES 2015, section 20.2.2.27](http://tc39.es/ecma262/#sec-math.random)_

`Math.random()`은 JavaScript에서 가장 잘 알려져 있고 자주 사용되는 무작위 소스입니다. V8 및 대부분의 다른 JavaScript 엔진에서, 이는 [유사 난수 생성기](https://en.wikipedia.org/wiki/Pseudorandom_number_generator) (PRNG)을 사용하여 구현됩니다. 모든 PRNG과 마찬가지로, 난수는 내부 상태에서 파생되며, 이 상태는 새로운 난수를 생성할 때마다 고정된 알고리즘에 의해 변경됩니다. 따라서 초기 상태가 주어지면 난수 시퀀스는 결정적입니다. 내부 상태의 비트 크기 n이 제한되어 있기 때문에 PRNG가 생성할 수 있는 숫자는 결국 반복됩니다. 이 [순열 사이클](https://en.wikipedia.org/wiki/Cyclic_permutation)의 주기 길이에 대한 상한선은 2<sup>n</sup>입니다.

다양한 PRNG 알고리즘이 있습니다. 그중 가장 잘 알려진 것은 [Mersenne-Twister](https://en.wikipedia.org/wiki/Mersenne_Twister)와 [LCG](https://en.wikipedia.org/wiki/Linear_congruential_generator)입니다. 각각은 특정한 특성, 이점 및 단점을 가지고 있습니다. 이상적으로는 초기 상태에 대해 가능한 한 적은 메모리를 사용하며, 빠르게 수행되고, 긴 주기 길이를 가지며, 높은 품질의 무작위 분포를 제공합니다. 메모리 사용량, 성능, 주기 길이는 쉽게 측정하거나 계산할 수 있지만, 품질은 더 어렵습니다. 난수의 품질을 확인하기 위한 통계적 테스트에는 많은 수학이 사용됩니다. 사실상 표준인 PRNG 테스트 모음 [TestU01](http://simul.iro.umontreal.ca/testu01/tu01.html)은 이러한 테스트를 많이 구현합니다.

[2015년 후반](https://github.com/v8/v8/blob/ceade6cf239e0773213d53d55c36b19231c820b5/src/js/math.js#L143)까지 (버전 4.9.40까지), V8에서 선택한 PRNG는 MWC1616(캐리와 함께 곱하기로, 두 개의 16비트 부분을 결합)였습니다. 이는 64비트의 내부 상태를 사용하며 대략 다음과 같습니다:

```cpp
uint32_t state0 = 1;
uint32_t state1 = 2;
uint32_t mwc1616() {
  state0 = 18030 * (state0 & 0xFFFF) + (state0 >> 16);
  state1 = 30903 * (state1 & 0xFFFF) + (state1 >> 16);
  return state0 << 16 + (state1 & 0xFFFF);
}
```

32비트 값은 그 후 명세에 따라 0과 1 사이의 부동 소수점 숫자로 변환됩니다.

MWC1616은 메모리를 적게 사용하며 계산 속도는 빠르지만 품질이 다소 부족합니다:

- 생성할 수 있는 난수는 2<sup>32</sup>개로 제한되며, 이는 두 배 정밀 부동 소수점이 표현할 수 있는 0과 1 사이의 2<sup>52</sup>개의 숫자보다 적습니다.
- 결과의 상위 절반은 거의 전적으로 state0 값에 의존합니다. 주기 길이가 최대 2<sup>32</sup>이 될 수 있지만, 몇 가지 큰 순환 사이클 대신 많은 짧은 순환이 있습니다. 초기 상태가 잘못 선택되면 주기 길이가 4천만 이하일 수 있습니다.
- TestU01 모음의 다수의 통계적 테스트를 통과하지 못했습니다.

이 문제가 [지적](https://medium.com/@betable/tifu-by-using-math-random-f1c308c4fd9d)되었고, 문제를 이해하고 연구한 후, `Math.random`을 [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf) 알고리즘을 기반으로 재구현하기로 결정했습니다. 이 알고리즘은 128비트의 내부 상태를 사용하며, 주기 길이는 2<sup>128</sup>-1이고 TestU01 모음 테스트를 모두 통과합니다.

해당 구현은 우리가 문제를 인지한 지 며칠 만에 [V8 v4.9.41.0에 반영](https://github.com/v8/v8/blob/085fed0fb5c3b0136827b5d7c190b4bd1c23a23e/src/base/utils/random-number-generator.h#L102)되었습니다. 이는 Chrome 49와 함께 제공되었습니다. [Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=322529#c99)와 [Safari](https://bugs.webkit.org/show_bug.cgi?id=151641)도 xorshift128+로 전환했습니다.

V8 v7.1에서 구현은 state0만 의존하도록 다시 조정되었으며 [CL](https://chromium-review.googlesource.com/c/v8/v8/+/1238551/5)을 참조하십시오. 앞으로의 구현 세부 사항은 [소스 코드](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/base/utils/random-number-generator.h;l=119?q=XorShift128&sq=&ss=chromium)에서 확인할 수 있습니다.

하지만 명심하십시오: xorshift128+는 MWC1616보다 훨씬 개선되었지만 여전히 [암호적으로 안전하지 않습니다](https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator). 해싱, 서명 생성, 암호화/복호화와 같은 사용 사례에서는 일반적인 PRNG는 부적합합니다. 웹 암호화 API는 [`window.crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/RandomSource/getRandomValues)를 소개하며 이는 암호적으로 안전한 랜덤 값을 성능 비용을 대가로 반환하는 메서드입니다.

V8 및 Chrome에서 개선 가능 영역을 발견하셨다면, 이 사례처럼 스펙 준수, 안정성, 보안에 직접적인 영향을 미치지 않는 경우라도 반드시 [버그 트래커에서 문제를 제출](https://bugs.chromium.org/p/v8/issues/entry?template=Defect%20report%20from%20user)해 주시길 바랍니다.
