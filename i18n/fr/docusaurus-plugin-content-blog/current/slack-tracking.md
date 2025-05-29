---
title: &apos;Suivi de slack dans V8&apos;
author: &apos;Michael Stanton ([@alpencoder](https://twitter.com/alpencoder)), maître renommé du *slack*&apos;
description: &apos;Un regard détaillé sur le mécanisme de suivi de slack de V8.&apos;
avatars:
 - &apos;michael-stanton&apos;
date: 2020-09-24 14:00:00
tags:
 - internals
---
Le suivi de slack est un moyen de donner aux nouveaux objets une taille initiale qui est **plus grande que ce qu&apos;ils peuvent réellement utiliser**, afin qu&apos;ils puissent avoir de nouvelles propriétés ajoutées rapidement. Et ensuite, après un certain temps, de **rendre magiquement cet espace inutilisé au système**. Sympa, non ?

<!--truncate-->
C&apos;est particulièrement utile car JavaScript n&apos;a pas de classes statiques. Le système ne peut jamais voir "d&apos;un coup d&apos;œil" combien de propriétés vous avez. Le moteur les expérimente une par une. Ainsi, lorsque vous lisez :

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak(&apos;Matterhorn&apos;, 4478);
```

Vous pourriez penser que le moteur dispose de tout ce dont il a besoin pour bien fonctionner — après tout, vous lui avez dit que l&apos;objet avait deux propriétés. Cependant, V8 n&apos;a vraiment aucune idée de ce qui va suivre. Cet objet `m1` pourrait être passé à une autre fonction qui lui ajoute 10 autres propriétés. Le suivi de slack répond à ce besoin d&apos;être réactif à ce qui vient ensuite dans un environnement sans compilation statique pour déduire la structure globale. C&apos;est comme de nombreux autres mécanismes dans V8, dont la base est uniquement les choses que l&apos;on peut généralement dire sur l&apos;exécution, comme :

- La plupart des objets meurent bientôt, peu vivent longtemps — l&apos;hypothèse de &quot;génération de la collecte des ordures&quot;.
- Le programme a effectivement une structure organisationnelle — nous construisons [des formes ou "classes cachées"](https://mathiasbynens.be/notes/shapes-ics) (nous appelons ces **maps** dans V8) dans les objets que nous voyons le programmeur utiliser parce que nous croyons qu&apos;ils seront utiles. *Au fait, [Propriétés rapides dans V8](/blog/fast-properties) est un excellent article avec des détails intéressants sur les maps et l&apos;accès aux propriétés.*
- Les programmes ont un état d&apos;initialisation, où tout est nouveau et il est difficile de dire ce qui est important. Plus tard, les classes et les fonctions importantes peuvent être identifiées à travers leur utilisation régulière — notre régime de feedback et le pipeline de compilation découlent de cette idée.

Enfin, et surtout, l&apos;environnement à l&apos;exécution doit être très rapide, sinon nous ne faisons que philosopher.

Maintenant, V8 pourrait simplement stocker les propriétés dans un stockage auxiliaire attaché à l&apos;objet principal. Contrairement aux propriétés qui résident directement dans l&apos;objet, ce stockage auxiliaire peut croître indéfiniment grâce à la copie et au remplacement du pointeur. Cependant, l&apos;accès le plus rapide à une propriété provient du fait d&apos;éviter cette indirection et de regarder un offset fixe depuis le début de l&apos;objet. Ci-dessous, je montre la disposition d&apos;un objet JavaScript classique dans le tas V8 avec deux propriétés dans l&apos;objet. Les trois premiers mots sont standard dans chaque objet (un pointeur vers le map, le stockage auxiliaire des propriétés et le stockage auxiliaire des éléments). Vous pouvez voir que l&apos;objet ne peut pas "croître" car il est juste à côté du prochain objet dans le tas :

![](/_img/slack-tracking/property-layout.svg)

:::note
**Note :** J&apos;ai omis les détails du stockage auxiliaire des propriétés parce que la seule chose importante à ce sujet pour le moment est qu&apos;il peut être remplacé à tout moment par un plus grand. Cependant, lui aussi est un objet sur le tas V8 et possède un pointeur map comme tous les objets qui y résident.
:::

Donc, en raison des performances offertes par les propriétés dans l&apos;objet, V8 est prêt à vous donner un espace supplémentaire dans chaque objet, et **le suivi de slack** est la façon dont cela est fait. Finalement, vous vous calmerez, cesserez d&apos;ajouter de nouvelles propriétés et commencerez à miner du bitcoin ou autre chose.

Combien de « temps » V8 vous donne-t-il ? Habilement, il prend en compte le nombre de fois où vous avez construit un objet particulier. En fait, il y a un compteur dans le map, et il est initialisé avec l&apos;un des nombres magiques les plus mystiques du système : **sept**.

Une autre question : comment V8 sait-il combien d&apos;espace supplémentaire dans le corps de l&apos;objet fournir ? En fait, il obtient un indice du processus de compilation, qui propose un nombre estimé de propriétés pour commencer. Ce calcul inclut le nombre de propriétés de l&apos;objet prototype, en remontant la chaîne de prototypes de manière récursive. Enfin, pour faire bonne mesure, il ajoute **huit** supplémentaires (un autre nombre magique !). Vous pouvez le voir dans `JSFunction::CalculateExpectedNofProperties()`:

```cpp
int JSFunction::CalculateExpectedNofProperties(Isolate* isolate,
                                               Handle<JSFunction> function) {
  int expected_nof_properties = 0;
  for (PrototypeIterator iter(isolate, function, kStartAtReceiver);
       !iter.IsAtEnd(); iter.Advance()) {
    Handle<JSReceiver> current =
        PrototypeIterator::GetCurrent<JSReceiver>(iter);
    if (!current->IsJSFunction()) break;
    Handle<JSFunction> func = Handle<JSFunction>::cast(current);

    // Le constructeur super devrait être compilé pour le nombre
    // attendu de propriétés disponibles.
    Handle<SharedFunctionInfo> spécifique(func->shared(), isolate);
    IsCompiledScope est_scope_compilé(specific->is_compiled_scope(isolate));
    si (est_scope_compilé.est_compilé() ||
        Compiler::Compile(func, Compiler::CLEAR_EXCEPTION,
                          &est_scope_compilé)) {
      DCHECK(specific->est_compilé());
      int nombre = specific->expected_nof_properties();
      // Vérifiez que l'estimation est sensée.
      si (expected_nof_properties <= JSObject::kMaxInObjectProperties - nombre) {
        expected_nof_properties += nombre;
      } sinon {
        revenir JSObject::kMaxInObjectProperties;
      }
    } sinon {
      // En cas d'erreur de compilation, continuez l'itération au cas où il
      // y aurait une fonction intégrée dans la chaîne de prototypes qui
      // nécessiterait un certain nombre de propriétés intégrées.
      continuer;
    }
  }
  // Le suivi d'espace libre dans l'objet récupérera plus tard l'espace
  // dans l'objet redondant, donc nous pouvons nous permettre d'ajuster
  // l'estimation généreusement, ce qui signifie que nous surallouons
  // d'au moins 8 emplacements au début.
  si (expected_nof_properties > 0) {
    expected_nof_properties += 8;
    si (expected_nof_properties > JSObject::kMaxInObjectProperties) {
      expected_nof_properties = JSObject::kMaxInObjectProperties;
    }
  }
  revenir expected_nof_properties;
}
```

Examinons notre objet `m1` d'avant :

```js
function Peak(nom, hauteur) {
  this.nom = nom;
  this.hauteur = hauteur;
}

const m1 = new Peak(&apos;Matterhorn&apos;, 4478);
```

D'après le calcul dans `JSFunction::CalculateExpectedNofProperties` et notre fonction `Peak()`, nous devrions avoir 2 propriétés intégrées, et grâce au suivi d'espace libre, 8 supplémentaires. Nous pouvons imprimer `m1` avec `%DebugPrint()` (_cette fonction bien utile expose la structure de mappage. Vous pouvez l'utiliser en exécutant `d8` avec l'option `--allow-natives-syntax`_) :

```
> %DebugPrint(m1);
DebugPrint: 0x49fc866d: [JS_OBJECT_TYPE]
 - map: 0x58647385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - éléments: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - propriétés: 0x28c821a1 <FixedArray[0]> {
    0x28c846f9: [String] dans ReadOnlySpace: #name: 0x5e412439 <String[10]: #Matterhorn> (champ de données const 0)
    0x5e412415: [String] dans OldSpace: #height: 4478 (champ de données const 1)
 }
  0x58647385: [Map]
 - type: JS_OBJECT_TYPE
 - taille d'instance : 52
 - propriétés dans l'objet : 10
 - type d'éléments : HOLEY_ELEMENTS
 - champs de propriétés inutilisés : 8
 - longueur d'énumération : invalide
 - map stable
 - pointeur arrière : 0x5864735d <Map(HOLEY_ELEMENTS)>
 - cellule de validité de prototype : 0x5e4126fd <Cell valeur= 0>
 - descripteurs d'instance (propre) #2 : 0x49fc8701 <DescriptorArray[2]>
 - prototype : 0x49fc85e9 <Object map = 0x58647335>
 - constructeur : 0x5e4125ed <JSFunction Peak (sfi = 0x5e4124dd)>
 - code dépendant : 0x28c8212d <Autre objet de tas (WEAK_FIXED_ARRAY_TYPE)>
 - compteur de construction : 6
```

Remarquez que la taille de l'instance de l'objet est de 52. La disposition des objets dans V8 est comme suit :

| mot-clé | quoi                                                  |
| ---- | ---------------------------------------------------- |
| 0    | la carte                                              |
| 1    | pointeur vers le tableau de propriétés                |
| 2    | pointeur vers le tableau d'éléments                  |
| 3    | champ intégré 1 (pointeur vers chaîne `"Matterhorn"`) |
| 4    | champ intégré 2 (valeur entière `4478`)              |
| 5    | champ intégré inutilisé 3                             |
| …    | …                                                    |
| 12   | champ intégré inutilisé 10                            |

La taille du pointeur est de 4 dans ce binaire 32 bits, donc nous avons ces 3 mots initiaux que chaque objet JavaScript ordinaire possède, et ensuite 10 mots supplémentaires dans l'objet. Il nous informe ci-dessus, utilement, qu'il y a 8 “champs de propriétés inutilisés”. Donc, nous faisons l'expérience du suivi d'espace libre. Nos objets sont gonflés, des consommateurs voraces de précieux octets !

Comment les réduire ? Nous utilisons le champ compteur de construction dans la carte. Nous atteignons zéro et décidons que nous avons fini avec le suivi d'espace libre. Cependant, si vous construisez plus d'objets, vous ne verrez pas le compteur ci-dessus diminuer. Pourquoi ?

Eh bien, c'est parce que la carte affichée ci-dessus n'est pas “la” carte pour un objet `Peak`. Ce n'est qu'une carte feuille dans une chaîne de cartes descendant de la **carte initiale** que l'objet `Peak` reçoit avant d'exécuter le code du constructeur.

Comment trouver la carte initiale ? Heureusement, la fonction `Peak()` a un pointeur vers celle-ci. C'est le compteur de construction dans la carte initiale que nous utilisons pour contrôler le suivi d'espace libre :

```
> %DebugPrint(Peak);
d8> %DebugPrint(Peak)
DebugPrint: 0x31c12561: [Function] dans OldSpace
 - carte : 0x2a2821f5 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype : 0x31c034b5 <JSFunction (sfi = 0x36108421)>
 - prototype de fonction : 0x37449c89 <Object map = 0x2a287335>
 - carte initiale : 0x46f07295 <Map(HOLEY_ELEMENTS)>   // Voici la carte initiale.
 - shared_info : 0x31c12495 <SharedFunctionInfo Peak>
 - nom : 0x31c12405 <String[4]: #Peak>
…

d8> // %DebugPrintPtr vous permet d'imprimer la carte initiale.
d8> %DebugPrintPtr(0x46f07295)
DebugPrint : 0x46f07295 : [Map]
 - type : JS_OBJECT_TYPE
 - taille d'instance : 52
 - propriétés inobject : 10
 - type d'éléments : HOLEY_ELEMENTS
 - champs de propriété inutilisés : 10
 - longueur d'énumération : invalide
 - pointeur de retour : 0x28c02329 <undefined>
 - cellule de validité du prototype : 0x47f0232d <Cell value= 1>
 - descripteurs d'instance (propre) #0 : 0x28c02135 <DescriptorArray[0]>
 - transitions #1 : 0x46f0735d <Map(HOLEY_ELEMENTS)>
     0x28c046f9 : [String] in ReadOnlySpace : #name:
         (transition vers (champ de données constant, attrs : [WEC]) @ Any) ->
             0x46f0735d <Map(HOLEY_ELEMENTS)>
 - prototype : 0x5cc09c7d <Object map = 0x46f07335>
 - constructeur : 0x21e92561 <JSFunction Peak (sfi = 0x21e92495)>
 - code dépendant : 0x28c0212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - compteur de construction : 5
```

Voyez comment le compteur de construction est décrémenté à 5 ? Si vous souhaitez retrouver la carte initiale à partir de la carte à deux propriétés que nous avons montrée ci-dessus, vous pouvez suivre son pointeur de retour à l'aide de `%DebugPrintPtr()` jusqu'à atteindre une carte avec `undefined` dans la case du pointeur de retour. Ce sera cette carte ci-dessus.

Maintenant, un arbre de cartes pousse à partir de la carte initiale, avec une branche pour chaque propriété ajoutée à partir de ce point. Nous appelons ces branches des _transitions_. Dans l'impression ci-dessus de la carte initiale, voyez-vous la transition vers la carte suivante avec le label « name » ? L'ensemble de l'arbre de cartes jusqu'à présent ressemble à ceci :

![(X, Y, Z) signifie (taille d'instance, nombre de propriétés in-object, nombre de propriétés inutilisées).](/_img/slack-tracking/root-map-1.svg)

Ces transitions basées sur des noms de propriétés sont la manière dont la ["taupe aveugle"](https://www.google.com/search?q=blind+mole&tbm=isch) de JavaScript construit ses cartes derrière vous. Cette carte initiale est également stockée dans la fonction `Peak`, donc lorsqu'elle est utilisée comme constructeur, cette carte peut être utilisée pour configurer l'objet `this`.

```js
const m1 = new Peak('Matterhorn', 4478);
const m2 = new Peak('Mont Blanc', 4810);
const m3 = new Peak('Zinalrothorn', 4221);
const m4 = new Peak('Wendelstein', 1838);
const m5 = new Peak('Zugspitze', 2962);
const m6 = new Peak('Watzmann', 2713);
const m7 = new Peak('Eiger', 3970);
```

La chose intéressante ici est qu'après avoir créé `m7`, exécuter `%DebugPrint(m1)` à nouveau produit un résultat merveilleux :

```
DebugPrint : 0x5cd08751 : [JS_OBJECT_TYPE]
 - map : 0x4b387385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype : 0x5cd086cd <Object map = 0x4b387335>
 - éléments : 0x586421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - propriétés : 0x586421a1 <FixedArray[0]> {
    0x586446f9 : [String] in ReadOnlySpace : #name:
        0x51112439 <String[10]: #Matterhorn> (champ de données constant 0)
    0x51112415 : [String] in OldSpace : #height:
        4478 (champ de données constant 1)
 }
0x4b387385 : [Map]
 - type : JS_OBJECT_TYPE
 - taille d'instance : 20
 - propriétés inobject : 2
 - type d'éléments : HOLEY_ELEMENTS
 - champs de propriétés inutilisés : 0
 - longueur d'énumération : invalide
 - carte stable
 - pointeur de retour : 0x4b38735d <Map(HOLEY_ELEMENTS)>
 - cellule de validité du prototype : 0x511128dd <Cell value= 0>
 - descripteurs d'instance (propre) #2 : 0x5cd087e5 <DescriptorArray[2]>
 - prototype : 0x5cd086cd <Object map = 0x4b387335>
 - constructeur : 0x511127cd <JSFunction Peak (sfi = 0x511125f5)>
 - code dépendant : 0x5864212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - compteur de construction : 0
```

La taille de notre instance est désormais de 20, ce qui correspond à 5 mots :

| mot  | quoi                            |
| ---- | ------------------------------- |
| 0    | la carte                        |
| 1    | pointeur vers le tableau de propriétés |
| 2    | pointeur vers le tableau des éléments   |
| 3    | nom                             |
| 4    | hauteur                         |

Vous vous demandez peut-être comment cela s'est produit. Après tout, si cet objet est disposé en mémoire et qu'il avait 10 propriétés, comment le système peut-il tolérer ces 8 mots traînant sans propriétaire ? Il est vrai que nous ne les avons jamais remplis d'informations intéressantes — peut-être que cela peut nous aider.

Si vous vous demandez pourquoi je m'inquiète de laisser ces mots traîner, il y a un contexte à connaître sur le collecteur de déchets. Les objets sont disposés les uns après les autres, et le collecteur de déchets V8 suit les éléments dans cette mémoire en les parcourant encore et encore. En commençant par le premier mot en mémoire, il s'attend à trouver un pointeur vers une carte. Il lit la taille de l'instance à partir de la carte, puis sait à quelle distance avancer jusqu'au prochain objet valide. Pour certaines classes, il doit calculer une longueur supplémentaire, mais c'est tout.

![](/_img/slack-tracking/gc-heap-1.svg)

Dans le schéma ci-dessus, les cases rouges sont les **maps**, et les cases blanches les mots qui remplissent la taille de l'instance de l'objet. Le collecteur de déchets peut "parcourir" le tas en sautant d'une carte à l'autre.

Que se passe-t-il si la carte change soudainement sa taille d'instance ? Maintenant, lorsque le GC (collecteur de déchets) parcourt le tas, il se retrouve à regarder un mot qu'il n'a pas vu auparavant. Dans le cas de notre classe `Peak`, nous passons de 13 mots à seulement 5 (j'ai coloré les mots "propriété inutilisée" en jaune) :

![](/_img/slack-tracking/gc-heap-2.svg)

![](/_img/slack-tracking/gc-heap-3.svg)

Nous pouvons gérer cela si nous initialisons intelligemment ces propriétés inutilisées avec une **"map de remplissage" de taille d'instance 4**. De cette façon, le GC passera légèrement sur elles une fois qu'elles seront exposées au parcours.

![](/_img/slack-tracking/gc-heap-4.svg)

Cela est exprimé dans le code dans `Factory::InitializeJSObjectBody()` :

```cpp
void Factory::InitializeJSObjectBody(Handle<JSObject> obj, Handle<Map> map,
                                     int start_offset) {

  // <lignes supprimées>

  bool in_progress = map->IsInobjectSlackTrackingInProgress();
  Object filler;
  if (in_progress) {
    filler = *one_pointer_filler_map();
  } else {
    filler = *undefined_value();
  }
  obj->InitializeBody(*map, start_offset, *undefined_value(), filler);
  if (in_progress) {
    map->FindRootMap(isolate()).InobjectSlackTrackingStep(isolate());
  }

  // <lignes supprimées>
}
```

Et ainsi, voici le suivi de relâchement en action. Pour chaque classe que vous créez, vous pouvez vous attendre à ce qu'elle occupe plus de mémoire pendant un certain temps, mais à la 7ème instanciation, nous "rendons cela bon" et exposons l'espace laissé pour que le GC le voit. Ces objets d'un mot n'ont pas de propriétaires — c'est-à-dire que personne ne pointe vers eux — donc lorsqu'une collecte a lieu, ils sont libérés et les objets vivants peuvent être compactés pour économiser de l'espace.

Le schéma ci-dessous reflète que le suivi de relâchement est **terminé** pour cette carte initiale. Notez que la taille de l'instance est maintenant de 20 (5 mots : la carte, les tableaux de propriétés et d'éléments, et 2 emplacements supplémentaires). Le suivi de relâchement respecte toute la chaîne depuis la carte initiale. Ainsi, si un descendant de la carte initiale finit par utiliser les 10 propriétés supplémentaires initiales, alors la carte initiale les conserve, les marquant comme inutilisées :

![(X, Y, Z) signifie (taille d'instance, nombre de propriétés dans l'objet, nombre de propriétés inutilisées).](/_img/slack-tracking/root-map-2.svg)

Maintenant que le suivi de relâchement est terminé, que se passe-t-il si nous ajoutons une autre propriété à l'un de ces objets `Peak` ?

```js
m1.country = &apos;Suisse&apos;;
```

V8 doit aller dans le magasin de sauvegarde des propriétés. Nous obtenons la configuration suivante de l'objet :

| mot | valeur                                    |
| ---- | ----------------------------------------- |
| 0    | map                                      |
| 1    | pointeur vers un magasin de sauvegarde de propriétés |
| 2    | pointeur vers les éléments (tableau vide) |
| 3    | pointeur vers la chaîne `"Matterhorn"`     |
| 4    | `4478`                                    |

Le magasin de sauvegarde des propriétés ressemble alors à ceci :

| mot | valeur                                |
| ---- | --------------------------------------- |
| 0    | map                                    |
| 1    | longueur (3)                          |
| 2    | pointeur vers la chaîne `"Suisse"`      |
| 3    | `undefined`                           |
| 4    | `undefined`                           |
| 5    | `undefined`                           |

Nous avons ces valeurs `undefined` supplémentaires là au cas où vous décideriez d'ajouter plus de propriétés. Nous supposerions que vous pourriez, en fonction de votre comportement jusqu'à présent !

## Propriétés facultatives

Il peut arriver que vous ajoutiez des propriétés uniquement dans certains cas. Supposons que si la hauteur est de 4000 mètres ou plus, vous souhaitez suivre deux propriétés supplémentaires, `prominence` et `isClimbed` :

```js
function Peak(name, height, prominence, isClimbed) {
  this.name = name;
  this.height = height;
  if (height >= 4000) {
    this.prominence = prominence;
    this.isClimbed = isClimbed;
  }
}
```

Vous ajoutez quelques variantes différentes :

```js
const m1 = new Peak(&apos;Wendelstein&apos;, 1838);
const m2 = new Peak(&apos;Matterhorn&apos;, 4478, 1040, true);
const m3 = new Peak(&apos;Zugspitze&apos;, 2962);
const m4 = new Peak(&apos;Mont Blanc&apos;, 4810, 4695, true);
const m5 = new Peak(&apos;Watzmann&apos;, 2713);
const m6 = new Peak(&apos;Zinalrothorn&apos;, 4221, 490, true);
const m7 = new Peak(&apos;Eiger&apos;, 3970);
```

Dans ce cas, les objets `m1`, `m3`, `m5` et `m7` ont une carte, et les objets `m2`, `m4` et `m6` possèdent une carte plus loin dans la chaîne des descendants à partir de la carte initiale en raison des propriétés supplémentaires. Une fois que le suivi de relâchement est terminé pour cette famille de cartes, il y a **4** propriétés dans l'objet au lieu de **2** comme auparavant, parce que le suivi de relâchement s'assure de maintenir suffisamment d'espace pour le nombre maximal de propriétés dans l'objet utilisé par les descendants dans l'arbre de cartes sous la carte initiale.

Ci-dessous montre la famille de cartes après l'exécution du code ci-dessus, et bien sûr, le suivi de relâchement est terminé :

![(X, Y, Z) signifie (taille d'instance, nombre de propriétés dans l'objet, nombre de propriétés inutilisées).](/_img/slack-tracking/root-map-3.svg)

## Et pour le code optimisé ?

Compilons du code optimisé avant que le suivi de relâchement ne soit terminé. Nous allons utiliser quelques commandes de syntaxe native pour forcer une compilation optimisée avant la fin du suivi de relâchement :

```js
function foo(a1, a2, a3, a4) {
  return new Peak(a1, a2, a3, a4);
}

%PrepareFunctionForOptimization(foo);
const m1 = foo(&apos;Wendelstein&apos;, 1838);
const m2 = foo(&apos;Matterhorn&apos;, 4478, 1040, true);
%OptimizeFunctionOnNextCall(foo);
foo(&apos;Zugspitze&apos;, 2962);
```

Cela devrait suffire à compiler et exécuter du code optimisé. Nous faisons quelque chose dans TurboFan (le compilateur optimisé) appelé [**Create Lowering**](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-create-lowering.h;l=32;drc=ee9e7e404e5a3f75a3ca0489aaf80490f625ca27), où nous intégrons l'allocation des objets. Cela signifie que le code natif que nous produisons émet des instructions pour demander au GC la taille d'instance de l'objet à allouer et ensuite initialiser soigneusement ces champs. Cependant, ce code serait invalide si le suivi de relâchement s'arrêtait à un moment ultérieur. Que pouvons-nous faire à ce sujet ?

Facile-peasy! Nous terminons simplement le suivi de relâchement tôt pour cette famille de cartes. Cela a du sens car normalement — nous ne compilerions pas une fonction optimisée avant que des milliers d'objets aient été créés. Donc le suivi de relâchement *devrait* être terminé. Si ce n'est pas le cas, tant pis ! L'objet ne doit pas être si important de toute façon si moins de 7 d'entre eux ont été créés à ce stade. (Normalement, rappelez-vous, nous optimisons uniquement après que le programme a fonctionné pendant longtemps.)

### Compilation sur un thread en arrière-plan

Nous pouvons compiler du code optimisé sur le thread principal, auquel cas nous pouvons arrêter prématurément le suivi de relâchement avec quelques appels pour changer la carte initiale car le monde a été arrêté. Cependant, nous effectuons autant de compilation que possible sur un thread en arrière-plan. Depuis ce thread, il serait dangereux de toucher à la carte initiale car elle *pourrait être en train de changer sur le thread principal où JavaScript s'exécute.* Donc notre technique est la suivante :

1. **Deviner** que la taille d'instance sera celle qu'elle serait si vous arrêtiez le suivi de relâchement maintenant. Notez cette taille.
1. Lorsque la compilation est presque terminée, nous revenons au thread principal où nous pouvons en toute sécurité forcer la fin du suivi de relâchement si ce n'était pas déjà fait.
1. Vérifiez : la taille d'instance est-elle celle que nous avons prédite ? Si c'est le cas, **tout est bon !** Sinon, jetez l'objet de code et réessayez plus tard.

Si vous voulez voir cela dans le code, jetez un coup d'œil à la classe [`InitialMapInstanceSizePredictionDependency`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/compilation-dependencies.cc?q=InitialMapInstanceSizePredictionDependency&ss=chromium%2Fchromium%2Fsrc) et à son utilisation dans `js-create-lowering.cc` pour créer des allocations intégrées. Vous verrez que la méthode `PrepareInstall()` est appelée sur le thread principal, ce qui force la fin du suivi de relâchement. Ensuite, la méthode `Install()` vérifie si notre supposition sur la taille d'instance s'est avérée correcte.

Voici le code optimisé avec l'allocation intégrée. Tout d'abord, vous voyez la communication avec le GC, vérifiant si nous pouvons simplement avancer un pointeur de la taille d'instance et le prendre (c'est ce qu'on appelle l'allocation par avance de pointeur). Ensuite, nous commençons à remplir les champs du nouvel objet :

```asm
…
43  mov ecx,[ebx+0x5dfa4]
49  lea edi,[ecx+0x1c]
4c  cmp [ebx+0x5dfa8],edi       ;; hé GC, pouvons-nous avoir 28 (0x1c) octets s'il vous plaît ?
52  jna 0x36ec4a5a  <+0x11a>

58  lea edi,[ecx+0x1c]
5b  mov [ebx+0x5dfa4],edi       ;; d'accord GC, nous l'avons pris. MerciBye.
61  add ecx,0x1                 ;; oh oui. ecx est mon nouvel objet.
64  mov edi,0x46647295          ;; objet : 0x46647295 <Map(HOLEY_ELEMENTS)>
69  mov [ecx-0x1],edi           ;; Stocker la CARTE INITIALE.
6c  mov edi,0x56f821a1          ;; objet : 0x56f821a1 <FixedArray[0]>
71  mov [ecx+0x3],edi           ;; Stocker la sauvegarde des PROPRIÉTÉS (vide)
74  mov [ecx+0x7],edi           ;; Stocker la sauvegarde des ÉLÉMENTS (vide)
77  mov edi,0x56f82329          ;; objet : 0x56f82329 <undefined>
7c  mov [ecx+0xb],edi           ;; propriété dans l'objet 1 <-- undefined
7f  mov [ecx+0xf],edi           ;; propriété dans l'objet 2 <-- undefined
82  mov [ecx+0x13],edi          ;; propriété dans l'objet 3 <-- undefined
85  mov [ecx+0x17],edi          ;; propriété dans l'objet 4 <-- undefined
88  mov edi,[ebp+0xc]           ;; récupérer l'argument {a1}
8b  test_w edi,0x1
90  jz 0x36ec4a6d  <+0x12d>
96  mov eax,0x4664735d          ;; objet : 0x4664735d <Map(HOLEY_ELEMENTS)>
9b  mov [ecx-0x1],eax           ;; pousser la carte vers l'avant
9e  mov [ecx+0xb],edi           ;; name = {a1}
a1  mov eax,[ebp+0x10]          ;; récupérer l'argument {a2}
a4  test al,0x1
a6  jnz 0x36ec4a77  <+0x137>
ac  mov edx,0x46647385          ;; objet : 0x46647385 <Map(HOLEY_ELEMENTS)>
b1  mov [ecx-0x1],edx           ;; pousser la carte vers l'avant
b4  mov [ecx+0xf],eax           ;; height = {a2}
b7  cmp eax,0x1f40              ;; hauteur >= 4000 ?
bc  jng 0x36ec4a32  <+0xf2>
                  -- B8 début --
                  -- B9 début --
c2  mov edx,[ebp+0x14]          ;; récupérer l'argument {a3}
c5  test_b dl,0x1
c8  jnz 0x36ec4a81  <+0x141>
ce  mov esi,0x466473ad          ;; objet : 0x466473ad <Carte(HOLEY_ELEMENTS)>
d3  mov [ecx-0x1],esi           ;; avancer la carte
d6  mov [ecx+0x13],edx          ;; prominence = {a3}
d9  mov esi,[ebp+0x18]          ;; récupérer l'argument {a4}
dc  test_w esi,0x1
e1  jz 0x36ec4a8b  <+0x14b>
e7  mov edi,0x466473d5          ;; objet : 0x466473d5 <Carte(HOLEY_ELEMENTS)>
ec  mov [ecx-0x1],edi           ;; avancer la carte vers la carte feuille
ef  mov [ecx+0x17],esi          ;; isClimbed = {a4}
                  -- Début B10 (déconstruire la trame) --
f2  mov eax,ecx                 ;; préparer le retour de cet objet Peak génial !
…
```

Au fait, pour voir tout cela, vous devez avoir une version de débogage et passer quelques drapeaux. J'ai mis le code dans un fichier et appelé :

```bash
./d8 --allow-natives-syntax --trace-opt --code-comments --print-opt-code mycode.js
```

J'espère que cela a été une exploration amusante. Je tiens à remercier tout particulièrement Igor Sheludko et Maya Armyanova pour avoir (avec patience !) relu ce post.
