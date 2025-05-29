---
title: "V8 릴리스 v9.2"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-07-16
tags: 
 - release
description: "V8 릴리스 v9.2는 `at` 메서드와 포인터 압축 개선 사항을 제공합니다."
tweet: ""
---
V8은 [릴리스 프로세스](https://v8.dev/docs/release-process)의 일환으로 6주마다 새로운 브랜치를 만듭니다. 각 버전은 크롬 베타 마일스톤 직전 V8의 Git master에서 분기됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 9.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.2)를 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 크롬 92 안정 버전과 함께 출시될 때까지 베타 상태로 유지됩니다. V8 v9.2는 다양한 개발자 친화적인 기능으로 가득합니다. 이 글은 릴리스를 기대하며 몇 가지 주요 기능을 미리 소개합니다.

<!--truncate-->
## 자바스크립트

### `at` 메서드

새로운 `at` 메서드는 이제 배열(Arrays), TypedArrays 및 문자열(Strings)에서 사용할 수 있습니다. 음수 값을 전달하면 인덱싱 가능한 항목의 끝에서 상대 인덱싱을 수행합니다. 양수 값을 전달하면 속성 접근과 동일하게 작동합니다. 예를 들어, `[1,2,3].at(-1)`은 `3`입니다. 더 자세한 내용은 [설명서](https://v8.dev/features/at-method)에서 확인하세요.

## 공유 포인터 압축 케이지

V8은 x64 및 arm64를 포함한 64비트 플랫폼에서 [포인터 압축](https://v8.dev/blog/pointer-compression)을 지원합니다. 이는 64비트 포인터를 두 부분으로 나누어 구현됩니다. 상위 32비트는 베이스로 간주될 수 있으며, 하위 32비트는 해당 베이스에 대한 인덱스로 간주될 수 있습니다.

```
            |----- 32 bits -----|----- 32 bits -----|
Pointer:    |________base_______|_______index_______|
```

현재, Isolate는 GC 힙 내에서 4GB의 가상 메모리 "케이지" 안에서 모든 할당을 수행하며, 이는 모든 포인터가 동일한 상위 32비트 베이스 주소를 가지도록 보장합니다. 베이스 주소가 일정하게 유지되면, 64비트 포인터는 32비트 인덱스만 사용하여 전달될 수 있습니다. 이는 전체 포인터를 재구성할 수 있기 때문입니다.

v9.2에서는 기본적으로 프로세스 내 모든 Isolate가 동일한 4GB 가상 메모리 케이지를 공유하도록 변경되었습니다. 이는 JS에서 실험적인 공유 메모리 기능을 프로토타이핑하기 위해 수행되었습니다. 각 워커 스레드가 자체 Isolate와 따라서 자체 4GB 가상 메모리 케이지를 가지고 있는 경우, 서로 다른 베이스 주소를 가지므로 Isolate 간 포인터를 전달할 수 없습니다. 이 변경은 워커를 시작할 때 가상 메모리 사용 압력을 줄이는 추가적인 이점이 있습니다.

이 변경의 단점은 프로세스 내 모든 스레드에 걸친 V8 힙 크기가 최대 4GB로 제한된다는 것입니다. 이는 프로세스당 다수의 스레드를 생성하는 서버 작업에서 바람직하지 않을 수 있으며, 이전보다 가상 메모리를 더 빨리 소모하게 됩니다. 삽입기는 GN 인수 `v8_enable_pointer_compression_shared_cage = false`를 사용하여 포인터 압축 케이지의 공유를 비활성화할 수 있습니다.

## V8 API

`git log branch-heads/9.1..branch-heads/9.2 include/v8.h`를 사용하여 API 변경 사항 목록을 확인하세요.

활성 상태의 V8 체크아웃이 있는 개발자는 새 기능을 실험하기 위해 `git checkout -b 9.2 -t branch-heads/9.2`를 사용할 수 있습니다. 또는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)을 구독하여 곧 새 기능을 직접 시도해 보세요.
