---
title: &apos;API publique de V8&apos;
description: &apos;Ce document traite de la stabilité de l&apos;API publique de V8 et de la manière dont les développeurs peuvent y apporter des modifications.&apos;
---
Ce document traite de la stabilité de l&apos;API publique de V8 et de la manière dont les développeurs peuvent y apporter des modifications.

## Stabilité de l&apos;API

Si V8 dans un canary Chromium s&apos;avère instable et provoque des plantages, il est restauré à la version V8 du précédent canary. Il est donc important de maintenir une compatibilité de l&apos;API de V8 entre deux versions canary consécutives.

Nous exécutons en continu un [bot](https://ci.chromium.org/p/v8/builders/luci.v8.ci/Linux%20V8%20API%20Stability) qui signale les violations de la stabilité de l&apos;API. Ce bot compile la HEAD de Chromium avec la [version canary actuelle de V8](https://chromium.googlesource.com/v8/v8/+/refs/heads/canary).

Les échecs de ce bot sont actuellement uniquement informatifs et aucune action n&apos;est requise. La liste de blâme peut être utilisée pour identifier facilement les CL dépendants en cas de restauration.

Si vous provoquez une erreur sur ce bot, pensez à augmenter le délai entre une modification de V8 et une modification dépendante de Chromium la prochaine fois.

## Comment modifier l&apos;API publique de V8

V8 est utilisé par de nombreux intégrateurs différents : Chrome, Node.js, gjstest, etc. Lors de la modification de l&apos;API publique de V8 (essentiellement les fichiers dans le répertoire `include/`), nous devons nous assurer que les intégrateurs peuvent adopter sans problème la nouvelle version de V8. En particulier, nous ne pouvons pas partir du principe qu&apos;un intégrateur met à jour vers la nouvelle version de V8 et ajuste son code à la nouvelle API en une seule modification atomique.

L&apos;intégrateur doit pouvoir ajuster son code à la nouvelle API tout en utilisant encore la version précédente de V8. Toutes les instructions ci-dessous découlent de cette règle.

- Ajouter de nouveaux types, constantes et fonctions est sûr avec une mise en garde : ne pas ajouter une nouvelle fonction virtuelle pure à une classe existante. Les nouvelles fonctions virtuelles doivent avoir une implémentation par défaut.
- Ajouter un nouveau paramètre à une fonction est sûr si le paramètre a une valeur par défaut.
- Supprimer ou renommer des types, constantes ou fonctions est risqué. Utilisez les macros [`V8_DEPRECATED`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=395&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde) et [`V8_DEPRECATE_SOON`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=403&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde), qui génèrent des avertissements au moment de la compilation lorsque les méthodes obsolètes sont appelées par l&apos;intégrateur. Par exemple, supposons que nous souhaitons renommer la fonction `foo` en `bar`. Nous devons alors effectuer les étapes suivantes:
    - Ajouter la nouvelle fonction `bar` à proximité de la fonction existante `foo`.
    - Attendre que le CL soit intégré à Chrome. Ajuster Chrome pour utiliser `bar`.
    - Annoter `foo` avec `V8_DEPRECATED("Utilisez bar à la place") void foo();`
    - Dans le même CL, ajuster les tests qui utilisent `foo` pour qu&apos;ils utilisent `bar`.
    - Inclure dans le CL les raisons du changement et des instructions générales pour la mise à jour.
    - Attendre jusqu&apos;à la prochaine branche de V8.
    - Supprimer la fonction `foo`.

    `V8_DEPRECATE_SOON` est une version moins stricte de `V8_DEPRECATED`. Chrome ne sera pas cassé avec cette annotation, donc l&apos;étape b n&apos;est pas nécessaire. `V8_DEPRECATE_SOON` n&apos;est pas suffisant pour supprimer la fonction.

    Vous devez toujours annoter avec `V8_DEPRECATED` et attendre la prochaine branche avant de supprimer la fonction.

    `V8_DEPRECATED` peut être testé à l&apos;aide du flag GN `v8_deprecation_warnings`.
    `V8_DEPRECATE_SOON` peut être testé à l&apos;aide du flag `v8_imminent_deprecation_warnings`.

- Modifier les signatures de fonctions est risqué. Utilisez les macros `V8_DEPRECATED` et `V8_DEPRECATE_SOON` comme décrit ci-dessus.

Nous maintenons un [document mentionnant les changements importants d&apos;API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) pour chaque version de V8.

Il existe également une [documentation API doxygen régulièrement mise à jour](https://v8.dev/api).
