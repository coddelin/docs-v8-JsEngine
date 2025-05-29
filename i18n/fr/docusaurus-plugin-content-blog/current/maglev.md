---
title: &apos;Maglev - Le JIT d’Optimisation le Plus Rapide de V8&apos;
author: &apos;[Toon Verwaest](https://twitter.com/tverwaes), [Leszek Swirski](https://twitter.com/leszekswirski), [Victor Gomes](https://twitter.com/VictorBFG), Olivier Flückiger, Darius Mercadier et Camillo Bruni — pas trop de cuisiniers pour gâcher la sauce&apos;
avatars:
  - toon-verwaest
  - leszek-swirski
  - victor-gomes
  - olivier-flueckiger
  - darius-mercadier
  - camillo-bruni
date: 2023-12-05
tags:
  - JavaScript
description: "Le nouveau compilateur de V8, Maglev, améliore les performances tout en réduisant la consommation d&apos;énergie"
tweet: &apos;&apos;
---

Dans Chrome M117, nous avons introduit un nouveau compilateur d’optimisation : Maglev. Maglev se situe entre nos compilateurs existants Sparkplug et TurboFan, et joue le rôle d’un compilateur rapide d’optimisation qui génère un code suffisamment performant de manière suffisamment rapide.


# Contexte

Jusqu&apos;en 2021, V8 avait deux principaux niveaux d&apos;exécution : Ignition, l&apos;interpréteur ; et [TurboFan](/docs/turbofan), le compilateur d&apos;optimisation de V8 axé sur les performances maximales. Tout le code JavaScript est d&apos;abord compilé en bytecode Ignition, puis exécuté par interprétation. Pendant l&apos;exécution, V8 suit le comportement du programme, y compris les formes et types des objets. Les métadonnées d&apos;exécution et le bytecode sont ensuite utilisés par le compilateur d&apos;optimisation pour générer un code machine performant, souvent spéculatif, qui s&apos;exécute beaucoup plus rapidement que l&apos;interpréteur.

<!--truncate-->
Ces améliorations sont clairement visibles sur des benchmarks comme [JetStream](https://browserbench.org/JetStream2.1/), un ensemble de benchmarks JavaScript traditionnels mesurant le démarrage, la latence et les performances maximales. TurboFan aide V8 à exécuter le suite 4,35 fois plus rapidement ! JetStream insiste moins sur les performances maximales par rapport aux benchmarks passés (comme le [Octane benchmark retraité](/blog/retiring-octane)), mais en raison de la simplicité de nombreux éléments, le code optimisé reste celui où le temps est le plus passé.

[Speedometer](https://browserbench.org/Speedometer2.1/) est un type de benchmark différent de JetStream. Il est conçu pour mesurer la réactivité d&apos;une application web en chronométrant des interactions simulées de l&apos;utilisateur. Au lieu de petites applications JavaScript statiques autonomes, la suite se compose de pages web complètes, dont la plupart sont construites avec des frameworks populaires. Comme lors de la plupart des chargements de pages web, les éléments de Speedometer passent beaucoup moins de temps à exécuter des boucles JavaScript serrées et beaucoup plus de temps à exécuter un code qui interagit avec le reste du navigateur.

TurboFan a toujours beaucoup d&apos;impact sur Speedometer : il s&apos;exécute plus de 1,5 fois plus rapidement ! Mais l&apos;impact est nettement moindre que sur JetStream. Une partie de cette différence résulte du fait que les pages complètes [passent simplement moins de temps dans du pur JavaScript](/blog/real-world-performance#making-a-real-difference). Mais en partie, c&apos;est dû au fait que le benchmark passe beaucoup de temps dans des fonctions qui ne deviennent pas suffisamment chaudes pour être optimisées par TurboFan.

![Benchmarks de performance web comparant l&apos;exécution non optimisée et optimisée](/_img/maglev/I-IT.svg)

::: note
Tous les scores des benchmarks dans ce post ont été mesurés avec Chrome 117.0.5897.3 sur un Macbook Air M2 de 13”.
:::

Étant donné la grande différence de vitesse d&apos;exécution et de temps de compilation entre Ignition et TurboFan, en 2021, nous avons introduit un nouveau JIT de base appelé [Sparkplug](/blog/sparkplug). Il est conçu pour compiler le bytecode en code machine équivalent presque instantanément.

Sur JetStream, Sparkplug améliore considérablement les performances par rapport à Ignition (+45%). Même lorsque TurboFan est également présent, nous constatons toujours une solide amélioration des performances (+8%). Sur Speedometer, nous voyons une amélioration de 41% par rapport à Ignition, le rapprochant des performances de TurboFan, et une amélioration de 22% par rapport à Ignition + TurboFan ! Étant donné que Sparkplug est si rapide, nous pouvons facilement le déployer très largement et obtenir une augmentation de vitesse constante. Si un code ne repose pas uniquement sur des boucles JavaScript longues et faciles à optimiser, c&apos;est un excellent ajout.

![Benchmarks de performance web avec Sparkplug ajouté](/_img/maglev/I-IS-IT-IST.svg)

La simplicité de Sparkplug impose une limite relativement basse sur l&apos;accélération qu&apos;il peut fournir. Cela est démontré par le grand écart entre Ignition + Sparkplug et Ignition + TurboFan.

C&apos;est là que Maglev entre en jeu, notre nouveau JIT d&apos;optimisation qui génère un code beaucoup plus rapide que celui de Sparkplug, mais qui est créé beaucoup plus rapidement que TurboFan.


# Maglev : Un Compilateur JIT Basé sur SSA Simple

Lorsque nous avons commencé ce projet, nous avons envisagé deux voies pour combler l'écart entre Sparkplug et TurboFan : soit essayer de générer un meilleur code en utilisant l'approche à passage unique adoptée par Sparkplug, soit construire un JIT avec une représentation intermédiaire (IR). Étant donné que nous estimions qu'une compilation sans IR limiterait fortement le compilateur, nous avons décidé d'opter pour une approche basée sur le SSA (assignation statique unique) relativement traditionnelle, utilisant un CFG (graphique de flux de contrôle) plutôt que la représentation plus flexible mais peu efficace en cache de TurboFan, appelée « mer de nœuds ».

Le compilateur lui-même est conçu pour être rapide et facile à développer. Il comporte un ensemble minimal de passes et un IR simple qui encode les sémantiques spécifiques de JavaScript.


## Prépassage

Tout d'abord, Maglev effectue un prépassage sur le bytecode afin d'identifier les cibles des branches, y compris les boucles, et les affectations aux variables dans les boucles. Cette passe recueille également des informations de vivacité, qui encodent quelles valeurs dans quelles variables sont encore nécessaires dans quelles expressions. Ces informations peuvent réduire la quantité d'état que le compilateur devra suivre plus tard.


## SSA

![Un extrait de l'affichage du graphique SSA de Maglev dans la ligne de commande](/_img/maglev/graph.svg)

Maglev effectue une interprétation abstraite de l'état du cadre, créant des nœuds SSA représentant les résultats de l'évaluation des expressions. Les affectations de variables sont simulées en stockant ces nœuds SSA dans le registre de l'interpréteur abstrait respectif. Dans le cas de branches et de commutateurs, tous les chemins sont évalués.

Lorsque plusieurs chemins se rejoignent, les valeurs des registres de l'interpréteur abstrait sont fusionnées en insérant des nœuds dits Phi : des nœuds de valeur qui savent quelle valeur choisir selon le chemin pris à l'exécution.

Les boucles peuvent fusionner les valeurs des variables « dans le passé », avec les données circulant de la fin de la boucle à l'entête de la boucle, dans le cas où des variables sont affectées dans le corps de la boucle. C'est là que les données du prépassage sont utiles : puisque nous savons déjà quelles variables sont affectées à l'intérieur des boucles, nous pouvons pré-créer les Phi de boucle avant même de commencer le traitement du corps de la boucle. À la fin de la boucle, nous pouvons remplir les entrées Phi avec le nœud SSA correct. Cela permet à la génération du graphique SSA d'être un passage frontal unique, réduisant le besoin de « corriger » les variables de boucle, tout en minimisant la quantité de nœuds Phi qui doivent être alloués.


## Informations connues sur les nœuds

Pour être aussi rapide que possible, Maglev fait le maximum en une seule fois. Au lieu de construire un graphique JavaScript générique pour ensuite le simplifier lors des phases ultérieures d'optimisation, approche théoriquement propre mais coûteuse en calcul, Maglev fait autant que possible directement lors de la construction du graphique.

Lors de la construction du graphique, Maglev observera les métadonnées des retours d'exécution collectées lors de l'exécution non optimisée et générera des nœuds SSA spécialisés pour les types observés. Si Maglev voit `o.x` et sait grâce au feedback d'exécution que `o` a toujours une forme spécifique, il générera un nœud SSA pour vérifier à l'exécution que `o` a toujours la forme attendue, suivi d'un nœud `LoadField` économique qui effectue un accès simple par décalage.

De plus, Maglev créera un nœud secondaire indiquant qu'il connaît maintenant la forme de `o`, rendant inutile de vérifier la forme à nouveau plus tard. Si Maglev rencontre ultérieurement une opération sur `o` qui, pour une raison quelconque, ne dispose pas de feedback, ce type d'information appris lors de la compilation peut servir de seconde source de feedback.

Les informations d'exécution peuvent se présenter sous diverses formes. Certaines informations doivent être vérifiées à l'exécution, comme la vérification de forme décrite précédemment. D'autres informations peuvent être utilisées sans vérifications d'exécution en enregistrant des dépendances au runtime. Les globales qui sont de facto constantes (non modifiées entre l'initialisation et le moment où leur valeur est vue par Maglev) entrent dans cette catégorie : Maglev n'a pas besoin de générer de code pour charger dynamiquement et vérifier leur identité. Maglev peut charger la valeur lors de la compilation et l'intégrer directement dans le code machine ; si le runtime modifie un jour cette globale, il prendra également soin d'invalider et de désoptimiser ce code machine.

Certaines formes d'informations sont « instables ». Ces informations ne peuvent être utilisées que dans la mesure où le compilateur sait avec certitude qu'elles ne peuvent pas changer. Par exemple, si nous venons d'allouer un objet, nous savons que c'est un nouvel objet et nous pouvons totalement ignorer les barrières d'écriture coûteuses. Une fois qu'une autre allocation potentielle a eu lieu, le collecteur de mémoire pourrait avoir déplacé l'objet, et nous devrons maintenant émettre ces vérifications. D'autres sont « stables » : si nous n'avons jamais vu un objet passer d'une certaine forme à une autre, nous pouvons enregistrer une dépendance à cet événement (tout objet quittant cette forme particulière) et éviter de revérifier la forme de l'objet, même après un appel à une fonction inconnue avec des effets secondaires inconnus.


## Désoptimisation

Étant donné que Maglev peut utiliser des informations spéculatives qu'il vérifie à l'exécution, le code Maglev doit pouvoir se désoptimiser. Pour que cela fonctionne, Maglev attache un état abstrait d'interprétation du cadre aux nœuds qui peuvent se désoptimiser. Cet état fait correspondre les registres d'interprétation aux valeurs SSA. Cet état se transforme en métadonnées lors de la génération de code, fournissant une correspondance entre l'état optimisé et l'état non optimisé. Le désoptimiseur interprète ces données, lit les valeurs du cadre d'interprétation et des registres machine, et les place aux endroits requis pour l'interprétation. Cela repose sur le même mécanisme de désoptimisation que celui utilisé par TurboFan, ce qui nous permet de partager la plupart de la logique et de bénéficier des tests du système existant.


## Sélection de la représentation

Les nombres JavaScript représentent, selon [la spécification](https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type), une valeur en virgule flottante de 64 bits. Cependant, cela ne veut pas dire que le moteur doit toujours les stocker en tant que nombres flottants de 64 bits, surtout puisque, en pratique, de nombreux nombres sont de petits entiers (par exemple, des indices de tableau). V8 tente de coder les nombres en tant qu'entiers marqués de 31 bits (appelés en interne "petits entiers" ou "Smi"), à la fois pour économiser de la mémoire (32 bits grâce à [la compression de pointeur](/blog/pointer-compression)) et pour optimiser les performances (les opérations sur les entiers sont plus rapides que celles sur les nombres à virgule flottante).

Pour rendre rapide le code JavaScript intensif en calculs numériques, il est important que des représentations optimales soient choisies pour les nœuds de valeurs. Contrairement à l'interpréteur et Sparkplug, le compilateur d'optimisation peut déboîter les valeurs une fois qu'il connaît leur type, en opérant sur des nombres bruts plutôt que sur des valeurs JavaScript représentant des nombres, et ne reboîte les valeurs que si nécessaire. Les flottants peuvent être directement transmis dans des registres en virgule flottante plutôt que d'allouer un objet dans le tas qui contient le flottant.

Maglev apprend la représentation des nœuds SSA principalement en examinant les retours d'exécution, par exemple sur des opérations binaires, et en propageant ces informations au travers du mécanisme Known Node Info. Lorsque des valeurs SSA avec des représentations spécifiques circulent dans des Phis, une représentation correcte qui prend en charge toutes les entrées doit être choisie. Les Phis de boucle sont encore compliqués, puisque les entrées provenant de la boucle sont vues après qu'une représentation devrait être choisie pour le Phi — le même problème "retour dans le temps" que pour la construction de graphe. C'est pourquoi Maglev a une phase distincte après la construction de graphe pour effectuer la sélection de représentation sur les Phis de boucle.


## Allocation de registres

Après la construction de graphe et la sélection de représentation, Maglev sait principalement quel type de code il souhaite générer, et est "terminé" du point de vue classique de l'optimisation. Pour pouvoir générer du code, cependant, nous devons choisir où résident effectivement les valeurs SSA lors de l'exécution du code machine ; quand elles sont dans des registres machine, et quand elles sont sauvegardées sur la pile. Cela est effectué via l'allocation de registres.

Chaque nœud Maglev a des exigences en matière d'entrée et de sortie, y compris des exigences sur les temporaires nécessaires. L'allocateur de registres effectue une seule traversée à l'avance du graphe, en maintenant un état abstrait des registres de machine pas trop différent de l'état abstrait d'interprétation maintenu pendant la construction de graphe, et répondra à ces exigences, en remplaçant les exigences du nœud par des emplacements réels. Ces emplacements peuvent ensuite être utilisés par la génération de code.

Tout d'abord, une pré-passe parcourt le graphe pour trouver les plages actives linéaires des nœuds, afin que nous puissions libérer les registres une fois qu'un nœud SSA n'est plus nécessaire. Cette pré-passe garde également une trace de la chaîne d'utilisations. Savoir à quel moment dans le futur une valeur est nécessaire peut être utile pour décider quelles valeurs prioriser, et lesquelles abandonner, lorsque nous manquons de registres.

Après la pré-passe, l'allocation de registres est exécutée. L'attribution des registres suit quelques règles simples et locales : Si une valeur est déjà dans un registre, ce registre est utilisé si possible. Les nœuds gardent trace des registres dans lesquels ils sont stockés pendant la traversée du graphe. Si le nœud n'a pas encore de registre, mais qu'un registre est libre, il est choisi. Le nœud est mis à jour pour indiquer qu'il est dans le registre, et l'état abstrait du registre est mis à jour pour savoir qu'il contient le nœud. S'il n'y a pas de registre libre, mais qu'un registre est requis, une autre valeur est poussée hors du registre. Idéalement, nous avons un nœud qui est déjà dans un registre différent, et pouvons le libérer "gratuitement" ; sinon, nous choisissons une valeur qui ne sera pas nécessaire avant longtemps, et la stockons sur la pile.

Lors des fusions de branches, les états abstraits des registres des branches entrantes sont fusionnés. Nous essayons de conserver autant de valeurs que possible dans les registres. Cela peut signifier que nous devons introduire des mouvements de registre à registre, ou que nous devrons désenregistrer des valeurs de la pile, en utilisant des mouvements appelés "gap moves". Si une fusion de branches possède un nœud Phi, l'allocation de registres assignera des registres de sortie aux Phis. Maglev préfère attribuer les mêmes registres aux sorties des Phis que ceux de leurs entrées, pour minimiser les mouvements.

Si plus de valeurs SSA sont actives que nous avons de registres, nous devrons sauvegarder certaines valeurs sur la pile et les restaurer plus tard. Dans l'esprit de Maglev, nous gardons les choses simples : si une valeur doit être sauvegardée, elle est rétroactivement informée de se sauvegarder immédiatement lors de sa définition (juste après que la valeur est créée), et la génération de code se chargera d'émettre le code de sauvegarde. La définition est garantie de 'dominer' toutes les utilisations de la valeur (pour arriver à l'utilisation, nous devons avoir passé par la définition et donc le code de sauvegarde). Cela signifie également qu'une valeur sauvegardée aura exactement un emplacement de sauvegarde pour toute la durée du code ; les valeurs ayant des durées de vie qui se chevauchent auront donc des emplacements de sauvegarde attribués qui ne se chevauchent pas.

En raison de la sélection de représentation, certaines valeurs dans le cadre Maglev seront des pointeurs marqués, des pointeurs que le GC de V8 comprend et doit prendre en compte ; et certaines seront non marquées, des valeurs que le GC ne devrait pas examiner. TurboFan gère cela en suivant avec précision les emplacements de pile contenant des valeurs marquées, et ceux contenant des valeurs non marquées, ce qui change au cours de l'exécution à mesure que les emplacements sont réutilisés pour différentes valeurs. Pour Maglev, nous avons décidé de simplifier les choses afin de réduire la mémoire requise pour le suivi : nous divisons le cadre de la pile en une région marquée et une région non marquée, et stockons uniquement ce point de séparation.


## Génération de code

Une fois que nous savons quelles expressions nous voulons générer en code et où nous voulons mettre leurs sorties et entrées, Maglev est prêt à générer du code.

Les nœuds Maglev savent directement comment générer du code assembleur en utilisant un « assembleur macro ». Par exemple, un nœud `CheckMap` sait comment émettre des instructions assembleur qui comparent la forme (appelée en interne la « carte ») d'un objet d'entrée avec une valeur connue, et désoptimiser le code si l'objet avait une forme incorrecte.

Une partie légèrement complexe du code traite des mouvements d'écart : Les mouvements demandés créés par l'allocateur de registres savent qu'une valeur se trouve quelque part et doit aller ailleurs. Si cependant il y a une séquence de tels mouvements, un mouvement précédent pourrait écraser l'entrée nécessaire par un mouvement subséquent. Le Résolveur de Mouvements Parallèles calcule comment effectuer les mouvements en toute sécurité afin que toutes les valeurs se retrouvent au bon endroit.


# Résultats

Le compilateur que nous venons de présenter est à la fois clairement beaucoup plus complexe que Sparkplug, et beaucoup plus simple que TurboFan. Comment se débrouille-t-il ?

En termes de vitesse de compilation, nous avons réussi à construire un JIT qui est environ 10 fois plus lent que Sparkplug, et 10 fois plus rapide que TurboFan.

![Comparaison du temps de compilation des niveaux de compilation, pour toutes les fonctions compilées dans JetStream](/_img/maglev/compile-time.svg)

Cela nous permet de déployer Maglev beaucoup plus tôt que nous ne voudrions déployer TurboFan. Si les retours sur lesquels il s'appuie ne se sont pas avérés très stables, il n'y a pas de coût énorme à désoptimiser et recompiler plus tard. Cela nous permet également d'utiliser TurboFan un peu plus tard : nous fonctionnons beaucoup plus rapidement que nous le ferions avec Sparkplug.

Positionner Maglev entre Sparkplug et TurboFan se traduit par des améliorations de benchmarks notables :

![Benchmarks de performance Web avec Maglev](/_img/maglev/I-IS-IT-IST-ISTM.svg)

Nous avons également validé Maglev sur des données réelles et constatons de bonnes améliorations sur [Core Web Vitals](https://web.dev/vitals/).

Étant donné que Maglev compile beaucoup plus rapidement, et puisque nous pouvons maintenant nous permettre d'attendre plus longtemps avant de compiler des fonctions avec TurboFan, cela entraîne un avantage secondaire qui n'est pas aussi visible en surface. Les benchmarks se concentrent sur la latence du thread principal, mais Maglev réduit également considérablement la consommation globale de ressources de V8 en utilisant moins de temps CPU hors thread. La consommation d'énergie d'un processus peut être facilement mesurée sur un MacBook basé sur les puces M1 ou M2 en utilisant `taskinfo`.

:::table-wrapper
| Benchmark   | Consommation d'énergie |
| :---------: | :--------------------: |
| JetStream   | -3.5%                  |
| Speedometer | -10%                   |
:::

Maglev n'est en aucun cas complet. Nous avons encore beaucoup de travail à faire, plus d'idées à essayer, et plus de fruits faciles à récolter — à mesure que Maglev devient plus complet, nous nous attendons à voir des scores plus élevés et une réduction supplémentaire de la consommation d'énergie.

Maglev est désormais disponible sur Chrome pour ordinateur et sera bientôt déployé sur les appareils mobiles.
