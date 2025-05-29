---
title: 'JavaScript/웹어셈블리 언어 기능 구현 및 배포'
description: '이 문서는 V8에서 JavaScript 또는 WebAssembly 언어 기능을 구현하고 배포하는 과정을 설명합니다.'
---
일반적으로 V8은 이미 정의된 합의 기반 표준에 대한 [Blink 의도 프로세스](https://www.chromium.org/blink/launching-features/#process-existing-standard)를 JavaScript 및 WebAssembly 언어 기능에 대해 따릅니다. V8 특정 사항은 아래에 설명되어 있습니다. 의도 프로세스를 따르되, 예외가 있는 경우 해당 사항에 따라 행동하십시오.

JavaScript 기능에 대한 질문이 있으면 [syg@chromium.org](mailto:syg@chromium.org) 및 v8-dev@googlegroups.com으로 이메일을 보내십시오.

WebAssembly 기능에 대한 질문은 [gdeepti@chromium.org](mailto:gdeepti@chromium.org) 및 v8-dev@googlegroups.com으로 이메일을 보내십시오.

## 예외사항

### JavaScript 기능은 일반적으로 3단계 이상에서 대기합니다.

일반적인 규칙으로 V8은 [TC39에서 3단계 이상](https://tc39.es/process-document/)으로 진척될 때까지 JavaScript 기능 제안을 구현하지 않습니다. TC39에는 자체 합의 프로세스가 있으며, 3단계 이상은 브라우저 공급업체를 포함한 모든 TC39 대리인들 간에 명시적인 합의가 이루어졌음을 나타냅니다. 이 외부 합의 프로세스는 3단계 이상의 기능이 구현 의도 이메일을 보내지 않아도 됨을 의미합니다, 단 Intent to Ship(배포 의도) 이메일은 제외입니다.

### TAG 리뷰

소규모 JavaScript 또는 WebAssembly 기능에 대해서는 TC39와 Wasm CG에서 이미 상당한 기술 감사를 제공하기 때문에 TAG 리뷰가 필요하지 않습니다. 기능이 대규모이거나 웹 플랫폼 API 또는 Chromium을 수정해야 하는 경우처럼 횡단적인 경우에는 TAG 리뷰가 권장됩니다.

### V8 및 blink 플래그가 모두 필요합니다.

기능을 구현할 때는 V8 플래그와 blink `base::Feature`를 모두 사용하는 것이 필요합니다.

Blink 기능은 Chrome이 비상 상황에서 새로운 바이너리를 배포하지 않고도 기능을 비활성화할 수 있도록 합니다. 이는 일반적으로 [`gin/gin_features.h`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.h), [`gin/gin_features.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.cc), 그리고 [`gin/v8_initializer.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/v8_initializer.cc)에서 구현됩니다.

### 퍼징(fuzzing)은 배포 전에 필수입니다.

JavaScript 및 WebAssembly 기능은 모든 퍼징 버그가 수정된 상태에서 최소 4주간 또는 1개의 릴리스 마일스톤 동안 퍼징 테스트를 진행한 다음에야 배포할 수 있습니다.

코드가 완성된 JavaScript 기능의 경우, [`src/flags/flag-definitions.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/flags/flag-definitions.h)의 `JAVASCRIPT_STAGED_FEATURES_BASE` 매크로로 기능 플래그를 이동하여 퍼징을 시작합니다.

WebAssembly에 대해서는 [WebAssembly 배포 체크리스트](/docs/wasm-shipping-checklist)를 참조하십시오.

### [Chromestatus](https://chromestatus.com/) 및 리뷰 게이트

blink 의도 프로세스에는 API 소유자의 승인을 요청하기 위해 배포 의도(Intents to Ship)를 보내기 전에 [Chromestatus](https://chromestatus.com/)에 있는 기능 항목에 대해 승인되어야 하는 일련의 리뷰 게이트가 포함됩니다.

이 게이트는 웹 API에 맞춰 조정되어 있으며 JavaScript 및 WebAssembly 기능에는 일부 게이트가 적용되지 않을 수 있습니다. 아래는 대략적인 가이드라인입니다. 세부 사항은 기능마다 다르므로 가이드를 맹목적으로 적용하지 마십시오!

#### 개인 정보

대부분의 JavaScript 및 WebAssembly 기능은 개인 정보에 영향을 미치지 않습니다. 드물게 기능이 사용자 운영 체제나 하드웨어에 대한 정보를 공개하는 새로운 지문 식별 벡터를 추가할 수 있습니다.

#### 보안

JavaScript와 WebAssembly는 보안 취약점에서 일반적인 공격 벡터이지만 대부분의 새로운 기능은 추가 공격 표면을 생성하지 않습니다. [퍼징](#fuzzing)은 필수이며 일부 위험을 완화합니다.

JavaScript에서 `ArrayBuffer`와 같이 인기 있는 공격 벡터에 영향을 미치는 기능 및 사이트 채널 공격을 가능하게 할 수 있는 기능은 추가 검토가 필요하며 반드시 리뷰를 받아야 합니다.

#### 엔터프라이즈

JavaScript와 WebAssembly 기능은 TC39와 Wasm CG에서 표준화 과정 전반에 걸쳐 이미 철저한 후방 호환성 검토를 받습니다. 기능이 의도적으로 후방 호환성을 없애는 경우는 매우 드뭅니다.

JavaScript의 경우, 최근에 배포된 기능은 `chrome://flags/#disable-javascript-harmony-shipping`을 통해 비활성화될 수 있습니다.

#### 디버깅 가능성

JavaScript 및 WebAssembly 기능의 디버깅 가능성은 기능마다 상당히 다릅니다. 새 내장 메서드만 추가하는 JavaScript 기능은 추가적인 디버거 지원이 필요하지 않지만, 새로운 역량을 추가하는 WebAssembly 기능은 상당한 추가 디버거 지원이 필요할 수 있습니다.

자세한 내용은 [JavaScript 기능 디버깅 체크리스트](https://docs.google.com/document/d/1_DBgJ9eowJJwZYtY6HdiyrizzWzwXVkG5Kt8s3TccYE/edit#heading=h.u5lyedo73aa9)와 [WebAssembly 기능 디버깅 체크리스트](https://goo.gle/devtools-wasm-checklist)를 참조하십시오.

의심스러울 때는 이 게이트를 적용할 수 있습니다.

#### 테스트

WPT 대신 JavaScript 기능에는 Test262 테스트가 충분하며, WebAssembly 기능에는 WebAssembly 규격 테스트가 충분합니다.

Web Platform Tests(WPT)를 추가할 필요는 없습니다. JavaScript와 WebAssembly 언어 기능은 자체 상호 운용 가능한 테스트 저장소를 가지고 있으며, 여러 구현체에서 이를 실행합니다. 필요하다고 생각되면 추가해도 괜찮습니다.

JavaScript 기능에 대해서는 [Test262](https://github.com/tc39/test262)의 명시적 정확성 테스트가 필요합니다. [staging 디렉토리](https://github.com/tc39/test262/blob/main/CONTRIBUTING.md#staging)의 테스트가 충분하다는 점을 참고하세요.

WebAssembly 기능에 대해서는 [WebAssembly Spec Test repo](https://github.com/WebAssembly/spec/tree/master/test)의 명시적 정확성 테스트가 필요합니다.

성능 테스트의 경우, JavaScript는 이미 Speedometer와 같은 기존 성능 벤치마크의 대부분을 기반으로 하고 있습니다.

### CC할 대상

**모든** “`intent to $something`” 이메일(예: “intent to implement”)에는 v8-users@googlegroups.com를 추가적으로 CC하여야 하며 blink-dev@chromium.org도 포함해야 합니다. 이렇게 하면 V8의 다른 임베더들도 정보를 공유받을 수 있습니다.

### 스펙 저장소 링크

Blink Intent 프로세스는 설명서를 요구합니다. 새로운 문서를 작성하는 대신, 해당 스펙 저장소에 대한 링크를 제공해도 됩니다 (예: [`import.meta`](https://github.com/tc39/proposal-import-meta)).
