---
title: "`Object.fromEntries`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), spécialiste en JavaScript"
avatars:
  - "mathias-bynens"
date: 2019-06-18
tags:
  - ECMAScript
  - ES2019
  - io19
description: "Object.fromEntries est un ajout utile à la bibliothèque JavaScript intégrée qui complète Object.entries."
tweet: "1140993821897121796"
---
`Object.fromEntries` est un ajout utile à la bibliothèque JavaScript intégrée. Avant d'expliquer ce qu'il fait, il est utile de comprendre l'API existante `Object.entries`.

## `Object.entries`

L'API `Object.entries` existe depuis un certain temps.

<feature-support chrome="54"
                 firefox="47"
                 safari="10.1"
                 nodejs="7"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>

Pour chaque paire clé-valeur dans un objet, `Object.entries` vous donne un tableau où le premier élément est la clé et le second élément est la valeur.

`Object.entries` est particulièrement utile en combinaison avec `for`-`of`, car il vous permet d'itérer très élégamment sur toutes les paires clé-valeur d'un objet :

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

for (const [key, value] of entries) {
  console.log(`La valeur de ${key} est ${value}.`);
}
// Affiche :
// La valeur de x est 42.
// La valeur de y est 50.
```

Malheureusement, il n'y a pas de moyen facile de revenir du résultat des entries à un objet équivalent… jusqu'à maintenant !

## `Object.fromEntries`

La nouvelle API `Object.fromEntries` effectue l'inverse de `Object.entries`. Cela facilite la reconstruction d'un objet à partir de ses entries :

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

Un cas d'utilisation courant est la transformation d'objets. Vous pouvez maintenant faire cela en itérant sur ses entries, puis en utilisant des méthodes de tableau que vous connaissez probablement déjà :

```js
const object = { x: 42, y: 50, abc: 9001 };
const result = Object.fromEntries(
  Object.entries(object)
    .filter(([ key, value ]) => key.length === 1)
    .map(([ key, value ]) => [ key, value * 2 ])
);
// → { x: 84, y: 100 }
```

Dans cet exemple, nous appliquons un `filter` sur l'objet pour ne récupérer que les clés de longueur `1`, c'est-à-dire seulement les clés `x` et `y`, mais pas la clé `abc`. Nous effectuons ensuite un `map` sur les entries restantes et retournons une paire clé-valeur mise à jour pour chacune. Dans cet exemple, nous doublons chaque valeur en la multipliant par `2`. Le résultat final est un nouvel objet, avec uniquement les propriétés `x` et `y`, et les nouvelles valeurs.

<!--truncate-->
## Objets vs Maps

JavaScript prend également en charge les `Map`s, qui sont souvent une structure de données plus adaptée que les objets classiques. Ainsi, dans le code que vous contrôlez entièrement, vous pourriez utiliser les maps au lieu des objets. Cependant, en tant que développeur, vous n'avez pas toujours le choix de la représentation. Parfois, les données sur lesquelles vous travaillez proviennent d'une API externe ou d'une fonction de bibliothèque qui vous retourne un objet au lieu d'une map.

`Object.entries` a facilité la conversion des objets en maps :

```js
const object = { language: 'JavaScript', coolness: 9001 };

// Convertir l'objet en une map :
const map = new Map(Object.entries(object));
```

L'inverse est tout aussi utile : même si votre code utilise des maps, vous pourriez avoir besoin de sérialiser vos données à un moment donné, par exemple pour les transformer en JSON afin d'envoyer une demande API. Ou peut-être devez-vous transmettre les données à une autre bibliothèque qui attend un objet plutôt qu'une map. Dans ces cas, vous devez créer un objet basé sur les données de la map. `Object.fromEntries` rend cela trivial :

```js
// Convertir la map en un objet :
const objectCopy = Object.fromEntries(map);
// → { language: 'JavaScript', coolness: 9001 }
```

Avec `Object.entries` et `Object.fromEntries` présents dans le langage, vous pouvez désormais facilement convertir entre maps et objets.

### Attention : méfiez-vous de la perte de données

Lors de la conversion des maps en objets simples comme dans l'exemple ci-dessus, il y a une hypothèse implicite selon laquelle chaque clé se convertit en chaîne de manière unique. Si cette hypothèse ne se vérifie pas, une perte de données se produit :

```js
const map = new Map([
  [{}, 'a'],
  [{}, 'b'],
]);
Object.fromEntries(map);
// → { '[object Object]': 'b' }
// Note : la valeur 'a' est introuvable, car les deux clés
// se convertissent en chaîne avec le même résultat '[object Object]'.
```

Avant d'utiliser `Object.fromEntries` ou une autre technique pour convertir une map en objet, assurez-vous que les clés de la map produisent des résultats `toString` uniques.

## Support de `Object.fromEntries`

<feature-support chrome="73 /blog/v8-release-73#object.fromentries"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>
