---
title: &apos;Cartes (Classes Cachées) dans V8&apos;
description: &apos;Comment V8 suit et optimise la structure perçue de vos objets ?&apos;
---

Explorons comment V8 construit ses classes cachées. Les principales structures de données sont :

- `Map`: la classe cachée elle-même. C'est la première valeur de pointeur dans un objet et permet donc une comparaison facile pour voir si deux objets ont la même classe.
- `DescriptorArray`: La liste complète des propriétés que cette classe possède avec les informations les concernant. Dans certains cas, la valeur de la propriété est même dans ce tableau.
- `TransitionArray`: Un tableau d'« arêtes » de cette `Map` vers des cartes sœurs. Chaque arête est un nom de propriété, et doit être envisagée comme « si je devais ajouter une propriété avec ce nom à la classe actuelle, vers quelle classe passerais-je ? »

Comme de nombreux objets `Map` n'ont qu'une seule transition vers un autre (c'est-à-dire qu'ils sont des cartes « transitoires », utilisées uniquement en chemin vers autre chose), V8 ne crée pas toujours un `TransitionArray` complet pour ceux-ci. À la place, il établira directement un lien vers cette « prochaine » `Map`. Le système doit faire un peu de plongée dans le `DescriptorArray` de la `Map` pointée pour déterminer le nom attaché à la transition.

C'est un sujet extrêmement riche. Il est également sujet à changement, mais si vous comprenez les concepts de cet article, les changements futurs devraient être compréhensibles de manière incrémentale.

## Pourquoi avoir des classes cachées ?

V8 pourrait fonctionner sans classes cachées, bien sûr. Il traiterait chaque objet comme un sac de propriétés. Cependant, un principe très utile aurait été laissé de côté : le principe de conception intelligente. V8 suppose que vous ne créerez que tant de **différents** types d'objets. Et chaque type d'objet sera utilisé d'une manière qui pourra éventuellement être considérée comme stéréotypée. Je dis « éventuellement être vue » car le langage JavaScript est un langage de script, et non un langage compilé à l'avance. Donc V8 ne sait jamais ce qui va venir ensuite. Pour tirer parti de la conception intelligente (c'est-à-dire l'hypothèse qu'il y a une pensée derrière le code reçu), V8 doit observer et attendre, laissant le sens de la structure s'imprégner. Le mécanisme des classes cachées est le principal moyen d’y parvenir. Bien sûr, cela suppose un mécanisme d'écoute sophistiqué, et ce sont les caches en ligne (ICs) sur lesquelles beaucoup a été écrit.

Alors, si vous êtes convaincu que c'est un travail bon et nécessaire, suivez-moi !

## Un exemple

```javascript
function Peak(name, height, extra) {
  this.name = name;
  this.height = height;
  if (isNaN(extra)) {
    this.experience = extra;
  } else {
    this.prominence = extra;
  }
}

m1 = new Peak("Matterhorn", 4478, 1040);
m2 = new Peak("Wendelstein", 1838, "bon");
```

Avec ce code, nous avons déjà un arbre de cartes intéressant depuis la carte racine (également connue sous le nom de carte initiale) qui est attachée à la fonction `Peak`:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-one.svg" width="400" height="480" alt="Exemple de classe cachée" loading="lazy"/>
</figure>

Chaque boîte bleue est une carte, en commençant par la carte initiale. C'est la carte de l'objet retourné si, d'une manière ou d'une autre, nous parvenions à exécuter la fonction `Peak` sans ajouter une seule propriété. Les cartes suivantes sont celles qui résultent de l'ajout des propriétés données par les noms sur les arêtes entre les cartes. Chaque carte possède une liste des propriétés associées à un objet de cette carte. De plus, elle décrit l'emplacement exact de chaque propriété. Enfin, à partir de l'une de ces cartes, disons, `Map3` qui est la classe cachée de l'objet que vous obtiendrez si vous passez un nombre pour l'argument `extra` dans `Peak()`, vous pouvez suivre un lien retour jusqu'à la carte initiale.

Représentons à nouveau cela avec ces informations supplémentaires. L'annotation (i0), (i1), signifie emplacement des champs dans l'objet 0, 1, etc :

<figure>
  <img src="/_img/docs/hidden-classes/drawing-two.svg" width="400" height="480" alt="Exemple de classe cachée" loading="lazy"/>
</figure>

Maintenant, si vous passez du temps à examiner ces cartes avant d'avoir créé au moins 7 objets `Peak`, vous rencontrerez le **suivi de relâchement** qui peut être déroutant. J'ai [un autre article](https://v8.dev/blog/slack-tracking) à ce sujet. Créez simplement 7 objets supplémentaires et ce sera fini. À ce stade, vos objets Peak auront exactement 3 propriétés dans l'objet, sans possibilité d'en ajouter directement davantage dans l'objet. Toute propriété supplémentaire sera transférée dans le stockage de sauvegarde des propriétés de l'objet. Il s'agit simplement d'un tableau de valeurs de propriété, dont l'index provient de la carte (Enfin, techniquement, du `DescriptorArray` attaché à la carte). Ajoutons une propriété à `m2` sur une nouvelle ligne, et regardons à nouveau l'arbre des cartes :

```javascript
m2.cost = "un bras, une jambe";
```

<figure>
  <img src="/_img/docs/hidden-classes/drawing-three.svg" width="400" height="480" alt="Exemple de classe cachée" loading="lazy"/>
</figure>

J'ai glissé quelque chose ici. Remarquez que toutes les propriétés sont annotées avec "const", ce qui signifie que du point de vue de V8, personne ne les a jamais modifiées depuis le constructeur, donc elles peuvent être considérées comme constantes une fois initialisées. TurboFan (le compilateur d'optimisation) adore cela. Supposons que `m2` est référencé comme une constante globale par une fonction. Ensuite, la recherche de `m2.cost` peut être effectuée au moment de la compilation, car le champ est marqué comme constant. Je reviendrai sur cela plus tard dans l'article.

Remarquez que la propriété "cost" est marquée comme `const p0`, ce qui signifie que c'est une propriété constante stockée à l'index zéro dans le **stockage de sauvegarde des propriétés** plutôt que directement dans l'objet. Cela est dû au fait que nous n'avons plus de place dans l'objet. Cette information est visible dans `%DebugPrint(m2)`:

```
d8> %DebugPrint(m2);
DebugPrint: 0x2f9488e9: [JS_OBJECT_TYPE]
 - map: 0x219473fd <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x2f94876d <Object map = 0x21947335>
 - elements: 0x419421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x2f94aecd <PropertyArray[3]> {
    0x419446f9: [String] in ReadOnlySpace: #name: 0x237125e1
        <String[11]: #Wendelstein> (const data field 0)
    0x23712581: [String] in OldSpace: #height:
        1838 (const data field 1)
    0x23712865: [String] in OldSpace: #experience: 0x237125f9
        <String[4]: #good> (const data field 2)
    0x23714515: [String] in OldSpace: #cost: 0x23714525
        <String[16]: #one arm, one leg>
        (const data field 3) properties[0]
 }
 ...
{name: "Wendelstein", height: 1, experience: "good", cost: "one arm, one leg"}
d8>
```

Vous pouvez voir que nous avons 4 propriétés, toutes marquées comme constantes. Les trois premières dans l'objet et la dernière dans `properties[0]`, ce qui signifie le premier emplacement du stockage de sauvegarde des propriétés. Nous pouvons examiner cela :

```
d8> %DebugPrintPtr(0x2f94aecd)
DebugPrint: 0x2f94aecd: [PropertyArray]
 - map: 0x41942be9 <Map>
 - length: 3
 - hash: 0
         0: 0x23714525 <String[16]: #one arm, one leg>
       1-2: 0x41942329 <undefined>
```

Les propriétés supplémentaires sont là au cas où vous décideriez d'en ajouter soudainement d'autres.

## La véritable structure

Il y a différentes choses que nous pourrions faire à ce stade, mais puisque vous devez vraiment apprécier V8, ayant lu jusqu'ici, je voudrais essayer de dessiner les véritables structures de données que nous utilisons, celles mentionnées au début, comme `Map`, `DescriptorArray` et `TransitionArray`. Maintenant que vous avez une idée du concept de classe cachée construit en coulisse, vous pouvez rapprocher votre réflexion du code grâce aux noms et structures appropriés. Permettez-moi de tenter de reproduire cette dernière image dans la représentation de V8. Je vais d'abord dessiner les **DescriptorArrays**, qui contiennent la liste des propriétés pour une `Map` donnée. Ces tableaux peuvent être partagés -- la clé est que la `Map` elle-même sait combien de propriétés elle est autorisée à examiner dans le `DescriptorArray`. Étant donné que les propriétés sont dans l'ordre dans lequel elles ont été ajoutées au fil du temps, ces tableaux peuvent être partagés par plusieurs maps. Voyez :

<figure>
  <img src="/_img/docs/hidden-classes/drawing-four.svg" width="600" height="480" alt="Exemple de classe cachée" loading="lazy"/>
</figure>

Remarquez que **Map1**, **Map2** et **Map3** pointent tous vers **DescriptorArray1**. Le nombre à côté du champ "descriptors" dans chaque Map indique combien de champs dans le DescriptorArray appartiennent à la Map. Ainsi **Map1**, qui ne connaît que la propriété "name", regarde uniquement la première propriété listée dans **DescriptorArray1**. Alors que **Map2** a deux propriétés, "name" et "height". Elle examine donc les premier et deuxième éléments de **DescriptorArray1** (name et height). Ce type de partage économise beaucoup d'espace.

Naturellement, nous ne pouvons pas partager lorsqu'il y a une bifurcation. Il y a une transition de Map2 vers Map4 si la propriété "experience" est ajoutée, et vers Map3 si la propriété "prominence" est ajoutée. Vous pouvez voir Map4 et Map5 partager DescriptorArray2 de la même manière que DescriptorArray1 était partagé parmi trois Maps.

La seule chose manquant à notre diagramme "fidèle à la réalité" est le `TransitionArray`, qui reste encore métaphorique à ce stade. Changeons cela. J'ai pris la liberté de supprimer les lignes en **retour arrière**, ce qui nettoie un peu les choses. Rappelez-vous simplement que depuis n'importe quelle Map dans l'arbre, vous pouvez également remonter dans l'arbre.

<figure>
  <img src="/_img/docs/hidden-classes/drawing-five.svg" width="600" height="480" alt="Exemple de classe cachée" loading="lazy"/>
</figure>

Le diagramme mérite d'être étudié. **Question : que se passerait-il si une nouvelle propriété "rating" était ajoutée après "name" au lieu de poursuivre avec "height" et les autres propriétés ?**

**Réponse** : Map1 obtiendrait un véritable **TransitionArray** afin de suivre la bifurcation. Si la propriété *height* est ajoutée, nous devrions passer à **Map2**. Cependant, si la propriété *rating* est ajoutée, nous devrions aller vers une nouvelle map, **Map6**. Cette map aurait besoin d'un nouveau DescriptorArray qui mentionne *name* et *rating*. L'objet dispose de slots libres supplémentaires à ce stade (seulement un des trois est utilisé), donc la propriété *rating* recevra l'un de ces slots.

*J'ai vérifié ma réponse avec l'aide de `%DebugPrintPtr()` et j'ai dessiné ce qui suit :*

<figure>
  <img src="/_img/docs/hidden-classes/drawing-six.svg" width="500" height="480" alt="Exemple de classe cachée" loading="lazy"/>
</figure>

Pas besoin de me supplier d'arrêter, je vois que c'est la limite supérieure de tels diagrammes ! Mais je pense que vous pouvez avoir une idée de la façon dont les parties bougent. Imaginez seulement si, après avoir ajouté cette propriété factice *rating*, nous continuions avec *height*, *experience* et *cost*. Eh bien, nous devrions créer des cartes **Map7**, **Map8** et **Map9**. Parce que nous avons insisté pour ajouter cette propriété au milieu d'une chaîne de cartes déjà établie, nous dupliquerons beaucoup de structures. Je n'ai pas le cœur de faire ce dessin — mais si vous me l'envoyez, je l'ajouterai à ce document :).

J'ai utilisé le pratique projet [DreamPuf](https://dreampuf.github.io/GraphvizOnline) pour produire facilement les diagrammes. Voici un [lien](https://dreampuf.github.io/GraphvizOnline/#digraph%20G%20%7B%0A%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%233F53FF%22%5D%0A%20%20edge%20%5Bfontname%3DHelvetica%5D%0A%20%20%0A%20%20Map0%20%5Blabel%3D%22%7B%3Ch%3E%20Map0%20%7C%20%3Cd%3E%20descriptors%20(0)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map1%20%5Blabel%3D%22%7B%3Ch%3E%20Map1%20%7C%20%3Cd%3E%20descriptors%20(1)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map2%20%5Blabel%3D%22%7B%3Ch%3E%20Map2%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(2)%7D%22%5D%3B%0A%20%20Map3%20%5Blabel%3D%22%7B%3Ch%3E%20Map3%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map4%20%5Blabel%3D%22%7B%3Ch%3E%20Map4%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%0A%20%20Map5%20%5Blabel%3D%22%7B%3Ch%3E%20Map5%20%7C%20%3Cd%3E%20descriptors%20(4)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map6%20%5Blabel%3D%22%7B%3Ch%3E%20Map6%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%3B%0A%20%20Map0%3At%20-%3E%20Map1%20%5Blabel%3D%22name%20(inferred)%22%5D%3B%0A%20%20%0A%20%20Map4%3At%20-%3E%20Map5%20%5Blabel%3D%22cost%20(inferred)%22%5D%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20descriptor%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22black%22%2C%20style%3Dfilled%2C%20color%3D%22%23FFB34D%22%5D%3B%0A%20%20%0A%20%20DA0%20%5Blabel%3D%22%7BDescriptorArray0%20%7C%20(empty)%7D%22%5D%0A%20%20Map0%3Ad%20-%3E%20DA0%3B%0A%20%20DA1%20%5Blabel%3D%22%7BDescriptorArray1%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20prominence%20(const%20i2)%7D%22%5D%3B%0A%20%20Map1%3Ad%20-%3E%20DA1%3B%0A%20%20Map2%3Ad%20-%3E%20DA1%3B%0A%20%20Map3%3Ad%20-%3E%20DA1%3B%0A%20%20%0A%20%20DA2%20%5Blabel%3D%22%7BDescriptorArray2%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20experience%20(const%20i2)%20%7C%20cost%20(const%20p0)%7D%22%5D%3B%0A%20%20Map4%3Ad%20-%3E%20DA2%3B%0A%20%20Map5%3Ad%20-%3E%20DA2%3B%0A%20%20%0A%20%20DA3%20%5Blabel%3D%22%7BDescriptorArray3%20%7C%20name%20(const%20i0)%20%7C%20rating%20(const%20i1)%7D%22%5D%3B%0A%20%20Map6%3Ad%20-%3E%20DA3%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20transition%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%23B3813E%22%5D%3B%0A%20%20TA0%20%5Blabel%3D%22%7BTransitionArray0%20%7C%20%3Ca%3E%20experience%20%7C%20%3Cb%3E%20prominence%7D%22%5D%3B%0A%20%20Map2%3At%20-%3E%20TA0%3B%0A%20%20TA0%3Aa%20-%3E%20Map4%3Ah%3B%0A%20%20TA0%3Ab%20-%3E%20Map3%3Ah%3B%0A%20%20%0A%20%20TA1%20%5Blabel%3D%22%7BTransitionArray1%20%7C%20%3Ca%3E%20rating%20%7C%20%3Cb%3E%20height%7D%22%5D%3B%0A%20%20Map1%3At%20-%3E%20TA1%3B%0A%20%20TA1%3Ab%20-%3E%20Map2%3B%0A%20%20TA1%3Aa%20-%3E%20Map6%3B%0A%7D) vers le diagramme précédent.

## TurboFan et les propriétés const

Jusqu'à présent, tous ces champs sont marqués dans le `DescriptorArray` comme `const`. Jouons avec cela. Exécutez le code suivant sur une version de débogage :

```javascript
// à exécuter comme :
// d8 --allow-natives-syntax --no-lazy-feedback-allocation --code-comments --print-opt-code
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

let m1 = new Peak("Matterhorn", 4478);
m2 = new Peak("Wendelstein", 1838);

// Assurez-vous que le suivi des marges se termine.
for (let i = 0; i < 7; i++) new Peak("blah", i);

m2.cost = "un bras, une jambe";
function foo(a) {
  return m2.cost;
}

foo(3);
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

Vous obtiendrez un listing de la fonction optimisée `foo()`. Le code est très court. Vous verrez à la fin de la fonction :

```
...
40  mov eax,0x2a812499          ;; objet : 0x2a812499 <String[16]: #un bras, une jambe>
45  mov esp,ebp
47  pop ebp
48  ret 0x8                     ;; retourne "un bras, une jambe" !
```

TurboFan, étant un petit malin, a directement inséré la valeur de `m2.cost`. Qu'en pensez-vous ?

Bien sûr, après ce dernier appel à `foo()`, vous pourriez insérer cette ligne :

```javascript
m2.cost = "inestimable";
```

Que pensez-vous qu'il se passe ? Une chose est sûre : nous ne pouvons pas laisser `foo()` tel quel. Il renverrait une réponse erronée. Re-exécutez le programme, mais ajoutez l'option `--trace-deopt` pour être informé lorsque le code optimisé est retiré du système. Après l'impression du `foo()` optimisé, vous verrez ces lignes :

```
[marking dependent code 0x5c684901 0x21e525b9 <SharedFunctionInfo foo> (opt #0) for deoptimization,
    reason: field-const]
[deoptimize marked code in all contexts]
```

Wow.

<figure>
  <img src="/_img/docs/hidden-classes/i_like_it_a_lot.gif" width="440" height="374" alt="J'aime beaucoup cela" loading="lazy"/>
</figure>

Si vous forcez la ré-optimisation, vous obtiendrez un code qui n'est pas aussi performant, mais qui bénéficie malgré tout largement de la structure Map que nous avons décrite. Rappelez-vous de nos diagrammes où la propriété *cost* est la première propriété dans
le magasin de propriétés d'un objet. Eh bien, elle peut avoir perdu sa désignation const, mais nous avons toujours son adresse. En gros, dans un objet avec la map **Map5**, que nous allons certainement vérifier que la variable globale `m2` possède toujours, il suffit--

1. de charger le magasin de propriétés, et
2. de lire le premier élément du tableau.

Voyons cela. Ajoutez ce code sous la dernière ligne :

```javascript
// Forcez la ré-optimisation de foo().
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

Maintenant, regardons le code produit :

```
...
40  mov ecx,0x42cc8901          ;; objet : 0x42cc8901 <Peak map = 0x3d5873ad>
45  mov ecx,[ecx+0x3]           ;; Chargez le magasin de propriétés
48  mov eax,[ecx+0x7]           ;; Obtenez le premier élément.
4b  mov esp,ebp
4d  pop ebp
4e  ret 0x8                     ;; retournez-le dans le registre eax !
```

Eh bien. C'est exactement ce que nous avons dit qu'il devrait se passer. Peut-être que nous commençons à comprendre.

TurboFan est également assez intelligent pour se désoptimiser si la variable `m2` change jamais de classe. Vous pouvez regarder le dernier code optimisé se désoptimiser à nouveau avec quelque chose de drôle comme :

```javascript
m2 = 42;  // héhé.
```

## Où aller à partir d'ici

De nombreuses options. Migration de map. Mode dictionnaire (alias "mode lent"). Plein de choses à explorer dans ce domaine et j'espère que vous vous amusez autant que moi -- merci de votre lecture !
