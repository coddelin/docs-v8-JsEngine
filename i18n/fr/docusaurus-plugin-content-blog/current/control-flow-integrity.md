---
title: 'Intégrité du flux de contrôle dans V8'
description: 'Cet article de blog aborde les plans pour implémenter l'intégrité du flux de contrôle dans V8.'
author: 'Stephen Röttger'
date: 2023-10-09
tags:
 - sécurité
---
L'intégrité du flux de contrôle (CFI) est une fonctionnalité de sécurité visant à empêcher les attaques exploitant les détournements de flux de contrôle. L'idée est que même si un attaquant parvient à corrompre la mémoire d'un processus, des vérifications d'intégrité supplémentaires peuvent les empêcher d'exécuter du code arbitraire. Dans cet article de blog, nous souhaitons discuter de notre travail pour activer le CFI dans V8.

<!--truncate-->
# Contexte

La popularité de Chrome en fait une cible précieuse pour les attaques 0-day, et la plupart des exploits vus à l'état sauvage ciblent V8 pour obtenir une exécution initiale de code. Les exploits V8 suivent généralement un modèle similaire : un bug initial conduit à une corruption de mémoire, mais souvent celle-ci est limitée et l'attaquant doit trouver un moyen de lire/écrire de manière arbitraire dans tout l'espace d'adresses. Cela leur permet de détourner le flux de contrôle et d'exécuter du shellcode qui constitue l'étape suivante de la chaîne d'exploit visant à sortir du bac à sable Chrome.


Pour empêcher l'attaquant de transformer une corruption de mémoire en exécution de shellcode, nous mettons en œuvre l'intégrité du flux de contrôle dans V8. Cela est particulièrement difficile en présence d'un compilateur JIT. Si vous transformez des données en code machine à l'exécution, il faut désormais s'assurer que les données corrompues ne se transforment pas en code malveillant. Heureusement, les fonctionnalités matérielles modernes nous fournissent les éléments de base pour concevoir un compilateur JIT robuste, même lorsque la mémoire est corrompue.


Ci-dessous, nous examinerons le problème divisé en trois parties distinctes :

- **CFI des bords avant** vérifie l'intégrité des transferts de contrôle indirects tels que les appels de pointeurs de fonction ou de tables virtuelles.
- **CFI des bords arrière** doit s'assurer que les adresses de retour lues depuis la pile sont valides.
- **Intégrité mémoire du JIT** valide toutes les données écrites en mémoire exécutable à l'exécution.

# CFI des bords avant

Nous souhaitons utiliser deux fonctionnalités matérielles pour protéger les appels et sauts indirects : les pads d'atterrissage et l'authentification des pointeurs.


## Pads d'atterrissage

Les pads d'atterrissage sont des instructions spéciales qui peuvent être utilisées pour marquer des cibles de branche valides. Si activés, les branches indirectes peuvent uniquement sauter vers une instruction de pad d'atterrissage, tout autre cas déclenchera une exception.
Par exemple, sur ARM64, les pads d'atterrissage sont disponibles avec la fonctionnalité Identification de Cible de Branche (BTI) introduite dans Armv8.5-A. Le support BTI est [déjà activé](https://bugs.chromium.org/p/chromium/issues/detail?id=1145581) dans V8.
Sur x64, les pads d'atterrissage ont été introduits avec le suivi des branches indirectes (IBT) dans le cadre de la Technologie de Renforcement du Flux de Contrôle (CET).


Cependant, l'ajout de pads d'atterrissage sur toutes les cibles potentielles pour des branches indirectes ne fournit qu'une intégrité de flux de contrôle grossière et donne toujours beaucoup de liberté aux attaquants. Nous pouvons resserrer davantage les restrictions en ajoutant des vérifications des signatures de fonction (les types d'arguments et de retour sur le site d'appel doivent correspondre à ceux de la fonction appelée) ainsi qu'en supprimant dynamiquement les instructions de pad d'atterrissage inutiles à l'exécution.
Ces fonctionnalités font partie de la récente [proposition FineIBT](https://arxiv.org/abs/2303.16353) et nous espérons qu'elle puisse être adoptée par les OS.

## Authentification des pointeurs

Armv8.3-A a introduit l'authentification des pointeurs (PAC) qui peut être utilisée pour intégrer une signature dans les bits supérieurs inutilisés d'un pointeur. Étant donné que la signature est vérifiée avant que le pointeur ne soit utilisé, les attaquants ne pourront pas fournir des pointeurs falsifiés arbitraires à des branches indirectes.

# CFI des bords arrière

Pour protéger les adresses de retour, nous souhaitons également utiliser deux fonctionnalités matérielles distinctes : les piles d'ombres et le PAC.

## Piles d'ombres

Avec les piles d'ombres d'Intel CET et la pile de contrôle gardée (GCS) dans [Armv9.4-A](https://community.arm.com/arm-community-blogs/b/architectures-and-processors-blog/posts/arm-a-profile-architecture-2022), nous pouvons avoir une pile séparée juste pour les adresses de retour qui bénéficie de protections matérielles contre les écritures malveillantes. Ces fonctionnalités offrent de solides protections contre les écrasements d'adresses de retour, mais nous devrons gérer les cas où nous modifions légitimement la pile de retour, comme lors de l'optimisation/désoptimisation et de la gestion des exceptions.

## Authentification des pointeurs (PAC-RET)

Comme pour les branches indirectes, l'authentification des pointeurs peut être utilisée pour signer les adresses de retour avant qu'elles ne soient poussées dans la pile. Cela est [déjà activé](https://bugs.chromium.org/p/chromium/issues/detail?id=919548) dans V8 sur les CPU ARM64.


Un effet secondaire de l'utilisation du support matériel pour le CFI des bords avant et arrière est qu'il nous permettra de maintenir l'impact sur les performances au minimum.

# Intégrité mémoire du JIT

Un défi unique pour CFI dans les compilateurs JIT est que nous devons écrire du code machine sur de la mémoire exécutable au moment de l'exécution. Nous devons protéger la mémoire de telle sorte que le compilateur JIT soit autorisé à y écrire, mais que le primitive d'écriture mémoire de l'attaquant ne le puisse pas. Une approche naïve consisterait à modifier temporairement les permissions de la page pour ajouter/supprimer l'accès en écriture. Mais cela est intrinsèquement sujet à des conditions de course, car nous devons supposer que l'attaquant peut déclencher une écriture arbitraire en parallèle depuis un second thread.


## Permissions Mémoire Par Thread

Sur les processeurs modernes, nous pouvons avoir différentes vues des permissions mémoire qui ne s'appliquent qu'au thread actuel et peuvent être rapidement modifiées en espace utilisateur.
Sur les processeurs x64, cela peut être réalisé avec des clés de protection mémoire (pkeys) et ARM a annoncé les [extensions d'incrustation des permissions](https://community.arm.com/arm-community-blogs/b/architectures-and-processors-blog/posts/arm-a-profile-architecture-2022) dans Armv8.9-A.
Cela nous permet d'activer/désactiver de manière fine l'accès en écriture à la mémoire exécutable, par exemple en la marquant avec une pkey distincte.


Les pages JIT ne sont désormais plus accessibles en écriture par l'attaquant, mais le compilateur JIT doit encore y écrire le code généré. Dans V8, le code généré réside dans les [AssemblerBuffers](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/codegen/assembler.h;l=255;drc=064b9a7903b793734b6c03a86ee53a2dc85f0f80) sur le tas qui peuvent à la place être corrompus par l'attaquant. Nous pourrions protéger les AssemblerBuffers de la même manière, mais cela déplace simplement le problème. Par exemple, nous devrions ensuite également protéger la mémoire où le pointeur vers l'AssemblerBuffer réside.
En fait, tout code qui active l'accès en écriture à une mémoire protégée de cette manière constitue une surface d'attaque pour le CFI et doit être codé de manière très défensive. Par exemple, toute écriture vers un pointeur provenant d'une mémoire non protégée entraîne un échec total, car l'attaquant peut l'utiliser pour corrompre la mémoire exécutable. Ainsi, notre objectif de conception est d'avoir le moins de sections critiques possibles et de maintenir le code interne court et autonome.

## Validation du Flux de Contrôle

Si nous ne voulons pas protéger toutes les données du compilateur, nous pouvons supposer qu'elles ne sont pas fiables du point de vue du CFI. Avant d'écrire quoi que ce soit sur une mémoire exécutable, nous devons valider que cela ne mène pas à un flux de contrôle arbitraire. Cela inclut, par exemple, vérifier que le code écrit n'exécute aucune instruction syscall ou qu'il ne saute pas dans un code arbitraire. Bien sûr, nous devons également vérifier qu'il ne change pas les permissions pkey du thread actuel. Notez que nous ne cherchons pas à empêcher le code de corrompre une mémoire arbitraire, car si le code est corrompu, nous pouvons supposer que l'attaquant dispose déjà de cette capacité.
Pour effectuer cette validation en toute sécurité, nous devrons également conserver les métadonnées requises dans une mémoire protégée ainsi que protéger les variables locales sur la pile.
Nous avons effectué quelques tests préliminaires pour évaluer l’impact d’une telle validation sur les performances. Heureusement, la validation ne se produit pas dans des chemins de code critiques pour les performances, et nous n’avons observé aucune régression dans les benchmarks jetstream ou speedometer.

# Évaluation

La recherche en sécurité offensive est une partie essentielle de toute conception d'atténuation, et nous essayons continuellement de trouver de nouvelles façons de contourner nos protections. Voici quelques exemples d'attaques qui, selon nous, seront possibles, et des idées pour y faire face.

## Arguments Syscall Corrompus

Comme mentionné précédemment, nous supposons qu'un attaquant peut déclencher une primitive d'écriture mémoire en parallèle avec d'autres threads en cours d'exécution. Si un autre thread effectue un syscall, certains des arguments pourraient alors être contrôlés par l'attaquant s'ils sont lus à partir de la mémoire. Chrome fonctionne avec un filtre syscall restrictif, mais il existe encore quelques syscalls qui pourraient être utilisés pour contourner les protections CFI.


Par exemple, Sigaction est un syscall pour enregistrer des gestionnaires de signaux. Au cours de notre recherche, nous avons constaté qu'un appel sigaction dans Chrome est accessible de manière conforme au CFI. Étant donné que les arguments sont passés en mémoire, un attaquant pourrait déclencher ce chemin de code et pointer la fonction du gestionnaire de signaux vers un code arbitraire. Heureusement, nous pouvons y remédier facilement : soit bloquer le chemin vers l'appel sigaction, soit le bloquer avec un filtre syscall après l'initialisation.


D'autres exemples intéressants sont les syscalls de gestion mémoire. Par exemple, si un thread appelle munmap sur un pointeur corrompu, l'attaquant pourrait désaffecter des pages en lecture seule, et un appel mmap consécutif peut réutiliser cette adresse, ajoutant effectivement des permissions d'écriture à la page.
Certains systèmes d'exploitation fournissent déjà des protections contre cette attaque avec le scellement de la mémoire : les plateformes Apple proposent le drapeau [VM\_FLAGS\_PERMANENT](https://github.com/apple-oss-distributions/xnu/blob/1031c584a5e37aff177559b9f69dbd3c8c3fd30a/osfmk/mach/vm_statistics.h#L274), et OpenBSD dispose d'un syscall [mimmutable](https://man.openbsd.org/mimmutable.2).

## Corruption de Cadre de Signal

Lorsque le noyau exécute un gestionnaire de signaux, il sauvegarde l'état actuel du processeur sur la pile utilisateur. Un second thread pourrait corrompre l'état sauvegardé, qui sera ensuite restauré par le noyau.
Protéger contre cela dans l’espace utilisateur semble difficile si les données du cadre de signal ne sont pas fiables. À ce stade, il faudrait toujours quitter ou écraser le cadre de signal avec un état connu pour pouvoir revenir.
Une approche plus prometteuse consisterait à protéger la pile de signal en utilisant des permissions mémoire par thread. Par exemple, une sigaltstack étiquetée avec pkey protégerait contre les écrasements malveillants, mais cela nécessiterait que le noyau autorise temporairement les permissions d'écriture lors de la sauvegarde de l'état du processeur dessus.

# v8CTF

Ce ne sont là que quelques exemples d'attaques potentielles que nous travaillons à contrer et nous souhaitons également en apprendre davantage de la communauté de la sécurité. Si cela vous intéresse, essayez de participer au [v8CTF](https://security.googleblog.com/2023/10/expanding-our-exploit-reward-program-to.html) récemment lancé ! Exploitez V8 et gagnez une récompense, les exploits ciblant des vulnérabilités n-day sont explicitement pris en compte !
