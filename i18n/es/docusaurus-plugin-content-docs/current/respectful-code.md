---
title: &apos;Código respetuoso&apos;
description: &apos;La inclusividad es central en la cultura de V8, y nuestros valores incluyen tratar a los demás con dignidad. Por lo tanto, es importante que todos puedan contribuir sin enfrentar los efectos nocivos del sesgo y la discriminación.&apos;
---

La inclusividad es central en la cultura de V8, y nuestros valores incluyen tratar a los demás con dignidad. Por lo tanto, es importante que todos puedan contribuir sin enfrentar los efectos nocivos del sesgo y la discriminación. Sin embargo, los términos en nuestra base de código, interfaces de usuario y documentación pueden perpetuar esa discriminación. Este documento establece una guía que tiene como objetivo abordar la terminología irrespetuosa en el código y la documentación.

## Política

Debe evitarse la terminología que sea despectiva, hiriente o perpetúe la discriminación, ya sea directa o indirectamente.

## ¿Qué abarca esta política?

Cualquier cosa que un colaborador lea mientras trabaja en V8, incluyendo:

- Nombres de variables, tipos, funciones, archivos, reglas de construcción, binarios, variables exportadas, ...
- Datos de prueba
- Salidas y pantallas del sistema
- Documentación (tanto dentro como fuera de los archivos fuente)
- Mensajes de commit

## Principios

- Sé respetuoso: no debería ser necesario usar lenguaje despectivo para describir cómo funcionan las cosas.
- Respeta el lenguaje culturalmente sensible: algunas palabras pueden tener significados históricos o políticos significativos. Por favor, ten esto en cuenta y usa alternativas.

## ¿Cómo sé si una terminología particular es aceptable o no?

Aplica los principios anteriores. Si tienes alguna duda, puedes contactar a `v8-dev@googlegroups.com`.

## ¿Cuáles son ejemplos de terminología a evitar?

Esta lista NO pretende ser exhaustiva. Contiene algunos ejemplos que las personas han encontrado con frecuencia.


| Término      | Alternativas sugeridas                                        |
| ------------ | ------------------------------------------------------------ |
| master       | primario, controlador, líder, anfitrión                      |
| slave        | réplica, subordinado, secundario, seguidor, dispositivo, periférico |
| whitelist    | lista de permitidos, lista de excepciones, lista de inclusiones |
| blacklist    | lista de denegados, lista de bloqueos, lista de exclusiones |
| insane       | inesperado, catastrófico, incoherente                        |
| sane         | esperado, apropiado, sensato, válido                         |
| crazy        | inesperado, catastrófico, incoherente                        |
| redline      | línea de prioridad, límite, límite flexible                  |


## ¿Qué hago si estoy interactuando con algo que viola esta política?

Esta situación ha surgido algunas veces, particularmente para código que implementa especificaciones. En estas circunstancias, diferir del lenguaje en la especificación puede interferir con la capacidad de entender la implementación. Para estas circunstancias, sugerimos una de las siguientes opciones, en orden decreciente de preferencia:

1. Si usar terminología alternativa no interfiere con la comprensión, utiliza la terminología alternativa.
1. Si no es posible, no propagues la terminología más allá de la capa de código que está realizando la interacción. Cuando sea necesario, utiliza terminología alternativa en los límites de la API.
