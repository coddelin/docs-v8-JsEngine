---
title: '소스에서 V8 빌드하기'
description: '이 문서는 소스에서 V8을 빌드하는 방법을 설명합니다.'
---
Windows/Linux/macOS에서 x64용으로 V8을 처음부터 빌드하려면 다음 단계를 따르십시오.

## V8 소스 코드 가져오기

[V8 소스 코드 가져오기](/docs/source-code)에 관한 가이드를 따르세요.

## 빌드 종속성 설치하기

1. macOS의 경우: Xcode를 설치하고 라이선스 동의서를 수락하세요. (명령줄 도구를 별도로 설치했다면, [먼저 제거하십시오](https://bugs.chromium.org/p/chromium/issues/detail?id=729990#c1).)

1. V8 소스 디렉토리에 있는지 확인하세요. 이전 섹션의 모든 단계를 수행했다면 이미 올바른 위치에 있습니다.

1. 모든 빌드 종속성을 다운로드하세요:

   ```bash
   gclient sync
   ```

   Google 직원용 - 훅을 실행하는 동안 Failed to fetch file 또는 Login required 오류가 발생하면 Google Storage에서 먼저 인증을 시도하세요:

   ```bash
   gsutil.py config
   ```

   @google.com 계정으로 로그인하고 프로젝트 ID를 물었을 때 `0`을 입력하세요.

1. 이 단계는 Linux에서만 필요합니다. 추가 빌드 종속성을 설치하세요:

    ```bash
    ./build/install-build-deps.sh
    ```

## V8 빌드하기

1. `main` 브랜치의 V8 소스 디렉토리에 있는지 확인하세요.

    ```bash
    cd /path/to/v8
    ```

1. 최신 변경 사항을 가져오고 새 빌드 종속성을 설치하세요:

    ```bash
    git pull && gclient sync
    ```

1. 소스를 컴파일하세요:

    ```bash
    tools/dev/gm.py x64.release
    ```

    또는, 소스를 컴파일하고 즉시 테스트를 실행하려면:

    ```bash
    tools/dev/gm.py x64.release.check
    ```

    `gm.py` 도우미 스크립트와 이 스크립트가 트리거하는 명령에 대한 자세한 내용은 [GN으로 빌드하기](/docs/build-gn)을 참조하세요.
