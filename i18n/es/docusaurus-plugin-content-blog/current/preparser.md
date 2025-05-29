---
title: "Análisis increíblemente rápido, parte 2: análisis perezoso"
author: "Toon Verwaest ([@tverwaes](https://twitter.com/tverwaes)) y Marja Hölttä ([@marjakh](https://twitter.com/marjakh)), parsers más ligeros"
avatars: 
  - "toon-verwaest"
  - "marja-holtta"
date: "2019-04-15 17:03:37"
tags: 
  - internos
  - análisis
tweet: "1117807107972243456"
description: "Esta es la segunda parte de nuestra serie de artículos que explica cómo V8 analiza JavaScript lo más rápido posible."
---
Esta es la segunda parte de nuestra serie que explica cómo V8 analiza JavaScript lo más rápido posible. La primera parte explicó cómo hicimos rápido el [escáner](/blog/scanner) de V8.

El análisis es el paso en el que el código fuente se convierte en una representación intermedia que es consumida por un compilador (en V8, el compilador de bytecode [Ignition](/blog/ignition-interpreter)). El análisis y la compilación ocurren en la ruta crítica del inicio de la página web, y no todas las funciones enviadas al navegador son necesarias de inmediato durante el inicio. Aunque los desarrolladores pueden retrasar dicho código con scripts async y deferred, eso no siempre es factible. Además, muchas páginas web envían código que solo es utilizado por ciertas características que un usuario puede ni siquiera acceder durante una ejecución individual de la página.

<!--truncate-->
Compilar código de forma ansiosa innecesariamente tiene costos reales de recursos:

- Se utilizan ciclos de CPU para crear el código, lo que retrasa la disponibilidad del código que realmente se necesita para el inicio.
- Los objetos de código ocupan memoria, al menos hasta que el [flushing de bytecode](/blog/v8-release-74#bytecode-flushing) decide que el código no se necesita actualmente y permite que sea recolectado como basura.
- El código compilado al finalizar la ejecución del script de nivel superior termina siendo almacenado en el disco, ocupando espacio en el disco.

Por estas razones, todos los navegadores importantes implementan _análisis perezoso_. En lugar de generar un árbol de sintaxis abstracta (AST) para cada función y luego compilarla en bytecode, el analizador puede decidir “pre-analizar” las funciones que encuentra en lugar de analizarlas completamente. Lo hace cambiando al [pre-analizador](https://cs.chromium.org/chromium/src/v8/src/parsing/preparser.h?l=921&rcl=e3b2feb3aade83c02e4bd2fa46965a69215cd821), una copia del analizador que hace lo mínimo necesario para poder de otro modo omitir la función. El pre-analizador verifica que las funciones que omite sean sintácticamente válidas y produce toda la información necesaria para que las funciones externas se compilen correctamente. Cuando una función pre-analizada es llamada más tarde, se analiza y compila completamente bajo demanda.

## Asignación de variables

Lo principal que complica el pre-análisis es la asignación de variables.

Por razones de rendimiento, las activaciones de funciones se gestionan en la pila de la máquina. Por ejemplo, si una función `g` llama a una función `f` con argumentos `1` y `2`:

```js
function f(a, b) {
  const c = a + b;
  return c;
}

function g() {
  return f(1, 2);
  // El puntero de instrucción de retorno de `f` apunta ahora aquí
  // (porque cuando `f` `return`, vuelve aquí).
}
```

Primero el receptor (es decir, el valor `this` para `f`, que es `globalThis` ya que es una llamada a función laxa) se empuja en la pila, seguido por la función llamada `f`. Luego los argumentos `1` y `2` se empujan en la pila. En ese momento, se llama a la función `f`. Para ejecutar la llamada, primero guardamos el estado de `g` en la pila: el “puntero de instrucción de retorno” (`rip`; qué código necesitamos para regresar) de `f` así como el “puntero de marco” (`fp`; cómo debería lucir la pila al regresar). Luego entramos en `f`, que asigna espacio para la variable local `c`, así como cualquier espacio temporal que pueda necesitar. Esto asegura que cualquier dato utilizado por la función desaparezca cuando la activación de la función salga del alcance: simplemente se elimina de la pila.

![Diseño de pila de una llamada a la función `f` con argumentos `a`, `b` y la variable local `c` asignada en la pila.](/_img/preparser/stack-1.svg)

El problema con esta configuración es que las funciones pueden referenciar variables declaradas en funciones externas. Las funciones internas pueden sobrevivir a la activación en la que fueron creadas:

```js
function make_f(d) { // ← declaración de `d`
  return function inner(a, b) {
    const c = a + b + d; // ← referencia a `d`
    return c;
  };
}

const f = make_f(10);

function g() {
  return f(1, 2);
}
```

En el ejemplo anterior, la referencia de `inner` a la variable local `d` declarada en `make_f` se evalúa después de que `make_f` haya retornado. Para implementar esto, las VMs para lenguajes con cierres lexicográficos asignan variables referenciadas desde funciones internas en el heap, en una estructura llamada “contexto”.

![Diseño de pila de una llamada a `make_f` con el argumento copiado a un contexto asignado en el heap para su uso posterior por `inner` que captura `d`.](/_img/preparser/stack-2.svg)

Esto significa que para cada variable declarada en una función, necesitamos saber si una función interna hace referencia a la variable, para poder decidir si asignar la variable en la pila o en un contexto de montón. Cuando evaluamos un literal de función, asignamos un cierre que apunta tanto al código de la función como al contexto actual: el objeto que contiene los valores de las variables a las que puede necesitar acceso.

En resumen, necesitamos rastrear al menos las referencias de variables en el preparser.

Sin embargo, si solo rastreamos las referencias, sobreestimaremos qué variables están referenciadas. Una variable declarada en una función externa podría ser eclipsada por una redeclaración en una función interna, haciendo que una referencia desde esa función interna apunte a la declaración interna, no a la externa. Si asignáramos incondicionalmente la variable externa en el contexto, el rendimiento sufriría. Por lo tanto, para que la asignación de variables funcione correctamente con el preparsing, necesitamos asegurarnos de que las funciones preanalizadas mantengan correctamente el seguimiento de las referencias de variables y las declaraciones.

El código de nivel superior es una excepción a esta regla. El nivel superior de un script siempre se asigna en el montón, ya que las variables son visibles entre scripts. Una forma sencilla de acercarse a una arquitectura bien funcionando es simplemente ejecutar el preparser sin seguimiento de variables para analizar rápidamente funciones de nivel superior; y usar el parser completo para funciones internas, pero evitar compilarlas. Esto es más costoso que el preparsing ya que acumulamos innecesariamente un AST completo, pero nos pone en marcha. Esto es exactamente lo que V8 hizo hasta V8 v6.3 / Chrome 63.

## Enseñar al preparser sobre variables

Rastrear declaraciones y referencias de variables en el preparser es complicado porque en JavaScript no siempre está claro desde el principio cuál es el significado de una expresión parcial. Por ejemplo, supongamos que tenemos una función `f` con un parámetro `d`, que tiene una función interna `g` con una expresión que parece que podría referenciar a `d`.

```js
function f(d) {
  function g() {
    const a = ({ d }
```

De hecho, podría terminar referenciando a `d`, porque los tokens que vimos son parte de una expresión de asignación de desestructuración.

```js
function f(d) {
  function g() {
    const a = ({ d } = { d: 42 });
    return a;
  }
  return g;
}
```

También podría ser una función flecha con un parámetro de desestructuración `d`, en cuyo caso el `d` en `f` no es referenciado por `g`.

```js
function f(d) {
  function g() {
    const a = ({ d }) => d;
    return a;
  }
  return [d, g];
}
```

Inicialmente nuestro preparser se implementó como una copia independiente del parser sin demasiada compartición, lo que provocó que los dos parsers se desviaran con el tiempo. Al reescribir el parser y el preparser para que se basaran en un `ParserBase` que implementa el [patrón recurrente de plantilla curiosa](https://en.wikipedia.org/wiki/Curiously_recurring_template_pattern), logramos maximizar la compartición mientras manteníamos los beneficios de rendimiento de las copias separadas. Esto simplificó enormemente la adición de un seguimiento completo de variables al preparser, ya que gran parte de la implementación puede ser compartida entre el parser y el preparser.

De hecho, era incorrecto ignorar las declaraciones y referencias de variables incluso para funciones de nivel superior. La especificación ECMAScript requiere que diversos tipos de conflictos de variables sean detectados en el primer análisis del script. Por ejemplo, si una variable se declara dos veces como una variable léxica en el mismo ámbito, eso se considera un [error de sintaxis temprano](https://tc39.es/ecma262/#early-error). Dado que nuestro preparser simplemente pasaba por alto las declaraciones de variables, permitiría incorrectamente el código durante el preparse. En ese momento consideramos que la ganancia en el rendimiento justificaba la violación de la especificación. Ahora que el preparser rastrea las variables correctamente, sin embargo, erradicamos toda esta clase de violaciones relacionadas con la resolución de variables de la especificación sin un costo significativo de rendimiento.

## Omitiendo funciones internas

Como se mencionó anteriormente, cuando se llama por primera vez a una función preanalizada, la analizamos completamente y compilamos el AST resultante en bytecode.

```js
// Este es el ámbito de nivel superior.
function outer() {
  // preanalizada
  function inner() {
    // preanalizada
  }
}

outer(); // Analiza y compila completamente `outer`, pero no `inner`.
```

La función apunta directamente al contexto externo que contiene los valores de las declaraciones de variables que necesitan estar disponibles para las funciones internas. Para permitir la compilación perezosa de funciones (y para respaldar el depurador), el contexto apunta a un objeto de metadatos llamado [`ScopeInfo`](https://cs.chromium.org/chromium/src/v8/src/objects/scope-info.h?rcl=ce2242080787636827dd629ed5ee4e11a4368b9e&l=36). Los objetos `ScopeInfo` describen qué variables están listadas en un contexto. Esto significa que mientras se compilan funciones internas, podemos calcular dónde viven las variables en la cadena de contexto.

Sin embargo, para calcular si la función compilada de forma perezosa necesita un contexto, debemos realizar nuevamente la resolución de alcance: necesitamos saber si las funciones anidadas dentro de la función compilada de forma perezosa hacen referencia a las variables declaradas por la función perezosa. Podemos averiguarlo reparsing esas funciones. Esto es exactamente lo que hizo V8 hasta la versión V8 v6.3 / Chrome 63. Sin embargo, esto no es ideal en términos de rendimiento, ya que hace que la relación entre el tamaño de la fuente y el costo de análisis no sea lineal: reparsaríamos funciones tantas veces como estén anidadas. Además de la anidación natural de programas dinámicos, los compactadores de JavaScript suelen envolver el código en “[expresiones de función invocadas inmediatamente](https://en.wikipedia.org/wiki/Immediately_invoked_function_expression)” (IIFEs), haciendo que la mayoría de los programas JavaScript tengan múltiples capas de anidación.

![Cada reparsing agrega al menos el costo de analizar la función.](/_img/preparser/parse-complexity-before.svg)

Para evitar la sobrecarga de rendimiento no lineal, realizamos una resolución de alcance completa incluso durante el reparsing. Almacenamos suficiente metadatos para que posteriormente simplemente podamos _saltar_ las funciones internas, en lugar de tener que reparsararlas nuevamente. Una forma sería almacenar los nombres de las variables referenciadas por las funciones internas. Esto es costoso de almacenar y requiere que aún dupliquemos el trabajo: ya hemos realizado la resolución de variables durante el reparsing.

En su lugar, serializamos dónde se asignan las variables como un array denso de indicadores por variable. Cuando analizamos de forma perezosa una función, las variables se recrean en el mismo orden en que el preparser las vio, y simplemente podemos aplicar los metadatos a las variables. Ahora que la función está compilada, los metadatos de asignación de variables ya no son necesarios y pueden ser recolectados como basura. Dado que solo necesitamos estos metadatos para funciones que realmente contienen funciones internas, una gran parte de todas las funciones ni siquiera necesita estos metadatos, lo que reduce significativamente la sobrecarga de memoria.

![Al realizar un seguimiento de los metadatos para funciones preparadas, podemos saltar completamente las funciones internas.](/_img/preparser/parse-complexity-after.svg)

El impacto en el rendimiento de saltarse funciones internas es, al igual que la sobrecarga de reparsing funciones internas, no lineal. Hay sitios que elevan todas sus funciones al ámbito de nivel superior. Dado que su nivel de anidación siempre es 0, la sobrecarga siempre es 0. Sin embargo, muchos sitios modernos realmente anidan profundamente las funciones. En esos sitios vimos mejoras significativas cuando esta característica se lanzó en V8 v6.3 / Chrome 63. La principal ventaja es que ahora ya no importa cuán profundamente esté anidado el código: cualquier función se prepara como máximo una vez, y se analiza completamente una vez[^1].

![Tiempo de análisis en el hilo principal y fuera del hilo principal, antes y después de lanzar la optimización de “saltar funciones internas”.](/_img/preparser/skipping-inner-functions.svg)

[^1]: Por razones de memoria, V8 [vacía el bytecode](/blog/v8-release-74#bytecode-flushing) cuando no se usa durante un tiempo. Si el código termina siendo necesario nuevamente más tarde, lo analizamos y compilamos nuevamente. Dado que permitimos que los metadatos de las variables mueran durante la compilación, eso provoca un nuevo análisis de las funciones internas durante la recompilación perezosa. En ese momento, recreamos los metadatos para sus funciones internas, por lo que no necesitamos reparsar funciones internas nuevamente.

## Expresiones de Función Posiblemente Invocadas

Como se mencionó anteriormente, los compactadores suelen combinar múltiples módulos en un solo archivo envolviendo el código del módulo en un cierre que invocan de inmediato. Esto proporciona aislamiento para los módulos, permitiéndoles ejecutarse como si fueran el único código en el script. Estas funciones son esencialmente scripts anidados; las funciones se llaman inmediatamente después de la ejecución del script. Los compactadores comúnmente envían _expresiones de función invocadas inmediatamente_ (IIFEs; pronunciado “iffies”) como funciones entre paréntesis: `(function(){…})()`.

Dado que estas funciones se necesitan de inmediato durante la ejecución del script, no es ideal reparsar dichas funciones. Durante la ejecución de nivel superior del script necesitamos inmediatamente que la función se compile, y la parseamos y compilamos completamente. Esto significa que el análisis más rápido que hicimos anteriormente para tratar de acelerar el inicio tiene garantizado ser un costo adicional innecesario para el inicio.

¿Por qué no simplemente compilar funciones llamadas, te podrías preguntar? Si bien generalmente es sencillo para un desarrollador notar cuándo se llama a una función, este no es el caso para el parser. El parser necesita decidir —antes incluso de comenzar a analizar una función— si quiere compilar la función con entusiasmo o diferir la compilación. Las ambigüedades en la sintaxis hacen que sea difícil simplemente escanear rápidamente hasta el final de la función, y el costo se asemeja rápidamente al costo de reparsing regular.

Por esta razón, V8 tiene dos patrones simples que reconoce como _expresiones de función posiblemente invocadas_ (PIFEs; pronunciado “piffies”), sobre las cuales analiza y compila con entusiasmo una función:

- Si una función es una expresión de función entre paréntesis, es decir, `(function(){…})`, asumimos que será llamada. Hacemos esta suposición tan pronto como vemos el inicio de este patrón, es decir, `(function`.
- Desde V8 v5.7 / Chrome 57 también detectamos el patrón `!function(){…}(),function(){…}(),function(){…}()` generado por [UglifyJS](https://github.com/mishoo/UglifyJS2). Esta detección entra en acción tan pronto como vemos `!function`, o `,function` si sigue inmediatamente a una PIFE.

Dado que V8 compila con entusiasmo las PIFEs, se pueden usar como [comentarios dirigidos por perfil](https://en.wikipedia.org/wiki/Profile-guided_optimization)[^2], informando al navegador qué funciones son necesarias para el inicio.

En un momento en que V8 aún reprocesaba funciones internas, algunos desarrolladores habían notado que el impacto del análisis de JS en el inicio era bastante alto. El paquete [`optimize-js`](https://github.com/nolanlawson/optimize-js) convierte funciones en PIFEs basado en heurísticas estáticas. En el momento en que se creó el paquete, esto tuvo un gran impacto en el rendimiento de carga en V8. Hemos replicado estos resultados ejecutando las pruebas proporcionadas por `optimize-js` en V8 v6.1, observando únicamente scripts minificados.

![Analizar y compilar PIFEs de forma anticipada resulta en un inicio en frío y caliente ligeramente más rápido (primera y segunda carga de página, midiendo tiempos totales de análisis + compilación + ejecución). Sin embargo, el beneficio es mucho menor en V8 v7.5 en comparación con V8 v6.1 debido a mejoras significativas en el analizador.](/_img/preparser/eager-parse-compile-pife.svg)

No obstante, ahora que ya no reprocesamos funciones internas y dado que el analizador se ha vuelto mucho más rápido, la mejora en el rendimiento obtenida a través de `optimize-js` se ha reducido considerablemente. La configuración predeterminada para v7.5 es, de hecho, ya mucho más rápida que la versión optimizada que se ejecutaba en v6.1. Incluso en v7.5 todavía puede tener sentido usar PIFEs moderadamente para el código que se necesita durante el inicio: evitamos el preanálisis ya que aprendemos temprano que la función será necesaria.

Los resultados de las pruebas de `optimize-js` no reflejan exactamente el mundo real. Los scripts se cargan de forma sincrónica y el tiempo total de análisis + compilación se cuenta como tiempo de carga. En un entorno real, probablemente cargarías los scripts utilizando etiquetas `<script>`. Esto permite al cargador previo de Chrome descubrir el script _antes_ de evaluarlo y descargar, analizar y compilar el script sin bloquear el hilo principal. Todo lo que decidimos compilar de forma anticipada se compila automáticamente fuera del hilo principal y debería contar mínimamente hacia el inicio. Ejecutar con compilación de script fuera del hilo principal amplifica el impacto del uso de PIFEs.

Sin embargo, todavía hay un costo, especialmente un costo de memoria, por lo que no es una buena idea compilar de forma anticipada todo:

![La compilación anticipada de *todo* JavaScript implica un costo significativo de memoria.](/_img/preparser/eager-compilation-overhead.svg)

Si bien agregar paréntesis alrededor de funciones que necesitas durante el inicio es una buena idea (por ejemplo, basado en el perfil del inicio), usar un paquete como `optimize-js` que aplica heurísticas estáticas simples no es una gran idea. Por ejemplo, asume que una función se llamará durante el inicio si es un argumento para una llamada de función. Si dicha función implementa un módulo completo que solo se necesita mucho después, sin embargo, terminas compilando demasiado. La compilación excesiva es mala para el rendimiento: V8 sin compilación perezosa perjudica significativamente el tiempo de carga. Además, algunos de los beneficios de `optimize-js` provienen de problemas con UglifyJS y otros minificadores, que eliminan paréntesis de PIFEs que no son IIFEs, eliminando consejos útiles que podrían haberse aplicado, por ejemplo, a módulos de estilo [Universal Module Definition](https://github.com/umdjs/umd). Es probable que este sea un problema que los minificadores deberían solucionar para obtener el máximo rendimiento en navegadores que compilan PIFEs anticipadamente.

[^2]: Los PIFEs también pueden considerarse expresiones de función informadas por perfil.

## Conclusiones

El análisis perezoso acelera el inicio y reduce el costo de memoria de aplicaciones que envían más código del que necesitan. Poder rastrear adecuadamente las declaraciones y referencias de variables en el preanalizador es necesario para poder analizar de forma correcta (según la especificación) y rápida. La asignación de variables en el preanalizador también nos permite serializar información de asignación de variables para su uso posterior en el analizador, de modo que podemos evitar tener que reprocesar funciones internas por completo, evitando el comportamiento de análisis no lineal de funciones profundamente anidadas.

Los PIFEs que pueden ser reconocidos por el analizador evitan el costo inicial del preanálisis para el código que se necesita inmediatamente durante el inicio. Un uso cuidadoso guiado por perfiles de PIFEs, o su uso por empaquetadores, puede proporcionar un impulso útil para el inicio en frío. No obstante, se debe evitar envolver funciones innecesariamente en paréntesis para activar esta heurística, ya que causa que se compile más código de forma anticipada, lo que resulta en un peor rendimiento de inicio y un mayor uso de memoria.
