---
title: "Rendimiento de alto nivel con ES2015 y más allá"
author: "Benedikt Meurer [@bmeurer](https://twitter.com/bmeurer), Ingeniero de Rendimiento de ECMAScript"
avatars:
  - "benedikt-meurer"
date: 2017-02-17 13:33:37
tags:
  - ECMAScript
description: "El rendimiento de las características del lenguaje ES2015+ en V8 ahora está a la par con sus equivalentes transpilados de ES5."
---
En los últimos meses, el equipo de V8 se ha centrado en mejorar el rendimiento de las nuevas funcionalidades de [ES2015](https://www.ecma-international.org/ecma-262/6.0/) y otras características más recientes de JavaScript, para que estén a la par con sus equivalentes transpilados de [ES5](https://www.ecma-international.org/ecma-262/5.1/).

<!--truncate-->
## Motivación

Antes de entrar en los detalles de las varias mejoras, primero debemos considerar por qué importa el rendimiento de las características de ES2015+, a pesar del uso generalizado de [Babel](http://babeljs.io/) en el desarrollo web moderno:

1. Primero, hay nuevas características de ES2015 que solo se poli-rellenan según se necesiten, por ejemplo, el builtin [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign). Cuando Babel transpila las [propiedades de dispersión de objetos](https://github.com/sebmarkbage/ecmascript-rest-spread) (que son utilizadas ampliamente por muchas aplicaciones de [React](https://facebook.github.io/react) y [Redux](http://redux.js.org/)), depende de [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) en lugar de un equivalente de ES5 si la VM lo soporta.
1. El poli-rellenado de las características de ES2015 generalmente aumenta el tamaño del código, lo que contribuye significativamente a la actual [crisis de rendimiento web](https://channel9.msdn.com/Blogs/msedgedev/nolanlaw-web-perf-crisis), especialmente en dispositivos móviles comunes en mercados emergentes. Por lo tanto, el costo de simplemente entregar, analizar y compilar el código puede ser bastante alto, incluso antes de llegar al costo real de ejecución.
1. Y por último, pero no menos importante, el JavaScript del lado del cliente es solo uno de los entornos que depende del motor V8. También está [Node.js](https://nodejs.org/) para aplicaciones y herramientas del lado del servidor, donde los desarrolladores no necesitan transpilar el código a ES5, sino que pueden usar directamente las características soportadas por la [versión relevante de V8](https://nodejs.org/en/download/releases/) en la versión objetivo de Node.js.

Consideremos el siguiente fragmento de código de la [documentación de Redux](http://redux.js.org/docs/recipes/UsingObjectSpreadOperator.html):

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

Hay dos cosas en ese código que requieren transpilarse: el parámetro predeterminado para state y la dispersión de state en el literal del objeto. Babel genera el siguiente código ES5:

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

Ahora imagina que [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) es órdenes de magnitud más lento que el `_extends` poli-rellenado generado por Babel. En ese caso, actualizar de un navegador que no soporta [`Object.assign`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) a una versión del navegador compatible con ES2015 sería una regresión seria en rendimiento y probablemente dificultaría la adopción de ES2015 en general.

Este ejemplo también resalta otro inconveniente importante de la transpiliación: El código generado que se envía al usuario generalmente es considerablemente más grande que el código ES2015+ que el desarrollador escribió inicialmente. En el ejemplo anterior, el código original es de 203 caracteres (176 bytes comprimidos en gzip), mientras que el código generado tiene 588 caracteres (367 bytes comprimidos en gzip). Eso ya es un incremento de tamaño de un factor de dos. Veamos otro ejemplo de la propuesta de [iteradores asíncronos](https://github.com/tc39/proposal-async-iteration):

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

Babel traduce estos 187 caracteres (150 bytes comprimidos) a un enorme código ES5 de 2987 caracteres (971 bytes comprimidos), sin contar el [runtime del regenerador](https://babeljs.io/docs/plugins/transform-regenerator/) que se requiere como una dependencia adicional:

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

Esto es un aumento del **650%** en tamaño (la función genérica `_asyncGenerator` podría ser compartida dependiendo de cómo empaquetes tu código, por lo que se puede amortizar parte de ese costo en el uso múltiple de iteradores asincrónicos). Creemos que no es viable enviar solo código transpilado a ES5 a largo plazo, ya que el aumento en tamaño no solo afectará el tiempo/costo de descarga, sino que también añadirá sobrecarga adicional al análisis y compilación. Si realmente queremos mejorar drásticamente la carga de páginas y la rapidez de las aplicaciones web modernas, especialmente en dispositivos móviles, debemos alentar a los desarrolladores a usar ES2015+ cuando escriban código y también a enviarlo en lugar de transpilarlo a ES5. Solo entregar paquetes completamente transpilados a navegadores antiguos que no soporten ES2015. Para los implementadores de máquinas virtuales, esta visión implica que necesitamos soportar características de ES2015+ de forma nativa **y** proporcionar un rendimiento razonable.

## Metodología de medición

Como se describió anteriormente, el rendimiento absoluto de las características de ES2015+ no es realmente un problema en este punto. En cambio, la máxima prioridad actualmente es garantizar que el rendimiento de las características de ES2015+ esté a la par con su versión ingenua de ES5 y, aún más importante, con la versión generada por Babel. Convenientemente, ya existía un proyecto llamado [SixSpeed](https://github.com/kpdecker/six-speed) por [Kevin Decker](http://www.incaseofstairs.com/), que logra más o menos exactamente lo que necesitábamos: una comparación de rendimiento de características de ES2015 frente a ES5 ingenuo frente a código generado por transpiladores.

![La prueba benchmark de SixSpeed](/_img/high-performance-es2015/sixspeed.png)

Así que decidimos tomar eso como base para nuestro trabajo inicial de rendimiento de ES2015+. Nosotros [bifurcamos SixSpeed](https://fhinkel.github.io/six-speed/) y añadimos un par de pruebas de referencia más. Nos enfocamos primero en las regresiones más serias, es decir, en elementos donde la disminución del rendimiento de ES5 ingenuo a la versión recomendada de ES2015+ fue superior a 2x, porque nuestra suposición fundamental es que la versión ingenua de ES5 será al menos tan rápida como la versión algo compatible con las especificaciones que Babel genera.

## Una arquitectura moderna para un lenguaje moderno

En el pasado, V8 tuvo dificultades para optimizar el tipo de características del lenguaje que se encuentran en ES2015+. Por ejemplo, nunca llegó a ser factible agregar soporte para el manejo de excepciones (es decir, try/catch/finally) en Crankshaft, el compilador clásico de optimización de V8. Esto significaba que la capacidad de V8 para optimizar una característica de ES6 como for...of, que esencialmente tiene una cláusula finally implícita, era limitada. Las limitaciones de Crankshaft y la complejidad general de agregar nuevas características al compilador base full-codegen de V8 hicieron que fuera inherentemente difícil garantizar que las nuevas características de ES se añadieran y optimizaran en V8 tan rápidamente como se estandarizaban.

Afortunadamente, Ignition y TurboFan ([el nuevo intérprete y la nueva tubería de compiladores de V8](/blog/test-the-future)) fueron diseñados para admitir todo el lenguaje JavaScript desde el principio, incluyendo flujo de control avanzado, manejo de excepciones y, más recientemente, `for`-`of` y desestructuración de ES2015. La integración estrecha de la arquitectura de Ignition y TurboFan hace posible añadir nuevas características rápidamente y optimizarlas de manera rápida e incremental.

Muchas de las mejoras que logramos para las características modernas del lenguaje solo fueron posibles con la nueva tubería de Ignition/TurboFan. Ignition y TurboFan demostraron ser especialmente críticos para optimizar generadores y funciones asíncronas. Los generadores habían sido admitidos por V8 durante mucho tiempo, pero no eran optimizables debido a las limitaciones de flujo de control en Crankshaft. Las funciones asíncronas son esencialmente un azúcar sintáctico sobre generadores, por lo que entran en la misma categoría. La nueva tubería de compiladores aprovecha Ignition para interpretar el AST y generar bytecodes que simplifican el complejo flujo de control de generadores en bytecodes de flujo de control local más simples. TurboFan puede optimizar más fácilmente los bytecodes resultantes ya que no necesita saber nada específico sobre el flujo de control de generadores, solo cómo guardar y restaurar el estado de una función en los yields.

![Cómo se representan los generadores de JavaScript en Ignition y TurboFan](/_img/high-performance-es2015/generators.svg)

## Estado actual

Nuestra meta a corto plazo era alcanzar una disminución de rendimiento promedio inferior a 2× lo antes posible. Comenzamos analizando la peor prueba primero y, desde Chrome 54 hasta Chrome 58 (Canary), logramos reducir el número de pruebas con una disminución superior a 2× de 16 a 8, y al mismo tiempo reducir la peor disminución de rendimiento de 19× en Chrome 54 a solo 6× en Chrome 58 (Canary). También redujimos significativamente la disminución promedio y mediana durante ese período:

![Disminución de rendimiento de ES2015+ en comparación con el equivalente nativo de ES5](/_img/high-performance-es2015/slowdown.svg)

Se puede observar una clara tendencia hacia la paridad entre ES2015+ y ES5. En promedio, mejoramos el rendimiento relativo a ES5 en más del 47%. A continuación, algunos aspectos destacados que hemos abordado desde Chrome 54.

![Rendimiento de ES2015+ en comparación con el equivalente ingenuo de ES5](/_img/high-performance-es2015/comparison.svg)

Lo más notable es que mejoramos el rendimiento de las nuevas construcciones del lenguaje basadas en iteración, como el operador de propagación, desestructuración y bucles `for`-`of`. Por ejemplo, utilizando desestructuración de arrays:

```js
function fn() {
  var [c] = data;
  return c;
}
```

…ahora es tan rápido como la versión ingenua de ES5:

```js
function fn() {
  var c = data[0];
  return c;
}
```

…y mucho más rápido (y corto) que el código generado por Babel:

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

Puedes consultar la charla [High-Speed ES2015](https://docs.google.com/presentation/d/1wiiZeRQp8-sXDB9xXBUAGbaQaWJC84M5RNxRyQuTmhk) que dimos en el último encuentro del [Grupo de Usuarios de NodeJS de Múnich](http://www.mnug.de/) para más detalles:

Estamos comprometidos a seguir mejorando el rendimiento de las funciones de ES2015+. Si estás interesado en los detalles técnicos, por favor, echa un vistazo al [plan de rendimiento de ES2015 y más allá](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY) de V8.
