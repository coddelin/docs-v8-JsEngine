---
title: &apos;RegExp `v` flag con notación de conjuntos y propiedades de cadenas&apos;
author: &apos;Mark Davis ([@mark_e_davis](https://twitter.com/mark_e_davis)), Markus Scherer y Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mark-davis&apos;
  - &apos;markus-scherer&apos;
  - &apos;mathias-bynens&apos;
date: 2022-06-27
tags:
  - ECMAScript
description: &apos;El nuevo flag `v` de RegExp activa el modo `unicodeSets`, habilitando soporte para clases de caracteres extendidas, incluyendo propiedades Unicode de cadenas, notación de conjuntos y una mejor coincidencia sin distinción de mayúsculas y minúsculas.&apos;
tweet: &apos;1541419838513594368&apos;
---
JavaScript ha soportado expresiones regulares desde ECMAScript 3 (1999). Dieciséis años después, ES2015 introdujo [el modo Unicode (el flag `u`)](https://mathiasbynens.be/notes/es6-unicode-regex), [el modo sticky (el flag `y`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky#description), y el [getter `RegExp.prototype.flags`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/flags). Tres años más tarde, ES2018 introdujo [el modo `dotAll` (el flag `s`)](https://mathiasbynens.be/notes/es-regexp-proposals#dotAll), [las aseveraciones lookbehind](https://mathiasbynens.be/notes/es-regexp-proposals#lookbehinds), [los grupos de captura con nombre](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups), y [los escapes de propiedades de carácter Unicode](https://mathiasbynens.be/notes/es-unicode-property-escapes). Y en ES2020, [`String.prototype.matchAll`](https://v8.dev/features/string-matchall) facilitó trabajar con expresiones regulares. Las expresiones regulares en JavaScript han recorrido un largo camino y siguen mejorando.

<!--truncate-->
El último ejemplo de esto es [el nuevo modo `unicodeSets`, habilitado usando el flag `v`](https://github.com/tc39/proposal-regexp-v-flag). Este nuevo modo habilita soporte para _clases de caracteres extendidas_, incluyendo las siguientes características:

- [Propiedades Unicode de cadenas](/features/regexp-v-flag#unicode-properties-of-strings)
- [Notación de conjuntos + sintaxis de cadenas literales](/features/regexp-v-flag#set-notation)
- [Mejor coincidencia sin distinción de mayúsculas y minúsculas](/features/regexp-v-flag#ignoreCase)

Este artículo profundiza en cada una de estas. Pero primero lo primero: aquí está cómo usar el nuevo flag:

```js
const re = /…/v;
```

El flag `v` se puede combinar con los flags existentes de expresiones regulares, con una excepción notable. El flag `v` habilita todas las buenas características del flag `u`, pero con funciones y mejoras adicionales, algunas de las cuales son incompatibles hacia atrás con el flag `u`. Es importante destacar que `v` es un modo completamente separado de `u` y no uno complementario. Por esta razón, los flags `v` y `u` no se pueden combinar; intentar usar ambos flags en la misma expresión regular resulta en un error. Las únicas opciones válidas son: usar `u`, usar `v` o no usar ni `u` ni `v`. Pero dado que `v` es la opción más completa en términos de características, esa elección es fácil...

¡Vamos a explorar la nueva funcionalidad!

## Propiedades Unicode de cadenas

El estándar Unicode asigna varias propiedades y valores de propiedades a cada símbolo. Por ejemplo, para obtener el conjunto de símbolos que se usan en la escritura griega, busca en la base de datos Unicode los símbolos cuyo valor de propiedad `Script_Extensions` incluye `Greek`.

Los escapes de propiedades de carácter Unicode introducidos en ES2018 permiten acceder a estas propiedades de carácter Unicode de forma nativa en las expresiones regulares de ECMAScript. Por ejemplo, el patrón `\p{Script_Extensions=Greek}` coincide con cada símbolo que se usa en la escritura griega:

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test(&apos;π&apos;);
// → true
```

Por definición, las propiedades de carácter Unicode se expanden a un conjunto de puntos de código, y por lo tanto se pueden transpilar como una clase de caracteres que contiene los puntos de código que coinciden individualmente. Por ejemplo, `\p{ASCII_Hex_Digit}` es equivalente a `[0-9A-Fa-f]`: solo coincide con un único carácter Unicode/punto de código a la vez. En algunas situaciones, esto es insuficiente:

```js
// Unicode define una propiedad de carácter llamada “Emoji”.
const re = /^\p{Emoji}$/u;

// Coincidir un emoji que consiste en solo 1 punto de código:
re.test(&apos;⚽&apos;); // &apos;\u26BD&apos;
// → true ✅

// Coincidir un emoji que consiste en múltiples puntos de código:
re.test(&apos;👨🏾‍⚕️&apos;); // &apos;\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F&apos;
// → false ❌
```

En el ejemplo anterior, la expresión regular no coincide con el emoji 👨🏾‍⚕️ porque está formado por múltiples puntos de código, y `Emoji` es una propiedad Unicode de _carácter_.

Afortunadamente, el Estándar Unicode también define varias [propiedades de cadenas](https://www.unicode.org/reports/tr18/#domain_of_properties). Estas propiedades se expanden a un conjunto de cadenas, cada una de las cuales contiene uno o más puntos de código. En las expresiones regulares, las propiedades de cadenas se traducen en un conjunto de alternativas. Para ilustrarlo, imaginemos una propiedad Unicode que se aplica a las cadenas `&apos;a&apos;`, `&apos;b&apos;`, `&apos;c&apos;`, `&apos;W&apos;`, `&apos;xy&apos;` y `&apos;xyz&apos;`. Esta propiedad se traduce en cualquiera de los siguientes patrones de expresiones regulares (utilizando alternancia): `xyz|xy|a|b|c|W` o `xyz|xy|[a-cW]`. (Primero las cadenas más largas, para que un prefijo como `&apos;xy&apos;` no oculte una cadena más larga como `&apos;xyz&apos;`). A diferencia de los escapes existentes de propiedades Unicode, este patrón puede coincidir con cadenas de varios caracteres. Aquí hay un ejemplo de una propiedad de cadenas en uso:

```js
const re = /^\p{RGI_Emoji}$/v;

// Coincidir con un emoji que consiste en solo 1 punto de código:
re.test(&apos;⚽&apos;); // &apos;\u26BD&apos;
// → verdadero ✅

// Coincidir con un emoji que consiste en múltiples puntos de código:
re.test(&apos;👨🏾‍⚕️&apos;); // &apos;\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F&apos;
// → verdadero ✅
```

Este fragmento de código hace referencia a la propiedad de cadenas `RGI_Emoji`, que Unicode define como "el subconjunto de todos los emojis válidos (caracteres y secuencias) recomendados para intercambio general". Con esto, ahora podemos coincidir con emojis sin importar cuántos puntos de código consistan internamente.

La bandera `v` permite la compatibilidad con las siguientes propiedades Unicode de cadenas desde el principio:

- `Basic_Emoji`
- `Emoji_Keycap_Sequence`
- `RGI_Emoji_Modifier_Sequence`
- `RGI_Emoji_Flag_Sequence`
- `RGI_Emoji_Tag_Sequence`
- `RGI_Emoji_ZWJ_Sequence`
- `RGI_Emoji`

Esta lista de propiedades admitidas podría crecer en el futuro, ya que el Estándar Unicode define propiedades adicionales de cadenas. Aunque todas las propiedades actuales de cadenas están relacionadas con emojis, las propiedades futuras de cadenas podrían servir casos de uso completamente diferentes.

:::note
**Nota:** Aunque las propiedades de cadenas actualmente están restringidas con la nueva bandera `v`, [planeamos eventualmente hacerlas disponibles también en el modo `u`](https://github.com/tc39/proposal-regexp-v-flag/issues/49).
:::

## Notación de conjuntos + Sintaxis literal de cadena

Al trabajar con escapes `\p{…}` (ya sean propiedades de caracteres o las nuevas propiedades de cadenas), puede ser útil realizar diferencia/resta o intersección. Con la bandera `v`, las clases de caracteres ahora pueden anidarse, y esas operaciones de conjunto ahora pueden realizarse dentro de ellas en lugar de con afirmaciones de anticipación o retroceso adyacentes o con clases de caracteres extensas que expresan los rangos calculados.

### Diferencia/resta con `--`

La sintaxis `A--B` puede usarse para coincidir con cadenas _en `A` pero no en `B`_, también conocida como diferencia/resta.

Por ejemplo, ¿qué pasa si queremos coincidir con todos los símbolos griegos excepto por la letra `π`? Con la notación de conjuntos, resolver esto es trivial:

```js
/[\p{Script_Extensions=Greek}--π]/v.test(&apos;π&apos;); // → falso
```

Al usar `--` para diferencia/resta, el motor de expresiones regulares hace el trabajo duro por ti mientras mantiene tu código legible y mantenible.

¿Qué pasa si en lugar de un solo carácter, queremos restar el conjunto de caracteres `α`, `β` y `γ`? No hay problema: podemos usar una clase de caracteres anidada y restar su contenido:

```js
/[\p{Script_Extensions=Greek}--[αβγ]]/v.test(&apos;α&apos;); // → falso
/[\p{Script_Extensions=Greek}--[α-γ]]/v.test(&apos;β&apos;); // → falso
```

Otro ejemplo es coincidir con dígitos no ASCII, por ejemplo, para convertirlos en dígitos ASCII más adelante:

```js
/[\p{Decimal_Number}--[0-9]]/v.test(&apos;𑜹&apos;); // → verdadero
/[\p{Decimal_Number}--[0-9]]/v.test(&apos;4&apos;); // → falso
```

La notación de conjuntos también se puede usar con las nuevas propiedades de cadenas:

```js
// Nota: 🏴 consiste en 7 puntos de código.

/^\p{RGI_Emoji_Tag_Sequence}$/v.test(&apos;🏴&apos;); // → verdadero
/^[\p{RGI_Emoji_Tag_Sequence}--\q{🏴}]$/v.test(&apos;🏴&apos;); // → falso
```

Este ejemplo coincide con cualquier secuencia de etiquetas emoji RGI _excepto_ por la bandera de Escocia. Ten en cuenta el uso de `\q{…}`, que es otra nueva pieza de sintaxis para literales de cadenas dentro de clases de caracteres. Por ejemplo, `\q{a|bc|def}` coincide con las cadenas `a`, `bc` y `def`. Sin `\q{…}` no sería posible restar cadenas de varios caracteres literalizadas.

### Intersección con `&&`

La sintaxis `A&&B` coincide con cadenas que están _en ambos `A` y `B`_, también conocida como intersección. Esto te permite hacer cosas como coincidir con letras griegas:

```js
const re = /[\p{Script_Extensions=Greek}&&\p{Letter}]/v;
// U+03C0 LETRA PEQUEÑA GRIEGA PI
re.test(&apos;π&apos;); // → verdadero
// U+1018A SIGNO CERO GRIEGO
re.test(&apos;𐆊&apos;); // → falso
```

Coincidir con todos los espacios en blanco ASCII:

```js
const re = /[\p{White_Space}&&\p{ASCII}]/v;
re.test(&apos;\n&apos;); // → verdadero
re.test(&apos;\u2028&apos;); // → falso
```

O coincidir con todos los números mongoles:

```js
const re = /[\p{Script_Extensions=Mongolian}&&\p{Number}]/v;
// U+1817 DÍGITO MONGOL SIETE
re.test(&apos;᠗&apos;); // → verdadero
// U+1834 LETRA MONGOL CHA
re.test(&apos;ᠴ&apos;); // → falso
```

### Unión

Coincidir con cadenas que están _en A o en B_ ya era posible anteriormente para cadenas de un solo carácter utilizando una clase de caracteres como `[\p{Letter}\p{Number}]`. Con la bandera `v`, esta funcionalidad se vuelve más poderosa, ya que ahora puede combinarse también con propiedades de cadenas o literales de cadenas:

```js
const re = /^[\p{Emoji_Keycap_Sequence}\p{ASCII}\q{🇧🇪|abc}xyz0-9]$/v;

re.test(&apos;4️⃣&apos;); // → verdadero
re.test(&apos;_&apos;); // → verdadero
re.test(&apos;🇧🇪&apos;); // → verdadero
re.test(&apos;abc&apos;); // → verdadero
re.test(&apos;x&apos;); // → verdadero
re.test(&apos;4&apos;); // → verdadero
```

La clase de caracteres en este patrón combina:

- una propiedad de cadenas (`\p{Emoji_Keycap_Sequence}`)
- una propiedad de caracteres (`\p{ASCII}`)
- sintaxis literal de cadenas para las cadenas de múltiples puntos de código `🇧🇪` y `abc`
- sintaxis clásica de clase de caracteres para caracteres solitarios `x`, `y` y `z`
- sintaxis clásica de clase de carácter para el rango de caracteres de `0` a `9`

Otro ejemplo es hacer coincidir todos los emoji de banderas de uso común, independientemente de si están codificados como un código ISO de dos letras (`RGI_Emoji_Flag_Sequence`) o como una secuencia de etiquetas especial (`RGI_Emoji_Tag_Sequence`):

```js
const reFlag = /[\p{RGI_Emoji_Flag_Sequence}\p{RGI_Emoji_Tag_Sequence}]/v;
// Una secuencia de bandera, que consta de 2 puntos de código (bandera de Bélgica):
reFlag.test(&apos;🇧🇪&apos;); // → true
// Una secuencia de etiqueta, que consta de 7 puntos de código (bandera de Inglaterra):
reFlag.test(&apos;🏴&apos;); // → true
// Una secuencia de bandera, que consta de 2 puntos de código (bandera de Suiza):
reFlag.test(&apos;🇨🇭&apos;); // → true
// Una secuencia de etiqueta, que consta de 7 puntos de código (bandera de Gales):
reFlag.test(&apos;🏴&apos;); // → true
```

## Mejora en la coincidencia insensible a mayúsculas y minúsculas

La bandera `u` de ES2015 sufre de un [comportamiento confuso al combinar insensible a mayúsculas y minúsculas](https://github.com/tc39/proposal-regexp-v-flag/issues/30). Considere las siguientes dos expresiones regulares:

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;
```

El primer patrón coincide con todas las letras minúsculas. El segundo patrón usa `\P` en lugar de `\p` para coincidir con todos los caracteres excepto las letras minúsculas, pero luego está envuelto en una clase de caracteres negada (`[^…]`). Ambas expresiones regulares se hacen insensibles a mayúsculas/minúsculas configurando la bandera `i` (`ignoreCase`).

Intuitivamente, podría esperar que ambas expresiones regulares se comporten igual. En la práctica, se comportan muy diferente:

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;

const string = &apos;aAbBcC4#&apos;;

string.replaceAll(re1, &apos;X&apos;);
// → &apos;XXXXXX4#&apos;

string.replaceAll(re2, &apos;X&apos;);
// → &apos;aAbBcC4#&apos;&apos;
```

La nueva bandera `v` tiene un comportamiento menos sorprendente. Con la bandera `v` en lugar de la `u`, ambos patrones se comportan igual:

```js
const re1 = /\p{Lowercase_Letter}/giv;
const re2 = /[^\P{Lowercase_Letter}]/giv;

const string = &apos;aAbBcC4#&apos;;

string.replaceAll(re1, &apos;X&apos;);
// → &apos;XXXXXX4#&apos;

string.replaceAll(re2, &apos;X&apos;);
// → &apos;XXXXXX4#&apos;
```

Más generalmente, la bandera `v` hace que `[^\p{X}]` ≍ `[\P{X}]` ≍ `\P{X}` y `[^\P{X}]` ≍ `[\p{X}]` ≍ `\p{X}`, ya sea que la bandera `i` esté configurada o no.

## Lectura adicional

[El repositorio de la propuesta](https://github.com/tc39/proposal-regexp-v-flag) contiene más detalles y antecedentes sobre estas características y sus decisiones de diseño.

Como parte de nuestro trabajo en estas características de JavaScript, fuimos más allá de “simplemente” proponer cambios en la especificación de ECMAScript. Subimos la definición de “propiedades de cadenas” a [Unicode UTS#18](https://unicode.org/reports/tr18/#Notation_for_Properties_of_Strings) para que otros lenguajes de programación puedan implementar funcionalidad similar de manera unificada. También estamos [proponiendo un cambio al Estándar HTML](https://github.com/whatwg/html/pull/7908) con el objetivo de habilitar estas nuevas características en el atributo `pattern` también.

## Soporte para la bandera `v` en RegExp

V8 v11.0 (Chrome 110) ofrece soporte experimental para esta nueva funcionalidad a través de la bandera `--harmony-regexp-unicode-sets`. V8 v12.0 (Chrome 112) tiene las nuevas características habilitadas por defecto. Babel también admite transpilar la bandera `v` — [¡prueba los ejemplos de este artículo en el REPL de Babel](https://babeljs.io/repl#?code_lz=MYewdgzgLgBATgUxgXhgegNoYIYFoBmAugGTEbC4AWhhaAbgNwBQTaaMAKpQJYQy8xKAVwDmSQCgEMKHACeMIWFABbJQjBRuYEfygBCVmlCRYCJSABW3FOgA6ABwDeAJQDiASQD6AUTOWAvvTMQA&presets=stage-3)! La tabla de soporte a continuación enlaza a problemas de seguimiento a los que puedes suscribirte para obtener actualizaciones.

<feature-support chrome="112 https://bugs.chromium.org/p/v8/issues/detail?id=11935"
                 firefox="116 https://bugzilla.mozilla.org/show_bug.cgi?id=regexp-v-flag"
                 safari="17 https://bugs.webkit.org/show_bug.cgi?id=regexp-v-flag"
                 nodejs="20"
                 babel="7.17.0 https://babeljs.io/blog/2022/02/02/7.17.0"></feature-support>
