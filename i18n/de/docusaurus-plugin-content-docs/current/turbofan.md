---
title: "TurboFan"
description: "Dieses Dokument sammelt Ressourcen über TurboFan, den optimierenden Compiler von V8."
---
TurboFan ist einer der optimierenden Compiler von V8 und nutzt ein Konzept, das als [„Sea of Nodes“](https://darksi.de/d.sea-of-nodes/) bekannt ist. Einer der Blogeinträge von V8 bietet eine [Übersicht über TurboFan](/blog/turbofan-jit). Weitere Details finden sich in den folgenden Ressourcen.

## Artikel und Blogeinträge

- [Eine Geschichte von TurboFan](https://benediktmeurer.de/2017/03/01/v8-behind-the-scenes-february-edition)
- [Ignition + TurboFan und ES2015](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition)
- [Eine Einführung in spekulative Optimierung in V8](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)

## Vorträge

- [CodeStubAssembler: Redux](https://docs.google.com/presentation/d/1u6bsgRBqyVY3RddMfF1ZaJ1hWmqHZiVMuPRw_iKpHlY)
- [Ein Überblick über den TurboFan-Compiler](https://docs.google.com/presentation/d/1H1lLsbclvzyOF3IUR05ZUaZcqDxo7_-8f4yJoxdMooU/edit)
- [TurboFan IR](https://docs.google.com/presentation/d/1Z9iIHojKDrXvZ27gRX51UxHD-bKf1QcPzSijntpMJBM)
- [Das JIT-Design von TurboFan](https://docs.google.com/presentation/d/1sOEF4MlF7LeO7uq-uThJSulJlTh--wgLeaVibsbb3tc)
- [Schnelle Arithmetik für dynamische Sprachen](https://docs.google.com/a/google.com/presentation/d/1wZVIqJMODGFYggueQySdiA3tUYuHNMcyp_PndgXsO1Y)
- [Deoptimierung in V8](https://docs.google.com/presentation/d/1Z6oCocRASCfTqGq1GCo1jbULDGS-w-nzxkbVF7Up0u0)
- [TurboFan: Eine neue Architektur für die Codegenerierung in V8](https://docs.google.com/presentation/d/1_eLlVzcj94_G4r9j9d_Lj5HRKFnq6jgpuPJtnmIBs88) ([Video](https://www.youtube.com/watch?v=M1FBosB5tjM))
- [Ein Praktikum über Faulheit](https://docs.google.com/presentation/d/1AVu1wiz6Deyz1MDlhzOWZDRn6g_iFkcqsGce1F23i-M) (+ [Blogeintrag](/blog/lazy-unlinking))

## Entwurfsdokumente

Dies sind Entwurfsdokumente, die sich hauptsächlich mit den internen Aspekten von TurboFan befassen.

- [Funktionskontextspezialisierung](https://docs.google.com/document/d/1CJbBtqzKmQxM1Mo4xU0ENA7KXqb1YzI6HQU8qESZ9Ic)
- [Optimierungsplan für Restparameter und exotische Argumentobjekte](https://docs.google.com/document/d/1DvDx3Xursn1ViV5k4rT4KB8HBfBb2GdUy3wzNfJWcKM)
- [Integration von TurboFan-Entwicklertools](https://docs.google.com/document/d/1zl0IA7dbPffvPPkaCmLVPttq4BYIfAe2Qy8sapkYgRE)
- [TurboFan-Inlining](https://docs.google.com/document/d/1l-oZOW3uU4kSAHccaMuUMl_RCwuQC526s0hcNVeAM1E)
- [Heuristiken für TurboFan-Inlining](https://docs.google.com/document/d/1VoYBhpDhJC4VlqMXCKvae-8IGuheBGxy32EOgC2LnT8)
- [Eliminierung redundanter Schranken- und Überlaufprüfungen in TurboFan](https://docs.google.com/document/d/1R7-BIUnIKFzqki0jR4SfEZb3XmLafa04DLDrqhxgZ9U)
- [Lazy-Deoptimierung ohne Codepatching](https://docs.google.com/document/d/1ELgd71B6iBaU6UmZ_lvwxf_OrYYnv0e4nuzZpK05-pg)
- [Register-Allokator](https://docs.google.com/document/d/1aeUugkWCF1biPB4tTZ2KT3mmRSDV785yWZhwzlJe5xY)
- [Projektnodes in TurboFan](https://docs.google.com/document/d/1C9P8T98P1T_r2ymuUFz2jFWLUL7gbb6FnAaRjabuOMY/edit)

## Verwandte Entwurfsdokumente

Dies sind Entwurfsdokumente, die TurboFan auf wesentliche Weise beeinflussen.

- [Entwurfsdokument zur (Neu)gestaltung berechneter Eigenschaftsnamen](https://docs.google.com/document/d/1eH1R6_C3lRrLtXKw0jNqAsqJ3cBecrqqvfRzLpfq7VE)
- [Leistungsplan für ES2015 und darüber hinaus](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)
- [Entwurfsdokument zu Iterator-Builtins](https://docs.google.com/document/d/13z1fvRVpe_oEroplXEEX0a3WK94fhXorHjcOMsDmR-8)
- [ES2015-Klassen schnell machen](https://docs.google.com/document/d/1iCdbXuGVV8BK750wmP32eF4sCrnZ8y3Qlz0JiaLh9j8)
- [Entwurfsdokument zu RegExp-Builtins](https://docs.google.com/document/d/1MuqFjsfaRPL2ZqzVoeMRqtcAmcJSwmHljTbRIctVVUk)
- [Leistungssteigerung bei Spread-Aufrufen](https://docs.google.com/document/d/1DWPizOSKqHhSJ7bdEI0HIVnner84xToEKUYqgXm3g30)
