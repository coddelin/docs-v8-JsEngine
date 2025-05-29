---
title: 'CodeStubAssembler construcciones'
description: 'Este documento está diseñado como una introducción para escribir construcciones CodeStubAssembler, y está dirigido a desarrolladores de V8.'
---
Este documento está diseñado como una introducción para escribir construcciones CodeStubAssembler, y está dirigido a desarrolladores de V8.

:::note
**Nota:** [Torque](/docs/torque) reemplaza a CodeStubAssembler como la forma recomendada de implementar nuevas construcciones. Consulte [Construcciones Torque](/docs/torque-builtins) para la versión Torque de esta guía.
:::

## Construcciones

En V8, las construcciones pueden considerarse como fragmentos de código ejecutables por la máquina virtual en tiempo de ejecución. Un caso de uso común es implementar las funciones de objetos incorporados (como RegExp o Promise), pero las construcciones también pueden usarse para proporcionar otra funcionalidad interna (por ejemplo, como parte del sistema IC).

Las construcciones de V8 pueden implementarse utilizando varios métodos diferentes (cada uno con diferentes compensaciones):

- **Lenguaje ensamblador dependiente de la plataforma**: puede ser muy eficiente, pero necesita puertos manuales para todas las plataformas y es difícil de mantener.
- **C++**: muy similar en estilo a las funciones de tiempo de ejecución y tiene acceso a la poderosa funcionalidad en tiempo de ejecución de V8, pero generalmente no es adecuado para áreas sensibles al rendimiento.
- **JavaScript**: código conciso y legible, acceso a intrínsecos rápidos, pero uso frecuente de llamadas de tiempo de ejecución lentas, sujeto a un rendimiento impredecible debido a la contaminación de tipos, y problemas sutiles en torno a las (complicadas y no evidentes) semánticas de JS.
- **CodeStubAssembler**: proporciona funcionalidad de bajo nivel eficiente que está muy cerca del lenguaje ensamblador mientras permanece independiente de la plataforma y preserva la legibilidad.

El resto del documento se centra en el último y proporciona un breve tutorial para desarrollar una construcción sencilla de CodeStubAssembler (CSA) expuesta a JavaScript.

## CodeStubAssembler

El CodeStubAssembler de V8 es un ensamblador personalizado e independiente de la plataforma que proporciona primitivas de bajo nivel como una abstracción delgada sobre el lenguaje ensamblador, pero también ofrece una extensa biblioteca de funcionalidad de nivel superior.

```cpp
// Nivel bajo:
// Carga los datos del tamaño del puntero en addr en value.
Node* addr = /* ... */;
Node* value = Load(MachineType::IntPtr(), addr);

// Y nivel alto:
// Realiza la operación JS ToString(object).
// Las semánticas de ToString están especificadas en https://tc39.es/ecma262/#sec-tostring.
Node* object = /* ... */;
Node* string = ToString(context, object);
```

Las construcciones de CSA pasan por parte del flujo de compilación de TurboFan (incluyendo la planificación de bloques y la asignación de registros, pero notablemente no a través de pasos de optimización), que luego emite el código ejecutable final.

## Escribiendo una construcción de CodeStubAssembler

En esta sección, escribiremos una construcción sencilla de CSA que toma un solo argumento y devuelve si representa el número `42`. La construcción está expuesta a JS instalándola en el objeto `Math` (porque podemos).

Este ejemplo demuestra:

- Crear una construcción de CSA con enlace JavaScript, que puede llamarse como una función JS.
- Utilizar CSA para implementar una lógica simple: manejo de Smi y números de heap, condicionales y llamadas a las construcciones TFS.
- Uso de Variables CSA.
- Instalación de la construcción de CSA en el objeto `Math`.

En caso de que desee seguir localmente, el siguiente código se basa en la revisión [7a8d20a7](https://chromium.googlesource.com/v8/v8/+/7a8d20a79f9d5ce6fe589477b09327f3e90bf0e0).

## Declarando `MathIs42`

Las construcciones se declaran en la macro `BUILTIN_LIST_BASE` en [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1). Para crear una nueva construcción CSA con enlace JS y un parámetro llamado `X`:

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […snip…]
  TFJ(MathIs42, 1, kX)                                                         \
  // […snip…]
```

Tenga en cuenta que `BUILTIN_LIST_BASE` toma varias macros diferentes que denotan diferentes tipos de construcciones (consulte la documentación interna para más detalles). Las construcciones CSA específicamente se dividen en:

- **TFJ**: Enlace JavaScript.
- **TFS**: Enlace Stub.
- **TFC**: Construcción de enlace Stub que requiere un descriptor de interfaz personalizado (por ejemplo, si los argumentos no están etiquetados o necesitan pasarse en registros específicos).
- **TFH**: Construcción de enlace Stub especializada utilizada para manejadores IC.

## Definiendo `MathIs42`

Las definiciones de construcciones se ubican en los archivos `src/builtins/builtins-*-gen.cc`, organizados aproximadamente por tema. Dado que escribiremos una construcción `Math`, ubicaremos nuestra definición en [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1).

```cpp
// TF_BUILTIN es una macro de conveniencia que crea una nueva subclase del ensamblador dado detrás de escena.
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // Carga el contexto de función actual (un argumento implícito para cada stub)
  // y el argumento X. Nota que podemos referirnos a los parámetros por los nombres
  // definidos en la declaración del builtin.
  Node* const context = Parameter(Descriptor::kContext);
  Node* const x = Parameter(Descriptor::kX);

  // En este punto, x puede ser básicamente cualquier cosa: un Smi, un HeapNumber,
  // undefined o cualquier otro objeto JS arbitrario. Llamemos al builtin ToNumber
  // para convertir x en un número que podamos usar.
  // CallBuiltin puede usarse para llamar convenientemente a cualquier builtin del CSA.
  Node* const number = CallBuiltin(Builtins::kToNumber, context, x);

  // Creamos una variable de CSA para almacenar el valor resultante. El tipo de la
  // variable es kTagged porque solo vamos a almacenar punteros etiquetados en ella.
  VARIABLE(var_result, MachineRepresentation::kTagged);

  // Necesitamos definir un par de etiquetas que serán usadas como objetivos de salto.
  Label if_issmi(this), if_isheapnumber(this), out(this);

  // ToNumber siempre devuelve un número. Necesitamos distinguir entre Smis
  // y heap numbers. Aquí verificamos si number es un Smi y condicionalmente
  // saltamos a las etiquetas correspondientes.
  Branch(TaggedIsSmi(number), &if_issmi, &if_isheapnumber);

  // Al enlazar una etiqueta comienza la generación de código para ella.
  BIND(&if_issmi);
  {
    // SelectBooleanConstant retorna los valores JS true/false dependiendo de
    // si la condición pasada es verdadera o falsa. El resultado se enlaza a nuestra
    // variable var_result y luego saltamos incondicionalmente a la etiqueta out.
    var_result.Bind(SelectBooleanConstant(SmiEqual(number, SmiConstant(42))));
    Goto(&out);
  }

  BIND(&if_isheapnumber);
  {
    // ToNumber solo puede devolver o bien un Smi o un heap number. Solo para asegurarnos
    // agregamos una afirmación aquí que verifica que number es realmente un heap number.
    CSA_ASSERT(this, IsHeapNumber(number));
    // Los heap numbers encapsulan un valor de punto flotante. Necesitamos extraer
    // explícitamente este valor, realizar una comparación de punto flotante y nuevamente
    // enlazar var_result basado en el resultado.
    Node* const value = LoadHeapNumberValue(number);
    Node* const is_42 = Float64Equal(value, Float64Constant(42));
    var_result.Bind(SelectBooleanConstant(is_42));
    Goto(&out);
  }

  BIND(&out);
  {
    Node* const result = var_result.value();
    CSA_ASSERT(this, IsBoolean(result));
    Return(result);
  }
}
```

## Adjuntar `Math.Is42`

Los objetos builtin como `Math` se configuran principalmente en [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) (con algunas configuraciones ocurriendo en archivos `.js`). Adjuntar nuestro nuevo builtin es simple:

```cpp
// Código existente para configurar Math, incluido aquí por claridad.
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […snip…]
SimpleInstallFunction(math, "is42", Builtins::kMathIs42, 1, true);
```

Ahora que `Is42` está adjunto, se puede llamar desde JS:

```bash
$ out/debug/d8
d8> Math.is42(42);
true
d8> Math.is42('42.0');
true
d8> Math.is42(true);
false
d8> Math.is42({ valueOf: () => 42 });
true
```

## Definir y llamar a un builtin con enlace stub

Los builtins CSA también pueden crearse con enlace stub (en vez de enlace JS como usamos arriba en `MathIs42`). Estos builtins pueden ser útiles para extraer código comúnmente usado en un objeto de código separado que puede ser usado por múltiples llamadas, mientras que el código solo se produce una vez. Vamos a extraer el código que maneja heap numbers en un nuevo builtin llamado `MathIsHeapNumber42`, y llamarlo desde `MathIs42`.

Definir y usar stubs TFS es fácil; las declaraciones nuevamente se colocan en [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1):

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […snip…]
  TFS(MathIsHeapNumber42, kX)                                                  \
  TFJ(MathIs42, 1, kX)                                                         \
  // […snip…]
```

Nota que actualmente, el orden dentro de `BUILTIN_LIST_BASE` importa. Ya que `MathIs42` llama a `MathIsHeapNumber42`, el primero necesita listarse después del segundo (este requisito debería eliminarse en algún momento).

La definición también es sencilla. En [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1):

```cpp
// Definir un builtin TFS funciona exactamente igual que los builtins TFJ.
TF_BUILTIN(MathIsHeapNumber42, MathBuiltinsAssembler) {
  Node* const x = Parameter(Descriptor::kX);
  CSA_ASSERT(this, IsHeapNumber(x));
  Node* const value = LoadHeapNumberValue(x);
  Node* const is_42 = Float64Equal(value, Float64Constant(42));
  Return(SelectBooleanConstant(is_42));
}
```

Finalmente, llamemos a nuestro nuevo builtin desde `MathIs42`:

```cpp
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // […snip…]
  BIND(&if_isheapnumber);
  {
    // En lugar de manejar números heap en línea, ahora llamamos a nuestro nuevo stub de TFS.
    var_result.Bind(CallBuiltin(Builtins::kMathIsHeapNumber42, context, number));
    Goto(&out);
  }
  // […snip…]
}
```

¿Por qué deberías preocuparte por los builtins de TFS en absoluto? ¿Por qué no dejar el código en línea (o extraído en un método de ayuda para una mejor legibilidad)?

Una razón importante es el espacio de código: los builtins se generan en tiempo de compilación y se incluyen en el snapshot de V8, ocupando así (significativamente) espacio en cada isolate creado. Extraer grandes fragmentos de código comúnmente utilizado a los builtins de TFS puede llevar rápidamente a ahorros de espacio de entre 10s y 100s de KBs.

## Probando builtins de enlace de stub

Aunque nuestro nuevo builtin utiliza una convención de llamada no estándar (al menos no-C++), es posible escribir casos de prueba para él. El siguiente código puede agregarse a [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc?l=1&rcl=4cab16db27808cf66ab883e7904f1891f9fd0717) para probar el builtin en todas las plataformas:

```cpp
TEST(MathIsHeapNumber42) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  StubTester tester(isolate, zone, Builtins::kMathIs42);
  Handle<Object> result1 = tester.Call(Handle<Smi>(Smi::FromInt(0), isolate));
  CHECK(result1->BooleanValue());
}
```
