---
title: "Versión V8 v7.8"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), el hechicero perezoso"
avatars: 
  - "ingvar-stepanyan"
date: 2019-09-27
tags: 
  - lanzamiento
description: "V8 v7.8 incorpora compilación en streaming durante la precarga, API C de WebAssembly, desestructuración de objetos más rápida y coincidencia de RegExp, además de tiempos de inicio mejorados."
tweet: "1177600702861971459"
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva de la rama principal de Git de V8 justo antes de un hito beta de Chrome. Hoy estamos encantados de anunciar nuestra rama más reciente, [V8 versión 7.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.8), que está en beta hasta su lanzamiento en coordinación con Chrome 78 Stable dentro de algunas semanas. V8 v7.8 está lleno de todo tipo de novedades orientadas a desarrolladores. Este artículo ofrece un adelanto de algunos de los puntos destacados en anticipación del lanzamiento.

<!--truncate-->
## Rendimiento de JavaScript (tamaño y velocidad)

### Compilación en streaming durante la precarga

Tal vez recuerdes [el trabajo de streaming de scripts de V8 v7.5](/blog/v8-release-75#script-streaming-directly-from-network), donde mejoramos nuestra compilación en segundo plano para leer datos directamente desde la red. En Chrome 78, estamos habilitando el streaming de scripts durante la precarga.

Anteriormente, el streaming de scripts comenzaba cuando se encontraba una etiqueta `<script>` durante el análisis del HTML, y el análisis se pausaría hasta que finalizara la compilación (para scripts normales) o el script se ejecutaría una vez que finalizara la compilación (para scripts asíncronos). Esto significa que para scripts normales y síncronos como este:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="main.js"></script>
</head>
...
```

…el proceso anteriormente se veía aproximadamente así:

<figure>
  <img src="/_img/v8-release-78/script-streaming-0.svg" width="458" height="130" alt="" loading="lazy"/>
</figure>

Dado que los scripts síncronos pueden usar `document.write()`, tenemos que pausar el análisis del HTML cuando vemos la etiqueta `<script>`. Dado que la compilación comienza cuando se encuentra la etiqueta `<script>`, hay una gran brecha entre el análisis del HTML y la ejecución real del script, durante la cual no podemos continuar cargando la página.

Sin embargo, también encontramos la etiqueta `<script>` en una etapa anterior, donde escaneamos el HTML buscando recursos para precargar, por lo que el proceso era realmente más como este:

<figure>
  <img src="/_img/v8-release-78/script-streaming-1.svg" width="600" height="130" alt="" loading="lazy"/>
</figure>

Es razonablemente seguro asumir que si precargamos un archivo JavaScript, eventualmente querríamos ejecutarlo. Entonces, desde Chrome 76, hemos estado experimentando con el streaming de precarga, donde cargar el script también empieza a compilarlo.

<figure>
  <img src="/_img/v8-release-78/script-streaming-2.svg" width="495" height="130" alt="" loading="lazy"/>
</figure>

Aún mejor, dado que podemos comenzar a compilar antes de que el script termine de cargarse, el proceso con streaming de precarga realmente se ve más así:

<figure>
  <img src="/_img/v8-release-78/script-streaming-3.svg" width="480" height="217" alt="" loading="lazy"/>
</figure>

Esto significa que, en algunos casos, podemos reducir el tiempo perceptible de compilación (la brecha entre el momento en que se ve la etiqueta `<script>` y el script comienza a ejecutarse) a cero. En nuestros experimentos, este tiempo perceptible de compilación se redujo, en promedio, entre 5 y 20%.

La mejor noticia es que gracias a nuestra infraestructura de experimentación, hemos podido no solo habilitar esto de manera predeterminada en Chrome 78, sino también activarlo para los usuarios de Chrome 76 en adelante.

### Desestructuración de objetos más rápida

La desestructuración de objetos de la forma…

```js
const {x, y} = object;
```

…es casi equivalente a la forma desazucarada...

```js
const x = object.x;
const y = object.y;
```

…excepto que también necesita lanzar un error especial cuando `object` es `undefined` o `null`...

```
$ v8 -e 'const object = undefined; const {x, y} = object;'
unnamed:1: TypeError: Cannot destructure property `x` of 'undefined' or 'null'.
const object = undefined; const {x, y} = object;
                                 ^
```

…en lugar del error normal que obtendrías al intentar desreferenciar un undefined:

```
$ v8 -e 'const object = undefined; object.x'
unnamed:1: TypeError: Cannot read property 'x' of undefined
const object = undefined; object.x
                                 ^
```

Este chequeo adicional hacía que la desestructuración fuera más lenta que la simple asignación de variables, como [nos informaron vía Twitter](https://twitter.com/mkubilayk/status/1166360933087752197).

A partir de V8 v7.8, la desestructuración de objetos es **tan rápida** como la asignación de variables desazucarada equivalente (de hecho, generamos el mismo bytecode para ambos). Ahora, en lugar de chequeos explícitos de `undefined`/`null`, confiamos en que se lance una excepción al cargar `object.x` y capturamos la excepción si es resultado de la desestructuración.

### Posiciones de origen perezosas

Al compilar bytecode desde JavaScript, se generan tablas de posición de origen que vinculan las secuencias de bytecode con posiciones de caracteres dentro del código fuente. Sin embargo, esta información solo se utiliza al simbolizar excepciones o realizar tareas de desarrollo como depuración y análisis de rendimiento, por lo que en gran medida es memoria desperdiciada.

Para evitar esto, ahora compilamos bytecode sin recopilar posiciones de origen (asumiendo que no hay un depurador o analizador adjunto). Las posiciones de origen solo se recopilan cuando realmente se genera un seguimiento de la pila, por ejemplo, al llamar a `Error.stack` o imprimir el seguimiento de la pila de una excepción en la consola. Esto tiene cierto costo, ya que generar posiciones de origen requiere que la función sea reprocesada y compilada; sin embargo, la mayoría de los sitios web no simbolizan los trazos de pila en producción y, por lo tanto, no ven ningún impacto observable en el rendimiento. En nuestras pruebas de laboratorio vimos reducciones del uso de memoria de V8 entre un 1-2.5%.

![Ahorros de memoria por posiciones de origen perezosas en un dispositivo AndroidGo](/_img/v8-release-78/memory-savings.svg)

### Fallos más rápidos en coincidencias de RegExp

Generalmente, un RegExp intenta encontrar una coincidencia iterando hacia adelante a través de la cadena de entrada y verificando una coincidencia comenzando desde cada posición. Una vez que esa posición se acerca lo suficiente al final de la cadena como para que no sea posible una coincidencia, V8 ahora (en la mayoría de los casos) deja de intentar encontrar posibles comienzos de nuevas coincidencias y en su lugar devuelve rápidamente un fallo. Esta optimización se aplica tanto a expresiones regulares compiladas como interpretadas, y ofrece una mejora de velocidad en cargas de trabajo donde es común no encontrar una coincidencia, y la longitud mínima de cualquier coincidencia exitosa es relativamente grande en comparación con la longitud promedio de la cadena de entrada.

En la prueba UniPoker de JetStream 2, que inspiró este trabajo, V8 v7.8 trae una mejora del 20% en la puntuación promedio de todas las iteraciones.

## WebAssembly

### API de C/C++ para WebAssembly

A partir de la versión v7.8, la implementación de V8 de la [API de Wasm C/C++](https://github.com/WebAssembly/wasm-c-api) pasa de ser experimental a estar oficialmente soportada. Te permite usar una compilación especial de V8 como un motor de ejecución de WebAssembly en tus aplicaciones C/C++. ¡Sin involucrar JavaScript! Para más detalles e instrucciones, consulta [la documentación](https://docs.google.com/document/d/1oFPHyNb_eXg6NzrE6xJDNPdJrHMZvx0LqsD6wpbd9vY/edit).

### Tiempo de inicio mejorado

Llamar a una función de JavaScript desde WebAssembly o a una función de WebAssembly desde JavaScript implica ejecutar algún código wrapper, responsable de traducir los argumentos de la función de una representación a otra. Generar estos wrappers puede ser bastante costoso: en la demostración [Epic ZenGarden](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html), la compilación de wrappers ocupa alrededor del 20% del tiempo de inicio del módulo (compilación + instanciación) en una máquina Xeon de 18 núcleos.

Para esta versión, mejoramos la situación haciendo mejor uso de los hilos en segundo plano en máquinas multicore. Nos basamos en esfuerzos recientes para [escalar la compilación de funciones](/blog/v8-release-77#wasm-compilation) e integramos la compilación de wrappers en este nuevo canal asíncrono. La compilación de wrappers ahora representa alrededor del 8% del tiempo de inicio de la demostración Epic ZenGarden en la misma máquina.

## API de V8

Utiliza `git log branch-heads/7.7..branch-heads/7.8 include/v8.h` para obtener una lista de los cambios en el API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 7.8 -t branch-heads/7.8` para experimentar con las nuevas características de V8 v7.8. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
