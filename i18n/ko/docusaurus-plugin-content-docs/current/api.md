---
title: &apos;V8의 공용 API&apos;
description: &apos;이 문서는 V8의 공용 API 안정성과 개발자가 이를 변경하는 방법에 대해 논의합니다.&apos;
---
이 문서는 V8의 공용 API 안정성과 개발자가 이를 변경하는 방법에 대해 논의합니다.

## API 안정성

Chromium 카나리아에서 V8이 불안정한 것으로 판명되면 이전 카나리아 버전의 V8로 롤백됩니다. 따라서 V8의 API를 한 카나리아 버전에서 다음 버전으로 호환 가능하게 유지하는 것이 중요합니다.

우리는 API 안정성 위반을 감지하는 [봇](https://ci.chromium.org/p/v8/builders/luci.v8.ci/Linux%20V8%20API%20Stability)을 지속적으로 실행합니다. 이 봇은 Chromium의 HEAD를 V8의 [현재 카나리아 버전](https://chromium.googlesource.com/v8/v8/+/refs/heads/canary)으로 컴파일합니다.

현재 이 봇의 오류는 참고용으로만 사용되며 따로 조치를 취할 필요는 없습니다. 롤백의 경우 책임 리스트를 사용하여 종속 CL을 쉽게 확인할 수 있습니다.

이 봇을 손상시키면 다음 번 V8 변경과 종속 Chromium 변경 사이의 시간을 늘리도록 유의하십시오.

## V8의 공용 API를 변경하는 방법

V8은 Chrome, Node.js, gjstest 등 다양한 임베더에서 사용됩니다. V8의 공용 API를 변경할 때(기본적으로 `include/` 디렉토리 아래 파일), 임베더가 새로운 V8 버전으로 원활하게 업데이트할 수 있도록 보장해야 합니다. 특히, 임베더가 새로운 V8 버전으로 업데이트하고 새 API에 맞게 코드를 한 번에 변경할 수 있다고 가정할 수 없습니다.

임베더는 이전 V8 버전을 사용하면서 새 API에 맞게 코드를 조정할 수 있어야 합니다. 아래의 모든 지침은 이 규칙에서 따릅니다.

- 새로운 타입, 상수, 함수를 추가하는 것은 안전하지만, 한 가지 주의할 점은 기존 클래스에 새로운 순수 가상 함수를 추가하지 말아야 한다는 것입니다. 새로운 가상 함수는 기본 구현을 가져야 합니다.
- 기본값을 가진 매개변수를 함수에 추가하는 것은 안전합니다.
- 타입, 상수, 함수를 제거하거나 이름을 변경하는 것은 안전하지 않습니다. [`V8_DEPRECATED`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=395&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde) 및 [`V8_DEPRECATE_SOON`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=403&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde) 매크로를 사용하세요. 이 매크로는 임베더가 사용 중단된 메서드를 호출할 때 컴파일 경고를 발생시킵니다. 예를 들어 함수 `foo`를 함수 `bar`로 이름을 변경하려고 한다고 가정합니다. 그러면 다음을 수행해야 합니다:
    - 새로운 함수 `bar`를 기존 함수 `foo` 근처에 추가합니다.
    - 변경 내용(CL)이 Chrome에 반영될 때까지 기다립니다. Chrome을 조정하여 `bar`를 사용합니다.
    - `foo`에 `V8_DEPRECATED("Use bar instead") void foo();`를 주석으로 달아줍니다.
    - 같은 CL에서 `foo`를 사용하는 테스트를 조정하여 `bar`를 사용하도록 합니다.
    - 변경 동기와 고수준 업데이트 지침을 CL에 작성합니다.
    - 다음 V8 브랜치가 나올 때까지 기다립니다.
    - 함수 `foo`를 제거합니다.

    `V8_DEPRECATE_SOON`은 `V8_DEPRECATED`보다 더 부드러운 버전입니다. Chrome이 이로 인해 중단되지 않으므로 단계 b가 필요하지 않습니다. 그러나 `V8_DEPRECATE_SOON`만으로는 함수를 제거하기에 충분하지 않습니다.

    여전히 `V8_DEPRECATED` 주석을 추가하고, 다음 브랜치를 기다려야 함수를 제거할 수 있습니다.

    `V8_DEPRECATED`는 `v8_deprecation_warnings` GN 플래그를 사용하여 테스트할 수 있습니다.
    `V8_DEPRECATE_SOON`은 `v8_imminent_deprecation_warnings`를 사용하여 테스트할 수 있습니다.

- 함수 시그니처를 변경하는 것은 안전하지 않습니다. 위에서 설명한 대로 `V8_DEPRECATED` 및 `V8_DEPRECATE_SOON` 매크로를 사용하세요.

우리는 각 V8 버전에 대한 [중요한 API 변경 사항을 언급하는 문서](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)를 유지하고 있습니다.

정기적으로 업데이트되는 [도큐먼트화된 API 문서](https://v8.dev/api)도 있습니다.
