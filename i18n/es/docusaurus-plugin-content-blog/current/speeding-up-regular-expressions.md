---
title: 'Acelerando las expresiones regulares en V8'
author: 'Jakob Gruber, Ingeniero de Software Regular'
avatars:
  - 'jakob-gruber'
date: 2017-01-10 13:33:37
tags:
  - internals
  - RegExp
description: 'V8 recientemente migró las funciones integradas de RegExp de una implementación autohospedada en JavaScript a una que se conecta directamente a nuestra nueva arquitectura de generación de código basada en TurboFan.'
---
Esta publicación del blog aborda la reciente migración de las funciones integradas de RegExp en V8 de una implementación autohospedada en JavaScript a una que se conecta directamente a nuestra nueva arquitectura de generación de código basada en [TurboFan](/blog/v8-release-56).

<!--truncate-->
La implementación de RegExp en V8 se basa en [Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html), que es ampliamente considerada como una de las motores de expresiones regulares más rápidos. Mientras que el motor en sí encapsula la lógica de bajo nivel para realizar coincidencias de patrones contra cadenas, las funciones en el prototipo de RegExp, como [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec), realizan el trabajo adicional necesario para exponer su funcionalidad al usuario.

Históricamente, varios componentes de V8 se han implementado en JavaScript. Hasta hace poco, `regexp.js` ha sido uno de ellos, albergando la implementación del constructor RegExp, todas sus propiedades así como las propiedades de su prototipo.

Desafortunadamente, este enfoque tiene desventajas, incluyendo rendimiento impredecible y transiciones costosas al tiempo de ejecución de C++ para funcionalidades de bajo nivel. La reciente adición de subclases integradas en ES6 (que permite a los desarrolladores de JavaScript proporcionar su propia implementación personalizada de RegExp) ha resultado en una penalización adicional en el rendimiento de RegExp, incluso si el RegExp integrado no se subclasea. Estas regresiones no podían abordarse completamente en la implementación autohospedada en JavaScript.

Por lo tanto, decidimos migrar la implementación de RegExp de JavaScript. Sin embargo, preservar el rendimiento resultó ser más difícil de lo esperado. Una migración inicial a una implementación completamente en C++ fue significativamente más lenta, alcanzando solo alrededor del 70% del rendimiento de la implementación original. Después de investigar, encontramos varias causas:

- [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) contiene un par de áreas extremadamente sensibles al rendimiento, incluyendo principalmente la transición al motor subyacente de RegExp y la construcción del resultado de RegExp con sus llamadas asociadas a subcadenas. Para estas, la implementación en JavaScript confiaba en piezas de código altamente optimizadas llamadas “stubs”, escritas en lenguaje ensamblador nativo o conectándose directamente al compilador optimizador. No es posible acceder a estos stubs desde C++, y sus equivalentes en tiempo de ejecución son significativamente más lentos.
- Los accesos a propiedades como `lastIndex` de RegExp pueden ser costosos, posiblemente requiriendo búsquedas por nombre y recorridos de la cadena de prototipos. El compilador optimizador de V8 a menudo puede reemplazar automáticamente dichos accesos con operaciones más eficientes, mientras que estos casos tendrían que manejarse explícitamente en C++.
- En C++, las referencias a objetos JavaScript deben envolverse en llamados `Handle`s para cooperar con la recolección de basura. La gestión de Handles genera más sobrecarga en comparación con la implementación en JavaScript.

Nuestro nuevo diseño para la migración de RegExp se basa en el [CodeStubAssembler](/blog/csa), un mecanismo que permite a los desarrolladores de V8 escribir código independiente de la plataforma que luego será traducido a código rápido específico de la plataforma por el mismo backend que también se utiliza para el nuevo compilador optimizador TurboFan. Usar el CodeStubAssembler nos permite abordar todas las deficiencias de la implementación inicial en C++. Los stubs (como el punto de entrada al motor de RegExp) pueden llamarse fácilmente desde el CodeStubAssembler. Si bien los accesos rápidos a propiedades aún necesitan implementarse explícitamente en los llamados caminos rápidos, dichos accesos son extremadamente eficientes en el CodeStubAssembler. Los Handles simplemente no existen fuera de C++. Y dado que la implementación ahora opera a un nivel muy bajo, podemos tomar atajos adicionales como omitir la construcción costosa de resultados cuando no sea necesario.

Los resultados han sido muy positivos. Nuestro puntaje en [una carga de trabajo significativa de RegExp](https://github.com/chromium/octane/blob/master/regexp.js) ha mejorado en un 15%, recuperando con creces nuestras recientes pérdidas de rendimiento relacionadas con subclassificación. Los microbenchmarks (Figura 1) muestran mejoras en todos los aspectos, desde un 7% para [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec), hasta un 102% para [`RegExp.prototype[@@split]`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/@@split).

![Figura 1: Mejora de velocidad de RegExp desglosada por función](/_img/speeding-up-regular-expressions/perf.png)

Entonces, ¿cómo puedes asegurarte, como desarrollador de JavaScript, de que tus RegExps sean rápidos? Si no estás interesado en engancharte a los internos de RegExp, asegúrate de que ni la instancia de RegExp ni su prototipo sean modificados para obtener el mejor rendimiento:

```js
const re = /./g;
re.exec('');  // Ruta rápida.
re.new_property = 'lento';
RegExp.prototype.new_property = 'también lento';
re.exec('');  // Ruta lenta.
```

Y aunque la subclassificación de RegExp puede ser bastante útil en ocasiones, ten en cuenta que las instancias de RegExp subclassificadas requieren un manejo más genérico y, por lo tanto, siguen la ruta lenta:

```js
class SlowRegExp extends RegExp {}
new SlowRegExp(".", "g").exec('');  // Ruta lenta.
```

La migración completa de RegExp estará disponible en V8 v5.7.
