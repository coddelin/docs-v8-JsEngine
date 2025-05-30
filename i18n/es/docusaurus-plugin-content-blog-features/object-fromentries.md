---
title: "`Object.fromEntries`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), susurrador de JavaScript"
avatars: 
  - "mathias-bynens"
date: 2019-06-18
tags: 
  - ECMAScript
  - ES2019
  - io19
description: "Object.fromEntries es una adición útil a la biblioteca incorporada de JavaScript que complementa Object.entries."
tweet: "1140993821897121796"
---
`Object.fromEntries` es una adición útil a la biblioteca incorporada de JavaScript. Antes de explicar lo que hace, es útil entender la API `Object.entries` ya existente.

## `Object.entries`

La API `Object.entries` ha existido durante un tiempo.

<feature-support chrome="54"
                 firefox="47"
                 safari="10.1"
                 nodejs="7"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>

Para cada par clave-valor en un objeto, `Object.entries` te da un array donde el primer elemento es la clave y el segundo elemento es el valor.

`Object.entries` es especialmente útil en combinación con `for`-`of`, ya que permite iterar elegantemente sobre todos los pares clave-valor en un objeto:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

for (const [key, value] of entries) {
  console.log(`El valor de ${key} es ${value}.`);
}
// Registros:
// El valor de x es 42.
// El valor de y es 50.
```

Desafortunadamente, no hay una forma fácil de volver del resultado de entries a un objeto equivalente... ¡hasta ahora!

## `Object.fromEntries`

La nueva API `Object.fromEntries` realiza la inversa de `Object.entries`. Esto hace que sea fácil reconstruir un objeto basado en sus entradas:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

Un caso de uso común es transformar objetos. Ahora puedes hacerlo iterando sobre sus entradas y luego usando métodos de arrays con los que ya puedas estar familiarizado:

```js
const object = { x: 42, y: 50, abc: 9001 };
const result = Object.fromEntries(
  Object.entries(object)
    .filter(([ key, value ]) => key.length === 1)
    .map(([ key, value ]) => [ key, value * 2 ])
);
// → { x: 84, y: 100 }
```

En este ejemplo, usamos `filter` para obtener solo las claves de longitud `1`, es decir, solo las claves `x` y `y`, pero no la clave `abc`. Luego usamos `map` sobre las entradas restantes y devolvemos un par clave-valor actualizado por cada una. En este ejemplo, duplicamos cada valor multiplicándolo por `2`. El resultado final es un nuevo objeto con solo las propiedades `x` y `y`, y los nuevos valores.

<!--truncate-->
## Objetos vs. mapas

JavaScript también admite `Map`s, que a menudo son una estructura de datos más adecuada que los objetos regulares. Así que en código sobre el que tienes control total, podrías estar usando mapas en lugar de objetos. Sin embargo, como desarrollador, no siempre tienes la opción de elegir la representación. A veces los datos con los que trabajas provienen de una API externa o de alguna función de biblioteca que te da un objeto en lugar de un mapa.

`Object.entries` hizo fácil convertir objetos en mapas:

```js
const object = { language: 'JavaScript', coolness: 9001 };

// Convierte el objeto en un mapa:
const map = new Map(Object.entries(object));
```

La inversa es igualmente útil: incluso si tu código está usando mapas, puede que necesites serializar tus datos en algún momento, por ejemplo, para convertirlos a JSON y enviar una solicitud API. O tal vez necesites pasar los datos a otra biblioteca que espera un objeto en lugar de un mapa. En estos casos, necesitas crear un objeto basado en los datos del mapa. `Object.fromEntries` hace esto trivial:

```js
// Convierte el mapa nuevamente en un objeto:
const objectCopy = Object.fromEntries(map);
// → { language: 'JavaScript', coolness: 9001 }
```

Con `Object.entries` y `Object.fromEntries` en el lenguaje, ahora puedes convertir fácilmente entre mapas y objetos.

### Advertencia: cuidado con la pérdida de datos

Al convertir mapas en objetos simples como en el ejemplo anterior, hay una suposición implícita de que cada clave se stringify de manera única. Si esta suposición no se cumple, se produce pérdida de datos:

```js
const map = new Map([
  [{}, 'a'],
  [{}, 'b'],
]);
Object.fromEntries(map);
// → { '[object Object]': 'b' }
// Nota: el valor 'a' no se encuentra en ninguna parte, ya que ambas claves
// se convierten a la misma cadena: '[object Object]'.
```

Antes de usar `Object.fromEntries` o cualquier otra técnica para convertir un mapa en un objeto, asegúrate de que las claves del mapa produzcan resultados únicos con `toString`.

## Soporte para `Object.fromEntries`

<feature-support chrome="73 /blog/v8-release-73#object.fromentries"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>
