---
 title: 'Donner un aperçu à V8 : démarrage plus rapide de JavaScript avec des indices de compilation explicites'
 author: 'Marja Hölttä'
 avatars:
   - marja-holtta
 date: 2025-04-29
 tags:
   - JavaScript
 description: "Les indices de compilation explicites contrôlent quels fichiers et fonctions JavaScript sont analysés et compilés rapidement"
 tweet: ''
---

Faire fonctionner JavaScript rapidement est essentiel pour une application web réactive. Même avec les optimisations avancées de V8, analyser et compiler le JavaScript critique lors du démarrage peut toujours être une source de ralentissements. Savoir quelles fonctions JavaScript compiler lors de la compilation initiale du script peut accélérer le chargement de la page web.

<!--truncate-->
Lors du traitement d'un script chargé depuis le réseau, V8 doit choisir pour chaque fonction : soit la compiler immédiatement ("rapidement"), soit reporter ce processus. Si une fonction qui n'a pas été compilée est appelée ultérieurement, V8 devra alors la compiler à la demande.

Si une fonction JavaScript finit par être appelée pendant le chargement de la page, la compiler rapidement est avantageux, parce que :

- Lors du traitement initial du script, nous devons au moins effectuer une analyse légère pour déterminer la fin de la fonction. En JavaScript, pour identifier la fin d'une fonction, il faut analyser entièrement la syntaxe (il n'y a pas de raccourcis comme compter les accolades - la grammaire est trop complexe). Faire une première analyse légère puis une seconde analyse complète constitue un travail en double.
- Si nous décidons de compiler une fonction rapidement, le travail s'effectue dans un thread en arrière-plan, et des parties de celui-ci sont entrelacées avec le chargement du script depuis le réseau. Si au contraire nous compilons la fonction uniquement lorsqu'elle est appelée, il est trop tard pour paralléliser le travail, car le thread principal ne peut avancer tant que la fonction n'est pas compilée.

Vous pouvez en savoir plus sur la manière dont V8 analyse et compile JavaScript [ici](https://v8.dev/blog/preparser).

De nombreuses pages web bénéficieraient de la sélection des fonctions appropriées pour une compilation rapide. Par exemple, dans notre expérience avec des pages web populaires, 17 sur 20 ont montré des améliorations, et la réduction moyenne des temps d'analyse et de compilation au premier plan était de 630 ms.

Nous développons une fonctionnalité, [Indices de compilation explicites](https://github.com/WICG/explicit-javascript-compile-hints-file-based), qui permet aux développeurs web de contrôler quels fichiers et fonctions JavaScript sont compilés rapidement. Chrome 136 propose désormais une version où vous pouvez sélectionner des fichiers individuels pour une compilation rapide.

Cette version est particulièrement utile si vous avez un "fichier central" que vous pouvez sélectionner pour une compilation rapide, ou si vous êtes en mesure de déplacer du code entre des fichiers source pour créer un tel fichier central.

Vous pouvez déclencher la compilation rapide pour tout le fichier en insérant le commentaire magique

```js
//# allFunctionsCalledOnLoad
```

en haut du fichier.

Cependant, cette fonctionnalité doit être utilisée avec parcimonie - compiler trop de choses consommera du temps et de la mémoire !

## Testez par vous-même - indices de compilation en action

Vous pouvez observer les indices de compilation en action en demandant à V8 de journaliser les événements de fonction. Par exemple, vous pouvez utiliser les fichiers suivants pour configurer un test minimal.

index.html :

```html
<script src="script1.js"></script>
<script src="script2.js"></script>
```

script1.js :

```js
function testfunc1() {
  console.log('testfunc1 appelé !');
}

testfunc1();
```

script2.js :

```js
//# allFunctionsCalledOnLoad

function testfunc2() {
  console.log('testfunc2 appelé !');
}

testfunc2();
```

N'oubliez pas d'exécuter Chrome avec un répertoire de données utilisateur propre, afin que la mise en cache du code ne perturbe pas votre expérience. Une commande exemple serait :

```sh
rm -rf /tmp/chromedata && google-chrome --no-first-run --user-data-dir=/tmp/chromedata --js-flags=--log-function_events > log.txt
```

Après avoir navigué vers votre page de test, vous pouvez voir les événements de fonction suivants dans le journal :

```sh
$ grep testfunc log.txt
function,preparse-no-resolution,5,18,60,0.036,179993,testfunc1
function,full-parse,5,18,60,0.003,181178,testfunc1
function,parse-function,5,18,60,0.014,181186,testfunc1
function,interpreter,5,18,60,0.005,181205,testfunc1
function,full-parse,6,48,90,0.005,184024,testfunc2
function,interpreter,6,48,90,0.005,184822,testfunc2
```

Comme `testfunc1` a été compilé de manière paresseuse, nous voyons l'événement `parse-function` lorsqu'il est finalement appelé :

```sh
function,parse-function,5,18,60,0.014,181186,testfunc1
```

Pour `testfunc2`, nous ne voyons pas d'événement correspondant, car l'indice de compilation a forcé son analyse et sa compilation rapides.

## L'avenir des indices de compilation explicites

À long terme, nous souhaitons évoluer vers la sélection de fonctions individuelles pour une compilation rapide. Cela permet aux développeurs web de contrôler exactement les fonctions qu'ils souhaitent compiler et d'exploiter les dernières optimisations pour améliorer leurs pages web. Restez à l'écoute !
