---
title: 'V8 Torque integrados'
description: 'Este documento está destinado como una introducción a la escritura de integrados Torque, y está dirigido a los desarrolladores de V8.'
---
Este documento está destinado como una introducción a la escritura de integrados Torque, y está dirigido a los desarrolladores de V8. Torque reemplaza a CodeStubAssembler como la forma recomendada de implementar nuevos integrados. Consulte [Integrados de CodeStubAssembler](/docs/csa-builtins) para la versión de CSA de esta guía.

## Integrados

En V8, los integrados pueden considerarse como fragmentos de código que son ejecutables por la VM en tiempo de ejecución. Un caso de uso común es implementar las funciones de objetos integrados (como `RegExp` o `Promise`), pero los integrados también se pueden usar para proporcionar otra funcionalidad interna (por ejemplo, como parte del sistema IC).

Los integrados de V8 pueden implementarse utilizando varios métodos diferentes (cada uno con diferentes ventajas y desventajas):

- **Lenguaje ensamblador dependiente de la plataforma**: puede ser altamente eficiente, pero necesita conversiones manuales a todas las plataformas y son difíciles de mantener.
- **C++**: muy similar en estilo a las funciones en tiempo de ejecución y tiene acceso a la poderosa funcionalidad en tiempo de ejecución de V8, pero generalmente no es adecuado para áreas sensibles al rendimiento.
- **JavaScript**: código conciso y legible, acceso a instrínsecos rápidos, pero uso frecuente de llamadas a funciones en tiempo de ejecución lentas, sujeto a rendimientos impredecibles debido a la contaminación de tipos y problemas sutiles relacionados con la semántica de JS (complicada y poco evidente). Los integrados de Javascript están obsoletos y no se deben agregar más.
- **CodeStubAssembler**: proporciona funcionalidad de bajo nivel eficiente que está muy cerca del lenguaje ensamblador, pero sigue siendo independiente de la plataforma y mantiene la legibilidad.
- **[V8 Torque](/docs/torque)**: es un lenguaje de dominio específico propio de V8 que se traduce a CodeStubAssembler. Como tal, amplía CodeStubAssembler y ofrece tipos estáticos así como una sintaxis legible y expresiva.

El resto del documento se centra en este último y proporciona un breve tutorial para desarrollar un integrado Torque simple expuesto a JavaScript. Para obtener información más completa sobre Torque, consulte el [Manual del usuario de V8 Torque](/docs/torque).

## Escribir un integrado Torque

En esta sección, escribiremos un integrado CSA simple que toma un único argumento y devuelve si representa el número `42`. El integrado se expone a JS instalándolo en el objeto `Math` (porque podemos).

Este ejemplo demuestra:

- Crear un integrado Torque con enlace JavaScript, que se puede llamar como una función JS.
- Usar Torque para implementar lógica simple: distinción de tipos, manejo de Smi y números en el heap, condicionales.
- Instalación del integrado CSA en el objeto `Math`.

En caso de que desee seguir localmente, el siguiente código se basa en la revisión [589af9f2](https://chromium.googlesource.com/v8/v8/+/589af9f257166f66774b4fb3008cd09f192c2614).

## Definiendo `MathIs42`

El código Torque se encuentra en los archivos `src/builtins/*.tq`, organizados aproximadamente por tema. Dado que escribiremos un integrado de `Math`, colocaremos nuestra definición en `src/builtins/math.tq`. Dado que este archivo aún no existe, debemos agregarlo a [`torque_files`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=914&rcl=589af9f257166f66774b4fb3008cd09f192c2614) en [`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn).

```torque
namespace math {
  javascript builtin MathIs42(
      context: Context, receiver: Object, x: Object): Boolean {
    // En este punto, x puede ser básicamente cualquier cosa: un Smi, un HeapNumber,
    // undefined, u otro objeto JS arbitrario. ToNumber_Inline está definido
    // en CodeStubAssembler. Alinea una ruta rápida (si el argumento ya es un número)
    // y llama al integrado ToNumber en caso contrario.
    const number: Number = ToNumber_Inline(x);
    // Un typeswitch nos permite cambiar según el tipo dinámico de un valor. El sistema
    // de tipos sabe que un Number solo puede ser un Smi o un HeapNumber, por lo que este
    // switch es exhaustivo.
    typeswitch (number) {
      case (smi: Smi): {
        // El resultado de smi == 42 no es un booleano de JavaScript, por lo que usamos un
        // condicional para crear un valor booleano de JavaScript.
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        return Convert<float64>(heapNumber) == 42 ? True : False;
      }
    }
  }
}
```

Colocamos la definición en el espacio de nombres Torque `math`. Dado que este espacio de nombres no existía antes, tenemos que agregarlo a [`torque_namespaces`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=933&rcl=589af9f257166f66774b4fb3008cd09f192c2614) en [`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn).

## Adjuntando `Math.is42`

Los objetos integrados como `Math` se configuran principalmente en [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) (con alguna configuración que ocurre en archivos `.js`). Adjuntar nuestro nuevo objeto integrado es sencillo:

```cpp
// Código existente para configurar Math, incluido aquí para mayor claridad.
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […snip…]
SimpleInstallFunction(isolate_, math, "is42", Builtins::kMathIs42, 1, true);
```

Ahora que `is42` está adjunto, puede ser llamado desde JS:

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

## Definiendo y llamando a un objeto integrado con enlace a stub

Los objetos integrados también pueden ser creados con enlace a stub (en lugar del enlace JS que usamos anteriormente en `MathIs42`). Estos objetos integrados pueden ser útiles para extraer código comúnmente usado en un objeto de código separado que puede ser utilizado por varios llamadores, mientras que el código se genera solo una vez. Extrayamos el código que maneja números en heap en un objeto integrado separado llamado `HeapNumberIs42` y llamémoslo desde `MathIs42`.

La definición también es directa. La única diferencia con nuestro objeto integrado con enlace a Javascript es que omitimos la palabra clave `javascript` y no hay argumento receptor.

```torque
namespace math {
  builtin HeapNumberIs42(implicit context: Context)(heapNumber: HeapNumber):
      Boolean {
    return Convert<float64>(heapNumber) == 42 ? True : False;
  }

  javascript builtin MathIs42(implicit context: Context)(
      receiver: Object, x: Object): Boolean {
    const number: Number = ToNumber_Inline(x);
    typeswitch (number) {
      case (smi: Smi): {
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        // En lugar de manejar números en heap en línea, ahora llamamos a nuestro nuevo objeto integrado.
        return HeapNumberIs42(heapNumber);
      }
    }
  }
}
````

¿Por qué debería importarte los objetos integrados en absoluto? ¿Por qué no dejar el código en línea (o extraído en macros para mejorar la legibilidad)?

Una razón importante es el espacio de código: los objetos integrados se generan en tiempo de compilación y se incluyen en el snapshot de V8 o se incrustan en el binario. Extraer grandes partes de código comúnmente usado a objetos integrados separados puede conducir rápidamente a ahorros de espacio entre 10s y 100s de KBs.

## Probando objetos integrados con enlace a stub

Aunque nuestro nuevo objeto integrado usa una convención de llamada no estándar (al menos no C++), es posible escribir casos de prueba para ello. El siguiente código puede añadirse a [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc) para probar el objeto integrado en todas las plataformas:

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
