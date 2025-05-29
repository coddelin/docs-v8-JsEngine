---
title: "Déboguer les fonctions intégrées avec GDB"
description: "À partir de V8 v6.9, il est possible de créer des points d'arrêt dans GDB pour déboguer les fonctions intégrées CSA / ASM / Torque."
---
À partir de V8 v6.9, il est possible de créer des points d'arrêt dans GDB (et possiblement d'autres débogueurs) pour déboguer les fonctions intégrées CSA / ASM / Torque.

```
(gdb) tb i::Isolate::Init
Point d'arrêt temporaire 1 à 0x7ffff706742b: i::Isolate::Init. (2 emplacements)
(gdb) r
Thread 1 "d8" atteint le point d'arrêt temporaire 1, 0x00007ffff7c55bc0 dans Isolate::Init
(gdb) br Builtins_RegExpPrototypeExec
Point d'arrêt 2 à 0x7ffff7ac8784
(gdb) c
Thread 1 "d8" atteint le point d'arrêt 2, 0x00007ffff7ac8784 dans Builtins_RegExpPrototypeExec ()
```

Notez qu'il est préférable d'utiliser un point d'arrêt temporaire (raccourci `tb` dans GDB) au lieu d'un point d'arrêt régulier (`br`) pour ceci, car vous en avez besoin uniquement au démarrage du processus.

Les fonctions intégrées sont également visibles dans les traces de pile :

```
(gdb) bt
#0  0x00007ffff7ac8784 dans Builtins_RegExpPrototypeExec ()
#1  0x00007ffff78f5066 dans Builtins_ArgumentsAdaptorTrampoline ()
#2  0x000039751d2825b1 dans ?? ()
#3  0x000037ef23a0fa59 dans ?? ()
#4  0x0000000000000000 dans ?? ()
```

Mises en garde :

- Fonctionne uniquement avec les fonctions intégrées embarquées.
- Les points d'arrêt ne peuvent être définis qu'au début de la fonction intégrée.
- Le point d'arrêt initial dans `Isolate::Init` est nécessaire avant de définir le point d'arrêt de la fonction intégrée, car GDB modifie le binaire et nous vérifions un hash de la section des fonctions intégrées dans le binaire au démarrage. Sinon, V8 signale un décalage de hash :

    ```
    # Erreur fatale dans ../../src/isolate.cc, ligne 117
    # Vérification échouée : d.Hash() == d.CreateHash() (11095509419988753467 vs. 3539781814546519144).
    ```
