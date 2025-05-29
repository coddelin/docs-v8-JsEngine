---
title: '병합 및 패치'
description: '이 문서는 V8 패치를 릴리스 분기로 병합하는 방법을 설명합니다.'
---
중요한 버그 수정과 같은 패치가 `main` 브랜치에 있으며 해당 패치를 V8 릴리스 브랜치(refs/branch-heads/12.5) 중 하나에 병합해야 하는 경우, 계속 읽어보세요.

다음 예제는 분기된 V8 12.3 버전을 사용합니다. `12.3`을 당신의 버전 번호로 대체하세요. [V8의 버전 번호](/docs/version-numbers)에 대한 문서를 읽어보세요.

패치가 병합된 경우 V8의 이슈 트래커에 관련된 이슈가 반드시 있어야 합니다. 이는 병합 기록을 추적하는 데 도움이 됩니다.

## 병합 후보로 적합한 패치는 무엇인가요?

- 패치가 *심각한* 버그를 수정하는 경우 (중요도 순서):
    1. 보안 버그
    1. 안정성 버그
    1. 정확성 버그
    1. 성능 버그
- 패치가 API를 변경하지 않은 경우.
- 패치가 분기 이전의 기존 동작을 변경하지 않은 경우 (버그 수정을 위한 동작 변경은 제외).

추가 정보는 [Chromium 관련 페이지](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/process/merge_request.md)에서 확인할 수 있습니다. 의문이 있는 경우 &lt;v8-dev@googlegroups.com>으로 이메일을 보내세요.

## 병합 프로세스

V8 트래커에서 병합 프로세스는 속성으로 동작합니다. 따라서 관련 Chrome 마일스톤에 'Merge-Request'를 설정하세요. 병합이 V8 [포트](https://v8.dev/docs/ports)에만 영향을 미치는 경우 HW 속성을 적절히 설정하세요. 예시:

```
Merge-Request: 123
HW: MIPS,LoongArch64
```

검토 후, 이는 검토 과정에서 아래와 같이 조정됩니다:

```
Merge: Approved-123
or
Merge: Rejected-123
```

CL이 적용된 이후, 다시 한 번 다음과 같이 조정됩니다:

```
Merge: Merged-123, Merged-12.3
```

## 커밋이 이미 병합/되돌려졌거나 캐나리 적용 범위를 갖는지 확인하는 방법

[chromiumdash](https://chromiumdash.appspot.com/commit/)를 사용하여 관련 CL이 캐나리 적용 범위를 갖고 있는지 확인하십시오.


상단 **Releases** 섹션에 캐나리가 표시되어야 합니다.

## 병합 CL 생성하는 방법

### 옵션 1: [gerrit](https://chromium-review.googlesource.com/) 사용 - 권장


1. 병합하려는 CL을 엽니다.
1. 확장 메뉴(오른쪽 상단의 세로 점 세 개)에서 "Cherry pick"을 선택합니다.
1. 대상 브랜치로 "refs/branch-heads/*XX.X*"를 입력합니다 (*XX.X*를 적절한 분기로 대체).
1. 커밋 메시지를 수정합니다:
   1. 제목 앞에 "Merged: "를 추가합니다.
   1. 원본 CL 관련 푸터에서 라인을 제거합니다 ("Change-Id", "Reviewed-on", "Reviewed-by", "Commit-Queue", "Cr-Commit-Position"). "(cherry picked from commit XXX)" 라인은 남겨둡니다. 이는 일부 도구에서 병합을 원본 CL과 연관시키는 데 필요합니다.
1. 병합 충돌이 발생했을 경우에도 CL을 생성하세요. 충돌을 해결하려면 (있다면) gerrit UI를 사용하거나 메뉴에서 "download patch" 명령을 사용하여 패치를 로컬로 쉽게 가져올 수 있습니다.
1. 검토를 위해 보내세요.

### 옵션 2: 자동화된 스크립트 사용

af3cf11 리비전을 브랜치 12.2에 병합한다고 가정합니다 (전체 git 해시를 명시하십시오 - 여기서는 간소화를 위해 약어를 사용합니다).

```
https://source.chromium.org/chromium/chromium/src/+/main:v8/tools/release/merge_to_branch_gerrit.py --branch 12.3 -r af3cf11
```


### 적용 후: [분기 워터폴](https://ci.chromium.org/p/v8)을 관찰하세요

패치 처리 후 빌더 중 하나가 녹색이 아닌 경우, 해당 병합을 즉시 되돌리세요. 10분 대기 후 봇(`AutoTagBot`)이 올바른 버전 관리 작업을 수행합니다.

## 캐나리/Dev에서 사용 중인 버전에 대한 패치

캐나리/Dev 버전을 패치해야 할 경우(자주 발생하지 않아야 함), 이슈에 vahl@ 또는 machenbach@를 cc하세요. Googlers는 CL을 생성하기 전에 [내부 사이트](http://g3doc/company/teams/v8/patching_a_version)를 확인하세요.

