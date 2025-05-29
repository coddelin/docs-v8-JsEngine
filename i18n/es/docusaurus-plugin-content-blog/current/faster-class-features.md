---
title: 'Inicialización más rápida de instancias con nuevas características de clase'
author: '[Joyee Cheung](https://twitter.com/JoyeeCheung), inicializador de instancias'
avatars:
  - 'joyee-cheung'
date: 2022-04-20
tags:
  - internals
description: 'La inicialización de instancias con nuevas características de clase se ha vuelto más rápida desde V8 v9.7.'
tweet: '1517041137378373632'
---

Los campos de clase se implementaron en V8 desde la versión v7.2 y los métodos privados de clase se implementaron desde la versión v8.4. Después de que las propuestas alcanzaran el estadio 4 en 2021, comenzó el trabajo para mejorar el soporte de las nuevas características de clase en V8; hasta entonces, había dos problemas principales que afectaban su adopción:

<!--truncate-->
1. La inicialización de campos de clase y métodos privados era mucho más lenta que la asignación de propiedades ordinarias.
2. Los inicializadores de campos de clase tenían fallos en [instantáneas de inicio](https://v8.dev/blog/custom-startup-snapshots) utilizadas por integradores como Node.js y Deno para acelerar el arranque de ellos mismos o de aplicaciones de usuario.

El primer problema se solucionó en V8 v9.7 y la solución al segundo problema se lanzó en V8 v10.0. Esta publicación aborda cómo se solucionó el primer problema, para leer sobre la solución del problema de las instantáneas, consulta [esta publicación](https://joyeecheung.github.io/blog/2022/04/14/fixing-snapshot-support-of-class-fields-in-v8/).

## Optimizando los campos de clase

Para eliminar la brecha de rendimiento entre la asignación de propiedades ordinarias y la inicialización de campos de clase, actualizamos el existente [sistema de caché en línea (IC)](https://mathiasbynens.be/notes/shapes-ics) para trabajar con este último. Antes de v9.7, V8 siempre utilizaba una costosa llamada de tiempo de ejecución para inicializaciones de campos de clase. Con v9.7, cuando V8 considera que el patrón de inicialización es lo suficientemente predecible, utiliza una nueva IC para acelerar la operación, tal como lo hace para las asignaciones de propiedades ordinarias.

![Rendimiento de inicializaciones, optimizado](/_img/faster-class-features/class-fields-performance-optimized.svg)

![Rendimiento de inicializaciones, interpretado](/_img/faster-class-features/class-fields-performance-interpreted.svg)

### La implementación original de los campos de clase

Para implementar campos privados, V8 utiliza los símbolos privados internos &mdash; son una estructura de datos interna de V8 similar a los `Symbol`s estándar, excepto que no son enumerables cuando se utilizan como clave de propiedad. Tomemos esta clase como ejemplo:


```js
class A {
  #a = 0;
  b = this.#a;
}
```

V8 recogería los inicializadores de campos de clase (`#a = 0` y `b = this.#a`) y generaría una función miembro sintética de instancia con los inicializadores como cuerpo de la función. El bytecode generado para esta función sintética solía ser algo así:

```cpp
// Carga el símbolo de nombre privado para `#a` en r1
LdaImmutableCurrentContextSlot [2]
Star r1

// Carga 0 en r2
LdaZero
Star r2

// Mueve el objetivo a r0
Mov <this>, r0

// Utiliza la función de tiempo de ejecución %AddPrivateField() para almacenar 0 como valor de
// la propiedad con clave del símbolo privado `#a` en la instancia,
// es decir, `#a = 0`.
CallRuntime [AddPrivateField], r0-r2

// Carga el nombre de la propiedad `b` en r1
LdaConstant [0]
Star r1

// Carga el símbolo de nombre privado para `#a`
LdaImmutableCurrentContextSlot [2]

// Carga el valor de la propiedad con clave `#a` desde la instancia en r2
LdaKeyedProperty <this>, [0]
Star r2

// Mueve el objetivo a r0
Mov <this>, r0

// Utiliza la función de tiempo de ejecución %CreateDataProperty() para almacenar la propiedad con clave
// `#a` como valor de la propiedad con clave `b`, es decir, `b = this.#a`
CallRuntime [CreateDataProperty], r0-r2
```

Compara la clase en el fragmento anterior con una clase como esta:

```js
class A {
  constructor() {
    this._a = 0;
    this.b = this._a;
  }
}
```

Técnicamente estas dos clases no son equivalentes, incluso ignorando la diferencia en visibilidad entre `this.#a` y `this._a`. La especificación exige semántica de "definir" en lugar de semántica de "establecer". Es decir, la inicialización de campos de clase no activa setters ni trampas Proxy de `set`. Por lo tanto, una aproximación de la primera clase debería usar `Object.defineProperty()` en lugar de simples asignaciones para inicializar las propiedades. Además, debería lanzar un error si el campo privado ya existe en la instancia (en caso de que el objetivo que se está inicializando se sobrescriba en el constructor base para ser otra instancia):

```js
class A {
  constructor() {
    // A lo que aproximadamente se traduce la llamada %AddPrivateField():
    const _a = %PrivateSymbol('#a')
    if (_a in this) {
      throw TypeError('No se puede inicializar #a dos veces en el mismo objeto');
    }
    Object.defineProperty(this, _a, {
      writable: true,
      configurable: false,
      enumerable: false,
      value: 0
    });
    // A lo que aproximadamente se traduce la llamada %CreateDataProperty():
    Object.defineProperty(this, 'b', {
      writable: true,
      configurable: true,
      enumerable: true,
      value: this[_a]
    });
  }
}
```

Para implementar la semántica especificada antes de que la propuesta se finalizara, V8 utilizó llamadas a funciones de tiempo de ejecución, ya que son más flexibles. Como se muestra en el bytecode anterior, la inicialización de los campos públicos se implementó con llamadas a la función de tiempo de ejecución `%CreateDataProperty()`, mientras que la inicialización de los campos privados se implementó con `%AddPrivateField()`. Dado que llamar al tiempo de ejecución implica una sobrecarga significativa, la inicialización de los campos de clase era mucho más lenta en comparación con la asignación de propiedades de objetos ordinarios.

En la mayoría de los casos de uso, sin embargo, las diferencias semánticas son insignificantes. Sería agradable tener el rendimiento de las asignaciones optimizadas de propiedades en estos casos — por lo que se creó una implementación más óptima después de que la propuesta se finalizara.

### Optimización de campos privados de clase y campos públicos computados de clase

Para acelerar la inicialización de campos privados de clase y campos públicos computados de clase, la implementación introdujo una nueva maquinaria para integrarse en el [sistema de cachés en línea (IC)](https://mathiasbynens.be/notes/shapes-ics) al manejar estas operaciones. Esta nueva maquinaria consta de tres piezas interconectadas:

- En el generador de bytecode, un nuevo bytecode `DefineKeyedOwnProperty`. Este se emite al generar el código para los nodos AST `ClassLiteral::Property` que representan inicializadores de campos de clase.
- En el compilador JIT TurboFan, un código IR correspondiente `JSDefineKeyedOwnProperty`, que puede compilarse a partir del nuevo bytecode.
- En el sistema IC, un nuevo `DefineKeyedOwnIC` que se usa en el manejador de intérprete del nuevo bytecode, así como en el código compilado a partir del nuevo código IR. Para simplificar la implementación, el nuevo IC reutiliza parte del código en `KeyedStoreIC`, que estaba destinado a almacenes de propiedades ordinarias.

Ahora cuando V8 encuentra esta clase:

```js
class A {
  #a = 0;
}
```

Genera el siguiente bytecode para el inicializador `#a = 0`:

```cpp
// Cargar el símbolo de nombre privado para `#a` en r1
LdaImmutableCurrentContextSlot [2]
Star0

// Usar el bytecode DefineKeyedOwnProperty para almacenar 0 como el valor de
// la propiedad registrada con el símbolo de nombre privado `#a` en la instancia,
// es decir, `#a = 0`.
LdaZero
DefineKeyedOwnProperty <this>, r0, [0]
```

Cuando el inicializador se ejecuta suficientes veces, V8 asigna un [slot de vector de retroalimentación](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8) para cada campo que se inicializa. El slot contiene la clave del campo que se está agregando (en el caso del campo privado, el símbolo de nombre privado) y un par de [clases ocultas](https://v8.dev/docs/hidden-classes) entre las cuales la instancia ha estado transitando como resultado de la inicialización del campo. En inicializaciones posteriores, el IC utiliza la retroalimentación para verificar si los campos se inicializan en el mismo orden en las instancias con las mismas clases ocultas. Si la inicialización coincide con el patrón que V8 ha visto antes (lo que suele ser el caso), V8 toma el camino rápido y realiza la inicialización con código pre-generado en lugar de llamar al tiempo de ejecución, acelerando así la operación. Si la inicialización no coincide con un patrón que V8 haya visto antes, vuelve a una llamada al tiempo de ejecución para manejar los casos lentos.

### Optimización de campos públicos nombrados de clase

Para acelerar la inicialización de campos públicos nombrados de clase, reutilizamos el bytecode existente `DefineNamedOwnProperty`, que llama a `DefineNamedOwnIC` ya sea en el intérprete o mediante el código compilado desde el código IR `JSDefineNamedOwnProperty`.

Ahora cuando V8 encuentra esta clase:

```js
class A {
  #a = 0;
  b = this.#a;
}
```

Genera el siguiente bytecode para el inicializador `b = this.#a`:

```cpp
// Cargar el símbolo de nombre privado para `#a`
LdaImmutableCurrentContextSlot [2]

// Cargar el valor de la propiedad registrada con `#a` de la instancia en r2
// Nota: LdaKeyedProperty se renombra a GetKeyedProperty en la refactorización
GetKeyedProperty <this>, [2]

// Usar el bytecode DefineKeyedOwnProperty para almacenar la propiedad registrada
// con `#a` como el valor de la propiedad registrada con `b`, es decir, `b = this.#a;`
DefineNamedOwnProperty <this>, [0], [4]
```

La maquinaria original `DefineNamedOwnIC` no podía simplemente integrarse en el manejo de los campos públicos nombrados de clase, ya que originalmente estaba destinada únicamente para la inicialización de literales de objetos. Anteriormente se esperaba que el objetivo que se estaba inicializando fuera un objeto que aún no había sido tocado por el usuario desde su creación, lo cual siempre era cierto para los literales de objetos, pero los campos de clase pueden inicializarse en objetos definidos por el usuario cuando la clase extiende una clase base cuyo constructor sobrescribe el objetivo:

```js
class A {
  constructor() {
    return new Proxy(
      { a: 1 },
      {
        defineProperty(object, key, desc) {
          console.log('object:', object);
          console.log('key:', key);
          console.log('desc:', desc);
          return true;
        }
      });
  }
}

class B extends A {
  a = 2;
  #b = 3;  // No observable.
}

// object: { a: 1 },
// key: 'a',
// desc: {value: 2, writable: true, enumerable: true, configurable: true}
new B();
```

Para tratar con estos objetivos, corregimos el IC para que recurra al tiempo de ejecución cuando detecte que el objeto que se está inicializando es un proxy, si el campo que se está definiendo ya existe en el objeto o si el objeto simplemente tiene una clase oculta que el IC no ha visto antes. Todavía es posible optimizar los casos límite si se vuelven lo suficientemente comunes, pero hasta ahora parece mejor cambiar el rendimiento de ellos por la simplicidad de la implementación.

## Optimización de métodos privados

### La implementación de métodos privados

En [la especificación](https://tc39.es/ecma262/#sec-privatemethodoraccessoradd), los métodos privados se describen como si estuvieran instalados en las instancias pero no en la clase. Sin embargo, para ahorrar memoria, la implementación de V8 almacena los métodos privados junto con un símbolo de marca privada en un contexto asociado con la clase. Cuando se invoca el constructor, V8 solo almacena una referencia a ese contexto en la instancia, con el símbolo de marca privada como clave.

![Evaluación e instanciación de clases con métodos privados](/_img/faster-class-features/class-evaluation-and-instantiation.svg)

Cuando se acceden a los métodos privados, V8 recorre la cadena de contextos comenzando desde el contexto de ejecución para encontrar el contexto de clase, lee un espacio conocido estáticamente del contexto encontrado para obtener el símbolo de marca privada de la clase y luego verifica si la instancia tiene una propiedad identificada por este símbolo de marca para ver si la instancia se creó a partir de esta clase. Si la verificación de la marca es exitosa, V8 carga el método privado desde otro espacio conocido en el mismo contexto y completa el acceso.

![Acceso a métodos privados](/_img/faster-class-features/access-private-methods.svg)

Tomemos este fragmento como ejemplo:

```js
class A {
  #a() {}
}
```

V8 solía generar el siguiente bytecode para el constructor de `A`:

```cpp
// Cargar el símbolo de marca privada para la clase A desde el contexto
// y almacenarlo en r1.
LdaImmutableCurrentContextSlot [3]
Star r1

// Cargar el destino en r0.
Mov <this>, r0
// Cargar el contexto actual en r2.
Mov <context>, r2
// Llamar a la función de tiempo de ejecución %AddPrivateBrand() para almacenar el contexto en
// la instancia con la marca privada como clave.
CallRuntime [AddPrivateBrand], r0-r2
```

Dado que también había una llamada a la función de tiempo de ejecución `%AddPrivateBrand()`, la sobrecarga hacía que el constructor fuera mucho más lento que los constructores de clases con solo métodos públicos.

### Optimizando la inicialización de marcas privadas

Para acelerar la instalación de las marcas privadas, en la mayoría de los casos simplemente reutilizamos el mecanismo de `DefineKeyedOwnProperty` agregado para la optimización de campos privados:

```cpp
// Cargar el símbolo de marca privada para la clase A desde el contexto
// y almacenarlo en r1
LdaImmutableCurrentContextSlot [3]
Star0

// Usar el bytecode DefineKeyedOwnProperty para almacenar el
// contexto en la instancia con la marca privada como clave
Ldar <context>
DefineKeyedOwnProperty <this>, r0, [0]
```

![Rendimiento de inicializaciones de instancias de clases con diferentes métodos](/_img/faster-class-features/private-methods-performance.svg)

Sin embargo, hay un detalle: si la clase es una clase derivada cuyo constructor llama a `super()`, la inicialización de los métodos privados - y en nuestro caso, la instalación del símbolo de marca privada - debe ocurrir después de que `super()` regrese:

```js
class A {
  constructor() {
    // Esto lanza un error desde una llamada a new B() porque super() aún no ha regresado.
    this.callMethod();
  }
}

class B extends A {
  #method() {}
  callMethod() { return this.#method(); }
  constructor(o) {
    super();
  }
};
```

Como se describió anteriormente, al inicializar la marca, V8 también almacena una referencia al contexto de clase en la instancia. Esta referencia no se usa en las verificaciones de marca, sino que está destinada a que el depurador recupere una lista de métodos privados de la instancia sin saber de qué clase se construyó. Cuando `super()` se invoca directamente en el constructor, V8 puede simplemente cargar el contexto desde el registro de contexto (que es lo que hacen `Mov <context>, r2` o `Ldar <context>` en los bytecode anteriores) para realizar la inicialización, pero `super()` también puede invocarse desde una función flecha anidada, que a su vez puede invocarse desde un contexto diferente. En este caso, V8 recurre a una función de tiempo de ejecución (todavía llamada `%AddPrivateBrand()`) para buscar el contexto de clase en la cadena de contextos en lugar de confiar en el registro de contexto. Por ejemplo, para la función `callSuper` a continuación:

```js
class A extends class {} {
  #method() {}
  constructor(run) {
    const callSuper = () => super();
    // ...hacer algo
    run(callSuper)
  }
};

new A((fn) => fn());
```

V8 ahora genera el siguiente bytecode:

```cpp
// Invocar el super constructor para construir la instancia
// y almacenarla en r3.
...

// Cargar el símbolo de marca privada desde el contexto de clase en
// la profundidad 1 desde el contexto actual y almacenarlo en r4
LdaImmutableContextSlot <context>, [3], [1]
Star4

// Cargar la profundidad 1 como un Smi en r6
LdaSmi [1]
Star6

// Cargar el contexto actual en r5
Mov <context>, r5

// Usar el %AddPrivateBrand() para localizar el contexto de clase en
// la profundidad 1 desde el contexto actual y almacenarlo en la instancia
// con el símbolo de marca privada como clave
CallRuntime [AddPrivateBrand], r3-r6
```

En este caso, el costo de la llamada en tiempo de ejecución vuelve, por lo que inicializar instancias de esta clase seguirá siendo más lento en comparación con inicializar instancias de clases con solo métodos públicos. Es posible utilizar un bytecode dedicado para implementar lo que `%AddPrivateBrand()` hace, pero dado que invocar `super()` en una función de flecha anidada es bastante raro, nuevamente intercambiamos el rendimiento por la simplicidad de la implementación.

## Notas finales

El trabajo mencionado en esta publicación del blog también está incluido en el [lanzamiento de Node.js 18.0.0](https://nodejs.org/en/blog/announcements/v18-release-announce/). Anteriormente, Node.js cambió a propiedades de símbolo en algunas clases integradas que habían estado utilizando campos privados con el fin de incluirlas en el snapshot de arranque incorporado, así como para mejorar el rendimiento de los constructores (ver [esta publicación del blog](https://www.nearform.com/blog/node-js-and-the-struggles-of-being-an-eventtarget/) para más contexto). Con el apoyo mejorado de las características de clases en V8, Node.js [cambió nuevamente a campos privados de clase](https://github.com/nodejs/node/pull/42361) en estas clases y los benchmarks de Node.js mostraron que [estos cambios no introdujeron regresiones en el rendimiento](https://github.com/nodejs/node/pull/42361#issuecomment-1068961385).

¡Gracias a Igalia y Bloomberg por contribuir con esta implementación!
