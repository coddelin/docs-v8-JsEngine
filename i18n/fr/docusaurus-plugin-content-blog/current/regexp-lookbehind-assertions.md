---
title: &apos;Assertions de lookbehind avec RegExp&apos;
author: &apos;Yang Guo, Ingénieur en expressions régulières&apos;
avatars:
  - &apos;yang-guo&apos;
date: 2016-02-26 13:33:37
tags:
  - ECMAScript
  - RegExp
description: &apos;Les expressions régulières en JavaScript gagnent de nouvelles fonctionnalités : les assertions de lookbehind.&apos;
---
Introduites avec la troisième édition de la spécification ECMA-262, les expressions régulières font partie de JavaScript depuis 1999. En termes de fonctionnalité et d'expressivité, l'implémentation des expressions régulières en JavaScript reflète globalement celle d'autres langages de programmation.

<!--truncate-->
Une fonctionnalité des expressions régulières de JavaScript souvent négligée, mais potentiellement utile, est celle des assertions de lookahead. Par exemple, pour correspondre à une séquence de chiffres suivie d'un signe de pourcentage, nous pouvons utiliser `/\d+(?=%)/`. Le signe de pourcentage lui-même ne fait pas partie du résultat de la correspondance. La négation de celui-ci, `/\d+(?!%)/`, correspondrait à une séquence de chiffres non suivie d'un signe de pourcentage :

```js
/\d+(?=%)/.exec(&apos;100% des présidents américains ont été des hommes&apos;); // [&apos;100&apos;]
/\d+(?!%)/.exec(&apos;cela fait exactement 44 d&apos;entre eux&apos;);            // [&apos;44&apos;]
```

L'opposé du lookahead, les assertions de lookbehind, manquaient en JavaScript, mais sont disponibles dans d'autres implémentations de l'expression régulière, comme celle du framework .NET. Au lieu de lire vers l'avant, le moteur d'expression régulière lit en arrière pour trouver la correspondance à l'intérieur de l'assertion. Une séquence de chiffres précédée d'un signe dollar peut être trouvée avec `/(?<=\$)\d+/`, où le signe dollar ne ferait pas partie du résultat de la correspondance. La négation de celui-ci, `/(?<!\$)\d+/`, correspond à une séquence de chiffres précédée de tout autre signe que le dollar.

```js
/(?<=\$)\d+/.exec(&apos;Benjamin Franklin est sur le billet de $100&apos;); // [&apos;100&apos;]
/(?<!\$)\d+/.exec(&apos;il vaut environ €90&apos;);                         // [&apos;90&apos;]
```

De manière générale, il existe deux façons d'implémenter les assertions de lookbehind. Perl, par exemple, exige que les motifs de lookbehind aient une longueur fixe. Cela signifie que les quantificateurs comme `*` ou `+` ne sont pas autorisés. De cette manière, le moteur d'expression régulière peut revenir en arrière sur cette longueur fixe, et faire correspondre le lookbehind exactement de la même manière qu'il ferait correspondre un lookahead, à partir de la position reculée.

Le moteur d'expression régulière dans le framework .NET adopte une approche différente. Au lieu d'avoir besoin de savoir combien de caractères le motif de lookbehind correspondra, il correspond simplement au motif de lookbehind en arrière, tout en lisant les caractères dans la direction normale de lecture. Cela signifie que le motif de lookbehind peut tirer parti de la syntaxe complète de l'expression régulière et correspondre à des motifs de longueur arbitraire.

Clairement, la deuxième option est plus puissante que la première. C'est pourquoi l'équipe V8, et les champions du TC39 pour cette fonctionnalité, ont convenu que JavaScript devrait adopter la version plus expressive, même si sa mise en œuvre est légèrement plus complexe.

Étant donné que les assertions de lookbehind correspondent en arrière, certains comportements subtils peuvent autrement être considérés comme surprenants. Par exemple, un groupe capturant avec un quantificateur capture la dernière correspondance. En général, il s'agit de la correspondance la plus à droite. Mais à l'intérieur d'une assertion de lookbehind, nous correspondons de droite à gauche, donc la correspondance la plus à gauche est capturée :

```js
/h(?=(\w)+)/.exec(&apos;hodor&apos;);  // [&apos;h&apos;, &apos;r&apos;]
/(?<=(\w)+)r/.exec(&apos;hodor&apos;); // [&apos;r&apos;, &apos;h&apos;]
```

Un groupe capturant peut être référencé via une rétro-référence après avoir été capturé. En général, la rétro-référence doit se trouver à droite du groupe de capture. Sinon, elle correspondrait à une chaîne vide, car rien n'a encore été capturé. Cependant, à l'intérieur d'une assertion de lookbehind, la direction de correspondance est inversée :

```js
/(?<=(o)d\1)r/.exec(&apos;hodor&apos;); // null
/(?<=\1d(o))r/.exec(&apos;hodor&apos;); // [&apos;r&apos;, &apos;o&apos;]
```

Les assertions de lookbehind en sont actuellement à un stade très [précoce](https://github.com/tc39/proposal-regexp-lookbehind) dans le processus de spécification TC39. Cependant, parce qu'elles représentent une extension évidente de la syntaxe RegExp, nous avons décidé de prioriser leur implémentation. Vous pouvez déjà expérimenter avec les assertions de lookbehind en exécutant la version 4.9 ou ultérieure de V8 avec `--harmony`, ou en activant les fonctionnalités expérimentales de JavaScript (utilisez `about:flags`) dans Chrome à partir de la version 49.
