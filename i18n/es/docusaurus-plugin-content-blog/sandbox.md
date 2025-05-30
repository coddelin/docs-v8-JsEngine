---
title: "El Sandbox de V8"
description: "V8 presenta un sandbox ligero en el proceso para limitar el impacto de errores de corrupción de memoria"
author: "Samuel Groß"
avatars: 
  - samuel-gross
date: 2024-04-04
tags: 
 - seguridad
---

Después de casi tres años desde el [documento de diseño inicial](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing) y [cientos de CLs](https://github.com/search?q=repo%3Av8%2Fv8+%5Bsandbox%5D&type=commits&s=committer-date&o=desc) en el ínterin, el Sandbox de V8 — un sandbox ligero dentro del proceso para V8 — ha avanzado hasta el punto en que ya no se considera una característica experimental de seguridad. A partir de hoy, el [Sandbox de V8 está incluido en el Programa de Recompensas de Vulnerabilidades de Chrome](https://g.co/chrome/vrp/#v8-sandbox-bypass-rewards) (VRP). Si bien todavía hay varios problemas por resolver antes de que se convierta en un límite de seguridad fuerte, la inclusión en el VRP es un paso importante en esa dirección. Por lo tanto, Chrome 123 podría considerarse una especie de versión "beta" para el sandbox. Este artículo del blog aprovecha esta oportunidad para discutir la motivación detrás del sandbox, mostrar cómo evita que la corrupción de memoria en V8 se propague dentro del proceso anfitrión y, en última instancia, explicar por qué es un paso necesario hacia la seguridad de la memoria.

<!--truncate-->

# Motivación

La seguridad de la memoria sigue siendo un problema relevante: todas las vulnerabilidades de Chrome [detectadas en estado salvaje en los últimos tres años](https://docs.google.com/spreadsheets/d/1lkNJ0uQwbeC1ZTRrxdtuPLCIl7mlUreoKfSIgajnSyY/edit?usp=sharing) (2021 – 2023) comenzaron con una vulnerabilidad de corrupción de memoria en un proceso de renderización de Chrome que fue explotada para ejecución remota de código (RCE). De estas, el 60% fueron vulnerabilidades en V8. Sin embargo, hay un detalle: las vulnerabilidades de V8 rara vez son errores de corrupción de memoria "clásicos" (uso después de liberar, accesos fuera de límites, etc.), sino problemas sutiles de lógica que, a su vez, pueden ser explotados para corromper la memoria. Como tal, las soluciones existentes para la seguridad de la memoria no son aplicables en su mayoría a V8. En particular, ni [cambiar a un lenguaje con seguridad de memoria](https://www.cisa.gov/resources-tools/resources/case-memory-safe-roadmaps), como Rust, ni usar características de seguridad de memoria de hardware actuales o futuras, como [etiquetado de memoria](https://newsroom.arm.com/memory-safety-arm-memory-tagging-extension), pueden ayudar con los desafíos de seguridad que enfrenta V8 hoy en día.

Para entender por qué, consideremos una vulnerabilidad hipotética y altamente simplificada de un motor de JavaScript: la implementación de `JSArray::fizzbuzz()`, que reemplaza los valores en el array que son divisibles por 3 con "fizz", divisibles por 5 con "buzz" y divisibles por ambos 3 y 5 con "fizzbuzz". A continuación, se muestra una implementación de esa función en C++. `JSArray::buffer_` puede considerarse como un `JSValue*`, es decir, un puntero a un array de valores de JavaScript, y `JSArray::length_` contiene el tamaño actual de ese buffer.

```cpp
 1. for (int index = 0; index < length_; index++) {
 2.     JSValue js_value = buffer_[index];
 3.     int value = ToNumber(js_value).int_value();
 4.     if (value % 15 == 0)
 5.         buffer_[index] = JSString("fizzbuzz");
 6.     else if (value % 5 == 0)
 7.         buffer_[index] = JSString("buzz");
 8.     else if (value % 3 == 0)
 9.         buffer_[index] = JSString("fizz");
10. }
```

¿Parece lo suficientemente simple? Sin embargo, hay un error algo sutil aquí: la conversión `ToNumber` en la línea 3 puede tener efectos secundarios ya que puede invocar callbacks de JavaScript definidos por el usuario. Dicho callback podría reducir el tamaño del array, lo que ocasionaría una escritura fuera de los límites posteriormente. El siguiente código de JavaScript probablemente causaría corrupción de memoria:

```js
let array = new Array(100);
let evil = { [Symbol.toPrimitive]() { array.length = 1; return 15; } };
array.push(evil);
// En el índice 100, el callback @@toPrimitive de |evil| se invoca en
// la línea 3 anterior, reduciendo el array a una longitud de 1 y
// reasignando su buffer de respaldo. La escritura posterior (línea 5)
// se realiza fuera de los límites.
array.fizzbuzz();
```


Aunque este es un error artificialmente simple (este patrón específico de errores se ha vuelto mayormente obsoleto debido a mejoras en los fuzzers, consciencia de los desarrolladores y atención de los investigadores), sigue siendo útil entender por qué las vulnerabilidades en los motores modernos de JavaScript son difíciles de mitigar de una manera genérica. Considere el enfoque de usar un lenguaje seguro de memoria como Rust, donde es responsabilidad del compilador garantizar la seguridad de la memoria. En el ejemplo anterior, un lenguaje seguro de memoria probablemente evitaría este error en el código de tiempo de ejecución escrito a mano utilizado por el intérprete. Sin embargo, *no* evitaría el error en cualquier compilador just-in-time ya que el error allí sería un problema lógico, no una vulnerabilidad de corrupción de memoria "clásica". Solo el código generado por el compilador sería realmente el causante de cualquier corrupción de memoria. Fundamentalmente, el problema es que *el compilador no puede garantizar la seguridad de la memoria si el compilador es directamente parte de la superficie de ataque*.

De manera similar, deshabilitar los compiladores JIT también sería solo una solución parcial: históricamente, aproximadamente la mitad de los errores descubiertos y explotados en V8 afectaron a uno de sus compiladores mientras que el resto estaba en otros componentes como funciones en tiempo de ejecución, el intérprete, el recolector de basura o el analizador. Usar un lenguaje seguro de memoria para estos componentes y eliminar los compiladores JIT podría funcionar, pero reduciría significativamente el rendimiento del motor (rango, dependiendo del tipo de carga de trabajo, de 1.5–10× o más para tareas computacionalmente intensivas).

Ahora considere, en cambio, mecanismos populares de seguridad de hardware, en particular [etiquetado de memoria](https://googleprojectzero.blogspot.com/2023/08/mte-as-implemented-part-1.html). Hay varias razones por las cuales el etiquetado de memoria tampoco sería una solución efectiva. Por ejemplo, los canales secundarios de la CPU, que pueden [ser explotados fácilmente desde JavaScript](https://security.googleblog.com/2021/03/a-spectre-proof-of-concept-for-spectre.html), podrían usarse para filtrar valores de etiqueta, permitiendo así que un atacante eluda la mitigación. Además, debido a la [compresión de punteros](https://v8.dev/blog/pointer-compression), actualmente no hay espacio para los bits de etiqueta en los punteros de V8. Como tal, toda la región del montón tendría que etiquetarse con la misma etiqueta, lo que haría imposible detectar corrupción entre objetos. Por lo tanto, aunque el etiquetado de memoria [puede ser muy efectivo en ciertas superficies de ataque](https://googleprojectzero.blogspot.com/2023/08/mte-as-implemented-part-2-mitigation.html), es poco probable que represente un obstáculo significativo para los atacantes en el caso de los motores JavaScript.

En resumen, los motores JavaScript modernos tienden a contener errores lógicos complejos de segundo orden que proporcionan primitivas de explotación poderosas. Estos no pueden ser protegidos efectivamente por las mismas técnicas utilizadas para vulnerabilidades típicas de corrupción de memoria. Sin embargo, casi todas las vulnerabilidades encontradas y explotadas en V8 hoy en día tienen una característica en común: la corrupción de memoria eventual necesariamente ocurre dentro del montón de V8 porque el compilador y el tiempo de ejecución (casi) operan exclusivamente en instancias de `HeapObject` de V8. Aquí es donde entra en juego el sandbox.


# El Sandbox de V8 (Heap)

La idea básica detrás del sandbox es aislar la memoria (heap) de V8 de modo que cualquier corrupción de memoria allí no pueda "propagarse" a otras partes de la memoria del proceso.

Como ejemplo motivador para el diseño del sandbox, considere la [separación del espacio de usuario y del núcleo](https://en.wikipedia.org/wiki/User_space_and_kernel_space) en los sistemas operativos modernos. Históricamente, todas las aplicaciones y el núcleo del sistema operativo compartían el mismo espacio de direcciones de memoria (física). Por lo tanto, cualquier error de memoria en una aplicación de usuario podría derribar todo el sistema al, por ejemplo, corromper la memoria del núcleo. Por otro lado, en un sistema operativo moderno, cada aplicación en espacio de usuario tiene su propio espacio de direcciones (virtual) dedicado. Como tal, cualquier error de memoria se limita a la aplicación misma, y el resto del sistema está protegido. En otras palabras, una aplicación defectuosa puede bloquearse a sí misma pero no afecta al resto del sistema. De manera similar, el Sandbox de V8 intenta aislar el código de JavaScript/WebAssembly no confiable ejecutado por V8 de tal manera que un error en V8 no afecte el resto del proceso anfitrión.

En principio, [el sandbox podría implementarse con soporte de hardware](https://docs.google.com/document/d/12MsaG6BYRB-jQWNkZiuM3bY8X2B2cAsCMLLdgErvK4c/edit?usp=sharing): similar a la división entre espacio de usuario y núcleo, V8 ejecutaría alguna instrucción de cambio de modo al ingresar o salir de código aislado, lo que haría que la CPU no pudiera acceder a la memoria fuera del sandbox. En la práctica, hoy en día no hay una característica de hardware adecuada disponible, y el sandbox actual se implementa por completo en software.

La idea básica detrás del [sandbox basado en software](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing) es reemplazar todos los tipos de datos que pueden acceder a memoria fuera del sandbox con alternativas "compatibles con el sandbox". En particular, todos los punteros (tanto a objetos en el heap de V8 como en otros lugares de memoria) y tamaños de 64 bits deben eliminarse, ya que un atacante podría corromperlos para acceder posteriormente a otra memoria en el proceso. Esto implica que regiones de memoria como la pila no pueden estar dentro del sandbox ya que deben contener punteros (por ejemplo, direcciones de retorno) debido a restricciones de hardware y del sistema operativo. Como tal, con el sandbox basado en software, solo el heap de V8 está dentro del sandbox, y la construcción general no es diferente al [modelo de sandboxing utilizado por WebAssembly](https://webassembly.org/docs/security/).

Para entender cómo esto funciona en la práctica, es útil observar los pasos que un exploit debe realizar después de corromper la memoria. El objetivo de un exploit RCE típicamente sería realizar un ataque de escalación de privilegios, por ejemplo, ejecutando código shell o llevando a cabo un ataque de estilo programación orientada a retornos (ROP). Para cualquiera de estos, el exploit primero deseará la capacidad de leer y escribir memoria arbitraria en el proceso, por ejemplo, para luego corromper un puntero de función o colocar una carga útil de ROP en algún lugar de la memoria y pivotar a ella. Dado un error que corrompe la memoria en el heap de V8, un atacante buscaría entonces un objeto como el siguiente:

```cpp
class JSArrayBuffer: public JSObject {
  private:
    byte* buffer_;
    size_t size_;
};
```

Dado esto, el atacante corruptiría posteriormente el puntero del buffer o el valor del tamaño para construir un primitivo de lectura/escritura arbitrario. Este es el paso que el sandbox apunta a prevenir. En particular, con el sandbox habilitado, y suponiendo que el buffer referenciado esté ubicado dentro del sandbox, el objeto anterior ahora se convertiría en:

```cpp
class JSArrayBuffer: public JSObject {
  private:
    sandbox_ptr_t buffer_;
    sandbox_size_t size_;
};
```

Donde `sandbox_ptr_t` es un desplazamiento de 40 bits (en el caso de un sandbox de 1TB) desde la base del sandbox. De manera similar, `sandbox_size_t` es un tamaño "compatible con el sandbox", [actualmente limitado a 32GB](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-internal.h;l=231;drc=5bdda7d5edcac16b698026b78c0eec6d179d3573).
Alternativamente, si el buffer referenciado estuviera ubicado fuera del sandbox, el objeto se convertiría en:

```cpp
class JSArrayBuffer: public JSObject {
  private:
    external_ptr_t buffer_;
};
```

Aquí, un `external_ptr_t` hace referencia al buffer (y su tamaño) mediante una tabla de punteros indirecta (no muy diferente de la [tabla de descriptores de archivo de un núcleo Unix](https://en.wikipedia.org/wiki/File_descriptor) o un [WebAssembly.Table](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Table)) que proporciona garantías de seguridad de memoria.

En ambos casos, un atacante se encontraría incapaz de "alcanzar" fuera del sandbox hacia otras partes del espacio de direcciones. En cambio, primero necesitaría una vulnerabilidad adicional: un bypass del Sandbox de V8. La siguiente imagen resume el diseño de alto nivel, y el lector interesado puede encontrar más detalles técnicos sobre el sandbox en los documentos de diseño vinculados desde [`src/sandbox/README.md`](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main/src/sandbox/README.md).

![Un diagrama de alto nivel del diseño del sandbox](/_img/sandbox/sandbox.svg)

Únicamente convertir punteros y tamaños a una representación diferente no es suficiente en una aplicación tan compleja como V8 y hay [una serie de otros problemas](https://issues.chromium.org/hotlists/4802478) que necesitan ser solucionados. Por ejemplo, con la introducción del sandbox, el código como el siguiente de repente se convierte en problemático:

```cpp
std::vector<std::string> JSObject::GetPropertyNames() {
    int num_properties = TotalNumberOfProperties();
    std::vector<std::string> properties(num_properties);

    for (int i = 0; i < NumberOfInObjectProperties(); i++) {
        properties[i] = GetNameOfInObjectProperty(i);
    }

    // Tratar con los otros tipos de propiedades
    // ...
```

Este código hace la (razonable) suposición de que el número de propiedades almacenadas directamente en un JSObject debe ser menor que el número total de propiedades de ese objeto. Sin embargo, asumiendo que estos números simplemente se almacenan como enteros en algún lugar del JSObject, un atacante podría corromper uno de ellos para romper este invariante. Posteriormente, el acceso al (fuera del sandbox) `std::vector` estaría fuera de límites. Agregar una verificación explícita de límites, por ejemplo con un [`SBXCHECK`](https://chromium.googlesource.com/v8/v8.git/+/0deeaf5f593b98d6a6a2bb64e3f71d39314c727c), solucionaría esto.

De manera alentadora, casi todas las "violaciones del sandbox" descubiertas hasta ahora son de este tipo: errores triviales (de primer orden) de corrupción de memoria como usos después de liberación o accesos fuera de límites debido a la falta de una verificación de límites. Contrario a las vulnerabilidades de segundo orden típicamente encontradas en V8, estos errores del sandbox podrían realmente prevenirse o mitigarse con los enfoques discutidos anteriormente. De hecho, el error particular anterior ya estaría mitigado hoy debido al [endurecimiento de libc++ de Chrome](http://issues.chromium.org/issues/40228527). Por lo tanto, la esperanza es que a largo plazo, el sandbox se convierta en una **frontera de seguridad más defendible** que el propio V8. Aunque el conjunto de datos actualmente disponible de errores del sandbox es muy limitado, la integración con VRP lanzada hoy esperará ayudar a producir una imagen más clara del tipo de vulnerabilidades encontradas en la superficie de ataque del sandbox.

## Rendimiento

Una gran ventaja de este enfoque es que es fundamentalmente económico: la sobrecarga causada por el sandbox proviene principalmente de la indirecta de la tabla de punteros para objetos externos (costando aproximadamente una carga adicional de memoria) y, en menor medida, del uso de desplazamientos en lugar de punteros en bruto (costando principalmente solo una operación de cambio+suma, que es muy económica). La sobrecarga actual del sandbox es, por lo tanto, de solo alrededor del 1% o menos en cargas de trabajo típicas (medido usando las suites de pruebas [Speedometer](https://browserbench.org/Speedometer3.0/) y [JetStream](https://browserbench.org/JetStream/)). Esto permite que el Sandbox de V8 esté habilitado de forma predeterminada en plataformas compatibles.

## Pruebas

Una característica deseable para cualquier límite de seguridad es la capacidad de prueba: la capacidad de probar manual y automáticamente que las garantías de seguridad prometidas realmente se cumplen en la práctica. Esto requiere un modelo de atacante claro, una forma de "emular" a un atacante y, idealmente, una manera de determinar automáticamente cuándo ha fallado el límite de seguridad. El Sandbox de V8 cumple con todos estos requisitos:

1. **Un modelo de atacante claro:** se asume que un atacante puede leer y escribir de manera arbitraria dentro del Sandbox de V8. El objetivo es prevenir la corrupción de memoria fuera del sandbox.
2. **Una forma de emular a un atacante:** V8 proporciona una "API de corrupción de memoria" cuando se compila con la bandera `v8_enable_memory_corruption_api = true`. Esto emula las primitivas obtenidas de vulnerabilidades típicas de V8 y, en particular, proporciona acceso completo de lectura y escritura dentro del sandbox.
3. **Una forma de detectar "violaciones del sandbox":** V8 proporciona un modo de prueba de sandbox (habilitado mediante `--sandbox-testing` o `--sandbox-fuzzing`) que instala un [manejador de señales](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/sandbox/testing.cc;l=425;drc=97b7d0066254778f766214d247b65d01f8a81ebb) que determina si una señal como `SIGSEGV` representa una violación de las garantías de seguridad del sandbox.

En última instancia, esto permite que el sandbox se integre en el programa VRP de Chrome y sea analizado por fuzzers especializados.

## Uso

El Sandbox de V8 debe habilitarse/deshabilitarse en tiempo de compilación usando la bandera de compilación `v8_enable_sandbox`. (Por razones técnicas) no es posible habilitar/deshabilitar el sandbox en tiempo de ejecución. El Sandbox de V8 requiere un sistema de 64 bits ya que necesita reservar una gran cantidad de espacio de direcciones virtuales, actualmente un terabyte.

El Sandbox de V8 ya ha sido habilitado de manera predeterminada en versiones de 64 bits (específicamente x64 y arm64) de Chrome en Android, ChromeOS, Linux, macOS y Windows durante aproximadamente los últimos dos años. Aunque el sandbox no estaba (y aún no está) completamente desarrollado, esto se hizo principalmente para garantizar que no cause problemas de estabilidad y para recopilar estadísticas de rendimiento en condiciones reales. En consecuencia, los exploits recientes de V8 ya tuvieron que superar el sandbox, proporcionando comentarios útiles anticipados sobre sus propiedades de seguridad.


# Conclusión

El Sandbox de V8 es un nuevo mecanismo de seguridad diseñado para evitar que la corrupción de memoria en V8 impacte en otras partes de la memoria del proceso. El sandbox está motivado por el hecho de que las tecnologías actuales de seguridad de memoria son en gran medida inaplicables para optimizar motores de JavaScript. Aunque estas tecnologías no logran prevenir la corrupción de memoria en V8 en sí, pueden proteger la superficie de ataque del sandbox de V8. Por lo tanto, el sandbox es un paso necesario hacia la seguridad de la memoria.
