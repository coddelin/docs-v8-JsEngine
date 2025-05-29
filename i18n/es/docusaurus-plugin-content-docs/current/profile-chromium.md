---
title: 'Perfilando Chromium con V8'
description: 'Este documento explica cómo usar los perfiles de CPU y heap de V8 con Chromium.'
---
[Los perfiles de CPU y heap de V8](/docs/profile) son muy fáciles de usar desde los shells de V8, pero puede parecer confuso cómo utilizarlos con Chromium. Esta página debería ayudarte con eso.

## ¿Por qué es diferente usar los perfiles de V8 con Chromium en lugar de usarlos con los shells de V8?

Chromium es una aplicación compleja, a diferencia de los shells de V8. A continuación, se enumeran las características de Chromium que afectan el uso de los perfiles:

- cada proceso de renderizado es un proceso separado (bueno, en realidad no cada uno, pero omitamos este detalle), por lo que no pueden compartir el mismo archivo de registro;
- la sandbox construida alrededor del proceso de renderizado le impide escribir en el disco;
- las herramientas de desarrollo configuran los perfiles para sus propios propósitos;
- el código de registro de V8 contiene algunas optimizaciones para simplificar las verificaciones del estado de registro.

## ¿Cómo ejecutar Chromium para obtener un perfil de CPU?

Aquí está cómo ejecutar Chromium para obtener un perfil de CPU desde el inicio del proceso:

```bash
./Chromium --no-sandbox --user-data-dir=`mktemp -d` --incognito --js-flags='--prof'
```

Ten en cuenta que no verás los perfiles en las herramientas de desarrollo, porque todos los datos se registran en un archivo, no en las herramientas de desarrollo.

### Descripción de los flags

`--no-sandbox` desactiva la sandbox del renderizador para que Chrome pueda escribir en el archivo de registro.

`--user-data-dir` se usa para crear un perfil nuevo; usa esto para evitar cachés y posibles efectos secundarios de extensiones instaladas (opcional).

`--incognito` se utiliza para prevenir aún más la contaminación de tus resultados (opcional).

`--js-flags` contiene los flags pasados a V8:

- `--logfile=%t.log` especifica un patrón de nombre para los archivos de registro. `%t` se expande al tiempo actual en milisegundos, de modo que cada proceso obtiene su propio archivo de registro. Puedes usar prefijos y sufijos si lo deseas, como este: `prefijo-%t-sufijo.log`. Por defecto, cada isolate obtiene un archivo de registro separado.
- `--prof` indica a V8 que escriba información de perfil estadístico en el archivo de registro.

## Android

Chrome en Android tiene una serie de puntos únicos que lo hacen un poco más complejo de perfilar.

- La línea de comandos debe escribirse a través de `adb` antes de iniciar Chrome en el dispositivo. Como resultado, a veces se pierden las comillas en la línea de comandos, y es mejor separar los argumentos en `--js-flags` con una coma en lugar de intentar usar espacios y comillas.
- La ruta para el archivo de registro debe especificarse como una ruta absoluta a un lugar que sea grabable en el sistema de archivos de Android.
- El sandboxing utilizado para los procesos de renderizado en Android significa que incluso con `--no-sandbox`, el proceso de renderizado todavía no puede escribir en los archivos del sistema de archivos, por lo tanto, se necesita pasar `--single-process` para ejecutar el renderizador en el mismo proceso que el proceso del navegador.
- El `.so` está incrustado en el APK de Chrome, lo que significa que la simbolización necesita convertir de direcciones de memoria APK al archivo `.so` despojado en las builds.

Los siguientes comandos habilitan el perfilado en Android:

```bash
./build/android/adb_chrome_public_command_line --no-sandbox --single-process --js-flags='--logfile=/storage/emulated/0/Download/%t.log,--prof'
<Cierra y vuelve a iniciar Chrome en el dispositivo Android>
adb pull /storage/emulated/0/Download/<archivo_log>
./src/v8/tools/linux-tick-processor --apk-embedded-library=out/Release/lib.unstripped/libchrome.so --preprocess <archivo_log>
```

## Notas

En Windows, asegúrate de activar la creación de archivos `.MAP` para `chrome.dll`, pero no para `chrome.exe`.
