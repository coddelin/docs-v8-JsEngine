---
title: "Compilación en Linux Arm64"
description: "Consejos y trucos para compilar V8 nativamente en Linux Arm64"
---
Si has seguido las instrucciones sobre cómo [revisar](/docs/source-code) y [compilar](/docs/build-gn) V8 en una máquina que no sea x86 ni un Mac con Apple Silicon, es posible que hayas encontrado algunos problemas, debido a que el sistema de compilación descarga binarios nativos y luego no puede ejecutarlos. Sin embargo, aunque usar una máquina Linux Arm64 para trabajar en V8 __no está oficialmente soportado__, superar esos obstáculos es bastante sencillo.

## Evitar `vpython`

`fetch v8`, `gclient sync` y otros comandos de `depot_tools` utilizan un envoltorio de python llamado "vpython". Si ves errores relacionados con esto, puedes definir la siguiente variable para usar la instalación de python del sistema en su lugar:

```bash
export VPYTHON_BYPASS="manually managed python not supported by chrome operations"
```

## Binario `ninja` compatible

Lo primero es asegurarte de usar un binario nativo para `ninja`, que elegimos en lugar del que está en `depot_tools`. Una forma sencilla de hacerlo es ajustar tu PATH de la siguiente manera al instalar `depot_tools`:

```bash
export PATH=$PATH:/path/to/depot_tools
```

De esta manera, podrás usar la instalación de `ninja` de tu sistema, dado que probablemente esté disponible. Aunque si no lo está, puedes [compilarlo desde el código fuente](https://github.com/ninja-build/ninja#building-ninja-itself).

## Compilar clang

Por defecto, V8 querrá usar su propia compilación de clang que puede no ejecutarse en tu máquina. Podrías ajustar los argumentos de GN para [usar el clang o GCC del sistema](#system_clang_gcc), sin embargo, es posible que prefieras usar el mismo clang que el del upstream, ya que será la versión más soportada.

Puedes compilarlo localmente directamente desde el checkout de V8:

```bash
./tools/clang/scripts/build.py --without-android --without-fuchsia \
                               --host-cc=gcc --host-cxx=g++ \
                               --gcc-toolchain=/usr \
                               --use-system-cmake --disable-asserts
```

## Configuración manual de argumentos GN

Los scripts de conveniencia pueden no funcionar por defecto. En su lugar, tendrás que configurar manualmente los argumentos GN siguiendo el flujo de trabajo [manual](/docs/build-gn#gn). Puedes obtener las configuraciones habituales "release", "optdebug" y "debug" con los siguientes argumentos:

- `release`

```bash
is_debug=false
```

- `optdebug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
```

- `debug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
v8_optimized_debug=false
```

## Usar el clang o GCC del sistema

Compilar con GCC es solo cuestión de deshabilitar la compilación con clang:

```bash
is_clang=false
```

Ten en cuenta que por defecto, V8 vinculará usando `lld`, lo cual requiere una versión reciente de GCC. Puedes usar `use_lld=false` para cambiar al linker gold, o adicionalmente usar `use_gold=false` para usar `ld`.

Si prefieres usar el clang que está instalado en tu sistema, por ejemplo en `/usr`, puedes usar los siguientes argumentos:

```bash
clang_base_path="/usr"
clang_use_chrome_plugins=false
```

Sin embargo, dado que la versión de clang del sistema puede no estar bien soportada, es probable que tengas que lidiar con advertencias, como banderas del compilador desconocidas. En este caso, es útil dejar de tratar las advertencias como errores con:

```bash
treat_warnings_as_errors=false
```
