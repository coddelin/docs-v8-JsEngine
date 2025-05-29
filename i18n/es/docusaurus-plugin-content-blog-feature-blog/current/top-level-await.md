---
title: "`await` de nivel superior"
author: "Myles Borins ([@MylesBorins](https://twitter.com/MylesBorins))"
avatars:
  - "myles-borins"
date: 2019-10-08
tags:
  - ECMAScript
  - Node.js 14
description: "¡`await` de nivel superior está llegando a los módulos de JavaScript! Pronto podrás usar `await` sin necesidad de estar en una función async."
tweet: "1181581262399643650"
---
[`await` de nivel superior](https://github.com/tc39/proposal-top-level-await) permite a los desarrolladores usar la palabra clave `await` fuera de las funciones async. Actúa como una gran función async que hace que otros módulos que los `import` esperen antes de comenzar a evaluar su contenido.

<!--truncate-->
## El comportamiento antiguo

Cuando se introdujeron por primera vez `async`/`await`, intentar usar un `await` fuera de una función `async` resultaba en un `SyntaxError`. Muchos desarrolladores utilizaron expresiones de funciones async invocadas inmediatamente como una forma de acceder a esta funcionalidad.

```js
await Promise.resolve(console.log('🎉'));
// → SyntaxError: await solo es válido en una función async

(async function() {
  await Promise.resolve(console.log('🎉'));
  // → 🎉
}());
```

## El nuevo comportamiento

Con `await` de nivel superior, el código anterior funciona de la manera que esperas dentro de los [módulos](/features/modules):

```js
await Promise.resolve(console.log('🎉'));
// → 🎉
```

:::note
**Nota:** `await` de nivel superior _solo_ funciona en el nivel superior de los módulos. No hay soporte para scripts clásicos o funciones no async.
:::

## Casos de uso

Estos casos de uso están tomados del [repositorio de la propuesta de especificación](https://github.com/tc39/proposal-top-level-await#use-cases).

### Rutas de dependencias dinámicas

```js
const strings = await import(`/i18n/${navigator.language}`);
```

Esto permite que los módulos usen valores en tiempo de ejecución para determinar dependencias. Esto es útil para cosas como divisiones de desarrollo/producción, internacionalización, divisiones de entorno, etc.

### Inicialización de recursos

```js
const connection = await dbConnector();
```

Esto permite que los módulos representen recursos y también produzcan errores en casos en los que el módulo no pueda ser usado.

### Alternativas de dependencias

El siguiente ejemplo intenta cargar una biblioteca JavaScript desde el CDN A, y recurre al CDN B si falla:

```js
let jQuery;
try {
  jQuery = await import('https://cdn-a.example.com/jQuery');
} catch {
  jQuery = await import('https://cdn-b.example.com/jQuery');
}
```

## Orden de ejecución de módulos

Uno de los mayores cambios en JavaScript con `await` de nivel superior es el orden de ejecución de los módulos en tu gráfico. El motor de JavaScript ejecuta módulos en un [recorrido postorden](https://en.wikibooks.org/wiki/A-level_Computing/AQA/Paper_1/Fundamentals_of_algorithms/Tree_traversal#Post-order): comenzando desde el subárbol más a la izquierda de tu gráfico de módulos, los módulos son evaluados, sus bindings son exportados, y sus hermanos son ejecutados, seguidos de sus padres. Este algoritmo se ejecuta de forma recursiva hasta que alcanza la raíz de tu gráfico de módulos.

Antes de `await` de nivel superior, este orden siempre era síncrono y determinista: entre múltiples ejecuciones de tu código, se garantizaba que tu gráfico se ejecutaría en el mismo orden. Una vez que `await` de nivel superior entra en juego, la misma garantía existe, pero solo mientras no uses `await` de nivel superior.

Esto es lo que sucede cuando usas `await` de nivel superior en un módulo:

1. La ejecución del módulo actual se pospone hasta que la promesa esperada se resuelve.
1. La ejecución del módulo padre se pospone hasta que el módulo hijo que llamó `await`, y todos sus hermanos, exporten bindings.
1. Los módulos hermanos, y los hermanos de los módulos padres, pueden continuar ejecutándose en el mismo orden síncrono — siempre y cuando no haya ciclos u otras promesas `await` en el gráfico.
1. El módulo que llamó `await` reanuda su ejecución después de que se resuelve la promesa `await`.
1. El módulo padre y los árboles subsiguientes continúan ejecutándose en un orden síncrono mientras no haya otras promesas `await`.

## ¿Esto ya funciona en DevTools?

¡Ciertamente sí! El REPL en [Chrome DevTools](https://developers.google.com/web/updates/2017/08/devtools-release-notes#await), [Node.js](https://github.com/nodejs/node/issues/13209), y Safari Web Inspector han soportado `await` de nivel superior por un tiempo. Sin embargo, esta funcionalidad era no estándar y estaba limitada al REPL. ¡Es distinta de la propuesta de `await` de nivel superior, que es parte de la especificación del lenguaje y solo aplica a los módulos! Para probar código en producción que dependa de `await` de nivel superior de una forma que coincida completamente con la semántica de la propuesta, asegúrate de probar en tu aplicación real, y no solo en DevTools o el REPL de Node.js.

## ¿No es `await` de nivel superior un arma de doble filo?

Quizás has visto [el infame gist](https://gist.github.com/Rich-Harris/0b6f317657f5167663b493c722647221) de [Rich Harris](https://twitter.com/Rich_Harris) que inicialmente planteó varias preocupaciones acerca de `await` a nivel superior y pidió que el lenguaje JavaScript no implementara esta característica. Algunas preocupaciones específicas eran:

- `await` a nivel superior podría bloquear la ejecución.
- `await` a nivel superior podría bloquear la obtención de recursos.
- No habría una historia clara de interoperabilidad para los módulos CommonJS.

La versión en etapa 3 de la propuesta aborda directamente estos problemas:

- Como los módulos hermanos pueden ejecutarse, no hay un bloqueo definitivo.
- `await` a nivel superior ocurre durante la fase de ejecución del grafo de módulos. En este punto, todos los recursos ya han sido obtenidos y enlazados. No hay riesgo de bloquear la obtención de recursos.
- `await` a nivel superior está limitado a los módulos. No hay soporte explícito para scripts o módulos CommonJS.

Como con cualquier nueva característica del lenguaje, siempre existe el riesgo de un comportamiento inesperado. Por ejemplo, con `await` a nivel superior, las dependencias circulares de módulos podrían introducir un bloqueo.

Sin `await` a nivel superior, los desarrolladores de JavaScript a menudo usan expresiones de función asincrónica invocadas inmediatamente solo para obtener acceso a `await`. Desafortunadamente, este patrón resulta en menos determinismo en la ejecución del grafo y en una menor capacidad de análisis estático de las aplicaciones. Por estas razones, la falta de `await` a nivel superior se consideraba un riesgo mayor que los peligros introducidos con esta característica.

## Soporte para `await` a nivel superior

<feature-support chrome="89 https://bugs.chromium.org/p/v8/issues/detail?id=9344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519100"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=202484"
                 nodejs="14"
                 babel="no https://github.com/babel/proposals/issues/44"></feature-support>
