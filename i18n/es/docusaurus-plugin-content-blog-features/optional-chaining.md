---
title: "Encadenamiento opcional"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), rompedora de cadenas opcionales"
avatars: 
  - "maya-armyanova"
date: 2019-08-27
tags: 
  - ECMAScript
  - ES2020
description: "El encadenamiento opcional permite expresiones legibles y concisas de accesos a propiedades con verificación integrada de valores nulos."
tweet: "1166360971914481669"
---
Las cadenas largas de accesos a propiedades en JavaScript pueden ser propensas a errores, ya que cualquiera de ellas podría evaluarse como `null` o `undefined` (también conocidos como valores “nulos”). Verificar la existencia de propiedades en cada paso fácilmente se convierte en una estructura profundamente anidada de sentencias `if` o en una larga condición `if` que replica la cadena de acceso a propiedades:

<!--truncate-->
```js
// Versión propensa a errores, podría lanzar una excepción.
const nameLength = db.user.name.length;

// Menos propenso a errores, pero más difícil de leer.
let nameLength;
if (db && db.user && db.user.name)
  nameLength = db.user.name.length;
```

Lo anterior también puede expresarse usando el operador ternario, lo que no ayuda precisamente a la legibilidad:

```js
const nameLength =
  (db
    ? (db.user
      ? (db.user.name
        ? db.user.name.length
        : undefined)
      : undefined)
    : undefined);
```

## Introduciendo el operador de encadenamiento opcional

Seguramente no quieres escribir código como ese, así que tener alguna alternativa es deseable. Algunos otros lenguajes ofrecen una solución elegante a este problema con una característica llamada “encadenamiento opcional”. De acuerdo con [una propuesta de especificación reciente](https://github.com/tc39/proposal-optional-chaining), “una cadena opcional es una cadena de uno o más accesos a propiedades y llamadas a funciones, el primero de los cuales comienza con el token `?.`”.

Usando el nuevo operador de encadenamiento opcional, podemos reescribir el ejemplo anterior de la siguiente manera:

```js
// Sigue verificando errores y es mucho más legible.
const nameLength = db?.user?.name?.length;
```

¿Qué pasa cuando `db`, `user`, o `name` es `undefined` o `null`? Con el operador de encadenamiento opcional, JavaScript inicializa `nameLength` a `undefined` en lugar de lanzar un error.

Nota que este comportamiento también es más robusto que nuestra verificación de `if (db && db.user && db.user.name)`. Por ejemplo, ¿y si `name` siempre estuviera garantizado como una cadena? Podríamos cambiar `name?.length` a `name.length`. Entonces, si `name` fuera una cadena vacía, aún obtendríamos la longitud correcta de `0`. Esto se debe a que la cadena vacía es un valor falsy: se comporta como `false` en una cláusula `if`. El operador de encadenamiento opcional soluciona esta fuente común de errores.

## Formas adicionales de la sintaxis: llamadas y propiedades dinámicas

También hay una versión del operador para llamar métodos opcionales:

```js
// Extiende la interfaz con un método opcional, que está presente
// solo para los usuarios administradores.
const adminOption = db?.user?.validateAdminAndGetPrefs?.().option;
```

La sintaxis puede sentirse inesperada, ya que `?.()` es el operador real, que aplica a la expresión _antes_ de él.

Hay un tercer uso del operador, a saber, el acceso opcional a propiedades dinámicas, que se realiza mediante `?.[]`. Devuelve el valor referenciado por el argumento dentro de los corchetes, o `undefined` si no hay un objeto del cual obtener el valor. Aquí tienes un caso de uso posible, siguiendo el ejemplo anterior:

```js
// Extiende las capacidades del acceso a propiedades estáticas
// con un nombre de propiedad generado dinámicamente.
const optionName = 'optional setting';
const optionLength = db?.user?.preferences?.[optionName].length;
```

Esta última forma también está disponible para indexar opcionalmente arreglos, por ejemplo:

```js
// Si el `usersArray` es `null` o `undefined`,
// entonces `userName` se evalúa con gracia a `undefined`.
const userIndex = 42;
const userName = usersArray?.[userIndex].name;
```

El operador de encadenamiento opcional puede combinarse con el [operador nullish coalescing `??`](/features/nullish-coalescing) cuando se necesita un valor predeterminado que no sea `undefined`. Esto permite un acceso seguro a propiedades profundas con un valor predeterminado especificado, abordando un caso de uso común que previamente requería bibliotecas como [el `_.get` de lodash](https://lodash.dev/docs/4.17.15#get):

```js
const object = { id: 123, names: { first: 'Alice', last: 'Smith' }};

{ // Con lodash:
  const firstName = _.get(object, 'names.first');
  // → 'Alice'

  const middleName = _.get(object, 'names.middle', '(sin segundo nombre)');
  // → '(sin segundo nombre)'
}

{ // Con encadenamiento opcional y nullish coalescing:
  const firstName = object?.names?.first ?? '(sin primer nombre)';
  // → 'Alice'

  const middleName = object?.names?.middle ?? '(sin segundo nombre)';
  // → '(sin segundo nombre)';
}
```

## Propiedades del operador de encadenamiento opcional

El operador de encadenamiento opcional tiene algunas propiedades interesantes: _cortocircuito_, _apilamiento_ y _eliminación opcional_. Vamos a recorrer cada una de estas con un ejemplo.

_Cortocircuito_ significa no evaluar el resto de la expresión si un operador de encadenamiento opcional termina antes:

```js
// `edad` se incrementa solo si `db` y `usuario` están definidos.
db?.usuario?.crecer(++edad);
```

_Encadenamiento_ significa que se pueden aplicar más de un operador de encadenamiento opcional en una secuencia de accesos a propiedades:

```js
// Una cadena opcional puede ser seguida por otra cadena opcional.
const longitudDelPrimerNombre = db.usuarios?.[42]?.nombres.primero.longitud;
```

Aun así, sé considerado al usar más de un operador de encadenamiento opcional en una sola cadena. Si un valor está garantizado a no ser nulo o indefinido, se desaconseja usar `?.` para acceder a sus propiedades. En el ejemplo anterior, se asume que `db` siempre está definido, pero `db.usuarios` y `db.usuarios[42]` pueden no estarlo. Si existe tal usuario en la base de datos, entonces se asume que `nombres.primero.longitud` siempre está definido.

_Eliminación opcional_ significa que el operador `delete` puede combinarse con una cadena opcional:

```js
// `db.usuario` se elimina solo si `db` está definido.
delete db?.usuario;
```

Más detalles se pueden encontrar en [la sección _Semántica_ de la propuesta](https://github.com/tc39/proposal-optional-chaining#semantics).

## Soporte para el encadenamiento opcional

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9553"
                 firefox="74 https://bugzilla.mozilla.org/show_bug.cgi?id=1566143"
                 safari="13.1 https://bugs.webkit.org/show_bug.cgi?id=200199"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining"></feature-support>
