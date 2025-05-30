---
title: "Compression des pointeurs dans Oilpan"
author: "Anton Bikineev et Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), désassembleurs ambulants"
avatars: 
  - anton-bikineev
  - michael-lippautz
date: 2022-11-28
tags: 
  - internals
  - mémoire
  - cppgc
description: "La compression des pointeurs dans Oilpan permet de compresser les pointeurs C++ et de réduire la taille de la mémoire dynamique jusqu'à 33%."
tweet: "1597274125780893697"
---

> Il est absolument idiot d'avoir des pointeurs 64 bits lorsque je compile un programme qui utilise moins de 4 gigaoctets de RAM. Lorsque de telles valeurs de pointeur apparaissent à l'intérieur d'une structure, elles ne font pas seulement perdre la moitié de la mémoire, elles jettent effectivement la moitié du cache.
>
> – [Donald Knuth (2008)](https://cs.stanford.edu/~knuth/news08.html)

<!--truncate-->

Ces mots n'ont (presque) jamais été aussi vrais. Nous constatons également que les fabricants de processeurs n'expédient pas réellement de [processeurs 64 bits](https://en.wikipedia.org/wiki/64-bit_computing#Limits_of_processors) et que les OEM Android [optent pour un espace d'adresse de seulement 39 bits](https://www.kernel.org/doc/Documentation/arm64/memory.txt) pour accélérer les processus de table des pages dans le noyau. V8 fonctionnant sous Chrome [isole également les sites dans des processus séparés](https://www.chromium.org/Home/chromium-security/site-isolation/), ce qui limite davantage les besoins en espace d'adresse réel pour un onglet unique. Rien de tout cela n'est complètement nouveau cependant, c'est pourquoi nous avons lancé [la compression des pointeurs pour V8 en 2020](https://v8.dev/blog/pointer-compression) et avons constaté de grandes améliorations de la mémoire sur le web. Avec la bibliothèque [Oilpan](https://v8.dev/blog/oilpan-library), nous contrôlons un autre pilier du web. [Oilpan](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/README.md) est un ramasse-miettes basé sur le traçage pour C++, qui est entre autres utilisé pour héberger le modèle objet du document dans Blink et constitue ainsi une cible intéressante pour optimiser la mémoire.

## Contexte

La compression des pointeurs est un mécanisme permettant de réduire la taille des pointeurs sur les plateformes 64 bits. Les pointeurs dans Oilpan sont encapsulés dans un pointeur intelligent appelé [`Member`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/member.h). Dans une configuration de mémoire dynamique non compressée, les références `Member` pointent directement vers les objets en mémoire dynamique, c'est-à-dire que 8 octets de mémoire sont utilisés par référence. Dans un tel scénario, la mémoire dynamique peut être répartie sur l'ensemble de l'espace d'adresse puisque chaque pointeur contient toutes les informations nécessaires pour référencer un objet.

![Configuration de mémoire dynamique non compressée](/_img/oilpan-pointer-compression/uncompressed-layout.svg)

Avec une configuration de mémoire dynamique compressée, les références `Member` ne sont que des offsets dans une cage de mémoire dynamique, qui est une région continue de mémoire. La combinaison d'un pointeur de base (base) pointant vers le début de la cage de mémoire dynamique et d'un `Member` forme un pointeur complet, très similaire au fonctionnement de [l'adressage segmenté](https://en.wikipedia.org/wiki/Memory_segmentation#Segmentation_without_paging). La taille d'une cage de mémoire dynamique est limitée par les bits disponibles pour l'offset. Par exemple, une cage de mémoire dynamique de 4 Go nécessite des offsets de 32 bits.

![Configuration de mémoire dynamique compressée](/_img/oilpan-pointer-compression/compressed-layout.svg)

De manière pratique, les mémoires dynamiques Oilpan sont déjà contenues dans une telle cage de mémoire de 4 Go sur les plateformes 64 bits, permettant ainsi de référencer les métadonnées du ramasse-miettes en alignant simplement tout pointeur valide aux 4 Go les plus proches.

Oilpan prend également en charge plusieurs mémoires dynamiques dans le même processus pour, par exemple, prendre en charge les web workers avec leurs propres mémoires dynamiques C++ dans Blink. Le problème qui se pose dans cette configuration est de savoir comment mapper les mémoires dynamiques à de nombreuses cages de mémoire dynamique éventuelles. Étant donné que les mémoires dynamiques sont liées aux threads natifs dans Blink, la solution ici est de référencer les cages de mémoire dynamique via un pointeur de base local au thread. Selon la manière dont V8 et ses intégrateurs sont compilés, le modèle de stockage local au thread (TLS) peut être restreint pour accélérer la manière dont la base est chargée en mémoire. En fin de compte, le mode TLS le plus générique est toutefois nécessaire pour prendre en charge Android, car sur cette plateforme, le moteur de rendu (et donc V8) est chargé via `dlopen`. Ce sont de telles restrictions qui rendent l'utilisation du TLS infaisable d'un point de vue performance[^1]. Afin de fournir les meilleures performances, Oilpan, à l'instar de V8, alloue toutes les mémoires dynamiques dans une seule cage de mémoire dynamique lorsqu'on utilise la compression des pointeurs. Bien que cela limite la mémoire totale disponible, nous pensons que cela est actuellement acceptable étant donné que la compression des pointeurs vise déjà à réduire la mémoire. Si une seule cage de mémoire dynamique de 4 Go s'avère trop restrictive, le schéma de compression actuel permet d'augmenter la taille de la cage de mémoire dynamique à 16 Go sans compromettre les performances.

## Implémentation dans Oilpan

### Exigences

Jusqu'à présent, nous avons parlé d'un schéma de codage trivial où le pointeur complet est formé en ajoutant une base à un décalage qui est stocké dans un pointeur Member. Cependant, le schéma effectivement implémenté n'est malheureusement pas aussi simple, car Oilpan exige que Member puisse être attribué à l'une des valeurs suivantes :

1. Un pointeur de tas valide vers un objet;
2. Le `nullptr` de C++ (ou similaire);
3. Une valeur sentinelle qui doit être connue au moment de la compilation. La valeur sentinelle peut par exemple être utilisée pour signaler des valeurs supprimées dans des tables de hachage qui prennent aussi `nullptr` en entrée.

La partie problématique concernant `nullptr` et une sentinelle est l'absence de types explicites pour les détecter du côté de l'appelant :

```cpp
void* ptr = member.get();
if (ptr == nullptr) { /* ... * }
```

Étant donné qu'il n'existe pas de type explicite pour stocker une valeur `nullptr` éventuellement compressée, une décompression réelle est nécessaire pour la comparer à la constante.

En tenant compte de cet usage, nous recherchions un schéma gérant de manière transparente les cas 1 à 3. Comme la séquence de compression et de décompression sera intégrée partout où Member est utilisé, les propriétés suivantes sont également souhaitables :

- Une séquence d'instructions rapide et compacte pour minimiser les ratés dans le cache d'instruction.
- Une séquence d'instructions sans branchement pour éviter d'épuiser les prédicteurs de branchement.

Étant donné qu'il est prévu que les lectures dépassent significativement les écritures, nous permettons un schéma asymétrique où une décompression rapide est préférée.

### Compression et décompression

Pour des raisons de concision, cette description ne couvre que le schéma de compression final utilisé. Consultez notre [document de conception](https://docs.google.com/document/d/1neGN8Jq-1JLrWK3cvwRIfrSjLgE0Srjv-uq7Ze38Iao) pour plus d'informations sur les étapes qui nous ont conduits ici et les alternatives envisagées.

L'idée principale du schéma actuellement implémenté est de séparer les pointeurs de tas réguliers de `nullptr` et de la sentinelle en se basant sur l'alignement de la cage de tas. Essentiellement, la cage de tas est allouée avec un alignement tel que le bit de poids faible du demi-mot supérieur est toujours défini. Nous désignons les moitiés supérieure et inférieure (32 bits chacune) par U<sub>31</sub>...U<sub>0</sub> et L<sub>31</sub>...L<sub>0</sub>, respectivement.

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | moitié supérieure                          | moitié inférieure                          |
| ------------ | ---------------------------------------: | -----------------------------------------: |
| pointeur de tas | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt> |
| `nullptr`    | <tt>0...0</tt>                           | <tt>0...000</tt>                           |
| sentinelle   | <tt>0...0</tt>                           | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

La compression génère une valeur compressée en effectuant simplement un décalage à droite et en supprimant la moitié supérieure de la valeur. De cette manière, le bit d'alignement (qui devient maintenant le bit de poids fort de la valeur compressée) signale un pointeur de tas valide.

:::table-wrapper
| C++                                             | assembleur x64|
| :---------------------------------------------- | :------------ |
| ```cpp                                          | ```asm        \
| uint32_t Compress(void* ptr) \{                  | mov rax, rdi  \
|   return ((uintptr_t)ptr) >> 1;                 | shr rax       \
| \}                                               | ```           \
| ```                                             |               |
:::

L'encodage des valeurs compressées est donc le suivant :

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | valeur compressée                         |
| ------------ | -----------------------------------------: |
| pointeur de tas | <tt>1L<sub>31</sub>...L<sub>2</sub>00</tt> |
| `nullptr`    | <tt>0...00</tt>                            |
| sentinelle   | <tt>0...01</tt>                            |
<!-- markdownlint-enable no-inline-html -->
:::

Notez que cela permet de déterminer si une valeur compressée représente un pointeur de tas, un `nullptr`, ou la valeur sentinelle, ce qui est important pour éviter des décompressions inutiles dans le code utilisateur (voir ci-dessous).

L'idée pour la décompression est alors de s'appuyer sur un pointeur de base spécialement conçu, dans lequel les 32 bits de poids faible sont définis à 1.

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | moitié supérieure                          | moitié inférieure |
| ------------ | ---------------------------------------: | -----------------: |
| base         | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>1...1</tt>     |
<!-- markdownlint-enable no-inline-html -->
:::


L'opération de décompression commence par une extension de signe de la valeur compressée, puis effectue un décalage à gauche pour annuler l'opération de compression pour le bit de signe. La valeur intermédiaire résultante est encodée comme suit :

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | moitié supérieure | moitié inférieure                          |
| ------------ | ----------------: | -----------------------------------------: |
| pointeur de tas | <tt>1...1</tt>  | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt> |
| `nullptr`    | <tt>0...0</tt> | <tt>0...000</tt>                           |
| sentinelle   | <tt>0...0</tt> | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

Enfin, le pointeur décompressé est simplement le résultat d'un ET bit à bit entre cette valeur intermédiaire et le pointeur de base.

:::table-wrapper
| C++                                                    | Assembleur x64     |
| :----------------------------------------------------- | :----------------- |
| ```cpp                                                 | ```asm             \
| void* Decompress(uint32_t compressed) \{                | movsxd rax, edi    \
|   uintptr_t intermediate =                             | add rax, rax       \
|       (uintptr_t)((int32_t)compressed)  &lt;&lt;1;           | and rax, qword ptr \
|   return (void*)(intermediate & base);                 |     [rip + base]   \
| \}                                                      | ```                \
| ```                                                    |                    |
:::

Le schéma résultant gère les cas 1 à 3 de manière transparente via un schéma asymétrique sans branche. La compression utilise 3 octets, sans compter le déplacement initial du registre car l'appel serait de toute façon en ligne. La décompression utilise 13 octets, en comptant le déplacement initial d'extension de signe.

## Détails choisis

La section précédente a expliqué le schéma de compression utilisé. Un schéma de compression compact est nécessaire pour obtenir des performances élevées. Le schéma de compression ci-dessus a encore entraîné des régressions observables dans Speedometer. Les paragraphes suivants expliquent quelques détails supplémentaires nécessaires pour améliorer les performances d'Oilpan à un niveau acceptable.

### Optimisation du chargement de la base de la cage

Techniquement, en termes de C++, le pointeur global de base ne peut pas être une constante, car il est initialisé à l'exécution après `main()`, dès que l'intégrateur initialise Oilpan. Avoir cette variable globale modifiable empêcherait l'importante optimisation de propagation de constance, par exemple, le compilateur ne peut pas prouver qu'un appel aléatoire ne modifie pas la base et devrait donc la charger deux fois :

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
| C++                        | Assembleur x64                |
| :------------------------- | :---------------------------- |
| ```cpp                     | ```asm                        \
| void foo(GCed*);           | baz(Member&lt;GCed>):          \
| void bar(GCed*);           |   movsxd rbx, edi             \
|                            |   add rbx, rbx                \
| void baz(Member&lt;GCed> m) \{ |   mov rdi, qword ptr         \
|   foo(m.get());            |       [rip + base]            \
|   bar(m.get());            |   and rdi, rbx                \
| }                          |   call foo(GCed*)             \
| ```                        |   and rbx, qword ptr          \
|                            |       [rip + base] # chargement supplémentaire \
|                            |   mov rdi, rbx                \
|                            |   jmp bar(GCed*)              \
|                            | ```                           |
<!-- markdownlint-enable no-inline-html -->
:::

Avec quelques attributs supplémentaires, nous avons appris à clang à traiter la base globale comme constante et à effectuer ainsi effectivement un seul chargement dans un contexte.

### Éviter complètement la décompression

La séquence d'instructions la plus rapide est un nop ! Avec cette idée en tête, pour de nombreuses opérations sur les pointeurs, les compressions et décompressions redondantes peuvent être facilement évitées. De manière triviale, nous n'avons pas besoin de décompresser un Member pour vérifier s'il est nullptr. Nous n'avons pas besoin de décompresser et de compresser lors de la construction ou de l'affectation d'un Member à partir d'un autre Member. La comparaison des pointeurs est préservée par la compression, nous pouvons donc également éviter les transformations pour eux. L'abstraction Member nous sert ici astucieusement de goulot d'étranglement.

Le hachage peut être accéléré avec des pointeurs compressés. La décompression pour le calcul de hachage est redondante, car la base fixe n'augmente pas l'entropie du hachage. À la place, une fonction de hachage plus simple pour les entiers 32 bits peut être utilisée. Blink dispose de nombreuses tables de hachage utilisant Member comme clé ; le hachage 32 bits a entraîné des collections plus rapides !

### Aider clang là où il échoue à optimiser

En examinant le code généré, nous avons trouvé un autre endroit intéressant où le compilateur n'a pas effectué suffisamment d'optimisations :

:::table-wrapper
| C++                               | Assembleur x64           |
| :-------------------------------- | :----------------------- |
| ```cpp                            | ```asm                   \
| extern const uint64_t base;       | Assign(unsigned int):    \
| extern std::atomic_bool enabled;  |   mov dword ptr [rdi], esi \
|                                   |   mov rdi, qword ptr     \
| void Assign(uint32_t ptr) \{       |       [rip + base]       \
|   ptr_ = ptr                      |   mov al, byte ptr         \
|   WriteBarrier(Decompress(ptr));  |       [rip + enabled]      \
| }                                 |   test al, 1               \
|                                   |   jne .LBB4_2 # très rare  \
| void WriteBarrier(void* ptr) \{    |   ret                      \
|   if (LIKELY(                     | .LBB4_2:                   \
|       !enabled.load(relaxed)))    |   movsxd rax, esi          \
|     return;                       |   add rax, rax             \
|   SlowPath(ptr);                  |   and rdi, rax             \
| }                                 |   jmp SlowPath(void*)      \
| ```                               | ```                        |
:::

Le code généré effectue le chargement de base dans le bloc de base principal, même si la variable n'est pas utilisée et pourrait être trivialement décalée dans le bloc de base inférieur, où l'appel à `SlowPath()` est effectué et où le pointeur décompressé est réellement utilisé. Le compilateur a conservativement décidé de ne pas réordonner le chargement non atomique avec le chargement atomique-relaxé, même si cela serait parfaitement légal selon les règles du langage. Nous avons manuellement déplacé la décompression après la lecture atomique pour rendre l'affectation avec la barrière d'écriture aussi efficace que possible.


### Amélioration de la structuration par regroupement dans Blink

Il est difficile d'estimer l'effet de diviser par deux la taille des pointeurs dans Oilpan. Essentiellement, cela devrait améliorer l'utilisation de la mémoire pour des structures de données « compactées », telles que les conteneurs de ces pointeurs. Des mesures locales ont montré une amélioration d'environ 16 % de la mémoire Oilpan. Cependant, des investigations ont montré que pour certains types, nous n'avons pas réduit leur taille réelle mais seulement augmenté le rembourrage interne entre les champs.

Pour minimiser ce rembourrage, nous avons écrit un plugin clang qui identifie automatiquement les classes collectées par le garbage collector pour lesquelles le réordonnancement des champs réduirait la taille globale de la classe. Étant donné qu'il y avait de nombreux cas de ce genre dans la base de code Blink, nous avons appliqué le réordonnancement sur les plus utilisées, voir la [documentation de conception](https://docs.google.com/document/d/1bE5gZOCg7ipDUOCylsz4_shz1YMYG5-Ycm0911kBKFA).

### Tentative échouée : limiter la taille de la cage du tas

Toute optimisation n'a toutefois pas donné de bons résultats. Dans une tentative d'optimiser encore davantage la compression, nous avons limité la cage du tas à 2 Go. Nous avons fait en sorte que le bit le plus significatif du demi-mot inférieur de la base de la cage soit 1, ce qui nous a permis d'éviter complètement le décalage. La compression se réduirait à une simple troncature et la décompression à un simple chargement et un et bit-à-bit.

Étant donné que la mémoire Oilpan dans le moteur Blink consomme en moyenne moins de 10 Mo, nous avons supposé qu'il serait sûr de procéder avec le schéma plus rapide et de restreindre la taille de la cage. Malheureusement, après avoir déployé l'optimisation, nous avons commencé à recevoir des erreurs de mémoire insuffisante sur certaines charges de travail rares. Nous avons décidé de revenir sur cette optimisation.

## Résultats et perspectives

La compression des pointeurs dans Oilpan a été activée par défaut dans **Chrome 106**. Nous avons constaté de grandes améliorations de la mémoire à tous les niveaux :


<!-- markdownlint-disable no-inline-html -->
| Mémoire Blink | P50                                                 | P99                                               |
| -----------: | :-------------------------------------------------: | :-----------------------------------------------: |
| Windows      | **<span style={{color:'green'}}>-21% (-1,37 Mo)</span>** | **<span style={{color:'green'}}>-33% (-59 Mo)</span>** |
| Android      | **<span style={{color:'green'}}>-6% (-0,1 Mo)</span>**   | **<span style={{color:'green'}}>-8% (-3,9 Mo)</span>** |
<!-- markdownlint-enable no-inline-html -->


Les nombres rapportés représentent le 50e et le 99e centile de la mémoire Blink allouée avec Oilpan sur l'ensemble de la flotte[^2]. Les données rapportent la différence entre les versions stables Chrome 105 et 106. Les nombres absolus en Mo donnent une indication de la limite inférieure que les utilisateurs peuvent s'attendre à voir. Les améliorations réelles sont généralement un peu plus élevées en raison d'effets indirects sur la consommation globale de mémoire de Chrome. La plus grande amélioration relative suggère que le regroupement des données est meilleur dans de tels cas, ce qui indique qu'une plus grande quantité de mémoire est utilisée dans des collections (par exemple, des vecteurs) bien compactées. Le rembourrage amélioré des structures introduit dans Chrome 108 a montré une autre amélioration moyenne de 4 % de la mémoire Blink.

Étant donné qu'Oilpan est omniprésent dans Blink, le coût en termes de performance peut être évalué sur [Speedometer2](https://browserbench.org/Speedometer2.1/). [Le prototype initial](https://chromium-review.googlesource.com/c/v8/v8/+/2739979) basé sur une version locale au thread a montré une régression de 15 %. Avec toutes les optimisations susmentionnées, nous n'avons pas observé de régression notable.

### Scanner de pile conservatif

Dans Oilpan, la pile est analysée de manière conservatrice pour trouver les pointeurs vers le tas. Avec des pointeurs compressés, cela signifie que nous devons traiter chaque demi-mot comme un pointeur potentiel. De plus, lors de la compression, le compilateur peut décider de déverser une valeur intermédiaire dans la pile, ce qui implique que l'analyseur doit considérer toutes les valeurs intermédiaires possibles (dans notre méthode de compression, la seule valeur intermédiaire possible est une valeur tronquée, mais pas encore décalée). L'analyse des intermédiaires a augmenté le nombre de faux positifs (c'est-à-dire des demi-mots qui ressemblent à des pointeurs compressés), ce qui a réduit l'amélioration de la mémoire d'environ 3% (l'amélioration estimée aurait autrement été de 24%).

### Autres compressions

Nous avons constaté de grandes améliorations en appliquant une compression au JavaScript de V8 et à Oilpan dans le passé. Nous pensons que le paradigme peut être appliqué à d'autres pointeurs intelligents dans Chrome (par exemple, `base::scoped_refptr`) qui pointent déjà vers d'autres cages de tas. Des expériences initiales ont [montré](https://docs.google.com/document/d/1Rlr7FT3kulR8O-YadgiZkdmAgiSq0OaB8dOFNqf4cD8/edit) des résultats prometteurs.

Les recherches ont également montré qu'une grande partie de la mémoire est en fait détenue via des tables virtuelles. Dans le même esprit, nous avons donc [activé](https://docs.google.com/document/d/1rt6IOEBevCkiVjiARUy8Ib1c5EAxDtW0wdFoTiijy1U/edit?usp=sharing) l'ABI des tables virtuelles relatives sur Android64, ce qui compacte les tables virtuelles, nous permettant ainsi d'économiser davantage de mémoire et d'améliorer en même temps le démarrage.

[^1]: Les lecteurs intéressés peuvent se référer à [`ThreadStorage::Current()`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/platform/heap/thread_state_storage.cc;drc=603337a74bf04efd536b251a7f2b4eb44fe153a9;l=19) de Blink pour voir le résultat de la compilation de l'accès au TLS avec différents modes.
[^2]: Les chiffres sont recueillis via le cadre d'analyse des métriques utilisateur de Chrome.
