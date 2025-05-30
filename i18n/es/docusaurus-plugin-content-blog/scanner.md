---
title: "Análisis extremadamente rápido, parte 1: optimizando el escáner"
author: "Toon Verwaest ([@tverwaes](https://twitter.com/tverwaes)), optimizador escandaloso"
avatars: 
  - "toon-verwaest"
date: "2019-03-25 13:33:37"
tags: 
  - internals
  - análisis
tweet: "1110205101652787200"
description: "La piedra angular del rendimiento del analizador es un escáner rápido. Este artículo explica cómo el escáner de JavaScript de V8 se volvió hasta 2.1× más rápido recientemente."
---
Para ejecutar un programa de JavaScript, el texto fuente necesita ser procesado para que V8 pueda entenderlo. V8 comienza analizando el texto fuente en un árbol de sintaxis abstracta (AST), un conjunto de objetos que representan la estructura del programa. Ese AST se compila en bytecode mediante Ignition. El rendimiento de estas fases de análisis + compilación es importante: V8 no puede ejecutar código antes de que la compilación esté terminada. En esta serie de publicaciones en el blog, nos enfocamos en el análisis y el trabajo realizado en V8 para entregar un analizador extremadamente rápido.

<!--truncate-->
De hecho, comenzamos la serie una etapa antes del analizador. El analizador de V8 consume 'tokens' proporcionados por el 'escáner'. Los tokens son bloques de uno o más caracteres que tienen un único significado semántico: una cadena de texto, un identificador, un operador como `++`. El escáner construye estos tokens combinando caracteres consecutivos en un flujo de caracteres subyacente.

El escáner consume un flujo de caracteres Unicode. Estos caracteres Unicode siempre se decodifican de un flujo de unidades de código UTF-16. Solo se admite una codificación para evitar ramificaciones o especializaciones del escáner y el analizador para varias codificaciones, y elegimos UTF-16 ya que esa es la codificación de las cadenas de JavaScript, y las posiciones de origen necesitan proporcionarse en relación con esa codificación. [`UTF16CharacterStream`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=46) proporciona una vista UTF-16 (posiblemente almacenada en búfer) sobre la codificación subyacente Latin1, UTF-8 o UTF-16 que V8 recibe de Chrome, que Chrome a su vez recibe de la red. Además de admitir más de una codificación, la separación entre el escáner y el flujo de caracteres permite que V8 analice de forma transparente como si toda la fuente estuviera disponible, aunque solo hayamos recibido una parte de los datos de la red hasta ahora.

![](/_img/scanner/overview.svg)

La interfaz entre el escáner y el flujo de caracteres es un método llamado [`Utf16CharacterStream::Advance()`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=54) que devuelve la siguiente unidad de código UTF-16 o `-1` para indicar el final de la entrada. UTF-16 no puede codificar cada carácter Unicode en una única unidad de código. Los caracteres fuera del [Plano Multilingüe Básico](https://es.wikipedia.org/wiki/Plano_(Unicode)#Plano_Multiling%C3%BCe_B%C3%A1sico) se codifican como dos unidades de código, también llamadas pares sustitutos. Sin embargo, el escáner opera sobre caracteres Unicode en lugar de unidades de código UTF-16, por lo que envuelve esta interfaz de flujo de bajo nivel en un método [`Scanner::Advance()`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?sq=package:chromium&g=0&rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=569) que decodifica las unidades de código UTF-16 en caracteres Unicode completos. El carácter decodificado actualmente se almacena en un búfer y es recogido por los métodos de escaneo, como [`Scanner::ScanString()`](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=775).

El escáner [elige](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=422) un método de escáner específico o token basado en un máximo de anticipación de 4 caracteres, la secuencia ambigua más larga de caracteres en JavaScript[^1]. Una vez que se elige un método como `ScanString`, éste consume el resto de los caracteres para ese token, almacenando en un búfer el primer carácter que no forma parte del token para el próximo token escaneado. En el caso de `ScanString` también copia los caracteres escaneados en un búfer codificado como Latin1 o UTF-16, mientras decodifica las secuencias de escape.

[^1]: `<!--` es el inicio de un comentario HTML, mientras que `<!-` se escanea como “menor que”, “no”, “menos”.

## Espacios en blanco

Los tokens pueden separarse por varios tipos de espacios en blanco, como nuevas líneas, espacios, tabulaciones, comentarios de una sola línea, comentarios de varias líneas, etc. Un tipo de espacio en blanco puede ser seguido por otros tipos de espacio en blanco. El espacio en blanco agrega significado si provoca un salto de línea entre dos tokens, lo que posiblemente resulta en [inserción automática de punto y coma](https://tc39.es/ecma262/#sec-automatic-semicolon-insertion). Entonces, antes de escanear el siguiente token, se omite todo el espacio en blanco, rastreando si ocurrió una nueva línea. La mayoría del código JavaScript en producción está minimizado, por lo que el uso de espacios en blanco de varios caracteres no es muy común. Por esa razón, V8 escanea uniformemente cada tipo de espacio en blanco de manera independiente como si fueran tokens regulares. Por ejemplo, si el primer carácter del token es `/` seguido por otro `/`, V8 lo escanea como un comentario de una sola línea que devuelve `Token::WHITESPACE`. Ese bucle simplemente continúa escaneando tokens [hasta que](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=671) encontramos un token que no sea `Token::WHITESPACE`. Esto significa que si el siguiente token no está precedido por un espacio en blanco, comenzamos a escanear inmediatamente el token relevante sin necesidad de verificar explícitamente el espacio en blanco.

Sin embargo, el propio bucle agrega una sobrecarga a cada token escaneado: requiere una rama para verificar el token que acabamos de escanear. Sería mejor continuar el bucle solo si el token que acabamos de escanear podría ser un `Token::WHITESPACE`. De lo contrario, deberíamos simplemente salir del bucle. Hacemos esto moviendo el bucle a un [método auxiliar](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner-inl.h?rcl=d62ec0d84f2ec8bc0d56ed7b8ed28eaee53ca94e&l=178) separado del cual regresamos inmediatamente cuando estamos seguros de que el token no es `Token::WHITESPACE`. Aunque este tipo de cambios pueda parecer muy pequeño, eliminan la sobrecarga para cada token escaneado. Esto especialmente marca la diferencia para tokens realmente cortos como la puntuación:

![](/_img/scanner/punctuation.svg)

## Escaneo de identificadores

El token más complicado, pero también el más común, es el token [identificador](https://tc39.es/ecma262/#prod-Identifier), que se usa para nombres de variables (entre otras cosas) en JavaScript. Los identificadores comienzan con un carácter Unicode con la propiedad [`ID_Start`](https://cs.chromium.org/chromium/src/v8/src/unicode.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=807), seguido opcionalmente por una secuencia de caracteres con la propiedad [`ID_Continue`](https://cs.chromium.org/chromium/src/v8/src/unicode.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=947). Determinar si un carácter Unicode tiene la propiedad `ID_Start` o `ID_Continue` es bastante costoso. Insertando una caché que mapea caracteres a sus propiedades podemos acelerar esto un poco.

Sin embargo, la mayor parte del código JavaScript se escribe utilizando caracteres ASCII. De los caracteres en el rango ASCII, solo `a-z`, `A-Z`, `$` y `_` son caracteres iniciales de identificadores. `ID_Continue` incluye además `0-9`. Aceleramos el escaneo de identificadores construyendo una tabla con banderas para cada uno de los 128 caracteres ASCII indicando si el carácter es un `ID_Start`, un carácter `ID_Continue`, etc. Mientras los caracteres que estamos observando estén dentro del rango ASCII, buscamos las respectivas banderas en esta tabla y verificamos una propiedad con una sola rama. Los caracteres son parte del identificador hasta que vemos el primer carácter que no tiene la propiedad `ID_Continue`.

Todas las mejoras mencionadas en este post se suman a la siguiente diferencia en el rendimiento del escaneo de identificadores:

![](/_img/scanner/identifiers-1.svg)

Puede parecer contradictorio que los identificadores más largos se escaneen más rápido. Esto podría hacerte pensar que es beneficioso para el rendimiento aumentar la longitud del identificador. Simplemente, escanear identificadores más largos es más rápido en términos de MB/s porque permanecemos más tiempo en un bucle muy ajustado sin regresar al analizador. Sin embargo, desde el punto de vista del rendimiento de tu aplicación, lo que importa es qué tan rápido podemos escanear tokens completos. El siguiente gráfico muestra aproximadamente el número de tokens que escaneamos por segundo en relación a la longitud del token:

![](/_img/scanner/identifiers-2.svg)

Aquí se hace evidente que usar identificadores más cortos es beneficioso para el rendimiento del análisis de tu aplicación: somos capaces de escanear más tokens por segundo. Esto significa que los sitios que parecen analizarse más rápido en MB/s simplemente tienen menor densidad de información, y en realidad producen menos tokens por segundo.

## Internalización de identificadores minimizados

Todos los literales de cadenas e identificadores se deduplican en el límite entre el escáner y el analizador. Si el analizador solicita el valor de una cadena o identificador, recibe un objeto de cadena único para cada posible valor literal. Esto típicamente requiere una búsqueda en una tabla hash. Dado que el código JavaScript frecuentemente está minimizado, V8 utiliza una tabla de búsqueda simple para cadenas de un solo carácter ASCII.

## Palabras clave

Las palabras clave son un subconjunto especial de identificadores definidos por el lenguaje, como `if`, `else` y `function`. El escáner de V8 devuelve tokens diferentes para palabras clave que para identificadores. Después de escanear un identificador, necesitamos reconocer si el identificador es una palabra clave. Dado que todas las palabras clave en JavaScript solo contienen caracteres en minúscula `a-z`, también mantenemos banderas indicando si los caracteres ASCII son posibles caracteres iniciales y de continuación de palabras clave.

Si un identificador puede ser una palabra clave según las banderas, podríamos encontrar un subconjunto de candidatos a palabras clave cambiando sobre el primer carácter del identificador. Hay más caracteres iniciales distintos que longitudes de palabras clave, por lo que esto reduce el número de ramas subsecuentes. Para cada carácter, ramificamos según las posibles longitudes de palabras clave y solo comparamos el identificador con la palabra clave si la longitud también coincide.

Es mejor utilizar una técnica llamada [hashing perfecto](https://en.wikipedia.org/wiki/Perfect_hash_function). Dado que la lista de palabras clave es estática, podemos calcular una función hash perfecta que para cada identificador nos proporcione como máximo una palabra clave candidata. V8 utiliza [gperf](https://www.gnu.org/software/gperf/) para calcular esta función. El [resultado](https://cs.chromium.org/chromium/src/v8/src/parsing/keywords-gen.h) calcula un hash a partir de la longitud y los dos primeros caracteres del identificador para encontrar la única palabra clave candidata. Solo comparamos el identificador con la palabra clave si la longitud de esa palabra coincide con la longitud del identificador de entrada. Esto acelera especialmente el caso donde un identificador no es una palabra clave, ya que necesitamos menos ramas para determinarlo.

![](/_img/scanner/keywords.svg)

## Pares sustitutos

Como se mencionó anteriormente, nuestro escáner opera en un flujo de caracteres codificados en UTF-16, pero consume caracteres Unicode. Los caracteres en planos suplementarios solo tienen un significado especial para los tokens de identificador. Por ejemplo, si dichos caracteres aparecen en una cadena, no terminan la cadena. JS admite sustitutos solitarios y simplemente los copia de la fuente. Por esa razón, es mejor evitar combinar pares sustitutos hasta que sea absolutamente necesario y dejar que el escáner opere directamente en unidades de código UTF-16 en lugar de caracteres Unicode. Cuando estamos escaneando una cadena, no necesitamos buscar pares sustitutos, combinarlos, y luego separarlos nuevamente cuando almacenamos los caracteres para construir un literal. Solo hay dos lugares restantes donde el escáner necesita manejar pares sustitutos. Al inicio del escaneo de tokens, solo cuando no reconocemos un carácter como otra cosa necesitamos [combinar](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner-inl.h?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=515) pares sustitutos para verificar si el resultado es un inicio de identificador. De manera similar, necesitamos [combinar](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=1003) pares sustitutos en el camino lento del escaneo de identificadores al manejar caracteres no ASCII.

## `AdvanceUntil`

La interfaz entre el escáner y el `UTF16CharacterStream` hace que el límite sea bastante dependiente del estado. El flujo realiza un seguimiento de su posición en el búfer, el cual incrementa después de cada unidad de código consumida. El escáner almacena en búfer una unidad de código recibida antes de volver al método de escaneo que solicitó el carácter. Ese método lee el carácter almacenado en búfer y continúa basándose en su valor. Esto proporciona un buen nivel de capas, pero es bastante lento. El otoño pasado, nuestro interno Florian Sattler propuso una interfaz mejorada que mantiene los beneficios de la estructura por capas al tiempo que proporciona un acceso mucho más rápido a las unidades de código en el flujo. Una función templada [`AdvanceUntil`](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner.h?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=72), especializada para un ayudante de escaneo específico, llama al ayudante para cada carácter en el flujo hasta que el ayudante devuelve falso. Esto esencialmente proporciona al escáner acceso directo a los datos subyacentes sin romper las abstracciones. De hecho, simplifica las funciones auxiliares de escaneo ya que no necesitan manejar `EndOfInput`.

![](/_img/scanner/advanceuntil.svg)

`AdvanceUntil` es especialmente útil para acelerar funciones de escaneo que pueden necesitar consumir un gran número de caracteres. Lo utilizamos para acelerar identificadores ya presentados anteriormente, pero también cadenas[^2] y comentarios.

[^2]: Las cadenas e identificadores que no pueden ser codificados en Latin1 son actualmente más costosos ya que primero intentamos almacenarlos en búfer como Latin1, convirtiéndolos a UTF-16 una vez que encontramos un carácter que no pueda ser codificado en Latin1.

## Conclusión

El rendimiento del escaneo es la piedra angular del rendimiento del análisis. Hemos ajustado nuestro escáner para que sea lo más eficiente posible. Esto resultó en mejoras generales, mejorando el rendimiento del escaneo de un único token en aproximadamente 1.4×, el escaneo de cadenas en 1.3×, el escaneo de comentarios multilínea en 2.1× y el escaneo de identificadores en 1.2–1.5× dependiendo de la longitud del identificador.

Sin embargo, nuestro escáner solo puede hacer tanto. Como desarrollador, puedes mejorar aún más el rendimiento del análisis aumentando la densidad de información de tus programas. La forma más sencilla de hacerlo es minificando tu código fuente, eliminando espacios en blanco innecesarios y evitando identificadores no ASCII siempre que sea posible. Idealmente, estos pasos se automatizan como parte de un proceso de compilación, en cuyo caso no tienes que preocuparte por ello al escribir código.
