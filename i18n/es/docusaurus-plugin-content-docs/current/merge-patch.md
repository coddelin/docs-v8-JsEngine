---
title: "Fusión y parcheo"
description: "Este documento explica cómo fusionar parches de V8 a una rama de lanzamiento."
---
Si tienes un parche para la rama `main` (por ejemplo, una corrección importante de un error) que necesita ser fusionado en una de las ramas de lanzamiento de V8 (refs/branch-heads/12.5), sigue leyendo.

Los siguientes ejemplos utilizan una versión ramificada 12.3 de V8. Sustituye `12.3` con tu número de versión. Lee la documentación sobre [la numeración de versiones de V8](/docs/version-numbers) para más información.

Un problema asociado en el rastreador de problemas de V8 es **obligatorio** si se fusiona un parche. Esto ayuda a realizar un seguimiento de las fusiones.

## ¿Qué califica como un candidato para fusión?

- El parche corrige un error *grave* (en orden de importancia):
    1. error de seguridad
    1. error de estabilidad
    1. error de corrección
    1. error de rendimiento
- El parche no altera las APIs.
- El parche no cambia el comportamiento presente antes del corte de la rama (excepto si el cambio de comportamiento corrige un error).

Se puede encontrar más información en la [página relevante de Chromium](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/process/merge_request.md). En caso de duda, envía un correo electrónico a [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com).

## El proceso de fusión

El proceso de fusión en el rastreador de V8 se gestiona mediante Atributos. Por lo tanto, configura el atributo 'Merge-Request' para el hito de Chrome relevante. En caso de que la fusión solo afecte un [port](https://v8.dev/docs/ports) de V8, configura el atributo HW en consecuencia. Ejemplo:

```
Merge-Request: 123
HW: MIPS,LoongArch64
```

Una vez revisado, esto se ajustará durante la revisión a:

```
Merge: Approved-123
o
Merge: Rejected-123
```

Después de que el CL se haya integrado, esto se ajustará una vez más a:

```
Merge: Merged-123, Merged-12.3
```

## Cómo verificar si un commit ya fue fusionado/revertido/tiene cobertura de Canary

Utiliza [chromiumdash](https://chromiumdash.appspot.com/commit/) para verificar si el CL relevante tiene cobertura de Canary.


En la parte superior, la sección **Releases** debería mostrar un Canary.

## Cómo crear el CL de fusión

### Opción 1: Usando [gerrit](https://chromium-review.googlesource.com/) - Recomendado


1. Abre el CL que deseas fusionar hacia atrás.
1. Selecciona "Cherry pick" desde el menú extendido (tres puntos verticales en la esquina superior derecha).
1. Ingresa "refs/branch-heads/*XX.X*" como la rama de destino (reemplaza *XX.X* por la rama adecuada).
1. Modifica el mensaje del commit:
   1. Agrega el prefijo "Merged: " al título.
   1. Elimina las líneas del pie de página que corresponden al CL original ("Change-Id", "Reviewed-on", "Reviewed-by", "Commit-Queue", "Cr-Commit-Position"). Asegúrate de mantener la línea "(cherry picked from commit XXX)", ya que es necesaria para que algunas herramientas relacionen las fusiones con los CL originales.
1. En caso de conflicto de fusión, por favor también crea el CL. Para resolver conflictos (si los hay), utiliza la interfaz de usuario de gerrit o descarga el parche localmente usando el comando "download patch" del menú (tres puntos verticales en la esquina superior derecha).
1. Envíalo para revisión.

### Opción 2: Usando el script automatizado

Supongamos que estás fusionando la revisión af3cf11 a la rama 12.2 (especifica los hashes completos de git; aquí se utilizan abreviaturas por simplicidad).

```
https://source.chromium.org/chromium/chromium/src/+/main:v8/tools/release/merge_to_branch_gerrit.py --branch 12.3 -r af3cf11
```


### Después de la integración: Observa el [waterfall de la rama](https://ci.chromium.org/p/v8)

Si uno de los builders no está en verde después de manejar tu parche, revierte inmediatamente la fusión. Un bot (`AutoTagBot`) se encarga de la versión correcta después de una espera de 10 minutos.

## Parchear una versión usada en Canary/Dev

En caso de que necesites parchear una versión Canary/Dev (lo cual no debería suceder a menudo), cc vahl@ o machenbach@ en el problema. Googlers: revisen el [sitio interno](http://g3doc/company/teams/v8/patching_a_version) antes de crear el CL.

