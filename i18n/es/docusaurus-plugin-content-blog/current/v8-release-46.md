---
title: 'V8 versión v4.6'
author: 'el equipo de V8'
date: 2015-08-28 13:33:37
tags:
  - lanzamiento
description: 'V8 v4.6 viene con menos interrupciones y soporte para nuevas características del lenguaje ES2015.'
---
Aproximadamente cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se deriva del maestro de Git de V8 inmediatamente antes de que Chrome se ramifique para un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 4.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.6), que estará en beta hasta que se lance en coordinación con Chrome 46 Stable. V8 4.6 está lleno de todo tipo de beneficios para desarrolladores, así que nos gustaría ofrecerte un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento en varias semanas.

<!--truncate-->
## Mejor soporte para ECMAScript 2015 (ES6)

V8 v4.6 agrega soporte para varias características de [ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/).

### Operador de propagación

El [operador de propagación](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator) hace que trabajar con matrices sea mucho más conveniente. Por ejemplo, hace que el código imperativo sea obsoleto cuando simplemente quieres fusionar matrices.

```js
// Fusionando matrices
// Código sin operador de propagación
const inner = [3, 4];
const merged = [0, 1, 2].concat(inner, [5]);

// Código con operador de propagación
const inner = [3, 4];
const merged = [0, 1, 2, ...inner, 5];
```

Otra buena utilidad del operador de propagación es reemplazar `apply`:

```js
// Parámetros de función almacenados en una matriz
// Código sin operador de propagación
function myFunction(a, b, c) {
  console.log(a);
  console.log(b);
  console.log(c);
}
const argsInArray = ['Hola ', 'Operador de ', 'propagación!'];
myFunction.apply(null, argsInArray);

// Código con operador de propagación
function myFunction (a,b,c) {
  console.log(a);
  console.log(b);
  console.log(c);
}

const argsInArray = ['Hola ', 'Operador de ', 'propagación!'];
myFunction(...argsInArray);
```

### `new.target`

[`new.target`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target) es una de las características de ES6 diseñadas para mejorar el trabajo con clases. En el fondo, en realidad es un parámetro implícito para cada función. Si una función es llamada con la palabra clave new, entonces el parámetro contiene una referencia a la función llamada. Si new no se usa, el parámetro es undefined.

En la práctica, esto significa que puedes usar new.target para averiguar si una función fue llamada normalmente o como constructor usando la palabra clave new.

```js
function myFunction() {
  if (new.target === undefined) {
    throw 'Intenta llamarla con new.';
  }
  console.log('¡Funciona!');
}

// Falla:
myFunction();

// Funciona:
const a = new myFunction();
```

Cuando se usan clases e herencia de ES6, new.target dentro del constructor de una superclase está vinculado al constructor derivado que fue invocado con new. En particular, esto permite a las superclases acceder al prototipo de la clase derivada durante la construcción.

## Reducir la interrupción

[Interrupción](https://en.wiktionary.org/wiki/jank#Noun) puede ser un problema, especialmente cuando estás jugando un juego. A menudo, es incluso peor cuando el juego presenta múltiples jugadores. [oortonline.gl](http://oortonline.gl/) es un benchmark de WebGL que prueba los límites de los navegadores actuales renderizando una escena 3D compleja con efectos de partículas y renderizado moderno de shaders. El equipo de V8 se embarcó en una misión para empujar los límites del rendimiento de Chrome en estos entornos. Aún no hemos terminado, pero los frutos de nuestros esfuerzos ya están dando resultados. Chrome 46 muestra avances increíbles en el rendimiento de oortonline.gl que puedes ver por ti mismo a continuación.

Algunas de las optimizaciones incluyen:

- [Mejoras en el rendimiento de TypedArray](https://code.google.com/p/v8/issues/detail?id=3996)
    - Los TypedArrays se usan ampliamente en motores de renderizado como Turbulenz (el motor detrás de oortonline.gl). Por ejemplo, los motores a menudo crean arrays tipados (como Float32Array) en JavaScript y los pasan a WebGL después de aplicar transformaciones.
    - El punto clave fue optimizar la interacción entre el integrador (Blink) y V8.
- [Mejoras en el rendimiento al pasar TypedArrays y otras memorias de V8 a Blink](https://code.google.com/p/chromium/issues/detail?id=515795)
    - No hay necesidad de crear handles adicionales (que también son rastreados por V8) para arrays tipados cuando se pasan a WebGL como parte de una comunicación unidireccional.
    - Al alcanzar los límites de memoria asignada externamente (Blink), ahora iniciamos una recolección de basura incremental en lugar de una completa.
- [Programación de recolección de basura en momentos de inactividad](/blog/free-garbage-collection)
    - Las operaciones de recolección de basura se programan durante los tiempos de inactividad en el hilo principal, lo que desbloquea el compositor y resulta en un renderizado más fluido.
- [Barrido concurrente habilitado para toda la generación antigua del montón recolectado de basura](https://code.google.com/p/chromium/issues/detail?id=507211)
    - La liberación de fragmentos de memoria no utilizados se realiza en hilos adicionales concurrentes al hilo principal, lo que reduce significativamente el tiempo de pausa principal de la recolección de basura.

Lo bueno es que todos los cambios relacionados con oortonline.gl son mejoras generales que potencialmente afectan a todos los usuarios de aplicaciones que hacen un uso intensivo de WebGL.

## API de V8

Por favor, consulta nuestro [resumen de cambios de la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente pocas semanas después de cada versión importante.

Los desarrolladores con un [checkout activo de V8](https://v8.dev/docs/source-code#using-git) pueden usar `git checkout -b 4.6 -t branch-heads/4.6` para experimentar con las nuevas características en V8 v4.6. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características tú mismo pronto.
