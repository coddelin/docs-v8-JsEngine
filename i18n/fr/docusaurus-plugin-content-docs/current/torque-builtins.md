---
title: "V8 Torque functions intégrées"
description: "Ce document est destiné à introduire l'écriture des fonctions intégrées Torque, et s'adresse aux développeurs V8."
---
Ce document est destiné à introduire l'écriture des fonctions intégrées Torque, et s'adresse aux développeurs V8. Torque remplace CodeStubAssembler comme méthode recommandée pour implémenter de nouvelles fonctions intégrées. Voir [CodeStubAssembler functions intégrées](/docs/csa-builtins) pour la version CSA de ce guide.

## Fonctions intégrées

Dans V8, les fonctions intégrées peuvent être considérées comme des blocs de code exécutables par la machine virtuelle au moment de l'exécution. Un cas d'utilisation courant est d'implémenter les fonctions d'objets intégrés (comme `RegExp` ou `Promise`), mais les fonctions intégrées peuvent également être utilisées pour fournir d'autres fonctionnalités internes (par exemple, dans le cadre du système IC).

Les fonctions intégrées de V8 peuvent être implémentées en utilisant diverses méthodes (chacune ayant ses compromis) :

- **Langage d'assemblage dépendant de la plateforme** : peut être très efficace, mais nécessite des ports manuels sur toutes les plateformes et est difficile à maintenir.
- **C++** : très similaire en style aux fonctions d'exécution et donne accès à des fonctionnalités puissantes de V8 en temps d'exécution, mais généralement inadapté aux zones sensibles aux performances.
- **JavaScript** : code concis et lisible, accès à des fonctions intrinsèques rapides, mais utilisation fréquente d'appels d'exécution lents, performances imprévisibles dues à la pollution des types, et problèmes subtils liés aux (complexes et non évidentes) sémantiques JS. Les fonctions intégrées JavaScript sont obsolètes et ne devraient plus être ajoutées.
- **CodeStubAssembler** : fournit des fonctionnalités bas-niveau efficaces, très proches du langage d'assemblage tout en restant indépendant de la plateforme et préservant la lisibilité.
- **[V8 Torque](/docs/torque)** : est un langage spécifique au domaine de V8 traduit en CodeStubAssembler. En tant que tel, il s'étend sur CodeStubAssembler et offre un typage statique ainsi qu'une syntaxe lisible et expressive.

Le document restant se concentre sur cette dernière méthode et propose un bref tutoriel pour développer une simple fonction intégrée Torque exposée à JavaScript. Pour des informations plus complètes sur Torque, voir le [manuel utilisateur V8 Torque](/docs/torque).

## Écrire une fonction intégrée Torque

Dans cette section, nous allons écrire une simple fonction CSA qui prend un seul argument et retourne si cet argument représente le nombre `42`. La fonction intégrée est exposée à JS en l'installant sur l'objet `Math` (parce que nous pouvons).

Cet exemple démontre :

- La création d'une fonction intégrée Torque avec un lien de JavaScript, qui peut être appelée comme une fonction JS.
- L'utilisation de Torque pour implémenter une logique simple : distinction de type, gestion de Smi et de HeapNumber, conditionnels.
- L'installation de la fonction intégrée CSA sur l'objet `Math`.

Si vous souhaitez suivre localement, le code suivant est basé sur la révision [589af9f2](https://chromium.googlesource.com/v8/v8/+/589af9f257166f66774b4fb3008cd09f192c2614).

## Définir `MathIs42`

Le code Torque est localisé dans les fichiers `src/builtins/*.tq`, approximativement organisés par sujet. Puisque nous écrirons une fonction intégrée `Math`, nous mettrons notre définition dans `src/builtins/math.tq`. Puisque ce fichier n'existe pas encore, nous devons l'ajouter à [`torque_files`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=914&rcl=589af9f257166f66774b4fb3008cd09f192c2614) dans [`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn).

```torque
namespace math {
  javascript builtin MathIs42(
      context: Context, receiver: Object, x: Object): Boolean {
    // À ce stade, x peut être essentiellement n'importe quoi - un Smi, un HeapNumber,
    // un undefined, ou tout autre objet JS arbitraire. ToNumber_Inline est défini
    // dans CodeStubAssembler. Il inclut un chemin rapide (si l'argument est déjà un nombre)
    // et appelle la fonction intégrée ToNumber sinon.
    const number: Number = ToNumber_Inline(x);
    // Un typeswitch nous permet de basculer entre le type dynamique d'une valeur. Le système
    // de types sait qu'un Number peut être uniquement un Smi ou un HeapNumber, donc ce
    // switch est exhaustif.
    typeswitch (number) {
      case (smi: Smi): {
        // Le résultat de smi == 42 n'est pas un booléen Javascript, donc nous utilisons
        // un conditionnel pour créer une valeur booléenne Javascript.
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        return Convert<float64>(heapNumber) == 42 ? True : False;
      }
    }
  }
}
```

Nous plaçons la définition dans l'espace de noms Torque `math`. Étant donné que cet espace de noms n'existait pas avant, nous devons l'ajouter à [`torque_namespaces`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=933&rcl=589af9f257166f66774b4fb3008cd09f192c2614) dans [`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn).

## Attacher `Math.is42`

Les objets intégrés tels que `Math` sont principalement configurés dans [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) (avec une partie de la configuration dans les fichiers `.js`). Ajouter notre nouveau objet intégré est simple :

```cpp
// Code existant pour configurer Math, inclus ici pour plus de clarté.
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […snip…]
SimpleInstallFunction(isolate_, math, "is42", Builtins::kMathIs42, 1, true);
```

Maintenant que `is42` est attaché, il peut être appelé depuis JS :

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

## Définir et appeler un intégré avec liaison stub

Les objets intégrés peuvent également être créés avec une liaison stub (au lieu de la liaison JS que nous avons utilisée ci-dessus dans `MathIs42`). Ces objets peuvent être utiles pour extraire du code fréquemment utilisé dans un objet de code séparé pouvant être utilisé par plusieurs appelants, tout en produisant le code une seule fois. Extrayons le code qui gère les nombres heap dans un objet intégré appelé `HeapNumberIs42`, et appelons-le depuis `MathIs42`.

La définition est également simple. La seule différence avec notre objet intégré avec liaison JavaScript est que nous omettons le mot-clé `javascript` et il n'y a pas d'argument récepteur.

```torque
namespace math {
  builtin HeapNumberIs42(implicit context: Context)(heapNumber: HeapNumber):
      Boolean {
    return Convert<float64>(heapNumber) == 42 ? True : False;
  }

  javascript builtin MathIs42(implicit context: Context)(
      receiver: Object, x: Object): Boolean {
    const number: Number = ToNumber_Inline(x);
    typeswitch (number) {
      case (smi: Smi): {
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        // Au lieu de gérer les nombres heap inline, nous appelons maintenant notre nouveau intégré.
        return HeapNumberIs42(heapNumber);
      }
    }
  }
}
````

Pourquoi devriez-vous vous intéresser aux objets intégrés ? Pourquoi ne pas laisser le code inline (ou l'extraire dans des macros pour une meilleure lisibilité) ?

Une raison importante est l'espace de code : les objets intégrés sont générés au moment de la compilation et inclus dans le snapshot V8 ou intégrés dans le binaire. Extraire de grandes portions de code fréquemment utilisé dans des objets intégrés séparés peut rapidement entraîner des économies d'espace allant de dizaines à des centaines de Ko.

## Tester les objets intégrés avec liaison stub

Même si notre nouvel objet intégré utilise une convention d'appel non standard (au moins non C++), il est possible d'écrire des cas de test pour celui-ci. Le code suivant peut être ajouté à [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc) pour tester l'objet intégré sur toutes les plateformes :

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
