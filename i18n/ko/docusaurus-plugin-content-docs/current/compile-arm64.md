---
title: 'Arm64 Linux에서 컴파일'
description: 'Arm64 Linux에서 V8 네이티브 빌드를 수행하기 위한 팁과 요령'
---
만약 [소스 코드 확인](/docs/source-code) 및 [빌드](/docs/build-gn) 지침을 따라 x86이 아니거나 Apple Silicon Mac이 아닌 머신에서 V8을 빌드하려고 했다면, 네이티브 바이너리를 다운로드하고 실행할 수 없어서 몇 가지 문제가 발생했을 수 있습니다. 하지만 __Arm64 Linux 머신을 사용하여 V8 작업을 하는 것은 공식적으로 지원되지 않더라도__, 이러한 문제를 극복하는 것은 비교적 간단합니다.

## `vpython` 우회하기

`fetch v8`, `gclient sync` 및 기타 `depot_tools` 명령어는 "vpython"이라는 Python 래퍼를 사용합니다. 이와 관련된 오류가 발생한다면, 시스템의 Python 설치를 대신 사용하기 위해 다음 변수를 정의할 수 있습니다:

```bash
export VPYTHON_BYPASS="manually managed python not supported by chrome operations"
```

## 호환 가능한 `ninja` 바이너리

먼저 `ninja`에 대한 네이티브 바이너리를 사용하는지 확인해야 하며, 이를 위해 `depot_tools`의 바이너리를 대신 사용할 수 있습니다. `depot_tools` 설치 시 PATH를 다음과 같이 조정하면 간단하게 해결할 수 있습니다:

```bash
export PATH=$PATH:/path/to/depot_tools
```

이렇게 하면, 시스템에 설치된 `ninja`를 사용할 수 있으며, 이를 사용할 가능성이 높습니다. 만약 그렇지 않은 경우, [소스에서 빌드](https://github.com/ninja-build/ninja#building-ninja-itself)할 수도 있습니다.

## clang 컴파일

기본적으로, V8은 자체적으로 빌드한 clang을 사용하려고 하지만, 이는 해당 머신에서 실행되지 않을 수 있습니다. GN 인수를 조정하여 [시스템의 clang 또는 GCC](#system_clang_gcc)를 사용할 수도 있지만, 업스트림에서 지원되는 버전을 고려하여 동일한 clang을 사용하는 것을 권장합니다.

V8 checkout에서 직접 로컬에서 빌드할 수 있습니다:

```bash
./tools/clang/scripts/build.py --without-android --without-fuchsia \
                               --host-cc=gcc --host-cxx=g++ \
                               --gcc-toolchain=/usr \
                               --use-system-cmake --disable-asserts
```

## GN 인수 수동 설정

편의 스크립트는 기본적으로 작동하지 않을 수 있으므로, [매뉴얼](/docs/build-gn#gn) 워크플로를 따라 GN 인수를 수동으로 설정해야 합니다. 일반적으로 사용되는 "release", "optdebug" 및 "debug" 구성은 다음 인수를 사용하여 얻을 수 있습니다:

- `release`

```bash
is_debug=false
```

- `optdebug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
```

- `debug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
v8_optimized_debug=false
```

## 시스템의 clang 또는 GCC 사용

GCC로 빌드하려면 clang 컴파일을 비활성화하기만 하면 됩니다:

```bash
is_clang=false
```

기본적으로 V8은 `lld`를 사용하여 링크되며, 이는 최신 버전의 GCC를 필요로 합니다. gold 링커로 전환하려면 `use_lld=false`를 사용하거나, 추가로 `use_gold=false`를 사용하여 `ld`를 사용할 수도 있습니다.

시스템에 `/usr`에 설치된 clang을 사용하려면, 다음 인수를 사용할 수 있습니다:

```bash
clang_base_path="/usr"
clang_use_chrome_plugins=false
```

다만, 시스템의 clang 버전이 잘 지원되지 않을 수 있으므로, 경고(예: 알 수 없는 컴파일러 플래그)가 발생할 가능성이 있습니다. 이 경우, 다음을 사용하여 경고를 오류로 처리하지 않도록 설정하는 것이 유용합니다:

```bash
treat_warnings_as_errors=false
```
