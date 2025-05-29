---
title: &apos;Contribuir a V8&apos;
description: &apos;Este documento explica cómo contribuir a V8.&apos;
---
La información en esta página explica cómo contribuir a V8. Asegúrate de leer todo antes de enviarnos una contribución.

## Obtén el código

Consulta [Cómo obtener el código fuente de V8](/docs/source-code).

## Antes de contribuir

### Pregunta en la lista de correo de V8 para recibir orientación

Antes de empezar a trabajar en una contribución grande para V8, primero debes ponerte en contacto con nosotros a través de [la lista de correo de contribuyentes de V8](https://groups.google.com/group/v8-dev) para que podamos ayudarte y posiblemente guiarte. Coordinar desde el principio hace que sea mucho más fácil evitar frustraciones más adelante.

### Firma el CLA

Antes de que podamos usar tu código, debes firmar el [Acuerdo de Licencia de Contribuidor Individual de Google](https://cla.developers.google.com/about/google-individual), lo cual puedes hacer en línea. Esto es principalmente porque tú posees los derechos de autor de tus cambios, incluso después de que tu contribución se convierta en parte de nuestra base de código, por lo que necesitamos tu permiso para usar y distribuir tu código. También necesitamos estar seguros de varias otras cosas, por ejemplo, que nos informarás si sabes que tu código infringe las patentes de otras personas. No tienes que hacer esto sino hasta que hayas enviado tu código para revisión y un miembro lo haya aprobado, pero debes hacerlo antes de que podamos incluir tu código en nuestra base de código.

Las contribuciones realizadas por corporaciones están cubiertas por un acuerdo diferente al anterior, el [Acuerdo de Licencia de Contribuidor Corporativo y Subsidio de Software](https://cla.developers.google.com/about/google-corporate).

Fírmalos en línea [aquí](https://cla.developers.google.com/).

## Envía tu código

El código fuente de V8 sigue la [Guía de Estilo de C++ de Google](https://google.github.io/styleguide/cppguide.html), por lo que deberías familiarizarte con estas pautas. Antes de enviar el código, debes pasar todas nuestras [pruebas](/docs/test), y haber ejecutado exitosamente las verificaciones previas:

```bash
git cl presubmit
```

El script de presubmit utiliza un linter de Google, [`cpplint.py`](https://raw.githubusercontent.com/google/styleguide/gh-pages/cpplint/cpplint.py). Es parte de [`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools), y debe estar en tu `PATH`, por lo que si tienes `depot_tools` en tu `PATH`, todo debería funcionar correctamente.

### Sube a la herramienta de revisión de código de V8

Todas las presentaciones, incluidas las enviadas por los miembros del proyecto, requieren revisión. Usamos las mismas herramientas y procesos de revisión de código que el proyecto Chromium. Para enviar un parche, necesitas obtener las [`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools) y seguir estas instrucciones sobre [cómo solicitar una revisión](https://chromium.googlesource.com/chromium/src/+/master/docs/contributing.md) (utilizando tu espacio de trabajo de V8 en lugar de un espacio de trabajo de Chromium).

### Presta atención a rupturas o regresiones

Una vez que tengas la aprobación de revisión de código, puedes integrar tu parche usando la cola de confirmación. Esta ejecuta varias pruebas y confirma tu parche si todas las pruebas pasan. Una vez que tu cambio se haya confirmado, es una buena idea observar [la consola](https://ci.chromium.org/p/v8/g/main/console) hasta que los bots se vuelvan verdes después de tu cambio, porque la consola ejecuta algunas pruebas más de las que realiza la cola de confirmación.
