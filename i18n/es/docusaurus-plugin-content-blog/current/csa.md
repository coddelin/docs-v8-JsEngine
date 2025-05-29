---
title: &apos;Domando la complejidad arquitectónica en V8 — el CodeStubAssembler&apos;
author: &apos;[Daniel Clifford](https://twitter.com/expatdanno), ensamblador de CodeStubAssembler&apos;
date: 2017-11-16 13:33:37
tags:
  - internals
description: &apos;V8 tiene su propia abstracción sobre el código ensamblador: el CodeStubAssembler. El CSA permite a V8 optimizar rápidamente y de forma confiable las funciones de JS a un nivel bajo, todo mientras admite múltiples plataformas.&apos;
tweet: &apos;931184976481177600&apos;
---
En esta publicación queremos presentar el CodeStubAssembler (CSA), un componente en V8 que ha sido una herramienta muy útil para lograr algunos [grandes](/blog/optimizing-proxies) [mejoras](https://twitter.com/v8js/status/918119002437750784) [de rendimiento](https://twitter.com/_gsathya/status/900188695721984000) en las últimas versiones de V8. El CSA también mejoró significativamente la capacidad del equipo de V8 para optimizar rápidamente las funciones de JavaScript a un nivel bajo con un alto grado de confiabilidad, lo que mejoró la velocidad de desarrollo del equipo.

<!--truncate-->
## Una breve historia de las funciones integradas y el ensamblador escrito a mano en V8

Para entender el papel del CSA en V8, es importante comprender un poco del contexto y la historia que llevó a su desarrollo.

V8 exprime el rendimiento de JavaScript utilizando una combinación de técnicas. Para el código JavaScript que se ejecuta durante mucho tiempo, el compilador optimizador [TurboFan](/docs/turbofan) de V8 hace un gran trabajo acelerando todo el espectro de funcionalidades de ES2015+ para un rendimiento máximo. Sin embargo, V8 también necesita ejecutar JavaScript de corta duración de manera eficiente para un buen rendimiento base. Este es especialmente el caso de las llamadas **funciones integradas** en los objetos predefinidos que están disponibles para todos los programas JavaScript según lo definido por la [especificación ECMAScript](https://tc39.es/ecma262/).

Históricamente, muchas de estas funciones integradas fueron [autohospedadas](https://en.wikipedia.org/wiki/Self-hosting), es decir, fueron creadas por un desarrollador de V8 en JavaScript, aunque en un dialecto interno especial de V8. Para lograr un buen rendimiento, estas funciones autohospedadas se basan en los mismos mecanismos que usa V8 para optimizar el JavaScript proporcionado por el usuario. Al igual que el código proporcionado por el usuario, las funciones autohospedadas requieren una fase de calentamiento en la que se recopilan retroalimentaciones de tipo y necesitan ser compiladas por el compilador optimizador.

Aunque esta técnica proporciona un buen rendimiento integrado en algunas situaciones, es posible hacerlo mejor. La semántica exacta de las funciones predefinidas en `Array.prototype` está [especificada con gran detalle](https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object) en la especificación. Para casos especiales importantes y comunes, los implementadores de V8 saben de antemano exactamente cómo deberían funcionar estas funciones integradas al comprender la especificación, y utilizan este conocimiento para diseñar cuidadosamente versiones personalizadas y ajustadas a mano desde el principio. Estas _funciones integradas optimizadas_ manejan casos comunes sin calentamiento ni la necesidad de invocar el compilador optimizador, ya que, por construcción, el rendimiento base ya es óptimo desde la primera invocación.

Para exprimir el mejor rendimiento de las funciones JavaScript integradas escritas a mano (y de otros códigos de ruta rápida de V8 que también se llaman funciones integradas de manera algo confusa), los desarrolladores de V8 tradicionalmente escribían funciones integradas optimizadas en lenguaje ensamblador. Al usar ensamblador, las funciones integradas escritas a mano eran especialmente rápidas al, entre otras cosas, evitar llamadas costosas al código C++ de V8 a través de trampolines y al aprovechar el [ABI](https://en.wikipedia.org/wiki/Application_binary_interface) personalizado basado en registros de V8 que utiliza internamente para llamar a funciones JavaScript.

Debido a las ventajas del ensamblador escrito a mano, V8 acumuló literalmente decenas de miles de líneas de código ensamblador escrito a mano para las funciones integradas a lo largo de los años… _por plataforma_. Todas estas funciones integradas en ensamblador eran excelentes para mejorar el rendimiento, pero las nuevas funciones del lenguaje siempre se están estandarizando, y mantener y extender este ensamblador escrito a mano era laborioso y propenso a errores.

## Introducción al CodeStubAssembler

Los desarrolladores de V8 lucharon con un dilema durante muchos años: ¿es posible crear funciones integradas que tengan las ventajas del ensamblador escrito a mano sin ser frágiles y difíciles de mantener?

Con la llegada de TurboFan, la respuesta a esta pregunta finalmente es "sí". El backend de TurboFan utiliza una [representación intermedia](https://es.wikipedia.org/wiki/Representaci%C3%B3n_intermedia) (IR) multiplataforma para operaciones de máquina de bajo nivel. Esta IR de máquina de bajo nivel se utiliza como entrada para un selector de instrucciones, asignador de registros, programador de instrucciones y generador de código que producen muy buen código en todas las plataformas. El backend también conoce muchos de los trucos que se utilizan en los built-ins ensamblados manualmente de V8, por ejemplo, cómo usar y llamar a una ABI personalizada basada en registros, cómo admitir llamadas tail a nivel de máquina y cómo evitar la construcción de marcos de pila en funciones hojas. Ese conocimiento hace que el backend de TurboFan sea especialmente adecuado para generar código rápido que se integre bien con el resto de V8.

Esta combinación de funcionalidades hizo posible, por primera vez, una alternativa robusta y mantenible a los built-ins ensamblados manualmente. El equipo construyó un nuevo componente de V8, denominado CodeStubAssembler o CSA, que define un lenguaje de ensamblaje portátil construido sobre el backend de TurboFan. El CSA agrega una API para generar directamente el IR a nivel de máquina de TurboFan sin tener que escribir y analizar JavaScript ni aplicar las optimizaciones específicas de JavaScript de TurboFan. Aunque este camino rápido para la generación de código es algo que solo los desarrolladores de V8 pueden usar para acelerar el motor de V8 internamente, esta ruta eficiente para generar código ensamblado optimizado de manera multiplataforma beneficia directamente a todo el código JavaScript de los desarrolladores en los built-ins construidos con el CSA, incluidos los manejadores de bytecode críticos para el rendimiento del intérprete de V8, [Ignition](/docs/ignition).

![Las tuberías de compilación del CSA y JavaScript](/_img/csa/csa.svg)

La interfaz CSA incluye operaciones que son de muy bajo nivel y familiares para cualquiera que haya escrito código ensamblado alguna vez. Por ejemplo, incluye funcionalidades como "cargar este puntero de objeto desde una dirección dada" y "multiplicar estos dos números de 32 bits". El CSA tiene verificación de tipos a nivel de IR para detectar muchos errores de corrección en tiempo de compilación en lugar de en tiempo de ejecución. Por ejemplo, puede garantizar que un desarrollador de V8 no utilice accidentalmente un puntero de objeto cargado desde la memoria como entrada para una multiplicación de 32 bits. Este tipo de verificación de tipos simplemente no es posible con ensamblados manuales.

## Una prueba del CSA

Para entender mejor lo que ofrece el CSA, hagamos un ejemplo rápido. Agregaremos un nuevo built-in interno a V8 que devuelve la longitud de la cadena de un objeto si es un String. Si el objeto de entrada no es un String, el built-in devolverá `undefined`.

Primero, agregamos una línea al macro `BUILTIN_LIST_BASE` en el archivo [`builtin-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h) de V8 que declara el nuevo built-in llamado `GetStringLength` y especifica que tiene un solo parámetro de entrada que se identifica con la constante `kInputObject`:

```cpp
TFS(GetStringLength, kInputObject)
```

El macro `TFS` declara el built-in como un built-in de **T**urbo**F**an usando vinculación estándar de Code**S**tub, lo que simplemente significa que utiliza el CSA para generar su código y espera que los parámetros se pasen a través de los registros.

Luego podemos definir el contenido del built-in en [`builtins-string-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-string-gen.cc):

```cpp
TF_BUILTIN(GetStringLength, CodeStubAssembler) {
  Label not_string(this);

  // Obtener el objeto entrante utilizando la constante que definimos para
  // el primer parámetro.
  Node* const maybe_string = Parameter(Descriptor::kInputObject);

  // Verificar si la entrada es un Smi (una representación especial
  // de números pequeños). Esto debe hacerse antes de la verificación IsString
  // más abajo, ya que IsString asume que su argumento es un
  // puntero de objeto y no un Smi. Si el argumento es de hecho un
  // Smi, saltar a la etiqueta |not_string|.
  GotoIf(TaggedIsSmi(maybe_string), &not_string);

  // Verificar si el objeto de entrada es una cadena. Si no, saltar a
  // la etiqueta |not_string|.
  GotoIfNot(IsString(maybe_string), &not_string);

  // Cargar la longitud de la cadena (habiendo llegado a este fragmento de código
  // porque verificamos anteriormente que era una cadena) y devolverla
  // usando un "macro" de CSA LoadStringLength.
  Return(LoadStringLength(maybe_string));

  // Definir la ubicación de la etiqueta que es el objetivo de la verificación fallida
  // IsString más arriba.
  BIND(&not_string);

  // El objeto de entrada no es una cadena. Devolver la constante
  // undefined de JavaScript.
  Return(UndefinedConstant());
}
```

Nota que en el ejemplo anterior, se utilizan dos tipos de instrucciones. Hay instrucciones _primitivas_ de CSA que se traducen directamente a una o dos instrucciones de ensamblaje como `GotoIf` y `Return`. Existe un conjunto fijo de instrucciones primitivas predefinidas de CSA que corresponden aproximadamente a las instrucciones de ensamblaje más comúnmente utilizadas en una de las arquitecturas de chips compatibles con V8. Otras instrucciones en el ejemplo son instrucciones _macro_, como `LoadStringLength`, `TaggedIsSmi` y `IsString`, que son funciones de conveniencia para generar una o más instrucciones primitivas o macro en línea. Las instrucciones macro se utilizan para encapsular formas comunes de implementación de V8 para su reutilización fácil. Pueden ser arbitrariamente largas y los desarrolladores de V8 pueden definir nuevas instrucciones macro fácilmente cuando sea necesario.

Después de compilar V8 con los cambios mencionados anteriormente, podemos ejecutar `mksnapshot`, la herramienta que compila funciones integradas para prepararlas para el snapshot de V8, con la opción de línea de comandos `--print-code`. Esta opción imprime el código ensamblador generado para cada función integrada. Si hacemos un `grep` de `GetStringLength` en el resultado, obtenemos lo siguiente en x64 (el código de salida ha sido limpiado un poco para hacerlo más legible):

```asm
  test al,0x1
  jz not_string
  movq rbx,[rax-0x1]
  cmpb [rbx+0xb],0x80
  jnc not_string
  movq rax,[rax+0xf]
  retl
not_string:
  movq rax,[r13-0x60]
  retl
```

En plataformas ARM de 32 bits, el siguiente código es generado por `mksnapshot`:

```asm
  tst r0, #1
  beq +28 -> not_string
  ldr r1, [r0, #-1]
  ldrb r1, [r1, #+7]
  cmp r1, #128
  bge +12 -> not_string
  ldr r0, [r0, #+7]
  bx lr
not_string:
  ldr r0, [r10, #+16]
  bx lr
```

Aunque nuestra nueva función integrada utiliza una convención de llamadas no estándar (al menos no en C++), es posible escribir casos de prueba para ella. El siguiente código puede añadirse a [`test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc) para probar la función integrada en todas las plataformas:

```cpp
TEST(GetStringLength) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  // Prueba el caso donde la entrada es una cadena
  StubTester tester(isolate, zone, Builtins::kGetStringLength);
  Handle<String> input_string(
      isolate->factory()->
        NewStringFromAsciiChecked("Oktoberfest"));
  Handle<Object> result1 = tester.Call(input_string);
  CHECK_EQ(11, Handle<Smi>::cast(result1)->value());

  // Prueba el caso donde la entrada no es una cadena (por ejemplo, undefined)
  Handle<Object> result2 =
      tester.Call(factory->undefined_value());
  CHECK(result2->IsUndefined(isolate));
}
```

Para más detalles sobre cómo usar la CSA para diferentes tipos de funciones integradas y para más ejemplos, consulta [esta página de la wiki](/docs/csa-builtins).

## Un multiplicador de velocidad para desarrolladores de V8

La CSA es más que un lenguaje ensamblador universal que apunta a múltiples plataformas. Permite ciclos de desarrollo mucho más rápidos al implementar nuevas características en comparación con escribir código manual para cada arquitectura como solíamos hacerlo. Esto lo logra al proporcionar todos los beneficios del ensamblador escrito a mano mientras protege a los desarrolladores de sus trampas más insidiosas:

- Con la CSA, los desarrolladores pueden escribir código para funciones integradas utilizando un conjunto multiplataforma de primitivas de bajo nivel que se traducen directamente a instrucciones de ensamblador. El selector de instrucciones de la CSA asegura que este código sea óptimo en todas las plataformas que V8 apunta, sin requerir que los desarrolladores de V8 sean expertos en los lenguajes ensambladores de esas plataformas.
- La interfaz de la CSA tiene tipos opcionales para asegurar que los valores manipulados por el ensamblador generado sean del tipo que el autor del código espera.
- La asignación de registros entre las instrucciones de ensamblador la realiza automáticamente la CSA en lugar de explícitamente a mano, incluyendo la construcción de marcos de pila y el almacenamiento de valores en la pila si una función integrada usa más registros de los disponibles o realiza llamadas. Esto elimina toda una clase de errores sutiles y difíciles de encontrar que plagaron las funciones integradas escritas a mano. Al hacer que el código generado sea menos frágil, la CSA reduce drásticamente el tiempo requerido para escribir funciones integradas de bajo nivel correctas.
- La CSA entiende las convenciones de llamadas ABI, tanto estándar de C++ como las internas basadas en registros de V8, lo que hace posible interoperar fácilmente entre el código generado por CSA y otras partes de V8.
- Como el código de la CSA es C++, es fácil encapsular patrones comunes de generación de código en macros que pueden reutilizarse fácilmente en muchas funciones integradas.
- Dado que V8 usa la CSA para generar los manejadores de bytecode para Ignition, es muy fácil inyectar directamente la funcionalidad de las funciones integradas basadas en CSA en los manejadores para mejorar el rendimiento del intérprete.
- El marco de pruebas de V8 soporta probar la funcionalidad de la CSA y las funciones integradas generadas por CSA desde C++ sin necesidad de escribir adaptadores de ensamblador.

En definitiva, la CSA ha sido un gran cambio para el desarrollo de V8. Ha mejorado significativamente la capacidad del equipo para optimizar V8. Eso significa que podemos optimizar más rápidamente más partes del lenguaje JavaScript para los integradores de V8.
