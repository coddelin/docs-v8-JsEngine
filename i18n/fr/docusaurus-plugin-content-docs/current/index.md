---
title: &apos;Documentation&apos;
description: &apos;Documentation pour le projet V8.&apos;
slug: /
---
V8 est un moteur JavaScript et WebAssembly open source haute performance de Google, écrit en C++. Il est utilisé dans Chrome et Node.js, entre autres.

Cette documentation s'adresse aux développeurs C++ qui souhaitent utiliser V8 dans leurs applications, ainsi qu'à toute personne intéressée par la conception et la performance de V8. Ce document vous présente V8, tandis que la documentation restante vous montre comment utiliser V8 dans votre code, décrit certains détails de sa conception et fournit un ensemble de benchmarks JavaScript pour mesurer la performance de V8.

## À propos de V8

V8 implémente <a href="https://tc39.es/ecma262/">ECMAScript</a> et <a href="https://webassembly.github.io/spec/core/">WebAssembly</a>, et fonctionne sur les systèmes Windows, macOS et Linux utilisant des processeurs x64, IA-32 ou ARM. Des systèmes supplémentaires (IBM i, AIX) et des processeurs supplémentaires (MIPS, ppcle64, s390x) sont maintenus en externe, voir [ports](/ports). V8 peut être intégré dans toute application C++.

V8 compile et exécute le code source JavaScript, gère l'allocation mémoire pour les objets et collecte les objets inutilisés. Le ramasse-miettes précis, générationnel et bloquant de V8 est l'une des clés de la performance de V8.

JavaScript est couramment utilisé pour le scripting côté client dans un navigateur, par exemple pour manipuler des objets du modèle DOM (Document Object Model). Cependant, le DOM n'est généralement pas fourni par le moteur JavaScript lui-même, mais par un navigateur. Il en va de même pour V8 — Google Chrome fournit le DOM. Cependant, V8 fournit tous les types de données, opérateurs, objets et fonctions spécifiés dans la norme ECMA.

V8 permet à toute application C++ d'exposer ses propres objets et fonctions au code JavaScript. C'est à vous de décider quels objets et fonctions vous souhaitez exposer au JavaScript.

## Vue d'ensemble de la documentation

- [Construire V8 à partir de la source](/build)
    - [Obtention du code source V8](/source-code)
    - [Construction avec GN](/build-gn)
    - [Compilation croisée et débogage pour ARM/Android](/cross-compile-arm)
    - [Compilation croisée pour iOS](/cross-compile-ios)
    - [Configuration GUI et IDE](/ide-setup)
    - [Compilation sur Arm64](/compile-arm64)
- [Contribuer](/contribute)
    - [Code respectueux](/respectful-code)
    - [API publique de V8 et sa stabilité](/api)
    - [Devenir un committer V8](/become-committer)
    - [Responsabilité d'un committer](/committer-responsibility)
    - [Tests web Blink (alias tests de mise en page)](/blink-layout-tests)
    - [Évaluation de la couverture de code](/evaluate-code-coverage)
    - [Processus de publication](/release-process)
    - [Directives pour les revues de conception](/design-review-guidelines)
    - [Mise en œuvre et expédition des fonctionnalités de langage JavaScript/WebAssembly](/feature-launch-process)
    - [Liste de vérification pour la mise en scène et l'expédition des fonctionnalités WebAssembly](/wasm-shipping-checklist)
    - [Bissection des anomalies](/flake-bisect)
    - [Gestion des ports](/ports)
    - [Support officiel](/official-support)
    - [Fusion et correction](/merge-patch)
    - [Construction de l'intégration de Node.js](/node-integration)
    - [Signalement des bugs de sécurité](/security-bugs)
    - [Exécution des benchmarks localement](/benchmarks)
    - [Tests](/test)
    - [Tri des problèmes](/triage-issues)
- Débogage
    - [Débogage ARM avec le simulateur](/debug-arm)
    - [Compilation croisée et débogage pour ARM/Android](/cross-compile-arm)
    - [Débogage des fonctions internes avec GDB](/gdb)
    - [Débogage via le protocole d'inspection V8](/inspector)
    - [Intégration de l'interface de compilation JIT de GDB](/gdb-jit)
    - [Investigation des fuites de mémoire](/memory-leaks)
    - [API de trace de pile](/stack-trace-api)
    - [Utilisation de D8](/d8)
    - [Outils V8](https://v8.dev/tools)
- Intégrer V8
    - [Guide d'intégration de V8](/embed)
    - [Numéros de version](/version-numbers)
    - [Fonctions intégrées](/builtin-functions)
    - [Support i18n](/i18n)
    - [Atténuations de code non fiable](/untrusted-code-mitigations)
- Sous le capot
    - [Ignition](/ignition)
    - [TurboFan](/turbofan)
    - [Manuel utilisateur Torque](/torque)
    - [Écriture des fonctions intégrées Torque](/torque-builtins)
    - [Écriture des fonctions CSA intégrées](/csa-builtins)
    - [Ajout d'un nouvel opcode WebAssembly](/webassembly-opcode)
    - [Maps, alias "Classes cachées"](/hidden-classes)
    - [Slack Tracking - qu'est-ce que c'est?](/blog/slack-tracking)
    - [Pipeline de compilation WebAssembly](/wasm-compilation-pipeline)
- Écrire du JavaScript optimisable
    - [Utilisation du profiler basé sur des échantillons de V8](/profile)
    - [Profilage de Chromium avec V8](/profile-chromium)
    - [Utilisation de `perf` Linux avec V8](/linux-perf)
    - [Tracer V8](/trace)
    - [Utilisation des statistiques d'appels Runtime](/rcs)
