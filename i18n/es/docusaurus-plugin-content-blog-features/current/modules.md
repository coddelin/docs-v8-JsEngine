---
title: "Módulos de JavaScript"
author: "Addy Osmani ([@addyosmani](https://twitter.com/addyosmani)) y Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
- "addy-osmani"
- "mathias-bynens"
date: 2018-06-18
tags: 
  - ECMAScript
  - ES2015
description: "Este artículo explica cómo usar módulos de JavaScript, cómo implementarlos de manera responsable, y cómo el equipo de Chrome está trabajando para hacer que los módulos sean aún mejores en el futuro."
tweet: "1008725884575109120"
---
¡Los módulos de JavaScript ahora son [compatibles con todos los navegadores principales](https://caniuse.com/#feat=es6-module)!

<feature-support chrome="61"
                 firefox="60"
                 safari="11"
                 nodejs="13.2.0 https://nodejs.org/en/blog/release/v13.2.0/#notable-changes"
                 babel="yes"></feature-support>

Este artículo explica cómo usar módulos de JS, cómo implementarlos de manera responsable, y cómo el equipo de Chrome está trabajando para hacer que los módulos sean aún mejores en el futuro.

## ¿Qué son los módulos de JS?

Los módulos de JS (también conocidos como “módulos de ES” o “módulos ECMAScript”) son una característica nueva importante, o más bien una colección de nuevas características. Es posible que hayas usado un sistema de módulos de JavaScript en el pasado. Tal vez usaste [CommonJS como en Node.js](https://nodejs.org/docs/latest-v10.x/api/modules.html), o tal vez [AMD](https://github.com/amdjs/amdjs-api/blob/master/AMD.md), o quizás algo más. Todos estos sistemas de módulos tienen algo en común: te permiten importar y exportar cosas.

<!--truncate-->
JavaScript ahora tiene una sintaxis estandarizada exactamente para eso. Dentro de un módulo, puedes usar la palabra clave `export` para exportar casi cualquier cosa. Puedes exportar un `const`, una `function`, o cualquier otra declaración o asignación de variables. Solo añade el prefijo `export` a la declaración de la variable y listo:

```js
// 📁 lib.mjs
export const repeat = (string) => `${string} ${string}`;
export function shout(string) {
  return `${string.toUpperCase()}!`;
}
```

Luego puedes usar la palabra clave `import` para importar el módulo desde otro módulo. Aquí, estamos importando las funcionalidades `repeat` y `shout` del módulo `lib`, y usándolas en nuestro módulo `main`:

```js
// 📁 main.mjs
import {repeat, shout} from './lib.mjs';
repeat('hello');
// → 'hello hello'
shout('¡Módulos en acción!');
// → '¡MÓDULOS EN ACCIÓN!'
```

También puedes exportar un valor _predeterminado_ de un módulo:

```js
// 📁 lib.mjs
export default function(string) {
  return `${string.toUpperCase()}!`;
}
```

Estos valores `default` pueden ser importados utilizando cualquier nombre:

```js
// 📁 main.mjs
import shout from './lib.mjs';
//     ^^^^^
```

Los módulos son un poco diferentes de los scripts clásicos:

- Los módulos tienen [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode) activado por defecto.

- La sintaxis de comentarios estilo HTML no es compatible con los módulos, aunque funciona en scripts clásicos.

    ```js
    // ¡No uses sintaxis de comentarios estilo HTML en JavaScript!
    const x = 42; <!-- TODO: Cambiar el nombre de x a y.
    // En su lugar usa un comentario de una sola línea:
    const x = 42; // TODO: Cambiar el nombre de x a y.
    ```

- Los módulos tienen un alcance léxico a nivel superior. Esto significa que, por ejemplo, ejecutar `var foo = 42;` dentro de un módulo *no* crea una variable global llamada `foo`, accesible a través de `window.foo` en un navegador, aunque eso sería el caso en un script clásico.

- De manera similar, `this` dentro de los módulos no se refiere al `this` global, y en su lugar es `undefined`. (Usa [`globalThis`](/features/globalthis) si necesitas acceder al `this` global).

- La nueva sintaxis estática de `import` y `export` solo está disponible dentro de los módulos — no funciona en scripts clásicos.

- [El `await` a nivel superior](/features/top-level-await) está disponible en módulos, pero no en scripts clásicos. Relacionado, `await` no puede ser usado como nombre de variable en ningún lugar de un módulo, aunque en scripts clásicos _puede_ ser nombrado `await` fuera de funciones async.

Debido a estas diferencias, *el mismo código JavaScript podría comportarse de manera diferente al ser tratado como un módulo frente a un script clásico*. Por lo tanto, el entorno de ejecución de JavaScript necesita saber qué scripts son módulos.

## Usando módulos de JS en el navegador

En la web, puedes indicar a los navegadores que traten un elemento `<script>` como un módulo configurando el atributo `type` a `module`.

```html
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

Los navegadores que entienden `type="module"` ignoran los scripts con un atributo `nomodule`. Esto significa que puedes enviar una carga útil basada en módulos a los navegadores que los soportan mientras ofreces una alternativa para otros navegadores. ¡La capacidad de hacer esta distinción es asombrosa, aunque solo sea por rendimiento! Piensa en esto: sólo los navegadores modernos soportan módulos. Si un navegador entiende tu código de módulo, también soporta [características anteriores a los módulos](https://codepen.io/samthor/pen/MmvdOM), como funciones flecha o `async`-`await`. ¡Ya no necesitas transpilar esas características en tu paquete de módulos! Puedes [proporcionar cargas útiles más pequeñas y en gran parte no transpiladas basadas en módulos a navegadores modernos](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/). Solo los navegadores antiguos reciben la carga útil de `nomodule`.

Dado que [los módulos son diferidos por defecto](#defer), es posible que desees cargar el script `nomodule` de manera diferida también:

```html
<script type="module" src="main.mjs"></script>
<script nomodule defer src="fallback.js"></script>
```

### Diferencias específicas de navegador entre módulos y scripts clásicos

Como ya sabes, los módulos son diferentes de los scripts clásicos. Además de las diferencias no específicas de la plataforma que hemos descrito anteriormente, hay algunas diferencias que son específicas de los navegadores.

Por ejemplo, los módulos se evalúan sólo una vez, mientras que los scripts clásicos se evalúan tantas veces como los añades al DOM.

```html
<script src="classic.js"></script>
<script src="classic.js"></script>
<!-- classic.js se ejecuta varias veces. -->

<script type="module" src="module.mjs"></script>
<script type="module" src="module.mjs"></script>
<script type="module">import './module.mjs';</script>
<!-- module.mjs se ejecuta sólo una vez. -->
```

Además, los scripts de módulo y sus dependencias se obtienen con CORS. Esto significa que cualquier script de módulo de origen cruzado debe ser servido con los encabezados adecuados, como `Access-Control-Allow-Origin: *`. Esto no es cierto para los scripts clásicos.

Otra diferencia está relacionada con el atributo `async`, que hace que el script se descargue sin bloquear el analizador de HTML (como `defer`), excepto que también ejecuta el script tan pronto como sea posible, sin orden garantizado y sin esperar a que termine el análisis del HTML. El atributo `async` no funciona para los scripts clásicos en línea, pero sí funciona para los `<script type="module">` en línea.

### Una nota sobre extensiones de archivos

Puede que hayas notado que usamos la extensión de archivo `.mjs` para módulos. En la Web, la extensión del archivo no es realmente importante, siempre que el archivo se sirva con [el tipo MIME de JavaScript `text/javascript`](https://html.spec.whatwg.org/multipage/scripting.html#scriptingLanguages:javascript-mime-type). El navegador sabe que es un módulo debido al atributo `type` en el elemento script.

Aun así, recomendamos usar la extensión `.mjs` para módulos, por dos razones:

1. Durante el desarrollo, la extensión `.mjs` hace que sea muy claro para ti y para cualquier otra persona que esté viendo tu proyecto que el archivo es un módulo y no un script clásico. (No siempre es posible discernirlo sólo viendo el código). Como se mencionó anteriormente, los módulos se tratan de manera diferente a los scripts clásicos, por lo que la diferencia es enormemente importante.
1. Garantiza que tu archivo sea analizado como un módulo por entornos como [Node.js](https://nodejs.org/api/esm.html#enabling) y [`d8`](/docs/d8), y herramientas de construcción como [Babel](https://babeljs.io/docs/en/options#sourcetype). Si bien estos entornos y herramientas tienen maneras propietarias, mediante configuración, para interpretar archivos con otras extensiones como módulos, la extensión `.mjs` es la forma compatible para asegurarse de que los archivos se traten como módulos.

:::nota
**Nota:** Para desplegar `.mjs` en la web, tu servidor web necesita estar configurado para servir archivos con esta extensión usando el encabezado `Content-Type: text/javascript` apropiado, como se mencionó anteriormente. Además, podría ser útil configurar tu editor para que trate los archivos `.mjs` como archivos `.js` para obtener resaltado de sintaxis. La mayoría de los editores modernos ya hacen esto por defecto.
:::

### Especificadores de módulo

Cuando se `importan` módulos, la cadena que especifica la ubicación del módulo se llama el "especificador de módulo" o "especificador de importación". En nuestro ejemplo anterior, el especificador de módulo es `'./lib.mjs'`:

```js
import {shout} from './lib.mjs';
//                  ^^^^^^^^^^^
```

Se aplican algunas restricciones a los especificadores de módulos en navegadores. Los llamados especificadores de módulo "puros" no son actualmente compatibles. Esta restricción está [especificada](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier) para que en el futuro los navegadores puedan permitir cargadores de módulos personalizados que den un significado especial a los especificadores de módulo puros como los siguientes:

```js
// No compatible (aún):
import {shout} from 'jquery';
import {shout} from 'lib.mjs';
import {shout} from 'modules/lib.mjs';
```

Por otro lado, los siguientes ejemplos son todos compatibles:

```js
// Compatible:
import {shout} from './lib.mjs';
import {shout} from '../lib.mjs';
import {shout} from '/modules/lib.mjs';
import {shout} from 'https://simple.example/modules/lib.mjs';
```

Por ahora, los especificadores de módulos deben ser URLs completas o URLs relativas que comiencen con `/`, `./` o `../`.

### Los módulos son diferidos por defecto

Los `<script>` clásicos bloquean el analizador de HTML por defecto. Puedes evitarlo añadiendo [el atributo `defer`](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer), que asegura que la descarga del script ocurra en paralelo con el análisis del HTML.

![](/_img/modules/async-defer.svg)

Los scripts de módulos se diferencian por defecto. Por lo tanto, ¡no es necesario agregar `defer` a tus etiquetas `<script type="module">`! No solo la descarga del módulo principal ocurre en paralelo con el análisis del HTML, sino que lo mismo sucede con todos los módulos dependientes.

## Otras características de los módulos

### `import()` dinámico

Hasta ahora solo hemos utilizado `import` estático. Con el `import` estático, todo tu grafo de módulos necesita descargarse y ejecutarse antes de que tu código principal pueda correr. A veces, no quieres cargar un módulo de inmediato, sino bajo demanda, solo cuando lo necesites, por ejemplo, cuando el usuario haga clic en un enlace o un botón. Esto mejora el rendimiento del tiempo de carga inicial. ¡[El `import()` dinámico](/features/dynamic-import) hace esto posible!

```html
<script type="module">
  (async () => {
    const moduleSpecifier = './lib.mjs';
    const {repeat, shout} = await import(moduleSpecifier);
    repeat('hello');
    // → 'hello hello'
    shout('Dynamic import in action');
    // → 'DYNAMIC IMPORT IN ACTION!'
  })();
</script>
```

A diferencia del `import` estático, el `import()` dinámico puede usarse dentro de scripts regulares. Es una manera sencilla de comenzar a utilizar módulos de forma incremental en tu base de código existente. Para más detalles, revisa [nuestro artículo sobre el `import()` dinámico](/features/dynamic-import).

:::note
**Nota:** [webpack tiene su propia versión de `import()`](https://web.dev/use-long-term-caching/) que divide ingeniosamente el módulo importado en su propio fragmento, separado del paquete principal.
:::

### `import.meta`

Otra nueva característica relacionada con los módulos es `import.meta`, que te proporciona metadatos sobre el módulo actual. Los metadatos exactos que obtienes no están especificados como parte de ECMAScript; dependen del entorno anfitrión. En un navegador, podrías obtener metadatos diferentes a los de Node.js, por ejemplo.

Aquí hay un ejemplo de `import.meta` en la web. Por defecto, las imágenes se cargan en relación con la URL actual en documentos HTML. `import.meta.url` hace posible cargar una imagen en relación con el módulo actual.

```js
function loadThumbnail(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  const image = new Image();
  image.src = url;
  return image;
}

const thumbnail = loadThumbnail('../img/thumbnail.png');
container.append(thumbnail);
```

## Recomendaciones de rendimiento

### Mantén el empaquetado

Con los módulos, se vuelve posible desarrollar sitios web sin usar herramientas de empaquetado como webpack, Rollup o Parcel. Está bien usar módulos JS nativos directamente en los siguientes escenarios:

- durante el desarrollo local
- en producción para aplicaciones web pequeñas con menos de 100 módulos en total y con un árbol de dependencias relativamente poco profundo (es decir, una profundidad máxima menor a 5)

Sin embargo, como aprendimos durante [nuestro análisis del cuello de botella en la canalización de carga de Chrome al cargar una biblioteca modularizada compuesta por ~300 módulos](https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub), el rendimiento de carga de aplicaciones empaquetadas es mejor que el de aquellas no empaquetadas.

<figure>
  <a href="https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub">
    <img src="/_img/modules/renderer-main-thread-time-breakdown.svg" width="830" height="311" alt="" loading="lazy"/>
  </a>
</figure>

Una de las razones para esto es que la sintaxis `import`/`export` estática es analizadora estáticamente, y puede así ayudar a las herramientas de empaquetado a optimizar tu código eliminando exportaciones no utilizadas. Los `import` y `export` estáticos son más que solo sintaxis; ¡son una característica crítica para herramientas!

*Nuestra recomendación general es continuar utilizando herramientas de empaquetado antes de desplegar módulos a producción.* De alguna manera, el empaquetado es una optimización similar a minificar tu código: resulta en un beneficio de rendimiento, porque terminas enviando menos código. ¡El empaquetado tiene el mismo efecto! Sigue empaquetando.

Como siempre, [la función de Cobertura de Código de DevTools](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage) puede ayudarte a identificar si estás enviando código innecesario a los usuarios. También recomendamos el uso de [división de código](https://developers.google.com/web/fundamentals/performance/webpack/use-long-term-caching#lazy-loading) para dividir los paquetes y diferir la carga de scripts que no sean críticos para el primer render significativo.

#### Compensaciones entre empaquetar vs. enviar módulos no empaquetados

Como es habitual en el desarrollo web, todo es una compensación. Enviar módulos no empaquetados podría disminuir el rendimiento de la carga inicial (caché fría), pero en realidad podría mejorar el rendimiento de carga para visitas posteriores (caché caliente) en comparación con enviar un único paquete sin división de código. Para una base de código de 200 KB, cambiar un solo módulo granular y hacer que sea la única solicitud al servidor para visitas posteriores es mucho mejor que tener que volver a solicitar todo el paquete.

Si estás más preocupado por la experiencia de los visitantes con caché caliente que por el rendimiento de la primera visita y tienes un sitio con menos de unos pocos cientos de módulos granulares, podrías experimentar con enviar módulos no empaquetados, medir el impacto en el rendimiento tanto para cargas frías como calientes, ¡y luego tomar una decisión basada en datos!

Los ingenieros de navegadores están trabajando arduamente para mejorar el rendimiento de los módulos de manera predeterminada. Con el tiempo, esperamos que enviar módulos sin empaquetar se vuelva factible en más situaciones.

### Utilizar módulos granulares

Acostúmbrate a escribir tu código usando módulos pequeños y granulares. Durante el desarrollo, generalmente es mejor tener solo unas pocas exportaciones por módulo en lugar de combinar manualmente muchas exportaciones en un solo archivo.

Considera un módulo llamado `./util.mjs` que exporta tres funciones llamadas `drop`, `pluck` y `zip`:

```js
export function drop() { /* … */ }
export function pluck() { /* … */ }
export function zip() { /* … */ }
```

Si tu base de código realmente solo necesita la funcionalidad de `pluck`, probablemente la importarías de la siguiente manera:

```js
import {pluck} from './util.mjs';
```

En este caso, (sin un paso de empaquetado en tiempo de compilación) el navegador aún tendría que descargar, analizar y compilar todo el módulo `./util.mjs` aunque solo necesite esa única exportación. ¡Eso es derrochador!

Si `pluck` no comparte ningún código con `drop` y `zip`, sería mejor moverlo a su propio módulo granular, por ejemplo, `./pluck.mjs`.

```js
export function pluck() { /* … */ }
```

Luego podemos importar `pluck` sin la sobrecarga de tratar con `drop` y `zip`:

```js
import {pluck} from './pluck.mjs';
```

:::note
**Nota:** Podrías usar una exportación `default` en lugar de una exportación nombrada aquí, dependiendo de tu preferencia personal.
:::

Esto no solo mantiene tu código fuente limpio y simple, sino que también reduce la necesidad de eliminación de código muerto realizada por los empaquetadores. Si uno de los módulos en tu estructura de código fuente no se utiliza, entonces nunca se importa, y por lo tanto, el navegador nunca lo descarga. Los módulos que _sí_ se utilizan pueden ser [cacheados en código](/blog/code-caching-for-devs) individualmente por el navegador. (La infraestructura para que esto suceda ya se implementó en V8, y se está [trabajando en ello](https://bugs.chromium.org/p/chromium/issues/detail?id=841466) para habilitarlo también en Chrome).

Utilizar módulos pequeños y granulares ayuda a preparar tu base de código para el futuro, donde podría estar disponible una [solución de empaquetado nativa](#web-packaging).

### Precargar módulos

Puedes optimizar aún más la entrega de tus módulos usando [`<link rel="modulepreload">`](https://developers.google.com/web/updates/2017/12/modulepreload). De esta manera, los navegadores pueden precargar e incluso preanalizar y precompilar módulos y sus dependencias.

```html
<link rel="modulepreload" href="lib.mjs">
<link rel="modulepreload" href="main.mjs">
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

Esto es especialmente importante para árboles de dependencias más grandes. Sin `rel="modulepreload"`, el navegador necesita realizar múltiples solicitudes HTTP para determinar el árbol completo de dependencias. Sin embargo, si declaras la lista completa de scripts de módulos dependientes con `rel="modulepreload"`, el navegador no tiene que descubrir estas dependencias de manera progresiva.

### Usar HTTP/2

Usar HTTP/2 siempre que sea posible es un buen consejo de rendimiento, aunque solo sea por su [soporte de multiplexación](https://web.dev/performance-http2/#request-and-response-multiplexing). Con la multiplexación de HTTP/2, múltiples mensajes de solicitud y respuesta pueden estar en vuelo al mismo tiempo, lo cual es beneficioso para la carga de árboles de módulos.

El equipo de Chrome investigó si otra característica de HTTP/2, específicamente el [server push de HTTP/2](https://web.dev/performance-http2/#server-push), podría ser una solución práctica para desplegar aplicaciones altamente modularizadas. Desafortunadamente, [el server push de HTTP/2 es complicado de implementar correctamente](https://jakearchibald.com/2017/h2-push-tougher-than-i-thought/), y las implementaciones de los servidores web y navegadores no están actualmente optimizadas para casos de uso de aplicaciones web altamente modularizadas. Es difícil solo enviar los recursos que el usuario no tiene ya en caché, por ejemplo, y resolver eso comunicando todo el estado de caché de un origen al servidor constituye un riesgo para la privacidad.

Así que por supuesto, adelante y usa HTTP/2. Solo ten en cuenta que el server push de HTTP/2 (desafortunadamente) no es una solución milagrosa.

## La adopción web de módulos JavaScript

Los módulos JavaScript están adoptándose lentamente en la web. [Nuestros contadores de uso](https://www.chromestatus.com/metrics/feature/timeline/popularity/2062) muestran que el 0.08% de todas las cargas de página actualmente usan `<script type="module">`. Ten en cuenta que este número excluye otros puntos de entrada como `import()` dinámico o [worklets](https://drafts.css-houdini.org/worklets/).

## ¿Qué sigue para los módulos JavaScript?

El equipo de Chrome está trabajando en mejorar la experiencia en tiempo de desarrollo con los módulos JavaScript de varias maneras. Discutamos algunas de ellas.

### Algoritmo de resolución de módulos más rápido y determinista

Proponemos un cambio en el algoritmo de resolución de módulos que aborda una deficiencia en velocidad y determinismo. El nuevo algoritmo ahora está activo tanto en [la especificación HTML](https://github.com/whatwg/html/pull/2991) como en [la especificación ECMAScript](https://github.com/tc39/ecma262/pull/1006), y está implementado en [Chrome 63](http://crbug.com/763597). ¡Espera que esta mejora llegue pronto a más navegadores!

El nuevo algoritmo es mucho más eficiente y rápido. La complejidad computacional del viejo algoritmo era cuadrática, es decir, 𝒪(n²), en el tamaño del grafo de dependencias, al igual que la implementación de Chrome en ese momento. El nuevo algoritmo es lineal, es decir, 𝒪(n).

Además, el nuevo algoritmo informa errores de resolución de manera determinista. Dado un grafo que contiene múltiples errores, diferentes ejecuciones del viejo algoritmo podían informar diferentes errores como responsables del fallo de resolución. Esto hacía que la depuración fuera innecesariamente difícil. El nuevo algoritmo garantiza informar el mismo error cada vez.

### Worklets y trabajadores web

Chrome ahora implementa [worklets](https://drafts.css-houdini.org/worklets/), que permiten a los desarrolladores web personalizar la lógica predefinida en las “partes de bajo nivel” de los navegadores web. Con los worklets, los desarrolladores web pueden alimentar un módulo JS en la tubería de renderizado o en la tubería de procesamiento de audio (y posiblemente en más tuberías en el futuro).

Chrome 65 admite [`PaintWorklet`](https://developers.google.com/web/updates/2018/01/paintapi) (también conocida como API de Pintura de CSS) para controlar cómo se pinta un elemento DOM.

```js
const result = await css.paintWorklet.addModule('paint-worklet.mjs');
```

Chrome 66 admite [`AudioWorklet`](https://developers.google.com/web/updates/2017/12/audio-worklet), que te permite controlar el procesamiento de audio con tu propio código. La misma versión de Chrome comenzó una [Prueba de Origen para `AnimationWorklet`](https://groups.google.com/a/chromium.org/d/msg/blink-dev/AZ-PYPMS7EA/DEqbe2u5BQAJ), que permite crear animaciones vinculadas al desplazamiento y otras animaciones procedimentales de alto rendimiento.

Finalmente, [`LayoutWorklet`](https://drafts.css-houdini.org/css-layout-api/) (también conocida como API de Disposición de CSS) está ahora implementada en Chrome 67.

Estamos [trabajando](https://bugs.chromium.org/p/chromium/issues/detail?id=680046) en agregar soporte para usar módulos JS con trabajadores web dedicados en Chrome. Ya puedes probar esta función con `chrome://flags/#enable-experimental-web-platform-features` habilitada.

```js
const worker = new Worker('worker.mjs', { type: 'module' });
```

El soporte de módulos JS para trabajadores compartidos y trabajadores de servicio llegará pronto:

```js
const worker = new SharedWorker('worker.mjs', { type: 'module' });
const registration = await navigator.serviceWorker.register('worker.mjs', { type: 'module' });
```

### Mapas de importación

En Node.js/npm, es común importar módulos JS por su “nombre de paquete”. Por ejemplo:

```js
import moment from 'moment';
import {pluck} from 'lodash-es';
```

Actualmente, [según la especificación HTML](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier), dichos “especificadores de importación simples” arrojan una excepción. [Nuestra propuesta de mapas de importación](https://github.com/domenic/import-maps) permite que dicho código funcione en la web, incluso en aplicaciones de producción. Un mapa de importación es un recurso JSON que ayuda al navegador a convertir los especificadores de importación simples en URLs completas.

Los mapas de importación todavía están en etapa de propuesta. Aunque hemos reflexionado mucho sobre cómo abordan varios casos de uso, aún estamos interactuando con la comunidad y no hemos escrito una especificación completa. ¡Los comentarios son bienvenidos!

### Empaquetado web: paquetes nativos

El equipo de carga de Chrome está explorando actualmente [un formato de empaquetado web nativo](https://github.com/WICG/webpackage) como una nueva forma de distribuir aplicaciones web. Las características principales del empaquetado web son:

[Intercambios HTTP firmados](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html) que permiten a un navegador confiar en que un único par de solicitud/respuesta HTTP fue generado por el origen que reclama; [Intercambios HTTP empaquetados](https://tools.ietf.org/html/draft-yasskin-wpack-bundled-exchanges-00), es decir, una colección de intercambios, cada uno de los cuales podría estar firmado o no firmado, con algunos metadatos que describen cómo interpretar el paquete en su conjunto.

Combinados, dicho formato de empaquetado web permitiría que *múltiples recursos de un mismo origen* se *incrusten de manera segura* en una *única* respuesta HTTP `GET`.

Las herramientas de empaquetado existentes como webpack, Rollup o Parcel actualmente emiten un único paquete de JavaScript, en el cual se pierden las semánticas de los módulos y activos originales separados. Con paquetes nativos, los navegadores podrían descomprimir los recursos de nuevo a su forma original. En términos simplificados, puedes imaginar un Intercambio HTTP empaquetado como un paquete de recursos que puede ser accedido en cualquier orden a través de una tabla de contenidos (manifiesto), y donde los recursos contenidos pueden ser eficientemente almacenados y etiquetados según su importancia relativa, todo mientras se mantiene la noción de archivos individuales. Debido a esto, los paquetes nativos podrían mejorar la experiencia de depuración. Al visualizar los activos en las DevTools, los navegadores podrían señalar el módulo original sin necesidad de mapas de origen complejos.

La transparencia del formato de paquete nativo abre diversas oportunidades de optimización. Por ejemplo, si un navegador ya tiene parte de un paquete nativo almacenado en caché localmente, podría comunicarlo al servidor web y descargar solo las partes faltantes.

Chrome ya admite una parte de la propuesta ([`SignedExchanges`](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html)), pero el formato de empaquetado en sí mismo, así como su aplicación a aplicaciones altamente modularizadas, aún se encuentran en fase exploratoria. ¡Sus comentarios son muy bienvenidos en el repositorio o por correo electrónico a [loading-dev@chromium.org](mailto:loading-dev@chromium.org)!

### APIs en capas

Implementar y enviar nuevas características y APIs web implica un costo de mantenimiento y tiempo de ejecución continuo: cada nueva característica contamina el espacio de nombres del navegador, aumenta los costos de inicio y representa una nueva superficie donde podrían introducirse errores en todo el código base. [Las APIs en capas](https://github.com/drufball/layered-apis) son un esfuerzo para implementar y enviar APIs de mayor nivel con los navegadores web de una manera más escalable. Los módulos JS son una tecnología clave que permite las APIs en capas:

- Dado que los módulos se importan explícitamente, exigir que las APIs en capas sean expuestas a través de módulos asegura que los desarrolladores solo paguen por las APIs en capas que usan.
- Debido a que la carga de módulos es configurable, las APIs en capas pueden tener un mecanismo incorporado para cargar automáticamente polyfills en navegadores que no admiten APIs en capas.

Todavía se están resolviendo [los detalles de cómo los módulos y las APIs en capas funcionan juntos](https://github.com/drufball/layered-apis/issues), pero la propuesta actual es algo como esto:

```html
<script
  type="module"
  src="std:virtual-scroller|https://example.com/virtual-scroller.mjs"
></script>
```

El elemento `<script>` carga la API `virtual-scroller` ya sea desde el conjunto integrado de APIs en capas del navegador (`std:virtual-scroller`) o desde una URL alternativa que apunta a un polyfill. Esta API puede realizar cualquier cosa que los módulos JS puedan hacer en navegadores web. Un ejemplo sería definir [un elemento personalizado `<virtual-scroller>`](https://www.chromestatus.com/feature/5673195159945216), para que el siguiente HTML se mejore de forma progresiva según lo desees:

```html
<virtual-scroller>
  <!-- El contenido va aquí. -->
</virtual-scroller>
```

## Créditos

¡Gracias a Domenic Denicola, Georg Neis, Hiroki Nakagawa, Hiroshige Hayashizaki, Jakob Gruber, Kouhei Ueno, Kunihiko Sakamoto y Yang Guo por hacer que los módulos de JavaScript sean rápidos!

Además, felicitaciones a Eric Bidelman, Jake Archibald, Jason Miller, Jeffrey Posnick, Philip Walton, Rob Dodson, Sam Dutton, Sam Thorogood y Thomas Steiner por leer una versión preliminar de esta guía y compartir sus comentarios.
