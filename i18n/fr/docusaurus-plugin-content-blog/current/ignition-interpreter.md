---
title: 'Allumer l'interpréteur Ignition'
author: 'Ross McIlroy, Jump Starter d'Ignition V8'
avatars:
  - 'ross-mcilroy'
date: 2016-08-23 13:33:37
tags:
  - internals
description: 'Avec l'interpréteur Ignition, V8 compile les fonctions JavaScript en un bytecode concis, dont la taille est entre 50 % et 25 % de celle du code machine de référence équivalent.'
---
Les moteurs JavaScript modernes comme V8 obtiennent leur vitesse grâce à la [compilation juste-à-temps (JIT)](https://en.wikipedia.org/wiki/Just-in-time_compilation) du script en code machine natif immédiatement avant l'exécution. Initialement, le code est compilé par un compilateur basique, qui peut générer rapidement du code machine non optimisé. Le code compilé est analysé pendant l'exécution et éventuellement re-compilé dynamiquement avec un compilateur optimisé plus avancé pour une performance maximale. Dans V8, ce pipeline d'exécution de scripts comporte une variété de cas particuliers et de conditions nécessitant une mécanique complexe pour basculer entre le compilateur de base et deux compilateurs optimisés, Crankshaft et TurboFan.

<!--truncate-->
Un des problèmes de cette approche (en plus de la complexité architecturale) est que le code machine JIT peut consommer une quantité significative de mémoire, même si le code n'est exécuté qu'une fois. Pour atténuer cet surcoût, l'équipe V8 a construit un nouvel interpréteur JavaScript, appelé Ignition, qui peut remplacer le compilateur de base de V8, exécuter le code avec une empreinte mémoire réduite, et ouvrir la voie à un pipeline d'exécution de scripts plus simple.

Avec Ignition, V8 compile les fonctions JavaScript en un bytecode concis, dont la taille est entre 50 % et 25 % de celle du code machine de référence équivalent. Ce bytecode est ensuite exécuté par un interpréteur haute performance qui fournit des vitesses d'exécution sur des sites Web réels proches de celles du code généré par le compilateur de base existant de V8.

Dans Chrome 53, Ignition sera activé pour les appareils Android ayant une RAM limitée (512 Mo ou moins), où les économies de mémoire sont les plus nécessaires. Les résultats des premières expériences sur le terrain montrent qu'Ignition réduit la mémoire de chaque onglet Chrome d'environ 5 %.

![Pipeline de compilation de V8 avec Ignition activé](/_img/ignition-interpreter/ignition-pipeline.png)

## Détails

Lors de la conception de l'interpréteur de bytecode d'Ignition, l'équipe a envisagé un certain nombre d'approches potentielles de mise en œuvre. Un interpréteur traditionnel, écrit en C++, ne pourrait pas interagir efficacement avec le reste du code généré de V8. Une alternative aurait été de coder manuellement l'interpréteur en langage assembleur, cependant étant donné que V8 supporte neuf ports d'architecture, cela aurait impliqué un surcoût substantiel en ingénierie.

Nous avons plutôt opté pour une approche qui tire parti de la force de TurboFan, notre nouveau compilateur optimisé, qui est déjà conçu pour une interaction optimale avec le runtime de V8 et les autres codes générés. L'interpréteur Ignition utilise les instructions macro-assembleur indépendantes de l'architecture de TurboFan pour générer des gestionnaires de bytecode pour chaque opcode. TurboFan compile ces instructions pour l'architecture cible, en effectuant la sélection des instructions bas-niveau et l'allocation des registres machine dans le processus. Cela donne un code d'interpréteur hautement optimisé qui peut exécuter les instructions de bytecode et interagir avec le reste de la machine virtuelle V8 d'une manière à faible surcoût, avec un minimum de nouvelle mécanique ajoutée à la base de code.

Ignition est une machine à registres, chaque bytecode spécifiant ses entrées et sorties comme opérandes explicites de registres, contrairement à une machine à pile où chaque bytecode consommerait des entrées et pousserait des sorties sur une pile implicite. Un registre accumulateur spécial est un registre d'entrée et de sortie implicite pour de nombreux bytecodes. Cela réduit la taille des bytecodes en évitant le besoin de spécifier des opérandes de registres spécifiques. Étant donné que de nombreuses expressions JavaScript impliquent des chaînes d'opérations évaluées de gauche à droite, les résultats temporaires de ces opérations peuvent souvent rester dans l'accumulateur tout au long de l'évaluation de l'expression, minimisant ainsi les besoins d'opérations qui chargent et stockent dans des registres explicites.

À mesure que le bytecode est généré, il passe par une série d'étapes d'optimisation intégrées. Ces étapes effectuent une analyse simple sur le flux de bytecode, remplaçant des motifs courants par des séquences plus rapides, supprimant certaines opérations redondantes et minimisant le nombre de charges et de transferts de registres inutiles. Ensemble, ces optimisations réduisent encore la taille du bytecode et améliorent les performances.

Pour plus de détails sur la mise en œuvre d'Ignition, consultez notre présentation BlinkOn :

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/r5OWCtuKiAk" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

## Futur

Jusqu'à présent, notre objectif pour Ignition a été de réduire la surcharge mémoire de V8. Cependant, l'ajout d'Ignition à notre pipeline d'exécution de scripts ouvre un certain nombre de possibilités futures. Le pipeline Ignition a été conçu pour nous permettre de prendre des décisions plus intelligentes sur le moment d'exécuter et d'optimiser le code afin d'accélérer le chargement des pages Web, de réduire les saccades et de rendre l'échange entre les différents composants de V8 plus efficace.

Restez à l'écoute pour les futurs développements d'Ignition et de V8.
