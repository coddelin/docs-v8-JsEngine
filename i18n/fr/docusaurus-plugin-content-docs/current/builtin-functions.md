---
title: 'Fonctions intégrées'
description: 'Ce document explique ce que sont les « intégrées » dans V8.'
---
Les fonctions intégrées dans V8 disposent de différentes méthodes d’implémentation, selon leur fonctionnalité, leurs exigences en matière de performances, et parfois leur développement historique.

Certaines sont directement implémentées en JavaScript et sont compilées en code exécutable au moment de l’exécution comme tout JavaScript utilisateur. Certaines d’entre elles font appel à ce que l’on appelle des _fonctions runtime_ pour une partie de leur fonctionnalité. Les fonctions runtime sont écrites en C++ et appelées à partir de JavaScript via un préfixe `%`. Habituellement, ces fonctions runtime sont limitées au code JavaScript interne de V8. À des fins de débogage, elles peuvent également être appelées à partir d’un code JavaScript ordinaire, si V8 est exécuté avec le drapeau `--allow-natives-syntax`. Certaines fonctions runtime sont directement intégrées par le compilateur dans le code généré. Pour une liste, voir `src/runtime/runtime.h`.

D’autres fonctions sont implémentées comme _intégrées_, elles-mêmes pouvant être implémentées de plusieurs manières différentes. Certaines sont directement implémentées en assembleur dépendant de la plateforme. D'autres sont implémentées avec le _CodeStubAssembler_, une abstraction indépendante de la plateforme. D’autres encore sont directement implémentées en C++. Les intégrées sont parfois également utilisées pour implémenter des morceaux de code d’interconnexion, pas nécessairement des fonctions entières. Pour une liste, voir `src/builtins/builtins.h`.
