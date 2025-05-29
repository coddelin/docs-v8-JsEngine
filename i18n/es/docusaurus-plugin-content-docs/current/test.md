---
title: "Pruebas"
description: "Este documento explica el marco de pruebas que forma parte del repositorio V8."
---
V8 incluye un marco de prueba que te permite probar el motor. El marco te permite ejecutar tanto nuestros propios conjuntos de pruebas incluidos con el código fuente como otros, como [el conjunto de pruebas Test262](https://github.com/tc39/test262).

## Ejecutando las pruebas de V8

[Usando `gm`](/docs/build-gn#gm), simplemente puedes agregar `.check` a cualquier objetivo de construcción para ejecutar pruebas para él, por ejemplo:

```bash
gm x64.release.check
gm x64.optdebug.check  # recomendado: razonablemente rápido, con DCHECKs.
gm ia32.check
gm release.check
gm check  # compila y prueba todas las plataformas predeterminadas
```

`gm` compila automáticamente cualquier objetivo necesario antes de ejecutar las pruebas. También puedes limitar las pruebas a ejecutar:

```bash
gm x64.release test262
gm x64.debug mjsunit/regress/regress-123
```

Si ya has compilado V8, puedes ejecutar las pruebas manualmente:

```bash
tools/run-tests.py --outdir=out/ia32.release
```

Nuevamente, puedes especificar qué pruebas ejecutar:

```bash
tools/run-tests.py --outdir=ia32.release cctest/test-heap/SymbolTable/* mjsunit/delete-in-eval
```

Ejecuta el script con `--help` para conocer otras opciones.

## Ejecutando más pruebas

El conjunto predeterminado de pruebas a ejecutar no incluye todas las pruebas disponibles. Puedes especificar conjuntos de pruebas adicionales en la línea de comandos de `gm` o `run-tests.py`:

- `benchmarks` (solo para corrección; ¡no produce resultados de referencia!)
- `mozilla`
- `test262`
- `webkit`

## Ejecutando micro-benchmarks

En `test/js-perf-test` tenemos micro-benchmarks para rastrear el rendimiento de las funciones. Hay un ejecutor especial para estas: `tools/run_perf.py`. Ejecútalas así:

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 test/js-perf-test/JSTests.json
```

Si no quieres ejecutar todos los `JSTests`, puedes proporcionar un argumento `filter`:

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 --filter JSTests/TypedArrays test/js-perf-test/JSTests.json
```

## Actualizando las expectativas de prueba del inspector

Después de actualizar tu prueba, es posible que necesites regenerar el archivo de expectativas para ella. Puedes lograr esto ejecutando:

```bash
tools/run-tests.py --regenerate-expected-files --outdir=ia32.release inspector/debugger/set-instrumentation-breakpoint
```

Esto también puede ser útil si deseas averiguar cómo cambió la salida de tu prueba. Primero regenera el archivo esperado utilizando el comando anterior, luego verifica la diferencia con:

```bash
git diff
```

## Actualizando las expectativas de bytecode (rebaselining)

A veces, las expectativas de bytecode pueden cambiar, lo que provoca errores en `cctest`. Para actualizar los archivos dorados, compila `test/cctest/generate-bytecode-expectations` ejecutando:

```bash
gm x64.release generate-bytecode-expectations
```

…y luego actualiza el conjunto predeterminado de entradas pasando el indicador `--rebaseline` al binario generado:

```bash
out/x64.release/generate-bytecode-expectations --rebaseline
```

Los archivos dorados actualizados ahora están disponibles en `test/cctest/interpreter/bytecode_expectations/`.

## Añadiendo una nueva prueba de expectativas de bytecode

1. Añade un nuevo caso de prueba a `cctest/interpreter/test-bytecode-generator.cc` y especifica un archivo dorado con el mismo nombre de prueba.

1. Compila `generate-bytecode-expectations`:

    ```bash
    gm x64.release generate-bytecode-expectations
    ```

1. Ejecuta

    ```bash
    out/x64.release/generate-bytecode-expectations --raw-js testcase.js --output=test/cctest/interpreter/bytecode-expectations/testname.golden
    ```

    donde `testcase.js` contiene el caso de prueba de JavaScript que se agregó a `test-bytecode-generator.cc` y `testname` es el nombre de la prueba definido en `test-bytecode-generator.cc`.
