---
title: "Manuel utilisateur V8 Torque"
description: 'Ce document explique le langage V8 Torque, tel qu'utilisé dans la base de code V8.'
---
V8 Torque est un langage qui permet aux développeurs contribuant au projet V8 d'exprimer des modifications dans la machine virtuelle (VM) en se concentrant sur _l'intention_ de leurs modifications, plutôt que sur des détails d'implémentation non pertinents. Le langage a été conçu pour être suffisamment simple afin de faciliter la traduction directe de la [spécification ECMAScript](https://tc39.es/ecma262/) en une implémentation dans V8, tout en étant suffisamment puissant pour exprimer de manière robuste les astuces d'optimisation de bas niveau de V8, telles que la création de chemins rapides basés sur des tests pour des formes d'objets spécifiques.

Torque sera familier aux ingénieurs V8 et aux développeurs JavaScript, combinant une syntaxe de type TypeScript qui facilite à la fois l'écriture et la compréhension du code V8 avec une syntaxe et des types qui reflètent des concepts déjà courants dans le [`CodeStubAssembler`](/blog/csa). Avec un système de types fort et un contrôle de flux structuré, Torque garantit la correction par conception. L'expressivité de Torque est suffisante pour exprimer presque toute la fonctionnalité [actuellement trouvée dans les fonctions intégrées de V8](/docs/builtin-functions). Il est également très interopérable avec les fonctions intégrées et les `macro`s du `CodeStubAssembler` écrites en C++, permettant au code Torque d'utiliser les fonctionnalités CSA écrites à la main et vice versa.

Torque fournit des constructions linguistiques pour représenter des éléments riches en sémantique de l'implémentation de V8, et le compilateur Torque convertit ces éléments en code assembleur efficace en utilisant le `CodeStubAssembler`. La structure du langage Torque et la vérification des erreurs du compilateur Torque garantissent la correction de manière qui était précédemment laborieuse et sujette aux erreurs avec l'utilisation directe du `CodeStubAssembler`. Traditionnellement, écrire du code optimal avec le `CodeStubAssembler` exigeait que les ingénieurs V8 aient beaucoup de connaissances spécialisées en tête, dont une grande partie n'était jamais formellement capturée dans une documentation écrite, pour éviter des pièges subtils dans leur implémentation. Sans cette connaissance, la courbe d'apprentissage pour écrire des fonctions intégrées efficaces était abrupte. Même avec les connaissances nécessaires, des pièges non évidents et non surveillés conduisaient souvent à des problèmes de correction ou de [sécurité](https://bugs.chromium.org/p/chromium/issues/detail?id=775888) [bugs](https://bugs.chromium.org/p/chromium/issues/detail?id=785804). Avec Torque, beaucoup de ces pièges peuvent être évités et reconnus automatiquement par le compilateur Torque.

## Première approche

La plupart des sources écrites en Torque sont incluses dans le référentiel V8 sous [le répertoire `src/builtins`](https://github.com/v8/v8/tree/master/src/builtins), avec l'extension de fichier `.tq`. Les définitions Torque des classes allouées sur le tas de V8 se trouvent aux côtés de leurs définitions en C++, dans des fichiers `.tq` portant le même nom que les fichiers C++ correspondants dans `src/objects`. Le véritable compilateur Torque peut être trouvé sous [`src/torque`](https://github.com/v8/v8/tree/master/src/torque). Les tests de fonctionnalité Torque sont inclus sous [`test/torque`](https://github.com/v8/v8/tree/master/test/torque), [`test/cctest/torque`](https://github.com/v8/v8/tree/master/test/cctest/torque), et [`test/unittests/torque`](https://github.com/v8/v8/tree/master/test/unittests/torque).

Pour vous donner un aperçu du langage, écrivons une fonction intégrée V8 qui imprime “Hello World!”. Pour ce faire, nous ajouterons un `macro` Torque dans un cas de test et l'appellerons depuis le framework de test `cctest`.

Commencez par ouvrir le fichier `test/torque/test-torque.tq` et ajoutez le code suivant à la fin (mais avant la dernière accolade fermante `}`) :

```torque
@export
macro PrintHelloWorld(): void {
  Print('Hello world!');
}
```

Ensuite, ouvrez `test/cctest/torque/test-torque.cc` et ajoutez le cas de test suivant qui utilise le nouveau code Torque pour construire un stub de code :

```cpp
TEST(HelloWorld) {
  Isolate* isolate(CcTest::InitIsolateOnce());
  CodeAssemblerTester asm_tester(isolate, JSParameterCount(0));
  TestTorqueAssembler m(asm_tester.state());
  {
    m.PrintHelloWorld();
    m.Return(m.UndefinedConstant());
  }
  FunctionTester ft(asm_tester.GenerateCode(), 0);
  ft.Call();
}
```

Ensuite, [compilez l'exécutable `cctest`](/docs/test), et enfin exécutez le test `cctest` pour imprimer ‘Hello world’ :

```bash
$ out/x64.debug/cctest test-torque/HelloWorld
Hello world!
```

## Comment Torque génère du code

Le compilateur Torque ne crée pas directement du code machine, mais génère plutôt du code C++ qui appelle l'interface existante `CodeStubAssembler` de V8. Le `CodeStubAssembler` utilise le backend du [compilateur TurboFan](https://v8.dev/docs/turbofan) pour générer du code efficace. La compilation Torque nécessite donc plusieurs étapes :

1. La construction `gn` exécute d'abord le compilateur Torque. Il traite tous les fichiers `*.tq`. Chaque fichier Torque `path/to/file.tq` entraîne la génération des fichiers suivants :
    - `path/to/file-tq-csa.cc` et `path/to/file-tq-csa.h` contenant des macros CSA générées.
    - `path/to/file-tq.inc` à inclure dans un en-tête correspondant `path/to/file.h` contenant des définitions de classe.
    - `path/to/file-tq-inl.inc` à inclure dans l'en-tête inline correspondant `path/to/file-inl.h`, contenant des accesseurs C++ des définitions de classe.
    - `path/to/file-tq.cc` contenant des vérificateurs de tas générés, des imprimantes, etc.

    Le compilateur Torque génère également divers autres fichiers `.h` connus, destinés à être utilisés par la construction V8.
1. La construction `gn` compile ensuite les fichiers générés `-csa.cc` de l'étape 1 dans l'exécutable `mksnapshot`.
1. Lorsque `mksnapshot` s'exécute, tous les builtins de V8 sont générés et emballés dans le fichier snapshot, y compris ceux qui sont définis dans Torque et tous les autres builtins qui utilisent des fonctionnalités définies par Torque.
1. Le reste de V8 est construit. Tous les builtins conçus avec Torque sont rendus accessibles via le fichier snapshot qui est lié à V8. Ils peuvent être appelés comme tout autre builtin. En outre, l'exécutable `d8` ou `chrome` inclut également directement les unités de compilation générées liées aux définitions de classe.

Graphiquement, le processus de construction ressemble à ceci :

<figure>
  <img src="/_img/docs/torque/build-process.svg" width="800" height="480" alt="" loading="lazy"/>
</figure>

## Outils Torque

Un ensemble d'outils de base et un environnement de développement sont disponibles pour Torque.

- Il existe un [plugin Visual Studio Code](https://github.com/v8/vscode-torque) pour Torque, qui utilise un serveur de langage personnalisé pour fournir des fonctionnalités comme aller à la définition.
- Il existe également un outil de formatage qui doit être utilisé après avoir modifié les fichiers `.tq` : `tools/torque/format-torque.py -i <filename>`

## Dépannage des constructions impliquant Torque

Pourquoi devez-vous savoir cela ? Comprendre comment les fichiers Torque sont convertis en code machine est important car différents problèmes (et bugs) peuvent potentiellement survenir dans les différentes étapes de la traduction de Torque en bits binaires intégrés dans le snapshot :

- Si vous avez une erreur de syntaxe ou sémantique dans le code Torque (c'est-à-dire un fichier `.tq`), le compilateur Torque échoue. La construction V8 est interrompue à ce stade, et vous ne verrez pas d'autres erreurs qui pourraient être découvertes par les étapes ultérieures de la construction.
- Une fois que votre code Torque est syntaxiquement correct et passe les vérifications sémantiques (plus ou moins) rigoureuses du compilateur Torque, la construction de `mksnapshot` peut toujours échouer. Cela se produit le plus fréquemment avec les incohérences dans les définitions externes fournies dans les fichiers `.tq`. Les définitions marquées avec le mot clé `extern` en code Torque indiquent au compilateur Torque que la définition de la fonctionnalité requise se trouve en C++. Actuellement, le couplage entre les définitions `extern` des fichiers `.tq` et le code C++ auquel ces définitions `extern` se réfèrent est lâche, et il n'y a aucune vérification de ce couplage au moment de la compilation Torque. Lorsque les définitions `extern` ne correspondent pas (ou, dans les cas les plus subtils, masquent) la fonctionnalité qu'elles accèdent dans le fichier d'en-tête `code-stub-assembler.h` ou d'autres en-têtes V8, la construction C++ de `mksnapshot` échoue.
- Même une fois que `mksnapshot` est construit avec succès, il peut échouer lors de l'exécution. Cela peut arriver par exemple parce que Turbofan échoue à compiler le code CSA généré, par exemple parce qu'un `static_assert` Torque ne peut pas être vérifié par Turbofan. De plus, un builtin fourni par Torque qui est exécuté pendant la création du snapshot pourrait contenir un bug. Par exemple, `Array.prototype.splice`, un builtin conçu avec Torque, est appelé dans le cadre du processus d'initialisation de snapshot JavaScript pour configurer l'environnement JavaScript par défaut. S'il y a un bug dans l'implémentation, `mksnapshot` plante pendant l'exécution. Lorsque `mksnapshot` plante, il est parfois utile d'appeler `mksnapshot` en passant le paramètre `--gdb-jit-full`, ce qui génère des informations de débogage supplémentaires fournissant un contexte utile, par exemple des noms pour les builtins générés par Torque dans les crawlers de pile `gdb`.
- Bien sûr, même si le code conçu avec Torque passe à travers `mksnapshot`, il peut toujours être bogué ou se planter. Ajouter des cas de test à `torque-test.tq` et `torque-test.cc` est un bon moyen de garantir que votre code Torque fait ce que vous attendez réellement. Si votre code Torque finit par planter dans `d8` ou `chrome`, le drapeau `--gdb-jit-full` est à nouveau très utile.

## `constexpr`: au moment de la compilation vs. au moment de l'exécution

Comprendre le processus de construction de Torque est également important pour comprendre une fonctionnalité centrale du langage Torque : `constexpr`.

Torque permet l'évaluation d'expressions dans le code Torque au moment de l'exécution (c'est-à-dire lorsque les builtins de V8 sont exécutés dans le cadre de l'exécution de JavaScript). Cependant, il permet également que les expressions soient exécutées au moment de la compilation (c'est-à-dire dans le cadre du processus de construction Torque et avant que la bibliothèque V8 et l'exécutable `d8` soient même créés).

Torque utilise le mot-clé `constexpr` pour indiquer qu'une expression doit être évaluée au moment de la compilation. Son utilisation est quelque peu analogue à celle de [`constexpr` en C++](https://en.cppreference.com/w/cpp/language/constexpr) : en plus d'emprunter le mot-clé `constexpr` et une partie de sa syntaxe au C++, Torque utilise de manière similaire `constexpr` pour indiquer la distinction entre l'évaluation au moment de la compilation et celle au moment de l'exécution.

Cependant, il existe quelques différences subtiles dans la sémantique de `constexpr` en Torque. En C++, les expressions `constexpr` peuvent être entièrement évaluées par le compilateur C++. En Torque, les expressions `constexpr` ne peuvent pas être entièrement évaluées par le compilateur Torque, mais elles se mappent sur les types, variables et expressions C++ qui peuvent (et doivent) être entièrement évalués lors de l'exécution de `mksnapshot`. Du point de vue du rédacteur Torque, les expressions `constexpr` ne génèrent pas de code exécuté au moment de l'exécution. En ce sens, elles appartiennent au moment de la compilation, même si elles sont techniquement évaluées par du code C++ externe à Torque que `mksnapshot` exécute. Ainsi, en Torque, `constexpr` signifie essentiellement « au moment de `mksnapshot` », pas « au moment de la compilation ».

En combinaison avec les généricités, `constexpr` est un outil puissant de Torque qui peut être utilisé pour automatiser la génération de plusieurs primitives très efficaces spécialisées qui diffèrent les unes des autres par un petit nombre de détails spécifiques que les développeurs de V8 peuvent anticiper à l'avance.

## Fichiers

Le code Torque est empaqueté dans des fichiers sources individuels. Chaque fichier source se compose d'une série de déclarations, qui elles-mêmes peuvent être optionnellement enveloppées dans une déclaration de namespace pour séparer les espaces de noms des déclarations. La description suivante de la grammaire est probablement obsolète. La source de vérité est [la définition de grammaire dans le compilateur Torque](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::TorqueGrammar), qui est écrite en utilisant des règles de grammaire non contextuelles.

Un fichier Torque est une séquence de déclarations. Les déclarations possibles sont listées [dans `torque-parser.cc`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::declaration).

## Espaces de noms

Les espaces de noms Torque permettent que les déclarations soient dans des espaces de noms indépendants. Ils sont similaires aux espaces de noms en C++. Ils permettent de créer des déclarations qui ne sont pas automatiquement visibles dans d'autres espaces de noms. Ils peuvent être imbriqués, et les déclarations à l'intérieur d'un espace de noms imbriqué peuvent accéder aux déclarations dans l'espace de noms qui les contient sans qualification. Les déclarations qui ne sont pas explicitement dans une déclaration de namespace sont placées dans un espace de noms global par défaut partagé qui est visible par tous les espaces de noms. Les espaces de noms peuvent être réouverts, ce qui leur permet d'être définis sur plusieurs fichiers.

Par exemple :

```torque
macro IsJSObject(o: Object): bool { … }  // Dans l'espace de noms par défaut

namespace array {
  macro IsJSArray(o: Object): bool { … }  // Dans l'espace de noms array
};

namespace string {
  // …
  macro TestVisibility() {
    IsJsObject(o); // OK, l'espace de noms global est visible ici
    IsJSArray(o);  // ERREUR, pas visible dans cet espace de noms
    array::IsJSArray(o);  // OK, qualification explicite de l'espace de noms
  }
  // …
};

namespace array {
  // OK, l'espace de noms a été réouvert.
  macro EnsureWriteableFastElements(array: JSArray){ … }
};
```

## Déclarations

### Types

Torque est fortement typé. Son système de types est la base de nombreuses garanties de sécurité et de précision qu'il fournit.

Pour de nombreux types de base, Torque ne connaît en fait pas grand-chose à leur sujet. Au lieu de cela, de nombreux types sont simplement faiblement couplés au `CodeStubAssembler` et aux types C++ par le biais de correspondances explicites de types et comptent sur le compilateur C++ pour y appliquer la rigueur. Ces types sont réalisés sous forme de types abstraits.

#### Types abstraits

Les types abstraits de Torque correspondent directement aux valeurs du temps de compilation en C++ et du temps d'exécution de CodeStubAssembler. Leurs déclarations spécifient un nom et une relation avec les types C++ :

```grammar
AbstractTypeDeclaration :
  type IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt ConstexprDeclaration opt

ExtendsDeclaration :
  extends IdentifierName ;

GeneratesDeclaration :
  generates StringLiteral ;

ConstexprDeclaration :
  constexpr StringLiteral ;
```

`IdentifierName` spécifie le nom du type abstrait, et `ExtendsDeclaration` spécifie éventuellement le type dont dérive le type déclaré. `GeneratesDeclaration` spécifie éventuellement une chaîne littérale qui correspond au type C++ `TNode` utilisé dans le code de `CodeStubAssembler` pour contenir une valeur d'exécution de son type. `ConstexprDeclaration` est une chaîne littérale spécifiant le type C++ correspondant à la version `constexpr` du type Torque pour l'évaluation au moment de la compilation (`mksnapshot`).

Voici un exemple tiré de `base.tq` pour les types d'entiers signés 31 et 32 bits de Torque :

```torque
type int32 generates 'TNode<Int32T>' constexpr 'int32_t';
type int31 extends int32 generates 'TNode<Int32T>' constexpr 'int31_t';
```

#### Types union

Les types union expriment qu'une valeur appartient à l'un des plusieurs types possibles. Nous autorisons seulement les types union pour les valeurs mappées, car elles peuvent être distinguées au moment de l'exécution à l'aide du pointeur de map. Par exemple, les nombres JavaScript sont soit des valeurs Smi, soit des objets `HeapNumber` allocés.

```torque
type Number = Smi | HeapNumber;
```

Les types union satisfont les égalités suivantes :

- `A | B = B | A`
- `A | (B | C) = (A | B) | C`
- `A | B = A` si `B` est un sous-type de `A`

Il n'est permis de former des types union qu'à partir de types étiquetés, car les types non étiquetés ne peuvent être distingués à l'exécution.

Lors du mappage des types union vers CSA, le supertype commun le plus spécifique de tous les types du type union est sélectionné, à l'exception de `Number` et `Numeric`, qui sont mappés aux types union correspondants de CSA.

#### Types de classes

Les types de classes permettent de définir, allouer et manipuler des objets structurés sur le tas GC de V8 à partir du code Torque. Chaque type de classe Torque doit correspondre à une sous-classe de HeapObject dans le code C++. Afin de minimiser le coût de maintien du code d'accès aux objets entre l'implémentation C++ et Torque de V8, les définitions de classes Torque sont utilisées pour générer le code C++ requis pour l'accès aux objets chaque fois que possible (et approprié), afin de réduire les difficultés de synchronisation manuelle entre C++ et Torque.

```grammar
ClassDeclaration :
  ClassAnnotation* extern opt transient opt class IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt {
    ClassMethodDeclaration*
    ClassFieldDeclaration*
  }

ClassAnnotation :
  @doNotGenerateCppClass
  @generateBodyDescriptor
  @generatePrint
  @abstract
  @export
  @noVerifier
  @hasSameInstanceTypeAsParent
  @highestInstanceTypeWithinParentClassRange
  @lowestInstanceTypeWithinParentClassRange
  @reserveBitsInInstanceType ( NumericLiteral )
  @apiExposedInstanceTypeValue ( NumericLiteral )

ClassMethodDeclaration :
  transitioning opt IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock

ClassFieldDeclaration :
  ClassFieldAnnotation* weak opt const opt FieldDeclaration;

ClassFieldAnnotation :
  @noVerifier
  @if ( Identifier )
  @ifnot ( Identifier )

FieldDeclaration :
  Identifier ArraySpecifier opt : Type ;

ArraySpecifier :
  [ Expression ]
```

Un exemple de classe :

```torque
extern class JSProxy extends JSReceiver {
  target: JSReceiver|Null;
  handler: JSReceiver|Null;
}
```

`extern` signifie que cette classe est définie en C++, plutôt que définie uniquement en Torque.

Les déclarations de champs dans les classes génèrent implicitement des accesseurs et modificateurs de champs qui peuvent être utilisés depuis CodeStubAssembler, par exemple :

```cpp
// Dans TorqueGeneratedExportedMacrosAssembler :
TNode<HeapObject> LoadJSProxyTarget(TNode<JSProxy> p_o);
void StoreJSProxyTarget(TNode<JSProxy> p_o, TNode<HeapObject> p_v);
```

Comme décrit ci-dessus, les champs définis dans les classes Torque génèrent un code C++ qui supprime la nécessité d'accessoires dupliqués et de code visiteur de tas. La définition manuelle de JSProxy doit hériter d'un modèle de classe généré, comme ceci :

```cpp
// Dans js-proxy.h :
class JSProxy : public TorqueGeneratedJSProxy<JSProxy, JSReceiver> {

  // Tout ce dont la classe a besoin au-delà des éléments générés par Torque va ici...

  // À la fin, car cela interfère avec public/privé :
  TQ_OBJECT_CONSTRUCTORS(JSProxy)
}

// Dans js-proxy-inl.h :
TQ_OBJECT_CONSTRUCTORS_IMPL(JSProxy)
```

La classe générée fournit des fonctions de conversion, des fonctions d'accès aux champs et des constantes de décalage de champ (par exemple `kTargetOffset` et `kHandlerOffset` dans ce cas) représentant le décalage en octets de chaque champ à partir du début de la classe.

##### Annotations de types de classe

Certaines classes ne peuvent pas utiliser le modèle d'héritage montré dans l'exemple ci-dessus. Dans ces cas, la classe peut spécifier `@doNotGenerateCppClass`, hériter directement du type de sa superclasse et inclure une macro générée par Torque pour ses constantes de décalage de champ. Ces classes doivent implémenter leurs propres fonctions d'accès et de conversion. L'utilisation de cette macro ressemble à ceci :

```cpp
class JSProxy : public JSReceiver {
 public:
  DEFINE_FIELD_OFFSET_CONSTANTS(
      JSReceiver::kHeaderSize, TORQUE_GENERATED_JS_PROXY_FIELDS)
  // Le reste de la classe est omis...
}
```

`@generateBodyDescriptor` entraîne Torque à émettre un `BodyDescriptor` de classe au sein de la classe générée, qui représente comment le ramasse-miettes doit visiter l'objet. Sinon, le code C++ doit soit définir sa propre visite d'objet, soit utiliser l'un des modèles existants (par exemple, hériter de `Struct` et inclure la classe dans `STRUCT_LIST` signifie que la classe est censée contenir uniquement des valeurs étiquetées).

Si l'annotation `@generatePrint` est ajoutée, alors le générateur implémentera une fonction C++ qui imprime les valeurs des champs telles que définies par la disposition Torque. En utilisant l'exemple JSProxy, la signature serait `void TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyPrint(std::ostream& os)`, qui peut être héritée par `JSProxy`.

Le compilateur Torque génère également du code de vérification pour toutes les classes `extern`, sauf si la classe choisit de ne pas le faire avec l'annotation `@noVerifier`. Par exemple, la définition de classe JSProxy ci-dessus générera une méthode C++ `void TorqueGeneratedClassVerifiers::JSProxyVerify(JSProxy o, Isolate* isolate)` qui vérifie que ses champs sont valides selon la définition de type Torque. Elle générera également une fonction correspondante dans la classe générée, `TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyVerify`, qui appelle la fonction statique de `TorqueGeneratedClassVerifiers`. Si vous souhaitez ajouter une vérification supplémentaire pour une classe (comme une plage de valeurs acceptables pour un nombre, ou une exigence selon laquelle le champ `foo` est vrai si le champ `bar` n'est pas nul, etc.), ajoutez un `DECL_VERIFIER(JSProxy)` à la classe C++ (qui masque l'héritage de `JSProxyVerify`) et implémentez-le dans `src/objects-debug.cc`. La première étape de tout vérificateur personnalisé doit être d'appeler le vérificateur généré, comme `TorqueGeneratedClassVerifiers::JSProxyVerify(*this, isolate);`. (Pour exécuter ces vérificateurs avant et après chaque GC, construisez avec `v8_enable_verify_heap = true` et exécutez avec `--verify-heap`.)

`@abstract` indique que la classe elle-même n'est pas instanciée et n'a pas son propre type d'instance : les types d'instance qui appartiennent logiquement à la classe sont les types d'instance des classes dérivées.

L'annotation `@export` fait que le compilateur Torque génère une classe C++ concrète (comme `JSProxy` dans l'exemple ci-dessus). Cela est évidemment utile uniquement si vous ne souhaitez pas ajouter de fonctionnalité C++ au-delà de ce qui est fourni par le code généré par Torque. Ne peut pas être utilisé conjointement avec `extern`. Pour une classe définie et utilisée uniquement dans Torque, il est le plus approprié de ne pas utiliser `extern` ni `@export`.

`@hasSameInstanceTypeAsParent` indique des classes qui ont les mêmes types d'instance que leur classe parent, mais qui renomment certains champs ou peuvent avoir une carte différente. Dans de tels cas, la classe parent n'est pas abstraite.

Les annotations `@highestInstanceTypeWithinParentClassRange`, `@lowestInstanceTypeWithinParentClassRange`, `@reserveBitsInInstanceType`, et `@apiExposedInstanceTypeValue` affectent toutes la génération des types d'instance. En général, vous pouvez les ignorer et tout ira bien. Torque est responsable d'assigner une valeur unique dans l'énumération `v8::internal::InstanceType` pour chaque classe afin que V8 puisse déterminer à l'exécution le type de tout objet dans le tas JS. L'assignation des types d'instance par Torque devrait être adéquate dans la grande majorité des cas, mais il existe quelques cas où nous voulons qu'un type d'instance pour une classe particulière soit stable entre les constructions, ou soit au début ou à la fin de la plage de types d'instance attribués à sa superclasse, ou qu'il soit une plage de valeurs réservées pouvant être définies en dehors de Torque.

##### Champs de classe

En plus des valeurs simples, comme dans l'exemple ci-dessus, les champs de classe peuvent contenir des données indexées. Voici un exemple :

```torque
extern class CoverageInfo extends HeapObject {
  const slot_count: int32;
  slots[slot_count]: CoverageInfoSlot;
}
```

Cela signifie que les instances de `CoverageInfo` sont de tailles variables en fonction des données dans `slot_count`.

Contrairement à C++, Torque n'ajoutera pas implicitement d'espaces entre les champs ; à la place, il échouera et émettra une erreur si les champs ne sont pas correctement alignés. Torque exige également que les champs forts, les champs faibles et les champs scalaires soient regroupés avec d'autres champs de la même catégorie dans l'ordre des champs.

`const` signifie qu'un champ ne peut pas être modifié au moment de l'exécution (ou du moins pas facilement ; Torque échouera à la compilation si vous tentez de le modifier). C'est une bonne pratique pour les champs de longueur, qui ne devraient être réinitialisés qu'avec une grande prudence, car cela nécessiterait de libérer tout espace libéré et pourrait provoquer des courses de données avec un thread de marquage.
En fait, Torque exige que les champs de longueur utilisés pour les données indexées soient `const`.

`weak` au début d'une déclaration de champ signifie que le champ est une référence faible personnalisée, contrairement au mécanisme de marquage `MaybeObject` pour les champs faibles.
De plus, `weak` affecte la génération de constantes telles que `kEndOfStrongFieldsOffset` et `kStartOfWeakFieldsOffset`, qui est une fonctionnalité héritée utilisée dans certains `BodyDescriptor` personnalisés et qui nécessite actuellement encore de regrouper les champs marqués comme `weak` ensemble. Nous espérons supprimer ce mot-clé une fois que Torque sera entièrement capable de générer tous les `BodyDescriptor`.

Si l'objet stocké dans un champ peut être une référence faible de style `MaybeObject` (avec le deuxième bit défini), alors `Weak<T>` devrait être utilisé dans le type et le mot-clé `weak` ne devrait **pas** être utilisé. Il y a encore quelques exceptions à cette règle, comme ce champ de `Map`, qui peut contenir certains types forts et faibles, et est également marqué comme `weak` pour inclusion dans la section faible :

```torque
  weak transitions_or_prototype_info: Map|Weak<Map>|TransitionArray|
      PrototypeInfo|Smi;
```

`@if` et `@ifnot` marquent les champs qui doivent être inclus dans certaines configurations de construction mais pas dans d'autres. Ils acceptent des valeurs de la liste dans `BuildFlags`, dans `src/torque/torque-parser.cc`.

##### Classes entièrement définies en dehors de Torque

Certaines classes ne sont pas définies dans Torque, mais Torque doit connaître chaque classe car il est responsable de l'attribution des types d'instance. Pour ce cas, les classes peuvent être déclarées sans corps, et Torque ne générera rien pour elles sauf le type d'instance. Exemple :

```torque
extern class OrderedHashMap extends HashTable;
```

#### Shapes

La définition d'une `shape` ressemble à la définition d'une `class` sauf qu'elle utilise le mot-clé `shape` au lieu de `class`. Une `shape` est un sous-type de `JSObject` représentant une organisation ponctuelle des propriétés en objet (dans le langage de spécification, il s'agit de "propriétés de données" plutôt que de "emplacements internes"). Une `shape` n'a pas son propre type d'instance. Un objet avec une forme particulière peut changer et perdre cette forme à tout moment car l'objet pourrait passer en mode dictionnaire et déplacer toutes ses propriétés dans un stockage secondaire distinct.

#### Structs

`struct`s sont des collections de données qui peuvent être facilement manipulées ensemble. (Totalement sans rapport avec la classe nommée `Struct`.) Comme les classes, elles peuvent inclure des macros qui opèrent sur les données. Contrairement aux classes, elles supportent également les génériques. La syntaxe est similaire à celle d'une classe :

```torque
@export
struct PromiseResolvingFunctions {
  resolve: JSFunction;
  reject: JSFunction;
}

struct ConstantIterator<T: type> {
  macro Empty(): bool {
    return false;
  }
  macro Next(): T labels _NoMore {
    return this.value;
  }

  value: T;
}
```

##### Annotations des Structs

Tout struct marqué comme `@export` sera inclus avec un nom prévisible dans le fichier généré `gen/torque-generated/csa-types.h`. Le nom est préfixé par `TorqueStruct`, donc `PromiseResolvingFunctions` devient `TorqueStructPromiseResolvingFunctions`.

Les champs d'un struct peuvent être marqués comme `const`, ce qui signifie qu'ils ne doivent pas être modifiés. Le struct entier peut néanmoins toujours être réécrit.

##### Structs en tant que champs de classe

Un struct peut être utilisé comme le type d'un champ de classe. Dans ce cas, il représente des données ordonnées et compactes au sein de la classe (sinon, les structs n'ont pas d'exigences d'alignement). Cela est particulièrement utile pour les champs indexés dans les classes. Par exemple, `DescriptorArray` contient un tableau de structs à trois valeurs :

```torque
struct DescriptorEntry {
  key: Name|Undefined;
  details: Smi|Undefined;
  value: JSAny|Weak<Map>|AccessorInfo|AccessorPair|ClassPositions;
}

extern class DescriptorArray extends HeapObject {
  const number_of_all_descriptors: uint16;
  number_of_descriptors: uint16;
  raw_number_of_marked_descriptors: uint16;
  filler16_bits: uint16;
  enum_cache: EnumCache;
  descriptors[number_of_all_descriptors]: DescriptorEntry;
}
```

##### Références et Slices

`Reference<T>` et `Slice<T>` sont des structs spéciaux représentant des pointeurs vers des données détenues dans des objets du tas. Ils contiennent tous les deux un objet et un décalage ; `Slice<T>` contient également une longueur. Au lieu de construire ces structs directement, vous pouvez utiliser une syntaxe spéciale : `&o.x` créera une `Reference` vers le champ `x` dans l'objet `o`, ou un `Slice` pour les données si `x` est un champ indexé. Pour les références et les slices, il existe des versions constantes et mutables. Pour les références, ces types s'écrivent `&T` et `const &T` pour les références mutables et constantes, respectivement. La mutabilité se réfère aux données qu'ils pointent et peut ne pas s'appliquer globalement, c'est-à-dire que vous pouvez créer des références constantes à des données mutables. Pour les slices, il n'y a pas de syntaxe spéciale pour les types et les deux versions s'écrivent `ConstSlice<T>` et `MutableSlice<T>`. Les références peuvent être déréférencées avec `*` ou `->`, conformément à C++.

Les références et slices vers des données non étiquetées peuvent également pointer vers des données hors tas.

#### Structs de champs de bits

Un `bitfield struct` représente une collection de données numériques compactée en une seule valeur numérique. Sa syntaxe est similaire à un `struct` normal, avec l'ajout du nombre de bits pour chaque champ.

```torque
bitfield struct DebuggerHints extends uint31 {
  side_effect_state: int32: 2 bit;
  debug_is_blackboxed: bool: 1 bit;
  computed_debug_is_blackboxed: bool: 1 bit;
  debugging_id: int32: 20 bit;
}
```

Si un struct de type bitfield (ou toute autre donnée numérique) est stocké dans un Smi, il peut être représenté en utilisant le type `SmiTagged<T>`.

#### Types de pointeur de fonction

Les pointeurs de fonction ne peuvent pointer que vers des builtins définis en Torque, car cela garantit l'ABI par défaut. Ils sont particulièrement utiles pour réduire la taille du code binaire.

Bien que les types de pointeur de fonction soient anonymes (comme en C), ils peuvent être liés à un alias de type (comme un `typedef` en C).

```torque
type CompareBuiltinFn = builtin(implicit context: Context)(Object, Object, Object) => Number;
```

#### Types spéciaux

Il existe deux types spéciaux indiqués par les mots-clés `void` et `never`. `void` est utilisé comme type de retour pour les appelables qui ne renvoient pas de valeur, et `never` est utilisé comme type de retour pour les appelables qui ne retournent jamais réellement (c’est-à-dire qui ne sortent que par des chemins exceptionnels).

#### Types transitoires

Dans V8, les objets du tas peuvent changer de disposition à l'exécution. Pour exprimer des dispositions d'objet sujettes à un changement ou d'autres hypothèses temporaires dans le système de types, Torque prend en charge le concept de “type transitoire”. Lors de la déclaration d'un type abstrait, l'ajout du mot clé `transient` le marque comme un type transitoire.

```torque
// Un HeapObject avec une map JSArray, et soit des éléments rapides compactés,
// soit des éléments rapides troués lorsque le NoElementsProtector global n'est pas invalidé.
transient type FastJSArray extends JSArray
    generates 'TNode<JSArray>';
```

Par exemple, dans le cas de `FastJSArray`, le type transitoire est invalidé si le tableau passe à des éléments de dictionnaire ou si le `NoElementsProtector` global est invalidé. Pour exprimer cela en Torque, annotez tous les appelables qui pourraient potentiellement le faire comme `transitioning`. Par exemple, appeler une fonction JavaScript peut exécuter un JavaScript arbitraire, donc c'est `transitioning`.

```torque
extern transitioning macro Call(implicit context: Context)
                               (Callable, Object): Object;
```

La manière dont cela est contrôlé dans le système de types est qu'il est illégal d'accéder à une valeur d'un type transitoire lors d'une opération de transition.

```torque
const fastArray : FastJSArray = Cast<FastJSArray>(array) otherwise Bailout;
Call(f, Undefined);
return fastArray; // Erreur de type : fastArray est invalide ici.
```

#### Énumérations

Les énumérations permettent de définir un ensemble de constantes et de les regrouper sous un nom similaire aux classes d'énumérations en C++. Une déclaration est introduite par le mot-clé `enum` et suit la structure syntaxique suivante :

```grammar
EnumDeclaration :
  extern enum IdentifierName ExtendsDeclaration opt ConstexprDeclaration opt { IdentifierName list+ (, ...) opt }
```

Un exemple basique ressemble à ceci :

```torque
extern enum LanguageMode extends Smi {
  kStrict,
  kSloppy
}
```

Cette déclaration définit un nouveau type `LanguageMode`, où la clause `extends` spécifie le type sous-jacent, c'est-à-dire le type utilisé à l'exécution pour représenter une valeur de l'énumération. Dans cet exemple, il s'agit de `TNode<Smi>`, car c'est ce que le type `Smi` génère. Un `constexpr LanguageMode` se convertit en `LanguageMode` dans les fichiers CSA générés, car aucune clause `constexpr` n'est spécifiée dans l'énumération pour remplacer le nom par défaut. Si la clause `extends` est omise, Torque génèrera uniquement la version `constexpr` du type. Le mot-clé `extern` indique à Torque qu'il existe une définition en C++ de cette énumération. Actuellement, seules les énumérations `extern` sont prises en charge.

Torque génère un type distinct et une constante pour chaque entrée de l'énumération. Celles-ci sont définies dans un espace de noms correspondant au nom de l'énumération. Les spécialisations nécessaires de `FromConstexpr<>` sont générées pour convertir les types `constexpr` des entrées en type d'énumération. La valeur générée pour une entrée dans les fichiers C++ est `<enum-constexpr>::<entry-name>` où `<enum-constexpr>` est le nom `constexpr` généré pour l'énumération. Dans l'exemple ci-dessus, il s'agit de `LanguageMode::kStrict` et `LanguageMode::kSloppy`.

Les énumérations de Torque fonctionnent très bien avec la construction `typeswitch`, car les valeurs sont définies en utilisant des types distincts :

```torque
typeswitch(language_mode) {
  case (LanguageMode::kStrict): {
    // ...
  }
  case (LanguageMode::kSloppy): {
    // ...
  }
}
```

Si la définition C++ de l'énumération contient plus de valeurs que celles utilisées dans les fichiers `.tq`, Torque doit le savoir. Cela se fait en déclarant l'énumération 'ouverte' en ajoutant un `...` après la dernière entrée. Prenons l'exemple de `ExtractFixedArrayFlag`, où seules certaines options sont disponibles/présentées depuis Torque :

```torque
enum ExtractFixedArrayFlag constexpr 'CodeStubAssembler::ExtractFixedArrayFlag' {
  kFixedDoubleArrays,
  kAllFixedArrays,
  kFixedArrays,
  ...
}
```

### Appelables

Les appelables sont conceptuellement similaires aux fonctions en JavaScript ou C++, mais ils ont des fonctionnalités supplémentaires qui leur permettent d'interagir de manière utile avec le code CSA et avec le runtime de V8. Torque propose plusieurs types d'appelables : les `macro`s, les `builtin`s, les `runtime`s et les `intrinsic`s.

```grammar
CallableDeclaration :
  MacroDeclaration
  BuiltinDeclaration
  RuntimeDeclaration
  IntrinsicDeclaration
```

#### Appelables `macro`

Les macros sont des appelables qui correspondent à un segment de code CSA généré en C++. Les `macro`s peuvent soit être entièrement définis dans Torque, auquel cas le code CSA est généré par Torque, soit marqués `extern`, auquel cas l'implémentation doit être fournie comme code CSA écrit à la main dans une classe CodeStubAssembler. Conceptuellement, il est utile de considérer les `macro`s comme des segments de code CSA qui sont mis en ligne lors des appels.

Les déclarations `macro` dans Torque prennent la forme suivante :

```grammar
MacroDeclaration :
   transitioning opt macro IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock
  extern transitioning opt macro IdentifierName ImplicitParameters opt ExplicitTypes ReturnType opt LabelsDeclaration opt ;
```

Chaque `macro` non `extern` de Torque utilise le bloc d'instructions `StatementBlock` pour créer une fonction génératrice de CSA dans la classe `Assembler` générée de son espace de noms. Ce code ressemble à d'autres codes que vous pourriez trouver dans `code-stub-assembler.cc`, bien qu'il soit un peu moins lisible car il est généré automatiquement. Les `macro`s marqués `extern` n'ont pas de corps écrit dans Torque et fournissent simplement l'interface au code CSA écrit en C++ de manière à ce qu'il soit utilisable depuis Torque.

Les définitions `macro` spécifient des paramètres implicites et explicites, un type de retour optionnel et des étiquettes optionnelles. Les paramètres et les types de retour seront discutés en détail ci-dessous, mais pour l'instant, il suffit de savoir qu'ils fonctionnent un peu comme les paramètres TypeScript, décrits dans la section Types de fonctions de la documentation TypeScript [ici](https://www.typescriptlang.org/docs/handbook/functions.html).

Les étiquettes sont un mécanisme pour une sortie exceptionnelle d'une `macro`. Elles correspondent 1:1 aux étiquettes CSA et sont ajoutées en tant que paramètres de type `CodeStubAssemblerLabels*` à la méthode C++ générée pour la `macro`. Leurs sémantiques exactes sont discutées ci-dessous, mais pour la déclaration d'une `macro`, la liste des étiquettes de la `macro`, séparées par des virgules, est facultativement fournie avec le mot-clé `labels` et placée après la liste des paramètres et le type de retour de la `macro`.

Voici un exemple tiré de `base.tq` de `macro`s définies en externe et en Torque :

```torque
extern macro BranchIfFastJSArrayForCopy(Object, Context): never
    labels Taken, NotTaken;
macro BranchIfNotFastJSArrayForCopy(implicit context: Context)(o: Object):
    never
    labels Taken, NotTaken {
  BranchIfFastJSArrayForCopy(o, context) otherwise NotTaken, Taken;
}
```

#### `builtin` appelables

Les `builtin`s sont similaires aux `macro`s en ce qu'ils peuvent être entièrement définis en Torque ou marqués `extern`. Dans le cas des builtins basés sur Torque, le corps du builtin est utilisé pour générer un builtin V8 qui peut être appelé comme tout autre builtin V8, y compris en ajoutant automatiquement les informations pertinentes dans `builtin-definitions.h`. Comme pour les `macro`s, les `builtin`s Torque marqués `extern` n'ont pas de corps basé sur Torque et fournissent simplement une interface aux `builtin`s V8 existants afin qu'ils puissent être utilisés dans le code Torque.

Les déclarations de `builtin` en Torque ont la forme suivante :

```grammar
MacroDeclaration :
  transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitParametersOrVarArgs ReturnType opt StatementBlock
  extern transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

Il n'existe qu'une seule copie du code pour un builtin Torque, et c'est dans l'objet de code builtin généré. Contrairement aux `macro`s, lorsque des `builtin`s sont appelés depuis le code Torque, le code CSA n'est pas intégré au site d'appel, mais un appel est généré vers le builtin.

Les `builtin`s ne peuvent pas avoir d'étiquettes.

Si vous rédigez l'implémentation d'un `builtin`, vous pouvez effectuer un [appel terminal](https://en.wikipedia.org/wiki/Tail_call) vers un builtin ou une fonction runtime si (et seulement si) c'est l'appel final dans le builtin. Le compilateur peut alors éviter de créer une nouvelle pile d'exécution dans ce cas. Ajoutez simplement `tail` avant l'appel, comme dans `tail MyBuiltin(foo, bar);`.

#### `runtime` appelables

Les `runtime`s sont similaires aux `builtin`s en ce qu'ils peuvent exposer une interface à des fonctionnalités externes à Torque. Cependant, au lieu d'être implémentées en CSA, les fonctionnalités fournies par un `runtime` doivent toujours être implémentées dans V8 comme une fonction standard de rappel runtime.

Les déclarations `runtime` en Torque ont la forme suivante :

```grammar
MacroDeclaration :
  extern transitioning opt runtime IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

Le `runtime extern` spécifié avec le nom <i>IdentifierName</i> correspond à la fonction runtime spécifiée par <code>Runtime::k<i>IdentifierName</i></code>.

Comme les `builtin`s, les `runtime`s ne peuvent pas avoir d'étiquettes.

Vous pouvez également appeler une fonction `runtime` comme un appel terminal lorsque cela est approprié. Incluez simplement le mot-clé `tail` avant l'appel.

Les déclarations de fonctions runtime sont souvent placées dans un espace de noms appelé `runtime`. Cela les distingue des builtins portant le même nom et rend plus évident au point d'appel que nous appelons une fonction runtime. Nous devrions envisager de rendre cela obligatoire.

#### `intrinsic` appelables

Les `intrinsic`s sont des fonctions appelables Torque intégrées qui donnent accès à des fonctionnalités internes qui ne peuvent pas être autrement implémentées en Torque. Elles sont déclarées en Torque, mais non définies, car l'implémentation est fournie par le compilateur Torque. Les déclarations `intrinsic` utilisent la grammaire suivante :

```grammar
IntrinsicDeclaration :
  intrinsic % IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt ;
```

Pour la plupart, le code utilisateur de Torque devrait rarement avoir à utiliser directement des `intrinsic`s.
Voici quelques-unes des instrinsèques prises en charge :

```torque
// %RawObjectCast effectue un transtypage de Object vers un sous-type de Object sans
// tester rigoureusement si l'objet est réellement du type de destination.
// RawObjectCasts ne devraient *jamais* (ou presque jamais) être utilisés dans
// le code Torque sauf dans les opérateurs UnsafeCast basés sur Torque précédés d’un
// assert() de type approprié.
intrinsic %RawObjectCast<A: type>(o: Object): A;

// %RawPointerCast effectue un transtypage de RawPtr vers un sous-type de RawPtr sans
// tester rigoureusement si l'objet est réellement du type de destination.
intrinsic %RawPointerCast<A: type>(p: RawPtr): A;

// %RawConstexprCast convertit une valeur constante à la compilation en une autre.
// Les types source et destination doivent être 'constexpr'.
// %RawConstexprCast se traduit par des static_casts dans le code C++ généré.
intrinsic %RawConstexprCast<To: type, From: type>(f: From): To;

// %FromConstexpr convertit une valeur constexpr en une valeur non-constexpr.
// Actuellement, seules les conversions vers les types non-constexpr suivants
// sont prises en charge : Smi, Number, String, uintptr, intptr, et int32.
intrinsic %FromConstexpr<To: type, From: type>(b: From): To;

// %Allocate alloue un objet non initialisé de taille 'size' à partir du tas GC de V8
// et effectuer un "reinterpret cast" du pointeur d'objet résultant vers le
// classe Torque spécifiée, permettant aux constructeurs d'utiliser ensuite
// les opérateurs standard d'accès aux champs pour initialiser l'objet.
// Cet intrinsèque ne doit jamais être appelé depuis le code Torque. Il est utilisé
// en interne lors du désucrage de l'opérateur 'new'.
intrinsèque %Allocate<Class: type>(size: intptr): Class;
```

Comme les `builtin`s et `runtime`s, les `intrinsic`s ne peuvent pas avoir d'étiquettes.

### Paramètres explicites

Les déclarations des appels définis par Torque, par exemple les `macro`s et `builtin`s de Torque, ont des listes de paramètres explicites. Ce sont une liste de paires identifiant et type utilisant une syntaxe qui rappelle les listes de paramètres fonction typés de TypeScript, à l'exception que Torque ne prend pas en charge les paramètres optionnels ou par défaut. De plus, les `builtin`s implémentés par Torque peuvent, de manière optionnelle, prendre en charge les paramètres restants si le builtin utilise la convention de liaison JavaScript interne de V8 (par exemple, est marqué avec le mot-clé `javascript`).

```grammar
ExplicitParameters :
  ( ( IdentifierName : TypeIdentifierName ) list* )
  ( ( IdentifierName : TypeIdentifierName ) list+ (, ... IdentifierName ) opt )
```

Voici un exemple :

```torque
javascript builtin ArraySlice(
    (implicit context: Context)(receiver: Object, ...arguments): Object {
  // …
}
```

### Paramètres implicites

Les appels de Torque peuvent spécifier des paramètres implicites en utilisant quelque chose de similaire aux [paramètres implicites de Scala](https://docs.scala-lang.org/tour/implicit-parameters.html):

```grammar
ImplicitParameters :
  ( implicit ( IdentifierName : TypeIdentifierName ) list* )
```

Concrètement : Un `macro` peut déclarer des paramètres implicites en plus des paramètres explicites :

```torque
macro Foo(implicit context: Context)(x: Smi, y: Smi)
```

Lors du mappage vers CSA, les paramètres implicites et explicites sont traités de la même manière et forment une liste de paramètres commune.

Les paramètres implicites ne sont pas mentionnés sur le site d'appel, mais sont transmis implicitement : `Foo(4, 5)`. Pour que cela fonctionne, `Foo(4, 5)` doit être appelé dans un contexte qui fournit une valeur nommée `context`. Exemple :

```torque
macro Bar(implicit context: Context)() {
  Foo(4, 5);
}
```

Contrairement à Scala, nous interdisons cela si les noms des paramètres implicites ne sont pas identiques.

Comme la résolution de surcharge peut provoquer un comportement déroutant, nous veillons à ce que les paramètres implicites n'influencent pas du tout la résolution de surcharge. C'est-à-dire : lors de la comparaison des candidats d'un ensemble de surcharge, nous ne prenons pas en compte les liaisons implicites disponibles sur le site d'appel. Ce n'est qu'après avoir trouvé une seule meilleure surcharge que nous vérifions si des liaisons implicites sont disponibles pour les paramètres implicites.

Avoir les paramètres implicites à gauche des paramètres explicites est différent de Scala, mais correspond mieux à la convention existante dans CSA d'avoir le paramètre `context` en premier.

#### `js-implicit`

Pour les builtins avec une liaison JavaScript définie dans Torque, vous devriez utiliser le mot-clé `js-implicit` au lieu de `implicit`. Les arguments sont limités à ces quatre composants de la convention d'appel :

- context : `NativeContext`
- receiver : `JSAny` (`this` en JavaScript)
- target : `JSFunction` (`arguments.callee` en JavaScript)
- newTarget : `JSAny` (`new.target` en JavaScript)

Ils ne doivent pas tous être déclarés, uniquement ceux que vous souhaitez utiliser. Voici un exemple, voici notre code pour `Array.prototype.shift` :

```torque
  // https://tc39.es/ecma262/#sec-array.prototype.shift
  transitioning javascript builtin ArrayPrototypeShift(
      js-implicit context: NativeContext, receiver: JSAny)(...arguments): JSAny {
  ...
```

Notez que l'argument `context` est un `NativeContext`. Cela est dû au fait que les builtins dans V8 intègrent toujours le contexte natif dans leurs closures. L'encodage de cela dans la convention js-implicit permet au programmeur d'éliminer une opération pour charger le contexte natif à partir du contexte de la fonction.

### Résolution de surcharge

Les `macro`s et opérateurs de Torque (qui sont simplement des alias pour `macro`s) permettent la surcharge par type d'argument. Les règles de surcharge sont inspirées de celles du C++ : une surcharge est sélectionnée si elle est strictement meilleure que toutes les alternatives. Cela signifie qu'elle doit être strictement meilleure dans au moins un paramètre, et meilleure ou tout aussi bonne dans tous les autres.

Lors de la comparaison d'une paire de paramètres correspondants de deux surcharges…

- …ils sont considérés aussi bons si :
    - ils sont égaux ;
    - les deux nécessitent une conversion implicite.
- …l'un est considéré meilleur si :
    - il est un sous-type strict de l'autre ;
    - il ne nécessite pas de conversion implicite, tandis que l'autre en nécessite une.

Si aucune surcharge n'est strictement meilleure que toutes les alternatives, cela entraîne une erreur de compilation.

### Blocs différés

Un bloc d'instructions peut optionnellement être marqué comme `reporté` (deferred), ce qui est un signal pour le compilateur que ce bloc est moins souvent exécuté. Le compilateur peut choisir de localiser ces blocs à la fin de la fonction, améliorant ainsi la localité du cache pour les régions de code non reportées. Par exemple, dans ce code tiré de l'implémentation `Array.prototype.forEach`, nous nous attendons à rester sur le chemin "rapide" et seulement rarement prendre le cas de repli :

```torque
  let k: Number = 0;
  try {
    return FastArrayForEach(o, len, callbackfn, thisArg)
        otherwise Bailout;
  }
  label Bailout(kValue: Smi) deferred {
    k = kValue;
  }
```

Voici un autre exemple, où le cas des éléments de dictionnaire est marqué comme reporté pour améliorer la génération de code pour les cas plus probables (extrait de l'implémentation `Array.prototype.join`) :

```torque
  if (IsElementsKindLessThanOrEqual(kind, HOLEY_ELEMENTS)) {
    loadFn = LoadJoinElement<FastSmiOrObjectElements>;
  } else if (IsElementsKindLessThanOrEqual(kind, HOLEY_DOUBLE_ELEMENTS)) {
    loadFn = LoadJoinElement<FastDoubleElements>;
  } else if (kind == DICTIONARY_ELEMENTS)
    deferred {
      const dict: NumberDictionary =
          UnsafeCast<NumberDictionary>(array.elements);
      const nofElements: Smi = GetNumberDictionaryNumberOfElements(dict);
      // <etc>...
```

## Portage du code CSA vers Torque

[Le patch qui a porté `Array.of`](https://chromium-review.googlesource.com/c/v8/v8/+/1296464) sert comme exemple minimal de portage de code CSA vers Torque.
