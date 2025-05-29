---
title: 'Commencer avec l'intégration de V8'
description: 'Ce document introduit certains concepts clés de V8 et propose un exemple “hello world” pour vous aider à démarrer avec le code V8.'
---
Ce document introduit certains concepts clés de V8 et propose un exemple “hello world” pour vous aider à démarrer avec le code V8.

## Public cible

Ce document est destiné aux programmeurs C++ qui souhaitent intégrer le moteur JavaScript V8 dans une application C++. Il vous permet de rendre disponibles les objets et méthodes C++ de votre propre application pour JavaScript, et de rendre disponibles les objets et fonctions JavaScript pour votre application C++.

## Hello world

Examinons un [exemple Hello World](https://chromium.googlesource.com/v8/v8/+/branch-heads/11.9/samples/hello-world.cc) qui prend une instruction JavaScript comme argument sous forme de chaîne, l'exécute comme du code JavaScript, et imprime le résultat à la sortie standard.

D'abord, quelques concepts clés :

- Un isolate est une instance de VM avec son propre tas.
- Un handle local est un pointeur vers un objet. Tous les objets V8 sont accessibles en utilisant des handles. Ils sont nécessaires en raison du fonctionnement du ramasse-miettes de V8.
- Une portée de handle peut être considérée comme un conteneur pour un nombre quelconque de handles. Une fois que vous avez terminé avec vos handles, au lieu de les supprimer individuellement, vous pouvez simplement supprimer leur portée.
- Un contexte est un environnement d'exécution qui permet à du code JavaScript séparé et indépendant de s'exécuter dans une seule instance de V8. Vous devez spécifier explicitement le contexte dans lequel vous souhaitez exécuter du code JavaScript.

Ces concepts sont discutés plus en détail dans [le guide avancé](/docs/embed#advanced-guide).

## Exécuter l'exemple

Suivez les étapes ci-dessous pour exécuter l'exemple vous-même :

1. Téléchargez le code source de V8 en suivant [les instructions Git](/docs/source-code#using-git).
1. Les instructions pour cet exemple hello world ont été testées pour la dernière fois avec V8 v13.1. Vous pouvez vérifier cette branche avec `git checkout branch-heads/13.1 -b sample -t`
1. Créez une configuration de build en utilisant le script d'aide :

    ```bash
    tools/dev/v8gen.py x64.release.sample
    ```

    Vous pouvez inspecter et éditer manuellement la configuration de build en exécutant :

    ```bash
    gn args out.gn/x64.release.sample
    ```

1. Construisez la bibliothèque statique sur un système Linux 64 :

    ```bash
    ninja -C out.gn/x64.release.sample v8_monolith
    ```

1. Compilez `hello-world.cc`, en le reliant à la bibliothèque statique créée lors du processus de build. Par exemple, sur Linux 64 bits en utilisant le compilateur GNU et le linker LLD :

    ```bash
    g++ -I. -Iinclude samples/hello-world.cc -o hello_world -fno-rtti -fuse-ld=lld -lv8_monolith -lv8_libbase -lv8_libplatform -ldl -Lout.gn/x64.release.sample/obj/ -pthread -std=c++20 -DV8_COMPRESS_POINTERS -DV8_ENABLE_SANDBOX
    ```

1. Pour du code plus complexe, V8 échoue sans un fichier de données ICU. Copiez ce fichier à l'endroit où votre binaire est stocké :

    ```bash
    cp out.gn/x64.release.sample/icudtl.dat .
    ```

1. Exécutez le fichier exécutable `hello_world` en ligne de commande. Par exemple, sur Linux, dans le répertoire V8, exécutez :

    ```bash
    ./hello_world
    ```

1. Cela imprime `Hello, World!`. Yay!  
   Remarque : à partir de novembre 2024, il peut également y avoir un segfault tôt lors du démarrage du processus. Une enquête est en cours. Si vous rencontrez ce problème et trouvez ce qui ne va pas, veuillez commenter sur [issue 377222400](https://issues.chromium.org/issues/377222400), ou [soumettre un patch](https://v8.dev/docs/contribute).

Si vous recherchez un exemple synchronisé avec la branche principale, consultez le fichier [`hello-world.cc`](https://chromium.googlesource.com/v8/v8/+/main/samples/hello-world.cc). C'est un exemple très simple et vous voudrez probablement faire plus que simplement exécuter des scripts en tant que chaînes. [Le guide avancé ci-dessous](#advanced-guide) contient plus d'informations pour les intégrateurs V8.

## Plus de codes d'exemple

Les exemples suivants sont fournis dans le cadre du téléchargement du code source.

### [`process.cc`](https://github.com/v8/v8/blob/main/samples/process.cc)

Cet exemple fournit le code nécessaire pour étendre une application hypothétique de traitement de requêtes HTTP — qui pourrait faire partie d'un serveur web, par exemple — afin qu'elle soit scriptable. Il prend un script JavaScript en tant qu'argument, qui doit fournir une fonction appelée `Process`. La fonction JavaScript `Process` peut être utilisée, par exemple, pour collecter des informations telles que le nombre de visites sur chaque page servie par le serveur web fictif.

### [`shell.cc`](https://github.com/v8/v8/blob/main/samples/shell.cc)

Cet exemple prend des noms de fichiers en tant qu'arguments, puis lit et exécute leur contenu. Comprend une invite de commande où vous pouvez entrer des extraits de code JavaScript qui sont ensuite exécutés. Dans cet exemple, des fonctions supplémentaires comme `print` sont également ajoutées à JavaScript via l'utilisation de modèles d'objets et de fonctions.

## Guide avancé

Maintenant que vous êtes familiarisé avec l'utilisation de V8 comme machine virtuelle autonome et avec certains concepts clés de V8 tels que les handles, les scopes et les contextes, discutons davantage de ces concepts et introduisons quelques autres notions essentielles pour intégrer V8 dans votre propre application C++.

L'API V8 fournit des fonctions pour compiler et exécuter des scripts, accéder à des méthodes et structures de données C++, gérer les erreurs et effectuer des contrôles de sécurité. Votre application peut utiliser V8 comme n'importe quelle autre bibliothèque C++. Votre code C++ accède à V8 via l'API V8 en incluant l'en-tête `include/v8.h`.

### Handles et gestion de la mémoire

Un handle fournit une référence à l'emplacement d'un objet JavaScript dans le tas mémoire. Le collecteur de mémoire de V8 récupère la mémoire utilisée par les objets qui ne peuvent plus être accessibles. Pendant le processus de collecte de mémoire, le collecteur déplace souvent les objets à différents emplacements dans le tas. Lorsque le collecteur déplace un objet, il met également à jour tous les handles qui font référence à cet objet avec sa nouvelle localisation.

Un objet est considéré comme déchets s'il est inaccessible depuis JavaScript et qu'il n'existe aucun handle qui y fait référence. De temps en temps, le collecteur de mémoire supprime tous les objets considérés comme déchets. Le mécanisme de collecte de mémoire de V8 est essentiel pour ses performances.

Il existe plusieurs types de handles :

- Les handles locaux sont conservés sur une pile et sont supprimés lorsque le destructeur approprié est invoqué. La durée de vie de ces handles est déterminée par un scope de handle, souvent créé au début d'un appel de fonction. Lorsque le scope de handle est supprimé, le collecteur de mémoire est libre de désallouer les objets précédemment référencés par les handles dans ce scope, à condition qu'ils ne soient plus accessibles depuis JavaScript ou d'autres handles. Ce type de handle est utilisé dans l'exemple Hello World ci-dessus.

    Les handles locaux ont la classe `Local<SomeType>`.

    **Remarque :** La pile de handles ne fait pas partie de la pile d'appels C++, mais les scopes de handle sont intégrés dans la pile C++. Les scopes de handle peuvent uniquement être alloués sur la pile, pas avec `new`.

- Les handles persistants fournissent une référence à un objet JavaScript alloué dans le tas, tout comme un handle local. Ils existent en deux variantes, qui diffèrent par la gestion de la durée de vie de la référence qu'ils manipulent. Utilisez un handle persistant lorsque vous devez conserver une référence à un objet pour plus d'un appel de fonction ou lorsque la durée de vie des handles ne correspond pas aux scopes de C++. Google Chrome, par exemple, utilise des handles persistants pour faire référence aux nœuds du modèle DOM (Document Object Model). Un handle persistant peut être rendu faible, en utilisant `PersistentBase::SetWeak`, pour déclencher un callback du collecteur de mémoire lorsque les seules références à un objet proviennent de handles persistants faibles.

    - Un handle `UniquePersistent<SomeType>` se base sur les constructeurs et destructeurs C++ pour gérer la durée de vie de l'objet sous-jacent.
    - Un `Persistent<SomeType>` peut être construit avec son constructeur, mais doit être explicitement supprimé avec `Persistent::Reset`.

- Il existe d'autres types de handles qui sont rarement utilisés et que nous mentionnerons brièvement ici :

    - `Eternal` est un handle persistant pour les objets JavaScript qui ne devraient jamais être supprimés. Il est moins coûteux à utiliser car il dispense le collecteur de mémoire de déterminer la vivacité de cet objet.
    - Les types `Persistent` et `UniquePersistent` ne peuvent pas être copiés, ce qui les rend inadaptés comme valeurs dans des conteneurs de bibliothèque standard pré-C++11. `PersistentValueMap` et `PersistentValueVector` fournissent des classes conteneurs pour des valeurs persistantes, avec des sémantiques de type carte et vecteur. Les utilisateurs de C++11 n'ont pas besoin de ces derniers, car les sémantiques de mouvement de C++11 résolvent le problème sous-jacent.

Bien sûr, créer un handle local chaque fois que vous créez un objet peut entraîner un grand nombre de handles ! C'est là que les scopes de handle sont très utiles. Vous pouvez considérer un scope de handle comme un conteneur qui contient de nombreux handles. Lorsque le destructeur du scope de handle est appelé, tous les handles créés dans ce scope sont supprimés de la pile. Comme vous pouvez l'imaginer, cela permet aux objets auxquels les handles pointent d'être éligibles à la suppression du tas par le collecteur de mémoire.

Revenons à [notre exemple Hello World très simple](#hello-world), dans le diagramme suivant, vous pouvez voir la pile de handles et les objets alloués dans le tas. Notez que `Context::New()` retourne un handle `Local`, et nous créons un nouveau handle `Persistent` basé sur celui-ci pour démontrer l'utilisation des handles `Persistent`.

![](/_img/docs/embed/local-persist-handles-review.png)

Lorsque le destructeur `HandleScope::~HandleScope` est appelé, la portée de gestion est supprimée. Les objets référencés par des gestionnaires dans la portée de gestion supprimée sont éligibles pour être supprimés lors du prochain ramassage des ordures s’il n’existe aucune autre référence à eux. Le ramasse-miettes peut également supprimer les objets `source_obj` et `script_obj` du tas car ils ne sont plus référencés par aucun gestionnaire ou autre moyen accessible depuis JavaScript. Étant donné que le gestionnaire de contexte est un gestionnaire persistant, il n’est pas supprimé lorsque la portée du gestionnaire est quittée. La seule façon de supprimer le gestionnaire de contexte est d’appeler explicitement `Reset` dessus.

:::note
**Note :** Tout au long de ce document, le terme "gestionnaire" désigne un gestionnaire local. Lorsqu'on parle d'un gestionnaire persistant, ce terme est utilisé dans son intégralité.
:::

Il est important d’être conscient d’un piège courant avec ce modèle : *vous ne pouvez pas retourner directement un gestionnaire local depuis une fonction qui déclare une portée de gestion*. Si vous le faites, le gestionnaire local que vous essayez de retourner sera supprimé par le destructeur de la portée de gestion juste avant que la fonction ne retourne. La façon correcte de retourner un gestionnaire local est de construire une `EscapableHandleScope` au lieu d’une `HandleScope` et d’appeler la méthode `Escape` sur la portée de gestion, en passant le gestionnaire dont vous souhaitez retourner la valeur. Voici un exemple de la façon dont cela fonctionne en pratique :

```cpp
// Cette fonction retourne un nouveau tableau avec trois éléments, x, y, et z.
Local<Array> NewPointArray(int x, int y, int z) {
  v8::Isolate* isolate = v8::Isolate::GetCurrent();

  // Nous allons créer des gestionnaires temporaires, donc nous utilisons une portée de gestion.
  v8::EscapableHandleScope handle_scope(isolate);

  // Créer un nouveau tableau vide.
  v8::Local<v8::Array> array = v8::Array::New(isolate, 3);

  // Retourner un résultat vide s’il y a eu une erreur lors de la création du tableau.
  if (array.IsEmpty())
    return v8::Local<v8::Array>();

  // Remplir les valeurs
  array->Set(0, Integer::New(isolate, x));
  array->Set(1, Integer::New(isolate, y));
  array->Set(2, Integer::New(isolate, z));

  // Retourner la valeur via Escape.
  return handle_scope.Escape(array);
}
```

La méthode `Escape` copie la valeur de son argument dans la portée englobante, supprime tous ses gestionnaires locaux, et retourne ensuite la nouvelle copie de gestionnaire qui peut être retournée en toute sécurité.

### Contextes

Dans V8, un contexte est un environnement d’exécution qui permet à des applications JavaScript distinctes et non liées de s’exécuter dans une unique instance de V8. Vous devez spécifier explicitement le contexte dans lequel vous souhaitez exécuter tout code JavaScript.

Pourquoi est-ce nécessaire ? Parce que JavaScript fournit un ensemble de fonctions utilitaires et d’objets intégrés qui peuvent être modifiés par du code JavaScript. Par exemple, si deux fonctions JavaScript entièrement indépendantes modifiaient toutes deux l’objet global de la même manière, des résultats inattendus seraient assez probables.

En termes de temps CPU et de mémoire, il pourrait sembler coûteux de créer un nouveau contexte d’exécution, étant donné le nombre d’objets intégrés qui doivent être construits. Cependant, le vaste mécanisme de mise en cache de V8 garantit que, bien que le premier contexte que vous créez soit quelque peu coûteux, les contextes suivants sont beaucoup moins chers. Cela est dû au fait que le premier contexte doit créer les objets intégrés et analyser le code JavaScript intégré tandis que les contextes suivants n’ont qu’à créer les objets intégrés pour leur contexte. Avec la fonctionnalité snapshot de V8 (activée avec l’option de build `snapshot=yes`, qui est le paramètre par défaut), le temps consacré à la création du premier contexte sera hautement optimisé car un snapshot inclut un tas sérialisé qui contient déjà le code compilé pour le code JavaScript intégré. Avec le ramassage des ordures, le vaste mécanisme de mise en cache de V8 joue également un rôle clé dans les performances de V8.

Lorsque vous avez créé un contexte, vous pouvez y entrer et en sortir un nombre illimité de fois. Pendant que vous êtes dans le contexte A, vous pouvez également entrer dans un autre contexte, B, ce qui signifie que vous remplacez A en tant que contexte actuel par B. Lorsque vous sortez de B, A est restauré en tant que contexte actuel. Cela est illustré ci-dessous :

![](/_img/docs/embed/intro-contexts.png)

Notez que les fonctions utilitaires et les objets intégrés de chaque contexte sont maintenus séparés. Vous pouvez éventuellement définir un jeton de sécurité lorsque vous créez un contexte. Consultez la section [Modèle de sécurité](#security-model) pour plus d’informations.

La raison d’utiliser des contextes dans V8 était que chaque fenêtre et iframe dans un navigateur puisse avoir son propre nouvel environnement JavaScript.

### Templates

Un template est un modèle pour les fonctions et objets JavaScript dans un contexte. Vous pouvez utiliser un template pour encapsuler des fonctions et des structures de données C++ dans des objets JavaScript afin qu’ils puissent être manipulés par des scripts JavaScript. Par exemple, Google Chrome utilise des templates pour encapsuler les nœuds DOM C++ comme objets JavaScript et pour installer des fonctions dans l’espace de noms global. Vous pouvez créer un ensemble de templates puis utiliser les mêmes pour chaque nouveau contexte que vous créez. Vous pouvez avoir autant de templates que nécessaire. Cependant, vous ne pouvez avoir qu’une seule instance de tout template dans un contexte donné.

En JavaScript, il existe une forte dualité entre les fonctions et les objets. Pour créer un nouveau type d’objet en Java ou C++, vous définiriez généralement une nouvelle classe. En JavaScript, vous créez à la place une nouvelle fonction et créez des instances en utilisant la fonction comme constructeur. La disposition et les fonctionnalités d’un objet JavaScript sont étroitement liées à la fonction qui l’a construit. Cela se reflète dans la manière dont fonctionnent les templates V8. Il existe deux types de templates :

- Templates de fonction

    Un modèle de fonction est le plan pour une fonction unique. Vous créez une instance JavaScript du modèle en appelant la méthode `GetFunction` du modèle dans le contexte où vous souhaitez instancier la fonction JavaScript. Vous pouvez également associer un rappel de fonction C++ à un modèle de fonction qui est appelé lorsque l'instance de la fonction JavaScript est invoquée.

- Modèles d'objets

    Chaque modèle de fonction a un modèle d'objet associé. Celui-ci est utilisé pour configurer les objets créés avec cette fonction comme leur constructeur. Vous pouvez associer deux types de rappels C++ aux modèles d'objet:

    - les rappels d'accesseur sont invoqués lorsqu'une propriété spécifique de l'objet est accédée par un script
    - les rappels d'intercepteur sont invoqués lorsqu'une propriété quelconque de l'objet est accédée par un script

  [Accesseurs](#accessors) et [intercepteurs](#interceptors) sont abordés plus loin dans ce document.

Le code suivant fournit un exemple de création d'un modèle pour l'objet global et de définition des fonctions globales intégrées.

```cpp
// Créez un modèle pour l'objet global et définissez les
// fonctions globales intégrées.
v8::Local<v8::ObjectTemplate> global = v8::ObjectTemplate::New(isolate);
global->Set(v8::String::NewFromUtf8(isolate, "log"),
            v8::FunctionTemplate::New(isolate, LogCallback));

// Chaque processeur obtient son propre contexte afin que différents processeurs
// ne se perturbent pas mutuellement.
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global);
```

Cet exemple de code est tiré de `JsHttpProcessor::Initializer` dans l'exemple `process.cc`.

### Accesseurs

Un accesseur est un rappel C++ qui calcule et renvoie une valeur lorsqu'une propriété d'objet est accédée par un script JavaScript. Les accesseurs sont configurés via un modèle d'objet, à l'aide de la méthode `SetAccessor`. Cette méthode prend le nom de la propriété avec laquelle elle est associée et deux rappels à exécuter lorsqu'un script tente de lire ou d'écrire la propriété.

La complexité d'un accesseur dépend du type de données que vous manipulez:

- [Accéder à des variables globales statiques](#accessing-static-global-variables)
- [Accéder à des variables dynamiques](#accessing-dynamic-variables)

### Accéder à des variables globales statiques

Supposons qu'il y a deux variables entières C++, `x` et `y`, qui doivent être mises à disposition de JavaScript en tant que variables globales dans un contexte. Pour ce faire, vous devez appeler des fonctions d'accesseur C++ chaque fois qu'un script lit ou écrit ces variables. Ces fonctions d'accesseur convertissent un entier C++ en un entier JavaScript à l'aide de `Integer::New`, et convertissent un entier JavaScript en un entier C++ à l'aide de `Int32Value`. Un exemple est fourni ci-dessous:

```cpp
void XGetter(v8::Local<v8::String> property,
              const v8::PropertyCallbackInfo<Value>& info) {
  info.GetReturnValue().Set(x);
}

void XSetter(v8::Local<v8::String> property, v8::Local<v8::Value> value,
             const v8::PropertyCallbackInfo<void>& info) {
  x = value->Int32Value();
}

// YGetter/YSetter sont si similaires qu'ils sont omis pour la brièveté

v8::Local<v8::ObjectTemplate> global_templ = v8::ObjectTemplate::New(isolate);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                          XGetter, XSetter);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                          YGetter, YSetter);
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global_templ);
```

Notez que le modèle d'objet dans le code ci-dessus est créé en même temps que le contexte. Le modèle pourrait avoir été créé à l'avance puis utilisé pour un nombre quelconque de contextes.

### Accéder à des variables dynamiques

Dans l'exemple précédent, les variables étaient statiques et globales. Que se passe-t-il si les données manipulées sont dynamiques, comme c'est le cas pour l'arbre DOM dans un navigateur? Imaginons que `x` et `y` sont des champs d'objet sur la classe C++ `Point`:

```cpp
class Point {
 public:
  Point(int x, int y) : x_(x), y_(y) { }
  int x_, y_;
}
```

Pour rendre un nombre quelconque d'instances C++ `point` disponibles pour JavaScript, nous devons créer un objet JavaScript pour chaque `point` C++ et établir une connexion entre l'objet JavaScript et l'instance C++. Cela se fait avec des valeurs externes et des champs internes d'objet.

Tout d'abord, créez un modèle d'objet pour l'objet wrapper `point`:

```cpp
v8::Local<v8::ObjectTemplate> point_templ = v8::ObjectTemplate::New(isolate);
```

Chaque objet JavaScript `point` conserve une référence à l'objet C++ dont il est un wrapper avec un champ interne. Ces champs sont ainsi nommés parce qu'ils ne peuvent pas être accédés depuis JavaScript, mais seulement depuis le code C++. Un objet peut avoir un nombre quelconque de champs internes, le nombre de champs internes est défini sur le modèle d'objet comme suit:

```cpp
point_templ->SetInternalFieldCount(1);
```

Ici, le nombre de champs internes est défini à `1`, ce qui signifie que l'objet a un champ interne, avec un index de `0`, qui pointe vers un objet C++.

Ajoutez les accesseurs `x` et `y` au modèle:

```cpp
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                         GetPointX, SetPointX);
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                         GetPointY, SetPointY);
```

Ensuite, encapsulez un point C++ en créant une nouvelle instance du modèle et en définissant le champ interne `0` avec un wrapper externe autour du point `p`.

```cpp
Point* p = ...;
v8::Local<v8::Object> obj = point_templ->NewInstance();
obj->SetInternalField(0, v8::External::New(isolate, p));
```

L'objet externe est simplement un wrapper autour d'un `void*`. Les objets externes ne peuvent être utilisés que pour stocker des valeurs de référence dans des champs internes. Les objets JavaScript ne peuvent pas avoir de références directes aux objets C++ ; par conséquent, la valeur externe est utilisée comme un "pont" pour passer de JavaScript au C++. En ce sens, les valeurs externes sont l'opposé des handles, car les handles permettent au C++ de référencer des objets JavaScript.

Voici la définition des accesseurs `get` et `set` pour `x`. Les définitions des accesseurs pour `y` sont identiques, à l'exception de `y` remplaçant `x` :

```cpp
void GetPointX(Local<String> property,
               const PropertyCallbackInfo<Value>& info) {
  v8::Local<v8::Object> self = info.Holder();
  v8::Local<v8::External> wrap =
      v8::Local<v8::External>::Cast(self->GetInternalField(0));
  void* ptr = wrap->Value();
  int value = static_cast<Point*>(ptr)->x_;
  info.GetReturnValue().Set(value);
}

void SetPointX(v8::Local<v8::String> property, v8::Local<v8::Value> value,
               const v8::PropertyCallbackInfo<void>& info) {
  v8::Local<v8::Object> self = info.Holder();
  v8::Local<v8::External> wrap =
      v8::Local<v8::External>::Cast(self->GetInternalField(0));
  void* ptr = wrap->Value();
  static_cast<Point*>(ptr)->x_ = value->Int32Value();
}
```

Les accesseurs extraient la référence à l'objet `point` qui a été encapsulé par l'objet JavaScript, puis lisent et écrivent sur le champ associé. De cette façon, ces accesseurs génériques peuvent être utilisés sur n'importe quel nombre d'objets `point` encapsulés.

### Intercepteurs

Vous pouvez également spécifier un callback à appeler chaque fois qu'un script accède à une propriété d'objet. Ces callbacks sont appelés intercepteurs. Pour des raisons d'efficacité, il existe deux types d'intercepteurs :

- *Intercepteurs de propriété nommée* - appelés lors de l'accès à des propriétés avec des noms de chaîne.
  Un exemple de cela, dans un environnement de navigateur, est `document.nomDuFormulaire.nomDeLElement`.
- *Intercepteurs de propriété indexée* - appelés lors de l'accès à des propriétés indexées. Un exemple de cela, dans un environnement de navigateur, est `document.forms.elements[0]`.

L'exemple `process.cc`, fourni avec le code source de V8, inclut un exemple d'utilisation des intercepteurs. Dans le code suivant, `SetNamedPropertyHandler` spécifie les intercepteurs `MapGet` et `MapSet` :

```cpp
v8::Local<v8::ObjectTemplate> result = v8::ObjectTemplate::New(isolate);
result->SetNamedPropertyHandler(MapGet, MapSet);
```

L'intercepteur `MapGet` est fourni ci-dessous :

```cpp
void JsHttpRequestProcessor::MapGet(v8::Local<v8::String> name,
                                    const v8::PropertyCallbackInfo<Value>& info) {
  // Récupérez la map encapsulée par cet objet.
  map<string, string> *obj = UnwrapMap(info.Holder());

  // Convertissez la chaîne JavaScript en std::string.
  string key = ObjectToString(name);

  // Recherchez la valeur si elle existe en utilisant l'idiome standard de la STL.
  map<string, string>::iterator iter = obj->find(key);

  // Si la clé n'est pas présente, retournez un handle vide comme signal.
  if (iter == obj->end()) return;

  // Sinon, récupérez la valeur et encapsulez-la dans une chaîne JavaScript.
  const string &value = (*iter).second;
  info.GetReturnValue().Set(v8::String::NewFromUtf8(
      value.c_str(), v8::String::kNormalString, value.length()));
}
```

Tout comme pour les accesseurs, les callbacks spécifiés sont invoqués chaque fois qu'une propriété est accédée. La différence entre les accesseurs et les intercepteurs est que les intercepteurs traitent toutes les propriétés, tandis que les accesseurs sont associés à une propriété spécifique.

### Modèle de sécurité

La "politique de même origine" (introduite pour la première fois avec Netscape Navigator 2.0) empêche un document ou un script chargé d'une "origine" d'accéder ou de définir les propriétés d'un document provenant d'une autre "origine". Le terme origine est ici défini comme une combinaison de nom de domaine (par ex. `www.example.com`), de protocole (par ex. `https`) et de port. Par exemple, `www.example.com:81` n'est pas la même origine que `www.example.com`. Ces trois éléments doivent correspondre pour que deux pages Web soient considérées comme ayant la même origine. Sans cette protection, une page Web malveillante pourrait compromettre l'intégrité d'une autre page.

Dans V8, une "origine" est définie comme un contexte. Par défaut, l'accès à tout contexte autre que celui depuis lequel vous effectuez l'appel n'est pas autorisé. Pour accéder à un contexte autre que celui depuis lequel vous effectuez l'appel, vous devez utiliser des jetons de sécurité ou des callbacks de sécurité. Un jeton de sécurité peut être n'importe quelle valeur, mais est généralement un symbole, une chaîne canonique qui n'existe nulle part ailleurs. Vous pouvez éventuellement spécifier un jeton de sécurité avec `SetSecurityToken` lorsque vous configurez un contexte. Si vous ne spécifiez pas de jeton de sécurité, V8 en générera automatiquement un pour le contexte que vous créez.

Lorsqu'une tentative est faite pour accéder à une variable globale, le système de sécurité de V8 vérifie d'abord le jeton de sécurité de l'objet global auquel on essaie d'accéder par rapport au jeton de sécurité du code tentant d'accéder à l'objet global. Si les jetons correspondent, l'accès est accordé. Si les jetons ne correspondent pas, V8 effectue un rappel pour vérifier si l'accès doit être autorisé. Vous pouvez spécifier si l'accès à un objet doit être autorisé en définissant le rappel de sécurité sur l'objet, en utilisant la méthode `SetAccessCheckCallbacks` sur les modèles d'objet. Le système de sécurité de V8 peut alors récupérer le rappel de sécurité de l'objet auquel on accède et l'appeler pour demander si un autre contexte est autorisé à y accéder. Ce rappel reçoit l'objet auquel on accède, le nom de la propriété à laquelle on accède, le type d'accès (lecture, écriture ou suppression par exemple) et retourne s'il faut ou non autoriser l'accès.

Ce mécanisme est implémenté dans Google Chrome de sorte que si les jetons de sécurité ne correspondent pas, un rappel spécial est utilisé pour n'autoriser l'accès qu'aux éléments suivants : `window.focus()`, `window.blur()`, `window.close()`, `window.location`, `window.open()`, `history.forward()`, `history.back()`, et `history.go()`.

### Exceptions

V8 génère une exception si une erreur se produit — par exemple, lorsqu'un script ou une fonction tente de lire une propriété qui n'existe pas, ou si une fonction est appelée alors qu'elle n'est pas une fonction.

V8 renvoie une poignée vide si une opération n’a pas réussi. Il est donc important que votre code vérifie qu'une valeur de retour n'est pas une poignée vide avant de poursuivre l'exécution. Vérifiez une poignée vide avec la fonction membre publique `IsEmpty()` de la classe `Local`.

Vous pouvez attraper les exceptions avec `TryCatch`, par exemple :

```cpp
v8::TryCatch trycatch(isolate);
v8::Local<v8::Value> v = script->Run();
if (v.IsEmpty()) {
  v8::Local<v8::Value> exception = trycatch.Exception();
  v8::String::Utf8Value exception_str(exception);
  printf("Exception : %s\n", *exception_str);
  // ...
}
```

Si la valeur retournée est une poignée vide et que vous n’avez pas de `TryCatch` en place, votre code doit abandonner. Si vous avez un `TryCatch`, l'exception est attrapée et votre code est autorisé à continuer le traitement.

### Héritage

JavaScript est un langage *sans classe*, orienté objet, et en tant que tel, il utilise l'héritage par prototype au lieu de l'héritage classique. Cela peut être déconcertant pour les programmeurs formés aux langages orientés objet conventionnels comme C++ et Java.

Les langages orientés objet basés sur des classes, tels que Java et C++, reposent sur le concept de deux entités distinctes : les classes et les instances. JavaScript est un langage basé sur les prototypes et ne fait donc pas cette distinction : il a simplement des objets. JavaScript ne prend pas en charge nativement la déclaration de hiérarchies de classes ; cependant, le mécanisme des prototypes de JavaScript simplifie le processus d’ajout de propriétés et de méthodes personnalisées à toutes les instances d’un objet. En JavaScript, vous pouvez ajouter des propriétés personnalisées aux objets. Par exemple :

```js
// Créer un objet nommé `bicycle`.
function bicycle() {}
// Créer une instance de `bicycle` appelée `roadbike`.
var roadbike = new bicycle();
// Définir une propriété personnalisée, `wheels`, sur `roadbike`.
roadbike.wheels = 2;
```

Une propriété personnalisée ajoutée de cette manière n'existe que pour cette instance de l'objet. Si nous créons une autre instance de `bicycle()` appelée `mountainbike` par exemple, `mountainbike.wheels` renverrait `undefined` sauf si la propriété `wheels` est explicitement ajoutée.

Parfois, c'est exactement ce qui est requis, d'autres fois il serait utile d'ajouter la propriété personnalisée à toutes les instances d'un objet - après tout, tous les vélos ont des roues. C'est là que l'objet prototype de JavaScript est très utile. Pour utiliser l'objet prototype, faites référence au mot-clé `prototype` sur l'objet avant d'ajouter la propriété personnalisée comme suit :

```js
// Tout d'abord, créer l'objet “bicycle”
function bicycle() {}
// Assigner la propriété wheels au prototype de l'objet
bicycle.prototype.wheels = 2;
```

Toutes les instances de `bicycle()` auront désormais la propriété `wheels` prédéfinie.

La même approche est utilisée dans V8 avec les modèles. Chaque `FunctionTemplate` a une méthode `PrototypeTemplate` qui fournit un modèle pour le prototype de la fonction. Vous pouvez définir des propriétés, et associer des fonctions C++ à ces propriétés, sur un `PrototypeTemplate` qui seront alors présentes sur toutes les instances du `FunctionTemplate` correspondant. Par exemple :

```cpp
v8::Local<v8::FunctionTemplate> biketemplate = v8::FunctionTemplate::New(isolate);
biketemplate->PrototypeTemplate().Set(
    v8::String::NewFromUtf8(isolate, "wheels"),
    v8::FunctionTemplate::New(isolate, MyWheelsMethodCallback)->GetFunction()
);
```

Cela fait que toutes les instances de `biketemplate` ont une méthode `wheels` dans leur chaîne de prototypes qui, lorsqu'elle est appelée, fait appeler la fonction C++ `MyWheelsMethodCallback`.

La classe `FunctionTemplate` de V8 fournit la fonction membre publique `Inherit()` que vous pouvez appeler lorsque vous voulez qu'un modèle de fonction hérite d'un autre modèle de fonction, comme suit :

```cpp
void Inherit(v8::Local<v8::FunctionTemplate> parent);
```
