---
title: "Un moteur supplémentaire de RegExp sans retour arrière"
author: "Martin Bidlingmaier"
date: 2021-01-11
tags:
 - internes
 - RegExp
description: 'V8 dispose désormais d'un moteur RegExp supplémentaire qui sert de secours et empêche de nombreux cas de retour arrière catastrophique.'
tweet: "1348635270762139650"
---
À partir de la version 8.8, V8 est livré avec un nouveau moteur RegExp expérimental sans retour arrière (en plus du moteur [Irregexp existant](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)) qui garantit une exécution en temps linéaire par rapport à la taille de la chaîne soumise. Le moteur expérimental est disponible derrière les drapeaux de fonctionnalités mentionnés ci-dessous.

<!--truncate-->
![Durée d'exécution de `/(a*)*b/.exec('a'.repeat(n))` pour n ≤ 100](/_img/non-backtracking-regexp/runtime-plot.svg)

Voici comment vous pouvez configurer le nouveau moteur RegExp :

- `--enable-experimental-regexp_engine-on-excessive-backtracks` active le basculement vers le moteur sans retour arrière en cas de retours arrière excessifs.
- `--regexp-backtracks-before-fallback N` (par défaut N = 50 000) spécifie combien de retours arrière sont considérés comme « excessifs », c'est-à-dire quand le basculement intervient.
- `--enable-experimental-regexp-engine` active la reconnaissance du drapeau non standard `l` (« linéaire ») pour les RegExps, comme dans `/(a*)*b/l`. Les RegExps construits avec ce drapeau sont toujours exécutés immédiatement avec le nouveau moteur ; Irregexp n'est pas impliqué du tout. Si le nouveau moteur RegExp ne peut pas gérer le modèle d'un RegExp avec le drapeau `l`, une exception est levée à la construction. Nous espérons que cette fonction pourra un jour être utilisée pour renforcer les applications qui exécutent des RegExps sur des entrées non fiables. Pour l'instant, cela reste expérimental car Irregexp est plusieurs ordres de grandeur plus rapide que le nouveau moteur sur la plupart des modèles courants.

Le mécanisme de secours ne s'applique pas à tous les modèles. Pour que le mécanisme de secours s'active, le RegExp doit :

- ne contenir ni références arrière,
- ni prévisions ni arrière-pensées,
- ni répétitions finies grandes ou profondément imbriquées, comme dans `/a{200,500}/`, et
- ne pas avoir les drapeaux `u` (Unicode) ou `i` (insensible à la casse) activés.

## Contexte : retour arrière catastrophique

La correspondance RegExp dans V8 est gérée par le moteur Irregexp. Irregexp compilie les RegExps en code natif spécialisé (ou [bytecode](/blog/regexp-tier-up)) et est donc extrêmement rapide pour la plupart des modèles. Pour certains modèles, cependant, le temps d'exécution d'Irregexp peut exploser exponentiellement en fonction de la taille de la chaîne d'entrée. L'exemple ci-dessus, `/(a*)*b/.exec('a'.repeat(100))`, ne se termine pas de notre vivant si exécuté par Irregexp.

Alors, que se passe-t-il ici ? Irregexp est un moteur de *retour arrière*. Lorsqu'il est confronté à un choix sur la façon dont une correspondance peut se poursuivre, Irregexp explore en totalité la première alternative, puis revient en arrière si nécessaire pour explorer la deuxième alternative. Considérons par exemple la correspondance du modèle `/abc|[az][by][0-9]/` avec la chaîne soumise `'ab3'`. Ici, Irregexp tente de correspondre d'abord à `/abc/` et échoue après le deuxième caractère. Il revient alors en arrière de deux caractères et correspond avec succès à la deuxième alternative `/[az][by][0-9]/`. Dans des modèles avec quantificateurs tels que `/(abc)*xyz/`, Irregexp doit choisir après une correspondance du corps s'il faut correspondre au corps à nouveau ou continuer avec le modèle restant.

Essayons de comprendre ce qui se passe lors de la correspondance de `/(a*)*b/` avec une chaîne soumise plus petite, disons `'aaa'`. Ce modèle contient des quantificateurs imbriqués, donc nous demandons à Irregexp de correspondre à une *séquence de séquences* de `'a'`, puis de correspondre à `'b'`. De toute évidence, il n'y a pas de correspondance parce que la chaîne soumise ne contient pas `'b'`. Cependant, `/(a*)*/` correspond, et le fait de manière exponentiellement variée :

```js
'aaa'           'aa', 'a'           'aa', ''
'a', 'aa'       'a', 'a', 'a'       'a', 'a', ''
…
```

A priori, Irregexp ne peut pas exclure que l'échec de la correspondance du final `/b/` soit dû au choix d'une mauvaise manière de correspondre `/(a*)*/`, il doit donc essayer toutes les variantes. Ce problème est connu sous le nom de retour arrière « exponentiel » ou « catastrophique ».

## RegExps en tant qu'automates et bytecode

Pour comprendre un algorithme alternatif qui est immunisé contre les retours arrière catastrophiques, nous devons faire un petit détour par les [automates](https://en.wikipedia.org/wiki/Nondeterministic_finite_automaton). Chaque expression régulière est équivalente à un automate. Par exemple, le RegExp `/(a*)*b/` ci-dessus correspond à l'automate suivant :

![Automate correspondant à `/(a*)*b/`](/_img/non-backtracking-regexp/example-automaton.svg)

Notez que l'automate n'est pas déterminé uniquement par le modèle ; celui que vous voyez ci-dessus est l'automate que vous obtiendrez par un processus de traduction mécanique, et c'est celui qui est utilisé à l'intérieur du nouveau moteur RegExp de V8 pour `/(a*)*/`.
Les arêtes non étiquetées sont des transitions epsilon : elles ne consomment pas d’entrée. Les transitions epsilon sont nécessaires pour conserver la taille de l'automate proche de celle du modèle. Éliminer naïvement les transitions epsilon peut entraîner une augmentation quadratique du nombre de transitions.
Les transitions epsilon permettent également de construire l'automate correspondant à une expression régulière (RegExp) à partir des quatre types d'états de base suivants :

![Instructions de bytecode RegExp](/_img/non-backtracking-regexp/state-types.svg)

Ici, nous ne classifions que les transitions *sortantes* de l'état, tandis que les transitions entrantes dans l'état peuvent rester arbitraires. Les automates construits uniquement à partir de ces types d'états peuvent être représentés comme des *programmes en bytecode*, chaque état correspondant à une instruction. Par exemple, un état avec deux transitions epsilon est représenté comme une instruction `FORK`.

## L'algorithme de backtracking

Revisitons l'algorithme de backtracking sur lequel Irregexp est basé et décrivons-le en termes d'automates. Supposons que nous ayons un tableau de bytecode `code` correspondant au modèle et que nous souhaitions `tester` si une `entrée` correspond au modèle. Supposons que `code` ressemble à ceci :

```js
const code = [
  {opcode: 'FORK', forkPc: 4},
  {opcode: 'CONSUME', char: '1'},
  {opcode: 'CONSUME', char: '2'},
  {opcode: 'JMP', jmpPc: 6},
  {opcode: 'CONSUME', char: 'a'},
  {opcode: 'CONSUME', char: 'b'},
  {opcode: 'ACCEPT'}
];
```

Ce bytecode correspond au modèle (sticky) `/12|ab/y`. Le champ `forkPc` de l'instruction `FORK` est l'indice (« compteur de programme ») de l'état/instruction alternatif à continuer, et de même pour `jmpPc`. Les indices sont basés à zéro. L'algorithme de backtracking peut maintenant être implémenté en JavaScript comme suit.

```js
let ip = 0; // Position d'entrée.
let pc = 0; // Compteur de programme : indice de l'instruction suivante.
const stack = []; // Pile de backtracking.
while (true) {
  const inst = code[pc];
  switch (inst.opcode) {
    case 'CONSUME':
      if (ip < input.length && input[ip] === inst.char) {
        // L'entrée correspond à ce que nous attendons : continuer.
        ++ip;
        ++pc;
      } else if (stack.length > 0) {
        // Mauvais caractère d’entrée, mais on peut revenir en arrière.
        const back = stack.pop();
        ip = back.ip;
        pc = back.pc;
      } else {
        // Mauvais caractère, impossible de revenir en arrière.
        return false;
      }
      break;
    case 'FORK':
      // Sauvegarder une alternative pour revenir en arrière plus tard.
      stack.push({ip: ip, pc: inst.forkPc});
      ++pc;
      break;
    case 'JMP':
      pc = inst.jmpPc;
      break;
    case 'ACCEPT':
      return true;
  }
}
```

Cette implémentation boucle indéfiniment si le programme de bytecode contient des boucles qui ne consomment aucun caractère, c'est-à-dire si l'automate contient une boucle constituée uniquement de transitions epsilon. Ce problème peut être résolu avec une anticipation d’un seul caractère. Irregexp est bien plus sophistiqué que cette simple implémentation, mais il est fondamentalement basé sur le même algorithme.

## L'algorithme sans backtracking

L'algorithme de backtracking correspond à une traversée *en profondeur d'abord* de l'automate : nous explorons toujours la première alternative d'une instruction `FORK` dans sa totalité, puis revenons en arrière pour la seconde alternative si nécessaire. Son alternative, l'algorithme sans backtracking, est donc sans surprise basé sur une traversée *en largeur d'abord* de l'automate. Ici, nous considérons toutes les alternatives simultanément, en synchronisation avec la position actuelle dans la chaîne d'entrée. Nous maintenons donc une liste d'états actuels, puis faisons avancer tous les états en prenant des transitions correspondant à chaque caractère d'entrée. L’essentiel est que nous supprimons les doublons de la liste des états actuels.

Une implémentation simple en JavaScript ressemble à ceci :

```js
// Position d'entrée.
let ip = 0;
// Liste des valeurs actuelles de pc, ou `'ACCEPT'` si nous avons trouvé une correspondance. Nous commençons à
// pc 0 et suivons les transitions epsilon.
let pcs = followEpsilons([0]);

while (true) {
  // Nous avons terminé si nous avons trouvé une correspondance…
  if (pcs === 'ACCEPT') return true;
  // …ou si nous avons épuisé la chaîne d'entrée.
  if (ip >= input.length) return false;

  // Continuez uniquement avec les pcs qui CONSOMMENT le bon caractère.
  pcs = pcs.filter(pc => code[pc].char === input[ip]);
  // Faites avancer les pcs restants à l'instruction suivante.
  pcs = pcs.map(pc => pc + 1);
  // Suivez les transitions epsilon.
  pcs = followEpsilons(pcs);

  ++ip;
}
```

Ici `followEpsilons` est une fonction qui prend une liste de compteurs de programme et calcule la liste des compteurs de programme aux instructions `CONSUME` qui peuvent être atteintes via des transitions epsilon (c'est-à-dire en exécutant uniquement FORK et JMP). La liste retournée ne doit pas contenir de doublons. Si une instruction `ACCEPT` peut être atteinte, la fonction retourne `'ACCEPT'`. Elle peut être implémentée de cette manière :

```js
function followEpsilons(pcs) {
  // Ensemble des pcs déjà vus jusqu'à présent.
  const visitedPcs = new Set();
  const result = [];

  while (pcs.length > 0) {
    const pc = pcs.pop();

    // Nous pouvons ignorer pc si nous l'avons déjà vu.
    if (visitedPcs.has(pc)) continue;
    visitedPcs.add(pc);

    const inst = code[pc];
    switch (inst.opcode) {
      case 'CONSUME':
        result.push(pc);
        break;
      case 'FORK':
        pcs.push(pc + 1, inst.forkPc);
        break;
      case 'JMP':
        pcs.push(inst.jmpPc);
        break;
      case 'ACCEPT':
        return 'ACCEPT';
    }
  }

  return result;
}
```

Grâce à l'élimination des doublons via l'ensemble `visitedPcs`, nous savons que chaque compteur de programme est examiné une seule fois dans `followEpsilons`. Cela garantit que la liste `result` ne contient pas de doublons, et que le temps d'exécution de `followEpsilons` est limité par la taille du tableau `code`, c'est-à-dire la taille du motif. `followEpsilons` est appelé au maximum `input.length` fois, donc le temps d'exécution total de la correspondance RegExp est limité par `𝒪(pattern.length * input.length)`.

L'algorithme sans retour arrière peut être étendu pour prendre en charge la plupart des fonctionnalités des RegExps de JavaScript, par exemple les limites de mots ou le calcul des limites de (sous-)correspondances. Malheureusement, les rétro-références, les avant-plans et les arrière-plans ne peuvent pas être pris en charge sans des changements majeurs qui modifient la complexité asymptotique dans le pire des cas.

Le nouveau moteur RegExp de V8 est basé sur cet algorithme et son implémentation dans les bibliothèques [re2](https://github.com/google/re2) et [Rust regex](https://github.com/rust-lang/regex). L'algorithme est discuté en profondeur bien plus que ici dans une excellente [série d'articles de blog](https://swtch.com/~rsc/regexp/) par Russ Cox, qui est également l'auteur original de la bibliothèque re2.
