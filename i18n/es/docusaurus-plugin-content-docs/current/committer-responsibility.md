---
title: 'Responsabilidades de los colaboradores y revisores de V8'
description: 'Este documento enumera directrices para los contribuyentes de V8.'
---
Cuando estés contribuyendo a los repositorios de V8, asegúrate de seguir estas directrices (adaptadas de https://dev.chromium.org/developers/committers-responsibility):

1. Encuentra al revisor adecuado para tus cambios y para los parches que te pidan revisar.
1. Estate disponible en mensajería instantánea y/o correo electrónico antes y después de aplicar el cambio.
1. Observa el [waterfall](https://ci.chromium.org/p/v8/g/main/console) hasta que todos los bots se pongan en verde después de tu cambio.
1. Al realizar un cambio TBR (To Be Reviewed, por sus siglas en inglés), asegúrate de notificar a las personas cuyo código estás modificando. Generalmente, solo envía el correo electrónico de revisión.

En resumen, haz lo correcto para el proyecto, no lo más fácil para que el código sea aceptado, y sobre todo: usa tu mejor juicio.

**No tengas miedo de hacer preguntas. Siempre habrá alguien que lea de inmediato los mensajes enviados a la lista de correos de v8-committers y pueda ayudarte.**

## Cambios con múltiples revisores

Ocasionalmente hay cambios con muchos revisores implicados, ya que a veces varias personas necesitan estar al tanto de un cambio debido a múltiples áreas de responsabilidad y experiencia.

El problema es que, sin algunas directrices, no hay una responsabilidad clara asignada en estas revisiones.

Si eres el único revisor de un cambio, sabes que debes hacer un buen trabajo. Cuando hay otras tres personas, a veces asumes que alguien más debe haber revisado cuidadosamente alguna parte de la revisión. A veces todos los revisores lo piensan y el cambio no se revisa adecuadamente.

En otros casos, algunos revisores dicen "LGTM" para un parche, mientras que otros todavía esperan cambios. El autor puede confundirse sobre el estado de la revisión, y se han registrado parches en los que al menos un revisor esperaba cambios adicionales antes de comprometer.

Al mismo tiempo, queremos alentar a muchas personas a participar en el proceso de revisión y mantenerse al tanto de lo que está sucediendo.

Por ello, aquí hay algunas directrices para ayudar a aclarar el proceso:

1. Cuando un autor de un parche solicita más de un revisor, debe aclarar en el correo electrónico de solicitud de revisión qué espera que haga cada revisor. Por ejemplo, podrías escribir esto en el correo:

    ```
    - larry: cambios en bitmap
    - sergey: hacks en procesos
    - todos los demás: FYI
    ```

1. En este caso, podrías estar en la lista de revisión porque solicitaste estar al tanto de los cambios multiproceso, pero no serías el revisor principal y el autor ni los otros revisores esperarían que revises todos los diffs en detalle.
1. Si recibes una revisión que incluye a muchas otras personas, y el autor no hizo el paso (1), por favor pregúntales de qué parte eres responsable si no deseas revisar todo en detalle.
1. El autor debe esperar la aprobación de todos en la lista de revisores antes de integrar el cambio.
1. Las personas en una revisión sin responsabilidad clara de revisión (es decir, revisiones casuales) deben ser súper receptivas y no retrasar la revisión. El autor del parche debe sentirse libre de insistirles sin piedad si lo hacen.
1. Si eres una persona tipo "FYI" en una revisión y no revisaste en detalle (o no revisaste en absoluto), pero no tienes problemas con el parche, indicadlo. Puedes decir algo como "sello de goma" o "ACK" en lugar de "LGTM". De este modo, los revisores reales saben que no deben confiar en que hiciste su trabajo por ellos, pero el autor del parche sabe que no tiene que esperar más comentarios tuyos. Con suerte, aún podemos mantener a todos al tanto, pero con una propiedad clara y revisiones detalladas. Incluso podría acelerar algunos cambios ya que puedes "ACK" rápidamente los cambios que no te interesan, y el autor sabe que no tiene que esperar tu retroalimentación.
