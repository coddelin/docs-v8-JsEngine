---
title: "Importación dinámica `import()`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-11-21
tags: 
  - ECMAScript
  - ES2020
description: "La importación dinámica (`import()`) desbloquea nuevas capacidades en comparación con la importación estática. Este artículo compara ambas y ofrece una visión general de lo nuevo."
tweet: "932914724060254208"
---
[Importación dinámica `import()`](https://github.com/tc39/proposal-dynamic-import) introduce una nueva forma de función similar a `import` que desbloquea nuevas capacidades en comparación con el `import` estático. Este artículo compara ambas y ofrece una visión general de lo nuevo.

<!--truncate-->
## Importación estática `import` (recapitulación)

Chrome 61 se lanzó con soporte para la declaración `import` de ES2015 dentro de [módulos](/features/modules).

Considere el siguiente módulo, ubicado en `./utils.mjs`:

```js
// Exportación predeterminada
export default () => {
  console.log('¡Hola desde la exportación predeterminada!');
};

// Exportación nombrada `doStuff`
export const doStuff = () => {
  console.log('Haciendo cosas…');
};
```

Así es como se importa estáticamente y se usa el módulo `./utils.mjs`:

```html
<script type="module">
  import * as module from './utils.mjs';
  module.default();
  // → registra '¡Hola desde la exportación predeterminada!'
  module.doStuff();
  // → registra 'Haciendo cosas…'
</script>
```

:::note
**Nota:** El ejemplo anterior usa la extensión `.mjs` para señalar que es un módulo en lugar de un script regular. En la web, las extensiones de archivo no son realmente importantes, siempre y cuando los archivos se sirvan con el tipo MIME correcto (por ejemplo, `text/javascript` para archivos JavaScript) en el encabezado HTTP `Content-Type`.

La extensión `.mjs` es especialmente útil en otras plataformas como [Node.js](https://nodejs.org/api/esm.html#esm_enabling) y [`d8`](/docs/d8), donde no hay un concepto de tipos MIME u otros ganchos obligatorios como `type="module"` para determinar si algo es un módulo o un script regular. Estamos usando la misma extensión aquí para la coherencia entre plataformas y para distinguir claramente entre módulos y scripts regulares.
:::

Esta forma sintáctica para importar módulos es una declaración *estática*: solo acepta un literal de cadena como especificador del módulo e introduce enlaces en el ámbito local a través de un proceso de “vinculación” previo a la ejecución. La sintaxis de `import` estático solo puede usarse en el nivel superior del archivo.

El `import` estático permite casos de uso importantes como análisis estático, herramientas de empaquetado y eliminación de código muerto.

En algunos casos, es útil:

- importar un módulo bajo demanda (o condicionalmente)
- calcular el especificador del módulo en tiempo de ejecución
- importar un módulo desde un script regular (en lugar de un módulo)

Ninguna de esas opciones es posible con `import` estático.

## Importación dinámica `import()` 🔥

[Importación dinámica `import()`](https://github.com/tc39/proposal-dynamic-import) introduce una nueva forma de función similar a `import` que se adapta a esos casos de uso. `import(moduleSpecifier)` devuelve una promesa para el objeto espacio de nombres del módulo solicitado, que se crea después de recuperar, instanciar y evaluar todas las dependencias del módulo, así como el módulo en sí.

Así es como se importa dinámicamente y se usa el módulo `./utils.mjs`:

```html
<script type="module">
  const moduleSpecifier = './utils.mjs';
  import(moduleSpecifier)
    .then((module) => {
      module.default();
      // → registra '¡Hola desde la exportación predeterminada!'
      module.doStuff();
      // → registra 'Haciendo cosas…'
    });
</script>
```

Dado que `import()` devuelve una promesa, es posible usar `async`/`await` en lugar del estilo de devolución de llamada basado en `then`:

```html
<script type="module">
  (async () => {
    const moduleSpecifier = './utils.mjs';
    const module = await import(moduleSpecifier)
    module.default();
    // → registra '¡Hola desde la exportación predeterminada!'
    module.doStuff();
    // → registra 'Haciendo cosas…'
  })();
</script>
```

:::note
**Nota:** Aunque `import()` _parece_ una llamada de función, se especifica como *sintaxis* que simplemente utiliza paréntesis (similar a [`super()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super)). Eso significa que `import` no hereda de `Function.prototype` por lo que no puedes `call` o `apply` con él, y cosas como `const importAlias = import` no funcionan — de hecho, `import` ni siquiera es un objeto. Sin embargo, esto no importa mucho en la práctica.
:::

Aquí hay un ejemplo de cómo la importación dinámica `import()` permite la carga diferida de módulos al navegar en una pequeña aplicación de una sola página:

```html
<!DOCTYPE html>
<meta charset="utf-8">
<title>Mi biblioteca</title>
<nav>
  <a href="books.html" data-entry-module="books">Libros</a>
  <a href="movies.html" data-entry-module="movies">Películas</a>
  <a href="video-games.html" data-entry-module="video-games">Videojuegos</a>
</nav>
<main>Este es un marcador de posición para el contenido que se cargará bajo demanda.</main>
<script>
  const main = document.querySelector('main');
  const links = document.querySelectorAll('nav > a');
  para (const link de links) {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        const module = await import(`/${link.dataset.entryModule}.mjs`);
        // El módulo exporta una función llamada `loadPageInto`.
        module.loadPageInto(main);
      } catch (error) {
        main.textContent = error.message;
      }
    });
  }
</script>
```

Las capacidades de carga diferida habilitadas por el `import()` dinámico pueden ser bastante poderosas cuando se aplican correctamente. Para fines demostrativos, [Addy](https://twitter.com/addyosmani) modificó [un ejemplo de PWA de Hacker News](https://hnpwa-vanilla.firebaseapp.com/) que importaba de forma estática todas sus dependencias, incluidos los comentarios, en la primera carga. [La versión actualizada](https://dynamic-import.firebaseapp.com/) utiliza `import()` dinámico para cargar los comentarios de manera diferida, evitando el costo de carga, análisis y compilación hasta que el usuario realmente los necesite.

:::note
**Nota:** Si tu aplicación importa scripts desde otro dominio (ya sea de forma estática o dinámica), los scripts deben devolverse con encabezados CORS válidos (como `Access-Control-Allow-Origin: *`). Esto se debe a que, a diferencia de los scripts regulares, los scripts de módulos (y sus importaciones) se obtienen con CORS.
:::

## Recomendaciones

Los `import` estáticos y el `import()` dinámico son ambos útiles. Cada uno tiene sus propios casos de uso muy distintos. Utiliza `import` estáticos para las dependencias necesarias para la pintura inicial, especialmente para el contenido sobre el pliegue. En otros casos, considera cargar dependencias bajo demanda con el `import()` dinámico.

## Soporte de `import()` dinámico

<feature-support chrome="63"
                 firefox="67"
                 safari="11.1"
                 nodejs="13.2 https://nodejs.medium.com/announcing-core-node-js-support-for-ecmascript-modules-c5d6dc29b663"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-syntax-dynamic-import"></feature-support>
