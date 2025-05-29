---
title: "TurboFan"
description: "Este documento reúne recursos sobre o TurboFan, o compilador otimizador do V8."
---
TurboFan é um dos compiladores otimizadores do V8 que utiliza um conceito chamado ['Mar de Nós'](https://darksi.de/d.sea-of-nodes/). Um dos posts do blog do V8 oferece uma [visão geral de alto nível do TurboFan](/blog/turbofan-jit). Mais detalhes podem ser encontrados nos recursos abaixo.

## Artigos e posts de blog

- [Uma história sobre TurboFan](https://benediktmeurer.de/2017/03/01/v8-behind-the-scenes-february-edition)
- [Ignition + TurboFan e ES2015](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition)
- [Uma introdução à otimização especulativa no V8](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)

## Apresentações

- [CodeStubAssembler: Redux](https://docs.google.com/presentation/d/1u6bsgRBqyVY3RddMfF1ZaJ1hWmqHZiVMuPRw_iKpHlY)
- [Uma visão geral do compilador TurboFan](https://docs.google.com/presentation/d/1H1lLsbclvzyOF3IUR05ZUaZcqDxo7_-8f4yJoxdMooU/edit)
- [IR do TurboFan](https://docs.google.com/presentation/d/1Z9iIHojKDrXvZ27gRX51UxHD-bKf1QcPzSijntpMJBM)
- [Design do JIT do TurboFan](https://docs.google.com/presentation/d/1sOEF4MlF7LeO7uq-uThJSulJlTh--wgLeaVibsbb3tc)
- [Aritmética rápida para linguagens dinâmicas](https://docs.google.com/a/google.com/presentation/d/1wZVIqJMODGFYggueQySdiA3tUYuHNMcyp_PndgXsO1Y)
- [Desotimização no V8](https://docs.google.com/presentation/d/1Z6oCocRASCfTqGq1GCo1jbULDGS-w-nzxkbVF7Up0u0)
- [TurboFan: uma nova arquitetura de geração de código para o V8](https://docs.google.com/presentation/d/1_eLlVzcj94_G4r9j9d_Lj5HRKFnq6jgpuPJtnmIBs88) ([vídeo](https://www.youtube.com/watch?v=M1FBosB5tjM))
- [Um estágio sobre preguiça](https://docs.google.com/presentation/d/1AVu1wiz6Deyz1MDlhzOWZDRn6g_iFkcqsGce1F23i-M) (+ [post do blog](/blog/lazy-unlinking))

## Documentos de design

Estes são documentos de design que estão principalmente relacionados aos detalhes internos do TurboFan.

- [Especialização de contexto de função](https://docs.google.com/document/d/1CJbBtqzKmQxM1Mo4xU0ENA7KXqb1YzI6HQU8qESZ9Ic)
- [Plano de otimização de parâmetros rest e objetos exóticos de argumentos](https://docs.google.com/document/d/1DvDx3Xursn1ViV5k4rT4KB8HBfBb2GdUy3wzNfJWcKM)
- [Integração de ferramentas de desenvolvimento no TurboFan](https://docs.google.com/document/d/1zl0IA7dbPffvPPkaCmLVPttq4BYIfAe2Qy8sapkYgRE)
- [Inline no TurboFan](https://docs.google.com/document/d/1l-oZOW3uU4kSAHccaMuUMl_RCwuQC526s0hcNVeAM1E)
- [Heurísticas de inline do TurboFan](https://docs.google.com/document/d/1VoYBhpDhJC4VlqMXCKvae-8IGuheBGxy32EOgC2LnT8)
- [Eliminação de verificações redundantes de limites e estouro no TurboFan](https://docs.google.com/document/d/1R7-BIUnIKFzqki0jR4SfEZb3XmLafa04DLDrqhxgZ9U)
- [Desotimização preguiçosa sem alterações no código](https://docs.google.com/document/d/1ELgd71B6iBaU6UmZ_lvwxf_OrYYnv0e4nuzZpK05-pg)
- [Alocador de registradores](https://docs.google.com/document/d/1aeUugkWCF1biPB4tTZ2KT3mmRSDV785yWZhwzlJe5xY)
- [Nós de projeção no TurboFan](https://docs.google.com/document/d/1C9P8T98P1T_r2ymuUFz2jFWLUL7gbb6FnAaRjabuOMY/edit)

## Documentos de design relacionados

Estes são documentos de design que também influenciam significativamente o TurboFan.

- [Documento de design de nomes de propriedades computados (re)](https://docs.google.com/document/d/1eH1R6_C3lRrLtXKw0jNqAsqJ3cBecrqqvfRzLpfq7VE)
- [Plano de desempenho do ES2015 e além](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)
- [Documento de design de iteradores internos](https://docs.google.com/document/d/13z1fvRVpe_oEroplXEEX0a3WK94fhXorHjcOMsDmR-8)
- [Tornando as classes do ES2015 rápidas](https://docs.google.com/document/d/1iCdbXuGVV8BK750wmP32eF4sCrnZ8y3Qlz0JiaLh9j8)
- [Documento de design de internos de RegExp (re)](https://docs.google.com/document/d/1MuqFjsfaRPL2ZqzVoeMRqtcAmcJSwmHljTbRIctVVUk)
- [Desempenho de chamadas com espalhamento](https://docs.google.com/document/d/1DWPizOSKqHhSJ7bdEI0HIVnner84xToEKUYqgXm3g30)
