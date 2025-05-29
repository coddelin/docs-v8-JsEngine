---
title: "Implementación y distribución de características del lenguaje JavaScript/WebAssembly"
description: "Este documento explica el proceso para implementar y distribuir características del lenguaje JavaScript o WebAssembly en V8."
---
En general, V8 sigue el [proceso de intención de Blink para estándares basados en consenso ya definidos](https://www.chromium.org/blink/launching-features/#process-existing-standard) para características del lenguaje JavaScript y WebAssembly. A continuación se detallan erratas específicas de V8. Por favor, siga el proceso de intención de Blink, salvo que las erratas indiquen lo contrario.

Si tienes alguna pregunta sobre este tema para características de JavaScript, envía un correo a [syg@chromium.org](mailto:syg@chromium.org) y [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com).

Para características de WebAssembly, envía un correo a [gdeepti@chromium.org](mailto:gdeepti@chromium.org) y [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com).

## Erratas

### Las características de JavaScript suelen esperar hasta la etapa 3+

Como regla general, V8 espera para implementar propuestas de características de JavaScript hasta que avanzan a la [Etapa 3 o posterior en TC39](https://tc39.es/process-document/). TC39 tiene su propio proceso de consenso, y la Etapa 3 o posterior señala un consenso explícito entre los delegados de TC39, incluidos todos los proveedores de navegadores, de que una propuesta de característica está lista para ser implementada. Este proceso de consenso externo significa que las características de la Etapa 3+ no necesitan enviar correos de intención excepto la intención de distribución.

### Revisión TAG

Para características más pequeñas de JavaScript o WebAssembly, no se requiere una revisión TAG, ya que TC39 y el Wasm CG ya proporcionan una supervisión técnica significativa. Si la característica es grande o afecta a otros API de la plataforma web o necesita modificaciones en Chromium, se recomienda la revisión TAG.

### Se requieren tanto las flags de V8 como de Blink

Al implementar una característica, se requieren tanto una flag de V8 como una `base::Feature` de Blink.

Las características de Blink son necesarias para que Chrome pueda desactivar características sin distribuir nuevos binarios en situaciones de emergencia. Esto generalmente se implementa en [`gin/gin_features.h`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.h), [`gin/gin_features.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.cc), y [`gin/v8_initializer.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/v8_initializer.cc).

### Las pruebas de fuzzing son necesarias para distribuir

Las características de JavaScript y WebAssembly deben ser sometidas a pruebas de fuzzing durante un período mínimo de 4 semanas, o un (1) hito de lanzamiento, con todos los errores de fuzzing solucionados, antes de que puedan ser distribuidas.

Para características de JavaScript completas, comienza las pruebas de fuzzing moviendo la flag de la característica al macro `JAVASCRIPT_STAGED_FEATURES_BASE` en [`src/flags/flag-definitions.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/flags/flag-definitions.h).

Para WebAssembly, consulta la [lista de verificación para distribución de WebAssembly](/docs/wasm-shipping-checklist).

### [Chromestatus](https://chromestatus.com/) y puertas de revisión

El proceso de intención de Blink incluye una serie de puertas de revisión que deben ser aprobadas en la entrada de la característica en [Chromestatus](https://chromestatus.com/) antes de que se envíe una intención de distribución solicitando aprobaciones de los API OWNER.

Estas puertas están dirigidas a los API web, y algunas puertas pueden no ser aplicables a características de JavaScript y WebAssembly. Lo siguiente es una orientación general. Los detalles varían de una característica a otra; ¡no aplique la orientación ciegamente!

#### Privacidad

La mayoría de las características de JavaScript y WebAssembly no afectan la privacidad. Raras veces, las características pueden añadir nuevos vectores de huella digital que revelen información sobre el sistema operativo o hardware del usuario.

#### Seguridad

Aunque JavaScript y WebAssembly son vectores comunes de ataque en exploits de seguridad, la mayoría de las nuevas características no añaden una superficie de ataque adicional. [Las pruebas de fuzzing](#fuzzing) son necesarias y mitigan parte del riesgo.

Las características que afectan a vectores de ataque populares conocidos, como los `ArrayBuffer`s en JavaScript, y las características que podrían habilitar ataques por canales secundarios, necesitan un escrutinio adicional y deben ser revisadas.

#### Empresa

Durante su proceso de estandarización en TC39 y el Wasm CG, las características de JavaScript y WebAssembly ya están sometidas a un examen exhaustivo de compatibilidad hacia atrás. Es extremadamente raro que las características sean incompatible hacia atrás de forma intencionada.

Para JavaScript, las características recién distribuidas también pueden ser desactivadas mediante `chrome://flags/#disable-javascript-harmony-shipping`.

#### Depurabilidad

La depurabilidad de las características de JavaScript y WebAssembly varía significativamente de una característica a otra. Las características de JavaScript que solo añaden nuevos métodos incorporados no necesitan soporte adicional para el depurador, mientras que las características de WebAssembly que añaden nuevas capacidades pueden necesitar un soporte adicional significativo para el depurador.

Para más detalles, consulta la [lista de verificación para depuración de características de JavaScript](https://docs.google.com/document/d/1_DBgJ9eowJJwZYtY6HdiyrizzWzwXVkG5Kt8s3TccYE/edit#heading=h.u5lyedo73aa9) y la [lista de verificación para depuración de características de WebAssembly](https://goo.gle/devtools-wasm-checklist).

Cuando tengas dudas, esta puerta es aplicable.

#### Pruebas

En lugar de WPT, las pruebas de Test262 son suficientes para las características de JavaScript, y las pruebas de la especificación de WebAssembly son suficientes para las características de WebAssembly.

No es necesario agregar Pruebas de Plataforma Web (WPT), ya que las características del lenguaje JavaScript y WebAssembly tienen sus propios repositorios de pruebas interoperables que son ejecutados por múltiples implementaciones. Sin embargo, si crees que es beneficioso, siéntete libre de añadir algunas.

Para las características de JavaScript, se requieren pruebas explícitas de corrección en [Test262](https://github.com/tc39/test262). Ten en cuenta que las pruebas en el [directorio de staging](https://github.com/tc39/test262/blob/main/CONTRIBUTING.md#staging) son suficientes.

Para las características de WebAssembly, se requieren pruebas explícitas de corrección en el [repositorio de pruebas de la especificación de WebAssembly](https://github.com/WebAssembly/spec/tree/master/test).

Para pruebas de rendimiento, JavaScript ya subyace en la mayoría de los puntos de referencia de rendimiento existentes, como Speedometer.

### A quién CC

**Cada** correo “intención de `$algo`” (por ejemplo, “intención de implementar”) debería incluir en CC a [v8-users@googlegroups.com](mailto:v8-users@googlegroups.com) además de [blink-dev@chromium.org](mailto:blink-dev@chromium.org). De esta manera, otros integradores de V8 también se mantienen informados.

### Enlace al repositorio de la especificación

El proceso de Intención de Blink requiere un explicador. En lugar de escribir un nuevo documento, siéntete libre de vincular al respectivo repositorio de especificación (por ejemplo, [`import.meta`](https://github.com/tc39/proposal-import-meta)).
