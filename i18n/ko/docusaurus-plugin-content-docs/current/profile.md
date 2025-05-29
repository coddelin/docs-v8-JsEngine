---
title: 'V8의 샘플 기반 프로파일러 사용'
description: '이 문서는 V8의 샘플 기반 프로파일러 사용 방법을 설명합니다.'
---
V8에는 내장형 샘플 기반 프로파일링 기능이 있습니다. 프로파일링은 기본적으로 비활성화되어 있으며, `--prof` 명령줄 옵션으로 활성화할 수 있습니다. 샘플러는 JavaScript와 C/C++ 코드의 스택을 기록합니다.

## 빌드

[GN으로 빌드하기](/docs/build-gn)의 지침에 따라 `d8` 쉘을 빌드합니다.

## 명령줄

프로파일링을 시작하려면 `--prof` 옵션을 사용하세요. 프로파일링 중에 V8은 `v8.log` 파일을 생성하며, 이는 프로파일링 데이터를 포함하고 있습니다.

Windows:

```bash
build\Release\d8 --prof script.js
```

다른 플랫폼에서는 플랫폼에 따라 `ia32`를 `x64`로 변경하여 `x64` 빌드를 프로파일링할 수 있습니다:

```bash
out/ia32.release/d8 --prof script.js
```

## 생성된 출력 처리

로그 파일 처리는 d8 쉘에서 실행되는 JS 스크립트를 사용하여 수행됩니다. 이를 위해 V8 체크아웃의 루트 또는 환경 변수 `D8_PATH`로 지정된 경로에 `d8` 바이너리(또는 심볼릭 링크, Windows에서는 `d8.exe`)가 있어야 합니다. 참고: 이 바이너리는 실제 프로파일링이 아닌 로그 처리를 위해 사용되므로 버전 등의 요소는 상관없습니다.

**분석에 사용된 `d8`은 반드시 `is_component_build`로 빌드되지 않은 상태여야 합니다!**

Windows:

```bash
tools\windows-tick-processor.bat v8.log
```

Linux:

```bash
tools/linux-tick-processor v8.log
```

macOS:

```bash
tools/mac-tick-processor v8.log
```

## `--prof`를 위한 웹 UI

C++ 심볼을 해결하는 등의 전처리를 위해 로그를 `--preprocess`로 처리하세요.

```bash
$V8_PATH/tools/linux-tick-processor --preprocess > v8.json
```

브라우저에서 [`tools/profview/index.html`](https://v8.dev/tools/head/profview)을 열고 `v8.json` 파일을 선택하세요.

## 출력 예시

```
벤치마크\v8.log에서 통계적 프로파일링 결과, (4192 ticks, 0 unaccounted, 0 excluded).

 [공유 라이브러리]:
   ticks  총    비라이브러리   이름
      9    0.2%    0.0%  C:\WINDOWS\system32\ntdll.dll
      2    0.0%    0.0%  C:\WINDOWS\system32\kernel32.dll

 [JavaScript]:
   ticks  총    비라이브러리   이름
    741   17.7%   17.7%  LazyCompile: am3 crypto.js:108
    113    2.7%    2.7%  LazyCompile: Scheduler.schedule richards.js:188
    103    2.5%    2.5%  LazyCompile: rewrite_nboyer earley-boyer.js:3604
    103    2.5%    2.5%  LazyCompile: TaskControlBlock.run richards.js:324
     96    2.3%    2.3%  Builtin: JSConstructCall
    ...

 [C++]:
   ticks  총    비라이브러리   이름
     94    2.2%    2.2%  v8::internal::ScavengeVisitor::VisitPointers
     33    0.8%    0.8%  v8::internal::SweepSpace
     32    0.8%    0.8%  v8::internal::Heap::MigrateObject
     30    0.7%    0.7%  v8::internal::Heap::AllocateArgumentsObject
    ...


 [GC]:
   ticks  총    비라이브러리   이름
    458   10.9%

 [하위 (중심) 프로파일]:
  참고: 퍼센트는 상위 호출의 총량에 대한 특정 호출자의 점유를 보여줍니다.
  2.0% 미만을 차지하는 호출자는 표시되지 않습니다.

   ticks 상위  이름
    741   17.7%  LazyCompile: am3 crypto.js:108
    449   60.6%    LazyCompile: montReduce crypto.js:583
    393   87.5%      LazyCompile: montSqrTo crypto.js:603
    212   53.9%        LazyCompile: bnpExp crypto.js:621
    212  100.0%          LazyCompile: bnModPowInt crypto.js:634
    212  100.0%            LazyCompile: RSADoPublic crypto.js:1521
    181   46.1%        LazyCompile: bnModPow crypto.js:1098
    181  100.0%          LazyCompile: RSADoPrivate crypto.js:1628
    ...
```


## 웹 애플리케이션 프로파일링

오늘날 고도로 최적화된 가상 머신은 웹 애플리케이션을 매우 빠르게 실행할 수 있습니다. 그러나 더 나은 성능을 위해서는 반드시 가상 머신에만 의존해서는 안 됩니다: 신중하게 최적화된 알고리즘이나 덜 비용이 드는 함수는 모든 브라우저에서 많은 배의 속도 향상을 종종 이룰 수 있습니다. [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/)의 [CPU 프로파일러](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/reference)는 코드의 병목 현상을 분석하는 데 도움을 줍니다. 그러나 때로는 더 깊고 세밀한 분석이 필요합니다: 이때 V8의 내부 프로파일러가 유용합니다.

그 프로파일러를 사용하여 Microsoft가 [IE10과 함께](https://blogs.msdn.microsoft.com/ie/2012/11/13/ie10-fast-fluid-perfect-for-touch-and-available-now-for-windows-7/) 출시한 [맨델브로트 탐험기 데모](https://web.archive.org/web/20130313064141/http://ie.microsoft.com/testdrive/performance/mandelbrotexplorer/)를 살펴보겠습니다. 데모 출시 이후 V8은 불필요하게 계산 속도를 저하시켰던 버그를 수정했고 엔진을 추가로 최적화하여 시스템 표준 라이브러리가 제공하는 것보다 더 빠른 `exp()` 근사치를 구현했습니다. 이러한 변경 이후, **데모는 Chrome에서 이전 측정보다 8배 빠르게 실행되었습니다**.

하지만 모든 브라우저에서 코드 실행 속도를 높이고 싶다면 어떻게 해야 할까요? 먼저 **CPU가 바쁘게 돌아가는 이유를 이해해야 합니다**. 아래 명령줄 옵션을 사용하여 Chrome(Windows 및 Linux [Canary](https://tools.google.com/dlpage/chromesxs))를 실행하면 지정된 URL(이 경우, 웹 워커 없이 Mandelbrot 데모의 로컬 버전)에 대해 프로파일러 틱 정보를 출력(v8.log 파일에 저장)합니다:

```bash
./chrome --js-flags='--prof' --no-sandbox 'http://localhost:8080/'
```

테스트 케이스를 준비할 때 로드 시 바로 작업을 시작하도록 하고, 계산이 완료되면 Chrome을 종료(Alt+F4를 누르기)하여 로그 파일에 필요한 틱만 포함되도록 하세요. 또한 이 기술로 웹 워커는 아직 정확히 프로파일링되지 않는다는 점을 유의하십시오.

그다음, `v8.log` 파일을 V8과 함께 제공되는 `tick-processor` 스크립트(또는 새로운 실용적인 웹 버전)로 처리하세요:

```bash
v8/tools/linux-tick-processor v8.log
```

다음은 처리된 출력에서 주목할 만한 흥미로운 부분입니다:

```
Statistical profiling result from null, (14306 ticks, 0 unaccounted, 0 excluded).
 [Shared libraries]:
   ticks  total  nonlib   name
   6326   44.2%    0.0%  /lib/x86_64-linux-gnu/libm-2.15.so
   3258   22.8%    0.0%  /.../chrome/src/out/Release/lib/libv8.so
   1411    9.9%    0.0%  /lib/x86_64-linux-gnu/libpthread-2.15.so
     27    0.2%    0.0%  /.../chrome/src/out/Release/lib/libwebkit.so
```

상단 섹션은 V8이 자체 코드보다 OS 특정 시스템 라이브러리 내부에서 더 많은 시간을 소비하고 있음을 보여줍니다. 이를 담당하는 원인을 알아보기 위해 “bottom up” 출력 섹션을 살펴보세요. 여기서 들여쓰기된 줄은 “~에 의해 호출됨”을 의미하며, `*`로 시작하는 줄은 TurboFan에 의해 최적화된 함수를 나타냅니다:

```
[Bottom up (heavy) profile]:
  Note: percentage shows a share of a particular caller in the total
  amount of its parent calls.
  Callers occupying less than 2.0% are not shown.

   ticks parent  name
   6326   44.2%  /lib/x86_64-linux-gnu/libm-2.15.so
   6325  100.0%    LazyCompile: *exp native math.js:91
   6314   99.8%      LazyCompile: *calculateMandelbrot http://localhost:8080/Demo.js:215
```

전체 시간의 **44% 이상이 시스템 라이브러리 내에서 `exp()` 함수 실행에 소비**됩니다! 시스템 라이브러리 호출 오버헤드를 더하면 전체 시간의 약 3분의 2가 `Math.exp()` 평가에 소비됩니다.

JavaScript 코드를 보면 `exp()`가 매끄러운 그레이스케일 팔레트 생성에만 사용된다는 것을 알 수 있습니다. 매끄러운 그레이스케일 팔레트를 생성하는 방법은 수없이 많지만, 정말로 능형 형식의 그레이디언트를 선호한다고 가정해봅시다. 바로 여기에서 알고리즘 최적화가 중요한 역할을 합니다.

`exp()`는 `-4 < x < 0` 범위의 인수로 호출된다는 것을 알 수 있으므로 이 범위에 대해 [Taylor 근사](https://en.wikipedia.org/wiki/Taylor_series)로 안전하게 대체할 수 있습니다. 이는 곱셈과 몇 번의 나눗셈만으로 동일한 매끄러운 그레이디언트를 제공힙니다:

```
exp(x) ≈ 1 / ( 1 - x + x * x / 2) for -4 < x < 0
```

이 알고리즘을 통해 성능이 최신 Canary와 비교하면 30% 더 향상되고 Chrome Canary에서 시스템 라이브러리에 기반한 `Math.exp()`보다 5배 증가합니다.

![](/_img/docs/profile/mandelbrot.png)

이 예는 V8의 내부 프로파일러가 코드 병목 현상을 더 깊이 이해하는 데 도움을 줄 수 있음을 보여주며, 더 스마트한 알고리즘이 성능을 더욱 향상시킬 수 있다는 것을 보여줍니다.

오늘날 복잡하고 요구 사항이 높은 웹 애플리케이션을 대표하는 벤치마크에 대해 더 알고 싶다면 [V8이 실생활에서 성능을 측정하는 방법](/blog/real-world-performance)을 읽어보세요.
