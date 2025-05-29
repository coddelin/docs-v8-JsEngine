---
title: 'Rastreando V8'
description: 'Este documento explica cómo utilizar el soporte de rastreo integrado de V8.'
---
V8 ofrece soporte para rastreo. [Funciona automáticamente cuando V8 está integrado en Chrome a través del sistema de rastreo de Chrome](/docs/rcs). Pero también puedes habilitarlo en cualquier V8 independiente o dentro de un incrustador que use la Plataforma Predeterminada. Se pueden encontrar más detalles sobre el visualizador de rastreo [aquí](https://github.com/catapult-project/catapult/blob/master/tracing/README.md).

## Rastreo en `d8`

Para comenzar el rastreo, utiliza la opción `--enable-tracing`. V8 genera un archivo `v8_trace.json` que puedes abrir en Chrome. Para abrirlo en Chrome, ve a `chrome://tracing`, haz clic en “Cargar” y luego carga el archivo `v8-trace.json`.

Cada evento de rastreo está asociado con un conjunto de categorías; puedes habilitar/deshabilitar la grabación de eventos de rastreo según sus categorías. Con solo la bandera anterior, habilitamos únicamente las categorías predeterminadas (un conjunto de categorías que tienen un bajo costo). Para habilitar más categorías y tener un control más preciso de los diferentes parámetros, necesitas pasar un archivo de configuración.

Aquí hay un ejemplo de un archivo de configuración `traceconfig.json`:

```json
{
  "record_mode": "record-continuously",
  "included_categories": ["v8", "disabled-by-default-v8.runtime_stats"]
}
```

Un ejemplo de cómo llamar a `d8` con rastreo y un archivo de configuración de rastreo:

```bash
d8 --enable-tracing --trace-config=traceconfig.json
```

El formato de configuración de rastreo es compatible con el del Rastreo de Chrome; sin embargo, no admitimos expresiones regulares en la lista de categorías incluidas, y V8 no necesita una lista de categorías excluidas. Así, el archivo de configuración de rastreo para V8 puede reutilizarse en el rastreo de Chrome, pero no puedes reutilizar el archivo de configuración de rastreo de Chrome en el rastreo V8 si contiene expresiones regulares. Además, V8 ignora la lista de categorías excluidas.

## Habilitar estadísticas de llamadas de tiempo de ejecución en el rastreo

Para obtener estadísticas de llamadas de tiempo de ejecución (<abbr>RCS</abbr>), graba el rastreo con las siguientes dos categorías habilitadas: `v8` y `disabled-by-default-v8.runtime_stats`. Cada evento de nivel superior de rastreo de V8 contiene las estadísticas de tiempo de ejecución para el período de ese evento. Al seleccionar cualquiera de esos eventos en `trace-viewer`, la tabla de estadísticas de tiempo de ejecución se muestra en el panel inferior. Seleccionar múltiples eventos crea una vista combinada.

![](/_img/docs/trace/runtime-stats.png)

## Habilitar estadísticas de objetos de GC en el rastreo

Para obtener las estadísticas de objetos de GC en el rastreo, necesitas recopilar un rastreo con la categoría `disabled-by-default-v8.gc_stats` habilitada y también usar los siguientes `--js-flags`:

```
--track_gc_object_stats --noincremental-marking
```

Una vez que cargues el rastreo en `trace-viewer`, busca segmentos denominados: `V8.GC_Object_Stats`. Las estadísticas aparecen en el panel inferior. Seleccionar múltiples segmentos crea una vista combinada.

![](/_img/docs/trace/gc-stats.png)
