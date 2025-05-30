---
title: "¡Ayúdanos a probar el futuro de V8!"
author: "Daniel Clifford ([@expatdanno](https://twitter.com/expatdanno)), Cervecero Original de V8 en Múnich"
date: "2017-02-14 13:33:37"
tags: 
  - internals
description: "¡Prueba la nueva canalización de compiladores de V8 con Ignition y TurboFan en Chrome Canary hoy mismo!"
---
El equipo de V8 está trabajando actualmente en una nueva canalización de compiladores predeterminada que nos ayudará a ofrecer mejoras de velocidad futuras para [JavaScript en el mundo real](/blog/real-world-performance). Puedes probar la nueva canalización en Chrome Canary hoy mismo para ayudarnos a verificar que no haya sorpresas cuando implementemos la nueva configuración para todos los canales de Chrome.

<!--truncate-->
La nueva canalización utiliza el [intérprete Ignition](/blog/ignition-interpreter) y el [compilador TurboFan](/docs/turbofan) para ejecutar todo el JavaScript (en lugar de la canalización clásica que consistía en los compiladores Full-codegen y Crankshaft). Un subconjunto aleatorio de usuarios de los canales Chrome Canary y Chrome Developer ya están probando la nueva configuración. Sin embargo, cualquiera puede optar por la nueva canalización (o volver a la antigua) cambiando una opción en about:flags.

Puedes ayudar a probar la nueva canalización optando por utilizarla en Chrome con tus sitios web favoritos. Si eres desarrollador web, prueba tus aplicaciones web con la nueva canalización de compiladores. Si notas una regresión en estabilidad, corrección o rendimiento, por favor [reporta el problema en el rastreador de errores de V8](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline).

## Cómo habilitar la nueva canalización

### En Chrome 58

1. Instala la última versión [Beta](https://www.google.com/chrome/browser/beta.html)
2. Abre la URL `about:flags` en Chrome
3. Busca "**Canalización experimental de compilación de JavaScript**" y configúrala como "**Habilitada**"

![](/_img/test-the-future/58.png)

### En Chrome 59.0.3056 y posteriores

1. Instala la última versión [Canary](https://www.google.com/chrome/browser/canary.html) o [Dev](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel)
2. Abre la URL `about:flags` en Chrome
3. Busca "**Canalización clásica de compilación de JavaScript**" y configúrala como "**Deshabilitada**"

![](/_img/test-the-future/59.png)

El valor estándar es "**Predeterminado**", lo que significa que la nueva **o** la clásica canalización está activa dependiendo de la configuración de prueba A/B.

## Cómo reportar problemas

Por favor, infórmanos si tu experiencia de navegación cambia significativamente al usar la nueva canalización en lugar de la canalización predeterminada. Si eres desarrollador web, prueba el rendimiento de la nueva canalización en tu aplicación web (móvil) para ver cómo se ve afectada. Si descubres que tu aplicación web se comporta de manera extraña (o fallan las pruebas), háznoslo saber:

1. Asegúrate de haber habilitado correctamente la nueva canalización como se indica en la sección anterior.
2. [Crea un error en el rastreador de errores de V8](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline).
3. Adjunta código de muestra que podamos usar para reproducir el problema.
