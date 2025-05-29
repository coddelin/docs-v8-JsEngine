---
title: "Ayudantes de iterador"
author: "Rezvan Mahdavi Hezaveh"
avatars: 
  - "rezvan-mahdavi-hezaveh"
date: 2024-03-27
tags: 
  - ECMAScript
description: "Interfaces que ayudan con el uso y consumo general de iteradores."
tweet: ""
---

*Los ayudantes de iterador* son una colección de nuevos métodos en el prototipo de Iterator que facilitan el uso general de los iteradores. Dado que estos métodos de ayuda están en el prototipo de iterador, cualquier objeto que tenga `Iterator.prototype` en su cadena de prototipos (por ejemplo, iteradores de arrays) obtendrá los métodos. En las siguientes subsecciones, explicamos los ayudantes de iterador. Todos los ejemplos proporcionados funcionan en una página de archivo de blog que incluye una lista de publicaciones, ilustrando cómo los ayudantes de iterador son útiles para encontrar y manipular publicaciones. ¡Puedes probarlos en [la página del blog de V8](https://v8.dev/blog)!

<!--truncate-->

## .map(mapperFn)

`map` toma una función de mapeo como argumento. Este ayudante devuelve un iterador de valores con la función de mapeo aplicada a los valores del iterador original.

```javascript
// Selecciona la lista de publicaciones de un archivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Obtén la lista de publicaciones, devuelve una lista de sus contenidos (títulos) y regístralas.
for (const post of posts.values().map((x) => x.textContent)) {
  console.log(post);
}
```

## .filter(filtererFn)

`filter` toma una función de filtrado como argumento. Este ayudante devuelve un iterador de valores del iterador original para los cuales la función de filtrado devolvió un valor verdadero.

```javascript
// Selecciona la lista de publicaciones de un archivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Filtra las publicaciones de blog que incluyen `V8` en su contenido (títulos) y regístralas.
for (const post of posts.values().filter((x) => x.textContent.includes('V8'))) {
  console.log(post);
} 
```

## .take(limit)

`take` toma un entero como argumento. Este ayudante devuelve un iterador de valores del iterador original, hasta `limit` valores.

```javascript
// Selecciona la lista de publicaciones de un archivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Selecciona 10 publicaciones recientes y regístralas.
for (const post of posts.values().take(10)) {
  console.log(post);
}
```

## .drop(limit)

`drop` toma un entero como argumento. Este ayudante devuelve un iterador de valores del iterador original, comenzando con el valor después de los `limit` valores.

```javascript
// Selecciona la lista de publicaciones de un archivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Descarta 10 publicaciones recientes y registra el resto de ellas.
for (const post of posts.values().drop(10)) {
  console.log(post);
}
```

## .flatMap(mapperFn)

`flatMap` toma una función de mapeo como argumento. Este ayudante devuelve un iterador de los valores de los iteradores producidos al aplicar la función de mapeo a los valores del iterador original. Es decir, los iteradores devueltos por la función de mapeo se aplanan en el iterador devuelto por este ayudante.

```javascript
// Selecciona la lista de publicaciones de un archivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Obtén la lista de etiquetas de las publicaciones del blog y regístralas. Cada publicación puede tener más de
// una etiqueta.
for (const tag of posts.values().flatMap((x) => x.querySelectorAll('.tag').values())) {
    console.log(tag.textContent);
}
```

## .reduce(reducer [, initialValue ])

`reduce` toma una función reductora y un valor inicial opcional. Este ayudante devuelve un valor como resultado de aplicar la función reductora a cada valor del iterador mientras se realiza un seguimiento del último resultado de aplicar la función reductora. El valor inicial se utiliza como punto de partida para la función reductora cuando procesa el primer valor del iterador.

```javascript
// Selecciona la lista de publicaciones de un archivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Obtén la lista de etiquetas para todas las publicaciones.
const tagLists = posts.values().flatMap((x) => x.querySelectorAll('.tag').values());

// Obtén el contexto del texto para cada etiqueta en la lista.
const tags = tagLists.map((x) => x.textContent);

// Cuenta publicaciones con la etiqueta de seguridad.
const count = tags.reduce((sum , value) => sum + (value === 'security' ? 1 : 0), 0);
console.log(count);
```

## .toArray()

`toArray` devuelve un array a partir de los valores del iterador. 

```javascript
// Selecciona la lista de publicaciones de un archivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Crea un array a partir de la lista de 10 publicaciones recientes.
const arr = posts.values().take(10).toArray();
```

## .forEach(fn)

`forEach` toma una función como argumento y se aplica a cada elemento del iterador. Este ayudante se llama por su efecto secundario y devuelve `undefined`.

```javascript
// Selecciona la lista de publicaciones de un archivo de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Obtén las fechas en las que al menos se publica una entrada de blog y regístralas.
const dates = new Set();
const forEach = posts.values().forEach((x) => dates.add(x.querySelector('time')));
console.log(dates);
```

## .some(fn)

`some` toma una función predicado como argumento. Este auxiliar devuelve `true` si algún elemento del iterador retorna verdadero cuando se aplica la función. El iterador se consume después de que se llame a `some`.

```javascript
// Selecciona la lista de entradas de blog desde una página de archivo de blogs.
const posts = document.querySelectorAll('li:not(header li)');

// Averigua si el contenido de texto (título) de alguna entrada de blog incluye la
// palabra clave `Iterators`.
posts.values().some((x) => x.textContent.includes('Iterators'));
```

## .every(fn)

`every` toma una función predicado como argumento. Este auxiliar devuelve `true` si cada elemento del iterador retorna verdadero cuando se aplica la función. El iterador se consume después de que se llame a `every`.

```javascript
// Selecciona la lista de entradas de blog desde una página de archivo de blogs.
const posts = document.querySelectorAll('li:not(header li)');

// Averigua si el contenido de texto (título) de todas las entradas de blog incluye
// la palabra clave `V8`.
posts.values().every((x) => x.textContent.includes('V8'));
```

## .find(fn)

`find` toma una función predicado como argumento. Este auxiliar devuelve el primer valor del iterador para el cual la función retorna un valor verdadero o `undefined` si ningún valor del iterador lo hace.

```javascript
// Selecciona la lista de entradas de blog desde una página de archivo de blogs.
const posts = document.querySelectorAll('li:not(header li)');

// Registra el contenido de texto (título) de la entrada de blog reciente que incluye
// la palabra clave `V8`.
console.log(posts.values().find((x) => x.textContent.includes('V8')).textContent);
```

## Iterator.from(object)

`from` es un método estático y toma un objeto como argumento. Si el `object` ya es una instancia de Iterator, el auxiliar lo devuelve directamente. Si el `object` tiene `Symbol.iterator`, lo que significa que es iterable, se llama a su método `Symbol.iterator` para obtener el iterador y el auxiliar lo devuelve. De lo contrario, se crea un nuevo objeto `Iterator` (que hereda de `Iterator.prototype` y tiene los métodos `next()` y `return()`) que envuelve el `object` y es retornado por este auxiliar.

```javascript
// Selecciona la lista de entradas de blog desde una página de archivo de blogs.
const posts = document.querySelectorAll('li:not(header li)');

// Primero crea un iterador de las entradas. Luego, registra el contenido de texto
// (título) de la entrada de blog reciente que incluye la palabra clave `V8`.
console.log(Iterator.from(posts).find((x) => x.textContent.includes('V8')).textContent);
```

## Disponibilidad

Los auxiliares de Iterator se lanzaron en V8 v12.2.

## Soporte de auxiliares de Iterator

<feature-support chrome="122 https://chromestatus.com/feature/5102502917177344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1568906"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=248650" 
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#iterator-helpers"></feature-support>
