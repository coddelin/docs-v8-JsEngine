---
title: 'Version V8 v6.2 publiée'
author: 'équipe V8'
date: 2017-09-11 13:33:37
tags:
  - publication
description: 'V8 v6.2 inclut des améliorations de performance, de nouvelles fonctionnalités du langage JavaScript, une longueur maximale de chaîne augmentée, et plus encore.'
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est déviée du maître Git de V8 juste avant un jalon Chrome Beta. Aujourd'hui, nous sommes ravis d'annoncer notre dernière branche, [Version 6.2 de V8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.2), qui est en version bêta jusqu'à sa publication en coordination avec Chrome 62 Stable dans quelques semaines. V8 v6.2 est rempli de toutes sortes de nouveautés à destination des développeurs. Cet article offre un aperçu de certains points forts en anticipation de la publication.

<!--truncate-->
## Améliorations de performance

La performance de [`Object#toString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString) avait déjà été identifiée comme un goulet d'étranglement potentiel, car elle est souvent utilisée par des bibliothèques populaires comme [lodash](https://lodash.com/) et [underscore.js](http://underscorejs.org/), et des frameworks comme [AngularJS](https://angularjs.org/). Diverses fonctions utilitaires comme [`_.isPlainObject`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isPlainObject.js#L13-L50), [`_.isDate`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isDate.js#L8-L25), [`angular.isArrayBuffer`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L739-L741) ou [`angular.isRegExp`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L680-L689) sont souvent utilisées dans le code des applications et des bibliothèques pour effectuer des vérifications de type à l'exécution.

Avec l'avènement de ES2015, `Object#toString` est devenu patchable à chaud via le nouveau symbole [`Symbol.toStringTag`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag), ce qui a également rendu `Object#toString` plus lourd et plus difficile à accélérer. Dans cette version, nous avons porté une optimisation initialement mise en œuvre dans le [moteur JavaScript SpiderMonkey](https://bugzilla.mozilla.org/show_bug.cgi?id=1369042#c0) à V8, augmentant le débit de `Object#toString` d'un facteur de **6,5×**.

![](/_img/v8-release-62/perf.svg)

Cela a également un impact sur le benchmark de navigateur Speedometer, en particulier le sous-test AngularJS, où nous avons mesuré une solide amélioration de 3 %. Lisez l'[article détaillé](https://ponyfoo.com/articles/investigating-performance-object-prototype-to-string-es2015) pour plus d'informations.

![](/_img/v8-release-62/speedometer.svg)

Nous avons également considérablement amélioré la performance des [proxies de ES2015](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), accélérant les appels à un objet proxy via `someProxy(params)` ou `new SomeOtherProxy(params)` jusqu'à **5×** :

![](/_img/v8-release-62/proxy-call-construct.svg)

De même, la performance de l'accès à une propriété sur un objet proxy via `someProxy.property` s'est améliorée de presque **6,5×** :

![](/_img/v8-release-62/proxy-property.svg)

Cela fait partie d'un stage en cours. Restez à l'écoute pour un article plus détaillé et les résultats finaux.

Nous sommes également ravis d'annoncer que grâce aux [contributions](https://chromium-review.googlesource.com/c/v8/v8/+/620150) de [Peter Wong](https://twitter.com/peterwmwong), la performance de la fonction intégrée [`String#includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes) s'est améliorée de plus de **3×** depuis la version précédente.

Les recherches par hachage pour les tables de hachage internes sont devenues beaucoup plus rapides, entraînant une amélioration de la performance pour `Map`, `Set`, `WeakMap` et `WeakSet`. Un article de blog à venir expliquera cette optimisation en détail.

![](/_img/v8-release-62/hashcode-lookups.png)

Le ramasse-miettes utilise désormais un [Scavenger parallèle](https://bugs.chromium.org/p/chromium/issues/detail?id=738865) pour collecter la soi-disant jeune génération du tas.

## Mode mémoire faible amélioré

Au cours des dernières versions, le mode mémoire faible de V8 a été amélioré (par exemple en [réglant la taille initiale de l’espace semi à 512 Ko](https://chromium-review.googlesource.com/c/v8/v8/+/594387)). Les appareils à faible mémoire rencontrent désormais moins de situations de mémoire insuffisante. Cependant, ce comportement en mémoire faible pourrait avoir un impact négatif sur la performance à l'exécution.

## Plus de fonctionnalités pour les expressions régulières

Le support [du mode `dotAll`](https://github.com/tc39/proposal-regexp-dotall-flag) pour les expressions régulières, activé grâce au drapeau `s`, est désormais activé par défaut. En mode `dotAll`, l'atome `.` dans les expressions régulières correspond à n'importe quel caractère, y compris les terminateurs de ligne.

```js
/foo.bar/su.test('foo\nbar'); // true
```

[Assertions de lookbehind](https://github.com/tc39/proposal-regexp-lookbehind), une autre nouvelle fonctionnalité des expressions régulières, sont désormais disponibles par défaut. Le nom décrit déjà assez bien leur signification. Les assertions de lookbehind offrent une manière de restreindre un motif afin qu'il ne corresponde que s'il est précédé par le motif du groupe de lookbehind. Cela existe sous forme assortie et non assortie :

```js
/(?<=\$)\d+/.exec('$1 vaut environ ¥123'); // ['1']
/(?<!\$)\d+/.exec('$1 vaut environ ¥123'); // ['123']
```

Plus de détails sur ces fonctionnalités sont disponibles dans notre article de blog intitulé [Fonctionnalités futures des expressions régulières](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features).

## Révision des littéraux templates

La restriction sur les séquences d'échappement dans les littéraux templates a été assouplie [selon la proposition pertinente](https://tc39.es/proposal-template-literal-revision/). Cela permet de nouveaux cas d'utilisation pour les balises templates, comme écrire un processeur LaTeX.

```js
const latex = (strings) => {
  // …
};

const document = latex`
\newcommand{\fun}{\textbf{Fun!}}
\newcommand{\unicode}{\textbf{Unicode!}}
\newcommand{\xerxes}{\textbf{Roi!}}
Accent bref sur le h va \u{h}ici // Jeton illégal !
`;
```

## Augmentation de la longueur maximale des chaînes

La longueur maximale des chaînes sur les plateformes 64 bits est passée de `2**28 - 16` à `2**30 - 25` caractères.

## Full-codegen est supprimé

Dans V8 v6.2, les derniers composants majeurs de l'ancien pipeline ont disparu. Plus de 30 000 lignes de code ont été supprimées dans cette version — une amélioration claire pour réduire la complexité du code.

## API V8

Veuillez consulter notre [résumé des changements d'API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Ce document est régulièrement mis à jour quelques semaines après chaque version majeure.

Les développeurs avec un [checkout actif de V8](/docs/source-code#using-git) peuvent utiliser `git checkout -b 6.2 -t branch-heads/6.2` pour expérimenter les nouvelles fonctionnalités de V8 v6.2. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités vous-même.
