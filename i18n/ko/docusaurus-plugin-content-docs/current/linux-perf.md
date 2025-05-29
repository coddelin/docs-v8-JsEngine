---
title: "V8의 Linux `perf` 통합"
description: "이 문서는 Linux `perf` 도구를 사용하여 V8의 JIT 코드 성능을 분석하는 방법을 설명합니다."
---
V8은 Linux `perf` 도구에 대한 기본 지원을 제공합니다. 이를 활성화하려면 `--perf-prof` 명령줄 옵션을 사용하십시오.
V8은 실행 중에 성능 데이터를 파일에 기록하여 Linux `perf` 도구를 사용해 V8의 JIT 코드(예: JS 함수 이름)를 분석할 수 있게 합니다.

## 요구사항

- `linux-perf` 버전 5 이상 (이전 버전은 JIT 지원이 없음). ([여기](#build-perf)에서 설치 방법 참조)
- 더 나은 C++ 코드 심볼화를 위해 `enable_profiling=true`로 V8/Chrome 빌드.

## V8 빌드

V8의 Linux perf 통합을 사용하려면 `enable_profiling = true` gn 플래그로 빌드해야 합니다:

```bash
echo 'enable_profiling = true' >> out/x64.release/args.gn
autoninja -C out/x64.release
```

## `d8` 프로파일링 [`linux-perf-d8.py`](https://source.chromium.org/search?q=linux-perf-d8.py)

`d8`를 빌드한 후 Linux perf를 사용할 수 있습니다:

```bash
tools/profiling/linux-perf-d8.py out/x64.release/d8 path/to/test.js;
```

더 완전한 예:

```bash
echo '(function f() {
    var s = 0; for (var i = 0; i < 1000000000; i++) { s += i; } return s;
  })();' > test.js;

# 사용자 지정 V8 플래그와 별도의 출력 디렉토리를 사용하여 클러터 줄이기:
mkdir perf_results
tools/profiling/linux-perf-d8.py --perf-data-dir=perf_results \
    out/x64.release/d8 --expose-gc --allow-natives-syntax test.js;

# 고급 UI (`-flame`은 Googler 전용이며, `-web`은 공개 대안으로 사용 가능):
pprof -flame perf_results/XXX_perf.data.jitted;
# 터미널 기반 도구:
perf report -i perf_results/XXX_perf.data.jitted;
```

`linux-perf-d8.py --help`를 확인하여 자세한 내용을 확인하세요. `d8` 바이너리 인수 뒤에 모든 `d8` 플래그를 사용할 수 있습니다.


## Chrome 또는 content_shell 프로파일링 [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py)

1. [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py) 스크립트를 사용하여 Chrome을 프로파일링 할 수 있습니다. 올바른 C++ 심볼을 얻으려면 [필수 chrome gn 플래그](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup)를 추가하세요.

1. 빌드 준비가 완료되면 C++ 및 JS 코드에 대한 전체 심볼과 함께 웹사이트를 프로파일링할 수 있습니다.

    ```bash
    mkdir perf_results;
    tools/profiling/linux-perf-chrome.py out/x64.release/chrome \
        --perf-data-dir=perf_results --timeout=30
    ```

1. 웹사이트로 이동한 후 브라우저를 닫거나 `--timeout`이 완료될 때까지 기다리세요.
1. 브라우저를 종료한 후 `linux-perf.py`가 파일을 후처리하고 각 렌더러 프로세스에 대한 결과 파일 목록을 표시합니다:

   ```
   chrome_renderer_1583105_3.perf.data.jitted      19.79MiB
   chrome_renderer_1583105_2.perf.data.jitted       8.59MiB
   chrome_renderer_1583105_4.perf.data.jitted       0.18MiB
   chrome_renderer_1583105_1.perf.data.jitted       0.16MiB
   ```

## linux-perf 결과 탐색

마지막으로 Linux `perf` 도구를 사용하여 d8 또는 Chrome 렌더러 프로세스의 프로필을 탐색할 수 있습니다:

```bash
perf report -i perf_results/XXX_perf.data.jitted
```

또한 [pprof](https://github.com/google/pprof)를 사용하여 더 많은 시각화를 생성할 수 있습니다:

```bash
# 참고: `-flame`은 google 전용이며, `-web`을 공개 대안으로 사용하십시오:
pprof -flame perf_results/XXX_perf.data.jitted;
```

## 저수준 linux-perf 사용법

### `d8`에서 직접 linux-perf 사용하기

사용 사례에 따라 `d8`에서 직접 linux-perf를 사용할 수 있습니다.
이는 두 단계의 프로세스를 요구하며, 먼저 `perf record`를 사용하여 `perf.data` 파일을 생성한 다음 `perf inject`로 JS 심볼을 주입해야 합니다.

``` bash
perf record --call-graph=fp --clockid=mono --freq=max \
    --output=perf.data
    out/x64.release/d8 \
      --perf-prof --no-write-protect-code-memory \
      --interpreted-frames-native-stack \
    test.js;
perf inject --jit --input=perf.data --output=perf.data.jitted;
perf report --input=perf.data.jitted;
```

### V8 linux-perf 플래그

[`--perf-prof`](https://source.chromium.org/search?q=FLAG_perf_prof)는 JIT 코드에서 성능 샘플을 기록하기 위해 V8 명령줄에서 사용됩니다.

[`--nowrite-protect-code-memory`](https://source.chromium.org/search?q=FLAG_nowrite_protect_code_memory)는 코드 메모리에 대한 쓰기 보호를 비활성화하기 위해 필요합니다. 이는 `perf`가 코드 페이지에서 쓰기 비트를 제거하는 이벤트를 볼 때 코드 페이지 정보가 제거되므로 필요합니다. 다음은 테스트 JavaScript 파일에서 샘플을 기록하는 예입니다:

[`--interpreted-frames-native-stack`](https://source.chromium.org/search?q=FLAG_interpreted_frames_native_stack)는 실행 함수별로 주소를 기준으로 `perf`에서 구분할 수 있도록 InterpreterEntryTrampoline의 서로 다른 진입점(복사본)을 생성하는 데 사용됩니다. InterpreterEntryTrampoline을 복사해야 하므로 약간의 성능 및 메모리 퇴보가 발생합니다.


### Linux-perf를 chrome에 직접 사용하기

1. 동일한 V8 플래그를 사용하여 chrome 자체를 프로파일링할 수 있습니다. 올바른 V8 플래그에 대한 위 지침을 따르고 chrome 빌드에 [필수 chrome gn 플래그](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup)를 추가하십시오.

1. 빌드가 준비되면, C++과 JS 코드의 전체 심볼을 모두 사용하여 웹사이트를 프로파일링할 수 있습니다.

    ```bash
    out/x64.release/chrome \
        --user-data-dir=`mktemp -d` \
        --no-sandbox --incognito --enable-benchmarking \
        --js-flags='--perf-prof --no-write-protect-code-memory --interpreted-frames-native-stack'
    ```

1. Chrome을 시작한 후, Task Manager에서 렌더러 프로세스 ID를 찾고 이를 사용하여 프로파일링을 시작하십시오:

    ```bash
    perf record -g -k mono -p $RENDERER_PID -o perf.data
    ```

1. 웹사이트로 이동한 다음 perf 출력 평가 방법에 대한 다음 섹션을 계속합니다.

1. 실행이 완료되면, V8에서 JIT 코드에 대해 출력한 성능 샘플과 `perf` 도구에서 수집한 정적인 정보를 결합합니다:

   ```bash
   perf inject --jit --input=perf.data --output=perf.data.jitted
   ```

1. 마지막으로 Linux `perf` [도구를 사용하여 탐색](#Explore-linux-perf-results)할 수 있습니다.

## `perf` 빌드하기

오래된 Linux 커널을 사용하고 있다면, JIT 지원이 포함된 linux-perf를 로컬에서 빌드할 수 있습니다.

- 새로운 Linux 커널을 설치하고 컴퓨터를 재부팅하십시오:

  ```bash
   sudo apt-get install linux-generic-lts-wily;
  ```

- 의존성을 설치하세요:

  ```bash
  sudo apt-get install libdw-dev libunwind8-dev systemtap-sdt-dev libaudit-dev \
     libslang2-dev binutils-dev liblzma-dev;
  ```

- 최신 `perf` 도구 소스가 포함된 커널 소스를 다운로드하십시오:

  ```bash
  cd some/directory;
  git clone --depth 1 git://git.kernel.org/pub/scm/linux/kernel/git/tip/tip.git;
  cd tip/tools/perf;
  make
  ```

다음 단계에서, `perf`를 `some/director/tip/tools/perf/perf`로 호출하십시오.
