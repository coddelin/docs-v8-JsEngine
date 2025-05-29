---
title: "Almacenamiento en caché de código"
author: "Yang Guo ([@hashseed](https://twitter.com/hashseed)), Ingeniero de Software"
avatars: 
  - "yang-guo"
date: "2015-07-27 13:33:37"
tags: 
  - internos
description: "V8 ahora soporta almacenamiento en caché de (byte)código, es decir, guardar en caché el resultado del análisis y la compilación de JavaScript."
---
V8 utiliza [compilación justo a tiempo](https://es.wikipedia.org/wiki/Compilaci%C3%B3n_en_tiempo_de_ejecuci%C3%B3n) (JIT) para ejecutar código JavaScript. Esto significa que inmediatamente antes de ejecutar un script, debe ser analizado y compilado, lo que puede generar una sobrecarga considerable. Como [anunciamos recientemente](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html), el almacenamiento en caché de código es una técnica que reduce esta sobrecarga. Cuando un script se compila por primera vez, se generan y almacenan datos en caché. La próxima vez que V8 necesite compilar el mismo script, incluso en una instancia diferente de V8, puede usar los datos en caché para recrear el resultado de la compilación en lugar de compilar desde cero. Como resultado, el script se ejecuta mucho más rápido.

<!--truncate-->
El almacenamiento en caché de código está disponible desde la versión 4.2 de V8 y no se limita únicamente a Chrome. Está expuesto a través de la API de V8, de modo que cualquier integrador de V8 puede beneficiarse de esta función. El [caso de prueba](https://chromium.googlesource.com/v8/v8.git/+/4.5.56/test/cctest/test-api.cc#21090) utilizado para evaluar esta característica sirve como ejemplo de cómo usar esta API.

Cuando un script es compilado por V8, se pueden generar datos en caché para acelerar compilaciones futuras pasando la opción `v8::ScriptCompiler::kProduceCodeCache`. Si la compilación tiene éxito, los datos en caché se adjuntan al objeto fuente y se pueden obtener mediante `v8::ScriptCompiler::Source::GetCachedData`. Luego, estos datos pueden ser persistidos para su uso posterior, por ejemplo, escribiéndolos en disco.

En compilaciones posteriores, los datos en caché generados previamente pueden adjuntarse al objeto fuente y se puede pasar la opción `v8::ScriptCompiler::kConsumeCodeCache`. En esta ocasión, el código se genera mucho más rápido, ya que V8 omite la compilación del código y lo deserializa a partir de los datos en caché proporcionados.

La generación de datos en caché viene con un cierto costo computacional y de memoria. Por esta razón, Chrome solo genera datos en caché si el mismo script se ve al menos dos veces dentro de un par de días. De esta manera, Chrome logra convertir archivos de script en código ejecutable el doble de rápido en promedio, ahorrando tiempo valioso a los usuarios en cada carga de página subsiguiente.
