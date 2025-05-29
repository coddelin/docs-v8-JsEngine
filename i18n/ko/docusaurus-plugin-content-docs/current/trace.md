---
title: "V8 추적하기"
description: "이 문서는 V8의 내장 추적 지원을 사용하는 방법을 설명합니다."
---
V8는 추적을 지원합니다. [Chrome 추적 시스템을 통해 Chrome에 V8가 포함되었을 때 자동으로 작동합니다](/docs/rcs). 하지만 독립형 V8이나 Default Platform을 사용하는 임베더 내부에서 이를 활성화할 수도 있습니다. 추적 뷰어에 대한 자세한 내용은 [여기](https://github.com/catapult-project/catapult/blob/master/tracing/README.md)를 참조하세요.

## `d8`에서의 추적

추적을 시작하려면 `--enable-tracing` 옵션을 사용하십시오. V8는 `v8_trace.json`을 생성하며, 이를 Chrome에서 열 수 있습니다. Chrome에서 열려면 `chrome://tracing`으로 이동하여 “Load”를 클릭한 다음 `v8_trace.json` 파일을 로드하세요.

각 추적 이벤트는 범주 세트와 연관되어 있습니다. 범주에 따라 추적 이벤트 기록을 활성화하거나 비활성화할 수 있습니다. 앞서 언급한 플래그만 사용하면 기본 범주(오버헤드가 낮은 범주의 집합)만 활성화됩니다. 더 많은 범주를 활성화하고 다양한 매개변수를 세부적으로 제어하려면 구성 파일을 전달해야 합니다.

다음은 구성 파일 `traceconfig.json`의 예입니다:

```json
{
  "record_mode": "record-continuously",
  "included_categories": ["v8", "disabled-by-default-v8.runtime_stats"]
}
```

`d8`을 추적과 구성 파일로 호출하는 예:

```bash
d8 --enable-tracing --trace-config=traceconfig.json
```

추적 구성 형식은 Chrome 추적과 호환됩니다. 그러나 포함된 범주 목록에서 정규 표현식을 지원하지 않으며, V8는 제외된 범주 목록이 필요하지 않으므로 V8의 추적 구성 파일을 Chrome 추적에 재사용할 수 있습니다. 하지만 추적 구성 파일에 정규 표현식이 포함된 경우 Chrome 추적 구성 파일을 V8 추적에서 재사용할 수 없으며, V8는 제외된 범주 목록을 무시합니다.

## 추적에서 런타임 호출 통계를 활성화하기

런타임 호출 통계 (<abbr>RCS</abbr>)를 얻으려면 다음 두 범주가 활성화된 상태로 추적을 기록하십시오: `v8` 및 `disabled-by-default-v8.runtime_stats`. 각 최상위 V8 추적 이벤트는 해당 이벤트 기간 동안의 런타임 통계를 포함합니다. `trace-viewer`에서 해당 이벤트를 선택하면 하단 패널에 런타임 통계 테이블이 표시됩니다. 여러 이벤트를 선택하면 통합된 뷰가 생성됩니다.

![](/_img/docs/trace/runtime-stats.png)

## 추적에서 GC 객체 통계를 활성화하기

추적에서 GC 객체 통계를 얻으려면 `disabled-by-default-v8.gc_stats` 범주를 활성화하고 다음 `--js-flags`를 사용하여 추적을 수집해야 합니다:

```
--track_gc_object_stats --noincremental-marking
```

`trace-viewer`에 추적을 로드한 후 `V8.GC_Object_Stats`라는 이름을 가진 슬라이스를 검색하십시오. 통계가 하단 패널에 나타납니다. 여러 슬라이스를 선택하면 통합된 뷰가 생성됩니다.

![](/_img/docs/trace/gc-stats.png)
