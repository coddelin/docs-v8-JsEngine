---
title: 'Integración de la interfaz de compilación JIT de GDB'
description: 'La integración de la interfaz de compilación JIT de GDB permite que V8 proporcione a GDB la información de símbolos y de depuración para el código nativo generado desde el runtime de V8.'
---
La integración de la interfaz de compilación JIT de GDB permite que V8 proporcione a GDB la información de símbolos y de depuración para el código nativo generado desde el runtime de V8.

Cuando la interfaz de compilación JIT de GDB está desactivada, una traza habitual en GDB contiene marcos marcados con `??`. Estos marcos corresponden a código generado dinámicamente:

```
#8  0x08281674 in v8::internal::Runtime_SetProperty (args=...) at src/runtime.cc:3758
#9  0xf5cae28e in ?? ()
#10 0xf5cc3a0a in ?? ()
#11 0xf5cc38f4 in ?? ()
#12 0xf5cbef19 in ?? ()
#13 0xf5cb09a2 in ?? ()
#14 0x0809e0a5 in v8::internal::Invoke (construct=false, func=..., receiver=..., argc=0, args=0x0,
    has_pending_exception=0xffffd46f) en src/execution.cc:97
```

Sin embargo, activar la interfaz de compilación JIT de GDB permite que GDB genere una traza de pila más informativa:

```
#6  0x082857fc in v8::internal::Runtime_SetProperty (args=...) at src/runtime.cc:3758
#7  0xf5cae28e in ?? ()
#8  0xf5cc3a0a in loop () at test.js:6
#9  0xf5cc38f4 en test.js () at test.js:13
#10 0xf5cbef19 in ?? ()
#11 0xf5cb09a2 in ?? ()
#12 0x0809e1f9 in v8::internal::Invoke (construct=false, func=..., receiver=..., argc=0, args=0x0,
    has_pending_exception=0xffffd44f) en src/execution.cc:97
```

Los marcos aún desconocidos para GDB corresponden a código nativo sin información de origen. Consulta [limitaciones conocidas](#known-limitations) para más detalles.

La interfaz de compilación JIT de GDB está especificada en la documentación de GDB: https://sourceware.org/gdb/current/onlinedocs/gdb/JIT-Interface.html

## Prerrequisitos

- V8 v3.0.9 o más reciente
- GDB 7.0 o más reciente
- Sistema operativo Linux
- CPU con arquitectura compatible con Intel (ia32 o x64)

## Activar la interfaz de compilación JIT de GDB

Actualmente, la interfaz de compilación JIT de GDB está excluida de la compilación por defecto y desactivada en tiempo de ejecución. Para activarla:

1. Compila la biblioteca V8 con `ENABLE_GDB_JIT_INTERFACE` definido. Si estás usando scons para compilar V8, ejecuta con `gdbjit=on`.
1. Pasa la opción `--gdbjit` al iniciar V8.

Para verificar que has activado correctamente la integración JIT de GDB, intenta establecer un punto de interrupción en `__jit_debug_register_code`. Esta función se invoca para notificar a GDB sobre nuevos objetos de código.

## Limitaciones conocidas

- En el lado de GDB, la interfaz JIT actualmente (a partir de GDB 7.2) no maneja el registro de objetos de código de manera muy efectiva. Cada nuevo registro toma más tiempo: con 500 objetos registrados, cada siguiente registro toma más de 50 ms, con 1000 objetos registrados más de 300 ms. Este problema fue [informado a los desarrolladores de GDB](https://sourceware.org/ml/gdb/2011-01/msg00002.html), pero actualmente no hay solución disponible. Para reducir la presión sobre GDB, la implementación actual de la integración JIT de GDB opera en dos modos: _predeterminado_ y _completo_ (habilitado con la opción `--gdbjit-full`). En el modo _predeterminado_, V8 notifica a GDB solo sobre objetos de código que tienen información de origen adjunta (esto generalmente incluye todos los scripts de usuario). En el modo _completo_, sobre todos los objetos de código generados (stubs, ICs, trampolines).

- En x64, GDB no puede desenrollar correctamente la pila sin la sección `.eh_frame` ([Issue 1053](https://bugs.chromium.org/p/v8/issues/detail?id=1053))

- GDB no es notificado sobre el código deserializado desde el snapshot ([Issue 1054](https://bugs.chromium.org/p/v8/issues/detail?id=1054))

- Solo se admite Sistema operativo Linux en CPUs compatibles con Intel. Para sistemas operativos diferentes, se debe generar un encabezado ELF diferente o usar un formato de objeto completamente diferente.

- Habilitar la interfaz JIT de GDB desactiva la GC compacta. Esto se hace para reducir la presión sobre GDB, ya que cancelar el registro y registrar cada objeto de código movido incurrirá en una sobrecarga considerable.

- La integración JIT de GDB proporciona únicamente información de origen _aproximada_. No proporciona ninguna información sobre variables locales, argumentos de funciones, diseño de pila, etc. No permite avanzar paso a paso por el código JavaScript ni establecer puntos de interrupción en una línea determinada. Sin embargo, se puede establecer un punto de interrupción en una función por su nombre.
