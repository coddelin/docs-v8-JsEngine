---
title: '테스팅'
description: '이 문서는 V8 저장소의 일부인 테스트 프레임워크에 대해 설명합니다.'
---
V8에는 엔진을 테스트할 수 있는 테스트 프레임워크가 포함되어 있습니다. 이 프레임워크를 사용하면 소스 코드와 함께 포함된 자체 테스트 스위트뿐만 아니라 [Test262 테스트 스위트](https://github.com/tc39/test262)와 같은 다른 테스트 스위트를 실행할 수 있습니다.

## V8 테스트 실행하기

[`gm`](/docs/build-gn#gm) 사용하여 테스트 실행을 위해 빌드 타겟에 `.check`를 간단히 추가할 수 있습니다. 예:

```bash
gm x64.release.check
gm x64.optdebug.check  # 추천: 합리적으로 빠르고, DCHECKs 포함.
gm ia32.check
gm release.check
gm check  # 기본 플랫폼 모두 빌드 및 테스트
```

`gm`은 테스트를 실행하기 전에 필요한 모든 타겟을 자동으로 빌드합니다. 실행할 테스트를 제한할 수도 있습니다:

```bash
gm x64.release test262
gm x64.debug mjsunit/regress/regress-123
```

이미 V8을 빌드한 경우 테스트를 수동으로 실행할 수 있습니다:

```bash
tools/run-tests.py --outdir=out/ia32.release
```

다시 실행할 테스트를 명시적으로 지정할 수도 있습니다:

```bash
tools/run-tests.py --outdir=ia32.release cctest/test-heap/SymbolTable/* mjsunit/delete-in-eval
```

`--help` 옵션으로 스크립트를 실행하여 다른 옵션에 대해 알아볼 수 있습니다.

## 추가 테스트 실행하기

기본적으로 실행되는 테스트 세트에는 모든 가능한 테스트가 포함되지 않습니다. `gm` 또는 `run-tests.py`의 명령줄에서 추가 테스트 스위트를 지정할 수 있습니다:

- `benchmarks` (정확성만; 벤치마크 결과를 생성하지 않음!)
- `mozilla`
- `test262`
- `webkit`

## 마이크로벤치마크 실행하기

`test/js-perf-test` 아래에는 기능 성능을 추적하기 위한 마이크로벤치마크가 있습니다. 이를 위한 특별 실행기가 있습니다: `tools/run_perf.py`. 이를 실행하려면:

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 test/js-perf-test/JSTests.json
```

`JSTests` 전체를 실행하지 않고 특정 필터를 지정할 수 있습니다:

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 --filter JSTests/TypedArrays test/js-perf-test/JSTests.json
```

## 인터페이스 테스트 기대치 업데이트하기

테스트를 업데이트한 후 기대치 파일을 재생성해야 할 수 있습니다. 다음 명령으로 이를 수행할 수 있습니다:

```bash
tools/run-tests.py --regenerate-expected-files --outdir=ia32.release inspector/debugger/set-instrumentation-breakpoint
```

테스트 결과가 어떻게 변경되었는지 확인하고 싶을 경우에도 유용합니다. 먼저 위 명령으로 기대 파일을 재생성한 후, 다음 명령으로 차이를 확인하십시오:

```bash
git diff
```

## 바이트코드 기대치 업데이트하기 (재기준화)

때로는 바이트코드 기대치가 변경되어 `cctest` 실패가 발생할 수 있습니다. 골든 파일을 업데이트하려면 다음 명령으로 `test/cctest/generate-bytecode-expectations`를 빌드하십시오:

```bash
gm x64.release generate-bytecode-expectations
```

그 다음, 생성된 바이너리에 `--rebaseline` 플래그를 전달하여 기본 입력 세트를 업데이트하십시오:

```bash
out/x64.release/generate-bytecode-expectations --rebaseline
```

업데이트된 골든 파일은 이제 `test/cctest/interpreter/bytecode_expectations/`에 있습니다.

## 새로운 바이트코드 기대치 테스트 추가하기

1. `cctest/interpreter/test-bytecode-generator.cc`에 새로운 테스트 케이스를 추가하고 같은 이름의 골든 파일을 지정하십시오.

2. `generate-bytecode-expectations`를 빌드하십시오:

    ```bash
    gm x64.release generate-bytecode-expectations
    ```

3. 실행:

    ```bash
    out/x64.release/generate-bytecode-expectations --raw-js testcase.js --output=test/cctest/interpreter/bytecode-expectations/testname.golden
    ```

    여기서 `testcase.js`는 `test-bytecode-generator.cc`에 추가된 JavaScript 테스트 케이스이며, `testname`은 `test-bytecode-generator.cc`에서 정의된 테스트 이름입니다.
