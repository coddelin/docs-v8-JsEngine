---
title: &apos;Clasificación de problemas&apos;
description: &apos;Este documento explica cómo gestionar problemas en el rastreador de errores de V8.&apos;
---
Este documento explica cómo gestionar problemas en el [rastreador de errores de V8](/bugs).

## Cómo clasificar un problema

- *Rastreador de V8*: Establece el estado en `Sin clasificar`
- *Rastreador de Chromium*: Establece el estado en `Sin clasificar` y agrega el componente `Blink>JavaScript`

## Cómo asignar problemas de V8 en el rastreador de Chromium

Por favor, mueve los problemas a la cola de alguaciles especializados en V8 dentro de una de las siguientes categorías:

- Memoria: `component:blink>javascript status=Sin clasificar label:Performance-Memory`
    - Aparecerán en [esta](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=component%3Ablink%3Ejavascript+status%3DUntriaged+label%3APerformance-Memory+&colspec=ID+Pri+M+Stars+ReleaseBlock+Cr+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=tiles) consulta
- Estabilidad: `status=available,untriaged component:Blink>JavaScript label:Stability -label:Clusterfuzz`
    - Aparecerán en [esta](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=status%3Davailable%2Cuntriaged+component%3ABlink%3EJavaScript+label%3AStability+-label%3AClusterfuzz&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids) consulta
    - No se necesita CC, será clasificado automáticamente por un alguacil
- Rendimiento: `status=untriaged component:Blink>JavaScript label:Performance`
    - Aparecerán en [esta](https://bugs.chromium.org/p/chromium/issues/list?colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&x=m&y=releaseblock&cells=tiles&q=component%3Ablink%3Ejavascript%20status%3DUntriaged%20label%3APerformance&can=2) consulta
    - No se necesita CC, será clasificado automáticamente por un alguacil
- Clusterfuzz: Establece el problema en el siguiente estado:
    - `label:ClusterFuzz component:Blink>JavaScript status:Sin clasificar`
    - Aparecerán en [esta](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=label%3AClusterFuzz+component%3ABlink%3EJavaScript+status%3AUntriaged&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids) consulta.
    - No se necesita CC, será clasificado automáticamente por un alguacil
- Seguridad: Todos los problemas de seguridad son clasificados por alguaciles de seguridad de Chromium. Por favor, consulta [informar errores de seguridad](/docs/security-bugs) para más información.

Si necesitas la atención de un alguacil, por favor consulta la información de rotación.

Usa el componente `Blink>JavaScript` en todos los problemas.

**Por favor, ten en cuenta que esto sólo aplica a problemas rastreados en el rastreador de problemas de Chromium.**
