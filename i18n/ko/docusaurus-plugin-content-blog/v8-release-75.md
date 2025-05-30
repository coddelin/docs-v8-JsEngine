---
title: "V8 릴리스 v7.5"
author: "Dan Elphick, 더 이상 사용되지 않는 기능의 악몽"
avatars: 
  - "dan-elphick"
date: "2019-05-16 15:00:00"
tags: 
  - 릴리스
description: "V8 v7.5는 WebAssembly 컴파일 아티팩트의 암시적 캐싱, 대량 메모리 작업, JavaScript의 숫자 구분자 등 많은 기능을 제공합니다!"
tweet: "1129073370623086593"
---
매 6주마다 우리는 [릴리스 과정](/docs/release-process)의 일환으로 V8의 새로운 브랜치를 만듭니다. 각 버전은 Chrome Beta 이정표 직전에 V8의 Git master로부터 분기됩니다. 오늘 우리는 최신 브랜치인 [V8 버전 7.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.5)를 발표하게 되어 기쁩니다. 이 버전은 몇 주 후 Chrome 75 안정 버전과 함께 출시될 때까지 베타 단계에 있습니다. V8 v7.5는 개발자가 사용할 수 있는 여러 가지 유용한 기능으로 가득합니다. 이 게시물에서는 출시를 기대하며 몇 가지 주요 기능을 미리 살펴봅니다.

<!--truncate-->
## WebAssembly

### 암시적 캐싱

우리는 Chrome 75에서 WebAssembly 컴파일 아티팩트의 암시적 캐싱을 롤아웃할 예정입니다. 이는 사용자가 동일한 페이지를 두 번째 방문할 때 이미 본 WebAssembly 모듈을 다시 컴파일할 필요가 없음을 의미합니다. 대신 캐시에서 로드됩니다. 이는 [Chromium의 JavaScript 코드 캐시](/blog/code-caching-for-devs)와 유사하게 작동합니다.

V8 내에서 유사한 기능을 사용하고자 한다면, Chromium 구현으로부터 영감을 받으시기 바랍니다.

### 대량 메모리 작업

[대량 메모리 제안](https://github.com/webassembly/bulk-memory-operations)은 큰 메모리 영역이나 테이블을 업데이트하기 위한 새로운 명령어를 WebAssembly에 추가합니다.

`memory.copy`는 한 영역에서 다른 영역으로 데이터를 복사하며, 영역이 겹쳐 있어도 복사가 가능합니다(C의 `memmove`처럼). `memory.fill`은 특정 바이트로 영역을 채웁니다(C의 `memset`처럼). `memory.copy`와 유사하게, `table.copy`는 테이블의 한 영역에서 다른 영역으로 데이터를 복사합니다(영역이 겹쳐 있어도 동일).

```wasm
;; 소스 1000에서 목표 0으로 500바이트 복사.
(memory.copy (i32.const 0) (i32.const 1000) (i32.const 500))

;; 주소 100에서 시작하는 1000바이트를 `123` 값으로 채웁니다.
(memory.fill (i32.const 100) (i32.const 123) (i32.const 1000))

;; 소스 5에서 목표 15로 테이블 요소 10개 복사.
(table.copy (i32.const 15) (i32.const 5) (i32.const 10))
```

이 제안은 또한 상수 영역을 선형 메모리 또는 테이블에 복사하는 방법도 제공합니다. 이렇게 하려면 먼저 “수동” 세그먼트를 정의해야 합니다. “활성” 세그먼트와 달리, 이러한 세그먼트는 모듈 초기화 동안 초기화되지 않습니다. 대신 `memory.init` 및 `table.init` 명령어를 사용하여 메모리나 테이블 영역으로 복사할 수 있습니다.

```wasm
;; 수동 데이터 세그먼트 정의.
(data $hello passive "Hello WebAssembly")

;; 메모리 주소 10에 "Hello" 복사.
(memory.init (i32.const 10) (i32.const 0) (i32.const 5))

;; 메모리 주소 1000에 "WebAssembly" 복사.
(memory.init (i32.const 1000) (i32.const 6) (i32.const 11))
```

## JavaScript의 숫자 구분자

큰 숫자 리터럴은 눈으로 빠르게 구분하기 어려운데, 특히 반복되는 숫자가 많을 때 그렇습니다:

```js
1000000000000
   1019436871.42
```

가독성을 개선하기 위해 [새로운 JavaScript 언어 기능](/features/numeric-separators)은 숫자 리터럴에서 밑줄(_)을 구분자로 사용하는 것을 허용합니다. 따라서 위의 코드는 예를 들어, 천 단위로 숫자를 그룹화하여 다시 작성될 수 있습니다:

```js
1_000_000_000_000
    1_019_436_871.42
```

이제 첫 번째 숫자가 조(trillion)이고 두 번째 숫자가 약 10억(billion)임을 더 쉽게 알 수 있습니다.

숫자 구분자에 대한 추가 예제와 정보를 보려면 [우리의 설명서](/features/numeric-separators)를 참고하세요.

## 성능

### 네트워크에서 직접 스크립트 스트리밍

Chrome 75부터 V8은 네트워크에서 직접 스트리밍 파서로 스크립트를 스트리밍할 수 있어, Chrome 메인 스레드를 기다릴 필요가 없습니다.

이전 Chrome 버전에서는 스트리밍 파싱 및 컴파일이 있었지만, 네트워크에서 들어오는 스크립트 소스 데이터는 항상 먼저 Chrome 메인 스레드로 전달된 다음 스트리머로 전달되어야 했습니다(역사적 이유로). 이는 종종 스트리밍 파서가 이미 네트워크에서 도착한 데이터를 기다리고 있지만, 메인 스레드에서 HTML 파싱, 레이아웃, 기타 JavaScript 실행과 같은 다른 작업에 의해 차단되어 아직 스트리밍 작업에 전달되지 않은 경우가 있음을 의미합니다.

![Chrome 74 및 이전의 정지된 백그라운드 파싱 작업](/_img/v8-release-75/before.jpg)

Chrome 75에서는 네트워크 “데이터 파이프”를 V8에 직접 연결하여 스트리밍 파싱 동안 네트워크 데이터를 직접 읽을 수 있으며, 메인 스레드에 대한 의존성을 건너뜁니다.

![Chrome 75+에서는 메인 스레드의 활동에 의해 백그라운드 파싱 작업이 더 이상 차단되지 않습니다.](/_img/v8-release-75/after.jpg)

이는 스트리밍 컴파일을 더 빨리 완료할 수 있게 하여 스트리밍 컴파일을 사용하는 페이지의 로딩 시간을 개선하고, 동시에 실행 중인(하지만 멈춘) 스트리밍 파싱 작업의 수를 줄여 메모리 소비를 줄입니다.

## V8 API

`git log branch-heads/7.4..branch-heads/7.5 include/v8.h` 명령을 사용하여 API 변경 사항 목록을 확인하세요.

[활성 V8 체크아웃](/docs/source-code#using-git)을 가지고 있는 개발자는 `git checkout -b 7.5 -t branch-heads/7.5`를 사용하여 V8 v7.5의 새로운 기능을 실험해 볼 수 있습니다. 다른 방법으로는 [Chrome의 베타 채널](https://www.google.com/chrome/browser/beta.html)에 가입하여 곧 새 기능을 직접 체험해 볼 수 있습니다.
