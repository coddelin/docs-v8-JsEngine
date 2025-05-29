---
title: 'Mise en cache de code pour les développeurs JavaScript'
author: '[Leszek Swirski](https://twitter.com/leszekswirski), casseur de cache'
avatars:
  - leszek-swirski
date: 2019-04-08 13:33:37
updated: 2020-06-16
tags:
  - interne
description: 'La mise en cache du (byte)code réduit le temps de démarrage des sites web fréquemment visités en mettant en cache le résultat de l’analyse et de la compilation du JavaScript.'
tweet: '1115264282675953664'
---
La mise en cache de code (également appelée _mise en cache de bytecode_) est une optimisation importante dans les navigateurs. Elle réduit le temps de démarrage des sites web fréquemment visités en mettant en cache le résultat de l’analyse et de la compilation. La plupart des [navigateurs](https://blog.mozilla.org/javascript/2017/12/12/javascript-startup-bytecode-cache/) [populaires](https://bugs.webkit.org/show_bug.cgi?id=192782) implémentent une forme de mise en cache de code, et Chrome ne fait pas exception. En effet, nous avons déjà [écrit](/blog/code-caching) [et](/blog/improved-code-caching) [parlé](https://www.youtube.com/watch?v=YqHOUy2rYZ8) de la façon dont Chrome et V8 mettent en cache le code compilé.

<!--truncate-->
Dans cet article de blog, nous offrons quelques conseils aux développeurs JS qui souhaitent tirer le meilleur parti de la mise en cache de code pour améliorer le démarrage de leurs sites web. Ces conseils se concentrent sur l’implémentation de la mise en cache dans Chrome/V8, mais la plupart d’entre eux sont probablement transférables aux implémentations de mise en cache de code des autres navigateurs.

## Récapitulatif de la mise en cache de code

Bien que d’autres articles de blog et présentations apportent plus de détails sur notre implémentation de la mise en cache de code, il est utile de faire un rapide récapitulatif sur le fonctionnement. Chrome dispose de deux niveaux de mise en cache pour le code compilé par V8 (à la fois les scripts classiques et les scripts de module) : un cache en mémoire « meilleur effort » à faible coût maintenu par V8 (le cache `Isolate`) et un cache complet sérialisé sur disque.

Le cache `Isolate` fonctionne sur les scripts compilés dans le même Isolate V8 (c’est-à-dire le même processus, correspondant grossièrement aux pages du même site web lorsqu’elles sont naviguées dans le même onglet). Il est « meilleur effort » au sens où il essaie d’être aussi rapide et minimal que possible, en utilisant les données déjà disponibles pour nous, au détriment d’un taux de succès potentiellement plus faible et d’une absence de mise en cache entre les processus.

1. Lorsque V8 compile un script, le bytecode compilé est stocké dans une table de hachage (dans le tas V8), indexée par le code source du script.
1. Lorsque Chrome demande à V8 de compiler un autre script, V8 vérifie d’abord si le code source de ce script correspond à quelque chose dans cette table de hachage. Si oui, nous retournons simplement le bytecode existant.

Ce cache est rapide et quasiment gratuit, et pourtant, nous observons un taux de succès de 80 % dans le monde réel.

Le cache de code sur disque est géré par Chrome (plus précisément par Blink) et comble la lacune que le cache `Isolate` ne peut pas : partager des mises en cache entre processus et entre plusieurs sessions Chrome. Il tire parti du cache existant des ressources HTTP, qui gère la mise en cache et l’expiration des données reçues du web.

1. Lorsqu’un fichier JS est demandé pour la première fois (c’est-à-dire une _exécution à froid_), Chrome le télécharge et le donne à V8 pour qu’il le compile. Il stocke également le fichier dans le cache sur disque du navigateur.
1. Lorsque le fichier JS est demandé une seconde fois (c’est-à-dire une _exécution à chaud_), Chrome prend le fichier dans le cache du navigateur et le donne à nouveau à V8 pour qu’il le compile. Cette fois, cependant, le code compilé est sérialisé et est attaché au fichier de script mis en cache comme métadonnées.
1. La troisième fois (c’est-à-dire une _exécution très chaude_), Chrome prend à la fois le fichier et ses métadonnées du cache et les transmet tous deux à V8. V8 désérialise les métadonnées et peut sauter la compilation.

En résumé :

![La mise en cache de code est divisée en exécutions à froid, à chaud et très chaudes, utilisant le cache en mémoire lors des exécutions à chaud et le cache sur disque lors des exécutions très chaudes.](/_img/code-caching-for-devs/overview.svg)

Sur la base de cette description, nous pouvons donner nos meilleurs conseils pour améliorer l’utilisation des caches de code par votre site web.

## Conseil n°1 : ne rien faire

Idéalement, le mieux que vous puissiez faire en tant que développeur JS pour améliorer la mise en cache de code est de « ne rien faire ». Cela signifie en fait deux choses : ne rien faire passivement et ne rien faire activement.

La mise en cache de code est, en fin de compte, un détail d’implémentation du navigateur ; une optimisation des performances basée sur des heuristiques en termes de compromis donnée/espace, dont l’implémentation et les heuristiques peuvent (et vont !) changer régulièrement. Nous, en tant qu’ingénieurs V8, faisons de notre mieux pour que ces heuristiques fonctionnent pour tout le monde dans le web en évolution, et sur-optimiser pour les détails de l’implémentation actuelle de la mise en cache de code peut entraîner des déceptions après quelques versions, lorsque ces détails changent. De plus, d’autres moteurs JavaScript sont susceptibles d’avoir des heuristiques différentes pour leur implémentation de la mise en cache de code. Ainsi, de nombreuses façons, notre meilleur conseil pour obtenir que votre code soit mis en cache est comme notre conseil pour écrire du JS : écrivez du code idiomatique propre, et nous ferons de notre mieux pour optimiser comment nous le mettons en cache.

En plus de ne rien faire passivement, vous devriez également essayer de ne rien faire activement. Toute forme de mise en cache dépend intrinsèquement du fait que les choses restent inchangeables, donc ne rien faire est le meilleur moyen de permettre aux données mises en cache de rester en cache. Il existe plusieurs façons de ne rien faire activement.

### Ne modifiez pas le code

Cela peut sembler évident, mais il vaut la peine de le préciser — chaque fois que vous déployez un nouveau code, ce code n'est pas encore mis en cache. À chaque fois que le navigateur effectue une requête HTTP pour une URL de script, il peut inclure la date du dernier accès à cette URL et, si le serveur sait que le fichier n'a pas changé, il peut renvoyer une réponse 304 Non Modifié, ce qui conserve notre cache de code actif. Sinon, une réponse 200 OK met à jour notre ressource en cache et réinitialise le cache de code, le renvoyant à une exécution froide.

![](/_img/code-caching-for-devs/http-200-vs-304.jpg "Drake préfère les réponses HTTP 304 aux réponses HTTP 200.")

Il est tentant de toujours déployer immédiatement vos dernières modifications de code, particulièrement si vous voulez mesurer l'impact d'un certain changement, mais pour les caches, il est beaucoup mieux de laisser le code tel quel, ou au moins de le mettre à jour aussi rarement que possible. Envisagez d'imposer une limite de `≤ x` déploiements par semaine, où `x` est le curseur que vous pouvez ajuster pour équilibrer mise en cache et obsolescence.

### Ne modifiez pas les URLs

Les caches de code sont (à l'heure actuelle) associés à l'URL d'un script, car cela les rend faciles à chercher sans avoir à lire le contenu réel du script. Cela signifie que changer l'URL d'un script (y compris tout paramètre de requête !) crée une nouvelle entrée de ressource dans notre cache de ressources, et avec elle une nouvelle entrée de cache froid.

Bien sûr, cela peut également être utilisé pour forcer l'effacement du cache, bien que ce soit également un détail d'implémentation ; nous pourrions un jour décider d'associer les caches au texte source plutôt qu'à l'URL source, et ce conseil ne serait alors plus valide.

### Ne modifiez pas le comportement d'exécution

L'une des optimisations récentes de notre mise en cache de code est de seulement [sérialiser le code compilé après qu'il ait été exécuté](/blog/improved-code-caching#increasing-the-amount-of-code-that-is-cached). Cela vise à capturer les fonctions compilées de manière paresseuse, qui ne sont compilées que pendant l'exécution, et non lors de la compilation initiale.

Cette optimisation fonctionne mieux lorsque chaque exécution du script exécute le même code, ou au moins les mêmes fonctions. Cela peut poser problème si, par exemple, vous avez des tests A/B dépendants d'une décision à l'exécution :

```js
if (Math.random() > 0.5) {
  A();
} else {
  B();
}
```

Dans ce cas, seul `A()` ou `B()` est compilé et exécuté lors de l'exécution chaude, et est inscrit dans le cache de code, mais l'un ou l'autre pourrait être exécuté lors des exécutions suivantes. Essayez plutôt de garder votre exécution déterministe pour rester sur le chemin du cache.

## Conseil 2 : faites quelque chose

Certes, le conseil de ne rien faire, que ce soit passivement ou activement, n'est pas très satisfaisant. Donc en plus de ne rien faire, étant donné nos heuristiques et implémentation actuelles, il y a des choses que vous pouvez faire. Veuillez cependant vous rappeler que les heuristiques peuvent changer, ce conseil peut évoluer, et il n'y a pas de substitution au profilage.

![](/_img/code-caching-for-devs/with-great-power.jpg "Oncle Ben suggère à Peter Parker d'être prudent lorsqu'il optimise le comportement du cache de son application web.")

### Séparer les bibliothèques du code les utilisant

La mise en cache de code est effectuée globalement, par script, ce qui signifie que les modifications apportées à une partie quelconque du script invalident le cache pour tout le script. Si votre code distribué est constitué de parties stables et changeantes dans un seul script, comme des bibliothèques et une logique métier, alors les modifications apportées au code de logique métier invalident le cache du code de bibliothèque.

En revanche, vous pouvez dissocier le code de bibliothèque stable dans un script distinct, et l'inclure séparément. Ainsi, le code de bibliothèque peut être mis en cache une fois, et rester en cache lorsque la logique métier change.

Cela présente des avantages supplémentaires si les bibliothèques sont partagées sur différentes pages de votre site web : puisque le cache de code est attaché au script, le cache de code pour les bibliothèques est également partagé entre les pages.

### Fusionner les bibliothèques dans le code les utilisant

La mise en cache de code est effectuée après l'exécution de chaque script, ce qui signifie que le cache de code d'un script inclura exactement les fonctions de ce script qui ont été compilées au moment où le script termine son exécution. Cela a plusieurs conséquences importantes pour le code des bibliothèques :

1. Le cache de code n'inclura pas les fonctions des scripts précédents.
1. Le cache de code n'inclura pas les fonctions compilées paresseusement appelées par des scripts ultérieurs.

En particulier, si une bibliothèque est entièrement constituée de fonctions compilées paresseusement, ces fonctions ne seront pas mises en cache, même si elles sont utilisées plus tard.

Une solution à ceci est de fusionner les bibliothèques et leurs utilisations en un seul script, afin que la mise en cache du code "voit" quelles parties de la bibliothèque sont utilisées. Cela est malheureusement exactement à l'opposé de l'avis ci-dessus, car il n'existe pas de solution miracle. En général, nous ne recommandons pas de fusionner tous vos scripts JS en un seul gros bundle ; les diviser en plusieurs scripts plus petits tend à être globalement plus bénéfique pour des raisons autres que la mise en cache du code (par exemple, multiples requêtes réseau, compilation en streaming, interactivité de la page, etc.).

### Profitez des heuristiques des IIFE

Seules les fonctions qui sont compilées au moment où le script termine son exécution sont prises en compte pour la mise en cache du code, de sorte qu'il existe de nombreux types de fonctions qui ne seront pas mises en cache malgré leur exécution à un moment ultérieur. Les gestionnaires d'événements (même `onload`), les chaînes de promesses, les fonctions inutilisées de bibliothèques et tout autre élément qui est compilé de manière paresseuse sans être appelé avant que `</script>` soit vu, restent paresseux et ne sont pas mis en cache.

Une façon de forcer ces fonctions à être mises en cache est de les forcer à être compilées, et une méthode courante pour forcer la compilation consiste à utiliser les heuristiques des IIFE. Les IIFE (expressions de fonction immédiatement invoquées) sont un modèle où une fonction est appelée immédiatement après sa création :

```js
(function foo() {
  // …
})();
```

Puisque les IIFE sont appelées immédiatement, la plupart des moteurs JavaScript essaient de les détecter et de les compiler immédiatement, pour éviter de payer les coûts de compilation paresseuse suivie de compilation complète. Il existe diverses heuristiques pour détecter les IIFE tôt (avant que la fonction ne doive être analysée), la plus courante étant un `(` avant le mot-clé `function`.

Étant donné que cette heuristique est appliquée tôt, elle déclenche une compilation même si la fonction n'est pas réellement invoquée immédiatement :

```js
const foo = function() {
  // Ignorée paresseusement
};
const bar = (function() {
  // Compilée avec empressement
});
```

Cela signifie que les fonctions qui devraient être dans le cache du code peuvent y être forcées en les encapsulant entre parenthèses. Cependant, cela peut nuire au temps de démarrage si l'indice est appliqué de manière incorrecte, et en général, cela constitue une sorte d'abus des heuristiques, donc notre conseil est d'éviter de faire cela sauf en cas de nécessité.

### Regroupez les petits fichiers

Chrome a une taille minimale pour les caches de code, actuellement fixée à [1 Kio de code source](https://cs.chromium.org/chromium/src/third_party/blink/renderer/bindings/core/v8/v8_code_cache.cc?l=91&rcl=2f81d000fdb5331121cba7ff81dfaaec25b520a5). Cela signifie que les scripts plus petits ne sont pas du tout mis en cache, car nous considérons que les frais généraux sont plus importants que les avantages.

Si votre site web contient beaucoup de ces petits scripts, le calcul des frais généraux peut ne plus s'appliquer de la même manière. Vous pourriez envisager de les regrouper afin qu'ils dépassent la taille minimale du code, tout en bénéficiant généralement de la réduction des frais généraux des scripts.

### Évitez les scripts en ligne

Les balises script dont la source est en ligne dans le HTML n'ont pas de fichier source externe auquel elles sont associées, et ne peuvent donc pas être mises en cache avec le mécanisme ci-dessus. Chrome essaie de mettre en cache les scripts en ligne, en attachant leur cache à la ressource du document HTML, mais ces caches deviennent alors dépendants du fait que le document HTML entier ne change pas et ne sont pas partagés entre les pages.

Ainsi, pour les scripts non triviaux qui pourraient bénéficier du cache de code, évitez de les insérer directement dans le HTML et préférez les inclure comme fichiers externes.

### Utilisez les caches des service workers

Les service workers sont un mécanisme permettant à votre code d'intercepter les requêtes réseau pour les ressources sur votre page. En particulier, ils vous permettent de construire un cache local de certaines de vos ressources et de servir la ressource à partir du cache chaque fois qu'elle est demandée. Cela est particulièrement utile pour les pages qui souhaitent continuer de fonctionner hors ligne, comme les PWA.

Un exemple typique d'un site utilisant un service worker est l'enregistrement du service worker dans un fichier script principal :

```js
// main.mjs
navigator.serviceWorker.register('/sw.js');
```

Et le service worker ajoute des gestionnaires d'événements pour l'installation (création d'un cache) et la récupération (servir des ressources, potentiellement à partir du cache).

```js
// sw.js
self.addEventListener('install', (event) => {
  async function buildCache() {
    const cache = await caches.open(cacheName);
    return cache.addAll([
      '/main.css',
      '/main.mjs',
      '/offline.html',
    ]);
  }
  event.waitUntil(buildCache());
});

self.addEventListener('fetch', (event) => {
  async function cachedFetch(event) {
    const cache = await caches.open(cacheName);
    let response = await cache.match(event.request);
    if (response) return response;
    response = await fetch(event.request);
    cache.put(event.request, response.clone());
    return response;
  }
  event.respondWith(cachedFetch(event));
});
```

Ces caches peuvent inclure des ressources JS mises en cache. Cependant, les heuristiques sont légèrement différentes ici puisque nous pouvons faire différentes hypothèses. Étant donné que le cache du service worker suit les règles de stockage gérées par les quotas, il est plus susceptible d'être conservé plus longtemps et l'avantage de la mise en cache sera plus important. De plus, nous pouvons déduire une importance accrue des ressources lorsqu'elles sont pré-cache avant le chargement.

Les différences heuristiques les plus importantes se produisent lorsque la ressource est ajoutée au cache du service worker lors de l'événement d'installation du service worker. L'exemple ci-dessus démontre une telle utilisation. Dans ce cas, le cache de code est immédiatement créé lorsque la ressource est placée dans le cache du service worker. De plus, nous générons un cache de code "complet" pour ces scripts - nous ne compilons plus les fonctions de manière paresseuse, mais compilons _tout_ et le plaçons dans le cache. Cela présente l'avantage de performances rapides et prévisibles, sans dépendances de l'ordre d'exécution, bien qu'au prix d'une augmentation de l'utilisation de la mémoire.

Si une ressource JS est stockée via l'API Cache en dehors de l'événement d'installation du service worker, alors le cache de code *n'est pas* généré immédiatement. Au contraire, si un service worker répond avec cette réponse à partir du cache, alors le cache de code "normal" sera généré lors du premier chargement. Ce cache de code sera alors disponible pour être consommé lors du deuxième chargement ; un chargement plus rapide que dans le scénario typique de mise en cache de code. Les ressources peuvent être stockées dans l'API Cache en dehors de l'événement d'installation lorsqu'elles sont mises en cache "progressivement" dans l'événement de récupération ou si l'API Cache est mise à jour depuis la fenêtre principale au lieu du service worker.

Notez que le cache de code "complet" pré-mis en cache suppose que la page où le script sera exécuté utilisera un encodage UTF-8. Si la page finit par utiliser un encodage différent, alors le cache de code sera rejeté et remplacé par un cache de code "normal".

De plus, le cache de code "complet" pré-mis en cache suppose que la page chargera le script comme un script JS classique. Si la page finit par le charger comme un module ES, alors le cache de code sera rejeté et remplacé par un cache de code "normal".

## Tracing

Aucune des suggestions ci-dessus n'est garantie pour accélérer votre application web. Malheureusement, les informations sur la mise en cache de code ne sont pas actuellement exposées dans les DevTools, donc la manière la plus robuste de savoir quels scripts de votre application web sont mis en cache est d'utiliser l'outil légèrement plus bas-niveau `chrome://tracing`.

`chrome://tracing` enregistre des traces instrumentées de Chrome pendant une certaine période, où la visualisation résultante des traces ressemble à ceci :

![L'interface `chrome://tracing` avec un enregistrement d'une exécution avec cache chaud](/_img/code-caching-for-devs/chrome-tracing-visualization.png)

Le tracing enregistre le comportement de l'ensemble du navigateur, y compris les autres onglets, fenêtres et extensions, donc cela fonctionne mieux lorsque cela est effectué dans un profil utilisateur propre, avec les extensions désactivées, et sans autres onglets de navigateur ouverts :

```bash
# Démarrez une nouvelle session de navigateur Chrome avec un profil utilisateur propre et extensions désactivées
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

Lors de la collecte d'une trace, vous devez sélectionner quelles catégories tracer. Dans la plupart des cas, vous pouvez simplement sélectionner l'ensemble de catégories "Développeur web", mais vous pouvez également choisir des catégories manuellement. La catégorie importante pour la mise en cache de code est `v8`.

![](/_img/code-caching-for-devs/chrome-tracing-categories-1.png)

![](/_img/code-caching-for-devs/chrome-tracing-categories-2.png)

Après avoir enregistré une trace avec la catégorie `v8`, recherchez les tranches `v8.compile` dans la trace. (Alternativement, vous pouvez entrer `v8.compile` dans la boîte de recherche de l'interface de tracing.) Ces tranches énumèrent le fichier en cours de compilation, et certaines métadonnées sur la compilation.

Lors d'une exécution froide d'un script, il n'y a aucune information sur la mise en cache de code — cela signifie que le script n'était pas impliqué dans la production ou la consommation de données de cache.

![](/_img/code-caching-for-devs/chrome-tracing-cold-run.png)

Lors d'une exécution chaude, il y a deux entrées `v8.compile` par script : une pour la compilation réelle (comme ci-dessus), et une (après l'exécution) pour produire le cache. Vous pouvez reconnaître cette dernière car elle contient les champs de métadonnées `cacheProduceOptions` et `producedCacheSize`.

![](/_img/code-caching-for-devs/chrome-tracing-warm-run.png)

Lors d'une exécution très chaude, vous verrez une entrée `v8.compile` pour la consommation du cache, avec les champs de métadonnées `cacheConsumeOptions` et `consumedCacheSize`. Toutes les tailles sont exprimées en octets.

![](/_img/code-caching-for-devs/chrome-tracing-hot-run.png)

## Conclusion

Pour la plupart des développeurs, la mise en cache de code devrait "fonctionner automatiquement". Elle fonctionne mieux, comme tout cache, lorsque les choses restent inchangées, et fonctionne sur des heuristiques qui peuvent changer entre les versions. Néanmoins, la mise en cache de code comporte des comportements qui peuvent être utilisés, et des limitations qui peuvent être évitées, et une analyse minutieuse utilisant `chrome://tracing` peut vous aider à ajuster et optimiser l'utilisation des caches par votre application web.
