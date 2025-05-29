---
title: 'Funciones incorporadas'
description: 'Este documento explica qué son las “funciones incorporadas” en V8.'
---
Las funciones incorporadas en V8 vienen en diferentes variedades en cuanto a implementación, dependiendo de su funcionalidad, requisitos de rendimiento y, a veces, del desarrollo histórico en sí.

Algunas están implementadas directamente en JavaScript y se compilan en código ejecutable en tiempo de ejecución, al igual que cualquier código JavaScript de usuario. Algunas de ellas recurren a las llamadas _funciones de ejecución_ para parte de su funcionalidad. Las funciones de ejecución están escritas en C++ y se llaman desde JavaScript mediante un prefijo `%`. Por lo general, estas funciones de ejecución están limitadas al código JavaScript interno de V8. Para propósitos de depuración, también pueden ser llamadas desde código JavaScript normal si V8 se ejecuta con la bandera `--allow-natives-syntax`. Algunas funciones de ejecución están directamente integradas por el compilador en el código generado. Para una lista, consulta `src/runtime/runtime.h`.

Otras funciones están implementadas como _funciones incorporadas_, las cuales pueden ser implementadas de diferentes maneras. Algunas están implementadas directamente en ensamblador dependiente de la plataforma. Algunas están implementadas en _CodeStubAssembler_, una abstracción independiente de la plataforma. Otras están implementadas directamente en C++. Las funciones incorporadas a veces también se usan para implementar fragmentos de código de conexión, no necesariamente funciones completas. Para una lista, consulta `src/builtins/builtins.h`.
