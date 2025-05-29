---
title: 'Présentation de l'API d'intégration des Promises JavaScript WebAssembly'
description: 'Ce document présente JSPI et fournit quelques exemples simples pour vous aider à commencer à l'utiliser'
author: "Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl"
date: 2024-07-01
tags:
  - WebAssembly
---
L'API d'intégration des Promises JavaScript (JSPI) permet aux applications WebAssembly écrites en supposant un accès _synchronisé_ à des fonctionnalités externes de fonctionner sans heurt dans un environnement où ces fonctionnalités sont en réalité _asynchrones_.

<!--truncate-->
Cette note décrit les capacités principales de l'API JSPI, comment y accéder, comment développer des logiciels pour elle, et propose quelques exemples à essayer.

## À quoi sert le ‘JSPI’ ?

Les APIs asynchrones fonctionnent en séparant l'_initiation_ d'une opération de sa _résolution_, cette dernière arrivant quelque temps après la première. Plus important encore, l'application poursuit son exécution après avoir lancé l'opération et est ensuite notifiée une fois que l'opération est terminée.

Par exemple, en utilisant l'API `fetch`, les applications Web peuvent accéder aux contenus associés à une URL. Cependant, la fonction `fetch` ne retourne pas directement les résultats de la requête ; elle retourne plutôt un objet `Promise`. La connexion entre la réponse de la requête HTTP et la demande originale est rétablie en attachant une _callback_ à cet objet `Promise`. La fonction callback peut inspecter la réponse et collecter les données (si elles sont disponibles, bien sûr).

Dans de nombreux cas, les applications en C/C++ (et dans de nombreux autres langages) sont initialement écrites en utilisant des APIs _synchrones_. Par exemple, la fonction Posix `read` ne termine pas tant que l'opération d'entrée-sortie n'est pas terminée : la fonction `read` *bloque* jusqu'à ce que la lecture soit terminée.

Cependant, il n'est pas permis de bloquer le thread principal du navigateur ; et de nombreux environnements ne soutiennent pas la programmation synchrone. Le résultat est un décalage entre le désir des programmeurs d'applications d'avoir une API simple à utiliser et l'écosystème plus large qui exige que les entrées-sorties soient conçues avec du code asynchrone. Cela pose particulièrement problème pour des applications existantes (legacy) qui seraient coûteuses à porter.

Le JSPI est une API qui comble le fossé entre les applications synchrones et les APIs Web asynchrones. Il fonctionne en interceptant les objets `Promise` retournés par les fonctions des APIs Web asynchrones et en _suspendant_ l'application WebAssembly. Lorsque l'opération d'E/S asynchrone est terminée, l'application WebAssembly est _repris_. Cela permet à l'application WebAssembly d'utiliser un code linéaire pour effectuer des opérations asynchrones et traiter leurs résultats.

Essentiellement, l'utilisation du JSPI nécessite très peu de modifications de l'application WebAssembly elle-même.

### Comment fonctionne le JSPI ?

Le JSPI fonctionne en interceptant l'objet `Promise` retourné par des appels en JavaScript et en suspendant la logique principale de l'application WebAssembly. Une callback est attachée à cet objet `Promise`, et cette callback reprendra le code WebAssembly suspendu lorsqu'elle sera activée par le gestionnaire de tâches de boucle d'événements du navigateur.

En outre, l'export WebAssembly est restructuré pour retourner un objet `Promise` &mdash; au lieu de la valeur originale retournée par l'export. Cet objet `Promise` devient la valeur retournée par l'application WebAssembly : lorsque le code WebAssembly est suspendu,[^first] l'objet `Promise` d'export est retourné comme la valeur de l'appel vers WebAssembly.

[^first]: Si une application WebAssembly est suspendue plusieurs fois, les suspensions suivantes reviendront à la boucle d'événements du navigateur et ne seront pas directement visibles par l'application Web.

Le `Promise` d'export est résolu lorsque l'appel initial est terminé : si la fonction WebAssembly originale retourne une valeur normale, l'objet `Promise` d'export est résolu avec cette valeur (convertie en un objet JavaScript) ; si une exception est levée, alors le `Promise` d'export est rejeté.

#### Envelopper les imports et exports

Cela est activé en _enveloppant_ les imports et exports lors de la phase d'instanciation du module WebAssembly. Les enveloppes de fonction ajoutent le comportement de suspension aux imports asynchrones habituels et routent les suspensions vers les callbacks d'objets `Promise`.

Il n'est pas nécessaire d'envelopper tous les exports et imports d'un module WebAssembly. Certains exports dont les chemins d'exécution n'impliquent pas d'appels d'APIs asynchrones sont mieux laissés non enveloppés. De même, tous les imports d'un module WebAssembly ne se réfèrent pas à des fonctions d'APIs asynchrones ; ces imports aussi ne doivent pas être enveloppés.

Bien sûr, il y a un mécanisme interne significatif qui permet cela ;[^1] mais ni le langage JavaScript ni WebAssembly lui-même ne sont modifiés par le JSPI. Ses opérations sont confinées à la frontière entre JavaScript et WebAssembly.

Du point de vue d'un développeur d'applications Web, le résultat est un ensemble de code qui participe au monde JavaScript des fonctions asynchrones et des Promises de manière analogue à celle des autres fonctions asynchrones écrites en JavaScript. Du point de vue du développeur WebAssembly, cela leur permet de concevoir des applications utilisant des API synchrones tout en participant à l'écosystème asynchrone du Web.

### Performances attendues

Étant donné que les mécanismes utilisés lors de la suspension et de la reprise des modules WebAssembly sont essentiellement constant dans le temps, nous ne prévoyons pas de coûts élevés liés à l'utilisation de JSPI &mdash; en particulier comparé à d'autres approches basées sur des transformations.

Il y a une quantité constante de travail nécessaire pour transmettre l'objet `Promise` retourné par l'appel API asynchrone au WebAssembly. De même, lorsqu'une Promise est résolue, l'application WebAssembly peut être reprise avec une surcharge constante.

Cependant, comme avec les autres APIs basées sur les Promises dans le navigateur, chaque fois que l'application WebAssembly se suspend, elle ne sera pas ‘réveillée’ de nouveau sauf par le gestionnaire de tâches du navigateur. Cela nécessite que l'exécution du code JavaScript ayant démarré le calcul WebAssembly retourne lui-même au navigateur.

### Puis-je utiliser JSPI pour suspendre des programmes JavaScript ?

JavaScript dispose déjà d'un mécanisme bien développé pour représenter les calculs asynchrones : l'objet `Promise` et la notation de fonction `async`. Le JSPI est conçu pour bien s'intégrer dans ce système, mais pas pour le remplacer.

### Comment puis-je utiliser JSPI aujourd'hui ?

Le JSPI est actuellement en cours de standardisation par le W3C WebAssembly WG. À l'heure où ces lignes sont écrites, il est en phase 3 du processus de standardisation et nous prévoyons une standardisation complète avant la fin de l'année 2024.

Le JSPI est disponible sur Chrome pour Linux, MacOS, Windows et ChromeOS, sur les plateformes Intel et Arm, en versions 64 bits et 32 bits.[^firefox]

[^firefox]: Le JSPI est également disponible dans Firefox nightly : activez "`javascript.options.wasm_js_promise_integration`" dans le panneau about:config &mdash; puis redémarrez.

Le JSPI peut être utilisé de deux manières aujourd'hui : via un [origin trial](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889) et localement via un argument de Chrome. Pour le tester localement, allez sur `chrome://flags` dans Chrome, cherchez "Experimental WebAssembly JavaScript Promise Integration (JSPI)" et cochez la case. Relancez comme suggéré pour que cela prenne effet.

Vous devriez utiliser au moins la version `126.0.6478.26` pour obtenir la dernière version de l'API. Nous recommandons d'utiliser le canal Dev pour vous assurer que les mises à jour de stabilité sont appliquées. En outre, si vous souhaitez utiliser Emscripten pour générer du WebAssembly (ce que nous recommandons), vous devriez utiliser une version d'au moins `3.1.61`.

Une fois activé, vous devriez pouvoir exécuter des scripts utilisant JSPI. Ci-dessous, nous montrons comment vous pouvez utiliser Emscripten pour générer un module WebAssembly en C/C++ exploitant JSPI. Si votre application implique un langage différent, sans utiliser Emscripten par exemple, nous suggérons de consulter le fonctionnement de l'API dans la [proposition](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md).

#### Limitations

La mise en œuvre Chrome de JSPI prend déjà en charge les cas d'utilisation typiques. Toutefois, elle est encore considérée comme expérimentale, il y a donc quelques limitations à garder à l'esprit :

- Nécessite l'utilisation d'un argument en ligne de commande, ou la participation à l'origine trial.
- Chaque appel à une exportation JSPI s'exécute sur une pile de taille fixe.
- Le support pour le débogage est quelque peu minimal. En particulier, il peut être difficile d'observer les différents événements dans le panneau des outils de développement. Fournir un meilleur support pour le débogage des applications JSPI est sur la feuille de route.

## Une petite démonstration

Pour voir tout cela fonctionner, essayons un simple exemple. Ce programme en C calcule Fibonacci de manière spectaculairement mauvaise : en demandant à JavaScript de faire l'addition, et pire encore en utilisant les objets `Promise` JavaScript pour le faire:[^2]

```c
long promiseFib(long x) {
 if (x == 0)
   return 0;
 if (x == 1)
   return 1;
 return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}
// promettre une addition
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});
```

La fonction `promiseFib` elle-même est une version récursive simple de la fonction Fibonacci. La partie intrigante (de notre point de vue) est la définition de `promiseAdd`, qui réalise l'addition des deux moitiés Fibonacci — en utilisant JSPI !

Nous utilisons la macro Emscripten `EM_ASYNC_JS` pour inscrire la fonction `promiseFib` comme une fonction JavaScript dans le corps de notre programme C. Étant donné que l'addition n'implique normalement pas de Promises en JavaScript, nous devons la forcer en construisant une `Promise`.

La macro `EM_ASYNC_JS` génère tout le code de liaison nécessaire afin que nous puissions utiliser JSPI pour accéder au résultat de la Promise comme si c'était une fonction normale.

Pour compiler notre petite démonstration, nous utilisons le compilateur `emcc` d'Emscripten:[^4]

```sh
emcc -O3 badfib.c -o b.html -s JSPI
```

Cela compile notre programme, créant un fichier HTML chargeable (`b.html`). L'option la plus spéciale de la ligne de commande ici est `-s JSPI`. Cela active l'option permettant de générer du code utilisant JSPI pour interfacer avec les imports JavaScript qui retournent des Promises.

Si vous chargez le fichier `b.html` généré dans Chrome, vous devriez voir un résultat approximatif à :

```
fib(0) 0μs 0μs 0μs
fib(1) 0μs 0μs 0μs
fib(2) 0μs 0μs 3μs
fib(3) 0μs 0μs 4μs
…
fib(15) 0μs 13μs 1225μs
```

Il s'agit simplement d'une liste des 15 premiers nombres de Fibonacci, suivie du temps moyen en microsecondes nécessaire pour calculer un nombre de Fibonacci. Les trois valeurs temporelles sur chaque ligne se réfèrent au temps pris pour un calcul pur en WebAssembly, pour un calcul mixte JavaScript/WebAssembly, et le troisième chiffre donne le temps pour une version suspendue du calcul.

Notez que `fib(2)` est le plus petit calcul impliquant l'accès à une Promise, et, au moment où `fib(15)` est calculé, environ 1000 appels à `promiseAdd` ont été effectués. Cela suggère que le coût réel d'une fonction JSPI est d'environ 1μs — significativement plus élevé que simplement additionner deux entiers, mais bien inférieur aux millisecondes généralement nécessaires pour accéder à une fonction E/S externe.

## Utilisation de JSPI pour charger du code de manière différée

Dans cet exemple suivant, nous allons examiner une utilisation quelque peu surprenante de JSPI : charger du code de manière dynamique. L'idée est d'utiliser `fetch` pour importer un module contenant du code nécessaire, mais de différer cette opération jusqu'à ce que la fonction requise soit appelée pour la première fois.

Nous devons utiliser JSPI car les API comme `fetch` sont intrinsèquement asynchrones par nature, mais nous voulons pouvoir les invoquer depuis des endroits arbitraires dans notre application, notamment au milieu d'un appel à une fonction qui n'existe pas encore.

L'idée principale est de remplacer une fonction chargée dynamiquement par un stub ; ce stub charge d'abord le code manquant de la fonction, se remplace par le code chargé, puis appelle le code nouvellement chargé avec les arguments d'origine. Tout appel ultérieur à la fonction accède directement à la fonction chargée. Cette stratégie permet une approche essentiellement transparente pour le chargement dynamique de code.

Le module que nous allons charger est assez simple, il contient une fonction qui renvoie `42` :

```c
// Ceci est un fournisseur simple de quarante-deux
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42(){
  return 42l;
}
```

qui se trouve dans un fichier appelé `p42.c`, et est compilé en utilisant Emscripten sans construction de « suppléments » :

```sh
emcc p42.c -o p42.wasm --no-entry -Wl,--import-memory
```

Le préfixe `EMSCRIPTEN_KEEPALIVE` est une macro d'Emscripten qui garantit que la fonction `provide42` n'est pas éliminée bien qu'elle ne soit pas utilisée dans le code. Cela aboutit à un module WebAssembly contenant la fonction que nous voulons charger dynamiquement.

L'option `-Wl,--import-memory` que nous avons ajoutée à la construction de `p42.c` garantit qu'il a accès à la même mémoire que le module principal.[^3]

Pour charger dynamiquement du code, nous utilisons l'API standard `WebAssembly.instantiateStreaming` :

```js
WebAssembly.instantiateStreaming(fetch('p42.wasm'));
```

Cette expression utilise `fetch` pour localiser le module Wasm compilé, `WebAssembly.instantiateStreaming` pour compiler le résultat de la requête et créer un module instancié à partir de celui-ci. `fetch` et `WebAssembly.instantiateStreaming` retournent des Promises, nous ne pouvons donc pas simplement accéder au résultat et extraire la fonction nécessaire. Au lieu de cela, nous intégrons cela dans une importation de style JSPI en utilisant la macro `EM_ASYNC_JS` :

```c
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('loading promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});
```

Notez l'appel à `console.log`, nous l'utiliserons pour nous assurer que notre logique est correcte.

La fonction `addFunction` fait partie de l'API Emscripten, mais pour nous assurer qu'elle est disponible à l'exécution, nous devons informer `emcc` qu'elle est une dépendance requise. Nous le faisons dans la ligne suivante :

```c
EM_JS_DEPS(funDeps, "$addFunction")
```

Dans une situation où nous souhaitons charger du code de manière dynamique, nous aimerions nous assurer que nous ne chargeons pas de code inutile ; dans ce cas, nous aimerions nous assurer que les appels suivants à `provide42` ne déclenchent pas de nouveaux chargements. C dispose d'une fonctionnalité simple que nous pouvons utiliser pour cela : nous n'appelons pas directement `provide42`, mais nous le faisons via un trampoline qui provoque le chargement de la fonction, puis, juste avant d'invoquer réellement la fonction, modifie le trampoline pour se contourner. Nous pouvons le faire à l'aide d'un pointeur de fonction approprié :

```c
extern fooFun get42;

long stub(){
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;
```

Du point de vue du reste du programme, la fonction que nous voulons appeler s'appelle `get42`. Sa mise en œuvre initiale passe par `stub`, qui appelle `resolveFun` pour charger effectivement la fonction. Après le chargement réussi, nous modifions `get42` pour pointer vers la fonction nouvellement chargée – et l'appelons.

Notre fonction main appelle `get42` deux fois :[^6]

```c
int main() {
  printf("premier appel p42() = %ld\n", get42());
  printf("deuxième appel = %ld\n", get42());
}
```

Le résultat de l'exécution de ce code dans le navigateur est un log qui ressemble à :

```
chargement de promise42
premier appel p42() = 42
deuxième appel = 42
```

Notez que la ligne `chargement de promise42` n'apparaît qu'une seule fois, tandis que `get42` est en fait appelé deux fois.

Cet exemple démontre que JSPI peut être utilisé de manière inattendue : charger dynamiquement du code semble très éloigné de la création de promesses. De plus, il existe d'autres façons de lier dynamiquement des modules WebAssembly ensemble ; ce n'est pas censé représenter la solution définitive à ce problème.

Nous attendons avec impatience de voir ce que vous pouvez faire avec cette nouvelle capacité ! Rejoignez la discussion sur le groupe communautaire W3C WebAssembly [repo](https://github.com/WebAssembly/js-promise-integration).

## Annexe A : Liste complète de `badfib`


```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <emscripten.h>

typedef long (testFun)(long, int);

#define microSecondes (1000000)

long add(long x, long y) {
  return x + y;
}

// Demander à JS de faire l'addition
EM_JS(long, jsAdd, (long x, long y), {
  return x + y;
});

// promettre une addition
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});

__attribute__((noinline))
long localFib(long x) {
 if (x==0)
   return 0;
 if (x==1)
   return 1;
 return add(localFib(x - 1), localFib(x - 2));
}

__attribute__((noinline))
long jsFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return jsAdd(jsFib(x - 1), jsFib(x - 2));
}

__attribute__((noinline))
long promiseFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}

long runLocal(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += localFib(x);
  return temp / count;
}

long runJs(long x,int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += jsFib(x);
  return temp / count;
}

long runPromise(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += promiseFib(x);
  return temp / count;
}

double runTest(testFun test, int limit, int count){
  clock_t start = clock();
  test(limit, count);
  clock_t stop = clock();
  return ((double)(stop - start)) / CLOCKS_PER_SEC;
}

void runTestSequence(int step, int limit, int count) {
  for (int ix = 0; ix <= limit; ix += step){
    double light = (runTest(runLocal, ix, count) / count) * microSecondes;
    double jsTime = (runTest(runJs, ix, count) / count) * microSecondes;
    double promiseTime = (runTest(runPromise, ix, count) / count) * microSecondes;
    printf("fib(%d) %gμs %gμs %gμs %gμs\n",ix, light, jsTime, promiseTime, (promiseTime - jsTime));
  }
}

EMSCRIPTEN_KEEPALIVE int main() {
  int step =  1;
  int limit = 15;
  int count = 1000;
  runTestSequence(step, limit, count);
  return 0;
}
```

## Annexe B : Liste de `u42.c` et `p42.c`

Le code C `u42.c` représente la partie principale de notre exemple de chargement dynamique:

```c
#include <stdio.h>
#include <emscripten.h>

typedef long (*fooFun)();

// promettre une fonction
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('chargement de promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});

EM_JS_DEPS(funDeps, "$addFunction")

extern fooFun get42;

long stub() {
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;

int main() {
  printf("premier appel p42() = %ld\n", get42());
  printf("deuxième appel = %ld\n", get42());
}
```

Le code `p42.c` est le module chargé dynamiquement.

```c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42() {
  return 42l;
}
```

<!-- Notes au bas de la page. -->
## Notes

[^1]: Pour les curieux techniques, voir [la proposition WebAssembly pour JSPI](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md) et [le portfolio de conception de commutation de pile de V8](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y).

[^2]: Remarque : nous incluons le programme complet ci-dessous, à l'annexe A.

[^3]: Nous n'avons pas besoin de ce drapeau pour notre exemple spécifique, mais vous en aurez probablement besoin pour un projet plus grand.

[^4]: Remarque : vous avez besoin d'une version d'Emscripten ≥ 3.1.61.

[^6]: Le programme complet est montré dans l'annexe B.
