---
title: "Sortie de V8 v7.4"
author: "Georg Neis"
date: 2019-03-22 16:30:42
tags:
  - sortie
description: "V8 v7.4 introduit les threads/Atomics WebAssembly, les champs privés de classes, des améliorations de performance et de mémoire, et bien plus encore !"
tweet: "1109094755936489472"
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée du Git master de V8 juste avant une étape Beta de Chrome. Aujourd’hui, nous sommes heureux d’annoncer notre nouvelle branche, [V8 version 7.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.4), qui est en version bêta jusqu’à sa sortie coordonnée avec Chrome 74 Stable dans quelques semaines. V8 v7.4 est rempli de toutes sortes de nouveautés pour les développeurs. Cet article fournit un aperçu de certains des points forts en prévision de la sortie.

<!--truncate-->
## V8 sans JIT

V8 prend désormais en charge *JavaScript* sans allocation de mémoire exécutable à l’exécution. Des informations détaillées sur cette fonctionnalité sont disponibles dans le [article dédié du blog](/blog/jitless).

## Threads/Atomics WebAssembly activés

Les Threads/Atomics WebAssembly sont désormais activés sur les systèmes d’exploitation non Android. Cela conclut le [essai d’origine/aperçu que nous avons activé dans V8 v7.0](/blog/v8-release-70#a-preview-of-webassembly-threads). Un article de Web Fundamentals explique [comment utiliser WebAssembly Atomics avec Emscripten](https://developers.google.com/web/updates/2018/10/wasm-threads).

Cela débloque l’utilisation de plusieurs cœurs sur la machine d’un utilisateur via WebAssembly, permettant de nouveaux cas d’utilisation gourmands en calcul sur le web.

## Performance

### Appels plus rapides avec des arguments non correspondants

En JavaScript, il est parfaitement valide de appeler des fonctions avec trop peu ou trop d’arguments (c’est-à-dire passer moins ou plus que les paramètres formels déclarés). Le premier cas est appelé _sous-application_, tandis que le second est appelé _sur-application_. En cas de sous-application, les paramètres formels restants se voient attribuer `undefined`, tandis qu’en cas de sur-application, les paramètres superflus sont ignorés.

Cependant, les fonctions JavaScript peuvent toujours accéder aux véritables arguments via l’[`objet arguments`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments), en utilisant des [paramètres restants](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters), ou même en utilisant la propriété non standard [`Function.prototype.arguments`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/arguments) sur les fonctions en [mode relâché](https://developer.mozilla.org/en-US/docs/Glossary/Sloppy_mode). En conséquence, les moteurs JavaScript doivent fournir un moyen d’accéder aux véritables arguments. Dans V8, cela est fait via une technique appelée _adaptation des arguments_, qui fournit les véritables paramètres en cas de sous- ou de sur-application. Malheureusement, l’adaptation des arguments entraîne des coûts de performance et est couramment nécessaire dans les frameworks modernes de front-end et de middleware (c’est-à-dire de nombreuses APIs avec des paramètres optionnels ou des listes d’arguments variables).

Il existe des scénarios où le moteur sait que l’adaptation des arguments n’est pas nécessaire puisque les véritables arguments ne peuvent pas être observés, notamment lorsque la fonction appelée est en mode strict et n’utilise ni `arguments` ni des paramètres restants. Dans ces cas, V8 ignore complètement l’adaptation des arguments, réduisant les frais généraux d’appels jusqu’à **60%**.

![Impact sur les performances de l’ignorance de l’adaptation des arguments, mesuré via [un micro-benchmark](https://gist.github.com/bmeurer/4916fc2b983acc9ee1d33f5ee1ada1d3#file-bench-call-overhead-js).](/_img/v8-release-74/argument-mismatch-performance.svg)

Le graphique montre qu’il n’y a plus de surcharge, même en cas de discordance d’arguments (à condition que la fonction appelée ne puisse pas observer les véritables arguments). Pour plus de détails, voir le [document de conception](https://bit.ly/v8-faster-calls-with-arguments-mismatch).

### Performances améliorées des accesseurs natifs

L’équipe Angular [a découvert](https://mhevery.github.io/perf-tests/DOM-megamorphic.html) que l’appel des accesseurs natifs (c’est-à-dire des accesseurs de propriétés DOM) directement via leurs fonctions `get` respectives était significativement plus lent dans Chrome que l’accès aux propriétés [monomorphes](https://en.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching) ou même [mégamorphes](https://en.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching). Cela était dû au fait de suivre un chemin lent dans V8 pour appeler les accesseurs DOM via [`Function#call()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call), au lieu du chemin rapide déjà existant pour les accès aux propriétés.

![](/_img/v8-release-74/native-accessor-performance.svg)

Nous avons réussi à améliorer les performances des appels aux accesseurs natifs, les rendant nettement plus rapides que l'accès aux propriétés mégamorphiques. Pour plus d'informations, voir [V8 issue #8820](https://bugs.chromium.org/p/v8/issues/detail?id=8820).

### Performances du parseur

Dans Chrome, les scripts suffisamment grands sont analysés en 'streaming' sur des threads de travail pendant leur téléchargement. Dans cette version, nous avons identifié et corrigé un problème de performance lié au décodage UTF-8 personnalisé utilisé par le flux source, ce qui a permis d'obtenir une analyse en streaming 8 % plus rapide en moyenne.

Nous avons trouvé un problème supplémentaire dans le pré-analyseur de V8, qui fonctionne le plus souvent sur un thread de travail : les noms de propriétés étaient inutilement dédupliqués. En supprimant cette déduplication, nous avons amélioré le parseur en streaming de 10,5 % supplémentaires. Cela améliore également le temps de parse sur le thread principal pour les scripts qui ne sont pas analysés en streaming, comme les petits scripts et les scripts intégrés.

![Chaque baisse dans le graphique ci-dessus représente une des améliorations de performance du parseur en streaming.](/_img/v8-release-74/parser-performance.jpg)

## Mémoire

### Vidage de bytecode

Le bytecode compilé à partir de la source JavaScript occupe une part importante de l'espace de tas de V8, typiquement autour de 15 %, y compris les métadonnées associées. Il existe de nombreuses fonctions qui ne sont exécutées que pendant l'initialisation ou rarement utilisées après avoir été compilées.

Afin de réduire les coûts en mémoire de V8, nous avons mis en place la prise en charge du vidage du bytecode compilé des fonctions pendant la collecte des déchets si elles n'ont pas été exécutées récemment. Pour permettre cela, nous suivons l'âge du bytecode d'une fonction, en incrémentant cet âge lors des collectes de déchets, et en le réinitialisant à zéro lorsque la fonction est exécutée. Tout bytecode qui dépasse un seuil d'âge peut être collecté par la prochaine collecte des déchets, et la fonction est réinitialisée pour recompiler de manière paresseuse son bytecode si elle est exécutée à nouveau dans le futur.

Nos expériences avec le vidage de bytecode montrent qu'il offre des économies significatives de mémoire pour les utilisateurs de Chrome, réduisant la quantité de mémoire dans le tas de V8 de 5 à 15 % sans nuire aux performances ni augmenter de manière significative le temps CPU consacré à la compilation du code JavaScript.

![](/_img/v8-release-74/bytecode-flushing.svg)

### Élimination des blocs de base de bytecode morts

Le compilateur de bytecode Ignition tente d'éviter de générer du code qu'il sait être mort, par exemple après une instruction `return` ou `break` :

```js
return;
deadCall(); // ignoré
```

Cependant, auparavant, cela était fait de manière opportuniste pour les instructions de terminaison dans une liste d'instructions, donc cela ne prenait pas en compte d'autres optimisations, comme le court-circuitage des conditions qui sont connues comme vraies :

```js
if (2.2) return;
deadCall(); // non ignoré
```

Nous avons essayé de résoudre cela dans V8 v7.3, mais toujours au niveau de chaque instruction, ce qui ne fonctionnait pas lorsque le flux de contrôle devenait plus complexe :

```js
do {
  if (2.2) return;
  break;
} while (true);
deadCall(); // non ignoré
```

Le `deadCall()` ci-dessus commencerait un nouveau bloc de base, ce qui au niveau d'une instruction est atteignable comme cible pour les instructions `break` dans la boucle.

Dans V8 v7.4, nous permettons à des blocs de base entiers de devenir morts, si aucun bytecode `Jump` (la primitive principale du flux de contrôle d'Ignition) ne les référence. Dans l'exemple ci-dessus, le `break` n'est pas émis, ce qui signifie que la boucle n'a pas de déclarations `break`. Ainsi, le bloc de base commençant par `deadCall()` n'a pas de sauts référents et est donc également considéré comme mort. Bien que nous ne nous attendions pas à ce que cela ait un grand impact sur le code utilisateur, c'est particulièrement utile pour simplifier divers décompositions telles que les générateurs, `for-of` et `try-catch`, et en particulier cela supprime une classe de bogues où des blocs de base pourraient “résurrectionner” des instructions complexes au milieu de leur implémentation.

## Fonctionnalités du langage JavaScript

### Champs privés dans les classes

V8 v7.2 a ajouté la prise en charge de la syntaxe des champs publics dans les classes. Les champs de classe simplifient la syntaxe des classes en évitant le besoin de fonctions constructrices juste pour définir des propriétés d'instance. À partir de V8 v7.4, vous pouvez marquer un champ comme privé en le préfixant avec un `#`.

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log('Récupération de la valeur actuelle !');
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

Contrairement aux champs publics, les champs privés ne sont pas accessibles en dehors du corps de la classe :

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

Pour plus d'informations, lisez notre [article explicatif sur les champs de classe publics et privés](/features/class-fields).

### `Intl.Locale`

Les applications JavaScript utilisent généralement des chaînes comme `'en-US'` ou `'de-CH'` pour identifier les paramètres régionaux. `Intl.Locale` offre un mécanisme plus puissant pour gérer les paramètres régionaux, et permet d'extraire facilement les préférences spécifiques aux paramètres régionaux telles que la langue, le calendrier, le système de numérotation, le cycle horaire, etc.

```js
const locale = new Intl.Locale('es-419-u-hc-h12', {
  calendar: 'gregory'
});
locale.language;
// → 'es'
locale.calendar;
// → 'gregory'
locale.hourCycle;
// → 'h12'
locale.region;
// → '419'
locale.toString();
// → 'es-419-u-ca-gregory-hc-h12'
```

### Grammaire du Hashbang

Les programmes JavaScript peuvent désormais commencer par `#!`, un soi-disant [hashbang](https://github.com/tc39/proposal-hashbang). Le reste de la ligne suivant le hashbang est traité comme un commentaire sur une seule ligne. Cela correspond à l'utilisation de facto dans les hôtes JavaScript en ligne de commande, comme Node.js. Ce qui suit est désormais un programme JavaScript syntaxiquement valide :

```js
#!/usr/bin/env node
console.log(42);
```

## API V8

Veuillez utiliser `git log branch-heads/7.3..branch-heads/7.4 include/v8.h` pour obtenir une liste des modifications de l'API.

Les développeurs ayant un [dépôt actif V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 7.4 -t branch-heads/7.4` pour expérimenter les nouvelles fonctionnalités de V8 v7.4. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt par vous-même les nouvelles fonctionnalités.
