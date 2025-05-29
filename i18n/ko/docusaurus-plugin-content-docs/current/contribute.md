---
title: &apos;V8에 기여하기&apos;
description: &apos;이 문서는 V8에 기여하는 방법을 설명합니다.&apos;
---
이 페이지의 정보는 V8에 기여하는 방법을 설명합니다. 기여를 보내기 전에 꼭 전체 내용을 읽어보십시오.

## 코드 가져오기

[V8 소스 코드 확인](/docs/source-code)을 참조하십시오.

## 기여하기 전에

### V8 메일링 리스트에서 안내 요청

큰 규모의 V8 기여 작업을 시작하기 전에, 먼저 [V8 기여자 메일링 리스트](https://groups.google.com/group/v8-dev)를 통해 저희와 연락을 취하십시오. 이렇게 하면 도움을 주고 가능하면 안내를 제공할 수도 있습니다. 사전에 조율하면 나중에 좌절을 피하기가 훨씬 쉽습니다.

### CLA 서명하기

저희가 귀하의 코드를 사용할 수 있으려면 [Google 개인 기여자 라이선스 계약(Google Individual Contributor License Agreement)](https://cla.developers.google.com/about/google-individual)에 서명해야 합니다. 이 작업은 온라인에서 할 수 있습니다. 이는 주로 귀하가 변동 사항에 대한 저작권을 소유하게 되고, 귀하의 기여가 코드베이스의 일부가 된 이후에도 저희가 귀하의 코드를 사용하고 배포할 수 있도록 허락을 받아야 하기 때문입니다. 또한 귀하의 코드가 다른 사람들의 특허를 침해한다는 것을 알고 있을 경우 저희에게 알려야 한다는 점 등 다양한 사항들을 확실히 해야 합니다. 귀하의 코드가 리뷰를 제출하고 회원이 승인한 이후까지는 이 작업을 하지 않아도 되지만, 코드베이스로 귀하의 코드를 추가하기 전에 반드시 완료해야 합니다.

회사에서 이루어진 기여는 위와 다른 계약, 즉 [소프트웨어 허가 및 회사 기여자 라이선스 계약(Software Grant and Corporate Contributor License Agreement)](https://cla.developers.google.com/about/google-corporate)에 의해 보호됩니다.

[여기](https://cla.developers.google.com/)에서 온라인으로 서명하십시오.

## 코드 제출하기

V8의 소스 코드는 [Google C++ 스타일 가이드](https://google.github.io/styleguide/cppguide.html)를 따르므로 해당 가이드라인을 숙지해야 합니다. 코드를 제출하기 전에 모든 [테스트](/docs/test)를 통과하고, 사전 제출 검사를 성공적으로 실행해야 합니다:

```bash
git cl presubmit
```

사전 제출 스크립트는 Google의 린터인 [`cpplint.py`](https://raw.githubusercontent.com/google/styleguide/gh-pages/cpplint/cpplint.py)를 사용합니다. 이는 [`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools)의 일부이며, `PATH`에 있어야 합니다. `depot_tools`가 `PATH`에 있다면 모든 것이 잘 작동할 것입니다.

### V8 코드 리뷰 도구에 업로드

프로젝트 멤버의 제출물을 포함한 모든 제출물은 리뷰를 필요로 합니다. 저희는 Chromium 프로젝트와 동일한 코드 리뷰 도구와 프로세스를 사용합니다. 패치를 제출하려면 [`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools)를 받고, [리뷰 요청](https://chromium.googlesource.com/chromium/src/+/master/docs/contributing.md) 지침을 따라야 합니다(Chromium 작업 공간 대신 V8 작업 공간을 사용하십시오).

### 중단 또는 회귀 사항을 주의하십시오

코드 리뷰 승인을 받으면 커밋 대기열을 사용하여 패치를 적용할 수 있습니다. 커밋 대기열은 여러 테스트를 실행하고 모든 테스트에 통과하면 패치를 커밋합니다. 귀하의 변경 내용이 커밋된 후, 봇이 변경 사항 이후에 녹색 상태가 될 때까지 [콘솔](https://ci.chromium.org/p/v8/g/main/console)을 확인하는 것이 좋습니다. 콘솔은 커밋 대기열보다 더 많은 테스트를 실행합니다.
