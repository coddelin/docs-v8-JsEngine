---
title: "¿Qué hay en ese `.wasm`? Presentando: `wasm-decompile`"
author: "Wouter van Oortmerssen ([@wvo](https://twitter.com/wvo))"
avatars:
  - "wouter-van-oortmerssen"
date: 2020-04-27
tags:
  - WebAssembly
  - herramientas
description: "WABT añade una nueva herramienta de descompilación que puede facilitar la lectura del contenido de los módulos Wasm."
tweet: "1254829913561014272"
---
Contamos con un número creciente de compiladores y otras herramientas que generan o manipulan archivos `.wasm`, y a veces podrías querer echarles un vistazo. Tal vez eres desarrollador de una de estas herramientas, o más directamente, eres programador que trabaja con Wasm y te preguntas cómo luce el código generado, por razones de rendimiento u otras.

<!--truncate-->
El problema es que Wasm es bastante de bajo nivel, muy parecido al código ensamblador real. En particular, a diferencia, por ejemplo, de la JVM, todas las estructuras de datos se han compilado en operaciones de carga/almacenamiento, en lugar de clases y campos convenientemente nombrados. Compiladores como LLVM pueden realizar una cantidad impresionante de transformaciones que hacen que el código generado no se parezca en nada al código inicial.

## ¿Desensamblar o.. descompilar?

Podrías usar herramientas como `wasm2wat` (parte del paquete [WABT](https://github.com/WebAssembly/wabt)), para transformar un `.wasm` en el formato de texto estándar de Wasm, `.wat`, que es una representación muy fiel pero no particularmente legible.

Por ejemplo, una función sencilla en C como el producto punto:

```c
typedef struct { float x, y, z; } vec3;

float dot(const vec3 *a, const vec3 *b) {
    return a->x * b->x +
           a->y * b->y +
           a->z * b->z;
}
```

Usamos `clang dot.c -c -target wasm32 -O2` seguido de `wasm2wat -f dot.o` para convertirlo en este `.wat`:

```wasm
(func $dot (type 0) (param i32 i32) (result f32)
  (f32.add
    (f32.add
      (f32.mul
        (f32.load
          (local.get 0))
        (f32.load
          (local.get 1)))
      (f32.mul
        (f32.load offset=4
          (local.get 0))
        (f32.load offset=4
          (local.get 1))))
    (f32.mul
      (f32.load offset=8
        (local.get 0))
      (f32.load offset=8
        (local.get 1))))))
```

Eso es un pedazo muy pequeño de código, pero ya no es fácil de leer por muchas razones. Además de la falta de una sintaxis basada en expresiones y la verbosidad general, entender las estructuras de datos como cargas de memoria no es sencillo. Ahora imagina ver el resultado de un programa grande, y las cosas se volverán rápidamente incomprensibles.

En lugar de `wasm2wat`, ejecuta `wasm-decompile dot.o`, y obtendrás:

```c
function dot(a:{ a:float, b:float, c:float },
             b:{ a:float, b:float, c:float }):float {
  return a.a * b.a + a.b * b.b + a.c * b.c
}
```

Esto parece mucho más familiar. Además de una sintaxis basada en expresiones que imita lenguajes de programación que puedan serte familiares, el descompilador analiza todos los accesos a la memoria en una función e intenta inferir su estructura. Luego, anota cada variable utilizada como puntero con una declaración de "estructura en línea". No crea declaraciones de estructuras nombradas, ya que no necesariamente sabe qué usos de 3 flotantes representan el mismo concepto.

## ¿Descompilar hacia qué?

`wasm-decompile` produce una salida que trata de parecerse a un "lenguaje de programación promedio" mientras permanece cerca del Wasm que representa.

Su objetivo #1 es la legibilidad: ayudar a guiar a los lectores a entender qué hay en un `.wasm` con un código lo más fácil de seguir posible. Su objetivo #2 es aún representar Wasm tan fielmente como sea posible, para no perder su utilidad como desensamblador. Obviamente, estos dos objetivos no siempre son unificables.

Esta salida no está destinada a ser un lenguaje de programación real y actualmente no hay forma de compilarla de vuelta a Wasm.

### Cargas y almacenamientos

Como se demostró anteriormente, `wasm-decompile` analiza todas las cargas y almacenamientos sobre un puntero en particular. Si forman un conjunto continuo de accesos, generará una de estas declaraciones de "estructura en línea".

Si no se accede a todos los "campos", no puede determinar con certeza si esto pretende ser una estructura o alguna otra forma de acceso a memoria no relacionado. En ese caso, recurre a tipos más simples como `float_ptr` (si los tipos son iguales) o, en el peor de los casos, generará un acceso a matriz como `o[2]:int`, que dice: `o` apunta a valores `int`, y estamos accediendo al tercero.

Ese último caso ocurre más a menudo de lo que piensas, ya que las variables locales de Wasm funcionan más como registros que como variables, por lo que el código optimizado puede compartir el mismo puntero para objetos no relacionados.

El descompilador intenta ser inteligente sobre la indexación y detecta patrones como `(base + (index << 2))[0]:int` que resultan de operaciones regulares de indexación de matrices en C como `base[index]` donde `base` apunta a un tipo de 4 bytes. Estas son muy comunes en el código ya que Wasm solo tiene desplazamientos constantes en cargas y almacenamientos. La salida de `wasm-decompile` los transforma de vuelta en `base[index]:int`.

Además, sabe cuándo las direcciones absolutas hacen referencia a la sección de datos.

### Control de flujo

El más familiar es la construcción if-then de Wasm, que se traduce a una sintaxis familiar `if (cond) { A } else { B }`, con la adición de que en Wasm realmente puede devolver un valor, por lo que también puede representar la sintaxis ternaria `cond ? A : B` disponible en algunos lenguajes.

El resto del control de flujo de Wasm se basa en los bloques `block` y `loop`, y los saltos `br`, `br_if` y `br_table`. El descompilador se mantiene bastante cerca de estas construcciones en lugar de intentar inferir las construcciones while/for/switch de las que pueden haber provenido, ya que esto tiende a funcionar mejor con la salida optimizada. Por ejemplo, un bucle típico en la salida de `wasm-decompile` puede verse como:

```c
loop A {
  // cuerpo del bucle aquí.
  if (cond) continue A;
}
```

Aquí, `A` es una etiqueta que permite anidar múltiples de estos. Tener un `if` y `continue` para controlar el bucle puede parecer ligeramente extraño en comparación con un bucle while, pero corresponde directamente al `br_if` de Wasm.

Los bloques son similares, pero en lugar de ramificar hacia atrás, se ramifican hacia adelante:

```c
block {
  if (cond) break;
  // el cuerpo va aquí.
}
```

Esto en realidad implementa un if-then. Las versiones futuras del descompilador pueden traducir estos en if-then reales cuando sea posible.

La construcción de control más sorprendente de Wasm es `br_table`, que implementa algo parecido a un `switch`, excepto que usa bloques `block` anidados, lo cual tiende a ser difícil de leer. El descompilador aplana estos para que sean ligeramente
más fáciles de seguir, por ejemplo:

```c
br_table[A, B, C, ..D](a);
label A:
return 0;
label B:
return 1;
label C:
return 2;
label D:
```

Esto es similar a un `switch` en `a`, con `D` siendo el caso por defecto.

### Otras características interesantes

El descompilador:

- Puede extraer nombres de la información de depuración o enlazado, o generar nombres por sí mismo. Al usar nombres existentes, tiene un código especial para simplificar los símbolos con nombres manglados de C++.
- Ya soporta la propuesta de multi-valor, lo que dificulta un poco transformar las cosas en expresiones y sentencias. Se usan variables adicionales cuando se devuelven múltiples valores.
- Incluso puede generar nombres a partir de los _contenidos_ de las secciones de datos.
- Produce declaraciones agradables para todos los tipos de sección Wasm, no solo código. Por ejemplo, trata de hacer que las secciones de datos sean legibles al representarlas como texto cuando es posible.
- Soporta la precedencia de operadores (común en la mayoría de los lenguajes estilo C) para reducir los `()` en expresiones comunes.

### Limitaciones

Descompilar Wasm es fundamentalmente más difícil que, por ejemplo, el bytecode de JVM.

Este último no está optimizado, por lo que es relativamente fiel a la estructura del código original, e incluso cuando faltan nombres, se refiere a clases únicas en lugar de solo ubicaciones de memoria.

En cambio, la mayoría del output `.wasm` ha sido fuertemente optimizado por LLVM y, por lo tanto, a menudo ha perdido gran parte de su estructura original. El código resultante es muy diferente a lo que escribiría un programador. Eso hace que un descompilador para Wasm sea un mayor desafío para que sea útil, ¡pero eso no significa que no debamos intentarlo!

## Más

¡La mejor manera de ver más es, por supuesto, descompilar tu propio proyecto Wasm!

Además, una guía más detallada de `wasm-decompile` está [aquí](https://github.com/WebAssembly/wabt/blob/master/docs/decompiler.md). Su implementación está en los archivos fuente que comienzan con `decompiler` [aquí](https://github.com/WebAssembly/wabt/tree/master/src) (¡siéntete libre de contribuir con un PR para mejorarlo!). Algunos casos de prueba que muestran más ejemplos de diferencias entre `.wat` y el descompilador están [aquí](https://github.com/WebAssembly/wabt/tree/master/test/decompile).
