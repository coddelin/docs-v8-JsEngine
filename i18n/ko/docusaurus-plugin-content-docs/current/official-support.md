---
title: &apos;공식적으로 지원되는 구성&apos;
description: &apos;이 문서는 V8 팀이 유지 관리하는 빌드 구성을 설명합니다.&apos;
---
V8는 운영 체제, 그 버전, 아키텍처 포트, 빌드 플래그 등을 포함하여 다양한 빌드 구성을 지원합니다.

일반적인 규칙: 지원되는 경우, [지속적인 통합 콘솔](https://ci.chromium.org/p/v8/g/main/console) 중 하나에서 봇이 실행되고 있습니다.

몇 가지 세부사항:

- 가장 중요한 빌더에서 발생하는 파손은 코드 제출을 차단합니다. 트리 셰리프가 보통 문제를 일으킨 코드를 되돌립니다.
- 거의 동일한 [빌더 세트](https://chromium.googlesource.com/infra/infra/+/main/infra/services/lkgr_finder/config/v8_cfg.pyl)에서의 파손은 Chromium으로의 지속적인 롤을 방해합니다.
- 일부 아키텍처 포트는 [외부에서 처리됩니다](/docs/ports).
- 일부 구성은 [실험적](https://ci.chromium.org/p/v8/g/experiments/console)입니다. 파손이 허용되며 구성 소유자가 이를 처리합니다.

위의 봇 중 하나에 의해 다루어지지 않는 구성에서 문제가 발생하는 경우:

- 문제를 해결하는 CL을 자유롭게 제출하세요. 팀이 코드 검토를 지원할 것입니다.
- 문제에 대해 논의하기 위해 v8-dev@googlegroups.com을 사용할 수 있습니다.
- 우리가 이 구성을 지원해야 한다고 생각한다면(아마도 테스트 매트릭스에 누락된 부분이 있을까요?), [V8 이슈 트래커](https://bugs.chromium.org/p/v8/issues/entry)에 버그를 제기하고 요청해 주세요.

그러나 모든 가능한 구성을 지원할 여유는 없습니다.
