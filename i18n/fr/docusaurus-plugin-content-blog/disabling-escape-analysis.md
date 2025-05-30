---
title: "Désactivation temporaire de l'analyse d'évasion"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), analyste d'évasion de sandbox"
avatars: 
  - "mathias-bynens"
date: "2017-09-22 13:33:37"
tags: 
  - sécurité
description: "Nous avons désactivé l'analyse d'évasion de V8 dans Chrome 61 afin de protéger les utilisateurs contre une vulnérabilité de sécurité."
tweet: "911339802884284416"
---
En JavaScript, un objet alloué _s'échappe_ s'il est accessible depuis l'extérieur de la fonction actuelle. Normalement, V8 alloue de nouveaux objets sur le tas JavaScript, mais en utilisant _l'analyse d'évasion_, un compilateur optimisant peut déterminer quand un objet peut être traité de manière spéciale parce que sa durée de vie est prouvée comme étant liée à l'activation de la fonction. Lorsque la référence à un objet nouvellement alloué n'échappe pas à la fonction qui le crée, les moteurs JavaScript n'ont pas besoin d'allouer explicitement cet objet sur le tas. Ils peuvent plutôt traiter efficacement les valeurs de l'objet comme des variables locales à la fonction. Cela permet à son tour toutes sortes d'optimisations comme stocker ces valeurs sur la pile ou dans des registres, ou dans certains cas, optimiser complètement les valeurs. Les objets qui s'échappent (plus précisément, les objets dont on ne peut pas prouver qu'ils ne s'échappent pas) doivent être alloués sur le tas.

<!--truncate-->
Par exemple, l'analyse d'évasion permet à V8 de réécrire efficacement le code suivant :

```js
function foo(a, b) {
  const object = { a, b };
  return object.a + object.b;
  // Remarque : `object` ne s'échappe pas.
}
```

…en ce code, qui permet plusieurs optimisations internes :

```js
function foo(a, b) {
  const object_a = a;
  const object_b = b;
  return object_a + object_b;
}
```

V8 v6.1 et les versions antérieures utilisaient une implémentation de l'analyse d'évasion qui était complexe et générait de nombreux bugs depuis son introduction. Cette implémentation a depuis été supprimée et un tout nouveau code de base pour l'analyse d'évasion est disponible dans [V8 v6.2](/blog/v8-release-62).

Cependant, [une vulnérabilité de sécurité Chrome](https://chromereleases.googleblog.com/2017/09/stable-channel-update-for-desktop_21.html) impliquant l'ancienne implémentation de l'analyse d'évasion dans V8 v6.1 a été découverte et nous a été divulguée de manière responsable. Pour protéger nos utilisateurs, nous avons désactivé l'analyse d'évasion dans Chrome 61. Node.js ne devrait pas être affecté car l'exploit dépend de l'exécution de JavaScript non fiable.

Désactiver l'analyse d'évasion a un impact négatif sur les performances car cela désactive les optimisations mentionnées ci-dessus. En particulier, les fonctionnalités ES2015 suivantes pourraient subir des ralentissements temporaires :

- déstructuration
- itération `for`-`of`
- propagation d'un tableau
- paramètres Rest

Notez que la désactivation de l'analyse d'évasion n'est qu'une mesure temporaire. Avec Chrome 62, nous expédierons la toute nouvelle implémentation de l'analyse d'évasion — et surtout, activée — comme cela est le cas dans V8 v6.2.
