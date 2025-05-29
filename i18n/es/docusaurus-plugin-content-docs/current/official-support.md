---
title: 'Configuraciones oficialmente compatibles'
description: 'Este documento explica qué configuraciones de compilación son mantenidas por el equipo de V8.'
---
V8 admite una multitud de diferentes configuraciones de compilación en diversos sistemas operativos, sus versiones, puertos de arquitectura, banderas de compilación, y más.

La regla general: Si lo admitimos, ejecutamos un bot en una de nuestras [consolas de integración continua](https://ci.chromium.org/p/v8/g/main/console).

Algunas particularidades:

- Los fallos en los compiladores más importantes bloquearán el envío de código. Un sheriff de árbol normalmente revertirá al culpable.
- Los fallos en aproximadamente el mismo [conjunto de compiladores](https://chromium.googlesource.com/infra/infra/+/main/infra/services/lkgr_finder/config/v8_cfg.pyl) bloquean nuestro roll continuo en Chromium.
- Algunos puertos de arquitectura son [gestionados externamente](/docs/ports).
- Algunas configuraciones son [experimentales](https://ci.chromium.org/p/v8/g/experiments/console). Los fallos están permitidos y serán manejados por los propietarios de la configuración.

Si tienes una configuración que presenta un problema, pero no está cubierta por uno de los bots anteriores:

- Siéntete libre de enviar un CL que solucione tu problema. El equipo te apoyará con una revisión de código.
- Puedes usar [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com) para discutir el problema.
- Si crees que deberíamos admitir esta configuración (¿quizás un agujero en nuestra matriz de pruebas?), por favor crea un informe en el [rastreador de problemas de V8](https://bugs.chromium.org/p/v8/issues/entry) y pregunta.

Sin embargo, no tenemos la capacidad de atender cada posible configuración.
