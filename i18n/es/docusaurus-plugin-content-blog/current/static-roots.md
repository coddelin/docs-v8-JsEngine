---
title: &apos;Raíces Estáticas: Objetos con Direcciones Constantes en Tiempo de Compilación&apos;
author: &apos;Olivier Flückiger&apos;
avatars:
  - olivier-flueckiger
date: 2024-02-05
tags:
  - JavaScript
description: "Raíces estáticas hace que las direcciones de ciertos objetos JS sean constantes en tiempo de compilación."
tweet: &apos;&apos;
---

¿Alguna vez te has preguntado de dónde provienen `undefined`, `true` y otros objetos centrales de JavaScript? Estos objetos son los átomos de cualquier objeto definido por el usuario y necesitan estar ahí primero. V8 los llama raíces inmutables inamovibles y viven en su propio montón: el montón de solo lectura. Dado que se utilizan constantemente, el acceso rápido es crucial. ¿Y qué podría ser más rápido que adivinar correctamente su dirección de memoria en tiempo de compilación?

<!--truncate-->
Como ejemplo, considera la función del [API](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-value.h?q=symbol:%5Cbv8::Value::IsUndefined%5Cb%20case:yes) extremadamente común `IsUndefined`. En lugar de tener que buscar la dirección del objeto `undefined` como referencia, ¿qué pasaría si pudiéramos simplemente verificar si el puntero de un objeto termina, digamos, en `0x61` para saber si es undefined? Esto es exactamente lo que logra la función de *raíces estáticas* de V8. Este artículo explora los obstáculos que tuvimos que superar para llegar allí. La función aterrizó en Chrome 111 y trajo beneficios de rendimiento en toda la máquina virtual, acelerando especialmente el código C++ y las funciones integradas.

## Inicialización del Montón de Solo Lectura

Crear los objetos de solo lectura lleva tiempo, por lo que V8 los crea en tiempo de compilación. Para compilar V8, primero se compila un binario proto-V8 mínimo llamado `mksnapshot`. Este crea todos los objetos de solo lectura compartidos, así como el código nativo de las funciones integradas y los escribe en un snapshot. Luego, se compila el binario real de V8 y se empaqueta con el snapshot. Para iniciar V8, el snapshot se carga en la memoria y podemos empezar a usar su contenido inmediatamente. El siguiente diagrama muestra el proceso de compilación simplificado para el binario independiente `d8`.

![](/_img/static-roots/static-roots1.svg)

Una vez que `d8` está en funcionamiento, todos los objetos de solo lectura tienen su lugar fijo en la memoria y nunca se mueven. Cuando generamos código JIT, podemos, por ejemplo, referirnos directamente a `undefined` por su dirección. Sin embargo, al construir el snapshot y al compilar el código C++ para libv8, la dirección aún no es conocida. Depende de dos cosas que son desconocidas en tiempo de compilación. Primero, el diseño binario del montón de solo lectura y, segundo, dónde en el espacio de memoria se ubica ese montón de solo lectura.

## ¿Cómo Predecir Direcciones?

V8 utiliza [compresión de punteros](https://v8.dev/blog/pointer-compression). En lugar de direcciones completas de 64 bits, referimos a los objetos mediante un desplazamiento de 32 bits dentro de una región de memoria de 4GB. Para muchas operaciones, como cargas de propiedades o comparaciones, el desplazamiento de 32 bits dentro de esa jaula es todo lo que se necesita para identificar un objeto de manera única. Por lo tanto, nuestro segundo problema —no saber dónde en el espacio de memoria se coloca el montón de solo lectura— no es realmente un problema. Simplemente colocamos el montón de solo lectura al inicio de cada jaula de compresión de pointers, dándole así una ubicación conocida. Por ejemplo, entre todos los objetos en el montón de V8, `undefined` siempre tiene la dirección comprimida más pequeña, empezando en 0x61 bytes. Así sabemos que si los 32 bits inferiores de la dirección completa de cualquier objeto JS son 0x61, entonces debe ser `undefined`.

Esto ya es útil, pero queremos poder usar esta dirección en el snapshot y en libv8 – un problema aparentemente circular. Sin embargo, si aseguramos que `mksnapshot` crea de manera determinista un montón de solo lectura idéntico bit a bit, entonces podemos reutilizar estas direcciones en compilaciones posteriores. Para usarlas en libv8 propiamente dicho, básicamente compilamos V8 dos veces:

![](/_img/static-roots/static-roots2.svg)

La primera vez que llamamos a `mksnapshot`, el único artefacto producido es un archivo que contiene las [direcciones](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/roots/static-roots.h) relativas a la base de la jaula de cada objeto en el montón de solo lectura. En la segunda etapa de la compilación, compilamos libv8 nuevamente y una bandera asegura que siempre que nos refiramos a `undefined`, literalmente usamos `cage_base + StaticRoot::kUndefined`; el desplazamiento estático de `undefined` por supuesto está definido en el archivo static-roots.h. En muchos casos, esto permitirá al compilador de C++ que crea libv8 y al compilador de funciones integradas en `mksnapshot` crear un código mucho más eficiente, ya que la alternativa es siempre cargar la dirección desde un array global de objetos raíz. Terminamos con un binario `d8` donde la dirección comprimida de `undefined` está codificada como `0x61`.

Bueno, moralmente así es como funciona todo, pero prácticamente solo compilamos V8 una vez – nadie tiene tiempo para esto. El archivo static-roots.h generado se almacena en caché en el repositorio de origen y solo necesita ser recreado si cambiamos el diseño del montón de solo lectura.

## Aplicaciones Futuras

Hablando de aspectos prácticos, las raíces estáticas permiten aún más optimizaciones. Por ejemplo, hemos agrupado objetos comunes juntos, lo que nos permite implementar algunas operaciones como verificaciones de rango sobre sus direcciones. Por ejemplo, todos los mapas de cadenas (es decir, los objetos meta [hidden-class](https://v8.dev/docs/hidden-classes) que describen la disposición de los diferentes tipos de cadenas) están uno al lado del otro, por lo que un objeto es una cadena si su mapa tiene una dirección comprimida entre `0xdd` y `0x49d`. O bien, los objetos evaluados como verdaderos deben tener una dirección que sea al menos `0xc1`.

No todo está relacionado con el rendimiento del código JIT en V8. Como ha demostrado este proyecto, un cambio relativamente pequeño en el código C++ también puede tener un impacto significativo. Por ejemplo, Speedometer 2, un punto de referencia que examina la API de V8 y la interacción entre V8 y su integrador, aumentó su puntuación en aproximadamente un 1% en una CPU M1 gracias a las raíces estáticas.
