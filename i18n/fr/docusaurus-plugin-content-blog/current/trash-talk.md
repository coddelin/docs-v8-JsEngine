---
title: 'Parlons déchets : le collecteur d'ordures Orinoco'
author: "Peter ‘le garbo’ Marshall ([@hooraybuffer](https://twitter.com/hooraybuffer))"
avatars:
  - "peter-marshall"
date: 2019-01-03 17:45:34
tags:
  - internes
  - mémoire
  - présentations
description: 'Orinoco, le collecteur d'ordures de V8, est passé d'une implémentation séquentielle stop-the-world à un collecteur principalement parallèle et concurrent avec une solution de repli incrémentale.'
tweet: "1080867305532416000"
---
Au cours des dernières années, le collecteur d'ordures (GC) de V8 a beaucoup évolué. Le projet Orinoco a transformé un collecteur d'ordures séquentiel stop-the-world en un collecteur principalement parallèle et concurrent avec une solution de repli incrémentale.

<!--truncate-->
:::note
**Note:** Si vous préférez regarder une présentation plutôt que lire des articles, profitez de la vidéo ci-dessous ! Sinon, passez la vidéo et continuez à lire.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/Scxz6jVS4Ls" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

Tout collecteur d'ordures a quelques tâches essentielles qu'il doit accomplir périodiquement :

1. Identifier les objets vivants/morts
1. Recycler/réutiliser la mémoire occupée par les objets morts
1. Compacter/défragmenter la mémoire (optionnel)

Ces tâches peuvent être effectuées dans un ordre séquentiel ou être entrelacées arbitrairement. Une approche simple consiste à mettre en pause l'exécution de JavaScript et à effectuer chacune de ces tâches en séquence sur le thread principal. Cela peut engendrer des problèmes de latence et de saccades sur le thread principal, dont nous avons parlé dans des [articles précédents](/blog/jank-busters) [du blog](/blog/orinoco), ainsi qu'une réduction du débit du programme.

## Collecte de déchets majeure (Full Mark-Compact)

La collecte de déchets majeure recueille les déchets de tout le tas.

![La collecte de déchets majeure se produit en trois phases : marquage, balayage et compactage.](/_img/trash-talk/01.svg)

### Marquage

Déterminer quels objets peuvent être collectés est une partie essentielle de la collecte des déchets. Les collecteurs d'ordures utilisent la notion de référencabilité comme proxy pour déterminer la « vivacité » des objets. Cela signifie que tout objet actuellement accessible dans le runtime doit être conservé, et que tout objet inaccessible peut être collecté.

Le marquage est le processus par lequel les objets accessibles sont identifiés. Le GC commence par un ensemble de pointeurs d'objets connus, appelé ensemble racine. Ceci inclut la pile d'exécution et l'objet global. Ensuite, il suit chaque pointeur vers un objet JavaScript et marque cet objet comme accessible. Le GC suit chaque pointeur dans cet objet et continue ce processus de manière récursive jusqu'à ce que chaque objet accessible dans le runtime ait été trouvé et marqué.

### Balayage

Le balayage est un processus où les espaces dans la mémoire laissés par des objets morts sont ajoutés à une structure de données appelée liste libre. Une fois le marquage terminé, le GC trouve les espaces contigus laissés par les objets inaccessibles et les ajoute à la liste libre appropriée. Les listes libres sont séparées par la taille des segments de mémoire pour permettre une recherche rapide. Dans le futur, lorsque nous voudrons allouer de la mémoire, il nous suffira de consulter la liste libre et de trouver un segment de mémoire de taille appropriée.

### Compactage

La collecte de déchets majeure choisit également d'évacuer/compacter certaines pages, en fonction d'une heuristique de fragmentation. Vous pouvez penser au compactage comme à la défragmentation d'un disque dur sur un ancien PC. Nous copions les objets survivants dans d'autres pages qui ne sont pas actuellement compactées (en utilisant la liste libre pour cette page). Ainsi, nous pouvons utiliser les petits espaces dispersés dans la mémoire laissés par des objets morts.

Une faiblesse potentielle d'un collecteur d'ordures qui copie les objets survivants est que lorsque nous allouons beaucoup d'objets de longue durée, nous payons un coût élevé pour copier ces objets. C'est pourquoi nous choisissons de compacter uniquement certaines pages très fragmentées, et effectuons seulement un balayage sur les autres, ce qui ne copie pas les objets survivants.

## Disposition générationnelle

Le tas dans V8 est divisé en différentes régions appelées [générations](/blog/orinoco-parallel-scavenger). Il y a une jeune génération (à son tour divisée en sous-générations 'nurserie' et 'intermédiaire'), et une vieille génération. Les objets sont d'abord alloués dans la nurserie. S'ils survivent au prochain GC, ils restent dans la jeune génération mais sont considérés comme 'intermédiaires'. S'ils survivent encore à un autre GC, ils sont déplacés dans la vieille génération.

![Le tas de V8 est divisé en générations. Les objets passent à travers les générations lorsqu'ils survivent à un GC.](/_img/trash-talk/02.svg)

Dans la collecte des déchets, il y a un terme important : « L'hypothèse générationnelle ». Cela signifie essentiellement que la plupart des objets meurent jeunes. En d'autres termes, la plupart des objets sont alloués puis deviennent presque immédiatement inaccessibles du point de vue du GC. Cela s'applique non seulement à V8 ou à JavaScript, mais aussi à la plupart des langages dynamiques.

La disposition par générations du tas de V8 est conçue pour exploiter ce fait sur la durée de vie des objets. Le ramasse-miettes (GC) est un GC compactant/déplaçant, ce qui signifie qu'il copie les objets qui survivent à la collecte des ordures. Cela peut sembler contre-intuitif : copier des objets est coûteux au moment de la GC. Mais nous savons, selon l'hypothèse générationnelle, qu'un très faible pourcentage d'objets survivent réellement à une collecte de déchets. En ne déplaçant que les objets qui survivent, toutes les autres allocations deviennent implicitement des ordures. Cela signifie que nous ne payons un coût (pour la copie) que proportionnellement au nombre d'objets survivants, et non au nombre d'allocations.

## Petit GC (Scavenger)

Il existe deux ramasse-miettes dans V8. Le [**Grand GC (Mark-Compact)**](#major-gc) collecte les ordures de l'ensemble du tas. Le **Petit GC (Scavenger)** collecte les ordures dans la jeune génération. Le grand GC est efficace pour collecter les ordures dans l'ensemble du tas, mais l'hypothèse générationnelle nous indique que les objets nouvellement alloués nécessitent très probablement une collecte des ordures.

Dans le Scavenger, qui ne collecte qu'au sein de la jeune génération, les objets survivants sont toujours évacués vers une nouvelle page. V8 utilise une conception de 'semi-espace' pour la jeune génération. Cela signifie que la moitié de l'espace total est toujours vide, pour permettre cette étape d'évacuation. Lors d'une collecte, cette zone initialement vide est appelée 'To-Space'. La zone d'où nous copions est appelée 'From-Space'. Dans le pire des cas, chaque objet pourrait survivre à la collecte et nous devrions copier chaque objet.

Pour la collecte, nous avons un ensemble supplémentaire de racines qui sont les références de ancien-vers-nouveau. Ce sont des pointeurs dans l'espace ancien qui font référence à des objets dans la jeune génération. Plutôt que de tracer tout le graphe du tas pour chaque collecte, nous utilisons des [barrières d'écriture](https://www.memorymanagement.org/glossary/w.html#term-write-barrier) pour maintenir une liste des références de ancien-vers-nouveau. Combiné avec la pile et les globales, nous connaissons chaque référence dans la jeune génération, sans avoir besoin de tracer toute la génération ancienne.

L'étape d'évacuation déplace tous les objets survivants vers un bloc de mémoire contigu (au sein d'une page). Cela a l'avantage d'éliminer complètement la fragmentation - les lacunes laissées par les objets morts. Nous intervertissons ensuite les deux espaces, c'est-à-dire que 'To-Space' devient 'From-Space' et vice-versa. Une fois la GC terminée, les nouvelles allocations se produisent à la prochaine adresse libre dans le From-Space.

![Le Scavenger évacue les objets vivants vers une nouvelle page.](/_img/trash-talk/03.svg)

Avec cette stratégie seule, nous manquons rapidement d'espace dans la jeune génération. Les objets qui survivent à une deuxième GC sont évacués dans la génération ancienne, plutôt que dans 'To-Space'.

La dernière étape de la collecte consiste à mettre à jour les pointeurs qui font référence aux objets originaux, qui ont été déplacés. Chaque objet copié laisse une adresse de redirection qui est utilisée pour mettre à jour le pointeur original afin de pointer vers le nouvel emplacement.

![Le Scavenger évacue les objets « intermédiaires » dans la génération ancienne, et les objets « pépinières » vers une nouvelle page.](/_img/trash-talk/04.svg)

Lors de la collecte, nous exécutons en fait ces trois étapes — marquage, évacuation et mise à jour des pointeurs — de manière imbriquée, plutôt que dans des phases distinctes.

## Orinoco

La plupart de ces algorithmes et optimisations sont courants dans la littérature sur la collecte des ordures et peuvent être trouvés dans de nombreux langages à gestion automatique de la mémoire. Mais la collecte des ordures à la pointe de la technologie a parcouru un long chemin. Une métrique importante pour mesurer le temps passé dans la GC est la quantité de temps que le thread principal passe en pause pendant que la GC est exécutée. Pour les ramasse-miettes traditionnels « stop-the-world », ce temps peut vraiment s'accumuler, et ce temps passé à effectuer la GC nuit directement à l'expérience utilisateur sous forme de pages saccadées, de mauvais rendu et de latence élevée.

<figure>
  <img src="/_img/v8-orinoco.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logo d'Orinoco, le ramasse-miettes de V8</figcaption>
</figure>

Orinoco est le nom de code du projet GC pour utiliser les dernières techniques parallèles, incrémentales et concurrentes de collecte des ordures afin de libérer le thread principal. Certains termes ici ont une signification spécifique dans le contexte de la GC, et il vaut la peine de les définir en détail.

### Parallèle

Parallèle signifie que le thread principal et les threads d'assistance effectuent à peu près la même quantité de travail en même temps. C'est toujours une approche de type « stop-the-world », mais le temps de pause total est maintenant divisé par le nombre de threads participants (plus un certain coût pour la synchronisation). C'est la plus simple des trois techniques. Le tas JavaScript est en pause car aucun JavaScript n'est en cours d'exécution, donc chaque thread d'assistance doit simplement s'assurer qu'il synchronise l'accès à tout objet qu'un autre assistant pourrait également vouloir accéder.

![Le thread principal et les threads d'assistance travaillent sur la même tâche en même temps.](/_img/trash-talk/05.svg)

### Incrémental

L'incrémental consiste à ce que le thread principal effectue une petite quantité de travail par intermittence. Nous ne faisons pas un GC complet lors d'une pause incrémentale, mais juste une petite partie du travail total requis pour le GC. C'est plus difficile, car JavaScript s'exécute entre chaque segment de travail incrémental, ce qui signifie que l'état du tas a changé, ce qui pourrait invalider le travail précédent fait de manière incrémentale. Comme vous pouvez le voir dans le diagramme, cela ne réduit pas le temps passé sur le thread principal (en fait, cela l'augmente légèrement), mais cela le répartit dans le temps. C'est néanmoins une bonne technique pour résoudre un de nos problèmes initiaux : la latence du thread principal. En permettant à JavaScript de s'exécuter par intermittence tout en continuant les tâches de collecte des ordures, l'application peut toujours répondre aux entrées de l'utilisateur et progresser dans l'animation.

![De petits morceaux de la tâche du GC sont entrelacés dans l'exécution du thread principal.](/_img/trash-talk/06.svg)

### Concurrent

Le mode concurrent se produit lorsque le thread principal exécute constamment JavaScript et que des threads auxiliaires effectuent le travail de GC totalement en arrière-plan. C'est la plus difficile des trois techniques : n'importe quel élément sur le tas JavaScript peut changer à tout moment, invalidant le travail effectué auparavant. En plus de cela, il y a maintenant des courses de lecture/écriture à surveiller, car les threads auxiliaires et le thread principal lisent ou modifient simultanément les mêmes objets. L'avantage ici est que le thread principal est totalement libre d'exécuter JavaScript — bien qu'il y ait une surcharge mineure due à une synchronisation avec les threads auxiliaires.

![Les tâches de GC se font entièrement en arrière-plan. Le thread principal est libre d'exécuter JavaScript.](/_img/trash-talk/07.svg)

## État du GC dans V8

### Collecte rapide

Aujourd'hui, V8 utilise une collecte parallèle pour distribuer le travail sur les threads auxiliaires lors du GC de la jeune génération. Chaque thread reçoit un certain nombre de pointeurs qu'il suit, évacuant avidement tous les objets vivants vers To-Space. Les tâches de collecte doivent se synchroniser via des opérations atomiques de lecture/écriture/comparer-et-échanger lorsqu'elles tentent d'évacuer un objet ; une autre tâche de collecte pourrait avoir trouvé le même objet par un chemin différent et tenterait également de le déplacer. Le thread qui a réussi à déplacer l'objet met ensuite à jour le pointeur. Il laisse un pointeur de redirection afin que les autres travailleurs qui atteignent l'objet puissent mettre à jour les autres pointeurs lorsqu'ils les trouvent. Pour une allocation rapide sans synchronisation des objets survivants, les tâches de collecte utilisent des tampons d'allocation locaux au thread.

![La collecte parallèle distribue le travail de collecte entre plusieurs threads auxiliaires et le thread principal.](/_img/trash-talk/08.svg)

### GC majeur

Le GC majeur dans V8 commence par un marquage concurrent. À mesure que le tas approche d'une limite calculée dynamiquement, des tâches de marquage concurrent sont lancées. Chaque thread auxiliaire reçoit un certain nombre de pointeurs à suivre, et ils marquent chaque objet qu'ils trouvent en suivant toutes les références des objets découverts. Le marquage concurrent se déroule entièrement en arrière-plan pendant que JavaScript s'exécute sur le thread principal. [Les barrières d'écriture](https://dl.acm.org/citation.cfm?id=2025255) sont utilisées pour suivre les nouvelles références entre objets que JavaScript crée pendant que les threads auxiliaires marquent de manière concurrente.

![Le GC majeur utilise un marquage et un balayage concurrents, ainsi qu'une compression et une mise à jour des pointeurs parallèles.](/_img/trash-talk/09.svg)

Une fois le marquage concurrent terminé, ou lorsque nous atteignons la limite d'allocation dynamique, le thread principal effectue une étape rapide de finalisation du marquage. La pause du thread principal commence lors de cette phase. Cela représente la durée totale de pause du GC majeur. Le thread principal scanne à nouveau les racines pour s'assurer que tous les objets vivants sont marqués, puis, avec plusieurs threads auxiliaires, commence une compression parallèle et une mise à jour des pointeurs. Toutes les pages dans l'espace ancien ne sont pas éligibles pour la compression — celles qui ne le sont pas seront balayées en utilisant les listes libres mentionnées précédemment. Le thread principal lance des tâches de balayage concurrent pendant la pause. Ces tâches s'exécutent en concurrence avec les tâches de compression parallèles et avec le thread principal lui-même — elles peuvent continuer même lorsque JavaScript est en cours d'exécution sur le thread principal.

## GC en temps de repos

Les utilisateurs de JavaScript n'ont pas d'accès direct au ramasse-miettes ; sa mise en œuvre est totalement définie par l'implémentation. Cependant, V8 fournit un mécanisme permettant à l'incorporateur de déclencher la collecte des ordures, même si le programme JavaScript lui-même ne le peut pas. Le GC peut poster des 'Idle Tasks' qui sont des tâches facultatives qui seraient déclenchées de toute façon. Les incorporateurs, comme Chrome, pourraient avoir une notion de temps libre ou inactif. Par exemple, dans Chrome, à 60 images par seconde, le navigateur dispose d'environ 16,6 ms pour rendre chaque image d'une animation. Si le travail d'animation est terminé plus tôt, Chrome peut choisir d'exécuter certaines de ces tâches inactives créées par le GC pendant le temps libre avant la prochaine image.

![Le GC en temps de repos utilise le temps libre sur le thread principal pour effectuer de manière proactive le travail du GC.](/_img/trash-talk/10.svg)

Pour plus de détails, consultez [notre publication approfondie sur le GC en temps de repos](https://queue.acm.org/detail.cfm?id=2977741).

## Points à retenir

Le collecteur de déchets dans V8 a parcouru un long chemin depuis sa création. L'ajout de techniques parallèles, incrémentielles et concurrentes au GC existant a été un effort de plusieurs années, mais il a porté ses fruits, transférant une grande partie du travail aux tâches en arrière-plan. Cela a considérablement amélioré les temps de pause, la latence et le chargement des pages, rendant l'animation, le défilement et l'interaction utilisateur beaucoup plus fluides. Le [Scavengeur parallèle](/blog/orinoco-parallel-scavenger) a réduit le temps total de collecte des déchets de la jeune génération sur le thread principal d'environ 20%–50%, selon la charge de travail. Le [GC en temps de repos](/blog/free-garbage-collection) peut réduire la mémoire du tas JavaScript de Gmail de 45% lorsqu'il est inactif. Le [balisage et balayage concurrent](/blog/jank-busters) a réduit les temps de pause dans les jeux WebGL lourds jusqu'à 50%.

Mais le travail ici n'est pas terminé. Réduire les temps de pause de la collecte des déchets reste important pour offrir aux utilisateurs la meilleure expérience sur le web, et nous explorons des techniques encore plus avancées. En plus de cela, Blink (le moteur de rendu de Chrome) dispose également d'un collecteur de déchets (appelé Oilpan), et nous travaillons à améliorer la [coopération](https://dl.acm.org/citation.cfm?doid=3288538.3276521) entre les deux collecteurs et à importer certaines des nouvelles techniques d'Orinoco vers Oilpan.

La plupart des développeurs n'ont pas besoin de penser au GC lorsqu'ils développent des programmes JavaScript, mais comprendre certains des aspects internes peut vous aider à réfléchir à l'utilisation de la mémoire et à des modèles de programmation utiles. Par exemple, avec la structure générationnelle du tas V8, les objets de courte durée sont en réalité très peu coûteux du point de vue du collecteur de déchets, car nous ne payons qu'aux objets qui survivent à la collecte. Ce type de modèle fonctionne bien pour de nombreux langages utilisant des collecteurs de déchets, pas seulement JavaScript.
