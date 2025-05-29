---
title: 'Pautas de revisión de diseño'
description: 'Este documento explica las pautas de revisión de diseño del proyecto V8.'
---
Por favor, asegúrate de seguir las siguientes pautas cuando sea aplicable.

Existen múltiples razones para la formalización de las revisiones de diseño de V8:

1. dejar claro a los Colaboradores Individuales (CI) quiénes son los responsables de tomar decisiones y destacar cuál es el camino a seguir en caso de que los proyectos no avancen debido a desacuerdos técnicos
1. crear un foro para tener discusiones de diseño directas
1. garantizar que los Líderes Técnicos (LT) de V8 estén al tanto de todos los cambios significativos y tengan la oportunidad de dar su opinión en el nivel de Líder Técnico (LT)
1. aumentar la participación de todos los colaboradores de V8 en todo el mundo

## Resumen

![Pautas de Revisión de Diseño de V8 de un vistazo](/_img/docs/design-review-guidelines/design-review-guidelines.svg)

Importante:

1. asumir buenas intenciones
1. ser amable y civilizado
1. ser pragmático

La solución propuesta se basa en los siguientes supuestos/pilares:

1. El flujo de trabajo propuesto pone al colaborador individual (CI) a cargo. Ellos son quienes facilitan el proceso.
1. Sus LT guía tienen la tarea de ayudarles a navegar por el territorio y encontrar los proveedores de LGTM adecuados.
1. Si una característica no es controvertida, casi no se debería generar sobrecarga.
1. Si hay mucha controversia, la característica puede ser 'escalada' a la reunión de Responsables de Revisión Técnica de V8, donde se deciden los pasos adicionales.

## Roles

### Colaborador Individual (CI)

LGTM: N/A
Esta persona es el creador de la característica y de la documentación de diseño.

### El Líder Técnico (LT) del CI

LGTM: Obligatorio
Esta persona es el LT de un proyecto o componente específico. Probablemente sea la persona que es propietaria del componente principal que tu característica tocará. Si no está claro quién es el LT, por favor pregúntalo a los Responsables de Revisión Técnica de V8 a través de v8-eng-review-owners@googlegroups.com. Los LT son responsables de agregar más personas a la lista de LGTMs requeridos si es apropiado.

### Proveedor de LGTM

LGTM: Obligatorio
Esta es una persona requerida para dar LGTM. Podría ser un CI o un LT(M).

### Revisor “Aleatorio” del documento (RRotD)

LGTM: No obligatorio
Esta es alguien que simplemente revisa y comenta sobre la propuesta. Sus comentarios deben ser considerados, aunque su LGTM no es obligatorio.

### Responsables de Revisión Técnica de V8

LGTM: No obligatorio
Las propuestas atascadas pueden ser escaladas a los Responsables de Revisión Técnica de V8 a través de  v8-eng-review-owners@googlegroups.com. Casos de uso potenciales para dicha escalada:

- un proveedor de LGTM no responde
- no se puede alcanzar un consenso sobre el diseño

Los Responsables de Revisión Técnica de V8 pueden invalidar no-LGTMs o LGTMs.

## Flujo de trabajo detallado

![Pautas de Revisión de Diseño de V8 de un vistazo](/_img/docs/design-review-guidelines/design-review-guidelines.svg)

1. Inicio: el CI decide trabajar en una característica/le asignan una característica
1. El CI envía su documento de diseño inicial/explicador/una página a algunos RRotDs
    1. Los prototipos se consideran parte del "documento de diseño"
1. El CI agrega personas a la lista de proveedores de LGTM que el CI considera que deberían dar su LGTM. El LT es obligatorio en la lista de proveedores de LGTM.
1. El CI incorpora comentarios.
1. El LT agrega más personas a la lista de proveedores de LGTM.
1. El CI envía el documento de diseño inicial/explicador/una página a  v8-dev+design@googlegroups.com.
1. El CI recopila los LGTMs. El LT les ayuda.
    1. El proveedor de LGTM revisa el documento, agrega comentarios y da un LGTM o no-LGTM al principio del documento. Si agregan un no-LGTM, están obligados a listar las razones.
    1. Opcional: los proveedores de LGTM pueden eliminarse de la lista de proveedores de LGTM y/o sugerir otros proveedores de LGTM
    1. El CI y el LT trabajan para resolver los problemas no resueltos.
    1. Si se recopilan todos los LGTMs, enviar un correo a v8-dev@googlegroups.com (por ejemplo, respondiendo al hilo original) y anunciar la implementación.
1. Opcional: si el CI y el LT están bloqueados y/o quieren tener una discusión más amplia, pueden escalar el problema a los Responsables de Revisión Técnica de V8.
    1. El CI envía un correo a v8-eng-review-owners@googlegroups.com
        1. LT en CC
        1. Enlace al documento de diseño en el correo
    1. Cada miembro de los Responsables de Revisión Técnica de V8 está obligado a revisar el documento y opcionalmente agregarse a la lista de proveedores de LGTM.
    1. Se deciden los próximos pasos para desbloquear la característica.
    1. Si después no se resuelve el bloqueo o se descubren nuevos bloqueos irresolubles, regresar al paso 8.
1. Opcional: si se agregan "no-LGTMs" después de que la característica ya fue aprobada, deben tratarse como problemas normales no resueltos.
    1. El CI y el LT trabajan para resolver los problemas no resueltos.
1. Fin: el CI procede con la característica.

Y siempre recuerda:

1. asumir buenas intenciones
1. ser amable y civilizado
1. ser pragmático

## FAQ

### ¿Cómo decidir si vale la pena tener un documento de diseño para la característica?

Algunas señales de cuándo es apropiado un documento de diseño:

- Afecta al menos a dos componentes
- Necesita reconciliación con proyectos no relacionados con V8, por ejemplo, Debugger, Blink
- Requiere más de 1 semana de esfuerzo para implementar
- Es una característica del lenguaje
- El código específico de la plataforma será modificado
- Cambios visibles para el usuario
- Tiene consideraciones especiales de seguridad o el impacto en seguridad no es obvio

En caso de duda, pregunta al TL.

### ¿Cómo decidir a quién añadir a la lista de proveedores de LGTM?

Algunos puntos a considerar sobre cuándo añadir personas a la lista de proveedores de LGTM:

- OWNERs de los archivos/directorios fuente que anticipas modificar
- Experto principal de los componentes que anticipas modificar
- Consumidores de tus cambios a nivel descendente, por ejemplo, cuando cambias una API

### ¿Quién es “mi” TL?

Probablemente esta es la persona que es propietaria del componente principal que tu característica va a modificar. Si no está claro quién es el TL, por favor pregunta a los V8 Eng Review Owners a través de v8-eng-review-owners@googlegroups.com.

### ¿Dónde puedo encontrar una plantilla para documentos de diseño?

[Aquí](https://docs.google.com/document/d/1CWNKvxOYXGMHepW31hPwaFz9mOqffaXnuGqhMqcyFYo/template/preview).

### ¿Qué pasa si algo grande cambia?

Asegúrate de que todavía tengas los LGTMs, por ejemplo, contactando a los proveedores de LGTM con un plazo claro y razonable para vetar.

### Los proveedores de LGTM no comentan en mi documento, ¿qué debería hacer?

En este caso puedes seguir este camino de escalamiento:

- Contáctalos directamente por correo, Hangouts o comentario/asignación en el documento y pídeles específicamente que añadan explícitamente un LGTM o un no-LGTM.
- Involucra a tu TL y pídele ayuda.
- Escala el asunto a v8-eng-review-owners@googlegroups.com.

### Alguien me añadió como un proveedor de LGTM a un documento, ¿qué debería hacer?

V8 busca hacer las decisiones más transparentes y el escalamiento más directo. Si piensas que el diseño es lo suficientemente bueno y debería realizarse, añade un “LGTM” en la celda de la tabla junto a tu nombre.

Si tienes preocupaciones o comentarios que bloquean, por favor añade “No LGTM, debido a \<razón>” en la celda de la tabla junto a tu nombre. Prepárate para que te pidan otra ronda de revisión.

### ¿Cómo funciona esto junto con el proceso de Intenciones de Blink?

Las Directrices de Revisión de Diseño de V8 complementan el [proceso de Intenciones+Erratas de Blink de V8](/docs/feature-launch-process). Si estás lanzando una nueva característica de lenguaje WebAssembly o JavaScript, por favor sigue el proceso de Intenciones+Erratas de Blink de V8 y las Directrices de Revisión de Diseño de V8. Probablemente tiene sentido reunir todos los LGTMs en el momento en que envíes una Intención de Implementar.
