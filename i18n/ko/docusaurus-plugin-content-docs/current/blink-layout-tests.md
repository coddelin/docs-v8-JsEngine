---
title: &apos;Blink 웹 테스트 (일명 레이아웃 테스트)&apos;
description: &apos;V8의 인프라는 통합 시 Chromium과의 문제를 방지하기 위해 지속적으로 Blink 웹 테스트를 실행합니다. 이 문서는 테스트 실패 시 어떻게 해야 하는지에 대해 설명합니다.&apos;
---
우리는 [Blink 웹 테스트 (이전에 “레이아웃 테스트”로 알려졌던 것)](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md)을 [통합 콘솔](https://ci.chromium.org/p/v8/g/integration/console)에서 지속적으로 실행하여 Chromium과의 통합 문제를 방지합니다.

테스트 실패 시, 봇은 V8 Tip-of-Tree와 Chromium에 고정된 V8 버전의 결과를 비교하여 새로 도입된 V8 문제만 표시합니다 (거짓 긍정률 < 5%). [Linux 릴리스](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Blink%20Linux) 봇이 모든 수정사항을 테스트하기 때문에 비난 할당이 간단합니다.

새로 도입된 실패를 가진 커밋은 일반적으로 Chromium으로 자동 롤링을 차단하기 위해 되돌려집니다. 레이아웃 테스트를 고장내거나 이러한 고장으로 인해 커밋이 되돌려진 경우, 변경 사항이 예상되는 경우 CL을 다시 (또는 수정) 적용하기 전에 아래 절차를 따라 Chromium에 업데이트된 기준을 추가하십시오:

1. 변경된 테스트에 대해 `[ Failure Pass ]`로 설정된 Chromium 변경 사항을 적용하십시오 ([자세히](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#updating-the-expectations-files)).
1. V8 CL을 적용하고 Chromium에서 순환될 때까지 1~2일을 기다리십시오.
1. [이 지침](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md#Rebaselining-Web-Tests)을 따라 수동으로 새 기준을 생성하십시오. Chromium 변경만 하는 경우, [선호되는 자동 절차](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#how-to-rebaseline)가 적합합니다.
1. 테스트 기대 파일에서 `[ Failure Pass ]` 항목을 제거하고 새 기준과 함께 이를 Chromium에 커밋하십시오.

모든 CL에 `Bug: …` 푸터를 적용해 주세요.
