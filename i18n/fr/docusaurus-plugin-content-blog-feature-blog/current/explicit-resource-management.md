---
title: "La Nouvelle Superpuissance de JavaScript : Gestion Explicite des Ressources"
author: 'Rezvan Mahdavi Hezaveh'
avatars:
  - 'rezvan-mahdavi-hezaveh'
date: 2025-05-09
tags:
  - ECMAScript
description: 'La proposition de Gestion Explicite des Ressources permet aux développeurs de gérer explicitement le cycle de vie des ressources.'
tweet: ''
---

La proposition *Gestion Explicite des Ressources* introduit une approche déterministe pour gérer explicitement le cycle de vie des ressources telles que les gestionnaires de fichiers, les connexions réseau, et plus encore. Cette proposition apporte les ajouts suivants au langage : les déclarations `using` et `await using`, qui appellent automatiquement la méthode de disposition lorsqu'une ressource sort de leur champ d'application ; les symboles `[Symbol.dispose]()` et `[Symbol.asyncDispose]()` pour les opérations de nettoyage ; deux nouveaux objets globaux `DisposableStack` et `AsyncDisposableStack` en tant que conteneurs pour agréger les ressources jetables ; et `SuppressedError` comme nouveau type d'erreur (contient à la fois l'erreur la plus récemment levée, ainsi que l'erreur supprimée) pour gérer le scénario où une erreur se produit lors de la disposition d'une ressource, masquant potentiellement une erreur existante levée dans le corps, ou lors de la disposition d'une autre ressource. Ces ajouts permettent aux développeurs d'écrire un code plus robuste, performant et maintenable en offrant un contrôle précis sur la disposition des ressources.

<!--truncate-->
## Déclarations `using` et `await using`

Le cœur de la proposition Gestion Explicite des Ressources réside dans les déclarations `using` et `await using`. La déclaration `using` est conçue pour les ressources synchrones, garantissant que la méthode `[Symbol.dispose]()` d'une ressource jetable est appelée lorsque le champ d'application dans lequel elle est déclarée se termine. Pour les ressources asynchrones, la déclaration `await using` fonctionne de manière similaire, mais garantit que la méthode `[Symbol.asyncDispose]()` est appelée et que le résultat de cet appel est attendu, permettant ainsi des opérations de nettoyage asynchrones. Cette distinction permet aux développeurs de gérer de manière fiable les ressources synchrones et asynchrones, évitant ainsi les fuites et améliorant la qualité globale du code. Les mots-clés `using` et `await using` peuvent être utilisés à l'intérieur des accolades `{}` (comme les blocs, les boucles for et les corps de fonction), et ne peuvent pas être utilisés au niveau supérieur.

Par exemple, lorsqu'on travaille avec [`ReadableStreamDefaultReader`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader), il est crucial d'appeler `reader.releaseLock()` pour déverrouiller le flux et lui permettre d'être utilisé ailleurs. Cependant, la gestion des erreurs introduit un problème courant : si une erreur survient durant le processus de lecture, et que vous oubliez d'appeler `releaseLock()` avant que l'erreur ne se propage, le flux reste verrouillé. Commençons par un exemple naïf :

```javascript
let responsePromise = null;

async function readFile(url) {
    if (!responsePromise) {
        // Effectuer une requête seulement si nous n'avons pas encore de promesse
        responsePromise = fetch(url);
    }
    const response = await responsePromise;
    if (!response.ok) {
      throw new Error(`Erreur HTTP ! statut : ${response.status}`);
    }
    const processedData = await processData(response);

    // Faire quelque chose avec processedData
    ...
 }

async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // Traiter les données et sauvegarder le résultat dans processedData
            ...
            // Une erreur est levée ici !
        }
    }
    
    // Étant donné que l'erreur est levée avant cette ligne, le flux reste verrouillé.
    reader.releaseLock(); 

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

Il est donc primordial pour les développeurs d'utiliser un bloc `try...finally` lorsqu'ils utilisent des flux et de placer `reader.releaseLock()` dans `finally`. Ce schéma garantit que `reader.releaseLock()` est toujours appelé.

```javascript
async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    try {
        while (!done) {
            ({ done, value } = await reader.read());
            if (value) {
                // Traiter les données et sauvegarder le résultat dans processedData
                ...
                // Une erreur est levée ici !
            }
        }
    } finally {
        // Le verrou du lecteur sur le flux sera toujours libéré.
        reader.releaseLock();
    }

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

Une alternative pour écrire ce code consiste à créer un objet jetable `readerResource`, qui possède le lecteur (`response.body.getReader()`) et la méthode `[Symbol.dispose]()` qui appelle `this.reader.releaseLock()`. La déclaration `using` garantit que `readerResource[Symbol.dispose]()` est appelée lorsque le bloc de code se termine, et il n'est plus nécessaire de se rappeler d'appeler `releaseLock` car la déclaration `using` s'en charge. L'intégration de `[Symbol.dispose]` et `[Symbol.asyncDispose]` dans les API web comme les flux pourrait avoir lieu dans le futur, de sorte que les développeurs n'aient plus besoin d'écrire le wrapper manuel.

```javascript
 async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;

    // Enveloppe le lecteur dans une ressource jetable
    using readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
        },
    };
    const { reader } = readerResource;

    let done = false;
    let value;
    let processedData;
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // Traite les données et enregistre le résultat dans processedData
            ...
            // Une erreur est déclenchée ici !
        }
    }
    return processedData;
  }
 // readerResource[Symbol.dispose]() est appelé automatiquement.

 readFile('https://example.com/largefile.dat');
```

## `DisposableStack` et `AsyncDisposableStack`

Pour faciliter davantage la gestion de plusieurs ressources jetables, la proposition introduit `DisposableStack` et `AsyncDisposableStack`. Ces structures basées sur des piles permettent aux développeurs de regrouper et de disposer de plusieurs ressources de manière coordonnée. Les ressources sont ajoutées à la pile, et lorsque la pile est supprimée, de manière synchrone ou asynchrone, les ressources sont supprimées dans l'ordre inverse de leur ajout, garantissant que leurs dépendances éventuelles sont traitées correctement. Cela simplifie le processus de nettoyage dans les scénarios complexes impliquant plusieurs ressources liées. Les deux structures fournissent des méthodes comme `use()`, `adopt()`, et `defer()` pour ajouter des ressources ou des actions de suppression, ainsi qu'une méthode `dispose()` ou `asyncDispose()` pour déclencher le nettoyage. `DisposableStack` et `AsyncDisposableStack` ont `[Symbol.dispose]()` et `[Symbol.asyncDispose]()`, respectivement, de sorte qu'ils peuvent être utilisés avec les mots-clés `using` et `await using`. Ils offrent un moyen robuste de gérer la suppression de plusieurs ressources dans une portée définie.

Regardons chaque méthode et voyons un exemple de celle-ci :

`use(value)` ajoute une ressource au sommet de la pile.

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('Reader lock released.');
        },
    };
    using stack = new DisposableStack();
    stack.use(readerResource);
}
// Verrou du lecteur libéré.
```

`adopt(value, onDispose)` ajoute une ressource non jetable et un rappel de suppression au sommet de la pile.

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader = > {
        reader.releaseLock();
        console.log('Reader lock released.');
      });
}
// Verrou du lecteur libéré.
```

`defer(onDispose)` ajoute un rappel de suppression au sommet de la pile. C'est utile pour ajouter des actions de nettoyage qui n'ont pas de ressource associée.

```javascript
{
    using stack = new DisposableStack();
    stack.defer(() => console.log("fait."));
}
// fait.
```

`move()` transfère toutes les ressources actuellement présentes dans cette pile dans une nouvelle `DisposableStack`. Cela peut être utile si vous devez transférer la propriété des ressources à une autre partie de votre code.

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader = > {
        reader.releaseLock();
        console.log('Reader lock released.');
      });
    using newStack = stack.move();
}
// Ici, seule newStack existe et la ressource à l'intérieur sera supprimée.
// Verrou du lecteur libéré.
```

`dispose()` dans DisposableStack et `disposeAsync()` dans AsyncDisposableStack suppriment les ressources de cet objet.

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('Reader lock released.');
        },
    };
    let stack = new DisposableStack();
    stack.use(readerResource);
    stack.dispose();
}
// Verrou du lecteur libéré.
```

## Disponibilité

La gestion explicite des ressources est livrée dans Chromium 134 et V8 v13.8.

## Prise en charge de la gestion explicite des ressources

<feature-support chrome="134 https://chromestatus.com/feature/5071680358842368"
                 firefox="134 (nightly) https://bugzilla.mozilla.org/show_bug.cgi?id=1927195"
                 safari="non https://bugs.webkit.org/show_bug.cgi?id=248707" 
                 nodejs="non"
                 babel="oui https://github.com/zloirock/core-js#explicit-resource-management"></feature-support>
