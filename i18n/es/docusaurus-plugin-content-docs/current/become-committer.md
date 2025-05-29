---
title: "Convertirse en committer"
description: "¿Cómo se convierte uno en un committer de V8? Este documento lo explica."
---
Técnicamente, los committers son personas que tienen acceso de escritura al repositorio de V8. Todos los parches deben ser revisados por al menos dos committers (incluido el autor). Independientemente de este requisito, los parches también deben ser creados o revisados por un OWNER.

Este privilegio se otorga con cierta expectativa de responsabilidad: los committers son personas que se preocupan por el proyecto V8 y quieren ayudar a alcanzar sus objetivos. Los committers no solo son personas que pueden hacer cambios, sino personas que han demostrado su capacidad para colaborar con el equipo, hacer que las personas más conocedoras revisen el código, contribuir con código de alta calidad y resolver problemas (en el código o las pruebas).

Un committer es un contribuyente al éxito del proyecto V8 y un ciudadano que ayuda a que los proyectos tengan éxito. Ver [Responsabilidad del committer](/docs/committer-responsibility).

## ¿Cómo me convierto en un committer?

*Nota para empleados de Google: Hay un [enfoque ligeramente diferente para los miembros del equipo de V8](http://go/v8/setup_permissions.md).*

Si aún no lo has hecho, **deberás configurar una llave de seguridad en tu cuenta antes de ser añadido a la lista de committers.**

En resumen, contribuye con 20 parches no triviales y consigue que al menos tres personas diferentes los revisen (necesitarás el apoyo de tres personas). Luego pídele a alguien que te nomine. Estás demostrando tu:

- compromiso con el proyecto (20 buenos parches requieren mucho de tu valioso tiempo),
- capacidad para colaborar con el equipo,
- comprensión de cómo trabaja el equipo (políticas, procesos de prueba y revisión de código, etc.),
- comprensión del código base del proyecto y el estilo de codificación, y
- capacidad para escribir buen código (por último, pero no menos importante)

Un committer actual te nomina enviando un correo electrónico a [v8-committers@chromium.org](mailto:v8-committers@chromium.org) que contenga:

- tu nombre y apellido
- tu dirección de correo electrónico en Gerrit
- una explicación de por qué deberías ser un committer,
- una lista incrustada de enlaces a revisiones (aproximadamente las 10 principales) que contengan tus parches

Otros dos committers deben secundar tu nominación. Si nadie se opone en 5 días hábiles, eres un committer. Si alguien se opone o quiere más información, los committers discuten y usualmente llegan a un consenso (dentro de los 5 días hábiles). Si los problemas no pueden resolverse, se realiza una votación entre los committers actuales.

Una vez que obtengas la aprobación de los committers existentes, se te otorgarán permisos adicionales de revisión. También serás añadido a la lista de correo [v8-committers@googlegroups.com](mailto:v8-committers@googlegroups.com).

En el peor de los casos, el proceso puede extenderse por dos semanas. ¡Sigue escribiendo parches! Incluso en los raros casos en que una nominación falla, la objeción suele ser algo fácil de solucionar como “más parches” o “no suficientes personas están familiarizadas con el trabajo de esta persona”.

## Mantener el estatus de committer

No necesitas hacer mucho realmente para mantener el estatus de committer: ¡solo sigue siendo increíble y ayudando al proyecto V8!

En el desafortunado caso de que un committer continúe ignorando las buenas prácticas de ciudadanía (o interrumpa activamente el proyecto), podríamos necesitar revocar el estatus de esa persona. El proceso es el mismo que para nominar a un nuevo committer: alguien sugiere la revocación con una buena razón, dos personas secundan la moción y se puede convocar una votación si no se llega a un consenso. Espero que sea lo suficientemente simple y que nunca tengamos que probarlo en la práctica.

Además, como medida de seguridad, si estás inactivo en Gerrit (sin realizar cargas, comentarios o revisiones) durante más de un año, podríamos revocar tus privilegios como committer. Se enviará una notificación por correo electrónico aproximadamente 7 días antes de la eliminación. Esto no pretende ser un castigo, por lo que si deseas reanudar tu contribución después de eso, contacta [v8-committers@googlegroups.com](mailto:v8-committers@googlegroups.com) para solicitar que se restauren tus privilegios, y normalmente lo haremos.

(Este documento se inspiró en [convertirse-en-committer](https://dev.chromium.org/getting-involved/become-a-committer).)
