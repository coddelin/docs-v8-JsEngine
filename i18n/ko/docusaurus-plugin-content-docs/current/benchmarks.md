---
title: '벤치마크를 로컬에서 실행하기'
description: '이 문서는 d8에서 클래식 벤치마크 스위트를 실행하는 방법을 설명합니다.'
---
우리는 SunSpider, Kraken, Octane의 “클래식” 벤치마크를 실행하기 위한 간단한 워크플로를 가지고 있습니다. 서로 다른 바이너리와 플래그 조합으로 실행할 수 있으며, 결과는 여러 번 실행한 평균으로 계산됩니다.

## CPU

[GN으로 빌드하기](/docs/build-gn)의 지침에 따라 `d8` 셸을 빌드하세요.

벤치마크를 실행하기 전에 CPU 주파수 스케일링 거버너를 성능 모드로 설정해야 합니다.

```bash
sudo tools/cpu.sh fast
```

`cpu.sh` 명령이 이해하는 옵션은 다음과 같습니다.

- `fast`, 성능 모드 (`fast`의 별칭)
- `slow`, 절전 모드 (`slow`의 별칭)
- `default`, 온디맨드 모드 (`default`의 별칭)
- `dualcore` (두 개의 코어만 활성화), 듀얼 (`dualcore`의 별칭)
- `allcores` (모든 사용 가능한 코어 다시 활성화), 전체 (`allcores`의 별칭)

## CSuite

`CSuite`는 간단한 벤치마크 실행 도구입니다:

```bash
test/benchmarks/csuite/csuite.py
    (sunspider | kraken | octane)
    (baseline | compare)
    <d8 바이너리 경로>
    [-x "<추가 d8 명령줄 플래그>"]
```

`baseline` 모드에서 먼저 실행하여 기준값을 생성한 다음, `compare` 모드에서 결과를 확인할 수 있습니다. `CSuite`는 기본적으로 Octane을 10회, SunSpider를 100회, Kraken을 80회 실행하지만, `-r` 옵션을 사용하여 더 빠르게 결과를 얻도록 설정할 수 있습니다.

`CSuite`는 실행하는 디렉터리에 두 개의 하위 디렉터리를 생성합니다:

1. `./_benchmark_runner_data` — N회 실행의 캐시된 출력입니다.
1. `./_results` — 결과를 여기에 파일로 저장합니다. 이 파일을 다른 이름으로 저장하면 비교 모드에서 표시됩니다.

비교 모드에서는 다른 바이너리 또는 적어도 서로 다른 플래그를 사용하게 됩니다.

## 사용 예시

`d8`의 두 버전을 빌드하고 SunSpider에서 어떤 일이 발생하는지 확인하려 한다고 가정해 보겠습니다. 먼저 기준값을 생성합니다:

```bash
$ test/benchmarks/csuite/csuite.py sunspider baseline out.gn/master/d8
Wrote ./_results/master.
다시 비교 모드로 SunSpider를 실행하여 결과를 확인합니다.
```

다른 바이너리를 사용하여 이번에는 `compare` 모드로 실행합니다:

```
$ test/benchmarks/csuite/csuite.py sunspider compare out.gn/x64.release/d8

                               benchmark:    score |   master |      % |
===================================================+==========+========+
                       3d-cube-sunspider:     13.9 S     13.4 S   -3.6 |
                      3d-morph-sunspider:      8.6 S      8.4 S   -2.3 |
                   3d-raytrace-sunspider:     15.1 S     14.9 S   -1.3 |
           access-binary-trees-sunspider:      3.7 S      3.9 S    5.4 |
               access-fannkuch-sunspider:     11.9 S     11.8 S   -0.8 |
                  access-nbody-sunspider:      4.6 S      4.8 S    4.3 |
                 access-nsieve-sunspider:      8.4 S      8.1 S   -3.6 |
      bitops-3bit-bits-in-byte-sunspider:      2.0 |      2.0 |        |
           bitops-bits-in-byte-sunspider:      3.7 S      3.9 S    5.4 |
            bitops-bitwise-and-sunspider:      2.7 S      2.9 S    7.4 |
            bitops-nsieve-bits-sunspider:      5.3 S      5.6 S    5.7 |
         controlflow-recursive-sunspider:      3.8 S      3.6 S   -5.3 |
                    crypto-aes-sunspider:     10.9 S      9.8 S  -10.1 |
                    crypto-md5-sunspider:      7.0 |      7.4 S    5.7 |
                   crypto-sha1-sunspider:      9.2 S      9.0 S   -2.2 |
             date-format-tofte-sunspider:      9.8 S      9.9 S    1.0 |
             date-format-xparb-sunspider:     10.3 S     10.3 S        |
                   math-cordic-sunspider:      6.1 S      6.2 S    1.6 |
             math-partial-sums-sunspider:     20.2 S     20.1 S   -0.5 |
            math-spectral-norm-sunspider:      3.2 S      3.0 S   -6.2 |
                    regexp-dna-sunspider:      7.6 S      7.8 S    2.6 |
                 string-base64-sunspider:     14.2 S     14.0 |   -1.4 |
                  string-fasta-sunspider:     12.8 S     12.6 S   -1.6 |
               string-tagcloud-sunspider:     18.2 S     18.2 S        |
            string-unpack-code-sunspider:     20.0 |     20.1 S    0.5 |
         string-validate-input-sunspider:      9.4 S      9.4 S        |
                               SunSpider:    242.6 S    241.1 S   -0.6 |
---------------------------------------------------+----------+--------+
```

이전 실행의 출력은 현재 디렉터리에 생성된 하위 디렉터리 (`_benchmark_runner_data`)에 캐시되었습니다. 집계 결과도 `_results` 디렉터리에 캐시됩니다. 이 디렉터리는 비교 단계를 실행한 후 삭제할 수 있습니다.

또 다른 상황은 동일한 바이너리를 사용하지만 다른 플래그의 결과를 보고 싶은 경우입니다. 약간 익살스럽게도, 최적화 컴파일러 없이 Octane이 어떻게 작동하는지 보고 싶다고 가정해 봅시다. 먼저 기준값 생성:

```bash

$ test/benchmarks/csuite/csuite.py -r 1 octane baseline out.gn/x64.release/d8

일반적으로, Octane은 안정적인 결과를 얻기 위해 10번의 실행이 필요합니다.
/usr/local/google/home/mvstanton/src/v8/_results/master에 작성했습니다.
결과를 확인하려면 비교 모드로 Octane을 다시 실행하세요.
```

일반적으로 한 번의 실행으로는 많은 성능 최적화를 확실히 판별하기에 충분하지 않다는 경고를 확인하세요. 하지만 우리의 '변경'은 한 번의 실행만으로 재현 가능한 효과가 있어야 합니다! 이제 `--noopt` 플래그를 전달해 [TurboFan](/docs/turbofan)을 끄고 비교해 봅시다:

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane compare out.gn/x64.release/d8 \
  -x "--noopt"

일반적으로 Octane은 안정적인 결과를 얻기 위해 10번의 실행이 필요합니다.
                               benchmark:    score |   master |      % |
===================================================+==========+========+
                                Richards:    973.0 |  26770.0 |  -96.4 |
                               DeltaBlue:   1070.0 |  57245.0 |  -98.1 |
                                  Crypto:    923.0 |  32550.0 |  -97.2 |
                                RayTrace:   2896.0 |  75035.0 |  -96.1 |
                             EarleyBoyer:   4363.0 |  42779.0 |  -89.8 |
                                  RegExp:   2881.0 |   6611.0 |  -56.4 |
                                   Splay:   4241.0 |  19489.0 |  -78.2 |
                            SplayLatency:  14094.0 |  57192.0 |  -75.4 |
                            NavierStokes:   1308.0 |  39208.0 |  -96.7 |
                                   PdfJS:   6385.0 |  26645.0 |  -76.0 |
                                Mandreel:    709.0 |  33166.0 |  -97.9 |
                         MandreelLatency:   5407.0 |  97749.0 |  -94.5 |
                                 Gameboy:   5440.0 |  54336.0 |  -90.0 |
                                CodeLoad:  25631.0 |  25282.0 |    1.4 |
                                   Box2D:   3288.0 |  67572.0 |  -95.1 |
                                    zlib:  59154.0 |  58775.0 |    0.6 |
                              Typescript:  12700.0 |  23310.0 |  -45.5 |
                                  Octane:   4070.0 |  37234.0 |  -89.1 |
---------------------------------------------------+----------+--------+
```

`CodeLoad`와 `zlib`가 상대적으로 피해를 입지 않았다는 점이 흥미롭습니다.

## 내부 작동 방식

`CSuite`는 동일한 디렉토리에 있는 두 개의 스크립트, `benchmark.py`와 `compare-baseline.py`를 기반으로 합니다. 해당 스크립트에는 더 많은 옵션이 있습니다. 예를 들어, 여러 기준점을 기록하고 3-, 4-, 또는 5-way 비교를 수행할 수 있습니다. `CSuite`는 빠른 사용을 위해 최적화되었으며, 일부 유연성을 희생합니다.
