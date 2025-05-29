---
title: &apos;Separadores numéricos&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-05-28
tags:
  - ECMAScript
  - ES2021
  - io19
description: &apos;JavaScript ahora admite guiones bajos como separadores en literales numéricos, lo que aumenta la legibilidad y el mantenimiento del código fuente.&apos;
tweet: &apos;1129073383931559936&apos;
---
Los literales numéricos grandes son difíciles de interpretar rápidamente para el ojo humano, especialmente cuando hay muchos dígitos repetidos:

```js
1000000000000
   1019436871.42
```

Para mejorar la legibilidad, [una nueva característica del lenguaje JavaScript](https://github.com/tc39/proposal-numeric-separator) permite guiones bajos como separadores en literales numéricos. Por lo tanto, lo anterior ahora puede reescribirse para agrupar los dígitos por miles, por ejemplo:

<!--truncate-->
```js
1_000_000_000_000
    1_019_436_871.42
```

Ahora es más fácil notar que el primer número es un billón, y el segundo número está en el orden de mil millones.

Los separadores numéricos ayudan a mejorar la legibilidad para todo tipo de literales numéricos:

```js
// Un literal entero decimal con sus dígitos agrupados por miles:
1_000_000_000_000
// Un literal decimal con sus dígitos agrupados por miles:
1_000_000.220_720
// Un literal entero binario con sus bits agrupados por octeto:
0b01010110_00111000
// Un literal entero binario con sus bits agrupados por nibble:
0b0101_0110_0011_1000
// Un literal entero hexadecimal con sus dígitos agrupados por byte:
0x40_76_38_6A_73
// Un literal BigInt con sus dígitos agrupados por miles:
4_642_473_943_484_686_707n
```

Incluso funcionan para literales enteros octales (aunque [no puedo pensar en un ejemplo](https://github.com/tc39/proposal-numeric-separator/issues/44) donde los separadores aporten valor a tales literales):

```js
// Un separador numérico en un literal entero octal: 🤷‍♀️
0o123_456
```

Tenga en cuenta que JavaScript también tiene una sintaxis heredada para literales octales sin el prefijo explícito `0o`. Por ejemplo, `017 === 0o17`. Esta sintaxis no es compatible en modo estricto ni dentro de módulos, y no debería usarse en el código moderno. En consecuencia, los separadores numéricos no son compatibles con estos literales. Utilice literales con el estilo `0o17` en su lugar.

## Soporte para separadores numéricos

<feature-support chrome="75 /blog/v8-release-75#numeric-separators"
                 firefox="70 https://hacks.mozilla.org/2019/10/firefox-70-a-bountiful-release-for-all/"
                 safari="13"
                 nodejs="12.5.0 https://nodejs.org/en/blog/release/v12.5.0/"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-numeric-separator"></feature-support>
