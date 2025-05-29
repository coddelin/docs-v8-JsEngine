---
title: "Estadísticas de llamadas en tiempo de ejecución"
description: "Este documento explica cómo usar las estadísticas de llamadas en tiempo de ejecución para obtener métricas internas detalladas de V8."
---
[El panel de rendimiento de DevTools](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/) ofrece información sobre el rendimiento en tiempo de ejecución de tu aplicación web visualizando varias métricas internas de Chrome. Sin embargo, ciertas métricas de V8 de bajo nivel actualmente no se exponen en DevTools. Este artículo te guía para recopilar métricas internas detalladas de V8 de la manera más sólida, conocida como Estadísticas de llamadas en tiempo de ejecución o RCS, a través de `chrome://tracing`.

Tracing registra el comportamiento de todo el navegador, incluidos otras pestañas, ventanas y extensiones, por lo que funciona mejor cuando se realiza en un perfil de usuario limpio, con las extensiones deshabilitadas y sin otras pestañas del navegador abiertas:

```bash
# Inicia una nueva sesión del navegador Chrome con un perfil de usuario limpio y extensiones deshabilitadas
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

Escribe la URL de la página que deseas medir en la primera pestaña, pero aún no cargues la página.

![](/_img/rcs/01.png)

Agrega una segunda pestaña y abre `chrome://tracing`. Consejo: puedes simplemente ingresar `chrome:tracing`, sin las barras.

![](/_img/rcs/02.png)

Haz clic en el botón “Grabar” para preparar la grabación de un trace. Primero elige “Desarrollador web” y luego selecciona “Editar categorías”.

![](/_img/rcs/03.png)

Selecciona `v8.runtime_stats` de la lista. Dependiendo de qué tan detallada sea tu investigación, puedes seleccionar otras categorías también.

![](/_img/rcs/04.png)

Presiona “Grabar” y regresa a la primera pestaña para cargar la página. La forma más rápida es usar <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>1</kbd> para saltar directamente a la primera pestaña y luego presionar <kbd>Enter</kbd> para aceptar la URL ingresada.

![](/_img/rcs/05.png)

Espera hasta que tu página haya terminado de cargar o el buffer esté lleno, luego “Detén” la grabación.

![](/_img/rcs/06.png)

Busca una sección de “Renderer” que contenga el título de la página web de la pestaña registrada. La forma más sencilla de hacerlo es haciendo clic en “Procesos”, luego haciendo clic en “Ninguno” para desmarcar todas las entradas y luego seleccionando solo el renderer que te interesa.

![](/_img/rcs/07.png)

Selecciona los eventos/slices del trace presionando <kbd>Shift</kbd> y arrastrando. Asegúrate de cubrir _todas_ las secciones, incluidas `CrRendererMain` y cualquier `ThreadPoolForegroundWorker`. Aparece una tabla con todos los slices seleccionados en la parte inferior.

![](/_img/rcs/08.png)

Desplázate hacia la parte superior derecha de la tabla y haz clic en el enlace junto a “Tabla de estadísticas de llamadas en tiempo de ejecución”.

![](/_img/rcs/09.png)

En la vista que aparece, desplázate hacia la parte inferior para ver una tabla detallada de dónde gasta su tiempo V8.

![](/_img/rcs/10.png)

Al abrir una categoría puedes profundizar aún más en los datos.

![](/_img/rcs/11.png)

## Interfaz de línea de comandos

Ejecuta [`d8`](/docs/d8) con `--runtime-call-stats` para obtener métricas RCS desde la línea de comandos:

```bash
d8 --runtime-call-stats foo.js
```
