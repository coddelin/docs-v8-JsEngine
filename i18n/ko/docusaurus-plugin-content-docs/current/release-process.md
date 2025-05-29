---
title: '릴리스 프로세스'
description: '이 문서는 V8 릴리스 프로세스를 설명합니다.'
---
V8 릴리스 프로세스는 [Chrome](https://www.chromium.org/getting-involved/dev-channel)과 긴밀히 연결되어 있습니다. V8 팀은 Chrome의 모든 네 가지 릴리스 채널을 사용하여 사용자에게 새로운 버전을 배포합니다.

Chrome 릴리스에 어떤 V8 버전이 포함되어 있는지 확인하고 싶다면 [Chromiumdash](https://chromiumdash.appspot.com/releases)를 확인할 수 있습니다. 각 Chrome 릴리스마다 V8 저장소에 별도의 브랜치가 생성되어 [Chrome M121](https://chromium.googlesource.com/v8/v8/+log/refs/branch-heads/12.1)처럼 추적이 더 쉬워집니다.

## Canary 릴리스

매일 새로운 Canary 빌드가 [Chrome의 Canary 채널](https://www.google.com/chrome/browser/canary.html?platform=win64)을 통해 사용자에게 배포됩니다. 일반적으로 전달물은 [main](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main)의 최신 안정 버전입니다.

Canary를 위한 브랜치는 보통 다음과 같습니다:

## Dev 릴리스

매주 새로운 Dev 빌드가 [Chrome의 Dev 채널](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel&platform=win64)을 통해 사용자에게 배포됩니다. 일반적으로 전달물에는 Canary 채널에서의 최신 안정화된 V8 버전이 포함됩니다.


## Beta 릴리스

대략 2주마다 새로운 주요 브랜치가 생성됩니다. 예를 들어 [Chrome 94](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4)를 위한 브랜치입니다. 이는 [Chrome의 Beta 채널](https://www.google.com/chrome/browser/beta.html?platform=win64) 생성과 동기화되어 발생합니다. Chrome Beta는 V8 브랜치 머리에 고정됩니다. 약 2주 후 브랜치는 Stable로 승격됩니다.

변경 사항은 버전을 안정화하기 위해서만 브랜치에 Cherry-pick됩니다.

Beta를 위한 브랜치는 일반적으로 다음과 같습니다:

```
refs/branch-heads/12.1
```

이는 Canary 브랜치를 기반으로 합니다.

## Stable 릴리스

대략 4주마다 새로운 주요 Stable 릴리스가 진행됩니다. 특별한 브랜치가 생성되지 않고 최신 Beta 브랜치가 Stable로 승격됩니다. 이 버전은 [Chrome의 Stable 채널](https://www.google.com/chrome/browser/desktop/index.html?platform=win64)을 통해 사용자에게 배포됩니다.

Stable 릴리스를 위한 브랜치는 일반적으로 다음과 같습니다:

```
refs/branch-heads/12.1
```

이는 승격(재사용)된 Beta 브랜치입니다.

## API

Chromiumdash는 동일한 정보를 수집하기 위한 API도 제공합니다:

```
https://chromiumdash.appspot.com/fetch_milestones (V8 브랜치 이름 가져오기 예: refs/branch-heads/12.1)
https://chromiumdash.appspot.com/fetch_releases (V8 브랜치 Git 해시 가져오기)
```

다음 매개변수가 유용합니다:
mstone=121
channel=Stable,Canary,Beta,Dev
platform=Mac,Windows,Lacros,Linux,Android,Webview,etc.

## 내 애플리케이션에 어떤 버전을 포함해야 할까요?

Chrome Stable 채널이 사용하는 동일 브랜치의 최신 버전을 사용하세요.

중요한 버그 수정을 Stable 브랜치에 백머지하는 경우가 많기 때문에 안정성, 보안, 정확성에 관심이 있다면 그러한 업데이트도 포함되어야 합니다. 이러한 이유로 특정 버전이 아닌 브랜치의 최신 버전을 권장합니다.

새로운 브랜치가 Stable로 승격되면 이전 Stable 브랜치의 유지는 중단됩니다. 이는 매 4주마다 발생하므로 최소한 이 빈도로 업데이트할 준비가 되어 있어야 합니다.

**관련 문서:** [어떤 V8 버전을 사용해야 하나요?](/docs/version-numbers#which-v8-version-should-i-use%3F)
