---
title: 'Una nueva forma de llevar lenguajes de programación con recolección de basura de manera eficiente a WebAssembly'
author: 'Alon Zakai'
avatars:
  - 'alon-zakai'
date: 2023-11-01
tags:
  - WebAssembly
tweet: '1720161507324076395'
---

Un artículo reciente sobre [Recolección de Basura en WebAssembly (WasmGC)](https://developer.chrome.com/blog/wasmgc) explica, a un nivel alto, cómo la [propuesta de Recolección de Basura (GC)](https://github.com/WebAssembly/gc) tiene como objetivo brindar mejor soporte a los lenguajes con GC en Wasm, lo cual es muy importante dada su popularidad. En este artículo, profundizaremos en los detalles técnicos de cómo lenguajes con GC como Java, Kotlin, Dart, Python y C# pueden ser trasladados a Wasm. De hecho, existen dos enfoques principales:

<!--truncate-->
- El enfoque de portabilidad “**tradicional**”, en el cual una implementación existente del lenguaje es compilada a WasmMVP, es decir, el Producto Mínimo Viable de WebAssembly que se lanzó en 2017.
- El enfoque de portabilidad **WasmGC**, en el cual el lenguaje se compila utilizando constructos de GC en Wasm que están definidos en la reciente propuesta de GC.

Explicaremos qué son esos dos enfoques y los compromisos técnicos entre ellos, especialmente en lo que respecta al tamaño y la velocidad. Al hacerlo, veremos que WasmGC tiene varias ventajas importantes, pero también requiere trabajo nuevo tanto en las herramientas como en las Máquinas Virtuales (VMs). Las secciones finales de este artículo explicarán lo que el equipo de V8 ha estado haciendo en esas áreas, incluyendo números de referencia. Si estás interesado en Wasm, GC, o ambos, esperamos que lo encuentres interesante, ¡y asegúrate de revisar la demostración y los enlaces para empezar cerca del final!

## El Enfoque de Portabilidad “Tradicional”

¿Cómo se trasladan típicamente los lenguajes a nuevas arquitecturas? Supongamos que Python quiere ejecutarse en la [arquitectura ARM](https://en.wikipedia.org/wiki/ARM_architecture_family), o Dart quiere ejecutarse en la [arquitectura MIPS](https://en.wikipedia.org/wiki/MIPS_architecture). La idea general es entonces recompilar la VM para esa arquitectura. Aparte de eso, si la VM tiene código específico de arquitectura, como compilación just-in-time (JIT) o ahead-of-time (AOT), entonces también se implementa un backend para JIT/AOT para la nueva arquitectura. Este enfoque tiene mucho sentido, porque a menudo la mayor parte del código base puede simplemente recompilarse para cada nueva arquitectura a la que te traslades:


![Estructura de una VM trasladada](/_img/wasm-gc-porting/ported-vm.svg "A la izquierda, código principal de ejecución incluyendo un parser, recolector de basura, optimizador, soporte de biblioteca y más; a la derecha, código backend separado para x64, ARM, etc.")

En esta figura, el parser, el soporte de biblioteca, el recolector de basura, el optimizador, etc., son compartidos entre todas las arquitecturas en el entorno principal. La portabilidad a una nueva arquitectura solo requiere un nuevo backend para ello, lo cual representa una cantidad comparativamente pequeña de código.

Wasm es un objetivo de compilación de bajo nivel, por lo que no es sorprendente que el enfoque de portabilidad tradicional pueda ser utilizado. Desde que Wasm comenzó, hemos visto que funciona bien en la práctica en muchos casos, como [Pyodide para Python](https://pyodide.org/en/stable/) y [Blazor para C#](https://dotnet.microsoft.com/en-us/apps/aspnet/web-apps/blazor) (observa que Blazor soporta tanto [AOT](https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly?view=aspnetcore-7.0#ahead-of-time-aot-compilation) como [JIT](https://github.com/dotnet/runtime/blob/main/docs/design/mono/jiterpreter.md), así que es un buen ejemplo de todo lo mencionado). En todos estos casos, un entorno de ejecución para el lenguaje es compilado en WasmMVP como cualquier otro programa que se compila en Wasm, y así el resultado utiliza la memoria lineal, las tablas, funciones, y demás de WasmMVP.

Como se mencionó antes, así es como los lenguajes son típicamente trasladados a nuevas arquitecturas, por lo que tiene mucho sentido por la razón usual de que puedes reutilizar casi todo el código existente de la VM, incluyendo la implementación del lenguaje y las optimizaciones. Resulta, sin embargo, que hay varios inconvenientes específicos de Wasm en este enfoque, y ahí es donde WasmGC puede ayudar.

## El Enfoque de Portabilidad WasmGC

Brevemente, la propuesta de GC para WebAssembly (“WasmGC”) permite definir tipos de estructuras y arreglos y realizar operaciones tales como crear instancias de ellos, leer y escribir en sus campos, realizar casteos entre tipos, etc. (para más detalles, consulta el [resumen de la propuesta](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Overview.md)). Esos objetos son gestionados por la propia implementación de GC de la VM de Wasm, que es la principal diferencia entre este enfoque y el enfoque de portabilidad tradicional.

Puede ser útil pensar en esto de la siguiente manera: _Si el enfoque tradicional de portabilidad es cómo se porta un lenguaje a una **arquitectura**, entonces el enfoque de WasmGC es muy similar a cómo se porta un lenguaje a una **VM**_. Por ejemplo, si deseas portar Java a JavaScript, entonces puedes usar un compilador como [J2CL](https://j2cl.io) que representa los objetos de Java como objetos de JavaScript, y esos objetos de JavaScript son gestionados por la VM de JavaScript como todos los demás. Portar lenguajes a VM existentes es una técnica muy útil, como puede observarse en todos los lenguajes que se compilan a [JavaScript](https://gist.github.com/matthiasak/c3c9c40d0f98ca91def1), [la JVM](https://es.wikipedia.org/wiki/Lista_de_lenguajes_para_Maquina_Virtual_Java) y [la CLR](https://es.wikipedia.org/wiki/Lenguaje_Com%C3%BAn_de_Infraestructura).

Esta metáfora de arquitectura/VM no es exacta, en particular porque WasmGC pretende ser de un nivel más bajo que las otras VM mencionadas en el último párrafo. Sin embargo, WasmGC define estructuras administradas por la VM y arrays y un sistema de tipos para describir sus formas y relaciones, y portar a WasmGC es el proceso de representar los constructos de tu lenguaje con esos primitivos; esto es ciertamente de un nivel más alto que una portabilidad tradicional a WasmMVP (que reduce todo a bytes no tipificados en memoria lineal). Por lo tanto, WasmGC es bastante similar a las portabilidades de lenguajes a VM, y comparte las ventajas de dichas portabilidades, en particular una buena integración con la VM objetivo y la reutilización de sus optimizaciones.

## Comparando los dos enfoques

Ahora que tenemos una idea de cuáles son los dos enfoques de portabilidad para lenguajes con GC, veamos cómo se comparan.

### Distribución de código de gestión de memoria

En la práctica, mucho código Wasm se ejecuta dentro de una VM que ya tiene un recolector de basura, lo cual es el caso en la Web, y también en entornos como [Node.js](https://nodejs.org/), [workerd](https://github.com/cloudflare/workerd), [Deno](https://deno.com/) y [Bun](https://bun.sh/). En tales casos, incluir una implementación de GC agrega un tamaño innecesario al binario Wasm. De hecho, este no es solo un problema para los lenguajes con GC en WasmMVP, sino también para lenguajes que usan memoria lineal como C, C++ y Rust, ya que el código en esos lenguajes que realiza cualquier tipo de asignación interesante terminará incluyendo `malloc/free` para gestionar la memoria lineal, lo cual requiere varios kilobytes de código. Por ejemplo, `dlmalloc` requiere 6K, e incluso un malloc que sacrifica velocidad por tamaño, como [`emmalloc`](https://groups.google.com/g/emscripten-discuss/c/SCZMkfk8hyk/m/yDdZ8Db3AwAJ), ocupa más de 1K. WasmGC, por otro lado, hace que la VM gestione automáticamente la memoria por nosotros, de modo que no necesitamos ningún código de gestión de memoria, ni un GC ni `malloc/free`, en el Wasm. En [el artículo mencionado anteriormente sobre WasmGC](https://developer.chrome.com/blog/wasmgc), se midió el tamaño del benchmark `fannkuch` y WasmGC fue mucho más pequeño que C o Rust—**2.3** K vs **6.1-9.6** K—por esta misma razón.

### Recolección de ciclos

En los navegadores, Wasm a menudo interactúa con JavaScript (y mediante JavaScript, APIs web), pero en WasmMVP (e incluso con la propuesta de [tipos de referencia](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md)) no hay forma de tener enlaces bidireccionales entre Wasm y JS que permitan recoger ciclos de manera fina. Los enlaces a objetos JS solo pueden colocarse en la tabla de Wasm, y los enlaces de vuelta a Wasm solo pueden referirse a toda la instancia de Wasm como un único gran objeto, como esto:


![Ciclos entre JS y un módulo completo de Wasm](/_img/wasm-gc-porting/cycle2.svg "Los objetos individuales de JS se refieren a una única gran instancia de Wasm, y no a los objetos individuales dentro de ella.")

Eso no es suficiente para recoger eficientemente ciclos específicos de objetos donde algunos están en la VM compilada y otros en JavaScript. Con WasmGC, por otro lado, definimos objetos Wasm de los que la VM es consciente, y así podemos tener referencias adecuadas de Wasm a JavaScript y viceversa:

![Ciclos entre objetos JS y objetos WasmGC](/_img/wasm-gc-porting/cycle3.svg "Objetos JS y objetos Wasm con enlaces entre ellos.")

### Referencias de GC en la pila

Los lenguajes de GC deben ser conscientes de las referencias en la pila, es decir, de las variables locales en un ámbito de llamada, ya que tales referencias pueden ser lo único que mantiene vivo un objeto. En una portabilidad tradicional de un lenguaje con GC eso es un problema porque el sandbox de Wasm impide que los programas inspeccionen su propia pila. Existen soluciones para las portabilidades tradicionales, como una pila sombra ([que puede hacerse automáticamente](https://github.com/WebAssembly/binaryen/blob/main/src/passes/SpillPointers.cpp)), o recoger basura solo cuando no hay nada en la pila (lo cual ocurre entre turnos del bucle de eventos de JavaScript). Una posible adición futura que ayudaría a las portabilidades tradicionales podría ser el [soporte de escaneo de pila](https://github.com/WebAssembly/design/issues/1459) en Wasm. Por ahora, solo WasmGC puede manejar referencias en la pila sin sobrecarga, y lo hace completamente de manera automática ya que la VM de Wasm está a cargo del GC.

### Eficiencia del GC

Un problema relacionado es la eficiencia de realizar un GC. Ambas aproximaciones de portabilidad tienen ventajas potenciales aquí. Un port tradicional puede reutilizar optimizaciones en una máquina virtual existente que pueden estar adaptadas a un lenguaje en particular, como un fuerte enfoque en optimizar punteros internos u objetos de corta duración. Un port WasmGC que se ejecuta en la Web, por otro lado, tiene la ventaja de reutilizar todo el trabajo que se ha realizado para hacer que el GC de JavaScript sea rápido, incluyendo técnicas como [GC generacional](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Generational_GC_(ephemeral_GC)), [recolección incremental](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Stop-the-world_vs._incremental_vs._concurrent), etc. WasmGC también deja el GC a la máquina virtual, lo que hace que cosas como las barreras de escritura eficientes sean más simples.

Otra ventaja de WasmGC es que el GC puede ser consciente de cosas como la presión de memoria y puede ajustar su tamaño de heap y la frecuencia de recolección en consecuencia, al igual que ya lo hacen las máquinas virtuales de JavaScript en la Web.

### Fragmentación de memoria

Con el tiempo, y especialmente en programas de larga duración, las operaciones de `malloc/free` en la memoria lineal de WasmMVP pueden causar *fragmentación*. Imagina que tenemos un total de 2 MB de memoria, y justo en el medio de ella tenemos una pequeña asignación existente de solo unos pocos bytes. En lenguajes como C, C++ y Rust es imposible mover una asignación arbitraria en tiempo de ejecución, por lo que tenemos casi 1MB a la izquierda de esa asignación y casi 1MB a la derecha. Pero esos son dos fragmentos separados, por lo que si intentamos asignar 1.5 MB fallaremos, aunque tengamos esa cantidad de memoria no asignada en total:


![](/_img/wasm-gc-porting/fragment1.svg "Una memoria lineal con una pequeña y molesta asignación justo en el medio, dividiendo el espacio libre en 2 mitades.")

Tal fragmentación puede forzar a un módulo Wasm a aumentar su memoria con mayor frecuencia, lo que [añade sobrecarga y puede causar errores de memoria insuficiente](https://github.com/WebAssembly/design/issues/1397); se están diseñando [mejoras](https://github.com/WebAssembly/design/issues/1439), pero es un problema desafiante. Este es un problema en todos los programas WasmMVP, incluidos los ports tradicionales de lenguajes con GC (ten en cuenta que los propios objetos del GC pueden ser movibles, pero no partes del runtime en sí). WasmGC, por otro lado, evita este problema porque la memoria es completamente gestionada por la máquina virtual, que puede moverlos para compactar el heap del GC y evitar la fragmentación.

### Integración con herramientas de desarrollo

En un port tradicional a WasmMVP, los objetos se colocan en la memoria lineal, lo que dificulta que las herramientas de desarrollo proporcionen información útil, ya que dichas herramientas solo ven bytes sin información de tipo de alto nivel. En WasmGC, por otro lado, la máquina virtual gestiona los objetos del GC, por lo que es posible una mejor integración. Por ejemplo, en Chrome puedes usar el heap profiler para medir el uso de memoria de un programa WasmGC:


![Código WasmGC ejecutándose en el heap profiler de Chrome](/_img/wasm-gc-porting/devtools.png)

La figura anterior muestra la pestaña Memoria en Chrome DevTools, donde tenemos una instantánea de heap de una página que ejecutó código WasmGC que creó 1,001 pequeños objetos en una [lista enlazada](https://gist.github.com/kripken/5cd3e18b6de41c559d590e44252eafff). Puedes ver el nombre del tipo del objeto, `$Node`, y el campo `$next` que se refiere al siguiente objeto en la lista. Toda la información habitual de instantáneas de heap está presente, como el número de objetos, el tamaño superficial, el tamaño retenido, y así sucesivamente, lo que nos permite ver fácilmente cuánta memoria se usa realmente por los objetos WasmGC. Otras características de Chrome DevTools, como el depurador, también funcionan con los objetos WasmGC.

### Semántica del lenguaje

Cuando recompilas una máquina virtual en un port tradicional obtienes exactamente el lenguaje que esperas, ya que estás ejecutando código familiar que implementa ese lenguaje. ¡Esa es una gran ventaja! En comparación, con un port WasmGC puedes terminar considerando compromisos en la semántica a cambio de eficiencia. Esto se debe a que con WasmGC definimos nuevos tipos de GC—estructuras y arreglos—y compilamos hacia ellos. Como resultado, no podemos simplemente compilar una máquina virtual escrita en C, C++, Rust u otros lenguajes similares a esa forma, ya que estos solo compilan a memoria lineal, y por lo tanto, WasmGC no puede ayudar con la gran mayoría de las bases de código de máquinas virtuales existentes. En su lugar, en un port WasmGC típicamente escribes nuevo código que transforma las construcciones de tu lenguaje en primitivas de WasmGC. Y hay múltiples maneras de hacer esa transformación, con diferentes compensaciones.

Si se necesitan compromisos o no depende de cómo se puedan implementar las construcciones de un lenguaje particular en WasmGC. Por ejemplo, los campos de las estructuras WasmGC tienen índices y tipos fijos, por lo que un lenguaje que desee acceder a campos de una manera más dinámica [puede tener desafíos](https://github.com/WebAssembly/gc/issues/397); hay varias maneras de solucionar eso, y en ese espacio de soluciones algunas opciones pueden ser más simples o rápidas pero no apoyar completamente la semántica original del lenguaje. (WasmGC tiene otras limitaciones actuales también, por ejemplo, carece de [punteros interiores](https://go.dev/blog/ismmkeynote); con el tiempo se espera que tales cosas [mejoren](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md).)

Como hemos mencionado, compilar a WasmGC es como compilar a una máquina virtual existente, y hay muchos ejemplos de compromisos que tienen sentido en esos puertos. Por ejemplo, [los números de dart2js (Dart compilado a JavaScript) se comportan de manera diferente que en la máquina virtual de Dart](https://dart.dev/guides/language/numbers), y [las cadenas de IronPython (Python compilado a .NET) se comportan como cadenas de C#](https://nedbatchelder.com/blog/201703/ironpython_is_weird.html). Como resultado, no todos los programas de un lenguaje pueden ejecutarse en dichos puertos, pero hay buenas razones para estas decisiones: implementar los números de dart2js como números de JavaScript permite que las máquinas virtuales los optimicen bien, y usar cadenas de .NET en IronPython significa que puedes pasar esas cadenas a otro código .NET sin sobrecarga.

Aunque pueden necesitarse compromisos en los puertos de WasmGC, WasmGC también tiene algunas ventajas como objetivo de compilación en comparación con JavaScript en particular. Por ejemplo, aunque dart2js tiene las limitaciones numéricas que acabamos de mencionar, [dart2wasm](https://flutter.dev/wasm) (Dart compilado a WasmGC) se comporta exactamente como debería, sin compromisos (esto es posible porque Wasm tiene representaciones eficientes para los tipos numéricos que requiere Dart).

¿Por qué no es esto un problema para los puertos tradicionales? Simplemente porque recompilan una máquina virtual existente en memoria lineal, donde los objetos se almacenan en bytes no tipados, lo cual es un nivel más bajo que WasmGC. Cuando todo lo que tienes son bytes no tipados, entonces tienes mucha más flexibilidad para hacer todo tipo de trucos de bajo nivel (y potencialmente inseguros), y al recompilar una máquina virtual existente obtienes todos los trucos que esa máquina virtual tiene en su repertorio.

### Esfuerzo de la Cadena de Herramientas

Como mencionamos en la subsección anterior, un puerto de WasmGC no puede simplemente recompilar una máquina virtual existente. Podrías reutilizar cierto código (como la lógica del analizador y las optimizaciones AOT, porque no se integran con el GC en tiempo de ejecución), pero en general los puertos de WasmGC requieren una cantidad sustancial de código nuevo.

En comparación, los puertos tradicionales a WasmMVP pueden ser más simples y rápidos: por ejemplo, puedes compilar la VM de Lua (escrita en C) a Wasm en solo unos minutos. Un puerto de WasmGC de Lua, por otro lado, requeriría más esfuerzo ya que necesitarías escribir código para descomponer las construcciones de Lua en estructuras y arreglos de WasmGC, y deberías decidir cómo hacer eso dentro de las restricciones específicas del sistema de tipos de WasmGC.

Por lo tanto, un mayor esfuerzo en la cadena de herramientas es una desventaja significativa de portar a WasmGC. Sin embargo, dado todas las ventajas que mencionamos anteriormente, creemos que WasmGC sigue siendo muy atractivo. La situación ideal sería una en la que el sistema de tipos de WasmGC pudiera soportar todos los lenguajes de manera eficiente, y todos los lenguajes hicieran el esfuerzo para implementar un puerto de WasmGC. La primera parte se verá facilitada por [futuras adiciones al sistema de tipos de WasmGC](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md), y para la segunda, podemos reducir el trabajo involucrado en los puertos de WasmGC compartiendo el esfuerzo en el lado de la cadena de herramientas tanto como sea posible. Afortunadamente, resulta que WasmGC hace muy práctico compartir el trabajo de la cadena de herramientas, lo cual veremos en la siguiente sección.

## Optimizando WasmGC

Ya hemos mencionado que los puertos de WasmGC tienen ventajas potenciales de velocidad, como usar menos memoria y reutilizar optimizaciones en el GC del anfitrión. En esta sección mostraremos otras ventajas interesantes de optimización de WasmGC sobre WasmMVP, que pueden tener un gran impacto en cómo se diseñan los puertos de WasmGC y qué tan rápidos son los resultados finales.

La cuestión clave aquí es que *WasmGC está a un nivel más alto que WasmMVP*. Para tener una intuición de eso, recuerda que ya dijimos que un puerto tradicional a WasmMVP es como portar a una nueva arquitectura mientras que un puerto de WasmGC es como portar a una nueva máquina virtual, y las máquinas virtuales son, por supuesto, abstracciones de nivel más alto sobre las arquitecturas—y las representaciones de nivel más alto a menudo son más optimizables. Tal vez podamos ver esto más claramente con un ejemplo concreto en pseudocódigo:

```csharp
func foo() {
  let x = allocate<T>(); // Asignar un objeto GC.
  x.val = 10;            // Asignar un campo a 10.
  let y = allocate<T>(); // Asignar otro objeto.
  y.val = x.val;         // Esto debe ser 10.
  return y.val;          // Esto también debe ser 10.
}
```

Como indican los comentarios, `x.val` contendrá `10`, al igual que `y.val`, por lo que la devolución final también será de `10`, y luego el optimizador incluso puede eliminar las asignaciones, conduciendo a esto:

```csharp
func foo() {
  return 10;
}
```

¡Genial! Sin embargo, lamentablemente, eso no es posible en WasmMVP, porque cada asignación se convierte en una llamada a `malloc`, una función grande y compleja en el Wasm que tiene efectos secundarios en la memoria lineal. Como resultado de esos efectos secundarios, el optimizador debe asumir que la segunda asignación (para `y`) podría alterar `x.val`, que también reside en memoria lineal. La gestión de memoria es compleja, y cuando la implementamos dentro del Wasm a un nivel bajo nuestras opciones de optimización son limitadas.

En contraste, en WasmGC operamos a un nivel más alto: cada asignación ejecuta la instrucción `struct.new`, una operación de VM sobre la que realmente podemos razonar, y un optimizador también puede rastrear referencias para concluir que `x.val` se escribe exactamente una vez con el valor `10`. ¡Como resultado, podemos optimizar esa función a una devolución simple de `10` como se espera!

Aparte de las asignaciones, otras cosas que añade WasmGC son punteros a funciones explícitos (`ref.func`) y llamadas usando ellos (`call_ref`), tipos en campos de estructuras y arreglos (a diferencia de la memoria lineal no tipada) y más. Como resultado, WasmGC es una Representación Intermedia (IR) de nivel más alto que WasmMVP, y mucho más optimizable.

Si WasmMVP tiene una optimización limitada, ¿por qué es tan rápido como lo es? Wasm, después de todo, puede ejecutarse casi a velocidad nativa completa. Eso se debe a que WasmMVP es generalmente el resultado de un poderoso compilador de optimización como LLVM. LLVM IR, al igual que WasmGC y a diferencia de WasmMVP, tiene una representación especial para asignaciones y demás, por lo que LLVM puede optimizar las cosas que hemos estado discutiendo. El diseño de WasmMVP es que la mayoría de las optimizaciones suceden a nivel de la cadena de herramientas *antes* de Wasm, y las máquinas virtuales de Wasm solo hacen la “última milla” de optimización (cosas como la asignación de registros).

¿Puede WasmGC adoptar un modelo de cadena de herramientas similar al de WasmMVP, y en particular usar LLVM? Desafortunadamente, no, dado que LLVM no admite WasmGC (se ha explorado cierta cantidad de apoyo [aquí](https://github.com/Igalia/ref-cpp), pero es difícil ver cómo el soporte completo podría incluso funcionar). Además, muchos lenguajes con recolección de basura no usan LLVM: hay una gran variedad de cadenas de herramientas de compiladores en ese espacio. Y por lo tanto necesitamos algo diferente para WasmGC.

Por suerte, como hemos mencionado, WasmGC es muy optimizable, y eso abre nuevas opciones. Aquí hay una manera de verlo:

![Flujos de trabajo de la cadena de herramientas de WasmMVP y WasmGC](/_img/wasm-gc-porting/workflows1.svg)

Tanto WasmMVP como WasmGC comienzan con las mismas dos casillas de la izquierda: comenzamos con un código fuente que es procesado y optimizado de manera específica para cada lenguaje (algo que cada lenguaje conoce mejor). Entonces aparece una diferencia: para WasmMVP debemos realizar optimizaciones de propósito general primero y luego reducir a Wasm, mientras que para WasmGC tenemos la opción de reducir primero a Wasm y optimizar más tarde. Esto es importante porque hay una gran ventaja al optimizar después de reducir: entonces podemos compartir código de cadena de herramientas para optimizaciones generales entre todos los lenguajes que compilan a WasmGC. La siguiente figura muestra cómo se ve eso:


![Varias cadenas de herramientas WasmGC son optimizadas por el optimizador Binaryen](/_img/wasm-gc-porting/workflows2.svg "Varios lenguajes a la izquierda compilan a WasmGC en el medio, y todo eso fluye hacia el optimizador Binaryen (wasm-opt).")

Dado que podemos realizar optimizaciones generales *después* de compilar a WasmGC, un optimizador Wasm-a-Wasm puede ayudar a todas las cadenas de herramientas compiladoras de WasmGC. Por esta razón, el equipo de V8 ha invertido en WasmGC en [Binaryen](https://github.com/WebAssembly/binaryen/), que todas las cadenas de herramientas pueden usar como la herramienta de línea de comandos `wasm-opt`. Nos enfocaremos en eso en la siguiente subsección.

### Optimización en las cadenas de herramientas

[Binaryen](https://github.com/WebAssembly/binaryen/), el proyecto de optimización de cadenas de herramientas de WebAssembly, ya tenía un [amplio rango de optimizaciones](https://www.youtube.com/watch?v=_lLqZR4ufSI) para el contenido WasmMVP, como inclusión de funciones, propagación de constantes, eliminación de código muerto, etc., casi todas las cuales también se aplican a WasmGC. Sin embargo, como mencionamos antes, WasmGC nos permite hacer muchas más optimizaciones que WasmMVP, y hemos escrito muchas nuevas optimizaciones en consecuencia:

- [Análisis de escape](https://github.com/WebAssembly/binaryen/blob/main/src/passes/Heap2Local.cpp) para mover asignaciones en el heap a locales.
- [Desvirtualización](https://github.com/WebAssembly/binaryen/blob/main/src/passes/ConstantFieldPropagation.cpp) para convertir llamadas indirectas en directas (que luego pueden ser incluidas, potencialmente).
- [Eliminación de código muerto más potente a nivel global](https://github.com/WebAssembly/binaryen/pull/4621).
- [Análisis de flujo de contenido tipo-consciente a nivel de programa completo (GUFA)](https://github.com/WebAssembly/binaryen/pull/4598).
- [Optimizaciones de casteo](https://github.com/WebAssembly/binaryen/blob/main/src/passes/OptimizeCasts.cpp), como eliminar cast redundantes y moverlos a ubicaciones anteriores.
- [Poda de tipos](https://github.com/WebAssembly/binaryen/blob/main/src/passes/GlobalTypeOptimization.cpp).
- [Fusión de tipos](https://github.com/WebAssembly/binaryen/blob/main/src/passes/TypeMerging.cpp).
- Refinación de tipos (para [locales](https://github.com/WebAssembly/binaryen/blob/main/src/passes/LocalSubtyping.cpp), [globales](https://github.com/WebAssembly/binaryen/blob/main/src/passes/GlobalRefining.cpp), [campos](https://github.com/WebAssembly/binaryen/blob/main/src/passes/TypeRefining.cpp), y [firmas](https://github.com/WebAssembly/binaryen/blob/main/src/passes/SignatureRefining.cpp)).

Eso es solo una lista rápida de algunos de los trabajos que hemos estado haciendo. Para más información sobre las nuevas optimizaciones de GC de Binaryen y cómo usarlas, consulta la [documentación de Binaryen](https://github.com/WebAssembly/binaryen/wiki/GC-Optimization-Guidebook).

Para medir la efectividad de todas esas optimizaciones en Binaryen, veamos el rendimiento de Java con y sin `wasm-opt`, usando la salida del compilador [J2Wasm](https://github.com/google/j2cl/tree/master/samples/wasm), que compila Java a WasmGC:

![Rendimiento de Java con y sin wasm-opt](/_img/wasm-gc-porting/benchmark1.svg "Pruebas de rendimiento Box2D, DeltaBlue, RayTrace y Richards, todas mostrando una mejora con wasm-opt.")

Aquí, “sin wasm-opt” significa que no ejecutamos las optimizaciones de Binaryen, pero aún optimizamos en la máquina virtual y en el compilador J2Wasm. Como se muestra en la figura, `wasm-opt` proporciona una aceleración significativa en cada uno de estos ejercicios de rendimiento, en promedio haciéndolos **1.9×** más rápidos.

En resumen, `wasm-opt` puede ser utilizado por cualquier herramienta que compile a WasmGC y evita la necesidad de reimplementar optimizaciones de propósito general en cada una. Y, a medida que seguimos mejorando las optimizaciones de Binaryen, eso beneficiará a todas las herramientas que usen `wasm-opt`, al igual que las mejoras en LLVM benefician a todos los lenguajes que compilan a WasmMVP utilizando LLVM.

Las optimizaciones de las herramientas son solo una parte de la ecuación. Como veremos a continuación, las optimizaciones en las máquinas virtuales de Wasm también son absolutamente críticas.

### Optimizaciones de V8

Como hemos mencionado, WasmGC es más optimizable que WasmMVP, y no solo las herramientas pueden beneficiarse de eso, sino también las máquinas virtuales. Y resulta ser importante porque los lenguajes con recolección de basura son diferentes de los lenguajes que compilan a WasmMVP. Considere, por ejemplo, la inserción en línea, que es una de las optimizaciones más importantes: Lenguajes como C, C++ y Rust realizan la inserción en línea en tiempo de compilación, mientras que lenguajes con GC como Java y Dart típicamente se ejecutan en una máquina virtual que realiza la inserción en línea y optimiza en tiempo de ejecución. Ese modelo de rendimiento ha afectado tanto al diseño de los lenguajes como a la forma en que las personas escriben código en lenguajes con GC.

Por ejemplo, en un lenguaje como Java, todas las llamadas comienzan como indirectas (una clase hija puede sobrescribir una función de los padres, incluso cuando se llama a la hija utilizando una referencia del tipo padre). Nos beneficiamos cuando la herramienta puede convertir una llamada indirecta en una directa, pero en la práctica los patrones de código en programas Java del mundo real a menudo tienen caminos que realmente tienen muchas llamadas indirectas, o al menos no se pueden inferir estáticamente como directas. Para manejar bien esos casos, hemos implementado la **inserción en línea especulativa** en V8, es decir, las llamadas indirectas se registran a medida que ocurren en tiempo de ejecución, y si vemos que un sitio de llamada tiene un comportamiento relativamente simple (pocos objetivos de llamada), entonces realizamos la inserción en línea con chequeos de guardia apropiados, lo cual está más cerca de cómo normalmente se optimiza Java que si dejamos esas cosas únicamente a la herramienta.

Los datos del mundo real validan ese enfoque. Medimos el rendimiento en el motor de cálculo de Google Sheets, que es una base de código Java utilizada para calcular fórmulas de hoja de cálculo, que hasta ahora se había compilado a JavaScript utilizando [J2CL](https://j2cl.io). El equipo de V8 ha estado colaborando con Sheets y J2CL para portar ese código a WasmGC, tanto por los beneficios esperados de rendimiento para Sheets como para proporcionar comentarios útiles del mundo real para el proceso de especificación de WasmGC. Al observar el rendimiento allí, resulta que la inserción en línea especulativa es la optimización individual más significativa que hemos implementado para WasmGC en V8, como muestra el siguiente gráfico:


![Rendimiento de Java con diferentes optimizaciones de V8](/_img/wasm-gc-porting/benchmark2.svg "Latencia de WasmGC sin optimizaciones, con otras optimizaciones, con inserción en línea especulativa, y con inserción en línea especulativa + otras optimizaciones. La mayor mejora por mucho es al agregar inserción en línea especulativa.")

“Otras optimizaciones” aquí se refiere a optimizaciones aparte de la inserción en línea especulativa que pudimos deshabilitar para propósitos de medición, incluyendo: eliminación de cargas, optimizaciones basadas en tipos, eliminación de ramas, plegado constante, análisis de escape y eliminación de subexpresiones comunes. “Sin optimizaciones” significa que hemos deshabilitado todas estas así como la inserción en línea especulativa (pero existen otras optimizaciones en V8 que no podemos deshabilitar fácilmente; por esa razón los números aquí son solo una aproximación). La gran mejora debido a la inserción en línea especulativa—alrededor de un **30%** de aceleración (!)—comparada con todas las otras optimizaciones juntas muestra lo importante que es la inserción en línea, al menos en Java compilado.

Además de la inserción en línea especulativa, WasmGC se basa en el soporte existente de Wasm en V8, lo que significa que se beneficia del mismo pipeline de optimización, asignación de registros, jerarquización, y demás. Además de todo eso, aspectos específicos de WasmGC pueden beneficiarse de optimizaciones adicionales, siendo la más obvia optimizar las nuevas instrucciones que WasmGC proporciona, como tener una implementación eficiente de casteos de tipos. Otro trabajo importante que hemos hecho es utilizar la información de tipos de WasmGC en el optimizador. Por ejemplo, `ref.test` verifica si una referencia es de un tipo particular en tiempo de ejecución, y después de que dicha verificación tiene éxito, sabemos que `ref.cast`, un casteo al mismo tipo, también debe tener éxito. Eso ayuda a optimizar patrones como este en Java:

```java
if (ref instanceof Type) {
  foo((Type) ref); // Este casteo descendente puede ser eliminado.
}
```

Estas optimizaciones son especialmente útiles después de la inserción en línea especulativa, porque entonces vemos más de lo que la herramienta vio cuando produjo el Wasm.

En general, en WasmMVP había una separación bastante clara entre las optimizaciones de la herramienta y de la máquina virtual: Hacíamos todo lo posible en la herramienta y dejábamos solo lo necesario para la máquina virtual, lo cual tenía sentido ya que mantenía las máquinas virtuales más simples. Con WasmGC ese equilibrio podría cambiar de alguna manera, porque como hemos visto hay una necesidad de realizar más optimizaciones en tiempo de ejecución para lenguajes con GC, y además WasmGC en sí es más optimizable, lo que nos permite tener más superposición entre optimizaciones de herramientas y de máquinas virtuales. Será interesante ver cómo se desarrolla el ecosistema aquí.

## Demo y estado

¡Puedes usar WasmGC hoy! Después de alcanzar [fase 4](https://github.com/WebAssembly/meetings/blob/main/process/phases.md#4-standardize-the-feature-working-group) en el W3C, WasmGC ahora es un estándar completo y finalizado, y Chrome 119 se lanzó con soporte para ello. Con ese navegador (o cualquier otro que tenga soporte para WasmGC; por ejemplo, se espera que Firefox 120 se lance con soporte para WasmGC más tarde este mes) puedes ejecutar esta [demostración de Flutter](https://flutterweb-wasm.web.app/) en la que Dart compilado en WasmGC maneja la lógica de la aplicación, incluidos sus widgets, diseño y animación.

![La demostración de Flutter ejecutándose en Chrome 119.](/_img/wasm-gc-porting/flutter-wasm-demo.png "Material 3 renderizado por Flutter WasmGC.")

## Cómo empezar

Si estás interesado en usar WasmGC, los siguientes enlaces pueden ser útiles:

- Hoy en día, varios toolchains tienen soporte para WasmGC, incluyendo [Dart](https://flutter.dev/wasm), [Java (J2Wasm)](https://github.com/google/j2cl/blob/master/docs/getting-started-j2wasm.md), [Kotlin](https://kotl.in/wasmgc), [OCaml (wasm_of_ocaml)](https://github.com/ocaml-wasm/wasm_of_ocaml) y [Scheme (Hoot)]( https://gitlab.com/spritely/guile-hoot).
- El [código fuente](https://gist.github.com/kripken/5cd3e18b6de41c559d590e44252eafff) del pequeño programa cuyo resultado mostramos en la sección de herramientas para desarrolladores es un ejemplo de cómo escribir un programa WasmGC de "hola mundo" a mano. (En particular, puedes ver el tipo `$Node` definido y luego creado usando `struct.new`.)
- La wiki de Binaryen tiene [documentación](https://github.com/WebAssembly/binaryen/wiki/GC-Implementation---Lowering-Tips) sobre cómo los compiladores pueden emitir código WasmGC que se optimice bien. Los enlaces anteriores a los diferentes toolchains que apuntan hacia WasmGC también pueden ser útiles para aprender, por ejemplo, puedes ver las pasadas y banderas de Binaryen que usan [Java](https://github.com/google/j2cl/blob/8609e47907cfabb7c038101685153d3ebf31b05b/build_defs/internal_do_not_use/j2wasm_application.bzl#L382-L415), [Dart](https://github.com/dart-lang/sdk/blob/f36c1094710bd51f643fb4bc84d5de4bfc5d11f3/sdk/bin/dart2wasm#L135) y [Kotlin](https://github.com/JetBrains/kotlin/blob/f6b2c642c2fff2db7f9e13cd754835b4c23e90cf/libraries/tools/kotlin-gradle-plugin/src/common/kotlin/org/jetbrains/kotlin/gradle/targets/js/binaryen/BinaryenExec.kt#L36-L67).

## Resumen

WasmGC es una forma nueva y prometedora de implementar lenguajes con GC en WebAssembly. Los puertos tradicionales en los cuales una máquina virtual se recompila a Wasm seguirán teniendo más sentido en algunos casos, pero esperamos que los puertos de WasmGC se conviertan en una técnica popular debido a sus beneficios: los puertos de WasmGC tienen la capacidad de ser más pequeños que los puertos tradicionales, incluso más pequeños que los programas WasmMVP escritos en C, C++ o Rust, y se integran mejor con la Web en aspectos como la recolección de ciclos, uso de memoria, herramientas para desarrolladores y más. WasmGC también es una representación más optimizable, lo que puede proporcionar beneficios significativos de velocidad así como oportunidades para compartir más esfuerzo de herramientas entre lenguajes.

