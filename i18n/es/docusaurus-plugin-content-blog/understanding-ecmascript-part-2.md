---
title: "Entendiendo la especificación de ECMAScript, parte 2"
author: "[Marja Hölttä](https://twitter.com/marjakh), espectadora especulativa de especificaciones"
avatars: 
  - marja-holtta
date: 2020-03-02
tags: 
  - ECMAScript
  - Entendiendo ECMAScript
description: "Tutorial para leer la especificación de ECMAScript, parte 2"
tweet: "1234550773629014016"
---

Practiquemos un poco más nuestras increíbles habilidades para leer especificaciones. ¡Si todavía no has visto el episodio anterior, ahora es un buen momento para hacerlo!

[Todos los episodios](/blog/tags/understanding-ecmascript)

## ¿Listo para la parte 2?

Una forma divertida de conocer la especificación es comenzar con una característica de JavaScript que sabemos que existe y averiguar cómo está especificada.

> ¡Advertencia! Este episodio contiene algoritmos copiados de la [especificación ECMAScript](https://tc39.es/ecma262/) de febrero de 2020. Eventualmente estarán desactualizados.

Sabemos que las propiedades se buscan en la cadena de prototipos: si un objeto no tiene la propiedad que intentamos leer, subimos por la cadena de prototipos hasta encontrarla (o encontramos un objeto que ya no tiene prototipo).

Por ejemplo:

```js
const o1 = { foo: 99 };
const o2 = {};
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 99
```

## ¿Dónde está definida la cadena de prototipos?

Intentemos averiguar dónde se define este comportamiento. Un buen lugar para comenzar es una lista de [Métodos Internos de Objetos](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots).

Existen tanto `[[GetOwnProperty]]` como `[[Get]]` — estamos interesados en la versión que no está restringida a propiedades _propias_, así que iremos con `[[Get]]`.

Desafortunadamente, el [tipo de especificación Descriptor de Propiedades](https://tc39.es/ecma262/#sec-property-descriptor-specification-type) también tiene un campo llamado `[[Get]]`, así que mientras navegamos por la especificación en busca de `[[Get]]`, debemos distinguir cuidadosamente entre los dos usos independientes.

<!--truncate-->
`[[Get]]` es un **método interno esencial**. **Los objetos ordinarios** implementan el comportamiento predeterminado para los métodos internos esenciales. **Los objetos exóticos** pueden definir su propio método interno `[[Get]]` que se desvía del comportamiento predeterminado. En este post, nos enfocamos en objetos ordinarios.

La implementación predeterminada de `[[Get]]` delega en `OrdinaryGet`:

:::ecmascript-algorithm
> **[`[[Get]] ( P, Receiver )`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-get-p-receiver)**
>
> Cuando el método interno `[[Get]]` de `O` es llamado con la clave de propiedad `P` y el valor del lenguaje ECMAScript `Receiver`, se siguen los pasos siguientes:
>
> 1. Devuelve `? OrdinaryGet(O, P, Receiver)`.

Veremos en breve que `Receiver` es el valor que se usa como el valor **this** al llamar a una función getter de una propiedad accesoria.

`OrdinaryGet` se define así:

:::ecmascript-algorithm
> **[`OrdinaryGet ( O, P, Receiver )`](https://tc39.es/ecma262/#sec-ordinaryget)**
>
> Cuando la operación abstracta `OrdinaryGet` es llamada con el objeto `O`, la clave de propiedad `P` y el valor del lenguaje ECMAScript `Receiver`, se siguen los pasos siguientes:
>
> 1. Asegúrate de que `IsPropertyKey(P)` sea `true`.
> 1. Deja que `desc` sea `? O.[[GetOwnProperty]](P)`.
> 1. Si `desc` es `undefined`, entonces
>     1. Deja que `parent` sea `? O.[[GetPrototypeOf]]()`.
>     1. Si `parent` es `null`, devuelve `undefined`.
>     1. Devuelve `? parent.[[Get]](P, Receiver)`.
> 1. Si `IsDataDescriptor(desc)` es `true`, devuelve `desc.[[Value]]`.
> 1. Asegúrate de que `IsAccessorDescriptor(desc)` sea `true`.
> 1. Deja que `getter` sea `desc.[[Get]]`.
> 1. Si `getter` es `undefined`, devuelve `undefined`.
> 1. Devuelve `? Call(getter, Receiver)`.

La cadena de prototipos está dentro del paso 3: si no encontramos la propiedad como una propiedad propia, llamamos al método `[[Get]]` del prototipo, que delega nuevamente en `OrdinaryGet`. Si aún no encontramos la propiedad, llamamos al método `[[Get]]` del prototipo de este último, que delega nuevamente en `OrdinaryGet`, y así sucesivamente, hasta que encontremos la propiedad o lleguemos a un objeto sin prototipo.

Veamos cómo funciona este algoritmo cuando accedemos a `o2.foo`. Primero invocamos `OrdinaryGet` con `O` siendo `o2` y `P` siendo `"foo"`. `O.[[GetOwnProperty]]("foo")` devuelve `undefined`, dado que `o2` no tiene una propiedad propia llamada `"foo"`, así que tomamos la rama del `if` en el paso 3. En el paso 3.a, establecemos `parent` como el prototipo de `o2`, que es `o1`. `parent` no es `null`, así que no devolvemos en el paso 3.b. En el paso 3.c, llamamos al método `[[Get]]` del prototipo con la clave de propiedad `"foo"` y devolvemos lo que este devuelve.

El padre (`o1`) es un objeto ordinario, por lo que su método `[[Get]]` invoca `OrdinaryGet` nuevamente, esta vez con `O` siendo `o1` y `P` siendo `"foo"`. `o1` tiene una propiedad propia llamada `"foo"`, así que en el paso 2, `O.[[GetOwnProperty]]("foo")` devuelve el Descriptor de Propiedad asociado y lo almacenamos en `desc`.

[Property Descriptor](https://tc39.es/ecma262/#sec-property-descriptor-specification-type) es un tipo en la especificación. Los descriptors de propiedades de datos almacenan el valor de la propiedad directamente en el campo `[[Value]]`. Los descriptors de propiedades de acceso almacenan las funciones de acceso en los campos `[[Get]]` y/o `[[Set]]`. En este caso, el descriptor de propiedad asociado con `"foo"` es un descriptor de propiedad de datos.

El descriptor de propiedad de datos que almacenamos en `desc` en el paso 2 no es `undefined`, por lo que no seguimos la rama del `if` en el paso 3. Luego ejecutamos el paso 4. El descriptor de propiedad es un descriptor de propiedad de datos, por lo que devolvemos el campo `[[Value]]`, `99`, en el paso 4, y listo.

## ¿Qué es `Receiver` y de dónde proviene?

El parámetro `Receiver` solo se utiliza en el caso de propiedades de acceso en el paso 8. Se pasa como el **valor this** al llamar a la función getter de una propiedad de acceso.

`OrdinaryGet` pasa el `Receiver` original a lo largo de la recursión, sin cambios (paso 3.c). ¡Veamos de dónde proviene originalmente el `Receiver`!

Buscando lugares donde se llama a `[[Get]]`, encontramos una operación abstracta `GetValue` que opera sobre Referencias. La Referencia es un tipo en la especificación que consta de un valor base, el nombre referenciado y una marca de referencia estricta. En el caso de `o2.foo`, el valor base es el objeto `o2`, el nombre referenciado es el string `"foo"`, y la marca de referencia estricta es `false` porque el código del ejemplo no es estricto.

### Nota sobre el costado: ¿Por qué la Referencia no es un Registro?

Nota sobre el costado: La Referencia no es un Registro, aunque suena como si pudiera serlo. Contiene tres componentes, que podrían expresarse igualmente como tres campos nombrados. La Referencia no es un Registro solo por razones históricas.

### Volviendo a `GetValue`

Veamos cómo se define `GetValue`:

:::ecmascript-algorithm
> **[`GetValue ( V )`](https://tc39.es/ecma262/#sec-getvalue)**
>
> 1. `ReturnIfAbrupt(V)`.
> 1. Si `Type(V)` no es `Reference`, devuelve `V`.
> 1. Deja que `base` sea `GetBase(V)`.
> 1. Si `IsUnresolvableReference(V)` es `true`, lanza una excepción `ReferenceError`.
> 1. Si `IsPropertyReference(V)` es `true`, entonces
>     1. Si `HasPrimitiveBase(V)` es `true`, entonces
>         1. Asegúrate de que, en este caso, `base` nunca será `undefined` o `null`.
>         1. Asigna `base` a `! ToObject(base)`.
>     1. Devuelve `? base.[[Get]](GetReferencedName(V), GetThisValue(V))`.
> 1. De lo contrario,
>     1. Asegúrate de que `base` es un registro de entorno.
>     1. Devuelve `? base.GetBindingValue(GetReferencedName(V), IsStrictReference(V))`

La Referencia en nuestro ejemplo es `o2.foo`, que es una referencia de propiedad. Así que seguimos la rama 5. No seguimos la rama en 5.a, ya que la base (`o2`) no es [un valor primitivo](/blog/react-cliff#javascript-types) (un Number, String, Symbol, BigInt, Boolean, Undefined o Null).

Luego llamamos a `[[Get]]` en el paso 5.b. El `Receiver` que pasamos es `GetThisValue(V)`. En este caso, es simplemente el valor base de la Referencia:

:::ecmascript-algorithm
> **[`GetThisValue( V )`](https://tc39.es/ecma262/#sec-getthisvalue)**
>
> 1. Asegúrate de que `IsPropertyReference(V)` es `true`.
> 1. Si `IsSuperReference(V)` es `true`, entonces
>     1. Devuelve el valor del componente `thisValue` de la referencia `V`.
> 1. Devuelve `GetBase(V)`.

Para `o2.foo`, no seguimos la rama en el paso 2, ya que no es una Super Referencia (como `super.foo`), pero seguimos el paso 3 y devolvemos el valor base de la Referencia, que es `o2`.

Uniendo todo, descubrimos que configuramos el `Receiver` como la base de la Referencia original, y luego lo mantenemos sin cambios durante la caminata por la cadena de prototipos. Finalmente, si la propiedad que encontramos es una propiedad de acceso, usamos el `Receiver` como el **valor this** al llamarlo.

En particular, el **valor this** dentro de un getter se refiere al objeto original desde donde intentamos obtener la propiedad, no al objeto donde encontramos la propiedad durante la caminata por la cadena de prototipos.

¡Intentémoslo!

```js
const o1 = { x: 10, get foo() { return this.x; } };
const o2 = { x: 50 };
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 50
```

En este ejemplo, tenemos una propiedad de acceso llamada `foo` y definimos un getter para ella. El getter devuelve `this.x`.

Luego accedemos a `o2.foo` - ¿qué devuelve el getter?

Descubrimos que cuando llamamos al getter, el **valor this** es el objeto desde el cual originalmente intentamos obtener la propiedad, no el objeto donde lo encontramos. En este caso, el **valor this** es `o2`, no `o1`. Podemos verificarlo observando si el getter devuelve `o2.x` o `o1.x`, y de hecho, devuelve `o2.x`.

¡Funciona! Pudimos predecir el comportamiento de este fragmento de código basándonos en lo que leímos en la especificación.

## Accediendo a propiedades — ¿por qué invoca `[[Get]]`?

¿Dónde dice la especificación que el método interno `[[Get]]` de un objeto se invocará al acceder a una propiedad como `o2.foo`? Seguramente eso debe estar definido en algún lugar. ¡No solo confíes en mi palabra!

Descubrimos que el método interno `[[Get]]` de un objeto se llama desde la operación abstracta `GetValue`, que opera sobre Referencias. Pero, ¿de dónde se llama a `GetValue`?

### Semántica en tiempo de ejecución para `MemberExpression`

Las reglas gramaticales de la especificación definen la sintaxis del lenguaje. [Semántica de tiempo de ejecución](https://tc39.es/ecma262/#sec-runtime-semantics) define lo que los constructos sintácticos 'significan' (cómo evaluarlos en tiempo de ejecución).

Si no estás familiarizado con las [gramáticas libres de contexto](https://en.wikipedia.org/wiki/Context-free_grammar), ¡es una buena idea revisarlas ahora!

¡Echaremos un vistazo más profundo a las reglas gramaticales en un episodio posterior, mantengámoslo simple por ahora! En particular, podemos ignorar los subíndices (`Yield`, `Await`, etc.) en las producciones para este episodio.

Las siguientes producciones describen cómo se ve un [`MemberExpression`](https://tc39.es/ecma262/#prod-MemberExpression):

```grammar
MemberExpression :
  PrimaryExpression
  MemberExpression [ Expression ]
  MemberExpression . IdentifierName
  MemberExpression TemplateLiteral
  SuperProperty
  MetaProperty
  new MemberExpression Arguments
```

Aquí tenemos 7 producciones para `MemberExpression`. Una `MemberExpression` puede ser simplemente una `PrimaryExpression`. Alternativamente, una `MemberExpression` puede ser construida a partir de otra `MemberExpression` y una `Expression` combinándolas: `MemberExpression [ Expression ]`, por ejemplo `o2['foo']`. O puede ser `MemberExpression . IdentifierName`, por ejemplo `o2.foo` — esta es la producción relevante para nuestro ejemplo.

La semántica de tiempo de ejecución para la producción `MemberExpression : MemberExpression . IdentifierName` define el conjunto de pasos a seguir al evaluarla:

:::ecmascript-algorithm
> **[Semántica de tiempo de ejecución: Evaluación para `MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#sec-property-accessors-runtime-semantics-evaluation)**
>
> 1. Que `baseReference` sea el resultado de evaluar `MemberExpression`.
> 1. Que `baseValue` sea `? GetValue(baseReference)`.
> 1. Si el código coincidente con esta `MemberExpression` es código en modo estricto, que `strict` sea `true`; sino que `strict` sea `false`.
> 1. Devuelve `? EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict)`.

El algoritmo delega en la operación abstracta `EvaluatePropertyAccessWithIdentifierKey`, así que necesitamos leerlo también:

:::ecmascript-algorithm
> **[`EvaluatePropertyAccessWithIdentifierKey( baseValue, identifierName, strict )`](https://tc39.es/ecma262/#sec-evaluate-property-access-with-identifier-key)**
>
> La operación abstracta `EvaluatePropertyAccessWithIdentifierKey` toma como argumentos un valor `baseValue`, un nodo de parseo `identifierName` y un argumento Booleano `strict`. Realiza los siguientes pasos:
>
> 1. Asegúrate: `identifierName` es un `IdentifierName`.
> 1. Que `bv` sea `? RequireObjectCoercible(baseValue)`.
> 1. Que `propertyNameString` sea el `StringValue` de `identifierName`.
> 1. Devuelve un valor de tipo Reference cuyo componente base sea `bv`, cuyo componente de nombre referenciado sea `propertyNameString`, y cuya bandera de referencia estricta sea `strict`.

Es decir: `EvaluatePropertyAccessWithIdentifierKey` construye una referencia que utiliza el `baseValue` proporcionado como base, el valor de cadena de `identifierName` como el nombre de la propiedad, y `strict` como la bandera de modo estricto.

Eventualmente esta referencia se pasa a `GetValue`. Esto se define en varios lugares en la especificación, dependiendo de cómo se termine utilizando la referencia.

### `MemberExpression` como un parámetro

En nuestro ejemplo usamos el acceso a la propiedad como un parámetro:

```js
console.log(o2.foo);
```

En este caso, el comportamiento está definido en la semántica de tiempo de ejecución de la producción `ArgumentList` que llama a `GetValue` en el argumento:

:::ecmascript-algorithm
> **[Semántica de tiempo de ejecución: `ArgumentListEvaluation`](https://tc39.es/ecma262/#sec-argument-lists-runtime-semantics-argumentlistevaluation)**
>
> `ArgumentList : AssignmentExpression`
>
> 1. Que `ref` sea el resultado de evaluar `AssignmentExpression`.
> 1. Que `arg` sea `? GetValue(ref)`.
> 1. Devuelve una Lista cuyo único elemento es `arg`.

`o2.foo` no parece una `AssignmentExpression` pero lo es, por lo que esta producción es aplicable. Para descubrir por qué, puedes revisar este [contenido adicional](/blog/extras/understanding-ecmascript-part-2-extra), pero no es estrictamente necesario en este punto.

La `AssignmentExpression` en el paso 1 es `o2.foo`. `ref`, el resultado de evaluar `o2.foo`, es la referencia mencionada anteriormente. En el paso 2 llamamos a `GetValue` sobre ella. Por lo tanto, sabemos que se invocará el método interno de objeto `[[Get]]`, y ocurrirá la exploración de la cadena de prototipos.

## Resumen

En este episodio, vimos cómo la especificación define una característica del lenguaje, en este caso la búsqueda de prototipos, a través de todas las diferentes capas: los constructos sintácticos que activan la característica y los algoritmos que la definen.
