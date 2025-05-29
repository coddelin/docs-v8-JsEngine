---
title: "GN으로 V8 빌드하기"
description: "이 문서는 GN을 사용하여 V8을 빌드하는 방법을 설명합니다."
---
V8은 [GN](https://gn.googlesource.com/gn/+/master/docs/)의 도움으로 빌드됩니다. GN은 여러 빌드 시스템의 빌드 파일을 생성하는 일종의 메타 빌드 시스템입니다. 따라서 사용하는 “백엔드” 빌드 시스템 및 컴파일러에 따라 빌드 방식이 달라집니다.
아래의 지침은 이미 V8의 [체크아웃](/docs/source-code)을 완료하고 [빌드 종속성](/docs/build)을 설치한 것으로 가정합니다.

[Chromium 문서](https://www.chromium.org/developers/gn-build-configuration) 또는 [GN 문서](https://gn.googlesource.com/gn/+/master/docs/)에서 GN에 대한 자세한 정보를 찾을 수 있습니다.

V8을 소스에서 빌드하는 것은 세 단계로 구성됩니다:

1. 빌드 파일 생성
1. 컴파일
1. 테스트 실행

V8을 빌드하기 위한 두 가지 워크플로우가 있습니다:

- 세 단계 모두를 결합하는 `gm`이라는 도우미 스크립트를 사용하는 편리한 워크플로우
- 각 단계를 별도로 명령어를 실행하는 수동 워크플로우

## `gm`을 사용한 V8 빌드 (편리한 워크플로우)

`gm`은 빌드 파일을 생성하고 빌드를 트리거하며 선택적으로 테스트를 실행하는 올인원 스크립트입니다. 이는 V8 체크아웃의 `tools/dev/gm.py`에 있습니다. 쉘 환경 설정에 alias를 추가하는 것을 추천합니다:

```bash
alias gm=/path/to/v8/tools/dev/gm.py
```

`gm`을 사용하여 `x64.release`와 같은 알려진 설정에 대해 V8을 빌드할 수 있습니다:

```bash
gm x64.release
```

빌드 후 바로 테스트를 실행하려면:

```bash
gm x64.release.check
```

`gm`은 실행 중인 모든 명령을 출력하므로 추적 및 재실행이 용이합니다.

`gm`을 사용하면 단일 명령으로 필요한 바이너리를 빌드하고 특정 테스트를 실행할 수 있습니다:

```bash
gm x64.debug mjsunit/foo cctest/test-bar/*
```

## V8 빌드: 수동 워크플로우

### 1단계: 빌드 파일 생성

빌드 파일을 생성하는 여러 가지 방법이 있습니다:

1. 수동 워크플로우에서는 `gn`을 직접 사용합니다.
1. 공통 설정을 위한 `v8gen`이라는 도우미 스크립트를 사용하여 프로세스를 간소화합니다.

#### `gn`을 사용한 빌드 파일 생성

`gn`을 사용하여 디렉터리 `out/foo`에 대한 빌드 파일을 생성합니다:

```bash
gn args out/foo
```

이를 통해 [`gn` arguments](https://gn.googlesource.com/gn/+/master/docs/reference.md)를 지정할 수 있는 편집기 창이 열립니다. 또는 명령줄에서 직접 인수를 전달할 수 있습니다:

```bash
gn gen out/foo --args='is_debug=false target_cpu="x64" v8_target_cpu="arm64" use_goma=true'
```

이는 arm64 시뮬레이터를 사용해 릴리스 모드로 컴파일하기 위한 빌드 파일을 `goma`를 사용하여 생성합니다.

사용 가능한 모든 `gn` 인수에 대한 개요를 얻으려면 다음을 실행하십시오:

```bash
gn args out/foo --list
```

#### `v8gen`을 사용한 빌드 파일 생성

V8 저장소에는 공통 설정의 빌드 파일을 쉽게 생성할 수 있도록 하는 `v8gen` 스크립트가 포함되어 있습니다. 쉘 환경 설정에 alias를 추가하는 것을 추천합니다:

```bash
alias v8gen=/path/to/v8/tools/dev/v8gen.py
```

`v8gen --help`를 실행하여 자세한 정보를 확인하십시오.

사용 가능한 설정(또는 master의 bots)을 나열합니다:

```bash
v8gen list
```

```bash
v8gen list -m client.v8
```

`client.v8` 워터폴에서 특정 bot처럼 폴더 `foo`에 빌드합니다:

```bash
v8gen -b 'V8 Linux64 - debug builder' -m client.v8 foo
```

### 2단계: V8 컴파일

`gn`이 `x64.release` 폴더에 생성되었다고 가정하면, V8 전체를 빌드하려면 다음을 실행하십시오:

```bash
ninja -C out/x64.release
```

`d8`와 같은 특정 타겟을 빌드하려면 명령어에 추가하십시오:

```bash
ninja -C out/x64.release d8
```

### 3단계: 테스트 실행

테스트 드라이버에 출력 디렉터리를 전달할 수 있습니다. 다른 관련 플래그는 빌드에서 추론됩니다:

```bash
tools/run-tests.py --outdir out/foo
```

가장 최근에 컴파일된 빌드(`out.gn`)를 테스트할 수도 있습니다:

```bash
tools/run-tests.py --gn
```

**빌드 문제 발생 시? [v8.dev/bug](https://v8.dev/bug)에 버그를 보고하거나 v8-users@googlegroups.com에서 도움을 요청하십시오.**
