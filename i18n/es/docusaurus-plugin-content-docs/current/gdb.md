---
title: "Depuración de funciones incorporadas con GDB"
description: "A partir de V8 v6.9, es posible crear puntos de interrupción en GDB para depurar funciones incorporadas de CSA / ASM / Torque."
---
A partir de V8 v6.9, es posible crear puntos de interrupción en GDB (y posiblemente en otros depuradores) para depurar funciones incorporadas de CSA / ASM / Torque.

```
(gdb) tb i::Isolate::Init
Punto de interrupción temporal 1 en 0x7ffff706742b: i::Isolate::Init. (2 ubicaciones)
(gdb) r
Hilo 1 "d8" alcanzó el punto de interrupción temporal 1, 0x00007ffff7c55bc0 en Isolate::Init
(gdb) br Builtins_RegExpPrototypeExec
Punto de interrupción 2 en 0x7ffff7ac8784
(gdb) c
Hilo 1 "d8" alcanzó el punto de interrupción 2, 0x00007ffff7ac8784 en Builtins_RegExpPrototypeExec ()
```

Tenga en cuenta que funciona bien utilizar un punto de interrupción temporal (atajo `tb` en GDB) en lugar de un punto de interrupción normal (`br`) para esto, ya que solo lo necesita al inicio del proceso.

Las funciones incorporadas también son visibles en los rastreos de pila:

```
(gdb) bt
#0  0x00007ffff7ac8784 en Builtins_RegExpPrototypeExec ()
#1  0x00007ffff78f5066 en Builtins_ArgumentsAdaptorTrampoline ()
#2  0x000039751d2825b1 en ?? ()
#3  0x000037ef23a0fa59 en ?? ()
#4  0x0000000000000000 en ?? ()
```

Advertencias:

- Solo funciona con funciones incorporadas integradas.
- Los puntos de interrupción solo se pueden establecer al inicio de la función incorporada.
- El punto de interrupción inicial en `Isolate::Init` es necesario antes de establecer el punto de interrupción de la función incorporada, ya que GDB modifica el binario y verificamos un hash de la sección de funciones incorporadas en el binario al inicio. De lo contrario, V8 se queja de una discrepancia en el hash:

    ```
    # Error fatal en ../../src/isolate.cc, línea 117
    # La verificación falló: d.Hash() == d.CreateHash() (11095509419988753467 frente a 3539781814546519144).
    ```
