---
title: 'Compilación cruzada y depuración para ARM/Android'
description: 'Este documento explica cómo compilar V8 cruzadamente para ARM/Android y cómo depurarlo.'
---
Primero, asegúrate de poder [compilar con GN](/docs/build-gn).

Luego, agrega `android` a tu archivo de configuración `.gclient`.

```python
target_os = ['android']  # Agrega esto para que se descarguen los elementos de Android.
```

El campo `target_os` es una lista, así que si también estás construyendo en unix se verá así:

```python
target_os = ['android', 'unix']  # Múltiples sistemas operativos objetivo.
```

Ejecuta `gclient sync`, y obtendrás un gran checkout en `./third_party/android_tools`.

Habilita el modo de desarrollador en tu teléfono o tablet y activa la depuración USB siguiendo las instrucciones [aquí](https://developer.android.com/studio/run/device.html). También, coloca la práctica herramienta [`adb`](https://developer.android.com/studio/command-line/adb.html) en tu path. Está en tu checkout en `./third_party/android_sdk/public/platform-tools`.

## Usando `gm`

Usa [el script `tools/dev/gm.py`](/docs/build-gn#gm) para construir automáticamente las pruebas de V8 y ejecutarlas en el dispositivo.

```bash
alias gm=/path/to/v8/tools/dev/gm.py
gm android_arm.release.check
```

Este comando envía los binarios y pruebas al directorio `/data/local/tmp/v8` en el dispositivo.

## Construcción manual

Usa `v8gen.py` para generar una construcción de lanzamiento o depuración ARM:

```bash
tools/dev/v8gen.py arm.release
```

Luego ejecuta `gn args out.gn/arm.release` y asegúrate de tener las siguientes claves:

```python
target_os = "android"      # Estas líneas deben ser cambiadas manualmente
target_cpu = "arm"         # ya que v8gen.py asume una construcción de simulador.
v8_target_cpu = "arm"
is_component_build = false
```

Las claves deben ser las mismas para construcciones de depuración. Si estás construyendo para un dispositivo arm64 como el Pixel C, que admite binarios de 32 y 64 bits, las claves deben verse así:

```python
target_os = "android"      # Estas líneas deben ser cambiadas manualmente
target_cpu = "arm64"       # ya que v8gen.py asume una construcción de simulador.
v8_target_cpu = "arm64"
is_component_build = false
```

Ahora construye:

```bash
ninja -C out.gn/arm.release d8
```

Usa `adb` para copiar los archivos binarios y de snapshot al teléfono:

```bash
adb shell 'mkdir -p /data/local/tmp/v8/bin'
adb push out.gn/arm.release/d8 /data/local/tmp/v8/bin
adb push out.gn/arm.release/icudtl.dat /data/local/tmp/v8/bin
adb push out.gn/arm.release/snapshot_blob.bin /data/local/tmp/v8/bin
```

```bash
rebuffat:~/src/v8$ adb shell
bullhead:/ $ cd /data/local/tmp/v8/bin
bullhead:/data/local/tmp/v8/bin $ ls
v8 icudtl.dat snapshot_blob.bin
bullhead:/data/local/tmp/v8/bin $ ./d8
Versión V8 5.8.0 (candidato)
d8> '¡w00t!'
"¡w00t!"
d8>
```

## Depuración

### d8

La depuración remota de `d8` en un dispositivo Android es relativamente sencilla. Primero inicia `gdbserver` en el dispositivo Android:

```bash
bullhead:/data/local/tmp/v8/bin $ gdbserver :5039 $D8 <argumentos>
```

Luego conéctate al servidor en tu dispositivo host.

```bash
adb forward tcp:5039 tcp:5039
gdb $D8
gdb> target remote :5039
```

`gdb` y `gdbserver` deben ser compatibles entre sí. En caso de duda, usa los binarios del [NDK de Android](https://developer.android.com/ndk). Ten en cuenta que, por defecto, el binario `d8` está reducido (información de depuración eliminada), aunque `$OUT_DIR/exe.unstripped/d8` contiene el binario sin reducción.

### Registro

Por defecto, algunos de los mensajes de depuración de `d8` terminan en el registro del sistema Android, que se puede volcar utilizando [`logcat`](https://developer.android.com/studio/command-line/logcat). Desafortunadamente, a veces una parte de un mensaje de depuración en particular se divide entre el registro del sistema y `adb`, y a veces alguna parte parece estar completamente desaparecida. Para evitar estos problemas, se recomienda agregar el siguiente ajuste a los `gn args`:

```python
v8_android_log_stdout = true
```

### Problemas de punto flotante

El ajuste de `gn args` `arm_float_abi = "hard"`, que es utilizado por el bot de Stress GC de V8 Arm, puede resultar en comportamientos completamente sin sentido del programa en hardware diferente al que utiliza el bot de Stress GC (por ejemplo, en Nexus 7).

## Usando Sourcery G++ Lite

El paquete de compilador cruzado Sourcery G++ Lite es una versión gratuita de Sourcery G++ de [CodeSourcery](http://www.codesourcery.com/). Hay una página para la [Toolchain de GNU para procesadores ARM](http://www.codesourcery.com/sgpp/lite/arm). Determina la versión que necesitas para tu combinación host/objetivo.

Las siguientes instrucciones utilizan [2009q1-203 para ARM GNU/Linux](http://www.codesourcery.com/sgpp/lite/arm/portal/release858), y si utilizas una versión diferente, cambia las URLs y `TOOL_PREFIX` abajo en consecuencia.

### Instalación en host y objetivo

La forma más simple de configurar esto es instalar el paquete completo Sourcery G++ Lite tanto en el host como en el objetivo en el mismo lugar. Esto asegurará que todas las librerías necesarias estén disponibles en ambos lados. Si deseas utilizar las librerías por defecto en el host, no es necesario instalar nada en el objetivo.

El siguiente script se instala en `/opt/codesourcery`:

```bash
#!/bin/sh

sudo mkdir /opt/codesourcery
cd /opt/codesourcery
sudo chown "$USERNAME" .
chmod g+ws .
umask 2
wget http://www.codesourcery.com/sgpp/lite/arm/portal/package4571/public/arm-none-linux-gnueabi/arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
tar -xvf arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
```

## Perfil

- Compila un binario, cópialo al dispositivo, guarda una copia en el host:

    ```bash
    adb shell cp /data/local/tmp/v8/bin/d8 /data/local/tmp/v8/bin/d8-version.under.test
    cp out.gn/arm.release/d8 ./d8-version.under.test
    ```

- Obtén un registro de perfiles y cópialo al host:

    ```bash
    adb push benchmarks /data/local/tmp
    adb shell cd /data/local/tmp/benchmarks; ../v8/bin/d8-version.under.test run.js --prof
    adb shell /data/local/tmp/v8/bin/d8-version.under.test benchmark.js --prof
    adb pull /data/local/tmp/benchmarks/v8.log ./
    ```

- Abre `v8.log` en tu editor favorito y edita la primera línea para que coincida con la ruta completa del binario `d8-version.under.test` en tu estación de trabajo (en lugar de la ruta `/data/local/tmp/v8/bin/` que tenía en el dispositivo)

- Ejecuta el procesador de ticks con el `d8` del host y un binario `nm` apropiado:

    ```bash
    cp out/x64.release/d8 .  # solo es necesario una vez
    cp out/x64.release/natives_blob.bin .  # solo es necesario una vez
    cp out/x64.release/snapshot_blob.bin .  # solo es necesario una vez
    tools/linux-tick-processor --nm=$(pwd)/third_party/android_ndk/toolchains/arm-linux-androideabi-4.9/prebuilt/linux-x86_64/bin/arm-linux-androideabi-nm
    ```
