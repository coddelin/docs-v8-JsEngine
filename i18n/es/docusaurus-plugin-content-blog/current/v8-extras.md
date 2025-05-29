---
title: &apos;Extras de V8&apos;
author: &apos;Domenic Denicola ([@domenic](https://twitter.com/domenic)), Experto en Streams&apos;
avatars:
  - &apos;domenic-denicola&apos;
date: 2016-02-04 13:33:37
tags:
  - internos
description: &apos;V8 v4.8 incluye “extras de V8”, una interfaz simple diseñada con el objetivo de permitir que los integradores escriban APIs autoalojadas de alto rendimiento.&apos;
---
V8 implementa un gran subconjunto de los objetos y funciones integrados del lenguaje JavaScript en el propio JavaScript. Por ejemplo, puedes ver nuestra [implementación de promesas](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js) escrita en JavaScript. Estos integrados se denominan _autoalojados_. Estas implementaciones se incluyen en nuestra [instantánea de inicio](/blog/custom-startup-snapshots) para que se puedan crear nuevos contextos rápidamente sin necesidad de configurar e inicializar los integrados autoalojados en tiempo de ejecución.

<!--truncate-->
Los integradores de V8, como Chromium, a veces desean escribir APIs en JavaScript también. Esto funciona especialmente bien para características de plataforma que son autónomas, como [streams](https://streams.spec.whatwg.org/), o para características que son parte de una “plataforma en capas” de capacidades de alto nivel construidas sobre otras preexistentes de bajo nivel. Aunque siempre es posible ejecutar código adicional al inicio para inicializar las APIs del integrador (como se hace en Node.js, por ejemplo), idealmente los integradores deberían poder obtener los mismos beneficios de velocidad para sus APIs autoalojadas que obtiene V8.

Los extras de V8 son una nueva característica de V8, desde nuestra [versión 4.8](/blog/v8-release-48), diseñada con el objetivo de permitir que los integradores escriban APIs autoalojadas de alto rendimiento mediante una interfaz simple. Los extras son archivos JavaScript proporcionados por el integrador que se compilan directamente en la instantánea de V8. También tienen acceso a algunas utilidades que facilitan escribir APIs seguras en JavaScript.

## Un ejemplo

Un archivo extra de V8 es simplemente un archivo JavaScript con una estructura determinada:

```js
(function(global, binding, v8) {
  &apos;use strict&apos;;
  const Object = global.Object;
  const x = v8.createPrivateSymbol(&apos;x&apos;);
  const y = v8.createPrivateSymbol(&apos;y&apos;);

  class Vec2 {
    constructor(theX, theY) {
      this[x] = theX;
      this[y] = theY;
    }

    norm() {
      return binding.computeNorm(this[x], this[y]);
    }
  }

  Object.defineProperty(global, &apos;Vec2&apos;, {
    value: Vec2,
    enumerable: false,
    configurable: true,
    writable: true
  });

  binding.Vec2 = Vec2;
});
```

Hay algunos aspectos a tener en cuenta aquí:

- El objeto `global` no está presente en la cadena de ámbito, por lo que cualquier acceso a él (como para `Object`) debe hacerse explícitamente a través del argumento `global` proporcionado.
- El objeto `binding` es un lugar para almacenar valores o recuperarlos del integrador. Una API en C++ `v8::Context::GetExtrasBindingObject()` proporciona acceso al objeto `binding` desde el lado del integrador. En nuestro ejemplo básico, dejamos que el integrador realice el cálculo de la norma; en un ejemplo real podrías delegar al integrador algo más complicado, como la resolución de URLs. También agregamos el constructor `Vec2` al objeto `binding`, para que el código del integrador pueda crear instancias de `Vec2` sin pasar por el objeto `global`, que podría ser mutable.
- El objeto `v8` proporciona un pequeño número de APIs que permiten escribir código seguro. Aquí creamos símbolos privados para almacenar nuestro estado interno de una manera que no pueda ser manipulado desde el exterior. (Los símbolos privados son un concepto interno de V8 y no tienen sentido en código estándar de JavaScript). Los integrados de V8 suelen usar “llamadas a funciones %-” para este tipo de cosas, pero los extras de V8 no pueden usar funciones %- ya que son un detalle interno de implementación de V8 y no son adecuados para que dependan los integradores.

Podrías preguntarte de dónde provienen estos objetos. Los tres se inicializan en [el bootstrapper de V8](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/bootstrapper.cc), que instala algunas propiedades básicas pero deja la mayor parte de la inicialización al JavaScript autoalojado de V8. Por ejemplo, casi todos los archivos .js en V8 instalan algo en `global`; mira, por ejemplo, [promise.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js&sq=package:chromium&l=439) o [uri.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/uri.js&sq=package:chromium&l=371). Y instalamos APIs en el objeto `v8` en [varios lugares](https://code.google.com/p/chromium/codesearch#search/&q=extrasUtils&sq=package:chromium&type=cs). (El objeto `binding` está vacío hasta que un extra o integrador lo manipula, por lo que el único código relevante en V8 es cuando el bootstrapper lo crea.)

Finalmente, para decirle a V8 que compilaremos un extra, agregamos una línea al archivo gyp de nuestro proyecto:

```js
&apos;v8_extra_library_files&apos;: [&apos;./Vec2.js&apos;]
```

(Puedes ver un ejemplo del mundo real [en el archivo gyp de V8](https://code.google.com/p/chromium/codesearch#chromium/src/v8/build/standalone.gypi&sq=package:chromium&type=cs&l=170).)

## Extras de V8 en práctica

Los extras de V8 ofrecen una nueva y ligera forma para que los integradores implementen funciones. El código JavaScript puede manipular de forma más sencilla los elementos integrados de JavaScript como arreglos, mapas o promesas; puede llamar a otras funciones de JavaScript sin ceremonias; y puede manejar excepciones de manera idiomática. A diferencia de las implementaciones en C++, las funciones implementadas en JavaScript mediante extras de V8 pueden beneficiarse de la inclusión en línea, y llamarlas no incurre en costos de cruces de límite. Estas ventajas son especialmente significativas cuando se comparan con un sistema de enlaces tradicional como los enlaces Web IDL de Chromium.

Los extras de V8 fueron introducidos y refinados durante el último año, y Chromium actualmente los está utilizando para [implementar streams](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/core/streams/ReadableStream.js). Chromium también está considerando los extras de V8 para implementar [personalización de scroll](https://codereview.chromium.org/1333323003) y [APIs de geometría eficientes](https://groups.google.com/a/chromium.org/d/msg/blink-dev/V_bJNtOg0oM/VKbbYs-aAgAJ).

Los extras de V8 todavía están en desarrollo, y la interfaz tiene algunos aspectos ásperos y desventajas que esperamos abordar con el tiempo. El principal área con margen de mejora es la depuración: no es fácil rastrear errores, y la depuración en tiempo de ejecución generalmente se realiza mediante declaraciones de impresión. En el futuro, esperamos integrar los extras de V8 en las herramientas para desarrolladores y el marco de trazas de Chromium, tanto para Chromium como para cualquier integrador que utilice el mismo protocolo.

Otra causa de precaución al usar los extras de V8 es el esfuerzo adicional que requiere el desarrollo para escribir código seguro y robusto. El código de extras de V8 opera directamente en el snapshot, al igual que el código de los elementos integrados autohospedados de V8. Accede a los mismos objetos que JavaScript de usuario, sin una capa de unión ni un contexto separado que impida dicho acceso. Por ejemplo, algo tan aparentemente sencillo como `global.Object.prototype.hasOwnProperty.call(obj, 5)` tiene seis formas potenciales en las que podría fallar debido a que el código del usuario modifica los elementos integrados (¡cuéntalos!). Los integradores como Chromium necesitan ser robustos contra cualquier código de usuario, sin importar su comportamiento, por lo que en tales entornos se necesita más cuidado al escribir extras que al escribir funciones implementadas tradicionalmente en C++.

Si deseas aprender más sobre los extras de V8, echa un vistazo a nuestro [documento de diseño](https://docs.google.com/document/d/1AT5-T0aHGp7Lt29vPWFr2-qG8r3l9CByyvKwEuA8Ec0/edit#heading=h.32abkvzeioyz) que entra en muchos más detalles. Esperamos seguir mejorando los extras de V8 y añadir más funciones que permitan a los desarrolladores e integradores escribir adiciones expresivas y de alto rendimiento para el runtime de V8.
