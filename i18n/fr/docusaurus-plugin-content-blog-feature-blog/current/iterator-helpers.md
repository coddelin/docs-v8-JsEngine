---
title: 'Assistants d'itérateurs'
author: 'Rezvan Mahdavi Hezaveh'
avatars:
  - 'rezvan-mahdavi-hezaveh'
date: 2024-03-27
tags:
  - ECMAScript
description: 'Interfaces qui aident à l'utilisation générale et à la consommation des itérateurs.'
tweet: ''
---

*Les assistants d'itérateurs* sont une collection de nouvelles méthodes sur le prototype d'Iterator qui aident à l'utilisation générale des itérateurs. Puisque ces méthodes d'assistance se trouvent sur le prototype d'Iterator, tout objet qui possède `Iterator.prototype` dans sa chaîne de prototypes (par exemple, les itérateurs de tableau) héritera des méthodes. Dans les sous-sections suivantes, nous expliquons les assistants d'itérateurs. Tous les exemples fournis fonctionnent sur une page d'archive de blog contenant une liste d'articles de blog, illustrant comment les assistants d'itérateurs sont utiles pour rechercher et manipuler des articles. Vous pouvez les essayer sur la [page du blog V8](https://v8.dev/blog) !

<!--truncate-->

## .map(mapperFn)

`map` prend une fonction de mappage comme argument. Cet assistant retourne un itérateur de valeurs avec la fonction de mappage appliquée aux valeurs d'origine de l'itérateur.

```javascript
// Sélectionner la liste des articles de blog de la page d'archive.
const posts = document.querySelectorAll('li:not(header li)');

// Obtenir la liste des articles, retourner une liste de leur contenu textuel (titres) et les afficher.
for (const post of posts.values().map((x) => x.textContent)) {
  console.log(post);
}
```

## .filter(filtererFn)

`filter` prend une fonction de filtre en argument. Cet assistant retourne un itérateur des valeurs de l'itérateur d'origine pour lesquelles la fonction de filtre a retourné une valeur vraie.

```javascript
// Sélectionner la liste des articles de blog de la page d'archive.
const posts = document.querySelectorAll('li:not(header li)');

// Filtrer les articles de blog qui contiennent `V8` dans leur contenu textuel (titres) et les afficher.
for (const post of posts.values().filter((x) => x.textContent.includes('V8'))) {
  console.log(post);
} 
```

## .take(limit)

`take` prend un entier en argument. Cet assistant retourne un itérateur des valeurs de l'itérateur d'origine, jusqu'à `limit` valeurs.

```javascript
// Sélectionner la liste des articles de blog de la page d'archive.
const posts = document.querySelectorAll('li:not(header li)');

// Sélectionner 10 articles de blog récents et les afficher.
for (const post of posts.values().take(10)) {
  console.log(post);
}
```

## .drop(limit)

`drop` prend un entier en argument. Cet assistant retourne un itérateur des valeurs de l'itérateur d'origine, en commençant par la valeur suivante après avoir sauté `limit` valeurs.

```javascript
// Sélectionner la liste des articles de blog de la page d'archive.
const posts = document.querySelectorAll('li:not(header li)');

// Ignorer 10 articles de blog récents et afficher le reste.
for (const post of posts.values().drop(10)) {
  console.log(post);
}
```

## .flatMap(mapperFn)

`flatMap` prend une fonction de mappage en argument. Cet assistant retourne un itérateur des valeurs des itérateurs produits en appliquant la fonction de mappage aux valeurs d'origine de l'itérateur. Autrement dit, les itérateurs retournés par la fonction de mappage sont aplatis dans l'itérateur retourné par cet assistant.

```javascript
// Sélectionner la liste des articles de blog de la page d'archive.
const posts = document.querySelectorAll('li:not(header li)');

// Obtenir la liste des tags des articles de blog et les afficher. Chaque article peut avoir
// plus d'un tag.
for (const tag of posts.values().flatMap((x) => x.querySelectorAll('.tag').values())) {
    console.log(tag.textContent);
}
```

## .reduce(reducer [, initialValue ])

`reduce` prend une fonction de réduction et une valeur initiale facultative. Cet assistant retourne une valeur résultant de l'application de la fonction de réduction à chaque valeur de l'itérateur tout en suivant le dernier résultat obtenu. La valeur initiale est utilisée comme point de départ pour la fonction de réduction lorsqu'elle traite la première valeur de l'itérateur.

```javascript
// Sélectionner la liste des articles de blog de la page d'archive.
const posts = document.querySelectorAll('li:not(header li)');

// Obtenir la liste des tags pour tous les articles.
const tagLists = posts.values().flatMap((x) => x.querySelectorAll('.tag').values());

// Obtenir le contenu textuel pour chaque tag dans la liste.
const tags = tagLists.map((x) => x.textContent);

// Compter les articles avec le tag "security".
const count = tags.reduce((sum , value) => sum + (value === 'security' ? 1 : 0), 0);
console.log(count);
```

## .toArray()

`toArray` retourne un tableau à partir des valeurs de l'itérateur.

```javascript
// Sélectionner la liste des articles de blog de la page d'archive.
const posts = document.querySelectorAll('li:not(header li)');

// Créer un tableau à partir de la liste des 10 articles de blog récents.
const arr = posts.values().take(10).toArray();
```

## .forEach(fn)

`forEach` prend une fonction en argument et l'applique à chaque élément de l'itérateur. Cet assistant est appelé pour son effet de bord et retourne `undefined`.

```javascript
// Sélectionner la liste des articles de blog de la page d'archive.
const posts = document.querySelectorAll('li:not(header li)');

// Obtenez les dates où au moins un article de blog est publié et enregistrez-les.
const dates = new Set();
const forEach = posts.values().forEach((x) => dates.add(x.querySelector('time')));
console.log(dates);
```

## .some(fn)

`some` prend une fonction prédicat comme argument. Ce helper renvoie `true` si un élément de l'itérateur retourne vrai lorsque cette fonction lui est appliquée. L'itérateur est consommé après l'appel de `some`.

```javascript
// Sélectionnez la liste des articles de blog depuis une page d'archive de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Découvrez si le contenu texte (titre) d'un article de blog inclut le mot-clé `Iterators`.
posts.values().some((x) => x.textContent.includes('Iterators'));
```

## .every(fn)

`every` prend une fonction prédicat comme argument. Ce helper renvoie `true` si chaque élément de l'itérateur retourne vrai lorsque cette fonction lui est appliquée. L'itérateur est consommé après l'appel de `every`.

```javascript
// Sélectionnez la liste des articles de blog depuis une page d'archive de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Découvrez si le contenu texte (titre) de tous les articles de blog inclut le mot-clé `V8`.
posts.values().every((x) => x.textContent.includes('V8'));
```

## .find(fn)

`find` prend une fonction prédicat comme argument. Ce helper renvoie la première valeur de l'itérateur pour laquelle la fonction retourne une valeur véridique, ou `undefined` si aucune valeur ne le fait.

```javascript
// Sélectionnez la liste des articles de blog depuis une page d'archive de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Enregistrez le contenu texte (titre) de l'article de blog récent incluant le mot-clé `V8`.
console.log(posts.values().find((x) => x.textContent.includes('V8')).textContent);
```

## Iterator.from(object)

`from` est une méthode statique qui prend un objet en argument. Si l'`object` est déjà une instance d'Iterator, le helper le retourne directement. Si l'`object` possède `Symbol.iterator`, ce qui signifie qu'il est itérable, sa méthode `Symbol.iterator` est appelée pour obtenir l'itérateur et le helper le retourne. Sinon, un nouvel objet `Iterator` (qui hérite de `Iterator.prototype` et dispose des méthodes `next()` et `return()`) est créé pour encapsuler l'`object` et est retourné par ce helper.

```javascript
// Sélectionnez la liste des articles de blog depuis une page d'archive de blog.
const posts = document.querySelectorAll('li:not(header li)');

// Créez d'abord un itérateur à partir des articles. Ensuite, enregistrez le contenu texte (titre) 
// de l'article de blog récent qui inclut le mot-clé `V8`.
console.log(Iterator.from(posts).find((x) => x.textContent.includes('V8')).textContent);
```

## Disponibilité

Les helpers d'Iterator sont disponibles depuis V8 v12.2.

## Support des helpers d'Iterator

<feature-support chrome="122 https://chromestatus.com/feature/5102502917177344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1568906"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=248650" 
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#iterator-helpers"></feature-support>
