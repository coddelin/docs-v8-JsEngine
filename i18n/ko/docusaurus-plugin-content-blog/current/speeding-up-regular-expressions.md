---
title: "V8 정규 표현식을 더 빠르게 만드는 방법"
author: "Jakob Gruber, 정규 소프트웨어 엔지니어"
avatars: 
  - "jakob-gruber"
date: "2017-01-10 13:33:37"
tags: 
  - 내부 메커니즘
  - RegExp
description: "V8는 최근 정규 표현식의 내장 기능을 셀프 호스팅 JavaScript 구현에서 TurboFan 기반의 새로운 코드 생성 아키텍처에 직접 연결되는 방식으로 이전했습니다."
---
이 블로그 게시물은 TurboFan 기반의 새로운 코드 생성 아키텍처를 통해 정규 표현식의 내장 기능을 셀프 호스팅 JavaScript 구현에서 이전한 V8의 최근 변화를 다룹니다.

<!--truncate-->
V8의 정규 표현식 구현은 [Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)를 기반으로 하며, 이는 가장 빠른 정규 표현식 엔진 중 하나로 널리 평가받고 있습니다. 엔진 자체는 문자열에 대한 패턴 매칭을 수행하기 위한 저수준 로직을 캡슐화하지만, [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec)와 같은 RegExp 원형의 함수는 사용자에게 이러한 기능을 노출시키기 위해 추가 작업을 수행합니다.

역사적으로 V8의 다양한 구성 요소는 JavaScript로 구현되었습니다. 최근까지 `regexp.js`는 그 중 하나였으며, RegExp 생성자, 모든 속성 및 프로토타입 속성의 구현을 호스팅했습니다.

그러나 이 접근 방식에는 예측할 수 없는 성능과 저수준 기능에 대한 C++ 런타임으로의 비용이 많이 드는 전환을 포함한 단점이 있습니다. JavaScript 개발자들이 자체적으로 사용자 정의 RegExp 구현을 제공할 수 있도록 허용하는 ES6 내장 서브클래싱의 최근 추가는 RegExp 내장이 서브클래스화되지 않은 경우에도 정규 표현식 성능에 추가적인 패널티를 초래했습니다. 이러한 퇴보 문제는 셀프 호스팅 JavaScript 구현에서 완전히 해결되지 않았습니다.

따라서 우리는 RegExp 구현을 JavaScript에서 제거하기로 결정했습니다. 하지만 성능을 유지하는 것이 예상보다 더 어려웠습니다. 전체 C++ 구현으로의 초기 이전은 성능이 크게 저하되었으며, 원래 구현 성능의 약 70%에 불과했습니다. 조사 후, 우리는 여러 가지 원인을 발견했습니다:

- [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec)는 RegExp 엔진으로의 전환과 연관된 서브스트링 호출을 통해 RegExp 결과를 구성하는 등 몇 가지 매우 민감한 성능 영역을 포함하며, JavaScript 구현은 본래 네이티브 어셈블리 언어로 작성되거나 최적화 컴파일러 파이프라인에 직접 연결되는 고도로 최적화된 코드 조각(“스텁”)에 의존했습니다. 이러한 스텁은 C++에서 액세스할 수 없으며, 런타임 등가물은 훨씬 느립니다.
- RegExp의 `lastIndex`와 같은 속성 액세스는 비용이 들 수 있으며, 이름을 통한 조회 및 프로토타입 체인의 탐색이 필요할 수 있습니다. V8의 최적화 컴파일러는 그러한 액세스를 더 효율적인 작업으로 자동으로 대체할 수 있지만, 이러한 경우는 C++에서 명시적으로 처리해야 합니다.
- C++에서는 JavaScript 객체에 대한 참조가 `Handle`이라고 하는 래퍼로 포장되어야 하며, 이는 garbage collection과 협력하기 위한 것입니다. 핸들 관리로 인해 순수 JavaScript 구현과 비교하여 추가적인 오버헤드가 발생합니다.

RegExp 이전에 대한 우리의 새로운 디자인은 [CodeStubAssembler](/blog/csa)를 기반으로 하며, 이는 V8 개발자가 플랫폼 독립적인 코드를 작성할 수 있도록 하며, 이를 이후에 새로운 최적화 컴파일러 TurboFan에도 사용되는 동일한 백엔드가 빠르고 플랫폼 특정 코드로 변환하는 메커니즘입니다. CodeStubAssembler를 사용하여 초기 C++ 구현의 모든 단점을 해결할 수 있습니다. RegExp 엔진의 진입점과 같은 스텁은 CodeStubAssembler에서 쉽게 호출할 수 있습니다. 빠른 속성 액세스는 여전히 명시적으로 소위 빠른 경로에서 구현되어야 하지만, CodeStubAssembler에서 이러한 액세스는 매우 효율적입니다. 핸들은 C++ 외부에서는 존재하지 않습니다. 그리고 구현이 이제 매우 저수준에서 작동하기 때문에 필요하지 않은 경우 비용이 많이 드는 결과 생성 생략과 같은 추가적인 지름길을 사용할 수 있습니다.

결과는 매우 긍정적이었습니다. [상당한 정규 표현식 작업 부하](https://github.com/chromium/octane/blob/master/regexp.js)에서 점수가 15% 개선되었으며, 최근 서브클래싱 관련 성능 손실을 완전히 만회했습니다. 마이크로 벤치마크(그림 1)는 전반적으로 개선을 보여주며, [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec)의 7% 개선에서 [`RegExp.prototype[@@split]`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/@@split)의 102% 개선까지 다양합니다.

![그림 1: 함수에 따른 정규 표현식 속도 향상](/_img/speeding-up-regular-expressions/perf.png)

그렇다면 JavaScript 개발자로서 어떻게 하면 정규 표현식을 빠르게 유지할 수 있을까요? 정규 표현식 내부에 개입하고 싶지 않다면, 정규 표현식 인스턴스와 그 프로토타입이 수정되지 않도록 하여 최상의 성능을 확보하세요:

```js
const re = /./g;
re.exec('');  // 빠른 경로.
re.new_property = '느림';
RegExp.prototype.new_property = '또한 느림';
re.exec('');  // 느린 경로.
```

그리고 정규 표현식 서브클래싱이 때로는 매우 유용할 수 있지만, 서브클래싱된 정규 표현식 인스턴스는 더 일반적인 처리가 필요하므로 느린 경로를 사용한다는 점에 유의하세요:

```js
class SlowRegExp extends RegExp {}
new SlowRegExp(".", "g").exec('');  // 느린 경로.
```

정규 표현식 전체 마이그레이션은 V8 v5.7에서 사용할 수 있습니다.
