---
title: &apos;Intégration de l&apos;interface de compilation JIT GDB&apos;
description: &apos;L&apos;intégration de l&apos;interface de compilation JIT GDB permet à V8 de fournir à GDB les symboles et les informations de débogage pour le code natif émis par le runtime V8.&apos;
---
L&apos;intégration de l&apos;interface de compilation JIT GDB permet à V8 de fournir à GDB les symboles et les informations de débogage pour le code natif émis par le runtime V8.

Lorsque l&apos;interface de compilation JIT GDB est désactivée, une backtrace typique dans GDB contient des cadres marqués par `??`. Ces cadres correspondent au code généré dynamiquement :

```
#8  0x08281674 in v8::internal::Runtime_SetProperty (args=...) at src/runtime.cc:3758
#9  0xf5cae28e in ?? ()
#10 0xf5cc3a0a in ?? ()
#11 0xf5cc38f4 in ?? ()
#12 0xf5cbef19 in ?? ()
#13 0xf5cb09a2 in ?? ()
#14 0x0809e0a5 in v8::internal::Invoke (construct=false, func=..., receiver=..., argc=0, args=0x0,
    has_pending_exception=0xffffd46f) at src/execution.cc:97
```

Cependant, activer l&apos;interface de compilation JIT GDB permet à GDB de produire une trace de pile plus informative :

```
#6  0x082857fc in v8::internal::Runtime_SetProperty (args=...) at src/runtime.cc:3758
#7  0xf5cae28e in ?? ()
#8  0xf5cc3a0a in loop () at test.js:6
#9  0xf5cc38f4 in test.js () at test.js:13
#10 0xf5cbef19 in ?? ()
#11 0xf5cb09a2 in ?? ()
#12 0x0809e1f9 in v8::internal::Invoke (construct=false, func=..., receiver=..., argc=0, args=0x0,
    has_pending_exception=0xffffd44f) at src/execution.cc:97
```

Les cadres encore inconnus de GDB correspondent au code natif dépourvu d&apos;informations source. Voir [limitations connues](#known-limitations) pour plus de détails.

L&apos;interface de compilation JIT GDB est spécifiée dans la documentation GDB : https://sourceware.org/gdb/current/onlinedocs/gdb/JIT-Interface.html

## Conditions préalables

- V8 v3.0.9 ou une version plus récente
- GDB 7.0 ou une version plus récente
- Système d&apos;exploitation Linux
- Processeur avec architecture compatible Intel (ia32 ou x64)

## Activation de l&apos;interface de compilation JIT GDB

Par défaut, l&apos;interface de compilation JIT GDB est exclue de la compilation et désactivée à l&apos;exécution. Pour l&apos;activer :

1. Compilez la bibliothèque V8 avec `ENABLE_GDB_JIT_INTERFACE` défini. Si vous utilisez scons pour compiler V8, exécutez-le avec `gdbjit=on`.
1. Passez l&apos;option `--gdbjit` lors du démarrage de V8.

Pour vérifier que vous avez correctement activé l&apos;intégration JIT GDB, essayez de définir un point d&apos;arrêt sur `__jit_debug_register_code`. Cette fonction est appelée pour notifier GDB à propos de nouveaux objets de code.

## Limitations connues

- Le côté GDB de l&apos;interface JIT (à partir de GDB 7.2) gère actuellement l&apos;enregistrement des objets de code de manière inefficace. Chaque enregistrement successif prend plus de temps : avec 500 objets enregistrés, chaque nouvel enregistrement prend plus de 50 ms ; avec 1000 objets - plus de 300 ms. Ce problème a été [signalé aux développeurs de GDB](https://sourceware.org/ml/gdb/2011-01/msg00002.html), mais aucune solution n&apos;est actuellement disponible. Pour réduire la pression sur GDB, l&apos;implémentation actuelle de l&apos;intégration JIT GDB fonctionne en deux modes : _par défaut_ et _complet_ (activé par l&apos;option `--gdbjit-full`). En mode _par défaut_, V8 notifie GDB uniquement des objets de code ayant des informations source attachées (cela inclut généralement tous les scripts utilisateur). En mode _complet_, il inclut tous les objets de code générés (stubs, ICs, trampolines).

- Sur x64, GDB est incapable de dérouler correctement la pile sans la section `.eh_frame` ([Issue 1053](https://bugs.chromium.org/p/v8/issues/detail?id=1053))

- GDB n&apos;est pas notifié des codes désérialisés à partir de l&apos;instantané ([Issue 1054](https://bugs.chromium.org/p/v8/issues/detail?id=1054))

- Seuls Linux OS sur CPU compatibles Intel sont pris en charge. Pour des systèmes d&apos;exploitation différents, un en-tête ELF différent devrait être généré ou un format d&apos;objet complètement différent devrait être utilisé.

- Activer l&apos;interface JIT GDB désactive le GC compact. Cela est fait pour réduire la pression sur GDB, car désenregistrer et réenregistrer chaque objet de code déplacé entraînera une surcharge considérable.

- L&apos;intégration JIT GDB fournit uniquement des informations source _approximatives_. Elle ne fournit aucune information sur les variables locales, les arguments de fonction ou la disposition de la pile, etc. Elle ne permet pas de parcourir le code JavaScript ou de définir un point d&apos;arrêt sur une ligne donnée. Cependant, il est possible de définir un point d&apos;arrêt sur une fonction par son nom.
