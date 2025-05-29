---
title: "Configurations officiellement prises en charge"
description: "Ce document explique quelles configurations de build sont maintenues par l'équipe V8."
---
V8 supporte une multitude de configurations de build différentes selon les systèmes d'exploitation, leurs versions, les ports d'architecture, les flags de compilation, et ainsi de suite.

La règle d'or : Si nous le supportons, nous avons un bot fonctionnant sur l'une de nos [consoles d'intégration continue](https://ci.chromium.org/p/v8/g/main/console).

Quelques nuances :

- Les interruptions sur les builders les plus importants bloqueront la soumission de code. Un responsable des arbres annulera généralement l'element fautif.
- Les interruptions sur à peu près le même [ensemble de builders](https://chromium.googlesource.com/infra/infra/+/main/infra/services/lkgr_finder/config/v8_cfg.pyl) bloquent notre intégration continue dans Chromium.
- Certains ports d'architecture sont [gérés à l'extérieur](/docs/ports).
- Certaines configurations sont [expérimentales](https://ci.chromium.org/p/v8/g/experiments/console). Les interruptions sont permises et seront traitées par les propriétaires de la configuration.

Si vous avez une configuration qui présente un problème, mais qui n'est pas couverte par l'un des bots ci-dessus :

- N'hésitez pas à soumettre une CL qui résout votre problème. L'équipe vous soutiendra avec une revue de code.
- Vous pouvez utiliser [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com) pour discuter du problème.
- Si vous pensez que nous devrions prendre en charge cette configuration (peut-être un trou dans notre matrice de test?), veuillez déposer un bug sur le [suivi des problèmes V8](https://bugs.chromium.org/p/v8/issues/entry) et demander.

Cependant, nous n'avons pas les ressources pour soutenir toutes les configurations possibles.
