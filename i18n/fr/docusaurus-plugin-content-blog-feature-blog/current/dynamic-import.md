---
title: &apos;Importation dynamique `import()`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-11-21
tags:
  - ECMAScript
  - ES2020
description: &apos;L&apos;importation dynamique via `import()` débloque de nouvelles capacités par rapport à l&apos;importation statique. Cet article compare les deux et donne un aperçu des nouveautés.&apos;
tweet: &apos;932914724060254208&apos;
---
[`import()` dynamique](https://github.com/tc39/proposal-dynamic-import) introduit une nouvelle forme fonctionnelle d&apos;`import` qui débloque de nouvelles capacités par rapport à l&apos;`import` statique. Cet article compare les deux et donne un aperçu des nouveautés.

<!--truncate-->
## `import` statique (récapitulatif)

Chrome 61 prend en charge la déclaration `import` ES2015 dans le cadre des [modules](/features/modules).

Considérez le module suivant, situé à `./utils.mjs` :

```js
// Export par défaut
export default () => {
  console.log(&apos;Bonjour depuis l&apos;export par défaut !&apos;);
};

// Export nommé `doStuff`
export const doStuff = () => {
  console.log(&apos;Effectuer des tâches…&apos;);
};
```

Voici comment importer statiquement et utiliser le module `./utils.mjs` :

```html
<script type="module">
  import * as module from &apos;./utils.mjs&apos;;
  module.default();
  // → affiche &apos;Bonjour depuis l&apos;export par défaut !&apos;
  module.doStuff();
  // → affiche &apos;Effectuer des tâches…&apos;
</script>
```

:::note
**Remarque :** L&apos;exemple précédent utilise l&apos;extension `.mjs` pour indiquer qu&apos;il s&apos;agit d&apos;un module et non d&apos;un script classique. Sur le web, l&apos;extension de fichier n&apos;a pas vraiment d&apos;importance tant que les fichiers sont servis avec le type MIME correct (par exemple, `text/javascript` pour les fichiers JavaScript) dans l&apos;en-tête HTTP `Content-Type`.

L&apos;extension `.mjs` est particulièrement utile sur d&apos;autres plateformes telles que [Node.js](https://nodejs.org/api/esm.html#esm_enabling) et [`d8`](/docs/d8), où il n&apos;y a pas de concept de types MIME ou d&apos;autres mécanismes obligatoires comme `type="module"` pour déterminer si quelque chose est un module ou un script classique. Nous utilisons la même extension ici pour assurer une cohérence entre les plateformes et pour distinguer clairement les modules des scripts classiques.
:::

Cette forme syntaxique pour importer des modules est une déclaration *statique* : elle n&apos;accepte qu&apos;un littéral chaîne comme spécificateur de module et introduit des liaisons dans la portée locale grâce à un processus de « liaison » pré-runtime. La syntaxe `import` statique ne peut être utilisée qu&apos;au niveau supérieur du fichier.

L&apos;`import` statique permet des cas d&apos;utilisation importants tels que l&apos;analyse statique, les outils de bundling et l&apos;élimination de code non utilisé (tree-shaking).

Dans certains cas, il est utile de :

- importer un module à la demande (ou conditionnellement)
- calculer le spécificateur du module à l&apos;exécution
- importer un module depuis un script classique (plutôt qu&apos;un module)

Aucun de ceux-ci n&apos;est possible avec l&apos;`import` statique.

## `import()` dynamique 🔥

[`import()` dynamique](https://github.com/tc39/proposal-dynamic-import) introduit une nouvelle forme fonctionnelle d&apos;`import` adaptée à ces cas d&apos;utilisation. `import(moduleSpecifier)` renvoie une promesse contenant l&apos;objet espace de noms du module demandé, qui est créé après la récupération, l&apos;instanciation et l&apos;évaluation de toutes les dépendances du module ainsi que du module lui-même.

Voici comment importer dynamiquement et utiliser le module `./utils.mjs` :

```html
<script type="module">
  const moduleSpecifier = &apos;./utils.mjs&apos;;
  import(moduleSpecifier)
    .then((module) => {
      module.default();
      // → affiche &apos;Bonjour depuis l&apos;export par défaut !&apos;
      module.doStuff();
      // → affiche &apos;Effectuer des tâches…&apos;
    });
</script>
```

Puisque `import()` renvoie une promesse, il est possible d&apos;utiliser `async`/`await` au lieu du style basé sur les callbacks avec `then` :

```html
<script type="module">
  (async () => {
    const moduleSpecifier = &apos;./utils.mjs&apos;;
    const module = await import(moduleSpecifier)
    module.default();
    // → affiche &apos;Bonjour depuis l&apos;export par défaut !&apos;
    module.doStuff();
    // → affiche &apos;Effectuer des tâches…&apos;
  })();
</script>
```

:::note
**Remarque :** Bien que `import()` *ressemble* à un appel de fonction, il est spécifié comme une *syntaxe* qui utilise des parenthèses (similaire à [`super()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super)). Cela signifie que `import` n&apos;hérite pas de `Function.prototype`, vous ne pouvez donc pas `call` ou `apply`, et des choses comme `const importAlias = import` ne fonctionnent pas — en fait, `import` n&apos;est même pas un objet ! Cela n&apos;a pas vraiment d&apos;importance en pratique cependant.
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
  const main = document.querySelector(&apos;main&apos;);
  const links = document.querySelectorAll(&apos;nav > a&apos;);
  for (const link of links) {
    link.addEventListener(&apos;click&apos;, async (event) => {
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
