---
title: &apos;Modules JavaScript&apos;
author: &apos;Addy Osmani ([@addyosmani](https://twitter.com/addyosmani)) et Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
- &apos;addy-osmani&apos;
- &apos;mathias-bynens&apos;
date: 2018-06-18
tags:
  - ECMAScript
  - ES2015
description: &apos;Cet article explique comment utiliser les modules JavaScript, comment les déployer de manière responsable et comment l&apos;équipe Chrome travaille pour les améliorer encore à l&apos;avenir.&apos;
tweet: &apos;1008725884575109120&apos;
---
Les modules JavaScript sont désormais [pris en charge dans tous les principaux navigateurs](https://caniuse.com/#feat=es6-module) !

<feature-support chrome="61"
                 firefox="60"
                 safari="11"
                 nodejs="13.2.0 https://nodejs.org/en/blog/release/v13.2.0/#notable-changes"
                 babel="yes"></feature-support>

Cet article explique comment utiliser les modules JS, comment les déployer de manière responsable et comment l&apos;équipe Chrome travaille pour les améliorer encore à l&apos;avenir.

## Que sont les modules JS ?

Les modules JS (également connus sous le nom de “modules ES” ou “modules ECMAScript”) sont une nouvelle fonctionnalité majeure, ou plutôt un ensemble de nouvelles fonctionnalités. Vous avez peut-être utilisé un système de modules JavaScript utilisateur dans le passé. Peut-être avez-vous utilisé [CommonJS comme dans Node.js](https://nodejs.org/docs/latest-v10.x/api/modules.html), ou peut-être [AMD](https://github.com/amdjs/amdjs-api/blob/master/AMD.md), ou peut-être autre chose. Tous ces systèmes de modules ont une chose en commun : ils vous permettent d&apos;importer et d&apos;exporter des éléments.

<!--truncate-->
JavaScript a désormais une syntaxe standardisée précisément pour cela. À l&apos;intérieur d&apos;un module, vous pouvez utiliser le mot-clé `export` pour exporter à peu près n&apos;importe quoi. Vous pouvez exporter une `const`, une `function` ou toute autre liaison ou déclaration de variable. Il suffit de préfixer l&apos;instruction ou la déclaration de la variable avec `export` et le tour est joué :

```js
// 📁 lib.mjs
export const repeat = (string) => `${string} ${string}`;
export function shout(string) {
  return `${string.toUpperCase()}!`;
}
```

Vous pouvez ensuite utiliser le mot-clé `import` pour importer le module à partir d&apos;un autre module. Ici, nous importons les fonctionnalités `repeat` et `shout` du module `lib`, et nous les utilisons dans notre module `main` :

```js
// 📁 main.mjs
import {repeat, shout} from &apos;./lib.mjs&apos;;
repeat(&apos;hello&apos;);
// → &apos;hello hello&apos;
shout(&apos;Modules in action&apos;);
// → &apos;MODULES IN ACTION!&apos;
```

Vous pourriez également exporter une valeur _par défaut_ d&apos;un module :

```js
// 📁 lib.mjs
export default function(string) {
  return `${string.toUpperCase()}!`;
}
```

Ces exports `default` peuvent être importés en utilisant n&apos;importe quel nom :

```js
// 📁 main.mjs
import shout from &apos;./lib.mjs&apos;;
//     ^^^^^
```

Les modules sont un peu différents des scripts classiques :

- Les modules ont le [mode strict](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode) activé par défaut.

- La syntaxe de commentaire de style HTML n&apos;est pas prise en charge dans les modules, bien qu&apos;elle fonctionne dans les scripts classiques.

    ```js
    // N&apos;utilisez pas la syntaxe de commentaire de type HTML dans JavaScript !
    const x = 42; <!-- TODO: Renommez x en y.
    // Utilisez un commentaire régulier sur une seule ligne à la place :
    const x = 42; // TODO: Renommez x en y.
    ```

- Les modules ont une portée lexicale au niveau supérieur. Cela signifie que, par exemple, exécuter `var foo = 42;` dans un module ne crée *pas* une variable globale nommée `foo`, accessible via `window.foo` dans un navigateur, bien que ce soit le cas dans un script classique.

- De même, le `this` au sein des modules ne fait pas référence au `this` global, et est plutôt `undefined`. (Utilisez [`globalThis`](/features/globalthis) si vous avez besoin d&apos;accéder à `this` global.)

- La nouvelle syntaxe statique `import` et `export` est uniquement disponible dans les modules — elle ne fonctionne pas dans les scripts classiques.

- [Le `await` au niveau supérieur](/features/top-level-await) est disponible dans les modules, mais pas dans les scripts classiques. En rapport avec cela, `await` ne peut pas être utilisé comme nom de variable nulle part dans un module, bien que les variables dans les scripts classiques _puissent_ être nommées `await` en dehors des fonctions asynchrones.

En raison de ces différences, *le même code JavaScript peut se comporter différemment lorsqu&apos;il est traité comme un module vs. un script classique*. En tant que tel, le runtime JavaScript doit savoir quels scripts sont des modules.

## Utiliser des modules JS dans le navigateur

Sur le Web, vous pouvez indiquer aux navigateurs de traiter un élément `<script>` comme un module en définissant l&apos;attribut `type` sur `module`.

```html
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

Les navigateurs qui comprennent `type="module"` ignorent les scripts avec un attribut `nomodule`. Cela signifie que vous pouvez servir une charge utile basée sur un module aux navigateurs qui prennent en charge les modules tout en fournissant une solution de repli à d'autres navigateurs. La possibilité de faire cette distinction est incroyable, ne serait-ce que pour les performances ! Pensez-y : seuls les navigateurs modernes supportent les modules. Si un navigateur comprend votre code de module, il supporte également [des fonctionnalités qui existaient avant les modules](https://codepen.io/samthor/pen/MmvdOM), comme les fonctions fléchées ou `async`-`await`. Vous n’avez plus besoin de transpiler ces fonctionnalités dans votre bundle de module ! Vous pouvez [servir des charges utiles basées sur des modules, plus petites et largement non transpileés, aux navigateurs modernes](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/). Seuls les navigateurs anciens reçoivent la charge utile `nomodule`.

Puisque [les modules sont différés par défaut](#defer), vous pouvez également vouloir charger le script `nomodule` de manière différée :

```html
<script type="module" src="main.mjs"></script>
<script nomodule defer src="fallback.js"></script>
```

### Différences spécifiques aux navigateurs entre les modules et les scripts classiques

Comme vous le savez maintenant, les modules diffèrent des scripts classiques. En plus des différences indépendantes de la plateforme que nous avons décrites ci-dessus, il existe des différences spécifiques aux navigateurs.

Par exemple, les modules sont évalués une seule fois, tandis que les scripts classiques sont évalués autant de fois que vous les ajoutez au DOM.

```html
<script src="classic.js"></script>
<script src="classic.js"></script>
<!-- classic.js s'exécute plusieurs fois. -->

<script type="module" src="module.mjs"></script>
<script type="module" src="module.mjs"></script>
<script type="module">import &apos;./module.mjs&apos;;</script>
<!-- module.mjs s'exécute une seule fois. -->
```

De plus, les scripts de module et leurs dépendances sont récupérés avec CORS. Cela signifie que tout script de module cross-origin doit être servi avec les en-têtes appropriés, tels que `Access-Control-Allow-Origin: *`. Cela n’est pas vrai pour les scripts classiques.

Une autre différence concerne l'attribut `async`, qui permet de télécharger le script sans bloquer l'analyseur HTML (comme `defer`) mais qui exécute le script dès que possible, sans ordre garanti et sans attendre la fin de l'analyse HTML. L'attribut `async` ne fonctionne pas pour les scripts classiques en ligne, mais il fonctionne pour les `<script type="module">` en ligne.

### Une note sur les extensions de fichiers

Vous avez peut-être remarqué que nous utilisons l'extension de fichier `.mjs` pour les modules. Sur le Web, l'extension de fichier n'a pas vraiment d'importance, tant que le fichier est servi avec [le type MIME JavaScript `text/javascript`](https://html.spec.whatwg.org/multipage/scripting.html#scriptingLanguages:javascript-mime-type). Le navigateur sait que c'est un module grâce à l'attribut `type` sur l'élément script.

Cependant, nous recommandons l'utilisation de l'extension `.mjs` pour les modules, pour deux raisons :

1. Pendant le développement, l'extension `.mjs` rend parfaitement clair pour vous et pour toute autre personne qui regarde votre projet que le fichier est un module et non un script classique. (Il n’est pas toujours possible de le dire juste en regardant le code.) Comme mentionné précédemment, les modules sont traités différemment des scripts classiques, donc la différence est extrêmement importante !
1. Cela garantit que votre fichier est analysé comme un module par des environnements tels que [Node.js](https://nodejs.org/api/esm.html#enabling) et [`d8`](/docs/d8), et des outils de build tels que [Babel](https://babeljs.io/docs/en/options#sourcetype). Bien que ces environnements et outils disposent chacun de moyens propriétaires via une configuration pour interpréter les fichiers avec d'autres extensions comme des modules, l'extension `.mjs` est le moyen compatible pour s'assurer que les fichiers sont traités comme des modules.

:::note
**Note:** Pour déployer `.mjs` sur le web, votre serveur web doit être configuré pour servir les fichiers avec cette extension en utilisant l'en-tête `Content-Type: text/javascript` approprié, comme mentionné ci-dessus. En outre, vous pouvez vouloir configurer votre éditeur pour traiter les fichiers `.mjs` comme des fichiers `.js` afin d'obtenir une coloration syntaxique. La plupart des éditeurs modernes le font déjà par défaut.
:::

### Spécificateurs de modules

Lors de l'`import` de modules, la chaîne qui spécifie l'emplacement du module est appelée le "spécificateur de module" ou le "spécificateur d'importation". Dans notre exemple précédent, le spécificateur de module est `&apos;./lib.mjs&apos;` :

```js
import {shout} from &apos;./lib.mjs&apos;;
//                  ^^^^^^^^^^^
```

Certaines restrictions s'appliquent aux spécificateurs de modules dans les navigateurs. Les soignés spécificateurs de modules "nus" ne sont actuellement pas pris en charge. Cette restriction est [spécifiée](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier) afin que, à l'avenir, les navigateurs puissent permettre à des chargeurs de modules personnalisés de donner une signification particulière aux spécificateurs de modules "nus" tels que les suivants :

```js
// Non pris en charge (pour l'instant) :
import {shout} from &apos;jquery&apos;;
import {shout} from &apos;lib.mjs&apos;;
import {shout} from &apos;modules/lib.mjs&apos;;
```

D'un autre côté, les exemples suivants sont tous pris en charge :

```js
// Pris en charge :
import {shout} from &apos;./lib.mjs&apos;;
import {shout} from &apos;../lib.mjs&apos;;
import {shout} from &apos;/modules/lib.mjs&apos;;
import {shout} from &apos;https://simple.example/modules/lib.mjs&apos;;
```

Pour l'instant, les spécificateurs de modules doivent être des URLs complètes, ou des URLs relatives commençant par `/`, `./`, ou `../`.

### Les modules sont différés par défaut

Les `<script>` classiques bloquent l'analyseur HTML par défaut. Vous pouvez contourner cela en ajoutant [l'attribut `defer`](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer), qui garantit que le téléchargement du script se fait en parallèle avec l'analyse HTML.

![](/_img/modules/async-defer.svg)

Les scripts des modules sont différés par défaut. Par conséquent, il n'est pas nécessaire d'ajouter `defer` à vos balises `<script type="module">` ! Non seulement le téléchargement du module principal se fait en parallèle avec l'analyse HTML, mais il en va de même pour tous les modules dépendants !

## Autres fonctionnalités des modules

### `import()` dynamique

Jusqu'à présent, nous avons utilisé uniquement l'importation statique avec `import`. Avec l'importation statique, tout le graphe de modules doit être téléchargé et exécuté avant que votre code principal puisse fonctionner. Parfois, vous ne voulez pas charger un module à l'avance, mais plutôt à la demande, uniquement lorsque vous en avez besoin — lorsque l'utilisateur clique sur un lien ou un bouton, par exemple. Cela améliore les performances de temps de chargement initial. [L'importation dynamique `import()`](/features/dynamic-import) rend cela possible !

```html
<script type="module">
  (async () => {
    const moduleSpecifier = &apos;./lib.mjs&apos;;
    const {repeat, shout} = await import(moduleSpecifier);
    repeat(&apos;hello&apos;);
    // → &apos;hello hello&apos;
    shout(&apos;Dynamic import in action&apos;);
    // → &apos;DYNAMIC IMPORT IN ACTION!&apos;
  })();
</script>
```

Contrairement à l'importation statique, l'importation dynamique `import()` peut être utilisée dans les scripts réguliers. C'est un moyen simple de commencer progressivement à utiliser des modules dans votre base de code existante. Pour plus de détails, consultez [notre article sur l'importation dynamique `import()`](/features/dynamic-import).

:::note
**Remarque :** [webpack possède sa propre version de `import()`](https://web.dev/use-long-term-caching/) qui divise intelligemment le module importé en un chunk distinct, séparé du bundle principal.
:::

### `import.meta`

Une autre nouvelle fonctionnalité liée aux modules est `import.meta`, qui vous fournit des métadonnées sur le module actuel. Les métadonnées exactes que vous obtenez ne sont pas spécifiées dans le cadre de ECMAScript ; elles dépendent de l'environnement hôte. Dans un navigateur, vous pourriez obtenir des métadonnées différentes de celles disponibles dans Node.js, par exemple.

Voici un exemple de `import.meta` sur le web. Par défaut, les images sont chargées par rapport à l'URL actuelle dans les documents HTML. `import.meta.url` permet de charger une image par rapport au module actuel.

```js
function loadThumbnail(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  const image = new Image();
  image.src = url;
  return image;
}

const thumbnail = loadThumbnail(&apos;../img/thumbnail.png&apos;);
container.append(thumbnail);
```

## Recommandations sur les performances

### Continuez à utiliser le bundling

Avec les modules, il devient possible de développer des sites web sans utiliser de bundleurs tels que webpack, Rollup ou Parcel. Il est acceptable d'utiliser directement les modules JS natifs dans les scénarios suivants :

- pendant le développement local
- en production pour des petites applications web comptant moins de 100 modules au total et ayant un arbre de dépendances relativement peu profond (i.e. une profondeur maximale inférieure à 5)

Cependant, comme nous l'avons appris lors de [notre analyse des goulots d'étranglement de la pipeline de chargement de Chrome en chargeant une bibliothèque modulée composée d'environ 300 modules](https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub), les performances de chargement des applications packagées sont meilleures que celles des applications non packagées.

<figure>
  <a href="https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub">
    <img src="/_img/modules/renderer-main-thread-time-breakdown.svg" width="830" height="311" alt="" loading="lazy"/>
  </a>
</figure>

Une raison à cela est que la syntaxe statique `import`/`export` est statiquement analysable, et peut ainsi aider les outils de bundleurs à optimiser votre code en éliminant les exports inutiles. Les imports et exports statiques sont plus qu'une simple syntaxe ; ils constituent une fonctionnalité critique pour les outils !

*Notre recommandation générale est de continuer à utiliser des outils de bundling avant de déployer des modules en production.* D'un certain point de vue, le bundling est une optimisation similaire à la minification de votre code : il conduit à un avantage de performance, car vous finissez par livrer moins de code. Le bundling a le même effet ! Continuez à utiliser le bundling.

Comme toujours, [la fonctionnalité de couverture de code des DevTools](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage) peut vous aider à identifier si vous envoyez du code inutile aux utilisateurs. Nous recommandons également l'utilisation du [code splitting](https://developers.google.com/web/fundamentals/performance/webpack/use-long-term-caching#lazy-loading) pour diviser les bundles et différer le chargement des scripts non critiques pour le premier rendu significatif.

#### Avantages et inconvénients du bundling vs. livraison des modules non packagés

Comme souvent dans le développement web, tout est une question de compromis. La livraison de modules non packagés peut réduire les performances de chargement initial (cache froid), mais pourrait améliorer les performances de chargement lors de visites ultérieures (cache chaud) comparé à la livraison d'un seul bundle sans division de code. Pour une base de code de 200 Ko, modifier un module granulaire unique et le faire être le seul à être récupéré depuis le serveur pour des visites ultérieures est beaucoup mieux que de devoir récupérer à nouveau tout le bundle.

Si vous êtes plus préoccupé par l'expérience des visiteurs avec des caches chauds que par les performances de la première visite et que vous avez un site avec moins de quelques centaines de modules granulaires, vous pourriez expérimenter avec la livraison de modules non packagés, mesurer l'impact sur les performances pour les chargements froids et chauds, puis prendre une décision basée sur les données !

Les ingénieurs des navigateurs travaillent dur pour améliorer la performance des modules prêts à l'emploi. Avec le temps, nous nous attendons à ce que l’expédition de modules indépendants devienne faisable dans davantage de situations.

### Utilisez des modules granulaires

Prenez l’habitude de rédiger votre code en utilisant des modules petits et granulaires. Pendant le développement, il est généralement préférable d'avoir seulement quelques exportations par module que de combiner manuellement de nombreux exports dans un seul fichier.

Considérons un module nommé `./util.mjs` qui exporte trois fonctions nommées `drop`, `pluck` et `zip` :

```js
export function drop() { /* … */ }
export function pluck() { /* … */ }
export function zip() { /* … */ }
```

Si votre base de code a seulement besoin de la fonctionnalité `pluck`, vous l'importeriez probablement comme suit :

```js
import {pluck} from &apos;./util.mjs&apos;;
```

Dans ce cas, (sans étape de regroupement au moment de la construction) le navigateur finit toujours par devoir télécharger, analyser et compiler le module entier `./util.mjs` alors qu'il n'a réellement besoin que de cet export. Cela est inefficace!

Si `pluck` ne partage aucun code avec `drop` et `zip`, il serait préférable de le déplacer dans son propre module granulaire, par exemple `./pluck.mjs`.

```js
export function pluck() { /* … */ }
```

Nous pouvons alors importer `pluck` sans le surcoût lié à `drop` et `zip` :

```js
import {pluck} from &apos;./pluck.mjs&apos;;
```

:::note
**Remarque :** Vous pourriez utiliser une exportation par défaut au lieu d’une exportation nommée ici, selon vos préférences personnelles.
:::

Non seulement cela garde votre code source simple et propre, mais cela réduit également le besoin d’élimination du code mort par les outils de regroupement. Si l’un des modules de votre arbre source n’est pas utilisé, alors il n’est jamais importé, et donc le navigateur ne le télécharge jamais. Les modules qui _sont_ utilisés peuvent être individuellement [mis en cache dans le code](/blog/code-caching-for-devs) par le navigateur. (L'infrastructure pour permettre cela est déjà disponible dans V8, et [des travaux sont en cours](https://bugs.chromium.org/p/chromium/issues/detail?id=841466) pour l'activer dans Chrome également.)

Utiliser des modules petits et granulaires aide à préparer votre base de code pour l'avenir où [une solution de regroupement native](#web-packaging) pourrait être disponible.

### Prélisez les modules

Vous pouvez optimiser davantage la livraison de vos modules en utilisant [`<link rel="modulepreload">`](https://developers.google.com/web/updates/2017/12/modulepreload). De cette manière, les navigateurs peuvent précharger et même préanalyser et précompiler des modules ainsi que leurs dépendances.

```html
<link rel="modulepreload" href="lib.mjs">
<link rel="modulepreload" href="main.mjs">
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

Cela est particulièrement important pour les arbres de dépendances plus importants. Sans `rel="modulepreload"`, le navigateur doit effectuer plusieurs requêtes HTTP pour déterminer l’arbre de dépendances complet. Cependant, si vous déclarez la liste complète des scripts de modules dépendants avec `rel="modulepreload"`, le navigateur n’a pas besoin de découvrir ces dépendances progressivement.

### Utilisez HTTP/2

Utiliser HTTP/2 lorsque c'est possible est toujours un bon conseil pour la performance, ne serait-ce que pour [sa prise en charge de la multiplexion](https://web.dev/performance-http2/#request-and-response-multiplexing). Avec la multiplexion HTTP/2, plusieurs messages de requêtes et réponses peuvent être en vol en même temps, ce qui est bénéfique pour charger des arbres de modules.

L'équipe Chrome a enquêté pour savoir si une autre fonctionnalité HTTP/2, en particulier [le serveur push HTTP/2](https://web.dev/performance-http2/#server-push), pourrait être une solution pratique pour déployer des applications hautement modulaires. Malheureusement, [le serveur push HTTP/2 est difficile à maîtriser](https://jakearchibald.com/2017/h2-push-tougher-than-i-thought/), et les implémentations des serveurs web et des navigateurs ne sont pas actuellement optimisées pour les cas d'utilisation d'applications web hautement modulaires. Il est par exemple difficile de ne pousser que les ressources que l’utilisateur n’a pas déjà en cache, et résoudre cela en communiquant tout l’état du cache d’une origine au serveur est un risque pour la confidentialité.

Alors, par tous les moyens, allez-y et utilisez HTTP/2 ! Gardez à l’esprit que le serveur push HTTP/2 n'est (malheureusement) pas une solution miracle.

## Adoption des modules JS sur le web

Les modules JS sont lentement adoptés sur le web. [Nos compteurs d’utilisation](https://www.chromestatus.com/metrics/feature/timeline/popularity/2062) montrent que 0,08 % de tous les chargements de pages utilisent actuellement `<script type="module">`. Notez que ce chiffre exclut d'autres points d'entrée tels que `import()` dynamique ou [worklets](https://drafts.css-houdini.org/worklets/).

## Quelles sont les prochaines étapes pour les modules JS ?

L’équipe Chrome travaille à améliorer l’expérience de développement avec des modules JS de diverses manières. Discutons de certaines d’entre elles.

### Algorithme de résolution de modules plus rapide et déterministe

Nous avons proposé un changement à l'algorithme de résolution de module qui répondait à une déficience en termes de vitesse et de déterminisme. Le nouvel algorithme est maintenant en vigueur à la fois dans [la spécification HTML](https://github.com/whatwg/html/pull/2991) et dans [la spécification ECMAScript](https://github.com/tc39/ecma262/pull/1006), et est implémenté dans [Chrome 63](http://crbug.com/763597). Attendez-vous à ce que cette amélioration arrive bientôt dans davantage de navigateurs !

Le nouvel algorithme est beaucoup plus efficace et rapide. La complexité computationnelle de l'ancien algorithme était quadratique, c'est-à-dire 𝒪(n²), en fonction de la taille du graphe de dépendance, et il en était de même pour l'implémentation de Chrome à l'époque. Le nouvel algorithme est linéaire, c'est-à-dire 𝒪(n).

De plus, le nouvel algorithme signale les erreurs de résolution de manière déterministe. Étant donné un graphe contenant plusieurs erreurs, différentes exécutions de l'ancien algorithme pouvaient signaler différentes erreurs comme responsables de l'échec de résolution. Cela rendait le débogage inutilement difficile. Le nouvel algorithme garantit de signaler la même erreur à chaque fois.

### Worklets et workers web

Chrome implémente désormais les [worklets](https://drafts.css-houdini.org/worklets/), qui permettent aux développeurs web de personnaliser la logique codée en dur dans les « parties bas niveau » des navigateurs web. Avec les worklets, les développeurs web peuvent injecter un module JS dans le pipeline de rendu ou le pipeline de traitement audio (et éventuellement d'autres pipelines à l'avenir !).

Chrome 65 prend en charge [`PaintWorklet`](https://developers.google.com/web/updates/2018/01/paintapi) (aussi connu sous le nom d'API CSS Paint) pour contrôler la manière dont un élément DOM est peint.

```js
const result = await css.paintWorklet.addModule(&apos;paint-worklet.mjs&apos;);
```

Chrome 66 prend en charge [`AudioWorklet`](https://developers.google.com/web/updates/2017/12/audio-worklet), ce qui vous permet de contrôler le traitement audio avec votre propre code. La même version de Chrome a lancé une [OriginTrial pour `AnimationWorklet`](https://groups.google.com/a/chromium.org/d/msg/blink-dev/AZ-PYPMS7EA/DEqbe2u5BQAJ), ce qui permet de créer des animations procédurales haute-performance liées au défilement et d'autres animations similaires.

Enfin, le [`LayoutWorklet`](https://drafts.css-houdini.org/css-layout-api/) (aussi connu sous le nom d'API CSS Layout) est désormais implémenté dans Chrome 67.

Nous travaillons sur [l'ajout du support](https://bugs.chromium.org/p/chromium/issues/detail?id=680046) des modules JS avec des web workers dédiés dans Chrome. Vous pouvez déjà essayer cette fonctionnalité en activant `chrome://flags/#enable-experimental-web-platform-features`.

```js
const worker = new Worker(&apos;worker.mjs&apos;, { type: &apos;module&apos; });
```

Le support des modules JS pour les shared workers et les service workers arrive bientôt :

```js
const worker = new SharedWorker(&apos;worker.mjs&apos;, { type: &apos;module&apos; });
const registration = await navigator.serviceWorker.register(&apos;worker.mjs&apos;, { type: &apos;module&apos; });
```

### Import maps

Dans Node.js/npm, il est courant d'importer des modules JS par leur « nom de package ». Par exemple :

```js
import moment from &apos;moment&apos;;
import {pluck} from &apos;lodash-es&apos;;
```

Actuellement, [selon la spécification HTML](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier), de tels « spécificateurs d'importation nus » génèrent une exception. [Notre proposition d'import maps](https://github.com/domenic/import-maps) permet à ce type de code de fonctionner sur le web, y compris dans des applications en production. Une import map est une ressource JSON qui aide le navigateur à convertir les spécificateurs d'importation nus en URL complètes.

Les import maps sont encore au stade de proposition. Bien que nous ayons beaucoup réfléchi à la manière dont elles répondent à divers cas d'utilisation, nous collaborons toujours avec la communauté et nous n'avons pas encore rédigé une spécification complète. Les retours sont les bienvenus !

### Emballages web : bundles natifs

L'équipe de chargement de Chrome explore actuellement [un format natif d'emballage web](https://github.com/WICG/webpackage) comme une nouvelle manière de distribuer des applications web. Les fonctionnalités principales de l'emballage web sont :

[Échanges HTTP signés](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html) permettant à un navigateur de faire confiance qu'une seule paire requête/réponse HTTP a été générée par l'origine qu'elle revendique ; et [Échanges HTTP groupés](https://tools.ietf.org/html/draft-yasskin-wpack-bundled-exchanges-00), soit un ensemble d'échanges, chacun pouvant être signé ou non signé, avec des métadonnées décrivant comment interpréter l'ensemble dans son ensemble.

Ensemble, un tel format d'emballage web permettrait *à plusieurs ressources de même origine* d'être *intégrées de manière sécurisée* dans une *seule* réponse HTTP `GET`.

Les outils d'emballage existants tels que webpack, Rollup ou Parcel émettent actuellement un seul bundle JavaScript, dans lequel les sémantiques des modules et actifs d'origine sont perdues. Avec les bundles natifs, les navigateurs pourraient désassembler les ressources dans leur forme originale. En termes simplifiés, vous pouvez imaginer un Échange HTTP Groupé comme un ensemble de ressources accessibles dans n'importe quel ordre via une table des matières (manifest), et où les ressources contenues peuvent être efficacement stockées et étiquetées en fonction de leur importance relative, tout en préservant la notion de fichiers individuels. En raison de cela, les bundles natifs pourraient améliorer l'expérience de débogage. Lors de la visualisation des ressources dans les DevTools, les navigateurs pourraient identifier le module d'origine sans avoir besoin de source-maps complexes.

La transparence du format natif des bundles ouvre diverses opportunités d'optimisation. Par exemple, si un navigateur a déjà une partie d'un bundle natif en cache localement, il pourrait en informer le serveur web et télécharger uniquement les parties manquantes.

Chrome prend déjà en charge une partie de la proposition ([`SignedExchanges`](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html)), mais le format de bundling lui-même, ainsi que son application aux applications fortement modularisées, sont encore en phase exploratoire. Vos retours sont les bienvenus sur le dépôt ou par email à &lt;loading-dev@chromium.org>!

### APIs stratifiées

Le lancement de nouvelles fonctionnalités et APIs web engendre un coût continu de maintenance et de runtime — chaque nouvelle fonctionnalité pollue l'espace de noms du navigateur, augmente les coûts de démarrage et représente une nouvelle surface pour introduire des bugs dans la base de code. [Les APIs stratifiées](https://github.com/drufball/layered-apis) sont une initiative pour implémenter et déployer des APIs de haut niveau avec les navigateurs web de manière plus scalable. Les modules JS sont une technologie clé pour permettre les APIs stratifiées :

- Étant donné que les modules sont explicitement importés, exiger que les APIs stratifiées soient exposées via les modules garantit que les développeurs ne paient que pour les APIs stratifiées qu'ils utilisent.
- Étant donné que le chargement des modules est configurable, les APIs stratifiées peuvent disposer d'un mécanisme intégré pour charger automatiquement des polyfills dans les navigateurs qui ne prennent pas en charge les APIs stratifiées.

Les détails sur la façon dont les modules et les APIs stratifiées fonctionnent ensemble [sont encore en cours d'élaboration](https://github.com/drufball/layered-apis/issues), mais la proposition actuelle ressemble à ceci :

```html
<script
  type="module"
  src="std:virtual-scroller|https://example.com/virtual-scroller.mjs"
></script>
```

L'élément `<script>` charge l'API `virtual-scroller` soit depuis l'ensemble intégré des APIs stratifiées du navigateur (`std:virtual-scroller`) soit depuis une URL de secours pointant vers un polyfill. Cette API peut faire tout ce que les modules JS peuvent faire dans les navigateurs web. Un exemple serait de définir [un élément personnalisé `<virtual-scroller>`](https://www.chromestatus.com/feature/5673195159945216), de sorte que le HTML suivant soit amélioré progressivement comme souhaité :

```html
<virtual-scroller>
  <!-- Le contenu va ici. -->
</virtual-scroller>
```

## Remerciements

Merci à Domenic Denicola, Georg Neis, Hiroki Nakagawa, Hiroshige Hayashizaki, Jakob Gruber, Kouhei Ueno, Kunihiko Sakamoto, et Yang Guo pour avoir rendu les modules JavaScript rapides !

Également, bravo à Eric Bidelman, Jake Archibald, Jason Miller, Jeffrey Posnick, Philip Walton, Rob Dodson, Sam Dutton, Sam Thorogood, et Thomas Steiner pour avoir lu une version préliminaire de ce guide et donné leurs avis.
