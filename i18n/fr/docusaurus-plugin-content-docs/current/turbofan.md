---
title: 'TurboFan'
description: 'Ce document recueille des ressources sur TurboFan, le compilateur optimisant de V8.'
---
TurboFan est l'un des compilateurs optimisants de V8 exploitant un concept appelé [« Sea of Nodes »](https://darksi.de/d.sea-of-nodes/). L'un des articles du blog de V8 propose une [vue d'ensemble de TurboFan](/blog/turbofan-jit). Plus de détails peuvent être trouvés dans les ressources suivantes.

## Articles et articles de blog

- [Une histoire de TurboFan](https://benediktmeurer.de/2017/03/01/v8-behind-the-scenes-february-edition)
- [Ignition + TurboFan et ES2015](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition)
- [Introduction à l'optimisation spéculative dans V8](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)

## Présentations

- [CodeStubAssembler : Redux](https://docs.google.com/presentation/d/1u6bsgRBqyVY3RddMfF1ZaJ1hWmqHZiVMuPRw_iKpHlY)
- [Vue d'ensemble du compilateur TurboFan](https://docs.google.com/presentation/d/1H1lLsbclvzyOF3IUR05ZUaZcqDxo7_-8f4yJoxdMooU/edit)
- [TurboFan IR](https://docs.google.com/presentation/d/1Z9iIHojKDrXvZ27gRX51UxHD-bKf1QcPzSijntpMJBM)
- [Conception JIT de TurboFan](https://docs.google.com/presentation/d/1sOEF4MlF7LeO7uq-uThJSulJlTh--wgLeaVibsbb3tc)
- [Calcul rapide pour les langages dynamiques](https://docs.google.com/a/google.com/presentation/d/1wZVIqJMODGFYggueQySdiA3tUYuHNMcyp_PndgXsO1Y)
- [Désoptimisation dans V8](https://docs.google.com/presentation/d/1Z6oCocRASCfTqGq1GCo1jbULDGS-w-nzxkbVF7Up0u0)
- [TurboFan : une nouvelle architecture de génération de code pour V8](https://docs.google.com/presentation/d/1_eLlVzcj94_G4r9j9d_Lj5HRKFnq6jgpuPJtnmIBs88) ([vidéo](https://www.youtube.com/watch?v=M1FBosB5tjM))
- [Un stage sur la paresse](https://docs.google.com/presentation/d/1AVu1wiz6Deyz1MDlhzOWZDRn6g_iFkcqsGce1F23i-M) (+ [article de blog](/blog/lazy-unlinking))

## Documents de conception

Ce sont des documents de conception principalement liés aux détails internes de TurboFan.

- [Spécialisation du contexte de la fonction](https://docs.google.com/document/d/1CJbBtqzKmQxM1Mo4xU0ENA7KXqb1YzI6HQU8qESZ9Ic)
- [Plan d'optimisation des paramètres restants et objets exotiques d'arguments](https://docs.google.com/document/d/1DvDx3Xursn1ViV5k4rT4KB8HBfBb2GdUy3wzNfJWcKM)
- [Intégration des outils de développement TurboFan](https://docs.google.com/document/d/1zl0IA7dbPffvPPkaCmLVPttq4BYIfAe2Qy8sapkYgRE)
- [Intégration TurboFan](https://docs.google.com/document/d/1l-oZOW3uU4kSAHccaMuUMl_RCwuQC526s0hcNVeAM1E)
- [Heuristiques d'intégration TurboFan](https://docs.google.com/document/d/1VoYBhpDhJC4VlqMXCKvae-8IGuheBGxy32EOgC2LnT8)
- [Élimination des contrôles redondants de limites et de dépassement TurboFan](https://docs.google.com/document/d/1R7-BIUnIKFzqki0jR4SfEZb3XmLafa04DLDrqhxgZ9U)
- [Désoptimisation paresseuse sans modification du code](https://docs.google.com/document/d/1ELgd71B6iBaU6UmZ_lvwxf_OrYYnv0e4nuzZpK05-pg)
- [Allocateur de registres](https://docs.google.com/document/d/1aeUugkWCF1biPB4tTZ2KT3mmRSDV785yWZhwzlJe5xY)
- [Nœuds de projection dans TurboFan](https://docs.google.com/document/d/1C9P8T98P1T_r2ymuUFz2jFWLUL7gbb6FnAaRjabuOMY/edit)

## Documents de conception associés

Ce sont des documents de conception qui ont également un impact significatif sur TurboFan.

- [Document de conception des noms de propriété calculés (re)design](https://docs.google.com/document/d/1eH1R6_C3lRrLtXKw0jNqAsqJ3cBecrqqvfRzLpfq7VE)
- [Plan de performance ES2015 et au-delà](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)
- [Document de conception des propriétés intégrées des itérateurs](https://docs.google.com/document/d/13z1fvRVpe_oEroplXEEX0a3WK94fhXorHjcOMsDmR-8)
- [Rendre les classes ES2015 rapides](https://docs.google.com/document/d/1iCdbXuGVV8BK750wmP32eF4sCrnZ8y3Qlz0JiaLh9j8)
- [Document de conception des propriétés intégrées des expressions régulières (re)design](https://docs.google.com/document/d/1MuqFjsfaRPL2ZqzVoeMRqtcAmcJSwmHljTbRIctVVUk)
- [Performance des appels avec étalement](https://docs.google.com/document/d/1DWPizOSKqHhSJ7bdEI0HIVnner84xToEKUYqgXm3g30)
