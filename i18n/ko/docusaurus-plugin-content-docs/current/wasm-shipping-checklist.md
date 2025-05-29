---
title: '웹어셈블리(WebAssembly) 기능의 스테이징 및 출시에 대한 체크리스트'
description: '이 문서는 V8에서 웹어셈블리(WebAssembly) 기능을 스테이징하고 출시에 대해 엔지니어링 요구사항 체크리스트를 제공합니다.'
---
이 문서는 V8에서 웹어셈블리 기능의 스테이징 및 출시에 대한 엔지니어링 요구사항 체크리스트를 제공합니다. 이 체크리스트는 가이드라인으로 작성되었으며 모든 기능에 적용될 수는 없습니다. 실제 출시 프로세스는 [V8 출시 프로세스](https://v8.dev/docs/feature-launch-process)에 설명되어 있습니다.

# 스테이징

## 웹어셈블리 기능을 스테이징하는 시점

웹어셈블리 기능의 [스테이징](https://docs.google.com/document/d/1ZgyNx7iLtRByBtbYi1GssWGefXXciLeADZBR_FxG-hE)은 구현 단계가 끝나는 시점을 정의합니다. 구현 단계는 다음 체크리스트가 완료되었을 때 완료됩니다:

- V8에서 구현이 완료되었습니다. 이는 다음을 포함합니다:
    - TurboFan에서 구현 (해당되는 경우)
    - Liftoff에서 구현 (해당되는 경우)
    - 인터프리터에서 구현 (해당되는 경우)
- V8에서 테스트가 가능합니다
- [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh)를 실행하여 V8에 사양 테스트를 롤링합니다
- 모든 기존 제안 사양 테스트가 통과합니다. 부족한 사양 테스트는 아쉽지만 스테이징을 막지는 않아야 합니다.

표준화 프로세스에서 기능 제안의 단계는 V8에서 기능을 스테이징하는 데 중요하지 않습니다. 그러나 제안은 대체로 안정적일 필요가 있습니다.

## 웹어셈블리 기능을 스테이징하는 방법

- [`src/wasm/wasm-feature-flags.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-feature-flags.h)에서 기능 플래그를 `FOREACH_WASM_EXPERIMENTAL_FEATURE_FLAG` 매크로 목록에서 `FOREACH_WASM_STAGING_FEATURE_FLAG` 매크로 목록으로 이동합니다.
- [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh)에서 제안 레포지토리 이름을 `repos` 목록 저장소에 추가합니다.
- [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh) 를 실행하여 새로운 제안의 사양 테스트를 생성하고 업로드합니다.
- [`test/wasm-spec-tests/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-spec-tests/testcfg.py)에서 제안 레포지토리 이름과 기능 플래그를 `proposal_flags` 목록에 추가합니다.
- [`test/wasm-js/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-js/testcfg.py)에서 제안 레포지토리 이름과 기능 플래그를 `proposal_flags` 목록에 추가합니다.

[타입 반영의 스테이징](https://crrev.com/c/1771791)을 참조로 확인하세요.

# 출시

## 웹어셈블리 기능을 출시할 준비가 되었는지 확인 시점

- [V8 출시 프로세스](https://v8.dev/docs/feature-launch-process)가 충족되었습니다.
- 구현이 퍼저(fuzzer)로 커버되었는지 확인합니다 (해당되는 경우).
- 기능이 몇 주 동안 스테이징되어 퍼저 커버리지를 받습니다.
- 기능 제안이 [4단계](https://github.com/WebAssembly/proposals)에 있습니다.
- 모든 [사양 테스트](https://github.com/WebAssembly/spec/tree/master/test)가 통과합니다.
- [Chromium DevTools의 새로운 웹어셈블리 기능 체크리스트](https://docs.google.com/document/d/1WbL-fGuLbbNr5-n_nRGo_ILqZFnh5ZjRSUcDTT3yI8s/preview)가 충족되었습니다.

## 웹어셈블리 기능을 출시하는 방법

- [`src/wasm/wasm-feature-flags.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/wasm/wasm-feature-flags.h) 에서 기능 플래그를 `FOREACH_WASM_STAGING_FEATURE_FLAG` 매크로 목록에서 `FOREACH_WASM_SHIPPED_FEATURE_FLAG` 매크로 목록으로 이동합니다.
    - 기능 활성화로 인해 발생한 [blink 웹 테스트](https://v8.dev/docs/blink-layout-tests) 실패를 확인하기 위해 CL에 blink CQ 봇을 추가해야 합니다 (CL 설명의 풋터에 이 줄을 추가합니다: `Cq-Include-Trybots: luci.v8.try:v8_linux_blink_rel`).
- 추가적으로, `FOREACH_WASM_SHIPPED_FEATURE_FLAG`에서 세 번째 매개변수를 `true`로 변경하여 기본적으로 기능을 활성화합니다.
- 두 번째 마일스톤 이후 기능 플래그를 제거하도록 알림을 설정합니다.
