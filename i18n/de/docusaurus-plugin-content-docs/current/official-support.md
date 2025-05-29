---
title: 'Offiziell unterstützte Konfigurationen'
description: 'Dieses Dokument erklärt, welche Build-Konfigurationen vom V8-Team gewartet werden.'
---
V8 unterstützt eine Vielzahl von verschiedenen Build-Konfigurationen über Betriebssysteme, deren Versionen, Architektur-Portierungen, Build-Flags und so weiter.

Faustregel: Wenn wir es unterstützen, haben wir einen Bot, der auf einer unserer [Continuous-Integration-Konsolen](https://ci.chromium.org/p/v8/g/main/console) läuft.

Einige Besonderheiten:

- Probleme bei den wichtigsten Baumeistern werden die Codeeinreichung blockieren. Ein Baum-Sheriff wird normalerweise den Schuldigen zurücksetzen.
- Probleme bei etwa demselben [Satz von Baumeistern](https://chromium.googlesource.com/infra/infra/+/main/infra/services/lkgr_finder/config/v8_cfg.pyl) blockieren unsere kontinuierliche Integration in Chromium.
- Einige Architektur-Portierungen werden [extern gehandhabt](/docs/ports).
- Einige Konfigurationen sind [experimentell](https://ci.chromium.org/p/v8/g/experiments/console). Probleme sind erlaubt und werden von den Eigentümern der Konfiguration behandelt.

Wenn Sie eine Konfiguration haben, die ein Problem aufweist, aber nicht von einem der oben genannten Bots abgedeckt wird:

- Sie können gerne eine CL einreichen, die Ihr Problem behebt. Das Team wird Sie mit einer Codeüberprüfung unterstützen.
- Sie können [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com) verwenden, um das Problem zu diskutieren.
- Wenn Sie der Meinung sind, dass wir diese Konfiguration unterstützen sollten (vielleicht eine Lücke in unserer Testmatrix?), reichen Sie bitte einen Fehler auf dem [V8 Issue Tracker](https://bugs.chromium.org/p/v8/issues/entry) ein und fragen Sie.

Allerdings haben wir nicht die Kapazität, jede mögliche Konfiguration zu unterstützen.
