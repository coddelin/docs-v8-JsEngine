---
title: "Le Dynamic Tiering de WebAssembly prêt à être testé dans Chrome 96"
author: "Andreas Haas — Tierisch fun"
avatars:
  - andreas-haas
date: 2021-10-29
tags:
  - WebAssembly
description: "Le Dynamic Tiering de WebAssembly est prêt à être testé dans V8 v9.6 et Chrome 96, soit via un argument en ligne de commande, soit via un essai origin"
tweet: "1454158971674271760"
---

V8 dispose de deux compilateurs pour compiler le code WebAssembly en code machine pouvant ensuite être exécuté : le compilateur de base __Liftoff__ et le compilateur optimisé __TurboFan__. Liftoff peut générer du code beaucoup plus rapidement que TurboFan, ce qui permet un démarrage rapide. TurboFan, en revanche, peut générer du code plus rapide, ce qui permet des performances maximales.

<!--truncate-->
Dans la configuration actuelle de Chrome, un module WebAssembly est d'abord entièrement compilé par Liftoff. Une fois la compilation avec Liftoff terminée, tout le module est immédiatement recompilé en arrière-plan par TurboFan. Avec la compilation en streaming, la compilation par TurboFan peut commencer plus tôt si Liftoff compile le code WebAssembly plus vite que son téléchargement. La compilation initiale par Liftoff permet un démarrage rapide, tandis que la compilation en arrière-plan par TurboFan assure des performances maximales dès que possible. Des informations plus détaillées sur Liftoff, TurboFan et le processus complet de compilation sont disponibles dans un [document séparé](https://v8.dev/docs/wasm-compilation-pipeline).

Compiler l'ensemble du module WebAssembly avec TurboFan offre la meilleure performance possible une fois la compilation terminée, mais cela a un coût :

- Les cœurs de processeur qui exécutent la compilation TurboFan en arrière-plan peuvent bloquer d'autres tâches nécessitant le processeur, comme les travailleurs de l'application web.
- La compilation TurboFan de fonctions peu importantes peut retarder la compilation TurboFan de fonctions plus importantes, ce qui peut retarder l'atteinte de performances complètes pour l'application web.
- Certaines fonctions WebAssembly peuvent ne jamais être exécutées, et utiliser des ressources pour les compiler avec TurboFan peut ne pas en valoir la peine.

## Dynamic tiering

Le Dynamic Tiering devrait atténuer ces problèmes en ne compilant avec TurboFan que les fonctions qui sont réellement exécutées plusieurs fois. Ainsi, le Dynamic Tiering peut modifier les performances des applications web de plusieurs manières : il peut accélérer le temps de démarrage en réduisant la charge sur les CPU et en permettant à d'autres tâches de démarrage que la compilation WebAssembly d'utiliser davantage le processeur. Mais il peut aussi ralentir les performances en retardant la compilation TurboFan pour des fonctions importantes. Comme V8 n'utilise pas de remplacement sur pile pour le code WebAssembly, l'exécution peut être bloquée dans une boucle dans le code Liftoff, par exemple. Le cache de code est également affecté, car Chrome ne met en cache que le code TurboFan, et toutes les fonctions qui ne remplissent jamais les conditions pour la compilation TurboFan sont compilées avec Liftoff au démarrage, même si le module WebAssembly compilé existe déjà en cache.

## Comment l'essayer

Nous encourageons les développeurs intéressés à expérimenter l'impact du Dynamic Tiering sur les performances de leurs applications web. Cela nous permettra de réagir et d'éviter des régressions potentielles de performances dès le début. Le Dynamic Tiering peut être activé localement en exécutant Chrome avec l'argument en ligne de commande `--enable-blink-features=WebAssemblyDynamicTiering`.

Les intégrateurs de V8 qui souhaitent activer le Dynamic Tiering peuvent le faire en définissant le drapeau V8 `--wasm-dynamic-tiering`.

### Tester sur le terrain avec un Origin Trial

Exécuter Chrome avec un argument en ligne de commande est quelque chose qu'un développeur peut faire, mais cela ne devrait pas être attendu d'un utilisateur final. Pour expérimenter votre application sur le terrain, il est possible de participer à ce que l'on appelle un [Origin Trial](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md). Les essais origin permettent de tester des fonctionnalités expérimentales avec des utilisateurs finaux grâce à un jeton spécial associé à un domaine. Ce jeton spécial active le Dynamic Tiering de WebAssembly pour l'utilisateur final sur des pages spécifiques incluant le jeton. Pour obtenir votre propre jeton afin de réaliser un essai origin, [utilisez le formulaire de demande](https://developer.chrome.com/origintrials/#/view_trial/3716595592487501825).

## Donnez-nous votre avis

Nous attendons des retours des développeurs testant cette fonctionnalité, car cela nous aidera à affiner les heuristiques sur quand la compilation TurboFan est utile, et quand elle ne l'est pas et peut être évitée. Le meilleur moyen de nous envoyer vos retours est de [signaler des problèmes](https://bugs.chromium.org/p/chromium/issues/detail?id=1260322).
