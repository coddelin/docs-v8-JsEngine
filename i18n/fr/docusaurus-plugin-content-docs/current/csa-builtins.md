---
title: 'Assembleurs de CodeStub'
description: 'Ce document est une introduction à l'écriture des assembleurs de CodeStub, et est destiné aux développeurs de V8.'
---
Ce document est une introduction à l'écriture des assembleurs de CodeStub, et est destiné aux développeurs de V8.

:::note
**Remarque :** [Torque](/docs/torque) remplace CodeStubAssembler comme méthode recommandée pour implémenter de nouveaux builtins. Consultez [Les builtins Torque](/docs/torque-builtins) pour la version Torque de ce guide.
:::

## Builtins

Dans V8, les builtins peuvent être vus comme des segments de code exécutables par la VM au moment de l'exécution. Un cas d'utilisation courant est l'implémentation des fonctions des objets intégrés (tels que RegExp ou Promise), mais les builtins peuvent également être utilisés pour fournir d'autres fonctionnalités internes (par exemple dans le cadre du système IC).

Les builtins de V8 peuvent être implémentés à l'aide de plusieurs méthodes différentes (chacune ayant ses propres compromis) :

- **Langage d'assemblage dépendant de la plateforme** : peut être très efficace, mais nécessite des portages manuels sur toutes les plateformes et est difficile à maintenir.
- **C++** : très similaire au style des fonctions runtime et a accès aux fonctionnalités puissantes du runtime V8, mais n'est généralement pas adapté aux zones sensibles en termes de performances.
- **JavaScript** : code concis et lisible, accès à des intrinsics rapides, mais usage fréquent d'appels runtime lents, performance imprévisible en raison de la pollution de types, et problèmes subtils liés aux sémantiques complexes et non évidentes du JS.
- **CodeStubAssembler** : fournit une fonctionnalité bas-niveau efficace très proche du langage d'assemblage tout en restant indépendant de la plateforme et en préservant la lisibilité.

Le reste du document se concentre sur cette dernière méthode et donne un bref tutoriel pour développer un builtin CodeStubAssembler (CSA) simple exposé à JavaScript.

## CodeStubAssembler

Le CodeStubAssembler de V8 est un assembleur personnalisé et indépendant de la plateforme qui fournit des primitives bas-niveau en tant qu'abstraction fine sur le langage d'assemblage, tout en offrant également une bibliothèque étendue de fonctionnalités de haut-niveau.

```cpp
// Bas-niveau :
// Charge les données de taille pointeur à l'adresse addr dans value.
Node* addr = /* ... */;
Node* value = Load(MachineType::IntPtr(), addr);

// Et haut-niveau :
// Effectue l'opération JS ToString(object).
// Les sémantiques de ToString sont spécifiées sur https://tc39.es/ecma262/#sec-tostring.
Node* object = /* ... */;
Node* string = ToString(context, object);
```

Les builtins CSA passent par une partie du pipeline de compilation TurboFan (y compris la planification des blocs et l'allocation des registres, mais pas par les passes d'optimisation) qui génère ensuite le code exécutable final.

## Écriture d'un builtin CodeStubAssembler

Dans cette section, nous allons écrire un builtin CSA simple qui prend un seul argument et renvoie s'il représente le nombre `42`. Le builtin est exposé à JS en l'installant sur l'objet `Math` (parce que nous pouvons).

Cet exemple démontre :

- La création d'un builtin CSA avec une liaison JavaScript, qui peut être appelé comme une fonction JS.
- L'utilisation de CSA pour implémenter une logique simple : gestion des Smi et des numéros sur le tas, conditionnels, et appels aux builtins TFS.
- L'utilisation des Variables CSA.
- L'installation du builtin CSA sur l'objet `Math`.

Si vous souhaitez suivre cet exemple en local, le code suivant est basé sur la révision [7a8d20a7](https://chromium.googlesource.com/v8/v8/+/7a8d20a79f9d5ce6fe589477b09327f3e90bf0e0).

## Déclaration de `MathIs42`

Les builtins sont déclarés dans la macro `BUILTIN_LIST_BASE` dans [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1). Pour créer un nouveau builtin CSA avec une liaison JS et un paramètre nommé `X` :

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […snip…]
  TFJ(MathIs42, 1, kX)                                                         \
  // […snip…]
```

Notez que `BUILTIN_LIST_BASE` prend plusieurs macros différentes qui désignent différents types de builtins (voir la documentation inline pour plus de détails). Les builtins CSA sont spécifiquement divisés en :

- **TFJ** : Liaison JavaScript.
- **TFS** : Liaison stub.
- **TFC** : Liaison stub builtin nécessitant un descripteur d'interface personnalisé (par exemple, si les arguments ne sont pas marqués ou doivent être passés dans des registres spécifiques).
- **TFH** : Builtin de liaison stub spécialisé utilisé pour les gestionnaires IC.

## Définition de `MathIs42`

Les définitions des builtins se trouvent dans les fichiers `src/builtins/builtins-*-gen.cc`, organisés de manière thématique. Puisque nous allons écrire un builtin `Math`, nous mettrons notre définition dans [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1).

```cpp
// TF_BUILTIN est une macro pratique qui crée une nouvelle sous-classe de l'assembleur donné en arrière-plan.
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // Charger le contexte actuel de la fonction (un argument implicite pour chaque stub)
  // et l'argument X. Notez que nous pouvons nous référer aux paramètres par les noms
  // définis dans la déclaration builtin.
  Node* const context = Parameter(Descriptor::kContext);
  Node* const x = Parameter(Descriptor::kX);

  // À ce stade, x peut être pratiquement n'importe quoi - un Smi, un HeapNumber,
  // undefined ou tout autre objet JS arbitraire. Appelons le builtin ToNumber
  // pour convertir x en un nombre que nous pouvons utiliser.
  // CallBuiltin peut être utilisé pour appeler commodément n'importe quel builtin CSA.
  Node* const number = CallBuiltin(Builtins::kToNumber, context, x);

  // Créer une variable CSA pour stocker la valeur résultante. Le type de la
  // variable est kTagged puisque nous ne stockerons que des pointeurs taggés.
  VARIABLE(var_result, MachineRepresentation::kTagged);

  // Nous devons définir quelques labels qui seront utilisés comme cibles de saut.
  Label if_issmi(this), if_isheapnumber(this), out(this);

  // ToNumber retourne toujours un nombre. Nous devons distinguer entre les Smis
  // et les heap numbers - ici, nous vérifions si le nombre est un Smi et sautons conditionnellement
  // vers les labels correspondants.
  Branch(TaggedIsSmi(number), &if_issmi, &if_isheapnumber);

  // Le binding d'un label commence à générer du code pour celui-ci.
  BIND(&if_issmi);
  {
    // SelectBooleanConstant retourne les valeurs JS true/false en fonction de
    // si la condition passée est vraie/fausse. Le résultat est lié à notre
    // variable var_result, et nous sautons ensuite inconditionnellement au label out.
    var_result.Bind(SelectBooleanConstant(SmiEqual(number, SmiConstant(42))));
    Goto(&out);
  }

  BIND(&if_isheapnumber);
  {
    // ToNumber peut uniquement retourner un Smi ou un heap number. Juste pour être sûr,
    // nous ajoutons une assertion ici qui vérifie que number est réellement un heap number.
    CSA_ASSERT(this, IsHeapNumber(number));
    // Les heap numbers enveloppent une valeur en virgule flottante. Nous devons extraire explicitement
    // cette valeur, effectuer une comparaison en virgule flottante, et à nouveau lier
    // var_result en fonction du résultat.
    Node* const value = LoadHeapNumberValue(number);
    Node* const is_42 = Float64Equal(value, Float64Constant(42));
    var_result.Bind(SelectBooleanConstant(is_42));
    Goto(&out);
  }

  BIND(&out);
  {
    Node* const result = var_result.value();
    CSA_ASSERT(this, IsBoolean(result));
    Return(result);
  }
}
```

## Attacher `Math.Is42`

Les objets builtin tels que `Math` sont principalement configurés dans [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) (avec une certaine configuration dans les fichiers `.js`). Attacher notre nouveau builtin est simple :

```cpp
// Code existant pour configurer Math, inclus ici pour plus de clarté.
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […snip…]
SimpleInstallFunction(math, "is42", Builtins::kMathIs42, 1, true);
```

Maintenant que `Is42` est attaché, il peut être appelé depuis JS :

```bash
$ out/debug/d8
d8> Math.is42(42);
true
d8> Math.is42('42.0');
true
d8> Math.is42(true);
false
d8> Math.is42({ valueOf: () => 42 });
true
```

## Définir et appeler un builtin avec un lien de stub

Les builtins CSA peuvent également être créés avec un lien de stub (au lieu d'un lien JS comme nous l'avons utilisé plus tôt dans `MathIs42`). Ces builtins peuvent être utiles pour extraire du code couramment utilisé dans un objet de code séparé qui peut être utilisé par plusieurs appelants, tandis que le code est uniquement produit une fois. Extrayons le code qui gère les heap numbers dans un builtin séparé appelé `MathIsHeapNumber42`, et appelons-le depuis `MathIs42`.

Définir et utiliser des stubs TFS est facile ; les déclarations sont à nouveau placées dans [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1) :

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […snip…]
  TFS(MathIsHeapNumber42, kX)                                                  \
  TFJ(MathIs42, 1, kX)                                                         \
  // […snip…]
```

Notez qu'actuellement, l'ordre dans `BUILTIN_LIST_BASE` importe. Étant donné que `MathIs42` appelle `MathIsHeapNumber42`, le premier doit être listé après le second (cette exigence devrait être levée à un moment donné).

La définition est également simple. Dans [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1) :

```cpp
// Définir un builtin TFS fonctionne exactement de la même manière que les builtins TFJ.
TF_BUILTIN(MathIsHeapNumber42, MathBuiltinsAssembler) {
  Node* const x = Parameter(Descriptor::kX);
  CSA_ASSERT(this, IsHeapNumber(x));
  Node* const value = LoadHeapNumberValue(x);
  Node* const is_42 = Float64Equal(value, Float64Constant(42));
  Return(SelectBooleanConstant(is_42));
}
```

Enfin, appelons notre nouveau builtin depuis `MathIs42` :

```cpp
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // […snip…]
  BIND(&if_isheapnumber);
  {
    // Au lieu de traiter les nombres sur le tas directement, nous appelons maintenant notre nouvel stub TFS.
    var_result.Bind(CallBuiltin(Builtins::kMathIsHeapNumber42, context, number));
    Goto(&out);
  }
  // […snip…]
}
```

Pourquoi devriez-vous vous soucier des TFS builtins? Pourquoi ne pas laisser le code en ligne (ou extrait dans une méthode d'assistance pour une meilleure lisibilité)?

Une raison importante est l'espace de code : les builtins sont générés au moment de la compilation et inclus dans le V8 snapshot, prenant ainsi (de manière significative) de l'espace dans chaque isolate créé. Extraire de grands morceaux de code couramment utilisé vers des TFS builtins peut rapidement conduire à des économies d'espace de 10 à 100 Ko.

## Tester les builtins des liaisons stub

Même si notre nouveau builtin utilise une convention d'appel non standard (au moins non C++), il est possible d'écrire des cas de test pour celui-ci. Le code suivant peut être ajouté à [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc?l=1&rcl=4cab16db27808cf66ab883e7904f1891f9fd0717) pour tester le builtin sur toutes les plateformes:

```cpp
TEST(MathIsHeapNumber42) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  StubTester tester(isolate, zone, Builtins::kMathIs42);
  Handle<Object> result1 = tester.Call(Handle<Smi>(Smi::FromInt(0), isolate));
  CHECK(result1->BooleanValue());
}
```
