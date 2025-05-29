---
title: 'WebAssembly JSPI a une nouvelle API'
description: 'Cet article détaille quelques modifications à venir de l'API JSPI (JavaScript Promise Integration).'
author: 'Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl'
date: 2024-06-04
tags:
  - WebAssembly
---
L'API JSPI (JavaScript Promise Integration) de WebAssembly a une nouvelle API, disponible dans la version M126 de Chrome. Nous parlons de ce qui a changé, comment l'utiliser avec Emscripten, et quelle est la feuille de route pour JSPI.

JSPI est une API qui permet aux applications WebAssembly utilisant des API *séquentielles* d'accéder aux API Web qui sont *asynchrones*. De nombreuses API Web sont conçues en termes d'objets `Promise` de JavaScript : au lieu d'effectuer immédiatement l'opération demandée, elles renvoient une `Promise` pour le faire. D'autre part, de nombreuses applications compilées en WebAssembly viennent de l'univers C/C++, qui est dominé par des API bloquant l'appelant jusqu'à achèvement.

<!--truncate-->
JSPI s'intègre dans l'architecture Web pour permettre à une application WebAssembly d'être suspendue lorsque la `Promise` est renvoyée et reprise lorsque la `Promise` est résolue.

Vous pouvez en savoir plus sur JSPI et comment l'utiliser [dans cet article de blog](https://v8.dev/blog/jspi) et dans la [spécification](https://github.com/WebAssembly/js-promise-integration).

## Quoi de neuf ?

### La fin des objets `Suspender`

En janvier 2024, le sous-groupe Stacks du CG Wasm a [voté](https://github.com/WebAssembly/meetings/blob/297ac8b5ac00e6be1fe33b1f4a146cc7481b631d/stack/2024/stack-2024-01-29.md) pour modifier l'API de JSPI. Plus précisément, au lieu d'un objet `Suspender` explicite, nous utiliserons la frontière JavaScript/WebAssembly comme délimiteur pour déterminer quelles calculs sont suspendus.

La différence est relativement petite mais potentiellement significative : lorsqu'un calcul doit être suspendu, c'est l'appel le plus récent à une exportation WebAssembly encapsulée qui détermine le point de coupure pour ce qui est suspendu.

Cela signifie que le développeur qui utilise JSPI a un peu moins de contrôle sur ce point de coupure. En revanche, ne pas avoir à gérer explicitement des objets `Suspender` rend l'API nettement plus facile à utiliser.

### Fini le `WebAssembly.Function`

Un autre changement concerne le style de l'API. Au lieu de caractériser les wrappers JSPI en termes du constructeur `WebAssembly.Function`, nous fournissons des fonctions et constructeurs spécifiques.

Cela présente plusieurs avantages :

- Cela élimine la dépendance à la proposition [*Type Reflection*](https://github.com/WebAssembly/js-types).
- Cela simplifie les outils pour JSPI : les nouvelles fonctions API n'ont plus besoin de se référer explicitement aux types de fonctions WebAssembly.

Ce changement est rendu possible par la décision de ne plus avoir de `Suspender` explicitement référencés.

### Retourner sans suspendre

Un troisième changement concerne le comportement des appels suspendants. Au lieu de toujours suspendre lorsqu'on appelle une fonction JavaScript depuis une importation suspendante, nous ne suspendons que lorsque la fonction JavaScript renvoie réellement une `Promise`.

Ce changement, bien que semblant aller à l'encontre des [recommandations](https://www.w3.org/2001/tag/doc/promises-guide#accepting-promises) du TAG W3C, représente une optimisation sûre pour les utilisateurs de JSPI. Cela est sûr parce que JSPI prend en réalité le rôle d'*appelant* d'une fonction qui renvoie une `Promise`.

Ce changement aura probablement un impact minimal sur la plupart des applications ; cependant, certaines applications constateront un avantage notable en évitant des allers-retours inutiles au boucle d'événements du navigateur.

### La nouvelle API

L'API est simple : il y a une fonction qui prend une fonction exportée par un module WebAssembly et la convertit en une fonction qui renvoie une `Promise` :

```js
Function Webassembly.promising(Function wsFun)
```

Notez que même si l'argument est typé comme une `Function` JavaScript, il est réellement restreint aux fonctions WebAssembly.

Côté suspension, il y a une nouvelle classe `WebAssembly.Suspending`, avec un constructeur qui prend une fonction JavaScript comme argument. En WebIDL, cela se rédige comme suit :

```js
interface Suspending{
  constructor (Function fun);
}
```

Notez que cette API a un aspect asymétrique : il y a une fonction qui prend une fonction WebAssembly et renvoie une nouvelle fonction prometteuse (_sic_) ; alors que pour marquer une fonction suspendante, vous l'encapsulez dans un objet `Suspending`. Cela reflète une réalité plus profonde sur ce qui se passe en coulisse.

Le comportement de suspension d'une importation fait intrinsèquement partie de l'*appel* à l'importation : c'est-à-dire qu'une certaine fonction à l'intérieur du module instancié appelle l'importation et suspend en conséquence.

D'un autre côté, la fonction `promising` prend une fonction WebAssembly régulière et renvoie une nouvelle fonction capable de répondre à une suspension et qui renvoie une `Promise`.

### Utiliser la nouvelle API

Si vous êtes un utilisateur d'Emscripten, utiliser la nouvelle API impliquera généralement aucun changement dans votre code. Vous devez utiliser une version d'Emscripten d'au moins 3.1.61, et vous devez utiliser une version de Chrome d'au moins 126.0.6478.17 (Chrome M126).

Si vous intégrez vous-même, votre code devrait être significativement plus simple. En particulier, il n'est plus nécessaire d'avoir du code qui stocke l'objet `Suspender` passé (et le récupère lors de l'appel à l'importation). Vous pouvez simplement utiliser un code séquentiel régulier dans le module WebAssembly.

### L'ancienne API

L'ancienne API continuera à fonctionner au moins jusqu'au 29 octobre 2024 (Chrome M128). Après cela, nous prévoyons de supprimer l'ancienne API.

Notez qu'Emscripten ne prendra lui-même plus en charge l'ancienne API à partir de la version 3.1.61.

### Détecter quelle API est dans votre navigateur

Changer d'API ne devrait jamais être pris à la légère. Nous sommes en mesure de le faire dans ce cas parce que JSPI lui-même est encore provisoire. Il existe un moyen simple de tester laquelle des APIs est activée dans votre navigateur :

```js
function oldAPI(){
  return WebAssembly.Suspender!=undefined
}

function newAPI(){
  return WebAssembly.Suspending!=undefined
}
```

La fonction `oldAPI` retourne true si l'ancienne API JSPI est activée dans votre navigateur, et la fonction `newAPI` retourne true si la nouvelle API JSPI est activée.

## Qu'arrive-t-il à JSPI ?

### Aspects de l'implémentation

Le plus grand changement de JSPI sur lequel nous travaillons est en fait invisible pour la plupart des programmeurs : les piles extensibles.

L'implémentation actuelle de JSPI est basée sur l'allocation de piles de taille fixe. En fait, les piles allouées sont assez grandes. Cela est dû au fait que nous devons pouvoir accueillir des calculs WebAssembly arbitraires qui peuvent nécessiter des piles profondes pour gérer correctement la récursivité.

Cependant, ce n'est pas une stratégie durable : nous aimerions prendre en charge des applications avec des millions de coroutines suspendues ; cela n'est pas possible si chaque pile fait 1 Mo.

Les piles extensibles font référence à une stratégie d'allocation de pile qui permet à une pile WebAssembly de croître à mesure que nécessaire. De cette manière, nous pouvons commencer avec des piles très petites pour les applications qui ne nécessitent qu'un espace de pile réduit, et agrandir la pile lorsque l'application manque d'espace (aussi connu sous le nom de débordement de pile).

Il existe plusieurs techniques potentielles pour implémenter des piles extensibles. L'une que nous examinons est celle des piles segmentées. Une pile segmentée consiste en une chaîne de régions de pile &mdash; chacune ayant une taille fixe, mais différents segments peuvent avoir des tailles différentes.

Notez que bien que nous puissions résoudre le problème de débordement de pile pour les coroutines, nous ne prévoyons pas de rendre la pile principale ou centrale extensible. Ainsi, si votre application manque d'espace de pile, les piles extensibles ne résoudront pas votre problème à moins que vous n'utilisiez JSPI.

### Le processus de normalisation

À la date de publication, il existe un [test d'origine actif pour JSPI](https://v8.dev/blog/jspi-ot). La nouvelle API sera active pendant le reste du test d'origine &mdash; disponible avec Chrome M126.

L'ancienne API sera également disponible pendant le test d'origine ; cependant, elle est prévue pour être retirée peu après Chrome M128.

Par la suite, l'essentiel de JSPI tourne autour du processus de normalisation. JSPI est actuellement (au moment de la publication) en phase 3 du processus W3C Wasm CG. La prochaine étape, c'est-à-dire passer à la phase 4, marque l'adoption cruciale de JSPI en tant qu'API standard pour les écosystèmes JavaScript et WebAssembly.

Nous aimerions savoir ce que vous pensez de ces changements à JSPI ! Rejoignez la discussion sur le [repo du Groupe Communautaire WebAssembly du W3C](https://github.com/WebAssembly/js-promise-integration).
