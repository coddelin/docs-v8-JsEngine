---
title: &apos;Compilación cruzada para iOS&apos;
description: &apos;Este documento explica cómo compilar V8 para iOS utilizando compilación cruzada.&apos;
---
Esta página sirve como una breve introducción para construir V8 para objetivos iOS.

## Requisitos

- Una máquina con macOS (OS X) con Xcode instalado.
- Un dispositivo iOS de 64 bits (los dispositivos iOS de 32 bits no son compatibles).
- V8 v7.5 o una versión más reciente.
- jitless es un requisito fundamental para iOS (desde diciembre de 2020). Por lo tanto, por favor, utilice las banderas &apos;--expose_gc --jitless&apos;

## Configuración inicial

Siga [las instrucciones para construir V8](/docs/build).

Obtenga herramientas adicionales necesarias para la compilación cruzada de iOS agregando `target_os` en su archivo de configuración `.gclient`, ubicado en el directorio padre del directorio fuente de `v8`:

```python
# [... otros contenidos de .gclient como la variable &apos;solutions&apos; ...]
target_os = [&apos;ios&apos;]
```

Después de actualizar `.gclient`, ejecute `gclient sync` para descargar las herramientas adicionales.

## Construcción manual

Esta sección muestra cómo construir una versión monolítica de V8 para su uso en un dispositivo iOS físico o en el simulador de iOS de Xcode. El resultado de esta compilación es un archivo `libv8_monolith.a` que contiene todas las bibliotecas de V8 y el snapshot de V8.

Configure los archivos de construcción GN ejecutando `gn args out/release-ios` e insertando las siguientes claves:

```python
ios_deployment_target = 10
is_component_build = false
is_debug = false
target_cpu = "arm64"                  # "x64" para una compilación en el simulador.
target_os = "ios"
use_custom_libcxx = false             # Usa la libcxx de Xcode.
v8_enable_i18n_support = false        # Produce un binario más pequeño.
v8_monolithic = true                  # Activa el objetivo v8_monolith.
v8_use_external_startup_data = false  # El snapshot está incluido en el binario.
v8_enable_pointer_compression = false # No es compatible con iOS.
```

Ahora construya:

```bash
ninja -C out/release-ios v8_monolith
```

Finalmente, agregue el archivo generado `libv8_monolith.a` a su proyecto de Xcode como una biblioteca estática. Para más documentación sobre cómo integrar V8 en su aplicación, consulte [Primeros pasos para integrar V8](/docs/embed).
