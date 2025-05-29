---
title: "Compression des pointeurs dans V8"
author: "Igor Sheludko et Santiago Aboy Solanes, *les* compresseurs de pointeurs"
avatars: 
  - "igor-sheludko"
  - "santiago-aboy-solanes"
date: 2020-03-30
tags: 
  - internes
  - mémoire
description: "V8 a réduit la taille de son tas jusqu'à 43 % ! Découvrez comment dans “Compression des pointeurs dans V8”!"
tweet: "1244653541379182596"
---
Il existe une bataille constante entre mémoire et performance. En tant qu'utilisateurs, nous souhaitons que les choses soient rapides tout en consommant le moins de mémoire possible. Malheureusement, améliorer la performance se fait généralement au détriment de la consommation de mémoire (et vice versa).

<!--truncate-->
En 2014, Chrome est passé d'un processus 32 bits à un processus 64 bits. Cela a apporté à Chrome une meilleure [sécurité, stabilité et performance](https://blog.chromium.org/2014/08/64-bits-of-awesome-64-bit-windows_26.html), mais cela a eu un coût en mémoire car chaque pointeur occupe désormais huit octets au lieu de quatre. Nous avons relevé le défi de réduire cet surcoût dans V8 afin de récupérer autant que possible ces quatre octets perdus.

Avant de plonger dans l'implémentation, nous devons savoir où nous en sommes pour évaluer correctement la situation. Pour mesurer notre mémoire et notre performance, nous utilisons un ensemble de [pages web](https://v8.dev/blog/optimizing-v8-memory) qui reflètent des sites web populaires dans le monde réel. Les données montrent que V8 contribue jusqu'à 60 % de la consommation de mémoire du processus [rendereur de Chrome](https://www.chromium.org/developers/design-documents/multi-process-architecture) sur le bureau, avec une moyenne de 40 %.

![Pourcentage de consommation de mémoire de V8 dans la mémoire renderer de Chrome](/_img/pointer-compression/memory-chrome.svg)

La compression des pointeurs est l'un des nombreux efforts en cours dans V8 pour réduire la consommation de mémoire. L'idée est très simple : au lieu de stocker des pointeurs 64 bits, nous pouvons stocker des offsets 32 bits par rapport à une adresse de “base”. Avec une idée aussi simple, combien pouvons-nous gagner avec une telle compression dans V8 ?

Le tas V8 contient une foule d'éléments comme des valeurs en virgule flottante, des caractères de chaîne, du bytecode de l'interpréteur et des valeurs étiquetées (voir la section suivante pour plus de détails). En inspectant le tas, nous avons découvert que sur des sites web réels, ces valeurs étiquetées occupent environ 70 % du tas V8 !

Examinons de plus près ce que sont ces valeurs étiquetées.

## Étiquetage des valeurs dans V8

Les valeurs JavaScript dans V8 sont représentées sous forme d'objets et sont allouées dans le tas de V8, qu'elles soient des objets, des tableaux, des nombres ou des chaînes. Cela nous permet de représenter toute valeur comme un pointeur vers un objet.

De nombreux programmes JavaScript effectuent des calculs sur des valeurs entières, comme l'incrémentation d'un index dans une boucle. Pour éviter d'avoir à allouer un nouvel objet nombre chaque fois qu'un entier est incrémenté, V8 utilise la technique bien connue de [l'étiquetage des pointeurs](https://en.wikipedia.org/wiki/Tagged_pointer) pour stocker des données supplémentaires ou alternatives dans les pointeurs du tas V8.

Les bits d'étiquette ont un double objectif : ils signalent soit des pointeurs forts/faibles vers des objets situés dans le tas V8, soit un petit entier. Ainsi, la valeur d'un entier peut être stockée directement dans la valeur étiquetée, sans avoir à allouer de stockage supplémentaire pour celle-ci.

V8 alloue toujours des objets dans le tas à des adresses alignées sur les mots, ce qui lui permet d'utiliser les 2 (ou 3, selon la taille du mot de la machine) bits les moins significatifs pour l'étiquetage. Sur les architectures 32 bits, V8 utilise le bit le moins significatif pour distinguer les Smis des pointeurs d'objets du tas. Pour les pointeurs du tas, il utilise le deuxième bit le moins significatif pour distinguer les références fortes des faibles :

<pre>
                        |----- 32 bits -----|
Pointer:                |_____adresse_____<b>w1</b>|
Smi:                    |___valeur_int31____<b>0</b>|
</pre>

où *w* est un bit utilisé pour distinguer les pointeurs forts des faibles.

À noter qu'une valeur Smi ne peut transporter qu'une charge utile de 31 bits, y compris le bit de signe. Dans le cas des pointeurs, nous avons 30 bits qui peuvent être utilisés comme charge utile d'adresse d'objet du tas. En raison de l'alignement sur les mots, la granularité d'allocation est de 4 octets, ce qui nous donne 4 Go d'espace adressable.

Sur les architectures 64 bits, les valeurs V8 ressemblent à ceci :

<pre>
            |----- 32 bits -----|----- 32 bits -----|
Pointer:    |________________adresse______________<b>w1</b>|
Smi:        |____valeur_int32____|000000000000000000<b>0</b>|
</pre>

Vous remarquerez qu'à la différence des architectures 32 bits, sur les architectures 64 bits, V8 peut utiliser 32 bits pour la charge utile des valeurs Smi. Les implications des Smis 32 bits sur la compression des pointeurs sont abordées dans les sections suivantes.

## Valeurs étiquetées compressées et nouveau modèle de tas

Avec la compression des pointeurs, notre objectif est de faire tenir deux types de valeurs étiquetées dans 32 bits sur les architectures 64 bits. Nous pouvons intégrer des pointeurs dans 32 bits en :

- garantissant que tous les objets V8 sont alloués dans une plage mémoire de 4 Go
- représentant les pointeurs comme des offsets dans cette plage

Avoir une telle limite stricte est regrettable, mais V8 dans Chrome a déjà une limite de 2 Go ou 4 Go sur la taille du tas V8 (selon la puissance de l’appareil sous-jacent), même sur des architectures 64 bits. D'autres intégrateurs de V8, tels que Node.js, peuvent nécessiter des tas plus grands. Si nous imposons un maximum de 4 Go, cela signifierait que ces intégrateurs ne peuvent pas utiliser la compression des pointeurs.

La question est maintenant de savoir comment mettre à jour la disposition du tas pour garantir que les pointeurs de 32 bits identifient de manière unique les objets V8.

### Disposition triviale du tas

Le schéma de compression trivial consisterait à allouer des objets dans les premiers 4 Go de l'espace d'adressage.

![Disposition triviale du tas](/_img/pointer-compression/heap-layout-0.svg)

Malheureusement, ce n'est pas une option pour V8, car le processus de rendu de Chrome peut avoir besoin de créer plusieurs instances V8 dans le même processus de rendu, par exemple pour les Web/Services Workers. Sinon, avec ce schéma, toutes ces instances V8 se retrouveraient à se disputer le même espace d'adressage de 4 Go, et donc une limite de mémoire de 4 Go serait imposée à toutes les instances V8 ensemble.

### Disposition du tas, version 1

Si nous organisons le tas de V8 dans une région contiguë de 4 Go de l'espace d'adresses ailleurs, alors un décalage de 32 bits **non signé** par rapport à la base identifie de manière unique le pointeur.

<figure>
  <img src="/_img/pointer-compression/heap-layout-1.svg" width="827" height="323" alt="" loading="lazy"/>
  <figcaption>Disposition du tas, base alignée au début</figcaption>
</figure>

Si nous nous assurons également que la base est alignée sur 4 Go, les 32 bits supérieurs restent identiques pour tous les pointeurs :

```
            |----- 32 bits -----|----- 32 bits -----|
Pointeur :  |________base_______|______offset_____w1|
```

Nous pouvons également rendre les Smis compressibles en limitant la charge utile des Smis à 31 bits et en la plaçant dans les 32 bits inférieurs. En gros, cela les rend similaires aux Smis sur des architectures 32 bits.

```
         |----- 32 bits -----|----- 32 bits -----|
Smi :    |sssssssssssssssssss|____int31_value___0|
```

où *s* est la valeur du signe de la charge utile Smi. Si nous avons une représentation avec extension de signe, nous pouvons compresser et décompresser les Smis avec simplement un décalage arithmétique d'un bit du mot de 64 bits.

Maintenant, nous pouvons voir que la demi-mot supérieure des pointeurs et des Smis est complètement définie par la demi-mot inférieure. Ainsi, nous pouvons stocker uniquement cette dernière en mémoire, réduisant de moitié la mémoire requise pour stocker une valeur marquée :

```
                    |----- 32 bits -----|----- 32 bits -----|
Pointeur compressé :                     |______offset_____w1|
Smi compressé :                          |____int31_value___0|
```

Étant donné que la base est alignée sur 4 Go, la compression n'est qu'une troncature :

```cpp
uint64_t tagged_non_compressé;
uint32_t tagged_compressé = uint32_t(tagged_non_compressé);
```

Le code de décompression, cependant, est un peu plus compliqué. Nous devons distinguer entre l'extension de signe pour les Smis et l’extension de zéro pour les pointeurs, ainsi que savoir s'il faut ou non ajouter la base.

```cpp
uint32_t tagged_compressé;

uint64_t tagged_non_compressé;
if (tagged_compressé & 1) {
  // cas du pointeur
  tagged_non_compressé = base + uint64_t(tagged_compressé);
} else {
  // cas du Smi
  tagged_non_compressé = int64_t(tagged_compressé);
}
```

Essayons de modifier le schéma de compression pour simplifier le code de décompression.

### Disposition du tas, version 2

Au lieu de placer la base au début des 4 Go, si nous plaçons la base au _milieu_, nous pouvons traiter la valeur compressée comme un décalage **signé** de 32 bits par rapport à la base. Notez que toute la réservation n'est plus alignée sur 4 Go, mais la base l'est.

![Disposition du tas, base alignée au milieu](/_img/pointer-compression/heap-layout-2.svg)

Dans cette nouvelle disposition, le code de compression reste le même.

Cependant, le code de décompression devient plus simple. L'extension de signe est désormais commune pour les cas de Smis et de pointeurs, et la seule branche consiste à savoir s'il faut ajouter la base dans le cas des pointeurs.

```cpp
int32_t tagged_compressé;

// Code commun pour les cas de pointeur et de Smi
int64_t tagged_non_compressé = int64_t(tagged_compressé);
if (tagged_non_compressé & 1) {
  // cas du pointeur
  tagged_non_compressé += base;
}
```

Les performances des branches dans le code dépendent de l'unité de prédiction des branches dans le CPU. Nous avons pensé que si nous devions implémenter la décompression de manière sans branche, nous pourrions obtenir de meilleures performances. Avec un peu de magie binaire, nous pouvons écrire une version sans branche du code ci-dessus :

```cpp
int32_t tagged_compressé;

// Code identique pour les cas de pointeur et de Smi
int64_t tagged_ext_sign = int64_t(tagged_compressé);
int64_t masque_selecteur = -(tagged_ext_sign & 1);
// Le masque est 0 dans le cas d’un Smi ou tout 1 dans le cas d’un pointeur
int64_t tagged_non_compressé =
    tagged_ext_sign + (base & masque_selecteur);
```

Nous avons alors décidé de commencer avec l'implémentation sans branche.

## Évolution des performances

### Performances initiales

Nous avons mesuré les performances sur [Octane](https://v8.dev/blog/retiring-octane#the-genesis-of-octane) — un benchmark de pointe que nous avons utilisé par le passé. Bien que nous ne concentrions plus autant sur l'amélioration des performances de pointe dans notre travail quotidien, nous ne voulons pas non plus régresser en termes de performances de pointe, en particulier pour quelque chose d'aussi critique en termes de performances que _tous les pointeurs_. Octane reste un bon benchmark pour cette tâche.

Ce graphique montre le score d'Octane sur l'architecture x64 pendant que nous optimisions et peaufinions l'implémentation de la compression des pointeurs. Dans le graphique, plus c'est haut, mieux c'est. La ligne rouge représente la version x64 avec des pointeurs pleine taille existants, tandis que la ligne verte illustre la version avec compression des pointeurs.

![Première série d'améliorations d'Octane](/_img/pointer-compression/perf-octane-1.svg)

Avec la première implémentation fonctionnelle, nous avions un écart de régression d'environ 35%.

#### Amélioration (1), +7%

Nous avons d'abord validé notre hypothèse « sans branchement, c'est plus rapide », en comparant la décompression sans branchement avec celle avec branchement. Il s'est avéré que notre hypothèse était fausse, et que la version avec branchement était 7% plus rapide sur x64. C'était une différence assez significative !

Examinons l'assemblage x64.

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| Décompression | Sans branchement         | Avec branchement             |
|---------------|-------------------------|------------------------------|
| Code          | ```asm                  | ```asm                       \
|               | movsxlq r11,[…]         | movsxlq r11,[…]              \
|               | movl r10,r11            | testb r11,0x1                \
|               | andl r10,0x1            | jz done                      \
|               | negq r10                | addq r11,r13                 \
|               | andq r10,r13            | done:                        \
|               | addq r11,r10            |                              | \
|               | ```                     | ```                          |
| Résumé        | 20 octets               | 13 octets                    |
| ^^            | 6 instructions exécutées| 3 ou 4 instructions exécutées|
| ^^            | pas de branchements     | 1 branchement                |
| ^^            | 1 registre additionnel  |                              |
<!-- markdownlint-enable no-space-in-code -->
:::

**r13** ici est un registre dédié utilisé pour la valeur de base. Remarquez que le code sans branchement est à la fois plus grand et nécessite plus de registres.

Sur Arm64, nous avons observé la même chose - la version avec branchement était clairement plus rapide sur des CPU puissants (bien que la taille du code soit identique dans les deux cas).

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| Décompression | Sans branchement         | Avec branchement             |
|---------------|-------------------------|------------------------------|
| Code          | ```asm                  | ```asm                       \
|               | ldur w6, […]            | ldur w6, […]                 \
|               | sbfx x16, x6, #0, #1    | sxtw x6, w6                  \
|               | and x16, x16, x26       | tbz w6, #0, #done            \
|               | add x6, x16, w6, sxtw   | add x6, x26, x6              \
|               |                         | done:                        \
|               | ```                     | ```                          |
| Résumé        | 16 octets               | 16 octets                    |
| ^^            | 4 instructions exécutées| 3 ou 4 instructions exécutées|
| ^^            | pas de branchements     | 1 branchement                |
| ^^            | 1 registre additionnel  |                              |
<!-- markdownlint-enable no-space-in-code -->
:::

Sur les appareils Arm64 bas de gamme, nous avons observé presque aucune différence de performance dans l'une ou l'autre direction.

Notre conclusion est la suivante : les prédicteurs de branchement des CPU modernes sont très efficaces, et la taille du code (en particulier la longueur du chemin d'exécution) a davantage influencé les performances.

#### Amélioration (2), +2%

[TurboFan](https://v8.dev/docs/turbofan) est le compilateur optimisant de V8, construit autour d'un concept appelé « Sea of Nodes ». En bref, chaque opération est représentée comme un nœud dans un graphe (Voir une version plus détaillée [dans cet article de blog](https://v8.dev/blog/turbofan-jit)). Ces nœuds ont diverses dépendances, y compris les flux de données et les flux de contrôle.

Il y a deux opérations cruciales pour la compression des pointeurs : Les chargements et les stockages, car ils connectent le tas V8 avec le reste du pipeline. Si nous devions décompresser chaque fois que nous chargions une valeur compressée du tas, et la compresser avant de la stocker, alors le pipeline pourrait continuer à fonctionner comme il le ferait autrement en mode plein-pointeur. Ainsi, nous avons ajouté de nouvelles opérations explicites de valeurs dans le graphe de nœuds - Décompresser et Compresser.

Il y a des cas où la décompression n'est pas vraiment nécessaire. Par exemple, si une valeur compressée est chargée d'un endroit pour être ensuite stockée dans un nouvel emplacement.

Afin d'optimiser les opérations inutiles, nous avons implémenté une nouvelle phase de « Élimination de la décompression » dans TurboFan. Son rôle est d'éliminer les décompressions suivies directement par des compressions. Puisque ces nœuds pourraient ne pas être directement adjacents, elle essaie également de propager les décompressions à travers le graphe, dans l'espoir de rencontrer une compression par la suite et de les éliminer toutes les deux. Cela nous a donné une amélioration de 2% du score d'Octane.

#### Amélioration (3), +2%

Pendant que nous examinions le code généré, nous avons remarqué que la décompression d'une valeur qui venait juste d'être chargée produisait un code un peu trop verbeux :

```asm
movl rax, <mem>   // charger
movlsxlq rax, rax // extension de signe
```

Une fois corrigé pour étendre le signe directement à partir de la valeur chargée en mémoire :

```asm
movlsxlq rax, <mem>
```

nous avons obtenu un autre gain de 2%.

#### Amélioration (4), +11%

Les phases d'optimisation de TurboFan fonctionnent par reconnaissance de schémas dans le graphe : une fois qu'un sous-graphe correspond à un certain schéma, il est remplacé par un sous-graphe ou une instruction équivalents sémantiquement (mais meilleurs).

Les tentatives infructueuses de trouver une correspondance ne constituent pas un échec explicite. La présence d'opérations explicites de décompression/compression dans le graphe a provoqué des échecs silencieux dans des correspondances de schémas auparavant réussies, entraînant des optimisations échouées.

Un exemple d'optimisation « cassée » était [l'optimisation précoce des allocations](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43823.pdf). Une fois mis à jour les schémas pour prendre en compte les nouveaux nœuds de compression/décompression, nous avons obtenu une amélioration de 11% supplémentaire.

### Améliorations supplémentaires

![Deuxième série d'améliorations d'Octane](/_img/pointer-compression/perf-octane-2.svg)

#### Amélioration (5), +0.5%

Lors de la mise en œuvre de l'élimination de la décompression dans TurboFan, nous avons beaucoup appris. L'approche explicite du nœud de décompression/compression avait les propriétés suivantes :

Avantages :

- Le caractère explicite de ces opérations nous a permis d'optimiser les décompressions inutiles grâce à la reconnaissance de schémas dans les sous-graphes.

Cependant, en continuant la mise en œuvre, nous avons découvert des inconvénients :

- Une explosion combinatoire des opérations de conversion possibles en raison des nouvelles représentations des valeurs internes devenues ingérables. Nous pouvions maintenant avoir des pointeurs compressés, des Smi compressés et des valeurs quelconques compressées (valeurs compressées pouvant être soit des pointeurs, soit des Smi), en plus de l'ensemble des représentations existantes (Smi balisé, pointeur balisé, valeur quelconque balisée, word8, word16, word32, word64, float32, float64, simd128).
- Certaines optimisations existantes basées sur la reconnaissance de schémas dans les graphes ne se déclenchaient pas silencieusement, ce qui entraînait des régressions ici et là. Bien que nous en ayons corrigé certaines, la complexité de TurboFan a continué de croître.
- L'allocation des registres était de plus en plus contrariée par la quantité de nœuds dans le graphe, et elle générait souvent du mauvais code.
- Les graphes de nœuds plus volumineux ralentissaient les phases d'optimisation de TurboFan et augmentaient la consommation de mémoire pendant la compilation.

Nous avons décidé de prendre du recul et de penser à un moyen plus simple de prendre en charge la compression de pointeurs dans TurboFan. La nouvelle approche consiste à abandonner les représentations de pointeurs/Smi/valeurs quelconques compressées, et à rendre tous les nœuds explicites de compression/décompression implicites dans les opérations de stockage et de chargement en supposant que nous décompressons toujours avant de charger et compressons avant de stocker.

Nous avons également ajouté une nouvelle phase dans TurboFan qui remplacerait celle de l'« élimination de la décompression ». Cette nouvelle phase reconnaîtrait les cas où nous n'avons pas réellement besoin de compresser ou de décompresser et mettrait à jour les opérations de stockage et de chargement en conséquence. Une telle approche a considérablement réduit la complexité du support de la compression de pointeurs dans TurboFan et a amélioré la qualité du code généré.

La nouvelle mise en œuvre était aussi efficace que la version initiale et a conduit à un gain supplémentaire de 0,5%.

#### Amélioration (6), +2.5%

Nous étions proches de l'équivalence de performance, mais l'écart persistait. Il nous fallait des idées nouvelles. L'une d'entre elles était la suivante : et si nous nous assurions que tout code manipulant des valeurs Smi ne « regarde » jamais les 32 bits supérieurs ?

Rappelons-nous de la mise en œuvre de la décompression :

```cpp
// Ancienne mise en œuvre de la décompression
int64_t uncompressed_tagged = int64_t(compressed_tagged);
if (uncompressed_tagged & 1) {
  // cas du pointeur
  uncompressed_tagged += base;
}
```

Si l'on ignore les 32 bits supérieurs d'un Smi, on peut les considérer comme indéfinis. Ainsi, nous pouvons éviter le traitement spécial entre les cas pointeur et Smi et ajouter inconditionnellement la base lors de la décompression, même pour les Smi ! Nous appelons cette approche « corruption des Smi ».

```cpp
// Nouvelle mise en œuvre de la décompression
int64_t uncompressed_tagged = base + int64_t(compressed_tagged);
```

En outre, puisque nous ne nous soucions plus de l'extension du signe du Smi, ce changement nous permet de revenir à la disposition de tas version 1. Celle-ci se caractérise par une base pointant au début de la réservation de 4 Go.

<figure>
  <img src="/_img/pointer-compression/heap-layout-1.svg" width="827" height="323" alt="" loading="lazy"/>
  <figcaption>Disposition du tas, base alignée au début</figcaption>
</figure>

En termes de code de décompression, cela change une opération d'extension de signe en une extension zéro, qui est tout aussi peu coûteuse. Cependant, cela simplifie les choses côté runtime (C++). Par exemple, le code de réservation de la région espace adressable (voir la section [Quelques détails de mise en œuvre](#some-implementation-details)).

Voici le code assembleur pour comparaison :

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| Décompression | Branche                        | Corruption Smi               |
|---------------|-------------------------------|-------------------------------|
| Code          | ```asm                        | ```asm                       \
|               | movsxlq r11,[…]               | movl r11,[rax+0x13]          \
|               | testb r11,0x1                 | addq r11,r13                 \
|               | jz done                       |                              | \
|               | addq r11,r13                  |                              | \
|               | done:                         |                              | \
|               | ```                           | ```                          |
| Résumé        | 13 octets                     | 7 octets                     |
| ^^            | 3 ou 4 instructions exécutées | 2 instructions exécutées     |
| ^^            | 1 branche                     | pas de branches              |
<!-- markdownlint-enable no-space-in-code -->
:::

Ainsi, nous avons adapté tous les morceaux de code utilisant Smi dans V8 au nouveau schéma de compression, ce qui nous a donné une amélioration supplémentaire de 2,5 %.

### Écart restant

L'écart de performance restant est expliqué par deux optimisations pour les versions 64 bits que nous avons dû désactiver en raison d'une incompatibilité fondamentale avec la compression de pointeurs.

![Dernière série d'améliorations d'Octane](/_img/pointer-compression/perf-octane-3.svg)

#### Optimisation des Smis 32 bits (7), -1%

Rappelons à quoi ressemblent les Smis en mode pointeur complet sur les architectures 64 bits.

```
        |----- 32 bits -----|----- 32 bits -----|
Smi:    |____valeur_int32___|0000000000000000000|
```

Les Smis 32 bits ont les avantages suivants :

- ils peuvent représenter une plage d'entiers plus grande sans avoir besoin de les encapsuler dans des objets numériques ; et
- cette forme fournit un accès direct à la valeur 32 bits lors de la lecture/écriture.

Cette optimisation ne peut pas être réalisée avec la compression de pointeurs, car il n'y a pas d'espace dans le pointeur compressé 32 bits en raison du bit qui distingue les pointeurs des Smis. Si nous désactivons les Smis 32 bits dans la version 64 bits à pointeur complet, nous constatons une régression de 1% dans le score Octane.

#### Décompression des champs double (8), -3%

Cette optimisation tente de stocker les valeurs en virgule flottante directement dans les champs de l'objet sous certaines hypothèses. Cela a pour objectif de réduire le nombre d'allocation d'objets numériques encore plus que les Smis seuls ne le permettent.

Imaginez le code JavaScript suivant :

```js
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const p = new Point(3.1, 5.3);
```

En général, si nous regardons l'objet `p` dans la mémoire, nous verrons quelque chose comme ceci :

![Objet `p` dans la mémoire](/_img/pointer-compression/heap-point-1.svg)

Vous pouvez en apprendre davantage sur les classes cachées et les propriétés et magasins d'éléments dans [cet article](https://v8.dev/blog/fast-properties).

Sur les architectures 64 bits, les valeurs en double sont de la même taille que les pointeurs. Donc, si nous supposons que les champs de Point contiennent toujours des valeurs numériques, nous pouvons les stocker directement dans les champs de l'objet.

![](/_img/pointer-compression/heap-point-2.svg)

Si l'hypothèse devient fausse pour un champ donné, disons après l'exécution de cette ligne :

```js
const q = new Point(2, 'ab');
```

alors les valeurs numériques pour la propriété y doivent être stockées de manière encapsulée. De plus, si du code optimisé de manière spéculative repose sur cette hypothèse, il ne doit plus être utilisé et doit être abandonné (désoptimisé). La raison de cette généralisation du « type de champ » est de minimiser le nombre de formes d'objets créées à partir de la même fonction constructeur, ce qui est nécessaire pour une performance plus stable.

![Objets `p` et `q` dans la mémoire](/_img/pointer-compression/heap-point-3.svg)

Si appliquée, la décompression des champs double offre les avantages suivants :

- fournit un accès direct aux données en virgule flottante via le pointeur d'objet, évitant la désallocation supplémentaire via l'objet numérique ; et
- permet de générer du code optimisé plus petit et plus rapide pour des boucles serrées nécessitant beaucoup d'accès aux champs double (par exemple, dans des applications de calcul numérique)

Avec la compression de pointeurs activée, les valeurs doubles ne tiennent tout simplement plus dans les champs compressés. Cependant, à l'avenir, nous pourrons adapter cette optimisation pour la compression de pointeurs.

Notez que le code de calcul numérique nécessitant une grande capacité de traitement pourrait être réécrit de manière optimisable, même sans cette optimisation de décompression de champs doubles (dans une manière compatible avec la compression de pointeurs), en stockant les données dans des `TypedArrays` Float64, ou même en utilisant [Wasm](https://webassembly.github.io/spec/core/).

#### Plus d'améliorations (9), 1%

Enfin, un peu de réglage fin de l'optimisation d'élimination de la décompression dans TurboFan a permis d'obtenir une amélioration de performance supplémentaire de 1%.

## Quelques détails d'implémentation

Afin de simplifier l'intégration de la compression des pointeurs dans le code existant, nous avons décidé de décompresser les valeurs à chaque chargement et de les compresser à chaque sauvegarde. Ainsi, nous ne changeons que le format de stockage des valeurs marquées tout en conservant le format d'exécution inchangé.

### Côté code natif

Afin de pouvoir générer un code efficace lorsque la décompression est requise, la valeur de base doit toujours être disponible. Heureusement, V8 disposait déjà d'un registre dédié pointant toujours vers une « table des racines » contenant des références aux objets JavaScript et internes de V8 qui doivent être toujours accessibles (par exemple, undefined, null, true, false et bien d'autres). Ce registre est appelé « registre racine » et est utilisé pour générer un code plus petit et [partageable des fonctions intégrées](https://v8.dev/blog/embedded-builtins).

Ainsi, nous avons placé la table des racines dans la zone de réservation du tas de V8 et le registre racine est devenu utilisable pour les deux objectifs - comme pointeur racine et comme valeur de base pour la décompression.

### Côté C++

Le runtime de V8 accède aux objets dans le tas V8 via des classes C++ offrant une vue pratique sur les données stockées dans le tas. Notez que les objets V8 ressemblent davantage à des structures [POD](https://en.wikipedia.org/wiki/Passive_data_structure) qu'à des objets C++. Les classes « vues » contiennent simplement un champ uintptr_t avec une valeur marquée respective. Étant donné que les classes vues sont de la taille d’un mot, nous pouvons les transmettre par valeur sans surcharge (merci beaucoup aux compilateurs modernes de C++).

Voici un exemple pseudo de classe d'assistance :

```cpp
// Classe cachée
class Map {
 public:
  …
  inline DescriptorArray instance_descriptors() const;
  …
  // La valeur réelle du pointeur marqué stockée dans l'objet Map.
  const uintptr_t ptr_;
};

DescriptorArray Map::instance_descriptors() const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uintptr_t da = *reinterpret_cast<uintptr_t*>(field_address);
  return DescriptorArray(da);
}
```

Afin de minimiser le nombre de modifications nécessaires pour une première exécution de la version compressée des pointeurs, nous avons intégré le calcul de la valeur de base requise pour la décompression dans les accesseurs.

```cpp
inline uintptr_t GetBaseForPointerCompression(uintptr_t address) {
  // Arrondir l'adresse vers le bas à 4 Go.
  const uintptr_t kBaseAlignment = 1 << 32;
  return address & -kBaseAlignment;
}

DescriptorArray Map::instance_descriptors() const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uint32_t compressed_da = *reinterpret_cast<uint32_t*>(field_address);

  uintptr_t base = GetBaseForPointerCompression(ptr_);
  uintptr_t da = base + compressed_da;
  return DescriptorArray(da);
}
```

Les mesures de performances ont confirmé que le calcul de la base à chaque chargement affecte les performances. La raison est que les compilateurs C++ ne savent pas que le résultat de l'appel de GetBaseForPointerCompression() est le même pour toute adresse provenant du tas V8 et par conséquent, le compilateur n'est pas en mesure de fusionner les calculs des valeurs de base. Étant donné que le code consiste en plusieurs instructions et une constante de 64 bits, cela entraîne un gonflement significatif du code.

Pour résoudre ce problème, nous avons réutilisé le pointeur d'instance V8 comme base pour la décompression (en nous rappelant les données de l'instance V8 dans la structure du tas). Ce pointeur est généralement disponible dans les fonctions runtime, donc nous avons simplifié le code des accesseurs en exigeant un pointeur d'instance V8, ce qui a corrigé les régressions :

```cpp
DescriptorArray Map::instance_descriptors(const Isolate* isolate) const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uint32_t compressed_da = *reinterpret_cast<uint32_t*>(field_address);

  // Aucun arrondi n'est nécessaire car le pointeur Isolate est déjà la base.
  uintptr_t base = reinterpret_cast<uintptr_t>(isolate);
  uintptr_t da = DecompressTagged(base, compressed_value);
  return DescriptorArray(da);
}
```

## Résultats

Jetons un coup d'œil aux chiffres finaux de la compression des pointeurs ! Pour ces résultats, nous utilisons les mêmes tests de navigation que nous avons introduits au début de cet article de blog. Pour rappel, ce sont des scénarios d'utilisation de navigation que nous avons jugés représentatifs de l'utilisation de sites web réels.

Dans ces tests, nous avons constaté que la compression des pointeurs réduit **la taille du tas V8 jusqu'à 43 %** ! En conséquence, elle réduit **la mémoire du processus de rendu de Chrome jusqu'à 20 %** sur Desktop.

![Économies de mémoire lors de la navigation sous Windows 10](/_img/pointer-compression/v8-heap-memory.svg)

Un autre point important à noter est que tous les sites web n'améliorent pas de la même manière. Par exemple, la mémoire du tas V8 était plus importante sur Facebook que sur le New York Times, mais avec la compression des pointeurs, c'est en fait l'inverse. Cette différence peut s'expliquer par le fait que certains sites web ont plus de valeurs marquées que d'autres.

En plus de ces améliorations en matière de mémoire, nous avons également constaté des améliorations réelles des performances. Sur des sites web réels, nous utilisons moins de CPU et de temps de collecteur de déchets !

![Améliorations du temps CPU et de la collecte des déchets](/_img/pointer-compression/performance-improvements.svg)

## Conclusion

Le chemin pour arriver ici n'a pas été un long fleuve tranquille, mais cela en valait la peine. [300+ commits](https://github.com/v8/v8/search?o=desc&q=repo%3Av8%2Fv8+%22%5Bptr-compr%5D%22&s=committer-date&type=Commits) plus tard, V8 avec la Compression des Pointeurs utilise autant de mémoire que si nous faisions tourner une application 32 bits, tout en ayant les performances d'une application 64 bits.

Nous cherchons toujours à améliorer les choses et avons les tâches connexes suivantes dans notre pipeline :

- Améliorer la qualité du code assembleur généré. Nous savons que dans certains cas, nous pouvons générer moins de code, ce qui devrait améliorer les performances.
- Traiter les régressions de performance associées, en incluant un mécanisme permettant de déboxer à nouveau des champs de type double d'une manière compatible avec la compression des pointeurs.
- Explorer l'idée de prendre en charge des tas plus grands, dans la gamme de 8 à 16 Go.
