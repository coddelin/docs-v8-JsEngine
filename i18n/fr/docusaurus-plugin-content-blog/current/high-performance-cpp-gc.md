---
title: &apos;Collecte des ordures haute performance pour C++&apos;
author: &apos;Anton Bikineev, Omer Katz ([@omerktz](https://twitter.com/omerktz)), et Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), experts en mémoire C++&apos;
avatars:
  - &apos;anton-bikineev&apos;
  - &apos;omer-katz&apos;
  - &apos;michael-lippautz&apos;
date: 2020-05-26
tags:
  - internes
  - mémoire
  - cppgc
description: &apos;Cet article décrit le collecteur d'ordures C++ Oilpan, son utilisation dans Blink et comment il optimise le balayage, c'est-à-dire la récupération de la mémoire inaccessible.&apos;
tweet: &apos;1265304883638480899&apos;
---

Dans le passé, nous avons [déjà](https://v8.dev/blog/trash-talk) [écrit](https://v8.dev/blog/concurrent-marking) [des articles](https://v8.dev/blog/tracing-js-dom) sur la collecte des ordures pour JavaScript, le modèle objet document (DOM), et comment tout cela est implémenté et optimisé dans V8. Cependant, tout n'est pas JavaScript dans Chromium, car la majeure partie du navigateur et de son moteur de rendu Blink, où V8 est intégré, est écrite en C++. JavaScript peut être utilisé pour interagir avec le DOM, qui est ensuite traité par la chaîne de rendu.

<!--truncate-->
Parce que le graphe d'objets C++ autour du DOM est intimement mêlé aux objets JavaScript, l'équipe de Chromium a changé il y a quelques années pour un collecteur d'ordures, appelé [Oilpan](https://www.youtube.com/watch?v=_uxmEyd6uxo), pour gérer ce type de mémoire. Oilpan est un collecteur d'ordures écrit en C++ pour gérer la mémoire C++ qui peut être connecté à V8 en utilisant [la traçabilité inter-composants](https://research.google/pubs/pub47359/), traitant le graphe d'objets C++/JavaScript enchevêtré comme un seul tas.

Cet article est le premier d'une série de publications sur Oilpan qui fourniront une vue d'ensemble des principes fondamentaux d'Oilpan et de ses API C++. Dans cet article, nous couvrirons certaines des fonctionnalités prises en charge, expliquerons comment elles interagissent avec divers sous-systèmes du collecteur d'ordures, et explorerons en profondeur la récupération simultanée des objets dans le balayeur.

Le plus excitant est qu'Oilpan est actuellement implémenté dans Blink mais il est en cours d'intégration à V8 sous la forme d'une [bibliothèque de collecte d'ordures](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/). L'objectif est de rendre la collecte d'ordures en C++ facilement accessible à tous les intégrateurs de V8 et, plus généralement, à davantage de développeurs C++.

## Contexte

Oilpan implémente un collecteur d'ordures [Mark-Sweep](https://en.wikipedia.org/wiki/Tracing_garbage_collection) où la collecte d'ordures est divisée en deux phases : *marquage*, où le tas géré est analysé pour trouver des objets vivants, et *balayage*, où les objets morts sur le tas géré sont récupérés.

Nous avons déjà abordé les bases du marquage lors de l'introduction du [marquage concurrent dans V8](https://v8.dev/blog/concurrent-marking). Pour récapituler, analyser tous les objets pour trouver ceux qui sont vivants peut être vu comme un parcours de graphe où les objets sont des nœuds et les pointeurs entre les objets sont des arêtes. Le parcours commence aux racines, qui sont des registres, la pile d'exécution native (que nous appellerons désormais pile) et d'autres globales, comme décrit [ici](https://v8.dev/blog/concurrent-marking#background).

C++ n'est pas différent de JavaScript à cet égard. Contrairement à JavaScript cependant, les objets C++ sont typés statiquement et ne peuvent donc pas changer leur représentation à l'exécution. Les objets C++ gérés à l'aide d'Oilpan tirent parti de ce fait et fournissent une description des pointeurs vers d'autres objets (arêtes dans le graphe) via le modèle de visiteur. Le modèle de base pour décrire les objets Oilpan est le suivant :

```cpp
class LinkedNode final : public GarbageCollected<LinkedNode> {
 public:
  LinkedNode(LinkedNode* next, int value) : next_(next), value_(value) {}
  void Trace(Visitor* visitor) const {
    visitor->Trace(next_);
  }
 private:
  Member<LinkedNode> next_;
  int value_;
};

LinkedNode* CreateNodes() {
  LinkedNode* first_node = MakeGarbageCollected<LinkedNode>(nullptr, 1);
  LinkedNode* second_node = MakeGarbageCollected<LinkedNode>(first_node, 2);
  return second_node;
}
```

Dans l'exemple ci-dessus, `LinkedNode` est géré par Oilpan comme indiqué par l'héritage de `GarbageCollected<LinkedNode>`. Lorsque le collecteur d'ordures traite un objet, il découvre les pointeurs sortants en invoquant la méthode `Trace` de l'objet. Le type `Member` est un pointeur intelligent qui est syntaxiquement similaire à e.g. `std::shared_ptr`, fourni par Oilpan et utilisé pour maintenir un état cohérent lors du parcours du graphe pendant le marquage. Tout cela permet à Oilpan de savoir précisément où se trouvent les pointeurs dans ses objets gérés.

Les lecteurs assidus ont probablement remarqué ~~et peuvent être effrayés~~ que `first_node` et `second_node` sont conservés sous forme de pointeurs C++ bruts sur la pile dans l'exemple ci-dessus. Oilpan n’ajoute pas d’abstractions pour travailler avec la pile, se reposant uniquement sur une analyse conservatrice de la pile pour trouver des pointeurs dans son tas géré lors du traitement des racines. Cela fonctionne en parcourant la pile mot par mot et en interprétant ces mots comme des pointeurs vers le tas géré. Cela signifie qu’Oilpan n’impose pas de pénalité de performance pour accéder aux objets alloués sur la pile. Au lieu de cela, il déplace le coût au moment de la collecte des ordures lorsqu’il analyse la pile de manière conservatrice. Oilpan tel qu'il est intégré dans le moteur de rendu tente de retarder la collecte des ordures jusqu'à atteindre un état où il est garanti qu'il n'y a pas de pile intéressante. Étant donné que le web fonctionne sur un mode événementiel et que l'exécution est pilotée par le traitement de tâches dans des boucles d'événements, de telles opportunités sont abondantes.

Oilpan est utilisé dans Blink qui est une grande base de code C++ mature et prend donc également en charge :

- L'héritage multiple via des mixins et des références à ces mixins (pointeurs internes).
- Le déclenchement de la collecte des ordures lors de l'exécution des constructeurs.
- La conservation des objets vivants à partir de la mémoire non gérée via des pointeurs intelligents `Persistent` qui sont traités comme des racines.
- Des collections couvrant des conteneurs séquentiels (par exemple, vecteurs) et associatifs (par exemple, ensembles et cartes) avec la compaction des soutiens de collection.
- Des références faibles, des callbacks faibles et des [éphémères](https://fr.wikipedia.org/wiki/%C3%89ph%C3%A9m%C3%A8re).
- Des callbacks de finalisation qui sont exécutés avant de récupérer des objets individuels.

## Balayage pour le C++

Restez à l'écoute pour un article de blog séparé sur le fonctionnement détaillé du marquage dans Oilpan. Pour cet article, nous supposons que le marquage est effectué et qu'Oilpan a découvert tous les objets accessibles grâce à leurs méthodes `Trace`. Après le marquage, tous les objets accessibles ont leur bit de marquage défini.

Le balayage est maintenant la phase où les objets morts (ceux qui ne sont pas accessibles lors du marquage) sont récupérés et leur mémoire sous-jacente est soit retournée au système d'exploitation, soit mise à disposition pour des allocations ultérieures. Dans ce qui suit, nous montrons comment fonctionne le balai Oilpan, à la fois du point de vue de l'utilisation et de celui des contraintes, mais aussi comment il atteint un débit élevé de récupération.

Le balai trouve les objets morts en parcourant la mémoire du tas et en vérifiant les bits de marquage. Afin de préserver la sémantique du C++, le balai doit invoquer le destructeur de chaque objet mort avant de libérer sa mémoire. Les destructeurs non triviaux sont mis en œuvre sous forme de finalisateurs.

Du point de vue du programmeur, il n'y a pas d'ordre défini dans lequel les destructeurs sont exécutés, car l'itération utilisée par le balai ne tient pas compte de l'ordre de construction. Cela impose une restriction selon laquelle les finalisateurs ne sont pas autorisés à toucher d'autres objets dans le tas. C'est un défi commun pour écrire du code utilisateur nécessitant un ordre de finalisation, car les langages gérés ne permettent généralement pas de définition d'ordre dans leur sémantique de finalisation (par exemple, Java). Oilpan utilise un plugin Clang qui vérifie statiquement, entre bien d’autres choses, que aucun objet du tas n’est accédé lors de la destruction d’un objet :

```cpp
class GCed : public GarbageCollected<GCed> {
 public:
  void DoSomething();
  void Trace(Visitor* visitor) {
    visitor->Trace(other_);
  }
  ~GCed() {
    other_->DoSomething();  // erreur : Le finalisateur &apos;~GCed&apos; accède
                            // au champ potentiellement finalisé &apos;other_&apos;.
  }
 private:
  Member<GCed> other_;
};
```

Pour les curieux : Oilpan propose des callbacks de pré-finalisation pour des cas complexes nécessitant un accès au tas avant la destruction des objets. De tels callbacks imposent plus de surcharge que les destructeurs à chaque cycle de collecte des ordures et sont utilisés avec parcimonie dans Blink.

## Balayage incrémental et concurrent

Maintenant que nous avons couvert les restrictions des destructeurs dans un environnement C++ géré, il est temps d’examiner en détail comment Oilpan met en œuvre et optimise la phase de balayage.

Avant de plonger dans les détails, il est important de rappeler comment les programmes sont généralement exécutés sur le web. Toute exécution, par exemple des programmes en JavaScript mais aussi la collecte des ordures, est pilotée à partir du thread principal en distribuant des tâches dans une [boucle d’événements](https://fr.wikipedia.org/wiki/Boucle_d%27%C3%A9v%C3%A9nements). Le moteur de rendu, comme d’autres environnements d’application, prend en charge des tâches en arrière-plan qui s’exécutent de manière concurrente avec le thread principal pour aider à traiter tout travail du thread principal.

Initialement simple, Oilpan a mis en œuvre un balayage stop-the-world qui était exécuté comme partie de la pause de finalisation de la collecte des ordures, interrompant l’exécution de l’application sur le thread principal :

![Balayage stop-the-world](/_img/high-performance-cpp-gc/stop-the-world-sweeping.svg)

Pour les applications avec des contraintes de temps réel souples, le facteur déterminant dans le traitement de la collecte des ordures est la latence. Le balayage stop-the-world peut induire un temps de pause significatif entraînant une latence visible pour l’utilisateur dans l’application. La prochaine étape pour réduire la latence était de rendre le balayage incrémental :

![Balayage incrémental](/_img/high-performance-cpp-gc/incremental-sweeping.svg)

Avec l'approche incrémentale, le balayage est divisé et délégué à des tâches supplémentaires sur le thread principal. Dans le meilleur des cas, ces tâches sont exécutées entièrement pendant le [temps d'inactivité](https://research.google/pubs/pub45361/), évitant d'interférer avec l'exécution classique de l'application. En interne, le balayeur divise le travail en unités plus petites basées sur la notion de pages. Les pages peuvent être dans deux états intéressants : des pages *à balayer* que le balayeur doit encore traiter, et des pages *déjà balayées* que le balayeur a déjà traitées. L'allocation ne considère que les pages déjà balayées et remplira les tampons d'allocation locale (LABs) à partir des listes libres qui maintiennent une liste de blocs mémoire disponibles. Pour obtenir de la mémoire à partir d'une liste libre, l'application tentera d'abord de trouver de la mémoire dans les pages déjà balayées, puis d'aider à traiter les pages à balayer en intégrant l'algorithme de balayage dans l'allocation, et ne demandera de la mémoire au système d'exploitation qu'en cas d'absence.

Oilpan utilise le balayage incrémental depuis des années, mais à mesure que les applications et leurs graphes d'objets résultants devenaient de plus en plus grands, le balayage a commencé à impacter la performance des applications. Pour améliorer le balayage incrémental, nous avons commencé à tirer parti des tâches en arrière-plan pour la récupération concurrente de mémoire. Deux invariants fondamentaux sont utilisés pour exclure toute course de données entre les tâches en arrière-plan exécutant le balayeur et l'application allouant de nouveaux objets :

- Le balayeur ne traite que la mémoire morte qui, par définition, n'est pas accessible par l'application.
- L'application alloue uniquement sur des pages déjà balayées qui, par définition, ne sont plus traitées par le balayeur.

Les deux invariants garantissent qu'il ne devrait pas y avoir de concurrents pour l'objet et sa mémoire. Malheureusement, le C++ repose fortement sur les destructeurs qui sont implémentés sous forme de finaliseurs. Oilpan impose l'exécution des finaliseurs sur le thread principal pour aider les développeurs et exclure les courses de données dans le propre code de l'application. Pour résoudre ce problème, Oilpan diffère la finalisation des objets vers le thread principal. Plus concrètement, chaque fois que le balayeur concurrent rencontre un objet possédant un finaliseur (destructeur), il le place dans une file d'attente de finalisation qui sera traitée dans une phase de finalisation séparée, qui est toujours exécutée sur le thread principal exécutant également l'application. Le flux de travail global avec le balayage concurrent ressemble à ceci :

![Balayage concurrent utilisant des tâches en arrière-plan](/_img/high-performance-cpp-gc/concurrent-sweeping.svg)

Puisque les finaliseurs peuvent nécessiter l'accès à toute la charge utile de l'objet, l'ajout de la mémoire correspondante à la liste libre est retardé jusqu'après l'exécution du finaliseur. Si aucun finaliseur n'est exécuté, le balayeur exécuté sur le thread d'arrière-plan ajoute immédiatement la mémoire récupérée à la liste libre.

# Résultats

Le balayage en arrière-plan a été livré dans Chrome M78. Notre [cadre de benchmarking en conditions réelles](https://v8.dev/blog/real-world-performance) montre une réduction du temps de balayage sur le thread principal de 25%-50% (42% en moyenne). Voir un ensemble sélectionné de lignes ci-dessous.

![Temps de balayage sur le thread principal en millisecondes](/_img/high-performance-cpp-gc/results.svg)

Le reste du temps passé sur le thread principal est consacré à l'exécution des finaliseurs. Des travaux sont en cours pour réduire les finaliseurs pour les types d'objets fortement instanciés dans Blink. L'aspect excitant ici est que toutes ces optimisations sont faites dans le code de l'application puisque le balayage s'ajustera automatiquement en l'absence de finaliseurs.

Restez à l'écoute pour d'autres articles sur la gestion de la mémoire en C++ en général et les mises à jour de la bibliothèque Oilpan en particulier, à mesure que nous nous rapprochons d'une version qui pourra être utilisée par tous les utilisateurs de V8.
