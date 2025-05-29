---
title: '해시 테이블 최적화: 해시 코드 숨기기'
author: '[사트야 구나세카라](https://twitter.com/_gsathya), 해시 코드의 관리인'
avatars:
  - 'sathya-gunasekaran'
date: 2018-01-29 13:33:37
tags:
  - internals
tweet: '958046113390411776'
description: 'Map, Set, WeakSet, WeakMap과 같은 여러 JavaScript 데이터 구조 는 기본적으로 해시 테이블을 사용합니다. 이 글은 V8 v6.3이 해시 테이블 성능을 어떻게 개선했는지 설명합니다.'
---
ECMAScript 2015는 Map, Set, WeakSet, WeakMap과 같은 해시 테이블을 기본적으로 사용하는 몇 가지 새로운 데이터 구조를 도입했습니다. 이 글에서는 [최근 개선 사항](https://bugs.chromium.org/p/v8/issues/detail?id=6404)에 대해 설명하며, [V8 v6.3+](/blog/v8-release-63)이 해시 테이블에서 키를 저장하는 방법을 제공합니다.

<!--truncate-->
## 해시 코드

[_해시 함수_](https://en.wikipedia.org/wiki/Hash_function)는 주어진 키를 해시 테이블의 위치로 매핑하는 데 사용됩니다. 해시 코드는 주어진 키에 대해 이 해시 함수를 실행한 결과입니다.

V8에서 해시 코드는 객체 값과 독립된 랜덤 숫자일 뿐입니다. 따라서 이를 재계산할 수는 없고 저장해야 합니다.

키로 사용된 JavaScript 객체의 경우 이전에는 해시 코드가 객체에 비공개 심볼로 저장되었습니다. V8의 비공개 심볼은 [`Symbol`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)과 비슷하지만, 열거할 수 없고 사용자 공간 JavaScript에 누출되지 않는다는 점에서 차이가 있습니다.

```js
function GetObjectHash(key) {
  let hash = key[hashCodeSymbol];
  if (IS_UNDEFINED(hash)) {
    hash = (MathRandom() * 0x40000000) | 0;
    if (hash === 0) hash = 1;
    key[hashCodeSymbol] = hash;
  }
  return hash;
}
```

이 방법은 객체가 해시 테이블에 추가될 때까지 해시 코드 필드를 위한 메모리를 예약할 필요가 없었기 때문에 잘 작동했습니다. 그러한 시점에서 새 비공개 심볼이 객체에 저장되었습니다.

V8은 해시 코드 심볼을 IC 시스템을 사용하여 다른 프로퍼티 조회와 마찬가지로 최적화할 수 있었는데, 덕분에 해시 코드 조회가 매우 빨라졌습니다. 이는 [모노모픽 IC 조회](https://en.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching)에서 키가 동일한 [숨겨진 클래스](/)를 가질 때 효과적입니다. 그러나 대부분의 실제 코드에서는 이 패턴을 따르지 않고, 종종 키마다 숨겨진 클래스가 다르기 때문에 해시 코드의 [메가모픽 IC 조회](https://en.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching)가 느려집니다.

비공개 심볼 접근 방식의 또 다른 문제는 해시 코드를 저장함에 따라 키에서 [숨겨진 클래스 변환](/#fast-property-access)이 발생한다는 점이었습니다. 이는 해시 코드 조회뿐 아니라 키에서 다른 프로퍼티 조회 및 최적화된 코드에서의 [디옵티마이제이션](https://floitsch.blogspot.com/2012/03/optimizing-for-v8-inlining.html)을 악화시켰습니다.

## JavaScript 객체 백업 저장소

V8의 JavaScript 객체 (`JSObject`)는 헤더 외에 두 개의 워드를 사용합니다: 하나는 요소 백업 저장소를 포인터로 저장하고, 다른 하나는 프로퍼티 백업 저장소를 포인터로 저장합니다.

요소 백업 저장소는 [배열 인덱스](https://tc39.es/ecma262/#sec-array-index)처럼 보이는 프로퍼티를 저장하는 데 사용되며, 프로퍼티 백업 저장소는 키가 문자열이나 심볼인 프로퍼티를 저장하는 데 사용됩니다. 이러한 백업 저장소에 대한 자세한 내용은 카밀로 브루니의 [V8 블로그 게시물](/blog/fast-properties)을 참조하세요.

```js
const x = {};
x[1] = 'bar';      // ← 요소에 저장됨
x['foo'] = 'bar';  // ← 프로퍼티에 저장됨
```

## 해시 코드 숨기기

해시 코드를 저장하는 가장 간단한 해결책은 JavaScript 객체 크기를 한 워드만큼 확장하고 객체에 해시 코드를 직접 저장하는 것입니다. 그러나 이는 해시 테이블에 추가되지 않은 객체에 대해 메모리를 낭비합니다. 대신, 요소 저장소 또는 프로퍼티 저장소에 해시 코드를 저장하는 것을 시도할 수 있습니다.

요소 백업 저장소는 길이와 모든 요소를 포함하는 배열입니다. 여기서 해시 코드를 예약 슬롯(예: 0번째 인덱스)에 저장하면 객체를 해시 테이블의 키로 사용하지 않을 때 여전히 메모리가 낭비되므로 할 수 있는 일이 많지 않습니다.

프로퍼티 백업 저장소를 살펴봅시다. 프로퍼티 백업 저장소로 사용되는 데이터 구조는 배열과 딕셔너리 두 가지 유형이 있습니다.

요소 백업 저장소에 사용되는 배열에는 상한선이 없습니다. 그러나 프로퍼티 백업 저장소에 사용되는 배열에는 1022개의 값 상한선이 있습니다. 이 제한을 초과하면 V8은 성능상의 이유로 딕셔너리를 사용하도록 전환합니다. (조금 간단히 설명하자면, V8은 다른 경우에도 딕셔너리를 사용할 수 있지만 배열에 저장할 수 있는 값의 수에 대한 고정된 상한선이 있습니다.)

따라서 프로퍼티 백업 저장소에는 세 가지 가능한 상태가 있습니다:

1. 빈 상태 (프로퍼티 없음)
2. 배열 (최대 1022개의 값을 저장 가능)
3. 사전

하나씩 살펴보겠습니다.

### 속성 백업 저장소가 비어 있음

비어 있는 경우, `JSObject`의 이 오프셋에 직접 해시 코드를 저장할 수 있습니다.

![](/_img/hash-code/properties-backing-store-empty.png)

### 속성 백업 저장소가 배열임

V8에서는 32비트 시스템에서 2<sup>31</sup>보다 작은 정수를 [Smi](https://wingolog.org/archives/2011/05/18/value-representation-in-javascript-implementations)로 나타냅니다. Smi에서는 가장 낮은 중요한 비트가 포인터와 구별하기 위한 태그로 사용되며, 나머지 31비트가 실제 정수 값을 저장합니다.

일반적으로 배열은 Smi로 길이를 저장합니다. 이 배열의 최대 용량이 1022인 것을 알고 있으므로 길이를 저장하는 데 10비트만 필요합니다. 나머지 21비트를 해시 코드를 저장하는 데 활용할 수 있습니다!

![](/_img/hash-code/properties-backing-store-array.png)

### 속성 백업 저장소가 사전임

사전의 경우, 사전 크기를 단어 하나만큼 증가시켜 사전 시작 부분의 전용 슬롯에 해시 코드를 저장합니다. 배열의 경우와 비교해 메모리의 단어를 낭비할 가능성이 있지만, 크기가 비례적으로 크게 증가하지 않기 때문에 이 방법이 가능합니다.

![](/_img/hash-code/properties-backing-store-dictionary.png)

이 변경으로 인해 해시 코드 조회는 더 이상 복잡한 JavaScript 속성 조회 메커니즘을 거치지 않아도 됩니다.

## 성능 향상

[SixSpeed](https://github.com/kpdecker/six-speed) 벤치마크는 Map 및 Set의 성능을 추적하며, 이러한 변경으로 약 500%의 개선을 가져왔습니다.

![](/_img/hash-code/sixspeed.png)

이 변경은 [ARES6](https://webkit.org/blog/7536/jsc-loves-es6/)의 Basic 벤치마크에서 5%의 개선을 가져왔습니다.

![](/_img/hash-code/ares-6.png)

또한 Ember.js를 테스트하는 [Emberperf](http://emberperf.eviltrout.com/) 벤치마크 스위트의 한 벤치마크에서 18% 향상을 가져왔습니다.

![](/_img/hash-code/emberperf.jpg)
