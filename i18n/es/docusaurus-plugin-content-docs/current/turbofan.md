---
title: 'TurboFan'
description: 'Este documento reúne recursos sobre TurboFan, el compilador optimizador de V8.'
---
TurboFan es uno de los compiladores optimizadores de V8 que utiliza un concepto llamado [“Sea of Nodes”](https://darksi.de/d.sea-of-nodes/). Uno de los artículos del blog de V8 ofrece una [visión general de alto nivel sobre TurboFan](/blog/turbofan-jit). Más detalles se pueden encontrar en los siguientes recursos.

## Artículos y publicaciones en blogs

- [Una historia sobre TurboFan](https://benediktmeurer.de/2017/03/01/v8-behind-the-scenes-february-edition)
- [Ignition + TurboFan y ES2015](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition)
- [Una introducción a la optimización especulativa en V8](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)

## Presentaciones

- [CodeStubAssembler: Redux](https://docs.google.com/presentation/d/1u6bsgRBqyVY3RddMfF1ZaJ1hWmqHZiVMuPRw_iKpHlY)
- [Una visión general sobre el compilador TurboFan](https://docs.google.com/presentation/d/1H1lLsbclvzyOF3IUR05ZUaZcqDxo7_-8f4yJoxdMooU/edit)
- [TurboFan IR](https://docs.google.com/presentation/d/1Z9iIHojKDrXvZ27gRX51UxHD-bKf1QcPzSijntpMJBM)
- [Diseño JIT de TurboFan](https://docs.google.com/presentation/d/1sOEF4MlF7LeO7uq-uThJSulJlTh--wgLeaVibsbb3tc)
- [Aritmética rápida para lenguajes dinámicos](https://docs.google.com/a/google.com/presentation/d/1wZVIqJMODGFYggueQySdiA3tUYuHNMcyp_PndgXsO1Y)
- [Desoptimización en V8](https://docs.google.com/presentation/d/1Z6oCocRASCfTqGq1GCo1jbULDGS-w-nzxkbVF7Up0u0)
- [TurboFan: una nueva arquitectura de generación de código para V8](https://docs.google.com/presentation/d/1_eLlVzcj94_G4r9j9d_Lj5HRKFnq6jgpuPJtnmIBs88) ([video](https://www.youtube.com/watch?v=M1FBosB5tjM))
- [Una pasantía sobre la pereza](https://docs.google.com/presentation/d/1AVu1wiz6Deyz1MDlhzOWZDRn6g_iFkcqsGce1F23i-M) (+ [publicación en el blog](/blog/lazy-unlinking))

## Documentos de diseño

Estos son documentos de diseño que están principalmente relacionados con los aspectos internos de TurboFan.

- [Especialización del contexto de función](https://docs.google.com/document/d/1CJbBtqzKmQxM1Mo4xU0ENA7KXqb1YzI6HQU8qESZ9Ic)
- [Plan de optimización para parámetros resto y objetos exóticos arguments](https://docs.google.com/document/d/1DvDx3Xursn1ViV5k4rT4KB8HBfBb2GdUy3wzNfJWcKM)
- [Integración de herramientas de desarrollo con TurboFan](https://docs.google.com/document/d/1zl0IA7dbPffvPPkaCmLVPttq4BYIfAe2Qy8sapkYgRE)
- [Inlining en TurboFan](https://docs.google.com/document/d/1l-oZOW3uU4kSAHccaMuUMl_RCwuQC526s0hcNVeAM1E)
- [Heurísticas de inlining en TurboFan](https://docs.google.com/document/d/1VoYBhpDhJC4VlqMXCKvae-8IGuheBGxy32EOgC2LnT8)
- [Eliminación de límites redundantes y comprobación de desbordamiento en TurboFan](https://docs.google.com/document/d/1R7-BIUnIKFzqki0jR4SfEZb3XmLafa04DLDrqhxgZ9U)
- [Desoptimización perezosa sin parcheo de código](https://docs.google.com/document/d/1ELgd71B6iBaU6UmZ_lvwxf_OrYYnv0e4nuzZpK05-pg)
- [Asignador de registros](https://docs.google.com/document/d/1aeUugkWCF1biPB4tTZ2KT3mmRSDV785yWZhwzlJe5xY)
- [Nodos de proyección en TurboFan](https://docs.google.com/document/d/1C9P8T98P1T_r2ymuUFz2jFWLUL7gbb6FnAaRjabuOMY/edit)

## Documentos de diseño relacionados

Estos son documentos de diseño que también afectan significativamente a TurboFan.

- [Documento de diseño de nombres de propiedades computadas (re)diseño](https://docs.google.com/document/d/1eH1R6_C3lRrLtXKw0jNqAsqJ3cBecrqqvfRzLpfq7VE)
- [Plan de rendimiento para ES2015 y más allá](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)
- [Documento de diseño de iteradores integrados](https://docs.google.com/document/d/13z1fvRVpe_oEroplXEEX0a3WK94fhXorHjcOMsDmR-8)
- [Hacer que las clases de ES2015 sean rápidas](https://docs.google.com/document/d/1iCdbXuGVV8BK750wmP32eF4sCrnZ8y3Qlz0JiaLh9j8)
- [Documento de diseño sobre integrados de expresiones regulares (RegExp)](https://docs.google.com/document/d/1MuqFjsfaRPL2ZqzVoeMRqtcAmcJSwmHljTbRIctVVUk)
- [Rendimiento de llamadas con spread](https://docs.google.com/document/d/1DWPizOSKqHhSJ7bdEI0HIVnner84xToEKUYqgXm3g30)
