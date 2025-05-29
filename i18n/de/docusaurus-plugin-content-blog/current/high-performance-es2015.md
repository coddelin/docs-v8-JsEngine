---
title: 'Leistungsstarkes ES2015 und darüber hinaus'
author: 'Benedikt Meurer [@bmeurer](https://twitter.com/bmeurer), ECMAScript-Performance-Ingenieur'
avatars:
  - 'benedikt-meurer'
date: 2017-02-17 13:33:37
tags:
  - ECMAScript
description: 'Die Leistung der ES2015+ Sprachfunktionen in V8 ist jetzt auf Augenhöhe mit ihren transpilierten ES5-Gegenstücken.'
---
In den letzten Monaten hat sich das V8-Team darauf konzentriert, die Leistung der neu eingeführten [ES2015](https://www.ecma-international.org/ecma-262/6.0/) und anderer noch neuerer JavaScript-Funktionen auf das Niveau ihrer transpilierten [ES5](https://www.ecma-international.org/ecma-262/5.1/) Gegenstücke zu bringen.

<!--truncate-->
## Motivation

Bevor wir auf die Details der verschiedenen Verbesserungen eingehen, sollten wir zunächst überlegen, warum die Leistung von ES2015+ Funktionen wichtig ist, trotz der weit verbreiteten Nutzung von [Babel](http://babeljs.io/) in der modernen Webentwicklung:

1. Zunächst gibt es neue ES2015-Funktionen, die nur bei Bedarf polyfilled werden, zum Beispiel das eingebaute [`Object.assign`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/assign). Wenn Babel [Objektausbreitungs-Eigenschaften](https://github.com/sebmarkbage/ecmascript-rest-spread) transpiliert (die von vielen [React](https://facebook.github.io/react) und [Redux](http://redux.js.org/) Anwendungen stark genutzt werden), verlässt es sich auf [`Object.assign`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) anstelle eines ES5-Äquivalents, wenn die VM es unterstützt.
1. Polyfilling von ES2015-Funktionen erhöht typischerweise die Codegröße, was erheblich zur aktuellen [Webleistungs-Krise](https://channel9.msdn.com/Blogs/msedgedev/nolanlaw-web-perf-crisis) beiträgt, insbesondere auf Mobilgeräten, die in aufstrebenden Märkten üblich sind. Das bedeutet, dass allein die Kosten für das Ausliefern, Parsen und Kompilieren des Codes erheblich sein können, sogar bevor es zu den eigentlichen Ausführungskosten kommt.
1. Und zu guter Letzt ist der Client-seitige JavaScript-Code nur eine der Umgebungen, die auf die V8-Engine angewiesen sind. Es gibt auch [Node.js](https://nodejs.org/) für Serveranwendungen und -tools, bei denen Entwickler ihren Code nicht in ES5 transpiliert bereitstellen müssen, sondern die von der [relevanten V8-Version](https://nodejs.org/en/download/releases/) im Ziel-Node.js-Release unterstützten Funktionen direkt verwenden können.

Betrachten wir den folgenden Codeausschnitt aus der [Redux-Dokumentation](http://redux.js.org/docs/recipes/UsingObjectSpreadOperator.html):

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

Es gibt zwei Dinge in diesem Code, die eine Transpilation erfordern: den Standardparameter für state und die Ausbreitung von state in das Objektliteral. Babel generiert den folgenden ES5-Code:

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

Stellen Sie sich nun vor, dass [`Object.assign`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) um Größenordnungen langsamer ist als das von Babel generierte `_extends` Polyfill. In diesem Fall würde ein Upgrade von einem Browser, der [`Object.assign`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) nicht unterstützt, auf eine ES2015-kompatible Version des Browsers eine ernsthafte Leistungseinbuße darstellen und wahrscheinlich die Verbreitung von ES2015 in freier Wildbahn behindern.

Dieses Beispiel hebt auch einen weiteren wichtigen Nachteil der Transpilation hervor: Der generierte Code, der an den Benutzer ausgeliefert wird, ist in der Regel erheblich größer als der ursprünglich vom Entwickler geschriebene ES2015+ Code. Im obigen Beispiel ist der Originalcode 203 Zeichen (176 Byte gzipped), während der generierte Code 588 Zeichen (367 Byte gzipped) umfasst. Das ist bereits eine Verdopplung der Größe. Schauen wir uns ein weiteres Beispiel aus dem [Async-Iteratoren](https://github.com/tc39/proposal-async-iteration) Vorschlag an:

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

Babel übersetzt diese 187 Zeichen (150 Bytes komprimiert) in satte 2987 Zeichen (971 Bytes komprimiert) ES5-Code, ohne sogar den [Regenerator-Runtime](https://babeljs.io/docs/plugins/transform-regenerator/) mitzuzählen, der als zusätzliche Abhängigkeit erforderlich ist:

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
    await: function await (value) {
      return new AwaitValue(value);
    }
  };
}();

var readLines = function () {
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

Das ist eine **650%**-ige Zunahme in der Größe (die generische Funktion `_asyncGenerator` könnte je nach Art, wie Sie Ihren Code bündeln, gemeinsam genutzt werden, sodass Sie einige dieser Kosten auf mehrere Verwendungen von async-Iteratoren amortisieren können). Wir glauben nicht, dass es langfristig tragfähig ist, nur Code zu liefern, der in ES5 transpiliert wurde, da die Zunahme in der Größe nicht nur die Downloadzeit/-kosten beeinflussen wird, sondern auch zusätzlichen Aufwand für Parsing und Kompilierung mit sich bringt. Wenn wir wirklich die Ladezeit und Reaktionsfähigkeit moderner Webanwendungen, insbesondere auf mobilen Geräten, drastisch verbessern wollen, müssen wir Entwickler dazu ermutigen, nicht nur ES2015+ beim Schreiben von Code zu verwenden, sondern diesen auch direkt zu liefern, anstatt auf ES5 zu transpiliert. Nur vollständig transpiliertes Bundle für Legacy-Browser liefern, die ES2015 nicht unterstützen. Für VM-Implementierer bedeutet diese Vision, dass wir ES2015+-Funktionen nativ unterstützen **und** angemessene Leistung bereitstellen müssen.

## Messmethodologie

Wie oben beschrieben, ist die absolute Performance von ES2015+-Features zu diesem Zeitpunkt eigentlich kein Problem. Stattdessen hat derzeit die höchste Priorität, sicherzustellen, dass die Performance von ES2015+-Features mit ihrer naiven ES5-Implementierung auf Augenhöhe liegt und noch wichtiger, mit der Version, die von Babel generiert wird. Praktischerweise gab es bereits ein Projekt namens [SixSpeed](https://github.com/kpdecker/six-speed) von [Kevin Decker](http://www.incaseofstairs.com/), das mehr oder weniger genau das leistet, was wir brauchen: einen Performance-Vergleich zwischen ES2015-Features, naivem ES5 und von Transpilern generiertem Code.

![Der SixSpeed-Benchmark](/_img/high-performance-es2015/sixspeed.png)

Deshalb haben wir uns entschieden, dies als Grundlage für unsere anfänglichen Arbeiten zur ES2015+-Performance zu verwenden. Wir haben [SixSpeed geforkt](https://fhinkel.github.io/six-speed/) und ein paar Benchmarks hinzugefügt. Zuerst haben wir uns auf die gravierendsten Rückschritte konzentriert, d. h. Punkte, bei denen die Verlangsamung von naivem ES5 zur empfohlenen ES2015+-Version über das Zweifache hinausging, da unsere grundlegende Annahme ist, dass die naive ES5-Version mindestens so schnell sein wird wie die einigermaßen spezifikationskonforme Version, die Babel generiert.

## Eine moderne Architektur für eine moderne Sprache

In der Vergangenheit hatte V8 Schwierigkeiten, die Art von Sprachfeatures zu optimieren, die in ES2015+ enthalten sind. Beispielsweise wurde es nie praktikabel, Exceptions-Handling (also try/catch/finally) in Crankshaft, dem klassischen Optimierungskompilierer von V8, zu unterstützen. Das bedeutete, dass die Fähigkeit von V8, ein ES6-Feature wie for...of zu optimieren, das im Wesentlichen eine implizite finally-Klausel enthält, eingeschränkt war. Die Einschränkungen von Crankshaft und die allgemeine Komplexität, neue Sprachfeatures zu Full-Codegen, dem Basiskompilierer von V8, hinzuzufügen, machten es grundsätzlich schwierig, sicherzustellen, dass neue ES-Features so schnell hinzugefügt und optimiert werden konnten, wie sie standardisiert wurden.

Glücklicherweise wurden Ignition und TurboFan ([V8s neue Interpreter- und Compiler-Pipeline](/blog/test-the-future)) von Anfang an so konzipiert, dass sie die gesamte JavaScript-Sprache unterstützen, einschließlich fortgeschrittener Kontrollflussmechanismen, Exceptions-Handling und zuletzt `for`-`of` sowie Destructuring aus ES2015. Die enge Integration der Architektur von Ignition und TurboFan macht es möglich, neue Features schnell hinzuzufügen und sie schnell und inkrementell zu optimieren.

Viele der Verbesserungen, die wir für moderne Sprachfeatures erreicht haben, waren nur mit der neuen Ignition/TurboFan-Pipeline möglich. Ignition und TurboFan erwiesen sich insbesondere als entscheidend für die Optimierung von Generatoren und asynchronen Funktionen. Generatoren wurden von V8 zwar lange unterstützt, waren jedoch aufgrund von Einschränkungen im Kontrollfluss in Crankshaft nicht optimierbar. Asynchrone Funktionen sind im Wesentlichen syntaktischer Zucker für Generatoren und fallen daher in dieselbe Kategorie. Die neue Compiler-Pipeline nutzt Ignition, um den AST zu interpretieren und Bytecode zu generieren, der den komplexen Generator-Kontrollfluss in einfacheren lokalen Kontrollfluss-Bytecode übersetzt. TurboFan kann die resultierenden Bytecodes leichter optimieren, da es nicht spezifisch etwas über den Generator-Kontrollfluss wissen muss, sondern nur, wie der Zustand einer Funktion bei Yields gespeichert und wiederhergestellt wird.

![Wie JavaScript-Generatoren in Ignition und TurboFan dargestellt werden](/_img/high-performance-es2015/generators.svg)

## Status quo

Unser kurzfristiges Ziel war es, so schnell wie möglich eine Durchschnitts-Verlangsamung von weniger als dem Zweifachen zu erreichen. Wir starteten, indem wir uns zuerst den schlechtesten Test ansahen, und von Chrome 54 bis Chrome 58 (Canary) konnten wir die Anzahl der Tests mit einer Verlangsamung über dem Zweifachen von 16 auf 8 reduzieren und gleichzeitig die schwerste Verlangsamung von 19-mal in Chrome 54 auf nur 6-mal in Chrome 58 (Canary) verringern. Wir haben während dieses Zeitraums auch die durchschnittliche und die mittlere Verlangsamung signifikant reduziert:

![Verlangsamung von ES2015+ im Vergleich zur nativen ES5-Äquivalenz](/_img/high-performance-es2015/slowdown.svg)

Es ist ein deutlicher Trend zur Gleichwertigkeit von ES2015+ und ES5 zu erkennen. Im Durchschnitt haben wir die Leistung im Vergleich zu ES5 um über 47 % verbessert. Hier sind einige Highlights, die wir seit Chrome 54 angesprochen haben.

![ES2015+-Performance im Vergleich zur naiven ES5-Äquivalenz](/_img/high-performance-es2015/comparison.svg)

Insbesondere haben wir die Performance neuer Sprachkonstruktionen verbessert, die auf Iteration basieren, wie der Spread-Operator, Destructuring und `for`-`of`-Schleifen. Zum Beispiel mit Array-Destructuring:

```js
function fn() {
  var [c] = data;
  return c;
}
```

…ist jetzt so schnell wie die naive ES5-Version:

```js
function fn() {
  var c = data[0];
  return c;
}
```

…und viel schneller (und kürzer) als der von Babel generierte Code:

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

Sie können den Vortrag [High-Speed ES2015](https://docs.google.com/presentation/d/1wiiZeRQp8-sXDB9xXBUAGbaQaWJC84M5RNxRyQuTmhk), den wir beim letzten Treffen der [Munich NodeJS User Group](http://www.mnug.de/) gehalten haben, für weitere Details ansehen:

Wir sind entschlossen, die Leistung von ES2015+-Funktionen weiter zu verbessern. Falls Sie an den detaillierten Einzelheiten interessiert sind, werfen Sie bitte einen Blick auf V8s [ES2015 und darüber hinaus Leistungsplan](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY).
