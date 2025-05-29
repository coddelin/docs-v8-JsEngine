---
title: '¡V8 es más rápido y seguro que nunca!'
author: '[Victor Gomes](https://twitter.com/VictorBFG), el experto en Glühwein'
avatars:
  - victor-gomes
date: 2023-12-14
tags:
  - JavaScript
  - WebAssembly
  - seguridad
  - benchmarks
description: "Los impresionantes logros de V8 en 2023"
tweet: ''
---

Bienvenido al emocionante mundo de V8, donde la velocidad no es solo una característica, sino un estilo de vida. Al despedirnos de 2023, es hora de celebrar los impresionantes logros que V8 ha alcanzado este año.

A través de innovadoras optimizaciones de rendimiento, V8 continúa ampliando los límites de lo que es posible en el paisaje en constante evolución de la Web. Hemos introducido un nuevo compilador de nivel intermedio y hemos implementado varias mejoras en la infraestructura del compilador de nivel superior, el tiempo de ejecución y el recolector de basura, lo que ha resultado en importantes ganancias de velocidad en general.

<!--truncate-->
Además de las mejoras en rendimiento, hemos implementado emocionantes nuevas características para JavaScript y WebAssembly. También hemos enviado un nuevo enfoque para llevar lenguajes de programación con recolección de basura de manera eficiente a la Web con [WebAssembly Garbage Collection (WasmGC)](https://v8.dev/blog/wasm-gc-porting).

Pero nuestro compromiso con la excelencia no termina ahí; también hemos priorizado la seguridad. Mejoramos nuestra infraestructura de sandbox y hemos introducido [Control-flow Integrity (CFI)](https://en.wikipedia.org/wiki/Control-flow_integrity) en V8, proporcionando un entorno más seguro para los usuarios.

A continuación, hemos destacado algunos de los puntos clave del año.

# Maglev: nuevo compilador optimizador de nivel intermedio

Hemos introducido un nuevo compilador optimizador llamado [Maglev](https://v8.dev/blog/maglev), posicionado estratégicamente entre nuestros compiladores existentes [Sparkplug](https://v8.dev/blog/sparkplug) y [TurboFan](https://v8.dev/docs/turbofan). Funciona entre ambos, como un compilador optimizador de alta velocidad, generando código optimizado de manera eficiente y a un ritmo impresionante. Genera código aproximadamente 20 veces más lento que nuestro compilador base no optimizador Sparkplug, pero entre 10 y 100 veces más rápido que el de nivel superior TurboFan. Hemos observado importantes mejoras de rendimiento con Maglev, con [JetStream](https://browserbench.org/JetStream2.1/) mejorando en un 8.2% y [Speedometer](https://browserbench.org/Speedometer2.1/) en un 6%. La velocidad de compilación más rápida de Maglev y su menor dependencia de TurboFan resultaron en un ahorro de energía del 10% en el consumo general de V8 durante las ejecuciones de Speedometer. [Aunque no está completamente terminado](https://en.m.wikipedia.org/wiki/Full-employment_theorem), el estado actual de Maglev justifica su lanzamiento en Chrome 117. Más detalles en nuestra [entrada de blog](https://v8.dev/blog/maglev).

# Turboshaft: nueva arquitectura para el compilador optimizador de nivel superior

Maglev no fue nuestra única inversión en tecnología de compiladores mejorada. También hemos introducido Turboshaft, una nueva arquitectura interna para nuestro compilador optimizador de nivel superior Turbofan, haciéndolo más fácil de extender con nuevas optimizaciones y más rápido al compilar. Desde Chrome 120, las fases de backend independientes de la CPU utilizan Turboshaft en lugar de Turbofan, y compilan aproximadamente el doble de rápido que antes. Esto está ahorrando energía y preparando el camino para emocionantes mejoras de rendimiento el próximo año y más allá. ¡Mantente atento para actualizaciones!

# Parser de HTML más rápido

Observamos que una porción significativa de nuestro tiempo de benchmarks se consumía en el análisis de HTML. Aunque no es una mejora directa para V8, tomamos la iniciativa y aplicamos nuestra experiencia en optimización de rendimiento para añadir un parser de HTML más rápido a Blink. Estos cambios resultaron en un aumento notable del 3.4% en los puntajes de Speedometer. El impacto en Chrome fue tan positivo que el proyecto WebKit incorporó rápidamente estos cambios en [su repositorio](https://github.com/WebKit/WebKit/pull/9926). ¡Nos enorgullece contribuir a la meta colectiva de lograr una Web más rápida!

# Asignaciones DOM más rápidas

También hemos estado invirtiendo activamente en el lado del DOM. Se han aplicado importantes optimizaciones a las estrategias de asignación de memoria en [Oilpan](https://chromium.googlesource.com/v8/v8/+/main/include/cppgc/README.md), el asignador para los objetos DOM. Ha ganado un grupo de páginas, lo que ha reducido notablemente el costo de los viajes de ida y vuelta al kernel. Oilpan ahora admite tanto punteros comprimidos como sin comprimir, y evitamos comprimir campos de alto tráfico en Blink. Dado con qué frecuencia se realiza la descompresión, tuvo un impacto amplio en el rendimiento. Además, sabiendo qué tan rápido es el asignador, hemos optimizado clases asignadas frecuentemente, lo que hizo que las cargas de trabajo de asignación sean 3 veces más rápidas y mostró una mejora significativa en los benchmarks centrados en DOM como Speedometer.

# Nuevas características de JavaScript

JavaScript sigue evolucionando con características recién estandarizadas, y este año no fue la excepción. Lanzamos [ArrayBuffers redimensionables](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer#resizing_arraybuffers) y [transferencia de ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer), String [`isWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/isWellFormed) y [`toWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toWellFormed), [Bandera `v` de RegExp](https://v8.dev/features/regexp-v-flag) (también conocida como notación de conjuntos Unicode), [`JSON.parse` con origen](https://github.com/tc39/proposal-json-parse-with-source), [Agrupamiento de arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy), [`Promise.withResolvers`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers) y [`Array.fromAsync`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fromAsync). Lamentablemente, tuvimos que descontinuar temporalmente [las ayudas para iteradores](https://github.com/tc39/proposal-iterator-helpers) después de descubrir una incompatibilidad web, pero hemos trabajado con TC39 para solucionar el problema y las relanzaremos pronto. Finalmente, también hicimos el código JS de ES6+ más rápido [eliminando algunas verificaciones redundantes de zona temporal muerta](https://docs.google.com/document/d/1klT7-tQpxtYbwhssRDKfUMEgm-NS3iUeMuApuRgZnAw/edit?usp=sharing) para las declaraciones `let` y `const`.

# Actualizaciones de WebAssembly

Este año llegaron muchas nuevas características y mejoras de rendimiento para Wasm. Habilitamos soporte para [multi-memoria](https://github.com/WebAssembly/multi-memory), [llamadas finales](https://github.com/WebAssembly/tail-call) (vea nuestra [entrada de blog](https://v8.dev/blog/wasm-tail-call) para más detalles), y [SIMD relajada](https://github.com/WebAssembly/relaxed-simd) para liberar un rendimiento de siguiente nivel. Terminamos de implementar [memory64](https://github.com/WebAssembly/memory64) para sus aplicaciones que demandan mucha memoria y solo estamos esperando que la propuesta [alcance la fase 4](https://github.com/WebAssembly/memory64/issues/43) para poder lanzarla. Nos aseguramos de incorporar las últimas actualizaciones a la [propuesta de manejo de excepciones](https://github.com/WebAssembly/exception-handling) mientras seguimos admitiendo el formato anterior. Y seguimos invirtiendo en [JSPI](https://v8.dev/blog/jspi) para [habilitar otra gran clase de aplicaciones en la web](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y/edit#bookmark=id.razn6wo5j2m). ¡Esté atento para el próximo año!

# Recolección de basura para WebAssembly

Hablando de llevar nuevas clases de aplicaciones a la web, finalmente lanzamos la Recolección de Basura de WebAssembly (WasmGC) después de varios años de trabajo en la [propuesta](https://github.com/WebAssembly/gc/blob/main/proposals/gc/MVP.md)'s de estandarización e [implementación](https://bugs.chromium.org/p/v8/issues/detail?id=7748). Wasm ahora tiene una forma integrada de asignar objetos y matrices que son gestionados por el recolector de basura existente de V8. Eso permite compilar aplicaciones escritas en Java, Kotlin, Dart y lenguajes similares a Wasm – donde generalmente se ejecutan aproximadamente el doble de rápido que cuando se compilan a JavaScript. Vea [nuestra entrada de blog](https://v8.dev/blog/wasm-gc-porting) para obtener muchos más detalles.

# Seguridad

En el lado de seguridad, nuestros tres temas principales del año fueron el sandboxing, fuzzing y CFI. En el lado del [sandboxing](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing) nos enfocamos en construir la infraestructura faltante como la tabla de códigos y punteros confiables. En el lado del fuzzing invertimos en todo, desde la infraestructura de fuzzing, fuzzeadores de propósito especial y mejor cobertura de lenguaje. Parte de nuestro trabajo fue cubierto en [esta presentación](https://www.youtube.com/watch?v=Yd9m7e9-pG0). Finalmente, en el lado de CFI establecimos las bases para nuestra [arquitectura CFI](https://v8.dev/blog/control-flow-integrity) para que pueda realizarse en tantas plataformas como sea posible. Además de estos, algunos esfuerzos más pequeños pero notables incluyen el trabajo en [mitigar una técnica popular de explotación](https://crbug.com/1445008) relacionada con `the_hole` y el lanzamiento de un nuevo programa de recompensas para exploits en la forma de [V8CTF](https://github.com/google/security-research/blob/master/v8ctf/rules.md).

# Conclusión

A lo largo del año, dedicamos esfuerzos a numerosas mejoras incrementales de rendimiento. ¡El impacto combinado de estos pequeños proyectos, junto con los detallados en la entrada del blog, es sustancial! A continuación, se muestran puntuaciones de benchmarks que ilustran las mejoras de rendimiento de V8 logradas en 2023, con un crecimiento general de `14%` para JetStream y un impresionante `34%` para Speedometer.

![Benchmarks de rendimiento web medidos en una MacBook Pro M1 de 13”.](/_img/holiday-season-2023/scores.svg)

Estos resultados muestran que V8 es más rápido y seguro que nunca. ¡Abróchate el cinturón, compañero desarrollador, porque con V8, el viaje hacia una web rápida y emocionante apenas ha comenzado! ¡Estamos comprometidos a mantener a V8 como el mejor motor de JavaScript y WebAssembly del planeta!

De parte de todos nosotros en V8, ¡le deseamos una feliz temporada festiva llena de experiencias rápidas, seguras y fabulosas mientras navega por la web!
