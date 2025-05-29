---
title: "Importar atributos"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars: 
  - "shu-yu-guo"
date: 2024-01-31
tags: 
  - ECMAScript
description: "Atributos de importación: la evolución de las declaraciones de importación"
tweet: ""
---

## Previamente

V8 lanzó la función de [declaraciones de importación](https://chromestatus.com/feature/5765269513306112) en la versión v9.1. Esta característica permitía que las declaraciones de importación de módulos incluyeran información adicional utilizando la palabra clave `assert`. Esta información adicional actualmente se utiliza para importar módulos JSON y CSS dentro de módulos JavaScript.

<!--truncate-->
## Atributos de importación

Desde entonces, las declaraciones de importación han evolucionado hacia [atributos de importación](https://github.com/tc39/proposal-import-attributes). El propósito de la característica sigue siendo el mismo: permitir que las declaraciones de importación de módulos incluyan información adicional.

La diferencia más importante es que las declaraciones de importación tenían una semántica de solo verificación, mientras que los atributos de importación tienen una semántica más relajada. La semántica de solo verificación significa que la información adicional no afecta _cómo_ se carga un módulo, solo _si_ se carga. Por ejemplo, un módulo JSON siempre se carga como módulo JSON en virtud de su tipo MIME, y la cláusula `assert { type: 'json' }` solo puede causar un error de carga si el tipo MIME del módulo solicitado no es `application/json`.

Sin embargo, la semántica de solo verificación tenía un defecto fatal. En la web, la forma de las solicitudes HTTP difiere dependiendo del tipo de recurso solicitado. Por ejemplo, el encabezado [`Accept`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept) afecta el tipo MIME de la respuesta, y el encabezado de metadatos [`Sec-Fetch-Dest`](https://web.dev/articles/fetch-metadata) afecta si el servidor web acepta o rechaza la solicitud. Debido a que una declaración de importación no podía afectar _cómo_ cargar un módulo, no era capaz de cambiar la forma de la solicitud HTTP. El tipo del recurso solicitado también afecta qué [Políticas de Seguridad de Contenido](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) se utilizan: las declaraciones de importación no podían funcionar correctamente con el modelo de seguridad de la web.

Los atributos de importación relajan la semántica de solo verificación para permitir que los atributos afecten cómo se carga un módulo. En otras palabras, los atributos de importación pueden generar solicitudes HTTP que contienen los encabezados `Accept` y `Sec-Fetch-Dest` apropiados. Para ajustar la sintaxis a la nueva semántica, la antigua palabra clave `assert` se actualiza a `with`:

```javascript
// main.mjs
//
// Nueva sintaxis 'with'.
import json from './foo.json' with { type: 'json' };
console.log(json.answer); // 42
```

## `import()` dinámico

De manera similar, [`import()` dinámico](https://v8.dev/features/dynamic-import#dynamic) se actualiza de manera similar para aceptar una opción `with`.

```javascript
// main.mjs
//
// Nueva opción 'with'.
const jsonModule = await import('./foo.json', {
  with: { type: 'json' }
});
console.log(jsonModule.default.answer); // 42
```

## Disponibilidad de `with`

Los atributos de importación están habilitados de forma predeterminada en V8 v12.3.

## Deprecación y eventual eliminación de `assert`

La palabra clave `assert` está en desuso a partir de V8 v12.3 y está prevista su eliminación en v12.6. ¡Por favor, use `with` en lugar de `assert`! El uso de la cláusula `assert` imprimirá una advertencia en la consola instando a usar `with` en su lugar.

## Soporte para atributos de importación

<feature-support chrome="123 https://chromestatus.com/feature/5205869105250304"
                 firefox="no"
                 safari="17.2 https://developer.apple.com/documentation/safari-release-notes/safari-17_2-release-notes"
                 nodejs="20.10 https://nodejs.org/docs/latest-v20.x/api/esm.html#import-attributes"
                 babel="yes https://babeljs.io/blog/2023/05/26/7.22.0#import-attributes-15536-15620"></feature-support>
