---
title: "Depuración Arm con el simulador"
description: "El simulador y el depurador de Arm pueden ser muy útiles al trabajar con la generación de código V8."
---
El simulador y el depurador pueden ser muy útiles al trabajar con la generación de código V8.

- Es conveniente ya que permite probar la generación de código sin acceso al hardware real.
- No se necesita compilación [cruzada](/docs/cross-compile-arm) ni nativa.
- El simulador admite completamente la depuración del código generado.

Tenga en cuenta que este simulador está diseñado para los propósitos de V8. Solo se implementan las funciones utilizadas por V8, y puede encontrar características o instrucciones no implementadas. Si es el caso, no dude en implementarlas y enviar el código.

- [Compilación](#compiling)
- [Iniciar el depurador](#start_debug)
- [Comandos de depuración](#debug_commands)
    - [printobject](#po)
    - [trace](#trace)
    - [break](#break)
- [Características adicionales de los puntos de interrupción](#extra)
    - [32 bits: `stop()`](#arm32_stop)
    - [64 bits: `Debug()`](#arm64_debug)

## Compilación para Arm usando el simulador

Por defecto en un host x86, compilar para Arm con [gm](/docs/build-gn#gm) le proporcionará una versión del simulador:

```bash
gm arm64.debug # Para una compilación de 64 bits o...
gm arm.debug   # ... para una compilación de 32 bits.
```

También puede compilar la configuración `optdebug` ya que `debug` puede ser un poco lento, especialmente si desea ejecutar el conjunto de pruebas de V8.

## Iniciar el depurador

Puede iniciar el depurador inmediatamente desde la línea de comandos después de `n` instrucciones:

```bash
out/arm64.debug/d8 --stop_sim_at <n> # O out/arm.debug/d8 para una compilación de 32 bits.
```

Alternativamente, puede generar una instrucción de punto de interrupción en el código generado:

Nativamente, las instrucciones de punto de interrupción hacen que el programa se detenga con una señal `SIGTRAP`, permitiéndole depurar el problema con gdb. Sin embargo, si se ejecuta con un simulador, una instrucción de punto de interrupción en el código generado lo llevará al depurador del simulador.

Puede generar un punto de interrupción de varias maneras utilizando `DebugBreak()` desde [Torque](/docs/torque-builtins), desde el [CodeStubAssembler](/docs/csa-builtins), como un nodo en un paso de [TurboFan](/docs/turbofan), o directamente usando un ensamblador.

Aquí nos centramos en la depuración de código nativo de bajo nivel, así que veamos el método del ensamblador:

```cpp
TurboAssembler::DebugBreak();
```

Supongamos que tenemos una función 'jitted' llamada `add` compilada con [TurboFan](/docs/turbofan) y queremos detenernos al inicio. Dado un ejemplo `test.js`:



```js
// Nuestra función optimizada.
function add(a, b) {
  return a + b;
}

// Código típico habilitado por --allow-natives-syntax.
%PrepareFunctionForOptimization(add);

// Damos al compilador de optimización retroalimentación de tipos para que especule que `a` y `b` son
// números.
add(1, 3);

// Y forzamos su optimización.
%OptimizeFunctionOnNextCall(add);
add(5, 7);
```

Para hacerlo, podemos conectarnos al [generador de código](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/code-generator.cc?q=CodeGenerator::AssembleCode) de TurboFan y acceder al ensamblador para insertar nuestro punto de interrupción:

```cpp
void CodeGenerator::AssembleCode() {
  // ...

  // Verificamos si estamos optimizando, luego buscamos el nombre de la función actual e
  // insertamos un punto de interrupción.
  if (info->IsOptimizing()) {
    AllowHandleDereference allow_handle_dereference;
    if (info->shared_info()->PassesFilter("add")) {
      tasm()->DebugBreak();
    }
  }

  // ...
}
```

Y ejecutémoslo:

```simulator
$ d8 \
    # Habilitamos funciones cheat code JS con '%'.
    --allow-natives-syntax \
    # Desensamblamos nuestra función.
    --print-opt-code --print-opt-code-filter="add" --code-comments \
    # Desactivamos las mitigaciones de spectre para mayor claridad.
    --no-untrusted-code-mitigations \
    test.js
--- Fuente en bruto ---
(a, b) {
  return a + b;
}


--- Código optimizado ---
optimization_id = 0
source_position = 12
kind = OPTIMIZED_FUNCTION
name = add
stack_slots = 6
compiler = turbofan
address = 0x7f0900082ba1

Instrucciones (tamaño = 504)
0x7f0900082be0     0  d45bd600       inicio de la pool de constantes (num_const = 6)
0x7f0900082be4     4  00000000       constante
0x7f0900082be8     8  00000001       constante
0x7f0900082bec     c  75626544       constante
0x7f0900082bf0    10  65724267       constante
0x7f0900082bf4    14  00006b61       constante
0x7f0900082bf8    18  d45bd7e0       constante
                  -- Prologue: verificamos registro de inicio de código --
0x7f0900082bfc    1c  10ffff30       adr x16, #-0x1c (addr 0x7f0900082be0)
0x7f0900082c00    20  eb02021f       cmp x16, x2
0x7f0900082c04    24  54000080       b.eq #+0x10 (addr 0x7f0900082c14)
                  Mensaje de aborto:
                  Valor incorrecto en el registro de inicio de código pasado
0x7f0900082c08    28  d2800d01       movz x1, #0x68
                  -- Trampolín incluido para abortar --
0x7f0900082c0c    2c  58000d70       ldr x16, pc+428 (addr 0x00007f0900082db8)    ;; destino fuera de heap
0x7f0900082c10    30  d63f0200       blr x16
                  -- Prólogo: verificar la desoptimización --
                  [ DescomprimirPunteroEtiquetado
0x7f0900082c14    34  b85d0050       ldur w16, [x2, #-48]
0x7f0900082c18    38  8b100350       add x16, x26, x16
                  ]
0x7f0900082c1c    3c  b8407210       ldur w16, [x16, #7]
0x7f0900082c20    40  36000070       tbz w16, #0, #+0xc (dir 0x7f0900082c2c)
                  -- Trampolín Inline para CompileLazyDeoptimizedCode --
0x7f0900082c24    44  58000c31       ldr x17, pc+388 (dir 0x00007f0900082da8)    ;; objetivo fuera de heap
0x7f0900082c28    48  d61f0220       br x17
                  -- Inicio B0 (construir el marco) --
(...)

--- Fin del código ---
# El depurador alcanzó 0: DebugBreak
0x00007f0900082bfc 10ffff30            adr x16, #-0x1c (dir 0x7f0900082be0)
sim>
```

¡Podemos ver que nos detuvimos al inicio de la función optimizada y el simulador nos dio un mensaje!

Nota que esto es solo un ejemplo y que V8 cambia rápidamente, por lo que los detalles pueden variar. Pero deberías poder hacer esto en cualquier lugar donde haya un ensamblador disponible.

## Comandos de depuración

### Comandos comunes

Introduce `help` en el mensaje del depurador para obtener detalles sobre los comandos disponibles. Estos incluyen comandos habituales similares a gdb, como `stepi`, `cont`, `disasm`, etc. Si el Simulador se ejecuta bajo gdb, el comando de depurador `gdb` otorgará control a gdb. Luego puedes usar `cont` desde gdb para volver al depurador.

### Comandos específicos de la arquitectura

Cada arquitectura de destino implementa su propio simulador y depurador, por lo que la experiencia y los detalles variarán.

- [printobject](#po)
- [trace](#trace)
- [break](#break)

#### `printobject $register` (alias `po`)

Describe un objeto JS en un registro.

Por ejemplo, digamos que esta vez ejecutamos [nuestro ejemplo](#test.js) en una compilación de simulador Arm de 32 bits. Podemos examinar los argumentos entrantes pasados en los registros:

```simulator
$ ./out/arm.debug/d8 --allow-natives-syntax test.js
El simulador alcanzó stop, deteniéndose en la siguiente instrucción:
  0x26842e24  e24fc00c       sub ip, pc, #12
sim> print r1
r1: 0x4b60ffb1 1264648113
# El objeto de la función actual se pasa con r1.
sim> printobject r1
r1:
0x4b60ffb1: [Función] en OldSpace
 - map: 0x485801f9 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototipo: 0x4b6010f1 <JSFunction (sfi = 0x42404e99)>
 - elementos: 0x5b700661 <FixedArray[0]> [HOLEY_ELEMENTS]
 - prototipo de función:
 - mapa inicial:
 - información compartida: 0x4b60fe9d <SharedFunctionInfo add>
 - nombre: 0x5b701c5d <String[#3]: add>
 - contador de parámetros formales: 2
 - tipo: NormalFunction
 - contexto: 0x4b600c65 <NativeContext[261]>
 - código: 0x26842de1 <Code OPTIMIZED_FUNCTION>
 - código fuente: (a, b) {
  return a + b;
}
(...)

# Ahora imprime el contexto JS actual pasado en r7.
sim> printobject r7
r7:
0x449c0c65: [NativeContext] en OldSpace
 - map: 0x561000b9 <Mapa>
 - longitud: 261
 - información de alcance: 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
 - previo: 0
 - contexto nativo: 0x449c0c65 <NativeContext[261]>
           0: 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
           1: 0
           2: 0x449cdaf5 <JSObject>
           3: 0x58480c25 <JSGlobal Object>
           4: 0x58485499 <Otro objeto heap (EMBEDDER_DATA_ARRAY_TYPE)>
           5: 0x561018a1 <Map(HOLEY_ELEMENTS)>
           6: 0x3408027d <undefined>
           7: 0x449c75c1 <JSFunction ArrayBuffer (sfi = 0x4be8ade1)>
           8: 0x561010f9 <Map(HOLEY_ELEMENTS)>
           9: 0x449c967d <JSFunction arrayBufferConstructor_DoNotInitialize (sfi = 0x4be8c3ed)>
          10: 0x449c8dbd <JSFunction Array (sfi = 0x4be8be59)>
(...)
```

#### `trace` (alias `t`)

Habilitar o deshabilitar el rastreo de instrucciones ejecutadas.

Cuando está habilitado, el simulador imprimirá las instrucciones ensambladas mientras las ejecuta. Si estás ejecutando una compilación Arm de 64 bits, el simulador también puede rastrear los cambios en los valores de los registros.

También puedes habilitar esto desde la línea de comandos con la bandera `--trace-sim` para habilitar el rastreo desde el inicio.

Con el mismo [ejemplo](#test.js):

```simulator
$ out/arm64.debug/d8 --allow-natives-syntax \
    # --debug-sim es obligatorio en Arm de 64 bits para habilitar el desensamblado
    # cuando se está rastreando.
    --debug-sim test.js
# El depurador alcanzó 0: DebugBreak
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (dir 0x7f1e00082be0)
sim> trace
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (dir 0x7f1e00082be0)
Habilitando rastreo de desensamblado, registros y escrituras en memoria

# Punto de interrupción en la dirección de retorno almacenada en el registro lr.
sim> break lr
Establecer un punto de interrupción en 0x7f1f880abd28
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (dir 0x7f1e00082be0)

# Continuar rastreará la ejecución de la función hasta que regresemos, permitiéndonos
# entender lo que está sucediendo.
sim>continue
#    x0: 0x00007f1e00082ba1
#    x1: 0x00007f1e08250125
#    x2: 0x00007f1e00082be0
(...)

# Primero cargamos los argumentos 'a' y 'b' desde el stack y verificamos si
# son números etiquetados. Esto se indica si el bit menos significativo es 0.
0x00007f1e00082c90  f9401fe2            ldr x2, [sp, #56]
#    x2: 0x000000000000000a <- 0x00007f1f821f0278
0x00007f1e00082c94  7200005f            tst w2, #0x1
# NZCV: N:0 Z:1 C:0 V:0
0x00007f1e00082c98  54000ac1            b.ne #+0x158 (addr 0x7f1e00082df0)
0x00007f1e00082c9c  f9401be3            ldr x3, [sp, #48]
#    x3: 0x000000000000000e <- 0x00007f1f821f0270
0x00007f1e00082ca0  7200007f            tst w3, #0x1
# NZCV: N:0 Z:1 C:0 V:0
0x00007f1e00082ca4  54000a81            b.ne #+0x150 (addr 0x7f1e00082df4)

# Luego desetiquetamos y sumamos juntos 'a' y 'b'.
0x00007f1e00082ca8  13017c44            asr w4, w2, #1
#    x4: 0x0000000000000005
0x00007f1e00082cac  2b830484            adds w4, w4, w3, asr #1
# NZCV: N:0 Z:0 C:0 V:0
#    x4: 0x000000000000000c
# Eso es 5 + 7 == 12, todo bien!

# Luego verificamos desbordamientos y etiquetamos el resultado nuevamente.
0x00007f1e00082cb0  54000a46            b.vs #+0x148 (addr 0x7f1e00082df8)
0x00007f1e00082cb4  2b040082            adds w2, w4, w4
# NZCV: N:0 Z:0 C:0 V:0
#    x2: 0x0000000000000018
0x00007f1e00082cb8  54000466            b.vs #+0x8c (addr 0x7f1e00082d44)


# Y finalmente colocamos el resultado en x0.
0x00007f1e00082cbc  aa0203e0            mov x0, x2
#    x0: 0x0000000000000018
(...)

0x00007f1e00082cec  d65f03c0            ret
Alcanzó y desactivó un punto de interrupción en 0x7f1f880abd28.
0x00007f1f880abd28  f85e83b4            ldur x20, [fp, #-24]
sim>
```

#### `break $address`

Inserta un punto de interrupción en la dirección especificada.

Tenga en cuenta que en Arm de 32 bits, solo puede tener un punto de interrupción y necesitará deshabilitar la protección de escritura en las páginas de código para insertarlo. El simulador de Arm de 64 bits no tiene esas restricciones.

Con nuestro [ejemplo](#test.js) nuevamente:

```simulator
$ out/arm.debug/d8 --allow-natives-syntax \
    # Esto es útil para saber en qué dirección interrumpir.
    --print-opt-code --print-opt-code-filter="add" \
    test.js
(...)

Simulador alcanzó el stop, interrumpiendo en la siguiente instrucción:
  0x488c2e20  e24fc00c       sub ip, pc, #12

# Interrumpir en una dirección conocida interesante, donde comenzamos
# a cargar 'a' y 'b'.
sim> break 0x488c2e9c
sim> continue
  0x488c2e9c  e59b200c       ldr r2, [fp, #+12]

# Podemos adelantarnos con 'disasm'.
sim> disasm 10
  0x488c2e9c  e59b200c       ldr r2, [fp, #+12]
  0x488c2ea0  e3120001       tst r2, #1
  0x488c2ea4  1a000037       bne +228 -> 0x488c2f88
  0x488c2ea8  e59b3008       ldr r3, [fp, #+8]
  0x488c2eac  e3130001       tst r3, #1
  0x488c2eb0  1a000037       bne +228 -> 0x488c2f94
  0x488c2eb4  e1a040c2       mov r4, r2, asr #1
  0x488c2eb8  e09440c3       adds r4, r4, r3, asr #1
  0x488c2ebc  6a000037       bvs +228 -> 0x488c2fa0
  0x488c2ec0  e0942004       adds r2, r4, r4

# Y trata de interrumpir con el resultado de la primera instrucción `adds`.
sim> break 0x488c2ebc
falló al establecer el punto de interrupción

# Ah, necesitamos borrar el punto de interrupción primero.
sim> del
sim> break 0x488c2ebc
sim> cont
  0x488c2ebc  6a000037       bvs +228 -> 0x488c2fa0

sim> print r4
r4: 0x0000000c 12
# Eso es 5 + 7 == 12, todo bien!
```

### Instrucciones generadas de punto de interrupción con algunas características adicionales

En lugar de `TurboAssembler::DebugBreak()`, puede usar una instrucción de nivel inferior que tiene el mismo efecto excepto con características adicionales.

- [32-bit: `stop()`](#arm32_stop)
- [64-bit: `Debug()`](#arm64_debug)

#### `stop()` (Arm de 32 bits)

```cpp
Assembler::stop(Condition cond = al, int32_t code = kDefaultStopCode);
```

El primer argumento es la condición y el segundo es el código de parada. Si se especifica un código y es menor que 256, se dice que la parada está “vigilada” y se puede deshabilitar/habilitar; un contador también realiza un seguimiento de cuántas veces el simulador alcanza este código.

Imagine que estamos trabajando en este código V8 C++:

```cpp
__ stop(al, 123);
__ mov(r0, r0);
__ mov(r0, r0);
__ mov(r0, r0);
__ mov(r0, r0);
__ mov(r0, r0);
__ stop(al, 0x1);
__ mov(r1, r1);
__ mov(r1, r1);
__ mov(r1, r1);
__ mov(r1, r1);
__ mov(r1, r1);
```

Aquí hay una sesión de depuración de muestra:

Alcanzamos la primera parada.

```simulator
El simulador alcanzó la parada 123, interrumpiendo en la siguiente instrucción:
  0xb53559e8  e1a00000       mov r0, r0
```

Podemos ver la siguiente parada usando `disasm`.

```simulator
sim> disasm
  0xb53559e8  e1a00000       mov r0, r0
  0xb53559ec  e1a00000       mov r0, r0
  0xb53559f0  e1a00000       mov r0, r0
  0xb53559f4  e1a00000       mov r0, r0
  0xb53559f8  e1a00000       mov r0, r0
  0xb53559fc  ef800001       stop 1 - 0x1
  0xb5355a00  e1a00000       mov r1, r1
  0xb5355a04  e1a00000       mov r1, r1
  0xb5355a08  e1a00000       mov r1, r1
```

Se puede imprimir información para todas las paradas (vigiladas) que se alcanzaron al menos una vez.

```simulator
sim> stop info all
Información de paradas:
stop 123 - 0x7b:      Activado,      contador = 1
sim> cont
El simulador alcanzó la parada 1, interrumpiendo en la siguiente instrucción:
  0xb5355a04  e1a00000       mov r1, r1
sim> stop info all
Información de paradas:
stop 1 - 0x1:         Activado,      contador = 1
stop 123 - 0x7b:      Activado,      contador = 1
```

Las paradas se pueden desactivar o activar. (Solo disponible para paradas vigiladas.)

```simulator
sim> stop disable 1
sim> cont
El simulador alcanzó el punto de parada 123, deteniéndose en la siguiente instrucción:
  0xb5356808  e1a00000       mov r0, r0
sim> cont
El simulador alcanzó el punto de parada 123, deteniéndose en la siguiente instrucción:
  0xb5356c28  e1a00000       mov r0, r0
sim> stop info all
Información de los puntos de parada:
stop 1 - 0x1:         Deshabilitado,     contador = 2
stop 123 - 0x7b:      Habilitado,        contador = 3
sim> stop enable 1
sim> cont
El simulador alcanzó el punto de parada 1, deteniéndose en la siguiente instrucción:
  0xb5356c44  e1a00000       mov r1, r1
sim> stop disable all
sim> con
```

#### `Debug()` (Arm de 64 bits)

```cpp
MacroAssembler::Debug(const char* message, uint32_t code, Instr params = BREAK);
```

Esta instrucción es un punto de interrupción de forma predeterminada, pero también puede habilitar y deshabilitar el rastreo como si lo hubieras hecho con el comando [`trace`](#trace) en el depurador. También puedes proporcionarle un mensaje y un código como identificador.

Imagina que estamos trabajando en este código C++ de V8, tomado del builtin nativo que prepara el frame para llamar a una función JS.

```cpp
int64_t bad_frame_pointer = -1L;  // Puntero de frame incorrecto, debería fallar si se utiliza.
__ Mov(x13, bad_frame_pointer);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);
```

Podría ser útil insertar un punto de interrupción con `DebugBreak()` para examinar el estado actual cuando lo ejecutemos. Pero podemos ir más allá y rastrear este código si usamos `Debug()` en su lugar:

```cpp
// Comenzar a rastrear y registrar el ensamblado y los valores de los registros.
__ Debug("start tracing", 42, TRACE_ENABLE | LOG_ALL);

int64_t bad_frame_pointer = -1L;  // Puntero de frame incorrecto, debería fallar si se utiliza.
__ Mov(x13, bad_frame_pointer);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);

// Detener el rastreo.
__ Debug("stop tracing", 42, TRACE_DISABLE);
```

Esto nos permite rastrear los valores de los registros __solo__ para el fragmento de código en el que estamos trabajando:

```simulator
$ d8 --allow-natives-syntax --debug-sim test.js
# NZCV: N:0 Z:0 C:0 V:0
# FPCR: AHP:0 DN:0 FZ:0 RMode:0b00 (Redondeo al más cercano)
#    x0: 0x00007fbf00000000
#    x1: 0x00007fbf0804030d
#    x2: 0x00007fbf082500e1
(...)

0x00007fc039d31cb0  9280000d            movn x13, #0x0
#   x13: 0xffffffffffffffff
0x00007fc039d31cb4  d280004c            movz x12, #0x2
#   x12: 0x0000000000000002
0x00007fc039d31cb8  d2864110            movz x16, #0x3208
#   ip0: 0x0000000000003208
0x00007fc039d31cbc  8b10034b            add x11, x26, x16
#   x11: 0x00007fbf00003208
0x00007fc039d31cc0  f940016a            ldr x10, [x11]
#   x10: 0x0000000000000000 <- 0x00007fbf00003208
0x00007fc039d31cc4  a9be7fea            stp x10, xzr, [sp, #-32]!
#    sp: 0x00007fc033e81340
#   x10: 0x0000000000000000 -> 0x00007fc033e81340
#   xzr: 0x0000000000000000 -> 0x00007fc033e81348
0x00007fc039d31cc8  a90137ec            stp x12, x13, [sp, #16]
#   x12: 0x0000000000000002 -> 0x00007fc033e81350
#   x13: 0xffffffffffffffff -> 0x00007fc033e81358
0x00007fc039d31ccc  910063fd            add fp, sp, #0x18 (24)
#    fp: 0x00007fc033e81358
0x00007fc039d31cd0  d45bd600            hlt #0xdeb0
```
