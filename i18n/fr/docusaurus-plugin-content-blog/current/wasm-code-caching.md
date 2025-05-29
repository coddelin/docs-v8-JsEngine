---
title: "Mise en cache du code pour les développeurs WebAssembly"
author: "[Bill Budge](https://twitter.com/billb), ajoutant le Ca-ching! à la mise en cache"
avatars: 
  - bill-budge
date: 2019-06-17
tags: 
  - WebAssembly
  - internals
description: "Cet article explique la mise en cache du code WebAssembly dans Chrome et comment les développeurs peuvent en tirer parti pour accélérer le chargement des applications avec de grands modules WebAssembly."
tweet: "1140631433532334081"
---
Il y a un dicton parmi les développeurs qui dit que le code le plus rapide est celui qui ne s’exécute pas. De même, le code qui se compile le plus rapidement est celui qui n’a pas besoin d’être compilé. La mise en cache du code WebAssembly est une nouvelle optimisation dans Chrome et V8 qui vise à éviter la compilation du code en mettant en cache le code natif produit par le compilateur. Nous avons [écrit](/blog/code-caching) [sur](/blog/improved-code-caching) [comment](/blog/code-caching-for-devs) Chrome et V8 mettent en cache le code JavaScript dans le passé, et les meilleures pratiques pour tirer parti de cette optimisation. Dans cet article, nous décrivons le fonctionnement de la mise en cache du code WebAssembly dans Chrome et comment les développeurs peuvent en tirer parti pour accélérer le chargement des applications avec de grands modules WebAssembly.

<!--truncate-->
## Récapitulatif de la compilation WebAssembly

WebAssembly est un moyen d’exécuter du code non JavaScript sur le Web. Une application web peut utiliser WebAssembly en chargeant une ressource `.wasm`, qui contient du code partiellement compilé d’un autre langage, comme C, C++ ou Rust (et plus à venir). Le rôle du compilateur WebAssembly est de décoder la ressource `.wasm`, de valider qu’elle est bien formée, puis de la compiler en code machine natif qui peut être exécuté sur la machine de l’utilisateur.

V8 dispose de deux compilateurs pour WebAssembly : Liftoff et TurboFan. [Liftoff](/blog/liftoff) est le compilateur de base, qui compile les modules aussi rapidement que possible afin que l’exécution puisse commencer dès que possible. TurboFan est le compilateur de V8 optimisé pour JavaScript et WebAssembly. Il fonctionne en arrière-plan pour générer du code natif de haute qualité afin d’offrir des performances optimales à une application web à long terme. Pour les grands modules WebAssembly, TurboFan peut prendre beaucoup de temps — 30 secondes à une minute ou plus — pour terminer complètement la compilation d’un module WebAssembly en code natif.

C’est là qu’intervient la mise en cache du code. Une fois que TurboFan a terminé la compilation d’un grand module WebAssembly, Chrome peut enregistrer le code dans son cache afin que la prochaine fois que le module est chargé, nous puissions éviter à la fois les compilations Liftoff et TurboFan, conduisant à un démarrage plus rapide et à une réduction de la consommation d’énergie — la compilation de code est très gourmande en CPU.

La mise en cache du code WebAssembly utilise les mêmes mécanismes dans Chrome que la mise en cache du code JavaScript. Nous utilisons le même type de stockage, et la même technique de mise en cache à double clé qui garde les codes compilés par différentes origines séparés conformément à [l’isolation de site](https://developers.google.com/web/updates/2018/07/site-isolation), une caractéristique importante de sécurité de Chrome.

## Algorithme de mise en cache du code WebAssembly

Pour l’instant, la mise en cache pour WebAssembly est uniquement implémentée pour les appels d’API en streaming, `compileStreaming` et `instantiateStreaming`. Ceux-ci fonctionnent sur une requête HTTP pour une ressource `.wasm`, facilitant l’utilisation des mécanismes de récupération et de mise en cache des ressources de Chrome, et fournissant une URL de ressource pratique à utiliser comme clé pour identifier le module WebAssembly. L’algorithme de mise en cache fonctionne comme suit :

1. Lorsqu’une ressource `.wasm` est demandée pour la première fois (c’est-à-dire lors d’un _premier passage_), Chrome la télécharge du réseau et la transmet en streaming à V8 pour compilation. Chrome stocke également la ressource `.wasm` dans le cache des ressources du navigateur, stocké dans le système de fichiers de l’appareil de l’utilisateur. Ce cache de ressources permet à Chrome de charger la ressource plus rapidement la prochaine fois qu’elle est nécessaire.
1. Une fois que TurboFan a complètement terminé la compilation du module, et si la ressource `.wasm` est suffisamment grande (actuellement 128 kB), Chrome écrit le code compilé dans le cache de code WebAssembly. Ce cache de code est physiquement distinct du cache de ressources de l’étape 1.
1. Lorsqu’une ressource `.wasm` est demandée une deuxième fois (c’est-à-dire lors d’un _passage chaud_), Chrome charge la ressource `.wasm` depuis le cache des ressources et interroge simultanément le cache de code. S’il y a un résultat dans le cache, alors les octets du module compilé sont envoyés au processus de rendu et transmis à V8 qui désérialise le code au lieu de compiler le module. La désérialisation est plus rapide et moins gourmande en CPU que la compilation.
1. Il se peut que le code mis en cache ne soit plus valide. Cela peut arriver parce que la ressource `.wasm` a changé, ou parce que V8 a changé, ce qui devrait arriver au moins toutes les 6 semaines en raison du cycle de publication rapide de Chrome. Dans ce cas, le code natif mis en cache est effacé du cache, et la compilation reprend comme à l’étape 1.

Sur la base de cette description, nous pouvons donner quelques recommandations pour améliorer l’utilisation de la mise en cache de code WebAssembly sur votre site web.

## Astuce 1 : utilisez l'API de streaming WebAssembly

Étant donné que le cache de code fonctionne uniquement avec l'API de streaming, compilez ou instanciez votre module WebAssembly avec `compileStreaming` ou `instantiateStreaming`, comme dans cet extrait de code JavaScript :

```js
(async () => {
  const fetchPromise = fetch('fibonacci.wasm');
  const { instance } = await WebAssembly.instantiateStreaming(fetchPromise);
  const result = instance.exports.fibonacci(42);
  console.log(result);
})();
```

Cet [article](https://developers.google.com/web/updates/2018/04/loading-wasm) détaille les avantages de l'utilisation de l'API de streaming WebAssembly. Emscripten essaie d'utiliser cette API par défaut lorsqu'il génère du code de chargement pour votre application. Notez que le streaming nécessite que la ressource `.wasm` ait le type MIME correct, donc le serveur doit envoyer l'en-tête `Content-Type: application/wasm` dans sa réponse.

## Astuce 2 : soyez compatible avec le cache

Étant donné que la mise en cache de code dépend de l'URL de la ressource et de la mise à jour de la ressource `.wasm`, les développeurs doivent essayer de maintenir la stabilité de ces éléments. Si la ressource `.wasm` est récupérée depuis une URL différente, elle est considérée comme différente et V8 doit à nouveau compiler le module. De même, si la ressource `.wasm` n'est plus valide dans le cache de ressources, Chrome doit jeter tout code mis en cache.

### Maintenez votre code stable

Chaque fois que vous envoyez un nouveau module WebAssembly, il doit être entièrement recompilé. Envoyez de nouvelles versions de votre code uniquement lorsque cela est nécessaire pour proposer de nouvelles fonctionnalités ou corriger des bugs. Lorsque votre code n'a pas changé, informez Chrome. Lorsque le navigateur effectue une requête HTTP pour une URL de ressource, comme un module WebAssembly, il inclut la date et l'heure du dernier téléchargement de cette URL. Si le serveur sait que le fichier n'a pas changé, il peut envoyer une réponse `304 Not Modified`, qui indique à Chrome et à V8 que la ressource mise en cache et donc le code en cache sont toujours valides. En revanche, retourner une réponse `200 OK` met à jour la ressource `.wasm` mise en cache et invalide le cache de code, réinitialisant WebAssembly à une exécution froide. Suivez [les bonnes pratiques des ressources web](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching) en utilisant la réponse pour informer le navigateur si la ressource `.wasm` est mise en cache, combien de temps elle est censée être valide ou quand elle a été modifiée pour la dernière fois.

### Ne changez pas l'URL de votre code

Le code compilé mis en cache est associé à l'URL de la ressource `.wasm`, ce qui le rend facile à trouver sans avoir besoin de scanner la ressource réelle. Cela signifie que changer l'URL d'une ressource (y compris tout paramètre de requête !) crée une nouvelle entrée dans notre cache de ressources, ce qui nécessite également une recompilation complète et crée une nouvelle entrée de cache de code.

### Soyez ambitieux (mais pas trop !)

L'heuristique principale de la mise en cache du code WebAssembly est la taille de la ressource `.wasm`. Si la ressource `.wasm` est plus petite qu'une certaine taille seuil, nous ne mettons pas en cache les octets du module compilé. La raison est que V8 peut compiler rapidement de petits modules, possiblement plus rapidement que le chargement du code compilé depuis le cache. Actuellement, la limite est pour les ressources `.wasm` de 128 kB ou plus.

Mais plus grand est mieux uniquement jusqu'à un certain point. Étant donné que les caches occupent de l'espace sur la machine de l'utilisateur, Chrome fait attention à ne pas consommer trop d'espace. En ce moment, sur les machines de bureau, les caches de code contiennent généralement quelques centaines de mégaoctets de données. Étant donné que les caches Chrome restreignent également les plus grandes entrées dans le cache à une fraction de la taille totale du cache, il y a une limite supplémentaire d'environ 150 MB pour le code WebAssembly compilé (la moitié de la taille totale du cache). Il est important de noter que les modules compilés sont souvent 5 à 7 fois plus grands que la ressource `.wasm` correspondante sur une machine de bureau typique.

Cette heuristique de taille, comme le reste du comportement de mise en cache, peut changer lorsque nous déterminons ce qui fonctionne le mieux pour les utilisateurs et les développeurs.

### Utilisez un service worker

La mise en cache du code WebAssembly est activée pour les workers et les service workers, il est donc possible de les utiliser pour charger, compiler et mettre en cache une nouvelle version du code afin qu'elle soit disponible la prochaine fois que votre application démarre. Chaque site web doit effectuer au moins une compilation complète d'un module WebAssembly — utilisez des workers pour cacher cela à vos utilisateurs.

## Tracing

En tant que développeur, vous pourriez vouloir vérifier que votre module compilé est mis en cache par Chrome. Les événements de mise en cache de code WebAssembly ne sont pas exposés par défaut dans les outils de développement de Chrome, donc le meilleur moyen de savoir si vos modules sont mis en cache est d'utiliser la fonctionnalité à un niveau légèrement inférieur `chrome://tracing`.

`chrome://tracing` enregistre des traces instrumentées de Chrome pendant une certaine période de temps. Tracing enregistre le comportement de tout le navigateur, y compris d'autres onglets, fenêtres et extensions, il fonctionne donc mieux lorsqu'il est réalisé dans un profil utilisateur propre, avec les extensions désactivées et sans autres onglets de navigateur ouverts :

```bash
# Démarrer une nouvelle session du navigateur Chrome avec un profil utilisateur propre et les extensions désactivées
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

Naviguez vers `chrome://tracing` et cliquez sur « Enregistrer » pour commencer une session de traçage. Dans la fenêtre de dialogue qui apparaît, cliquez sur « Modifier les catégories » et cochez la catégorie `devtools.timeline` à droite sous « Catégories désactivées par défaut » (vous pouvez décocher toutes les autres catégories pré-sélectionnées pour réduire la quantité de données collectées). Ensuite, cliquez sur le bouton « Enregistrer » dans le dialogue pour commencer le traçage.

Dans un autre onglet, chargez ou rechargez votre application. Laissez-la s'exécuter suffisamment longtemps, 10 secondes ou plus, pour vous assurer que la compilation TurboFan est terminée. Une fois terminé, cliquez sur « Arrêter » pour terminer le traçage. Une vue chronologique des événements apparaît. En haut à droite de la fenêtre de traçage, il y a une zone de texte, juste à droite de « Options d'affichage ». Tapez `v8.wasm` pour filtrer les événements non liés au WebAssembly. Vous devriez voir un ou plusieurs des événements suivants :

- `v8.wasm.streamFromResponseCallback` — La ressource transmise à `instantiateStreaming` a reçu une réponse.
- `v8.wasm.compiledModule` — TurboFan a terminé la compilation de la ressource `.wasm`.
- `v8.wasm.cachedModule` — Chrome a écrit le module compilé dans le cache de code.
- `v8.wasm.moduleCacheHit` — Chrome a trouvé le code dans son cache lors du chargement de la ressource `.wasm`.
- `v8.wasm.moduleCacheInvalid` — V8 n'a pas pu désérialiser le code en cache car il était obsolète.

Lors d'une exécution froide, nous nous attendons à voir les événements `v8.wasm.streamFromResponseCallback` et `v8.wasm.compiledModule`. Cela indique que le module WebAssembly a été reçu et que la compilation a réussi. Si aucun des deux événements n'est observé, vérifiez que vos appels à l'API de Streaming WebAssembly fonctionnent correctement.

Après une exécution froide, si le seuil de taille a été dépassé, nous nous attendons également à voir un événement `v8.wasm.cachedModule`, ce qui signifie que le code compilé a été envoyé au cache. Il est possible que nous obtenions cet événement, mais que l'écriture ne réussisse pas pour une raison quelconque. Il n'y a actuellement aucun moyen d'observer cela, mais les métadonnées des événements peuvent montrer la taille du code. Les modules très grands peuvent ne pas tenir dans le cache.

Lorsque le cache fonctionne correctement, une exécution chaude produit deux événements : `v8.wasm.streamFromResponseCallback` et `v8.wasm.moduleCacheHit`. Les métadonnées de ces événements vous permettent de voir la taille du code compilé.

Pour en savoir plus sur l'utilisation de `chrome://tracing`, consultez [notre article sur le cache de code JavaScript (byte) pour les développeurs](/blog/code-caching-for-devs).

## Conclusion

Pour la plupart des développeurs, le cache de code devrait « fonctionner simplement ». Il fonctionne mieux, comme tout cache, lorsque les choses sont stables. Les heuristiques de mise en cache de Chrome peuvent changer entre les versions, mais le cache de code a des comportements qui peuvent être exploités et des limitations qui peuvent être évitées. Une analyse minutieuse à l'aide de `chrome://tracing` peut vous aider à ajuster et optimiser l'utilisation du cache de code WebAssembly par votre application web.
