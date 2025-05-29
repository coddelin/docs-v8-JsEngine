---
title: "ES2015, ES2016, 그리고 그 이후"
author: "V8 팀, ECMAScript 열성 팬"
date: "2016-04-29 13:33:37"
tags: 
  - ECMAScript
description: "V8 v5.2가 ES2015 및 ES2016을 지원합니다!"
---
V8 팀은 JavaScript가 점점 더 많은 표현력을 갖춘 잘 정의된 언어로 발전하는 것을 중요시하며, 이를 통해 빠르고 안전하며 올바른 웹 애플리케이션 작성이 쉬워지도록 합니다. 2015년 6월, TC39 표준 위원회에 의해 [ES2015 사양](https://www.ecma-international.org/ecma-262/6.0/)이 승인되며 JavaScript 언어에 대한 단일 업데이트로는 가장 큰 규모의 변경이 이루어졌습니다. 새 기능에는 [클래스](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Classes), [화살표 함수](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/Arrow_functions), [프라미스](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Promise), [이터레이터/제너레이터](https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Iterators_and_Generators), [프록시](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Proxy), [특수 심볼](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols), 및 추가적인 문법 설탕이 포함됩니다. TC39는 새로운 사양의 출현 속도를 높이기 위해 노력하며, 2016년 2월에 [ES2016 후보 초안](https://tc39.es/ecma262/2016/)을 공개하였으며 올 여름 최종 승인됩니다. ES2015 업데이트만큼 광범위하지는 않지만 ES2016은 [지수 연산자](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Arithmetic_Operators#Exponentiation)와 [`Array.prototype.includes`](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/includes)를 도입한 점이 주목됩니다.

<!--truncate-->
오늘 우리는 중요한 이정표를 달성했습니다: **V8이 ES2015 및 ES2016을 지원합니다**. 이제 Chrome Canary에서 새로운 언어 기능을 사용할 수 있으며 Chrome 52에서 기본적으로 제공될 것입니다.

변화하는 사양의 특성과 다양한 유형의 적합성 테스트 간의 차이, 웹 호환성을 유지하는 데 필요한 복잡성 때문에 특정 버전의 ECMAScript가 JavaScript 엔진에 의해 완전히 지원되는 시점을 결정하기 어려울 수 있습니다. 사양 지원이 단순히 버전 숫자 이상인 이유, 적절한 테일 콜이 여전히 논의 중인 이유, 남아 있는 주의사항이 무엇인지에 대해 알아보세요.

## 변화하는 사양

TC39가 JavaScript 사양의 보다 빈번한 업데이트를 발표하기로 결정했을 때, 언어의 가장 최신 버전은 주 초안 버전이 되었습니다. ECMAScript 사양 버전이 여전히 매년 제작되고 승인되지만, V8은 가장 최근에 승인된 버전(예: ES2015), 표준화에 가까워 안전하게 구현할 수 있는 특정 기능(예: ES2016 후보 초안에서 나온 지수 연산자와 `Array.prototype.includes()`), 및 최신 초안에서 가져온 버그 수정 및 웹 호환성 수정 사항을 결합하여 구현합니다. 브라우저의 언어 구현이 사양과 일치해야 한다는 접근 방식의 부분적인 근거는 종종 사양 자체가 업데이트되어야 한다는 데 있습니다. 실제로 승인된 표준 버전을 구현하는 과정에서 차기 표준 버전을 구성하는 많은 수정 및 명확화가 발견됩니다.

![진화 중인 ECMAScript 사양에 따라 현재 제공 중인 부분들](/_img/modern-javascript/shipped-features.png)

예를 들어, ES2015 [RegExp 고정 플래그](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky)를 구현할 때 V8 팀은 ES2015 사양의 의미가 많은 기존 사이트(인기 있는 [XRegExp](https://github.com/slevithan/xregexp) 라이브러리의 2.x.x 버전을 사용하는 모든 사이트 포함)를 망가뜨린다는 점을 발견했습니다. 호환성은 웹의 기본이기 때문에 V8과 Safari JavaScriptCore 팀의 엔지니어들은 문제를 해결하기 위해 RegExp 사양에 대한 [수정 제안](https://github.com/tc39/ecma262/pull/511)을 제출했으며 TC39의 동의를 얻었습니다. 이 수정 사항은 ES2017 이전까지 승인된 버전에 나타나지 않지만 여전히 ECMAScript 언어의 일부이며 RegExp 고정 플래그를 제공하기 위해 이를 구현했습니다.

언어 사양의 지속적인 정제와 각 버전(아직 승인되지 않은 초안 포함)이 이전 버전을 대체, 수정, 명확히 한다는 사실 때문에 ES2015 및 ES2016 지원의 복잡성을 이해하기 어렵습니다. 간결하게 설명하기는 어렵지만, 가장 정확하게 표현하자면 _“계속 유지되는 미래 ECMAScript 표준 초안 준수”를 V8이 지원한다_고 말하는 것이 맞을 겁니다!

## 적합성 측정

이 명세의 복잡성을 이해하기 위해 ECMAScript 표준과의 JavaScript 엔진 호환성을 측정하는 다양한 방법이 있습니다. V8 팀과 기타 브라우저 벤더는 지속적으로 유지 관리되는 ECMAScript 표준의 초안 문서를 따르기 위한 준수의 금본위로서 [Test262 테스트 스위트](https://github.com/tc39/test262)를 사용합니다. 이 테스트 스위트는 명세에 맞게 지속적으로 업데이트되며 JavaScript의 호환 가능하고 규격 준수 구현을 구성하는 모든 기능 및 엣지 케이스에 대해 총 16,000개의 개별 기능 테스트를 제공합니다. 현재 V8은 Test262의 약 98%를 통과하고 있으며, 나머지 2%는 일부 엣지 케이스와 아직 준비되지 않은 향후 ES 기능들 일뿐입니다.

Test262 테스트의 방대한 수를 간략히 살펴보기 어렵기 때문에, [Kangax 호환성 테이블](http://kangax.github.io/compat-table/ES2015/)과 같은 기타 준수 테스트가 존재합니다. Kangax는 특정 기능(예: [화살표 함수](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions))가 주어진 엔진에서 구현되었는지 여부를 신속히 파악할 수 있게 해 주지만, Test262가 테스트하는 모든 준수 엣지 케이스를 포함하지는 않습니다. 현재 Chrome Canary는 ES2015에 대해 Kangax 테이블에서 98%, ES2016과 관련된 Kangax 섹션(예: ESnext 탭의 “2016 features” 및 “2016 misc”로 표시된 섹션)에서 100%를 기록하고 있습니다.

Kangax ES2015 테이블 테스트의 나머지 2%는 [정식 꼬리 호출](http://www.2ality.com/2015/06/tail-call-optimization.html)에 해당하며, 이 기능은 V8에서 구현되었지만 아래에 자세히 설명된 개발자 경험 문제로 인해 Chrome Canary에서 의도적으로 비활성화되었습니다. “Experimental JavaScript features” 플래그를 활성화하여 이 기능을 강제로 사용하면 Canary는 ES2015에 대한 Kangax 테이블 전체에서 100%를 기록합니다.

## 정식 꼬리 호출

정식 꼬리 호출은 구현되었지만 TC39에서 [현재 논의 중](https://github.com/tc39/proposal-ptc-syntax)이기 때문에 아직 배포되지 않았습니다. ES2015는 엄격 모드 함수 호출이 꼬리 위치에서 스택 오버플로를 유발하지 않아야 한다고 명시합니다. 이는 특정 프로그래밍 패턴에 유용한 보장이지만, 현재 의미에는 두 가지 문제가 있습니다. 첫째, 꼬리 호출 제거가 암시적으로 이루어지므로 프로그래머가 어떤 함수가 실제로 꼬리 호출 위치에 있는지를 [파악하기 어렵습니다](http://2ality.com/2015/06/tail-call-optimization.html#checking-whether-a-function-call-is-in-a-tail-position). 이는 개발자가 잘못된 꼬리 호출 시도를 비정상적인 프로그램 실행 중에 발견할 수 없게 되어 스택이 오버플로될 때까지 알아채지 못할 수 있습니다. 둘째, 정식 꼬리 호출을 구현하려면 호출 스택 프레임을 스택에서 생략해야 하기 때문에 실행 흐름에 대한 정보가 손실됩니다. 이는 두 가지 결과를 초래합니다:

1. 스택이 불연속적이므로 디버깅 시 실행 과정이 특정 지점에 어떻게 도달했는지를 이해하기 어려워지고,
2. [`error.stack`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack)는 실행 흐름에 대한 정보를 덜 포함하므로 클라이언트 측 오류를 수집하고 분석하는 텔레메트리 소프트웨어가 중단될 수 있습니다.

스택 호출 가독성을 향상시키기 위해 [쉐도우 스택](https://bugs.webkit.org/attachment.cgi?id=274472&action=review)을 구현할 수 있지만, V8 및 DevTools 팀은 디버깅 중에 표시되는 스택이 실제 가상 머신 스택의 진정한 상태와 항상 동일하게 완전히 결정론적일 때 디버깅이 가장 쉽고, 신뢰적이며, 정확하다고 믿습니다. 게다가, 쉐도우 스택은 성능 관점에서 항상 활성화하기에는 너무 비용이 많이 듭니다.

이러한 이유로, V8 팀은 특별한 구문으로 정식 꼬리 호출을 표시하는 것을 강력히 지지합니다. 이는 Mozilla 및 Microsoft의 위원회 구성원이 공동 주관하는 [TC39 제안](https://github.com/tc39/proposal-ptc-syntax)이 있으며, 이를 통해 이 동작을 명시합니다. 우리는 ES2015에서 명시된 정식 꼬리 호출을 구현하고 단계적으로 배포하였으며 새로운 제안에서 명시된 구문적 꼬리 호출을 구현하기 시작했습니다. V8 팀은 다음 TC39 회의에서 암시적 정식 꼬리 호출 또는 구문적 꼬리 호출을 기본적으로 배포하기 전에 문제를 해결할 계획입니다. 그동안 V8 플래그 `--harmony-tailcalls` 및 `--harmony-explicit-tailcalls`을 사용하여 각 버전을 테스트할 수 있습니다. **업데이트:** 이 플래그는 제거되었습니다.

## 모듈

ES2015의 가장 흥미로운 약속 중 하나는 응용 프로그램의 다양한 부분을 네임스페이스로 구성하고 분리하기 위해 JavaScript 모듈을 지원하는 것입니다. ES2015는 모듈에 대한 [`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) 및 [`export`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export) 선언을 명시하지만, 모듈이 JavaScript 프로그램에 로드되는 방법은 명시하지 않습니다. 최근 브라우저에서 세부 로드 동작은 [`<script type="module">`](https://blog.whatwg.org/js-modules)를 통해 명시되었습니다. 고급 동적 모듈 로딩 API를 명시하기 위해 추가적인 표준화 작업이 필요하지만, Chromium에서 모듈 스크립트 태그 지원이 이미 [개발 중](https://groups.google.com/a/chromium.org/d/msg/blink-dev/uba6pMr-jec/tXdg6YYPBAAJ)입니다. [런치 버그](https://bugs.chromium.org/p/v8/issues/detail?id=1569)에서 구현 작업을 추적할 수 있으며 [whatwg/loader](https://github.com/whatwg/loader) 저장소에서 실험적 로더 API 아이디어에 대해 더 읽을 수 있습니다.

## ESnext와 그 이후

향후 개발자들은 ECMAScript 업데이트가 보다 작고, 더 빈번한 업데이트와 짧은 구현 주기로 제공될 것으로 기대할 수 있습니다. V8 팀은 이미 [`async`/`await`](https://github.com/tc39/ecmascript-asyncawait) 키워드, [`Object.values`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values) / [`Object.entries`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries), [`String.prototype.{padStart,padEnd}`](http://tc39.es/proposal-string-pad-start-end/) 및 [RegExp 뒤쪽 조회(assertions)](/blog/regexp-lookbehind-assertions)와 같은 앞으로의 기능을 런타임에 제공하기 위해 작업하고 있습니다. 우리의 ESnext 구현 진행 상황 및 기존 ES2015 및 ES2016+ 기능의 성능 최적화에 대한 업데이트를 계속 확인하십시오.

우리는 JavaScript를 계속 발전시키고 새로운 기능을 조기에 구현하면서 기존 웹의 호환성과 안정성을 보장하며 디자인 문제에 관한 TC39 구현 피드백을 제공하기 위해 노력하고 있습니다. 이러한 새로운 기능으로 개발자들이 만들어낼 놀라운 경험을 기대합니다.
