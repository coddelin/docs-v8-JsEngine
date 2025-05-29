---
title: 'Manual de usuario de V8 Torque'
description: 'Este documento explica el lenguaje V8 Torque, tal como se utiliza en la base de código de V8.'
---
V8 Torque es un lenguaje que permite a los desarrolladores que contribuyen al proyecto V8 expresar cambios en la máquina virtual centrándose en la _intención_ de sus cambios, en lugar de preocuparse por detalles de implementación no relacionados. El lenguaje fue diseñado para ser lo suficientemente simple para facilitar la traducción directa de la [especificación ECMAScript](https://tc39.es/ecma262/) a una implementación en V8, pero lo suficientemente potente para expresar los trucos de optimización de bajo nivel de V8 de manera robusta, como crear caminos rápidos basados en pruebas de formas específicas de objetos.

Torque resultará familiar para los ingenieros de V8 y los desarrolladores de JavaScript, combinando una sintaxis similar a TypeScript que facilita tanto la escritura como la comprensión del código de V8 con una sintaxis y tipos que reflejan conceptos ya comunes en el [`CodeStubAssembler`](/blog/csa). Con un sistema sólido de tipos y un flujo de control estructurado, Torque garantiza la corrección por construcción. La expresividad de Torque es suficiente para expresar casi toda la funcionalidad que [actualmente se encuentra en los builtins de V8](/docs/builtin-functions). También es muy interoperable con los builtins y `macro`s de `CodeStubAssembler` escritos en C++, lo que permite que el código Torque utilice funcionalidad CSA escrita a mano y viceversa.

Torque proporciona constructos de lenguaje para representar fragmentos de implementación de V8 de alto nivel y ricos en semántica, y el compilador de Torque convierte estos fragmentos en código ensamblador eficiente utilizando el `CodeStubAssembler`. Tanto la estructura del lenguaje de Torque como la verificación de errores del compilador de Torque garantizan la corrección en formas que anteriormente eran laboriosas y propensas a errores con el uso directo del `CodeStubAssembler`. Tradicionalmente, escribir un código óptimo con el `CodeStubAssembler` requería que los ingenieros de V8 tuviesen en su mente una gran cantidad de conocimientos especializados —muchos de los cuales nunca se capturaban formalmente en ninguna documentación escrita— para evitar errores sutiles en su implementación. Sin ese conocimiento, la curva de aprendizaje para escribir builtins eficientes era pronunciada. Incluso con el conocimiento necesario, trampas no obvias y no reguladas frecuentemente conducían a errores de corrección o [seguridad](https://bugs.chromium.org/p/chromium/issues/detail?id=775888) [bugs](https://bugs.chromium.org/p/chromium/issues/detail?id=785804). Con Torque, muchas de estas trampas pueden ser evitadas y reconocidas automáticamente por el compilador de Torque.

## Comenzando

La mayoría de los recursos escritos en Torque se registran en el repositorio V8 bajo [el directorio `src/builtins`](https://github.com/v8/v8/tree/master/src/builtins), con la extensión de archivo `.tq`. Las definiciones Torque de las clases de V8 asignadas en el montón se encuentran junto a sus definiciones en C++, en archivos `.tq` con el mismo nombre que los archivos C++ correspondientes en `src/objects`. El compilador Torque real se puede encontrar en [`src/torque`](https://github.com/v8/v8/tree/master/src/torque). Las pruebas de funcionalidad Torque se registran bajo [`test/torque`](https://github.com/v8/v8/tree/master/test/torque), [`test/cctest/torque`](https://github.com/v8/v8/tree/master/test/cctest/torque), y [`test/unittests/torque`](https://github.com/v8/v8/tree/master/test/unittests/torque).

Para darte una idea del lenguaje, escribamos un builtin de V8 que imprima “¡Hola Mundo!”. Para hacer esto, agregaremos un `macro` de Torque en un caso de prueba y lo llamaremos desde el marco de prueba `cctest`.

Comienza abriendo el archivo `test/torque/test-torque.tq` y agrega el siguiente código al final (pero antes del último `}` de cierre):

```torque
@export
macro PrintHelloWorld(): void {
  Print('¡Hola Mundo!');
}
```

A continuación, abre `test/cctest/torque/test-torque.cc` y agrega el siguiente caso de prueba que utiliza el nuevo código Torque para construir un código stub:

```cpp
TEST(HelloWorld) {
  Isolate* isolate(CcTest::InitIsolateOnce());
  CodeAssemblerTester asm_tester(isolate, JSParameterCount(0));
  TestTorqueAssembler m(asm_tester.state());
  {
    m.PrintHelloWorld();
    m.Return(m.UndefinedConstant());
  }
  FunctionTester ft(asm_tester.GenerateCode(), 0);
  ft.Call();
}
```

Luego [compila el ejecutable `cctest`](/docs/test), y finalmente ejecuta la prueba `cctest` para imprimir ‘¡Hola Mundo!’:

```bash
$ out/x64.debug/cctest test-torque/HelloWorld
¡Hola Mundo!
```

## Cómo Torque genera código

El compilador Torque no crea código de máquina directamente, sino que genera código C++ que utiliza la interfaz existente `CodeStubAssembler` de V8. El `CodeStubAssembler` utiliza el backend del [compilador TurboFan](https://v8.dev/docs/turbofan) para generar código eficiente. Por lo tanto, la compilación con Torque requiere varios pasos:

1. La construcción con `gn` primero ejecuta el compilador Torque. Procesa todos los archivos `*.tq`. Cada archivo Torque `path/to/file.tq` origina la generación de los siguientes archivos:
    - `path/to/file-tq-csa.cc` y `path/to/file-tq-csa.h` contienen macros CSA generadas.
    - `path/to/file-tq.inc` para ser incluido en un encabezado correspondiente `path/to/file.h` que contiene las definiciones de clase.
    - `path/to/file-tq-inl.inc` para ser incluido en el encabezado en línea correspondiente `path/to/file-inl.h`, que contiene los accesores C++ de las definiciones de clase.
    - `path/to/file-tq.cc` contiene verificadores de heap generados, impresoras, etc.

    El compilador Torque también genera varios otros archivos `.h` conocidos, destinados a ser utilizados por la compilación de V8.
1. La compilación `gn` luego compila los archivos `-csa.cc` generados en el paso 1 en el ejecutable `mksnapshot`.
1. Cuando se ejecuta `mksnapshot`, todos los builtins de V8 se generan y se empaquetan en el archivo de snapshot, incluyendo aquellos que se definen en Torque y cualquier otro builtin que utilice funcionalidad definida en Torque.
1. El resto de V8 se construye. Todos los builtins creados con Torque se hacen accesibles a través del archivo de snapshot que se vincula en V8. Pueden ser llamados como cualquier otro builtin. Además, el ejecutable `d8` o `chrome` también incluye directamente las unidades de compilación generadas relacionadas con las definiciones de clase.

Gráficamente, el proceso de construcción se ve así:

<figure>
  <img src="/_img/docs/torque/build-process.svg" width="800" height="480" alt="" loading="lazy"/>
</figure>

## Herramientas Torque

Las herramientas básicas y soporte para el entorno de desarrollo están disponibles para Torque.

- Existe un [plugin para Visual Studio Code](https://github.com/v8/vscode-torque) para Torque, que utiliza un servidor de lenguaje personalizado para proporcionar características como ir a la definición.
- También hay una herramienta de formato que debe usarse después de cambiar archivos `.tq`: `tools/torque/format-torque.py -i <filename>`

## Solución de problemas en compilaciones que involucran Torque

¿Por qué necesitas saber esto? Entender cómo los archivos Torque se convierten en código máquina es importante porque diferentes problemas (y errores) pueden surgir en las distintas etapas de traducir Torque en los bits binarios incrustados en el snapshot:

- Si tienes un error de sintaxis o semántica en el código Torque (es decir, un archivo `.tq`), el compilador Torque falla. La compilación de V8 se detiene durante esta etapa, y no verás otros errores que puedan ser descubiertos en las partes posteriores de la compilación.
- Una vez que tu código Torque es sintácticamente correcto y pasa los (más o menos) rigurosos chequeos semánticos del compilador Torque, la construcción de `mksnapshot` aún puede fallar. Esto ocurre con mayor frecuencia debido a inconsistencias en las definiciones externas proporcionadas en archivos `.tq`. Las definiciones marcadas con la palabra clave `extern` en el código Torque indican al compilador Torque que la definición de la funcionalidad requerida se encuentra en C++. Actualmente, el acoplamiento entre definiciones `extern` de archivos `.tq` y el código C++ al que esas definiciones `extern` hacen referencia es débil, y no hay verificación en tiempo de compilación Torque de ese acoplamiento. Cuando las definiciones `extern` no coinciden (o en los casos más sutiles enmascaran) la funcionalidad que acceden en el archivo de encabezado `code-stub-assembler.h` u otros encabezados de V8, la compilación C++ de `mksnapshot` falla.
- Incluso cuando `mksnapshot` se construye exitosamente, puede fallar durante la ejecución. Esto podría suceder porque Turbofan no logra compilar el código CSA generado, por ejemplo, porque un `static_assert` de Torque no puede ser verificado por Turbofan. Además, los builtins proporcionados por Torque que se ejecutan durante la creación del snapshot podrían tener un error. Por ejemplo, `Array.prototype.splice`, un builtin creado con Torque, se llama como parte del proceso de inicialización del snapshot de JavaScript para configurar el entorno predeterminado de JavaScript. Si hay un error en la implementación, `mksnapshot` se bloquea durante la ejecución. Cuando `mksnapshot` se bloquea, a veces es útil llamarlo pasando el flag `--gdb-jit-full`, que genera información de depuración adicional que proporciona contexto útil, por ejemplo, nombres para los builtins generados por Torque en rastreos de pila de `gdb`.
- Por supuesto, incluso si el código creado con Torque supera `mksnapshot`, aún puede ser defectuoso o fallar. Agregar casos de prueba a `torque-test.tq` y `torque-test.cc` es una buena manera de asegurar que tu código Torque haga lo que realmente esperas. Si tu código Torque termina fallando en `d8` o `chrome`, el flag `--gdb-jit-full` nuevamente es muy útil.

## `constexpr`: tiempo de compilación vs. tiempo de ejecución

Entender el proceso de construcción Torque también es importante para comprender una característica central en el lenguaje Torque: `constexpr`.

Torque permite la evaluación de expresiones en el código Torque en tiempo de ejecución (es decir, cuando los builtins de V8 se ejecutan como parte de la ejecución de JavaScript). Sin embargo, también permite que las expresiones se ejecuten en tiempo de compilación (es decir, como parte del proceso de construcción Torque y antes de que la biblioteca V8 y el ejecutable `d8` hayan sido creados).

Torque utiliza la palabra clave `constexpr` para indicar que una expresión debe evaluarse en tiempo de construcción. Su uso es algo similar a [`constexpr` de C++](https://en.cppreference.com/w/cpp/language/constexpr): además de tomar prestada la palabra clave `constexpr` y parte de su sintaxis de C++, Torque utiliza `constexpr` de manera similar para marcar la distinción entre la evaluación en tiempo de compilación y en tiempo de ejecución.

Sin embargo, existen algunas diferencias sutiles en la semántica de `constexpr` de Torque. En C++, las expresiones `constexpr` pueden evaluarse completamente por el compilador de C++. En Torque, las expresiones `constexpr` no pueden evaluarse completamente por el compilador de Torque, sino que se mapean a tipos, variables y expresiones de C++ que pueden (y deben) evaluarse completamente al ejecutar `mksnapshot`. Desde la perspectiva del escritor de Torque, las expresiones `constexpr` no generan código ejecutado en tiempo de ejecución, por lo que en ese sentido son de tiempo de compilación, aunque técnicamente son evaluadas por código de C++ externo a Torque que ejecuta `mksnapshot`. Entonces, en Torque, `constexpr` esencialmente significa “`mksnapshot`-time”, no “tiempo de compilación”.

En combinación con genéricos, `constexpr` es una herramienta poderosa de Torque que puede utilizarse para automatizar la generación de múltiples funciones integradas especializadas muy eficientes que difieren entre sí en un pequeño número de detalles específicos que los desarrolladores de V8 pueden anticipar de antemano.

## Archivos

El código Torque se empaqueta en archivos de origen individuales. Cada archivo de origen consiste en una serie de declaraciones, que opcionalmente pueden estar encapsuladas en una declaración de espacio de nombres para separar los espacios de nombres de las declaraciones. La siguiente descripción de la gramática probablemente esté desactualizada. La fuente de verdad es [la definición de la gramática en el compilador Torque](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::TorqueGrammar), que está escrita utilizando reglas de gramática libre de contexto.

Un archivo Torque es una secuencia de declaraciones. Las posibles declaraciones se enumeran [en `torque-parser.cc`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::declaration).

## Espacios de nombres

Los espacios de nombres de Torque permiten que las declaraciones se encuentren en espacios de nombres independientes. Son similares a los espacios de nombres de C++. Permiten crear declaraciones que no son automáticamente visibles en otros espacios de nombres. Pueden ser anidados, y las declaraciones dentro de un espacio de nombres anidado pueden acceder a las declaraciones en el espacio de nombres que los contiene sin calificación. Las declaraciones que no están explícitamente en una declaración de espacio de nombres se colocan en un espacio de nombres global predeterminado compartido que es visible para todos los espacios de nombres. Los espacios de nombres pueden ser reabiertos, permitiendo que se definan en múltiples archivos.

Por ejemplo:

```torque
macro IsJSObject(o: Object): bool { … }  // En el espacio de nombres predeterminado

namespace array {
  macro IsJSArray(o: Object): bool { … }  // En el espacio de nombres array
};

namespace string {
  // …
  macro TestVisibility() {
    IsJsObject(o); // OK, espacio de nombres global visible aquí
    IsJSArray(o);  // ERROR, no visible en este espacio de nombres
    array::IsJSArray(o);  // OK, calificación explícita del espacio de nombres
  }
  // …
};

namespace array {
  // OK, el espacio de nombres ha sido reabierto.
  macro EnsureWriteableFastElements(array: JSArray){ … }
};
```

## Declaraciones

### Tipos

Torque tiene un sistema de tipos estricto. Su sistema de tipos es la base de muchas de las garantías de seguridad y corrección que proporciona.

Para muchos tipos básicos, Torque no conoce inherentemente mucho sobre ellos. En su lugar, muchos tipos están acoplados libremente con el `CodeStubAssembler` y los tipos de C++ mediante mapeos de tipos explícitos y confían en el compilador de C++ para aplicar el rigor de ese mapeo. Tales tipos se realizan como tipos abstractos.

#### Tipos abstractos

Los tipos abstractos de Torque se mapean directamente a valores de tiempo de compilación en C++ y de tiempo de ejecución en CodeStubAssembler. Sus declaraciones especifican un nombre y una relación con los tipos de C++:

```grammar
AbstractTypeDeclaration :
  type IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt ConstexprDeclaration opt

ExtendsDeclaration :
  extends IdentifierName ;

GeneratesDeclaration :
  generates StringLiteral ;

ConstexprDeclaration :
  constexpr StringLiteral ;
```

`IdentifierName` especifica el nombre del tipo abstracto y `ExtendsDeclaration` opcionalmente especifica el tipo del que deriva el tipo declarado. `GeneratesDeclaration` opcionalmente especifica un literal de cadena que corresponde al tipo de C++ `TNode` utilizado en el código de `CodeStubAssembler` para contener un valor en tiempo de ejecución de su tipo. `ConstexprDeclaration` es un literal de cadena que especifica el tipo de C++ correspondiente a la versión `constexpr` del tipo Torque para la evaluación en tiempo de construcción (`mksnapshot`-time).

Aquí hay un ejemplo de `base.tq` para los tipos de enteros con signo de 31 y 32 bits en Torque:

```torque
type int32 generates 'TNode<Int32T>' constexpr 'int32_t';
type int31 extends int32 generates 'TNode<Int32T>' constexpr 'int31_t';
```

#### Tipos de unión

Los tipos de unión expresan que un valor pertenece a uno de varios tipos posibles. Solo permitimos tipos de unión para valores etiquetados, porque pueden distinguirse en tiempo de ejecución utilizando el puntero de mapa. Por ejemplo, los números de JavaScript son valores Smi o objetos `HeapNumber` asignados.

```torque
type Number = Smi | HeapNumber;
```

Los tipos de unión satisfacen las siguientes igualdades:

- `A | B = B | A`
- `A | (B | C) = (A | B) | C`
- `A | B = A` si `B` es un subtipo de `A`

Solo está permitido formar tipos de unión a partir de tipos etiquetados porque los tipos no etiquetados no pueden distinguirse en tiempo de ejecución.

Al mapear tipos de unión a CSA, se selecciona el supertipo común más específico de todos los tipos del tipo unión, con la excepción de `Number` y `Numeric`, que se mapean a los tipos de unión CSA correspondientes.

#### Tipos de clase

Los tipos de clase permiten definir, asignar y manipular objetos estructurados en el montón GC de V8 desde el código Torque. Cada tipo de clase Torque debe corresponder a una subclase de HeapObject en el código C++. Para minimizar el costo de mantener el código repetitivo de acceso a objetos entre la implementación de Torque y C++ de V8, las definiciones de clase Torque se utilizan para generar el código requerido de acceso a objetos C++ siempre que sea posible (y apropiado) para reducir las molestias de mantener C++ y Torque sincronizados manualmente.

```grammar
DeclaraciónDeClase:
  ClaseAnotación* extern opt transient opt class NombreIdentificador DeclaraciónExtiende opt DeclaraciónGenera opt {
    DeclaraciónMétodoDeClase*
    DeclaraciónCampoDeClase*
  }

ClaseAnotación:
  @doNotGenerateCppClass
  @generateBodyDescriptor
  @generatePrint
  @abstract
  @export
  @noVerifier
  @hasSameInstanceTypeAsParent
  @highestInstanceTypeWithinParentClassRange
  @lowestInstanceTypeWithinParentClassRange
  @reserveBitsInInstanceType ( NumericLiteral )
  @apiExposedInstanceTypeValue ( NumericLiteral )

DeclaraciónMétodoDeClase:
  transitioning opt NombreIdentificador ParámetrosImplícitos opt ParámetrosExplícitos TipoRetorno opt DeclaraciónEtiquetas opt BloqueInstrucción

DeclaraciónCampoDeClase:
  ClaseAnotaciónCampo* weak opt const opt DeclaraciónCampo;

ClaseAnotaciónCampo:
  @noVerifier
  @if ( Identificador )
  @ifnot ( Identificador )

DeclaraciónCampo:
  Identificador EspecificadorArray opt : Tipo ;

EspecificadorArray:
  [ Expresión ]
```

Una clase de ejemplo:

```torque
extern class JSProxy extends JSReceiver {
  target: JSReceiver|Null;
  handler: JSReceiver|Null;
}
```

`extern` significa que esta clase está definida en C++, en lugar de ser definida solo en Torque.

Las declaraciones de campo en las clases generan implícitamente getters y setters de campo que pueden ser utilizados desde CodeStubAssembler, por ejemplo:

```cpp
// En TorqueGeneratedExportedMacrosAssembler:
TNode<HeapObject> LoadJSProxyTarget(TNode<JSProxy> p_o);
void StoreJSProxyTarget(TNode<JSProxy> p_o, TNode<HeapObject> p_v);
```

Como se describe arriba, los campos definidos en las clases Torque generan código C++ que elimina la necesidad de código repetitivo duplicado de accesores y visitantes de montón. La definición escrita a mano de JSProxy debe heredar de una plantilla de clase generada, como esta:

```cpp
// En js-proxy.h:
class JSProxy : public TorqueGeneratedJSProxy<JSProxy, JSReceiver> {

  // Todo lo que la clase necesite además de lo generado por Torque va aquí...

  // Al final, porque interfiere con público/privado:
  TQ_OBJECT_CONSTRUCTORS(JSProxy)
}

// En js-proxy-inl.h:
TQ_OBJECT_CONSTRUCTORS_IMPL(JSProxy)
```

La clase generada proporciona funciones de conversión, funciones de acceso a campos y constantes de desplazamiento de campo (por ejemplo, `kTargetOffset` y `kHandlerOffset` en este caso) que representan el desplazamiento en bytes de cada campo desde el principio de la clase.

##### Anotaciones de tipo de clase

Algunas clases no pueden usar el patrón de herencia mostrado en el ejemplo anterior. En esos casos, la clase puede especificar `@doNotGenerateCppClass`, heredar directamente de su tipo de superclase y incluir un macro generado por Torque para sus constantes de desplazamiento de campo. Dichas clases deben implementar sus propios accesores y funciones de conversión. Usar ese macro se ve así:

```cpp
class JSProxy : public JSReceiver {
 public:
  DEFINE_FIELD_OFFSET_CONSTANTS(
      JSReceiver::kHeaderSize, TORQUE_GENERATED_JS_PROXY_FIELDS)
  // Resto de la clase omitido...
}
```

`@generateBodyDescriptor` hace que Torque emita un `BodyDescriptor` de clase dentro de la clase generada, que representa cómo el recolector de basura debe visitar el objeto. De lo contrario, el código C++ debe definir su propia visita al objeto o usar uno de los patrones existentes (por ejemplo, heredar de `Struct` e incluir la clase en `STRUCT_LIST` significa que se espera que la clase contenga solo valores etiquetados).

Si se agrega la anotación `@generatePrint`, el generador implementará una función C++ que imprime los valores de los campos como se define en el diseño Torque. Usando el ejemplo de JSProxy, la firma sería `void TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyPrint(std::ostream& os)`, que puede ser heredada por `JSProxy`.

El compilador Torque también genera código de verificación para todas las clases `extern`, a menos que la clase se excluya con la anotación `@noVerifier`. Por ejemplo, la definición de clase JSProxy anterior generará un método C++ `void TorqueGeneratedClassVerifiers::JSProxyVerify(JSProxy o, Isolate* isolate)` que verifica que sus campos sean válidos según la definición de tipo de Torque. También generará una función correspondiente en la clase generada, `TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyVerify`, que llama a la función estática de `TorqueGeneratedClassVerifiers`. Si deseas agregar una verificación adicional para una clase (como un rango de valores aceptables en un número, o un requisito de que el campo `foo` sea verdadero si el campo `bar` no es nulo, etc.), agrega `DECL_VERIFIER(JSProxy)` a la clase C++ (que oculta el `JSProxyVerify` heredado) y impleméntalo en `src/objects-debug.cc`. El primer paso de cualquier verificador personalizado debe ser llamar al verificador generado, como `TorqueGeneratedClassVerifiers::JSProxyVerify(*this, isolate);`. (Para ejecutar esos verificadores antes y después de cada GC, compila con `v8_enable_verify_heap = true` y ejecuta con `--verify-heap`.)

`@abstract` indica que la clase en sí misma no se instancia y que no tiene su propio tipo de instancia: los tipos de instancia que lógicamente pertenecen a la clase son los tipos de instancia de las clases derivadas.

La anotación `@export` hace que el compilador Torque genere una clase concreta en C++ (como `JSProxy` en el ejemplo anterior). Esto obviamente solo es útil si no deseas agregar ninguna funcionalidad en C++ más allá de la proporcionada por el código generado por Torque. No puede ser utilizado junto con `extern`. Para una clase que se define y utiliza solo dentro de Torque, lo más apropiado es no usar ni `extern` ni `@export`.

`@hasSameInstanceTypeAsParent` indica clases que tienen los mismos tipos de instancia que su clase padre, pero renombran algunos campos o posiblemente tienen un mapa diferente. En tales casos, la clase padre no es abstracta.

Las anotaciones `@highestInstanceTypeWithinParentClassRange`, `@lowestInstanceTypeWithinParentClassRange`, `@reserveBitsInInstanceType` y `@apiExposedInstanceTypeValue` afectan la generación de tipos de instancia. En general, puedes ignorarlas y estar bien. Torque es responsable de asignar un valor único en la enumeración `v8::internal::InstanceType` para cada clase, de modo que V8 pueda determinar en tiempo de ejecución el tipo de cualquier objeto en el heap JS. La asignación de tipos de instancia por Torque debería ser adecuada en la gran mayoría de los casos, pero hay algunos casos en los que queremos que un tipo de instancia para una clase en particular sea estable entre compilaciones, o que esté al principio o al final del rango de tipos de instancia asignados a su superclase, o que sea un rango de valores reservados que puedan definirse fuera de Torque.

##### Campos de clase

Además de los valores simples, como en el ejemplo anterior, los campos de clase pueden contener datos indexados. Aquí hay un ejemplo:

```torque
extern class CoverageInfo extends HeapObject {
  const slot_count: int32;
  slots[slot_count]: CoverageInfoSlot;
}
```

Esto significa que las instancias de `CoverageInfo` son de tamaños variables según los datos en `slot_count`.

A diferencia de C++, Torque no agregará automáticamente relleno entre los campos; en su lugar, fallará y emitirá un error si los campos no están correctamente alineados. Torque también requiere que los campos fuertes, los campos débiles y los campos escalares estén agrupados con otros campos de la misma categoría en el orden de los campos.

`const` significa que un campo no puede ser alterado en tiempo de ejecución (o al menos no fácilmente; Torque fallará en la compilación si intentas configurarlo). Esto es una buena idea para los campos de longitud, que solo deberían ser restablecidos con mucho cuidado porque requerirían liberar cualquier espacio ya liberado y podrían causar condiciones de competencia de datos con un hilo de marcado.
De hecho, Torque requiere que los campos de longitud utilizados para datos indexados sean `const`.

`weak` al comienzo de una declaración de campo significa que el campo es una referencia débil personalizada, en lugar del mecanismo de etiquetado `MaybeObject` para campos débiles.
Además, `weak` afecta la generación de constantes como `kEndOfStrongFieldsOffset` y `kStartOfWeakFieldsOffset`, que es una característica heredada utilizada en algunos `BodyDescriptor` personalizados y actualmente también sigue requiriendo agrupar campos marcados como `weak` juntos. Esperamos eliminar esta palabra clave una vez que Torque sea completamente capaz de generar todos los `BodyDescriptor`.

Si el objeto almacenado en un campo puede ser una referencia débil al estilo `MaybeObject` (con el segundo bit establecido), entonces se debe usar `Weak<T>` en el tipo y la palabra clave `weak` **no** debe utilizarse. Aún hay algunas excepciones a esta regla, como este campo de `Map`, que puede contener algunos tipos fuertes y algunos débiles, y también está marcado como `weak` para su inclusión en la sección débil:

```torque
  weak transitions_or_prototype_info: Map|Weak<Map>|TransitionArray|
      PrototypeInfo|Smi;
```

`@if` y `@ifnot` marcan campos que deberían incluirse en algunas configuraciones de compilación y no en otras. Aceptan valores de la lista en `BuildFlags`, en `src/torque/torque-parser.cc`.

##### Clases definidas completamente fuera de Torque

Algunas clases no están definidas en Torque, pero Torque debe conocer todas las clases porque es responsable de asignar tipos de instancia. Para este caso, las clases pueden ser declaradas sin cuerpo, y Torque no generará nada para ellas excepto el tipo de instancia. Ejemplo:

```torque
extern class OrderedHashMap extends HashTable;
```

#### Formas

Definir una `shape` se ve igual a definir una `class`, excepto que utiliza la palabra clave `shape` en lugar de `class`. Una `shape` es un subtipo de `JSObject` que representa una disposición puntual de propiedades en el objeto (en términos de especificación, estas son "propiedades de datos" en lugar de "ranuras internas"). Una `shape` no tiene su propio tipo de instancia. Un objeto con una `shape` particular puede cambiar y perder esa `shape` en cualquier momento porque el objeto podría entrar en modo diccionario y mover todas sus propiedades a un almacenamiento secundario separado.

#### Estructuras

`struct`s son colecciones de datos que pueden pasarse fácilmente juntas. (Totalmente no relacionado con la clase llamada `Struct`). Al igual que las clases, pueden incluir macros que operan sobre los datos. A diferencia de las clases, también soportan genéricos. La sintaxis es similar a la de una clase:

```torque
@export
struct PromiseResolvingFunctions {
  resolve: JSFunction;
  reject: JSFunction;
}

struct ConstantIterator<T: type> {
  macro Empty(): bool {
    return false;
  }
  macro Next(): T labels _NoMore {
    return this.value;
  }

  value: T;
}
```

##### Anotaciones de struct

Cualquier struct marcado como `@export` será incluido con un nombre predecible en el archivo generado `gen/torque-generated/csa-types.h`. El nombre se antepone con `TorqueStruct`, por lo que `PromiseResolvingFunctions` se convierte en `TorqueStructPromiseResolvingFunctions`.

Los campos de un struct pueden ser marcados como `const`, lo que significa que no deben ser escritos. Todo el struct aún puede ser sobrescrito.

##### Structs como campos de clase

Un struct puede usarse como el tipo de un campo de clase. En ese caso, representa datos empaquetados y ordenados dentro de la clase (de lo contrario, los structs no tienen requisitos de alineación). Esto es particularmente útil para campos indexados en las clases. Por ejemplo, `DescriptorArray` contiene un arreglo de structs de tres valores:

```torque
struct DescriptorEntry {
  key: Name|Undefined;
  details: Smi|Undefined;
  value: JSAny|Weak<Map>|AccessorInfo|AccessorPair|ClassPositions;
}

extern class DescriptorArray extends HeapObject {
  const number_of_all_descriptors: uint16;
  number_of_descriptors: uint16;
  raw_number_of_marked_descriptors: uint16;
  filler16_bits: uint16;
  enum_cache: EnumCache;
  descriptors[number_of_all_descriptors]: DescriptorEntry;
}
```

##### Referencias y Slices

`Reference<T>` y `Slice<T>` son structs especiales que representan punteros a datos contenidos en objetos del heap. Ambos contienen un objeto y un offset; `Slice<T>` también contiene una longitud. En lugar de construir estos structs directamente, puedes usar una sintaxis especial: `&o.x` creará una `Reference` al campo `x` dentro del objeto `o`, o un `Slice` a los datos si `x` es un campo indexado. Para referencias y slices, hay versiones constantes y mutables. Para referencias, estos tipos se escriben como `&T` y `const &T` para referencias mutables y constantes, respectivamente. La mutabilidad se refiere a los datos a los que apuntan y puede que no se mantenga globalmente, es decir, se pueden crear referencias constantes a datos mutables. Para los slices, no existe una sintaxis especial para los tipos y las dos versiones se escriben como `ConstSlice<T>` y `MutableSlice<T>`. Las referencias pueden ser desreferenciadas con `*` o `->`, consistente con C++.

Referencias y slices a datos no etiquetados también pueden apuntar a datos fuera del heap.

#### Structs de bitfield

Un `bitfield struct` representa una colección de datos numéricos empaquetados en un solo valor numérico. Su sintaxis es similar a un `struct` normal, con la adición del número de bits para cada campo.

```torque
bitfield struct DebuggerHints extends uint31 {
  side_effect_state: int32: 2 bit;
  debug_is_blackboxed: bool: 1 bit;
  computed_debug_is_blackboxed: bool: 1 bit;
  debugging_id: int32: 20 bit;
}
```

Si un bitfield struct (o cualquier otro dato numérico) está almacenado dentro de un Smi, puede representarse usando el tipo `SmiTagged<T>`.

#### Tipos de punteros a funciones

Los punteros a funciones solo pueden apuntar a builtins definidos en Torque, ya que esto garantiza el ABI predeterminado. Son particularmente útiles para reducir el tamaño del código binario.

Aunque los tipos de punteros a funciones son anónimos (como en C), pueden vincularse a un alias de tipo (como un `typedef` en C).

```torque
type CompareBuiltinFn = builtin(implicit context: Context)(Object, Object, Object) => Number;
```

#### Tipos especiales

Hay dos tipos especiales indicados por las palabras clave `void` y `never`. `void` se usa como el tipo de retorno para funciones que no devuelven un valor, y `never` se usa como el tipo de retorno para funciones que en realidad nunca devuelven (es decir, solo salen mediante rutas excepcionales).

#### Tipos transitorios

En V8, los objetos del heap pueden cambiar de estructura en tiempo de ejecución. Para expresar estructuras de objetos que están sujetas a cambios u otras suposiciones temporales en el sistema de tipos, Torque admite el concepto de un "tipo transitorio". Al declarar un tipo abstracto, agregar la palabra clave `transient` lo marca como un tipo transitorio.

```torque
// Un HeapObject con un mapa JSArray, y ya sea elementos rápidos empaquetados, o
// elementos rápidos con huecos cuando el NoElementsProtector global no está invalidado.
transient type FastJSArray extends JSArray
    generates 'TNode<JSArray>';
```

Por ejemplo, en el caso de `FastJSArray`, el tipo transitorio se invalida si el arreglo cambia a elementos de diccionario o si el `NoElementsProtector` global se invalida. Para expresar esto en Torque, anota todas las funciones que podrían potencialmente hacer eso como `transitioning`. Por ejemplo, llamar a una función de JavaScript puede ejecutar JavaScript arbitrario, por lo que es `transitioning`.

```torque
extern transitioning macro Call(implicit context: Context)
                               (Callable, Object): Object;
```

La forma en que esto se controla en el sistema de tipos es que es ilegal acceder a un valor de un tipo transitorio durante una operación de transición.

```torque
const fastArray : FastJSArray = Cast<FastJSArray>(array) otherwise Bailout;
Call(f, Undefined);
return fastArray; // Error de tipo: fastArray no es válido aquí.
```

#### Enums

Las enumeraciones proporcionan un medio para definir un conjunto de constantes y agruparlas bajo un nombre similar a
las clases enum en C++. Una declaración se introduce con la palabra clave `enum` y sigue la siguiente
estructura sintáctica:

```grammar
EnumDeclaration :
  extern enum IdentifierName ExtendsDeclaration opt ConstexprDeclaration opt { IdentifierName list+ (, ...) opt }
```

Un ejemplo básico se ve así:

```torque
extern enum LanguageMode extends Smi {
  kStrict,
  kSloppy
}
```

Esta declaración define un nuevo tipo `LanguageMode`, donde la cláusula `extends` especifica el tipo subyacente,
es decir, el tipo de tiempo de ejecución utilizado para representar un valor del enum. En este ejemplo, este es `TNode<Smi>`,
ya que esto es lo que el tipo `Smi` `genera`. Un `constexpr LanguageMode` se convierte a `LanguageMode`
en los archivos CSA generados ya que no se especifica una cláusula `constexpr` en el enum para reemplazar el nombre predeterminado.
Si se omite la cláusula `extends`, Torque generará únicamente la versión `constexpr` del tipo. La palabra clave `extern` indica a Torque que existe una definición en C++ de este enum. Actualmente, solo se admiten `extern enums`.

Torque genera un tipo distinto y una constante para cada una de las entradas del enum. Estas se definen
dentro de un espacio de nombres que coincide con el nombre del enum. Se generan especializaciones necesarias de `FromConstexpr<>`
para convertir desde los tipos `constexpr` de la entrada al tipo del enum. El valor generado para una entrada en los archivos de C++ es `<enum-constexpr>::<entry-name>` donde `<enum-constexpr>` es el nombre `constexpr` generado para el enum. En el ejemplo anterior, estos son `LanguageMode::kStrict` y `LanguageMode::kSloppy`.

Las enumeraciones de Torque funcionan muy bien junto con la construcción `typeswitch`, porque los
valores están definidos usando tipos distintos:

```torque
typeswitch(language_mode) {
  case (LanguageMode::kStrict): {
    // ...
  }
  case (LanguageMode::kSloppy): {
    // ...
  }
}
```

Si la definición en C++ del enum contiene más valores que los utilizados en los archivos `.tq`, Torque necesita saberlo. Esto se hace declarando el enum como 'abierto' al agregar un `...` después de la última entrada. Considera el `ExtractFixedArrayFlag`, por ejemplo, donde solo algunas de las opciones están disponibles/utilizadas desde dentro
Torque:

```torque
enum ExtractFixedArrayFlag constexpr 'CodeStubAssembler::ExtractFixedArrayFlag' {
  kFixedDoubleArrays,
  kAllFixedArrays,
  kFixedArrays,
  ...
}
```

### Callables

Los callables son conceptualmente como funciones en JavaScript o C++, pero tienen algunos semánticos adicionales que les permiten interactuar de maneras útiles con el código CSA y con el runtime de V8. Torque proporciona varios tipos diferentes de callables: `macro`s, `builtin`s, `runtime`s e `intrinsic`s.

```grammar
CallableDeclaration :
  MacroDeclaration
  BuiltinDeclaration
  RuntimeDeclaration
  IntrinsicDeclaration
```

#### Callables de tipo `macro`

Los macros son un callable que corresponde a un fragmento de código CSA generado en C++. Los `macro`s pueden ser completamente definidos en Torque, en cuyo caso el código CSA es generado por Torque, o marcados como `extern`, en cuyo caso la implementación debe proporcionarse como código CSA escrito a mano en una clase CodeStubAssembler. Conceptualmente, es útil pensar en los `macro`s como fragmentos de código CSA inlinable que se incrustan en los lugares donde se llaman.

Las declaraciones de `macro` en Torque tienen la siguiente forma:

```grammar
MacroDeclaration :
   transitioning opt macro IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock
  extern transitioning opt macro IdentifierName ImplicitParameters opt ExplicitTypes ReturnType opt LabelsDeclaration opt ;
```

Cada Torque `macro` que no es `extern` utiliza el cuerpo `StatementBlock` del `macro` para crear una función generadora de CSA en la clase `Assembler` generada de su espacio de nombres. Este código se ve igual a otros códigos que podrías encontrar en `code-stub-assembler.cc`, aunque menos legible porque es generado por máquina. Los `macro`s que están marcados como `extern` no tienen cuerpo escrito en Torque y simplemente proporcionan la interfaz al código CSA escrito a mano en C++ para que sea utilizable desde Torque.

Las definiciones de `macro` especifican parámetros implícitos y explícitos, un tipo de retorno opcional y etiquetas opcionales. Los parámetros y tipos de retorno se discutirán con más detalle a continuación, pero por ahora basta saber que funcionan algo parecido a los parámetros de TypeScript, como se discute en la sección de Tipos de Función de la documentación de TypeScript [aquí](https://www.typescriptlang.org/docs/handbook/functions.html).

Las etiquetas son un mecanismo para una salida excepcional de un `macro`. Se corresponden 1:1 con etiquetas CSA y se agregan como parámetros de tipo `CodeStubAssemblerLabels*` al método C++ generado para el `macro`. Su semántica exacta se discute más abajo, pero para propósitos de una declaración `macro`, la lista separada por comas de las etiquetas de un `macro` se proporciona opcionalmente con la palabra clave `labels` y se posiciona después de las listas de parámetros del `macro` y del tipo de retorno.

Aquí hay un ejemplo de `base.tq` de `macro`s definidos externamente y en Torque:

```torque
extern macro BranchIfFastJSArrayForCopy(Object, Context): never
    labels Taken, NotTaken;
macro BranchIfNotFastJSArrayForCopy(implicit context: Context)(o: Object):
    never
    labels Taken, NotTaken {
  BranchIfFastJSArrayForCopy(o, context) otherwise NotTaken, Taken;
}
```

#### Llamables `builtin`

Los `builtin`s son similares a los `macro`s en el sentido de que pueden ser completamente definidos en Torque o marcados como `extern`. En el caso de los builtin basados en Torque, el cuerpo del builtin se utiliza para generar un builtin de V8 que puede ser llamado al igual que cualquier otro builtin de V8, incluyendo la adición automática de la información relevante en `builtin-definitions.h`. Al igual que los `macro`s, los `builtin`s de Torque que están marcados como `extern` no tienen un cuerpo basado en Torque y simplemente proporcionan una interfaz a los `builtin`s existentes de V8 para que puedan usarse en el código Torque.

Las declaraciones de `builtin` en Torque tienen la siguiente forma:

```grammar
MacroDeclaration :
  transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitParametersOrVarArgs ReturnType opt StatementBlock
  extern transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

Solo hay una copia del código para un builtin de Torque, y está en el objeto de código generado del builtin. A diferencia de los `macro`s, cuando los `builtin`s se llaman desde el código Torque, el código CSA no se inserta en línea en el sitio de la llamada, sino que se genera una llamada al builtin.

Los `builtin`s no pueden tener etiquetas.

Si estás codificando la implementación de un `builtin`, puedes crear una [tailcall](https://en.wikipedia.org/wiki/Tail_call) a un builtin o una función runtime si y solo si (iff) es la llamada final en el builtin. En este caso, el compilador puede ser capaz de evitar la creación de un nuevo marco de pila. Simplemente añade `tail` antes de la llamada, como en `tail MyBuiltin(foo, bar);`.

#### Llamables `runtime`

Los `runtime`s son similares a los `builtin`s en el sentido de que pueden exponer una interfaz a funcionalidad externa a Torque. Sin embargo, en lugar de ser implementados en CSA, la funcionalidad proporcionada por un `runtime` siempre debe ser implementada en V8 como un callback estándar de runtime.

Las declaraciones de `runtime` en Torque tienen la siguiente forma:

```grammar
MacroDeclaration :
  extern transitioning opt runtime IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

El `runtime extern` especificado con el nombre <i>IdentifierName</i> corresponde a la función de tiempo de ejecución especificada por <code>Runtime::k<i>IdentifierName</i></code>.

Al igual que los `builtin`s, los `runtime`s no pueden tener etiquetas.

También puedes llamar a una función `runtime` como una tailcall cuando sea apropiado. Simplemente incluye la palabra clave `tail` antes de la llamada.

Las declaraciones de funciones Runtime a menudo se colocan en un espacio de nombres llamado `runtime`. Esto las distingue de los builtins con el mismo nombre y facilita ver en el sitio de la llamada que estamos llamando a una función runtime. Deberíamos considerar hacer esto obligatorio.

#### Llamables `intrinsic`

Los `intrinsic`s son llamables internos de Torque que proporcionan acceso a funcionalidades internas que no pueden ser implementadas de otra manera en Torque. Se declaran en Torque, pero no se definen, ya que la implementación es proporcionada por el compilador de Torque. Las declaraciones de `intrinsic` usan la siguiente gramática:

```grammar
IntrinsicDeclaration :
  intrinsic % IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt ;
```

En su mayoría, el código Torque “del usuario” rara vez debería necesitar usar directamente `intrinsic`s.
A continuación se muestran algunos de los intrinsics soportados:

```torque
// %RawObjectCast convierte de Object a un subtipo de Object sin
// realizar pruebas rigurosas sobre si el objeto es realmente del tipo de destino.
// Los RawObjectCasts *nunca* (bueno, casi nunca) deben ser usados en ningún lado
// del código Torque excepto en operadores UnsafeCast basados en Torque precedidos por un
// assert() de tipo apropiado
intrinsic %RawObjectCast<A: type>(o: Object): A;

// %RawPointerCast convierte de RawPtr a un subtipo de RawPtr sin
// realizar pruebas rigurosas sobre si el objeto es realmente del tipo de destino.
intrinsic %RawPointerCast<A: type>(p: RawPtr): A;

// %RawConstexprCast convierte un valor constante en tiempo de compilación a otro.
// Tanto el tipo de origen como el de destino deben ser 'constexpr'.
// %RawConstexprCast se traduce a static_casts en el código C++ generado.
intrinsic %RawConstexprCast<To: type, From: type>(f: From): To;

// %FromConstexpr convierte un valor constexpr en un valor no constexpr.
// Actualmente, solo se admite la conversión a los siguientes tipos no constexpr:
// Smi, Number, String, uintptr, intptr, y int32
intrinsic %FromConstexpr<To: type, From: type>(b: From): To;

// %Allocate asigna un objeto no inicializado de tamaño 'size' desde el heap
// GC de V8 y "reinterpret casts" el puntero del objeto resultante al
// Clase Torque especificada, permitiendo que los constructores posteriormente usen
// operadores estándar de acceso a campos para inicializar el objeto.
// Esta intrínseca nunca debería ser llamada desde el código Torque. Se utiliza
// internamente al simplificar el operador 'new'.
intrínseca %Allocate<Class: tipo>(size: intptr): Class;
```

Al igual que los `builtin`s y `runtime`s, los `intrinsic`s no pueden tener etiquetas.

### Parámetros explícitos

Las declaraciones de Callables definidos en Torque, por ejemplo, `macro`s y `builtin`s en Torque, tienen listas de parámetros explícitos. Estas son una lista de pares de identificador y tipo utilizando una sintaxis similar a las listas de parámetros de funciones tipadas en TypeScript, con la excepción de que Torque no admite parámetros opcionales o con valores predeterminados. Además, los `builtin`s implementados en Torque pueden opcionalmente admitir parámetros de descanso si el `builtin` utiliza la convención de llamadas internas de JavaScript de V8 (por ejemplo, está marcado con la palabra clave `javascript`).

```gramática
ParámetrosExplícitos :
  ( ( IdentifierName : TypeIdentifierName ) lista* )
  ( ( IdentifierName : TypeIdentifierName ) lista+ (, ... IdentifierName ) opt )
```

Como ejemplo:

```torque
javascript builtin ArraySlice(
    (implícito context: Context)(receiver: Object, ...arguments): Object {
  // …
}
```

### Parámetros implícitos

Los Callables en Torque pueden especificar parámetros implícitos utilizando algo similar a los [parámetros implícitos de Scala](https://docs.scala-lang.org/tour/implicit-parameters.html):

```gramática
ParámetrosImplícitos :
  ( implícito ( IdentifierName : TypeIdentifierName ) lista* )
```

Concretamente: Un `macro` puede declarar parámetros implícitos además de explícitos:

```torque
macro Foo(implícito context: Context)(x: Smi, y: Smi)
```

Al mapear a CSA, los parámetros implícitos y explícitos se tratan igual y forman una lista conjunta de parámetros.

Los parámetros implícitos no se mencionan en el lugar de la llamada, sino que se pasan implícitamente: `Foo(4, 5)`. Para que esto funcione, `Foo(4, 5)` debe ser llamado en un contexto que proporcione un valor llamado `context`. Ejemplo:

```torque
macro Bar(implícito context: Context)() {
  Foo(4, 5);
}
```

En contraste con Scala, prohibimos esto si los nombres de los parámetros implícitos no son idénticos.

Dado que la resolución de sobrecargas puede causar comportamientos confusos, aseguramos que los parámetros implícitos no influyan en la resolución de sobrecargas en absoluto. Es decir: al comparar candidatos de un conjunto de sobrecargas, no consideramos las vinculaciones implícitas disponibles en el lugar de la llamada. Sólo después de encontrar una única mejor sobrecarga, verificamos si hay vinculaciones implícitas disponibles para los parámetros implícitos.

Tener los parámetros implícitos a la izquierda de los parámetros explícitos es diferente de Scala, pero se adapta mejor a la convención existente en CSA de tener el parámetro `context` primero.

#### `js-implicit`

Para los `builtin`s con enlace JavaScript definidos en Torque, debes usar la palabra clave `js-implicit` en lugar de `implicit`. Los argumentos están limitados a estos cuatro componentes de la convención de llamada:

- contexto: `NativeContext`
- receptor: `JSAny` (`this` en JavaScript)
- objetivo: `JSFunction` (`arguments.callee` en JavaScript)
- nuevoObjetivo: `JSAny` (`new.target` en JavaScript)

No es necesario declararlos todos, solo los que quieras usar. Por ejemplo, aquí está nuestro código para `Array.prototype.shift`:

```torque
  // https://tc39.es/ecma262/#sec-array.prototype.shift
  transitioning javascript builtin ArrayPrototypeShift(
      js-implicit context: NativeContext, receiver: JSAny)(...arguments): JSAny {
  ...
```

Nota que el argumento `context` es un `NativeContext`. Esto se debe a que los `builtin`s en V8 siempre incrustan el contexto nativo en sus clausuras. Codificar esto en la convención `js-implicit` permite al programador eliminar una operación para cargar el contexto nativo desde el contexto de la función.

### Resolución de sobrecargas

Los `macro`s y operadores de Torque (que son solo alias para `macro`s) permiten sobrecarga por tipo de argumento. Las reglas de sobrecarga están inspiradas en las de C++: una sobrecarga se selecciona si es estrictamente mejor que todas las alternativas. Esto significa que tiene que ser estrictamente mejor en al menos un parámetro, y mejor o igualmente buena en todos los demás.

Al comparar un par de parámetros correspondientes de dos sobrecargas...

- ...son considerados igualmente buenos si:
    - son iguales;
    - ambos requieren alguna conversión implícita.
- ...uno es considerado mejor si:
    - es un subtipo estricto del otro;
    - no requiere una conversión implícita, mientras que el otro sí.

Si ninguna sobrecarga es estrictamente mejor que todas las alternativas, esto resulta en un error de compilación.

### Bloques diferidos

Un bloque de declaraciones puede ser marcado opcionalmente como `diferido`, lo cual es una señal para el compilador de que se ingresa con menor frecuencia. El compilador puede optar por ubicar estos bloques al final de la función, mejorando así la localidad de la caché para las regiones de código no diferidas. Por ejemplo, en este código de la implementación de `Array.prototype.forEach`, esperamos permanecer en la ruta "rápida" y solo ocasionalmente tomar el caso de salida:

```torque
  let k: Number = 0;
  try {
    return FastArrayForEach(o, len, callbackfn, thisArg)
        otherwise Bailout;
  }
  label Bailout(kValue: Smi) deferred {
    k = kValue;
  }
```

Aquí hay otro ejemplo, donde el caso de elementos de diccionario está marcado como diferido para mejorar la generación de código para los casos más probables (de la implementación de `Array.prototype.join`):

```torque
  if (IsElementsKindLessThanOrEqual(kind, HOLEY_ELEMENTS)) {
    loadFn = LoadJoinElement<FastSmiOrObjectElements>;
  } else if (IsElementsKindLessThanOrEqual(kind, HOLEY_DOUBLE_ELEMENTS)) {
    loadFn = LoadJoinElement<FastDoubleElements>;
  } else if (kind == DICTIONARY_ELEMENTS)
    deferred {
      const dict: NumberDictionary =
          UnsafeCast<NumberDictionary>(array.elements);
      const nofElements: Smi = GetNumberDictionaryNumberOfElements(dict);
      // <etc>...
```

## Migrando código CSA a Torque

[El parche que migró `Array.of`](https://chromium-review.googlesource.com/c/v8/v8/+/1296464) sirve como un ejemplo mínimo de migración de código CSA a Torque.
