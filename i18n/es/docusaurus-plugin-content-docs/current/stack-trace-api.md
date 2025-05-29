---
title: &apos;API de rastreo de pila&apos;
description: &apos;Este documento detalla el API de rastreo de pila de JavaScript de V8.&apos;
---
Todos los errores internos lanzados en V8 capturan un rastreo de pila al ser creados. Este rastreo de pila se puede acceder desde JavaScript a través de la propiedad `error.stack`, que no es estándar. V8 también tiene varios hooks para controlar cómo se recolectan y se formatean los rastreos de pila, y para permitir que errores personalizados también recolecten rastreos de pila. Este documento detalla el API de rastreo de pila de JavaScript de V8.

## Rastreos de pila básicos

Por defecto, casi todos los errores lanzados por V8 tienen una propiedad `stack` que contiene los primeros 10 marcos de pila, formateados como una cadena. Aquí hay un ejemplo de un rastreo de pila completamente formateado:

```
ReferenceError: FAIL no está definido
   en Constraint.execute (deltablue.js:525:2)
   en Constraint.recalculate (deltablue.js:424:21)
   en Planner.addPropagate (deltablue.js:701:6)
   en Constraint.satisfy (deltablue.js:184:15)
   en Planner.incrementalAdd (deltablue.js:591:21)
   en Constraint.addConstraint (deltablue.js:162:10)
   en Constraint.BinaryConstraint (deltablue.js:346:7)
   en Constraint.EqualityConstraint (deltablue.js:515:38)
   en chainTest (deltablue.js:807:6)
   en deltaBlue (deltablue.js:879:2)
```

El rastreo de pila se recopila cuando se crea el error y es el mismo independientemente de dónde o cuántas veces se lance el error. Recopilamos 10 marcos porque generalmente es suficiente para ser útil pero no tantos como para tener un impacto negativo notable en el rendimiento. Puedes controlar cuántos marcos de pila se recopilan estableciendo la variable

```js
Error.stackTraceLimit
```

Establecerlo en `0` desactiva la recopilación de rastreo de pila. Cualquier valor entero finito puede ser usado como el número máximo de marcos a recopilar. Establecerlo en `Infinity` significa que se recopilan todos los marcos. Esta variable solo afecta al contexto actual; debe establecerse explícitamente para cada contexto que necesite un valor diferente. (Ten en cuenta que lo que se conoce como “contexto” en la terminología de V8 corresponde a una página o `<iframe>` en Google Chrome). Para establecer un valor predeterminado diferente que afecte a todos los contextos utiliza la siguiente bandera de línea de comando de V8:

```bash
--stack-trace-limit <valor>
```

Para pasar esta bandera a V8 al ejecutar Google Chrome, utiliza:

```bash
--js-flags=&apos;--stack-trace-limit <valor>&apos;
```

## Rastreos de pila asíncronos

La bandera `--async-stack-traces` (activada por defecto desde [V8 v7.3](https://v8.dev/blog/v8-release-73#async-stack-traces)) habilita los nuevos [rastros de pila asíncronos sin costo adicional](https://bit.ly/v8-zero-cost-async-stack-traces), lo que enriquece la propiedad `stack` de las instancias de `Error` con marcos de pila asíncronos, es decir, las ubicaciones de `await` en el código. Estos marcos asíncronos están marcados con `async` en la cadena `stack`:

```
ReferenceError: FAIL no está definido
    en bar (<anónimo>)
    en async foo (<anónimo>)
```

En el momento de escribir este documento, esta funcionalidad está limitada a ubicaciones de `await`, `Promise.all()` y `Promise.any()`, ya que en esos casos el motor puede reconstruir la información necesaria sin ningún costo adicional (por eso es sin costo).

## Recopilación de rastreos de pila para excepciones personalizadas

El mecanismo de rastreo de pila utilizado para errores integrados está implementado mediante un API general de recopilación de rastreos de pila que también está disponible para scripts de usuario. La función

```js
Error.captureStackTrace(error, constructorOpt)
```

agrega una propiedad stack al objeto `error` dado que produce el rastreo de pila en el momento en que se llama a `captureStackTrace`. Los rastros de pila recopilados a través de `Error.captureStackTrace` se recopilan inmediatamente, se formatean y se adjuntan al objeto `error` dado.

El parámetro opcional `constructorOpt` te permite pasar un valor de función. Al recopilar el rastreo de pila, todos los marcos por encima de la llamada más alta a esta función, incluida esa llamada, quedan fuera del rastreo de pila. Esto puede ser útil para ocultar detalles de implementación que no serán útiles para el usuario. La forma habitual de definir un error personalizado que capture un rastreo de pila sería:

```js
function MyError() {
  Error.captureStackTrace(this, MyError);
  // Cualquier otra inicialización aquí.
}
```

Pasar MyError como segundo argumento significa que la llamada al constructor de MyError no aparecerá en el rastreo de pila.

## Personalización de los rastreos de pila

A diferencia de Java, donde el rastreo de pila de una excepción es un valor estructurado que permite inspeccionar el estado de la pila, la propiedad stack en V8 simplemente contiene una cadena plana con el rastreo de pila formateado. Esto no tiene otra razón que la compatibilidad con otros navegadores. Sin embargo, esto no está codificado sino que es solo el comportamiento predeterminado y puede ser anulado por los scripts del usuario.

Por eficiencia, los rastreos de pila no se formatean cuando se capturan, sino bajo demanda, la primera vez que se accede a la propiedad stack. Un rastreo de pila se formatea llamando a

```js
Error.prepareStackTrace(error, structuredStackTrace)
```

y utilizando cualquier valor que esta llamada retorne como el valor de la propiedad `stack`. Si asignas un valor de función diferente a `Error.prepareStackTrace`, esa función se usará para formatear los trazos de pila. Se le pasa el objeto de error que está preparando un trazo de pila, así como una representación estructurada de la pila. Los formateadores de trazos de pila personalizados son libres de formatear el trazo de pila como deseen e incluso devolver valores que no sean cadenas. Es seguro retener referencias al objeto estructurado del trazo de pila después de que se complete una llamada a `prepareStackTrace` para que también sea un valor de retorno válido. Ten en cuenta que la función personalizada `prepareStackTrace` solo se llama una vez que se accede a la propiedad de pila del objeto `Error`.

El trazo de pila estructurado es un array de objetos `CallSite`, cada uno de los cuales representa un marco de pila. Un objeto `CallSite` define los siguientes métodos:

- `getThis`: devuelve el valor de `this`
- `getTypeName`: devuelve el tipo de `this` como una cadena. Este es el nombre de la función guardada en el campo del constructor de `this`, si está disponible; de lo contrario, la propiedad interna `[[Class]]` del objeto.
- `getFunction`: devuelve la función actual
- `getFunctionName`: devuelve el nombre de la función actual, típicamente su propiedad `name`. Si no hay una propiedad `name` disponible, se intenta inferir un nombre a partir del contexto de la función.
- `getMethodName`: devuelve el nombre de la propiedad de `this` o de uno de sus prototipos que contiene la función actual
- `getFileName`: si esta función fue definida en un script, devuelve el nombre del script
- `getLineNumber`: si esta función fue definida en un script, devuelve el número de línea actual
- `getColumnNumber`: si esta función fue definida en un script, devuelve el número de columna actual
- `getEvalOrigin`: si esta función fue creada usando una llamada a `eval`, devuelve una cadena que representa la ubicación donde se llamó a `eval`
- `isToplevel`: ¿Es esta una invocación de nivel superior, es decir, es este el objeto global?
- `isEval`: ¿Ocurre esta llamada en código definido por una llamada a `eval`?
- `isNative`: ¿Es esta llamada en código nativo de V8?
- `isConstructor`: ¿Es esta una llamada al constructor?
- `isAsync`: ¿Es esta una llamada asíncrona (es decir, `await`, `Promise.all()`, o `Promise.any()`)?
- `isPromiseAll`: ¿Es esta una llamada asíncrona a `Promise.all()`?
- `getPromiseIndex`: devuelve el índice del elemento promise que fue seguido en `Promise.all()` o `Promise.any()` para trazos de pila asíncronos, o `null` si el `CallSite` no es una llamada asíncrona a `Promise.all()` o `Promise.any()`.

El trazo de pila predeterminado se crea usando la API de CallSite, por lo que cualquier información disponible allí también está disponible a través de esta API.

Para mantener las restricciones impuestas a las funciones en modo estricto, los marcos que tienen una función en modo estricto y todos los marcos inferiores (su llamador, etc.) no pueden acceder a sus objetos receptor y de función. Para esos marcos, `getFunction()` y `getThis()` devuelven `undefined`.

## Compatibilidad

La API descrita aquí es específica de V8 y no es compatible con ninguna otra implementación de JavaScript. La mayoría de las implementaciones proporcionan una propiedad `error.stack`, pero el formato del trazo de pila probablemente será diferente del formato descrito aquí. El uso recomendado de esta API es:

- Solo confía en el diseño del trazo de pila formateado si sabes que tu código se ejecuta en V8.
- Es seguro establecer `Error.stackTraceLimit` y `Error.prepareStackTrace` independientemente de qué implementación esté ejecutando tu código, pero ten en cuenta que solo tendrá efecto si tu código se ejecuta en V8.

## Apéndice: Formato del trazo de pila

El formato del trazo de pila predeterminado usado por V8 puede, para cada marco de pila, proporcionar la siguiente información:

- Si la llamada es una llamada constructora.
- El tipo del valor de `this` (`Type`).
- El nombre de la función llamada (`functionName`).
- El nombre de la propiedad de este objeto o de uno de sus prototipos que contiene la función (`methodName`).
- La ubicación actual dentro del origen (`location`).

Cualquiera de estos puede no estar disponible y se usan diferentes formatos para los marcos de pila según cuánta de esta información esté disponible. Si toda la información mencionada está disponible, un marco de pila formateado se ve así:

```
at Type.functionName [as methodName] (location)
```

O, en el caso de una llamada constructora:

```
at new functionName (location)
```

O, en el caso de una llamada asíncrona:

```
at async functionName (location)
```

Si solo uno de `functionName` y `methodName` está disponible, o si ambos están disponibles pero son iguales, el formato es:

```
at Type.name (location)
```

Si ninguno está disponible, se usa `<anonymous>` como el nombre.

El valor de `Type` es el nombre de la función almacenada en el campo del constructor de `this`. En V8, todas las llamadas al constructor configuran esta propiedad en la función del constructor, por lo que, a menos que este campo haya sido cambiado activamente después de que se creó el objeto, contiene el nombre de la función que lo creó. Si no está disponible, se usa la propiedad `[[Class]]` del objeto.

Un caso especial es el objeto global donde no se muestra `Type`. En ese caso, el marco de pila se formatea como:

```
at functionName [as methodName] (location)
```

La ubicación en sí tiene varios formatos posibles. El más común es el nombre del archivo, el número de línea y el número de columna dentro del script que definió la función actual:

```
fileName:lineNumber:columnNumber
```

Si la función actual fue creada usando `eval`, el formato es:

```
eval at position
```

…donde `position` es la posición completa donde ocurrió la llamada a `eval`. Ten en cuenta que esto significa que las posiciones pueden anidarse si hay llamadas anidadas a `eval`, por ejemplo:

```
eval en Foo.a (eval en Bar.z (myscript.js:10:3))
```

Si un marco de pila está dentro de las bibliotecas de V8, la ubicación es:

```
nativo
```

…y si no está disponible, es:

```
ubicación desconocida
```
