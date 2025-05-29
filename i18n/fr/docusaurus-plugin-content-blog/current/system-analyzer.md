---
title: "Indicium : outil de traçage du runtime V8"
author: "Zeynep Cankara ([@ZeynepCankara](https://twitter.com/ZeynepCankara))"
avatars: 
  - "zeynep-cankara"
date: "2020-10-01 11:56:00"
tags: 
  - outils
  - analyseur-système
description: "Indicium : outil d'analyse système V8 pour analyser les événements Map/IC."
tweet: "1311689392608731140"
---
# Indicium : analyseur système V8

Les trois derniers mois ont été une expérience d'apprentissage extraordinaire pour moi depuis que j'ai rejoint l'équipe V8 (Google Londres) en tant que stagiaire et que j'ai travaillé sur un nouvel outil appelé [*Indicium*](https://v8.dev/tools/head/system-analyzer).

Cet analyseur système est une interface web unifiée pour tracer, déboguer et analyser les modèles de création et modification des Inline Caches (IC) et des Maps dans des applications réelles.

V8 dispose déjà d'une infrastructure de traçage pour les [ICs](https://mathiasbynens.be/notes/shapes-ics) et les [Maps](https://v8.dev/blog/fast-properties) permettant de traiter et analyser les événements IC grâce au [IC Explorer](https://v8.dev/tools/v8.7/ic-explorer.html) et les événements Map grâce au [Map Processor](https://v8.dev/tools/v8.7/map-processor.html). Cependant, les outils précédents ne permettaient pas d'analyser les Maps et ICs de manière holistique, ce qui est maintenant possible avec l'analyseur système.

<!--truncate-->
![Indicium](/_img/system-analyzer/indicium-logo.png)

## Étude de cas

Passons par un exemple pour démontrer comment nous pouvons utiliser Indicium pour analyser les événements de log Map et IC dans V8.

```javascript
class Point {
  constructor(x, y) {
    if (x < 0 || y < 0) {
      this.isNegative = true;
    }
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}

let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

// échauffement
for (let i = 0; i < 10e5; i++) {
  dotProduct = a.dotProduct(b);
}

console.time('snippet1');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet1');

a = new Point(-1, -1);
b = new Point(-2, -2);
console.time('snippet2');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet2');
```

Ici, nous avons une classe `Point` qui stocke deux coordonnées et un booléen supplémentaire basé sur les valeurs des coordonnées. La classe `Point` a une méthode `dotProduct` qui renvoie le produit scalaire entre l'objet passé et le récepteur.

Pour faciliter l'explication du programme, décomposons-le en deux extraits (en ignorant la phase d'échauffement) :

### *extrait 1*

```javascript
let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

console.time('snippet1');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet1');
```

### *extrait 2*

```javascript
a = new Point(-1, -1);
b = new Point(-2, -2);
console.time('snippet2');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet2');
```

Une fois que nous exécutons le programme, nous remarquons une régression de performance. Même en mesurant les performances de deux extraits similaires ; les propriétés `x` et `y` des instances d'objet `Point` sont accédées en appelant la fonction `dotProduct` dans une boucle for.

L'extrait 1 s'exécute environ 3 fois plus vite que l'extrait 2. La seule différence étant que nous utilisons des valeurs négatives pour les propriétés `x` et `y` de l'objet `Point` dans l'extrait 2.

![Analyse des performances des extraits.](/_img/system-analyzer/initial-program-performance.png)

Pour analyser cette différence de performance, nous pouvons utiliser diverses options de journalisation disponibles avec V8. C'est là que l'analyseur système est brillant. Il peut afficher les événements de journalisation et les lier avec les événements Map, nous permettant d'explorer la magie cachée dans V8.

Avant d'approfondir l'étude de cas, familiarisons-nous avec les panneaux de l'outil d'analyseur système. L'outil dispose de quatre panneaux principaux :

- un panneau de chronologie pour analyser les événements Map/IC au fil du temps,
- un panneau Map pour visualiser les arbres de transition des Maps,
- un panneau IC pour obtenir des statistiques sur les événements IC,
- un panneau Source pour afficher les positions des fichiers Map/IC dans un script.

![Vue d'ensemble de l'analyseur système](/_img/system-analyzer/system-analyzer-overview.png)

![Grouper les événements IC par nom de fonction pour obtenir des informations détaillées sur les événements IC associés à `dotProduct`.](/_img/system-analyzer/case1_1.png)

Nous analysons comment la fonction `dotProduct` pourrait provoquer cette différence de performance. Alors nous regroupons les événements IC par nom de fonction pour obtenir des informations détaillées sur les événements IC associés à la fonction `dotProduct`.

La première chose que nous remarquons est que nous avons deux transitions d'état IC distinctes enregistrées par les événements IC dans cette fonction. L'une passant de l'état non initialisé à monomorphique et l'autre passant de monomorphique à polymorphique. L'état IC polymorphique indique que nous suivons maintenant plus d'un Map associé aux objets `Point` et cet état polymorphique est moins performant, car nous devons effectuer des vérifications supplémentaires.

Nous voulons savoir pourquoi nous créons plusieurs formes de Map pour le même type d'objets. Pour ce faire, nous basculons le bouton d'information sur l'état IC afin d'obtenir plus d'informations sur les adresses Map passant de non initialisées à monomorphiques.

![L'arbre de transition de Map associé à l'état IC monomorphique.](/_img/system-analyzer/case1_2.png)

![L'arbre de transition de Map associé à l'état IC polymorphique.](/_img/system-analyzer/case1_3.png)

Pour l'état IC monomorphique, nous pouvons visualiser l'arbre de transition et voir que nous ajoutons dynamiquement seulement deux propriétés `x` et `y`, mais lorsqu'il s'agit de l'état IC polymorphique, nous avons une nouvelle Map contenant trois propriétés `isNegative`, `x` et `y`.

![Le panneau Map communique les informations de position de fichier pour mettre en surbrillance les positions dans le panneau Source.](/_img/system-analyzer/case1_4.png)

Nous cliquons sur la section position de fichier du panneau Map pour voir où cette propriété `isNegative` est ajoutée dans le code source et pouvons utiliser cet aperçu pour résoudre la régression de performance.

Donc maintenant, la question est *comment pouvons-nous résoudre la régression de performance en utilisant les informations que nous avons générées avec l'outil* ?

La solution minimale serait d'initialiser toujours la propriété `isNegative`. En général, il est recommandé que toutes les propriétés d'instance soient initialisées dans le constructeur.

Maintenant, la classe `Point` mise à jour ressemble à ça :

```javascript
class Point {
  constructor(x, y) {
    this.isNegative = x < 0 || y < 0;
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}
```

Si nous exécutons à nouveau le script avec la classe `Point` modifiée, nous constatons que l'exécution des deux extraits définis au début de l'étude de cas est très similaire.

Dans une trace mise à jour, nous constatons que l'état IC polymorphique est évité car nous ne créons pas plusieurs maps pour le même type d'objets.

![L'arbre de transition de Map de l'object Point modifié.](/_img/system-analyzer/case2_1.png)

## L'Analyseur Système

Examinons maintenant en détail les différents panneaux présents dans l'analyseur système.

### Panneau Chronologie

Le panneau Chronologie permet de sélectionner dans le temps ce qui permet de visualiser les états IC/Map à des points spécifiques ou une plage de temps sélectionnée. Il prend en charge des fonctions de filtrage telles que zoom avant/arrière sur les événements journaux pour des plages temporelles sélectionnées.

![Aperçu du panneau Chronologie](/_img/system-analyzer/timeline-panel.png)

![Aperçu du panneau Chronologie (suite)](/_img/system-analyzer/timeline-panel2.png)

### Panneau Map

Le panneau Map comporte deux sous-panneaux :

1. Détails de Map
2. Transitions de Map

Le panneau Map visualise les arbres de transition des maps sélectionnées. Les métadonnées de la map sélectionnée sont affichées via le sous-panneau des détails de map. Un arbre de transition spécifique associé à une adresse de map peut être recherché à l'aide de l'interface fournie. À partir du sous-panneau Statistiques, situé au-dessus du sous-panneau Transitions de Map, nous pouvons voir les statistiques sur les propriétés provoquant des transitions de map et les types d'événements map.

![Aperçu du panneau Map](/_img/system-analyzer/map-panel.png)

![Aperçu du panneau Statistiques](/_img/system-analyzer/stats-panel.png)

### Panneau IC

Le panneau IC affiche des statistiques sur les événements IC dans une plage de temps spécifique qui sont filtrés via le panneau Chronologie. De plus, le panneau IC permet de regrouper les événements IC en fonction de différentes options (type, catégorie, map, position de fichier, etc.). Parmi les options de regroupement, celles pour les maps et les positions de fichier interagissent respectivement avec les panneaux Map et de code source pour afficher les arbres de transition des maps et mettre en surbrillance les positions associées aux événements IC.

![Aperçu du panneau IC](/_img/system-analyzer/ic-panel.png)

![Aperçu du panneau IC (suite)](/_img/system-analyzer/ic-panel2.png)

![Aperçu du panneau IC (suite)](/_img/system-analyzer/ic-panel3.png)

![Aperçu du panneau IC (suite)](/_img/system-analyzer/ic-panel4.png)

### Panneau Source

Le panneau Source affiche les scripts chargés avec des marqueurs cliquables pour émettre des événements personnalisés qui sélectionnent à la fois les événements Map et IC à travers les panneaux personnalisés. La sélection d'un script chargé peut être effectuée à partir de la barre de navigation. Sélectionner une position de fichier à partir des panneaux Map et IC met en surbrillance la position sélectionnée dans le panneau de code source.

![Aperçu du panneau Source](/_img/system-analyzer/source-panel.png)

### Remerciements

Je tiens à remercier tous les membres des équipes V8 et Web sur Android, en particulier mon hôte Sathya et co-hôte Camillo pour m'avoir soutenu tout au long de mon stage et m'avoir donné l'opportunité de travailler sur un projet aussi génial.

J'ai passé un été incroyable en tant que stagiaire chez Google !
