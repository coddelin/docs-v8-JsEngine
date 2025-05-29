---
title: &apos;Configurations officiellement prises en charge&apos;
description: &apos;Ce document explique quelles configurations de build sont maintenues par l&apos;équipe V8.&apos;
---
V8 supporte une multitude de configurations de build différentes selon les systèmes d&apos;exploitation, leurs versions, les ports d&apos;architecture, les flags de compilation, et ainsi de suite.

La règle d&apos;or : Si nous le supportons, nous avons un bot fonctionnant sur l&apos;une de nos [consoles d&apos;intégration continue](https://ci.chromium.org/p/v8/g/main/console).

Quelques nuances :

- Les interruptions sur les builders les plus importants bloqueront la soumission de code. Un responsable des arbres annulera généralement l&apos;element fautif.
- Les interruptions sur à peu près le même [ensemble de builders](https://chromium.googlesource.com/infra/infra/+/main/infra/services/lkgr_finder/config/v8_cfg.pyl) bloquent notre intégration continue dans Chromium.
- Certains ports d&apos;architecture sont [gérés à l&apos;extérieur](/docs/ports).
- Certaines configurations sont [expérimentales](https://ci.chromium.org/p/v8/g/experiments/console). Les interruptions sont permises et seront traitées par les propriétaires de la configuration.

Si vous avez une configuration qui présente un problème, mais qui n&apos;est pas couverte par l&apos;un des bots ci-dessus :

- N&apos;hésitez pas à soumettre une CL qui résout votre problème. L&apos;équipe vous soutiendra avec une revue de code.
- Vous pouvez utiliser v8-dev@googlegroups.com pour discuter du problème.
- Si vous pensez que nous devrions prendre en charge cette configuration (peut-être un trou dans notre matrice de test?), veuillez déposer un bug sur le [suivi des problèmes V8](https://bugs.chromium.org/p/v8/issues/entry) et demander.

Cependant, nous n&apos;avons pas les ressources pour soutenir toutes les configurations possibles.
