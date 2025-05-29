---
title: "Importation dynamique `import()`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2017-11-21
tags:
  - ECMAScript
  - ES2020
description: 'L'importation dynamique via `import()` débloque de nouvelles capacités par rapport à l'importation statique. Cet article compare les deux et donne un aperçu des nouveautés.'
tweet: "932914724060254208"
---
[`import()` dynamique](https://github.com/tc39/proposal-dynamic-import) introduit une nouvelle forme fonctionnelle d'`import` qui débloque de nouvelles capacités par rapport à l'`import` statique. Cet article compare les deux et donne un aperçu des nouveautés.

<!--truncate-->
## `import` statique (récapitulatif)

Chrome 61 prend en charge la déclaration `import` ES2015 dans le cadre des [modules](/features/modules).

Considérez le module suivant, situé à `./utils.mjs` :

```js
// Export par défaut
export default () => {
  console.log('Bonjour depuis l'export par défaut !');
};

// Export nommé `doStuff`
export const doStuff = () => {
  console.log('Effectuer des tâches…');
};
```

Voici comment importer statiquement et utiliser le module `./utils.mjs` :

```html
<script type="module">
  import * as module from './utils.mjs';
  module.default();
  // → affiche 'Bonjour depuis l'export par défaut !'
  module.doStuff();
  // → affiche 'Effectuer des tâches…'
</script>
```

:::note
**Remarque :** L'exemple précédent utilise l'extension `.mjs` pour indiquer qu'il s'agit d'un module et non d'un script classique. Sur le web, l'extension de fichier n'a pas vraiment d'importance tant que les fichiers sont servis avec le type MIME correct (par exemple, `text/javascript` pour les fichiers JavaScript) dans l'en-tête HTTP `Content-Type`.

L'extension `.mjs` est particulièrement utile sur d'autres plateformes telles que [Node.js](https://nodejs.org/api/esm.html#esm_enabling) et [`d8`](/docs/d8), où il n'y a pas de concept de types MIME ou d'autres mécanismes obligatoires comme `type="module"` pour déterminer si quelque chose est un module ou un script classique. Nous utilisons la même extension ici pour assurer une cohérence entre les plateformes et pour distinguer clairement les modules des scripts classiques.
:::

Cette forme syntaxique pour importer des modules est une déclaration *statique* : elle n'accepte qu'un littéral chaîne comme spécificateur de module et introduit des liaisons dans la portée locale grâce à un processus de « liaison » pré-runtime. La syntaxe `import` statique ne peut être utilisée qu'au niveau supérieur du fichier.

L'`import` statique permet des cas d'utilisation importants tels que l'analyse statique, les outils de bundling et l'élimination de code non utilisé (tree-shaking).

Dans certains cas, il est utile de :

- importer un module à la demande (ou conditionnellement)
- calculer le spécificateur du module à l'exécution
- importer un module depuis un script classique (plutôt qu'un module)

Aucun de ceux-ci n'est possible avec l'`import` statique.

## `import()` dynamique 🔥

[`import()` dynamique](https://github.com/tc39/proposal-dynamic-import) introduit une nouvelle forme fonctionnelle d'`import` adaptée à ces cas d'utilisation. `import(moduleSpecifier)` renvoie une promesse contenant l'objet espace de noms du module demandé, qui est créé après la récupération, l'instanciation et l'évaluation de toutes les dépendances du module ainsi que du module lui-même.

Voici comment importer dynamiquement et utiliser le module `./utils.mjs` :

```html
<script type="module">
  const moduleSpecifier = './utils.mjs';
  import(moduleSpecifier)
    .then((module) => {
      module.default();
      // → affiche 'Bonjour depuis l'export par défaut !'
      module.doStuff();
      // → affiche 'Effectuer des tâches…'
    });
</script>
```

Puisque `import()` renvoie une promesse, il est possible d'utiliser `async`/`await` au lieu du style basé sur les callbacks avec `then` :

```html
<script type="module">
  (async () => {
    const moduleSpecifier = './utils.mjs';
    const module = await import(moduleSpecifier)
    module.default();
    // → affiche 'Bonjour depuis l'export par défaut !'
    module.doStuff();
    // → affiche 'Effectuer des tâches…'
  })();
</script>
```

:::note
**Remarque :** Bien que `import()` *ressemble* à un appel de fonction, il est spécifié comme une *syntaxe* qui utilise des parenthèses (similaire à [`super()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super)). Cela signifie que `import` n'hérite pas de `Function.prototype`, vous ne pouvez donc pas `call` ou `apply`, et des choses comme `const importAlias = import` ne fonctionnent pas — en fait, `import` n'est même pas un objet ! Cela n'a pas vraiment d'importance en pratique cependant.
:::

Voici un exemple illustrant comment `import()` dynamique permet le chargement paresseux (lazy-loading) des modules lors de la navigation dans une petite application à page unique :

```html
<!DOCTYPE html>
<meta charset="utf-8">
<title>Ma bibliothèque</title>
<nav>
  <a href="books.html" data-entry-module="books">Livres</a>
  <a href="movies.html" data-entry-module="movies">Films</a>
  <a href="video-games.html" data-entry-module="video-games">Jeux vidéo</a>
</nav>
<main>Voici un espace réservé pour le contenu qui sera chargé à la demande.</main>
<script>
  const main = document.querySelector('main');
  const links = document.querySelectorAll('nav > a');
  for (const link of links) {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        const module = await import(`/${link.dataset.entryModule}.mjs`);
        // Le module exporte une fonction nommée `loadPageInto`.
        module.loadPageInto(main);
      } catch (error) {
        main.textContent = error.message;
      }
    });
  }
</script>
```

Les capacités de chargement paresseux activées par l'importation dynamique `import()` peuvent être très puissantes lorsqu'elles sont appliquées correctement. À titre de démonstration, [Addy](https://twitter.com/addyosmani) a modifié [un exemple de PWA Hacker News](https://hnpwa-vanilla.firebaseapp.com/) qui importait statiquement toutes ses dépendances, y compris les commentaires, lors du premier chargement. [La version mise à jour](https://dynamic-import.firebaseapp.com/) utilise `import()` de manière dynamique pour charger paresseusement les commentaires, évitant ainsi le coût de chargement, d'analyse et de compilation jusqu'à ce que l'utilisateur en ait réellement besoin.

:::note
**Remarque :** Si votre application importe des scripts d'un autre domaine (que ce soit statiquement ou dynamiquement), les scripts doivent être retournés avec des en-têtes CORS valides (comme `Access-Control-Allow-Origin: *`). En effet, contrairement aux scripts classiques, les scripts modules (et leurs importations) sont récupérés avec CORS.
:::

## Recommandations

Les `import` statiques et les `import()` dynamiques sont tous deux utiles. Chacun a ses propres cas d'utilisation très distincts. Utilisez les `import` statiques pour les dépendances de rendu initial, en particulier pour le contenu au-dessus de la ligne de flottaison. Dans d'autres cas, envisagez de charger les dépendances à la demande avec `import()` dynamique.

## Support de `import()` dynamique

<feature-support chrome="63"
                 firefox="67"
                 safari="11.1"
                 nodejs="13.2 https://nodejs.medium.com/announcing-core-node-js-support-for-ecmascript-modules-c5d6dc29b663"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-syntax-dynamic-import"></feature-support>
