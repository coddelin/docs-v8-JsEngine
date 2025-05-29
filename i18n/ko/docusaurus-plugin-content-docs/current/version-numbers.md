---
title: "V8의 버전 번호 체계"
description: "이 문서는 V8의 버전 번호 체계를 설명합니다."
---
V8의 버전 번호는 `x.y.z.w` 형태를 가지며, 여기서:

- `x.y`는 Chromium 마일스톤을 10으로 나눈 값입니다 (예: M60 → `6.0`)
- `z`는 새로운 [LKGR](https://www.chromium.org/chromium-os/developer-library/glossary/#acronyms)가 있을 때 자동으로 증가합니다 (보통 하루에 여러 번)
- `w`는 브랜치 포인트 이후 수동으로 병합된 패치로 인해 증가합니다

`w`가 `0`인 경우, 버전 번호에서 생략됩니다. 예를 들어 v5.9.211 (대신 “v5.9.211.0”)은 패치를 병합한 후 v5.9.211.1로 상승합니다.

## 어떤 V8 버전을 사용해야 할까?

V8 임베더는 일반적으로 *Chrome에 포함된 V8 최소 버전에 해당하는 브랜치의 최신 커밋*을 사용하는 것이 좋습니다.

### 최신 안정 Chrome에 해당하는 V8 최소 버전 찾기

이를 확인하려면,

1. https://chromiumdash.appspot.com/releases로 이동합니다.
2. 표에서 최신 안정 Chrome 버전을 찾습니다.
3. (i)를 클릭하고 `V8` 열을 확인합니다.


### 해당 브랜치의 최신 커밋 찾기

V8의 버전 관련 브랜치는 온라인 저장소 https://chromium.googlesource.com/v8/v8.git에 나타나지 않습니다; 대신 태그만 나타납니다. 해당 브랜치의 최신 커밋을 찾으려면, URL을 다음 형식으로 접속하십시오:

```
https://chromium.googlesource.com/v8/v8.git/+/branch-heads/<minor-version>
```

예: 위에서 찾은 V8 최소 버전 12.1의 경우 https://chromium.googlesource.com/v8/v8.git/+/branch-heads/12.1로 이동하여 “Version 12.1.285.2”라는 커밋을 찾습니다.

**주의:** 위의 V8 최소 버전에 해당하는 수치적으로 큰 태그를 단순히 찾으면 안 됩니다. 그런 태그는 때로는 지원되지 않으며, 예: 해당 버전이 결정되기 전에 태그가 지정되는 경우와 같습니다. 이러한 버전은 백포트나 유사한 지원을 받지 못합니다.

예: V8 태그 `5.9.212`, `5.9.213`, `5.9.214`, `5.9.214.1`, …, 및 `5.9.223`은 포기되었습니다, 이는 **브랜치 헤드**인 5.9.211.33보다 숫자가 더 크지만.

### 해당 브랜치의 최신 커밋 확인하기

이미 소스를 가지고 있다면, 최신 커밋을 직접 확인할 수 있습니다. 소스를 `depot_tools`를 사용하여 가져온 경우 아래 명령어를 실행할 수 있습니다:

```bash
git branch --remotes | grep branch-heads/
```

관련 브랜치를 나열합니다. 위에서 찾은 V8 최소 버전에 해당하는 브랜치를 체크아웃하여 사용하십시오. 최종적으로 확인된 태그가 임베더로서 적합한 V8 버전입니다.

`depot_tools`를 사용하지 않은 경우, `.git/config` 파일을 편집하여 `[remote "origin"]` 섹션에 아래 줄을 추가하십시오:

```
fetch = +refs/branch-heads/*:refs/remotes/branch-heads/*
```
