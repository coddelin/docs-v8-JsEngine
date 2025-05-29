---
title: &apos;iOS용 크로스 컴파일&apos;
description: &apos;이 문서는 iOS용으로 V8을 크로스 컴파일하는 방법을 설명합니다.&apos;
---
이 페이지는 iOS 타겟용 V8 빌드를 간략히 소개합니다.

## 요구사항

- Xcode가 설치된 macOS (OS X) 호스트 머신.
- 64비트 타겟 iOS 디바이스 (기존 32비트 iOS 디바이스는 지원되지 않음).
- V8 v7.5 이상.
- iOS에서는 jitless가 필수 요구사항입니다 (2020년 12월 기준). 따라서 &apos;--expose_gc --jitless&apos; 플래그를 사용하십시오.

## 초기 설정

[V8 빌드 지침](/docs/build)을 따르십시오.

.gclient 구성 파일의 `target_os`를 추가하여 iOS 크로스 컴파일에 필요한 추가 도구를 가져옵니다. 이 파일은 `v8` 소스 디렉토리의 상위 디렉토리에 있습니다:

```python
# [... .gclient의 다른 내용 변수 예, &apos;solutions&apos; ...]
target_os = [&apos;ios&apos;]
```

.gclient를 업데이트한 후 `gclient sync`을 실행하여 추가 도구를 다운로드하십시오.

## 수동 빌드

이 섹션에서는 물리적 iOS 디바이스 또는 Xcode iOS 시뮬레이터에서 사용할 모놀리틱 V8 버전을 빌드하는 방법을 보여줍니다. 이 빌드의 결과물은 모든 V8 라이브러리와 V8 스냅샷이 포함된 `libv8_monolith.a` 파일입니다.

GN 빌드 파일을 설정하려면 `gn args out/release-ios`를 실행하고 다음 키를 삽입하십시오:

```python
ios_deployment_target = 10
is_component_build = false
is_debug = false
target_cpu = "arm64"                  # 시뮬레이터 빌드는 "x64"로 설정.
target_os = "ios"
use_custom_libcxx = false             # Xcode의 libcxx를 사용.
v8_enable_i18n_support = false        # 더 작은 바이너리 생성.
v8_monolithic = true                  # v8_monolith 타겟 활성화.
v8_use_external_startup_data = false  # 스냅샷이 바이너리에 포함됩니다.
v8_enable_pointer_compression = false # iOS에서 지원되지 않음.
```

이제 빌드하십시오:

```bash
ninja -C out/release-ios v8_monolith
```

마지막으로, 생성된 `libv8_monolith.a` 파일을 정적 라이브러리로 Xcode 프로젝트에 추가하십시오. 애플리케이션에 V8을 삽입하는 방법에 대한 추가 문서는 [V8 삽입 시작하기](/docs/embed)을 참조하십시오.
