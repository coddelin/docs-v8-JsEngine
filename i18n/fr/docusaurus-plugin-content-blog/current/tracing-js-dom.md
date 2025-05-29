---
title: "Tracer de JS au DOM et revenir"
author: "Ulan Degenbaev, Alexei Filippov, Michael Lippautz et Hannes Payer — la communauté du DOM"
avatars:
  - "ulan-degenbaev"
  - "michael-lippautz"
  - "hannes-payer"
date: 2018-03-01 13:33:37
tags:
  - internals
  - memory
description: "Les DevTools de Chrome peuvent désormais tracer et prendre un instantané des objets DOM C++ et afficher tous les objets DOM accessibles depuis JavaScript avec leurs références."
tweet: "969184997545562112"
---
Déboguer les fuites de mémoire dans Chrome 66 est devenu beaucoup plus facile. Les DevTools de Chrome peuvent désormais tracer et prendre un instantané des objets DOM C++ et afficher tous les objets DOM accessibles depuis JavaScript avec leurs références. Cette fonctionnalité est l'un des avantages du nouveau mécanisme de traçage C++ du ramasse-miettes V8.

<!--truncate-->
## Contexte

Une fuite de mémoire dans un système de gestion des déchets se produit lorsqu'un objet inutilisé n'est pas libéré en raison de références involontaires provenant d'autres objets. Les fuites de mémoire dans les pages web impliquent souvent une interaction entre les objets JavaScript et les éléments DOM.

L'exemple [de démonstration](https://ulan.github.io/misc/leak.html) suivant montre une fuite de mémoire qui se produit lorsqu'un programmeur oublie de désenregistrer un écouteur d'événement. Aucun des objets référencés par l'écouteur d'événement ne peut être collecté par le garbage collector. En particulier, la fenêtre de l'iframe fuit avec l'écouteur d'événement.

```js
// Fenêtre principale :
const iframe = document.createElement('iframe');
iframe.src = 'iframe.html';
document.body.appendChild(iframe);
iframe.addEventListener('load', function() {
  const localVariable = iframe.contentWindow;
  function leakingListener() {
    // Faire quelque chose avec `localVariable`.
    if (localVariable) {}
  }
  document.body.addEventListener('my-debug-event', leakingListener);
  document.body.removeChild(iframe);
  // BUG : oublié de désenregistrer `leakingListener`.
});
```

La fenêtre iframe qui fuit garde également tous ses objets JavaScript en vie.

```js
// iframe.html :
class Leak {};
window.globalVariable = new Leak();
```

Il est important de comprendre la notion de chemins de rétention pour trouver la cause d'une fuite de mémoire. Un chemin de rétention est une chaîne d'objets qui empêche la collecte des objets qui fuient. La chaîne commence par un objet racine tel que l'objet global de la fenêtre principale. La chaîne se termine par l'objet qui fuit. Chaque objet intermédiaire dans la chaîne a une référence directe à l'objet suivant dans la chaîne. Par exemple, le chemin de rétention de l'objet `Leak` dans l'iframe est le suivant :

![Figure 1 : Chemin de rétention d'un objet fuyant via `iframe` et écouteur d'événements](/_img/tracing-js-dom/retaining-path.svg)

Notez que le chemin de rétention traverse deux fois la frontière JavaScript / DOM (mise en évidence respectivement en vert / rouge). Les objets JavaScript vivent dans le tas V8, tandis que les objets DOM sont des objets C++ dans Chrome.

## Instantané du tas avec DevTools

Nous pouvons inspecter le chemin de rétention de n'importe quel objet en prenant un instantané du tas dans DevTools. L'instantané du tas capture précisément tous les objets sur le tas V8. Jusqu'à récemment, il avait seulement des informations approximatives sur les objets DOM en C++. Par exemple, Chrome 65 montre un chemin de rétention incomplet pour l'objet `Leak` de l'exemple :

![Figure 2 : Chemin de rétention dans Chrome 65](/_img/tracing-js-dom/chrome-65.png)

Seule la première ligne est précise : l'objet `Leak` est effectivement stocké dans le champ `global_variable` de l'objet window de l'iframe. Les lignes suivantes donnent une approximation du chemin de rétention réel, ce qui complique le débogage de la fuite mémoire.

Depuis Chrome 66, DevTools trace à travers les objets DOM en C++ et capture précisément les objets ainsi que les références entre eux. Cela repose sur le puissant mécanisme de traçage des objets C++ introduit précédemment pour la gestion conjointe des déchets dans plusieurs composants. Par conséquent, [le chemin de rétention dans DevTools](https://www.youtube.com/watch?v=ixadA7DFCx8) est maintenant correct :

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/ixadA7DFCx8" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>Figure 3 : Chemin de rétention dans Chrome 66</figcaption>
</figure>

## Sous le capot : traçage entre composants

Les objets DOM sont gérés par Blink — le moteur de rendu de Chrome, qui est responsable de traduire le DOM en texte et en images réels à l'écran. Blink et sa représentation du DOM sont écrits en C++, ce qui signifie que le DOM ne peut pas être directement exposé à JavaScript. Au lieu de cela, les objets du DOM se composent de deux moitiés : un objet wrapper V8 accessible aux scripts JavaScript et un objet C++ représentant le nœud dans le DOM. Ces deux objets ont des références directes l'un à l'autre. Déterminer la vivacité et la propriété des objets entre plusieurs composants, tels que Blink et V8, est difficile car toutes les parties concernées doivent s'accorder sur les objets encore vivants et ceux pouvant être récupérés.

Dans Chrome 56 et les versions antérieures (c'est-à-dire jusqu'en mars 2017), Chrome utilisait un mécanisme appelé _groupement d'objets_ pour déterminer la vitalité. Les objets étaient assignés à des groupes en fonction de leur inclusion dans des documents. Un groupe comprenant tous ses objets contenus restait actif tant qu'un seul objet demeurait actif via un autre chemin de rétention. Cela avait du sens dans le contexte des nœuds DOM qui se réfèrent toujours à leur document contenant, formant ainsi des arbres DOM. Cependant, cette abstraction supprimait tous les chemins de rétention réels, ce qui la rendait difficile à utiliser pour le débogage, comme le montre la Figure 2. Dans le cas des objets qui ne correspondaient pas à ce scénario (par exemple, les fermetures JavaScript utilisées comme auditeurs d'événements), cette approche devenait aussi encombrante et entraînait divers bogues où les objets enveloppeurs JavaScript étaient collectés prématurément, ce qui faisait qu'ils étaient remplacés par des enveloppes JS vides qui perdaient toutes leurs propriétés.

À partir de Chrome 57, cette approche a été remplacée par la traçabilité inter-composants, un mécanisme qui détermine la vitalité en traçant de JavaScript à l'implémentation C++ du DOM et inversement. Nous avons mis en œuvre un traçage incrémentiel du côté C++ avec des barrières d'écriture pour éviter toute interruption complète due au traçage dont nous avons parlé dans des [articles de blog précédents](/blog/orinoco-parallel-scavenger). La traçabilité inter-composants ne fournit pas seulement une meilleure latence, mais elle évalue également mieux la vitalité des objets à travers les limites des composants et corrige plusieurs [scénarios](https://bugs.chromium.org/p/chromium/issues/detail?id=501866) qui causaient auparavant des fuites. De plus, cela permet aux outils DevTools de fournir une capture instantanée qui représente réellement le DOM, comme le montre la Figure 3.

Essayez-le ! Nous serions heureux de recevoir vos commentaires.
