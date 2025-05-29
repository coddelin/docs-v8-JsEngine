---
title: "Proceso de lanzamiento"
description: "Este documento explica el proceso de lanzamiento de V8."
---
El proceso de lanzamiento de V8 está estrechamente relacionado con [el de Chrome](https://www.chromium.org/getting-involved/dev-channel). El equipo de V8 utiliza los cuatro canales de lanzamiento de Chrome para implementar nuevas versiones a los usuarios.

Si quieres verificar qué versión de V8 está en un lanzamiento de Chrome, puedes consultar [Chromiumdash](https://chromiumdash.appspot.com/releases). Para cada lanzamiento de Chrome se crea una rama separada en el repositorio de V8 para facilitar el rastreo, por ejemplo, para [Chrome M121](https://chromium.googlesource.com/v8/v8/+log/refs/branch-heads/12.1).

## Lanzamientos Canary

Todos los días se publica una nueva compilación Canary para los usuarios a través del [canal Canary de Chrome](https://www.google.com/chrome/browser/canary.html?platform=win64). Normalmente, el entregable es la última versión lo suficientemente estable de [main](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main).

Las ramas para una versión Canary normalmente lucen así:

## Lanzamientos Dev

Cada semana, una nueva compilación Dev se publica para los usuarios a través del [canal Dev de Chrome](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel&platform=win64). Normalmente, el entregable incluye la última versión de V8 lo suficientemente estable en el canal Canary.


## Lanzamientos Beta

Aproximadamente cada 2 semanas se crea una nueva rama principal, por ejemplo, [para Chrome 94](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4). Esto sucede en sincronización con la creación del [canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html?platform=win64). El Chrome Beta está fijado a la cabecera de la rama de V8. Después de aproximadamente 2 semanas, la rama se promueve a Estable.

Los cambios solo se seleccionan específicamente en la rama para estabilizar la versión.

Las ramas para una versión Beta normalmente lucen así

```
refs/branch-heads/12.1
```

Están basadas en una rama Canary.

## Lanzamientos Estables

Aproximadamente cada 4 semanas se realiza una nueva versión Estable principal. No se crea una rama especial, ya que la última rama Beta simplemente se promueve a Estable. Esta versión se publica para los usuarios a través del [canal Estable de Chrome](https://www.google.com/chrome/browser/desktop/index.html?platform=win64).

Las ramas para una versión Estable normalmente lucen así:

```
refs/branch-heads/12.1
```

Son ramas Beta promovidas (reutilizadas).

## API

Chromiumdash también ofrece una API para recopilar la misma información:

```
https://chromiumdash.appspot.com/fetch_milestones (para obtener el nombre de la rama de V8, por ejemplo, refs/branch-heads/12.1)
https://chromiumdash.appspot.com/fetch_releases (para obtener el hash git de la rama de V8)
```

Los siguientes parámetros son útiles:
mstone=121
channel=Stable,Canary,Beta,Dev
platform=Mac,Windows,Lacros,Linux,Android,Webview,etc.

## ¿Qué versión debería incorporar en mi aplicación?

La última versión de la misma rama que utiliza el canal Estable de Chrome.

A menudo integramos retroactivamente correcciones importantes de errores en una rama estable, por lo que si te preocupas por estabilidad, seguridad y corrección, también deberías incluir esas actualizaciones. Por eso recomendamos “la última versión de la rama” en lugar de una versión exacta.

Tan pronto como se promueve una nueva rama a Estable, dejamos de mantener la rama estable anterior. Esto sucede cada cuatro semanas, por lo que deberías estar preparado para actualizar por lo menos con esa frecuencia.

**Relacionado:** [¿Qué versión de V8 debería usar?](/docs/version-numbers#which-v8-version-should-i-use%3F)
