---
title: 'Subsume JSON también conocido como JSON ⊂ ECMAScript'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-08-14
tags:
  - ES2019
description: 'JSON ahora es un subconjunto sintáctico de ECMAScript.'
tweet: '1161649929904885762'
---
Con [la propuesta _JSON ⊂ ECMAScript_](https://github.com/tc39/proposal-json-superset), JSON se convierte en un subconjunto sintáctico de ECMAScript. Si te sorprende que esto no fuera ya el caso, no estás solo.

## El comportamiento anterior en ES2018

En ES2018, los literales de cadenas de ECMAScript no podían contener caracteres U+2028 LINE SEPARATOR y U+2029 PARAGRAPH SEPARATOR sin escapar, porque se consideran terminadores de línea incluso en ese contexto:

```js
// Una cadena que contiene un carácter U+2028 sin procesar.
const LS = ' ';
// → ES2018: SyntaxError

// Una cadena que contiene un carácter U+2029 sin procesar, producido por `eval`:
const PS = eval('"\u2029"');
// → ES2018: SyntaxError
```

Esto es problemático porque las cadenas JSON _pueden_ contener estos caracteres. Como resultado, los desarrolladores tenían que implementar lógica de post-procesamiento especializada al incrustar JSON válido en programas ECMAScript para manejar estos caracteres. Sin dicha lógica, el código tendría errores sutiles o incluso [problemas de seguridad](#security).

<!--truncate-->
## El nuevo comportamiento

En ES2019, los literales de cadenas ahora pueden contener caracteres U+2028 y U+2029 sin procesar, eliminando la confusa discrepancia entre ECMAScript y JSON.

```js
// Una cadena que contiene un carácter U+2028 sin procesar.
const LS = ' ';
// → ES2018: SyntaxError
// → ES2019: sin excepción

// Una cadena que contiene un carácter U+2029 sin procesar, producido por `eval`:
const PS = eval('"\u2029"');
// → ES2018: SyntaxError
// → ES2019: sin excepción
```

Esta pequeña mejora simplifica enormemente el modelo mental para los desarrolladores (¡un caso extremo menos que recordar!) y reduce la necesidad de lógica de post-procesamiento especializada al incrustar JSON válido en programas ECMAScript.

## Incrustar JSON en programas JavaScript

Como resultado de esta propuesta, `JSON.stringify` ahora se puede usar para generar literales de cadenas, literales de objetos y literales de matrices válidos en ECMAScript. Y debido a la propuesta separada [_JSON.stringify_ bien formado](/features/well-formed-json-stringify), estos literales se pueden representar de manera segura en UTF-8 y en otros codificaciones (lo cual es útil si deseas escribirlos en un archivo en disco). Esto es muy útil para casos de uso de metaprogramación, como crear dinámicamente código fuente de JavaScript y escribirlo en disco.

Aquí tienes un ejemplo de cómo crear un programa JavaScript válido incrustando un objeto de datos dado, aprovechando que ahora la gramática JSON es un subconjunto de ECMAScript:

```js
// Un objeto JavaScript (o matriz, o cadena) que representa algunos datos.
const data = {
  LineTerminators: '\n\r  ',
  // Nota: la cadena contiene 4 caracteres: '\n\r\u2028\u2029'.
};

// Convierte los datos en su forma JSON-stringificada. Gracias a JSON ⊂
// ECMAScript, la salida de `JSON.stringify` está garantizada como un
// literal sintácticamente válido de ECMAScript:
const jsObjectLiteral = JSON.stringify(data);

// Crea un programa ECMAScript válido que incrusta los datos como un literal
// de objeto.
const program = `const data = ${ jsObjectLiteral };`;
// → 'const data = {"LineTerminators":"…"};'
// (Se necesita un escape adicional si el destino es un elemento <script> inline.)

// Escribe un archivo que contenga el programa ECMAScript en el disco.
saveToDisk(filePath, program);
```

El script anterior produce el siguiente código, que evalúa a un objeto equivalente:

```js
const data = {"LineTerminators":"\n\r  "};
```

## Incrustar JSON en programas JavaScript con `JSON.parse`

Como se explicó en [_el costo del JSON_](/blog/cost-of-javascript-2019#json), en lugar de insertar los datos como un literal de objeto JavaScript, de la siguiente manera:

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…los datos se pueden representar en forma JSON-stringificada y luego analizar con JSON en tiempo de ejecución, para mejorar el rendimiento en el caso de objetos grandes (de más de 10 kB):

```js
const data = JSON.parse('{"foo":42,"bar":1337}'); // 🚀
```

Aquí tienes un ejemplo de implementación:

```js
// Un objeto JavaScript (o matriz, o cadena) que representa algunos datos.
const data = {
  LineTerminators: '\n\r  ',
  // Nota: la cadena contiene 4 caracteres: '\n\r\u2028\u2029'.
};

// Convierte los datos en su forma JSON-stringificada.
const json = JSON.stringify(data);

// Ahora, queremos insertar el JSON en un cuerpo de script como literal
// de cadena JavaScript según https://v8.dev/blog/cost-of-javascript-2019#json,
// escapando caracteres especiales como `"` en los datos.
// Gracias a JSON ⊂ ECMAScript, la salida de `JSON.stringify` está
// garantizada como un literal sintácticamente válido de ECMAScript:
const jsStringLiteral = JSON.stringify(json);
// Crea un programa ECMAScript válido que incrusta el literal de cadena JavaScript
// que representa los datos JSON dentro de una llamada a `JSON.parse`.
const program = `const data = JSON.parse(${ jsStringLiteral });`;
// → 'const data = JSON.parse("…");'
// (Se necesita un escape adicional si el objetivo es un <script> inline.)

// Escribe un archivo que contiene el programa ECMAScript en el disco.
saveToDisk(filePath, program);
```

El script anterior produce el siguiente código, que se evalúa como un objeto equivalente:

```js
const data = JSON.parse("{\"LineTerminators\":\"\\n\\r  \"}");
```

[El benchmark de Google que compara `JSON.parse` con literales de objeto en JavaScript](https://github.com/GoogleChromeLabs/json-parse-benchmark) utiliza esta técnica en su paso de compilación. La funcionalidad “copiar como JS” de Chrome DevTools ha sido [simplificada significativamente](https://chromium-review.googlesource.com/c/chromium/src/+/1464719/9/third_party/blink/renderer/devtools/front_end/elements/DOMPath.js) adoptando una técnica similar.

## Una nota sobre seguridad

JSON ⊂ ECMAScript reduce la discrepancia entre JSON y ECMAScript en el caso de los literales de cadena específicamente. Dado que los literales de cadena pueden aparecer dentro de otras estructuras de datos compatibles con JSON, como objetos y arreglos, también aborda esos casos, como muestran los ejemplos de código anteriores.

Sin embargo, los caracteres U+2028 y U+2029 siguen siendo tratados como caracteres de terminador de línea en otras partes de la gramática ECMAScript. Esto significa que todavía hay casos en los que no es seguro inyectar JSON en programas JavaScript. Considera este ejemplo, en el que un servidor inyecta algún contenido proporcionado por el usuario en una respuesta HTML después de procesarlo con `JSON.stringify()`:

```ejs
<script>
  // Información de depuración:
  // User-Agent: <%= JSON.stringify(ua) %>
</script>
```

Ten en cuenta que el resultado de `JSON.stringify` se inyecta en un comentario de una sola línea dentro del script.

Cuando se usa como en el ejemplo anterior, `JSON.stringify()` garantiza devolver una sola línea. El problema es que lo que constituye una “sola línea” [difiere entre JSON y ECMAScript](https://speakerdeck.com/mathiasbynens/hacking-with-unicode?slide=136). Si `ua` contiene un carácter U+2028 o U+2029 no escapado, rompemos el comentario de una sola línea y ejecutamos el resto de `ua` como código fuente de JavaScript:

```html
<script>
  // Información de depuración:
  // User-Agent: "Cadena proporcionada por el usuario<U+2028>  alert('XSS');//"
</script>
<!-- …es equivalente a: -->
<script>
  // Información de depuración:
  // User-Agent: "Cadena proporcionada por el usuario
  alert('XSS');//"
</script>
```

:::nota
**Nota:** En el ejemplo anterior, el carácter crudo no escapado U+2028 se representa como `<U+2028>` para hacerlo más fácil de seguir.
:::

JSON ⊂ ECMAScript no ayuda aquí, ya que solo afecta a los literales de cadena — y en este caso, la salida de `JSON.stringify` se inyecta en una posición donde no produce un literal de cadena de JavaScript directamente.

¡A menos que se introduzca un post-procesamiento especial para esos dos caracteres, el fragmento de código anterior presenta una vulnerabilidad de scripting entre sitios (XSS)!

:::nota
**Nota:** Es crucial procesar posteriormente la entrada controlada por el usuario para escapar cualquier secuencia de caracteres especiales, dependiendo del contexto. En este caso particular, estamos inyectando en una etiqueta `<script>`, por lo que debemos (también) [escapar `</script`, `<script`, y `<!-​-`](https://mathiasbynens.be/notes/etago#recommendations).
:::

## Soporte para JSON ⊂ ECMAScript

<feature-support chrome="66 /blog/v8-release-66#json-ecmascript"
                 firefox="yes"
                 safari="yes"
                 nodejs="10"
                 babel="yes https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-json-strings"></feature-support>
