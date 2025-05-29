---
title: 'Integridad del flujo de control en V8'
description: 'Esta publicación de blog discute los planes para implementar la integridad del flujo de control en V8.'
author: 'Stephen Röttger'
date: 2023-10-09
tags:
 - seguridad
---
La integridad del flujo de control (CFI) es una característica de seguridad que tiene como objetivo prevenir explotaciones que secuestren el flujo de control. La idea es que, incluso si un atacante logra corromper la memoria de un proceso, controles de integridad adicionales pueden evitar que ejecuten código arbitrario. En esta publicación de blog, queremos discutir nuestro trabajo para habilitar CFI en V8.

<!--truncate-->
# Antecedentes

La popularidad de Chrome lo convierte en un objetivo valioso para ataques de día cero, y la mayoría de los exploits vistos en la naturaleza apuntan a V8 para obtener la ejecución inicial de código. Los exploits de V8 típicamente siguen un patrón similar: un error inicial lleva a la corrupción de memoria, pero a menudo la corrupción inicial es limitada y el atacante debe encontrar una forma de leer/escribir arbitrariamente en todo el espacio de direcciones. Esto les permite secuestrar el flujo de control y ejecutar shellcode que lleva a cabo el siguiente paso de la cadena de explotación e intenta salir de la sandbox de Chrome.


Para evitar que el atacante convierta la corrupción de memoria en la ejecución de shellcode, estamos implementando la integridad del flujo de control en V8. Esto es especialmente desafiante en presencia de un compilador JIT. Si conviertes datos en código máquina en tiempo de ejecución, ahora necesitas asegurarte de que los datos corrompidos no se conviertan en código malicioso. Afortunadamente, las características del hardware moderno nos proporcionan los bloques de construcción necesarios para diseñar un compilador JIT que sea robusto incluso mientras procesa memoria corrompida.


A continuación, analizaremos el problema dividido en tres partes separadas:

- **CFI de Rama Directa** verifica la integridad de las transferencias indirectas de flujo de control como llamadas a punteros de función o tablas virtuales.
- **CFI de Rama Inversa** debe garantizar que las direcciones de retorno leídas desde la pila sean válidas.
- **Integridad de Memoria JIT** valida todos los datos que se escriben en la memoria ejecutable en tiempo de ejecución.

# CFI de Rama Directa

Existen dos características de hardware que queremos usar para proteger llamadas y saltos indirectos: marcadores de destino (landing pads) y autenticación de punteros.


## Marcadores de Destino

Los marcadores de destino son instrucciones especiales que pueden usarse para marcar objetivos válidos de ramificación. Si se habilitan, las ramas indirectas solo pueden saltar a una instrucción de marcador de destino, cualquier otra cosa generará una excepción.
En ARM64, por ejemplo, los marcadores de destino están disponibles con la característica de Identificación del Destino de Rama (BTI) introducida en Armv8.5-A. El soporte para BTI está [ya habilitado](https://bugs.chromium.org/p/chromium/issues/detail?id=1145581) en V8.
En x64, los marcadores de destino se introdujeron con el Rastreo de Ramas Indirectas (IBT) como parte de la Tecnología de Refuerzo del Flujo de Control (CET).


Sin embargo, agregar marcadores de destino en todos los objetivos potenciales para ramas indirectas solo nos proporciona una integridad de flujo de control de grano grueso y aún le da mucha libertad a los atacantes. Podemos restringir aún más las limitaciones agregando verificaciones de firma de funciones (los tipos de argumento y retorno en el sitio de llamada deben coincidir con la función llamada), así como mediante la eliminación dinámica de instrucciones de marcadores de destino innecesarios en tiempo de ejecución.
Estas características son parte de la reciente [propuesta FineIBT](https://arxiv.org/abs/2303.16353) y esperamos que puedan adoptarse en sistemas operativos.

## Autenticación de Punteros

Armv8.3-A introdujo la autenticación de punteros (PAC) que puede usarse para incrustar una firma en los bits superiores no utilizados de un puntero. Dado que la firma se verifica antes de que se use el puntero, los atacantes no podrán proporcionar punteros falsificados arbitrarios a ramas indirectas.

# CFI de Rama Inversa

Para proteger las direcciones de retorno, también queremos utilizar dos características de hardware separadas: pilas sombra y PAC.

## Pilas Sombra

Con las pilas sombra de Intel CET y la pila de control protegida (GCS) en [Armv9.4-A](https://community.arm.com/arm-community-blogs/b/architectures-and-processors-blog/posts/arm-a-profile-architecture-2022), podemos tener una pila separada solo para direcciones de retorno que tiene protecciones de hardware contra escrituras maliciosas. Estas características proporcionan protecciones bastante fuertes contra sobrescrituras de direcciones de retorno, pero necesitaremos lidiar con casos en los que legítimamente modifiquemos la pila de retorno, como durante optimización/desoptimización y manejo de excepciones.

## Autenticación de Punteros (PAC-RET)

Similar a las ramas indirectas, la autenticación de punteros puede usarse para firmar direcciones de retorno antes de que se coloquen en la pila. Esto ya está [habilitado](https://bugs.chromium.org/p/chromium/issues/detail?id=919548) en V8 en CPUs ARM64.


Un efecto secundario de usar soporte de hardware para CFI de Rama Directa y CFI de Rama Inversa es que nos permitirá minimizar el impacto en el rendimiento.

# Integridad de Memoria JIT

Un desafío único para CFI en los compiladores JIT es que necesitamos escribir código máquina en memoria ejecutable en tiempo de ejecución. Necesitamos proteger la memoria de una manera que permita al compilador JIT escribir en ella, pero no al atacante mediante una primitiva de escritura en memoria. Un enfoque ingenuo sería cambiar temporalmente los permisos de página para añadir/eliminar acceso de escritura. Pero esto es inherentemente propenso a condiciones de carrera, ya que debemos asumir que el atacante puede activar una escritura arbitraria de forma concurrente desde un segundo hilo.


## Permisos de Memoria por Hilo

En las CPUs modernas, podemos tener diferentes vistas de los permisos de memoria que solo se aplican al hilo actual y que pueden cambiarse rápidamente en espacio de usuario.
En CPUs x64, esto puede lograrse con claves de protección de memoria (pkeys) y ARM anunció las [extensiones de superposición de permisos](https://community.arm.com/arm-community-blogs/b/architectures-and-processors-blog/posts/arm-a-profile-architecture-2022) en Armv8.9-A.
Esto nos permite alternar de forma granular el acceso de escritura a la memoria ejecutable, por ejemplo, etiquetándola con una pkey separada.


Las páginas JIT ya no son escribibles por el atacante, pero el compilador JIT aún necesita escribir código generado en ellas. En V8, el código generado reside en [AssemblerBuffers](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/codegen/assembler.h;l=255;drc=064b9a7903b793734b6c03a86ee53a2dc85f0f80) en el montón, que en su lugar puede ser corrompido por el atacante. También podríamos proteger los AssemblerBuffers de la misma manera, pero esto solo desplaza el problema. Por ejemplo, entonces también necesitaríamos proteger la memoria donde reside el puntero al AssemblerBuffer.
De hecho, cualquier código que habilite el acceso de escritura a esa memoria protegida constituye una superficie de ataque para CFI y debe codificarse con mucha defensiva. Por ejemplo, cualquier escritura a un puntero que provenga de memoria no protegida es un game over, ya que el atacante puede usarlo para corromper la memoria ejecutable. Por lo tanto, nuestro objetivo de diseño es tener la menor cantidad posible de estas secciones críticas y mantener el código dentro de ellas corto y auto contenido.

## Validación del Flujo de Control

Si no queremos proteger todos los datos del compilador, podemos asumir que son no confiables desde el punto de vista de CFI. Antes de escribir algo en la memoria ejecutable, necesitamos validar que no conduce a un flujo de control arbitrario. Eso incluye, por ejemplo, que el código escrito no realice instrucciones syscall o que no salte a código arbitrario. Por supuesto, también necesitamos verificar que no cambie los permisos pkey del hilo actual. Cabe señalar que no intentamos prevenir que el código corrompa memoria arbitraria, ya que si el código está corrompido, podemos asumir que el atacante ya tiene esta capacidad.
Para realizar dicha validación de forma segura, también necesitaremos mantener la metainformación requerida en memoria protegida, así como proteger las variables locales en la pila.
Realizamos algunas pruebas preliminares para evaluar el impacto de dicha validación en el rendimiento. Afortunadamente, la validación no ocurre en rutas de código críticas para el rendimiento, y no observamos regresiones en los benchmarks jetstream o speedometer.

# Evaluación

La investigación de seguridad ofensiva es una parte esencial de cualquier diseño de mitigación y constantemente buscamos nuevas formas de eludir nuestras protecciones. Aquí hay algunos ejemplos de ataques que creemos que serán posibles e ideas para abordarlos.

## Argumentos de Syscall Corrompidos

Como se mencionó anteriormente, asumimos que un atacante puede activar una primitiva de escritura en memoria de manera concurrente con otros hilos en ejecución. Si otro hilo realiza un syscall, algunos de los argumentos podrían ser controlados por el atacante si se leen desde la memoria. Chrome se ejecuta con un filtro restrictivo de syscalls, pero aún hay algunos syscalls que podrían ser utilizados para eludir las protecciones CFI.


Sigaction, por ejemplo, es un syscall para registrar manejadores de señales. Durante nuestra investigación, encontramos que una llamada a sigaction en Chrome es accesible de manera compatible con CFI. Dado que los argumentos se pasan en memoria, un atacante podría activar esta ruta de código y apuntar la función del manejador de señales a código arbitrario. Afortunadamente, podemos abordar esto fácilmente: bloquear la ruta hacia la llamada a sigaction o bloquearla con un filtro de syscall después de la inicialización.


Otros ejemplos interesantes son los syscalls de gestión de memoria. Por ejemplo, si un hilo llama a munmap con un puntero corrompido, el atacante podría desmapear páginas de solo lectura y una llamada mmap consecutiva puede reutilizar esta dirección, agregando efectivamente permisos de escritura a la página.
Algunos sistemas operativos ya proporcionan protecciones contra este ataque con sellado de memoria: las plataformas de Apple proporcionan la bandera [VM\_FLAGS\_PERMANENT](https://github.com/apple-oss-distributions/xnu/blob/1031c584a5e37aff177559b9f69dbd3c8c3fd30a/osfmk/mach/vm_statistics.h#L274) y OpenBSD tiene un syscall [mimmutable](https://man.openbsd.org/mimmutable.2).

## Corrupción del Marco de Señal

Cuando el kernel ejecuta un manejador de señales, guardará el estado actual de la CPU en la pila de espacio de usuario. Un segundo hilo podría corromper el estado guardado, que luego será restaurado por el kernel.
Proteger contra esto en el espacio de usuario parece complicado si los datos del marco de señal no son confiables. En ese momento, uno tendría que salir siempre o sobrescribir el marco de señal con un estado de guardado conocido para regresar.
Un enfoque más prometedor sería proteger la pila de señales utilizando permisos de memoria por hilo. Por ejemplo, una sigaltstack etiquetada con pkey protegería contra sobrescrituras maliciosas, pero requeriría que el kernel permitiera temporalmente permisos de escritura al guardar el estado de la CPU en ella.

# v8CTF

Estos son solo algunos ejemplos de posibles ataques que estamos trabajando para abordar, y también queremos aprender más de la comunidad de seguridad. ¡Si esto te interesa, prueba tus habilidades en el recién lanzado [v8CTF](https://security.googleblog.com/2023/10/expanding-our-exploit-reward-program-to.html)! Explota V8 y gana una recompensa; ¡los exploits dirigidos a vulnerabilidades de tipo n-day están explícitamente en el objetivo!
