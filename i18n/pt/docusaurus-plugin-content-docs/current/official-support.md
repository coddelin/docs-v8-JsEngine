---
title: 'Configurações oficialmente suportadas'
description: 'Este documento explica quais configurações de build são mantidas pela equipe do V8.'
---
O V8 suporta uma variedade de diferentes configurações de build através de sistemas operacionais, suas versões, arquiteturas, flags de build e assim por diante.

A regra básica: Se o suportamos, temos um bot rodando em um dos nossos [consoles de integração contínua](https://ci.chromium.org/p/v8/g/main/console).

Algumas nuances:

- Falhas nos builders mais importantes irão bloquear o envio de código. Um tree sheriff geralmente irá reverter o culpado.
- Falhas em aproximadamente o mesmo [conjunto de builders](https://chromium.googlesource.com/infra/infra/+/main/infra/services/lkgr_finder/config/v8_cfg.pyl) bloqueiam nosso roll contínuo para o Chromium.
- Algumas portas de arquitetura são [manuseadas externamente](/docs/ports).
- Algumas configurações são [experimentais](https://ci.chromium.org/p/v8/g/experiments/console). Falhas são permitidas e serão tratadas pelos proprietários da configuração.

Se você tem uma configuração que apresenta um problema, mas não é coberta por um dos bots acima:

- Fique à vontade para submeter um CL que resolva o seu problema. A equipe irá apoiá-lo com uma revisão de código.
- Você pode usar [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com) para discutir o problema.
- Se você acha que deveríamos suportar esta configuração (talvez um buraco na nossa matriz de testes?), por favor, registre um bug no [Rastreador de Problemas V8](https://bugs.chromium.org/p/v8/issues/entry) e pergunte.

No entanto, não temos capacidade para suportar todas as configurações possíveis.
