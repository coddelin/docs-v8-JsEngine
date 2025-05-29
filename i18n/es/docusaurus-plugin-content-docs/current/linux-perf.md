---
title: 'Integración de `perf` en Linux de V8'
description: 'Este documento explica cómo analizar el rendimiento del código generado por JIT de V8 utilizando la herramienta `perf` de Linux.'
---
V8 tiene soporte integrado para la herramienta `perf` de Linux. Se habilita mediante las opciones de línea de comandos `--perf-prof`.
V8 escribe datos de rendimiento durante la ejecución en un archivo que puede ser utilizado para analizar el rendimiento del código generado por JIT de V8 (incluidos los nombres de las funciones de JS) con la herramienta `perf` de Linux.

## Requisitos

- Versión 5 o superior de `linux-perf` (las versiones anteriores no tienen soporte para jit). (Ver instrucciones al [final](#build-perf))
- Construir V8/Chrome con `enable_profiling=true` para obtener un mejor código C++ simbolizado.

## Construcción de V8

Para usar la integración de V8 con `perf` de Linux, necesitas construirlo con la bandera gn `enable_profiling = true`:

```bash
echo 'enable_profiling = true' >> out/x64.release/args.gn
autoninja -C out/x64.release
```

## Perfilando `d8` con [`linux-perf-d8.py`](https://source.chromium.org/search?q=linux-perf-d8.py)

Después de construir `d8`, puedes comenzar a usar `perf` en Linux:

```bash
tools/profiling/linux-perf-d8.py out/x64.release/d8 path/to/test.js;
```

Un ejemplo más completo:

```bash
echo '(function f() {
    var s = 0; for (var i = 0; i < 1000000000; i++) { s += i; } return s;
  })();' > test.js;

# Usar banderas personalizadas de V8 y un directorio de salida separado para menos desorden:
mkdir perf_results
tools/profiling/linux-perf-d8.py --perf-data-dir=perf_results \
    out/x64.release/d8 --expose-gc --allow-natives-syntax test.js;

# Interfaz visual (`-flame` es solo para empleados de Google, usar `-web` como alternativa pública):
pprof -flame perf_results/XXX_perf.data.jitted;
# Herramienta basada en terminal:
perf report -i perf_results/XXX_perf.data.jitted;
```

Revisa `linux-perf-d8.py --help` para más detalles. Ten en cuenta que puedes usar todas las banderas de `d8` después del argumento binario de `d8`.


## Perfilando Chrome o content_shell con [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py)

1. Puedes usar el script [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py) para perfilar Chrome. Asegúrate de agregar las [banderas gn necesarias de Chrome](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup) para obtener símbolos adecuados de C++.

1. Una vez que tu construcción esté lista, puedes perfilar un sitio web con símbolos completos para el código C++ y JS.

    ```bash
    mkdir perf_results;
    tools/profiling/linux-perf-chrome.py out/x64.release/chrome \
        --perf-data-dir=perf_results --timeout=30
    ```

1. Navega a tu sitio web y luego cierra el navegador (o espera a que se complete el `--timeout`)
1. Después de salir del navegador, `linux-perf.py` procesará los archivos y mostrará una lista con un archivo de resultado para cada proceso del renderizador:

   ```
   chrome_renderer_1583105_3.perf.data.jitted      19.79MiB
   chrome_renderer_1583105_2.perf.data.jitted       8.59MiB
   chrome_renderer_1583105_4.perf.data.jitted       0.18MiB
   chrome_renderer_1583105_1.perf.data.jitted       0.16MiB
   ```

## Explorando los resultados de `linux-perf`

Finalmente puedes usar la herramienta `perf` de Linux para explorar el perfil de un proceso renderizador de d8 o Chrome:

```bash
perf report -i perf_results/XXX_perf.data.jitted
```

También puedes usar [pprof](https://github.com/google/pprof) para generar más visualizaciones:

```bash
# Nota: `-flame` es solo para empleados de Google, usar `-web` como alternativa pública:
pprof -flame perf_results/XXX_perf.data.jitted;
```

## Uso a bajo nivel de `linux-perf`

### Usando `linux-perf` directamente con `d8`

Dependiendo de tu caso de uso, es posible que prefieras usar `linux-perf` directamente con `d8`.
Esto requiere un proceso de dos pasos, primero `perf record` crea un archivo `perf.data` que luego debe ser procesado con `perf inject` para inyectar los símbolos de JS.

``` bash
perf record --call-graph=fp --clockid=mono --freq=max \
    --output=perf.data
    out/x64.release/d8 \
      --perf-prof --no-write-protect-code-memory \
      --interpreted-frames-native-stack \
    test.js;
perf inject --jit --input=perf.data --output=perf.data.jitted;
perf report --input=perf.data.jitted;
```

### Banderas de `linux-perf` de V8

[`--perf-prof`](https://source.chromium.org/search?q=FLAG_perf_prof) se usa en la línea de comandos de V8 para registrar muestras de rendimiento en el código JIT.

[`--nowrite-protect-code-memory`](https://source.chromium.org/search?q=FLAG_nowrite_protect_code_memory) se requiere para deshabilitar la protección de escritura para la memoria de código. Esto es necesario porque `perf` descarta información sobre páginas de código cuando detecta el evento correspondiente a la eliminación del bit de escritura de la página de código. Aquí hay un ejemplo que registra muestras de un archivo de prueba de JavaScript:

[`--interpreted-frames-native-stack`](https://source.chromium.org/search?q=FLAG_interpreted_frames_native_stack) se utiliza para crear diferentes puntos de entrada (versiones copiadas de InterpreterEntryTrampoline) para funciones interpretadas para que puedan ser diferenciadas por `perf` únicamente basado en la dirección. Dado que el InterpreterEntryTrampoline tiene que ser copiado, esto implica una ligera regresión en rendimiento y memoria.


### Usando linux-perf directamente con Chrome

1. Puede usar las mismas banderas de V8 para perfilar Chrome en sí. Siga las instrucciones anteriores para obtener las banderas correctas de V8 y agregue las [banderas necesarias de gn para Chrome](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup) a su compilación de Chrome.

1. Una vez que su compilación esté lista, puede perfilar un sitio web con símbolos completos tanto para código C++ como JS.

    ```bash
    out/x64.release/chrome \
        --user-data-dir=`mktemp -d` \
        --no-sandbox --incognito --enable-benchmarking \
        --js-flags='--perf-prof --no-write-protect-code-memory --interpreted-frames-native-stack'
    ```

1. Después de iniciar Chrome, encuentre el ID del proceso de renderizador utilizando el Administrador de Tareas y úselo para comenzar a perfilar:

    ```bash
    perf record -g -k mono -p $RENDERER_PID -o perf.data
    ```

1. Navegue a su sitio web y luego continúe con la siguiente sección sobre cómo evaluar el resultado de perf.

1. Después de que la ejecución termine, combine la información estática recopilada por la herramienta `perf` con las muestras de rendimiento generadas por V8 para código JIT:

   ```bash
   perf inject --jit --input=perf.data --output=perf.data.jitted
   ```

1. Finalmente, puede usar la herramienta Linux `perf` [para explorar](#Explore-linux-perf-results)

## Compilar `perf`

Si tiene un kernel de Linux desactualizado, puede compilar linux-perf con soporte jit localmente.

- Instale un nuevo kernel de Linux y luego reinicie su máquina:

  ```bash
   sudo apt-get install linux-generic-lts-wily;
  ```

- Instale dependencias:

  ```bash
  sudo apt-get install libdw-dev libunwind8-dev systemtap-sdt-dev libaudit-dev \
     libslang2-dev binutils-dev liblzma-dev;
  ```

- Descargue los fuentes del kernel que incluyen la última fuente de la herramienta `perf`:

  ```bash
  cd some/directory;
  git clone --depth 1 git://git.kernel.org/pub/scm/linux/kernel/git/tip/tip.git;
  cd tip/tools/perf;
  make
  ```

En los pasos siguientes, invoque `perf` como `some/director/tip/tools/perf/perf`.
