---
title: &apos;Pipeline de compilation WebAssembly&apos;
description: &apos;Cet article explique les compilateurs WebAssembly de V8 et à quel moment ils compilent le code WebAssembly.&apos;
---

WebAssembly est un format binaire qui permet d’exécuter efficacement et en toute sécurité du code écrit dans des langages de programmation autres que JavaScript sur le web. Dans ce document, nous explorons le pipeline de compilation WebAssembly dans V8 et expliquons comment nous utilisons différents compilateurs pour offrir de bonnes performances.

## Liftoff

Initialement, V8 ne compile aucune fonction dans un module WebAssembly. Les fonctions sont compilées de manière paresseuse avec le compilateur de base [Liftoff](/blog/liftoff) lorsque la fonction est appelée pour la première fois. Liftoff est un [compilateur en une seule passe](https://en.wikipedia.org/wiki/One-pass_compiler), ce qui signifie qu’il parcourt le code WebAssembly une fois et génère immédiatement du code machine pour chaque instruction WebAssembly. Les compilateurs en une seule passe excellent dans la génération rapide de code, mais ne peuvent appliquer qu’un ensemble limité d'optimisations. En effet, Liftoff peut compiler très rapidement du code WebAssembly, à raison de dizaines de mégaoctets par seconde.

Une fois la compilation avec Liftoff terminée, le code machine résultant est enregistré avec le module WebAssembly, de sorte que les appels futurs à la fonction puissent utiliser immédiatement le code compilé.

## TurboFan

Liftoff génère un code machine relativement rapide en très peu de temps. Cependant, comme il génère un code pour chaque instruction WebAssembly indépendamment, il y a très peu de place pour des optimisations, comme améliorer l’allocation des registres ou des optimisations courantes du compilateur telles que l'élimination des charges redondantes, la réduction de force ou l’inlining des fonctions.

C’est pourquoi les fonctions _hot_, c’est-à-dire les fonctions exécutées fréquemment, sont re-compilées avec [TurboFan](/docs/turbofan), le compilateur optimisant de V8 pour WebAssembly et JavaScript. TurboFan est un [compilateur multi-passes](https://en.wikipedia.org/wiki/Multi-pass_compiler), ce qui signifie qu’il construit plusieurs représentations internes du code compilé avant de générer le code machine. Ces représentations internes supplémentaires permettent des optimisations et une meilleure allocation des registres, ce qui aboutit à un code sensiblement plus rapide.

V8 surveille la fréquence à laquelle les fonctions WebAssembly sont appelées. Lorsqu’une fonction atteint un certain seuil, elle est considérée comme _hot_ et la re-compilation est déclenchée dans un thread d’arrière-plan. Une fois la compilation terminée, le nouveau code est enregistré avec le module WebAssembly, remplaçant le code existant généré par Liftoff. Les nouveaux appels à cette fonction utiliseront alors le nouveau code optimisé produit par TurboFan, et non le code Liftoff. Cependant, notez que nous ne pratiquons pas de remplacement sur la pile. Cela signifie que si le code TurboFan devient disponible après l'appel de la fonction, cet appel de fonction s'exécutera jusqu'au bout avec le code Liftoff.

## Mise en cache du code

Si le module WebAssembly a été compilé avec `WebAssembly.compileStreaming`, alors le code machine généré par TurboFan sera également mis en cache. Lorsque le même module WebAssembly est récupéré à nouveau depuis la même URL, le code mis en cache peut être utilisé immédiatement, sans compilation supplémentaire. Plus d’informations sur la mise en cache du code sont disponibles [dans un article de blog séparé](/blog/wasm-code-caching).

La mise en cache du code est déclenchée chaque fois que la quantité de code TurboFan généré atteint un certain seuil. Cela signifie que pour les grands modules WebAssembly, le code TurboFan est mis en cache de manière incrémentale, tandis que pour les petits modules WebAssembly, le code TurboFan peut ne jamais être mis en cache. Le code Liftoff n'est pas mis en cache, car la compilation avec Liftoff est presque aussi rapide que le chargement depuis le cache.

## Débogage

Comme mentionné précédemment, TurboFan applique des optimisations, dont beaucoup impliquent réorganiser le code, éliminer des variables ou même sauter des sections entières de code. Cela signifie que si vous souhaitez définir un point d'arrêt sur une instruction spécifique, il peut ne pas être clair où l’exécution du programme devrait réellement s’arrêter. En d’autres termes, le code TurboFan n’est pas bien adapté au débogage. Par conséquent, lorsque le débogage est démarré en ouvrant DevTools, tout le code TurboFan est remplacé par du code Liftoff à nouveau ("dégradé"), car chaque instruction WebAssembly correspond exactement à une section de code machine et toutes les variables locales et globales sont intactes.

## Profiling

Pour compliquer un peu les choses, dans DevTools tout le code sera de nouveau promu (re-compilé avec TurboFan) lorsque l’onglet Performances est ouvert et que le bouton "Enregistrer" est cliqué. Le bouton "Enregistrer" lance le profilage des performances. Le profilage du code Liftoff ne serait pas représentatif car il n’est utilisé que tant que TurboFan n’est pas terminé et peut être significativement plus lent que la sortie de TurboFan, qui sera exécutée pendant la grande majorité du temps.

## Indicateurs pour l'expérimentation

Pour des expérimentations, V8 et Chrome peuvent être configurés pour compiler le code WebAssembly uniquement avec Liftoff ou uniquement avec TurboFan. Il est même possible d'expérimenter avec une compilation paresseuse, où les fonctions ne sont compilées que lorsqu'elles sont appelées pour la première fois. Les drapeaux suivants permettent d'activer ces modes expérimentaux :

- Seulement Liftoff :
    - Dans V8, réglez les drapeaux `--liftoff --no-wasm-tier-up`.
    - Dans Chrome, désactivez le tiering WebAssembly (`chrome://flags/#enable-webassembly-tiering`) et activez le compilateur de base WebAssembly (`chrome://flags/#enable-webassembly-baseline`).

- Seulement TurboFan :
    - Dans V8, réglez les drapeaux `--no-liftoff --no-wasm-tier-up`.
    - Dans Chrome, désactivez le tiering WebAssembly (`chrome://flags/#enable-webassembly-tiering`) et désactivez le compilateur de base WebAssembly (`chrome://flags/#enable-webassembly-baseline`).

- Compilation paresseuse :
    - La compilation paresseuse est un mode de compilation où une fonction n'est compilée que lorsqu'elle est appelée pour la première fois. Comme dans la configuration de production, la fonction est d'abord compilée avec Liftoff (en bloquant l'exécution). Une fois la compilation Liftoff terminée, la fonction est recompilée en arrière-plan avec TurboFan.
    - Dans V8, réglez le drapeau `--wasm-lazy-compilation`.
    - Dans Chrome, activez la compilation paresseuse WebAssembly (`chrome://flags/#enable-webassembly-lazy-compilation`).

## Temps de compilation

Il existe différentes façons de mesurer le temps de compilation de Liftoff et TurboFan. Dans la configuration de production de V8, le temps de compilation de Liftoff peut être mesuré depuis JavaScript en mesurant le temps nécessaire pour que `new WebAssembly.Module()` se termine, ou le temps nécessaire pour que `WebAssembly.compile()` résolve la promesse. Pour mesurer le temps de compilation de TurboFan, la même méthode peut être utilisée dans une configuration uniquement TurboFan.

![La trace pour la compilation WebAssembly dans [Google Earth](https://earth.google.com/web).](/_img/wasm-compilation-pipeline/trace.svg)

La compilation peut également être mesurée plus en détail dans `chrome://tracing/` en activant la catégorie `v8.wasm`. La compilation Liftoff correspond alors au temps passé entre le début de la compilation et l'événement `wasm.BaselineFinished`, et la compilation TurboFan se termine à l'événement `wasm.TopTierFinished`. La compilation elle-même commence à l'événement `wasm.StartStreamingCompilation` pour `WebAssembly.compileStreaming()`, à l'événement `wasm.SyncCompile` pour `new WebAssembly.Module()`, et à l'événement `wasm.AsyncCompile` pour `WebAssembly.compile()`, respectivement. La compilation Liftoff est indiquée par des événements `wasm.BaselineCompilation`, et la compilation TurboFan par des événements `wasm.TopTierCompilation`. La figure ci-dessus montre la trace enregistrée pour Google Earth, avec les événements clés mis en évidence.

Des données de traçage plus détaillées sont disponibles avec la catégorie `v8.wasm.detailed`, qui, entre autres informations, fournit le temps de compilation de fonctions individuelles.
