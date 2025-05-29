---
title: "Versión V8 v6.2"
author: "el equipo de V8"
date: "2017-09-11 13:33:37"
tags: 
  - lanzamiento
description: "V8 v6.2 incluye mejoras de rendimiento, más características del lenguaje JavaScript, un aumento en la longitud máxima de cadenas y más."
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del maestro de Git de V8 justo antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más reciente, [versión 6.2 de V8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.2), que está en beta hasta su lanzamiento en coordinación con Chrome 62 Stable en varias semanas. V8 v6.2 está llena de todo tipo de cosas buenas para los desarrolladores. Esta publicación proporciona un avance de algunos de los puntos destacados en anticipación al lanzamiento.

<!--truncate-->
## Mejoras de rendimiento

El rendimiento de [`Object#toString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString) ya se había identificado previamente como un posible cuello de botella, ya que es usado frecuentemente por bibliotecas populares como [lodash](https://lodash.com/) y [underscore.js](http://underscorejs.org/), y marcos como [AngularJS](https://angularjs.org/). Varias funciones auxiliares como [`_.isPlainObject`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isPlainObject.js#L13-L50), [`_.isDate`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isDate.js#L8-L25), [`angular.isArrayBuffer`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L739-L741) o [`angular.isRegExp`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L680-L689) se usan frecuentemente en el código de aplicaciones y bibliotecas para realizar verificaciones de tipos en tiempo de ejecución.

Con la llegada de ES2015, `Object#toString` se volvió modificable mediante parcheo gracias al nuevo símbolo [`Symbol.toStringTag`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag), lo que también hizo que `Object#toString` sea más pesado y más desafiante de acelerar. En esta versión, trasladamos una optimización inicialmente implementada en el [motor de JavaScript SpiderMonkey](https://bugzilla.mozilla.org/show_bug.cgi?id=1369042#c0) a V8, aumentando la capacidad de procesamiento de `Object#toString` por un factor de **6.5×**.

![](/_img/v8-release-62/perf.svg)

También impacta en el benchmark del navegador Speedometer, específicamente en la subprueba de AngularJS, donde medimos una mejora sólida del 3%. Lee la [entrada de blog detallada](https://ponyfoo.com/articles/investigating-performance-object-prototype-to-string-es2015) para obtener información adicional.

![](/_img/v8-release-62/speedometer.svg)

También hemos mejorado significativamente el rendimiento de los [proxies de ES2015](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), acelerando las llamadas a un objeto proxy mediante `someProxy(params)` o `new SomeOtherProxy(params)` hasta en **5×**:

![](/_img/v8-release-62/proxy-call-construct.svg)

De manera similar, el rendimiento de acceder a una propiedad en un objeto proxy mediante `someProxy.property` mejoró en casi **6.5×**:

![](/_img/v8-release-62/proxy-property.svg)

Esto es parte de una pasantía en curso. Sigue atento para una entrada de blog más detallada y resultados finales.

También estamos emocionados de anunciar que, gracias a las [contribuciones](https://chromium-review.googlesource.com/c/v8/v8/+/620150) de [Peter Wong](https://twitter.com/peterwmwong), el rendimiento del método incorporado [`String#includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes) mejoró más de **3×** desde la versión anterior.

Las búsquedas de código hash para tablas hash internas se volvieron mucho más rápidas, lo que resultó en una mejora de rendimiento para `Map`, `Set`, `WeakMap` y `WeakSet`. Una próxima entrada de blog explicará esta optimización en detalle.

![](/_img/v8-release-62/hashcode-lookups.png)

El recolector de basura ahora utiliza un [Scavenger Paralelo](https://bugs.chromium.org/p/chromium/issues/detail?id=738865) para recolectar la llamada generación joven del heap.

## Modo mejorado de bajo consumo de memoria

En las últimas versiones, el modo de bajo consumo de memoria de V8 se ha mejorado (e.g., [estableciendo el tamaño inicial del semi-espacio a 512 KB](https://chromium-review.googlesource.com/c/v8/v8/+/594387)). Los dispositivos con poca memoria ahora enfrentan menos situaciones de falta de memoria. Sin embargo, este comportamiento de bajo consumo puede tener un impacto negativo en el rendimiento de ejecución.

## Más características de expresiones regulares

El soporte para [el modo `dotAll`](https://github.com/tc39/proposal-regexp-dotall-flag) para expresiones regulares, habilitado mediante la bandera `s`, ahora está habilitado por defecto. En modo `dotAll`, el átomo `.` en expresiones regulares coincide con cualquier carácter, incluidos los terminadores de línea.

```js
/foo.bar/su.test('foo\nbar'); // true
```

[Aserciones lookbehind](https://github.com/tc39/proposal-regexp-lookbehind), otra nueva característica de expresiones regulares, ya están disponibles por defecto. El nombre ya describe bastante bien su significado. Las aserciones lookbehind ofrecen una forma de restringir un patrón para que solo coincida si está precedido por el patrón en el grupo lookbehind. Vienen en dos versiones: coincidente y no coincidente:

```js
/(?<=\$)\d+/.exec('$1 is worth about ¥123'); // ['1']
/(?<!\$)\d+/.exec('$1 is worth about ¥123'); // ['123']
```

Más detalles sobre estas características están disponibles en nuestra publicación de blog titulada [Próximas características de expresiones regulares](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features).

## Revisión de literales de plantilla

La restricción sobre las secuencias de escape en literales de plantilla se ha flexibilizado [según la propuesta relevante](https://tc39.es/proposal-template-literal-revision/). Esto habilita nuevos casos de uso para las etiquetas de plantilla, como escribir un procesador de LaTeX.

```js
const latex = (strings) => {
  // …
};

const document = latex`
\newcommand{\fun}{\textbf{¡Diversión!}}
\newcommand{\unicode}{\textbf{¡Unicode!}}
\newcommand{\xerxes}{\textbf{¡Rey!}}
Breve sobre la h va \u{h}ere // ¡Token ilegal!
`;
```

## Longitud máxima de cadena aumentada

La longitud máxima de cadenas en plataformas de 64 bits aumentó de `2**28 - 16` a `2**30 - 25` caracteres.

## Full-codegen ha desaparecido

En V8 v6.2, los últimos componentes importantes del antiguo pipeline se han eliminado. Más de 30K líneas de código se borraron en esta versión: una clara victoria para reducir la complejidad del código.

## API de V8

Por favor, revise nuestro [resumen de cambios de API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 6.2 -t branch-heads/6.2` para experimentar con las nuevas características en V8 v6.2. Alternativamente, pueden [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
