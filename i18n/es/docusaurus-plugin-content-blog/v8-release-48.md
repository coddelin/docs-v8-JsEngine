---
title: "Lanzamiento de V8 v4.8"
author: "el equipo de V8"
date: "2015-11-25 13:33:37"
tags: 
  - lanzamiento
description: "V8 v4.8 añade soporte para varias características nuevas del lenguaje ES2015."
---
Aproximadamente cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se ramifica desde el maestro Git de V8 inmediatamente antes de que Chrome se ramifique para un hito de Chrome Beta. Hoy nos complace anunciar nuestra nueva rama, [V8 versión 4.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.8), que estará en beta hasta que se libere en coordinación con Chrome 48 Estable. V8 4.8 contiene un puñado de características orientadas a desarrolladores, así que nos gustaría ofrecerles un adelanto de algunos de los aspectos destacados anticipándonos al lanzamiento en unas semanas.

<!--truncate-->
## Mejor soporte para ECMAScript 2015 (ES6)

Esta versión de V8 proporciona soporte para dos [símbolos bien conocidos](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols), símbolos integrados del estándar ES2015 que permiten a los desarrolladores aprovechar varios constructos de lenguaje de bajo nivel que previamente estaban ocultos.

### `@@isConcatSpreadable`

El nombre para una propiedad con valor booleano que si es `true`, indica que un objeto debe ser expandido a sus elementos de array mediante `Array.prototype.concat`.

```js
(function() {
  'use strict';
  class AutomaticallySpreadingArray extends Array {
    get [Symbol.isConcatSpreadable]() {
      return true;
    }
  }
  const first = [1];
  const second = new AutomaticallySpreadingArray();
  second[0] = 2;
  second[1] = 3;
  const all = first.concat(second);
  // Muestra [1, 2, 3]
  console.log(all);
}());
```

### `@@toPrimitive`

El nombre de un método que se invoca en un objeto para conversiones implícitas a valores primitivos.

```js
(function(){
  'use strict';
  class V8 {
    [Symbol.toPrimitive](hint) {
      if (hint === 'string') {
        console.log('string');
        return 'V8';
      } else if (hint === 'number') {
        console.log('number');
        return 8;
      } else {
        console.log('default:' + hint);
        return 8;
      }
    }
  }

  const engine = new V8();
  console.log(Number(engine));
  console.log(String(engine));
}());
```

### `ToLength`

El estándar ES2015 ajusta la operación abstracta para la conversión de tipos para convertir un argumento en un entero adecuado para usar como la longitud de un objeto similar a un array. (Aunque no directamente observable, este cambio podría ser indirectamente visible al tratar con objetos similares a un array con longitud negativa.)

## API de V8

Por favor revisa nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](https://v8.dev/docs/source-code#using-git) pueden usar `git checkout -b 4.8 -t branch-heads/4.8` para experimentar con las nuevas características de V8 v4.8. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características tú mismo pronto.
