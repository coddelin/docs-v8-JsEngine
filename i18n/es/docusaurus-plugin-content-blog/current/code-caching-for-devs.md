---
title: &apos;Almacenamiento en caché de código para desarrolladores de JavaScript&apos;
author: &apos;[Leszek Swirski](https://twitter.com/leszekswirski), destructor de caché&apos;
avatars:
  - leszek-swirski
date: 2019-04-08 13:33:37
updated: 2020-06-16
tags:
  - internals
description: &apos;El almacenamiento en caché de (byte)código reduce el tiempo de inicio de sitios web visitados frecuentemente almacenando en caché el resultado del análisis y la compilación de JavaScript.&apos;
tweet: &apos;1115264282675953664&apos;
---
El almacenamiento en caché de código (también conocido como _almacenamiento en caché de bytecode_) es una optimización importante en los navegadores. Reduce el tiempo de inicio de sitios web visitados frecuentemente almacenando en caché el resultado del análisis y la compilación. La mayoría de los [navegadores](https://blog.mozilla.org/javascript/2017/12/12/javascript-startup-bytecode-cache/) [populares](https://bugs.webkit.org/show_bug.cgi?id=192782) implementan alguna forma de almacenamiento en caché de código, y Chrome no es una excepción. De hecho, hemos [escrito](/blog/code-caching), [y](/blog/improved-code-caching) [hablado](https://www.youtube.com/watch?v=YqHOUy2rYZ8) sobre cómo Chrome y V8 almacenan en caché el código compilado en el pasado.

<!--truncate-->
En esta publicación de blog, ofrecemos algunos consejos para los desarrolladores de JS que quieren sacar el mejor provecho del almacenamiento en caché de código para mejorar el inicio de sus sitios web. Estos consejos se centran en la implementación del almacenamiento en caché en Chrome/V8, pero la mayoría probablemente sea transferible a las implementaciones de almacenamiento en caché de código en otros navegadores también.

## Resumen del almacenamiento en caché de código

Aunque otras publicaciones de blog y presentaciones ofrecen más detalles sobre nuestra implementación de almacenamiento en caché de código, vale la pena hacer un breve repaso de cómo funcionan las cosas. Chrome tiene dos niveles de almacenamiento en caché para el código compilado por V8 (tanto scripts clásicos como scripts de módulos): una caché en memoria de “mejor esfuerzo” de bajo costo mantenida por V8 (la caché `Isolate`), y una caché serializada completa en disco.

La caché `Isolate` opera sobre scripts compilados en el mismo aislamiento de V8 (es decir, mismo proceso, aproximadamente “las páginas del mismo sitio web al navegar en la misma pestaña”). Es de “mejor esfuerzo” en el sentido de que intenta ser lo más rápida y mínima posible, utilizando datos ya disponibles para nosotros, a costa de una tasa de aciertos potencialmente más baja y la falta de almacenamiento en caché entre procesos.

1. Cuando V8 compila un script, el bytecode compilado se almacena en una tabla hash (en el heap de V8), asociada con el código fuente del script.
1. Cuando Chrome le pide a V8 que compile otro script, V8 primero verifica si el código fuente de ese script coincide con algo en esta tabla hash. Si es así, simplemente devolvemos el bytecode existente.

Esta caché es rápida y efectivamente gratuita, y aun así observamos que tiene una tasa de aciertos del 80% en el mundo real.

La caché de código en disco es gestionada por Chrome (específicamente, por Blink), y llena el vacío que la caché `Isolate` no puede: compartir las cachés de código entre procesos y entre múltiples sesiones de Chrome. Aprovecha la caché de recursos HTTP existente, que gestiona el almacenamiento en caché y la expiración de datos recibidos de la web.

1. Cuando un archivo JS se solicita por primera vez (es decir, una _ejecución en frío_), Chrome lo descarga y se lo da a V8 para compilar. También almacena el archivo en la caché en disco del navegador.
1. Cuando el archivo JS se solicita por segunda vez (es decir, una _ejecución templada_), Chrome toma el archivo de la caché del navegador y se lo da nuevamente a V8 para compilar. Esta vez, sin embargo, el código compilado se serializa y se adjunta al archivo de script en la caché como metadatos.
1. La tercera vez (es decir, una _ejecución caliente_), Chrome toma tanto el archivo como los metadatos del archivo de la caché y entrega ambos a V8. V8 deserializa los metadatos y puede omitir la compilación.

En resumen:

![El almacenamiento en caché de código se divide en ejecuciones en frío, templadas y calientes, utilizando la caché en memoria en ejecuciones templadas y la caché en disco en ejecuciones calientes.](/_img/code-caching-for-devs/overview.svg)

Basándonos en esta descripción, podemos dar nuestros mejores consejos para mejorar el uso de las cachés de código en tu sitio web.

## Consejo 1: no hagas nada

Idealmente, lo mejor que puedes hacer como desarrollador de JS para mejorar el almacenamiento en caché de código es “nada”. Esto en realidad significa dos cosas: no hacer nada de forma pasiva, y no hacer nada de forma activa.

El almacenamiento en caché de código es, al final del día, un detalle de implementación del navegador; una optimización de rendimiento basada en heurísticas de intercambio de datos/espacio, cuya implementación y heurísticas pueden (y de hecho lo hacen) cambiar regularmente. Nosotros, como ingenieros de V8, hacemos todo lo posible para que estas heurísticas funcionen para todos en la web en constante evolución, y sobreoptimizarse para los detalles actuales de implementación del almacenamiento en caché de código puede causar decepción después de algunas versiones, cuando esos detalles cambien. Además, otros motores de JavaScript probablemente tengan diferentes heurísticas para su implementación de almacenamiento en caché de código. Así que, en muchos sentidos, nuestro mejor consejo para que el código se almacene en caché es como nuestro consejo para escribir JS: escribe un código limpio e idiomático, y haremos nuestro mejor esfuerzo para optimizar cómo lo almacenamos en caché.

Además de no hacer nada de forma pasiva, también deberías intentar activamente no hacer nada. Cualquier forma de almacenamiento en caché depende inherentemente de que las cosas no cambien, por lo que no hacer nada es la mejor manera de permitir que los datos almacenados en caché permanezcan en caché. Hay un par de maneras en las que puedes activamente no hacer nada.

### No cambies el código

Esto puede ser obvio, pero vale la pena hacerlo explícito: cada vez que envías nuevo código, ese código aún no está en caché. Cada vez que el navegador realiza una solicitud HTTP para una URL de script, puede incluir la fecha de la última obtención de esa URL, y si el servidor sabe que el archivo no ha cambiado, puede enviar una respuesta 304 Not Modified, lo que mantiene caliente nuestra caché de código. De lo contrario, una respuesta 200 OK actualiza nuestro recurso almacenado en caché y vacía la caché de código, haciendo que vuelva a un estado frío.

![](/_img/code-caching-for-devs/http-200-vs-304.jpg "A Drake le gustan más las respuestas HTTP 304 que las respuestas HTTP 200.")

Es tentador siempre enviar tus últimos cambios de código de inmediato, especialmente si quieres medir el impacto de un cambio en particular, pero para las cachés es mucho mejor dejar el código como está, o al menos actualizarlo lo menos posible. Considera imponer un límite de `≤ x` implementaciones por semana, donde `x` es el control deslizante que puedes ajustar para equilibrar el almacenamiento en caché frente a la obsolescencia.

### No cambies las URLs

Las cachés de código están (actualmente) asociadas con la URL de un script, ya que eso las hace fáciles de buscar sin tener que leer el contenido real del script. Esto significa que cambiar la URL de un script (¡incluyendo cualquier parámetro de consulta!) crea una nueva entrada de recurso en nuestra caché de recursos, y con ella una nueva entrada de caché fría.

Por supuesto, esto también puede usarse para forzar el borrado de la caché, aunque eso también es un detalle de implementación; algún día podríamos decidir asociar las cachés con el texto fuente en lugar de la URL fuente, y este consejo ya no sería válido.

### No cambies el comportamiento de ejecución

Una de las optimizaciones más recientes en nuestra implementación de caché de código es solo [serializar el código compilado después de que se haya ejecutado](/blog/improved-code-caching#increasing-the-amount-of-code-that-is-cached). Esto es para intentar captar funciones compiladas de forma diferida, que solo se compilan durante la ejecución, no durante la compilación inicial.

Esta optimización funciona mejor cuando cada ejecución del script ejecuta el mismo código, o al menos las mismas funciones. Esto puede ser un problema si, por ejemplo, tienes pruebas A/B que dependen de una decisión en tiempo de ejecución:

```js
if (Math.random() > 0.5) {
  A();
} else {
  B();
}
```

En este caso, solo `A()` o `B()` se compilan y ejecutan en la ejecución cálida, y se introducen en la caché de código, sin embargo, cualquiera de ellos podría ejecutarse en ejecuciones posteriores. En su lugar, intenta mantener tu ejecución determinista para mantenerla en la ruta de caché.

## Consejo 2: Haz algo

Ciertamente, el consejo de no hacer “nada”, ya sea de forma pasiva o activa, no es muy satisfactorio. Entonces, además de no hacer “nada”, dado que nuestras heurísticas e implementación actuales, hay algunas cosas que puedes hacer. Sin embargo, recuerda que las heurísticas pueden cambiar, este consejo podría cambiar, y no hay sustituto para realizar un perfilado.

![](/_img/code-caching-for-devs/with-great-power.jpg "El tío Ben sugiere que Peter Parker debe ser cauteloso al optimizar el comportamiento de la caché de su aplicación web.")

### Separa las bibliotecas del código que las utiliza

La caché de código se realiza de manera gruesa, por script, lo que significa que los cambios en cualquier parte del script invalidan la caché para todo el script. Si tu código enviado consiste tanto en partes estables como en partes cambiantes en un solo script, por ejemplo, bibliotecas y lógica empresarial, entonces los cambios en el código de lógica empresarial invalidan la caché del código de la biblioteca.

En cambio, puedes separar el código estable de la biblioteca en un script independiente e incluirlo por separado. Entonces, el código de la biblioteca se puede almacenar en caché una vez y permanecer en caché cuando la lógica empresarial cambia.

Esto tiene beneficios adicionales si las bibliotecas se comparten entre diferentes páginas de tu sitio web: dado que la caché de código está vinculada al script, la caché de código de las bibliotecas también se comparte entre las páginas.

### Fusiona las bibliotecas con el código que las utiliza

La caché de código se realiza después de que se ejecuta cada script, lo que significa que la caché de código de un script incluirá exactamente aquellas funciones de ese script que se compilaron cuando el script termina su ejecución. Esto tiene varias consecuencias importantes para el código de las bibliotecas:

1. La caché de código no incluirá funciones de scripts anteriores.
1. La caché de código no incluirá funciones compiladas de forma diferida llamadas por scripts posteriores.

En particular, si una biblioteca consiste en funciones compiladas completamente de forma diferida, esas funciones no se almacenarán en caché incluso si se utilizan posteriormente.

Una solución para esto es fusionar bibliotecas y sus usos en un único script, de modo que el almacenamiento en caché del código "vea" qué partes de la biblioteca se utilizan. Esto, desafortunadamente, es exactamente lo opuesto al consejo anterior, porque no existen soluciones mágicas. En general, no recomendamos fusionar todos tus scripts JS en un solo gran paquete; dividirlos en varios scripts más pequeños tiende a ser más beneficioso en general por razones distintas al almacenamiento en caché del código (por ejemplo, múltiples solicitudes de red, compilación en streaming, interactividad de la página, etc.).

### Aprovecha las heurísticas de IIFE

Solo las funciones que se compilan en el momento en que el script termina de ejecutarse cuentan para la caché de código, por lo que hay muchos tipos de funciones que no se almacenarán en caché a pesar de ejecutarse en un momento posterior. Los manejadores de eventos (incluso `onload`), las cadenas de promesas, las funciones de biblioteca no utilizadas y cualquier otra cosa que se compile de manera diferida sin ser llamada para cuando se ve `</script>`, permanecen diferidas y no se almacenan en caché.

Una forma de forzar que estas funciones se almacenen en caché es obligarlas a compilarse, y una manera común de forzar la compilación es utilizando heurísticas de IIFE. Las IIFE (expresiones de función inmediatamente invocadas) son un patrón en el que una función se llama inmediatamente después de crearse:

```js
(function foo() {
  // …
})();
```

Dado que las IIFE se llaman inmediatamente, la mayoría de los motores de JavaScript intentan detectarlas y compilarlas de inmediato para evitar el costo de una compilación perezosa seguida de una compilación completa. Existen varias heurísticas para detectar IIFE temprano (antes de que la función tenga que ser analizada), siendo la más común un `(` antes de la palabra clave `function`.

Dado que esta heurística se aplica pronto, desencadena una compilación incluso si la función no se invoca realmente de forma inmediata:

```js
const foo = function() {
  // Omitido en forma diferida
};
const bar = (function() {
  // Compilado en forma ansiosa
});
```

Esto significa que las funciones que deberían estar en la caché de código pueden forzarse a incluirse en ella al envolverlas entre paréntesis. Sin embargo, esto puede perjudicar el tiempo de inicio si la sugerencia se aplica incorrectamente, y, en general, esto es un abuso de las heurísticas, por lo que nuestro consejo es evitar hacerlo a menos que sea necesario.

### Agrupa archivos pequeños

Chrome tiene un tamaño mínimo para las cachés de código, actualmente establecido en [1 KiB de código fuente](https://cs.chromium.org/chromium/src/third_party/blink/renderer/bindings/core/v8/v8_code_cache.cc?l=91&rcl=2f81d000fdb5331121cba7ff81dfaaec25b520a5). Esto significa que los scripts más pequeños no se almacenan en caché en absoluto, ya que consideramos que los costos asociados son mayores que los beneficios.

Si tu sitio web tiene muchos scripts pequeños de este tipo, es posible que el cálculo del costo adicional ya no se aplique de la misma manera. Podrías considerar fusionarlos para que superen el tamaño mínimo de código, además de beneficiarte generalmente de la reducción de costos en los scripts.

### Evita los scripts en línea

Las etiquetas de script cuyo contenido está en línea en el HTML no tienen un archivo fuente externo asociado, y, por lo tanto, no pueden almacenarse en caché con el mecanismo mencionado anteriormente. Chrome intenta almacenar en caché los scripts en línea, adjuntando su caché al recurso del documento HTML, pero estas cachés luego dependen de que *todo* el documento HTML no cambie, y no se comparten entre páginas.

Por lo tanto, para scripts no triviales que podrían beneficiarse del almacenamiento en caché del código, evita incluirlos en línea en el HTML y prefiere incluirlos como archivos externos.

### Usa cachés de service worker

Los service workers son un mecanismo para que tu código intercepte solicitudes de red para recursos en tu página. En particular, te permiten construir una caché local de algunos de tus recursos y servir el recurso desde la caché siempre que se soliciten. Esto es especialmente útil para páginas que desean seguir funcionando sin conexión, como las PWA.

Un ejemplo típico de un sitio que utiliza un service worker registra el worker en algún archivo de script principal:

```js
// main.mjs
navigator.serviceWorker.register(&apos;/sw.js&apos;);
```

Y el service worker añade controladores de eventos para la instalación (creando una caché) y la obtención de recursos (sirviendo recursos, potencialmente desde la caché).

```js
// sw.js
self.addEventListener(&apos;install&apos;, (event) => {
  async function buildCache() {
    const cache = await caches.open(cacheName);
    return cache.addAll([
      &apos;/main.css&apos;,
      &apos;/main.mjs&apos;,
      &apos;/offline.html&apos;,
    ]);
  }
  event.waitUntil(buildCache());
});

self.addEventListener(&apos;fetch&apos;, (event) => {
  async function cachedFetch(event) {
    const cache = await caches.open(cacheName);
    let response = await cache.match(event.request);
    if (response) return response;
    response = await fetch(event.request);
    cache.put(event.request, response.clone());
    return response;
  }
  event.respondWith(cachedFetch(event));
});
```

Estas cachés pueden incluir recursos JS almacenados en caché. Sin embargo, tenemos heurísticas ligeramente diferentes para ellas, ya que podemos hacer suposiciones distintas. Como la caché del service worker sigue las reglas de almacenamiento administrado por cuotas, es más probable que se persista por más tiempo y el beneficio del almacenamiento en caché será mayor. Además, podemos inferir una mayor importancia de los recursos cuando se precargan antes de la carga.

Las mayores diferencias heurísticas ocurren cuando el recurso se añade a la caché del service worker durante el evento de instalación del service worker. El ejemplo anterior demuestra tal uso. En este caso, la caché de código se crea inmediatamente cuando el recurso se guarda en la caché del service worker. Además, generamos una caché de código "completa" para estos scripts: ya no compilamos funciones de manera perezosa, sino que compilamos _todo_ y lo colocamos en la caché. Esto tiene la ventaja de contar con un rendimiento rápido y predecible, sin dependencias de orden de ejecución, aunque con un mayor uso de memoria.

Si un recurso JS se almacena mediante la API de caché fuera del evento de instalación del service worker, entonces la caché de código *no* se genera inmediatamente. En cambio, si un service worker responde con esa respuesta desde la caché, la caché de código "normal" se generará en la primera carga. Esta caché de código estará disponible para su uso en la segunda carga, una carga más rápida que con el escenario típico de caché de código. Los recursos pueden almacenarse en la API de caché fuera del evento de instalación al "caché progresivo" de recursos en el evento de fetch o si la API de caché se actualiza desde la ventana principal en lugar del service worker.

Nota: la caché de código "completa" precacheada asume que la página donde se ejecutará el script usará codificación UTF-8. Si la página termina usando una codificación diferente, la caché de código será descartada y reemplazada por una caché de código "normal".

Además, la caché de código "completa" precacheada asume que la página cargará el script como un script JS clásico. Si la página termina cargándolo como un módulo ES, la caché de código será descartada y reemplazada por una caché de código "normal".

## Trazado

Ninguna de las sugerencias anteriores garantiza acelerar tu aplicación web. Desafortunadamente, la información de caché de código no está actualmente expuesta en DevTools, por lo que la manera más robusta de averiguar cuáles de los scripts de tu aplicación web están usando caché de código es usar el nivel ligeramente inferior `chrome://tracing`.

`chrome://tracing` registra trazas instrumentadas de Chrome durante un período de tiempo, donde la visualización de la traza resultante se ve algo así:

![La interfaz de `chrome://tracing` con una grabación de una ejecución con caché cálida](/_img/code-caching-for-devs/chrome-tracing-visualization.png)

El trazado registra el comportamiento de todo el navegador, incluyendo otras pestañas, ventanas y extensiones, por lo que funciona mejor con un perfil de usuario limpio, extensiones deshabilitadas y sin otras pestañas del navegador abiertas:

```bash
# Inicia una nueva sesión del navegador Chrome con un perfil de usuario limpio y extensiones deshabilitadas
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

Al recopilar una traza, debes seleccionar qué categorías trazar. En la mayoría de los casos, simplemente puedes seleccionar el conjunto de categorías "Desarrollador web", pero también puedes elegir categorías manualmente. La categoría importante para la caché de código es `v8`.

![](/_img/code-caching-for-devs/chrome-tracing-categories-1.png)

![](/_img/code-caching-for-devs/chrome-tracing-categories-2.png)

Después de grabar una traza con la categoría `v8`, busca segmentos `v8.compile` en la traza. (Alternativamente, puedes ingresar `v8.compile` en el cuadro de búsqueda de la interfaz de usuario de trazado). Estos muestran el archivo que se está compilando y algunos metadatos sobre la compilación.

En una ejecución inicial de un script, no hay información sobre la caché de código, lo que significa que el script no estuvo involucrado en la producción o consumo de datos de caché.

![](/_img/code-caching-for-devs/chrome-tracing-cold-run.png)

En una ejecución cálida, hay dos entradas `v8.compile` por script: una para la compilación real (como arriba) y otra (después de la ejecución) para producir la caché. Se puede reconocer esta última ya que tiene los campos de metadatos `cacheProduceOptions` y `producedCacheSize`.

![](/_img/code-caching-for-devs/chrome-tracing-warm-run.png)

En una ejecución caliente, verás una entrada `v8.compile` para consumir la caché, con los campos de metadatos `cacheConsumeOptions` y `consumedCacheSize`. Todos los tamaños se expresan en bytes.

![](/_img/code-caching-for-devs/chrome-tracing-hot-run.png)

## Conclusión

Para la mayoría de los desarrolladores, la caché de código debería "simplemente funcionar". Funciona mejor, como cualquier caché, cuando las cosas permanecen sin cambios, y funciona bajo heurísticas que pueden cambiar entre versiones. Sin embargo, la caché de código tiene comportamientos que pueden ser utilizados y limitaciones que pueden evitarse, y un análisis cuidadoso utilizando `chrome://tracing` puede ayudarte a ajustar y optimizar el uso de cachés por parte de tu aplicación web.
