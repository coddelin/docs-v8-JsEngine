---
title: 'Le coût de JavaScript en 2019'
author: 'Addy Osmani ([@addyosmani](https://twitter.com/addyosmani)), Concierge JavaScript, et Mathias Bynens ([@mathias](https://twitter.com/mathias)), Libérateur du fil principal'
avatars:
  - 'addy-osmani'
  - 'mathias-bynens'
date: 2019-06-25
tags:
  - internals
  - parsing
description: 'Les coûts principaux du traitement de JavaScript sont le téléchargement et le temps d'exécution sur le CPU.'
tweet: '1143531042361487360'
---
:::note
**Remarque:** Si vous préférez regarder une présentation plutôt que lire des articles, profitez de la vidéo ci-dessous ! Sinon, passez la vidéo et continuez à lire.
:::

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/X9eRLElSW1c" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=X9eRLElSW1c">“Le coût de JavaScript”</a> présenté par Addy Osmani à la conférence #PerfMatters 2019.</figcaption>
</figure>

<!--truncate-->
Un grand changement dans [le coût de JavaScript](https://medium.com/@addyosmani/the-cost-of-javascript-in-2018-7d8950fbb5d4) au cours des dernières années a été une amélioration de la vitesse à laquelle les navigateurs peuvent analyser et compiler le script. **En 2019, les coûts principaux du traitement des scripts sont désormais le téléchargement et le temps d'exécution sur le CPU.**

L'interaction utilisateur peut être retardée si le fil principal du navigateur est occupé à exécuter JavaScript, donc l'optimisation des goulots d'étranglement liés au temps d'exécution des scripts et au réseau peut être très efficace.

## Recommandations d'action au niveau supérieur

Qu'est-ce que cela signifie pour les développeurs web ? Les coûts d'analyse et de compilation ne sont **plus aussi lents** que nous le pensions autrefois. Les trois choses sur lesquelles se concentrer pour les bundles JavaScript sont :

- **Améliorer le temps de téléchargement**
    - Gardez vos bundles JavaScript petits, surtout pour les appareils mobiles. Des bundles réduits améliorent les vitesses de téléchargement, abaissent l'utilisation de la mémoire et réduisent les coûts liés au CPU.
    - Évitez d'avoir un seul bundle volumineux ; si un bundle dépasse ~50–100 kB, divisez-le en plusieurs bundles plus petits. (Avec le multiplexage HTTP/2, plusieurs messages de requête et de réponse peuvent être en vol en même temps, réduisant les frais généraux des requêtes additionnelles.)
    - Sur mobile, vous voudrez expédier beaucoup moins, en raison des vitesses de réseau, mais aussi pour maintenir une faible utilisation de la mémoire.
- **Améliorer le temps d'exécution**
    - Évitez [les tâches longues](https://w3c.github.io/longtasks/) qui peuvent accaparer le fil principal et retarder le moment où les pages deviennent interactives. Après le téléchargement, le temps d'exécution des scripts est maintenant un coût principal.
- **Évitez les scripts inline volumineux** (car ils sont toujours analysés et compilés sur le fil principal). Une bonne règle empirique est : si le script dépasse 1 kB, évitez de l'intégrer (également parce qu'à partir de 1 kB, [la mise en cache du code](/blog/code-caching-for-devs) s'active pour les scripts externes).

## Pourquoi le temps de téléchargement et d'exécution est-il important?

Pourquoi est-il important d'optimiser les temps de téléchargement et d'exécution ? Les temps de téléchargement sont cruciaux pour les réseaux bas de gamme. Malgré la croissance de la 4G (et même de la 5G) à travers le monde, nos [types de connexion effectifs](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType) restent incohérents, de nombreux utilisateurs rencontrant des vitesses qui ressemblent à de la 3G (ou pire) lorsqu'ils sont en déplacement.

Le temps d'exécution de JavaScript est important pour les téléphones avec des CPUs lents. En raison des différences entre les CPUs, GPUs et le throttling thermique, il existe de grandes disparités entre la performance des téléphones haut de gamme et bas de gamme. Cela compte pour la performance de JavaScript, car l'exécution dépend du CPU.

En fait, du temps total qu'une page passe à se charger dans un navigateur comme Chrome, jusqu'à 30% de ce temps peut être consacré à l'exécution de JavaScript. Voici un chargement de page d'un site avec une charge de travail assez typique (Reddit.com) sur une machine de bureau haut de gamme :

![Le traitement de JavaScript représente 10–30% du temps passé dans V8 pendant le chargement de la page.](/_img/cost-of-javascript-2019/reddit-js-processing.svg)

Sur mobile, il faut 3–4× plus de temps pour un téléphone moyen (Moto G4) pour exécuter le JavaScript de Reddit comparé à un appareil haut de gamme (Pixel 3), et plus de 6× sur un appareil bas de gamme (le &lt;$100 Alcatel 1X):

![Le coût du JavaScript de Reddit sur plusieurs classes d'appareils différentes (bas de gamme, moyen et haut de gamme)](/_img/cost-of-javascript-2019/reddit-js-processing-devices.svg)

:::note
**Remarque :** Reddit propose des expériences différentes pour le web sur desktop et sur mobile, et donc les résultats du MacBook Pro ne peuvent pas être comparés aux autres résultats.
:::

Lorsque vous essayez d'optimiser le temps d'exécution de JavaScript, surveillez les [Long Tasks](https://web.dev/long-tasks-devtools/) qui pourraient monopoliser le thread UI pendant de longues périodes. Celles-ci peuvent bloquer l'exécution de tâches critiques même si la page semble visuellement prête. Divisez-les en tâches plus petites. En segmentant votre code et en priorisant l'ordre de son chargement, vous pouvez rendre les pages interactives plus rapidement et, espérons-le, réduire la latence des interactions.

![Les tâches longues monopolisent le thread principal. Vous devriez les diviser.](/_img/cost-of-javascript-2019/long-tasks.png)

## Qu'a fait V8 pour améliorer l'analyse/compilation ?

La vitesse brute d'analyse JavaScript dans V8 a doublé depuis Chrome 60. En même temps, le coût brut d'analyse (et de compilation) est devenu moins visible/important grâce à d'autres travaux d'optimisation dans Chrome qui le parallélisent.

V8 a réduit la quantité de travail d'analyse et de compilation sur le thread principal de 40 % en moyenne (par exemple, 46 % sur Facebook, 62 % sur Pinterest) avec une amélioration maximale de 81 % (YouTube), en analysant et en compilant sur un thread de travail. Cela s'ajoute à l'analyse/compilation en streaming existante hors du thread principal.

![Temps d'analyse de V8 dans différentes versions](/_img/cost-of-javascript-2019/chrome-js-parse-times.svg)

Nous pouvons également visualiser l'impact en temps CPU de ces changements dans différentes versions de V8 au fil des sorties de Chrome. Dans le même temps qu'il a fallu à Chrome 61 pour analyser le JavaScript de Facebook, Chrome 75 peut désormais analyser à la fois le JavaScript de Facebook ET 6 fois celui de Twitter.

![Dans le temps qu'il a fallu à Chrome 61 pour analyser le JS de Facebook, Chrome 75 peut analyser à la fois le JS de Facebook et 6 fois celui de Twitter.](/_img/cost-of-javascript-2019/js-parse-times-websites.svg)

Plongeons dans les raisons qui ont permis ces changements. En bref, les ressources script peuvent être analysées et compilées en streaming sur un thread de travail, c'est-à-dire :

- V8 peut analyser+compiler JavaScript sans bloquer le thread principal.
- Le streaming commence une fois que l'analyseur HTML complet rencontre une balise `<script>`. Pour les scripts bloquant l'analyse, l'analyseur HTML fait une pause, tandis que pour les scripts asynchrones, il continue.
- Pour la plupart des vitesses de connexion réelles, V8 analyse plus rapidement que le téléchargement, donc V8 termine l'analyse+compilation quelques millisecondes après le téléchargement des derniers octets du script.

L'explication un peu plus longue est… Les versions beaucoup plus anciennes de Chrome téléchargeaient un script en entier avant de commencer à l'analyser, ce qui est une approche simple, mais n'optimise pas pleinement l'utilisation du CPU. Entre les versions 41 et 68, Chrome a commencé à analyser les scripts asynchrones et différés sur un thread séparé dès le début du téléchargement.

![Les scripts arrivent en plusieurs morceaux. V8 commence le streaming dès qu'il a vu au moins 30 Ko.](/_img/cost-of-javascript-2019/script-streaming-1.svg)

Dans Chrome 71, nous avons adopté une configuration basée sur les tâches où le planificateur pouvait analyser plusieurs scripts asynchrones/différés à la fois. L'impact de ce changement a été une réduction de ~20 % du temps d'analyse sur le thread principal, entraînant une amélioration globale de ~2 % dans TTI/FID mesurée sur des sites web réels.

![Chrome 71 est passé à une configuration basée sur les tâches où le planificateur pouvait analyser plusieurs scripts asynchrones/différés à la fois.](/_img/cost-of-javascript-2019/script-streaming-2.svg)

Dans Chrome 72, nous sommes passés à l'utilisation du streaming comme méthode principale d'analyse : maintenant aussi les scripts synchrones réguliers sont ainsi analysés (sauf les scripts en ligne). Nous avons également cessé d'annuler l'analyse basée sur les tâches si le thread principal en avait besoin, puisque cela dupliquait inutilement tout travail déjà effectué.

[Les versions précédentes de Chrome](/blog/v8-release-75#script-streaming-directly-from-network) permettaient l'analyse et la compilation en streaming où les données de source de script provenant du réseau devaient passer par le thread principal de Chrome avant d'être transférées au streamer.

Cela entraînait souvent une attente du parseur en streaming pour des données arrivées du réseau, mais qui n'avaient pas encore été transférées à la tâche de streaming car elles étaient bloquées par d'autres travaux sur le thread principal (comme l'analyse HTML, la mise en page ou l'exécution JavaScript).

Nous expérimentons maintenant le démarrage de l'analyse lors du préchargement, et le rebond sur le thread principal était un obstacle auparavant.

La présentation BlinkOn de Leszek Swirski donne des détails supplémentaires :

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/D1UJgiG4_NI" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=D1UJgiG4_NI">“Analyser JavaScript en un temps nul*”</a>, présenté par Leszek Swirski lors de BlinkOn 10.</figcaption>
</figure>

## Comment ces changements se reflètent-ils dans ce que vous voyez dans DevTools ?

En plus de ce qui précède, il y avait [un problème dans DevTools](https://bugs.chromium.org/p/chromium/issues/detail?id=939275) qui représentait toute la tâche d'analyse de manière à suggérer qu'elle utilisait le CPU (bloc complet). Cependant, le parseur bloque chaque fois qu'il manque de données (qui doivent passer par le thread principal). Depuis que nous sommes passés d'un thread de streaming unique à des tâches de streaming, cela est devenu vraiment évident. Voici ce que vous pouviez voir dans Chrome 69 :

![Le problème dans DevTools qui représentait toute la tâche d'analyse de manière à indiquer qu'elle utilisait le CPU (bloc complet)](/_img/cost-of-javascript-2019/devtools-69.png)

La tâche « analyser le script » est présentée comme prenant 1,08 secondes. Cependant, l’analyse du JavaScript n’est pas vraiment aussi lente ! La plupart de ce temps est passé à ne rien faire sauf attendre que les données circulent sur le thread principal.

Chrome 76 montre une image différente :

![Dans Chrome 76, l’analyse est divisée en plusieurs petites tâches de streaming.](/_img/cost-of-javascript-2019/devtools-76.png)

En général, le panneau de performance des DevTools est excellent pour obtenir une vue d’ensemble de ce qui se passe sur votre page. Pour des métriques détaillées spécifiques à V8, comme les temps d’analyse et de compilation JavaScript, nous recommandons [d’utiliser Chrome Tracing avec Runtime Call Stats (RCS)](/docs/rcs). Dans les résultats RCS, `Parse-Background` et `Compile-Background` indiquent combien de temps a été consacré à l’analyse et à la compilation du JavaScript en arrière-plan, tandis que `Parse` et `Compile` capturent les métriques du thread principal.

![](/_img/cost-of-javascript-2019/rcs.png)

## Quel est l’impact réel de ces changements ?

Examinons quelques exemples de sites réels et comment le streaming de script s’applique.

![Temps passé sur le thread principal par rapport au thread de travail pour analyser et compiler le JS de Reddit sur un MacBook Pro](/_img/cost-of-javascript-2019/reddit-main-thread.svg)

Reddit.com possède plusieurs bundles de plus de 100 kB qui sont encapsulés dans des fonctions externes, provoquant de nombreuses [compilations différées](/blog/preparser) sur le thread principal. Dans le graphique ci-dessus, seul le temps du thread principal est vraiment important, car maintenir le thread principal occupé peut retarder l’interactivité. Reddit consacre la majeure partie de son temps au thread principal, utilisant minimalement le thread Worker/Background.

Ils bénéficieraient de diviser certains de leurs plus grands bundles en plus petits (par exemple, 50 kB chacun) sans encapsulation, afin de maximiser la parallélisation — de cette façon, chaque bundle pourrait être analysé et compilé séparément en streaming et réduire l’analyse/la compilation sur le thread principal au démarrage.

![Temps passé sur le thread principal par rapport au thread de travail pour analyser et compiler le JS de Facebook sur un MacBook Pro](/_img/cost-of-javascript-2019/facebook-main-thread.svg)

Nous pouvons également examiner un site comme Facebook.com. Facebook charge environ 6 Mo de JS compressé en environ 292 requêtes, certaines asynchrones, d’autres préchargées, et certaines récupérées avec une priorité plus basse. Beaucoup de leurs scripts sont très petits et granulaires — ceci peut aider avec la parallélisation globale sur le thread Background/Worker, car ces petits scripts peuvent être analysés/compilés en streaming en parallèle.

Notez que vous n’êtes probablement pas Facebook et que vous n’avez probablement pas une application de longue durée comme Facebook ou Gmail où ce volume de script pourrait être justifiable sur un ordinateur de bureau. Cependant, en général, gardez vos bundles grossiers et chargez uniquement ce dont vous avez besoin.

Bien que la plupart des travaux d’analyse et de compilation JavaScript puissent se produire de manière incrémentielle sur un thread en arrière-plan, certains travaux doivent encore avoir lieu sur le thread principal. Lorsque le thread principal est occupé, la page ne peut pas répondre aux interactions de l’utilisateur. Gardez un œil sur l’impact que le téléchargement et l’exécution du code ont sur votre expérience utilisateur.

:::note
**Note :** Actuellement, tous les moteurs JavaScript et navigateurs ne mettent pas en œuvre le streaming de script comme optimisation de chargement. Nous croyons néanmoins que les conseils généraux ici conduisent à de bonnes expériences utilisateur globales.
:::

## Le coût de l’analyse JSON

Comme la grammaire JSON est beaucoup plus simple que celle de JavaScript, JSON peut être analysé de manière plus efficace que JavaScript. Cette connaissance peut être appliquée pour améliorer les performances de démarrage des applications web qui embarquent de grandes structures de configuration ressemblant à du JSON (comme des magasins Redux intégrés). Au lieu d’intégrer les données sous forme de littéral d’objet JavaScript, comme ceci :

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…cela peut être représenté sous forme de chaîne JSON sérialisée, puis analysé en JSON à l’exécution :

```js
const data = JSON.parse('{"foo":42,"bar":1337}'); // 🚀
```

Tant que la chaîne JSON est évaluée une seule fois, l’approche `JSON.parse` est [beaucoup plus rapide](https://github.com/GoogleChromeLabs/json-parse-benchmark) comparée au littéral d’objet JavaScript, surtout pour les chargements à froid. Une bonne règle empirique est d’appliquer cette technique pour des objets de 10 kB ou plus — mais comme toujours avec les conseils de performance, mesurez l’impact réel avant d’effectuer des modifications.

![`JSON.parse('…')` est [beaucoup plus rapide](https://github.com/GoogleChromeLabs/json-parse-benchmark) à analyser, compiler et exécuter comparé à un littéral JavaScript équivalent — non seulement dans V8 (1,7× plus rapide), mais dans tous les principaux moteurs JavaScript.](/_img/cost-of-javascript-2019/json.svg)

La vidéo suivante entre plus en détail sur l’origine de la différence de performance, à partir de 02:10.

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/ff4fgQxPaO0?start=130" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=ff4fgQxPaO0">« Des applications plus rapides avec <code>JSON.parse</code> »</a>, présenté par Mathias Bynens lors du #ChromeDevSummit 2019.</figcaption>
</figure>

Voir [notre _JSON ⊂ ECMAScript_ explication des fonctionnalités](/features/subsume-json#embedding-json-parse) pour une implémentation exemple qui, en donnant un objet arbitraire, génère un programme JavaScript valide qui le `JSON.parse`.

Il existe un risque supplémentaire lors de l'utilisation de littéraux d'objets simples pour de grandes quantités de données : ils pourraient être analysés _deux fois_ !

1. La première passe a lieu lorsque le littéral est pré-analysé.
2. La deuxième passe a lieu lorsque le littéral est analysé paresseusement.

La première passe ne peut pas être évitée. Heureusement, la deuxième passe peut être évitée en plaçant le littéral d'objet au niveau supérieur, ou dans un [PIFE](/blog/preparser#pife).

## Qu'en est-il de l'analyse/la compilation lors de visites répétées ?

L'optimisation de mise en cache (byte)code de V8 peut aider. Lorsqu'un script est demandé pour la première fois, Chrome le télécharge et le donne à V8 pour qu'il le compile. Il stocke également le fichier dans le cache sur disque du navigateur. Lorsque le fichier JS est demandé une deuxième fois, Chrome récupère le fichier dans le cache du navigateur et le redonne à V8 pour qu'il le compile. Cette fois, cependant, le code compilé est sérialisé et est attaché au fichier de script mis en cache en tant que métadonnées.

![Visualisation de la façon dont la mise en cache de code fonctionne dans V8](/_img/cost-of-javascript-2019/code-caching.png)

La troisième fois, Chrome prend à la fois le fichier et les métadonnées du fichier depuis le cache, et les remet à V8. V8 désérialise les métadonnées et peut ainsi éviter la compilation. La mise en cache de code intervient si les deux premières visites ont lieu dans un délai de 72 heures. Chrome dispose également d'une mise en cache de code anticipée si un service worker est utilisé pour mettre en cache les scripts. Vous pouvez en lire plus sur la mise en cache de code dans [la mise en cache de code pour les développeurs web](/blog/code-caching-for-devs).

## Conclusions

Le temps de téléchargement et d'exécution sont les principaux goulets d'étranglement pour le chargement des scripts en 2019. Visez un petit paquet de scripts synchrones (en ligne) pour votre contenu au-dessus de la ligne de flottaison, avec un ou plusieurs scripts différés pour le reste de la page. Décomposez vos grands paquets afin de vous concentrer uniquement sur l'envoi du code dont l'utilisateur a besoin lorsqu'il en a besoin. Cela maximise la parallélisation dans V8.

Sur mobile, vous voudrez envoyer beaucoup moins de scripts en raison du réseau, de la consommation de mémoire et du temps d'exécution pour des CPU plus lents. Équilibrez la latence avec la mise en cache pour maximiser la quantité de travail d'analyse et de compilation qui peut avoir lieu hors du thread principal.

## Lecture supplémentaire

- [Une analyse ultra-rapide, partie 1 : optimiser le scanner](/blog/scanner)
- [Une analyse ultra-rapide, partie 2 : analyse paresseuse](/blog/preparser)
