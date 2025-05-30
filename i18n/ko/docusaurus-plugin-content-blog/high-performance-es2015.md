---
title: "고성능 ES2015 및 이후"
author: "베네딕트 뮤어러 [@bmeurer](https://twitter.com/bmeurer), ECMAScript 성능 엔지니어"
avatars: 
  - "베네딕트-뮤어러"
date: "2017-02-17 13:33:37"
tags: 
  - ECMAScript
description: "V8의 ES2015+ 언어 기능 성능은 이제 해당 기능의 변환된 ES5 버전과 동등합니다."
---
지난 몇 달 동안 V8 팀은 새롭게 추가된 [ES2015](https://www.ecma-international.org/ecma-262/6.0/) 및 기타 최신 JavaScript 기능의 성능을 그들의 변환된 [ES5](https://www.ecma-international.org/ecma-262/5.1/) 버전과 동등하게 만드는 작업에 집중했습니다.

<!--truncate-->
## 동기

다양한 성능 개선의 세부사항에 들어가기 전에, 왜 ES2015+ 기능의 성능이 [Babel](http://babeljs.io/)이 널리 사용됨에도 불구하고 중요한지 먼저 고려해야 합니다:

1. 먼저, 일부 새로운 ES2015 기능은 필요한 경우에만 폴리필됩니다. 예를 들어 [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) 빌트인입니다. Babel이 [객체 스프레드 속성](https://github.com/sebmarkbage/ecmascript-rest-spread)을 변환할 때(이는 [React](https://facebook.github.io/react) 및 [Redux](http://redux.js.org/) 애플리케이션에서 많이 사용됨), VM이 이를 지원하는 경우 ES5와 동등한 코드 대신 [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)를 사용합니다.
1. ES2015 기능을 폴리필하는 것은 일반적으로 코드 규모를 증가시키며, 이는 특히 신흥 시장에서 흔히 사용되는 모바일 장치에서 현재 [웹 성능 위기](https://channel9.msdn.com/Blogs/msedgedev/nolanlaw-web-perf-crisis)에 크게 기여합니다. 따라서 코드를 전달하고, 파싱 및 컴파일하는 비용은 실제 실행 비용에 도달하기 전에 이미 상당히 높을 수 있습니다.
1. 마지막으로, 클라이언트 측 JavaScript는 V8 엔진을 사용하는 환경 중 하나일 뿐입니다. 서버 측 애플리케이션 및 도구를 위한 [Node.js](https://nodejs.org/)도 있으며, 개발자들은 ES5 코드로 변환할 필요 없이 대상 Node.js 릴리스의 [관련 V8 버전](https://nodejs.org/en/download/releases)이 지원하는 기능을 바로 사용할 수 있습니다.

다음은 [Redux 문서](http://redux.js.org/docs/recipes/UsingObjectSpreadOperator.html)의 코드 샘플입니다:

```js
function todoApp(state = initialState, action) {
  switch (action.type) {
    case SET_VISIBILITY_FILTER:
      return { ...state, visibilityFilter: action.filter };
    default:
      return state;
  }
}
```

해당 코드에는 두 가지 변환 요구 사항이 있습니다: state의 기본 매개변수와 객체 리터럴로 state를 확장하는 것입니다. Babel은 다음과 같은 ES5 코드를 생성합니다:

```js
'use strict';

var _extends = Object.assign || function(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};

function todoApp() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialState;
  var action = arguments[1];

  switch (action.type) {
    case SET_VISIBILITY_FILTER:
      return _extends({}, state, { visibilityFilter: action.filter });
    default:
      return state;
  }
}
```

이제 [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)이 Babel이 생성한 폴리필 `_extends`보다 훨씬 느리다고 상상해보세요. 그 경우 [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)를 지원하지 않는 브라우저에서 ES2015를 지원하는 브라우저로 업그레이드하면 심각한 성능 회귀가 발생하고 ES2015의 실제 도입을 저해할 수 있습니다.

이 예는 변환의 또 다른 중요한 단점을 강조하기도 합니다: 사용자에게 전달되는 생성된 코드가 개발자가 처음 작성한 ES2015+ 코드보다 일반적으로 훨씬 더 큽니다. 위의 예에서 원본 코드는 203자(176바이트 압축됨)이었지만, 생성된 코드는 588자(367바이트 압축됨)입니다. 이는 이미 두 배의 크기로 증가합니다. [비동기 반복자](https://github.com/tc39/proposal-async-iteration) 제안에서 또 다른 예를 살펴보겠습니다:

```js
async function* readLines(path) {
  let file = await fileOpen(path);
  try {
    while (!file.EOF) {
      yield await file.readLine();
    }
  } finally {
    await file.close();
  }
}
```

Babel은 이 187개의 문자(압축 시 150바이트)를 ES5 코드로 매우 놀라운 2987개의 문자(압축 시 971바이트)로 변환하며, 추가 종속 요소로 요구되는 [regenerator runtime](https://babeljs.io/docs/plugins/transform-regenerator/)을 포함하지 않은 상태입니다:

```js
'use strict';

var _asyncGenerator = function() {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function(resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };
        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;
        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function(arg) {
            resume('next', arg);
          }, function(arg) {
            resume('throw', arg);
          });
        } else {
          settle(result.done ? 'return' : 'normal', result.value);
        }
      } catch (err) {
        settle('throw', err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case 'return':
          front.resolve({
            value: value,
            done: true
          });
          break;
        case 'throw':
          front.reject(value);
          break;
        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }
      front = front.next;
      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }
    this._invoke = send;
    if (typeof gen.return !== 'function') {
      this.return = undefined;
    }
  }
  if (typeof Symbol === 'function' && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function() {
      return this;
    };
  }
  AsyncGenerator.prototype.next = function(arg) {
    return this._invoke('next', arg);
  };
  AsyncGenerator.prototype.throw = function(arg) {
    return this._invoke('throw', arg);
  };
  AsyncGenerator.prototype.return = function(arg) {
    return this._invoke('return', arg);
  };
  return {
    wrap: function wrap(fn) {
      return function() {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function await(value) {
      return new AwaitValue(value);
    }
  };
}();

var readLines = function() {
  var _ref = _asyncGenerator.wrap(regeneratorRuntime.mark(function _callee(path) {
    var file;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return _asyncGenerator.await(fileOpen(path));

          case 2:
            file = _context.sent;
            _context.prev = 3;

          case 4:
            if (file.EOF) {
              _context.next = 11;
              break;
            }

            _context.next = 7;
            return _asyncGenerator.await(file.readLine());

          case 7:
            _context.next = 9;
            return _context.sent;

          case 9:
            _context.next = 4;
            break;

          case 11:
            _context.prev = 11;
            _context.next = 14;
            return _asyncGenerator.await(file.close());

          case 14:
            return _context.finish(11);

          case 15:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[3,, 11, 15]]);
  }));

  return function readLines(_x) {
    return _ref.apply(this, arguments);
  };
}();
```

이는 크기가 **650%** 증가한 것입니다(일반적인 `_asyncGenerator` 기능은 코드 번들 방식에 따라 공유 가능하므로 비동기 이터레이터를 여러 번 사용하는 비용을 일부 분산할 수 있습니다). 우리는 장기적으로 오로지 ES5로 트랜스파일된 코드만 제공하는 것은 실행 가능하지 않다고 생각하며, 크기 증가로 인해 다운로드 시간/비용뿐만 아니라 파싱 및 컴파일에 추가적으로 오버헤드가 발생합니다. 현대 웹 애플리케이션의 페이지 로드 속도와 반응성을 대폭 향상시키기 위해, 특히 모바일 기기에서는 개발자들이 코드를 작성할 때 ES2015+를 사용하고 ES5로 트랜스파일 하는 대신 이를 직접 제공해야 한다고 권장해야 합니다. ES2015를 지원하지 않는 레거시 브라우저에만 완전히 트랜스파일된 번들을 제공해야 합니다. VM 구현자에게는 ES2015+ 기능을 기본적으로 지원하고 **합리적인 성능 또한** 제공해야 한다는 비전이 필요합니다.

## 측정 방법론

위에서 설명한 대로, ES2015+ 기능의 절대적인 성능은 현재로서는 큰 문제가 아닙니다. 대신, 현재 가장 중요한 우선순위는 ES2015+ 기능의 성능이 기본 ES5의 성능과 동등하거나, 심지어 Babel이 생성한 버전과 동등한지 확인하는 것입니다. 다행히도 [Kevin Decker](http://www.incaseofstairs.com/)의 [SixSpeed](https://github.com/kpdecker/six-speed)라는 프로젝트가 이미 존재했는데, 이것은 우리가 필요로 하는 것, 즉 ES2015 기능 대 기본 ES5 대 트랜스파일러에서 생성된 코드의 성능 비교를 거의 정확히 수행합니다.

![SixSpeed 벤치마크](/_img/high-performance-es2015/sixspeed.png)

그래서 우리는 처음 ES2015+ 성능 작업의 기반으로 그것을 선택하기로 했습니다. 우리는 [SixSpeed를 포크하여](https://fhinkel.github.io/six-speed/) 몇 가지 벤치마크를 추가했습니다. 우리는 가장 심각한 성능 저하 항목에 초점을 맞췄습니다. 즉, 기본 ES5에서 권장 ES2015+ 버전으로 전환했을 때 속도가 2배 이상 느려지는 항목들입니다. 왜냐하면 우리의 기본 가정은 기본 ES5 버전이 Babel이 생성한 다소 명세를 준수한 버전과 적어도 동일한 속도를 가질 것이라는 것이기 때문입니다.

## 현대 언어를 위한 현대적 아키텍처

과거에 V8은 ES2015+에 포함된 언어 기능의 최적화에 어려움을 겪었습니다. 예를 들어, Crankshaft(V8의 기존 최적화 컴파일러)에 예외 처리(try/catch/finally) 지원을 추가하는 것이 결코 실현 가능하지 않았습니다. 이는 기본적으로 finally 절을 암시적으로 포함하는 ES6 기능인 for...of와 같은 것을 V8이 최적화할 수 있는 역량이 제한되었음을 의미합니다. Crankshaft의 한계와 V8의 기본 컴파일러인 full-codegen에 새로운 언어 기능을 추가하는 것의 전반적인 복잡성으로 인해 새로운 ES 기능이 표준화 속도에 맞추어 V8에 추가 및 최적화되는 것이 본질적으로 어려웠습니다.

다행히 Ignition 및 TurboFan([V8의 새로운 인터프리터 및 컴파일러 파이프라인](/blog/test-the-future))은 초기부터 고급 제어 흐름, 예외 처리, 그리고 최근에는 ES2015의 for-of 및 구조분해와 같은 전체 JavaScript 언어를 지원하도록 설계되었습니다. Ignition과 TurboFan의 아키텍처가 긴밀하게 통합되어 있어 새로운 기능을 빠르고 점진적으로 추가하고 최적화할 수 있습니다.

우리가 현대 언어 기능을 위해 성취한 많은 개선 사항은 새로운 Ignition/TurboFan 파이프라인 없이는 실현 가능하지 않았을 것입니다. Ignition과 TurboFan은 특히 제너레이터와 비동기 함수의 최적화에 중요한 역할을 했습니다. 제너레이터는 V8에서 오랫동안 지원되었지만 Crankshaft의 제어 흐름 제한으로 인해 최적화할 수 없었습니다. 비동기 함수는 기본적으로 제너레이터 위에 설탕 코드를 얹은 것과 같아서 동일한 범주에 속합니다. 새로운 컴파일러 파이프라인은 Ignition을 활용하여 AST를 이해하고 바이트코드를 생성하여 복잡한 제너레이터 제어 흐름을 단순한 로컬 제어 흐름 바이트코드로 변환합니다. TurboFan은 생성된 바이트코드를 보다 쉽게 최적화할 수 있습니다. 제너레이터 제어 흐름에 대해 특정한 것을 알 필요가 없고 함수의 상태를 중간에 저장하고 복구하는 방법만 알면 되기 때문입니다.

![JavaScript 제너레이터가 Ignition 및 TurboFan에 의해 표현되는 방식](/_img/high-performance-es2015/generators.svg)

## 현재 상태

우리의 단기 목표는 평균적으로 2배 이하의 속도 저하에 도달하는 것이었습니다. 가장 나쁜 테스트부터 시작해서 Chrome 54에서 Chrome 58(카나리)까지 우리는 2배 이상의 속도 저하를 보이는 테스트 수를 16개에서 8개로 줄였고, 동시에 최악의 속도 저하를 Chrome 54의 19배에서 Chrome 58(카나리)의 6배로 줄였습니다. 또한 그 기간 동안 평균 및 중간값 속도 저하를 크게 줄였습니다:

![기본 ES5와 비교한 ES2015+의 속도 저하](/_img/high-performance-es2015/slowdown.svg)

ES2015+와 ES5의 동등 수준으로의 명확한 추세를 볼 수 있습니다. 평균적으로 우리는 ES5에 비해 성능을 47% 이상 개선했습니다. 여기엔 Chrome 54 이후 우리가 해결한 몇 가지 하이라이트가 있습니다.

![기본 ES5와 비교한 ES2015+의 성능](/_img/high-performance-es2015/comparison.svg)

특히, spread operator, 구조분해, `for`-`of` 루프와 같은 반복을 기반으로 한 새로운 언어 구조의 성능을 크게 개선했습니다. 예를 들어, 배열 구조분해를 사용하는 경우:

```js
function fn() {
  var [c] = data;
  return c;
}
```

…이제는 기본 ES5 버전만큼 빠릅니다:

```js
function fn() {
  var c = data[0];
  return c;
}
```

…뿐만 아니라 Babel에서 생성된 코드보다 훨씬 빠르고 짧습니다:

```js
'use strict';

var _slicedToArray = function() {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;
    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);
        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i['return']) _i['return']();
      } finally {
        if (_d) throw _e;
      }
    }
    return _arr;
  }
  return function(arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError('Invalid attempt to destructure non-iterable instance');
    }
  };
}();

function fn() {
  var _data = data,
      _data2 = _slicedToArray(_data, 1),
      c = _data2[0];

  return c;
}
```

당신은 추가 세부 정보를 위해 우리가 이전 [Munich NodeJS User Group](http://www.mnug.de/) 모임에서 제공한 [High-Speed ES2015](https://docs.google.com/presentation/d/1wiiZeRQp8-sXDB9xXBUAGbaQaWJC84M5RNxRyQuTmhk) 발표를 확인할 수 있습니다:

우리는 ES2015+ 기능의 성능을 계속 개선하기 위해 최선을 다하고 있습니다. 구체적인 세부 정보에 관심이 있으시다면 V8의 [ES2015 및 향후 성능 계획](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)을 살펴보세요.
