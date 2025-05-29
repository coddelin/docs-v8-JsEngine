---
title: "Node.js에서의 해시 플러딩 취약점에 대해…"
author: "Yang Guo ([@hashseed](https://twitter.com/hashseed))"
avatars: 
  - "yang-guo"
date: "2017-08-11 13:33:37"
tags: 
  - security
description: "Node.js는 해시 플러딩 취약점에 직면했습니다. 이 게시물에서는 해당 취약점의 배경과 V8에서의 해결 방법을 설명합니다."
---
올해 7월 초, Node.js는 해시 플러딩 취약점을 해결하기 위해 현재 유지되고 있는 모든 브랜치에 대해 [보안 업데이트](https://nodejs.org/en/blog/vulnerability/july-2017-security-releases/)를 발표했습니다. 이 중간 수정은 상당한 시작 성능 저하를 대가로 합니다. 한편, V8은 성능 페널티를 피하는 해결책을 구현했습니다.

<!--truncate-->
이 게시물에서는 취약점과 최종 해결책에 대한 배경 및 역사를 제공하고자 합니다.

## 해시 플러딩 공격

해시 테이블은 컴퓨터 과학에서 가장 중요한 데이터 구조 중 하나입니다. 예를 들어, V8에서 객체의 속성을 저장하는 데 널리 사용됩니다. 평균적으로 새로운 항목을 삽입하는 것은 [𝒪(1)](https://en.wikipedia.org/wiki/Big_O_notation)에서 매우 효율적입니다. 그러나 해시 충돌은 𝒪(n)의 최악의 경우를 초래할 수 있습니다. 즉, n개의 항목을 삽입하는 데 최대 𝒪(n²)의 시간이 걸릴 수 있습니다.

Node.js에서는 [HTTP 헤더](https://nodejs.org/api/http.html#http_response_getheaders)가 JavaScript 객체로 표현됩니다. 헤더 이름과 값 쌍은 객체 속성으로 저장됩니다. 교묘하게 준비된 HTTP 요청을 통해 공격자는 서비스 거부(DoS) 공격을 수행할 수 있습니다. Node.js 프로세스는 최악의 해시 테이블 삽입으로 인해 응답하지 않게 됩니다.

이 공격은 [2011년 12월](https://events.ccc.de/congress/2011/Fahrplan/events/4680.en.html) 초기에 이미 공개되었으며, 넓은 범위의 프로그래밍 언어에 영향을 미치는 것으로 나타났습니다. 그렇다면 V8과 Node.js가 이 문제를 해결하는 데 왜 이렇게 오랜 시간이 걸렸을까요?

사실 공개된 직후, V8 엔지니어들은 Node.js 커뮤니티와 함께 [대책](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40)을 마련했습니다. Node.js v0.11.8 버전부터 이 문제가 해결되었습니다. 수정 사항은 소위 _해시 시드 값_을 도입했습니다. 해시 시드는 시작 시 무작위로 선택되며 특정 V8 인스턴스의 모든 해시 값에 시드로 사용됩니다. 해시 시드를 알지 못하면 공격자가 최악의 경우를 만드는 것은 물론이고 모든 Node.js 인스턴스를 대상으로 하는 공격을 설계하는 것도 어렵습니다.

수정 사항의 [커밋](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40) 메시지의 일부 내용은 다음과 같습니다:

> 이 버전은 V8을 직접 컴파일하는 사용자나 스냅샷을 사용하지 않는 사용자만 문제를 해결합니다. 스냅샷 기반으로 미리 컴파일된 V8은 여전히 예측 가능한 문자열 해시 코드를 가집니다.

이 버전은 V8을 직접 컴파일하는 사용자나 스냅샷을 사용하지 않는 사용자만 문제를 해결합니다. 스냅샷 기반으로 미리 컴파일된 V8은 여전히 예측 가능한 문자열 해시 코드를 가집니다.

## 시작 스냅샷

시작 스냅샷은 V8에서 엔진 시작과 새 컨텍스트 생성(예: Node.js의 [vm 모듈](https://nodejs.org/api/vm.html)을 통해)을 극적으로 가속화하기 위한 메커니즘입니다. 초기 객체와 내부 데이터 구조를 처음부터 설정하는 대신 V8은 기존 스냅샷에서 역직렬화합니다. 최신 버전의 V8 빌드는 스냅샷을 사용해 3ms 미만의 시간에 시작되며, 새로운 컨텍스트를 생성하는 데 1ms의 일부만 걸립니다. 스냅샷이 없으면 시작에는 200ms 이상이 걸리고, 새로운 컨텍스트를 생성하는 데는 10ms 이상이 소요됩니다. 이는 두 배 이상의 차이입니다.

이전에 작성된 게시물에서 [시작 스냅샷](보기)에 대해 다뤘습니다.

미리 빌드된 스냅샷에는 해시 테이블 및 기타 해시 값 기반 데이터 구조가 포함됩니다. 스냅샷에서 초기화된 이후에는 해시 시드를 변경하면 이러한 데이터 구조가 손상됩니다. 스냅샷을 포함한 Node.js 릴리스는 고정된 해시 시드를 가지며, 이는 대책을 비효과적으로 만듭니다.

이것이 커밋 메시지에서 명시적으로 경고한 이유입니다.

## 거의 해결되었지만 완벽하지 않다

2015년으로 넘어가, 새 컨텍스트 생성을 수행할 때 성능이 저하되었다는 내용을 담은 Node.js [이슈](https://github.com/nodejs/node/issues/1631)가 보고되었습니다. 이는 예측대로 대책의 일부로 시작 스냅샷이 비활성화된 것이 원인입니다. 하지만 그 당시에는 논의에 참여한 모든 사람들이 [이유](https://github.com/nodejs/node/issues/528#issuecomment-71009086)를 알고 있는 것은 아니었습니다.

이 [게시물](/blog/math-random)에서 설명했듯이, V8은 Math.random 결과를 생성하기 위해 유사 난수 생성기를 사용합니다. 모든 V8 컨텍스트는 무작위 상태의 복사본을 개별적으로 보유합니다. 이는 Math.random 결과가 컨텍스트 간에 예측 가능한 것을 방지하기 위함입니다.

무작위 숫자 생성기의 상태는 컨텍스트가 생성되자마자 외부 소스에서 시드됩니다. 컨텍스트가 처음부터 생성되었는지 또는 스냅샷에서 역직렬화되었는지는 중요하지 않습니다.

어떻게든 무작위 숫자 생성기 상태가 [해시 시드](https://github.com/nodejs/node/issues/1631#issuecomment-100044148)와 혼동된 것 같습니다. 그 결과 [io.js v2.0.2](https://github.com/nodejs/node/pull/1679) 이후부터는 사전에 빌드된 스냅샷이 공식 릴리스의 일부가 되었습니다.

## 두 번째 시도

2017년 5월, V8, [구글 Project Zero](https://googleprojectzero.blogspot.com/), 그리고 구글 클라우드 플랫폼 간의 내부 논의 중에 Node.js가 여전히 해시 플러딩 공격에 취약하다는 것을 깨달았습니다.

초기 반응은 [Google Cloud Platform의 Node.js 제안](https://cloud.google.com/nodejs/) 팀에 속한 동료 [Ali](https://twitter.com/ofrobots)와 [Myles](https://twitter.com/MylesBorins)로부터 나왔습니다. 그들은 Node.js 커뮤니티와 협력하여 [스타트업 스냅샷을 기본적으로 비활성화](https://github.com/nodejs/node/commit/eff636d8eb7b009c40fb053802c169ba1417293d)하도록 작업했습니다. 이번에는 또한 [테스트 케이스](https://github.com/nodejs/node/commit/9fedc1f09648ff7cebed65883966f5647686a38a)를 추가했습니다.

하지만 그 상태로 끝내고 싶지 않았습니다. 스타트업 스냅샷을 비활성화하면 [상당한](https://github.com/nodejs/node/issues/14229) 성능 영향을 끼칩니다. 수년에 걸쳐 우리는 V8에 많은 새로운 [언어](/blog/high-performance-es2015) [기능](/blog/webassembly-browser-preview) 및 [정교한](/blog/launching-ignition-and-turbofan) [최적화](/blog/speeding-up-regular-expressions)를 추가했습니다. 이러한 추가 기능 중 일부는 처음부터 시작하는 것을 더 비용이 많이 드는 작업으로 만들었습니다. 보안 릴리스 후 곧바로 장기적인 솔루션 작업을 시작했습니다. 목표는 해시 플러딩에 취약하지 않은 상태로 [스타트업 스냅샷을 다시 활성화](https://github.com/nodejs/node/issues/14171)하는 것입니다.

[제안된 해결책](https://docs.google.com/document/d/1br7T3jk5JAJSYaT8eZdQlqrPTDRClheGpRU1-BpY1ss/edit) 중에서 우리는 가장 실용적인 것을 선택하여 구현했습니다. 스냅샷에서 역직렬화된 후에, 새로운 해시 시드를 선택하도록 했습니다. 영향을 받는 데이터 구조는 일관성을 보장하기 위해 다시 해시됩니다.

알고 보니, 일반적인 스타트업 스냅샷에서는 실제로 영향을 받는 데이터 구조가 많지 않았습니다. 그리고 다행히도, [해시 테이블 다시 해싱](https://github.com/v8/v8/commit/0e8e0030775518b69eb8522823ea3754e6bddc69)은 그동안 V8에서 쉽게 구현되었습니다. 이로 인해 추가되는 오버헤드는 미미합니다.

스타트업 스냅샷을 다시 활성화하는 패치는 Node.js에 [병합](https://github.com/nodejs/node/commit/2ae2874ae7dfec2c55b5d390d25b6eed9932f78d)되었습니다. 최근 Node.js v8.3.0 [릴리스](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367)의 일부입니다.
