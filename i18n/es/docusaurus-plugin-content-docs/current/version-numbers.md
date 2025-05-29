---
title: "Esquema de numeración de versiones de V8"
description: "Este documento explica el esquema de numeración de versiones de V8."
---
Los números de versión de V8 tienen la forma `x.y.z.w`, donde:

- `x.y` es el hito de Chromium dividido por 10 (ejemplo: M60 → `6.0`)
- `z` se incrementa automáticamente cada vez que hay un nuevo [LKGR](https://www.chromium.org/chromium-os/developer-library/glossary/#acronyms) (generalmente varias veces al día)
- `w` se incrementa para parches retroactivos fusionados manualmente después de un punto de ramificación

Si `w` es `0`, se omite en el número de versión. Por ejemplo, v5.9.211 (en lugar de “v5.9.211.0”) se incrementa a v5.9.211.1 después de fusionar un parche retroactivo.

## ¿Qué versión de V8 debo usar?

Los incrustadores de V8 generalmente deberían usar *la cabeza de la rama correspondiente a la versión menor de V8 que se envía en Chrome*.

### Encontrar la versión menor de V8 correspondiente a la última versión estable de Chrome

Para averiguar qué versión es esta,

1. Ve a https://chromiumdash.appspot.com/releases
2. Encuentra la última versión estable de Chrome en la tabla
3. Haz clic en el (i) y revisa la columna `V8`


### Encontrar la cabeza de la rama correspondiente

Las ramas relacionadas con la versión de V8 no aparecen en el repositorio en línea en https://chromium.googlesource.com/v8/v8.git; en su lugar, solo aparecen etiquetas. Para encontrar la cabeza de esa rama, ve a la URL en esta forma:

```
https://chromium.googlesource.com/v8/v8.git/+/branch-heads/<minor-version>
```

Ejemplo: para la versión menor 12.1 de V8 encontrada anteriormente, vamos a https://chromium.googlesource.com/v8/v8.git/+/branch-heads/12.1, encontrando un commit titulado “Versión 12.1.285.2.

**Precaución:** No deberías simplemente encontrar la etiqueta numéricamente mayor correspondiente a la versión menor de V8 mencionada anteriormente, ya que a veces esas no son compatibles, por ejemplo, se etiquetan antes de decidir dónde cortar las versiones menores. Estas versiones no reciben retrocesos ni similares.

Ejemplo: las etiquetas de V8 `5.9.212`, `5.9.213`, `5.9.214`, `5.9.214.1`, …, y `5.9.223` están abandonadas, a pesar de ser numéricamente mayores que la **cabeza de rama** de 5.9.211.33.

### Revisar la cabeza de la rama correspondiente

Si ya tienes el código fuente, puedes revisar la cabeza directamente. Si has obtenido el código fuente usando `depot_tools`, deberías poder hacer lo siguiente:

```bash
git branch --remotes | grep branch-heads/
```

para listar las ramas relevantes. Querrás revisar la que corresponde a la versión menor de V8 que encontraste anteriormente y usar esa. La etiqueta en la que termines será la versión de V8 adecuada para ti como incrustador.

Si no usaste `depot_tools`, edita `.git/config` y agrega la línea de abajo a la sección `[remote "origin"]`:

```
fetch = +refs/branch-heads/*:refs/remotes/branch-heads/*
```
