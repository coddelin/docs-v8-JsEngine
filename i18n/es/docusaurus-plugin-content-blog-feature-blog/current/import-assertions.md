---
title: "Aserciones de importación"
author: "Dan Clark ([@dandclark1](https://twitter.com/dandclark1)), importador asertivo de aserciones de importación"
avatars:
  - "dan-clark"
date: 2021-06-15
tags:
  - ECMAScript
description: "Las aserciones de importación permiten que las declaraciones de importación de módulos incluyan información adicional junto al especificador del módulo"
tweet: ""
---

La nueva función de [aserciones de importación](https://github.com/tc39/proposal-import-assertions) permite que las declaraciones de importación de módulos incluyan información adicional junto al especificador del módulo. Un uso inicial de esta función es habilitar la importación de documentos JSON como [módulos JSON](https://github.com/tc39/proposal-json-modules):

<!--truncate-->
```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
import json from './foo.json' assert { type: 'json' };
console.log(json.answer); // 42
```

## Antecedentes: Módulos JSON y tipo MIME

Una pregunta natural es por qué un módulo JSON no podría ser simplemente importado así:

```javascript
import json from './foo.json';
```

La plataforma web verifica el tipo MIME de un recurso de módulo para su validez antes de ejecutarlo, y en teoría este tipo MIME también podría usarse para determinar si tratar el recurso como un JSON o como un módulo JavaScript.

Sin embargo, existe un [problema de seguridad](https://github.com/w3c/webcomponents/issues/839) al confiar únicamente en el tipo MIME.

Los módulos pueden ser importados de un origen cruzado, y un desarrollador podría importar un módulo JSON desde una fuente de terceros. Podrían considerar esto como básicamente seguro incluso desde un tercero no confiable siempre que el JSON esté debidamente sanitizado, ya que importar JSON no ejecutará scripts.

Sin embargo, el script de terceros en realidad puede ejecutarse en este escenario, ya que el servidor de terceros podría responder inesperadamente con un tipo MIME de JavaScript y una carga maliciosa de JavaScript, ejecutando código en el dominio del importador.

```javascript
// Ejecuta JS si evil.com responde con un
// tipo MIME de JavaScript (e.g., `text/javascript`)!
import data from 'https://evil.com/data.json';
```

Las extensiones de archivo no pueden usarse para determinar el tipo de módulo porque [no son un indicador confiable del tipo de contenido en la web](https://github.com/tc39/proposal-import-assertions/blob/master/content-type-vs-file-extension.md). Por lo tanto, utilizamos aserciones de importación para indicar el tipo de módulo esperado y prevenir esta escalada de privilegios.

Cuando un desarrollador quiere importar un módulo JSON, debe usar una aserción de importación para especificar que se supone que es JSON. La importación fallará si el tipo MIME recibido de la red no coincide con el tipo esperado:

```javascript
// Falla si evil.com responde con un tipo MIME no JSON.
import data from 'https://evil.com/data.json' assert { type: 'json' };
```

## `import()` dinámico

Las aserciones de importación también pueden pasarse a [`import()` dinámico](https://v8.dev/features/dynamic-import#dynamic) con un nuevo segundo parámetro:

```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
const jsonModule = await import('./foo.json', {
  assert: { type: 'json' }
});
console.log(jsonModule.default.answer); // 42
```

El contenido JSON es la exportación predeterminada del módulo, por lo que se referencia a través de la propiedad `default` en el objeto devuelto por `import()`.

## Conclusión

Actualmente, el único uso especificado de las aserciones de importación es para especificar el tipo de módulo. Sin embargo, la función fue diseñada para permitir pares arbitrarios de clave/valor en las aserciones, por lo que podrían añadirse usos adicionales en el futuro si resulta útil restringir las importaciones de módulos de otras maneras.

Mientras tanto, los módulos JSON con la nueva sintaxis de aserciones de importación están disponibles de forma predeterminada en Chromium 91. [Los scripts de módulos CSS](https://chromestatus.com/feature/5948572598009856) también estarán disponibles pronto, utilizando la misma sintaxis de aserciones de tipo de módulo.

## Soporte para aserciones de importación

<feature-support chrome="91 https://chromestatus.com/feature/5765269513306112"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="yes https://github.com/babel/babel/pull/12139"></feature-support>
