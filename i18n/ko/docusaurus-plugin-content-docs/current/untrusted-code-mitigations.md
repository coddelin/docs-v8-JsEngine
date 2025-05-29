---
title: '신뢰할 수 없는 코드 완화'
description: 'V8을 내장하여 신뢰할 수 없는 JavaScript 코드를 실행하는 경우, 투기적 부작용 공격으로부터 보호하기 위해 V8의 완화를 활성화하세요.'
---
2018년 초, Google의 Project Zero 연구자들은 [새로운 종류의 공격](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html)을 공개했으며, 이는 많은 CPU에서 사용되는 투기적 실행 최적화를 [악용](https://security.googleblog.com/2018/01/more-details-about-mitigations-for-cpu_4.html)합니다. V8은 TurboFan이라는 최적화된 JIT 컴파일러를 사용하여 JavaScript를 빠르게 실행하므로, 특정 상황에서 공개된 부작용 공격에 취약할 수 있습니다.

## 신뢰할 수 있는 코드만 실행한다면 아무것도 바뀌지 않습니다

귀하의 제품이 완전히 제어되는 JavaScript 또는 WebAssembly 코드만 실행하는 V8 내장을 사용하는 경우, 귀하의 V8 사용은 투기적 부작용 공격(SSCA) 취약점에 영향을 받지 않을 가능성이 높습니다. 신뢰할 수 있는 코드만 실행하는 Node.js 인스턴스는 영향을 받지 않는 예입니다.

이 취약점을 활용하려면 공격자는 주의 깊게 설계된 JavaScript 또는 WebAssembly 코드를 내장된 환경에서 실행해야 합니다. 개발자로서 내장된 V8 인스턴스에서 실행되는 코드에 대한 완전한 제어권을 갖고 있다면, 이는 매우 가능성이 낮습니다. 그러나 내장된 V8 인스턴스가 임의 또는 신뢰할 수 없는 JavaScript 또는 WebAssembly 코드를 다운로드하여 실행하도록 허용하거나, 완전히 제어할 수 없는 JavaScript 또는 WebAssembly 코드를 생성하고 이를 실행하도록 허용하는 경우(예: 컴파일 대상 코드로 사용하는 경우) 완화책을 고려해야 할 수 있습니다.

## 신뢰할 수 없는 코드를 실행하는 경우...

### 최신 V8로 업데이트하여 완화 효과를 얻고 완화를 활성화하세요

이 클래스의 공격에 대한 완화는 [V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1)부터 V8 자체에 제공되기 시작하므로 내장된 V8 복사본을 [v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1) 버전 이상으로 업데이트하는 것이 권장됩니다. FullCodeGen 및/또는 CrankShaft를 사용하는 V8 버전을 포함한 이전 버전의 V8에는 SSCA에 대한 완화가 없습니다.

[V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1)부터 SSCA 취약점에 대한 보호를 제공하기 위해 V8에 새로운 플래그 `--untrusted-code-mitigations`이 추가되었습니다. 이 플래그는 런타임 시 기본적으로 활성화되며 빌드 타임 GN 플래그인 `v8_untrusted_code_mitigations`을 통해 설정됩니다.

`--untrusted-code-mitigations` 런타임 플래그를 통해 이러한 완화가 활성화됩니다:

- WebAssembly 및 asm.js의 메모리 접근 전에 주소를 마스킹하여 투기적으로 실행되는 메모리 로드가 WebAssembly 및 asm.js 힙 외부의 메모리에 액세스할 수 없도록 보장합니다.
- 투기적으로 실행되는 경로에서 JavaScript 배열 및 문자열에 접근하기 위해 JIT 코드에서 사용된 인덱스를 마스킹하여, 투기적으로 로드된 배열 및 문자열로 JavaScript 코드에서 접근할 수 없는 메모리 주소로의 접근을 방지합니다.

내장자는 완화가 성능 저하를 수반할 수 있다는 점을 인지해야 합니다. 실제 영향은 작업 부하에 따라 크게 달라집니다. 속도계(Speedometer)와 같은 작업 부하에서는 영향이 미미하지만, 더 극단적인 계산 작업 부하에서는 최대 15%까지 영향을 미칠 수 있습니다. 내장된 V8 인스턴스가 실행하는 JavaScript 및 WebAssembly 코드에 완전히 신뢰를 한다면 런타임에서 플래그 `--no-untrusted-code-mitigations`을 지정하여 이러한 JIT 완화를 비활성화할 수 있습니다. `v8_untrusted_code_mitigations` GN 플래그는 빌드 시 완화를 활성화하거나 비활성화하는 데 사용할 수 있습니다.

V8은 Chromium이 사이트 격리를 사용하는 플랫폼과 같은 환경에서는 기본적으로 완화를 비활성화하여 프로세스 격리를 사용한다고 간주합니다.

### 신뢰할 수 없는 실행을 별도의 프로세스에서 샌드박싱하세요

신뢰할 수 없는 JavaScript 및 WebAssembly 코드를 민감한 데이터와 별도의 프로세스에서 실행하면 SSCA의 잠재적 영향이 크게 줄어듭니다. 프로세스 격리를 통해 SSCA 공격은 실행 중인 코드와 함께 동일한 프로세스 내에서 샌드박싱된 데이터만 관찰할 수 있으며, 다른 프로세스의 데이터는 관찰할 수 없습니다.

### 고정밀 타이머 제공을 조정하세요

고정밀 타이머는 SSCA 취약점에서 부작용 채널을 관찰하기 쉽게 만듭니다. 귀하의 제품이 신뢰할 수 없는 JavaScript 또는 WebAssembly 코드에 액세스할 수 있는 고정밀 타이머를 제공한다면, 이러한 타이머를 더 거칠게 하거나 지터를 추가하는 것을 고려하세요.
