---
title: "V8 추가 기능"
author: "도메닉 데니콜라 ([@domenic](https://twitter.com/domenic)), Streams 마법사"
avatars:
  - "domenic-denicola"
date: 2016-02-04 13:33:37
tags:
  - internals
description: "V8 v4.8에는 고성능의 자체 호스팅 API를 작성할 수 있도록 설계된 간단한 인터페이스인 “V8 추가 기능”이 포함되어 있습니다."
---
V8은 JavaScript 언어의 기본 객체와 함수의 큰 부분을 JavaScript 자체로 구현합니다. 예를 들어, 우리의 [프라미스 구현](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js)은 JavaScript로 작성된 것을 볼 수 있습니다. 이러한 내장 요소들은 _자체 호스팅_ 이라고 불립니다. 이러한 구현들은 [시작 스냅샷](/blog/custom-startup-snapshots)에 포함되어 있어 새로운 컨텍스트를 실행 중에 자체 호스팅 내장 요소를 준비하고 초기화할 필요 없이 빠르게 생성할 수 있습니다.

<!--truncate-->
Chromium과 같은 V8의 내장자는 때로 JavaScript에서 API를 작성하고자 하는 경우가 있습니다. 이는 [스트림](https://streams.spec.whatwg.org/)과 같이 자체적으로 포함된 플랫폼 기능이나 기존 저수준 기능 위에 구축된 고수준 기능을 제공하는 '계층화된 플랫폼'의 일부인 기능에 특히 잘 작동합니다. 예를 들어, Node.js에서와 같이 시작 시간에 추가 코드를 실행하여 내장자 API를 부트스트랩하는 것도 가능하지만, 이상적으로는 V8이 자체 호스팅 API에 대해 얻는 것과 동일한 속도 이점을 내장자도 얻을 수 있어야 합니다.

V8 추가 기능은 [v4.8 릴리스](/blog/v8-release-48)에서 처음 도입된 V8의 새 기능으로, 간단한 인터페이스를 통해 내장자가 고성능의 자체 호스팅 API를 작성할 수 있도록 설계되었습니다. 추가 기능은 V8 스냅샷에 직접 컴파일되는 내장자 제공 JavaScript 파일입니다. 또한 JavaScript에서 안전한 API를 작성하기 쉽게 해주는 몇 가지 보조 유틸리티에 액세스할 수 있습니다.

## 예제

V8 추가 파일은 특정 구조를 가진 간단한 JavaScript 파일입니다:

```js
(function(global, binding, v8) {
  'use strict';
  const Object = global.Object;
  const x = v8.createPrivateSymbol('x');
  const y = v8.createPrivateSymbol('y');

  class Vec2 {
    constructor(theX, theY) {
      this[x] = theX;
      this[y] = theY;
    }

    norm() {
      return binding.computeNorm(this[x], this[y]);
    }
  }

  Object.defineProperty(global, 'Vec2', {
    value: Vec2,
    enumerable: false,
    configurable: true,
    writable: true
  });

  binding.Vec2 = Vec2;
});
```

여기에서 주목해야 할 몇 가지 요소가 있습니다:

- `global` 객체는 스코프 체인에 존재하지 않으므로, 이에 대한 접근(`Object`와 같은 경우)은 제공된 `global` 인수를 통해 명시적으로 이루어져야 합니다.
- `binding` 객체는 값을 저장하거나 내장자로부터 값을 검색하기 위한 장소입니다. C++ API `v8::Context::GetExtrasBindingObject()`는 내장자 측에서 `binding` 객체에 대한 액세스를 제공합니다. 우리의 장난감 예제에서는 내장자가 노름 계산을 수행하도록 했지만, 실제 예제에서는 URL 해석과 같은 더 복잡한 작업을 내장자에게 위임할 수 있습니다. 또한 `Vec2` 생성자를 `binding` 객체에 추가하여 내장자 코드가 잠재적으로 변경 가능한 `global` 객체를 거치지 않고 `Vec2` 인스턴스를 생성할 수 있도록 합니다.
- `v8` 객체는 안전한 코드를 작성할 수 있도록 소수의 API를 제공합니다. 여기서는 외부에서 조작할 수 없는 방식으로 내부 상태를 저장하기 위해 비공개 심볼을 생성합니다. (비공개 심볼은 V8 내부 개념이며 표준 JavaScript 코드에서는 의미가 없습니다.) V8의 내장 요소들은 종종 이러한 작업을 위해 ʻ%-함수 호출ʼ을 사용하지만, V8 추가 기능은 V8의 내부 구현 세부 정보로 내장자가 의존하기에 적합하지 않기 때문에 %-함수를 사용할 수 없습니다.

이러한 객체들이 어디서 오는지 궁금할 수 있습니다. 이 세 객체는 모두 [V8의 부트스트래퍼](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/bootstrapper.cc)에서 초기화되며, 몇 가지 기본 속성을 설치하지만 대부분 초기화 작업은 V8의 자체 호스팅 JavaScript에 맡깁니다. 예를 들어, 거의 모든 .js 파일이 `global`에 무언가를 설치합니다. 예: [promise.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js&sq=package:chromium&l=439) 또는 [uri.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/uri.js&sq=package:chromium&l=371). 그리고 우리는 [다양한 위치에서](https://code.google.com/p/chromium/codesearch#search/&q=extrasUtils&sq=package:chromium&type=cs) `v8` 객체에 API를 설치합니다. (`binding` 객체는 추가 기능이나 내장자가 조작하기 전까지는 비어 있어서, V8 자체에서 관련이 있는 유일한 코드는 부트스트래퍼가 생성할 때입니다.)

마지막으로, 추가 기능을 컴파일할 것임을 V8에 알리기 위해, 프로젝트의 gypfile에 한 줄을 추가합니다:

```js
'v8_extra_library_files': ['./Vec2.js']
```

(이것의 실제 사례는 [V8의 gypfile](https://code.google.com/p/chromium/codesearch#chromium/src/v8/build/standalone.gypi&sq=package:chromium&type=cs&l=170)에서 볼 수 있습니다.)

## V8 Extras 실전 활용

V8 Extras는 임베더가 기능을 구현할 수 있는 새롭고 가벼운 방법을 제공합니다. JavaScript 코드는 배열, 맵, 프로미스 같은 JavaScript 빌트인을 더 쉽게 다룰 수 있으며, 다른 JavaScript 함수를 절차 없이 호출할 수 있고, 예외를 관용적인 방식으로 처리할 수 있습니다. C++ 구현과 달리, V8 Extras를 통해 JavaScript로 구현된 기능은 인라이닝의 혜택을 누릴 수 있으며, 호출 시 경계 간의 비용이 발생하지 않습니다. 이러한 이점은 특히 Chromium의 Web IDL 바인딩과 같은 전통적인 바인딩 시스템과 비교할 때 두드러집니다.

V8 Extras는 지난 1년 동안 도입 및 개선되었으며, Chromium은 현재 이를 사용하여 [스트림을 구현](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/core/streams/ReadableStream.js)하고 있습니다. Chromium은 또한 [스크롤 커스터마이징](https://codereview.chromium.org/1333323003) 및 [효율적인 기하학 API](https://groups.google.com/a/chromium.org/d/msg/blink-dev/V_bJNtOg0oM/VKbbYs-aAgAJ)를 구현하기 위해 V8 Extras를 고려하고 있습니다.

V8 Extras는 여전히 진행 중인 작업이며, 인터페이스에는 시간이 지남에 따라 해결하려는 몇 가지 거친 부분과 단점이 있습니다. 개선 여지가 있는 주요 영역은 디버깅 스토리입니다. 에러를 추적하기가 쉽지 않으며, 런타임 디버깅은 대부분 출력문을 통해 이루어집니다. 미래에는 V8 Extras를 Chromium의 개발자 도구 및 추적 프레임워크에 통합하여 Chromium 자체와 동일한 프로토콜을 따르는 모든 임베더를 지원할 수 있기를 바랍니다.

V8 Extras를 사용할 때 주의해야 할 또 다른 이유는 안전하고 안정적인 코드를 작성하기 위해 추가 개발 노력이 필요하다는 점입니다. V8 Extras 코드는 V8의 자체 호스팅 빌트인 코드와 마찬가지로 스냅샷에서 직접 작동합니다. 이는 바인딩 계층이나 별도의 컨텍스트 없이 사용자 영역 JavaScript와 동일한 개체에 접근합니다. 예를 들어, `global.Object.prototype.hasOwnProperty.call(obj, 5)`처럼 겉보기에는 간단한 작업이라도 빌트인이 사용자 코드에 의해 수정될 수 있는 여섯 가지 잠재적인 실패 가능성이 있습니다(직접 세어 보세요!). Chromium과 같은 임베더는 사용자 코드의 동작에 상관없이 이를 견딜 수 있어야 하므로, 그러한 환경에서 Extras를 작성할 때는 전통적인 C++-구현 기능을 작성할 때보다 더 많은 주의가 필요합니다.

V8 Extras에 대해 더 알고 싶다면, 훨씬 더 자세히 다루고 있는 [설계 문서](https://docs.google.com/document/d/1AT5-T0aHGp7Lt29vPWFr2-qG8r3l9CByyvKwEuA8Ec0/edit#heading=h.32abkvzeioyz)를 확인해 보세요. V8 Extras를 개선하고 개발자 및 임베더가 V8 런타임에 표현력 있고 고성능의 확장을 작성할 수 있는 더 많은 기능을 추가하기를 기대합니다.
