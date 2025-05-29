---
title: 'Une année avec Spectre : une perspective V8'
author: 'Ben L. Titzer et Jaroslav Sevcik'
avatars:
  - 'ben-titzer'
  - 'jaroslav-sevcik'
date: 2019-04-23 14:15:22
tags:
  - sécurité
tweet: '1120661732836499461'
description: 'L'équipe V8 détaille leur analyse et leur stratégie d'atténuation pour Spectre, l'un des principaux problèmes de sécurité informatique de 2018.'
---
Le 3 janvier 2018, Google Project Zero et d'autres [ont révélé](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html) les trois premières failles d'une nouvelle classe de vulnérabilités affectant les CPU utilisant l'exécution spéculative, nommées [Spectre](https://spectreattack.com/spectre.pdf) et [Meltdown](https://meltdownattack.com/meltdown.pdf). En exploitant les mécanismes d'[exécution spéculative](https://fr.wikipedia.org/wiki/Ex%C3%A9cution_sp%C3%A9culative) des CPU, un attaquant pouvait temporairement contourner les vérifications implicites et explicites de sécurité dans le code empêchant les programmes de lire des données non autorisées en mémoire. Bien que la spéculation des processeurs ait été conçue comme un détail microarchitectural, invisible au niveau architectural, des programmes soigneusement conçus pouvaient lire des informations non autorisées lors de la spéculation et les divulguer via des canaux auxiliaires comme le temps d'exécution d'un fragment de programme.

<!--truncate-->
Lorsque l'on a démontré que JavaScript pouvait être utilisé pour lancer des attaques Spectre, l'équipe V8 s'est impliquée dans la résolution du problème. Nous avons formé une équipe de réponse d'urgence et avons travaillé en étroite collaboration avec d'autres équipes chez Google, nos partenaires d'autres fournisseurs de navigateurs et nos partenaires matériels. Avec eux, nous nous sommes engagés de manière proactive dans des recherches offensives (création de gadgets de preuve de concept) et des recherches défensives (mesures d'atténuation pour d'éventuelles attaques).

Une attaque Spectre se compose de deux parties :

1. _Fuite de données inaccessibles dans un état caché du CPU._ Toutes les attaques Spectre connues utilisent la spéculation pour faire fuiter des bits de données inaccessibles dans les caches du CPU.
1. _Extraction de l'état caché_ pour récupérer les données inaccessibles. Pour cela, l'attaquant a besoin d'une horloge d'une précision suffisante. (Des horloges à résolution étonnamment faible peuvent être suffisantes, en particulier avec des techniques telles que le seuil de bordure.)

En théorie, il suffirait de supprimer l'un des deux composants d'une attaque. Comme nous ne connaissons aucun moyen de supprimer totalement l'une des parties, nous avons conçu et déployé des mesures d'atténuation qui réduisent considérablement la quantité d'informations divulguées dans les caches CPU _et_ des mesures d'atténuation qui rendent difficile la récupération de l'état caché.

## Minuteries à haute précision

Les minuscules changements d'état pouvant survivre à l'exécution spéculative se traduisent par des différences de synchronisation correspondantes très faibles, presque impossibles — de l'ordre d'un milliardième de seconde. Pour détecter directement de telles différences, un programme attaquant a besoin d'une minuterie à haute précision. Les CPU offrent de telles minuteries, mais la plateforme Web ne les expose pas. La minuterie la plus précise de la plateforme Web, `performance.now()`, avait une résolution de quelques microsecondes, considérée initialement comme inutilisable à cette fin. Cependant, il y a deux ans, une équipe de recherche académique spécialisée dans les attaques microarchitecturales a publié [un article](https://gruss.cc/files/fantastictimers.pdf) qui étudiait la disponibilité des minuteries dans la plateforme Web. Ils ont conclu que la mémoire partagée mutable concurrente et diverses techniques de récupération de résolution pouvaient permettre de construire des minuteries d'une résolution encore plus élevée, jusqu'à la nanoseconde. De telles minuteries sont suffisamment précises pour détecter les succès et échecs individuels du cache L1, qui est généralement le moyen par lequel les gadgets Spectre divulguent des informations.

## Atténuations des minuteries

Pour perturber la capacité à détecter de faibles différences de synchronisation, les fournisseurs de navigateurs ont adopté une approche multi-volets. Sur tous les navigateurs, la résolution de `performance.now()` a été réduite (dans Chrome, de 5 microsecondes à 100), et un bruit aléatoire uniforme a été introduit pour empêcher la récupération de résolution. Après une consultation entre tous les fournisseurs, nous avons décidé ensemble de prendre une mesure sans précédent : désactiver immédiatement et rétroactivement l'API `SharedArrayBuffer` sur tous les navigateurs afin d'empêcher la construction d'une minuterie à nanosecondes pouvant être utilisée pour des attaques Spectre.

## Amplification

Il est apparu clairement dès nos recherches offensives que les atténuations des minuteries seules ne seraient pas suffisantes. Une des raisons est qu'un attaquant peut simplement exécuter son gadget à plusieurs reprises pour que la différence de temps cumulée soit bien plus grande qu'un seul succès ou échec de cache. Nous avons pu concevoir des gadgets fiables utilisant de nombreuses lignes de cache en même temps, jusqu'à la capacité du cache, produisant des différences de temps atteignant 600 microsecondes. Nous avons ensuite découvert des techniques d'amplification arbitraires qui ne sont pas limitées par la capacité du cache. Ces techniques d'amplification reposent sur de multiples tentatives de lecture des données secrètes.

## Atténuations JIT

Pour lire des données inaccessibles en utilisant Spectre, l'attaquant trompe le CPU pour qu'il exécute spéculativement du code qui lit des données normalement inaccessibles et les encode dans le cache. L'attaque peut être contrée de deux manières :

1. Empêcher l'exécution spéculative du code.
1. Empêcher l'exécution spéculative de lire des données inaccessibles.

Nous avons expérimenté la méthode (1) en insérant les instructions de barrière de spéculation recommandées, telles que `LFENCE` d'Intel, sur chaque branche conditionnelle critique, et en utilisant des [retpolines](https://support.google.com/faqs/answer/7625886) pour les branches indirectes. Malheureusement, ces mesures drastiques réduisent considérablement les performances (ralentissement de 2 à 3× sur le benchmark Octane). Nous avons préféré la méthode (2), en insérant des séquences de mitigation qui empêchent la lecture de données secrètes en raison d'une mauvaise spéculation. Illustrons la technique avec l'extrait de code suivant :

```js
if (condition) {
  return a[i];
}
```

Pour simplifier, supposons que la condition soit `0` ou `1`. Le code ci-dessus est vulnérable si le CPU lit spéculativement de `a[i]` lorsque `i` est hors limites, accédant à des données normalement inaccessibles. L'observation importante ici est que, dans ce cas, la spéculation essaie de lire `a[i]` lorsque la condition est `0`. Notre mitigation réécrit ce programme pour qu'il fonctionne exactement comme le programme original, mais sans divulguer aucune donnée chargée spéculativement.

Nous réservons un registre CPU que nous appelons le poison pour suivre si le code s'exécute dans une branche mal prédite. Le registre poison est maintenu à travers toutes les branches et appels dans le code généré, de sorte que toute branche mal prédite fait que le registre poison devient `0`. Ensuite, nous instrumentons tous les accès à la mémoire pour qu'ils masquent inconditionnellement le résultat de toutes les lectures avec la valeur actuelle du registre poison. Cela n'empêche pas le processeur de prédire (ou de mal prédire) les branches, mais détruit l'information des valeurs chargées (potentiellement hors limites) en raison de branches mal prédites. Le code instrumenté est montré ci-dessous (en supposant que `a` soit un tableau de nombres).

```js/0,3,4
let poison = 1;
// …
if (condition) {
  poison *= condition;
  return a[i] * poison;
}
```

Le code additionnel n'a aucun effet sur le comportement normal (défini architecturalement) du programme. Il affecte uniquement l'état micro-architectural lorsqu'il s'exécute sur des CPU spéculatifs. Si le programme a été instrumenté au niveau du code source, les optimisations avancées des compilateurs modernes pourraient supprimer cette instrumentation. Dans V8, nous empêchons notre compilateur de supprimer les mitigations en les insérant dans une phase très tardive de la compilation.

Nous utilisons également la technique de poison pour empêcher les fuites des branches indirectes mal spéculées dans la boucle de dispatch du bytecode de l'interpréteur et dans la séquence d'appel des fonctions JavaScript. Dans l'interpréteur, nous définissons le poison à `0` si le gestionnaire de bytecode (c'est-à-dire la séquence de code machine qui interprète un seul bytecode) ne correspond pas au bytecode actuel. Pour les appels JavaScript, nous passons la fonction cible en tant que paramètre (dans un registre) et nous définissons le poison à `0` au début de chaque fonction si la fonction cible entrante ne correspond pas à la fonction actuelle. Avec les mitigations de poison en place, nous constatons un ralentissement de moins de 20 % sur le benchmark Octane.

Les mitigations pour WebAssembly sont plus simples, puisque la principale vérification de sécurité consiste à s'assurer que les accès mémoire sont en limites. Pour les plateformes 32 bits, en plus des vérifications normales des limites, nous remplissons toutes les mémoires jusqu'à la prochaine puissance de deux et masquons inconditionnellement tous les bits supérieurs d'un indice de mémoire fourni par l'utilisateur. Les plateformes 64 bits n'ont pas besoin de telles mitigations, car l'implémentation utilise la protection de mémoire virtuelle pour les vérifications de limites. Nous avons expérimenté la compilation des instructions switch/case en code de recherche binaire plutôt qu'en utilisant une branche indirecte potentiellement vulnérable, mais cela est trop coûteux sur certaines charges de travail. Les appels indirects sont protégés par des retpolines.

## Les mitigations logicielles sont une voie insoutenable

Heureusement ou malheureusement, nos recherches offensives ont progressé beaucoup plus rapidement que nos recherches défensives, et nous avons rapidement découvert que la mitigation logicielle de toutes les fuites possibles dues à Spectre était inenvisageable. Cela était dû à plusieurs raisons. Premièrement, l'effort d'ingénierie consacré à lutter contre Spectre était disproportionné par rapport à son niveau de menace. Dans V8, nous faisons face à de nombreuses autres menaces de sécurité bien plus graves, telles que des lectures hors limites directes dues à des bugs réguliers (plus rapides et plus directes que Spectre), des écritures hors limites (impossible avec Spectre, et pire) et une exécution de code à distance potentielle (impossible avec Spectre et bien plus grave). Deuxièmement, les mitigations de plus en plus compliquées que nous avons conçues et mises en œuvre ont entraîné une complexité significative, qui constitue une dette technique et pourrait en réalité augmenter la surface d'attaque ainsi que les surcoûts de performance. Troisièmement, tester et maintenir les mitigations contre les fuites microarchitecturales est encore plus difficile que de concevoir les gadgets eux-mêmes, car il est difficile de s'assurer que les mitigations continuent de fonctionner comme prévu. Au moins une fois, des mitigations importantes ont été effectivement annulées par des optimisations ultérieures du compilateur. Quatrièmement, nous avons constaté que la mitigation efficace de certaines variantes de Spectre, en particulier la variante 4, était simplement irréalisable via logiciel, même après un effort héroïque de nos partenaires chez Apple pour lutter contre le problème dans leur compilateur JIT.

## Isolation des sites

Nos recherches ont conclu que, en principe, un code non fiable peut lire l'intégralité de l'espace d'adressage d'un processus en utilisant Spectre et des canaux latéraux. Les mitigations logicielles réduisent l'efficacité de nombreux gadgets potentiels, mais ne sont ni efficaces ni exhaustives. La seule mitigation efficace consiste à déplacer les données sensibles en dehors de l'espace d'adressage du processus. Heureusement, Chrome avait déjà entrepris un effort depuis plusieurs années pour séparer les sites dans différents processus afin de réduire la surface d'attaque due aux vulnérabilités traditionnelles. Cet investissement a porté ses fruits, et nous avons industrialisé et déployé [l'isolation des sites](https://developers.google.com/web/updates/2018/07/site-isolation) sur autant de plateformes que possible en mai 2018. Ainsi, le modèle de sécurité de Chrome ne suppose plus la confidentialité imposée par le langage au sein d'un processus de rendu.

Spectre a été un long voyage et a mis en valeur la meilleure collaboration entre les fournisseurs de l'industrie et le monde académique. Jusqu'à présent, les chapeaux blancs semblent en avance sur les chapeaux noirs. Nous ne connaissons toujours aucune attaque dans la nature, en dehors des expérimentations curieuses et des chercheurs professionnels développant des gadgets de preuve de concept. De nouvelles variantes de ces vulnérabilités continuent d'apparaître progressivement, et cela pourrait se poursuivre pendant un certain temps. Nous continuons de suivre ces menaces et de les prendre au sérieux.

Comme beaucoup ayant un background en langages de programmation et leurs implémentations, l'idée que les langages sécurisés imposent une frontière d'abstraction appropriée, ne permettant pas aux programmes bien typés de lire une mémoire arbitraire, a été une garantie sur laquelle nos modèles mentaux ont été construits. Il est déprimant de conclure que nos modèles étaient faux — cette garantie n'est pas vraie sur le matériel actuel. Bien sûr, nous croyons toujours que les langages sécurisés offrent de grands avantages en ingénierie et continueront à être la base de l'avenir, mais… sur le matériel actuel, ils fuient un peu.

Les lecteurs intéressés peuvent approfondir les détails dans [notre article scientifique](https://arxiv.org/pdf/1902.05178.pdf).
