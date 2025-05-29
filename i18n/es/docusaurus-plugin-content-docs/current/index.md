---
title: "Documentación"
description: "Documentación para el proyecto V8."
slug: "/"
---
V8 es el motor de JavaScript y WebAssembly de alto rendimiento de código abierto de Google, escrito en C++. Se utiliza en Chrome y en Node.js, entre otros.

Esta documentación está dirigida a desarrolladores de C++ que deseen utilizar V8 en sus aplicaciones, así como a cualquier persona interesada en el diseño y rendimiento de V8. Este documento te introduce a V8, mientras que el resto de la documentación te muestra cómo usar V8 en tu código y describe algunos de sus detalles de diseño, además de proporcionar un conjunto de benchmarks de JavaScript para medir el rendimiento de V8.

## Acerca de V8

V8 implementa <a href="https://tc39.es/ecma262/">ECMAScript</a> y <a href="https://webassembly.github.io/spec/core/">WebAssembly</a>, y funciona en sistemas Windows, macOS y Linux que utilizan procesadores x64, IA-32 o ARM. Otros sistemas (IBM i, AIX) y procesadores (MIPS, ppcle64, s390x) se mantienen externamente; consulta [puertos](/ports). V8 se puede integrar en cualquier aplicación C++.

V8 compila y ejecuta código fuente de JavaScript, maneja la asignación de memoria para objetos y recolecta objetos basura que ya no necesita. El recolector de basura generacional, preciso y de parada total de V8 es una de las claves de su rendimiento.

JavaScript se usa comúnmente para scripting del lado del cliente en un navegador, siendo utilizado para manipular objetos del Modelo de Objetos del Documento (DOM), por ejemplo. Sin embargo, el DOM no suele ser proporcionado por el motor de JavaScript, sino por un navegador. Esto también se aplica a V8: Google Chrome proporciona el DOM. Sin embargo, V8 ofrece todos los tipos de datos, operadores, objetos y funciones especificados en el estándar ECMA.

V8 permite que cualquier aplicación C++ exponga sus propios objetos y funciones al código JavaScript. Depende de ti decidir qué objetos y funciones quieres exponer a JavaScript.

## Resumen de la documentación

- [Compilando V8 desde el código fuente](/build)
    - [Obteniendo el código fuente de V8](/source-code)
    - [Compilando con GN](/build-gn)
    - [Compilación cruzada y depuración para ARM/Android](/cross-compile-arm)
    - [Compilación cruzada para iOS](/cross-compile-ios)
    - [Configuración de interfaz gráfica e IDE](/ide-setup)
    - [Compilando en Arm64](/compile-arm64)
- [Contribuyendo](/contribute)
    - [Código respetuoso](/respectful-code)
    - [La API pública de V8 y su estabilidad](/api)
    - [Convertirse en un colaborador de V8](/become-committer)
    - [Responsabilidad del colaborador](/committer-responsibility)
    - [Pruebas web de Blink (también conocidas como pruebas de diseño)](/blink-layout-tests)
    - [Evaluando cobertura de código](/evaluate-code-coverage)
    - [Proceso de lanzamiento](/release-process)
    - [Guías para revisión de diseño](/design-review-guidelines)
    - [Implementación y envío de características del lenguaje JavaScript/WebAssembly](/feature-launch-process)
    - [Lista de verificación para el envío de características de WebAssembly](/wasm-shipping-checklist)
    - [Bisect de flakes](/flake-bisect)
    - [Gestión de puertos](/ports)
    - [Soporte oficial](/official-support)
    - [Fusionando y parcheando](/merge-patch)
    - [Construcción de integración con Node.js](/node-integration)
    - [Reportando errores de seguridad](/security-bugs)
    - [Ejecutando benchmarks localmente](/benchmarks)
    - [Pruebas](/test)
    - [Triaging de problemas](/triage-issues)
- Depuración
    - [Depuración ARM con el simulador](/debug-arm)
    - [Compilación cruzada y depuración para ARM/Android](/cross-compile-arm)
    - [Depuración de funciones integradas con GDB](/gdb)
    - [Depuración mediante el Protocolo de Inspector de V8](/inspector)
    - [Integración de la Interfaz de Compilación JIT de GDB](/gdb-jit)
    - [Investigando fugas de memoria](/memory-leaks)
    - [API de trazado de pila](/stack-trace-api)
    - [Usando D8](/d8)
    - [Herramientas de V8](https://v8.dev/tools)
- Integrando V8
    - [Guía para integrar V8](/embed)
    - [Números de versión](/version-numbers)
    - [Funciones integradas](/builtin-functions)
    - [Soporte de i18n](/i18n)
    - [Mitigación de código no confiable](/untrusted-code-mitigations)
- Bajo el capó
    - [Ignition](/ignition)
    - [TurboFan](/turbofan)
    - [Manual de usuario de Torque](/torque)
    - [Escribiendo funciones integradas en Torque](/torque-builtins)
    - [Escribiendo funciones integradas en CSA](/csa-builtins)
    - [Agregando una nueva operación de WebAssembly](/webassembly-opcode)
    - [Mapas, también conocidos como "Clases ocultas"](/hidden-classes)
    - [Seguimiento de Slack - ¿qué es?](/blog/slack-tracking)
    - [Pipeline de compilación de WebAssembly](/wasm-compilation-pipeline)
- Escribiendo JavaScript optimizable
    - [Usando el perfilador basado en muestras de V8](/profile)
    - [Perfilando Chromium con V8](/profile-chromium)
    - [Usando `perf` de Linux con V8](/linux-perf)
    - [Trazando V8](/trace)
    - [Usando estadísticas de llamadas en tiempo de ejecución](/rcs)
