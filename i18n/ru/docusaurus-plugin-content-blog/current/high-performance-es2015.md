---
title: 'Высокопроизводительные ES2015 и новее'
author: 'Бенедикт Мойрер [@bmeurer](https://twitter.com/bmeurer), инженер по производительности ECMAScript'
avatars:
  - 'benedikt-meurer'
date: 2017-02-17 13:33:37
tags:
  - ECMAScript
description: 'Производительность V8 для языковых возможностей ES2015+ теперь сопоставима с их транспилированными эквивалентами на ES5.'
---
За последние несколько месяцев команда V8 сосредоточилась на повышении производительности недавно добавленных возможностей JavaScript [ES2015](https://www.ecma-international.org/ecma-262/6.0/) и даже более современных функций до уровня их транспилированных [ES5](https://www.ecma-international.org/ecma-262/5.1/) эквивалентов.

<!--truncate-->
## Мотивация

Прежде чем углубиться в детали различных улучшений, давайте сначала рассмотрим, почему производительность функциональности ES2015+ важна, несмотря на широкое использование [Babel](http://babeljs.io/) в современном веб-разработке:

1. Во-первых, есть новые функции ES2015, которые замещаются полифилами только по запросу, например встроенная функция [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign). Когда Babel транспилирует [свойства распространения объектов](https://github.com/sebmarkbage/ecmascript-rest-spread) (которые широко используются во многих приложениях [React](https://facebook.github.io/react) и [Redux](http://redux.js.org/)), он использует [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) вместо эквивалента на ES5, если виртуальная машина поддерживает это.
1. Замена функционала ES2015 на полифилы обычно увеличивает размер кода, что значительно способствует текущему [кризису производительности веба](https://channel9.msdn.com/Blogs/msedgedev/nolanlaw-web-perf-crisis), особенно на мобильных устройствах, распространенных в развивающихся странах. Стоимость передачи, парсинга и компиляции кода может быть довольно высокой, даже до фактической стоимости исполнения.
1. И, наконец, клиентский JavaScript — это лишь одна из сред, которая полагается на движок V8. Есть также [Node.js](https://nodejs.org/) для серверных приложений и инструментов, где разработчикам не нужно транспилировать код в ES5, а можно напрямую использовать функции, поддерживаемые [соответствующей версией V8](https://nodejs.org/en/download/releases/) в целевом релизе Node.js.

Рассмотрим следующий фрагмент кода из [документации Redux](http://redux.js.org/docs/recipes/UsingObjectSpreadOperator.html):

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

В приведенном коде есть две вещи, требующие транспиляции: параметр `по умолчанию` для `state` и распространение `state` внутрь объектного литерала. Babel генерирует следующий код на ES5:

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

Теперь представьте, что [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) на порядки медленнее, чем полифил `_extends`, созданный Babel. В таком случае обновление с браузера, не поддерживающего [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign), до версии браузера с поддержкой ES2015 было бы серьезной регрессией в производительности и, возможно, препятствовало бы принятию ES2015 в реальной практике.

Этот пример также подчеркивает еще один важный недостаток транспиляции: сгенерированный код, который передается пользователю, обычно значительно больше исходного кода ES2015+, написанного разработчиком. В приведенном выше примере исходный код составляет 203 символа (176 байт в gzip), тогда как сгенерированный код — 588 символов (367 байт в gzip). Это уже увеличение размера в два раза. Рассмотрим другой пример из предложения [асинхронных итераторов](https://github.com/tc39/proposal-async-iteration):

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

Babel переводит эти 187 символов (150 байт в сжатом виде) в невероятные 2987 символов (971 байт в сжатом виде) кода ES5, не считая [regenerator runtime](https://babeljs.io/docs/plugins/transform-regenerator/), который необходим в качестве дополнительной зависимости:

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

Это **увеличение размера на 650%** (универсальная функция `_asyncGenerator` может быть общедоступной в зависимости от того, как вы объединяете ваш код, что позволит компенсировать часть затрат при многократном использовании асинхронных итераторов). Мы не считаем целесообразным в долгосрочной перспективе распространять только код, транспилированный в ES5, так как увеличение размера скажется не только на времени/стоимости загрузки, но и добавит дополнительную нагрузку на парсинг и компиляцию. Если мы действительно хотим значительно улучшить загрузку страниц и отзывчивость современных веб-приложений, особенно на мобильных устройствах, мы должны поощрять разработчиков не только использовать ES2015+ при написании кода, но и распространять его вместо транспилирования в ES5. Полностью транспилированные пакеты должны доставляться только для устаревших браузеров, которые не поддерживают ES2015. Для разработчиков виртуальных машин это видение подразумевает необходимость нативной поддержки функций ES2015+ **и** предоставления приемлемой производительности.

## Методика измерения

Как описано выше, абсолютная производительность функций ES2015+ в настоящее время не является проблемой. Вместо этого наиболее важным сейчас является обеспечение того, чтобы производительность функций ES2015+ была сопоставима с их наивной версией ES5, а еще более важно — с версией, создаваемой Babel. Удобно, что уже существовал проект под названием [SixSpeed](https://github.com/kpdecker/six-speed) от [Кевина Деккера](http://www.incaseofstairs.com/), который выполнял более или менее то, что нам нужно: сравнительный анализ производительности функций ES2015 vs. наивный ES5 vs. код, генерируемый транспайлерами.

![Бенчмарк SixSpeed](/_img/high-performance-es2015/sixspeed.png)

Таким образом, мы решили взять это за основу для нашей начальной работы по производительности ES2015+. Мы [форкнули SixSpeed](https://fhinkel.github.io/six-speed/) и добавили несколько бенчмарков. Мы сосредоточились на самых серьезных регрессиях, то есть на пунктам, где замедление от наивного ES5 до рекомендованной версии ES2015+ было выше 2x, потому что наше фундаментальное предположение заключается в том, что наивная версия ES5 будет как минимум такой же быстрой, как версия, частично соответствующая спецификации, которую генерирует Babel.

## Современная архитектура для современного языка

В прошлом V8 испытывал трудности с оптимизацией языковых функций, характерных для ES2015+. Например, добавление поддержки обработки исключений (то есть try/catch/finally) в Crankshaft, классический оптимизирующий компилятор V8, никогда не было осуществимо. Это означало, что способность V8 оптимизировать функции ES6, такие как for...of, фактически имеющий неявный блок finally, была ограничена. Ограничения Crankshaft и общая сложность добавления новых языковых функций в full-codegen, компилятор базового уровня V8, делали трудным обеспечение добавления и оптимизации новых функций ES в V8 столь же быстро, как они стандартизировались.

К счастью, Ignition и TurboFan ([новый интерпретатор и компиляционный конвейер V8](/blog/test-the-future)), с самого начала были разработаны для поддержки всего языка JavaScript, включая сложные управляющие потоки, обработку исключений и недавно добавленные `for`-`of` и деструктуризацию из ES2015. Тесная интеграция архитектуры Ignition и TurboFan делает возможным быстрое добавление новых функций и их оптимизацию быстро и поэтапно.

Многие улучшения, которых мы добились для современных языковых функций, стали возможными только благодаря новому конвейеру Ignition/TurboFan. Ignition и TurboFan особенно важны для оптимизации генераторов и асинхронных функций. Генераторы долго поддерживались в V8, но не могли быть оптимизированы из-за ограничений управляющего потока в Crankshaft. Асинхронные функции — это по сути «сахар» поверх генераторов, поэтому они подпадают под ту же категорию. Новый компиляционный конвейер использует Ignition для анализа AST и генерации байткодов, которые преобразуют сложный управляющий поток генераторов в более простой локальный управляющий поток байткодов. TurboFan может легче оптимизировать полученные байткоды, поскольку ему не нужно знать что-то специфическое о управляющем потоке генераторов, только как сохранять и восстанавливать состояние функции при yield.

![Как генераторы JavaScript представлены в Ignition и TurboFan](/_img/high-performance-es2015/generators.svg)

## Состояние дел

Нашей краткосрочной целью было добиться замедления менее чем в 2× в среднем как можно скорее. Мы начали с рассмотрения самого худшего теста, и от Chrome 54 до Chrome 58 (Canary) нам удалось сократить количество тестов с замедлением выше 2× с 16 до 8 и одновременно уменьшить самое худшее замедление с 19× в Chrome 54 до всего 6× в Chrome 58 (Canary). Мы также значительно уменьшили среднее и медианное замедление за этот период:

![Замедление функций ES2015+ по сравнению с эквивалентами ES5](/_img/high-performance-es2015/slowdown.svg)

Вы можете видеть очевидную тенденцию к паритету между ES2015+ и ES5. В среднем мы улучшили производительность относительно ES5 на более чем 47%. Вот некоторые важные моменты, которые мы решили с момента выпуска Chrome 54.

![Производительность ES2015+ по сравнению с наивным эквивалентом ES5](/_img/high-performance-es2015/comparison.svg)

Наиболее заметно мы улучшили производительность новых языковых конструкций, которые основаны на итерации, таких как оператор распространения, деструктуризация и циклы `for`-`of`. Например, использование деструктуризации массива:

```js
function fn() {
  var [c] = data;
  return c;
}
```

…сейчас так же быстро, как наивная версия ES5:

```js
function fn() {
  var c = data[0];
  return c;
}
```

…и значительно быстрее (и короче), чем код, сгенерированный Babel:

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

Вы можете ознакомиться с презентацией [High-Speed ES2015](https://docs.google.com/presentation/d/1wiiZeRQp8-sXDB9xXBUAGbaQaWJC84M5RNxRyQuTmhk), которую мы представили на последней встрече [Munich NodeJS User Group](http://www.mnug.de/), чтобы узнать больше подробностей:

Мы нацелены на дальнейшее улучшение производительности функций ES2015+. Если вам интересны детали, пожалуйста, ознакомьтесь с [планом производительности ES2015 и далее](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY) от команды V8.
