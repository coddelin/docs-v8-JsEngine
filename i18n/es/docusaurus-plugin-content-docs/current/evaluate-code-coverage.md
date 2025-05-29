---
title: 'Evaluando la cobertura del código'
description: 'Este documento explica qué hacer si estás trabajando en un cambio en V8 y deseas evaluar su cobertura de código.'
---
Estás trabajando en un cambio. Deseas evaluar la cobertura de código para tu nuevo código.

V8 proporciona dos herramientas para hacerlo: localmente, en tu máquina; y soporte para infraestructura de compilación.

## Local

Relativo a la raíz del repositorio de v8, utiliza `./tools/gcov.sh` (probado en Linux). Esto utiliza las herramientas de cobertura de código de GNU y algunos scripts para producir un informe en HTML, donde puedes profundizar en la información de cobertura por directorio, archivo y luego hasta la línea de código.

El script compila V8 en un directorio separado `out`, usando configuraciones de `gcov`. Usamos un directorio separado para evitar sobreescribir tus configuraciones normales de compilación. Este directorio separado se llama `cov` — se crea inmediatamente bajo la raíz del repositorio. Luego, `gcov.sh` ejecuta el conjunto de pruebas y produce el informe. La ruta al informe se proporciona cuando el script finaliza.

Si tu cambio tiene componentes específicos de arquitectura, puedes recopilar de manera acumulativa la cobertura de ejecuciones específicas para cada arquitectura.

```bash
./tools/gcov.sh x64 arm
```

Esto recompila en el lugar para cada arquitectura, sobrescribiendo los binarios de la ejecución anterior, pero preservando y acumulando los resultados de cobertura.

De manera predeterminada, el script recopila cobertura de ejecuciones en `Release`. Si deseas `Debug`, puedes especificarlo:

```bash
BUILD_TYPE=Debug ./tools/gcov.sh x64 arm arm64
```

Ejecutar el script sin opciones también proporcionará un resumen de las opciones disponibles.

## Bot de cobertura de código

Para cada cambio que se ha integrado, ejecutamos un análisis de cobertura x64 — consulta el [bot de cobertura](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Linux64%20-%20gcov%20coverage). No ejecutamos bots de cobertura para otras arquitecturas.

Para obtener el informe de una ejecución en particular, debes listar los pasos de compilación, encontrar el paso “gsutil coverage report” (hacia el final) y abrir el “informe” bajo ese paso.
