---
title: "Lista de verificación para el ensayo y envío de características de WebAssembly"
description: "Este documento proporciona listas de verificación de requisitos de ingeniería sobre cuándo ensayar y enviar una característica de WebAssembly en V8."
---
Este documento proporciona listas de verificación de requisitos de ingeniería para el ensayo y envío de características de WebAssembly en V8. Estas listas de verificación están destinadas como una guía y pueden no ser aplicables a todas las características. El proceso de lanzamiento real se describe en el [Proceso de lanzamiento de V8](https://v8.dev/docs/feature-launch-process).

# Ensayo

## Cuándo ensayar una característica de WebAssembly

El [ensayo](https://docs.google.com/document/d/1ZgyNx7iLtRByBtbYi1GssWGefXXciLeADZBR_FxG-hE) de una característica de WebAssembly define el final de su fase de implementación. La fase de implementación se completa cuando se realiza la siguiente lista de verificación:

- La implementación en V8 está completa. Esto incluye:
    - Implementación en TurboFan (si corresponde)
    - Implementación en Liftoff (si corresponde)
    - Implementación en el intérprete (si corresponde)
- Pruebas en V8 están disponibles
- Se han incorporado pruebas de especificación en V8 ejecutando [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh)
- Todas las pruebas de especificación existentes del borrador pasan. Las pruebas de especificación faltantes son desafortunadas pero no deberían bloquear el ensayo.

Tenga en cuenta que el estado del borrador de la característica en el proceso de estandarización no importa para el ensayo de la característica en V8. Sin embargo, el borrador debería ser mayormente estable.

## Cómo ensayar una característica de WebAssembly

- En [`src/wasm/wasm-feature-flags.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-feature-flags.h), mueva la bandera de la característica de la lista de macros `FOREACH_WASM_EXPERIMENTAL_FEATURE_FLAG` a la lista de macros `FOREACH_WASM_STAGING_FEATURE_FLAG`.
- En [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh), agregue el nombre del repositorio del borrador a la lista `repos` de repositorios.
- Ejecute [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh) para crear y cargar las pruebas de especificación del nuevo borrador.
- En [`test/wasm-spec-tests/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-spec-tests/testcfg.py), agregue el nombre del repositorio del borrador y la bandera de la característica a la lista `proposal_flags`.
- En [`test/wasm-js/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-js/testcfg.py), agregue el nombre del repositorio del borrador y la bandera de la característica a la lista `proposal_flags`.

Consulte el [ensayo de reflexión de tipo](https://crrev.com/c/1771791) como referencia.

# Envío

## Cuándo está lista para ser enviada una característica de WebAssembly

- Se cumple el [Proceso de lanzamiento de V8](https://v8.dev/docs/feature-launch-process).
- La implementación está cubierta por un fuzzer (si corresponde).
- La característica ha sido ensayada durante varias semanas para obtener cobertura del fuzzer.
- El borrador de la característica está en [etapa 4](https://github.com/WebAssembly/proposals).
- Todas las [pruebas de especificación](https://github.com/WebAssembly/spec/tree/master/test) pasan.
- Se cumple la [lista de verificación de DevTools de Chromium para nuevas características de WebAssembly](https://docs.google.com/document/d/1WbL-fGuLbbNr5-n_nRGo_ILqZFnh5ZjRSUcDTT3yI8s/preview).

## Cómo enviar una característica de WebAssembly

- En [`src/wasm/wasm-feature-flags.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/wasm/wasm-feature-flags.h), mueva la bandera de la característica de la lista de macros `FOREACH_WASM_STAGING_FEATURE_FLAG` a la lista de macros `FOREACH_WASM_SHIPPED_FEATURE_FLAG`.
    - Asegúrese de agregar un bot de CQ de blink en el CL para verificar fallos en [pruebas web de blink](https://v8.dev/docs/blink-layout-tests) causados por habilitar la característica (añada esta línea al pie de descripción del CL: `Cq-Include-Trybots: luci.v8.try:v8_linux_blink_rel`).
- Además, habilite la característica por defecto cambiando el tercer parámetro en `FOREACH_WASM_SHIPPED_FEATURE_FLAG` a `true`.
- Configure un recordatorio para eliminar la bandera de la característica después de dos hitos.
