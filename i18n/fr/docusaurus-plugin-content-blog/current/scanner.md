---
title: &apos;Un analyseur ultra-rapide, partie 1 : optimisation du scanneur&apos;
author: &apos;Toon Verwaest ([@tverwaes](https://twitter.com/tverwaes)), optimiseur scandaleux&apos;
avatars:
  - &apos;toon-verwaest&apos;
date: 2019-03-25 13:33:37
tags:
  - internes
  - analyse
tweet: &apos;1110205101652787200&apos;
description: &apos;La pierre angulaire des performances d’un analyseur est un scanneur rapide. Cet article explique comment le scanneur JavaScript de V8 est récemment devenu jusqu’à 2,1× plus rapide.&apos;
---
Pour exécuter un programme JavaScript, le texte source doit être traité pour que V8 puisse le comprendre. V8 commence par analyser la source en un arbre syntaxique abstrait (AST), un ensemble d’objets représentant la structure du programme. Cet AST est compilé en bytecode par Ignition. La performance de ces phases d’analyse et de compilation est importante : V8 ne peut pas exécuter de code avant la fin de la compilation. Dans cette série de billets de blog, nous nous concentrons sur l’analyse et le travail effectué dans V8 pour fournir un analyseur ultra-rapide.

<!--truncate-->
En fait, nous commençons la série une étape avant l’analyseur. L’analyseur de V8 consomme des « tokens » fournis par le « scanneur ». Les tokens sont des blocs d’un ou plusieurs caractères ayant une signification sémantique unique : une chaîne de caractères, un identifiant, un opérateur comme `++`. Le scanneur construit ces tokens en combinant des caractères consécutifs dans un flux de caractères sous-jacent.

Le scanneur consomme un flux de caractères Unicode. Ces caractères Unicode sont toujours décodés à partir d’un flux d’unités de code UTF-16. Une seule encodage est supporté pour éviter de devoir brancher ou spécialiser le scanneur et l’analyseur pour divers encodages, et nous avons choisi UTF-16 car c’est l’encodage des chaînes de caractères JavaScript, et les positions sources doivent être fournies par rapport à cet encodage. Le [`UTF16CharacterStream`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=46) fournit une vue UTF-16 (éventuellement mise en mémoire tampon) sur l’encodage sous-jacent Latin1, UTF-8 ou UTF-16 que V8 reçoit de Chrome, que Chrome reçoit à son tour du réseau. En plus de supporter plusieurs encodages, la séparation entre le scanneur et le flux de caractères permet à V8 d’analyser de manière transparente comme si la source entière était disponible, même si nous n’avons reçu qu’une partie des données sur le réseau jusqu’à présent.

![](/_img/scanner/overview.svg)

L’interface entre le scanneur et le flux de caractères est une méthode nommée [`Utf16CharacterStream::Advance()`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=54) qui renvoie soit la prochaine unité de code UTF-16, soit `-1` pour signaler la fin de l’entrée. L’UTF-16 ne peut pas encoder tous les caractères Unicode dans une seule unité de code. Les caractères situés en dehors du [Plan Multilingue de Base](https://en.wikipedia.org/wiki/Plane_(Unicode)#Basic_Multilingual_Plane) sont encodés sous forme de deux unités de code, également appelées paires de substitution. Cependant, le scanneur fonctionne sur les caractères Unicode au lieu des unités de code UTF-16, il enveloppe donc cette interface de flux de bas niveau dans une méthode [`Scanner::Advance()`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?sq=package:chromium&g=0&rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=569) qui décode les unités de code UTF-16 en caractères Unicode complets. Le caractère actuellement décodé est mis en mémoire tampon et récupéré par des méthodes de scan, telles que [`Scanner::ScanString()`](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=775).

Le scanneur [choisit](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=422) une méthode de scanneur spécifique ou un token en fonction d’un regard maximal de 4 caractères, la séquence de caractères ambiguë la plus longue en JavaScript[^1]. Une fois qu’une méthode comme `ScanString` est choisie, elle consomme le reste des caractères pour ce token, mettant en mémoire tampon le premier caractère qui ne fait pas partie du token pour le prochain token scanné. Dans le cas de `ScanString`, il copie également les caractères scannés dans un tampon encodé en Latin1 ou UTF-16, tout en décodant les séquences d’échappement.

[^1]: `<!--` est le début d’un commentaire HTML, tandis que `<!-` est scanné comme « moins que », « non », « moins ».

## Espaces blancs

Les tokens peuvent être séparés par différents types d'espaces, tels que les retours à la ligne, espaces, tabulations, commentaires sur une ligne, commentaires multi-lignes, etc. Un type d'espace peut être suivi par d'autres types d'espaces. Les espaces ajoutent du sens si cela provoque un saut de ligne entre deux tokens : cela peut entraîner une [insertion automatique de point-virgule](https://tc39.es/ecma262/#sec-automatic-semicolon-insertion). Avant de scanner le prochain token, tous les espaces sont ignorés tout en vérifiant si un retour à la ligne s'est produit. La plupart du code JavaScript utilisé en production est minimisé, et donc les espaces de plusieurs caractères ne sont heureusement pas très courants. Pour cette raison, V8 scanne uniformément chaque type d'espace indépendamment comme s'il s'agissait de tokens réguliers. Par exemple, si le premier caractère du token est `/` suivi d'un autre `/`, V8 scanne cela comme un commentaire sur une ligne qui retourne `Token::WHITESPACE`. Cette boucle continue simplement de scanner les tokens [jusqu'à ce que](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=671) nous trouvions un token autre que `Token::WHITESPACE`. Cela signifie que si le prochain token n'est pas précédé par un espace, nous commençons immédiatement à scanner le token pertinent sans avoir besoin de vérifier explicitement les espaces.

La boucle elle-même ajoute cependant un surcoût à chaque token scanné : elle nécessite une bifurcation pour vérifier le token que nous venons de scanner. Il serait préférable de continuer la boucle uniquement si le token que nous venons de scanner pourrait être un `Token::WHITESPACE`. Sinon, nous devrions simplement sortir de la boucle. Nous faisons cela en déplaçant la boucle elle-même dans une [méthode auxiliaire](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner-inl.h?rcl=d62ec0d84f2ec8bc0d56ed7b8ed28eaee53ca94e&l=178) de laquelle nous retournons immédiatement lorsque nous sommes certains que le token n'est pas `Token::WHITESPACE`. Même si ce genre de modification peut sembler très minime, elle supprime le surcoût pour chaque token scanné. Cela a particulièrement un impact pour des tokens très courts comme la ponctuation :

![](/_img/scanner/punctuation.svg)

## Scan des identifiants

Le token le plus complexe, mais aussi le plus courant, est le token [identifiant](https://tc39.es/ecma262/#prod-Identifier), qui est utilisé pour les noms de variables (entre autres) en JavaScript. Les identifiants commencent par un caractère Unicode avec la propriété [`ID_Start`](https://cs.chromium.org/chromium/src/v8/src/unicode.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=807), éventuellement suivi par une séquence de caractères avec la propriété [`ID_Continue`](https://cs.chromium.org/chromium/src/v8/src/unicode.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=947). Vérifier si un caractère Unicode possède la propriété `ID_Start` ou `ID_Continue` est assez coûteux. En insérant une table de correspondance entre les caractères et leurs propriétés, nous pouvons accélérer ce processus.

La plupart du code source JavaScript est cependant écrit en utilisant des caractères ASCII. Parmi les caractères de la plage ASCII, seuls `a-z`, `A-Z`, `$` et `_` sont des caractères de début d'identifiant. `ID_Continue` inclut également `0-9`. Nous accélérons le scan des identifiants en construisant une table avec des indicateurs pour chacun des 128 caractères ASCII indiquant si le caractère est un `ID_Start`, un `ID_Continue`, etc. Tant que les caractères que nous examinons se trouvent dans la plage ASCII, nous consultons les indicateurs respectifs dans cette table et vérifions une propriété avec une seule bifurcation. Les caractères font partie de l'identifiant jusqu'à ce que nous voyions le premier caractère qui n'a pas la propriété `ID_Continue`.

Toutes les améliorations mentionnées dans ce post aboutissent à la différence suivante dans les performances de scan des identifiants :

![](/_img/scanner/identifiers-1.svg)

Il peut sembler contre-intuitif que des identifiants plus longs soient scannés plus rapidement. Cela pourrait vous faire penser qu'il est avantageux pour les performances d'augmenter la longueur des identifiants. Scanner des identifiants plus longs est simplement plus rapide en termes de MB/s parce que nous restons plus longtemps dans une boucle très serrée sans revenir à l'analyseur. Ce qui vous importe du point de vue des performances de votre application, cependant, c'est la vitesse à laquelle nous pouvons scanner des tokens entiers. Le graphique suivant montre approximativement le nombre de tokens que nous scannons par seconde en fonction de la longueur du token :

![](/_img/scanner/identifiers-2.svg)

Il devient clair ici que l'utilisation d'identifiants plus courts est bénéfique pour les performances de l'analyse de votre application : nous sommes capables de scanner plus de tokens par seconde. Cela signifie que les sites que nous semblons analyser plus rapidement en MB/s ont simplement une densité d'information moindre et produisent en réalité moins de tokens par seconde.

## Internalisation des identifiants minimisés

Toutes les littérales de chaîne et les identifiants sont supprimés des doublons au niveau de la frontière entre le scanner et l'analyseur. Si l'analyseur demande la valeur d'une chaîne ou d'un identifiant, il reçoit un objet chaîne unique pour chaque valeur littérale possible. Cela nécessite généralement une recherche dans une table de hachage. Comme le code JavaScript est souvent minimisé, V8 utilise une table de recherche simple pour les chaînes ASCII d'un seul caractère.

## Mots-clés

Les mots-clés sont un sous-ensemble spécial des identifiants définis par le langage, par exemple, `if`, `else`, et `function`. Le scanner de V8 retourne des tokens différents pour les mots-clés et pour les identifiants. Après avoir scanné un identifiant, nous devons reconnaître si l'identifiant est un mot-clé. Comme tous les mots-clés en JavaScript ne contiennent que des caractères minuscules `a-z`, nous conservons également des indicateurs indiquant si les caractères ASCII sont possibles comme début ou continuation de mots-clés.

Si un identifiant peut être un mot-clé selon les indicateurs, nous pourrions trouver un sous-ensemble de candidats mots-clés en nous basant sur le premier caractère de l'identifiant. Il y a davantage de premiers caractères distincts que de longueurs de mots-clés, ce qui réduit le nombre de bifurcations suivantes. Pour chaque caractère, nous bifurquons en fonction des longueurs possibles de mots-clés et ne comparons l'identifiant au mot-clé que si la longueur correspond également.

Il est préférable d'utiliser une technique appelée [hachage parfait](https://en.wikipedia.org/wiki/Perfect_hash_function). Étant donné que la liste de mots-clés est statique, nous pouvons calculer une fonction de hachage parfaite qui, pour chaque identifiant, nous donne au maximum un mot-clé candidat. V8 utilise [gperf](https://www.gnu.org/software/gperf/) pour calculer cette fonction. Le [résultat](https://cs.chromium.org/chromium/src/v8/src/parsing/keywords-gen.h) calcule un hachage à partir de la longueur et des deux premiers caractères de l’identifiant pour trouver le mot-clé candidat unique. Nous ne comparons l'identifiant avec le mot-clé que si la longueur de ce mot-clé correspond à la longueur de l'identifiant en entrée. Cela accélère particulièrement le cas où un identifiant n'est pas un mot-clé, car nous avons besoin de moins de branches pour le déterminer.

![](/_img/scanner/keywords.svg)

## Paires de substituts

Comme mentionné précédemment, notre scanner fonctionne sur un flux de caractères encodé en UTF-16, mais consomme des caractères Unicode. Les caractères dans les plans supplémentaires ont seulement une signification spéciale pour les jetons d'identifiant. Par exemple, si de tels caractères apparaissent dans une chaîne, ils ne terminent pas cette chaîne. Les substituts isolés sont pris en charge par JS et sont simplement copiés depuis la source. Pour cette raison, il est préférable d'éviter de combiner des paires de substituts jusqu'à ce que cela soit absolument nécessaire et de laisser le scanner fonctionner directement sur les unités de code UTF-16 plutôt que sur les caractères Unicode. Lorsque nous scannons une chaîne, nous n'avons pas besoin de rechercher les paires de substituts, de les combiner, puis de les diviser à nouveau plus tard lorsque nous sauvegardons les caractères pour construire un littéral. Il ne reste que deux endroits où le scanner doit gérer les paires de substituts. Au début du scan de jeton, uniquement lorsque nous ne reconnaissons pas un caractère comme étant autre chose, nous devons [combiner](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner-inl.h?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=515) les paires de substituts pour vérifier si le résultat est un début d'identifiant. De même, nous devons [combiner](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=1003) les paires de substituts dans la voie lente du scan des identifiants traitant des caractères non-ASCII.

## `AdvanceUntil`

L'interface entre le scanner et le `UTF16CharacterStream` rend la frontière assez dépendante de l'état. Le flux garde une trace de sa position dans le tampon, qu'il incrémente après chaque unité de code consommée. Le scanner tamponne une unité de code reçue avant de revenir à la méthode de scan qui a demandé le caractère. Cette méthode lit le caractère tamponné et continue en fonction de sa valeur. Cela fournit une bonne stratification, mais est assez lent. L'automne dernier, notre stagiaire Florian Sattler a proposé une interface améliorée qui conserve les avantages de la stratification tout en offrant un accès beaucoup plus rapide aux unités de code dans le flux. Une fonction template [`AdvanceUntil`](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner.h?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=72), spécialisée pour un assistant de scan spécifique, appelle l'assistant pour chaque caractère dans le flux jusqu'à ce que l'assistant retourne false. Cela fournit essentiellement au scanner un accès direct aux données sous-jacentes sans casser les abstractions. Cela simplifie en fait les fonctions d'assistance de scan puisqu'elles n'ont pas besoin de gérer `EndOfInput`.

![](/_img/scanner/advanceuntil.svg)

`AdvanceUntil` est particulièrement utile pour accélérer les fonctions de scan qui peuvent nécessiter la consommation d'un grand nombre de caractères. Nous l'avons utilisé pour accélérer les identifiants déjà montrés précédemment, mais aussi les chaînes[^2] et les commentaires.

[^2]: Les chaînes et les identifiants qui ne peuvent pas être encodés en Latin1 sont actuellement plus coûteux car nous essayons d'abord de les tamponner en Latin1, puis de les convertir en UTF-16 une fois que nous rencontrons un caractère qui ne peut pas être encodé en Latin1.

## Conclusion

La performance du scan est la pierre angulaire de la performance de l'analyseur. Nous avons ajusté notre scanner pour le rendre aussi efficace que possible. Cela a entraîné des améliorations générales, augmentant les performances du scan d'un seul jeton d'environ 1,4×, du scan de chaînes de 1,3×, du scan de commentaires multilignes de 2,1× et du scan des identifiants de 1,2–1,5× selon la longueur de l'identifiant.

Cependant, notre scanner ne peut pas tout faire. En tant que développeur, vous pouvez encore améliorer les performances du parsing en augmentant la densité d'information de vos programmes. La manière la plus simple de le faire est de minimiser votre code source, en supprimant les espaces inutiles, et d'éviter les identifiants non-ASCII lorsque cela est possible. Idéalement, ces étapes sont automatisées dans le cadre d'un processus de construction, auquel cas vous n'avez pas à vous en préoccuper lorsque vous rédigez du code.
