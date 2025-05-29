---
title: 'API pública de V8'
description: 'Este documento analiza la estabilidad de la API pública de V8 y cómo los desarrolladores pueden realizar cambios en ella.'
---
Este documento analiza la estabilidad de la API pública de V8 y cómo los desarrolladores pueden realizar cambios en ella.

## Estabilidad de la API

Si V8 en una versión canary de Chromium resulta ser inestable, se retrocede a la versión de V8 del canary anterior. Por lo tanto, es importante mantener la API de V8 compatible de una versión canary a la siguiente.

Ejecutamos continuamente un [bot](https://ci.chromium.org/p/v8/builders/luci.v8.ci/Linux%20V8%20API%20Stability) que señala violaciones de la estabilidad de la API. Compila el código principal de Chromium con la [versión actual canary de V8](https://chromium.googlesource.com/v8/v8/+/refs/heads/canary).

Las fallas de este bot actualmente son solo informativas y no requieren acción. La lista de culpables puede ser utilizada para identificar fácilmente los CL dependientes en caso de un retroceso.

Si rompes este bot, recuerda aumentar el intervalo entre un cambio en V8 y el correspondiente cambio dependiente en Chromium la próxima vez.

## Cómo cambiar la API pública de V8

V8 es utilizado por muchos integradores diferentes: Chrome, Node.js, gjstest, etc. Al cambiar la API pública de V8 (básicamente los archivos bajo el directorio `include/`) debemos asegurarnos de que los integradores puedan actualizarse sin problemas a la nueva versión de V8. En particular, no podemos asumir que un integrador actualice a la nueva versión de V8 y ajuste su código a la nueva API en un único cambio atómico.

El integrador debe poder ajustar su código a la nueva API mientras aún usa la versión anterior de V8. Todas las instrucciones a continuación se derivan de esta regla.

- Agregar nuevos tipos, constantes y funciones es seguro con una salvedad: no agregues una nueva función virtual pura a una clase existente. Las nuevas funciones virtuales deben tener una implementación predeterminada.
- Agregar un nuevo parámetro a una función es seguro si el parámetro tiene un valor predeterminado.
- Eliminar o renombrar tipos, constantes, funciones no es seguro. Usa los macros [`V8_DEPRECATED`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=395&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde) y [`V8_DEPRECATE_SOON`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=403&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde), que generan advertencias en tiempo de compilación cuando los métodos obsoletos son llamados por el integrador. Por ejemplo, supongamos que queremos renombrar la función `foo` a la función `bar`. Entonces necesitamos hacer lo siguiente:
    - Agregar la nueva función `bar` cerca de la función existente `foo`.
    - Esperar hasta que el CL entre en Chrome. Ajusta Chrome para usar `bar`.
    - Anotar `foo` con `V8_DEPRECATED("Usa bar en su lugar") void foo();`
    - En el mismo CL ajustar las pruebas que usan `foo` para que usen `bar`.
    - Escribir en el CL la motivación para el cambio y las instrucciones de actualización a alto nivel.
    - Esperar hasta la próxima rama de V8.
    - Eliminar la función `foo`.

    `V8_DEPRECATE_SOON` es una versión más suave de `V8_DEPRECATED`. Chrome no se romperá con esto, así que el paso b no es necesario. `V8_DEPRECATE_SOON` no es suficiente para eliminar la función.

    Todavía necesitas anotar con `V8_DEPRECATED` y esperar hasta la próxima rama antes de eliminar la función.

    `V8_DEPRECATED` puede ser probado usando el flag GN `v8_deprecation_warnings`.
    `V8_DEPRECATE_SOON` puede ser probado usando `v8_imminent_deprecation_warnings`.

- Cambiar las firmas de funciones no es seguro. Usa los macros `V8_DEPRECATED` y `V8_DEPRECATE_SOON` como se describe arriba.

Mantenemos un [documento que menciona cambios importantes en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) para cada versión de V8.

También hay una [documentación API doxygen](https://v8.dev/api) que se actualiza regularmente.
