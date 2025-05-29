---
title: "V8 소스 코드 확인하기"
description: "이 문서는 V8 소스 코드를 로컬에서 확인하는 방법을 설명합니다."
---
이 문서는 V8 소스 코드를 로컬에서 확인하는 방법을 설명합니다. 온라인으로 소스를 검색하고 싶다면 다음 링크를 사용하세요:

- [검색](https://chromium.googlesource.com/v8/v8/)
- [검색 최첨단](https://chromium.googlesource.com/v8/v8/+/master)
- [변경 사항](https://chromium.googlesource.com/v8/v8/+log/master)

## Git 사용하기

V8의 Git 저장소는 https://chromium.googlesource.com/v8/v8.git에 위치하며, GitHub에 공식 미러가 있습니다: https://github.com/v8/v8.

이 URL들 중 하나를 `git clone`으로 단순히 복제하지 마세요! 체크아웃한 V8을 빌드하려면 아래의 지침을 따라 전체 설정을 제대로 완료하세요.

## 설치 방법

1. Linux 또는 macOS에서 먼저 Git을 설치한 다음 [`depot_tools`](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up)를 설치하십시오.

    Windows의 경우, Chromium 지침 ([Googler용](https://goto.google.com/building-chrome-win), [비 Googler용](https://chromium.googlesource.com/chromium/src/+/master/docs/windows_build_instructions.md#Setting-up-Windows))을 따라 Git, Visual Studio, Windows 디버깅 도구 및 `depot_tools`를 설치하십시오.

1. 다음 명령어를 터미널/쉘에 실행하여 `depot_tools`를 업데이트합니다. Windows에서는 반드시 명령 프롬프트 (`cmd.exe`)에서 실행해야 하며, PowerShell이나 기타 쉘에서 실행하면 안 됩니다.

    ```
    gclient
    ```

1. **푸시 액세스**를 위해 Git 비밀번호가 포함된 `.netrc` 파일을 설정해야 합니다:

    1. https://chromium.googlesource.com/new-password로 이동하여 커미터 계정 (일반적으로 `@chromium.org` 계정)으로 로그인합니다. 참고: 새 비밀번호를 생성하더라도 이전에 생성된 비밀번호는 자동으로 취소되지 않습니다. `git config user.email`에 설정된 이메일과 동일한 이메일을 사용해야 합니다.
    1. 쉘 명령이 포함된 큰 회색 상자를 확인한 후, 해당 내용을 쉘에 붙여넣으십시오.

1. 이제 모든 브랜치와 종속성을 포함하여 V8 소스 코드를 가져오십시오:

    ```bash
    mkdir ~/v8
    cd ~/v8
    fetch v8
    cd v8
    ```

이후 고의적으로 detached head 상태가 됩니다.

선택적으로 새 브랜치가 어떻게 트래킹될지 지정할 수 있습니다:

```bash
git config branch.autosetupmerge always
git config branch.autosetuprebase always
```

또는 다음과 같이 로컬 브랜치를 새로 만드는 것도 가능합니다 (권장 방식):

```bash
git new-branch fix-bug-1234
```

## 최신 상태 유지하기

`git pull`을 사용하여 현재 브랜치를 업데이트합니다. 브랜치에 있지 않은 경우 `git pull`이 작동하지 않으며 대신 `git fetch`를 사용해야 합니다.

```bash
git pull
```

때로는 V8의 종속성이 업데이트됩니다. 다음 명령을 실행하여 이를 동기화할 수 있습니다:

```bash
gclient sync
```

## 코드 리뷰 제출하기

```bash
git cl upload
```

## 커밋하기

코드 리뷰에서 CQ 체크박스를 사용해 커밋할 수 있습니다 (권장). CQ 플래그 및 문제 해결에 관한 더 많은 내용은 [Chromium 지침](https://chromium.googlesource.com/chromium/src/+/master/docs/infra/cq.md)을 참조하십시오.

기본 값보다 더 많은 trybot이 필요한 경우, Gerrit 커밋 메시지에 다음을 추가하십시오 (예: nosnap bot 추가):

```
CQ_INCLUDE_TRYBOTS=tryserver.v8:v8_linux_nosnap_rel
```

수동으로 배포하려면 브랜치를 업데이트하십시오:

```bash
git pull --rebase origin
```

그런 다음 다음 명령으로 커밋합니다:

```bash
git cl land
```

## Try jobs

이 섹션은 V8 프로젝트 구성원에게만 유용합니다.

### 코드 리뷰에서 Try Job 생성하기

1. Gerrit에 CL을 업로드합니다.

    ```bash
    git cl upload
    ```

1. 다음과 같이 Try bots에 Try Job을 보냅니다:

    ```bash
    git cl try
    ```

1. Try bots가 빌드 완료 후 결과를 이메일로 받게 될 것입니다. Gerrit에서 패치 상태를 확인할 수도 있습니다.

1. 패치 적용에 실패하면 패치를 다시 베이스 또는 동기화할 V8 리비전을 지정해야 할 수 있습니다:

```bash
git cl try --revision=1234
```

### 로컬 브랜치에서 Try Job 생성하기

1. 로컬 저장소에서 Git 브랜치에 변경 사항을 커밋합니다.

1. 다음과 같이 변경 사항을 Try bots에 전송합니다:

    ```bash
    git cl try
    ```

1. Try bots가 빌드 완료 후 결과를 이메일로 받게 될 것입니다. 참고: 현재 일부 레플리카에 문제가 있습니다. 코드 리뷰에서 Try Jobs를 전송하는 것이 권장됩니다.

### 유용한 인수

Revision 인수는 Try bot에 로컬 변경 사항을 적용할 코드 베이스의 리비전을 알려줍니다. 리비전을 지정하지 않으면 [V8의 LKGR 리비전](https://v8-status.appspot.com/lkgr)이 기본으로 사용됩니다.

```bash
git cl try --revision=1234
```

Try Job이 모든 bot에서 실행되지 않도록 `--bot` 플래그와 빌더 이름의 쉼표로 구분된 목록을 사용합니다. 예:

```bash
git cl try --bot=v8_mac_rel
```

### Try 서버 보기

```bash
git cl try-results
```

## 소스 코드 브랜치

V8에는 여러 가지 분기가 있습니다. 어떤 버전을 선택해야 할지 확실하지 않은 경우, 가장 최신의 안정 버전을 선택하는 것이 좋습니다. 사용되는 다양한 분기에 대한 자세한 정보를 보려면 [Release Process](/docs/release-process)를 확인하십시오.

Chrome의 안정(또는 베타) 채널에서 제공하는 V8 버전을 따르고 싶을 수 있습니다. 자세한 정보는 https://omahaproxy.appspot.com/ 를 참조하세요.
