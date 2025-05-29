---
title: "V8 en la conferencia BlinkOn 6"
author: "el equipo de V8"
date: 2016-07-21 13:33:37
tags:
  - presentaciones
description: "Una descripción general de las presentaciones del equipo de V8 en BlinkOn 6."
---
BlinkOn es una reunión semestral de los colaboradores de Blink, V8 y Chromium. BlinkOn 6 se llevó a cabo en Múnich el 16 y 17 de junio. El equipo de V8 ofreció varias presentaciones sobre arquitectura, diseño, iniciativas de rendimiento e implementación del lenguaje.

<!--truncate-->
Las charlas de V8 en BlinkOn están incrustadas a continuación.

## Rendimiento de JavaScript en el mundo real

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/xCx4uC7mn6Y" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Duración: 31:41
- [Diapositivas](https://docs.google.com/presentation/d/14WZkWbkvtmZDEIBYP5H1GrbC9H-W3nJSg3nvpHwfG5U/edit)

Describe la historia de cómo V8 mide el rendimiento de JavaScript, las diferentes eras de evaluación de benchmarks y una nueva técnica para medir la carga de páginas en sitios web populares del mundo real con desgloses detallados del tiempo por componente de V8.

## Ignition: un intérprete para V8

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/r5OWCtuKiAk" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Duración: 36:39
- [Diapositivas](https://docs.google.com/presentation/d/1OqjVqRhtwlKeKfvMdX6HaCIu9wpZsrzqpIVIwQSuiXQ/edit)

Presenta el nuevo intérprete Ignition de V8, explicando la arquitectura del motor en su conjunto y cómo Ignition afecta el uso de memoria y el rendimiento de inicio.

## Cómo medimos y optimizamos para RAIL en el GC de V8

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/VITAyGT-CJI" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Duración: 27:11
- [Diapositivas](https://docs.google.com/presentation/d/15EQ603eZWAnrf4i6QjPP7S3KF3NaL3aAaKhNUEatVzY/edit)

Explica cómo V8 utiliza las métricas Respuesta, Animación, Ocio, Carga (RAIL) para apuntar a una recolección de basura de baja latencia y las optimizaciones recientes realizadas para reducir interrupciones en dispositivos móviles.

## ECMAScript 2015 y más allá

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/KrGOzEwqRDA" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Duración: 28:52
- [Diapositivas](https://docs.google.com/presentation/d/1o1wld5z0BM8RTqXASGYD3Rvov8PzrxySghmrGTYTgw0/edit)

Proporciona una actualización sobre la implementación de nuevas características del lenguaje en V8, cómo esas características se integran con la plataforma web, y el proceso de estándares que continúa evolucionando el lenguaje ECMAScript.

## Envoltorios de seguimiento de V8 a Blink (charla relámpago)

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PMDRfYw4UYQ?start=3204" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Duración: 2:31
- [Diapositivas](https://docs.google.com/presentation/d/1I6leiRm0ysSTqy7QWh33Gfp7_y4ngygyM2tDAqdF0fI/edit)

Destaca los envoltorios de seguimiento entre los objetos de V8 y Blink y cómo ayudan a prevenir filtraciones de memoria y a reducir la latencia.
