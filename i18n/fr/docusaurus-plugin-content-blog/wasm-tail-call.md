---
title: "Appels en queue dans WebAssembly"
author: "Thibaud Michaud, Thomas Lively"
date: 2023-04-06
tags: 
  - WebAssembly
description: "Ce document explique la proposition concernant les appels en queue dans WebAssembly et la démontre avec quelques exemples."
tweet: "1644077795059044353"
---
Nous intégrons les appels en queue de WebAssembly dans V8 v11.2 ! Dans cet article, nous donnons un aperçu de cette proposition, présentons un cas d’utilisation intéressant pour les coroutines C++ avec Emscripten, et montrons comment V8 gère les appels en queue en interne.

## Qu'est-ce que l'optimisation des appels en queue ?

Un appel est dit être en position de queue si c'est la dernière instruction exécutée avant de retourner de la fonction actuelle. Les compilateurs peuvent optimiser ces appels en supprimant la pile de l'appelant et en remplaçant l’appel par un saut.

Cela est particulièrement utile pour les fonctions récursives. Par exemple, prenez cette fonction C qui additionne les éléments d'une liste chaînée :

```c
int sum(List* list, int acc) {
  if (list == nullptr) return acc;
  return sum(list->next, acc + list->val);
}
```

Avec un appel classique, cela consomme un espace de pile de 𝒪(n) : chaque élément de la liste ajoute un nouveau cadre à la pile d'appels. Avec une liste assez longue, cela peut rapidement provoquer un débordement de pile. En remplaçant l'appel par un saut, l'optimisation des appels en queue transforme efficacement cette fonction récursive en une boucle utilisant un espace de pile de 𝒪(1) :

<!--truncate-->
```c
int sum(List* list, int acc) {
  while (list != nullptr) {
    acc = acc + list->val;
    list = list->next;
  }
  return acc;
}
```

Cette optimisation est particulièrement importante pour les langages fonctionnels. Ils reposent fortement sur des fonctions récursives, et les langages purs comme Haskell ne fournissent même pas de structures de contrôle de boucle. Toute sorte d'itération personnalisée utilise typiquement une manière ou une autre la récursivité. Sans optimisation des appels en queue, cela provoquerait très rapidement un débordement de pile pour tout programme non trivial.

### La proposition des appels en queue dans WebAssembly

Il existe deux façons d'appeler une fonction dans la version MVP de Wasm : `call` et `call_indirect`. La proposition ajoutant les appels en queue dans WebAssembly introduit leurs équivalents pour les appels en queue : `return_call` et `return_call_indirect`. Cela signifie que la chaîne d'outils est responsable de la réalisation effective de l'optimisation des appels en queue et d'émettre le type d'appel approprié, ce qui lui donne un meilleur contrôle sur les performances et l'utilisation de l'espace de pile.

Examinons une fonction Fibonacci récursive. Le code bytecode de Wasm est inclus ici dans le format textuel pour être complet, mais vous pouvez le trouver en C++ dans la section suivante :

```wasm/4
(func $fib_rec (param $n i32) (param $a i32) (param $b i32) (result i32)
  (if (i32.eqz (local.get $n))
    (then (return (local.get $a)))
    (else
      (return_call $fib_rec
        (i32.sub (local.get $n) (i32.const 1))
        (local.get $b)
        (i32.add (local.get $a) (local.get $b))
      )
    )
  )
)

(func $fib (param $n i32) (result i32)
  (call $fib_rec (local.get $n) (i32.const 0) (i32.const 1))
)
```

À tout moment, il n'y a qu'un seul cadre `fib_rec`, qui se déroule avant d'effectuer le prochain appel récursif. Lorsque nous atteignons le cas de base, `fib_rec` retourne directement le résultat `a` à `fib`.

Une conséquence observable des appels en queue est (en plus d'un risque réduit de débordement de pile) que les appelants en queue n'apparaissent pas dans les traces de pile. Ils n'apparaissent pas non plus dans la propriété de la pile d'une exception capturée ni dans la trace de pile des DevTools. Au moment où une exception est levée ou que l'exécution est mise en pause, les cadres des appelants en queue ont disparu et V8 ne peut pas les récupérer.

## Utilisation des appels en queue avec Emscripten

Les langages fonctionnels dépendent souvent des appels en queue, mais il est également possible de les utiliser en tant que programmeur C ou C++. Emscripten (et Clang, qu'Emscripten utilise) prend en charge l'attribut musttail qui indique au compilateur qu'un appel doit être compilé en un appel en queue. À titre d'exemple, considérez cette implémentation récursive d'une fonction Fibonacci qui calcule le `n`ième numéro de Fibonacci modulo 2^32 (car les entiers débordent pour de grands `n`) :

```c
#include <stdio.h>

unsigned fib_rec(unsigned n, unsigned a, unsigned b) {
  if (n == 0) {
    return a;
  }
  return fib_rec(n - 1, b, a + b);
}

unsigned fib(unsigned n) {
  return fib_rec(n, 0, 1);
}

int main() {
  for (unsigned i = 0; i < 10; i++) {
    printf("fib(%d): %d\n", i, fib(i));
  }

  printf("fib(1000000): %d\n", fib(1000000));
}
```

Après compilation avec `emcc test.c -o test.js`, l'exécution de ce programme dans Node.js déclenche une erreur de débordement de pile. Nous pouvons résoudre cela en ajoutant `__attribute__((__musttail__))` au retour dans `fib_rec` et en ajoutant `-mtail-call` aux arguments de compilation. Maintenant, le module Wasm produit contient les nouvelles instructions d'appel en queue, donc nous devons passer `--experimental-wasm-return_call` à Node.js, mais la pile ne déborde plus.

Voici un exemple utilisant également la récursivité mutuelle :

```c
#include <stdio.h>
#include <stdbool.h>

bool is_odd(unsigned n);
bool is_even(unsigned n);

bool is_odd(unsigned n) {
  if (n == 0) {
    return false;
  }
  __attribute__((__musttail__))
  return is_even(n - 1);
}

bool is_even(unsigned n) {
  if (n == 0) {
    return true;
  }
  __attribute__((__musttail__))
  return is_odd(n - 1);
}

int main() {
  printf("is_even(1000000): %d\n", is_even(1000000));
}
```

Notez que ces deux exemples sont suffisamment simples pour que, si nous compilons avec `-O2`, le compilateur puisse précalculer la réponse et éviter d'épuiser la pile même sans appels tail, mais ce ne serait pas le cas avec un code plus complexe. Dans le code réel, l'attribut musttail peut être utile pour écrire des boucles d'interpréteur haute performance comme décrit dans [cet article de blog](https://blog.reverberate.org/2021/04/21/musttail-efficient-interpreters.html) par Josh Haberman.

En dehors de l'attribut `musttail`, le C++ dépend des appels tail pour une autre fonctionnalité : les coroutines C++20. La relation entre les appels tail et les coroutines C++20 est couverte en profondeur dans [cet article de blog](https://lewissbaker.github.io/2020/05/11/understanding_symmetric_transfer) par Lewis Baker, mais pour résumer, il est possible d'utiliser des coroutines dans un modèle qui provoquerait subtilement un débordement de pile même si le code source ne semble pas poser problème. Pour résoudre ce problème, le comité C++ a ajouté une exigence selon laquelle les compilateurs doivent implémenter le “transfert symétrique” pour éviter le débordement de pile, ce qui, en pratique, signifie utiliser des appels tail en coulisses.

Lorsque les appels tail WebAssembly sont activés, Clang implémente le transfert symétrique décrit dans cet article de blog, mais lorsque les appels tail ne sont pas activés, Clang compile silencieusement le code sans transfert symétrique, ce qui pourrait entraîner des débordements de pile et n'est techniquement pas une implémentation correcte du C++20 !

Pour voir la différence en action, utilisez Emscripten pour compiler le dernier exemple de l'article de blog mentionné ci-dessus et observez qu'il évite uniquement le débordement de pile si les appels tail sont activés. Notez qu'en raison d'un bogue récemment corrigé, cela ne fonctionne correctement que dans Emscripten 3.1.35 ou une version ultérieure.

## Appels tail dans V8

Comme nous l'avons vu plus tôt, il n'appartient pas au moteur de détecter les appels en position tail. Cela devrait être fait en amont par la chaîne d'outils. Ainsi, la seule tâche restante pour TurboFan (le compilateur optimisé de V8) est de produire une séquence d'instructions appropriée basée sur le type d'appel et la signature de la fonction cible. Pour notre exemple fibonacci vu précédemment, la pile se présenterait comme suit :

![Appel tail simple dans TurboFan](/_img/wasm-tail-calls/tail-calls.svg)

À gauche, nous sommes dans `fib_rec` (en vert), appelé par `fib` (en bleu) et à point de faire un appel tail récursif à `fib_rec`. Tout d'abord, nous désémpilons le cadre actuel en réinitialisant le pointeur de cadre et le pointeur de pile. Le pointeur de cadre restaure simplement sa valeur précédente en la lisant depuis l'emplacement “Caller FP”. Le pointeur de pile se déplace vers le haut du cadre parent, plus suffisamment d'espace pour tout paramètre potentiel de pile et retour de pile pour le calque (0 dans ce cas, tout est passé par des registres). Les paramètres sont placés dans leurs registres prévus conformément à la liaison de `fib_rec` (non visible dans le diagramme). Et enfin, nous commençons à exécuter `fib_rec`, qui commence par créer un nouveau cadre.

`fib_rec` désémpile et réémpile lui-même comme ceci jusqu'à ce que `n == 0`, moment auquel il retourne `a` par registre à `fib`.

C'est un cas simple où tous les paramètres et valeurs de retour tiennent dans les registres, et l'appelant et le calqué ont la même signature. En cas général, nous pourrions devoir effectuer des manipulations complexes de la pile :

- Lire les paramètres sortants depuis l'ancien cadre
- Déplacer les paramètres dans le nouveau cadre
- Ajuster la taille du cadre en déplaçant l'adresse de retour vers le haut ou le bas, selon le nombre de paramètres de pile dans le calqué

Toutes ces lectures et écritures peuvent entrer en conflit les unes avec les autres, car nous réutilisons le même espace de pile. C'est une différence cruciale avec un appel non-tail, qui pousserait simplement tous les paramètres de pile et l'adresse de retour au-dessus de la pile.

![Appel tail complexe dans TurboFan](/_img/wasm-tail-calls/tail-calls-complex.svg)

TurboFan gère ces manipulations de pile et de registre avec le “gap resolver”, un composant qui prend une liste de déplacements qui devraient être exécutés en parallèle de manière sémantique et génère la séquence appropriée de déplacements pour résoudre les interférences potentielles entre les sources et les destinations des déplacements. Si les conflits sont acycliques, il s'agit simplement de réorganiser les déplacements de manière à ce que toutes les sources soient lues avant d'être écrasées. Pour les conflits cycliques (par exemple, si nous échangeons deux paramètres de pile), cela peut impliquer de déplacer l'une des sources vers un registre temporaire ou un emplacement de pile temporaire pour briser le cycle.

Les appels en queue sont également pris en charge dans Liftoff, notre compilateur de base. En fait, ils doivent être pris en charge, sinon le code de base pourrait manquer d'espace de pile. Cependant, ils ne sont pas optimisés à ce niveau : Liftoff empile les paramètres, l'adresse de retour et le pointeur de trame pour compléter la trame comme s'il s'agissait d'un appel régulier, puis déplace tout vers le bas pour supprimer la trame de l'appelant :

![Appels en queue dans Liftoff](/_img/wasm-tail-calls/tail-calls-liftoff.svg)

Avant de sauter à la fonction cible, nous vidons également la FP de l'appelant dans le registre FP pour restaurer sa valeur précédente, et permettre à la fonction cible de l'empiler à nouveau dans le prologue.

Cette stratégie ne nécessite pas que nous analysions et résolvions les conflits de déplacement, ce qui rend la compilation plus rapide. Le code généré est plus lent, mais [passe finalement à un niveau supérieur](/blog/wasm-dynamic-tiering) à TurboFan si la fonction est suffisamment sollicitée.
