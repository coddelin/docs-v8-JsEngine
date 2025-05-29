---
title: 'Publication de V8 version v6.5'
author: 'l'équipe V8'
date: 2018-02-01 13:33:37
tags:
  - publication
description: 'V8 v6.5 ajoute la prise en charge de la compilation WebAssembly en streaming et inclut un nouveau “mode code non fiable”.'
tweet: '959174292406640640'
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est créée depuis le dépôt Git principal de V8 juste avant un jalon de Chrome Beta. Aujourd’hui, nous sommes ravis d’annoncer notre plus récente branche, [V8 version 6.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.5), qui est en phase bêta jusqu’à sa publication en coordination avec Chrome 65 Stable dans quelques semaines. V8 v6.5 est rempli de toutes sortes de nouveautés dédiées aux développeurs. Ce post donne un aperçu de certains des points forts en prévision de la publication.

<!--truncate-->
## Mode code non fiable

En réponse à la dernière attaque spéculative par canal caché appelée Spectre, V8 a introduit un [mode code non fiable](/docs/untrusted-code-mitigations). Si vous intégrez V8 dans votre application, envisagez d’exploiter ce mode dans le cas où votre application traite du code généré par l’utilisateur, et donc non digne de confiance. Notez que ce mode est activé par défaut, y compris dans Chrome.

## Compilation en streaming du code WebAssembly

L’API WebAssembly fournit une fonction spéciale pour prendre en charge la [compilation en streaming](https://developers.google.com/web/updates/2018/04/loading-wasm) en combinaison avec l’API `fetch()` :

```js
const module = await WebAssembly.compileStreaming(fetch('foo.wasm'));
```

Cette API est disponible depuis V8 v6.1 et Chrome 61, bien que l’implémentation initiale ne faisait pas réellement usage de la compilation en streaming. Cependant, avec V8 v6.5 et Chrome 65, nous exploitons cette API et compilons les modules WebAssembly pendant que nous téléchargeons encore les octets du module. Dès que nous téléchargeons tous les octets d’une fonction unique, nous la transmettons à un thread d’arrière-plan pour la compiler.

Nos mesures montrent qu’avec cette API, la compilation WebAssembly dans Chrome 65 peut suivre un débit de téléchargement allant jusqu’à 50 Mbits/s sur des machines haut de gamme. Cela signifie que si vous téléchargez du code WebAssembly à 50 Mbits/s, la compilation de ce code s’achève dès que le téléchargement est terminé.

Pour le graphique ci-dessous, nous mesurons le temps nécessaire pour télécharger et compiler un module WebAssembly de 67 Mo contenant environ 190 000 fonctions. Nous effectuons les mesures avec des vitesses de téléchargement de 25 Mbits/s, 50 Mbits/s et 100 Mbits/s.

![](/_img/v8-release-65/wasm-streaming-compilation.svg)

Lorsque le temps de téléchargement est plus long que le temps de compilation du module WebAssembly, par exemple dans le graphique ci-dessus avec 25 Mbits/s et 50 Mbits/s, alors `WebAssembly.compileStreaming()` termine la compilation presque immédiatement après le téléchargement des derniers octets.

Lorsque le temps de téléchargement est plus court que le temps de compilation, alors `WebAssembly.compileStreaming()` prend à peu près autant de temps que la compilation du module WebAssembly sans téléchargement préalable des octets du module.

## Rapidité

Nous avons poursuivi nos efforts pour élargir le chemin rapide des fonctions intégrées JavaScript en général, en ajoutant un mécanisme pour détecter et prévenir une situation dévastatrice appelée une “boucle de désoptimisation”. Cela se produit lorsque votre code optimisé est désoptimisé, et qu’il est _impossible de déterminer ce qui a mal tourné_. Dans de tels cas, TurboFan continue d’essayer d’optimiser, abandonnant enfin après environ 30 tentatives. Cela se produirait si vous modifiez la structure du tableau dans la fonction de rappel d’une de nos fonctions intégrées de tableau de second ordre. Par exemple, en modifiant la `longueur` du tableau — dans V8 v6.5, nous signalons lorsque cela se produit, et nous cessons d’intégrer la fonction de tableau appelée à cet endroit lors des futures tentatives d’optimisation.

Nous avons également élargi le chemin rapide en intégrant de nombreuses fonctions qui étaient autrefois exclues en raison d’un effet secondaire entre le chargement de la fonction à appeler et l’appel lui-même, comme un appel de fonction. Et `String.prototype.indexOf` a obtenu une [amélioration de 10× des performances des appels de fonction](https://bugs.chromium.org/p/v8/issues/detail?id=6270).

Dans V8 v6.4, nous avions intégré la prise en charge de `Array.prototype.forEach`, `Array.prototype.map` et `Array.prototype.filter`. Dans V8 v6.5, nous avons ajouté une prise en charge intégrée pour :

- `Array.prototype.reduce`
- `Array.prototype.reduceRight`
- `Array.prototype.find`
- `Array.prototype.findIndex`
- `Array.prototype.some`
- `Array.prototype.every`

De plus, nous avons élargi le chemin rapide pour toutes ces fonctions intégrées. Au début, nous évitions de traiter les tableaux contenant des nombres en virgule flottante, ou (encore plus d’évitement) [si les tableaux contenaient des “trous” dans leur contenu](/blog/elements-kinds), par exemple `[3, 4.5, , 6]`. Maintenant, nous gérons les tableaux creux avec des nombres en virgule flottante partout, sauf dans `find` et `findIndex`, où la spécification exige de convertir les trous en `undefined`, ce qui complique nos efforts (_pour le moment…!_).

L'image suivante montre le delta d'amélioration par rapport à V8 v6.4 dans nos builtins intégrés, réparti en tableaux d'entiers, tableaux de doubles et tableaux de doubles avec des trous. Le temps est en millisecondes.

![Améliorations des performances depuis V8 v6.4](/_img/v8-release-65/performance-improvements.svg)

## API V8

Veuillez utiliser `git log branch-heads/6.4..branch-heads/6.5 include/v8.h` pour obtenir une liste des changements dans l'API.

Les développeurs avec un [dépôt actif de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 6.5 -t branch-heads/6.5` pour expérimenter avec les nouvelles fonctionnalités de V8 v6.5. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
