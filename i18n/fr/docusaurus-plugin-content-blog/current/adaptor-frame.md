---
title: 'Appels JavaScript plus rapides'
author: '[Victor Gomes](https://twitter.com/VictorBFG), le déchiqueteur de frames'
avatars:
  - 'victor-gomes'
date: 2021-02-15
tags:
  - internals
description: 'Appels JavaScript plus rapides en supprimant le frame adaptateur d'arguments'
tweet: '1361337569057865735'
---

JavaScript permet d'appeler une fonction avec un nombre d'arguments différent de celui attendu par les paramètres formels, c'est-à-dire que l'on peut passer moins ou plus d'arguments que les paramètres déclarés. Le premier cas est appelé sous-application, et le second est appelé sur-application.

<!--truncate-->
Dans le cas de sous-application, les paramètres restants se voient attribuer la valeur undefined. Dans le cas de sur-application, les arguments supplémentaires peuvent être accédés en utilisant le paramètre rest et la propriété `arguments`, ou ils sont simplement superflus et peuvent être ignorés. De nombreux frameworks Web/Node.js utilisent aujourd'hui cette fonctionnalité de JS pour accepter des paramètres optionnels et créer une API plus flexible.

Jusqu'à récemment, V8 avait un mécanisme spécial pour gérer les écarts de taille entre les arguments : le frame adaptateur d'arguments. Malheureusement, l'adaptation des arguments a un coût en termes de performances, mais elle est couramment nécessaire dans les frameworks modernes de front-end et de middleware. Il s'avère qu'avec une astuce ingénieuse, nous pouvons supprimer ce frame supplémentaire, simplifier la base de code de V8 et éliminer presque entièrement les surcoûts.

Nous pouvons calculer l'impact sur les performances de la suppression du frame adaptateur d'arguments à l'aide d'un micro-benchmark.

```js
console.time();
function f(x, y, z) {}
for (let i = 0; i <  N; i++) {
  f(1, 2, 3, 4, 5);
}
console.timeEnd();
```

![Impact sur les performances de la suppression du frame adaptateur d'arguments, mesuré à l'aide d'un micro-benchmark.](/_img/v8-release-89/perf.svg)

Le graphique montre qu'il n'y a plus de surcoût lorsqu'on exécute en [mode sans JIT](https://v8.dev/blog/jitless) (Ignition) avec une amélioration des performances de 11,2 %. Lorsqu'on utilise [TurboFan](https://v8.dev/docs/turbofan), on obtient jusqu'à 40 % de gain de vitesse.

Ce micro-benchmark a naturellement été conçu pour maximiser l'impact du frame adaptateur d'arguments. Cependant, nous avons observé une nette amélioration dans de nombreux benchmarks, comme dans [notre benchmark interne JSTests/Array](https://chromium.googlesource.com/v8/v8/+/b7aa85fe00c521a704ca83cc8789354e86482a60/test/js-perf-test/JSTests.json) (7 %) et dans [Octane2](https://github.com/chromium/octane) (4,6 % dans Richards et 6,1 % dans EarleyBoyer).

## TL;DR: Inverser les arguments

L'objectif principal de ce projet était de supprimer le frame adaptateur d'arguments, qui offre une interface cohérente à la fonction appelée lors de l'accès à ses arguments dans la pile. Pour ce faire, nous devions inverser les arguments dans la pile et ajouter un nouvel emplacement dans le frame de la fonction appelée contenant le nombre réel d'arguments. La figure ci-dessous montre l'exemple d'un frame typique avant et après le changement.

![Un frame de pile JavaScript typique avant et après la suppression du frame adaptateur d'arguments.](/_img/adaptor-frame/frame-diff.svg)

## Accélérer les appels JavaScript

Pour apprécier ce que nous avons fait pour rendre les appels plus rapides, voyons comment V8 effectue un appel et comment fonctionne le frame adaptateur d'arguments.

Que se passe-t-il à l'intérieur de V8 lorsque nous invoquons un appel de fonction en JS ? Supposons le script JS suivant :

```js
function add42(x) {
  return x + 42;
}
add42(3);
```

![Flux d'exécution à l'intérieur de V8 pendant un appel de fonction.](/_img/adaptor-frame/flow.svg)

## Ignition

V8 est une machine virtuelle multi-niveaux. Son premier niveau est appelé [Ignition](https://v8.dev/docs/ignition), c'est une machine à pile basée sur du bytecode avec un registre accumulateur. V8 commence par compiler le code en [bytecode Ignition](https://medium.com/dailyjs/understanding-v8s-bytecode-317d46c94775). L'appel ci-dessus est compilé comme suit :

```
0d              LdaUndefined              ;; Charger undefined dans l'accumulateur
26 f9           Star r2                   ;; Le stocker dans le registre r2
13 01 00        LdaGlobal [1]             ;; Charger la valeur globale pointée par const 1 (add42)
26 fa           Star r1                   ;; La stocker dans le registre r1
0c 03           LdaSmi [3]                ;; Charger le petit entier 3 dans l'accumulateur
26 f8           Star r3                   ;; Le stocker dans le registre r3
5f fa f9 02     CallNoFeedback r1, r2-r3  ;; Invoquer l'appel
```

Le premier argument d'un appel est généralement désigné comme le récepteur. Le récepteur est l'objet `this` à l'intérieur d'une JSFunction, et chaque appel de fonction JS doit en avoir un. Le gestionnaire de bytecode de `CallNoFeedback` doit appeler l'objet `r1` avec les arguments de la liste de registres `r2-r3`.

Avant de plonger dans le gestionnaire de bytecode, notez comment les registres sont codés dans le bytecode. Ce sont des entiers négatifs sur un seul octet : `r1` est codé en `fa`, `r2` en `f9` et `r3` en `f8`. Nous pouvons référencer tout registre ri comme `fb - i`, en réalité, comme nous le verrons, le codage correct est `- 2 - kFixedFrameHeaderSize - i`. Les listes de registres sont codées en utilisant le premier registre et la taille de la liste, donc `r2-r3` est `f9 02`.

Il existe de nombreux gestionnaires d'appels de bytecode dans Ignition. Vous pouvez en voir une liste [ici](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/interpreter/bytecodes.h;drc=3965dcd5cb1141c90f32706ac7c965dc5c1c55b3;l=184). Ils varient légèrement les uns des autres. Il y a des bytecodes optimisés pour les appels avec un récepteur `undefined`, pour les appels de propriétés, pour les appels avec un nombre fixe de paramètres ou pour les appels génériques. Ici, nous analysons `CallNoFeedback`, qui est un appel générique où nous n'accumulons pas de feedback lors de l'exécution.

Le gestionnaire de ce bytecode est assez simple. Il est écrit dans [`CodeStubAssembler`](https://v8.dev/docs/csa-builtins), vous pouvez le consulter [ici](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/interpreter/interpreter-generator.cc;drc=6cdb24a4ce9d4151035c1f133833137d2e2881d1;l=1467). Essentiellement, il fait un appel en queue à une fonction intégrée dépendante de l'architecture appelée [`InterpreterPushArgsThenCall`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=1277).

La fonction intégrée extrait essentiellement l'adresse de retour dans un registre temporaire, pousse tous les arguments (y compris le récepteur) et repousse l'adresse de retour. À ce stade, nous ne savons pas si le callee est un objet appelable ni combien d'arguments le callee attend, c'est-à-dire son nombre de paramètres formels.

![État de la frame après l'exécution de la fonction intégrée `InterpreterPushArgsThenCall`.](/_img/adaptor-frame/normal-push.svg)

Finalement, l'exécution fait un appel en queue à la fonction intégrée [`Call`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=2256). Là, elle vérifie si la cible est une fonction propre, un constructeur ou tout objet appelable. Elle lit également la structure `shared function info` pour obtenir son nombre de paramètres formels.

Si le callee est un objet fonction, il fait un appel en queue à la fonction intégrée [`CallFunction`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=2038), où plusieurs vérifications se produisent, notamment si nous avons un objet `undefined` comme récepteur. Si nous avons un objet `undefined` ou `null` comme récepteur, nous devons le patcher pour référencer l'objet proxy global, selon la [spécification ECMA](https://262.ecma-international.org/11.0/#sec-ordinarycallbindthis).

L'exécution fait ensuite un appel en queue à la fonction intégrée [`InvokeFunctionCode`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/codegen/x64/macro-assembler-x64.cc;drc=a723767935dec385818d1134ea729a4c3a3ddcfb;l=2781), qui, en l'absence d'une correspondance des arguments, appellera simplement ce qui est pointé par le champ `Code` dans l'objet callee. Cela peut être une fonction optimisée ou la fonction intégrée [`InterpreterEntryTrampoline`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=1037).

Si nous supposons que nous appelons une fonction qui n'a pas encore été optimisée, le trampoline Ignition configurera une `IntepreterFrame`. Vous pouvez voir un bref résumé des types de frames dans V8 [ici](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/execution/frame-constants.h;drc=574ac5d62686c3de8d782dc798337ce1355dc066;l=14).

Sans entrer dans trop de détails sur ce qui se passe ensuite, nous pouvons voir un instantané de la frame de l'interpréteur pendant l'exécution du callee.

![La `InterpreterFrame` pour l'appel `add42(3)`.](/_img/adaptor-frame/normal-frame.svg)

Nous voyons que nous avons un nombre fixe d'emplacements dans la frame : l'adresse de retour, le pointeur de la frame précédente, le contexte, l'objet fonction actuel que nous exécutons, l'array de bytecodes de cette fonction et l'offset du bytecode actuel que nous exécutons. Enfin, nous avons une liste de registres dédiés à cette fonction (vous pouvez les considérer comme des variables locales de fonction). La fonction `add42` n'a en réalité aucun registre, mais l'appelant a une frame similaire avec 3 registres.

Comme prévu, `add42` est une fonction simple :

```
25 02             Ldar a0          ;; Charger le premier argument dans l'accumulateur
40 2a 00          AddSmi [42]      ;; Ajouter 42
ab                Return           ;; Retourner l'accumulateur
```

Notez comment nous codons l'argument dans le bytecode `Ldar` _(Load Accumulator Register)_ : l'argument `1` (`a0`) est codé avec le nombre `02`. En fait, le codage de tout argument est simplement `[ai] = 2 + parameter_count - i - 1` et le récepteur `[this] = 2 + parameter_count`, ou dans cet exemple `[this] = 3`. Le nombre de paramètres ici n'inclut pas le récepteur.

Nous pouvons maintenant comprendre pourquoi nous encodons les registres et les arguments de cette manière. Ils désignent simplement un décalage par rapport au pointeur de cadre. Nous pouvons alors traiter le chargement et le stockage des arguments et registres de la même manière. Le décalage pour le dernier argument par rapport au pointeur de cadre est `2` (pointeur de cadre précédent et l'adresse de retour). Cela explique le `2` dans l'encodage. La partie fixe du cadre de l'interprète est composée de `6` emplacements (`4` à partir du pointeur de cadre), donc le registre zéro est situé au décalage `-5`, c'est-à-dire `fb`, le registre `1` à `fa`. Ingénieux, non ?

Notez cependant que pour accéder aux arguments, la fonction doit savoir combien d'arguments se trouvent dans la pile ! L'index `2` pointe vers le dernier argument, peu importe combien d'arguments il y a !

Le gestionnaire de bytecode de `Return` se terminera par l'appel à la fonction intégrée `LeaveInterpreterFrame`. Cette fonction intégrée lit essentiellement l'objet fonction pour obtenir le nombre de paramètres à partir du cadre, abandonne le cadre actuel, récupère le pointeur de cadre, sauvegarde l'adresse de retour dans un registre temporaire, retire les arguments selon le nombre de paramètres et saute à l'adresse dans le registre temporaire.

Tout ce flux est génial ! Mais que se passe-t-il lorsque nous appelons une fonction avec moins ou plus d'arguments que son nombre de paramètres ? L'accès habile aux arguments et registres échouera, et comment nettoyer les arguments à la fin de l'appel ?

## Cadre d'adaptateur des arguments

Appelons maintenant `add42` avec moins et plus d'arguments :

```js
add42();
add42(1, 2, 3);
```

Les développeurs JS parmi nous sauront que dans le premier cas, `x` sera attribué à `undefined` et la fonction retournera `undefined + 42 = NaN`. Dans le second cas, `x` sera attribué à `1` et la fonction retournera `43`, les arguments restants seront ignorés. Notez que l'appelant ne sait pas si cela se produira. Même si l'appelant vérifie le nombre de paramètres, l'appelé peut utiliser le paramètre de repos ou l'objet arguments pour accéder à tous les autres arguments. En réalité, l'objet arguments peut même être accessible en dehors de `add42` en mode laxiste.

Si nous suivons les mêmes étapes qu'auparavant, nous appellerons d'abord la fonction intégrée `InterpreterPushArgsThenCall`. Elle poussera les arguments dans la pile comme suit :

![État des cadres après l'exécution de la fonction intégrée `InterpreterPushArgsThenCall`.](/_img/adaptor-frame/adaptor-push.svg)

En continuant la même procédure, nous vérifions si l'appelé est un objet fonction, obtenons son nombre de paramètres et adaptons le récepteur au proxy global. Finalement, nous atteignons `InvokeFunctionCode`.

Ici, au lieu de sauter à `Code` dans l'objet appelé, nous vérifions qu'il y a un décalage entre la taille des arguments et le nombre de paramètres et sautons à `ArgumentsAdaptorTrampoline`.

Dans cette fonction intégrée, nous construisons un cadre supplémentaire, le célèbre cadre d'adaptateur des arguments. Au lieu d'expliquer ce qui se passe à l'intérieur de la fonction intégrée, je vais simplement présenter l'état du cadre avant que la fonction intégrée appelle le `Code` de l'appelé. Notez que c'est un véritable `appel x64` (pas un `jmp`) et qu'après l'exécution de l'appelé, nous retournons à `ArgumentsAdaptorTrampoline`. Cela contraste avec `InvokeFunctionCode` qui fait un appel en queue.

![Cadres de pile avec adaptation des arguments.](/_img/adaptor-frame/adaptor-frames.svg)

Vous pouvez voir que nous créons un autre cadre qui copie tous les arguments nécessaires afin d'avoir précisément le nombre de paramètres d'arguments au-dessus du cadre de l'appelé. Cela crée une interface avec la fonction appelée, de sorte que cette dernière n'a pas besoin de connaître le nombre d'arguments. L'appelé pourra toujours accéder à ses paramètres avec le même calcul qu'auparavant, c'est-à-dire `[ai] = 2 + nombre_paramètres - i - 1`.

V8 dispose de fonctions intégrées spéciales qui comprennent le cadre adaptateur chaque fois qu'il est nécessaire d'accéder aux arguments restants via le paramètre de repos ou l'objet arguments. Elles devront toujours vérifier le type du cadre adaptateur au sommet du cadre de l'appelé et agir en conséquence.

Comme vous pouvez le voir, nous résolvons le problème d'accès aux arguments/registres, mais nous créons beaucoup de complexité. Chaque fonction intégrée qui doit accéder à tous les arguments devra comprendre et vérifier l'existence du cadre adaptateur. Non seulement cela, nous devons être prudents pour ne pas accéder à des données périmées ou anciennes. Considérons les modifications suivantes à `add42` :

```js
function add42(x) {
  x += 42;
  return x;
}
```

Le tableau de bytecode maintenant est :

```
25 02             Ldar a0       ;; Charger le premier argument dans l'accumulateur
40 2a 00          AddSmi [42]   ;; Ajouter 42 à celui-ci
26 02             Star a0       ;; Stocker l'accumulateur dans l'emplacement du premier argument
ab                Return        ;; Retourner l'accumulateur
```

Comme vous pouvez le voir, nous modifions maintenant `a0`. Donc, dans le cas d'un appel `add42(1, 2, 3)`, l'emplacement dans le cadre d'adaptateur des arguments sera modifié, mais le cadre de l'appelant contiendra toujours le nombre `1`. Nous devons faire attention à ce que l'objet arguments accède à la valeur modifiée au lieu de la valeur périmée.

Le retour de la fonction est simple, bien que lent. Vous vous souvenez de ce que fait `LeaveInterpreterFrame` ? Cela retire essentiellement le cadre appelé et les arguments jusqu'au nombre de paramètres. Ainsi, lorsque nous retournons à l'adaptateur d'arguments, la pile ressemble à ceci :

![État des cadres après l'exécution de l'appelé `add42`.](/_img/adaptor-frame/adaptor-frames-cleanup.svg)

Nous devons simplement dépiler le nombre d'arguments, dépiler le cadre adaptateur, dépiler tous les arguments selon le nombre d'arguments réels et revenir à l'exécution de l'appelant.

En résumé : la mécanique d'adaptation des arguments est non seulement complexe, mais coûteuse.

## Suppression du cadre adaptateur des arguments

Peut-on faire mieux ? Peut-on supprimer le cadre adaptateur ? Il s'avère que nous pouvons effectivement le faire.

Examinons nos exigences :

1. Nous devons pouvoir accéder aux arguments et aux registres de manière transparente comme auparavant. Aucun contrôle ne peut être effectué lors de leur accès. Cela serait trop coûteux.
2. Nous devons être capables de construire le paramètre rest et l'objet arguments à partir de la pile.
3. Nous devons pouvoir nettoyer facilement un nombre indéterminé d'arguments lors du retour d'un appel.
4. Et, bien sûr, nous voulons faire cela sans cadre supplémentaire !

Si nous voulons éliminer le cadre supplémentaire, nous devons décider où placer les arguments : soit dans le cadre du callee, soit dans celui de l'appelant.

### Arguments dans le cadre du callee

Supposons que nous mettions les arguments dans le cadre du callee. Cela semble en fait une bonne idée, puisque chaque fois que nous dépilons le cadre, nous dépilons également tous les arguments en une fois !

Les arguments devraient être situés quelque part entre le pointeur de cadre sauvegardé et la fin du cadre. Cela implique que la taille du cadre ne sera pas connue statiquement. Accéder à un argument sera toujours facile, c'est un simple décalage par rapport au pointeur de cadre. Mais accéder à un registre est désormais beaucoup plus compliqué, car cela varie selon le nombre d'arguments.

Le pointeur de pile pointe toujours sur le dernier registre, nous pourrions l'utiliser pour accéder aux registres sans connaître le nombre d'arguments. Cette approche pourrait en fait fonctionner, mais elle présente un inconvénient majeur : cela impliquerait de dupliquer tous les codes octet qui peuvent accéder aux registres et aux arguments. Nous aurions besoin d'un `LdaArgument` et d'un `LdaRegister` au lieu de simplement `Ldar`. Bien sûr, nous pourrions également vérifier si nous accédons à un argument ou à un registre (déplacements positifs ou négatifs), mais cela nécessiterait un contrôle à chaque accès à un argument ou un registre. Clairement trop coûteux !

### Arguments dans le cadre de l'appelant

D'accord… que se passe-t-il si nous gardons les arguments dans le cadre de l'appelant ?

Rappelez-vous comment calculer le décalage de l'argument `i` dans un cadre : `[ai] = 2 + parameter_count - i - 1`. Si nous avons tous les arguments (pas seulement les paramètres), le décalage sera `[ai] = 2 + argument_count - i - 1`. Autrement dit, pour chaque accès à un argument, nous devrions charger le compte réel des arguments.

Mais que se passe-t-il si nous inversons les arguments ? Maintenant, le décalage peut être simplement calculé comme `[ai] = 2 + i`. Nous n'avons pas besoin de savoir combien d'arguments sont dans la pile, mais si nous pouvons garantir que nous aurons toujours au moins le nombre de paramètres dans la pile, alors nous pouvons toujours utiliser ce schéma pour calculer le décalage.

En d'autres termes, le nombre d'arguments poussés dans la pile sera toujours le maximum entre le nombre d'arguments et le nombre de paramètres formels, et il sera complété avec des objets indéfinis si nécessaire.

Cela a encore un autre avantage ! Le receveur est toujours situé au même décalage pour toute fonction JS, juste au-dessus de l'adresse de retour : `[this] = 2`.

C'est une solution propre à notre exigence numéro `1` et numéro `4`. Qu'en est-il des deux autres exigences ? Comment construire le paramètre rest et l'objet arguments ? Et comment nettoyer les arguments dans la pile lorsqu'on revient à l'appelant ? Pour cela, il nous manque uniquement le nombre d'arguments. Nous devrons l'enregistrer quelque part. Le choix ici est un peu arbitraire, tant qu'il est facile d'accéder à cette information. Deux choix de base sont : pousser cette information juste après le receveur dans le cadre de l'appelant ou l'intégrer dans le cadre du callee dans la partie d'en-tête fixe. Nous avons implémenté la seconde option, car elle fusionne la partie d'en-tête fixe des cadres d'interpréteur et optimisés.

Si nous exécutons notre exemple dans V8 v8.9, nous verrons la pile suivante après `InterpreterArgsThenPush` (notez que les arguments sont maintenant inversés) :

![État des cadres après l'exécution de la bibliothèque intégrée `InterpreterPushArgsThenCall`.](/_img/adaptor-frame/no-adaptor-push.svg)

Toute l'exécution suit un chemin similaire jusqu'à ce que nous atteignions `InvokeFunctionCode`. Ici, nous ajustons les arguments en cas de sous-application, en poussant autant d'objets indéfinis que nécessaire. Notez que nous ne modifions rien en cas de sur-application. Enfin, nous passons le nombre d'arguments au `Code` du callee via un registre. Dans le cas de `x64`, nous utilisons le registre `rax`.

Si le callee n'a pas encore été optimisé, nous atteignons `InterpreterEntryTrampoline`, qui construit le cadre de pile suivant.

![Cadres de pile sans adaptateurs d'arguments.](/_img/adaptor-frame/no-adaptor-frames.svg)

Le cadre du callee possède une place supplémentaire contenant le nombre d'arguments pouvant être utilisés pour construire le paramètre rest ou l'objet arguments, et pour nettoyer les arguments dans la pile avant de revenir à l'appelant.

Pour revenir, nous modifions `LeaveInterpreterFrame` pour lire le nombre d'arguments dans la pile et retirer le maximum entre le nombre d'arguments et le nombre de paramètres fonctionnels.

## TurboFan

Qu'en est-il du code optimisé ? Modifions légèrement notre script initial pour forcer V8 à le compiler avec TurboFan :

```js
function add42(x) { return x + 42; }
function callAdd42() { add42(3); }
%PrepareFunctionForOptimization(callAdd42);
callAdd42();
%OptimizeFunctionOnNextCall(callAdd42);
callAdd42();
```

Ici, nous utilisons des intrinsèques de V8 pour forcer V8 à optimiser l'appel, sinon V8 n'optimiserait notre petite fonction que si elle devient chaude (très utilisée). Nous la faisons une fois avant optimisation pour recueillir des informations de type qui peuvent être utilisées pour guider la compilation. Lisez-en davantage sur TurboFan [ici](https://v8.dev/docs/turbofan).

Je ne vous montrerai ici que la partie du code généré qui nous est pertinente.

```nasm
movq rdi,0x1a8e082126ad    ;; Charge l'objet fonction <JSFunction add42>
push 0x6                   ;; Poussez SMI 3 comme argument
movq rcx,0x1a8e082030d1    ;; <Objet global JS>
push rcx                   ;; Poussez le récepteur (l'objet proxy global)
movl rax,0x1               ;; Enregistrez le nombre d'arguments dans rax
movl rcx,[rdi+0x17]        ;; Chargez le champ {Code} de l'objet fonction dans rcx
call rcx                   ;; Enfin, appelez l'objet code !
```

Bien qu'écrit en assembleur, ce fragment de code ne devrait pas être difficile à lire si vous suivez mes commentaires. Essentiellement, lors de la compilation de l'appel, TF doit effectuer tout le travail qui a été effectué dans les intégrés `InterpreterPushArgsThenCall`, `Call`, `CallFunction` et `InvokeFunctionCall`. Heureusement, il dispose de plus d'informations statiques pour faire cela et émettre moins d'instructions informatiques.

### TurboFan avec le cadre adaptateur d'arguments

Maintenant, voyons dans le cas d’un nombre non correspondant d’arguments et de paramètres formels. Considérez l’appel `add42(1, 2, 3)`. Cela est compilé en :

```nasm
movq rdi,0x4250820fff1    ;; Charge l'objet fonction <JSFunction add42>
;; Poussez le récepteur et les arguments SMIs 1, 2 et 3
movq rcx,0x42508080dd5    ;; <Objet global JS>
push rcx
push 0x2
push 0x4
push 0x6
movl rax,0x3              ;; Enregistrez le nombre d'arguments dans rax
movl rbx,0x1              ;; Enregistrez le nombre de paramètres formels dans rbx
movq r10,0x564ed7fdf840   ;; <ArgumentsAdaptorTrampoline>
call r10                  ;; Appelez le ArgumentsAdaptorTrampoline
```

Comme vous pouvez le voir, ce n’est pas difficile d’ajouter un support à TF pour les écarts entre le nombre d’arguments et les paramètres formels. Il suffit d’appeler le trampoline adaptateur d’arguments !

Cependant, cela est coûteux. Pour chaque appel optimisé, nous devons maintenant entrer dans le trampoline adaptateur d’arguments et retraiter le cadre comme dans le code non optimisé. Cela explique pourquoi le gain de performance de la suppression du cadre adaptateur dans le code optimisé est beaucoup plus important que dans Ignition.

Le code généré est cependant très simple. Et en revenir est extrêmement facile (épilogue):

```nasm
movq rsp,rbp   ;; Nettoyez le cadre du callee
pop rbp
ret 0x8        ;; Retirez un seul argument (le récepteur)
```

Nous supprimons notre cadre et émettons une instruction de retour selon le nombre de paramètres. Si nous avons un écart entre le nombre d’arguments et celui des paramètres, le trampoline adaptateur de cadre s’occupera de cela.

### TurboFan sans le cadre adaptateur d'arguments

Le code généré est essentiellement le même que dans un appel avec un nombre correspondant d’arguments. Considérez l’appel `add42(1, 2, 3)`. Cela génère :

```nasm
movq rdi,0x35ac082126ad    ;; Charge l'objet fonction <JSFunction add42>
;; Poussez le récepteur et les arguments 1, 2 et 3 (inversés)
push 0x6
push 0x4
push 0x2
movq rcx,0x35ac082030d1    ;; <Objet global JS>
push rcx
movl rax,0x3               ;; Enregistrez le nombre d'arguments dans rax
movl rcx,[rdi+0x17]        ;; Chargez le champ {Code} de l'objet fonction dans rcx
call rcx                   ;; Enfin, appelez l'objet code !
```

Et l’épilogue de la fonction ? Nous ne retournons plus au trampoline adaptateur d’arguments, donc l’épilogue est en fait un peu plus complexe qu’avant.

```nasm
movq rcx,[rbp-0x18]        ;; Chargez le nombre d'arguments (à partir du cadre du callee) dans rcx
movq rsp,rbp               ;; Supprimez le cadre du callee
pop rbp
cmpq rcx,0x0               ;; Comparez le nombre d'arguments avec le nombre de paramètres formels
jg 0x35ac000840c6  <+0x86>
;; Si le nombre d'arguments est inférieur (ou égal) au nombre de paramètres formels :
ret 0x8                    ;; Retournez comme d'habitude (le nombre de paramètres est statiquement connu)
;; Si nous avons plus d’arguments dans la pile que de paramètres formels :
pop r10                    ;; Enregistrez l'adresse de retour
leaq rsp,[rsp+rcx*8+0x8]   ;; Supprimez tous les arguments selon rcx
push r10                   ;; Récupérez l'adresse de retour
retl
```

# Conclusion
