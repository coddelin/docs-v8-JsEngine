---
title: &apos;Usando el perfilador basado en muestras de V8&apos;
description: &apos;Este documento explica cómo usar el perfilador basado en muestras de V8.&apos;
---
V8 tiene un perfilador integrado basado en muestras. El perfilador está desactivado por defecto, pero puede activarse con la opción de línea de comandos `--prof`. El muestreador registra las pilas de código JavaScript y C/C++.

## Compilar

Compila el shell `d8` siguiendo las instrucciones en [Compilación con GN](/docs/build-gn).

## Línea de comandos

Para iniciar el perfilado, usa la opción `--prof`. Al realizar el perfilado, V8 genera un archivo `v8.log` que contiene los datos recopilados.

Windows:

```bash
build\Release\d8 --prof script.js
```

Otros sistemas (reemplaza `ia32` con `x64` si deseas perfilar la versión `x64`):

```bash
out/ia32.release/d8 --prof script.js
```

## Procesar la salida generada

El procesamiento del archivo de registro se realiza utilizando scripts JS que se ejecutan en el shell d8. Para que esto funcione, un binario `d8` (o enlace simbólico, o `d8.exe` en Windows) debe estar en la raíz de tu repositorio de V8, o en la ruta especificada por la variable de entorno `D8_PATH`. Nota: este binario se usa solo para procesar el registro, pero no para el perfilado real, por lo que no importa qué versión sea, etc.

**Asegúrate de que el `d8` utilizado para el análisis no fue compilado con `is_component_build`**

Windows:

```bash
tools\windows-tick-processor.bat v8.log
```

Linux:

```bash
tools/linux-tick-processor v8.log
```

macOS:

```bash
tools/mac-tick-processor v8.log
```

## Interfaz web para `--prof`

Preprocesa el registro con `--preprocess` (para resolver símbolos de C++, etc.).

```bash
$V8_PATH/tools/linux-tick-processor --preprocess > v8.json
```

Abre [`tools/profview/index.html`](https://v8.dev/tools/head/profview) en tu navegador y selecciona el archivo `v8.json` allí.

## Ejemplo de salida

```
Resultado del perfilado estadístico a partir de benchmarks\v8.log, (4192 ticks, 0 sin contabilizar, 0 excluidos).

 [Bibliotecas compartidas]:
   ticks  total  nonlib   nombre
      9    0.2%    0.0%  C:\WINDOWS\system32\ntdll.dll
      2    0.0%    0.0%  C:\WINDOWS\system32\kernel32.dll

 [JavaScript]:
   ticks  total  nonlib   nombre
    741   17.7%   17.7%  LazyCompile: am3 crypto.js:108
    113    2.7%    2.7%  LazyCompile: Scheduler.schedule richards.js:188
    103    2.5%    2.5%  LazyCompile: rewrite_nboyer earley-boyer.js:3604
    103    2.5%    2.5%  LazyCompile: TaskControlBlock.run richards.js:324
     96    2.3%    2.3%  Builtin: JSConstructCall
    ...

 [C++]:
   ticks  total  nonlib   nombre
     94    2.2%    2.2%  v8::internal::ScavengeVisitor::VisitPointers
     33    0.8%    0.8%  v8::internal::SweepSpace
     32    0.8%    0.8%  v8::internal::Heap::MigrateObject
     30    0.7%    0.7%  v8::internal::Heap::AllocateArgumentsObject
    ...


 [GC]:
   ticks  total  nonlib   nombre
    458   10.9%

 [Perfil de abajo hacia arriba (intenso)]:
  Nota: el porcentaje muestra una proporción de un llamador particular en el total
  de la cantidad de llamadas de su padre.
  Los llamadores que ocupen menos del 2.0% no se muestran.

   ticks padre  nombre
    741   17.7%  LazyCompile: am3 crypto.js:108
    449   60.6%    LazyCompile: montReduce crypto.js:583
    393   87.5%      LazyCompile: montSqrTo crypto.js:603
    212   53.9%        LazyCompile: bnpExp crypto.js:621
    212  100.0%          LazyCompile: bnModPowInt crypto.js:634
    212  100.0%            LazyCompile: RSADoPublic crypto.js:1521
    181   46.1%        LazyCompile: bnModPow crypto.js:1098
    181  100.0%          LazyCompile: RSADoPrivate crypto.js:1628
    ...
```

## Perfilar aplicaciones web

Las máquinas virtuales de hoy en día altamente optimizadas pueden ejecutar aplicaciones web a velocidades vertiginosas. Pero no se debe confiar solo en ellas para lograr un gran rendimiento: un algoritmo cuidadosamente optimizado o una función menos costosa pueden a menudo lograr mejoras de velocidad multiplicadas por varias en todos los navegadores. El [CPU Profiler](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/reference) de [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/) te ayuda a analizar los cuellos de botella de tu código. Pero a veces, necesitas ir más profundo y más granular: aquí es donde el perfilador interno de V8 resulta útil.

Usemos ese perfilador para examinar el [demo explorador Mandelbrot](https://web.archive.org/web/20130313064141/http://ie.microsoft.com/testdrive/performance/mandelbrotexplorer/) que Microsoft [lanzó](https://blogs.msdn.microsoft.com/ie/2012/11/13/ie10-fast-fluid-perfect-for-touch-and-available-now-for-windows-7/) junto con IE10. Tras el lanzamiento del demo, V8 corrigió un error que ralentizaba el cálculo innecesariamente (de ahí el pobre rendimiento de Chrome en el post del blog del demo) y optimizó aún más el motor, implementando una aproximación más rápida de `exp()` que la ofrecida por las bibliotecas estándar del sistema. Después de estos cambios, **el demo se ejecutó 8 veces más rápido que lo medido previamente** en Chrome.

Pero, ¿qué sucede si deseas que el código se ejecute más rápido en todos los navegadores? Primero deberías **entender qué mantiene ocupado a tu CPU**. Ejecuta Chrome (Windows y Linux [Canary](https://tools.google.com/dlpage/chromesxs)) con los siguientes parámetros en la línea de comandos, lo que hará que emita información de ticks del perfilador (en el archivo `v8.log`) para la URL que especifiques, que en nuestro caso era una versión local de la demo de Mandelbrot sin trabajadores web:

```bash
./chrome --js-flags=&apos;--prof&apos; --no-sandbox &apos;http://localhost:8080/&apos;
```

Al preparar el caso de prueba, asegúrate de que comience su trabajo inmediatamente al cargar, y cierra Chrome cuando termine la computación (usa Alt+F4), para que solo tengas los ticks relevantes en el archivo de registro. También ten en cuenta que los trabajadores web aún no se perfilan correctamente con esta técnica.

Luego, procesa el archivo `v8.log` con el script `tick-processor` que incluye V8 (o la nueva versión web práctica):

```bash
v8/tools/linux-tick-processor v8.log
```

Aquí hay un fragmento interesante de la salida procesada que debería llamar tu atención:

```
Resultado del perfil estadístico desde null, (14306 ticks, 0 no contabilizados, 0 excluidos).
 [Bibliotecas compartidas]:
   ticks  total  nonlib   nombre
   6326   44.2%    0.0%  /lib/x86_64-linux-gnu/libm-2.15.so
   3258   22.8%    0.0%  /.../chrome/src/out/Release/lib/libv8.so
   1411    9.9%    0.0%  /lib/x86_64-linux-gnu/libpthread-2.15.so
     27    0.2%    0.0%  /.../chrome/src/out/Release/lib/libwebkit.so
```

La sección superior muestra que V8 está pasando más tiempo dentro de una biblioteca del sistema específica del SO que en su propio código. Veamos qué lo está causando examinando la sección de salida “de abajo hacia arriba”, donde puedes leer las líneas con sangría como “fue llamado por” (y las líneas que comienzan con un `*` significan que la función ha sido optimizada por TurboFan):

```
[Perfil (pesado) de abajo hacia arriba]:
  Nota: el porcentaje muestra la proporción de un llamado particular en el total
  de las llamadas de su elemento padre.
  Los llamadores que ocupan menos de un 2.0% no se muestran.

   ticks padre  nombre
   6326   44.2%  /lib/x86_64-linux-gnu/libm-2.15.so
   6325  100.0%    LazyCompile: *exp native math.js:91
   6314   99.8%      LazyCompile: *calculateMandelbrot http://localhost:8080/Demo.js:215
```

¡Más del **44% del tiempo total se gasta ejecutando la función `exp()` dentro de una biblioteca del sistema**! Sumando algo de sobrecarga por llamar a bibliotecas del sistema, eso significa que alrededor de dos tercios del tiempo total se gastan evaluando `Math.exp()`.

Si miras el código JavaScript, verás que `exp()` se usa únicamente para producir una paleta en escala de grises suave. Hay innumerables formas de producir una paleta en escala de grises suave, pero supongamos que realmente, realmente te gustan los gradientes exponenciales. Aquí es donde entra en juego la optimización algorítmica.

Notarás que `exp()` se llama con un argumento en el rango `-4 < x < 0`, por lo que podemos reemplazarlo de manera segura con su [aproximación de Taylor](https://es.wikipedia.org/wiki/Serie_de_Taylor) para ese rango, que proporciona el mismo gradiente suave con solo una multiplicación y un par de divisiones:

```
exp(x) ≈ 1 / ( 1 - x + x * x / 2) para -4 < x < 0
```

Ajustar el algoritmo de esta manera aumenta el rendimiento en un 30% adicional en comparación con la última versión de Canary y 5× en comparación con el `Math.exp()` basado en bibliotecas del sistema en Chrome Canary.

![](/_img/docs/profile/mandelbrot.png)

Este ejemplo muestra cómo el perfilador interno de V8 puede ayudarte a profundizar en la comprensión de los cuellos de botella de tu código, y que un algoritmo más inteligente puede impulsar el rendimiento aún más.

Para descubrir más sobre cómo evaluar aplicaciones web complejas y exigentes de hoy en día, lee [Cómo V8 mide el rendimiento en el mundo real](/blog/real-world-performance).
