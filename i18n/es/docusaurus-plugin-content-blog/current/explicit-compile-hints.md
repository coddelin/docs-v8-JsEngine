---
 title: 'Dando un Aviso a V8: Inicio Más Rápido de JavaScript con Indicaciones de Compilación Explícitas'
 author: 'Marja Hölttä'
 avatars:
   - marja-holtta
 date: 2025-04-29
 tags:
   - JavaScript
 description: "Las indicaciones de compilación explícitas controlan qué archivos y funciones de JavaScript se analizan y compilan inmediatamente"
 tweet: ''
---

Hacer que JavaScript funcione rápidamente es clave para una aplicación web receptiva. Incluso con las optimizaciones avanzadas de V8, analizar y compilar JavaScript crítico durante el inicio aún puede generar cuellos de botella en el rendimiento. Saber qué funciones de JavaScript compilar durante la compilación inicial del script puede acelerar la carga de las páginas web.

<!--truncate-->
Al procesar un script cargado de la red, V8 debe decidir para cada función: compilarla de inmediato ("ansiosamente") o posponer este proceso. Si una función que no ha sido compilada se llama más tarde, V8 debe entonces compilarla por demanda.

Si una función de JavaScript se ejecuta durante la carga de la página, compilarla ansiosamente es beneficioso porque:

- Durante el procesamiento inicial del script, necesitamos al menos un análisis ligero para encontrar el final de la función. En JavaScript, encontrar el final de la función requiere analizar toda la sintaxis (no hay atajos donde podamos contar las llaves - la gramática es demasiado compleja). Primeramente, hacer el análisis ligero y luego el análisis real es trabajo duplicado.
- Si decidimos compilar una función ansiosamente, el trabajo ocurre en un hilo en segundo plano, y partes de este se intercalan con la carga del script desde la red. Si en cambio compilamos la función solo cuando se está llamando, es demasiado tarde para paralelizar el trabajo, ya que el hilo principal no puede continuar hasta que la función sea compilada.

Puedes leer más sobre cómo V8 analiza y compila JavaScript [aquí](https://v8.dev/blog/preparser).

Muchas páginas web se beneficiarían de seleccionar las funciones correctas para la compilación ansiosa. Por ejemplo, en nuestro experimento con páginas web populares, 17 de 20 mostraron mejoras, y la reducción promedio en los tiempos de análisis y compilación fue de 630 ms.

Estamos desarrollando una función, [Indicaciones de Compilación Explícitas](https://github.com/WICG/explicit-javascript-compile-hints-file-based), que permite a los desarrolladores web controlar qué archivos y funciones de JavaScript se compilan ansiosamente. Chrome 136 ahora incluye una versión donde puedes seleccionar archivos individuales para compilación ansiosa.

Esta versión es particularmente útil si tienes un "archivo principal" que puedes seleccionar para compilación ansiosa, o si puedes mover código entre archivos fuente para crear dicho archivo principal.

Puedes activar la compilación ansiosa para todo el archivo insertando el comentario mágico

```js
//# allFunctionsCalledOnLoad
```

al principio del archivo.

Sin embargo, esta función debe usarse con moderación, ¡compilar demasiado consumirá tiempo y memoria!

## Experimenta tú mismo - indicaciones de compilación en acción

Puedes observar cómo funcionan las indicaciones de compilación diciéndole a V8 que registre los eventos de funciones. Por ejemplo, puedes usar los siguientes archivos para configurar una prueba mínima.

index.html:

```html
<script src="script1.js"></script>
<script src="script2.js"></script>
```

script1.js:

```js
function testfunc1() {
  console.log('testfunc1 llamado!');
}

testfunc1();
```

script2.js:

```js
//# allFunctionsCalledOnLoad

function testfunc2() {
  console.log('testfunc2 llamado!');
}

testfunc2();
```

Recuerda ejecutar Chrome con un directorio de datos de usuario limpio, para que la memoria caché no interfiera con tu experimento. Un comando de línea de ejemplo sería:

```sh
rm -rf /tmp/chromedata && google-chrome --no-first-run --user-data-dir=/tmp/chromedata --js-flags=--log-function_events > log.txt
```

Después de navegar a tu página de prueba, puedes ver los siguientes eventos de función en el registro:

```sh
$ grep testfunc log.txt
function,preparse-no-resolution,5,18,60,0.036,179993,testfunc1
function,full-parse,5,18,60,0.003,181178,testfunc1
function,parse-function,5,18,60,0.014,181186,testfunc1
function,interpreter,5,18,60,0.005,181205,testfunc1
function,full-parse,6,48,90,0.005,184024,testfunc2
function,interpreter,6,48,90,0.005,184822,testfunc2
```

Dado que `testfunc1` fue compilado de forma perezosa, vemos el evento `parse-function` cuando finalmente se llama:

```sh
function,parse-function,5,18,60,0.014,181186,testfunc1
```

En el caso de `testfunc2`, no vemos un evento correspondiente, ya que la indicación de compilación forzó a que se analizara y compilara ansiosamente.

## Futuro de las Indicaciones de Compilación Explícitas

A largo plazo, queremos avanzar hacia la selección de funciones individuales para compilación ansiosa. Esto le da a los desarrolladores web el control exacto sobre qué funciones desean compilar, y les permite exprimir los últimos detalles del rendimiento de compilación para optimizar sus páginas web. ¡Mantente atento!
