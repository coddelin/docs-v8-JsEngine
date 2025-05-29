---
title: "Pruebas web de Blink (también conocidas como pruebas de diseño)"
description: "La infraestructura de V8 ejecuta continuamente las pruebas web de Blink para evitar problemas de integración con Chromium. Este documento describe qué hacer en caso de que falle una prueba."
---
Ejecutamos continuamente [las pruebas web de Blink (anteriormente conocidas como “pruebas de diseño”)](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md) en nuestra [consola de integración](https://ci.chromium.org/p/v8/g/integration/console) para evitar problemas de integración con Chromium.

En caso de fallos en las pruebas, los bots comparan los resultados de V8 Tip-of-Tree con la versión fija de V8 de Chromium, para marcar solo los problemas nuevos introducidos en V8 (con falsos positivos < 5%). La asignación de culpa es trivial ya que el bot de [Linux release](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Blink%20Linux) prueba todas las revisiones.

Los commits con fallos recién introducidos normalmente se revierten para desbloquear el auto-rolling en Chromium. En caso de que notes que rompes las pruebas de diseño o que tu commit sea revertido debido a tales fallos, y si los cambios son esperados, sigue este procedimiento para agregar las líneas base actualizadas a Chromium antes de (re-)aplicar tu CL:

1. Ingresa un cambio en Chromium configurando `[ Failure Pass ]` para las pruebas cambiadas ([más información](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#updating-the-expectations-files)).
1. Ingresa tu CL de V8 y espera 1-2 días hasta que se integre en Chromium.
1. Sigue [estas instrucciones](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md#Rebaselining-Web-Tests) para generar manualmente las nuevas líneas base. Ten en cuenta que si solo estás haciendo cambios en Chromium, [este procedimiento automático preferido](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#how-to-rebaseline) debería funcionarte.
1. Elimina la entrada `[ Failure Pass ]` del archivo de expectativas de prueba y confírmalo junto con las nuevas líneas base en Chromium.

Por favor, asocia todos los CL con un pie de página `Bug: …`.
