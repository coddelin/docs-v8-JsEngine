---
title: 'Construir V8 con GN'
description: 'Este documento explica cómo usar GN para construir V8.'
---
V8 se construye con la ayuda de [GN](https://gn.googlesource.com/gn/+/master/docs/). GN es un sistema de compilación meta, ya que genera archivos de compilación para varios otros sistemas de compilación. Por lo tanto, cómo lo construyas depende del sistema de compilación y el compilador que estés utilizando.
Las instrucciones a continuación asumen que ya tienes una [copia de V8](/docs/source-code) y que has [instalado las dependencias de construcción](/docs/build).

Se puede encontrar más información sobre GN en [la documentación de Chromium](https://www.chromium.org/developers/gn-build-configuration) o [los propios documentos de GN](https://gn.googlesource.com/gn/+/master/docs/).

Construir V8 desde la fuente implica tres pasos:

1. Generar los archivos de compilación
1. Compilar
1. Ejecutar pruebas

Hay dos flujos de trabajo para construir V8:

- El flujo de trabajo conveniente utilizando un script auxiliar llamado `gm` que combina los tres pasos de manera práctica
- El flujo de trabajo manual, donde ejecutas comandos separados manualmente para cada paso

## Construir V8 utilizando `gm` (el flujo de trabajo conveniente)

`gm` es un script integral que genera los archivos de compilación, activa la construcción y opcionalmente también ejecuta las pruebas. Se puede encontrar en `tools/dev/gm.py` en tu copia de V8. Recomendamos agregar un alias a la configuración de tu shell:

```bash
alias gm=/path/to/v8/tools/dev/gm.py
```

Luego puedes usar `gm` para construir V8 con configuraciones conocidas, como `x64.release`:

```bash
gm x64.release
```

Para ejecutar las pruebas inmediatamente después de la construcción, ejecuta:

```bash
gm x64.release.check
```

`gm` muestra todos los comandos que está ejecutando, lo que facilita seguirlos y reejecutarlos si es necesario.

`gm` permite construir los binarios requeridos y ejecutar pruebas específicas con un solo comando:

```bash
gm x64.debug mjsunit/foo cctest/test-bar/*
```

## Construir V8: el flujo de trabajo manual

### Paso 1: generar archivos de compilación

Hay varias formas de generar los archivos de compilación:

1. El flujo de trabajo manual directo implica usar `gn` directamente.
1. Un script auxiliar llamado `v8gen` simplifica el proceso para configuraciones comunes.

#### Generar archivos de compilación utilizando `gn`

Genera los archivos de compilación para el directorio `out/foo` utilizando `gn`:

```bash
gn args out/foo
```

Esto abre una ventana del editor para especificar los [argumentos de `gn`](https://gn.googlesource.com/gn/+/master/docs/reference.md). Alternativamente, puedes pasar los argumentos por la línea de comandos:

```bash
gn gen out/foo --args='is_debug=false target_cpu="x64" v8_target_cpu="arm64" use_goma=true'
```

Esto genera archivos de compilación para compilar V8 con el simulador arm64 en modo de liberación utilizando `goma` para la compilación.

Para obtener una visión general de todos los argumentos disponibles de `gn`, ejecuta:

```bash
gn args out/foo --list
```

#### Generar archivos de compilación utilizando `v8gen`

El repositorio de V8 incluye un script auxiliar `v8gen` para generar fácilmente archivos de compilación para configuraciones comunes. Recomendamos agregar un alias a la configuración de tu shell:

```bash
alias v8gen=/path/to/v8/tools/dev/v8gen.py
```

Ejecuta `v8gen --help` para obtener más información.

Lista las configuraciones disponibles (o bots de un maestro):

```bash
v8gen list
```

```bash
v8gen list -m client.v8
```

Construye como un bot particular del flujo `client.v8` en la carpeta `foo`:

```bash
v8gen -b 'V8 Linux64 - debug builder' -m client.v8 foo
```

### Paso 2: compilar V8

Para compilar todo V8 (asumiendo que `gn` generó en la carpeta `x64.release`), ejecuta:

```bash
ninja -C out/x64.release
```

Para compilar objetivos específicos como `d8`, agrégalos al comando:

```bash
ninja -C out/x64.release d8
```

### Paso 3: ejecutar pruebas

Puedes pasar el directorio de salida al controlador de pruebas. Otros parámetros relevantes se infieren de la compilación:

```bash
tools/run-tests.py --outdir out/foo
```

También puedes probar tu compilación recientemente hecha (en `out.gn`):

```bash
tools/run-tests.py --gn
```

**¿Problemas de compilación? Reporta un error en [v8.dev/bug](/bug) o solicita ayuda en <v8-users@googlegroups.com>.**
