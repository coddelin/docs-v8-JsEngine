---
title: 'Construcción de V8 desde código fuente'
description: 'Este documento explica cómo construir V8 desde código fuente.'
---
Para poder construir V8 desde cero en Windows/Linux/macOS para x64, sigue los siguientes pasos.

## Obtener el código fuente de V8

Sigue las instrucciones en nuestra guía sobre [cómo obtener el código fuente de V8](/docs/source-code).

## Instalación de dependencias de construcción

1. Para macOS: instala Xcode y acepta su acuerdo de licencia. (Si has instalado las herramientas de línea de comandos por separado, [elimínalas primero](https://bugs.chromium.org/p/chromium/issues/detail?id=729990#c1).)

1. Asegúrate de estar en el directorio del código fuente de V8. Si seguiste cada paso en la sección anterior, ya estás en la ubicación correcta.

1. Descarga todas las dependencias de construcción:

   ```bash
   gclient sync
   ```

   Para Googlers - Si ves errores como Failed to fetch file o Login required al ejecutar los hooks, intenta autenticarte primero con Google Storage ejecutando:

   ```bash
   gsutil.py config
   ```

   Inicia sesión con tu cuenta @google.com y ingresa `0` cuando se te pida un ID de proyecto.

1. Este paso solo es necesario en Linux. Instala dependencias de construcción adicionales:

    ```bash
    ./build/install-build-deps.sh
    ```

## Construcción de V8

1. Asegúrate de estar en el directorio del código fuente de V8 en la rama `main`.

    ```bash
    cd /path/to/v8
    ```

1. Extrae los últimos cambios e instala cualquier nueva dependencia de construcción:

    ```bash
    git pull && gclient sync
    ```

1. Compila el código fuente:

    ```bash
    tools/dev/gm.py x64.release
    ```

    O, para compilar el código fuente e inmediatamente ejecutar las pruebas:

    ```bash
    tools/dev/gm.py x64.release.check
    ```

    Para más información sobre el script auxiliar `gm.py` y los comandos que desencadena, consulta [Construcción con GN](/docs/build-gn).
